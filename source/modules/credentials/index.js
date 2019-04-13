var cryptoJSON = require('crypto-json');
var jsonfile = require('jsonfile');


module.exports = app => {
	
	// Get the settings:
	var settings = app.settings;
	
	var lookupPath = settings.configPath + '/credentials.json';

	// Get the global key:
	var passKey = settings.cryptkey;
	
	/*
	* The loaded lookup (private)
	*/
	var lookup = {};

	/*
	* Writes the lookup out to a file
	*/
	function save(){
		
		return new Promise((success, reject) => {
			
			// Encrypt using the pass:
			var encrypted = cryptoJSON.encrypt(lookup, passKey, {});
			
			// Write it out:
			jsonfile.writeFile(lookupPath, encrypted, err => {
				if(err){
					console.log(err);
				  reject(err);
				}else{
				  success();
				}
			});
			
		});
	}

	/*
	* Loads the lookup from a file
	*/
	function load(){
		
		// Read the JSON file:
		return new Promise(success => {
			
			jsonfile.readFile(lookupPath, function(err, obj) {
				if(err){
					lookup = {};
					save();
					console.notice('Credentials lookup was not found. Created an empty one.');
				}else{
					// Decrypt using the pass:
					lookup = cryptoJSON.decrypt(obj, passKey, {});
				}
				success();
			});
		
		});
	}
	
	/*
	* Loads the creds for the given key. Null if not found.
	*/
	app.credentials = key => lookup[key];
	
	/*
	* The list of available creds.
	*/
	app.credentials.list = () => Object.keys(lookup);
	
	/*
	* If the given object is simply a string, then it loads and returns the loaded cred.
	* Otherwise the object is returned as-is.
	*/
	app.credentials.load = obj => {
		if(obj && (typeof obj === "string")){
			return lookup[obj];
		}
		return obj;
	};
	
	/*
	* Adds/ updates some credentials. Returns a promise.
	*/
	app.credentials.update = app.credentials.add = (key, data) => {
		
		// Update lookup:
		lookup[key] = data;
		
		// Save changes:
		return save();
	};
	
	// Load now:
	return load();
}