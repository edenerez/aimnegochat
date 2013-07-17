var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = Games;


function Games(GamesModel) {
  this.GamesModel = GamesModel;
  this.RowKey;
  this.PartitionKey;
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
    var self = this;
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

  
  activeGames: function(gameid, endedIn, endTime) {
    var self = this;
    var item = {};
    if (!self.RowKey){
      item.RowKey+uuid();
      throw new Error("self does not contain RowKey: "+JSON.stringify(self));
    }
    item.RowKey = self.RowKey;
    item.PartitionKey = gameid;
    item.endTime = JSON.stringify(endTime);
    if (endedIn){
      item.endedIn = endedIn;
    }
    else{
      item.endedIn = "Disconnect";
    }
    
    self.GamesModel.updateItem(item, function itemAdded(error) {
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
    self.GamesModel.deleteItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/'+gametype+'/listAllGames');
    });
  }

}