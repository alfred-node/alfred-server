const exec = require('child_process').exec;
const fs = require('fs');

var args = process.argv;

if(args.length < 3){
	throw new Error('Must have 1 arg. First arg is the site domain name.');
}

var serverName = args[2];

var configFile = '/etc/nginx/sites-available/' + serverName + '.conf';

// NGINX config exists?
fs.stat(configFile, (err, stats) => {
	if(err){
		
		// Nope - create the file using the template:
		fs.readFile('/alfred/nginx-template.conf', 'utf8', function(err, data) {
			if (err) throw err;
		
			// Fill the template:
			var filledTemplate = data
				.replace(/\{SERVER_NAME\}/g, serverName);
			
			// Write it out:
			fs.writeFile(configFile, filledTemplate, (err) => {
				if (err) throw err;
				
				var commands = [];
				
				// Symlink:
				commands.push('sudo ln -s "' + configFile + '" "/etc/nginx/sites-enabled/' + serverName + '.conf"');
				
				// Reload NGINX config:
				commands.push('sudo nginx -s reload');
				
				// Cert:
				commands.push('sudo certbot certonly --webroot -w /var/www/certbot -d ' + serverName);
				
				exec(commands.join('\n'), function(err, stdout, stderr){
					
					// Uncomment the cert lines:
					filledTemplate = filledTemplate
					.replace(/\#ssl_certificate/g, 'ssl_certificate')
					.replace(/\#ssl_certificate_key/g, 'ssl_certificate_key');
					
					// Write out again:
					fs.writeFile(configFile, filledTemplate, (err) => {
						
						// Reload NGINX:
						exec('sudo nginx -s reload', function(){
							// Done!
						});
						
					});
				});
			});
		});
		
	}
})