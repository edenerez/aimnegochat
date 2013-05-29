/**
 * A test for negochat beginner mode (questionnaires)
 * @author Erel Segal-Halevi
 * @since 2013-05
 */

var assert = require("assert")
  , Browser = require("./zombiebrowser")
  , browser = new Browser()
  ;
browser.go("Start the game as a beginner", "negochat_JobCandidate/beginner", function () {
	browser.assertInnerText("h1", /Pre-negotiation questionnaire/);

	// Fill the demographic questionnaire:
	browser.
	select("item[gender]", "Male").
	select("item[age]", "31-40").
	select("item[education]", "PhD").
	fill("item[field]", "Computer Science").
	fill("item[birth_country]", "Israel").
	pressButton("Continue", function() {
		assert.ok(browser.success);
		browser.assertInnerText("h1", /Negotiation tutorial/);

		browser.clickTheLink("tutorial presentation", function() {
			browser.assertInnerText("title", /Chat.*Tutorial/);
			//browser.goBack(function() {  // doesn't work
			browser.go("Go back to answer the pre-questionnaire exam", "PreQuestionnaireExam", function() {
				browser.assertInnerText("h1", /Negotiation tutorial/);
				browser.
				select("question1", "correct").
				select("question2", "correct").
				select("question3", "correct").
				select("question4", "correct").
				pressButton("Continue", function() {
					assert.ok(browser.success);
					browser.assertInnerText("title", /Chat Room/);
					console.log("\tphase = "+browser.text("#phase .value"));
					browser.assertInnerText("#phase .value", /Status:/);
				});
			});
		});
	})
});
