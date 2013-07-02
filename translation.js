/**
 * Translate text to semantic representation using a classifier-based translation server.
 */

var HOST=process.env.TRANSLATION_SERVER_HOST || "http://irsrv2.cs.biu.ac.il";
var SETTINGS = {
	port: process.env.TRANSLATION_SERVER_PORT || 9995, 
	'force new connection': true, 
	'sync disconnect on unload': true
};

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

exports.Translator = function(translatorName) {
	logWithTimestamp(translatorName+" tries to connect to translation server at "+HOST+":"+SETTINGS.port);
	this.translatorName = translatorName;
	this.translationSocket = require('socket.io-client').connect(HOST, SETTINGS); 

	this.translationSocket.on('connect', function () { 
		logWithTimestamp(translatorName+" connected to translation server at "+HOST+":"+SETTINGS.port);
	});
	
	this.translationSocket.on('translation', function (result) {
		logWithTimestamp(translatorName + " receives "+result.translations.length+" translations to '"+result.text + "': "+JSON.stringify(result.translations));
	});
}

exports.Translator.prototype.sendToTranslationServer = function(text, forward) {
	logWithTimestamp(this.translatorName+" asks: '" + text + "'");
	this.translationSocket.emit("translate", {
		text: text,
		forward: forward,
	});
}

exports.Translator.prototype.onTranslation = function(translationHandler) {
	this.translationSocket.on('translation', function (result) {
		translationHandler(result.text, result.translations);
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
		translator1.sendToTranslationServer("I agree to offer a wage of 20000 NIS and 10% pension without a car.", true);
	});
	translator2.sendToTranslationServer("I agree to your offer.", true);

	// After several seconds, you should see 2 results:
	//   "translator1 receives 4 translations to 'I offer...
	//   "translator2 receives 1 translations to 'I agree...
	//			[ '{"Accept": "previous"}' ]

	logWithTimestamp("translation.js unitest end");
}
