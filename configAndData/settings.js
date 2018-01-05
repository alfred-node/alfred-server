/*
	Default settings. Saving config via alfred will overwrite this file.
	If you include the alfred package, you can give it optional overrides.
*/

module.exports = {
	
	// Database settings:
	database: {
		host: 'localhost',
		user: 'alfred',
		password: 'alfred',
		database: 'alfred'
	},
	
	// Crypt key (change this - it can be anything!):
	cryptkey: 'm83nA*ns7Qnb37nWkCMWd8n$!lWQhFXlE',
	
	// Email sending:
	email: {
		connect: {
			host: '',
			secure: true,
			auth: {
				user: '',
				pass: ''
			},
			tls: {
				rejectUnauthorized: true
			}
		},
		from: 'Alfred <alfred@alfred.com>'
	},
	
	// SMS send/ receive:
	sms: {
		
		twilio:{
			sid: '',
			token: '',
			from: ''
		}
		
	},
	
	// The server port:
	port: 8088,
	
};