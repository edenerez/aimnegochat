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
 * @param request should contain the following fields: classifierName, text, forward.
 * May contain additional fields that will be sent as is to the translation server.
 * @param callback [mandatory] - called when the translation arrives.
 */
exports.Translator.prototype.sendToTranslationServer = function(requestObject, callback) {
	logWithTimestamp(this.translatorName+" asks '"+requestObject.classifierName+"' to "+(requestObject.forward? "translate ": "generate ")+ JSON.stringify(requestObject.text));
	requestObject.multiple = !(requestObject.text instanceof Array);
	
	var url = URL+"?request="+encodeURIComponent(JSON.stringify(requestObject));
	var self=this;
	request(url, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			console.dir(body);
			var result = JSON.parse(body);
			logWithTimestamp(self.translatorName + " receives "+result.translations.length+" translations from '"+result.classifierName+"' to "+JSON.stringify(result.text) + ": "+JSON.stringify(result.translations));
			if (callback)
				callback(requestObject.text, result.translations);
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
	
	translator1.sendToTranslationServer({classifierName:"Employer", text:"I agree to offer a wage of 20000 NIS and 10% pension without a car.", forward:true, source: "translation.js unitest"});
	translator1.sendToTranslationServer({classifierName:"Employer", text:"{\"Offer\":{\"Pension Fund\":\"10%\"}}", forward:false, source: "translation.js unitest"});
	translator1.sendToTranslationServer({classifierName:"Employer", text:["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], forward:false, source: "translation.js unitest"});

	translator1.sendToTranslationServer({classifierName:"Candidate", text:"I want a wage of 20000 NIS and 10% pension with car.", forward:true, source: "translation.js unitest"}, 
		function(text, translations) {
			console.log("Callback called! "+JSON.stringify(translations));
		});
	translator1.sendToTranslationServer({classifierName:"Candidate", text:["{\"Offer\":{\"Pension Fund\":\"10%\"}}", "{\"Offer\":{\"Salary\":\"20,000 NIS\"}}"], forward:false, source: "translation.js unitest"}, 
		function(text, translations) {
			console.log("Callback called! "+JSON.stringify(translations));
		});

	translator2.sendToTranslationServer({classifierName:"Employer", text:"I agree to your offer.", forward:true, source: "translation.js unitest"});
	translator2.sendToTranslationServer({classifierName:"Employer", text:"{\"Accept\":\"previous\"}", forward:false, source: "translation.js unitest"});

	// After several seconds, you should see 2 results:
	//   "translator1 receives 3 translations to 'I offer...
	//   "translator2 receives 1 translations to 'I agree...
	//			[ '{"Accept": "previous"}' ]

	logWithTimestamp("translation.js unitest end");
}
