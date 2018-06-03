var exec = require('child_process').exec;
var fs = require('fs');

var args = process.argv;

if(args.length < 4){
	throw new Error('Must have 2 args. First arg is the path to the tar.gz file, and the second arg is the target location to decompress it to, overwriting the target files.');
}

var tarPath = args[2];
var target = args[3];

// Decompress:
exec('sudo tar --overwrite --mode="a+rwX" -xzf "' + tarPath + '" -C "' + target + '"', function(err, stdout, stderr) {
	console.log(stdout);
	console.log(stderr);
	// Delete the archive:
	fs.unlink(tarPath, function(){});
});