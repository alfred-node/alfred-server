// This is a sample pipeline.js. Put it in e.g. configAndData/pipelines/prod-push/pipeline.js where 'prod-push' is a suitable pipeline name you'd like to use.

module.exports = (pipeline, app) => {
    
	// Project specific settings:
    var settings = {
       stages: {
           'git-pull': { // Overrides settings for a stage called "git-pull".
			   url: 'https://...',
			   credentials: 'CREDS_ID_OR_RAW_OBJECT' // See the readme for more info on what these are
		   }
       }
    };
    
    // Import your standard pipeline:
    // (Ideally you want as many projects as possible to use the same pipe).
    // Import returns a promise which resolves when the pipeline is ready to be started (not when it has finished).
    // Add await/ then if you'd like to override or add additional project specific stages.
	// Most standard pipes are ready immediately anyway but you should always return/ resolve the import promise.
    return pipeline.import("standard", settings);
}

