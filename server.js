
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
  app.set('views', path.join(__dirname, 'views'));    // The view directory path
  app.set('view engine', 'jade');            // The default engine extension to use when omitted
  app.set('case sensitive routing', false);  // Enable case sensitivity, disabled by default, treating "/Foo" and "/foo" as same

  // Middleware - order is important!
  app.use(express.favicon());
  
  //app.use(express.logger({format:'default', stream: fs.createWriteStream(accessLog, {flags: 'a'}) }));
  //app.use(express.logger({format:'dev'})); // log to console, in development format (with colors)
  
  app.use(function(req,res,next) {
      if (!/\/stylesheets\//.test(req.url) && !/\/javascripts\//.test(req.url)) 
        logger.writeEventLog("events", req.method+" "+req.url, extend({remoteAddress: req.connection.remoteAddress}, req.headers));
      next();
  });
  
  app.use(express.bodyParser());             // Request body parsing middleware supporting JSON, urlencoded, and multipart requests. This middleware is simply a wrapper the json(), urlencoded(), and multipart() middleware
  app.use(cookieParser);
  app.use(express.session({store:  sessionStore, secret: 'biuailab'}));
  app.use(express.methodOverride());
  //app.use(express.basicAuth(function(user, pass){
  //  return 'manager' == user & 'ssqqll' == pass;
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
    /*maxTimeSeconds=*/60
    );
gameServers['negochat'] = new multiplayer.GameServer(
    'negochat',
    /*roomTemplateName=*/'RoomForNegoChat',
    /*requiredRoles=*/['Employer', 'Candidate'], 
    /*maxTimeSeconds=*/60
    );

//
// Step 2.5: GENIUS related variables:
//

var genius = require('./genius');
var domain = new genius.Domain(path.join(__dirname,'domains','JobCandiate','JobCanDomain.xml'));
var actualAgents = {};
var otherAgents = {};
actualAgents['Employer']  = domain.agentOfRoleAndPersonality('employer', 'short-term');
otherAgents['Employer']  = domain.agentsOfOtherRole('employer');
actualAgents['Candidate'] = domain.agentOfRoleAndPersonality('candidate', 'short-term');
otherAgents['Candidate']  = domain.agentsOfOtherRole('candidate');

// Variables that will be available to all JADE templates:
app.locals.turnLengthInSeconds = 10;
app.locals.sprintf = require('sprintf').sprintf;
app.locals.format = "%+1.0f";


function setSessionForNewUser(req) {
    if (req.session.query)
      logger.writeEventLog("events", "OLDSESSION", req.session);
    req.session.query = req.query;
    req.session.query.userid = new Date().toISOString();
    req.session.query.gametype = req.params.gametype;
    logger.writeEventLog("events", "NEWSESSION",   req.session);
}

//
// Step 3: Define the routing with EXPRESS
//
app.get('/', express.basicAuth('biu','biu'), function(req,res) {
    res.render("index",  {gametypes: Object.keys(gameServers)});
});

app.get('/:gametype/beginner', function(req,res) {
    var gameServer = gameServers[req.params.gametype];
    var alwaysStartNewSession = true;
    if (!alwaysStartNewSession && req.session.query) {
        var game = gameServer.gameWithUser(req.session.query.userid, req.session.query.role);
        if (game && !game.endTime) { // if there is a game, and it is not ended
            logger.writeEventLog("events", "RECONNECT", req.session);
            res.redirect('/entergame');
            return;
        } 
    }
    setSessionForNewUser(req);
    if (amt.isPreview(req.session.query)) {
       res.redirect('/AmtPreview');
    } else {
      extend(req.session.query, gameServer.roleWaitingForPlayer(req.session.query.userid));
      res.redirect('/PreQuestionnaireDemography');
    }
});

app.get('/:gametype/advanced', function(req,res) {
    var gameServer = gameServers[req.params.gametype];
    setSessionForNewUser(req);
    if (amt.isPreview(req.query)) {
       res.redirect('/AmtPreview');
    } else {
      extend(req.session.query, gameServer.roleWaitingForPlayer(req.session.query.userid));
      res.redirect('/entergame');
    }
});

app.get('/:gametype/watchgame/:gameid', function(req,res) {
    setSessionForNewUser(req);  
    console.log('Watch mode start. session = '+JSON.stringify(req.session.query));
    extend(req.session.query, {role: 'Watcher', gameid: req.params.gameid, silentEntry: true});
    res.redirect('/Play');   // requires :gametype param in the session
});


app.get('/entergame', function(req,res) {
    var gameServer = gameServers[req.session.query.gametype];
    console.log('Enter game. session = '+JSON.stringify(req.session.query));
    var session = req.session;

    var game;
    if (session.query.gameid) { // gameid already exists - a watcher is entering an existing game, or a player is re-entering after disconnection
      console.log("--- gameid already set: "+session.query.gameid);
    } else {
      console.log("--- Searching for game with "+session.query.role+" played by "+session.query.userid);
      game = gameServer.gameWithUser(session.query.userid, session.query.role);
      if (!game) {
        console.log("--- Searching for game waiting for "+session.query.role);
        game = gameServer.gameWaitingForRole(session.query.role);
      }
      session.query.gameid = game.gameid;
    }
    res.redirect('/Play');
});

app.get('/:gametype/listactive', function(req,res) {
    var gameServer = gameServers[req.params.gametype];
    res.render("MultiplayerGames",  {
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
          res.render("LogToXml",  {log: games});
      }
      else                     res.render("MultiplayerGames",  {
        title: 'Games in log',
        timeToString: timer.timeToString, 
        show_unverified_games: !pretty,
        games: games});
    });
});

app.get('/AmtPreview', function(req,res) {
    var gameServer = gameServers[req.session.query.gametype];
    res.render("AmtPreview",  {
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/PreQuestionnaireDemography', function(req,res) {
    res.render("PreQuestionnaireDemography",  {
        action:'/WriteQuestionnaireAnswers/PreQuestionnaireDemography',
        next_action:'/PreQuestionnaireExam',
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/UtilityOfCurrent/:role', function(req,res) {
    res.render("GeniusUtilityOfCurrent",  {
        agent: actualAgents[req.params.role],
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/UtilityOfPartner/:role', function(req,res) {
    res.render("GeniusUtilityOfPartner",  {
        agents: otherAgents[req.params.role],
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/WriteQuestionnaireAnswers/:logFileName', function(req,res) {
    var nextAction = req.query.next_action;  delete req.query.next_action;
    if (!req.session.query.alreadyLogged) {
      logger.writeJsonLog('user_'+req.session.query.userid, 
        {user: req.session.query});
      req.session.query.alreadyLogged = true;
    }
    logger.writeJsonLog(req.params.logFileName, 
      {user: req.session.query, answers: req.query});
    logger.writeJsonLog('user_'+req.session.query.userid, 
      {questionnaire: req.params.logFileName, answers: req.query});
    res.redirect(nextAction);
});

app.get('/LogToXml/:logFileName', function(req,res) {
    res.contentType('text/xml');
    logger.readJsonLog(req.params.logFileName+".json", function(object) {
      res.render("LogToXml",  {log: object});
    });
});

app.get('/PreQuestionnaireExam', function(req,res) {
    res.render("PreQuestionnaireExam",  {
        action:'/VerifyQuestionnaire',
        next_action:'/Play',
        mistake: req.query.mistake,
        role: req.session.query.role,
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/VerifyQuestionnaire', function(req,res) {
    var nextAction = req.query.next_action;  delete req.query.next_action;

    for (var key in req.query) {
      if (key.indexOf("question")===0) {
		var value = req.query[key];
		if (value != "correct") {
			res.redirect("/PreQuestionnaireExam?mistake=1");
            return;
		}
      }
	}
    res.redirect(nextAction);
});

app.get('/Play', function(req,res) {
    var gameServer = gameServers[req.session.query.gametype];
    res.render(gameServer.roomTemplateName,  {
        gametype: req.session.query.gametype, 
        role: req.session.query.role,
        agent: actualAgents[req.session.query.role],
        AMTStatus: JSON.stringify(req.session.query),
        next_action:'/PostQuestionnaire'});
});

app.get('/PostQuestionnaire', function(req,res) {
    res.render("PostQuestionnaire",  {
        action:'/WriteQuestionnaireAnswers/PostQuestionnaire',
        next_action:'/ThankYou',
        AMTStatus: JSON.stringify(req.session.query)});
});

app.get('/ThankYou', function(req,res) {
    res.render("ThankYou",  {
        user: req.session.query,
        AMTStatus: JSON.stringify(req.session.query)});
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

var io = require('socket.io').listen(httpserver)
  , SessionSockets = require('session.socket.io')
  ;

io.set('log level', 1);

function messageLog(socket, game, action, user, data) {
    logger.writeJsonLog('actions_'+game.gameid, 
      {role: user.role, remainingTime: game.timer? game.timer.remainingTimeSeconds(): "-", user: (action=='Connect'? user: user.userid), action: action, data: data});
    logger.writeEventLog('events', action+" '"+JSON.stringify(data)+"'", user);
}

function message(socket, game, action, user, data) {
    socket.emit('message', {action: action, id: user.role, msg: data, you: true});
    socket.broadcast.to(game.gameid).emit('message', {action: action, id: user.role,  msg: data, you: false});    
    messageLog(socket, game, action, user, data);
}


//var socketPath = '/negochat';  // should match the path in the Javascript .connect call
new SessionSockets(io, sessionStore, cookieParser).on('connection', function (err,socket,session) {
  if (err) {console.dir(err); return;}

  var gameServer = gameServers[session.query.gametype];
  
  var agent = actualAgents[session.query.role];
  if (agent)
    var allIssues = agent.utility_space_object.issueByIndex;

  var game;
  if (session.query.gameid) { // gameid is given - a watcher is entering an existing game, or a player is re-entering after disconnection
    //console.log("--- Searching for game with id "+session.query.gameid);
    game = gameServer.gameById(session.query.gameid);
    if (!game) {
      socket.emit('status', {key: 'phase', value: 'Status: Game over! No body is here!'});
      return; // throw an exception?!
    }
    //console.log('--- We are in the chat room, with socket.io connected! session = '+JSON.stringify(session.query));
  } else {
    console.error("--- no game id found - exiting! session = "+JSON.stringify(session.query));
    return;
  }
  console.dir(game.mapRoleToUserid);
  game.playerEntersGame(session.query.userid, session.query.role);
  socket.join(game.gameid);

  if (!session.query.silentEntry)
    message(socket, game, "Connect", session.query, "");
  socket.emit('title', 'Room for '+session.query.gametype+" "+game.gameid+' - '+session.query.role);

  if (!game.startTime) { // game not started
    io.sockets.in(game.gameid).emit('status', {key: 'phase', value: 'Status: Waiting for '+game.missingRolesArray.join(' and ')+'...'});
    io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: '-'});
  } else {               // game started!
  
    if (!game.startLogged) {
      logger.writeJsonLog("games", {
        gametype: session.query.gametype,
        gameid: game.gameid,
        startTime: game.startTime,
        unverified: true,
        mapRoleToUserid: game.mapRoleToUserid
      });  // adds the 'timestamp' field
      game.startLogged = true;
    }
    io.sockets.in(game.gameid).emit('status', {key: 'phase', value: ''});
    if (!game.timer)
      game.timer = new timer.Timer(gameServer.maxTimeSeconds, -1, 0, function(time) {
        io.sockets.in(game.gameid).emit('status', {key: 'remainingTime', value: timer.timeToString(time)});
        if (time<=1) {
          game.endGame();
          if (!game.endLogged) {
            logger.writeJsonLog("games",  {
              gametype: session.query.gametype,
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

  // A user sent a chat message - just send this message to all other users:
  socket.on('message', function (data) {
    message(socket, game, "Message", session.query, data);
  });

  
  // A user changed the value for one of his issues:
  socket.on('change', function (data) {
    messageLog(socket, game, "Change", session.query, data);
    game.playerChangesValue(session.query.role, data.issue, data.value);
    var currentIssueAgreed = game.arePlayerValuesEqual(data.issue);
    io.sockets.in(game.gameid).emit('status', {key: data.issue+"_agreed", value: (currentIssueAgreed? 'yes': 'no')});
    if (currentIssueAgreed) {
      var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
      io.sockets.in(game.gameid).emit('allIssuesAgreed', allIssuesAgreed);
    }
  });
  
  // A user finished playing (e.g. by clicking a "finish" button):
  socket.on('sign', function (agreement) {
    var utilityWithoutDiscount = agent.utility_space_object.getUtilityWithoutDiscount(agreement);
    var timeFromStart = gameServer.maxTimeSeconds - game.timer.remainingTimeSeconds();
    var roundsFromStart = Math.floor(timeFromStart/app.locals.turnLengthInSeconds);
    var utilityWithDiscount = agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, roundsFromStart)
    var finalResult = {
      agreement: agreement,
      roundsFromStart:         roundsFromStart,
      utilityWithoutDiscount:  utilityWithoutDiscount,
      utilityWithDiscount:     utilityWithDiscount
    };
    game.mapRoleToFinalResult[session.query.role] = finalResult;
    message(socket, game, "Sign", session.query, finalResult);
  });

  // A user disconnected - closed the window, unplugged the chord, etc..
  socket.on('disconnect', function () {
    message(socket, game, "Disconnect", session.query, "");
    socket.leave(game.gameid);
    game.playerLeavesGame(session.query.userid, session.query.role);
  });
});



//
// Last things to do before exit:
//
 
process.on('exit', function (){
  logger.writeEventLog("events", "END", {port:app.get('port')});
  console.log('Goodbye!');
});
