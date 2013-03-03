exports.add = function(socket, game, session_data, io, message, messageLog, applocals) {

	var agent = applocals.actualAgents[session_data.role];
	if (agent)
		var allIssues = agent.utility_space_object.issueByIndex;

	// A user sent a chat message - just send this message to all other users:
	socket.on('message', function (data) {
		message(socket, game, "Message", session_data, data);
	});

	
	// A user changed the value for one of his issues:
	socket.on('change', function (data) {
		var changed = game.playerChangesValue(session_data.role, data.issue, data.value);
		if (!changed) return;

		messageLog(socket, game, "Change", session_data, data);
		var currentIssueAgreed = game.arePlayerValuesEqual(data.issue);
		var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
		io.sockets.in(game.gameid).emit('issueAgreed', {issue: data.issue, agreed: currentIssueAgreed, allAgreed: allIssuesAgreed});
		agreement = game.valuesOfPlayer(session_data.role);

		// calculate new utility for the player:
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		socket.emit('yourUtility', utilityWithDiscount);
	});

	// A user finished playing (e.g. by clicking a "finish" button):
	socket.on('sign', function (agreement) {
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		var finalResult = {
			agreement: agreement,
			
			timeFromStart:					 timeFromStart,
			turnsFromStart:					turnsFromStart,
			utilityWithoutDiscount:	utilityWithoutDiscount,
			utilityWithDiscount:		 utilityWithDiscount
		};
		//messageLog(socket, game, "Sign", session_data, finalResult);
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		messageLog(socket, game, "Sign", session_data, finalResult);
		socket.emit('message', {action: "Sign", id: session_data.role, msg: "Signing the following agreement: "+JSON.stringify(agreement), you: true});
		socket.broadcast.to(game.gameid).emit('message', {action: "Sign", id: session_data.role, msg: "Signing the following agreement: "+JSON.stringify(agreement), you: false});
		socket.emit('sign', {id: session_data.role, you: true});
		socket.broadcast.to(game.gameid).emit('sign', {id: session_data.role, you: false});
	});
}
