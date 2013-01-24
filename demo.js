// This file is only used for demos and testing - not for release version

var fs     = require('fs')
  , path = require('path')
  , util = require('util')
  , jade = require('jade')
  , jsonref = require('json-ref')
  ;


var obj = {a: 1, b: 2, c: 3};
console.log(jsonref.ref(obj));

console.log(jsonref.ref({port: 123}));

obj.circular_reference = obj;
console.log(jsonref.ref(obj));
