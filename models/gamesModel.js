var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = GamesModel;


function GamesModel(storageClient, tableName) {
  this.storageClient = storageClient;
  this.tableName = tableName;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        throw error;
      }
    });
};

GamesModel.prototype.add = function(item, callback) {
	self = this;
  self.storageClient.insertOrMergeEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){ 
      console.log("Cannot create table: "+JSON.stringify(err)); 
        callback(error + this.tableName);
      }
      callback(null);
    });
};

GamesModel.prototype.deleteTable = function() {
  self = this;
  self.storageClient.deleteTable(self.tableName, function(error){
    if(!error){
        // Table deleted
    }
  });
};

GamesModel.prototype.find = function(query, callback) {
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

GamesModel.prototype.updateItem = function(item, callback) {
  if (!('PartitionKey' in item))
    throw new Error("item does not contain PartitionKey: "+JSON.stringify(item));
  if (!('RowKey' in item))
    throw new Error("item does not contain RowKey: "+JSON.stringify(item));
  self = this;
  try {
    self.storageClient.insertOrMergeEntity (self.tableName, item,
      function entityInserted(error) {
        if(error){  
          callback(error);
        }
        callback(null);
      });
  } catch (err) {
    console.error("Error trying to updateItem: "+JSON.stringify(item));
    throw err;
  }
};
 