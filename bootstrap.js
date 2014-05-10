const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');

function startup(aData, aReason) {
	var CurWorkD = Services.dirsvc.get('CurWorkD', Ci.nsIFile);
	var XREExeF = Services.dirsvc.get('XREExeF', Ci.nsIFile);
	if (XREExeF.parent.parent.path.indexOf(CurWorkD.path) > -1) {
		Services.prompt.alert(null, 'PortableTest', 'TRUE');
	} else {
        Services.prompt.prompt(null, 'PortableTest', 'FALSE', {value:XREExeF.path + ' || ' + CurWorkD.path}, null, {});
	}
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
}

function install() {}

function uninstall() {}