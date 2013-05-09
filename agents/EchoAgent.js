// This is a sample negotiation agent for the "negomenus" game.
// It always echoes the offer made to it by the partner. 
//

/**
 * Initialize a new agent. 
 * @param socket - a socket.io client that this agent will use to connect to the negotiation server.
 */
exports.Agent = function(socket, gametype, role) {
	var userid = this.userid = "EchoAgent" + new Date().toISOString();

	socket.on('connect', function () { 
		console.log("Hi, I am "+userid+", and I just connected to the negotiation server!");
	});

	socket.on('status', function (status) { 
		console.log("The status changed: "+JSON.stringify(status));
	});

	socket.on('EndTurn', function (turn) { 
		console.log("A turn has ended: "+turn);
	});

	socket.on('announcement', function (announcement) { 
		console.log("Something happened: "+JSON.stringify(announcement));
	});

	socket.on('negoactions', function (actions) { 
		console.log("The partner did these negotiation actions: "+JSON.stringify(actions)+". I will do the same!");
		socket.emit('negoactions', actions);
	});
}
