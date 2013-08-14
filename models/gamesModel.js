var azure = require('azure');
 // , uuid = require('node-uuid');
var err = require('../error');
module.exports = GamesModel;


function GamesModel(storageClient, tableName) {
  this.storageClient = storageClient;
  this.tableName = tableName;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        console.log("can't create table");
        err.writeJsonError("error", error, tableName, "Cannot create table");
        //throw error;
      }
    });
};

GamesModel.prototype.add = function(item, callback) {
	var self = this;
  self.storageClient.insertOrMergeEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){ 
      console.log("Cannot add to table: "+self.tableName+JSON.stringify(err)); 
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + this.tableName);
      }
      callback(null);
    });
};

GamesModel.prototype.find = function(query, callback) {
	var self = this;
  self.storageClient.queryEntities(query, 
    function entitiesQueried(error, entities){
      if(error) {
        console.log("Cannot find table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + this.tableName);
      } else {
        callback(null, entities);
      }
    });
};

GamesModel.prototype.updateItem = function(item, callback) {
  if (!('PartitionKey' in item))
    throw new Error("item does not contain PartitionKey: "+self.tableName+JSON.stringify(item));
  if (!('RowKey' in item))
    throw new Error("item does not contain RowKey: "+self.tableName+JSON.stringify(item));
  var self = this;
  try {
    self.storageClient.insertOrMergeEntity (self.tableName, item,
      function entityInserted(error) {
        if(error){  
        console.log("Cannot update to table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + this.tableName);
        }
        callback(null);
      });
  } catch (err) {
    console.error("Error trying to updateItem: "+self.tableName+JSON.stringify(item));
    throw err;
  }
};
 

 GamesModel.prototype.deleteItem = function(item, callback) {
  var self = this;
  self.storageClient.deleteEntity (self.tableName, item, 
    function entityDeleted(error) {
      if(error){  
        console.log("Cannot delete from table: "+self.tableName+self.tableName);
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + JSON.stringify(error));
      }
      callback(null);
    });
};
