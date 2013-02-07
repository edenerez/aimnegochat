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
	;


var cookieParser = express.cookieParser('biuailab')
	, sessionStore = new express.session.MemoryStore()
	;


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
	
	//app.use(express.logger({format:'default', stream: fs.createWriteStream(accessLog, {flags: 'a'}) }));
	//app.use(express.logger({format:'dev'})); // log to console, in development format (with colors)
	
	app.use(function(req,res,next) {
			if (!/\/stylesheets\//.test(req.url) && !/\/javascripts\//.test(req.url)) 
				logger.writeEventLog("events", req.method+" "+req.url, extend({remoteAddress: req.connection.remoteAddress}, req.headers));
			next();
	});
	
	app.use(express.bodyParser());						 // Request body parsing middleware supporting JSON, urlencoded, and multipart requests. This middleware is simply a wrapper the json(), urlencoded(), and multipart() middleware
	app.use(cookieParser);
	app.use(express.session({store:	sessionStore, secret: 'biuailab'}));
	app.use(express.methodOverride());
	//app.use(express.basicAuth(function(user, pass){
	//	return 'manager' == user & 'ssqqll' == pass;
	//}));
	
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
gameServers['chat'] = new multiplayer.GameServer(
		'chat',
		/*roomTemplateName=*/'RoomForNegoChat',
		/*requiredRoles=*/['Employer', 'Candidate'], 
		/*maxTimeSeconds=*/60,
		/*events=*/require('./EventsForChat')
		);
gameServers['negochat'] = new multiplayer.GameServer(
		'negochat',
		/*roomTemplateName=*/'RoomForNegoChat',
		/*requiredRoles=*/['Employer', 'Candidate'], 
		/*maxTimeSeconds=*/30*60,
		/*events=*/require('./EventsForNegoChat')
		);

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


function setSessionForNewUser(req) {
		if (req.session.data)
			logger.writeEventLog("events", "OLDSESSION", req.session);
		req.session.data = req.query;
		req.session.data.userid = new Date().toISOString();
		req.session.data.gametype = req.params.gametype;
		logger.writeEventLog("events", "NEWSESSION",	 req.session);
}

//
// Step 3: Define the routing with EXPRESS
//
app.get('/', express.basicAuth('biu','biu'), function(req,res) {
		res.render("index",	{gametypes: Object.keys(gameServers)});
});

app.get('/:gametype/beginner', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		var alwaysStartNewSession = true;
		if (!alwaysStartNewSession && req.session.data) {
				var game = gameServer.gameWithUser(req.session.data.userid, req.session.data.role);
				if (game && !game.endTime) { // if there is a game, and it is not ended
						logger.writeEventLog("events", "RECONNECT", req.session);
						res.redirect('/entergame');
						return;
				} 
		}
		setSessionForNewUser(req);
		if (amt.isPreview(req.session.data)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			extend(req.session.data, gameServer.roleWaitingForPlayer(req.session.data.userid));
			res.redirect('/PreQuestionnaireDemography');
		}
});

app.get('/:gametype/advanced', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		setSessionForNewUser(req);
		extend(req.session.data, gameServer.roleWaitingForPlayer(req.session.data.userid));
		res.redirect('/entergame');
});

app.get('/:gametype/watchgame/:gameid', function(req,res) {
		setSessionForNewUser(req);	
		console.log('Watch mode start. session = '+JSON.stringify(req.session.data));
		extend(req.session.data, {role: 'Watcher', gameid: req.params.gameid, silentEntry: true});
		res.redirect('/'+req.params.gametype+'/play');
});


/**
 * The user with the given session wants to enter a new or existing game.
 * Find a game that matches the user, insert the user into the game, and put the gameid of the user into the session.
 * @param session includes data of a new user.
 */
function entergame(session) {
		var gameServer = gameServers[session.data.gametype];
		console.log('Enter game. session = '+JSON.stringify(session.data));

		var game;
		if (session.data.gameid) { // gameid already exists - a watcher is entering an existing game, or a player is re-entering after disconnection
			console.log("--- gameid already set: "+session.data.gameid);
		} else {
			console.log("--- Searching for game with "+session.data.role+" played by "+session.data.userid);
			game = gameServer.gameWithUser(session.data.userid, session.data.role);
			if (!game) {
				console.log("--- Searching for game waiting for "+session.data.role);
				game = gameServer.gameWaitingForRole(session.data.role);
			}
			session.data.gameid = game.gameid;
			console.log("--- Entered game: "+session.data.gameid);
		}
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

app.get('/:gametype/listlogs', function(req,res) {
		var gameServer = gameServers[req.params.gametype];
		var pretty = req.query.pretty;
		logger.readJsonLog('games.json', function(games) {
			if (games.readFileError) {
					res.contentType('text/xml');
					res.render("LogToXml",	{log: games});
			}
			else										 res.render("MultiplayerGames",	{
				title: 'Games in log',
				timeToString: timer.timeToString, 
				show_unverified_games: !pretty,
				games: games});
		});
});

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
		if (!req.session.data) {
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
				next_action:'/PostQuestionnaire'});
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

app.get('/PostQuestionnaire', function(req,res) {
		res.render("PostQuestionnaire",	{
				action:'/WriteQuestionnaireAnswers/PostQuestionnaire',
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

httpserver.listen(app.get('port'), function(){
	logger.writeEventLog("events", "START", {port:app.get('port')});
});



//
// Step 5: define a SOCKET.IO server that listens to the http server:
//

var io = require('socket.io').listen(httpserver);

var supportInternetExplorerOnAzure = true;

io.configure(function () { 
	io.set('log level', 1);
	if (supportInternetExplorerOnAzure)
		io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10); 
});

function messageLog(socket, game, action, user, data) {
	logger.writeJsonLog('actions_'+game.gameid, 
		{role: user.role, remainingTime: game.timer? game.timer.remainingTimeSeconds(): "-", user: (action=='Connect'? user: user.userid), action: action, data: data});
	logger.writeEventLog('events', action+" '"+JSON.stringify(data)+"'", user);
}

function message(socket, game, action, user, data) {
	socket.emit('message', {action: action, id: user.role, msg: data, you: true});
	socket.broadcast.to(game.gameid).emit('message', {action: action, id: user.role,	msg: data, you: false});		
	messageLog(socket, game, action, user, data);
}


io.sockets.on('connection', function (socket) {
	console.log("SOCKETIO: New client connects");
	socket.on('start_session', function (session_data) {
		console.log("SOCKETIO: New client starts session: ");
		console.dir(session_data);
		var session = {data: session_data};
		var gameServer = gameServers[session.data.gametype];
	
		var game;
		if (!session.data.gameid) {
			entergame(session);
		}
		
		game = gameServer.gameById(session.data.gameid);
		if (!game) {
				socket.emit('status', {key: 'phase', value: 'Status: Game over! No body is here!'});
				return; // throw an exception?!
		}

		game.playerEntersGame(session.data.userid, session.data.role);
		socket.join(game.gameid);
	
		if (!session.data.silentEntry)
			message(socket, game, "Connect", session.data, "");
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
			if (!game.timer)
				game.timer = new timer.Timer(gameServer.maxTimeSeconds, -1, 0, function(time) {
					io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: timer.timeToString(time)});
					if (time<=1) {
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
			message(socket, game, "Disconnect", session.data, "");
			socket.leave(game.gameid);
			game.playerLeavesGame(session.data.userid, session.data.role);
		});
	
		gameServer.events.add(socket, game, session.data, io, message, messageLog, app.locals);
	});  // end of identify event
});



//
// Last things to do before exit:
//
 
process.on('exit', function (){
	logger.writeEventLog("events", "END", {port:app.get('port')});
	console.log('Goodbye!');
});
