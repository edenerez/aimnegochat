

module.exports = NewKBAgent;
var Analysis = require('../analysis/analysis');
var UtilitySpace = require('../analysis/utilitySpace');
var logger = require('../logger')

function NewKBAgent() {
  var initBids = new Object();
  //this.num = 0;
}

NewKBAgent.prototype = {

  initializeNewKBAgent: function (domain){
    var num = 0;

    var canUtilityShort = new UtilitySpace(domain.agentsByOwnerAndPersonality.candidate['short-term'].utility_space_object);
    var empUtilityShort = new UtilitySpace(domain.agentsByOwnerAndPersonality.employer['short-term'].utility_space_object);
    var canUtilityComp = new UtilitySpace(domain.agentsByOwnerAndPersonality.candidate['comp-romise'].utility_space_object);
    var empUtilityComp = new UtilitySpace(domain.agentsByOwnerAndPersonality.candidate['comp-romise'].utility_space_object);
    var canUtilityLong = new UtilitySpace(domain.agentsByOwnerAndPersonality.candidate['long-term'].utility_space_object);
    var empUtilityLong = new UtilitySpace(domain.agentsByOwnerAndPersonality.candidate['long-term'].utility_space_object);

    var items = new Array(domain.issues.length);   
    for (var i = 0; i < domain.issues.length; i++) {
      var a = domain.issues[i].$.name;
      items[i] = [];
      items[i]["name"] = a;
      items[i]["value"] = [];
      
      for ( var j = 0; j < domain.issues[i].item.length; j++) {

        items[i]["value"][j] = domain.issues[i].item[j].$.value;
      }
    };
    analysis = new Analysis(items);
    var sumUtilEmployer = 0;
    var sunUtilCandidat = 0;
    var a = analysis.hasNext();
    //console.log(a);
    var b = analysis.makeNextIndex();
    //console.log(b);
    var bids = new Object();
    while (analysis.hasNext()){
      var bid = analysis.next();
      bid.utilEmployer = Math.round(empUtilityShort.getUtility(bid));
      sumUtilEmployer += bid.utilEmployer;
      bid.utilCandidat = Math.round(canUtilityShort.getUtility(bid));
      sunUtilCandidat += bid.utilCandidat;
      bid.utilEmployerC = Math.round(empUtilityComp.getUtility(bid));
      bid.utilCandidatC = Math.round(canUtilityComp.getUtility(bid));
      bid.utilEmployerL = Math.round(empUtilityLong.getUtility(bid));
      bid.utilCandidatL = Math.round(canUtilityLong.getUtility(bid));

      num++;
      bids[num] = bid;
      //console.log(bid);
    }
    for (bid in bids){
      bids[bid].LuceEmployer = bids[bid].utilEmployer / sumUtilEmployer;
      bids[bid].LuceCandidat = bids[bid].utilCandidat / sunUtilCandidat; 
      //var b = (JSON.stringify(bids[bid])).replace(",", ":").replace("\"","\o");

      //logger.writeJsonLog('bidsAndUtilities', b);
      //console.log(bids[bid]);
    }
    this.initBids = bids;
    console.log(sumUtilEmployer);
    console.log(sunUtilCandidat);
    //console.log(this.num);
    //console.log(items);
    //console.log(items[1].value.length);
 
  },

  listAllInitData: function(req,res,gameServers){
    res.render('initData',{title: 'Init Data List', initList: this.initBids ,gametype: req.params.gametype,  gametypes: Object.keys(gameServers)});
  }
}