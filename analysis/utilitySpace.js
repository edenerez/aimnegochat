

module.exports = UtilitySpace;

function UtilitySpace(issues) {
  this.issues = issues.issueByIndex;
  this.weightmultiplyer = issues.weightmultiplyer;
}

UtilitySpace.prototype = {

  getUtility: function(bid){
    
    var utility = 0;

    var issueNum = 0;
    for (is in this.issues) if (this.issues.hasOwnProperty(is)) issueNum++;
    for (var i=0; i< issueNum; i++){
      var issue = this.issues[i+1];
      if ((issue.index -1) != i){
        i = issue.Index;
        return 0;
      }
      var valueInBid = bid[i]
      var Index = 1;
      for(item in issue.values) {
          if(issue.values[item] == valueInBid)
              break;
          Index++;
      }
      var valueInEvaluator = issue.itemByIndex[Index].evaluation;
      utility += (issue.weight * valueInEvaluator * this.weightmultiplyer)
      
    }
    return utility;
  },
 
}