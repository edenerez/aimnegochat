// This file is only used for demos and testing - not for release version

var fs     = require('fs')
  , path = require('path')
  , util = require('util')
  , jade = require('jade')
  , jsonref = require('json-ref')
  , io = require('socket.io-client')
  ;

socket = io.connect('localhost', {port: 9994});

socket.on('connect', function () { 
	console.log("socket connected"); 
});
socket.emit('private message', { user: 'me', msg: 'whazzzup?' });

