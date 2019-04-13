var git = require('nodegit');
var fs = require('fs');
var path = require('path');
var async = require('async');
var process = require('process');

var defaultCWD = process.cwd();

/*
* Alfred's beating heart! Used to represent a pipeline - a series of tasks to perform.
*/

module.exports = app => {
	
	app.pipeline = function(id){
		
		var __pipe = this;
		
		/*
		* ID of this pipeline. References
		*/
		this.id = id;
		
		/*
		* Data directory. Note that you can override this if you're e.g. creating pipes on the fly.
		*/
		this.path = app.settings.configPath + '/pipelines/' + id + '/';
		
		/*
		* Legacy method to access this.workspace.path
		*/
		this.workspaceDir = () => this.workspace.path;
		
		/*
		* The stages of the pipeline. This should never have stages with the same name.
		*/
		this.stages = [];
		
		/*
		* A memory workspace shared by a running pipeline.
		* Used to e.g. hold references to SSH servers or repositories as well as the version number.
		* (added as e.g. workspace.gitRepositories or workspace.sshServers)
		*/
		this.workspace = {
			/*
			* Populated if a stage fails. When one does, the error is added here and then all following stages 
			* are checked for a 'runOnError' property
			*/
			errors: [],
			
			/*
			* These are for a summary of what happened during this pipe run. For example, commit messages. (type of 'commit').
			* {type: '..', text: ''}
			*/
			messages: [],
			
			/*
			* The workspace path.
			*/
			path: __pipe.path + 'workspace/'
		};
		
		/* 
		* Import another pipeline into this one. Runs the pipeline function passing it this instance.
		* Import returns a promise which resolves when the pipeline is ready to be started (not when it has finished).
		*  Add await/ then if you'd like to override or add additional project specific stages.
		*  Most standard pipes are ready immediately anyway but you should always return/ resolve the import promise.*/
		this.import = function(pipelineNameOrFunction, config){
			
			if(typeof pipelineNameOrFunction === "string"){
				// Include it:
				pipelineNameOrFunction = app.getTemplate('pipelines/' + pipelineNameOrFunction + '.js');
			}
			
			// Always return a promise:
			return Promise.resolve(pipelineNameOrFunction(this, app)).then(result => {
				// override stage config:
				this.overrideConfig(config);
				
				// Return whatever the pipeline did:
				return result;
			});
			
		};
		
		this.overrideConfig = config => {
			if(!config || !config.stages){
				return;
			}
			
			for(var stageName in config.stages){
				var stage = this.getStage(stageName);
				if(stage){
					Object.assign(stage.stage.config, config.stages[stageName]);
				}
			}
		}
		
		/*
		* Gets a stage with the given name. Undefined if not found.
		*/
		this.getStage = name => {
			var stage = this.stages.find(stage => stage.name == name);
			if(stage){
				return {
					index: this.stages.indexOf(stage),
					stage
				};
			}
		};
		
		/*
		* The index of a stage with the given name in the stages array. -1 if not found.
		*/
		this.indexOf = name => {
			var stage = this.getStage(name);
			if(stage){
				return stage.index;
			}
			return -1;
		}
		
		/*
		* Add a stage to the end of this pipeline, removing a stage with the same name if it exists. Some examples:
		* add("gitPull") - creates a stage called "gitPull" using ./stages/gitPull.js as its function.
		* add("gitPull", "gitPull") - the same as the above, only you can call the stage something else to include it multiple times (e.g. pull 2+ repo's).
		* add("helloWorld", function(){console.log('Hello world!');}) - Declare the stage function directly. Return a promise.
		*/
		this.add = function(stageName, stageMethodOrFileName, stageConfigOverrides){
			
			// Create the stage to add:
			var stage = this.createStage(stageName, stageMethodOrFileName, stageConfigOverrides);
			
			// Remove if exists:
			this.remove(stageName);
			
			// Insert it:
			this.stages.push(stage);
			
			return stage;
		};
		
		/*
		* An internal function which creates a stage from a name/ method and optional default config. You generally shouldn't use this, unless you're modding the stages array.
		*/
		this.createStage = function(stageName, stageMethodOrFileName, stageConfigOverrides){
			
			if(!stageConfigOverrides && typeof stageMethodOrFileName == "object"){
				// It's actually the config:
				stageConfigOverrides = stageMethodOrFileName;
				stageMethodOrFileName = null;
			}
			
			if(!stageMethodOrFileName){
				stageMethodOrFileName = stageName;
			}
			
			if(!stageConfigOverrides){
				stageConfigOverrides = {};
			}
			
			if(typeof stageMethodOrFileName === "string"){
				// Include it:
				stageMethodOrFileName = app.getTemplate('stages/' + stageMethodOrFileName + '.js');
			}
			
			var stage = {
				name: stageName,
				pipeline: this,
				workspace: this.workspace,
				method: stageMethodOrFileName,
				config: stageConfigOverrides,
				runOnError: stageMethodOrFileName.runOnError
			};
			
			return stage;
		}
		
		/*
		* Removes a stage if it exists.
		*/
		this.remove = function(stageName){
			// Does it already exist?
			var existingStage = this.getStage(stageName);
			
			if(existingStage){
				// Yes - pop the original:
				this.stages.splice(existingStage.index, 1);
				return true;
			}
			return false;
		};
		
		/*
		* See add for more details. Unlike add, this replaces existing stages in their original position. Appended otherwise.
		*/
		this.replace = function(stageName, stageMethodOrFileName, stageConfigOverrides){
			// Create the stage to add:
			var stage = this.createStage(stageName, stageMethodOrFileName, stageConfigOverrides);
			
			// Does it already exist?
			var existingStage = this.getStage(stageName);
			
			if(existingStage){
				// Yes - replace it at that index:
				this.stages[existingStage.index] = stage;
			}else{
				// Insert it:
				this.stages.push(stage);
			}
			
			return stage;
		};
		
		/*
		See add. Inserts a new stage after the named one. If the stage already exists then it is removed.
		If after is blank or not found then it gets placed at the beginning (i.e. after nothing).
		*/
		this.insertAfter = function(afterStageName, stageName, stageMethodOrFileName, stageConfigOverrides){
			// Create the stage to add:
			var stage = this.createStage(stageName, stageMethodOrFileName, stageConfigOverrides);
			
			// Remove if exists:
			this.remove(stageName);
			
			// Find the target stage:
			var goAfterThis = this.getStage(afterStageName);
			
			if(goAfterThis){
				// Insert after it:
				this.stages.splice(goAfterThis.index + 1, 0, stage);
			}else{
				if(afterStageName){
					console.notice('Pipeline stage "' + afterStageName + '" doesn\'t exist. Attempted to insert "' + stageName + '" after it. This is acceptable but probably means your pipe is wrong.');
				}
				// Insert after nothing - go at the beginning:
				this.stages.unshift(stage);
			}
			
			return stage;
		};
		/*
		See add. Inserts a new stage after the named one. If the stage already exists then it is removed.
		*/
		this.insertBefore = function(beforeStageName, stageName, stageMethodOrFileName, stageConfigOverrides){
			// Create the stage to add:
			var stage = this.createStage(stageName, stageMethodOrFileName, stageConfigOverrides);
			
			// Remove if exists:
			this.remove(stageName);
			
			// Find the target stage:
			var goBeforeThis = this.getStage(beforeStageName);
			
			if(goBeforeThis){
				// Insert before it:
				this.stages.splice(goBeforeThis.index, 0, stage);
			}else{
				if(beforeStageName){
					console.notice('Pipeline stage "' + beforeStageName + '" doesn\'t exist. Attempted to insert "' + stageName + '" before it. This is acceptable but probably means your pipe is wrong.');
				}
				// Insert before nothing - go at the end:
				this.stages.push(stage);
			}
			
			return stage;
		};
		
		/*
		* The number of stages.
		*/
		this.stageCount = () => this.stages.length;
		
		/*
		* Gets the index of the given stage.
		*/
		this.stageIndex = stage => this.stages.indexOf(stage);
		
		/*
		* Progress of a given stage.
		*/
		this.stageProgress = stage => this.stageIndex(stage) / this.stageCount();
		
		var __workspace = this.workspace;
		
		this.saveStages = buildInfo => app.build.saveStageConfig(buildInfo.id, this.stages);
		
		/*
		* Runs a block of stages in series.
		* If any fail, it searches for "runOnError" stages and runs those.
		*/
		function runStages(stageArray, events, buildInfo){
			
			return new Promise((success, reject) => {
				
				function onReject(err, stageIndex){
					// Runs when a stage fails. Find any "runOnError" stages first:
					__workspace.errors.push(err);
					
					var stagesToRunOnError = stageArray.filter((entry, index) => index > stageIndex && entry.runOnError);
					var errorStages = null;
						
					if(stagesToRunOnError.length){
						// We've got a set of stages to run!
						errorStages = runStages(stagesToRunOnError, events, buildInfo);
					}else{
						errorStages = true;
					}
					
					Promise.resolve(errorStages)
						.then(() => app.build.setStatus(buildInfo.id, 1))
						.then(() => {
							if(events && events.onFailed){
								events.onFailed(this, err);
							}
							throw err;
						})
						.catch(reject);
				}
				
				// For each stage..
				var stageMethods = stageArray.map( (stage, stageIndex) => {
					
					// Return an async method:
					return callback => {
						
						try{
							if(stage.config.forceFailure){
								// Useful for testing what happens when particular stages fail. Just add 'forceFailure' to any stages config.
								throw new Error("Forced a failure of " + stage.name + " via the stages configuration. Remove 'forceFailure' from the config.");
							}
							
							// Run the method:
							if(events && events.onRunStage){
								events.onRunStage(stage, app, this, stage.config);
							}
							var result = stage.method(stage, app, this, stage.config);
							
							// It probably returned a promise, so resolve it:
							Promise.resolve(result).then(callback).catch(e => onReject(e, stageIndex));
						}catch(e){
							onReject(e, stageIndex);
						}
						
					}
				});
				
				// -run now-
				async.series(stageMethods, success);
			});
		}
		
		/*
		* Runs this pipeline, optionally overriding settings.
		* NOTE: This will change the current working directory to the workspace. It will also generate a new build in the database.
		* If you want to have multiple pipes running at once, you must spawn a child process.
		*/
		this.run = function(settingsOverride, events){
			
			this.workspace.startTime = new Date();
			
			// First, generate the build metadata:
			return app.build.create(this.id, 2, this.stages).then(buildInfo => {
				
				// Final config override:
				this.overrideConfig(settingsOverride);
				
				// Set the version into the workspace:
				this.workspace.version = {
					major: buildInfo.versionMajor,
					minor: buildInfo.versionMinor,
					patch: buildInfo.versionPatch
				};
				
				// And a general ref to the build info:
				this.workspace.build = buildInfo;
				
				// Call the started event:
				if(events && events.onStart){
					events.onStart(this);
				}
			
				// Change to the pipeline's workspace:
				process.chdir(this.workspace.path);
				
				return runStages(this.stages, events, buildInfo).then(() => {
					// Restore cd:
					process.chdir(defaultCWD);
					
					// Update the build status:
					return app.build.setStatus(buildInfo.id, 0).then(() => {
						
						if(events && events.onSuccess){
							events.onSuccess(this);
						}
						
					})
					
				})
				.catch(err => this.saveStages(buildInfo).then(() => {throw err;}))
				.then(() => this.saveStages(buildInfo));
				
			});
		};
	};
	
	/*
	* Runs the pipeline with the given ID.
	*/
	app.pipeline.run = function(id, settingsOverride, events){
		
		var pipeline = new app.pipeline(id);
		
		// Workspace config:
		settingsOverride.workspace && Object.assign(pipeline.workspace, settingsOverride.workspace);
		
		var pipeFile = app.getWatched(pipeline.path + 'pipeline.js');
		
		return Promise.resolve(pipeFile(pipeline, app)).then(() => pipeline.run(settingsOverride, events));
	};
	
	/*
	* Gets the metadata for a given pipeline.
	*/
	app.pipeline.getInfo = function(id){
		
		return new Promise((success, reject) => {
			app.database.query('select * from pipelines where id=?', [id], (err, results) => {
				if(err){
					reject(err);
					return;
				}
				success(results[0]);
			})
		});
		
	}
	
	/*
	* Gets a stage/ pipeline template sequentially (as it's via require). 
	* These can be overriden via a templates directory in your config dir.
	* The return is null if not found.
	*/
	app.getTemplate = function(templatePath, asText){
		var file = app.getWatched(path.resolve(app.settings.configPath + '/templates/' + templatePath), asText);
		
		if(file === null){
			file = app.getWatched(path.resolve(app.settings.templatePath + '/' + templatePath), asText);
		}
		
		return file;
	}
	 
	var watchedFiles = {};
	
	// Uncaches the given resolved path if it changes
	function watchFile(filePath){
		
		fs.watch(filePath, function(){
			delete require.cache[filePath];
		});
		
		return true;
	}
	
	/* Gets file contents by require()ing it, and watching it for changes. */
	app.getWatched = function(filePath, asText){
		
		if(!require.cache[filePath]){
			
			// First check it even exists:
			if(!fs.existsSync(filePath)){
				// Soft error here.
				return null;
			}
			
			if(!watchedFiles[filePath]){
				// Note that it definitely exists due to the check above.
				watchedFiles[filePath] = watchFile(filePath);
			}
		}
		
		if(asText){
			return fs.readFileSync(filePath, {encoding: 'utf8'});
		}
		return require(filePath);
	};
	
};