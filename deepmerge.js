/**
 * deep merge of Javascript objects
 * 
 * @author Erel Segal
 * @since 2013-02
 */

/**
 * Merge "source" into "target". If fields have equal name, merge them recursively.
 * @return the merged object (target).
 */
var deepMerge = exports.deepMerge = function (source, target) {
	//console.log("  deepMerge "+JSON.stringify(source)+" into "+JSON.stringify(target));
	for (var key in source) {
		var value = source[key];
		if (!(key in target)) {
			// new value for "key":
			target[key] = value;
		} else {
			// existing value for "key" - recursively deep merge:
			if (value instanceof Object) {
				deepMerge(value, target[key]);
			} else if (value instanceof Array && target[key] instanceof Array) {
				target[key] = target[key].concat(value);
			} else if (target[key] instanceof Array) {
				target[key].push(value);
			} else if (value instanceof Array) {
				var first = target[key];
				target[key] = value;
				target[key].push(first);
			} else {
				target[key] = [target[key], value]; // create an array from old and new values
			}
		}
	}
	return target;
}

/**
 * Merge all sources into a single JSON object. If fields have equal name, merge them recursively.
 * @param sources
 * @return the merged object.
 */
var deepMergeArray = exports.deepMergeArray = function(sources) {
	if (!Array.isArray(sources))
		return sources; // nothing to merge
	var merged = {};
	for (var i=0; i<sources.length; ++i) 
		merged = exports.deepMerge(sources[i], merged);
	return merged;
}



//
// UNITEST
//

if (process.argv[1] === __filename) {
	require('should');
	
	deepMerge ({insist: "Car"},{insist: "Salary"}).
	should.eql({insist: ["Salary","Car"]});

	var a = {offer: {issue1: 'value1'}, accept: true};
	var b = {offer: {issue2: 'value2'}, reject: false};
	deepMerge(a,b).should.eql(
		{offer:{issue2:"value2",issue1:"value1"}, reject:false, accept:true});

	deepMergeArray(a).should.eql(a);
	deepMergeArray([a]).should.eql(a);
}
