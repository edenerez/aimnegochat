// Demo of socket.io client.
// It connects to echoserver.js.
//
// First, run:
//    node echoserver.js
// Then, run
//    node echoclient.js

var HOST = "localhost";
var SETTINGS = {
	port: 10001, 
	'force new connection': true, 
	'sync disconnect on unload': true
};

var socketioclient = require('socket.io-client');
var socket1 = socketioclient.connect(HOST, SETTINGS); 
var socket2 = socketioclient.connect(HOST, SETTINGS);

socket1.on('connect', function () { 
	console.log("socket1 connected!");
});

socket2.on('connect', function () { 
	console.log("socket2 connected!");
});

socket1.on('echoes', function (result) { 
	console.log("socket1 received: "+result);
});

socket2.on('echoes', function (result) { 
	console.log("socket2 received: "+result);
});

socket1.emit('echo', "aaa");
socket2.emit('echo', "bbb");
