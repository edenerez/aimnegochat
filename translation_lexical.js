// Connects to a Lexical Entailment server. EXPERIMENTAL - DEMO ONLY.
var HOST = process.env.TRANSLATION_SERVER_HOST || "localhost";
var SETTINGS = {
	port: process.env.TRANSLATION_SERVER_PORT || 9991, 
	'force new connection': true, 
	'sync disconnect on unload': true
};

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

exports.PLIS = function(translatorName) {
	logWithTimestamp(translatorName+" tries to connect to PLIS at "+HOST+":"+SETTINGS.port);
	this.translatorName = translatorName;
	this.translationSocket = require('socket.io-client').connect(HOST, SETTINGS); 

	this.translationSocket.on('connect', function () { 
		logWithTimestamp(translatorName+" connected to PLIS at "+HOST+":"+SETTINGS.port);
	});

	var onEventLogMessage = function(socket, event, showResult) {
		socket.on(event, function(result) {
			logWithTimestamp(translatorName +" got an event of type "+event+(showResult? ": \n"+(result.message? result.message: result.paths? result.paths.length+" paths": JSON.stringify(result)): ""));
		});
	};
	for (var event in {statusHtml: 1, configuredResourcesArray: 1/*, resourceConfiguration: 1*/}) 
		onEventLogMessage(this.translationSocket, event, false);
	for (var event in {LexicalEntailmentRecord: 1, rulesWithCommonEntailer: 1, rulesWithCommonEntailed: 1, pathsWithCommonEntailer: 1, pathsWithCommonEntailed: 1, warning: 1, error: 1, exception: 1, fatal: 1}) 
		onEventLogMessage(this.translationSocket, event, true);
}


exports.PLIS.prototype.entail = function(text, hypothesis, transitivity) {
	logWithTimestamp(this.translatorName+" asks: '" + text + "' - '"+hypothesis+"'");
	this.translationSocket.emit("entail", {
		text: text,
		textLanguage: "English",
		hypothesis: hypothesis, 
		hypothesisLanguage: "English",
		transitivity: transitivity,
		selectedResources: null,
		inferenceModel: "mplm",
		}
		);
}

exports.PLIS.prototype.abortOtherThreads = function() {
	this.translationSocket.emit("abort");
}



//
// UNITEST
//

if (process.argv[1] === __filename) {
	if (process.argv[2]) HOST = process.argv[2];
	if (process.argv[3]) SETTINGS.port = process.argv[3];
	logWithTimestamp(process.argv[1]+" unitest start");

	var translator1 = new exports.PLIS("translator1");
	var translator2 = new exports.PLIS("translator2");

	translator1.entail("The footballer kicked the ball towards the cottage.", "jugador:n chuto:v pelota:n casa:n",3);
	translator2.abortOtherThreads();
	translator2.entail("Christopher_Columbus revealed America.", "which explorer discovered the New_World?", 3);

	// After several seconds, you should see something line:
	// 2013-05-05T12:23:38.324Z translator2 got an event of type LexicalEntailmentRecord:  ... 
	// 2013-05-05T12:23:46.973Z translator1 got an event of type LexicalEntailmentRecord:  ...

	logWithTimestamp(process.argv[1]+" unitest end");
}
