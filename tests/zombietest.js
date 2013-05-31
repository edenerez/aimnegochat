/**
 * A basic test of the zombie system.
 * @author Erel Segal-Halevi
 * @since 2013-05
 */

var Browser = require("zombie")
  , browser = new Browser();

browser.visit("about:blank", function() {
	console.log("blank loaded!");

	browser.visit("http://www.google.com", function() {
		console.log("google loaded!");
	});
});

