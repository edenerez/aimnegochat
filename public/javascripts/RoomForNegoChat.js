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
    var socket = io.connect('/')
      , chatMessage = $('#chatMessage')
      , btnSendChat = $('#btnSendChat')
      , role = $("#role").html();
      
    setUpHistoryTable(null);  // in datatable.js

    function bye() {
         window.location = $("form#nextAction").attr("action");
    }

    //###send
    // Send the input value to the server, recording our own message since `socket.io` 
    // wont re-broadcast the message back to the client who sent it. Clear the input
    // field out when we are finished so it is ready to send another
    var send = function() {
        var msg = chatMessage.val();
        socket.emit('message', msg);
        chatMessage.val('');
        if (msg==='bye') bye();
    };


    // User interaction
    // ----------------
    
    //###keypress listener
    // Create a keystroke listener on the input element, since we are not sending a 
    // traditional form, it would be nice to send the message when we hit `enter`
    chatMessage.keypress(function(event) {
        if (event.keyCode == 13)  send();
    });

    //###click listener
    // Listen to a `click` event on the submit button to the message through
    btnSendChat.click(function() {
        send();
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

    $("#signAgreement").click(function() {
        var agreement = {};
        $("select.issue").each(function() {
            agreement[$(this).attr('title')] = $(this).val();
        });
        socket.emit('sign', agreement);
        //bye();
    });
    

    //var utilityPosition = $("#mainStatusRow").position();
    //utilityPosition = [utilityPosition.top, utilityPosition.left]; 
    //alert(utilityPosition);
    var utilityDiv = $("<div/>");
    var utilityOptions = {
    };
    var utilityPosition = {
      my: "left top",
      at: "right top",
      of: $("#mainStatusRow")};
    $("#btnUtility").click(function() {
    	var utilityUrl = '/UtilityOfCurrent/'+role;
		//window.open(utilityUrl,'my_utility', 'left=50,top=50,toolbar=no,location=no,status=no,directories=no,dependent=yes,menubar=no, width=400,height=600,scrollbars=yes');
		// http://stackoverflow.com/questions/14565310/create-a-window-that-always-remains-on/14565487#14565487
    	utilityDiv.load(utilityUrl, function() { utilityDiv.dialog(utilityOptions).dialog('widget').position(utilityPosition); }); 
    });
		
    $("#btnOppUtility").click(function() {
    	var utilityUrl = '/UtilityOfPartner/'+role;
		//window.open(utilityUrl,'opp_utility', 'left=50,top=50,toolbar=no,location=no,status=no,directories=no,dependent=yes,menubar=no, width=400,height=600,scrollbars=yes');
    	utilityDiv.load(utilityUrl, function() { utilityDiv.dialog(utilityOptions).dialog('widget').position(utilityPosition); }); 
	});  
    


    // Socket.io listeners
    // --------------------
    
    var partiesThatSigned = {};
 
    //###message
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

        addDataToHistoryTable(messageData);            // in datatable.js
        if (!data.you) {  // another player connects - enable chat buttons
          $('#btnSendChat').removeAttr('disabled');
          $('#chatMessage').removeAttr('disabled');
        }
    });
    
    //###status
    // The server asks to change a status variable, with key and value
    // Change the html of the relevant DOM element
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
    
    socket.on('yourUtility', function (utility) {
      $("#utility").html(utility);
    });
    
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

    socket.on('signed', function(signatureData) {
    signatureData
    });
    
    socket.on('title', function (value) {
        var element = $('title').text(value);
    });
});
