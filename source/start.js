// ===========================================
// Alfred entry point - the magic begins here
//                      __                                ___         ___             _
// ___________ ________/  |_ ___ __    ____   ____     __| _/_ __  __| _/____   _____| |
// \____ \__  \\_  __ \   __<   |  |  /  _ \ /    \   / __ |  |  \/ __ |/ __ \ /  ___/ |
// |  |_> > __ \|  | \/|  |  \___  | (  <_> )   |  \ / /_/ |  |  / /_/ \  ___/ \___ \ \|
// |   __(____  /__|   |__|  / ____|  \____/|___|  / \____ |____/\____ |\___  >____  >__
// |__|       \/             \/                  \/       \/          \/    \/     \/ \/
// ===========================================

// This is the API. It does the bulk of the work for Alfred
// but if you're looking to make visual changes, stop!
// Go to the user interface repository instead.

// Step 1. Include web server (Express):
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// Include the module loader - it allows Alfred to be easy to extend:
var moduleLoader = require('./modules/module-loader');

// The startup function. A user optionally provides the config into this.
function startAlfred(settings) {
	
	// Setup express (the web server):
	var expressHttp = express();
	expressHttp.use(logger('dev'));
	expressHttp.use(bodyParser.json());
	expressHttp.use(bodyParser.urlencoded({ extended: true }));
	expressHttp.use(cookieParser());
	
	var app = {
		express: expressHttp,
		/* The available search providers, indexed by name.
		   Each one can be instanced multiple times based on settings. The instances end up as app.search */
		providers: {},
		
		/*
			The instanced search providers, indexed by name. Each entry is an array (usually of 1).
			This is such that e.g. if you have multiple local computers, you can search all of them at once.
			Or if you have multiple enigma2 TV receivers, the search can be sent to just one of them.
			I.e. the way search is distributed becomes something the provider can define.
		*/
		search: {}
	};
	
	// Step 2. Load the config. Using Object.assign here so we can essentially overwrite 
	// defaults with the optional config being passed in.
	app.settings = Object.assign(settings || {}, require('../configAndData/settings.js'));
	
	// Return a promise so the caller can know when Alfred is ready to go:
	return new Promise((success, failed) => {
		
		// Step 3. Fire up core modules (this includes registering the API routes):
		moduleLoader.load('./modules', app)
		
		// Step 4. Fire up any extensions:
		.then(() => moduleLoader.load('./extensions', app))
		
		// Step 5. Start listening for web traffic!
		.then(() => {
			
			// Listen on the configured port:
			expressHttp.listen(app.settings.port);
			
			console.ok('Alfred started');
			
			success(app);
		})
		
		// Pass errors through to parent:
		.catch(failed);
		
	});
};


// Were we started directly from the command line, or included as part of some other package?
if (require.main === module) {
	// We're being run directly from the command line. Immediately call the startup function.
	startAlfred();
}else{
	// Somebody is including us. Export the function.
	module.exports = startAlfred;
}
