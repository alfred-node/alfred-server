module.exports = app => (request, response) => {
	// Runs a pipeline by the given name.
	
	let {
		name
	} = request.query;
	
	// Instantly run it (TODO: Internally should check if it's already running):
	app.pipeline.run(name);
	
	// The above returns a promise but this request won't wait for it.
	response.send({name});
};