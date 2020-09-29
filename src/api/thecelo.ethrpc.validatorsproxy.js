const web3wrapper = require('./web3wrapper').default
const web3 = web3wrapper.web3http();
const web3ws = web3wrapper.web3ws();
//
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");

var validatorsproxy_address = '0xaEb865bCa93DdC8F47b8e29F40C5399cE34d0C58';
if('rc1' != thecelo.celo_network){
  validatorsproxy_address = '0xcb3A2f0520edBb4Fc37Ecb646d06877E339bBC9D';
}
//
var validatorgroup_register_topic ='0xbf4b45570f1907a94775f8449817051a492a676918e38108bb762e991e6b58dc';
var validator_register_topic ='0x213377eec2c15b21fa7abcbb0cb87a67e893cdb94a2564aa4bb4d380869473c8';
var validatorgroup_member_topic ='0xbdf7e616a6943f81e07a7984c9d4c00197dc2f481486ce4ffa6af52a113974ad';
//
var groups = {};
var validators = {};
var members  = {};
//
function validatorgroup_register(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+validatorsproxy_address+'","topics":["'+validatorgroup_register_topic+'"]}]');

}
//
function validator_register(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+validatorsproxy_address+'","topics":["'+validator_register_topic+'"]}]');
}
//
function validatorgroup_member(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+validatorsproxy_address+'","topics":["'+validatorgroup_member_topic+'"]}]');
}
//
function validatorEpochPaymentDistributed(validator,group){
  var fromBlock = "earliest";
  var toBlock = "latest";
  //
  var input = [{"type":"address","name":"validator","indexed":true},
      {"type":"uint256","name":"validatorPayment","indexed":false},
      {"type":"address","name":"group","indexed":true},
      {"type":"uint256","name":"groupPayment","indexed":false}];
  var validatorEpochPaymentDistributed = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorEpochPaymentDistributed",
      "inputs":input});
  var validator1 = web3.eth.abi.encodeParameter('address', validator);
  var group1 = web3.eth.abi.encodeParameter('address', group);
  var topics = [validatorEpochPaymentDistributed,validator1,group1];
  var parameters = [{fromBlock,toBlock,validatorsproxy_address,topics}];
  var result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  //
  var epoch_payments={};
  result.forEach((item, i) => {
    var data = web3.eth.abi.decodeLog(input, item.data, topics);
    var key = parseInt(item.blockNumber/theceloconst.EPOCH_SIZE);
    epoch_payments[key] = [parseInt(data.validatorPayment)/1e+18,parseInt(data.groupPayment)/1e+18];
  });
  return epoch_payments;
}
//
function validatorScoreUpdated(validator){
  var fromBlock = "earliest";
  var toBlock = "latest";
  //
  var input = [{"type":"address","name":"validator","indexed":true},
      {"type":"uint256","name":"score","indexed":false},
      {"type":"uint256","name":"epochScore","indexed":false}];
  var validatorScoreUpdated = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorScoreUpdated",
      "inputs":input});
  var validator1 = web3.eth.abi.encodeParameter('address', validator);
  var topics = [validatorScoreUpdated,validator1];
  var parameters = [{fromBlock,toBlock,validatorsproxy_address,topics}];
  var result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  //console.log(result);
  //
  var scores = {};
  result.forEach((item, i) => {
    var data = web3.eth.abi.decodeLog(input, item.data, topics);
    var key = parseInt(item.blockNumber/theceloconst.EPOCH_SIZE);
    scores[key] = [parseInt(data.score),parseInt(data.epochScore)];
  });
  return scores;
}
//
function getRegisteredValidatorGroups(){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getRegisteredValidatorGroups',
      type: 'function',
      inputs: []
  },[]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+validatorsproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'address[]';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getRegisteredValidatorSigners(){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getRegisteredValidatorSigners',
      type: 'function',
      inputs: []
  },[]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+validatorsproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'address[]';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getRegisteredValidators(){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getRegisteredValidators',
      type: 'function',
      inputs: []
  },[]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+validatorsproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'address[]';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getMembershipInLastEpochFromSigner(address){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getMembershipInLastEpochFromSigner',
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'address'
      }]
  },[address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+validatorsproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'address';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//getMetadataURL
//getAttestationState
///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
var signers_groups = {};
var subscription = web3ws.eth.subscribe('newBlockHeaders', function(error, result){
    if (!error) {
        //console.log(result);
        //result = JSON.parse(result);
        let eth_blockNumber = '0x'+result.number.toString(16);
        //
        if(Object.keys(signers_groups).length == 0 ||
          result.number % theceloconst.EPOCH_SIZE == 1){
          let signers = getRegisteredValidatorSigners();
          signers.forEach((signer, i) => {
            signers_groups[signer] = getMembershipInLastEpochFromSigner(signer);
          });
        }
        //
        let eth_gasLimit = result.gasLimit;
        let eth_gasUsed = result.gasUsed;
        let eth_group = signers_groups[result.miner];
        var eth_blockdata = {eth_blockNumber,eth_gasLimit,eth_group,eth_gasUsed};
        //console.log(JSON.stringify(eth_blockdata));
        //redis.redis_client.set(theceloconst.eth_blockdata_key,JSON.stringify(eth_blockdata));
        redis.redis_client.publish(theceloconst.eth_blockdata_key,JSON.stringify(eth_blockdata),function(err,result){});
        return;
    }
    console.error(error);
})
.on("connected", function(subscriptionId){
    console.log(subscriptionId);
})
.on("connected", function(subscriptionId){
    console.log(subscriptionId);
})
.on("data", function(blockHeader){
    //console.log(blockHeader);
})
.on("error", console.error);
// unsubscribes the subscription
subscription.unsubscribe(function(error, success){
    if (success) {
        console.log('Successfully unsubscribed!');
    }
});
///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
module.exports = {
  validatorEpochPaymentDistributed,validatorScoreUpdated,
  getRegisteredValidatorGroups,getRegisteredValidatorSigners,getRegisteredValidators,getMembershipInLastEpochFromSigner
}
