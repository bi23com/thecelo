const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://xxx.xxx.xxx.xxx:8545'))

const thecelo = require("./thecelo.utils.js");

var input = [{"type":"address","name":"account","indexed":true},{"type":"address","name":"group","indexed":true},{"type":"uint256","name":"value","indexed":false},{"type":"uint256","name":"units","indexed":false}];
var topics =  ["0xae7458f8697a680da6be36406ea0b8f40164915ac9cc40c0dad05a2ff6e8c6a8","0x000000000000000000000000b2e5fb92d905f3c9cf50800b6212600c7e220d6b","0x00000000000000000000000007fa1874ad4655ad0c763a7876503509be11e29e"];
var data = '0x000000000000000000000000000000000000000000000cea2a85d7ba33700000000000000000000000000000000045f18d8bef7a599ca4fcd103fc9123876dd2';
//console.log(web3.eth.abi.decodeLog(input, data, topics));

//vote
//activate
//revokeAllActive
//revokePending

function eth_call(contract,method,address,datatype){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'group'
      }]
  }, [address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "latest"]');
  return web3.eth.abi.decodeParameter(datatype, result);
}
//
function eth_call_0(contract,method,group,account,datatype){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'group'
      },{
          type: 'address',
          name: 'account'
      }]
  }, [group,account]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "latest"]');
  return web3.eth.abi.decodeParameter(datatype, result);
}
//
function eth_call_1(contract,method,address,value,datatype){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'group'
      },{
          type: 'uint256',
          name: 'value'
      }]
  }, [address,value]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "latest"]');
  return web3.eth.abi.decodeParameter(datatype, result);
}
//revokeActive
var contract = '0x7457F05389Bb197e3695E85994DE4b91F16B97Db';
var group = '0x0b04c6ca6f2eA2C57D51C28Bb3E82b0c9B4072Eb';//'0x07fa1874ad4655AD0C763a7876503509be11e29E';//'0x9eB1D96B5f0bdD3114eA1461182c688178ae6c4c';
/*
var totalVotesForGroup = eth_call(contract,'getTotalVotesForGroup',group,'uint256');
var activeVoteUnitsForGroup = eth_call(contract,'getActiveVoteUnitsForGroup',group,'uint256');
var activeVotesForGroup = eth_call(contract,'getActiveVotesForGroup',group,'uint256');
var pendingVotesForGroup = eth_call(contract,'getPendingVotesForGroup',group,'uint256');
var groupEligibility = eth_call(contract,'getGroupEligibility',group,'uint256');
var canReceiveVotes = eth_call_1(contract,'canReceiveVotes',group,303590200,'uint256');
var numVotesReceivable = eth_call(contract,'getNumVotesReceivable',group,'uint256');
*/
var account = '0x0e7F5e44ee4F6edE5fd5a32c9E65bC041b25E2F1';
//var totalVotesForGroupByAccount = eth_call_0(contract,'getTotalVotesForGroupByAccount',group,account,'uint256');

function getGroupEpochRewards(contract,method,address,totalEpochRewards,uptimes,datatype){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'group'
      },{
          type: 'uint256',
          name: 'totalEpochRewards'
      },{
          type: 'uint256[] calldata',
          name: 'uptimes'
      },
    ]
  }, [address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "latest"]');
  return web3.eth.abi.decodeParameter(datatype, result);
}
var groupEpochRewards = 0;
 //groupEpochRewards = getGroupEpochRewards(contract,'getGroupEpochRewards',group,35,[100],'uint256');

//console.log({totalVotesForGroup,activeVoteUnitsForGroup,activeVotesForGroup,pendingVotesForGroup,groupEligibility,groupEpochRewards,canReceiveVotes,numVotesReceivable,totalVotesForGroupByAccount});

//ValidatorGroupActiveVoteRevoked
var electionproxy_voterevoked_topic ='["0xae7458f8697a680da6be36406ea0b8f40164915ac9cc40c0dad05a2ff6e8c6a8","0x0000000000000000000000000e7f5e44ee4f6ede5fd5a32c9e65bc041b25e2f1"]';
result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "earliest","toBlock":"latest","address":"'+contract+'","topics":'+electionproxy_voterevoked_topic+'}]');
//console.log(result);
/////////////////////////////////////////////////
/////////////////////////////////////////////////
var method = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupPendingVoteRevoked",
    "inputs":[{"type":"address","name":"account","indexed":true},
              {"type":"address","name":"group","indexed":true},
              {"type":"uint256","name":"value","indexed":false}]});
var address = '0x0e7F5e44ee4F6edE5fd5a32c9E65bC041b25E2F1';
address = web3.eth.abi.encodeParameter('address', address);
var topics = [method,address];

var fromBlock = "earliest";
var toBlock = "latest";
var address = contract;
var parameters = [{fromBlock,toBlock,address,topics}];
result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
var method = web3.eth.abi.encodeEventSignature({"type":"event","name":"EpochRewardsDistributedToVoters",
    "inputs":[{"type":"address","name":"group","indexed":true},{"type":"uint256","name":"value","indexed":false}]});
var address = '0x07fa1874ad4655AD0C763a7876503509be11e29E';
address = web3.eth.abi.encodeParameter('address', address);
var topics = [method,address];
var parameters = [{fromBlock,toBlock,contract,topics}];
result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
//console.log(result);
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////


method = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupActiveVoteRevoked",
    "inputs":[{"type":"address","name":"account","indexed":true},
              {"type":"address","name":"group","indexed":true},
              {"type":"uint256","name":"value","indexed":false},
              {"type":"uint256","name":"units","indexed":false}]});
topics = [method,address];
var str = '[{"fromBlock": "earliest","toBlock":"latest","address":"'+contract+'","topics":'+JSON.stringify(topics)+'}]';
//console.log(str);
result = thecelo.eth_rpc('eth_getLogs',str);
//console.log(result);
/////////////////////////////////////////////////
/////////////////////////////////////////////////

var result = web3.eth.abi.encodeFunctionSignature('revokeActive(address, uint256, address, address, uint256)');
//console.log(result);
var result = web3.eth.abi.encodeFunctionSignature('revokeAllActive(address, address, address, uint256)');
//console.log(result);
var result = web3.eth.abi.encodeFunctionSignature('revokePending(address, uint256, address, address, uint256)');
//console.log(result);
const election = require("./thecelo.ethrpc.election.js");
const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
var groups = validatorsproxy.getRegisteredValidatorGroups();
groups.forEach((item, i) => {
  election.getGroupEpochVotes(item);
});

//
