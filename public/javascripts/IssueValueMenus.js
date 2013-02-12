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

	$("#btnOptOut").click(function() {
		if (confirm("Are you sure you want to leave the negotiation without an agreement?")) {
			bye();
		}
	});	
});
