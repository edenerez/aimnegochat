/**
 * A server for multiplayer negotiation games. 
 * 
 * @author Ariel Roth  roth.ariel.phil@gmail.com
 * @author Erel Segal-Halevi erelsgl@gmail.com
 * @author Osnat Drain  osnatairy@gmail.com
 * @since 2013-02
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, url = require('url')
	, fs = require('fs')
	, util = require('util')
	, amt = require('./amazonturk')
	, multiplayer = require('./multiplayer')
	, timer = require('./timer')
	, useragent = require('useragent')
	, net = require('net')
	, logger = require('./logger')
	;

var cookieParser = express.cookieParser('biuailab')
	, sessionStore = new express.session.MemoryStore()
	;

var kb = "KBAgent";
var aat = "NegoChatAgent";
var ca = "ChatAgent";
var na = "NewAgent";

var configFileName = (process.argv[2]);
var country = (process.argv[3]);
var gamePort;
switch(country){
	case "usa": gamePort = 4006; break;
	case "israel": gamePort = 4004; break;
	case "egypt": gamePort = 4002; break;
	break;
}


//windows azure definitions:
var azure = require('azure')
, nconf = require('nconf');
nconf.file({ file: configFileName});
var partitionKey = nconf.get("PARTITION_KEY")
, accountName = nconf.get("STORAGE_NAME")
, accountKey = nconf.get("STORAGE_KEY")
, agentPort = nconf.get('AGENT_PORT');


var client = new net.Socket();
var port = agentPort;
var socktToAgentManager;
//var country = (process.argv[3]);
client.connect(port, 'localhost', function() {
	socktToAgentManager = client;
    console.log('CONNECTED TO: ' + 'localhost' + ':' + port);
});

client.on('data', function(data) {
    console.log('INFO: ' + data);
});

client.on('error', function(error) {
    console.log("agent manager isn't connect " + error);
    //agent.socket.disconnect();
    client.destroy();
});

client.on('close', function(error) {
	socktToAgentManager = null;
    console.log("closed connection " + error);
    client.destroy();
});

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

function setSessionForNewUser(req, gameServer) {
	if (req.session && req.session.data) {
		console.log(new Date().toISOString(), "events OLDSESSION ", (JSON.stringify(req.session)).replace(/\n/g,","));
		if (users[req.session.data.userid])
			users[req.session.data.userid].urls.pop();
	}
	req.session.data = req.query;  // for Amazon Turk users, the query contains the hit id, assignment id and worker id. 
	req.session.data.userid = req.ip + ":" + new Date().toISOString();
	req.session.data.gametype = req.params.gametype;
	req.session.data.country = country;
	req.session.data.agentType = gameServer.data.agentType;
	var canPlay = true;
	if(req.session.data.workerId){
		
		//console.dir(req.session.data);
		if (req.session.data.workerId){
			if(logger.isAMTworkerExcist(req.session.data.workerId))
				canPlay = false;
			}

		console.log(canPlay);
		
	}
	req.session.data.canPlay = canPlay;
		
	if (req.params.role)
		req.session.data.role = req.params.role;
	// else -
	// 	the role will be selected by the gameServer in order to match roles in games.
	
	browserType(req);
	req.session.data.gameid = req.param.gameid;
	
	users[req.session.data.userid] = req.session.data;
	users[req.session.data.userid].urls = [req.url.substr(0,60)];
	console.log(new Date().toISOString(), "events NEWSESSION ",	 (JSON.stringify(req.session)).replace(/\n/g,","));
	
	req.session.data.domain = (req.params.domain? req.params.domain: gameServer? gameServer.data.domain: null);
	req.session.data.personality = (req.params.personality? req.params.personality: gameServer? gameServer.data.defaultPersonality: null);
	req.session.data.remoteAddress = req.ip;
	questionnaire.makeQestionnaire(req);
}


//
// Step 1: Configure an application with EXPRESS
//

var app = express();
app.configure(function(){
	// Settings:
	app.set('port', gamePort);
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
		if (!/\/assets\//.test(req.url) && !/\/stylesheets\//.test(req.url) && !/\/javascripts\//.test(req.url)) {
			// task 1 - logging the URL: 
			console.log("events", req.method+" "+req.url /*, extend({remoteAddress: req.ip}, req.headers)*/);
			// task 2 - remembering the user's location:
			if (req.session.data && req.session.data.userid && users[req.session.data.userid])
				users[req.session.data.userid].urls.push(req.url.substr(0,60));
		}
		next(); // go to the next task - routing:
	});

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
		//middleware for logger
	app.use(express.logger({ immediate: true, format: 'dev'}));
	//app.use(express.logger.token('type', function(req, res){ return req.headers['content-type']; }));

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
var types = {};


/*
 * These servers are for menu-driven negotiation between a human and the KBAgent: 
 */
gameServers['negomenus_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer','Candidate'],
		{roomTemplateName: 'RoomForNegoMenus',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: false,
		 agentType: kb
		});
gameServers['negomenusWithAgent_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer','Candidate'],
		{roomTemplateName: 'RoomForNegoMenus',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: false,
		 hasTranslator: false,
		 canConnect: true,
		 agentType: kb
		});
gameServers['negomenus_Neighbours'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Alex','Deniz'],
		{roomTemplateName: 'RoomForNegoMenus',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Neighbours',
		 defaultPersonality: 'A',
		 hasAgent: true,
		 hasTranslator: false,
		 agentType: kb
		});

/*
 * These servers are for chat-based negotiation between two humans: 
 */
gameServers['negochat_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'], 
		{roomTemplateName: 'RoomForNegoChat2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: false,
		 hasTranslator: false
		});
gameServers['negochatWithAgent_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'], 
		{roomTemplateName: 'RoomForNegoNlpAMT',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: false,
		 hasTranslator: true,
		 canConnect: true,
		 agentType: aat

		});
gameServers['negochat_Neighbours'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Alex','Deniz'],
		{roomTemplateName: 'RoomForNegoChat2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Neighbours',
		 defaultPersonality: 'A',
		 hasAgent: false,
		 hasTranslator: false
		});

/*
 * These servers are for chat-driven negotiation between a human and the KBAgent: 
 */
gameServers['negonlp_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: kb
		});
gameServers['negonlp_Neighbours'] = new multiplayer.GameServer(
		['Alex','Deniz'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Neighbours',
		 defaultPersonality: 'A',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: kb
		});

/*gameServers['negotranslate_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*//*['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoTranslate',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: false
		});
gameServers['negotranslate_Neighbours'] = new multiplayer.GameServer(
		/*requiredRoles=*//*['Alex','Deniz'],
		{roomTemplateName: 'RoomForNegoTranslate',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Neighbours',
		 defaultPersonality: 'A',
		 hasAgent: true,
		 hasTranslator: false
		});*/


/*
 * These servers are for chat-driven negotiation between a human and the KBAgent, with an alternative GUI: 
 */
gameServers['negonlp2_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: kb
		});

/*
 * These servers are for chat-driven negotiation between a human and the NegoChatAgent: 
 */
gameServers['negonlpnc_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: aat
		});

/*
 * These servers are for chat-driven negotiation between a human and the NegoChatAgent: 
 */
gameServers['negonlpncAMT_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: aat
		});

/*
 * These servers are for chat-driven negotiation between a human and the NegoChatAgent, with an alternative GUI: 
 */
gameServers['negonlp2nc_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: aat
		});

gameServers['negonlp2ncAMT_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp2',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: aat
		});

gameServers['NegoChatAgentDemo_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: aat
		});

gameServers['KBAgentDemo_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: kb
		});

/*
 * These servers are for chat-driven negotiation between a human and the ChatAgent: 
 */
gameServers['negonlpca_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: ca
		});
/*
 * These servers are for chat-driven negotiation between a human and the NewAgent: 
 */
gameServers['negonlpna_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlp',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: na
		});

/*
 * These servers are for chat-driven negotiation between a human and the NewAgent: 
 */
gameServers['negonlpnaAMT_JobCandidate'] = new multiplayer.GameServer(
		/*requiredRoles=*/['Employer', 'Candidate'],
		{roomTemplateName: 'RoomForNegoNlpAMT',
		 maxTimeSeconds:   30*60,
		 events: require('./EventsForNegoChat'),
		 domain: 'Job',
		 defaultPersonality: 'short-term',
		 hasAgent: true,
		 hasTranslator: true,
		 agentType: na
		});



/**
 * http://stackoverflow.com/questions/16649529/ending-an-http-request-prematurely/16650056?noredirect=1#16650056
 * A middleware for getting the game server of the given game type. 
 * If the game server does not exist - return an error message to the http response, and end the request.
 */
function getGameServer(req, res, next) {
	var gametype          = req.params.gametype;
	if(gametype == "negonlpncAMT_JobCandidate"){
		gametype = req.params.gametype = "negonlp2ncAMT_JobCandidate";
	}
	res.locals.gameServer = gameServers[gametype];

	if (!res.locals.gameServer)
		return res.end('Unknown game type "' + gametype + '"'); // end the request
	next(); // this will call the next-in-line handler, which is your route handler below
}


for (gameType in gameServers){
	gameServers[gameType].gametype = gameType;//.split("_")[0];
	if (!types[gameType.split("_")[0]]){
		types[gameType.split("_")[0]] = [];
		types[gameType.split("_")[0]][0] = gameType.split("_")[1];
	}
	else
		types[gameType.split("_")[0]][types[gameType.split("_")[0]].length] = gameType.split("_")[1];
}

function verifySessionData(req, res, next){
	if(!req.session.data){
		console.error("no session");
		console.dir(req.session);
		return res.end('no session');
	}
	next();
}


function getActualAgent(domainName, roleName, personality) {
	var domain = domains[domainName];
	if (!domain) {
		throw new Error("Cannot get domain "+domainName);
		return null; 
	}
	var role = roleName.toLowerCase();
	var actualAgent = domain.agentOfRoleAndPersonality(role, personality);
	if (!actualAgent) {
		console.dir(domain);
		throw new Error("Cannot get actual agent of domain "+domainName+", role "+role+" and personality "+personality);
		return null; 
	}
	return actualAgent;
}

//
// Step 2.5: GENIUS related variables:
//

var genius = require('./genius');
var domains = {};
domains['Job'] = new genius.Domain(path.join(__dirname,'domains/'+country,'JobCandiate','JobCanDomain.xml'));
domains['Neighbours'] = new genius.Domain(path.join(__dirname,'domains/'+country,'neighbours_alex_deniz','neighbours_domain.xml'));

// Variables that will be available to all JADE templates:
app.locals.turnLengthInSeconds = 2*60;
app.locals.sprintf = require('sprintf').sprintf;
app.locals.format = "%+1.0f";
app.locals.accountName = accountName; // For differentiating between test and real environment
console.log("accountName: "+accountName);


//
// Step 3: Define the routing with EXPRESS
//

app.get('/', express.basicAuth('biu','biu'), function(req,res) {
		res.render("index",	{serverStartTime: serverStartTime, gametypes: types}); //Object.keys(gameServers)
});

// Links for demo:
var demogametype = "NegoChatAgentDemo_JobCandidate";
var demobeginneroradvanced = "beginner";
var demorole = "Employer";
app.get('/ncdemo', function (req,res){
	//res.redirect('/NegoChatAgentDemo_JobCandidate/'+demobeginneroradvanced+"/"+demorole);
	res.render("demoPage");
});
app.get('/kbdemo', function (req,res){
	//res.redirect('/KBAgentDemo_JobCandidate/'+demobeginneroradvanced+"/"+demorole);
	res.render("demoPage");
});

app.get('/demo', function(req,res) {
	res.render("demoPage");
});

app.get('/irb', function(req,res) {
	res.render("ibr");
});

//ariel
app.get('/users', function(req,res) {
		res.render("Users",	{users:users});
});


app.get('/:gametype/gametype', function (req,res){
	var gameType = req.params.gametype;
	res.render("present", {
		gametype: gameType, 
		gametypes: types,
		requiredRoles: gameServers[gameType].requiredRolesArray
		});
});

// This is the entry point for an Amazon Turker with or without a pre-specified role:
//    It leads to the preview or to the pre-questionnaire:
app.get('/:gametype/beginner/:role?', getGameServer, function(req,res) {
		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			
			setSessionForNewUser(req, res.locals.gameServer);
			req.session.data.role = req.params.role?
					req.params.role:
					res.locals.gameServer.nextRole();	
			res.redirect('/'+req.params.gametype+'/prequestionnaireA');
		}
});

//This is the entry point for the demo, with or without a pre-specified role:
//	It leads directly to the presentation and exam.
app.get('/:gametype/demo/:role?', getGameServer, function(req,res) {

		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			setSessionForNewUser(req, res.locals.gameServer);
			req.session.data.role = req.params.role?
					req.params.role:
					res.locals.gameServer.nextRole();	
			res.redirect('/PreQuestionnaireExam');
		}
});

// This is the entry point for a developer with or without a pre-specified role:
//    It leads directly to the game.
app.get('/:gametype/advanced/:role?', getGameServer, function(req,res) {

		if (amt.isPreview(req.query)) {
			 res.redirect('/'+req.params.gametype+'/preview');
		} else {
			setSessionForNewUser(req, res.locals.gameServer);
			req.session.data.role = req.params.role?
					req.params.role:
					res.locals.gameServer.nextRole();	
			res.redirect('/entergame');
		}
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
		
		console.log('Enter game. session = '+JSON.stringify(session.data).replace(/\n/g,","));

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
		game.country =country;
		entergameSemaphore.leave();
	});
}

app.get('/entergame', verifySessionData, function(req,res) {
	entergame(req.session);  // sets req.session.data.gameid
	res.redirect('/'+req.session.data.gametype+"/play");
});

// Watch a specific game:
app.get('/:gametype/watchgame/:gameid', getGameServer, function(req,res) {
		setSessionForNewUser(req, res.locals.gameServer);	
		console.log('Watch mode start. session = '+JSON.stringify(req.session.data).replace(/\n/g,","));
		req.session.data.role = 'Watcher';
		req.session.data.gameid = req.params.gameid;
		req.session.data.silentEntry = true;
		res.redirect('/'+req.params.gametype+'/play');
});

// List all active games on a specific game-server (not updated automatically):
app.get('/:gametype/listactive', getGameServer, function(req,res) {
		res.render("WatchAllGamesOnServer",	{
				gametype: req.params.gametype,
				title: 'Games active on server',
				show_unverified_games: true,
				timeToString: timer.timeToString, 
				games: res.locals.gameServer.getGames()});
});

// Watch all active games on all servers:
app.get('/watchall', function(req,res) {
	res.render("WatchAllServers");
});

//////////////////
// Player
///////////////////

var Player = require('./routes/player');
var PlayerModel = require('./models/playerModel');
var playerModel = new PlayerModel(
    azure.createTableService(accountName, accountKey)
    , 'Player'
    , partitionKey);
var player = new Player(playerModel);

app.get('/:gametype/listAllPlayers' ,function (req,res){
	 player.listAll(req,res,types,country);
});

app.get('/:gametype,:RowKey,:PartitionKey/deletePlayer', express.basicAuth('biu','biu'), function (req,res){
	player.deleteItem(req, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////////


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
	 questionnaire.listAll(req,res,types,country);
});

app.get('/:gametype/listAllQuestionnaireInfo' ,function (req,res){
	 questionnaire.listAllInfo(req,res,types,country);
});

app.get('/:gametype/prequestionnaireA', questionnaire.demographyQuestionnaire.bind(questionnaire));
app.post('/:gametype/addquestionnaire', function (req,res){
	if(!req.session.data){
		var someValue = req.body.item;
		var gametype = req.params.gametype;
		res.redirect('/'+gametype+'/beginner');
	}
	else{
		questionnaire.addQuestionnaire(req.body.item, req, res);	
	}
	
});
app.get('/:gametype,:RowKey,:PartitionKey/deleteQuestionnaire', express.basicAuth('biu','biu'), questionnaire.deleteItem.bind(questionnaire));
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

app.get('/:gametype,:RowKey,:PartitionKey/deleteGameAction', express.basicAuth('biu','biu'), function (req,res){
	gameAction.deleteItem(req, res);
});

function messageLog(socket, game, action, user, data) {
	//console.log(action +"  " +game.gameid, 
	//	{role: user.role, remainingTime: game.timer? game.timer.remainingTimeSeconds(): "-", user: (action=='Connect'? user: user.userid), action: action, data: data});
//I think we can change the call of the "massageLog" function to "gameAction.activeGameAction" instead and it will still work. and we don't need the socket here
	

	gameAction.activeGameAction(game, action, user, data);

	gamesTable(user.gametype, game, true, action);
}

app.get('/:gametype,:RowKey,:PartitionKey/deleteGameAction', express.basicAuth('biu','biu'), function (req,res){
	games.deleteItem(req, res);
});

app.get('/:gametype/listAllGameAction' ,function (req,res){
	 gameAction.listAll(req,res,types,country);
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
	 games.listAll(req,res,types,country);
});

app.get('/:gametype,:RowKey,:PartitionKey/deleteGame', express.basicAuth('biu','biu'), function (req,res){
	games.deleteItem(req, res);
});

function gamesTable(gametype, game, unverified, action) //insert information to different tables
{
	if (action == "Connect"){
		if (game.startTime){
			games.addGames(gametype, game.gameid, game.startTime, unverified, game);
			for (user in game.mapRoleToUserid){
  				if (game.mapRoleToUserid[user].match('Agent')){
					player.addPlayer(game.gameid, game.mapRoleToUserid[user], user, 'agent', gametype, game.country);
				}
				else{
					player.addPlayer(game.gameid, game.mapRoleToUserid[user], user, 'human', gametype, game.country);	
				}
			}
		}
	}
	if (action == "Sign" || action =="Opt-out" || action == "TimeOut"){
		var len = 0;
		for (var o in game.mapRoleToUserid) {
		    len++;
		}
		for (var o in game.mapRoleToFinalResult) {
		    len--;
		}
		if (len == 0){
			for (role in game.mapRoleToFinalResult){
				var a=0;
				console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
				console.log(game.mapRoleToFinalResult[role]);
				console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
				finalResult.addFinalResult(game.mapRoleToFinalResult[role], game.mapRoleToUserid[role], role, game.gameid, game.country);
				if (!finalAgreement.check){
					for (agree in game.mapRoleToFinalResult[role].agreement){
						finalAgreement.addFinalAgreement(agree, game.mapRoleToFinalResult[role].agreement[agree], game.gameid, game.country);
					}
				}
			}
		}
		/*switch(action){
			case "Sign": {game.endedIn = "Sign"; break;}
			case "Opt-out": {game.endedIn = "Opt-out"; break;}
			case "TimeOut": {game.endedIn = "TimeOut"; break;}
			break;
		}*/
	}
	if (action == "Disconnect" ){
		if (game.startTime){
			game.endGame();
			finalAgreement.check = false;
			games.activeGames(game.gameid, game.endedIn, game.endTime, game.RowKey);
		}
	}
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
	 finalResult.listAll(req,res,types,country);
});

app.get('/:gametype,:RowKey,:PartitionKey/deleteFinalResult', express.basicAuth('biu','biu'), function (req,res){
	finalResult.deleteItem(req, res);
});

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////
//Agreement
///////////////////

var FinalAgreement = require('./routes/finalAgreement');
var FinalAgreementModel = require('./models/finalAgreementModel');
var finalAgreementModel = new FinalAgreementModel (
	azure.createTableService(accountName, accountKey)
	, 'FinalAgreement');
var finalAgreement = new FinalAgreement(finalAgreementModel);

app.get('/:gametype/listAllFinalAgreements' ,function (req,res){
	 finalAgreement.listAll(req,res,types,country);
});

app.get('/:gametype,:RowKey,:PartitionKey/deleteFinalAgreements', express.basicAuth('biu','biu'), function (req,res){
	finalAgreement.deleteItem(req, res);
});
///////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////
//GameReport
/////////////////////

var GameReport = require('./routes/report');
var gameReport = new GameReport (questionnaireModel
								,gamesModel
								,gameActionModel
								,finalResultModel
								,playerModel
								,finalAgreementModel);

app.get('/:gametype,:PartitionKey/gameReport' , function (req,res){
	gameReport.gameInfo (req,res,types);
});

app.get('/:gametype,:PartitionKey/gameReportFile' , function (req,res){
	gameReport.gameInfoFile (req,res,types);
});



app.get('/:gametype,:RowKey/playerReport' , function (req,res){
	gameReport.playerInfo (req,res,types);
});

app.get('/:gametype,:RowKey/scoreReport' , function (req,res){
	gameReport.scoreInfo (req,res,types);
});

app.get('/:gametype/scoreReport2' , function (req,res){
	gameReport.scoreInfo2 (req,res,types);
});

app.get('/:gametype,:PartitionKey/downlaodAction' , function (req,res){
	//csv.writeCsvLog('tryMe',req.params.GameActionList);
	gameReport.downlaodInfo (req,res,types);
});
///////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/PreQuestionnaireDemography', function(req,res) {
		res.render("PreQuestionnaireDemography",	{
				action:'/WriteQuestionnaireAnswers/PreQuestionnaireDemography',
				next_action:'/PreQuestionnaireExam',
				AMTStatus: JSON.stringify(req.session.data)});
});

app.get('/UtilityOfCurrent/:domain/:role/:personality', function(req,res) {
		var actualAgent = req.params.role=='Watcher'? 
			null:
			getActualAgent(req.params.domain, req.params.role, req.params.personality);
		res.render("GeniusUtilityOfCurrent",	{agent: actualAgent});
});

app.get('/UtilityOfCurrentNaturalLanguage/:domain/:role/:personality', function(req,res) {
		var actualAgent = req.params.role=='Watcher'? 
			null:
			getActualAgent(req.params.domain, req.params.role, req.params.personality);
		res.render("GeniusUtilityOfCurrentNaturalLanguage",	{agent: actualAgent});
});

app.get('/UtilityOfPartner/:domain/:role*', function(req,res) {
		var domain = domains[req.params.domain];
		var otherAgents	= domain.agentsOfOtherRole(req.params.role.toLowerCase());
		res.render("GeniusUtilityOfPartner",	{agents: otherAgents});
});

app.get('/Help/:gametype/:domain/:role', getGameServer, function(req,res) {
		res.render(res.locals.gameServer.data.roomTemplateName+"Help",	{
				role: req.params.role,
				domain_description: domains[res.locals.gameServer.data.domain].description,
				});
});

app.get('/PreQuestionnaireExam',verifySessionData, function(req,res) {
		var countryToSend;
		if (country == "egypt")
			countryToSend = "EG";
		else if(country == "israel")
			countryToSend = "IL";
		else
			countryToSend = "US";
		res.render("PreQuestionnaireExam",	{
				action:'/VerifyQuestionnaire',
				next_action:'/entergame',
				query: req.query,
				country: countryToSend,
				userRole: req.session.data.role,
				requiredRoles: gameServers[req.session.data.gametype].requiredRolesArray,
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

app.get('/:gametype/play', getGameServer, function(req,res) {
		if (!req.session.data || req.session.data.gametype!=req.params.gametype) {  
			// start a new session:
				res.redirect("/"+req.params.gametype+"/advanced");
				return;
		}
		var actualAgent = req.session.data.role=='Watcher'? 
			null:
			getActualAgent(req.session.data.domain, req.session.data.role, req.session.data.personality);
		
		if (res.locals.gameServer.data.hasAgent && socktToAgentManager && req.session.data.role !='Watcher'){// if there is a connection to the agent system
			var agentRole;
			var opponentRole;
			for (role in res.locals.gameServer.requiredRoles){
				if (role !== req.session.data.role)
					agentRole = role;
				else
					opponentRole = role;

			}
			//send the info. of player role, opponent role, agent name, game type and game id to the agent system.
			setTimeout(function(){
				
				socktToAgentManager.write(JSON.stringify({
					gametype:req.params.gametype, 
					opponentRole:opponentRole, 
					role:agentRole, 
					agent: res.locals.gameServer.data.agentType, 
					gameid: req.session.data.gameid,
					country:country}));
			},3000);
			//socktToAgentManager.write(JSON.stringify({gametype:req.params.gametype, opponentRole:opponentRole, role:agentRole, agent: agentType, gameid: req.session.data.gameid}));
		}
		
		res.render(res.locals.gameServer.data.roomTemplateName,	{
				gametype: req.params.gametype, 
				role: req.session.data.role,
				agent: actualAgent,
				domain_description: domains[res.locals.gameServer.data.domain].description,
				session_data: req.session.data,
				AMTStatus: JSON.stringify(req.session.data),
				canConnect: res.locals.gameServer.data.canConnect,
				next_action:'/PostQuestionnaireA'});
	   
});

app.get('/:gametype/preview', getGameServer, function(req,res) {
		var workers = logger.readAMTfile();
		var roleForPreview = res.locals.gameServer.requiredRolesArray[0];
		var actualAgent = getActualAgent(res.locals.gameServer.data.domain, roleForPreview, res.locals.gameServer.data.defaultPersonality);
		res.render(res.locals.gameServer.data.roomTemplateName,	{
				preview: true,
				wprkers: workers,
				gametype: req.params.gametype, 
				role: roleForPreview,
				agent: actualAgent,
				domain_description: domains[res.locals.gameServer.data.domain].description,
				session_data: {gametype: req.params.gametype, domain: res.locals.gameServer.data.domain, role: roleForPreview, personality: res.locals.gameServer.data.defaultPersonality},
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

app.get('/ThankYouAmazon', function(req,res) {
		res.render("ThankYouAmazon",	{
				user: req.session.data,
				AMTStatus: JSON.stringify(req.session.data)});
});


//
// Step 4: define an HTTP server over the express application:
//

var httpserver = http.createServer(app);
var serverStartTime = null;

httpserver.listen(app.get('port'), function(){
	console.log("events", "START", {port:app.get('port')});
	serverStartTime = new Date();
});



//
// Step 5: define a SOCKET.IO server that listens to the http server:
//

var io = require('socket.io').listen(httpserver);

var supportInternetExplorerOnAzure = (process.argv.length>=4 && process.argv[4] !== 'supportJava');


io.configure(function () { 
	io.set('log level', 1);
	if (supportInternetExplorerOnAzure)
		io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10); 
});


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

	socket.on('disconnect', function () { console.log("SOCKETIO: Client disconnects"); });
	
	socket.on('WatchAllServers', function() {
		// each watcher sends this event when it connects. See WatchAll.jade
		console.log("SOCKETIO: New WatchAllServers starts session");
		socket.join('WatchAllServers');
	});
	
	socket.on('WatchAllGamesOnServer', function(gametype) {
		// each watcher sends this event when it connects. See WatchAll.jade
		console.log("SOCKETIO: New WatchAllGamesOnServer for "+gametype+" starts session");
		socket.join(gametype);
	});

	socket.on('start_session', function (session_data) { 
		// each game client sends this event when it connects. See RoomForNegoChat.js
		console.log("SOCKETIO: New client starts session: ");
		console.dir(session_data);
		
		var gameServer = gameServers[session_data.gametype];
		if (!gameServer) {
			console.error("Can't find game server "+session_data.gametype);
			return;
		}

		if (!session_data.domain)
			session_data.domain = gameServer.data.domain;
		if (!session_data.personality)
			session_data.personality = gameServer.data.defaultPersonality;

		var session = {data: session_data};
		var game;
		if (!users[session.data.userid])
			users[session.data.userid] = session.data;
		if (!session.data.gameid) // we can get here from a Java socket.io client, that doesn't go throught the "/entergame" URL
			entergame(session);

		if(session.data.workerId)
			logger.writeAMTworkerid("AMT",session.data.workerId);

		game = gameServer.gameById(session.data.gameid);
		if (!game) {
			socket.emit('status', {key: 'phase', value: 'Status: Game over! Nobody is here!'});
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
				var newGameData = {
					gametype: session.data.gametype,
					gameid: game.gameid,
					startTime: game.startTime,
					unverified: true,
					mapRoleToUserid: game.mapRoleToUserid
				};
				console.log("New game starts: "+JSON.stringify(newGameData));
				
				// send to the watch-all-ers:
				io.sockets.in('WatchAllServers').emit('newgame', newGameData);
				io.sockets.in(session.data.gametype).emit('newgame', newGameData);

				game.startLogged = true;
			}
			io.sockets.in(game.gameid).emit('status', {key: 'phase', value: ''});
			io.sockets.in(game.gameid).emit('EndTurn', 1);
			if (!game.timer)
				game.timer = new timer.Timer(gameServer.data.maxTimeSeconds, -5, 0, function(remainingTimeSeconds) {
					io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: timer.timeToString(remainingTimeSeconds)});

					game.turnsFromStart = 1+Math.floor(game.timer.timeFromStartSeconds() / app.locals.turnLengthInSeconds);
					if (!game.lastReportedTurnsFromStart || game.lastReportedTurnsFromStart!=game.turnsFromStart) {
						io.sockets.in(game.gameid).emit('EndTurn', game.turnsFromStart);
						game.lastReportedTurnsFromStart = game.turnsFromStart;
					}

					if (remainingTimeSeconds<=1) {
						game.endGame();
						if (!game.endLogged) {
							io.sockets.in(game.gameid).emit('EndGame');
							console.log("games",	{
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

		if(gameServer.data.canConnect && socktToAgentManager){
				console.log("agent server can connect!");
					setTimeout(function(){

					if(game.missingRolesArray.length >0){
						console.log("=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=")
						socktToAgentManager.write(JSON.stringify({
							gametype:session_data.gametype, 
							opponentRole:session_data.role, 
							role:game.missingRolesArray[0], 
							agent: gameServer.data.agentType, 
							gameid: game.gameid,
							country:game.country}));
					}
				//},10000);
				},270000);
			


		}
		
		// A user disconnected - closed the window, unplugged the chord, etc..
		socket.on('disconnect', function () {
			if (!session.data.silentEntry)
				announcement(socket, game, "Disconnect", session.data, "");
			socket.leave(game.gameid);
			game.playerLeavesGame(session.data.userid, session.data.role);
		});
	
		// Initialize the event handlers that are specific to the type of game we are playing:
		if (gameServer.data.events) {
			gameServer.data.events.initializeEventHandlers(socket, game, session.data, io, finalResult, {
				getActualAgent: getActualAgent,
				messageLog: messageLog,
				announcement: announcement,
				rols : gameServers[session.data.gametype].requiredRoles,
				accountName: accountName,
			});
		}
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
	console.log("events", "END", {port:app.get('port')});
	console.log('Goodbye!');
});


