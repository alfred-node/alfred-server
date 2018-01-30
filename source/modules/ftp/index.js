var Ftp = require('ftp');
var fs = require('fs');
var path = require('path');

module.exports = app => {
	app.ftp = {
		Ftp,
		connect: options => {
			// Same set of options as https://www.npmjs.com/package/ftp
			
			// Try opening the FTP link:
			return new Promise((fulfil, reject) =>{
				var server = new Ftp();
				server.on('ready', function() {
					fulfil(server);
				});
				server.connect(options);
				server.on('error', reject);
			});
		}
	};
};