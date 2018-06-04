var slackNotify = require('slack-notify');

// Note! See the very bottom line - this stage is special as it runs even when something has failed.

module.exports = (stage, app) => {
	
	// Get the config:
	var config = stage.config;
	var workspace = stage.workspace;
	var errors = workspace.errors;
	var version = workspace.version;
	
	if(!config.url){
		throw new Error('No slack (webhook) URL provided.');
	}
	
	// Start:
	var slack = slackNotify(config.url);
	
	var pretext = workspace.build.pipelineName + ' #' + version.patch + (errors.length ? ' failed' : ' successful') + " in " + timeString(workspace.startTime);
	
	var messages = workspace.messages.map(msg => msg.text).join('\r\n');
	
	if(!messages){
		messages = "No additional information provided.";
	}
	
	if(errors.length){
		messages = errors.join('\r\n') + '\r\n' + messages;
	}
	
	return slack.send({
	  icon_url: 'https://kulestar.com/Images/Alfred/logo.png',
	  username: 'Alfred',
	  attachments: [
        {
            fallback: pretext,
            color: errors.length ? 'danger' : 'good',
            pretext: pretext,
            // title: "This is a blue link title",
            // title_link: "https://../",
            text: messages,
        }
	  ]
	});
	
	function timeString(origDate){
		
		// Spread in ms:
		var spread = (new Date() - origDate);
		
		if(spread < 1000){
			return spread + 'ms';
		}
		
		spread /= 1000;
		
		if(spread < 60){
			return Math.floor(spread) + 's';
		}
		
		var minutes = Math.floor(spread / 60);
		return minutes + 'm ' + (spread - (minutes * 60)) + 's';
		
	}
	
};

/*
* This stage runs even if something errored before it.
*/
module.exports.runOnError = true;
