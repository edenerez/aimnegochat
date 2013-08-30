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

/**
 * Convert a single JSON object to an array of simpler objects, each with a single action-key-value.
 * @param mergedObject
 * @return an array of simple objects.
 */
var unmerge = exports.unmerge = function(mergedObject, targetArray) {
	if (mergedObject instanceof Array)
		return mergedObject;
	if (!targetArray) targetArray=[];
	for (var key in mergedObject) {
		var value = mergedObject[key];
		if (value instanceof Object || value instanceof Array) {
			var valueAsArray = unmerge(value);
			for (var i=0; i<valueAsArray.length; ++i) {
				var simpleObject = {};
				simpleObject[key] = valueAsArray[i];
				targetArray.push(simpleObject)
			}
		} else {
			var simpleObject = {};
			simpleObject[key]=value;
			targetArray.push(simpleObject);
		}
	}
	return targetArray;
}



/**
 * Join an array, with commas between most elements, and "and" before the last element.
 */
var joinWithAnd = exports.joinWithAnd = function (array, defaultObject) {
	return (
			array.length>1? 
					array.slice(0,array.length-1).join(", ")+" and "+array[array.length-1]:
			array.length==1?
					array[0]:
					JSON.stringify(defaultObject)
			);
}
