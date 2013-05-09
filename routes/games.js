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
    item.startTime = JSON.stringify(startTime);
    item.active = true;
    item.unverified = JSON.stringify(unverified);
   
    self.GamesModel.add(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  },


  listAll: function(req, res,types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.GamesModel.tableName);
      //.where('datastatus eq ?', 0);
    self.GamesModel.find(query, function itemsFound(error, items) {
      // Erel: sort games by increasing timestamp:
      items.sort(function(a, b){
            return new Date(a.Timestamp) - new Date(b.Timestamp);
      });
      res.render('gamesData',{
        title: 'Games List', 
        gamesList: items, 
        gametype: req.params.gametype,  
        gametypes: types});
    });
  },

  
  activeGames: function(gameid, endTime) {
    var self = this;
    var item = {};
    item.RowKey = self.RowKey;
    item.PartitionKey = gameid;
    item.endTime = JSON.stringify(endTime);
    
    self.GamesModel.updateItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
    });
  }

}