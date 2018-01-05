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
		
		/*
		* ID of this pipeline. References
		*/
		this.id = id;
		
		/*
		* Data directory. Note that you can override this if you're e.g. creating pipes on the fly.
		*/
		this.path = './configAndData/pipelines/' + id + '/';
		
		/*
		* A running pipe cd's to this.
		*/
		this.workspaceDir = () => this.path + 'workspace/';
		
		/*
		* The stages of the pipeline. This should never have stages with the same name.
		*/
		this.stages = [];
		
		/*
		* A memory workspace shared by a running pipeline.
		* Used to e.g. hold references to SSH servers or repositories.
		* (added as e.g. workspace.gitRepositories or workspace.sshServers)
		*/
		this.workspace = {};
		
		/* 
		* Import another pipeline into this one. Runs the pipeline function passing it this instance.
		* Import returns a promise which resolves when the pipeline is ready to be started (not when it has finished).
		*  Add await/ then if you'd like to override or add additional project specific stages.
		*  Most standard pipes are ready immediately anyway but you should always return/ resolve the import promise.*/
		this.import = function(pipelineNameOrFunction, config){
			
			if(typeof pipelineNameOrFunction === "string"){
				// Include it:
				pipelineNameOrFunction = require('../../../templates/pipelines/' + pipelineNameOrFunction);
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
			if(!stageMethodOrFileName){
				stageMethodOrFileName = stageName;
			}
			
			if(!stageConfigOverrides){
				stageConfigOverrides = {};
			}
			
			if(typeof stageMethodOrFileName === "string"){
				// Include it:
				stageMethodOrFileName = require('../../../templates/stages/' + stageMethodOrFileName);
			}
			
			var stage = {
				name: stageName,
				pipeline: this,
				workspace: this.workspace,
				method: stageMethodOrFileName,
				config: stageConfigOverrides
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
		this.replace = function(stage){
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
		* Runs this pipeline, optionally overriding settings.
		* NOTE: This will change the current working directory to the workspace.
		* If you want to have multiple pipes running at once, you must spawn a child process.
		*/
		this.run = function(settingsOverride, events){
			
			// Final config override:
			this.overrideConfig(settingsOverride);
			
			return new Promise((success, reject) => {
				
				// For each stage..
				var stageMethods = this.stages.map( (stage, stageIndex) => {
					
					// Return an async method:
					return callback => {
						
						try{
							// Run the method:
							if(events && events.onRunStage){
								events.onRunStage(stage, stageIndex, this.stages.length, this);
							}
							var result = stage.method(stage, app, this, stage.config);
							
							// It probably returned a promise, so resolve it:
							Promise.resolve(result).then(callback).catch(reject);
						}catch(e){
							reject(e);
						}
						
					}
				});
				
				// Change to the pipeline's workspace:
				console.log(this.workspaceDir());
				process.chdir(this.workspaceDir());
				
				// -run now-
				async.series(stageMethods, () => {
					
					// Restore cd:
					process.chdir(defaultCWD);
					
					// Ok!
					success();
				});
				
			});
			
		};
	};
	
	/*
	* Runs the pipeline with the given ID.
	*/
	app.pipeline.run = function(id, settingsOverride){
		
		var pipeline = new app.pipeline(id);
		
		var pipeFile = require('../../.' + pipeline.path + 'pipeline.js');
		
		return Promise.resolve(pipeFile(pipeline, app)).then(() => pipeline.run(settingsOverride));
	};
	
};