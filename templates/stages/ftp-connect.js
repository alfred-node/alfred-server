/*
 ftp-connect pipeline stage. Config is required otherwise this stage will fail.
 Starts an (S)FTP connection. 
 
 Config matches that of the FTP npm module:
 https://www.npmjs.com/package/ftp
*/

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	
	// Update and checkout the branch now:
	return app.ftp.connect(config)
		.then(server => {
			// Keep a reference to the FTP server:
			if(!stage.workspace.ftpServers){
				stage.workspace.ftpServers = [];
			}
			
			// Clear pwd from stored config:
			delete config.password;
			
			// Cache the config in the pipelines memory workspace so other stages can use the reference directly:
			var serverInfo = {
				server,
				config,
				host: config.host
			};
			
			stage.workspace.ftpServers.push(serverInfo);
		});
}