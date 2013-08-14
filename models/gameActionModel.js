var azure = require('azure');
 // , uuid = require('node-uuid');
var err = require('../error');
module.exports = GameActionModel;


function GameActionModel(storageClient, tableName, partitionKey) {
  this.storageClient = storageClient;
  this.tableName = tableName;
  //this.partitionKey = partitionKey;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        console.log("can't create table");
        err.writeJsonError("error", error, tableName, "Cannot create table");
        //throw error;
      }
    });
};

GameActionModel.prototype.add = function(item, callback) {
	var self = this;
  self.storageClient.insertEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot add to table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + self.tableName);
      }
      callback(null);
    });
};

GameActionModel.prototype.find = function(query, callback) {
	var self = this;
  self.storageClient.queryEntities(query, 
    function entitiesQueried(error, entities){
      if(error) {
        console.log("Cannot find table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + self.tableName);
      } else {
        callback(null, entities);
      }
    });
};

GameActionModel.prototype.updateItem = function(item, callback) {
  var self = this;
    self.storageClient.insertOrMergeEntity (self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot update to table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + self.tableName);
      }
      callback(null);
    });
};
 
 GameActionModel.prototype.deleteItem = function(item, callback) {
  self = this;
  self.storageClient.deleteEntity (self.tableName, item, 
    function entityDeleted(error) {
      if(error){  
        err.writeJsonError("error", error, self.tableName, item);
        console.log("Cannot delete from table: "+self.tableName+JSON.stringify(error));
        //callback(error + self.tableName);
      }
      callback(null);
    });
};
