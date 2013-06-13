var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = FinalAgreementModel;


function FinalAgreementModel(storageClient, tableName) {
  this.storageClient = storageClient;
  this.tableName = tableName;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        throw error;
      }
    });
};

FinalAgreementModel.prototype.add = function(item, callback) {
	var self = this;
  self.storageClient.insertOrReplaceEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot add to table: "+JSON.stringify(error));
        callback(error + self.tableName);
      }
      callback(null);
    });
};

FinalAgreementModel.prototype.find = function(query, callback) {
	var self = this;
  self.storageClient.queryEntities(query, 
    function entitiesQueried(error, entities){
      if(error) {
        console.log("Cannot find table: "+JSON.stringify(error));
        callback(error + self.tableName);
      } else {
        callback(null, entities);
      }
    });
};

FinalAgreementModel.prototype.updateItem = function(item, callback) {
  var self = this;
    self.storageClient.insertOrMergeEntity (self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot find update to table: "+JSON.stringify(error));
        callback(error + self.tableName);
      }
      callback(null);
    });
};
 