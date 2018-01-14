// For testing your pipeline. Including this will make it fail when this stage is reached.

module.exports = (stage, app) => {
	throw new Error('Forced failure via the "fail" stage. Remove the stage called "fail" from your pipeline.');
};
