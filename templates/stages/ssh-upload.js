var node_ssh = require('node-ssh');
var glob = require('glob');
var async = require('async');
var fs = require('fs');
var tar = require('tar');
var tempfile = require('tempfile');
var path = require('path');


/*
 ssh connect. Config is required otherwise this stage will fail.
 Connects to an SSH server and adds the connection into the pipeline's workspace (stage.workspace.sshServers).
 
 Config:
 
 {
	server: ['hostname', 'hostname', ..] or 'hostname', (optional; uses all otherwise)
	toUpload: ['dirpath', 'filepath', ...] or 'dirpath',
	events: { (optional)
		onFile: function(file) {
			// Pass/ reject a particular file for upload. Every file will go through here.
			return false;
		}
	}
 }
 
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	if(!config.sets){
		
		if(!config.source){
			// Use change sets.
			config.sets = stage.workspace.changedFiles;
		}else{
			// Just one change set:
			config.sets = [{
				source: config.source,
				source_workspace_path: config.source_workspace_path,
				source_options: config.source_options,
				target: config.target
			}];
		}
	}
	
	// For each transfer set..
	var filePromises = [];
	var transferSets = [];
	
	for(var i=0;i<config.sets.length;i++){
		
		// Grab the set:
		var set = config.sets[i];
		
		// Add the file promise and add into the files array:
		filePromises.push(getFilePromise(set, stage, app).then(setFiles => transferSets.push({
			files: setFiles,
			target: set.target,
			source_workspace_path: set.source_workspace_path
		})));
		
	}
	
	return Promise.all(filePromises)
	.then(() => {
		// Got all known files - let's start uploading!
		// We'll be doing all the servers in parallel:
		var servers = stage.workspace.sshServers;
		
		var serverPromises = [];
		
		for(var i=0;i<servers.length;i++){
			
			var sshServer = servers[i];
			
			if(config.servers){
				// Upload to this server?
				if(!config.servers(sshServer)){
					continue;
				}
			}
			
			// Ok!
			serverPromises.push(new Promise((success, reject) => {
				
				
				// For each transfer set..
				async.eachSeries(
					transferSets,
					(set, doneSet) => {
						
						// Upload to this location:
						var targetBasePath = set.target;
						
						if(targetBasePath[targetBasePath.length - 1] != '/'){
							targetBasePath += '/';
						}
						
						// Relative to the WS:
						var workspaceBasePath = stage.pipeline.workspace.path + (set.source_workspace_path || '');
						
						if(workspaceBasePath[workspaceBasePath.length - 1] != '/'){
							workspaceBasePath += '/';
						}
						
						var commands = [];
						var filesToCompress = [];
						
						// For each file in the transfer set..
						for(var i=0;i<set.files.length;i++){
							var file = set.files[i];
							
							// Target path is..
							if(!file){
								// No file - skip nulls
								continue;
							}
						
							var filePath = file;
							var status = 'put';
							
							if(file.status){
								// {status: 'delete', path: '..'}
								status = file.status;
								filePath = file.path;
							}
							
							if(!filePath){
								// Skip no path
								continue;
							}
							
							if(filePath[0] == '/'){
								// Should be fairly rare - chop this off:
								filePath = filePath.substring(1);
							}
							
							if(status == 'delete' || status == 'deleted' || status == 'removed'){
								
								// Delete
								commands.push('rm -f "' + (targetBasePath + filePath) + '"');
								
							}else if(status =='put' || status =='added' || status == 'copied' || status =='modified' || status == 'typechange'){
								// Upload
								
								filesToCompress.push(filePath);
								
							}else if(status == 'renamed'){
								
								// Both delete and upload:
								if(file.oldpath){
									
									var oldPath = file.oldpath;
									
									if(oldPath[0] == '/'){
										// Should be fairly rare - chop this off:
										oldPath = oldPath.substring(1);
									}
									
									commands.push('rm -f "' + (targetBasePath + oldPath) + '"');
									
								}
								
								filesToCompress.push(filePath);
							
							}
							
						}
						
						var promise = null;
						
						if(commands.length){
							// Run all the delete commands:
							promise = sshServer.server.exec(commands.join('\n'));
						}else{
							promise = true;
						}
						
						var tempFile = tempfile('.tar.gz');
						
						Promise.resolve(promise)
							.then(() => {
								if(filesToCompress && filesToCompress.length){
									// Compress the files:
									tar.c( // or tar.create
										{
											cwd: workspaceBasePath,
											gzip: true
										},
										filesToCompress
									)
									.pipe(fs.createWriteStream(tempFile))
									.on('finish', function(){
										// Compressed the archive - upload it now:
										var remotePath = '/alfred/temp/' + path.basename(tempFile);
										
										sshServer.server.putFile(tempFile, remotePath)
										.then(() => sshServer.server.exec('node /alfred/patch "' + remotePath + '" "' + targetBasePath + '"', [], {stream: 'stdout'}))
										.then((result) => {
											// Display any output:
											result && console.log(result);
											
											// Delete the archive locally:
											fs.unlink(tempFile, function(){
												doneSet();
											});
										})
									})
								}else{
									// Nothing to upload - we're done:
									doneSet();
								}
							})
						
					},
					success
				);
				
			}));
			
		}
		
		// Await all:
		return Promise.all(serverPromises).then(() => console.log('SSH upload complete'));
	});
}

/*
* Returns a promise which resolves to an array of file paths.
*/
function getFilePromise(set, stage, app){
	if(typeof set.source === 'function'){
		// Invoke it now:
		return Promise.resolve(set.source(stage, app, set));
	}else if(Array.isArray(set.source)){
		// Already got an array of files.
		return Promise.resolve(set.source);
	}
	
	return new Promise((resolve, reject) => {
		// Glob grab the files:
		glob(set.source, set.options || {nodir: true}, function (er, files) {
			if(er){
				return reject(er);
			}
			resolve(files);
		});
	});
	
}