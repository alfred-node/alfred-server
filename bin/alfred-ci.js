#!/usr/bin/env node

var service = require ("os-service");
var process = require('process');
var path = require('path');

// The working dir where alfred was invoked:
var calledFromPath = process.cwd();

// Change to the Alfred dir:
process.chdir(path.dirname(__filename) + '/../');

require('../source/start.js')({
	loadCommandLine: true,
	calledFromPath
});

// Also make sure auto start is setup:
service.add ("alfred-ci", {
	programPath: "alfred-ci"
}, function(error){
	if(error){
		console.log('Unable to add alfred as a service', error);
	}
});
