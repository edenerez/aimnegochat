// Connects to socket.io, and defines handlers for events common to all games:

var socket = io.connect('/');

function bidToString(bid) {
	var result='';
	for (var issue in bid) {
		var value = bid[issue];
		if (value)
			result += issue+"="+value+"; ";
	}
	return result;
}
 
// A new message has been received, the data comes through as a JSON object with 
// two attributes, an `id` of the client who sent the message, as well as a `msg` 
// with the actual text of the message, add it to the DOM message container
socket.on('message', function (data) {
		var messageData = {			
			proposerClass: data.id + (data.you? " You": " Partner"),
			proposer: data.id + (data.you? " (You)": ""),
			action: data.action,
			util: "",
			bid: data.msg,
			//content: data.msg,
			answered: "no"
		};
		addDataToHistoryTable(messageData);			// in datatable.js
});


// The server tells us to change the title of the window:
socket.on('title', function (value) {
	var element = $('title').text(value);
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
});
	