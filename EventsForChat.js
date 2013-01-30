exports.add = function(socket, game, session, io, message, messageLog) {
  // A user sent a chat message - just send this message to all other users:
  socket.on('message', function (data) {
    message(socket, game, "Message", session.query, data);
  });
}
