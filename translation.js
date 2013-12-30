/**
 * Translate text to semantic representation using a classifier-based translation server.
 */
var HOST=process.env.TRANSLATION_SERVER_HOST || "http://168.144.151.151";
var PORT=process.env.TRANSLATION_SERVER_PORT || 9996;
var URL=HOST+":"+PORT+"/get";

var request = require('request')
  , extend = require('util')._extend
  , deepmerge = require('./deepmerge') 
  , sprintf = require('sprintf').sprintf
  , async = require('async')
  ;

function logWithTimestamp(message) {
	console.log(new Date().toISOString()+" "+message);
}

logWithTimestamp(sprintf("%s", "translation.js loaded"));

exports.Translator = function(translatorName) {
	this.translatorName = translatorName;
}

function stringifyIfNeeded(s) {
	return (typeof s === 'string'? s: JSON.stringify(s));
}

/** 
 * Ask the server to translate a certain text.
 * @param request should contain the following fields: classifierName, text, forward.
 * May contain additional fields that will be sent as is to the translation server.
 * @param callback [mandatory] - called when the translation arrives.
 */
module.exports.Translator.prototype.sendToTranslationServer = function(requestObject, callback) {
	logWithTimestamp(this.translatorName+" asks '"+requestObject.classifierName+"' to "+(requestObject.forward? "translate ": "generate ")+ JSON.stringify(requestObject.text));
	requestObject.multiple = !(requestObject.text instanceof Array);
	
	var url = URL+"?request="+encodeURIComponent(JSON.stringify(requestObject));
	var self=this;
	request(url, function(error, response, body) {
		var translations;
		if (!error && response.statusCode == 200) {
			console.dir(body);
			var result = JSON.parse(body);
			if (!result.translations) {
				logWithTimestamp("ERROR! "+self.translatorName + " receives no translations! "+JSON.stringify(result));
				translations = [];
			} else {
				logWithTimestamp(self.translatorName + " receives "+result.translations.length+" translations from '"+result.classifierName+"' to "+JSON.stringify(result.text) + ": "+JSON.stringify(result.translations));
				translations = result.translations;
			}
		} else {
			console.log(url);
			logWithTimestamp(self.translatorName + " receives error: "+error+", response="+JSON.stringify(response));
			translations = requestObject.text;
			if (!Array.isArray(translations))
				translations = [translations];
			logWithTimestamp(self.translatorName + " falls back to: "+translations.length+" translations from '"+self.classifierName+"' to "+JSON.stringify(requestObject.text) + ": "+JSON.stringify(translations));
		}
		if (callback)
			callback(requestObject.text, translations);
	});
}

/**
 * @param text a string.
 * @param requestObject an object (hash), whose fields are sent to the translation server as informative fields only.  
 */
module.exports.Translator.prototype.translate = function(text, requestObject, callback) {
	requestObject.text = text;
	requestObject.forward = true;
	this.sendToTranslationServer(requestObject, callback);
}



// copied from CommonSocketEvents.js
var naturalLanguageGenerationTemplates = {
		'Reject': [
			"I don't accept your offer about %s",
			"I cannot agree to %s",
			"Your offer %s is unacceptable"
		],
		'Accept': [
			"I accept your offer about %s",
			"I agree to %s",
			"Your offer %s is acceptable"
		],
		'StartNewIssue': [
			"Now let's talk about the other issues",
		],
		'ChangeIssue': [
   			"But I must change our previous agreement",
   		],

//		'ButOffer': '%s, but %s',
//		'AndOffer': '%s, and %s',
//		'CounterOffer': "%s. %s"
};

var randomNaturalLanguageString = function(action, argument) {
	var template = "";
	var templatesSet = naturalLanguageGenerationTemplates[action];
	if (templatesSet)
		template = templatesSet[Math.floor((Math.random()*templatesSet.length))];
	return sprintf(template, JSON.stringify(argument));
}

/**
 * @param action an object (hash) with a SINGLE field (the action type).
 * @param requestObject an object (hash), whose fields are sent to the translation server as informative fields only.
 * @param callback (function) The callback gets two arguments (err, string)
 */
module.exports.Translator.prototype.generateSingleAction = function(requestObject, action, callback) {
	if (!(action instanceof Object) || Object.keys(action).length!=1) {
		var error = "NLG error: Expected an action with a single field, but got "+JSON.stringify(action);
		console.error(error);
		process.nextTick(callback.bind(null/*this*/, error, error));
		return;
	}

	var keys = Object.keys(action);
	var actionKey = keys[0];
	var actionValue = action[actionKey];
	if (actionKey in naturalLanguageGenerationTemplates) {
		var naturalLanguageString = randomNaturalLanguageString(actionKey, actionValue);
		process.nextTick(callback.bind(null/*this*/, null/*error*/, naturalLanguageString));
	} else {
		requestObject.text = deepmerge.unmerge(action).map(JSON.stringify);
		this.sendToTranslationServer(requestObject, function(semanticAction, translationsArray) {
			naturalLanguageString = deepmerge.joinWithAnd(translationsArray);
			callback(null/*error*/, naturalLanguageString);
		});
	}
}


/**
 * @param arrayOfActions an array that contains semantic actions.
 * @param requestObject an object (hash), whose fields are sent to the translation server as informative fields only.
 */
module.exports.Translator.prototype.generate = function(arrayOfActions, requestObject, callback) {
	if (!arrayOfActions || arrayOfActions.length===0) {
		console.warn("NLG warning: arrayOfActions is "+JSON.stringify(arrayOfActions));
		process.nextTick(callback.bind(null, {}, ""));
		return;
	}
	requestObject.forward = false;
	
	if (!Array.isArray(arrayOfActions))
		arrayOfActions = [arrayOfActions];
	
	async.map(arrayOfActions, this.generateSingleAction.bind(this, requestObject), function(err, translations) {
		//console.log("*** translations="+JSON.stringify(translations));
		callback(arrayOfActions, translations.join(". "));
	});
}


/**
 * @param mergedAction an object (hash), whose fields are semantic actions.
 * @param requestObject an object (hash), whose fields are sent to the translation server as informative fields only.
 * @note this is an old function that uses objects. the new function uses arrays.  
 */
module.exports.Translator.prototype.generateOLD = function(mergedAction, requestObject, callback) {
	if (!mergedAction || Object.keys(mergedAction).length==0) {
		process.nextTick(callback.bind(null, {}, ""));
		return;
	}
	requestObject.forward = false;
	
	mergedActionClone = extend({}, mergedAction);
	
	if ("Reject" in mergedActionClone) {
		var naturalLanguageString = randomNaturalLanguageString("Reject", mergedActionClone.Reject);
		delete mergedActionClone["Reject"];
		if (Object.keys(mergedActionClone).length>0)  { // there are more actions besides refect (e.g. counter-offer):
			requestObject.text = deepmerge.unmerge(mergedActionClone).map(JSON.stringify);
			this.sendToTranslationServer(requestObject, function(semanticAction, translationsArray) {
				naturalLanguageString = sprintf(naturalLanguageGenerationTemplates["CounterOffer"], 
						naturalLanguageString, 
						deepmerge.joinWithAnd(translationsArray));
				callback(mergedAction, naturalLanguageString);
			});
		} else { // only accept:
			process.nextTick(callback.bind(null, mergedAction, naturalLanguageString));
		}
	} else if ("Accept" in mergedActionClone) {
		var naturalLanguageString = randomNaturalLanguageString("Accept", mergedActionClone.Accept);
		delete mergedActionClone["Accept"];
		if (Object.keys(mergedActionClone).length>0)  { // there are more actions besides accept (e.g. offer):
			var conjunction = mergedActionClone["conjunction"];
			delete mergedActionClone["conjunction"];
			requestObject.text = deepmerge.unmerge(mergedActionClone).map(JSON.stringify);
			this.sendToTranslationServer(requestObject, function(semanticAction, translationsArray) {
				naturalLanguageString = sprintf(naturalLanguageGenerationTemplates[conjunction=='and'? "AndOffer": "ButOffer"], 
						naturalLanguageString, 
						deepmerge.joinWithAnd(translationsArray));
				callback(mergedAction, naturalLanguageString);
			});
		} else { // only accept:
			process.nextTick(callback.bind(null, mergedAction, naturalLanguageString));
		}
	} else {
		requestObject.text = deepmerge.unmerge(mergedActionClone).map(JSON.stringify);
		this.sendToTranslationServer(requestObject, function(semanticAction, translationsArray) {
			var naturalLanguageString = deepmerge.joinWithAnd(translationsArray);
			if (!naturalLanguageString) naturalLanguageString = "";
			callback(mergedAction, naturalLanguageString);
		});
	}
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
