var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = Player;


function Player(playerModel) {
  this.playerModel = playerModel;
}

Player.prototype = {
  listAll: function(req, res, types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.playerModel.tableName);
      //.where('datastatus eq ?', 0);
    self.playerModel.find(query, function itemsFound(err, items) {
      res.render('playerData',{title: 'Player List', playerList: items ,gametype: req.params.gametype,  gametypes: types});
    });
  },


  addPlayer: function(gameid, playerid, role, type, gametype) {
    var self = this; 
    var item = {};
    item.PartitionKey = gameid;
    item.RowKey = playerid;
    item.role = role;
    item.gametype = gametype;
    item.type = type;
    self.playerModel.add(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
    });
  },

  activePlayer: function(req,res) {
    var self = this;
    var item = req.body.item;
    item.RowKey = req.session.data.RowKey;
    self.playerModel.updateItem(item, function itemAdded(err) {
      if(err) {
        throw err;
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
    self.playerModel.deleteItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/'+gametype+'/listAllPlayers');
    });
  }
}