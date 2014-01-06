
function canIplay(workers){
	var workers = (document.getElementById("workers").value).split(",");

	if (!document.getElementById("workerid").value){
		
	}
	else{
		var workerid = document.getElementById("workerid").value;
		var excist = false;
		for(worker in workers){
			if(workers[worker] == workerid)
				excist = true;
		}
		if(excist){
			document.getElementById("cannotPlay").style.display = "block";
			document.getElementById("canPlay").style.display = "none";
		}
		else{
			document.getElementById("canPlay").style.display = "block";
			document.getElementById("cannotPlay").style.display = "none";

		}
	}
}


var days, hours, minutes, seconds;

var target_time = new Date(); // for now
target_time.setMinutes(target_time.getMinutes()+5);
target_time = target_time.getTime();
//minutes = target_time.getMinutes(); // =>  30
//seconds = target_time.getSeconds();
var refreshIntervalId  = setInterval(function () {
	var countdown = document.getElementById("value");
    curr_time = new Date().getTime();
    var seconds_left = (target_time - curr_time) / 1000;
    days = parseInt(seconds_left / 86400);
	seconds_left = seconds_left % 86400;
	 
	hours = parseInt(seconds_left / 3600);
	seconds_left = seconds_left % 3600;
	  
	minutes = parseInt(seconds_left / 60);
	seconds = parseInt(seconds_left % 60);
	if(minutes == 0 && seconds == 0){
		countdown.innerHTML =  minutes + "m, " + seconds + "s";
		document.getElementById("message").innerHTML = "We are sorry, no one shows up. Please opt-out.";
		clearInterval(refreshIntervalId);
	}
	else
		countdown.innerHTML =  minutes + "m, " + seconds + "s";
		
}, 1000);

