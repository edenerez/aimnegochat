/**
 * A Node.js server for paraphrase collection via Amazon Mechanical Turk. 
 * 
 * @author Erel Segal-Halevi erelsgl@gmail.com
 * @since 2013-03
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, url = require('url')
	, fs = require('fs')
	, util = require('util')
	, extend = require('xtend')
	, amt = require('./amazonturk')
	, multiplayer = require('./multiplayer')
	, logger = require('./logger')
	, timer = require('./timer')
	;

logger.MAX_LENGTH_OF_CONSOLE_MESSAGE = 100;

var cookieParser = express.cookieParser('biuailab')
	, sessionStore = new express.session.MemoryStore()
	;



//
// Step 0: Users and sessions:
//
function setSessionForNewUser(req) {
	if (req.session && req.session.data) 
		logger.writeEventLog("events", "OLDSESSION", req.session);
	logger.writeEventLog("events", "NEWSESSION",	 req.session);
	req.session.data = req.query;  // for Amazon Turk users, the query contains the hit id, assignment id and worker id. 
	logger.writeEventLog("events", "QUERY",	 req.query);
}


//
// Step 1: Configure an application with EXPRESS
//

var app = express();
app.configure(function(){
	// Settings:
	app.set('port', process.env.PORT || 4000);
	app.set('views', path.join(__dirname, 'views'));		// The view directory path
	app.set('view engine', 'jade');						// The default engine extension to use when omitted
	app.set('case sensitive routing', false);	// Enable case sensitivity, disabled by default, treating "/Foo" and "/foo" as same

	// Middleware - order is important!
	app.use(express.favicon());

	app.use(express.bodyParser());	 // Request body parsing middleware supporting JSON, urlencoded, and multipart requests. This middleware is simply a wrapper the json(), urlencoded(), and multipart() middleware
	app.use(cookieParser);
	app.use(express.session({store:	sessionStore, secret: 'biuailab'}));
	app.use(express.methodOverride());

	// Define tasks to do for ANY url:
	app.use(function(req,res,next) {
		if (!/\/stylesheets\//.test(req.url) && !/\/javascripts\//.test(req.url))
			logger.writeEventLog("events", "********** "+req.method+" "+req.url, extend({remoteAddress: req.ip}, req.headers));
		next(); // go to the next task - routing:
	});

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// Application local variables are provided to all templates rendered within the application:
	app.locals.pretty = true;
});

app.configure('development', function(){
	app.use(express.errorHandler());
});




//
// Step 3: Define the routing with EXPRESS
//

app.get('/', express.basicAuth('biu','biu'), function(req,res) {
		res.render("index",	{serverStartTime: serverStartTime, gametypes: Object.keys(gameServers)});
});


//////////////////////////
// Paraphrase experiment 
//////////////////////////

var paraphraseSemaphore = require('semaphore')(1);
var paraphraseInput = logger.readSingleJsonObjectSync("data/ParaphraseInput.txt");
var paraphraseNaturals = Object.keys(paraphraseInput);
console.dir(paraphraseNaturals);
var iparaphraseInput = 0;
var doneParapharseInputs = {};
var INPUTS_PER_ASSIGNMENT=4;
var PARAPHRASES_PER_INPUT=3;
var PRIME_STEP_IN_INPUT_LOOP=29;

app.get('/paraphrase', function(req,res) {
	setSessionForNewUser(req);
	var iSentences=[], naturals=[], semantics=[];
	paraphraseSemaphore.take(function() {
		for (var j=0; j<INPUTS_PER_ASSIGNMENT; ++j) {
			for (var i=0; i<paraphraseNaturals.length; ++i) {
				iparaphraseInput = (iparaphraseInput+PRIME_STEP_IN_INPUT_LOOP)%paraphraseNaturals.length;
				if (!doneParapharseInputs[iparaphraseInput]) break;
			}
			iSentences.push(iparaphraseInput);
			var natural = paraphraseNaturals[iparaphraseInput];
			logger.writeEventLog("events", "Natural #"+iparaphraseInput+": "+natural, req.session);
			naturals.push(natural);
			semantics.push(paraphraseInput[natural]);
		}
		paraphraseSemaphore.leave();
	});
	res.render("RoomForParaphrase",	{
		preview: amt.isPreview(req.query),
		naturals: naturals,
		semantics: semantics,
		iSentences: iSentences,
		action:'/WriteParaphrases',
		next_action:'/ThankYou',
		AMTStatus: JSON.stringify(req.session.data)});
});


app.get('/WriteParaphrases', function(req,res) {
		var nextAction = req.query.next_action;	delete req.query.next_action;
		logger.writeEventLog("events", "WRITE",	req.query);

		for (var j=0; j<INPUTS_PER_ASSIGNMENT; ++j) {
			var newNaturalPairs = "", newSemanticPairs = "";
			var iSentence  = req.query["iSentence_"+j];	
			var natural  = req.query["natural_"+j];	
			var semantic  = req.query["semantic_"+j];	
			for (var i=1; i<=PARAPHRASES_PER_INPUT; ++i) {
					var id = "paraphrase_"+j+"_"+i;
					if (req.query[id] && req.query[id].length>0) {
						newNaturalPairs  += "* "+req.query[id]+"    /    "+natural  + "\n";
						newSemanticPairs += "* "+req.query[id]+"    /    "+semantic + "\n";
					}
			}
			if (newNaturalPairs.length>0)  fs.appendFile("logs/ParaphraseOutputNatural.txt", newNaturalPairs);
			if (newSemanticPairs.length>0) fs.appendFile("logs/ParaphraseOutputSemantic.txt", newSemanticPairs);

			var numDone;
			paraphraseSemaphore.take(function() {
				doneParapharseInputs[iSentence] = true;
				numDone = Object.keys(doneParapharseInputs).length;
				if (numDone>=paraphraseNaturals.length)  // restart:
					doneParapharseInputs = {};
				paraphraseSemaphore.leave();
			});
			console.log("done "+numDone+" out of "+paraphraseNaturals.length+" paraphrases.");
		}

		logger.writeJsonLog("ParaphraseUsers", {user: req.session.data, answers: req.query});
		res.redirect(nextAction);
});



app.get('/LogToXml/:logFileName', function(req,res) {
		res.contentType('text/xml');
		logger.readJsonLog(req.params.logFileName+".json", function(object) {
			res.render("LogToXml",	{log: object});
		});
});


app.get('/ThankYou', function(req,res) {
		res.render("ThankYou",	{
				user: req.session.data,
				AMTStatus: JSON.stringify(req.session.data)});
});


//
// Step 4: define an HTTP server over the express application:
//

var httpserver = http.createServer(app);
var serverStartTime = null;

httpserver.listen(app.get('port'), function(){
	logger.writeEventLog("events", "START", {port:app.get('port')});
	serverStartTime = new Date();
});





//
// Last things to do before exit:
//
 
process.on('exit', function (){
	logger.writeEventLog("events", "END", {port:app.get('port')});
	console.log('Goodbye!');
});
