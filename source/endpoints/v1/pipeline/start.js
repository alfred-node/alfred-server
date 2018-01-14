module.exports = app => (request, response) => {
	// Runs a pipeline by the given name.
	
	let {
		id
	} = request.query;
	
	// Instantly run it (TODO: Internally should check if it's already running):
	app.pipeline.run(id, {
		webhook: request.body,
	}, {
		onStart: pipe => {
			
			// Build started - we won't wait for it though!
			response.send({
				version: pipe.workspace.version,
				id: pipe.workspace.build.id
			});
			
		}
	}).catch(console.log);
	
};