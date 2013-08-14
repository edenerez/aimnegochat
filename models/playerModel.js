var azure = require('azure');
 // , uuid = require('node-uuid');
var err = require('../error');
module.exports = PlayerModel;


function PlayerModel(storageClient, tableName, partitionKey) {
  this.storageClient = storageClient;
  this.tableName = tableName;
  this.partitionKey = partitionKey;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(error) {
      if(error) {
        console.log("Cannot create table: "+tableName+JSON.stringify(err));
        err.writeJsonError("error", error, tableName, "Cannot create table");
        // throw err;
      }
    });
};

PlayerModel.prototype.add = function(item, callback) {
	var self = this;
  //item.RowKey = uuid();
  self.storageClient.insertOrMergeEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        console.log("Cannot add player: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + self.tableName);
      }
      callback(null);
    });
};


PlayerModel.prototype.find = function(query, callback) {
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


PlayerModel.prototype.findOne = function(query, callback) {
	var self = this;
  self.storageClient.queryEntity(query.tableName,
                                 query.partitionKey,
                                 query.rowKey, 
    function entitiesQueried(error, entity){
      if(error) {
        console.log("Cannot find one in table: "+self.tableName+JSON.stringify(error));
        err.writeJsonError("error", error, self.tableName, item);
        //callback(error + self.tableName);
      } else {
        callback(null, entity);
      }
    });
};

PlayerModel.prototype.updateItem = function(item, callback) {
  var self = this;
  item.PartitionKey = self.partitionKey;
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
 
 PlayerModel.prototype.deleteItem = function(item, callback) {
  self = this;
  self.storageClient.deleteEntity (self.tableName, item, 
    function entityDeleted(error) {
      if(error){  
        err.writeJsonError("error", error, self.tableName, item);
        console.log("Cannot delete from table: "+self.tableName+JSON.stringify(error));
        //callback(error + this.tableName);
      }
      callback(null);
    });
};

