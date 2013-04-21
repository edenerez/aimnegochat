/**
 * Module dependencies.
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
	, useragent = require('useragent')
	;

var cookieParser = express.cookieParser('biuailab')
	, sessionStore = new express.session.MemoryStore()
	;


//windows azure definitions 
var azure = require('azure')
, nconf = require('nconf');
nconf.env()
.file({ file: 'config.json'});
var partitionKey = nconf.get("PARTITION_KEY")
, accountName = nconf.get("STORAGE_NAME")
, accountKey = nconf.get("STORAGE_KEY");


//
// Step 0: Users and sessions:
//
//ariel
var users = {}; 

/**
 * Gets as input HTTP request.
 * Puts in the req.session.data a new field called 'browserType', which is a string describing the type of web-browser used for that request.
 */
function browserType (req){
	var ua = useragent.is(req.headers['user-agent']);
	req.session.data.browserVersion =  ua.version;
	
	if (ua.webkit == true)
		req.session.data.browserType = 'webkit';
	if (ua.opera == true)
		req.session.data.browserType = 'opera';
	if (ua.ie == true)
		req.session.data.browserType = 'ie';
	if (ua.chrome == true)
		req.session.data.browserType = 'chrome';
	if (ua.safari == true)
		req.session.data.browserType = 'safari';
	if (ua.firefox == true)
		req.session.data.browserType = 'firefox';
}

function setSessionForNewUser(req) {
	if (req.session && req.session.data) {
		logger.writeEventLog("events", "OLDSESSION", req.session);
		users[req.session.data.userid].urls.pop();
	}
	req.session.data = req.query;  // for Amazon Turk users, the query contains the hit id, assignment id and worker id. 
	req.session.data.userid = req.ip + ":" + new Date().toISOString();
	req.session.data.gametype = req.params.gametype;
	if (req.params.role)
		req.session.data.role = req.params.role;
	browserType(req);
	req.session.data.gameid = req.param.gameid;
	
	users[req.session.data.userid] = req.session.data;
	users[req.session.data.userid].urls = [req.url.substr(0,60)];
	logger.writeEventLog("events", "NEWSESSION",	 req.session);
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
		if (!/\/stylesheets\//.test(req.url) && !/\/javascripts\//.test(req.url)) {
			// task 1 - logging the URL: 
			logger.writeEventLog("events", req.method+" "+req.url, extend({remoteAddress: req.ip}, req.headers));
			// task 2 - remembering the user's location:
			if (req.session.data && req.session.data.userid && users[req.session.data.userid])
				users[req.session.data.userid].urls.push(req.url.substr(0,60));
		}
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
// Step 2: MultiPlayer application[s]
// 

var gameServers = {};

gameServers['negomenus'] = new multiplayer.GameServer(
		/*roomTemplateName=*/'RoomForNegoMenus',
		/*requiredRoles=*/['Employer','Candidate'], 
		/*maxTimeSeconds=*/30*60,
		/*events=*/require('./EventsForNegoChat')
		);
gameServers['negochat'] = new multiplayer.GameServer(
		/*roomTemplateName=*/'RoomForNegoChat',
		/*requiredRoles=*/['Employer', 'Candidate'], 
		/*maxTimeSeconds=*/30*60,
		/*events=*/require('./EventsForNegoChat')
		);
gameServers['negonlp'] = new multiplayer.GameServer(
		/*roomTemplateName=*/'RoomForNegoNlp',
		/*requiredRoles=*/['Employer', 'Candidate'], 
		/*maxTimeSeconds=*/30*60,
		/*events=*/require('./EventsForNegoChat')
		);

for (gameType in gameServers)
	gameServers[gameType].gametype = gameType;

//
// Step 2.5: GENIUS related variables:
//

var genius = require('./genius');
var domain = new genius.Domain(path.join(__dirname,'domains','JobCandiate','JobCanDomain.xml'));
var actualAgents = {};
var otherAgents = {};
actualAgents['Employer']	= domain.agentOfRoleAndPersonality('employer', 'short-term');
otherAgents['Employer']	= domain.agentsOfOtherRole('employer');
actualAgents['Candidate'] = domain.agentOfRoleAndPersonality('candidate', 'short-term');
otherAgents['Candidate']	= domain.agentsOfOtherRole('candidate');
actualAgents['Previewer'] =	actualAgents['Employer'];

// Variables that will be available to all JADE templates:
app.locals.turnLengthInSeconds = 2*60;
app.locals.sprintf = require('sprintf').sprintf;
app.locals.format = "%+1.0f";
app.locals.actualAgents = actualAgents;



//
// Step 3: Define the routing with EXPRESS
//

app.get('/', express.basicAuth('biu','biu'), function(req,res) {
		res.render("index",	{serverStartTime: serverStartTime, gametypes: Object.keys(gameServers)});
});

//ariel
app.get('/users', function(req,res) {
		res.render("Users",	{users:users});
});

app.get('/:gametype/gametype', function (req,res){
	var gameType = req.params.gametype;
	res.render("present", {gametype: gameType , gametypes: Object.keys(gameServers) });
});
// This is the entry point for an Amazon Turker with no role:
//    It will select his role, then lead him to the preview or to the pre-questionnaire:
app.get('/:gametype/beginner', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		setSessionForNewUser(req);
		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			req.session.data.role = gameServer.nextRole();
			res.redirect('/prequestionnaireA');
		}
});

// This is the entry point for an Amazon Turker with a pre-specified role:
//    It will lead him to the preview or to the pre-questionnaire:
app.get('/:gametype/beginner/:role', function(req,res) {
		setSessionForNewUser(req);
		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			req.session.data.role = req.params.role;
			res.redirect('/PreQuestionnaireDemography');
		}
});

// This is the entry point for a developer with no role:
//    It will select his role, then lead him directly to the game.
app.get('/:gametype/advanced', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		setSessionForNewUser(req);
		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			req.session.data.role = gameServer.nextRole();
			res.redirect('/entergame');
		}
});

// This is the entry point for a developer with a pre-specified role:
//    It will lead him directly to the game.
app.get('/:gametype/advanced/:role', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		setSessionForNewUser(req);
		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			req.session.data.role = req.params.role;
			res.redirect('/entergame');
		}
});

app.get('/:gametype/watchgame/:gameid', function(req,res) {
		setSessionForNewUser(req);	
		console.log('Watch mode start. session = '+JSON.stringify(req.session.data));
		req.session.data.role = 'Watcher';
		req.session.data.gameid = req.params.gameid;
		req.session.data.silentEntry = true;
		res.redirect('/'+req.params.gametype+'/play');
});


var entergameSemaphore = require('semaphore')(1);

/**
 * The user with the given session wants to enter a new or existing game.
 * Find a game that matches the user, insert the user into the game, and put the gameid of the user into the session.
 * @param session includes data of a new user.
 */
function entergame(session) {
	entergameSemaphore.take(function() {
		var gameServer = gameServers[session.data.gametype];
		console.log('Enter game. session = '+JSON.stringify(session.data));

		var game;
		if (session.data.gameid && gameServer.gameById(session.data.gameid)) { // gameid already exists - a watcher is entering an existing game, or a player is re-entering after disconnection
			console.log("--- gameid already set: "+session.data.gameid);
			game = gameServer.gameById(session.data.gameid);
		} else {
			console.log("--- Searching for "+session.data.gametype+" game with "+session.data.role+" played by "+session.data.userid);
			game = gameServer.gameWithUser(session.data.userid, session.data.role);
			if (!game) {
				console.log("--- Searching for "+session.data.gametype+" game waiting for "+session.data.role);
				game = gameServer.gameWaitingForRole(session.data.role);
			}
			session.data.gameid = game.gameid;
			console.log("--- Entered "+session.data.gametype+" game: "+session.data.gameid);
		}
		users[session.data.userid].gameid = session.data.gameid;
		game.playerEntersGame(session.data.userid, session.data.role);
		entergameSemaphore.leave();
	});
}

app.get('/entergame', function(req,res) {
	entergame(req.session);  // sets req.session.data.gameid
	res.redirect('/'+req.session.data.gametype+"/play");
});

app.get('/:gametype/listactive', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		res.render("MultiplayerGames",	{
				title: 'Games on active server',
				show_unverified_games: true,
				timeToString: timer.timeToString, 
				games: gameServer.getGames()});
});
//ariel
app.get('/:gametype/listlogs', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		var pretty = req.query.pretty; // true to show only verified games
		var finished = req.query.finished; // true to show only finished games
		logger.readJsonLog('games.json', function(games) {
			if (games.readFileError) {
					res.contentType('text/xml');
					res.render("LogToXml",	{log: games});
			}
			else res.render(finished? "MultiplayerFinishedGames": "MultiplayerGames",	{
				title: 'Games in log',
				timeToString: timer.timeToString, 
				show_unverified_games: !pretty,
				games: games});
		});
});

//////////////////
// Questionnaire 
///////////////////

var Questionnaire = require('./routes/questionnaire');
var QuestionnaireModel = require('./models/questionnaireModel');
var questionnaireModel = new QuestionnaireModel(
    azure.createTableService(accountName, accountKey)
    , 'Questionnaire'
    , partitionKey);
var questionnaire = new Questionnaire(questionnaireModel);

app.get('/:gametype/listAllQuestionnaire' ,function (req,res){
	 questionnaire.listAll(req,res,gameServers);
});
app.get('/prequestionnaireA', questionnaire.demographyQuestionnaire.bind(questionnaire));
app.post('/addquestionnaire', questionnaire.addQuestionnaire.bind(questionnaire));
app.post('/deleteQuestionnaireTable', questionnaire.deleteQuestionnaireTable.bind(questionnaire));
app.post('/activeQuestionnaire', questionnaire.activeQuestionnaire.bind(questionnaire));

///////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////
//gameAction
/////////////////

var GameAction = require('./routes/gameAction');
var GameActionModel = require('./models/gameActionModel');
var gameActionModel = new GameActionModel (
	azure.createTableService(accountName, accountKey)
	, 'GameAction'
	, partitionKey);
var gameAction = new GameAction(gameActionModel);

function messageLog(socket, game, action, user, data) {
	logger.writeJsonLog('actions_'+game.gameid, 
		{role: user.role, remainingTime: game.timer? game.timer.remainingTimeSeconds(): "-", user: (action=='Connect'? user: user.userid), action: action, data: data});
	logger.writeEventLog('events', action+" '"+JSON.stringify(data)+"'", user);
//I think we can change the call of the "massageLog" function to "gameAction.activeGameAction" instead and it will still work. and we don't need the socket here
	gameAction.activeGameAction(game, action, user, data);
	if (action == "Disconnect" )
	{	
		gamesTable(user.gametype, game, true);
		//finalResult.addFinalResult(game.gameid,game.mapRoleToFinalResult.Candidate, game.mapRoleToUserid.Candidate);
		//finalResult.addFinalResult(game.gameid,game.mapRoleToFinalResult.Employer, game.mapRoleToUserid.Employer);
	}
}

app.get('/:gametype/listAllGameAction' ,function (req,res){
	 gameAction.listAll(req,res,gameServers);
});

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////
//Games
///////////////////

var Games = require('./routes/games');
var GamesModel = require('./models/gamesModel');
var gamesModel = new GamesModel (
	azure.createTableService(accountName, accountKey)
	, 'Games');
var games = new Games(gamesModel);

app.get('/:gametype/listAllGames' ,function (req,res){
	 games.listAll(req,res,gameServers);
});

function gamesTable(gametype, game, unverified)
{
	game.endGame();
	games.addGames(gametype, game.gameid, game.startTime, unverified, game.mapRoleToUserid, game.endTime);
}

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////
//FinalResult
///////////////////

var FinalResult = require('./routes/finalResult');
var FinalResultModel = require('./models/finalResultModel');
var finalResultModel = new FinalResultModel (
	azure.createTableService(accountName, accountKey)
	, 'FinalResult');
var finalResult = new FinalResult(finalResultModel);

app.get('/:gametype/listAllFinalResults' ,function (req,res){
	 finalResult.listAll(req,res,gameServers);
});
///////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////
//GameReport
/////////////////////

var GameReport = require('./routes/report');
var gameReport = new GameReport (questionnaireModel
								,gamesModel
								,gameActionModel
								,finalResultModel);

app.get('/:gametype,:PartitionKey,:Employer,:Candidate/gameReport' , function (req,res){
	gameReport.gameInfo (req,res,gameServers);
});

///////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/PreQuestionnaireDemography', function(req,res) {
		res.render("PreQuestionnaireDemography",	{
				action:'/WriteQuestionnaireAnswers/PreQuestionnaireDemography',
				next_action:'/PreQuestionnaireExam',
				AMTStatus: JSON.stringify(req.session.data)});
});

app.get('/UtilityOfCurrent/:role', function(req,res) {
		res.render("GeniusUtilityOfCurrent",	{
				agent: actualAgents[req.params.role]/*,
				AMTStatus: JSON.stringify(req.session.data)*/});
});

app.get('/UtilityOfPartner/:role', function(req,res) {
		res.render("GeniusUtilityOfPartner",	{
				agents: otherAgents[req.params.role]/*,
				AMTStatus: JSON.stringify(req.session.data)*/});
});
//ariel
app.get('/WriteQuestionnaireAnswers/:logFileName', function(req,res) {
		var nextAction = req.query.next_action;	delete req.query.next_action;
		if (!req.session.data.alreadyLogged) {
			logger.writeJsonLog('user_'+req.session.data.userid, 
				{user: req.session.data});
			req.session.data.alreadyLogged = true;
		}
		logger.writeJsonLog(req.params.logFileName, 
			{user: req.session.data, answers: req.query});
		logger.writeJsonLog('user_'+req.session.data.userid, 
			{questionnaire: req.params.logFileName, answers: req.query});
		res.redirect(nextAction);
});

app.get('/LogToXml/:logFileName', function(req,res) {
		res.contentType('text/xml');
		logger.readJsonLog(req.params.logFileName+".json", function(object) {
			res.render("LogToXml",	{log: object});
		});
});

app.get('/PreQuestionnaireExam', function(req,res) {
		res.render("PreQuestionnaireExam",	{
				action:'/VerifyQuestionnaire',
				next_action:'/entergame',
				query: req.query,
				role: req.session.data.role,
				AMTStatus: JSON.stringify(req.session.data)});
});

app.get('/VerifyQuestionnaire', function (req, res) {
	var nextAction = req.query.next_action; delete req.query.next_action;
	var wrong = "";
	for (var key in req.query) {
		if (key.indexOf("question") === 0) {
			var value = req.query[key];
			if (value != "correct") {
				wrong += key + " ";
			}
		}
	}
	if (wrong != "")
	{
		res.redirect("/PreQuestionnaireExam?mistake=1&wrong=" + wrong);
		return;
	}
	else{
		res.redirect(nextAction);
	}
});

app.get('/:gametype/play', function(req,res) {
		if (!req.session.data || req.session.data.gametype!=req.params.gametype) {  
			// start a new session:
				res.redirect("/"+req.params.gametype+"/advanced");
				return;
		}
		var gameServer = gameServers[req.params.gametype];
		res.render(gameServer.roomTemplateName,	{
				gametype: req.params.gametype, 
				role: req.session.data.role,
				agent: actualAgents[req.session.data.role],
				session_data: req.session.data,
				AMTStatus: JSON.stringify(req.session.data),
				next_action:'/PostQuestionnaireA'});
});

app.get('/:gametype/preview', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		res.render(gameServer.roomTemplateName,	{
				preview: true,
				gametype: req.params.gametype, 
				role: 'Previewer',
				agent: actualAgents['Previewer'],
				AMTStatus: JSON.stringify(req.session.data),
				next_action: ''});
});

app.get('/PostQuestionnaireA', function(req,res) {
		
		res.render("PostQuestionnaireA",	{
				action:'/WriteQuestionnaireAnswers/PostQuestionnaireA',
				next_action:'/ThankYou',
				AMTStatus: JSON.stringify(req.session.data)});
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
// Step 5: define a SOCKET.IO server that listens to the http server:
//

var io = require('socket.io').listen(httpserver);

var supportInternetExplorerOnAzure = (process.argv.length>=3 && process.argv[2] !== 'supportJava');

io.configure(function () { 
	io.set('log level', 1);
	if (supportInternetExplorerOnAzure)
		io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10); 
});

/*
function mymessageLog(socket, game, action, user, data) { 
	logger.writeJsonLog('actions_'+game.gameid, 
		{role: user.role, remainingTime: game.timer? game.timer.remainingTimeSeconds(): "-", user: (action=='Connect'? user: user.userid), action: action, data: data});
	logger.writeEventLog('events', action+" '"+JSON.stringify(data)+"'", user);
}
*/


/**
 * Tell the players in the game that a certain player has made a certain action.
 */
function announcement(socket, game, action, user, data) {
	socket.emit('announcement', {action: action, id: user.role, msg: data, you: true});
	socket.broadcast.to(game.gameid).emit('announcement', {action: action, id: user.role,	msg: data, you: false});		
	messageLog(socket, game, action, user, data);
}


io.sockets.on('connection', function (socket) {
	console.log("SOCKETIO: New client connects");
	socket.on('start_session', function (session_data) {
		console.log("SOCKETIO: New client starts session: ");
		console.dir(session_data);
		var session = {data: session_data};
		var gameServer = gameServers[session.data.gametype];
		if (!gameServer) {
			console.error("Can't find game server "+session.data.gametype);
			return;
		} 
	
		var game;
		if (!users[session.data.userid])
			users[session.data.userid] = session.data;
		if (!session.data.gameid) // we can get here from a Java socket.io client, that doesn't go throught the "/entergame" URL
			entergame(session);

		game = gameServer.gameById(session.data.gameid);
		if (!game) {
			socket.emit('status', {key: 'phase', value: 'Status: Game over! No body is here!'});
			return; // throw an exception?!
		}
		socket.join(game.gameid);

		if (!session.data.silentEntry)
			announcement(socket, game, "Connect", session.data, "");
		socket.emit('title', 'Room for '+session.data.gametype+" "+game.gameid+' - '+session.data.role);
	
		if (!game.startTime) { // game not started
			io.sockets.in(game.gameid).emit('status', {key: 'phase', value: 'Status: Waiting for '+game.missingRolesArray.join(' and ')+'...'});
			io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: '-'});
		} else {							 // game started!
			if (!game.startLogged) {
				logger.writeJsonLog("games", {
					gametype: session.data.gametype,
					gameid: game.gameid,
					startTime: game.startTime,
					unverified: true,
					mapRoleToUserid: game.mapRoleToUserid
				});	// adds the 'timestamp' field
				game.startLogged = true;
			}
			io.sockets.in(game.gameid).emit('status', {key: 'phase', value: ''});
			io.sockets.in(game.gameid).emit('EndTurn', 1);
			if (!game.timer)
				game.timer = new timer.Timer(gameServer.maxTimeSeconds, -5, 0, function(remainingTimeSeconds) {
					io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: timer.timeToString(remainingTimeSeconds)});

					game.turnsFromStart = 1+Math.floor(game.timer.timeFromStartSeconds() / app.locals.turnLengthInSeconds);
					if (!game.lastReportedTurnsFromStart || game.lastReportedTurnsFromStart!=game.turnsFromStart) {
						io.sockets.in(game.gameid).emit('EndTurn', game.turnsFromStart);
						game.lastReportedTurnsFromStart = game.turnsFromStart;
					}

					if (remainingTimeSeconds<=1) {
						game.endGame();
						if (!game.endLogged) {
							logger.writeJsonLog("games",	{
								gametype: session.data.gametype,
								gameid: game.gameid,
								startTime: game.startTime,
								endTime: game.endTime,
								unverified: true,
								mapRoleToUserid: game.mapRoleToUserid,
								mapRoleToFinalResult: game.mapRoleToFinalResult
								});
							game.endLogged = true;
						}
					}
				});
		}
	
		// A user disconnected - closed the window, unplugged the chord, etc..
		socket.on('disconnect', function () {
			announcement(socket, game, "Disconnect", session.data, "");
			socket.leave(game.gameid);
			game.playerLeavesGame(session.data.userid, session.data.role);
		});
	
		if (gameServer.events)
			gameServer.events.add(socket, game, session.data, io, announcement, messageLog, app.locals, finalResult);
	});  // end of identify event
});

process.on('uncaughtException', function(err){
console.error(err.stack);
process.exit(1);
});

//
// Last things to do before exit:
//
 
process.on('exit', function (){
	logger.writeEventLog("events", "END", {port:app.get('port')});
	console.log('Goodbye!');
});
// http://localhost:4000/negonlp/advanced/Employer?assignmentId=ASSIGNMENT_ID_NOT_AVAILABLE

