var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = Report;


function Report(questionnaireModel, gamesModel, GameActionModel,finalResultModel) {
  this.questionnaireModel = questionnaireModel;
  this.gamesModel = gamesModel;
  this.GameActionModel = GameActionModel;
  this.finalResultModel = finalResultModel;
}

Report.prototype = {
   gameInfo: function(req, res, types) {
    self = this;
    var questionnaireModel = self.questionnaireModel;
    var finalResultModel = self.finalResultModel;
    var key = req.params.PartitionKey;
    var gametype =  req.params.gametype;
    var queryGameActions = azure.TableQuery
    .select()
    .from(self.GameActionModel.tableName)
    .where('PartitionKey eq ?' , key);
    self.GameActionModel.find(queryGameActions, function itemsFound(error, gameActions) {
      var queryFinalResults = azure.TableQuery
      .select()
      .from(finalResultModel.tableName)
      .where('PartitionKey eq ?' , key);
      finalResultModel.find(queryFinalResults, function itemsFound(error, items0) {
           var queryC = {tableName : questionnaireModel.tableName, partitionKey : 'gameid', rowKey : req.params.Candidate};
           questionnaireModel.findOne(queryC, function itemsFound(error, items1) {
             var queryE = {tableName : questionnaireModel.tableName, partitionKey : 'gameid', rowKey : req.params.Employer};
             questionnaireModel.findOne(queryE,function itemsFound(error,items2){
                var users = {};
                if (items1)
                  users[0] = items1;
                if (items2)
                  if (users[0])
                    users[1] = items2;
                  else
                    users[0] = items2;
                //users[0] = items1;
                //users[1] = items2;

                // Erel: sort gameActions by increasing timestamp, then by row key:
                //console.dir(gameActions);
                gameActions.sort(function(a, b){
                    var diff = new Date(a.Timestamp) - new Date(b.Timestamp);
                    if (diff==0) 
                       diff = Integer.valueOf(a.RowKey) - Integer.valueOf(b.RowKey);
                    return diff;
                });                

                res.render('gamesActionData',{
                  title: 'Game Action List', 
                  GameActionList: gameActions, 
                  questionnaireList: users, 
                  gametype: gametype, 
                  FinalResultList: items0, 
                  gametypes: types});
              });
           });
        });
     });
  },
}