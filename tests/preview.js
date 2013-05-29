/**
 * A test of the AMT prview page.
 * @author Erel Segal-Halevi
 * @since 2013-05
 */

var assert = require("assert")
  , Browser = require("./zombiebrowser")
  , browser = new Browser()
  ;

browser.go("Browse AMT preview page", "negochat_JobCandidate/beginner?assignmentId=ASSIGNMENT_ID_NOT_AVAILABLE", function () {
	browser.assertInnerText("#previewNoteRow", /PLEASE NOTE/);
});
