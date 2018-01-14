
module.exports = app => {
	
	app.webhooks.push(
		{
			// Is the given request a Gitlab webhook?
			detect: request => !!request.headers['X-Gitlab-Event'],
			
			// Maps a Gitlab request to the Alfred API format.
			map: request => request.body
		}
	);
	
};
	