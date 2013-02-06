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
	var socket = io.connect('/');  // the role is inserted to the RoomForNegoChat.jade template by the server.

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

	//###send
	// Send the input value to the server, recording our own message since `socket.io` 
	// wont re-broadcast the message back to the client who sent it. Clear the input
	// field out when we are finished so it is ready to send another
	function send() {
		var msg = $('#chatMessage').val();
		socket.emit('message', msg);
		$('#chatMessage').val('');
		if (msg==='bye') bye();
	};


	// At the beginning, all GUI elements are disabled: 
	$('#btnSendChat').attr('disabled','disabled');
	$('#chatMessage').attr('disabled','disabled');
	//$('select.issue').attr('disabled','disabled');
	//$('#btnOptOut').attr('disabled','disabled');
	
  	// This function is called when the server says that the game starts:
  	function enableGUI() { 
		$('#btnSendChat').removeAttr('disabled');
		$('#chatMessage').removeAttr('disabled');
		//$('select.issue').removeAttr('disabled');
		//$('#btnOptOut').removeAttr('disabled');
	}
	
	// Listen to a `click` event on the submit button to the message through:
	$('#btnSendChat').click(function() {
		send();
	});

	// Create a keystroke listener on the input element, since we are not sending a 
	// traditional form, it would be nice to send the message when we hit `enter`
	$('#chatMessage').keypress(function(event) {
		if (event.keyCode == 13)	send();
	});

	// When the user clicks the "sign agreement" button, send the current agreement to the server:
	$("#signAgreement").click(function() {
		var agreement = {};
		$("select.issue").each(function() {
			agreement[$(this).attr('title')] = $(this).val();
		});
		socket.emit('sign', agreement);
	});

	// Send all initial values to the server (this is relevant for form-values that are kept after refresh):
	$("select.issue").each(function() {
		socket.emit('change', {
			issue: $(this).attr('title'), 
			value: $(this).val()});
	});
	
	// Send any changed value to the server:
	$("select.issue").change(function() {
		socket.emit('change', {
			issue: $(this).attr('title'), 
			value: $(this).val()});
	});


	// When the user clicks on of the "show score" buttons - show the utility table in a dialog box:
	var utilityDiv = $("<div/>");
	var utilityOptions = { /* no options */ };
	var utilityPosition = {
		my: "left top",
		at: "right top",
		of: $("#mainStatusRow")};
	$("#btnUtility").click(function() {
		var utilityUrl = '/UtilityOfCurrent/'+role;
		// load the utility table to a hidden div:...
		utilityDiv.load(utilityUrl, function() {   
			// ... after it is loaded, make it a dialog and put it in the correct position:
			utilityDiv.dialog(utilityOptions).dialog('widget').position(utilityPosition); 
		}); 
	});
	$("#btnOppUtility").click(function() {
		var utilityUrl = '/UtilityOfPartner/'+role;
		utilityDiv.load(utilityUrl, function() { utilityDiv.dialog(utilityOptions).dialog('widget').position(utilityPosition); }); 
	});	
	

	$("#btnOptOut").click(function() {
		if (confirm("Are you sure you want to leave the negotiation without an agreement?")) {
			bye();
		}
	});	

	var partiesThatSigned = {};


 	// Socket.io listeners
	// --------------------
 
	// A new message has been received, the data comes through as a JSON object with 
	// two attributes, an `id` of the client who sent the message, as well as a `msg` 
	// with the actual text of the message, add it to the DOM message container
	socket.on('message', function (data) {
		var messageData = {			
			proposerClass: data.id + (data.you? " You": " Partner"),
			proposer: data.id + (data.you? " (You)": ""),
			action: data.action,
			bid: data.msg,
			util: "",
			//content: data.msg,
			answered: "no"
		};

		if (data.action=='Sign') {
			messageData.bid = "Signing the following agreement: "+JSON.stringify(data.msg.agreement);
			$("<div>Signed by "+messageData.proposer+"</div>").appendTo("#signatures");
			partiesThatSigned[messageData.proposer] = true;
			if (Object.keys(partiesThatSigned).length>=2)
				bye();
		}

		addDataToHistoryTable(messageData);			// in datatable.js
	});

	// The server asks to change a status variable, with key and value.
	// Change the html of the relevant DOM element:
	socket.on('status', function (keyvalue) {
		var pathToValue = "#"+keyvalue.key.replace(/[^a-z]/ig,"_")+" .value";
		var element = $(pathToValue);
		if (element) {
			element.html(keyvalue.value);
		} else {
			addDataToHistoryTable({
				proposerClass: 'Secretary',
				proposer: 'Secretary',
				action: 'Announcement',
				bid: keyvalue.key+" is now :"+keyvalue.value, 
				util: "", 
				content: "", 
				answered: "no"
			});
		}
		
		if (keyvalue.key=='phase' && keyvalue.value=='') // game started
			enableGUI();
	});

	// The server tells us what is our utility on the current agreement draft:
	socket.on('yourUtility', function (utility) {
		$("#utility").html(utility);
	});
	
	// The server tells us that there is agreement/disagreement on a certain issue:
	socket.on('issueAgreed', function (data) {
		var pathToIssue = "#"+data.issue.replace(/[^a-z]/ig,"_") + "_label";
		var element = $(pathToIssue);
		if (data.agreed) {
			element.css("color","green");
		} else {
			element.css("color","");
		}
		if (data.allAgreed) {
			$("#signAgreement").removeAttr('disabled');
		} else {
			$("#signAgreement").attr('disabled', 'disabled');
			$("#signatures").html(""); // all signatures are void
		}
	});
	
	// The server tells us to change the title of the window:
	socket.on('title', function (value) {
		var element = $('title').text(value);
	});
});
