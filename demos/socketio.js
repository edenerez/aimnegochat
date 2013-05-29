/**
 * A demo for socketio client and server.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, url = require('url')
	, fs = require('fs')
	, util = require('util')
	;

var app = express();
app.set('port', process.env.PORT || 4002);

// adapted from http://socket.io/ (client)
app.get('/', function(req,res) {
	res.end(
	"<html>\n"+
	"	<body>\n"+
	"	<h1>SocketIO demo</h1>\n"+
	"	<p><a href='https://github.com/rothariel/aimnegochat/blob/master/demos/socketio.js'>Source code</a></p>\n"+
	"	<p id='status'>Connecting...</p>\n"+
	"		<script src='/socket.io/socket.io.js'></script>\n"+
	"		<script>\n"+
	"		var socket = io.connect();\n"+
	"		socket.on('news', function (data) {\n"+
	"			console.log(data);\n"+
	"			document.getElementById('status').innerHTML=('The server says: '+data);\n"+
	"			socket.emit('my other event', 'Hello, server!');\n"+
	"		});\n"+
	"		</script>\n"+
	"	</body>\n"+
	"</html>\n"
	);
});


var httpserver = http.createServer(app);
httpserver.listen(app.get('port'));
var io = require('socket.io').listen(httpserver);

// adapted from http://socket.io/  (server)
io.sockets.on('connection', function (socket) {
	socket.emit('news', "Hello, client!");
		socket.on('my other event', function (data) {
		console.log("The client says: "+data);
	});
});

console.log("Listening on port "+app.get('port'));
