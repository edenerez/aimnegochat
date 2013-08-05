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
		logWithTimestamp(translatorName + " receives "+result.translations.length+" translations to "+JSON.stringify(result.text) + ": "+JSON.stringify(result.translations));
	});

	translationSocket.on('disconnect', function () { 
		logWithTimestamp(translatorName+" disconnected from translation server at "+HOST+":"+SETTINGS.port);
	});

	translationSocket.on('reconnect_failed', function () { 
		logWithTimestamp(translatorName+" FAILED to connect translation server at "+HOST+":"+SETTINGS.port);
	});

	return translationSocket;
}

exports.Translator = function(translatorName) {
	this.translatorName = translatorName;
	this.translationSocket = newTranslationSocket(translatorName);
}

exports.Translator.prototype.sendToTranslationServer = function(classifierName, text, forward) {
	if (!this.translationSocket.socket.connected && !this.translationSocket.socket.connecting && !this.translationSocket.socket.reconnecting) {
		logWithTimestamp(this.translatorName+" tries to re-connect to translation server at "+HOST+":"+SETTINGS.port);
		this.translationSocket.socket.reconnect();
	}
	logWithTimestamp(this.translatorName+" asks to "+(forward? "translate ": "generate ")+ JSON.stringify(text));
	var multiple = !(text instanceof Array);
	this.translationSocket.emit("translate", {
		classifierName: classifierName,
		text: text,
		forward: forward,
		multiple: multiple,
	});
}

exports.Translator.prototype.onTranslation = function(translationHandler) {
	this.translationSocket.on('translation', function (result) {
		translationHandler(result.text, result.translations, result.forward);
	});
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
	});
	translator2.sendToTranslationServer("Employer", "I agree to your offer.", true);
	translator2.sendToTranslationServer("Employer", "{\"Accept\":\"previous\"}", false);

	// After several seconds, you should see 2 results:
	//   "translator1 receives 3 translations to 'I offer...
	//   "translator2 receives 1 translations to 'I agree...
	//			[ '{"Accept": "previous"}' ]

	logWithTimestamp("translation.js unitest end");
}
