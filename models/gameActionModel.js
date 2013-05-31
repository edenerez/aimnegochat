var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = GameActionModel;


function GameActionModel(storageClient, tableName, partitionKey) {
  this.storageClient = storageClient;
  this.tableName = tableName;
  //this.partitionKey = partitionKey;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        throw error;
      }
    });
};

GameActionModel.prototype.add = function(item, callback) {
	self = this;
  self.storageClient.insertEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot add to table: "+JSON.stringify(error));
        callback(error + this.tableName);
      }
      callback(null);
    });
};

GameActionModel.prototype.find = function(query, callback) {
	self = this;
  self.storageClient.queryEntities(query, 
    function entitiesQueried(error, entities){
      if(error) {
        console.log("Cannot find table: "+JSON.stringify(error));
        callback(error + this.tableName);
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
        console.log("Cannot update to table: "+JSON.stringify(error));
        callback(error + this.tableName);
      }
      callback(null);
    });
};
 