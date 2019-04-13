/*
 NGINX UI/API (With SSL support via Let's Encrypt).
 Sets up NGINX config for a UI/API pair, with a PHP API.
 
 Config:
 
 {
	domain: 'hello.world.com'
 }
 
*/

module.exports = (stage, app) => {
	if(!stage.config || !stage.config.domain){
		return;
	}
	
	// For each server (in parallel), run the nginx.js remote script:
	var serverPromises = stage.workspace.sshServers.map(sshServer => sshServer.server.exec('node', ['/alfred/nginx.js', stage.config.domain], {stream: 'stdout'}));
	
	// Await all:
	return Promise.all(serverPromises).then(() => console.log('NGINX site configured'));
}
