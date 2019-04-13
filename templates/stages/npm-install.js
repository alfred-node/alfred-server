/*
 NGINX UI/API (With SSL support via Let's Encrypt).
 Sets up NGINX config for a UI/API pair, with a PHP API.
 
 Config:
 
 {
	path: '/folder/where/package_json/is/'   (optional)
 }
 
*/

module.exports = (stage, app) => {
	var prefix = stage.config && stage.config.path;
	
	var args = prefix ? ['--prefix', prefix, 'install'] : ['install'];
	
	// For each server (in parallel), run the nginx.js remote script:
	var serverPromises = stage.workspace.sshServers.map(sshServer => sshServer.server.exec('npm', args, {stream: 'stdout'}));
	
	// Await all:
	return Promise.all(serverPromises).then(() => console.log('npm install done'));
}
