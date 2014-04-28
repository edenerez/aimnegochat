function validateForm(){
	if  (document.getElementById("gender").value == ""){
		document.getElementById("sideMassage").innerHTML = "You must insert your gender.";
		return false;
	}
	if  (document.getElementById("age").value == ""){
		document.getElementById("sideMassage").innerHTML = "You must insert your age.";
		return false;
	}
	if  (document.getElementById("education").value == ""){
		document.getElementById("sideMassage").innerHTML = "You must insert your education.";
		return false;
	}
	if  (document.getElementById("field").value == ""){
		document.getElementById("field").value = "don't have";
	}
	if  (document.getElementById("birth").value == ""){
		document.getElementById("sideMassage").innerHTML = "You must insert your country of birth.";
		return false;
	}
	if  (document.getElementById("name").value == ""){
		document.getElementById("sideMassage").innerHTML = "You must insert your name.";
		return false;
	}
	if(document.getElementById("country").value == "israel"){
		if  (document.getElementById("id").value == ""){
			document.getElementById("sideMassage").innerHTML = "You must insert your ID.";
			return false;
		}
		if  (document.getElementById("university").value == ""){
			document.getElementById("sideMassage").innerHTML = "You must insert your university.";
			return false;
		}
		if  (!document.getElementById("confirm").checked){
			document.getElementById("sideMassage").innerHTML = "You must accept the IRB form.";
			return false;
		}
		return document.getElementById("confirm").checked;
	}
	else
		return true;
}

function ValidateRequiredFields(){
	if  (document.getElementById("happy").value == ""){
		document.getElementById("happy").value = "null";
	}
	if  (document.getElementById("instructions").value == ""){
		document.getElementById("instructions").value = "null";
	}
	if  (document.getElementById("fairness").value == ""){
		document.getElementById("fairness").value = "null";
	}
	if  (document.getElementById("computer_program").value == ""){
		document.getElementById("computer_program").value = "null";
	}
	if  (document.getElementById("feedback").value == ""){
		document.getElementById("feedback").value = "null";
	}
	else
		return true;

}

