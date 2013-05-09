// Translate text to semantic representation using a translation server:
var HOST=process.env.TRANSLATION_SERVER_HOST || "localhost";
var PORT=process.env.TRANSLATION_SERVER_PORT || 9995;
console.log("Looking for agent server at "+HOST+":"+PORT);


	
	
module.exports = AgentManager;
var nconf = require('nconf');
var entergameSemaphore = require('semaphore')(1);

function AgentManager(domain,gameServers){
	var NewKBAgent  = require('./agents/NewKBAgent');
	this.newkbagent = new NewKBAgent();
	this.newkbagent.initializeNewKBAgent(domain);

//newkbagent.initializeNewKBAgent(domains['Job']);

	this.domain = domain;
	this.gameServers = gameServers;
	this.gameServer;
	this.agentNum = 0;
	//console.log(gameServers);
	
}

AgentManager.prototype = {
	playGame: function(gametype, gameid, users){
		var gameServer = this.gameServers[gametype]
		this.newkbagent.role = gameServer.nextRole();
		console.log(this.newkbagent.role);
		//entergameSemaphore.take(function() {
			var game;
			if (gameid && gameServer.gameById(gameid)) { // gameid already exists - a watcher is entering an existing game, or a player is re-entering after disconnection
				console.log("--- gameid already set: "+gameid);
				game = gameServer.gameById(gameid);
			} else {
				console.log("--- Searching for "+gametype+" game with "+this.newkbagent.role+" played by agent");
				game = gameServer.gameWithUser('agent', this.newkbagent.role);
				if (!game) {
					console.log("--- Searching for "+gametype+" game waiting for "+this.newkbagent.role);
					game = gameServer.gameWaitingForRole(this.newkbagent.role);
				}
				gameid = game.gameid;
				console.log("--- Entered "+gametype+" game: "+gameid);
			}
			//users['agent'].gameid = gameid;
			game.playerEntersGame('agent' + this.agentNum++, this.newkbagent.role);
			//entergameSemaphore.leave();
		//});
		var actualAgents = {};
		actualAgents[this.newkbagent.role] = this.domain.agentOfRoleAndPersonality(this.newkbagent.role.toLowerCase(), 'short-term');
		this.gameServer = 
		gameServer.roomTemplateName,	{
				gametype: gametype, 
				role: this.newkbagent.role,
				agent: actualAgents[this.newkbagent.role],
				session_data: this.newkbagent,
				AMTStatus: JSON.stringify(this.newkbagent)};
	},

	connectGame: function(req,res){
		//this.newkbagent = require('./echoclient'); 
		/*this.newkbagent.on('connect', function () { 
			console.log("socket connected");

		});
		res.render(gameServer.roomTemplateName,{
				gametype: req.params.gametype, 
				role: req.session.data.role,
				agent: actualAgents[req.session.data.role],
				session_data: req.session.data,
				AMTStatus: JSON.stringify(req.session.data),
				next_action:'/PostQuestionnaireA'});
		*/
	}
	//
}
