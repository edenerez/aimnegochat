// Translate text to semantic representation using a translation server:
var HOST=process.env.TRANSLATION_SERVER_HOST || "localhost";
var PORT=process.env.TRANSLATION_SERVER_PORT || 9994;
console.log("Looking for translation server at "+HOST+":"+PORT);

exports.Translator = function() {
	this.translationSocket = require('socket.io-client').connect(HOST, {port: PORT}); 
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
	
	this.textsWaitingForTranslations = {};
	
	var translator = this;
	this.translationSocket.on('translation', function (result) {
		if (translator.textsWaitingForTranslations[result.text]) {
			for (var i=0; i<translator.translationHandlers.length; ++i) 
				translator.translationHandlers[i](result.text, result.translations);
			delete translator.textsWaitingForTranslations[result.text];
		}
	});
}


exports.Translator.prototype.sendToTranslationServer = function(text, forward, targetsFileName) {
	console.log("TranslationClient: '" + text + "', '"+targetsFileName+"'");
	this.textsWaitingForTranslations[text] = true;
	this.translationSocket.emit("translate", {
		text: text,
		forward: forward,
		targetsFileName: targetsFileName,
		numOfThreads: /*keep current number of threads*/ 0}
		);
}

exports.Translator.prototype.onTranslation = function(translationHandler) {
	this.translationHandlers.push(translationHandler);
}


//
// UNITEST
//

if (process.argv[1] === __filename) {
	console.log("translation.js unitest start");
	var translator1 = new exports.Translator();
	var translator2 = new exports.Translator();
	translator1.sendToTranslationServer("I offer a salary of 10000 and a car.", true, "NegotiationGrammarJson.txt");
	translator2.sendToTranslationServer("I offer a salary of 20000 and a car.", true, "NegotiationGrammarJson.txt");

	// After several seconds, you should see only 2 results:
	//   "TranslationServer: 2 translations to 'I offer a salary of 10000...
	//   "TranslationServer: 2 translations to 'I offer a salary of 20000...
	
	console.log("translation.js unitest end");
}
