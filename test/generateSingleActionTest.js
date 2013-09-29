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

var requestObject = {
		classifierName: "Employer",
		source: "unit-test",
		remoteAddress: "127.0.0.1",
		forward: false,
		randomSeed: 4,
		};

describe('translator', function() {
	var dataset0 = [
	          		{semantic: []},
	          		{semantic: {}},
	          		{semantic: null},
	          		{semantic: undefined},
	          		{semantic: ""},
	          	];

	dataset0.forEach(function(datum) {
		it.only('handles empty semantic actions', function(done) {
			translator.generateSingleAction(requestObject, datum.semantic, 
				function(semantic, translation) {
					translation.should.match(/error/i);
					done();
				});
		});
	});
	
	var datasetG = [
	          		{semantic:{"Accept":{Salary:20000}}, natural:"I accept your offer about {\"Salary\":20000}"},
	          		{semantic:{"ChangeIssue":"previous"}, natural:"But I must change our previous agreement"},
	          		{semantic:{"Greet":true}, natural:"fine, how are you?"},
	          		{semantic:{"Offer":{"Salary": "20,000 NIS"}}, natural:"I offer 20000"},
	          		{semantic:{"Offer":{"Working Hours": "8 hours"}}, natural:"I offer 8 hours"},
	          		{semantic:{"Offer":[{"Salary": "20,000 NIS"},{"Working Hours": "8 hours"}]}, natural:"I offer 20000 and offer with 8 hours"},
	          	];

	datasetG.forEach(function(datum) {
		it('generates text from an array of semantic actions', function(done) {
			translator.generateSingleAction(requestObject, datum.semantic, 
				function(error, translation) {
					should.not.exist(error);
					translation.should.eql(datum.natural);
					done();
				});
		});
	});

})
