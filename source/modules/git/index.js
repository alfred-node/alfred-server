var git = require('nodegit');
var fs = require('fs');
var path = require('path');

module.exports = app => {
	app.git = {
		git,
		update: (remotePath, localPath, branch, options) => {
			
			options = options || {};
			
			var callbacks = {
				certificateCheck: function() {
					// Require cert checks on https
					return 1;
				},
				credentials: function(url, userName) {
					
					if(!options.credentials){
						return;
					}
					
					// Load up the creds:
					var creds = app.credentials.load(options.credentials);
					
					if(creds.password){
						// User/password:
						return git.Cred.userpassPlaintextNew(creds.username, creds.password);
					}
					
					if(creds.publickkey){
						// SSH:
						return git.Cred.sshKeyMemoryNew(creds.username, creds.publickkey, creds.privatekey, creds.passphrase);
					}
					
					if(creds.username){
						// Username only:
						return git.Cred.usernameNew(creds.username);
					}
				}
			};
			
			// Clone options:
			var cloneOptions = {
				fetchOpts:{
					callbacks
				}
			};
			
			// Apply custom clone options:
			options.clone && Object.assign(cloneOptions, options.clone);
			
			var repository;
			
			// Try opening the repo:
			return new Promise((fulfil, reject) =>{
				
				git.Repository.open(localPath + '/.git').then(function(repo) {
					repository = repo;
					// Ok - fetch:
					return repository.fetchAll({
					  callbacks
					});
				  }, err => {
					  // Unable to open the repo - clone it:
						return git.Clone(remotePath, localPath, cloneOptions).then(repo => repository = repo);
				  })
				  .then(() => branch && repository.checkoutBranch("origin/" + branch))
				  .then(() => fulfil(repository));
			});
		},
		checkout: (repository, branch, options) => {
			/* .then(() => {
			  // Merge next:
			  return repository.mergeBranches(branch, "origin/" + branch);
			  }) */
			  // Checkout target branch (head)
		    return repository.checkoutBranch("origin/" + branch, options.checkout);
		}
	};
};