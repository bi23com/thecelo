//celocli validatorgroup:list
var Web3 = require('web3');
var web3 = new Web3('ws://xxx.xxx.xxx.xxx:8546');
//console.log(web3.eth.getTransactionCount);
//web3.eth.getTransactionCount("0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e").then(console.log);
var subscription = web3.eth.subscribe('newBlockHeaders', function(error, result){
    if (!error)
        console.log(result);
})
.on("data", function(transaction){
    console.log(transaction);
});
//
/*
// unsubscribes the subscription
subscription.unsubscribe(function(error, success){
    if(success)
        console.log('Successfully unsubscribed!');
});
*/
