const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const {Blob, Services} = Cu.import('resource://gre/modules/Services.jsm', {});

function install() {}
function uninstall() {
}
function startup() {
 Services.prompt.alert(null, 'starting up', 'startup')
 console.log('File:', Blob)

}
 
function shutdown() {
}
