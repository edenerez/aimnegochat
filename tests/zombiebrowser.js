/**
 * A library for testing the negochat site.
 * Uses environment variable TESTBASE = the base of the tested site (i.e. "http://localhost:4000")
 * @author Erel Segal-Halevi
 * @since 2013-05
 */


var Browser = require("zombie");
Browser.debug = true;

var testbase = process.env.TESTBASE;
if (!testbase) {
	console.log("The test uses environment variable TESTBASE, that should contain base of the tested site (i.e. 'http://localhost:4000' or 'http://user:password@localhost:4000)");
	process.exit(1);
}
console.log("Test base: "+testbase);

/**
 * Go to the given relative_url, relative to TESTBASE. 
 * Assert that it loads OK.
 * Then call the given callback.
 */
Browser.prototype.go = function(description, relative_url, callback) {
	var url = testbase+"/"+relative_url;
	var browser = this;
	console.log(description+" ("+url+")");
	browser.visit(url, function() {
		if (!browser.success)
			throw new Error("Cannot open url: "+url);
		callback();
	});
}

/**
 * Click the link with the given text. 
 * Assert that it loads OK.
 * Then call the given callback.
 */
Browser.prototype.clickTheLink = function(linkText, callback) {
	var browser = this;
	console.log("Click the link '"+linkText+"'");
	browser.clickLink(linkText, function() {
		if (!browser.success)
			throw new Error("Cannot click link: "+browser.location);
		console.log("\t(Got at "+browser.location+")");
		callback();
	});
}

/**
 * Go back to the previous location. 
 * Assert that it loads OK.
 * Then call the given callback.
 */
Browser.prototype.goBack = function(callback) {
	var browser = this;
	console.log("Go back");
	browser.back(function() {
		if (!browser.success)
			throw new Error("Cannot go back: "+browser.location);
		console.log("\t(Got at "+browser.location+")");
		callback();
	});
}

/**
 * Assert that the given element (given by JQuery-like elementDescriptor) matches the given regexp.
 */
Browser.prototype.assertInnerText = function(elementDescriptor, regexp) {
	var innerText = this.text(elementDescriptor);
	if (!regexp.test(innerText)) {
		throw new Error("Contents of "+elementDescriptor+" don't match "+regexp+" (actual contents: '"+innerText+"')");
	}
}

module.exports = Browser;
