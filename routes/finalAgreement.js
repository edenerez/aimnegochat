var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = FinalAgreement;


function FinalAgreement(FinalAgreementModel) {
  this.FinalAgreementModel = FinalAgreementModel;
  this.check = false;
}

FinalAgreement.prototype = {

  addFinalAgreement: function(issue, val, gameid) {
    var self = this; 

    var item = new Object();
    item.RowKey = uuid(); //this is the name of the issue.
    item.issue = issue;
    item.value = val;
    this.check = true;
    item.PartitionKey = gameid;
    console.log(item);
    self.FinalAgreementModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },
  
  
  listAll: function(req, res, types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.FinalAgreementModel.tableName);
    self.FinalAgreementModel.find(query, function itemsFound(err, items) {
      res.render('FinalAgreementsData',{title: 'Final Agreement List', FinalAgreementList: items, gametype: req.params.gametype, gametypes: types});
    });
  }
}