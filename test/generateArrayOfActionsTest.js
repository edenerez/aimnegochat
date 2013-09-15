/**
 * unit-test to translation.js
 * 
 * @author Erel Segal
 * @since 2013-02
 */

var should = require('should');

var translation = require('../translation');
var translator = new translation.Translator("unitest-translator");

var seedRandom = require('seed-random');
seedRandom(4, true);

describe('translator', function() {
	var requestObject = {
			classifierName: "Employer",
			source: "unit-test",
			remoteAddress: "127.0.0.1",
			randomSeed: 4,
			};

	var dataset0 = [
	          		{semantic: [], natural:""},
	          		{semantic: {}, natural:""},
	          		{semantic: null, natural:""},
	          		{semantic: undefined, natural:""},
	          		{semantic: "", natural:""},
	          	];

	dataset0.forEach(function(datum) {
		it('handles empty semantic actions', function(done) {
			translator.generate(datum.semantic, requestObject,
				function(semantic, translation) {
					translation.should.eql(datum.natural);
					done();
				});
		});
	});
	
	var dataset1 = [
	          		{semantic:[{"Accept":{Salary:20000}}], natural:"I agree to {\"Salary\":20000}"},
	          		{semantic:[{"ChangeIssue":"previous"}], natural:"But I must change our previous agreement"},
	          		{semantic:[{"Greet":true}], natural:"fine, how are you?"},
	          		{semantic:[{"Offer":{"Salary": "20,000 NIS"}}], natural:"I offer 20000"},
	          		{semantic:[{"Offer":{"Working Hours": "8 hours"}}], natural:"I offer 8 hours"},
	          		{semantic:[{"Offer":[{"Salary": "20,000 NIS"},{"Working Hours": "8 hours"}]}], natural:"I offer 20000 and offer with 8 hours"},
	          	];

	dataset1.forEach(function(datum) {
		it('generates text from an array with a single semantic action', function(done) {
			translator.generate(datum.semantic, requestObject,
				function(semantic, translation) {
					semantic.should.eql(datum.semantic);
					translation.should.eql(datum.natural);
					done();
				});
		});
	});

	var dataset2 = [
	          		{semantic:[{"Accept":{Salary:20000}}, {"StartNewIssue": "previous"}, {"Offer":{"Working Hours": "8 hours"}}], 
	          			natural:"Your offer {\"Salary\":20000} is acceptable. Now let's talk about the other issues. I offer 8 hours"},
	          		{semantic:[{"Accept":{Salary:20000}}, {"ChangeIssue":"previous"}, {"Offer":{"Working Hours": "8 hours"}}], 
	          			natural:"I accept your offer about {\"Salary\":20000}. But I must change our previous agreement. I offer 8 hours"},
	          		{semantic:[{"Offer":{"Salary": "20,000 NIS"}}, {"ChangeIssue":"previous"}, {"Offer":{"Working Hours": "8 hours"}}], 
	          			natural:"I offer 20000. But I must change our previous agreement. I offer 8 hours"},
	          		{semantic:[{"Reject":{Salary:20000}}, {"Offer":{"Salary": "7,000 NIS"}}], 
	          			natural:"I don't accept your offer about {\"Salary\":20000}. can you work for 7,000 IS?"},
	          	];

	dataset2.forEach(function(datum) {
		it('generates text from an array with a several semantic actions', function(done) {
			translator.generate(datum.semantic, requestObject,
				function(semantic, translation) {
					semantic.should.eql(datum.semantic);
					translation.should.eql(datum.natural);
					done();
				});
		});
	});
})
