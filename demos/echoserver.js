// Demo of socket.io server.
//
// First, run:
//    node echoserver.js
// Then, run
//    node echoclient.js

var PORT = 10001;

var io = require('socket.io').listen(PORT);

io.sockets.on('connection', function (socket) {
  socket.on('echo', function (data) {
    console.log("got request to echo "+data);
    socket.emit("echoes", data+" "+data);
  });
});
