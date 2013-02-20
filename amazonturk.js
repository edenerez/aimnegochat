// Some utility functions for Amazon Mechanical Turk.
// All functions get as input the "query" object, that may contain the fields:
// workerId, hitId, assignmentId, turkSubmitTo

exports.isPreview = function(query) {
    return (query.assignmentId=="ASSIGNMENT_ID_NOT_AVAILABLE");
};

exports.isLive = function(query) {
    var assignmentId = query.assignmentId;
    var workerId = query.workerId;
    var hitId = query.hitId;
    var turkSubmitTo = query.turkSubmitTo;
    return (assignmentId && workerId && hitId && turkSubmitTo);
};

// the value you should put in the "action" attribute of the form you submit:
exports.action = function(query) {  
    return query.turkSubmitTo+"/mturk/externalSubmit";
};

exports.printableStatus = function(query) {
    if (this.isPreview(query))
      return "AMT Preview Mode";
    else if (this.isLive(query))
      return "AMT Live Mode";
    else
      return "Not in AMT"
};
