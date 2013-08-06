/**
 * Translate text to semantic representation using a classifier-based translation server.
 */


var HOST=process.env.TRANSLATION_SERVER_HOST || "http://irsrv2.cs.biu.ac.il";
var PORT=process.env.TRANSLATION_SERVER_PORT || 9995;
var URL=HOST+":"+PORT+"/get";
var request = require('request');

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

exports.Translator = function(translatorName) {
	this.translatorName = translatorName;
}

/** 
 * Ask the server to translate a certain text.
 * @param callback [mandatory] - called when the translation arrives.
 */
exports.Translator.prototype.sendToTranslationServer = function(classifierName, text, forward, callback) {
	logWithTimestamp(this.translatorName+" asks '"+classifierName+"' to "+(forward? "translate ": "generate ")+ JSON.stringify(text));
	var multiple = !(text instanceof Array);
	
	var url = URL+"?"+
		"classifierName="+encodeURIComponent(classifierName)+"&"+
		"text="+encodeURIComponent(JSON.stringify(text))+"&"+
		(forward? "forward=1&": "")+
		(multiple? "multiple=1&": "");
	var self=this;
	request(url, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			//console.dir(body);
			var result = JSON.parse(body);
			logWithTimestamp(self.translatorName + " receives "+result.translations.length+" translations from '"+result.classifierName+"' to "+JSON.stringify(result.text) + ": "+JSON.stringify(result.translations));
			if (callback)
				callback(text, result.translations, forward);
		} else {
			console.log(url);
			console.log("error="+error+" response="+JSON.stringify(response));
		}
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
	
	translator1.sendToTranslationServer("Employer", "I agree to offer a wage of 20000 NIS and 10% pension without a car.", true);
	translator1.sendToTranslationServer("Employer", "{\"Offer\":{\"Pension Fund\":\"10%\"}}", false);
	translator1.sendToTranslationServer("Employer", ["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], false);

	translator1.sendToTranslationServer("Candidate", "I want a wage of 20000 NIS and 10% pension with car.", true, function(text, translations, forward) {
		console.log("Callback called! "+JSON.stringify(translations));
	});
	translator1.sendToTranslationServer("Candidate", ["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], false, function(text, translations, forward) {
		console.log("Callback called! "+JSON.stringify(translations));
	});

	translator2.sendToTranslationServer("Employer", "I agree to your offer.", true);
	translator2.sendToTranslationServer("Employer", "{\"Accept\":\"previous\"}", false);

	// After several seconds, you should see 2 results:
	//   "translator1 receives 3 translations to 'I offer...
	//   "translator2 receives 1 translations to 'I agree...
	//			[ '{"Accept": "previous"}' ]

	logWithTimestamp("translation.js unitest end");
}
