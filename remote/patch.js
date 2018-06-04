var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var args = process.argv;

if(args.length < 4){
	throw new Error('Must have 2 args. First arg is the path to the tar.gz file, and the second arg is the target location to decompress it to, overwriting the target files.');
}

var tarPath = args[2];
var target = args[3];

mkdir(target, null, function(err){
	// It'll error if it already existed. Ignore that.
	if (err && err.code !== 'EEXIST'){
		throw err;
	}
	
	// Decompress:
	exec('sudo tar --overwrite --mode="a+rwX" -xzf "' + tarPath + '" -C "' + target + '"', function(err, stdout, stderr) {
		console.log(stdout);
		console.log(stderr);
		// Delete the archive:
		fs.unlink(tarPath, function(){});
	});
});




/*
 * functions
 */
/**
 * make directory recursively
 * 
 * @function mkdirRecursive
 * @param {String} root - absolute root where append chunks
 * @param {Array} chunks - directories chunks
 * @param {Number} mode - directories mode, see Node documentation
 * @param {Function} callback - next callback
 */
function mkdirRecursive(root, chunks, mode, callback) {

  var chunk = chunks.shift();
  if (!chunk) {
    return callback(null);
  }
  var root = path.join(root, chunk);

  return fs.exists(root, function(exists) {

    if (exists === true) { // already done
      return mkdirRecursive(root, chunks, mode, callback);
    }
    return fs.mkdir(root, mode, function(err) {
      if (err && err.code !== 'EEXIST')
          return callback(err);
      
      return mkdirRecursive(root, chunks, mode, callback); // let's magic
    });
  });
}

/**
 * make main. Check README.md
 * 
 * @exports mkdir
 * @function mkdir
 * @param {String} root - pathname
 * @param {Number} mode - directories mode, see Node documentation
 * @param {Function} callback - next callback
 */
function mkdir(root, mode, callback) {

  if (typeof mode === 'function') {
    var callback = mode;
    var mode = null;
  }
  if (typeof root !== 'string') {
    throw new Error('missing root');
  } else if (typeof callback !== 'function') {
    throw new Error('missing callback');
  }

  var chunks = root.split(path.sep); // split in chunks
  var chunk;
  if (path.isAbsolute(root) === true) { // build from absolute path
    chunk = chunks.shift(); // remove "/" or C:/
    if (!chunk) { // add "/"
      chunk = path.sep;
    }
  } else {
    chunk = path.resolve(); // build with relative path
  }

  return mkdirRecursive(chunk, chunks, mode, callback);
}