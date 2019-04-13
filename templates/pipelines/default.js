// This is the default pipeline file. It comes from templates/pipelines/default.js.

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

