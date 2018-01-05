module.exports = app => (request, response) => {
	// Update or create credentials.
	
	let {
		key,
		data
	} = request.body;
	
	// Add/ update:
	app.credentials.add(key, data).then(() => response.send({key}));
};