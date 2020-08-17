const thecelo = require("./thecelo.utils.js");
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");

var lockgold_goldlocked_topic ='0x0f0f2fc5b4c987a49e1663ce2c2d65de12f3b701ff02b4d09461421e63e609e7';
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
