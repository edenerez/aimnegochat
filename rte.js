/**
 * Classes related to the RTE dataset.
 * @author Erel Segal-Halevi
 * @since 2013-05
 */
 
var xml2js = require('xml2js')
	, fs		 = require('fs')
	, path = require('path')
	, util = require('util')
	, BiuteeClient = require('./te_client_biutee')
	, logger = require('./logger')
	;


//
// Domain
//

exports.RTE = function (pathToXmlFile, next) {
		var parser = new xml2js.Parser();
		parser.parseString(fs.readFileSync(pathToXmlFile), function (err, result) {
				this.pairs = result['entailment-corpus']['pair'];
				next();
		});
}


if (process.argv[1] === __filename) {
	console.log("start");
	//var pathToXmlFile = "/media/qa-srv/D/Data/Datasets/RTE/3/Dev/dev.xml";
	var pathToXmlFile = "/media/qa-srv/D/Data/Datasets/RTE/3/Test/test.xml";
	var parser = new xml2js.Parser();
	parser.parseString(fs.readFileSync(pathToXmlFile), function (err, result) {
		var pairs = result['entailment-corpus']['pair'];
		var biutee_client = new BiuteeClient("biutee_client");
		var iPair, text, hypo, decision, task;
		
		var entail_current_pair = function() {
			if (iPair>=pairs.length) {
				console.log("End of pairs!");
				return;
			}
			console.log("Entailing pair "+iPair+":");
			var pair = pairs[iPair];
			text = pair.t[0];
			hypo = pair.h[0];
			decision = pair.$.entailment;
			task = pair.$.task;
			biutee_client.bestProofs(text, hypo);
		};
		

		biutee_client.onConnect(function() {
			console.log("Entailing "+pairs.length+" pairs:");
			iPair = 0;
			entail_current_pair();			console.log("Decision proof for pair "+iPair+": "+decision);
			
		});

		biutee_client.onBestProofs(function(proofs) {
			console.log("Best proof for pair "+iPair+":");
			var proof = proofs[0];
			for (var iStep=0; iStep<proof.length; ++iStep) {
				var step = proof[iStep];
				console.log("\t"+step);
			}
			console.log("Decision proof for pair "+iPair+": "+decision);
			logger.writeJsonLog("proofs", {
				proof: JSON.parse(proof),
				decision: decision,
				task: task,
				index: iPair
			});

			iPair++;
			entail_current_pair();
		});

		//console.dir(this.pairs);
	});
}
