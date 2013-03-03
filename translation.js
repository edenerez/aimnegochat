// Translate text to semantic representation using a translation server:
var HOST="localhost";
var PORT=9994;

var io = require('socket.io-client');

exports.Translator = function() {
	this.translationSocket = translationSocket = io.connect(HOST, {port: PORT}); 
	this.translationHandlers = [  /* initialize with a default handler */
		function (text, translations) {
			console.log("TranslationServer: "+translations.length+" translations to '"+text + "': "+JSON.stringify(translations));
		}
	];
	
	this.translationSocket.on('connect', function () { 
		console.log("socket connected");
		/* Test: */
		//this.sendToTranslationServer("I offer a salary of 20000 and a car.", true, "NegotiationGrammarJson.txt");
	});
	

	this.translationSocket.on('translation', function (result) { 
		var text = result.text;
		var translations = result.translations;
		for (var i=0; i<this.translationHandlers.length; ++i) 
			this.translationHandlers[i](text,translations);
	});
}	


exports.Translator.prototype.sendToTranslationServer = function(input, forward, targetsFileName) {
	console.log("TranslationClient: '" + input + "', '"+targetsFileName+"'");
	this.translationSocket.emit("translate", {
		text: input,
		forward: forward,
		targetsFileName: targetsFileName,
		numOfThreads: /*keep current number of threads*/ 0}
		);
}

exports.Translator.prototype.onTranslation = function(translationHandler) {
	this.translationHandlers.push(translationHandler);
}



