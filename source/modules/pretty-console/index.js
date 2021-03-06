var colors = require('colors');

/*
Extends console with an ok method - it'll add [OK] to the start (in green).
*/
console.ok = (...args) => {
	console.log('[' + 'OK'.green + '] ', ...args);
};

/*
Extends console with a fail method - it'll add [ERROR] to the start (in red).
*/
console.fail = (...args) => {
	console.log('[' + 'ERROR'.red + '] ', ...args);
};

/*
Extends console with a notice/ warn method - it'll add [WARNING] to the start (in red).
*/
console.notice = (...args) => {
	console.log('[' + 'WARNING'.yellow + '] ', ...args);
}