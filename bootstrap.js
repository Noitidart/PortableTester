const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const self = {
	id: 'PortableTester',
	suffix: '@jetpack',
	path: 'chrome://portabletester/content/',
	aData: 0,
};
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');


function install() {}

function uninstall() {}

function startup() {
	//import self modules
	Cu.import(self.path + 'modules/subprocess.jsm');
	console.info(subprocess);
	
	if (Services.appinfo.OS == 'WINNT') {
		var ps = "C:\\windows\\system32\\tasklist.exe";
		var args = [];
		
		var buffer = [];
		subprocess.call({
			command: ps,
			arguments: args,
			stdout: function(data) {
				buffer.push(data);
			},
			done: function() {
				//var lines = buffer.join('').split('\n');
				console.log('buffer:', buffer)
			}
		});
	} else {
		//subprocess example for non windows not yet implemented but plan to jack from here: https://github.com/ochameau/adbhelper/blob/fd3073a0f5f51e1707a5b4cbace82b13fb5a1fe5/adb.js#L192
	}
}
 
function shutdown(aReason) {
	if (aReason == APP_SHUTDOWN) return;
	Cu.unload(self.path + 'modules/subprocess.jsm');
}
