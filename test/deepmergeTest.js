/**
 * unit-test to deep merge
 * 
 * @author Erel Segal
 * @since 2013-02
 */

var dm = require('../deepmerge');

require('should');


describe('deep merge unit', function() {
	it('merges objects', function() {
		dm.deepMerge ({insist: "Car"},{insist: "Salary"}).
		should.eql({insist: ["Salary","Car"]});

		var a = {offer: {issue1: 'value1'}, accept: true};
		var b = {offer: {issue2: 'value2'}, reject: false};
		dm.deepMerge(a,b).should.eql(
				{offer:{issue2:"value2",issue1:"value1"}, reject:false, accept:true});
	});
	
	it('merges arrays', function() {
		var a = {offer: {issue1: 'value1'}, accept: true};
		dm.deepMergeArray(a).should.eql(a);
		dm.deepMergeArray([a]).should.eql(a);
	});

	it('unmerges', function() {
		dm.unmerge({insist: ["Salary","Car"]}).
		should.eql([{insist: "Salary"},{insist: "Car"}]);

		dm.unmerge({offer:{issue2:"value2",issue1:"value1"}, reject:false, accept:true}).
		should.eql([ 
			{ offer: { issue2: 'value2' } },
			{ offer: { issue1: 'value1' } },
			{ reject: false },
			{ accept: true } ] );
	});
	
	it('joins with and', function() {
		dm.joinWithAnd(["x"]).should.equal("x");
		dm.joinWithAnd(["x","y"]).should.equal("x and y");
		dm.joinWithAnd(["x","y","z"]).should.equal("x, y and z");
		dm.joinWithAnd([]).should.equal("");
		dm.joinWithAnd(null).should.equal("");
	})
})
