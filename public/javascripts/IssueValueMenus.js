// Client side support for the issue-value menus and opt-out button used in negotiation
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

	
});
