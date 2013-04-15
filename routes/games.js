var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = Games;


function Games(GamesModel) {
  this.GamesModel = GamesModel;
}

Games.prototype = {

  addGames: function(gametype, gameid, startTime, unverified, mapRoleToUserid, endTime) {
    var self = this;      
    if (self.PartitionKey == gameid){
      return;
    }
    var item = mapRoleToUserid;
    item.PartitionKey = gameid;
    self.PartitionKey = item.PartitionKey;
    item.RowKey = uuid();
    self.RowKey = item.RowKey;
    item.gametype = gametype;
    item.active = true;
    item.dataStatus = true;
    item.startTime = JSON.stringify(startTime);
    item.unverified = JSON.stringify(unverified);
    item.endTime = JSON.stringify(endTime);
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
    self.GamesModel.find(query, function itemsFound(err, items) {
      res.render('gamesData',{title: 'Games List', gamesList: items, gametype: req.params.gametype,  gametypes: Object.keys(gameServers)});
    });
  },

  
  activeGames: function(endTime) {
    var self = this;
    var item = new Object();
    item.RowKey = self.RowKey;
    item.PartitionKey = self.PartitionKey;
    
    self.GamesModel.updateItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  }

}