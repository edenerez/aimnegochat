var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = FinalResult;


function FinalResult(FinalResultModel) {
  this.FinalResultModel = FinalResultModel;
  this.check = false;
}

FinalResult.prototype = {

  addFinalResult: function(results, userid, role, gameid, country) {
    var self = this; 

    var item = new Object();
    for (result in results){
      if(result !== 'agreement')
        item[result] = results[result].toString();
    }
    item.role = role;
    item.RowKey = userid;
    item.PartitionKey = gameid;
    item.country = country;
    console.log(item);
    self.FinalResultModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },
  
  
  listAll: function(req, res, types,country) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.FinalResultModel.tableName);
    self.FinalResultModel.find(query, function itemsFound(err, items) {
      res.render('finalResultsData',{title: 'Final Result List', FinalResultList: items, gametype: req.params.gametype, gametypes: types, country:country});
    });
  },

  activeFinalResult: function(endTime) {
    var self = this;
    var item = new Object();
    item.RowKey = self.RowKey;
    item.PartitionKey = self.PartitionKey;
    
    self.FinalResultModel.updateItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
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
    self.FinalResultModel.deleteItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/'+gametype+'/listAllFinalResults');
    });
  }

}