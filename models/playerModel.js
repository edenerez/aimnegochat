var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = PlayerModel;


function PlayerModel(storageClient, tableName, partitionKey) {
  this.storageClient = storageClient;
  this.tableName = tableName;
  this.partitionKey = partitionKey;


  this.storageClient.createTableIfNotExists(tableName, 
    function tableCreated(err) {
      if(err) {
        console.log("Cannot create table: "+JSON.stringify(err));
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
        console.log("Cannot add player: "+JSON.stringify(error));
        callback(error + self.tableName);
      }
      callback(null);
    });
};


PlayerModel.prototype.find = function(query, callback) {
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


PlayerModel.prototype.findOne = function(query, callback) {
	var self = this;
  self.storageClient.queryEntity(query.tableName,
                                 query.partitionKey,
                                 query.rowKey, 
    function entitiesQueried(error, entity){
      if(error) {
        console.log("Cannot find one in table: "+JSON.stringify(error));
        callback(error + self.tableName);
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
        console.log("Cannot update to table: "+JSON.stringify(error));
        callback(error + self.tableName);
      }
      callback(null);
    });
};
 
