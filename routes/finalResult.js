var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = FinalResult;


function FinalResult(FinalResultModel) {
  this.FinalResultModel = FinalResultModel;
  this.check = false;
}

FinalResult.prototype = {

  addFinalResult: function(results, userid, role, gameid) {
    var self = this; 

    var item = new Object();
    for (result in results){
      if(result !== 'agreement')
        item[result] = results[result].toString();
    }
    item.role = role;
    item.RowKey = userid;
    item.PartitionKey = gameid;
    console.log(item);
    self.FinalResultModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },
  
  
  listAll: function(req, res, types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.FinalResultModel.tableName);
    self.FinalResultModel.find(query, function itemsFound(err, items) {
      res.render('finalResultsData',{title: 'Final Result List', FinalResultList: items, gametype: req.params.gametype, gametypes: types});
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
  }

}