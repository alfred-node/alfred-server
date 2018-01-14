var git = require('nodegit');
var fs = require('fs');
var path = require('path');
var async = require('async');
var process = require('process');

var defaultCWD = process.cwd();

/*
* Used to get/ create build meta.
* Triggered by pipeline.run.
*/

module.exports = app => {
	
	app.build = {};
	
	/*
	* If this build is building immediately, pass a status of '2' (building)
	*/
	app.build.create = function(pipelineId, status){
		
		if(status === undefined || status === null){
			status = 5; // waiting
		}
		
		return new Promise((success, reject) => {
			
			// Call the stored procedure to obtain a new build version:
			app.database.query('CALL createBuildInfo(?, ?)', [pipelineId, status], function(err, results){
				if(err){
					return reject(err);
				}
				
				var buildInfo = results[0][0];
				
				// {id, versionMajor, versionMinor, versionPatch, pipeline, pipelineName}
				
				success(buildInfo);
			});
			
		});
	};
	
	/*
	* Set the build status. Setting it to '2' (building) also sets the 'started' time.
	*/
	app.build.setStatus = function(id, status){
		
		var info = {
			id,
			status
		};
		
		if(status == 2){
			info.started = new Date();
		}
		
		if(status === 3 || status === 1 || status === 0){
			info.finished = new Date();
		}
		
		return app.build.update(info);
	}
	
	/*
	* Updates a build (e.g. its current status)
	*/
	app.build.update = function(options){
		
		if(!options.id){
			throw new Error('Build ID required to update it');
		}
		
		return new Promise((success, reject)=> {
			app.database.insertOrUpdate('builds', options, (err, id) => {
				if(err){
					return reject(err);
				}
				
				// Ok!
				success();
			});
		});
	}
	
	/*
	* Get build info for the build with the given ID.
	*/
	app.build.get = function(id){
		return new Promise((success, reject)=> {
			
			app.database.query('select builds.*, pipelines.name from builds left join pipelines on builds.pipeline = pipelines.id where id=?', [id], function(err, results){
				
				if(err){
					return reject(err);
				}
				
				success(results[0]);
			})
			
		});
	}
	
};