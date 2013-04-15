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
  
  activeGameAction: function(game, action, user, data) {
    var self = this;
    if (action == "Change")
      var item = data;
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