const redis = require("./thecelo.redis.js");
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
//
const Web3 = require('web3')
//const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const web3 = new Web3(new Web3.providers.WebsocketProvider('http://xxx.xxx.xxx.xxx:8546'));

///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
var subscription = web3.eth.subscribe('pendingTransactions', function(error, result){
    if (!error)
        thecelo.log_out(result);
})
.on("data", function(transaction){
    console.log(transaction);
});

// unsubscribes the subscription
subscription.unsubscribe(function(error, success){
    if(success)
        console.log('Successfully unsubscribed!');
});
