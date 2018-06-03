
module.exports = app => {
	
	app.webhooks.push(
		{
			// Is the given request a Gitlab webhook?
			detect: request => {
				return !!request.headers['x-gitlab-event']
			},
			
			// Maps a Gitlab request to the Alfred API format.
			onRequest: (request, config) => {
				
				var glEvent = request.headers['x-gitlab-event'];
				
				if(glEvent == 'Push Hook' || glEvent =='Tag Push Hook'){
					
					// Primary thing is to establish which branch is being pushed:
					var branchParts = request.body.ref ? request.body.ref.split('/') : null;
					var branch = branchParts && branchParts.length ? branchParts[branchParts.length-1] : null;
					
					if(branch){
						// Apply branch:
						config.workspace.branch = branch;
					}
					
				}
				
			}
		}
	);
	
};
