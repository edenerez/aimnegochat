
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

