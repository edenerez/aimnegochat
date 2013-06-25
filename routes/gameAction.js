var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = GameAction;


function GameAction(GameActionModel) {
  this.GameActionModel = GameActionModel;
  
  
}

GameAction.prototype = {

  addGameAction: function(req,res) {
    var self = this;      
    var item;
    item.RowKey = uuid();
    req.session.data.RowKey = item.RowKey;
    item.userid = req.session.data.userid;

    self.GameActionModel.add(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
    });
  },

 listAll: function(req, res,types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.GameActionModel.tableName);
      //.where('datastatus eq ?', 0);
    self.GameActionModel.find(query, function itemsFound(err, items) {
      res.render('gamesActionsData',{title: 'Games Action', GameActionList: items, gametype: req.params.gametype,  gametypes: types});
    });
  },
  
  activeGameAction: function(game, action, user, data) {
    var self = this;
    if (action == "Change"){
      var item = data;
    }
    else{ 
        var item = new Object();
        item.issue = NaN;  
        item.value = JSON.stringify(data);
    }
    item.PartitionKey = game.gameid;
    item.userid = user.userid;
    item.role = user.role;
    item.remainingTime = game.timer? game.timer.remainingTimeSeconds().toString(): "-";
    item.action = action;

    game.actionNum++;
    item.RowKey = game.actionNum.toString();
    self.GameActionModel.add(item, function itemAdded(err) {
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
    self.GameActionModel.deleteItem(item, function itemDeleted(err) {
      if(err) {
        throw err;
      }
      res.redirect('/'+gametype+'/listAllGameAction');
    });
  }

}