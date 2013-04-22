var azure = require('azure')
  , uuid = require('node-uuid');
 // , async = require('async')


module.exports = GameAction;


function GameAction(GameActionModel) {
  this.GameActionModel = GameActionModel;
  this.RowKey = 0;
  
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

 listAll: function(req, res,gameServers) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.GameActionModel.tableName);
      //.where('datastatus eq ?', 0);
    self.GameActionModel.find(query, function itemsFound(err, items) {
      res.render('games',{title: 'Games Action', GameActionList: items, gametype: req.params.gametype,  gametypes: Object.keys(gameServers)});
    });
  },

  
  activeGameAction: function(game, action, user, data) {
    var self = this;
    if (action == "Change")
      var item = data;
    if (action == "offer"){
      var item = new Object();
      item.issue = NaN;  
      item.value = JSON.stringify(data);
    }
    else{
      var item = new Object();
      item.issue = NaN;  
      item.value = data.toString();
    }
    item.PartitionKey = game.gameid;
    item.userid = user.userid;
    item.role = user.role;
    item.remainingTime = game.timer? game.timer.remainingTimeSeconds(): "-";
    item.action = action;

    this.RowKey ++ ;
    item.RowKey = this.RowKey.toString();
    self.GameActionModel.add(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
    });
  }

}