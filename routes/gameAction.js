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

 listAll: function(req, res,types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.GameActionModel.tableName);
      //.where('datastatus eq ?', 0);
    self.GameActionModel.find(query, function itemsFound(err, items) {
      res.render('games',{title: 'Games Action', GameActionList: items, gametype: req.params.gametype,  gametypes: types});
    });
  },
/*

if (typeof data == "object"){
      if (!data.issue){
        var item = new Object();
        item.issue = NaN;  
        item.value = JSON.stringify(data);
      }
      else{

*/
  
  activeGameAction: function(game, action, user, data) {
    var self = this;
   /* console.log("!!!!!!!!!game",  game);
    console.log("!!!!!!!!!action", action);
    console.log("!!!!!!!!!user", user);
    console.log("!!!!!!!!!data", data);
    
    if (typeof data == "object")
      //console.log("!!!!!", typeof data ,"+", data );*/
    if (action == "Change"){
      var item = data;
    }
    else{ 
        var item = new Object();
        item.issue = NaN;  
        item.value = JSON.stringify(data);
    }
    //var item = new Object(); /// delete this line after funish
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