var deepmerge = require('./deepmerge');
var translation = require('./translation');

exports.initializeEventHandlers = function(socket, game, session_data, io, finalResultTable, functions) {
	var translator;
	if (game.hasTranslator)
		translator = new translation.Translator("translator-of-"+session_data.role);

	var agent = null, allIssues = null;
	if (!session_data.domain) {
		console.error("\n\nERROR: Undefined domain!");
		console.dir(session_data);
	} else if (!session_data.personality) {
		console.error("\n\nERROR: Undefined personality!");
		console.dir(session_data);
	} else if (!session_data.role) {
		console.error("\n\nERROR: Undefined role!");
		console.dir(session_data);
	} else {
		try {
			agent = functions.getActualAgent(session_data.domain, session_data.role, session_data.personality);
		} catch (error) {
			console.error("\n\nERROR: Cannot initialize agent!");
			console.dir(error);
		// TODO: send error message to the client.
		}
	}
	if (agent)
		allIssues = agent.utility_space_object.issueByIndex;

	var misunderstanding = function(message) {
		socket.emit('announcement', {action: "Misunderstanding", id: "Translator", you: false, msg: message});
	}

	var onNegoActions = function (actions, announce) {
		if (!actions) {
			misunderstanding("I didn't understand what you mean because the actions list is empty");
			return;
		}
		var mergedAction = deepmerge.deepMergeArray(actions);

		socket.broadcast.to(game.gameid).emit('negoactions', mergedAction); // forward the offer to the other player
		if (announce) {
			for (var key in mergedAction) {
				functions.announcement(socket, game, key, session_data, mergedAction[key]); // send ALL players a textual description of the offer
			}
		}
	};

	// An agent or a human menu-player sent a list of negotiation actions:
	socket.on('negoactions', function(actions) {
		console.log("negoactions: "+JSON.stringify(actions));
		onNegoActions(actions, true);
	});

	// A player sent an informative message - just send it to all other users
	socket.on('Connect', function (text) {
		console.log("!!!!!!!! I CAN SEND THE AGENT FROM HERE!!!!!!!!!");
	});

	// A player sent an informative message - just send it to all other users
	socket.on('message', function (text) {
		functions.announcement(socket, game, "Message", session_data, text);
	});

	// A human chat-player sent an English chat message - send it to all other users, and translate to semantics:
	socket.on('English', function (text) {
		functions.announcement(socket, game, "Message", session_data, text);
		if (translator) translator.sendToTranslationServer(text, /*forward=*/true);
	});


	// The translator returned the semantic translation of the human's chat message
	if (translator) translator.onTranslation(function(text,translations) {
		//console.log("TranslationServer serving "+JSON.stringify(session_data));
		if (!translations || translations.length==0) {
			misunderstanding("I didn't understand your message: '"+text+"'. Please say this in other words");
			return;
		}
		var actions = [];
		for (var i=0; i<translations.length; ++i) {
			try {
				var action = JSON.parse(translations[i]);
				actions.push(action);
			} catch (ex) {
				console.log("Illegal json string '"+translations[i]+"'");
				console.dir(ex);
			}
		}
		onNegoActions(actions, false);
	});


	
	// A player changed the value for one of his issues:
	socket.on('change', function (data) {
		var changed = game.playerChangesValue(session_data.role, data.issue, data.value);
		if (!changed) return;

		functions.messageLog(socket, game, "Change", session_data, data);
		var currentIssueAgreed = game.arePlayerValuesEqual(data.issue);
		var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
		io.sockets.in(game.gameid).emit('issueAgreed', {issue: data.issue, agreed: currentIssueAgreed, allAgreed: allIssuesAgreed});
		agreement = game.valuesOfPlayer(session_data.role);

		console.dir(game.mapRoleToMapIssueToValue);

		// calculate new utility for the player:
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		socket.emit('yourUtility', utilityWithDiscount);
	});

	socket.on('enterAgentBidToMapRoleToMapIssueToValue', function (data) {
		console.log (" THIS IS THE PLACE THE BID OF THE AGENT GET IN!!!!");
		for (issue in data.bid){
			console.log (game.playerChangesValue(data.role, issue, data.bid[issue]));
			functions.messageLog(socket, game, "Change", session_data, {issue: issue, value:data.bid[issue]});
			var currentIssueAgreed = game.arePlayerValuesEqual(issue);
			var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
			io.sockets.in(game.gameid).emit('issueAgreed', {issue: issue, agreed: currentIssueAgreed, allAgreed: false});
		}
		console.dir(game.mapRoleToMapIssueToValue);
	});

	// A player finished playing (e.g. by clicking a "finish" button):
	socket.on('sign', function (agreement) {
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		var finalResult = {
			agreement: agreement,
			endedIn: "agreement",
			timeFromStart:					timeFromStart,
			turnsFromStart:					turnsFromStart,
			utilityWithoutDiscount:			utilityWithoutDiscount,
			utilityWithDiscount:			utilityWithDiscount
		};
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		session_data.mapRoleToFinalResult = finalResult;
		//finalResultTable.addFinalResult(session_data);
		functions.messageLog(socket, game, "Sign", session_data, finalResult);
		socket.emit('sign', {id: session_data.role, agreement: agreement, you: true});
		socket.broadcast.to(game.gameid).emit('sign', {id: session_data.role, agreement: agreement, you: false});
	});
	

	socket.on("giveMeMyOptOutUtility", function (){
		var utilityOptOut = agent.utility_space_object.optout;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityOptOut, turnsFromStart));
		socket.emit("yourOptOutUtility", utilityWithDiscount);
	});

	socket.on("giveMeMyReservationUtility", function (){
		var utilityReservation = agent.utility_space_object.reservation;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityReservation, turnsFromStart));
		var finalResult = {
			endedIn: "timeOut",
			timeFromStart:					timeFromStart,
			turnsFromStart:					turnsFromStart,
			utilityWithoutDiscount:			utilityReservation,
			utilityWithDiscount:			utilityWithDiscount
		};
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		session_data.mapRoleToFinalResult = finalResult;
		functions.messageLog(socket, game, "TimeOut", session_data, "");
		socket.emit("yourReservationUtility", utilityWithDiscount);
	});


	socket.on("opt-out", function (partnerInitiative){ //this value is false when the player click optout and true when the partner forced the player optout.  
		var utilityOptOut = agent.utility_space_object.optout;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityOptOut, turnsFromStart));
		if (!partnerInitiative){
			var finalResult = {
				endedIn: "optoutByMe",

				timeFromStart:					timeFromStart,
				turnsFromStart:					turnsFromStart,
				utilityWithoutDiscount:			utilityOptOut,
				utilityWithDiscount:		 	utilityWithDiscount
			};
		}
		else{
			var finalResult = {
				endedIn: "optoutByOpponent",
				timeFromStart:					timeFromStart,
				turnsFromStart:					turnsFromStart,
				utilityWithoutDiscount:			utilityOptOut,
				utilityWithDiscount:		 	utilityWithDiscount
			};
		}
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		session_data.mapRoleToFinalResult = finalResult;
		functions.messageLog(socket, game, "Opt-out", session_data, "");
		if (!partnerInitiative){//tell all other players in this game that their partner optout.
			socket.broadcast.to(game.gameid).emit('yourPartnerOpt-out', "");
		}
	});
	


}
