var azure = require('azure');
  //, uuid = require('node-uuid');
 // , async = require('async')


module.exports = Questionnaire;


function Questionnaire(questionnaireModel) {
  this.questionnaireModel = questionnaireModel;
}

Questionnaire.prototype = {
  listAll: function(req, res, types) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.questionnaireModel.tableName);
      //.where('datastatus eq ?', 0);
    self.questionnaireModel.find(query, function itemsFound(err, items) {
      res.render('questionnaireData',{title: 'Questionnaire List', questionnaireList: items ,gametype: req.params.gametype,  gametypes: types});
    });
  },


  addQuestionnaire: function(req,res) {
    var self = this;      
    var item = req.body.item;
    item.RowKey = req.session.data.userid;
    item.userid = req.session.data.userid;
    item.gametype = req.session.data.gametype;
    item.browserType = req.session.data.browserType + req.session.data.browserVersion;
    //item.gameid = req.session.data.gameid ? req.session.data.gameid : NaN; // doesn't work either - why?
    item.assignmentId = req.session.data.assignmentId ? req.session.data.assignmentId : NaN; //null throw the program. undefine ignore it. mayby to put some string like "no amazonTurk"
    item.hitId = req.session.data.hitId ? req.session.data.hitId : NaN;
    item.workerId = req.session.data.workerId ? req.session.data.workerId : NaN; 
    self.questionnaireModel.add(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      //res.redirect('/PostQuestionnaireA');
      res.redirect('/PreQuestionnaireExam');
    });
  },
  
  demographyQuestionnaire: function(req,res) {
    res.render("PreQuestionnaireDemographyA");
  },

  deleteQuestionnaireTable: function(req,res) {
    var self = this;
    self.questionnaireModel.deleteTable();
    
    res.redirect('/listAllQuestionnaire');
  },

  activeQuestionnaire: function(req,res) {
    var self = this;
    var item = req.body.item;
    item.RowKey = req.session.data.userid;
    self.questionnaireModel.updateItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/ThankYou');
    });
  }

}