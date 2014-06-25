function install() {}
function uninstall(aData, aReason) {
Components.utils.reportError("uninstall!");
Components.utils.reportError(aData);
Components.utils.reportError(aReason);
}
function startup() {
Components.utils.reportError("startup!");
}
 
function shutdown() {
Components.utils.reportError("shutdown!");
}
