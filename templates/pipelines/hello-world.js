/*
   A basic pipeline which just includes a stage called "hello world" which just calls console.log('Hello world!') when it runs.
*/

module.exports = (pipeline, app) => {
   // Adds the stage called "hello-world" stored in templates/stages/hello-world.js
   pipeline.add("hello-world");
   
   // You can also directly add functions too (but we give the stage a name so it can be configured/ identified):
   /*
   pipeline.add("hello-world", () => console.log('Hello world!'));
   */
}