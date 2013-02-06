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
    messageLog(socket, game, "Change", session_data, data);
    game.playerChangesValue(session_data.role, data.issue, data.value);
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

  // A user finished playing (e.g. by clicking a "finish" button):
  socket.on('sign', function (agreement) {
    var utilityWithoutDiscount = Math.round(agent.utility_space_object.getUtilityWithoutDiscount(agreement));
    var timeFromStart = game.timer? game.timer.timeFromStartSeconds(): 0;
    var roundsFromStart = Math.floor(timeFromStart / applocals.turnLengthInSeconds);
    var utilityWithDiscount = Math.round(agent.utility_space_object.getUtilityWithDiscount(utilityWithoutDiscount, roundsFromStart))
    var finalResult = {
      agreement: agreement,
      timeFromStart:           timeFromStart,
      roundsFromStart:         roundsFromStart,
      utilityWithoutDiscount:  utilityWithoutDiscount,
      utilityWithDiscount:     utilityWithDiscount
    };
    //messageLog(socket, game, "Sign", session_data, finalResult);
    game.mapRoleToFinalResult[session_data.role] = finalResult;
    message(socket, game, "Sign", session_data, finalResult);
  });
}
