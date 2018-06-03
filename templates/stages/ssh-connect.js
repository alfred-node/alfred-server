node_ssh = require('node-ssh')

/*
 ssh connect. Config is required otherwise this stage will fail.
 Connects to an SSH server and adds the connection into the pipeline's workspace (stage.workspace.sshServers).
 
 Config:
 
 {
	host: '127.0.0.1',
	port: 22, (optional)
	credentials: creds_ID_or_raw_object
 }
 
 Credentials structure:
 {
	 username: 'alfred',
	 privateKey: 'raw private key string'
 }
 
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	// Hostname/ IP of the server (config object always provided):
	var host = config.host;
	
	if(!host){
		throw new Error("No SSH host provided.");
	}
	
	// Load up the credentials:
	var creds = app.credentials.load(config.credentials);
	
	// Clear creds from stored config:
	delete config.credentials;
	
	var server = new node_ssh();
	
	// Connect now;
	return server.connect({
	  host: host,
	  username: creds.username,
	  privateKey: creds.privatekey
	}).then(() => {
		// push the server link into the pipe's workspace:
		if(!stage.workspace.sshServers){
			stage.workspace.sshServers = [];
		}
		
		stage.workspace.sshServers.push({
			config,
			server
		});
	}).catch(console.log);
}