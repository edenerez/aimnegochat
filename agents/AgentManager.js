// This is a manager for negotiation agents.
// It creates agents that connect, as socket.io clients, to our negotiation server. 

var socketio_client = require('socket.io-client');
var socketio_host = "localhost";
var socketio_settings = {
	port: 4000, 
	'force new connection': true, 
	'sync disconnect on unload': true
};

var EchoAgent = require('./EchoAgent');


/**
 * Create a new EchoAgent, and connect it to the given gametype in the given role.
 */
function launchNewEchoAgent(gametype, role) {
	var socket = socketio_client.connect(socketio_host, socketio_settings);
	var agent = new EchoAgent.Agent(socket);
	socket.emit("start_session", {
		userid: agent.userid,
		gametype: gametype,
		role: role
		});
}

launchNewEchoAgent("negomenus_Neighbours", "Alex");
