var glob = require('glob');

/*
* Generates a diff between the current head and the commit on the same branch that this pipe was at last time it ran successfully.
* If git-pull is configured with a 'remote' value - meaning the path on a remote server - this also generates a change set in workspace.changedFiles.
*/

module.exports = (stage, app) => {
	
	// All the currently open repo's for this pipe:
	var workspace = stage.workspace;
	var repos = workspace.gitRepositories;
	
	if(!repos){
		// No repositories - nothing to do.
		return;
	}
	
	var promises = [];
	
	// For each repository..
	for(var i=0;i<repos.length;i++){
		
		// Get the head commit:
		var pullInfo = repos[i];
		
		// Get the last successful build of this same branch:
		var buildPropertySearch = {};
		
		var prom = app.build.getSuccessfulStage(stage.pipeline.id, 'git-pull', {branch: pullInfo.branch, url: pullInfo.url}).then(latestBuild => {
			
			// Get the sha of the latest build, if there was a build found (so we can diff relative to that):
			var relativeToCommit = latestBuild ? latestBuild.properties.commit : null;
			
			if(relativeToCommit){
				// Diff the current head relative to the given commit:
				return pullInfo.repository.diff(relativeToCommit, pullInfo.head.sha())
					.then(diffs => {
						pullInfo.diff = diffs.map(diff => {
							return {
								path: diff.path,
								status: diff.status
							};
						});
						
						if(pullInfo.config.remote){
							// Add as a change set:
							if(!workspace.changedFiles){
								workspace.changedFiles = [];
							}
							
							// Add the change set:
							workspace.changedFiles.push({
								type: 'git-diff',
								target: pullInfo.config.remote,
								source_workspace_path: pullInfo.localPath,
								source: pullInfo.diff
							});
						}
						
					});
			}else{
				// Glob the directory:
				
				return new Promise((success, reject) => {
					
					var pattern = workspace.path + pullInfo.localPath;
					
					if(pattern[pattern.length - 1] != '/'){
						pattern += '/';
					}
					
					// All files (not directories):
					glob(pattern + '**/*', {nodir: true}, (err, filePaths) => {
						pullInfo.diff = filePaths ? filePaths.map(path => {
							path = path.substring(pattern.length);
							return {
								path,
								status: 'added'
							};
						}) : [];
						
						if(pullInfo.config.remote){
							// Add as a change set:
							if(!workspace.changedFiles){
								workspace.changedFiles = [];
							}
							
							// Add the change set:
							workspace.changedFiles.push({
								type: 'git-diff',
								target: pullInfo.config.remote,
								localPath: pullInfo.localPath,
								files: pullInfo.diff
							});
						}
						
						// Ok!
						success();
					})
				})
				
			}
			
		});
		
		promises.push(prom);
		
	}
	
	// Wait for them all:
	return Promise.all(promises).then(() => console.log('Diff completed')); // this console.log seems to be necessary for the stage to complete?
};
