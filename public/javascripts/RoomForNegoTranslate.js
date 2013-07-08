// Client side support for the RoomForNegoTranslate.jade template

/**
 * Connect to translationSocket.io, and add the common listeners:
 */
function commonConnect() {
	var server = "http://irsrv2.cs.biu.ac.il:9995";
	console.info("CLIENT: connecting to "+server);
	var translationSocket = io.connect(server);
	translationSocket.on('connect', function() {
		console.info("CLIENT: connected to "+server);
	});
	translationSocket.on('disconnect', function() {
		console.info("CLIENT: disconnected from "+server);
	});
	translationSocket.on('error', function(data) {
		console.error(loggingMessageToString(data));
	});
	translationSocket.on('fatal', function(data) {
		console.error("SERVER: fatal error: "+JSON.stringify(data));
	});
	translationSocket.on('exception', function(throwableObject) {
		console.error(throwableObject);
	});
	return translationSocket;
}

function translationToHtml(translation, withDelete) {
	return "<tr>" +
			(withDelete? "<td>"+"<a class='delete' title='Delete this translation' />"+"</td>": "")+
			"<td class='translation'>"+translation+"</td>"+
		"</tr>\n";
}

/** Convert the translations received from the server to HTML */
function translationsToHtml(translations, withDelete) {
	if (translations==null)
		return "null";
	if (translations.length==0)
		return "no translations";
	var html = "";
	for (i=0; i<translations.length; ++i)
		html += translationToHtml(translations[i],withDelete);
	return "<table id='translationsTable'>\n"+html+"</table>\n";
}

function setOptionsFromArray(idOfSelectElement, arrayOfOptions, titleForDefaultOption) {
	var selectElement = $(document.getElementById(idOfSelectElement));
	selectElement.html("");
	if (titleForDefaultOption) {
		selectElement.append($('<option>', { value : "" })
				.text(titleForDefaultOption));
	}
	$.each(arrayOfOptions, function(key, value) {
		selectElement.append($('<option>', { value : value })
				.text(value));
	});
}


var translationSocket=null, deeplog=null;
$(document).ready(function() {
	translationSocket = commonConnect();

	translationSocket.on('connect', function() {
		translationSocket.emit("register_as_private_translator");
	});

	var classesToAdd = null;
	translationSocket.on('classes', function(classes) {
		classesToAdd = classes;
	});

	translationSocket.on('translation', function(translations) {
		console.log("CLIENT: got a translation: "+JSON.stringify(translations));
		$("#translationsDiv").html(
			"<p>This is what the computer understands from what you said. Please correct or approve:</p>"+
			translationsToHtml(translations.translations, /*withdelete=*/true)+
			"<div><select id='classToAdd'></select></div>"+
			"<button onClick='approve(); return false;'>approve</button>"
		);
		if (classesToAdd) {
			setOptionsFromArray(
				/*idOfContainingElement=*/"classToAdd", 
				/*arrayOfOptions=*/classesToAdd,
				/*titleForDefaultOption=*/"-- Add class --");
			$("select#classToAdd").change(function() {
				var translation = $(this).val();
				if (translation.length<1) return;
				$("#translationsTable").append(translationToHtml(translation, /*withDelete=*/true));
				translationSocket.emit('append_translation', {
					text: $('#chatMessage').val(),
					translation_to_add: translation,
				});	
			});
		}
			
	});

	$("#translationsDiv").on("click", "a.delete", function() {
			var translationElement = $(this).parent().next();
			var translation = translationElement.text();
			translationElement.toggleClass('deleted');
			$("#acknowledgement").html("");
			if (translationElement.hasClass('deleted')) {
				translationSocket.emit("delete_translation", {
					text: $('#chatMessage').val(), 
					translation_to_delete: translation
				});
			} else {
				translationSocket.emit("append_translation", {
					text: $('#chatMessage').val(), 
					translation_to_add: translation
				});
			}
	});
	
	// change the sendMessage function (defined in RoomForNegoChat) so that 
	// it sends the message to our private translator:
	var sendMessage = function() {
		var msg = $('#chatMessage').val();
		//translationSocket.emit('English', msg);
		var request = {
			text: msg,
			forward: true,
			explain: 0,
		};
		translationSocket.emit('translate', request);
		console.log("CLIENT: sent a request to translate: "+JSON.stringify(request));
	};

	// Listen to a `click` event on the submit button to the message through:
	$('#btnSendChat').unbind();
	$('#btnSendChat').click(function() {
		sendMessage();
	});

	// Create a keystroke listener on the input element, since we are not sending a 
	// traditional form, it would be nice to send the message when we hit `enter`
	$('#chatMessage').unbind();
	$('#chatMessage').keypress(function(event) {
		if (event.keyCode == 13)	sendMessage();
	});
});


/** Tell the server that the current translation is approved */
function approve() {
	var msg = $('#chatMessage').val();
	var translations = $(".translation").not(".deleted").map(function() { return $(this).text(); }).get();
	var request = {
		text: msg,
		translations: translations,
	};
	translationSocket.emit('approve', request);
	socket.emit("approveTranslations", request);
	$("#translationsDiv").html("");
	$('#chatMessage').val('');
}

