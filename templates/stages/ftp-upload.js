var glob = require('glob');
var async = require('async');

/*
 ftp-upload pipeline stage. Config is required otherwise this stage will fail.
 Uploads specified files to the current connected FTP servers.
 Defaults to uploading to all of them unless specified otherwise.
 
 Config:
 {
	sets:[
		{
			source: GLOB_PATH | FUNCTION | ARRAY, // Sources are an array of filepaths relative to the target and the workspace path.
													Each file can also be {status: 'deleted', path: '...'}
													where status is any of delete, deleted, removed, renamed, put, added, copied, modified, typechange
		    source_options: GLOB_OPTIONS,
			source_workspace_path: OPTIONAL_PATH_RELATIVE_TO_WORKSPACE,
		    target: BASEPATH
		}
	],
	servers: FILTER_FUNCTION // Optional - return true/false to upload to a given server
 }
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	if(!config.sets){
		config.sets = [{
			source: config.source,
			source_options: config.source_options,
			target: config.target
		}];
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
	
	Promise.all(filePromises).then(() => {
		// Got all known files - let's start uploading!
		// We'll be doing all the servers in parallel:
		var servers = stage.workspace.ftpServers;
		
		var serverPromises = [];
		
		for(var i=0;i<servers.length;i++){
			
			var ftpServer = servers[i];
			
			if(config.servers){
				// Upload to this server?
				if(!config.servers(ftpServer)){
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
						var workspaceBasePath = stage.pipeline.workspace.path + '/' + (set.source_workspace_path || '');
						
						// For each file in the transfer set..
						async.eachSeries(
							set.files,
							(file, doneUpload) => {
								
								// Target path is..
								if(!file){
									// No file - skip nulls
									return doneUpload();
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
									return doneUpload();
								}
								
								if(filePath[0] == '/'){
									// Should be fairly rare - chop this off:
									filePath = filePath.substring(1);
								}
								
								// Complete remote path is..
								var remotePath = targetBasePath + filePath;
								
								if(status == 'delete' || status == 'deleted' || status == 'removed'){
									// Delete
									ftpServer.server.delete(remotePath, doneUpload);
									
								}else if(status =='put' || status =='added' || status == 'copied' || status =='modified' || status == 'typechange'){
									// Upload
									
									// Complete local path is..
									var srcPath = workspaceBasePath + filePath;
									
									ftpServer.server.put(srcPath, remotePath, doneUpload);
									
								}else if(status == 'renamed'){
									
									// Complete local path is..
									var srcPath = workspaceBasePath + filePath;
									
									// Both delete and upload:
									if(file.oldpath){
										
										var oldPath = file.oldpath;
										
										if(oldPath[0] == '/'){
											// Should be fairly rare - chop this off:
											oldPath = oldPath.substring(1);
										}
										
										// Delete the old one first:
										ftpServer.server.delete(targetBasePath + oldPath, () => {
											// Upload the new one:
											ftpServer.server.put(srcPath, remotePath, doneUpload);
										});
										
									}else{
										// Old path not specified - just a regular upload@
										ftpServer.server.put(srcPath, remotePath, doneUpload);
									}
									
								}
								
							},
							doneSet
						);
						
					},
					success
				);
				
			}));
			
		}
		
		// Await all:
		return Promise.all(serverPromises);
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