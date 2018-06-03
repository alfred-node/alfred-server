node_ssh = require('node-ssh')

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
						var workspaceBasePath = stage.pipeline.workspaceDir + '/' + (set.source_workspace_path || '');
						
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
									sshServer.server.delete(remotePath, doneUpload);
									
								}else if(status =='put' || status =='added' || status == 'copied' || status =='modified' || status == 'typechange'){
									// Upload
									
									// Complete local path is..
									var srcPath = workspaceBasePath + filePath;
									
									// Upload the file:
									sshServer.server.putFile(srcPath, remotePath).then(doneUpload);
									
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
										sshServer.server.exec('rm "' + targetBasePath + oldPath + '"').then(() => {
											// Upload the new one:
											sshServer.server.putFile(srcPath, remotePath).then(doneUpload);
										});
										
									}else{
										// Old path not specified - just a regular upload@
										sshServer.server.putFile(srcPath, remotePath).then(doneUpload);
									}
									
								}
								
							},
							doneSet
						);
						
					},
					success
				);
				
			});
			
		}
		
		// Await all:
		return Promise.all(serverPromises);
	});
}