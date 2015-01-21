const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.importGlobalProperties(['File']);

function install() {}
function uninstall() {
}
function startup() {
 Services.prompt.alert(null, 'starting up', 'startup')
 console.log('File:', File)

}
 
function shutdown() {
}
