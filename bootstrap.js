const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');

function install() {}
function uninstall() {
}
function startup() {
 Services.prompt.alert(null, 'starting up', 'open addons panel by ctrl+shift+a and then click options button on the addon titled "PortableTester"')

}
 
function shutdown() {
}
