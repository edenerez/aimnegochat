var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = FinalResult;


function FinalResult(FinalResultModel) {
  this.FinalResultModel = FinalResultModel;
}

FinalResult.prototype = {

  addFinalResult: function(data) {
    var self = this;      
    var item = new Object();
    item.JobDescription = data.mapRoleToFinalResult.agreement['Job Description'];
    item.LeasedCar = data.mapRoleToFinalResult.agreement['Leased Car'];
    item.PensionFond = data.mapRoleToFinalResult.agreement['Pension Fund'];
    item.PromotionPosibilities = data.mapRoleToFinalResult.agreement['Promotion Possibilities'];
    item.Salary = data.mapRoleToFinalResult.agreement['Salary'];
    item.WorkingHours = data.mapRoleToFinalResult.agreement['Working Hours'];
    item.timeFromStart = data.mapRoleToFinalResult.timeFromStart.toString();
    item.turnsFromStart = data.mapRoleToFinalResult.turnsFromStart.toString();
    item.utilityWithoutDiscount = data.mapRoleToFinalResult.utilityWithoutDiscount.toString();
    item.utilityWithDiscount = data.mapRoleToFinalResult.utilityWithDiscount.toString();
    item.RowKey = data.userid;
    item.PartitionKey = data.gameid;
    self.FinalResultModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },
  
  
  listAll: function(req, res, gameServers) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.FinalResultModel.tableName);
    self.FinalResultModel.find(query, function itemsFound(err, items) {
      res.render('finalResultsData',{title: 'Final Result List', FinalResultList: items, gametype: req.params.gametype, gametypes: Object.keys(gameServers)});
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