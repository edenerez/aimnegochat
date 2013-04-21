var azure = require('azure');
 // , uuid = require('node-uuid');

module.exports = QuestionnaireModel;


function QuestionnaireModel(storageClient, tableName, partitionKey) {
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

QuestionnaireModel.prototype.add = function(item, callback) {
	self = this;
  //item.RowKey = uuid();
  item.PartitionKey = self.partitionKey;
  item.datastatus = 0;
  item.completed = false;
  item.active = true;
  self.storageClient.insertEntity(self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(error);
      }
      callback(null);
    });
};

QuestionnaireModel.prototype.deleteTable = function() {
  self = this;
  self.storageClient.deleteTable(self.tableName, function(error){
    if(!error){
        // Table deleted
    }
  });
};

QuestionnaireModel.prototype.find = function(query, callback) {
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


QuestionnaireModel.prototype.findOne = function(query, callback) {
	self = this;
  self.storageClient.queryEntity(query.tableName,
                                 query.partitionKey,
                                 query.rowKey, 
    function entitiesQueried(error, entity){
      if(error) {
        callback(error);
      } else {
        callback(null, entity);
      }
    });
};

QuestionnaireModel.prototype.updateItem = function(item, callback) {
  self = this;
  item.PartitionKey = self.partitionKey;
    self.storageClient.insertOrMergeEntity (self.tableName, item, 
    function entityInserted(error) {
      if(error){  
        callback(err);
      }
      callback(null);
    });
};
 
