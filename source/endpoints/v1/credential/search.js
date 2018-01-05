module.exports = app => (request, response) => {
	// List credentials (keys only).
	
	if(!request.isRank(app.ranks.ADMIN)){
		return response.error('action/notAuthorized');
	}
	
	response.send(app.credentials.list());
};