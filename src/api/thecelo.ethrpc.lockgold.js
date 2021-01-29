const thecelo = require("./thecelo.utils.js");
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");
//
var fromBlock = 'earliest';
//
var votes = {};
var voteds = {};
var voters = {};
//
/*
redis.redis_client.get(votes_key, function(err, data) {
  if(!err && data){
    var obj = JSON.parse(data);
    toBlock =  obj.toBlock;
    votes =  obj.votes;
  }
}
*/
//
function election_vote(){
  var result = thecelo.eth_rpc('eth_getLogs',
    '[{"fromBlock": "earliest","toBlock":"latest","address":"'+electionproxy_address+'","topics":["'+electionproxy_vote_topic+'"]}]');
  //
  votes.splice(0,votes.length);
  voteds.splice(0,voteds.length);
  voters.splice(0,voters.length);
  //
  result.forEach((item, i) => {
    var from = '0x'+(item['topics'][1]).replace('0x000000000000000000000000','');
    var to = '0x'+(item['topics'][2]).replace('0x000000000000000000000000','');
    var weight = parseInt(item['data']);
    var block = item['blockNumber'];
    var tx = item['transactionHash'];
    //
    votes.push({from,to,weight,block});
    //
    if(voteds[to]){
      if(voteds[to][from])
        voteds[to][from].weight += weight;
      else
        voteds[to][from] = {weight};
    }
    else{
      var voted = {};
      voted[from] = {weight};
      voteds[to] = voted;
    }
    //
    if(voters[from]){
      if(voters[from][to])
        voters[from][to].weight += weight;
      else
        voters[from][to] = {weight};
    }
    else{
      var voter = {};
      voter[to] = {weight};
      voters[from] = voter;
    }
  });
  //
  redis.redis_client.set(theceloconst.votes_key,JSON.stringify(votes));
  redis.redis_client.set(theceloconst.voteds_key,JSON.stringify(voteds));
  redis.redis_client.set(theceloconst.voters_key,JSON.stringify(voters));
}
////////////////////////////////////////////////////
////////////////////////////////////////////////////
////////////////////////////////////////////////////
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
var validatorsproxy_address = '0xaEb865bCa93DdC8F47b8e29F40C5399cE34d0C58';
if('rc1' != thecelo.celo_network){
  validatorsproxy_address = '0xcb3A2f0520edBb4Fc37Ecb646d06877E339bBC9D';
}
var lockedGold_proxy_address = '0x6cC083Aed9e3ebe302A6336dBC7c921C9f03349E';
if('rc1' != thecelo.celo_network){
  lockedGold_proxy_address = '0xF07406D8040fBD831e9983CA9cC278fBfFeB56bF';
}
//
function signerToAccount(address){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'signerToAccount',
      type: 'function',
      inputs: [{type: 'address',name: 'account'}]
  },[address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "0x7d21685C17607338b313a7174bAb6620baD0aaB7", "data":"'+data+'"}, "latest"]');
  var datatype = 'address';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getAccountLockedGoldRequirement(address){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getAccountLockedGoldRequirement',
      type: 'function',
      inputs: [{type: 'address',name: 'account'}]
  },[address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+validatorsproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'uint256';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getAccountTotalLockedGold(address){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getAccountTotalLockedGold',
      type: 'function',
      inputs: [{type: 'address',name: 'account'}]
  },[address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+lockedGold_proxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'uint256';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
function getAccountNonvotingLockedGold(address){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getAccountNonvotingLockedGold',
      type: 'function',
      inputs: [{type: 'address',name: 'account'}]
  },[address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+lockedGold_proxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'uint256';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
let transfer_method = web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)');
console.log('transfer_method:'+transfer_method);
  let address='0x07fa1874ad4655AD0C763a7876503509be11e29E';
  let account = signerToAccount(address);
  console.log(account);
  let requirement = getAccountLockedGoldRequirement(address);
  requirement = (requirement/1e+18).toFixed(2);
  let totalLocked = getAccountTotalLockedGold(address);
  totalLocked = (totalLocked/1e+18).toFixed(2);
  let nonvotingLocked = getAccountNonvotingLockedGold(address);
  nonvotingLocked = (nonvotingLocked/1e+18).toFixed(2);
  console.log(JSON.stringify({requirement,totalLocked,nonvotingLocked}));
