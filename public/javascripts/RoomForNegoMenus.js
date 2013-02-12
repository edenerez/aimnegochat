// Client side support for the RoomForNegoChat.jade template
// -------------------

// This file contains all of the relevant client side code to communicate through 
// `socket.io` to the server, and in turn all other connected clients

// Wait for the DOM to load before taking action
$(function() {
	// Setup
	// -----
	// Create the socket connection object, as well as the references to our DOM 
	// handlers for input and recording output
	// {'connect timeout': 1000}
	var role = null;

	if (session_data) {              // the session data is inserted to the layout.jade template by the server.
		socket.emit('start_session', session_data);
		role = session_data.role;
	} else {
		role = 'Unknown';
	}

	setUpHistoryTable(null);	// in datatable.js

	function bye() {  // go to the next screen
		window.location = $("form#nextAction").attr("action");
	}

	// When the user clicks the "sign agreement" button, send the current agreement to the server:
	$("#sendOffer").click(function() {
		var agreement = {};
		$("select.issue").each(function() {
			agreement[$(this).attr('title')] = $(this).val();
		});
		socket.emit('offer', agreement);
	});
	
	
	socket.on('offer', function (data) {
	});
	
});
