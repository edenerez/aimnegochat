var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = FinalResultModel;


function FinalResultModel(storageClient, tableName) {
  this.storageClient = storageClient;
  this.tableName = tableName;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        throw error;
      }
    });
};

FinalResultModel.prototype.add = function(item, callback) {
	self = this;
  self.storageClient.insertEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(error);
      }
      callback(null);
    });
};

FinalResultModel.prototype.deleteTable = function() {
  self = this;
  self.storageClient.deleteTable(self.tableName, function(error){
    if(!error){
        // Table deleted
    }
  });
};

FinalResultModel.prototype.find = function(query, callback) {
	self = this;
  self.storageClient.queryEntities(query, 
    function entitiesQueried(error, entities){
      if(error) {
        callback(error);
      } else {
        callback(null, entities);
      }
    });
};

FinalResultModel.prototype.updateItem = function(item, callback) {
  self = this;
    self.storageClient.insertOrMergeEntity (self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(error);
      }
      callback(null);
    });
};
 