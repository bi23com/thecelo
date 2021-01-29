const thecelo = require("./thecelo.utils.js");
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(thecelo.http_host))
//
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");

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
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+theceloconst.Contracts.Validators+'","topics":["'+validatorgroup_register_topic+'"]}]');

}
//
function validator_register_topic(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+theceloconst.Contracts.Validators+'","topics":["'+validator_register_topic+'"]}]');
}
//
function validatorgroup_member(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+theceloconst.Contracts.Validators+'","topics":["'+validatorgroup_member_topic+'"]}]');
}
//
function validatorEpochPaymentDistributed(validator,group = ''){
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
  var group1 = null;
  if(group && group.trim().length > 0)
    group1 = web3.eth.abi.encodeParameter('address', group);
  var topics = [validatorEpochPaymentDistributed,validator1,group1];
  var address = theceloconst.Contracts.Validators;
  var parameters = [{fromBlock,toBlock,address,topics}];
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
  var address = theceloconst.Contracts.Validators;
  var parameters = [{fromBlock,toBlock,address,topics}];
  var result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
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
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.Validators+'", "data":"'+data+'"}, "latest"]');
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
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.Validators+'", "data":"'+data+'"}, "latest"]');
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
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.Validators+'", "data":"'+data+'"}, "latest"]');
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
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.Validators+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'address';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
module.exports = {
  validatorEpochPaymentDistributed,validatorScoreUpdated,
  getRegisteredValidatorGroups,getRegisteredValidatorSigners,getRegisteredValidators,getMembershipInLastEpochFromSigner
}
