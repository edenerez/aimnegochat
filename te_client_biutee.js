// Connects to a Textual Entailment server. EXPERIMENTAL - DEMO ONLY.
socketioclient = require('socket.io-client');

var HOST = process.env.entailment_SERVER_HOST || "localhost";
var SETTINGS = {
	port: process.env.entailment_SERVER_PORT || 9992, 
	'force new connection': true, 
	'sync disconnect on unload': true
};

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

var BIUTEE = function(entailerName) {
	logWithTimestamp(entailerName+" tries to connect to BIUTEE at "+HOST+":"+SETTINGS.port);
	this.entailerName = entailerName;
	this.entailmentSocket = socketioclient.connect(HOST, SETTINGS); 

	this.entailmentSocket.on('connect', function () { 
		logWithTimestamp(entailerName+" connected to BIUTEE at "+HOST+":"+SETTINGS.port);
	});

	var onEventLogMessage = function(socket, event, showResult) {
		socket.on(event, function(result) {
			logWithTimestamp(entailerName +" got an event of type "+event+(showResult? ": \n"+(result.message? result.message: result.paths? result.paths.length+" paths": JSON.stringify(result)): ""));
		});
	};
	for (var event in {TEProofs: 1, statusHtml: 1, configuredResourcesArray: 1}) 
		onEventLogMessage(this.entailmentSocket, event, false);
	for (var event in {TEDecision: 1, /*trace: 1, debug: 1, info: 1, */warning: 1, error: 1, exception: 1, fatal: 1}) 
		onEventLogMessage(this.entailmentSocket, event, true);
}

BIUTEE.prototype.entail = function(text, hypothesis) {
	logWithTimestamp(this.entailerName+" asks to entail: '" + text + "' - '"+hypothesis+"'");
	this.entailmentSocket.emit("entail", {
		text: text,
		hypothesis: hypothesis, 
		}
	);
}

BIUTEE.prototype.bestProofs = function(text, hypothesis) {
	logWithTimestamp(this.entailerName+" asks for best proofs: '" + text + "' - '"+hypothesis+"'");
	this.entailmentSocket.emit("bestProofs", {
		text: text,
		hypothesis: hypothesis, 
		}
	);
}

BIUTEE.prototype.abortOtherThreads = function() {
	this.entailmentSocket.emit("abort");
}

BIUTEE.prototype.onConnect = function(handler) {
	this.entailmentSocket.on('connect', handler);
}

BIUTEE.prototype.onBestProofs = function(handler) {
	this.entailmentSocket.on('TEProofs', handler);
}

// static function:
BIUTEE.printProofs = function(proofs) {
		for (var i=0; i<proofs.length; ++i) {
			if (i>0) console.log("-");
			var proof = proofs[i];
			for (var j=0; j<proof.length; ++j) {
				var step = proof[j];
				console.log("\t"+step);
			}
		}
};

module.exports = BIUTEE;





// don
// UNITEST
//

if (process.argv[1] === __filename) {
	if (process.argv[2]) HOST = process.argv[2];
	if (process.argv[3]) SETTINGS.port = process.argv[3];
	logWithTimestamp(process.argv[1]+" unitest start");

	var entailer1 = new BIUTEE("entailer1");
	var entailer2 = new BIUTEE("entailer2");
	
	entailer1.onBestProofs(BIUTEE.printProofs);
	entailer2.onBestProofs(BIUTEE.printProofs);
	

	//entailer1.entail("I don't forget to go to NAACL.", "I go to NAACL");
	//entailer1.entail("I forget to go to NAACL.", "I go to NAACL");
	entailer1.onConnect(function() {
		entailer1.bestProofs("I don't forget to go to NAACL.", "I go to NAACL");
	});
	entailer2.bestProofs("I forget to go to NAACL.", "I go to NAACL");

	// After several seconds, you should see something like:
	// 2013-05-29T08:20:53.941Z entailer2 got an event of type TEProofs 
	// 2013-05-29T08:21:03.947Z entailer1 got an event of type TEProofs:  ...

	logWithTimestamp(process.argv[1]+" unitest end");
}

