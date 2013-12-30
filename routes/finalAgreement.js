var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = FinalAgreement;


function FinalAgreement(FinalAgreementModel) {
  this.FinalAgreementModel = FinalAgreementModel;
  this.check = false;
}

FinalAgreement.prototype = {

  addFinalAgreement: function(issue, val, gameid,country) {
    var self = this; 

    var item = new Object();
    item.RowKey = uuid(); //this is the name of the issue.
    item.issue = issue;
    item.value = val;
    this.check = true;
    item.PartitionKey = gameid;
    item.country = country;
    console.log(item);
    self.FinalAgreementModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },
  
  
  listAll: function(req, res, types,country) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.FinalAgreementModel.tableName);
    self.FinalAgreementModel.find(query, function itemsFound(err, items) {
      res.render('FinalAgreementsData',{title: 'Final Agreement List', FinalAgreementList: items, gametype: req.params.gametype, gametypes: types,country:country});
    });
  },

  deleteItem: function(req,res){
    var self = this;
    var gametype = req.params.gametype;
    var partition = req.params.PartitionKey;
    var row = req.params.RowKey;
    var item = {};
    item.PartitionKey = partition;
    item.RowKey = row;
    self.FinalAgreementModel.deleteItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/'+gametype+'/listAllFinalAgreements');
    });
  }
}