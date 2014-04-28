var azure = require('azure')
  , csv = require('../csv-file');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = Report;


function Report(questionnaireModel, gamesModel, GameActionModel,finalResultModel, playerModel, finalAgreementModel) {
  this.questionnaireModel = questionnaireModel;
  this.gamesModel = gamesModel;
  this.GameActionModel = GameActionModel;
  this.finalResultModel = finalResultModel;
  this.playerModel = playerModel;
  this.finalAgreementModel = finalAgreementModel;
}

Report.prototype = {
  
  gameInfo: function(req, res, types) {
    self = this;
    var questionnaireModel = self.questionnaireModel;
    var finalResultModel = self.finalResultModel;
    var playerModel = self.playerModel;
    var finalAgreementModel = self.finalAgreementModel;
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
      finalResultModel.find(queryFinalResults, function itemsFound(error, finelResults) {
           var queryFinalAgreements = azure.TableQuery
          .select()
          .from(finalAgreementModel.tableName)
          .where('PartitionKey eq ?' , key);
          finalAgreementModel.find(queryFinalAgreements, function itemsFound(error, finelAgreements) {
               var queryPlayer = azure.TableQuery
              .select()
              .from(playerModel.tableName)
              .where('PartitionKey eq ?' , key);
              playerModel.find(queryPlayer, function itemsFound(error, player) {
                    // Erel: sort gameActions by increasing timestamp, then by row key:
                    //console.dir(gameActions);
                    if (gameActions) gameActions.sort(function(a, b){
                        var diff = new Date(a.Timestamp) - new Date(b.Timestamp);
                        if (Math.abs(diff)<2000)  // Sometimes, later rows have an earlier timestamp! allow a tolerance of 2 seconds. 
                           diff = parseInt(a.RowKey) - parseInt(b.RowKey);
                        //if (a.RowKey=='7')
                        //  console.log(JSON.stringify(a)+"\n"+JSON.stringify(b)+"\n"+diff);
                        return diff;
                    });                

                    res.render('gameReportsData',{
                      title: 'Game Action List', 
                      GameActionList: gameActions, 
                      playerList: player,
                      gametype: gametype,
                      gameid: key, 
                      FinalResultList: finelResults,
                      FinalAgreementList: finelAgreements,
                      gametypes: types});
                  });
               });
           });
        });
     },

downlaodInfo: function(req, res, types) {
    self = this;
    var questionnaireModel = self.questionnaireModel;
    var finalResultModel = self.finalResultModel;
    var playerModel = self.playerModel;
    var finalAgreementModel = self.finalAgreementModel;
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
      finalResultModel.find(queryFinalResults, function itemsFound(error, finelResults) {
           var queryFinalAgreements = azure.TableQuery
          .select()
          .from(finalAgreementModel.tableName)
          .where('PartitionKey eq ?' , key);
          finalAgreementModel.find(queryFinalAgreements, function itemsFound(error, finelAgreements) {
               var queryPlayer = azure.TableQuery
              .select()
              .from(playerModel.tableName)
              .where('PartitionKey eq ?' , key);
              playerModel.find(queryPlayer, function itemsFound(error, player) {
                    // Erel: sort gameActions by increasing timestamp, then by row key:
                    //console.dir(gameActions);
                    if (gameActions) gameActions.sort(function(a, b){
                        var diff = new Date(a.Timestamp) - new Date(b.Timestamp);
                        if (Math.abs(diff)<2000)  // Sometimes, later rows have an earlier timestamp! allow a tolerance of 2 seconds. 
                           diff = parseInt(a.RowKey) - parseInt(b.RowKey);
                        //if (a.RowKey=='7')
                        //  console.log(JSON.stringify(a)+"\n"+JSON.stringify(b)+"\n"+diff);
                        return diff;
                    });
                    if (gameActions != undefined)
                    for (action in gameActions){
                      data = gameActions[action].RowKey + "\t" + gameActions[action].action + "\t" + gameActions[action].role + "\t" + 
                              gameActions[action].userid + "\t" + gameActions[action].issue + "\t" + gameActions[action].value;
                      csv.writeCsvLog(key+'ActionsGame',data);
                    }

                    res.render('gameReportsData',{
                      title: 'Game Action List', 
                      GameActionList: gameActions, 
                      playerList: player,
                      gametype: gametype,
                      gameid: key, 
                      FinalResultList: finelResults,
                      FinalAgreementList: finelAgreements,
                      gametypes: types});
                    });
               });
           });
        });
     },

     gameInfoFile: function(req, res, types) {
    self = this;
    var questionnaireModel = self.questionnaireModel;
    var finalResultModel = self.finalResultModel;
    var playerModel = self.playerModel;
    var finalAgreementModel = self.finalAgreementModel;
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
      finalResultModel.find(queryFinalResults, function itemsFound(error, finelResults) {
           var queryFinalAgreements = azure.TableQuery
          .select()
          .from(finalAgreementModel.tableName)
          .where('PartitionKey eq ?' , key);
          finalAgreementModel.find(queryFinalAgreements, function itemsFound(error, finelAgreements) {
               var queryPlayer = azure.TableQuery
              .select()
              .from(playerModel.tableName)
              .where('PartitionKey eq ?' , key);
              playerModel.find(queryPlayer, function itemsFound(error, player) {
                    // Erel: sort gameActions by increasing timestamp, then by row key:
                    //console.dir(gameActions);
                    if (gameActions) gameActions.sort(function(a, b){
                        var diff = new Date(a.Timestamp) - new Date(b.Timestamp);
                        if (Math.abs(diff)<2000)  // Sometimes, later rows have an earlier timestamp! allow a tolerance of 2 seconds. 
                           diff = parseInt(a.RowKey) - parseInt(b.RowKey);
                        //if (a.RowKey=='7')
                        //  console.log(JSON.stringify(a)+"\n"+JSON.stringify(b)+"\n"+diff);
                        return diff;
                    });                

                    res.render('gameReportsData',{
                      title: 'Game Action List', 
                      GameActionList: gameActions, 
                      playerList: player,
                      gametype: gametype,
                      gameid: key, 
                      FinalResultList: finelResults,
                      FinalAgreementList: finelAgreements,
                      gametypes: types});
                  });
               });
           });
        });
     },


    scoreInfo: function(req, res, types) {
      self = this;
      var questionnaireModel = self.questionnaireModel;
      var finalResultModel = self.finalResultModel;
      var key = req.params.RowKey;
      var gametype =  req.params.gametype;
      var queryQuestionnaire = azure.TableQuery
      .select()
      .from(questionnaireModel.tableName)
      .where('RowKey eq ?' , key);
      questionnaireModel.find(queryQuestionnaire, function itemsFound(error, questionnaire) {
        var queryfinalResult = azure.TableQuery
        .select()
        .from(finalResultModel.tableName)
        .where('RowKey eq ?' , key);
        finalResultModel.find(queryfinalResult, function itemsFound(error, finalResult) {
                    res.render('scoreReportsData',{
                    title: 'Score Information', 
                    questionnaireList: questionnaire, 
                    FinalResultList: finalResult,
                    player: key,
                    gametype: gametype,
                    gametypes: types});
             });
        });
   
     },

     scoreInfo2: function(req, res, types) {
      self = this;
      var questionnaireModel = self.questionnaireModel;
      var finalResultModel = self.finalResultModel;
      var key = req.params.RowKey;
      var gametype =  req.params.gametype;
      var queryQuestionnaire = azure.TableQuery
      .select()
      .from(questionnaireModel.tableName)
      .where('gametype eq ?', gametype)
      ;
      
      questionnaireModel.find(queryQuestionnaire, function itemsFound(error, questionnaire) {
        var queryfinalResult = azure.TableQuery
        .select()
        .from(finalResultModel.tableName)
        
        finalResultModel.find(queryfinalResult, function itemsFound(error, finalResult) {
                    res.render('scoreReportsData2',{
                    title: 'Score Information', 
                    questionnaireList: questionnaire, 
                    FinalResultList: finalResult,
                    player: key,
                    gametypes: types,
                    gametype: gametype});
             });
        });
   
     },

    playerInfo: function(req, res, types) {
      self = this;
      var questionnaireModel = self.questionnaireModel;
      var playerModel = self.playerModel;
      var key = req.params.RowKey;
      var gametype =  req.params.gametype;
      var queryQuestionnaire = azure.TableQuery
      .select()
      .from(questionnaireModel.tableName)
      .where('RowKey eq ?' , key);
      questionnaireModel.find(queryQuestionnaire, function itemsFound(error, questionnaire) {
        var queryplayer = azure.TableQuery
        .select()
        .from(playerModel.tableName)
        .where('RowKey eq ?' , key);
        playerModel.find(queryplayer, function itemsFound(error, player) {
                    res.render('playerReportsData',{
                    title: 'Player Information', 
                    questionnaireList: questionnaire, 
                    playerList: player,
                    player: key,
                    gametype: gametype,
                    gametypes: types});
             });
        });
    },
}