// Client side support for the issue-value menus and opt-out button used in negotiation
var isFirstChange = true;
$(function() {
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
		if(isFirstChange){
			alert("REMEMBER: the other player DOES NOT know what you do in the menus\nYou must write whatever you want to offer in the chat");
			isFirstChange = false;
		}
	});


	// The server tells us what is our utility on the current agreement draft:
	socket.on('yourUtility', function (utility) {
		$("#utility").html(utility);
	});

	
	socket.on('yourOptOutUtility', function (utility) {
			if (iClicketOptOut){
				if (confirm("Are you sure you want to leave the negotiation? Your utility will be " + utility)) {
					socket.emit("opt-out", false);
					bye();
				}
			}
			else{
				alert("Your partner opted-out, we are sorry for you. Your utility is " + utility);
				socket.emit("opt-out", true);
				bye();
			}
	});
	var iClicketOptOut = false;

	$("#btnOptOut").click(function() {
		iClicketOptOut = true;
		socket.emit("giveMeMyOptOutUtility")
	});	

	socket.on("yourPartnerOpt-out", function (){
		iClicketOptOut = false;
		socket.emit("giveMeMyOptOutUtility");
	});

	socket.on('yourReservationUtility', function (utility) {
		alert("Time out, we are sorry for you. Your utility is " + utility);
		bye();

	});

	socket.on("EndGame", function(){
		socket.emit("giveMeMyReservationUtility");
	});

	/*function enableGUI() { 
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
	});*/
});
