var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = GameActionModel;


function GameActionModel(storageClient, tableName, partitionKey) {
  this.storageClient = storageClient;
  this.tableName = tableName;
  //this.partitionKey = partitionKey;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(err) {
      if(err) {
        throw error;
      }
    });
};

GameActionModel.prototype.add = function(item, callback) {
	self = this;
  self.storageClient.insertEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(error);
      }
      callback(null);
    });
};

GameActionModel.prototype.deleteTable = function() {
  self = this;
  self.storageClient.deleteTable(self.tableName, function(error){
    if(!error){
        // Table deleted
    }
  });
};

GameActionModel.prototype.find = function(query, callback) {
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

GameActionModel.prototype.updateItem = function(item, callback) {
  self = this;
    self.storageClient.insertOrMergeEntity (self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(error);
      }
      callback(null);
    });
};
 