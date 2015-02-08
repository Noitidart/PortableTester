const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
const self = {
	name: 'Profilist',
	id: 'Profilist@jetpack',
	chrome_path: 'chrome://profilist/content/',
	aData: 0,
};

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');

Cu.importGlobalProperties(['TextDecoder']);

var myServices = {};
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'ds', function () { return Services.dirsvc.QueryInterface(Ci.nsIDirectoryService) });

// start fake bundleService
myServices.stringBundle = {
	GetStringFromName: function(nam) {
		switch (nam) {
			case 'mac-paths-override-prompt-title':
				return 'Restart Recommended';
			case 'mac-paths-override-prompt-text':
				return 'This is the first run of ' + self.name + ' in this profile via Mac OS X shortcut. Firefox needs to restart for changes to take complete affect.';
			case 'restart':
				return 'Restart';
			case 'not-now':
				return 'Not Now'
			default:
				throw new Error('nam not found in  bundle');
		}
	}
};
// end fake bundleService

// start - helper functions
var vcLs30; //jsBool for if this ff version is < 30
function getVcLs30() {
	if (vcLs30 === null || vcLs30 === undefined) {
		vcLs30 = (Services.vc.compare(Services.appinfo.version, 30) < 0);
	}
}

var txtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!txtDecodr) {
		txtDecodr = new TextDecoder();
	}
	return txtDecodr;
}
function Deferred() {
	// this function gets the Deferred object depending on what is available, if not available it throws
	
	if (Promise && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (PromiseUtils && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
		try {
			/* A method to resolve the associated Promise with the value passed.
			 * If the promise is already settled it does nothing.
			 *
			 * @param {anything} value : This value is used to resolve the promise
			 * If the value is a Promise then the associated promise assumes the state
			 * of Promise passed as value.
			 */
			this.resolve = null;

			/* A method to reject the assocaited Promise with the value passed.
			 * If the promise is already settled it does nothing.
			 *
			 * @param {anything} reason: The reason for the rejection of the Promise.
			 * Generally its an Error object. If however a Promise is passed, then the Promise
			 * itself will be the reason for rejection no matter the state of the Promise.
			 */
			this.reject = null;

			/* A newly created Pomise object.
			 * Initially in pending state.
			 */
			this.promise = new Promise(function(resolve, reject) {
				this.resolve = resolve;
				this.reject = reject;
			}.bind(this));
			Object.freeze(this);
		} catch (ex) {
			throw new Error('Promise/Deferred is not available');
		}
	}
}
function read_encoded(path, options) {
	// because the options.encoding was introduced only in Fx30, this function enables previous Fx to use it
	// must pass encoding to options object, same syntax as OS.File.read >= Fx30
	// TextDecoder must have been imported with Cu.importGlobalProperties(['TextDecoder']);
	
	var deferred_read_encoded = new Deferred();
	var promise_read_encoded = deferred_read_encoded.promise;
	
	if (!options || !('encoding' in options)) {
		throw new Error('Must pass encoding in options object');
	}
	
	if (getVcLs30()) {
		//var encoding = options.encoding; // looks like i dont need to pass encoding to TextDecoder, not sure though for non-utf-8 though
		delete options.encoding;
	}
	var promise_read = OS.File.read(path, options);
	
	promise_read.then(
		function(aVal) {
			console.log('Fulfilled - promise_read - ');
			var readStr;
			if (getVcLs30()) {
				readStr = getTxtDecodr().decode(aVal); // Convert this array to a text
			} else {
				readStr = aVal;
			}
			deferred_read_encoded.resolve(readStr);
		},
		function(aReason) {
			var rejObj = {
				promiseName: 'promise_read',
				aReason: aReason
			};
			console.error('Rejected - ' + rejObj.promiseName + ' - ', rejObj);
			deferred_read_encoded.reject(aReason); // i return aReason here instead of my usual rejObj so it works just like OS.File.read
		}
	).catch(
		function(aCaught) {
			console.error('Caught - promise_read - ', aCaught);
			throw aCaught;
		}
	);
	
	return promise_read_encoded;
}
// end - helper functions

// start - check and override functions
// start - for use in dirProvider, getFile
var overidingDirProvider;
function overrideSpecialPaths(pathsFileContentsJson) {
	// returns nothing
	var nsIFile_origAlias = {};
	
	var aliasAppPath = Services.dirsvc.get('XREExeF', Ci.nsIFile).parent.parent.parent.path;
	
	var mainAppPath = pathsFileContentsJson.mainAppPath;
	var main_profLD_LDS_basename = pathsFileContentsJson.main_profLD_LDS_basename;
	
	var specialKeyReplaceType = {
		//group
		'XREExeF': 3,
		'XREAppDist': 3,
		'DefRt': 3,
		'PrfDef': 3,
		'profDef': 3,
		'ProfDefNoLoc': 3,
		'ARes': 3,
		'AChrom': 3,
		'APlugns': 3,
		'SrchPlugns': 3,
		'XPIClnupD': 3,
		'CurProcD': 3,
		'XCurProcD': 3,
		'XpcomLib': 3,
		'GreD': 3,
		'GreBinD': 3,
		//group
		'UpdRootD': 5,
		//group
		'ProfLDS': 4,
		'ProfLD': 4
	};
	
	var replaceTypes = {
		3: function(key) {
			//replace aliasAppPath with mainAppPath after getting orig key value
			var newpath = nsIFile_origAlias[key].path.replace(aliasAppPath, mainAppPath);
			return new FileUtils.File(newpath);
		},
		4: function(key) {
			// for ProfLD and ProfLDS
			// replace basename of alias with basename of main IF its IsRelative=1
			// ProfLD and ProfLDS are same in all cases, IsRelative==1 || 0 and reg || alias
			// DefProfLRt AND DefProfRt are same in alias and reg in both IsRelative 1 and 0
			// IsRelative=1 ProfLD and ProfLDS are based on DefProfLRt in regular, but on DefProfRt in alias
			// so to detect if IsRelative == 1 I can test to see if ProfLD and ProfLDS contain DefProfLRt OR DefProfRt
			if (nsIFile_origAlias[key].path.indexOf(Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path) > -1 || nsIFile_origAlias[key].path.indexOf(Services.dirsvc.get('DefProfRt', Ci.nsIFile).path) > -1) {
				// ProfLD or ProfLDS are keys, and they contain either DefProfLRt or DefProfRt, so its a realtive profile
				// IsRelative == 1
				// so need fix up on ProfLD and ProfLDS
				var newAlias_ProfLD_or_ProfLDS = nsIFile_origAlias[key].path.replace(nsIFile_origAlias['ProfLD'].parent.path, main_profLD_LDS_basename);
				return new FileUtils.File(newAlias_ProfLD_or_ProfLDS);
			} else {
				//IsRelative == 0
				// so no need for fix up, just return what it was
				console.log('no need for fixup of ProfLD or ProfLDS as this is custom path profile, meaning its absolute path, meaning IsRelative==0');
				return nsIFile_origAlias[key];
			}
		},
		5: function() {
			// for UpdRootD
			// replaces the aliasAppPath (minus the .app) in UpdRootD with mainAppPath (minus the .app)
			var aliasAppPath_noExt = aliasAppPath.substr(0, aliasAppPath.length-('.app'.length));
			var mainAppPath_noExt = mainAppPath.substr(0, mainAppPath.length-('.app'.length));
			var newpath = nsIFile_origAlias['UpdRootD'].path.replace(aliasAppPath_noExt, mainAppPath_noExt);
			return new FileUtils.File(newpath);
		}
		// not yet cross checked with custom path
	};
	
	overidingDirProvider = {
		getFile: function(aProp, aPersistent) {
			aPersistent.value = true;
			if (replaceTypes[specialKeyReplaceType[aProp]]) {
				return replaceTypes[specialKeyReplaceType[aProp]](aProp);
			}
			return null;
		},
		QueryInterface: function(aIID) {
			if (aIID.equals(Ci.nsIDirectoryServiceProvider) || aIID.equals(Ci.nsISupports)) {
				return this;
			}
			console.error('override DirProvider error:', Cr.NS_ERROR_NO_INTERFACE, 'aIID:', aIID);
		}
	};

	for (var key in specialKeyReplaceType) {
		nsIFile_origAlias[key] = Services.dirsvc.get(key, Ci.nsIFile);
		/*
		if (specialKeyReplaceType[key] == 2) {
			path_origAlias[key] = Services.dirsvc.get(key, Ci.nsIFile).path;
		}
		*/
		myServices.ds.QueryInterface(Ci.nsIProperties).undefine(key);
	}
	myServices.ds.registerProvider(overidingDirProvider);
	//myServices.ds.unregisterProvider(dirProvider);
	console.log('oevrrid');
}
// end - for use in dirProvider, getFile

function checkIfShouldOverridePaths() {
	console.error('execing checkIfShouldOverridePaths(): ', new Date().toJSON());
	//doesnt retrurn anything, can set global var though if overrid or not
	// note: if the paths are already changed, and it does go the check file method, it will find that file doesnt exist so it wont override
		// Rejected - promise_read - " Object { promiseName: "promise_read", aReason: Object } bootstrap.js:106
		// "Rejected - promise_readThisPathsFile - BUT if it doesnt exist that just means we dont need to override paths, so this is fine" Object { promiseName: "promise_readThisPathsFile", aReason: Object }
	// but if pref method we should check if 'profilist_data' is in like XREExeF and if it is then it should continue
	// note: rather then check on override, im just unregistringProvider on shutdown, so on upgrade no need to check
	var pathsPrefContentsJson;
	try {
		pathsPrefContentsJson = Services.prefs.getCharPref('extension.Profilist@jetpack.mac-paths-fixup');
	} catch (ex if ex.result == Cr.NS_ERROR_UNEXPECTED) {
		// Cr.NS_ERROR_UNEXPECTED is what is thrown when pref doesnt exist
	}
	
	if (pathsPrefContentsJson) {
		// actually forget it, just on shutdown i should unregister the dirProvider
		overrideSpecialPaths(JSON.parse(pathsPrefContentsJson));
	} else {
		//pref doesnt exist so read from file
		// if its going this way it means pref doesnt exist, so user should restart, so prompt asking if it should after done
		var path_to_ThisPathsFile = OS.Path.join(Services.dirsvc.get('GreBinD', Ci.nsIFile).path, 'profilist-main-paths.json');
		var promise_readThisPathsFile = read_encoded(path_to_ThisPathsFile, {encoding:'utf-8'});
		promise_readThisPathsFile.then(
			function(aVal) {
				console.error('read fullfilled: ', new Date().toJSON());
				console.log('Fulfilled - promise_readThisPathsFile - ', aVal);
				console.log('need to override, starting now');
				overrideSpecialPaths(JSON.parse(aVal)); //lets go stragiht to override, we'll right the pref afterwards, just to save a ms or two
				Services.prefs.setCharPref('extension.Profilist@jetpack.mac-paths-fixup', aVal); // im not going to set a default on this, because if i do then on startup the pref wont exist so it would have to written first, which would require me to read the file on disk, which we want to avoid
				console.log('pref written');
				// do prompt // i dont have to restart if this happens on startup of browser, but this is very rare for it to trigger on startup of browser, so dont bother testing
				var tempVar = 'rawr';
				var confirmArgs = {
					aParent:	(tempVar = Services.wm.getMostRecentWindow('navigator:browser')) ? tempVar : Services.wm.getMostRecentWindow(null), // this line tries to get most recent browser win, if found it uses then, else if goes with most recent window null, and if that finds othing then aParent is null, which is an acceptable value // if dont use parenthesis here tempVar is whatever the last value of tempVar was
					aDialogTitle:	self.name + ' - ' + myServices.stringBundle.GetStringFromName('mac-paths-override-prompt-title'),
					aText:		myServices.stringBundle.GetStringFromName('mac-paths-override-prompt-text'),
					aButton0Title:	myServices.stringBundle.GetStringFromName('restart'),
					aButton1Title:	myServices.stringBundle.GetStringFromName('not-now'),
					aButton2Title:	null,
					aCheckMsg:	null, //display no check box
					aCheckState:	{} // if want default check state, set value key to true or false
				};
				confirmArgs.aButtonFlags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING + Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING;
				var rez_confirmEx = Services.prompt.confirmEx(null, confirmArgs.aDialogTitle, confirmArgs.aText, confirmArgs.aButtonFlags, confirmArgs.aButton0Title, confirmArgs.aButton1Title, confirmArgs.aButton2Title, confirmArgs.aCheckMsg, confirmArgs.aCheckState);
				if (rez_confirmEx === 0) {
					if (rez_confirmEx === 0) {
						var cancelQuit = Cc['@mozilla.org/supports-PRBool;1'].createInstance(Ci.nsISupportsPRBool);
						Services.obs.notifyObservers(cancelQuit, 'quit-application-requested', null);
						if (!cancelQuit.data) {
							Services.obs.notifyObservers(null, 'quit-application-granted', null);
							Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
						}
					}
				}
				//deferred_readThenWritePlist.resolve();
			},
			function(aReason) {
				var rejObj = {
					promiseName: 'promise_readThisPathsFile',
					aReason: aReason
				};
				if (rejObj.aReason.becauseNoSuchFile) {
					console.log('Rejected - ' + rejObj.promiseName + ' - BUT if it doesnt exist that just means we dont need to override paths, so this is fine', rejObj);
					return;
				}
				console.error('Rejected - ' + rejObj.promiseName + ' - ', rejObj);
				//deferred_readThenWritePlist.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_readThisPathsFile - ', aCaught);
				throw aCaught;
			}
		);
	}
}
// end - check and override functions

checkIfShouldOverridePaths();

function install() {}
function uninstall() {}
function startup() {
	console.error('execing startup(): ', new Date().toJSON());
}
 
function shutdown() {
	if (aReason == APP_SHUTDOWN) { return; }
	if (overidingDirProvider) {
		// its not undefined, so it was registered
		// in ureg because its needed so Profilist can upgrade gracefully
	}
}
