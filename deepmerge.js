// deep merge of Javascript objects

/**
 * Merge "source" into "target". If fields have equal name, merge them recursively.
 * @return the merged object (target).
 */
exports.deepMerge = function (source, target) {
	//console.log("  deepMerge "+JSON.stringify(source)+" into "+JSON.stringify(target));
	for (var key in source) {
		var value = source[key];
		if (!target[key]) {
			// new value for "key":
			target[key] = value;
		} else {
			// existing value for "key" - recursively deep merge:
			if (typeof value == 'object') {
				target[key] = exports.deepMerge(value, target[key]);
			} else {
				target[key] = value; // new value overrides old value
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
exports.deepMergeArray = function(sources) {
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
	var a = {offer: {issue1: 'value1'}, accept: true};
	var b = {offer: {issue2: 'value2'}, reject: false};
	var expected = {"offer":{"issue2":"value2","issue1":"value1"},"reject":false,"accept":true}
	console.log(JSON.stringify(a)+ " + " + JSON.stringify(b)+" = "+JSON.stringify(exports.deepMerge(a,b)));
	
	var arr = [a];
	console.log(JSON.stringify(exports.deepMergeArray(a)));
	console.log(JSON.stringify(exports.deepMergeArray(arr)));
}
