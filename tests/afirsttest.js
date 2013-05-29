/**
 * A basic test of the site.
 * @author Erel Segal-Halevi
 * @since 2013-05
 */

var assert = require("assert")
  , Browser = require("./zombiebrowser")
  , browser = new Browser()
  ;
  
browser.go("Browse home page", "", function () {
	browser.assertInnerText("h1", /WELCOME!/);
});
