/*
* Generates a diff between the current head and the commit on the same branch that this pipe was at last time it ran successfully.
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
			
			if(relativeToCommit == null){
				// We'll need to get a root commit and diff relative to that instead.
				relativeToCommit = getRootCommit(pullInfo.head).then(root => root.sha());
			}
			
			// Diff the current head relative to the given commit:
			Promise.resolve(relativeToCommit)
				.then(relativeToCommit => pullInfo.repository.diff(relativeToCommit, pullInfo.head.sha()))
				.then(console.log);
			
		});
		
	}
	
	// Wait for them all:
	return Promise.all(promises);
};

/*
* Walks the history to find the root commit.
* This is used when no previous successful build is found.
*/
function getRootCommit(forCommit){
	return new Promise((success, reject) => {
		var hist = forCommit.history();
		hist.on('end', commits => {
			// If there is no history then the given one is the root.
			success(commits && commits.length ? commits[commits.length-1] : forCommit);
		});
		hist.start();
	});
}
