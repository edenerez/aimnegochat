exports.initializeEventHandlers = function(socket, game, session_data, io, functions) {

	var agent = functions.getActualAgent(session_data.domain, session_data.role, session_data.personality);
	if (agent)
		var allIssues = agent.utility_space_object.issueByIndex;

	// A user sent a chat message - just send this message to all other users:
	socket.on('message', function (data) {
		functions.message(socket, game, "Message", session_data, data);
	});

	// A player sent an offer:
	socket.on('offer', function (bid) {
		socket.broadcast.to(game.gameid).emit('offer', bid);       // forward the offer to the other player
		var bidAsString = JSON.stringify(bid);
		functions.message(socket, game, "Offer", session_data, bidAsString);  // send ALL players a textual description of the offer 
	});

	// A player accepted an offer:
	socket.on('accept', function (bid) {
		functions.message(socket, game, "Accept", session_data, JSON.stringify(bid));
		socket.broadcast.to(game.gameid).emit('accept', bid);
	});
	
	// A player accepted an offer:
	socket.on('reject', function (bid) {
		functions.message(socket, game, "Reject", session_data, JSON.stringify(bid));
		socket.broadcast.to(game.gameid).emit('reject', bid);
	});
	
	
	// A user changed the value for one of his issues:
	socket.on('change', function (data) {
		var changed = game.playerChangesValue(session_data.role, data.issue, data.value);
		if (!changed) return;

		functions.messageLog(socket, game, "Change", session_data, data);
		var currentIssueAgreed = game.arePlayerValuesEqual(data.issue);
		var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
		io.sockets.in(game.gameid).emit('issueAgreed', {issue: data.issue, agreed: currentIssueAgreed, allAgreed: allIssuesAgreed});
		agreement = game.valuesOfPlayer(session_data.role);

		// calculate new utility for the player:
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var roundsFromStart = Math.floor(timeFromStart / applocals.turnLengthInSeconds);
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, roundsFromStart))
		socket.emit('yourUtility', utilityWithDiscount);
	});
}
