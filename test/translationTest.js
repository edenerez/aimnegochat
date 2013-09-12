/**
 * unit-test to translation.js
 * 
 * @author Erel Segal
 * @since 2013-02
 */

require('should');

var translation = require('../translation');
var translator = new translation.Translator("unitest-translator");



describe('translator', function() {
	var datasetT = [
	          		{natural:"I accept your offer" , semantic:[{"Accept":"previous"}]},
	          		{natural:"20000 NIS for 8 hours" , semantic:[{"Offer":{"Salary": "20,000 NIS"}},{"Offer":{"Working Hours": "8 hours"}}]},
	          	];

	datasetT.forEach(function(datum) {
		it('translates text to semantic actions', function(done) {
			translator.sendToTranslationServer({
				classifierName: "Employer", 
				text: datum.natural, 
				forward: true,
				source: "unit-test",
				remoteAddress: "127.0.0.1",
				}, 
				function(text, translations) {
					text.should.eql(datum.natural);
					translations.should.eql(datum.semantic.map(JSON.stringify));
					done();
				});
		});
	});

	var datasetG = [
	          		{semantic:[{"Accept":"previous"}], natural:["accept"]},
	          		{semantic:[{"Offer":{"Salary": "20,000 NIS"}},{"Offer":{"Working Hours": "8 hours"}}], natural:["I offer 20000","offer with 8 hours"]},
	          	];

	datasetG.forEach(function(datum) {
		it('generates text from array of semantic actions, with random seed', function(done) {
			translator.sendToTranslationServer({
				classifierName: "Employer", 
				text: datum.semantic.map(JSON.stringify), 
				forward: false,
				source: "unit-test",
				remoteAddress: "127.0.0.1",
				randomSeed: 4,
				}, 
				function(semantic, translations) {
					semantic.should.eql(datum.semantic.map(JSON.stringify));
					translations.should.eql(datum.natural);
					done();
				});
		});
	});


	datasetG.forEach(function(datum) {
		it('generates text from array of semantic actions, really at random', function(done) {
			translator.sendToTranslationServer({
				classifierName: "Employer", 
				text: datum.semantic.map(JSON.stringify), 
				forward: false,
				source: "unit-test",
				remoteAddress: "127.0.0.1",
				}, 
				function(semantic, translations) {
					semantic.should.eql(datum.semantic.map(JSON.stringify));
					translations.should.not.eql(datum.natural);
					done();
				});
		});
	});

	
	var datasetO = [
	          		{semantic: {}, natural:""},
	          		{semantic: null, natural:""},
	          		{semantic: undefined, natural:""},
	          		{semantic: "", natural:""},
	          		{semantic: {"Greet":true}, natural:"fine, how are you?"},
	          		{semantic: {"Reject":{"Salary": "20,000 NIS"}}, natural:"I cannot agree to {\"Salary\":\"20,000 NIS\"}"},
	          		{semantic: {"Accept":{"Salary": "20,000 NIS"}}, natural:"I agree to {\"Salary\":\"20,000 NIS\"}"},
	          		{semantic: {"Offer":[{"Salary": "20,000 NIS"},{"Working Hours": "8 hours"}]}, natural:"I offer 20000 and offer with 8 hours"},
	          		{semantic: {"Accept":{"Salary": "20,000 NIS"}, "Offer":{"Working Hours": "8 hours"}}, natural:"I agree to {\"Salary\":\"20,000 NIS\"}, but I offer 8 hours"},
	          		{semantic: {"Accept":{"Salary": "20,000 NIS"}, "Offer":{"Working Hours": "8 hours"}, "conjunction": "but"}, natural:"I agree to {\"Salary\":\"20,000 NIS\"}, but I offer 8 hours"},
	          		{semantic: {"Accept":{"Salary": "20,000 NIS"}, "Offer":{"Working Hours": "8 hours"}, "conjunction": "and"}, natural:"I agree to {\"Salary\":\"20,000 NIS\"}, and I offer 8 hours"},
	          		{semantic: {"Reject":{"Salary": "20,000 NIS"}, "Offer":{"Salary": "7,000 NIS"} }, natural:"I cannot agree to {\"Salary\":\"20,000 NIS\"}. can you work for 7,000 IS?"},
	          	];

	datasetO.forEach(function(datum) {
		it('generates text from object of semantic actions', function(done) {
			translator.generate(datum.semantic, {
				classifierName: "Employer", 
				source: "unit-test",
				remoteAddress: "127.0.0.1",
				randomSeed: 4,
				}, 
				function(semanticActions,naturalLanguageString) {
					//console.log("semanticActions="+JSON.stringify(semanticActions));
					//console.log("naturalLanguageString="+JSON.stringify(naturalLanguageString));
					if (datum.semantic) semanticActions.should.eql(datum.semantic);
					else semanticActions.should.eql({});
					naturalLanguageString.should.eql(datum.natural);
					done();
				});
		});
	});

	it('handles generations of null items', function(done) {
		translator.generate([], {
			classifierName: "Employer", 
			source: "unit-test",
			remoteAddress: "127.0.0.1",
			randomSeed: 4,
			}, 
			function(semanticActions,naturalLanguageString) {
				naturalLanguageString.should.eql("");
				done();
			});
	});
})
