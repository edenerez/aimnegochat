// Demo of socket.io client.
var HOST = "localhost";
var PORT = 10000;

var socketioclient = require('socket.io-client');
var socket1 = socketioclient.connect(HOST, {port: PORT}); 
var socket2 = socketioclient.connect(HOST, {port: PORT});

socket1.on('connect', function () { 
	console.log("socket1 connected!");
});

socket2.on('connect', function () { 
	console.log("socket2 connected!");
});

socket1.on('echo', function (result) { 
	console.log("socket1 received: "+result);
});

socket2.on('echo', function (result) { 
	console.log("socket2 received: "+result);
});

socket1.emit('echo', "aaa");
socket2.emit('echo', "bbb");
