exports.initializeEventHandlers = function(socket, game, session_data, io, finalResultTable, functions) {
  // A user sent a chat message - just send this message to all other users:
  socket.on('message', function (data) {
    functions.announcement(socket, game, "Message", session_data, data);
  });
}
