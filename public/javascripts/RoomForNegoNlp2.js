// Client side support for the RoomForNegoChat.jade template
// -------------------

// This file contains all of the relevant client side code to communicate through 
// `socket.io` to the server, and in turn all other connected clients

// Wait for the DOM to load before taking action
$(function() {
	if (session_data) {              // the session data is inserted to the layout.jade template by the server.
		socket.emit('start_session', session_data);
		role = session_data.role;
	} else {
		role = 'Unknown';
	}

	setUpHistoryTable(null);	// in datatable.js

	//###send
	// Send the input value to the server, recording our own message since `socket.io` 
	// wont re-broadcast the message back to the client who sent it. Clear the input
	// field out when we are finished so it is ready to send another
	var sendMessage = function() {
		var msg = $('#chatMessage').val();
		socket.emit('English', msg);
		$('#chatMessage').val('');
		if (msg==='bye') bye();
	};
	// Listen to a `click` event on the submit button to the message through:
	$('#btnSendChat').click(function() {
		sendMessage();
	});

	// Create a keystroke listener on the input element, since we are not sending a 
	// traditional form, it would be nice to send the message when we hit `enter`
	$('#chatMessage').keypress(function(event) {
		if (event.keyCode == 13)	sendMessage();
	});


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

	// When the user clicks the "sign agreement" button, send the current agreement to the server:
	$("#signAgreement").click(function() {
		var agreement = {};
		$("select.issue").each(function() {
			agreement[$(this).attr('title')] = $(this).val();
		});
		socket.emit('sign', agreement);
	});
	var partiesThatSigned = {};
	
	socket.on('status', function (keyvalue) {
		if (keyvalue.key=='phase' && keyvalue.value=='') // game started
			enableGUI();
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

	socket.on('yourUtilityFromPartnerOffer', function (data) {
		setTimeout(function() {
			addDataToHistoryTable({			
				proposerClass: "Game",
				proposer: "Game",
				action: "Note",
				util: data,
				bid: "(If you accept this offer, your score will be: "+data+")",
				answered: "no"
			});
		}, 500);
	});
		
	socket.on('sign', function (data) {
		var proposer = data.id + (data.you? " (You)": "");
		$("<div>Signed by "+proposer+"</div>").appendTo("#signatures");
		partiesThatSigned[proposer] = true;
		if (data.you)
				alert("Your final score is " + data.score);
		if (Object.keys(partiesThatSigned).length>=2){
			bye();
		}
			
		addDataToHistoryTable({			
			proposerClass: data.id + (data.you? " You": " Partner"),
			proposer: proposer,
			action: "Sign",
			util: "",
			bid: "Signing the following agreement: "+JSON.stringify(data.agreement),
			answered: "no"
		});
	});
});
