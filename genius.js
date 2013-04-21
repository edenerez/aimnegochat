// Genius classes


var xml2js = require('xml2js')
  , fs     = require('fs')
  , path = require('path')
  , util = require('util')
  ;


//
// Domain
//

exports.Domain = function (pathToXmlFile) {
    var parser = new xml2js.Parser();
    var utility_space = null;
    parser.parseString(fs.readFileSync(pathToXmlFile), function (err, result) {
        utility_space = result.negotiation_template.utility_space[0];
    });
    //this.utility_space = utility_space;
    
    // Initialize issues:
    this.issues = utility_space.objective[0].issue;

    // Initialize agents and their utility spaces:
    var agents = utility_space.agent;
    var agentsByOwnerAndPersonality = {};
    for (var i in agents) {
        var agent = agents[i].$  // utility_space, owner, personality;
        var path_to_utility_space = path.resolve(path.dirname(pathToXmlFile), agent.utility_space);
        //console.log(path_to_utility_space);
        agent.utility_space_object = new UtilitySpace(path_to_utility_space);
        if (!agentsByOwnerAndPersonality[agent.owner])
          agentsByOwnerAndPersonality[agent.owner] = {};
        agentsByOwnerAndPersonality[agent.owner][agent.personality] = agent;
    }
    
    this.agentsByOwnerAndPersonality = agentsByOwnerAndPersonality;    
}

exports.Domain.prototype.agentOfRoleAndPersonality = function(role, personality) {
    return this.agentsByOwnerAndPersonality[role][personality];
};

exports.Domain.prototype.agentsOfRole = function(role) {
    return this.agentsByOwnerAndPersonality[role];
};

exports.Domain.prototype.agentsOfOtherRole = function(role) {
    var agents = [];
    for (var otherRole in this.agentsByOwnerAndPersonality) {
        if (otherRole!=role) {
            var agentsObject = this.agentsByOwnerAndPersonality[otherRole];
            for (var i in agentsObject) 
                agents.push(agentsObject[i]);
        }
    }
    return agents;
};


//
// UtilitySpace
//

var UtilitySpace = function (pathToXmlFile) {
    var parser = new xml2js.Parser();
    var utility_space = null;
    parser.parseString(fs.readFileSync(pathToXmlFile), function (err, result) {
        utility_space = result.utility_space;
    });

    // Initialize simple parameters:
    this.reservation = utility_space.reservation[0].$.value;
    this.optout = utility_space.optout[0].$.value;
    this.timeeffect = utility_space.timeeffect[0].$.value;
    this.weightmultiplyer = utility_space.weightmultiplyer[0].$.value;

    // Initialize weights and issues:
    var weightByIndex = {};    
    var weights = utility_space.objective[0].weight;
    for (var i in weights) {
        var weightRaw = weights[i].$;
        weightByIndex[weightRaw.index] = weightRaw.value;
    }
    
    this.issueByIndex = {};    
    var issues = utility_space.objective[0].issue;
    for (i in issues) {
        var issueRaw = issues[i];
        var issue = issueRaw.$;
        issue.itemByIndex = {};
        issue.values = [];
        var items = issueRaw.item;
        for (var j in items) {
            var item = items[j].$;
            issue.itemByIndex[item.index] = item;
            issue.values.push(item.value);
        }
        issue.weight = weightByIndex[issue.index];
        this.issueByIndex[issue.index] = issue;
    }
}

UtilitySpace.prototype.getUtilityWithoutDiscount = function(bid) {
    var utility = 0;
    for (var iIssue in this.issueByIndex) {
       var issue = this.issueByIndex[iIssue];
       var valueInBid = bid[issue.name];
       for (iValue in issue.itemByIndex) {
           var value = issue.itemByIndex[iValue];
           if (valueInBid===value.value)
              utility += (value.evaluation * issue.weight * this.weightmultiplyer);
       }
    }
    return utility;
};

UtilitySpace.prototype.getUtilityWithDiscount = function(utility, roundsFromStart) {
    return utility + roundsFromStart * this.timeeffect;
}


if (process.argv[1] === __filename) {
  console.log("genius.js unitest start");
  
  var jade = require('jade')
    ;

  var domain = new exports.Domain(path.join(__dirname,'domains','JobCandiate','JobCanDomain.xml'));
  //console.dir(domain);
  var agent = domain.agentOfRoleAndPersonality('employer', 'compromise');
  //console.dir(agent);
  var utilitySpace = agent.utility_space_object;
  console.log("utility="+utilitySpace.getUtilityWithoutDiscount({Salary: '7,000 NIS', 'Job Description': 'QA'}));

  var otheragents = domain.agentsOfOtherRole('employer');

  var pathToJade = path.join(__dirname,"views","GeniusUtilityOfCurrent.jade");
  var fn = jade.compile(fs.readFileSync(pathToJade), {pretty:true, filename:pathToJade});
  //console.log(fn({agent: agent, turnLengthInSeconds: 10, AMTStatus: '-', sprintf: require('sprintf').sprintf, format:"%1.0f"}));

  var pathToJade = path.join(__dirname,"views","GeniusUtilityOfPartner.jade");
  var fn = jade.compile(fs.readFileSync(pathToJade), {pretty:true, filename:pathToJade});
  //console.log(fn({agents: otheragents, turnLengthInSeconds: 10, AMTStatus: '-', sprintf: require('sprintf').sprintf, format:"%1.0f"}));

  var pathToJade = path.join(__dirname,"views","GeniusIssuesAndValues.jade");
  var fn = jade.compile(fs.readFileSync(pathToJade), {pretty:true, filename:pathToJade});
  console.log(fn({agent: agent}));

  //console.log(util.inspect(domain,true,1000,true));
  console.log("genius.js unitest end");
}
