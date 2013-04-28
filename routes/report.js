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
   gameInfo: function(req, res, gameServers) {
    self = this;
    var questionnaireModel = self.questionnaireModel;
    var finalResultModel = self.finalResultModel;
    var key = req.params.PartitionKey;
    var gametype =  req.params.gametype;
    var query = azure.TableQuery
    .select()
    .from(self.GameActionModel.tableName)
    .where('PartitionKey eq ?' , key);
    self.GameActionModel.find(query, function itemsFound(error, items) {
      var query = azure.TableQuery
      .select()
      .from(finalResultModel.tableName)
      .where('PartitionKey eq ?' , key);
      finalResultModel.find(query, function itemsFound(error, items0) {
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
                res.render('gamesActionData',{title: 'Game Action List', GameActionList: items, questionnaireList: users, gametype: gametype, FinalResultList: items0, gametypes: Object.keys(gameServers)});
              });
           });
        });
     });
  },
}