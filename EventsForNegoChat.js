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
			//console.dir()
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

	var onNegoActions = function (actions, announce, text) {
		if (!actions && session_data.gametype != "negochatWithAgent_JobCandidate") {
			misunderstanding("I didn't understand what you mean because the actions list is empty");
			return;
		}

		var mergedAction = deepmerge.deepMergeArray(actions);
		socket.broadcast.to(game.gameid).emit('negoactions', mergedAction); // pass the merged action to the other player

		if (announce) {
			if (translator) {  // use NLG to generate a nice-looking announcement:
				translator.generate(actions, {
					classifierName: session_data.role+"-"+session_data.country, 
					country:session_data.country, 
					agentType: session_data.agentType,
					numAction: game.actionNum,
					source: session_data.gametype,
					accountName: functions.accountName,
					gameid: game.gameid,
					remoteAddress: session_data.remoteAddress,
					},
					function(semanticActions,naturalLanguageString) {
						console.log("\tonTranslation: generate("+JSON.stringify(semanticActions)+") = "+naturalLanguageString);
						functions.announcement(socket, game, "Message", session_data, naturalLanguageString);
						if ("Offer" in mergedAction) // Send the score to the human (Ido's suggestion):
							socket.broadcast.to(game.gameid).emit('yourUtilityFromPartnerOffer', utilityForOpponent(mergedAction.Offer));
					});
			} else { // no translator - just send JSON to the clients 
				functions.announcement(socket, game, "Message", session_data, mergedAction); // send ALL players a textual description of the action
				if ("Offer" in mergedAction) // Send the score to the human (Ido's suggestion):
					socket.broadcast.to(game.gameid).emit('yourUtilityFromPartnerOffer', utilityForOpponent(mergedAction.Offer));
			}
		} else { // this is a translation - write it to the log:
			var translateData = {};
			translateData.translate = actions;
			translateData.text = text;
			functions.messageLog(socket, game, "Translation", session_data, translateData);
			//functions.messageLog(socket, game, "CorrectTranslation", session_data, "");
		}
	};

	// An agent or a human menu-player sent a list of negotiation actions:
	socket.on('negoactions', function(actions) {
		onNegoActions(actions, true);
	});

	// A player sent an informative message - just send it to all other users
	socket.on('Connect', function (text) {
	});

	// A player sent an informative message - just send it to all other users
	socket.on('message', function (text) {
		functions.announcement(socket, game, "Message", session_data, text);
	});

	// A human chat-player sent an English chat message - send it to all other users, and translate to semantics:
	socket.on('English', function (text) {
		functions.announcement(socket, game, "Message", session_data, text);
		if (translator) {
			translator.translate(text, {
				classifierName: session_data.role+"-"+session_data.country, 
				country:session_data.country, 
				agentType: session_data.agentType,
				numAction: game.actionNum,
				source: session_data.gametype,
				accountName: functions.accountName,
				gameid: game.gameid,
				remoteAddress: session_data.remoteAddress,
				}, 
				onTranslation);
		}
	});

	var onTranslation = function(text, translations) {
			console.log("\tonTranslation: translate("+JSON.stringify(text)+") = "+JSON.stringify(translations));
			if (!translations || translations.length==0) {
				console.log(session_data.gametype);
				if(session_data.gametype != "negochatWithAgent_JobCandidate")
					misunderstanding("I didn't understand your message: '"+text+"'. Please say this in other words");
				functions.messageLog(socket, game, "Translation", session_data, "");
				//functions.messageLog(socket, game, "CorrectTranslation", session_data, "");
				return;
			}
			try {
				var actions = translations.map(JSON.parse);
			} catch (err) {
				var message = "The translation server sent '"+JSON.stringify(translations)+"', which is not valid JSON.";
				console.error("Error: "+message+" The error message is: ");
				console.dir(err);
				misunderstanding(message);
				return;
			}
			onNegoActions(actions, false, text);
	}

	// The human manually approved the translations of the translator . Relevant for the negotranslate game only.
	socket.on('approveTranslations', function(request) {
		onTranslation(request.text, request.translations);
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

		//console.dir(game.mapRoleToMapIssueToValue);

		// calculate new utility for the player:
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		socket.emit('yourUtility', utilityWithDiscount);
	});

	socket.on('enterAgentBidToMapRoleToMapIssueToValue', function (data) {
		for (issue in data.bid){
			//functions.messageLog(socket, game, "Change", session_data, {issue: issue, value:data.bid[issue]});
			game.playerChangesValue(data.role, issue, data.bid[issue]);
			var currentIssueAgreed = game.arePlayerValuesEqual(issue);
			var allIssuesAgreed = game.arePlayerValuesToAllIssuesEqual(allIssues);
			io.sockets.in(game.gameid).emit('issueAgreed', {issue: issue, agreed: currentIssueAgreed, allAgreed: allIssuesAgreed});
		}
		//console.dir(game.mapRoleToMapIssueToValue);
	});

	// A player finished playing (e.g. by clicking a "finish" button):
	socket.on('sign', function (agreement) {
		if (!agent){
			return;
		} 
		var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
		var finalResult = {
			agreement: agreement,
			endedIn: 						"agreement",
			timeFromStart:					timeFromStart,
			turnsFromStart:					turnsFromStart,
			utilityWithoutDiscount:			utilityWithoutDiscount,
			utilityWithDiscount:			utilityWithDiscount
		};
		game.endedIn = "agreement";
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		session_data.mapRoleToFinalResult = finalResult;
		//finalResultTable.addFinalResult(session_data);
		functions.messageLog(socket, game, "Sign", session_data, finalResult);
		socket.emit('sign', {id: session_data.role, agreement: agreement, you: true , score: utilityWithDiscount});
		socket.broadcast.to(game.gameid).emit('sign', {id: session_data.role, agreement: agreement, you: false, score: utilityWithDiscount});
	});
	

	socket.on("giveMeMyOptOutUtility", function (){
		if (!agent){
			return;
		} 
		var utilityOptOut = agent.utility_space_object.optout;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityOptOut, turnsFromStart));
		
		socket.emit("yourOptOutUtility", utilityWithDiscount);
	});

	socket.on("giveMeMyReservationUtility", function (){
		if (!agent){
			return;
		} 
		var utilityReservation = agent.utility_space_object.reservation;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityReservation, turnsFromStart));
		var finalResult = {
			endedIn : 						"timeOut",
			timeFromStart:					timeFromStart,
			turnsFromStart:					turnsFromStart,
			utilityWithoutDiscount:			utilityReservation,
			utilityWithDiscount:			utilityWithDiscount
		};
		game.endedIn = "timeOut";
		game.mapRoleToFinalResult[session_data.role] = finalResult;
		session_data.mapRoleToFinalResult = finalResult;
		functions.messageLog(socket, game, "TimeOut", session_data, "");
		socket.emit("yourReservationUtility", utilityWithDiscount);
	});


	socket.on("opt-out", function (partnerInitiative){ //this value is false when the player click optout and true when the partner forced the player optout. 
		if (!agent){
			return;
		} 
		var utilityOptOut = agent.utility_space_object.optout;
		var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
		var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
		var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityOptOut, turnsFromStart));

		if (!partnerInitiative){
			var finalResult = {
				endedIn: 						"optoutByMe",
				timeFromStart:					timeFromStart,
				turnsFromStart:					turnsFromStart,
				utilityWithoutDiscount:			utilityOptOut,
				utilityWithDiscount:		 	utilityWithDiscount
			};
			game.endedIn = "Opt-out"
			functions.messageLog(socket, game, "Opt-out", session_data, finalResult);
			game.mapRoleToFinalResult[session_data.role] = finalResult;
			session_data.mapRoleToFinalResult = finalResult;
			//tell all other players in this game that their partner optout.
			socket.broadcast.to(game.gameid).emit('yourPartnerOpt-out', "");
			console.log("Shalom");
			console.log("Shalom");
			console.log("Shalom");
			console.log("Shalom");
		}
		else{
			var finalResult = {
				endedIn: 						"optoutByOpponent",
				timeFromStart:					timeFromStart,
				turnsFromStart:					turnsFromStart,
				utilityWithoutDiscount:			utilityOptOut,
				utilityWithDiscount:		 	utilityWithDiscount
			};
			game.endedIn = "Opt-out";
			functions.messageLog(socket, game, "Opt-out", session_data, finalResult);
			game.mapRoleToFinalResult[session_data.role] = finalResult;
			session_data.mapRoleToFinalResult = finalResult;
			console.log("Shalom2");
			console.log("Shalom2");
			console.log("Shalom2");
			console.log("Shalom2");
		}
		//game.mapRoleToFinalResult[session_data.role] = finalResult;
		//session_data.mapRoleToFinalResult = finalResult;
		//functions.messageLog(socket, game, "Opt-out", session_data, finalResult);
	});
	
	
	/**
	 * calculate the utility of my offer to the opponent - FOR INFORMATION TO THE OPPONENT ONLY (Ido's suggestion)
	 * (the sender/agent is not allowed to know this information!)
	 */
	var utilityForOpponent = function(agreement) {
					var opponentRole;
					for (role in functions.rols){
						if (role !== session_data.role)
							opponentRole = role;
					}
					try {
						oppAgent = functions.getActualAgent(session_data.domain, opponentRole, session_data.personality);
					} catch (error) {
						console.error("\n\nERROR: Cannot initialize agent!");
						console.dir(error);
					// TODO: send error message to the client.
					}
	
					// calculate new utility for the player:
					var utilityWithoutDiscount = Math.round(oppAgent.utility_space_object.getUtilityWithoutDiscount(agreement));
					var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
					var turnsFromStart = game.turnsFromStart? game.turnsFromStart: 0;
					var utilityWithDiscount = Math.round(oppAgent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, turnsFromStart))
					console.log("----- Utility of "+oppAgent.owner+": "+utilityWithDiscount);
					socket.broadcast.to(game.gameid).emit('yourUtilityFromPartnerOffer', utilityWithDiscount);
	}
	
}



