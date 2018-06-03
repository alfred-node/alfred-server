module.exports = app => (request, response) => {
	// Runs a pipeline by the given name.
	
	let {
		id
	} = request.query;
	
	var config = {
		workspace:{
			request
		}
	};
	
	// Try and find a special webhook handler:
	var hookHandler = app.webhooks && app.webhooks.find(hook => hook.detect && hook.detect(request));
	
	if(hookHandler && hookHandler.onRequest){
		// Give this hook handler the config object and also the 
		// original request so it can configure the run accordingly.
		hookHandler.onRequest(request, config);
	}
	
	// Instantly run it (TODO: Internally should check if it's already running):
	app.pipeline.run(id, config, {
		onStart: pipe => {
			
			// Build started - we won't wait for it though!
			response.send({
				version: pipe.workspace.version,
				id: pipe.workspace.build.id
			});
			
		}
	}).catch(console.log);
	
};