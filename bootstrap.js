const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const self = {
	id: 'PortableTester',
	suffix: '@jetpack',
	path: 'chrome://portabletester/content/',
	aData: 0,
};
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');


function install() {}

function uninstall() {}

function startup() {
	//import self modules
	Cu.import(self.path + 'modules/subprocess.jsm');
	console.info(subprocess);
}
 
function shutdown(aReason) {
	if (aReason == APP_SHUTDOWN) return;
	Cu.unload(self.path + 'modules/subprocess.jsm');
}
