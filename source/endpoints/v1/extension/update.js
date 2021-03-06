module.exports = app => (request, response) => {
	
	// Update or create an extension.
	// What the endpoint does depends if ID is provided or not.
	// note that 'update' endpoints are aliased as 'add' too.
	
	if(!request.user){
		return response.error('action/notAuthorized');
	}
	
	let {
		id,
		title,
		description,
		version,
		npmPackage
	} = request.body;
	
	var created = !id ? new Date() : undefined;
	var createdBy = !id ? request.user.id : undefined;
	
	// Insert/ update now:
	app.database.insertOrUpdate('extensions', {
		id,
		title,
		description,
		version,
		npmPackage,
		created,
		createdBy
	}, (err, id) => {
		if(err){
			// E.g. because invalid field
			return response.error('extension/failed');
		}
		
		// Output the ID:
		response.send({
			id
		});
	});
	
};