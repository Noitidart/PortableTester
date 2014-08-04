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

function addEngine() {
	/*
	var browserSearchService = Components
	        .classes["@mozilla.org/browser/search-service;1"]
	        .getService(Components.interfaces.nsIBrowserSearchService);
	
	var EngineProperties = {
	                xml :   'chrome://portabletester/content/engine.xml',
	                dataType: 3,
	                iconURL : 'chrome://portabletester/content/icon.png',
	                confirm : false,
	                callback : function addEngineCallback(){
	                    console.log('Jason is the greatest');           
	                }
	            }
	
	browserSearchService.addEngine( EngineProperties.xml,
	                                            EngineProperties.dataType,
	                                            EngineProperties.iconURL,
	                                            EngineProperties.confirm,
	                                            EngineProperties.callback);	
	*/
	const typeXML = Ci.nsISearchEngine.TYPE_OPENSEARCH; //Ci.nsISearchEngine.DATA_XML;
	Services.search.addEngine('chrome://portabletester/content/engine.xml', typeXML, 'chrome://portabletester/content/icon.png', true);
}

function install() {}

function uninstall() {}

function startup() {
	console.time('starting addEngine');
	try {
		addEngine();
	} finally {
		console.timeEnd('starting addEngine');
	}
}
 
function shutdown() {
}
