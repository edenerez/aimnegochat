/**
 * Run all tests.
 * @note remember to add new tests to the list in this file!
 *
 * @author Erel Segal-Halevi
 * @since 2013-05
 */
 
var TESTS = [
	"afirsttest", 
	"preview",
	"beginner",
];

for (var i=0; i<TESTS.length; ++i) {
	console.log("\n== "+TESTS[i]+" ==");
	require("./"+TESTS[i]);
}
