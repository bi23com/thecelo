const web3wrapper = require('./web3wrapper').default
let web3 = web3wrapper.web3http();
let web3ws = web3wrapper.web3ws();

const thecelo = require("./thecelo.utils.js");
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");

var electionproxy_address = '0x8D6677192144292870907E3Fa8A5527fE55A7ff6';
if('rc1' != thecelo.celo_network){
  electionproxy_address = '0x7eb2b2f696C60A48Afd7632f280c7De91c8E5aa5';
}
//
var fromBlock = 'earliest';
//
var validatorGroupVoteCast_input = [{"type":"address","name":"account","indexed":true},
              {"type":"address","name":"group","indexed":true},
              {"type":"uint256","name":"value","indexed":false}];
var validatorGroupVoteCast = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupVoteCast",
    "inputs":validatorGroupVoteCast_input});
//
var validatorGroupVoteActivated_input = [{"type":"address","name":"account","indexed":true},
              {"type":"address","name":"group","indexed":true},
              {"type":"uint256","name":"value","indexed":false},
              {"type":"uint256","name":"units","indexed":false}];
var validatorGroupVoteActivated = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupVoteActivated",
    "inputs":validatorGroupVoteActivated_input});
//
var validatorGroupActiveVoteRevoked_input = [{"type":"address","name":"account","indexed":true},
              {"type":"address","name":"group","indexed":true},
              {"type":"uint256","name":"value","indexed":false},
              {"type":"uint256","name":"units","indexed":false}];
var validatorGroupActiveVoteRevoked = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupActiveVoteRevoked",
    "inputs":validatorGroupActiveVoteRevoked_input});
//
var validatorGroupPendingVoteRevoked_input = [{"type":"address","name":"account","indexed":true},
          {"type":"address","name":"group","indexed":true},
          {"type":"uint256","name":"value","indexed":false}];
var validatorGroupPendingVoteRevoked = web3.eth.abi.encodeEventSignature({"type":"event","name":"ValidatorGroupPendingVoteRevoked",
    "inputs":validatorGroupPendingVoteRevoked_input});
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
function elected_minimum_votes (cmd,blockNumber) {
  let groups = {};//numMember,activedVotes,pendingVotes
  let rep = thecelo.execCmd(cmd);
  let lines = rep.toString().trim().split('\n');
  lines.forEach( function  (line) {
    if(line.indexOf('0x')==0){
        let pos1 = line.indexOf(' ');
        let pos2 = line.indexOf(' 0x');
        var address = line.substr(0,pos1);
        let name = line.substr(pos1+1,pos2-(pos1+1)).trim();
        let subline = line.substr(pos2+1,line.length);

        let subvalues = subline.split(' ');
        let affiliation = subvalues[0];

        if(groups[affiliation])
          groups[affiliation][0]++;
        else
          groups[affiliation]= [1,0,0];
    }
  });
  //
  Object.keys(groups).forEach((address, i) => {
    let activeVotesForGroup = eth_call_0(electionproxy_address,'getTotalVotesForGroup',address,'uint256',blockNumber);
    groups[address][1] = activeVotesForGroup;
  });
  //
  let min_votes = 1e+50;
  Object.keys(groups).forEach((address, i) => {
    var avg_votes = groups[address][1]/groups[address][0];
    if(avg_votes < min_votes){
        min_votes = avg_votes;
    }
  });
  thecelo.log_out(min_votes);
  return min_votes;
}
//
function latest_epoch_election_votes(){
  let current_epoch = getEpochNumber()-1;
  let fromBlock = '0x'+(theceloconst.EPOCH_SIZE * current_epoch).toString(16);
  let votes = election_vote(fromBlock,"latest",false);
  //celocli election:current
  let prev_epoch_blockNumber = fromBlock;
  let current_elected_minimum_votes = elected_minimum_votes('celocli election:current',prev_epoch_blockNumber);
  let frontrunner_elected_minimum_votes = elected_minimum_votes('celocli election:run','latest');
  //
  let result = {current_elected_minimum_votes,frontrunner_elected_minimum_votes,votes};
  redis.redis_client.set("latest_epoch_election_votes",JSON.stringify(result));
  return result;
}
//
function election_vote(fromBlock = "earliest",toBlock = "latest",redis_set = true){
  //
  var votes = [];
  var voteds = {};
  var voters = {};
  var address = electionproxy_address;
  //
  var topics = [validatorGroupVoteCast];
  var parameters = [{fromBlock,toBlock,address,topics}];
  var result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  op_weight(votes,voteds,voters,result,0);
  //
  topics = [validatorGroupVoteActivated];
  parameters = [{fromBlock,toBlock,address,topics}];
  result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  op_weight(votes,voteds,voters,result,1);
  //
  topics = [validatorGroupActiveVoteRevoked];
  parameters = [{fromBlock,toBlock,address,topics}];
  result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  op_weight(votes,voteds,voters,result,2);
  //
  topics = [validatorGroupPendingVoteRevoked];
  parameters = [{fromBlock,toBlock,address,topics}];
  result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  op_weight(votes,voteds,voters,result,3);
  //
  votes.sort(function compareNumbers(a,b) {return a[3] - b[3];});
  //console.log(JSON.stringify(votes));
  if(redis_set){
    redis.redis_client.set(theceloconst.votes_key,JSON.stringify(votes));
    redis.redis_client.set(theceloconst.voteds_key,JSON.stringify(voteds));
    redis.redis_client.set(theceloconst.voters_key,JSON.stringify(voters));
  }
  return votes;
}
//
function op_weight(votes,voteds,voters,result,flg){
  result.forEach((item, i) => {
    var from = '0x'+(item['topics'][1]).replace('0x000000000000000000000000','');
    var to = '0x'+(item['topics'][2]).replace('0x000000000000000000000000','');
    //
    var cast_weight = 0;
    var activated_weight = 0;
    var activated_revoked_weight = 0;
    var pending_revoked_weight = 0;
    if(flg == 0){
      cast_weight = parseInt(item['data']);
    }
    else if(flg == 1){
      var ret = web3.eth.abi.decodeLog(validatorGroupVoteActivated_input, item['data'], item['topics']);
      activated_weight = ret[2];
    }
    else if(flg == 2){
      var ret = web3.eth.abi.decodeLog(validatorGroupActiveVoteRevoked_input, item['data'], item['topics']);
      activated_revoked_weight = 0 - ret[2];
    }
    else if(flg == 3){
      pending_revoked_weight = 0 - parseInt(item['data']);
    }
    //
    var block = item['blockNumber'];
    var tx = item['transactionHash'];
    //
    var weight = cast_weight + activated_revoked_weight + pending_revoked_weight;
    votes.push([from,to,weight,block,activated_weight,activated_revoked_weight,pending_revoked_weight,cast_weight]);
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
}
//
function eth_call_0(contract,method,address,datatype,blockNumber){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'group'
      }]
  }, [address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "'+blockNumber+'"]');
  //console.log(result);
  return web3.eth.abi.decodeParameter(datatype, result);
}
//
function eth_call_1(contract,method,address,value,datatype,blockNumber){
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
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "'+blockNumber+'"]');
  return web3.eth.abi.decodeParameter(datatype, result);
}
//
function getGroupVotesStatus(group,blockNumber='latest'){
  console.log(electionproxy_address);
  var totalVotesForGroup = eth_call_0(electionproxy_address,'getTotalVotesForGroup',group,'uint256',blockNumber);
  var activeVoteUnitsForGroup = eth_call_0(electionproxy_address,'getActiveVoteUnitsForGroup',group,'uint256',blockNumber);
  var activeVotesForGroup = eth_call_0(electionproxy_address,'getActiveVotesForGroup',group,'uint256',blockNumber);
  var pendingVotesForGroup = eth_call_0(electionproxy_address,'getPendingVotesForGroup',group,'uint256',blockNumber);
  var groupEligibility = eth_call_0(electionproxy_address,'getGroupEligibility',group,'uint256',blockNumber);
  var canReceiveVotes = eth_call_1(electionproxy_address,'canReceiveVotes',group,1,'uint256',blockNumber);
  var numVotesReceivable = eth_call_0(electionproxy_address,'getNumVotesReceivable',group,'uint256',blockNumber);
  return {totalVotesForGroup,activeVoteUnitsForGroup,activeVotesForGroup,pendingVotesForGroup,groupEligibility,canReceiveVotes,numVotesReceivable};
}
//
function getEpochNumber(){
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'getEpochNumber',
      type: 'function',
      inputs: []
  },[]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+electionproxy_address+'", "data":"'+data+'"}, "latest"]');
  var datatype = 'uint256';
  result = web3.eth.abi.decodeParameter(datatype, result);
  return result;
}
//
async function getGroupEpochVotes(address){
  var groupvotes = {};
  var epoch  = 1;
  var key = 'getGroupEpochVotes_'+address;
  var value = await redis.get_redis_data(key);
  if(value&&value.length>0){
    groupvotes = JSON.parse(value);
    epoch = Math.max.apply(null, Object.keys(groupvotes));
    console.log(epoch);
  }
  var current_epoch = getEpochNumber();
  for(;epoch<=current_epoch;epoch++){
    var blockNumber = '0x'+(theceloconst.EPOCH_SIZE * epoch).toString(16);
    if(epoch==current_epoch) blockNumber = 'latest';
    var result = getGroupVotesStatus(address,blockNumber);
    groupvotes[epoch] = result;
  }
  redis.redis_client.set(key,JSON.stringify(groupvotes));
  return groupvotes;
}
//
function epochRewardsDistributedToVoters(group){
  var fromBlock = "earliest";
  var toBlock = "latest";
  //
  var input = [{"type":"address","name":"group","indexed":true},
            {"type":"uint256","name":"value","indexed":false}];
  var event_topic = web3.eth.abi.encodeEventSignature({"type":"event","name":"EpochRewardsDistributedToVoters",
      "inputs":input});
  var address = web3.eth.abi.encodeParameter('address', group);
  var topics = [event_topic,address];
  var parameters = [{fromBlock,toBlock,electionproxy_address,topics}];
  var result = thecelo.eth_rpc('eth_getLogs',JSON.stringify(parameters));
  //
  var epoch_rewards={};
  result.forEach((item, i) => {
    epoch_rewards[Math.ceil(item.blockNumber/theceloconst.EPOCH_SIZE)] = parseInt(item.data);
  });
  return epoch_rewards;
}
//
function web3_subscription(){
  var subscription = web3ws.eth.subscribe('logs', {
      address: '0x123456..',
      topics: ['0x12345...']
  }, function(error, result){
      if (!error)
          console.log(result);
  });
  // unsubscribes the subscription
  subscription.unsubscribe(function(error, success){
      if(success)
          console.log('Successfully unsubscribed!');
  });
}

//
module.exports = {
  election_vote,getGroupVotesStatus,epochRewardsDistributedToVoters,getGroupEpochVotes,getEpochNumber,latest_epoch_election_votes
}
