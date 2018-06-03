/*
   An example standard pipeline.
   Ideally you want all your projects to share the same pipeline for simplicity 
   (or at least the same core pipeline - individual projects can remove/ insert/ add stages).
   For modularity, it uses standard stages which are being imported from the directory called 'stages'.
*/

module.exports = (pipeline, app) => {
   
   // Using pipeline.add adds stages which will run in the given order. Adding the same name twice will overwrite.
   // Use pipeline.insert, pipeline.remove to push additional stages to an already built pipe.
   
   // 1. Pull from the git repo:
   pipeline.add("git-pull");
   pipeline.add("git-diff");
   
   // 2. Detect and run tests (looks for dirs in pulled repo's called "test"):
   // pipeline.add("test");
   
   // 3. Upload over SSH. Connect:
   // pipeline.add("ssh-connect");
   
   // 4. Run the server-side hotswap:
   // pipeline.add('ssh-exec');
   
   // 5. Update slack:
   pipeline.add("slack-notify");
   
   // Alternatively you can use a standard stage but with a different name (so you can e.g. use them multiple times):
   /*
   pipeline.add("git-pull-ui", "git-pull");
   pipeline.add("git-pull-api", "git-pull");
   */
}