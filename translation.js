/**
 * Translate text to semantic representation using a classifier-based translation server.
 */


var HOST=process.env.TRANSLATION_SERVER_HOST || "http://irsrv2.cs.biu.ac.il";
var SETTINGS = {
	port: process.env.TRANSLATION_SERVER_PORT || 9995, 
	'force new connection': true, 
	'sync disconnect on unload': true
};
var socket_io_client = require('socket.io-client');

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

function newTranslationSocket(translatorName) {
	logWithTimestamp(translatorName+" tries to connect to translation server at "+HOST+":"+SETTINGS.port);
	var translationSocket = socket_io_client.connect(HOST, SETTINGS); 

	translationSocket.on('connect', function () { 
		logWithTimestamp(translatorName+" connected to translation server at "+HOST+":"+SETTINGS.port);
	});
	
	translationSocket.on('translation', function (result) {
		logWithTimestamp(translatorName + " receives "+result.translations.length+" translations from '"+result.classifierName+"' to "+JSON.stringify(result.text) + ": "+JSON.stringify(result.translations));
	});

	translationSocket.on('disconnect', function () { 
		logWithTimestamp(translatorName+" disconnected from translation server at "+HOST+":"+SETTINGS.port);
	});

	translationSocket.on('error', function () { 
		logWithTimestamp(translatorName+" FAILED to connect translation server at "+HOST+":"+SETTINGS.port);
	});

	translationSocket.on('reconnect_failed', function () { 
		logWithTimestamp(translatorName+" FAILED to reconnect translation server at "+HOST+":"+SETTINGS.port);
	});

	return translationSocket;
}

exports.Translator = function(translatorName) {
	this.translatorName = translatorName;
	this.translationSocket = newTranslationSocket(translatorName);
}


/** 
 * Ask the server to translate a certain text.
 * @param callback [optional] - called when the translation arrives.
 */
exports.Translator.prototype.sendToTranslationServer = function(classifierName, text, forward, callback) {
	if (!this.translationSocket.socket.connected && !this.translationSocket.socket.connecting && !this.translationSocket.socket.reconnecting) {
		logWithTimestamp(this.translatorName+" tries to re-connect to translation server at "+HOST+":"+SETTINGS.port);
		this.translationSocket.socket.reconnect();
	}
	logWithTimestamp(this.translatorName+(this.translationSocket.socket.connected? "": " (UNCONNECTED) ")+" asks '"+classifierName+"' to "+(forward? "translate ": "generate ")+ JSON.stringify(text));
	var multiple = !(text instanceof Array);
	
	if (callback) {
		var translationSocket=this.translationSocket;
		var oneTimeCallback = function (result) {
			var sameClassifier=(result.classifierName===classifierName);
			var sameText=arraysEqual(result.text,text);
			var sameForward=(result.forward==forward);
			console.log("\toneTimeCallback("+sameClassifier+","+sameText+","+sameForward+")");
			if (sameClassifier && sameText && sameForward) {
				callback(text, result.translations, forward);
				translationSocket.removeListener('translation', oneTimeCallback);
			} else {
				if (!result.forward && !forward) {
				//	console.dir(text);
				//	console.dir(result);
				}
			}
		};
		this.translationSocket.on('translation', oneTimeCallback);
	}

	this.translationSocket.emit("translate", {
		classifierName: classifierName,
		text: text,
		forward: forward,
		multiple: multiple,
	});
}

/**
 * Add a permanent listener to translations coming from the server.
 */
exports.Translator.prototype.onTranslation = function(translationHandler) {
	this.translationSocket.on('translation', function (result) {
		translationHandler(result.text, result.translations, result.forward);
	});
}


/** 
 *http://stackoverflow.com/a/16436975/827927
 */
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}


//
// UNITEST
//

if (process.argv[1] === __filename) {
	if (process.argv[2]) HOST = process.argv[2];
	if (process.argv[3]) SETTINGS.port = process.argv[3];
	logWithTimestamp("translation.js unitest start");
	var translator1 = new exports.Translator("translator1");
	var translator2 = new exports.Translator("translator2");
	
	translator2.onTranslation(function(text,translations) {
		console.dir(translations);
	});
	
	translator1.translationSocket.on('connect', function() {
		translator1.sendToTranslationServer("Employer", "I agree to offer a wage of 20000 NIS and 10% pension without a car.", true);
		translator1.sendToTranslationServer("Employer", "{\"Offer\":{\"Pension Fund\":\"10%\"}}", false);
		translator1.sendToTranslationServer("Employer", ["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], false);

		translator1.sendToTranslationServer("Candidate", "I want a wage of 20000 NIS and 10% pension with car.", true, function(text, translations, forward) {
			console.log("Callback called! "+JSON.stringify(translations));
		});
		translator1.sendToTranslationServer("Candidate", ["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], false, function(text, translations, forward) {
			console.log("Callback called! "+JSON.stringify(translations));
		});
	});
	translator2.sendToTranslationServer("Employer", "I agree to your offer.", true);
	translator2.sendToTranslationServer("Employer", "{\"Accept\":\"previous\"}", false);

	// After several seconds, you should see 2 results:
	//   "translator1 receives 3 translations to 'I offer...
	//   "translator2 receives 1 translations to 'I agree...
	//			[ '{"Accept": "previous"}' ]

	logWithTimestamp("translation.js unitest end");
}
