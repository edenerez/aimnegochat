var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = Games;


function Games(GamesModel) {
  this.GamesModel = GamesModel;
}

Games.prototype = {

  addGames: function(gametype, gameid, startTime, unverified) {
    var self = this;      
    if (self.PartitionKey == gameid){
      return;
    }
    var item = new Object();
    item.PartitionKey = gameid;
    self.PartitionKey = item.PartitionKey;
    item.RowKey = uuid();
    self.RowKey = item.RowKey;
    item.gametype = gametype;
    item.active = true;
    item.dataStatus = true;
    item.unverified = JSON.stringify(unverified);
   
    self.GamesModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },


  listAll: function(req, res,gameServers) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.GamesModel.tableName);
      //.where('datastatus eq ?', 0);
    self.GamesModel.find(query, function itemsFound(error, items) {
      res.render('gamesData',{title: 'Games List', gamesList: items, gametype: req.params.gametype,  gametypes: Object.keys(gameServers)});
    });
  },

  
  activeGames: function(gameid, mapRoleToUserid, startTime, endTime) {
    var self = this;
    var item = mapRoleToUserid;
    item.RowKey = self.RowKey;
    item.PartitionKey = gameid;
    item.startTime = JSON.stringify(startTime);
    item.endTime = JSON.stringify(endTime);
    
    self.GamesModel.updateItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  }

}