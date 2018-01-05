# alfred-server
Alfred is a (very much a work in progress!) CI/CD server written in Javascript for Node.js. Everything - pipelines included - is defined in Javascript.

# Installation

(Coming soon!) Install the Alfred server globally:

```
// npm install -g alfred-server
```

# Startup

To start Alred, you'd usually run it with the config path you'd like to use. The config path contains your overall config, encrypted credentials and the pipelines themselves:

```
alfred-server ./path-to-a-suitable-config-directory/
```

If you don't provide a path, `./configAndData/` is used by default. If the directory is empty then Alfred will create the `pipelines` directory and copy in a default `settings.js` too.

# Configuration

Alfred currently uses a MySQL database to store its historical run information. If Alfred doesn't have any database config (in a file called `settings.js` in the config directory) then it will request the database connection details when it runs.

# Creating your first pipeline

An Alfred pipeline is just a Javascript function which creates a series of 'stages'. To create one, first create a JS file like this:

`configDirectory/pipelines/a-suitable-pipeline-name-or-id/pipeline.js`

Here's a basic hello world pipeline:

```
module.exports = (pipeline, app) => {
    // Adds the stage called "hello-world" stored in templates/stages/hello-world.js
	pipeline.add("hello-world");
	
	// You can also directly add functions too (but we give the stage a name so it can be configured/ identified):
	// pipeline.add("hello-world", () => console.log('Hello world!'));
}
```

Run the pipeline via the Alfred web API:
`http://localhost:8088/v1/pipeline/start?name=a-suitable-pipeline-name-or-id`

# Templates

You might have a workflow which is similar across a variety of your projects but only varies in their configuration. For example if you make websites then the testing and deployment process of most of those websites is probably the same, aside from server specific config. This is where you can make use of a template and `pipeline.import`:

```
module.exports = (pipeline, app) => {
    
	// Project specific settings:
    var settings = {
       stages: {
           'git-pull': { // Overrides settings for a stage called "git-pull".
			   url: 'https://...',
			   credentials: CREDS_ID_OR_RAW_OBJECT
		   }
       }
    };
    
    // Import your standard pipeline:
    // (Ideally you want as many projects as possible to use the same pipe).
    // Import returns a promise which resolves when the pipeline is ready to be started (not when it has finished).
    // Add await/ then if you'd like to override or add additional project specific stages.
	// Most standard pipes are ready immediately anyway but you should always return/ resolve the import promise.
    return pipeline.import("standard", settings);
}
```

Import simply applies the named template to this pipeline which comes from (in the above example) `templates/pipelines/standard.js`. You can even import repeatedly if you want and stages will just be added together or overriden if the same stage name occurs multiple times.

# The settings hierarchy

In order to minimise repetition of settings, there is a hierarchy of settings overriding others:

* Run settings: When you run a pipeline directly (using `app.pipeline.run("pipeline-name", {stages: {"git-pull": {url: ..}}})`) you can provide settings. These override all other settings.
* Imported pipeline settings: Overriden by run settings. E.g: `pipeline.import("standard", {stages: {"git-pull": {url: ..}})`. These are generally the ones you'll use.
* Stage settings: The various stage adding methods like `pipeline.add` accept settings too. `pipeline.add("git-pull", undefined, {url: ..})`
* When possible, the stage itself should use suitable defaults. These are overriden by everything else.

# Credentials

Alfred includes an easy to use encrypted credential store so you should generally use that instead of writing your more sensitive details in the settings like this:

```
// Don't do this!
var settings = {
       stages: {
           'git-pull': {
			   url: 'https://...',
			   credentials: {
			       username: 'avoid-doing-this',
				   password: 'whenever-possible'
			   }
		   }
       }
    };
```

```
// Better!
var settings = {
       stages: {
           'git-pull': {
			   url: 'https://...',
			   credentials: 'alfreds-github-login'
		   }
       }
    };
```

In order to create `alfreds-github-login`, either call `app.credentials.add('alfreds-github-login', {username: '...', password: '..'})` or add it via the credentials API endpoint:

POST to `http://localhost:8088/v1/credential/add` or `http://localhost:8088/v1/credential/update`
```
{
	key: 'alfreds-github-login',
	data: {
	    username: 'i-am-alfred',
		password: '...'
	}
}
```

'alfreds-github-login' is now a permanently stored credential. You can use that textual name to reference it when it's needed (in stages that support it). Stages that use sensitive credentials can load it using:

`app.credentials.load('alfreds-github-login')` (if you pass something that isn't a string, then it will just return whatever you gave it in order to easily support inline credentials too).
