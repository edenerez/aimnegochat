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
      //.where('completed eq ?', 'false');
    self.questionnaireModel.find(query, function itemsFound(err, items) {
      res.render('researcheData',{title: 'Questionnaire List', QuestionnaireList: items});
    });
  },


  addQuestionnaire: function(req,res) {
    var self = this      
    var item = req.body.item;
    self.questionnaireModel.addItem(item, function itemAdded(err) {
      if(err) {
        throw err;
      }
      res.redirect('/PreQuestionnaireExam');
    });
  },
  
  demographyQuestionnaire: function(req,res) {
    res.render("PreQuestionnaireDemographyA",  {
        action:'/WriteQuestionnaireAnswers/PreQuestionnaireDemography',
        next_action:'/PreQuestionnaireExam',
        AMTStatus: JSON.stringify(req.session.data)});
  },


/*
  completeTask: function(req,res) {
    var self = this;
    var completedTasks = Object.keys(req.body);
    async.forEach(completedTasks, function taskIterator(completedTask, callback){
      self.task.updateItem(completedTask, function itemsUpdated(err){
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
       res.redirect('/');
      }
    });
  }
  */
}