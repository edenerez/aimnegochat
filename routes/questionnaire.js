var azure = require('azure')
  , async = require('async');


module.exports = Questionnaire;


function Questionnaire(questionnaireModel) {
  this.questionnaireModel = questionnaireModel;
}

Questionnaire.prototype = {
  listAll: function(req, res) {
    self = this;
    var query = azure.TableQuery
      .select()
      .from(self.questionnaireModel.tableName);
      //.where('datastatus eq ?', 0);
    self.questionnaireModel.find(query, function itemsFound(err, items) {
      res.render('researcheData',{title: 'Questionnaire List', questionnaireList: items});
    });
  },


  addQuestionnaire: function(req,res) {
    var self = this;      
    var item = req.body.item;
    self.questionnaireModel.add(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
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
    var activeQuestionnairs = Object.keys(req.body);
    async.forEach(activeQuestionnairs, function taskIterator(activeQuestionnaire, callback){
      self.questionnaireModel.updateItem(activeQuestionnaire, function itemsUpdated(err){
        if(err){
          callback(err);
        } else {
          callback(null);
        }
      })
    }, function(err){
      if(err) {
        throw err;
      } else {
       res.redirect('/listAllQuestionnaire');
      }
    });
  }

}