var _ = require('underscore');
var os = require('os');
var fs = require('fs');
var path = require('path');
var async = require("async");

var errorHandler = function(err, next){
   if(err){
      console.log(err);
      next(err);
   } return;
}

/**
 * Defines the service
 * @param {Anything}   input data
 * @param {Function}   callback function
 */

var service_action = function(item, next){
   console.log(item);
   var result = {};
   result.name = "FACE NOT RECOGNIZED"
   result.service = "finished"
   result.parent_id = ""+item.id
   next(result);
}

/**
 * Creates an asynchronous task queue
 * @param {Function} [action to execute]
 * @param {Number}   [concurrency limit]
 * @return {queue}   [async queue handler]
 */

var q = async.queue( service_action, os.cpus().length );

/**
 * Does the thing
 * @param  {request object}       req
 * @param  {Function}   next   callback
 */

var run = function run(req, next){

   if(typeof req.data == 'array'){

      _.each( req.data, function(item){
         q.push(item, function (err, result) {
            // console.log(err | "RESULT: ", result);
            result = {}
            result.parent_id = req._id
            result.text = "FACE NOT RECOGNIZED"
            req.overmind.create(result, console.log)
         });
      });

      q.drain = function() {
         console.log('ALL THINGS ARE DONE');
         next()
      }

   } else {

      q.push(req, next);

   }
};

var test = function test(){

   sig = {};
   sig.broadcast = console.log
   sig.data = "TEST DATA"

   run(sig, console.log);

}

module.exports.run = run;
module.exports.test = test;

if(process.argv[2] === 'test') 
   test();
