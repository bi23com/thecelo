//
var pwd = 'xxxxxxxxxx';//rc1
//
var os = require('os');
var hostName = os.hostname();
if('blockchain-server3' == hostName){
  pwd = 'xxxxxxxx';//175
}
//
const host = 'localhost';
const port = 6379;
//
let
  redis     = require('redis'),
  redis_client    = redis.createClient({
    port      : port,
    host      : host,
    password  : pwd
  });
  redis_client.on('connect', function() {
    console.log('redis_client connected');
  });
  //
  let
    redis_subscribe_client    = redis.createClient({
      port      : port,
      host      : host,
      password  : pwd
    });
    redis_subscribe_client.on('connect', function() {
      console.log('redis_subscribe_client connected');
    });
    //
    let get_redis_data = function (key){
      return new Promise(function(resolve, reject){
          redis_client.get(key, function(err, data) {
            if(err){reject(err);}else{resolve(data);}
          })
        })
      }
      //
module.exports = {
       redis_client,redis_subscribe_client,get_redis_data
     }
