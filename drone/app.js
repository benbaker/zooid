// var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;
var async = require("async");
var os = require("os");

var _ = require("underscore");
var path = require('path');
var Signal = require('./Signal.js');
var request = require("request")


var cluster = require('cluster');
var http = require('http');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {



/** ----------------------------------------------------------------------------
 * Once listening, configure the socket and log network info 
 * -------------------------------------------------------------------------- */

var client = require('dgram').createSocket('udp4');
client.bind(42002, '239.255.0.1'); // port, ip

client.on('listening', function () {
   var address = client.address();
   console.log('UDP Client listening on ' + address.address + ":" + address.port);
   client.setBroadcast(true);
   client.setMulticastTTL(128);
   // client.addMembership('239.255.0.1');
   // findOvermind();
});

client.on('message', function(message, remote){

   // Turn buffer into an array of strings
   var req = {}, args = message.toString().split(":");
   req.service = args[0];
   req.parent_id = args[1];
   // console.log("WE HEARD: ", req)
   // push the service to the queue
   run(req, function (err, result) {
      // console.log("WE DID:". result);
   });
});


/**
 * Collective Constructor
 * @param {Object} ops [optional options - anything]
 */
function Collective(ops){
   for(op in ops)
      this[op]=ops[op]
}
   
/** ----------------------------------------------------------------------------
 * Broadcasts a service request to the cluster over udp4 socket.
 * @param  {String} service   Name of service to be called on the dataset
 * @param  {String} signal_id The Signals Iunique identifier from the database.
 * -------------------------------------------------------------------------- */
Collective.prototype.broadcast = function broadcast(service, signal_id){
   
   // Warning: Brackets
   // 
   if( !service || !signal_id ) return;

   if(Object.prototype.toString.call( service ) === '[object Array]')
      for (var t = service.length - 1; t >= 0; t--)
         broadcast( service[t], signal_id );
   
   else {

      var message = new Buffer(service+":"+signal_id);
      client.send( message, 0, message.length, 42002, "239.255.0.1");
   }
};


var collective = new Collective( { client:client });






function Overmind(om){

   var om = om || {}
   this.ip    = om.proto || 'http'
   this.ip    = om.ip    || 'localhost'
   this.port  = om.port  ||  4445
   this.model = om.model || 'signal'
}

Overmind.prototype.get = function(req, next){
   // console.log( "WE ASKED OVERMIND FOR:", req );
   var channel = "http://"+ this.ip +":"+ this.port +"/"+ this.model +"/"+req.id
   request(channel, function (err, response, body) {
       // console.log( "OVERMIND GAVE US:", err, body );
        next(err, body)
   })
}

Overmind.prototype.create = function(req, next){
   var channel = "http://"+ this.ip +":"+ this.port +"/"+ this.model +"/create"
   request(channel, { json:req } , function (err, response, body) {
       // console.log( "Overmind Took" , err, req );
        next(err, body)
   })
}

Overmind.prototype.cq = function(req, next){

   collective.broadcast( new Buffer("cqcq:"+"Drone designation") )
}


var overmind = new Overmind();

overmind.cq()



var run = function(req, next){

   // TODO: Check that the service is available.

  /** ----------------------------------------------------------------------------
   * Finds the signal to be serviced by it's id from the message, 
   * @param   {String} parent_id
   * @return  {String} err
   * -------------------------------------------------------------------------- */

   var service = req.service;
   var parent_id = req.parent_id;

   console.log( "WE LEARNED", parent_id , "IS", service)

   overmind.get( { id: parent_id }, function(err, signal){

      if(err) console.log("WE COULD NOT GET:", err, signal)
      
      // Load the service module
      var mod = require(__dirname+'/services/'+service+".js");

      var signal = JSON.parse(signal);
      //Function.prototype.call.bind(
      signal.broadcast = collective.broadcast
      signal.overmind  = overmind

      // Execute the service
      mod.run( signal, function(err, result){

         result = result || {}
         result.parent_id = parent_id
         // overmind.create( result, function( err, new_signal ){
            // console.log("WE PUT THE SIGNAL:", new_signal);
            // collective.broadcast( result.services, new_signal.id )
            next();
         // });

         // new_signal.data = result;
         // new_signal.save();
      });

   });
};




var test = function(service, fn ){

   var image_location  = path.join( __dirname , "/examples/diverse.jpg");
   console.log("TESTING IMAGE FLOW WITH: ", image_location);

   overmind.create({

      name:"Face Detection Test",
      type:"HEAD",
      location:image_location,
      service:"IMAGE"

   }, function(err, signal){
      
      console.log( err || ("WE TEST: " , signal) );
      var service = service || "IMAGE";
      var message = new Buffer( service +":"+ signal.id );

      client.send(message, 0, message.length, 42002, "239.255.0.1");
   });
};



// _.delay( _.once(test), 1400, "IMAGE");

module.exports.test = test;





// var net = require('net');
// var net_client = net.connect({port: 8080}, function() {
//   // we can send data back
//   net_client.write("HELLO FROM SIGNAL MODEL");
// });
// net_client.on('data', function(data) {
//   console.log("net_client recieved:", data.toString());
// });
// net_client.on('end', function() {
//   console.log("net_client end");
// });
}