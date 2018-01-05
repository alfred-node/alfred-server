/*
 git-pull pipeline stage. Config is required otherwise this stage will fail.
 Pulls a repo into the workspace (in a directory with the same name as the repo).
 E.g. github.com/recline/recline-server.git will go in the workspace as '/recline-server'
 
 Config:
 
 {
	url: 'https://Path.to.repo',
	branch: 'master', (optional)
	localPath: 'local/dir/relative/to/workspace', (optional)
	credentials: creds_ID_or_raw_object (optional)
 }
 
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	// URL of the repo (config object always provided):
	var remotePath = config.url;
	
	if(!remotePath){
		throw new Error("No Git repository URL provided. Expected your stage config to include 'url'.");
	}
	
	// Branch to use:
	var branch = config.branch || "master";
	
	// Local directory to checkout to:
	if(!config.localPath){
		// Infer one from the URL:
		config.localPath = repoName(remotePath);
	}
	
	// Update and checkout the branch now:
	return app.git.update(remotePath, config.localPath, branch, config)
		.then(repository => {
			// Keep a reference to the repository itself and the local checkout path.
			if(!stage.workspace.gitRepositories){
				stage.workspace.gitRepositories = [];
			}
			
			// Cache the config in the pipelines memory workspace so other stages can use the reference directly:
			stage.workspace.gitRepositories.push({
				repository,
				localPath: config.localPath,
				config
			});
			
			// Checkout now:
			return app.git.checkout(repository, branch, config);
		});
}

/*
* Gets a suitable repository name from the URL. It's the last 
*/
function repoName(url){
	
	// Remove hash and query string:
	url = url.split('#')[0];
	url = url.split('?')[0];
	
	var urlParts = url.split('/');
	
	// Get the last part:
	var fileName = urlParts[urlParts.length-1];
	
	if(fileName.indexOf('.') != -1){
		// Remove the ending (most likely .git)
		fileName = fileName.split('.')[0];
	}
	
	// Ok - all ready:
	return fileName;
}