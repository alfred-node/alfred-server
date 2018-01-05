node_ssh = require('node-ssh')

/*
 ssh connect. Config is required otherwise this stage will fail.
 Connects to an SSH server and adds the connection into the pipeline's workspace (stage.workspace.sshServers).
 
 Config:
 
 {
	server: ['hostname', 'hostname', ..] or 'hostname', (optional; uses all otherwise)
	toUpload: ['dirpath', 'filepath', ...] or 'dirpath',
	events: { (optional)
		onFile: function(file) {
			// Pass/ reject a particular file for upload. Every file will go through here.
			return false;
		}
	}
 }
 
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	// Use all SSH servers unless otherwise specified:
	
}