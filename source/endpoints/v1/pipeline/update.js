const fs = require('fs');

module.exports = app => (request, response) => {
	// Update or create pipelines.
	
	let {
		id,
		version,
		name,
		groupId,
		file
	} = request.body;
	
	if(!name){
		name = 'My new pipeline';
	}
	
	var nextVersionMajor = 0;
	var nextVersionMinor = 0;
	var nextVersionPatch = 1;
	
	if(version){
		version = version.trim();
	}
	
	var group = null;
	
	if(groupId){
		group = parseInt(groupId);
	}
	
	if(version && version.length){
		if(version.indexOf('.') != -1){
			var parts = version.split('.');
			
			nextVersionMajor = parseInt(parts[0]);
			nextVersionMinor = parseInt(parts[1]);
			
			if(parts.length>2){
				nextVersionPatch = parseInt(parts[2]);
			}
			
		}else{
			nextVersionMajor = parseInt(version);
		}
	}
	
	app.database.insertOrUpdate('pipelines', {
		id,
		nextVersionMajor,
		nextVersionMinor,
		nextVersionPatch,
		name,
		group,
		created: new Date()
	}, function(err, newId) {
		
		if (err) {
			return response.error(err);
		}
		
		// If we have an ID, create the pipe dir now:
		var dir = app.settings.configPath + '/pipelines/' + newId + '/';
		
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}
		
		if(!file){
			// Use the overrideable default:
			var template = app.getTemplate('pipelines/default.js', true);
			
			if(template === null){
				console.log("Warning: No pipeline file provided and you don't have a default template defined (configDir/templates/default.js) either.");
			}
			
			file = template;
		}
		
		// Write out the pipeline file:
		fs.writeFile(dir + "pipeline.js", file, function(err) {
			if(err) {
				return response.error(err);
			}
			
			response.send({id: newId});
		}); 
		
	});
	
};