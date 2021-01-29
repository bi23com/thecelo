const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const ethrpc_logs = require("./thecelo.ethrpc.getlogs.js");
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider(thecelo.ws_host));
const redis = require("./thecelo.redis.js");

const theceloreminder = require("./thecelo.reminder.js");

let thecelo_attestations = require("./thecelo.attestations.js");
let thecelo_exchange = require("./thecelo.ethrpc.exchange.js");
let validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
let thecelo_election = require("./thecelo.ethrpc.election.js");
let thecelo_governance = require("./thecelo.ethrpc.governance.js");

///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
var subscription = web3.eth.subscribe('pendingTransactions', function(error, result){
    if (!error){
        //thecelo.log_out(result);
      }
})
.on("data", function(transaction){
    console.log(transaction);
});
// unsubscribes the subscription
subscription.unsubscribe(function(error, success){
    if(success)
        console.log('Successfully unsubscribed!');
});

///////////////////////////////////////////////
////////////LockedGold begin///////////////////////
///////////////////////////////////////////////
//https://web3js.readthedocs.io/en/v1.2.11/web3-eth-abi.html#decodelog
subscribe_logs()
subscribe_newBlockHeaders()
//
let logs_blockNumber = {};
async function subscribe_logs(){
  var subscription_logs = web3.eth.subscribe('logs', {
    address: null,
    topics: null
  }, async function(error, result){
      if (!error){
        let log = await ethrpc_logs.item_log(result);
        if(log && log.value >= 10000 && log.item.length > 0){
          //telegram bot
          theceloreminder.remind_logs(log.item);
        }
        //
        let name = thecelo.findKey(theceloconst.Contracts,result.address);
        if(name == undefined) name = result.address
        console.log([name,result.blockNumber])
        ////////////////////////////////////////
        ////////////////////////////////////////
        if(logs_blockNumber.exchange != result.blockNumber &&
          result.address.toLowerCase() == theceloconst.Contracts.Exchange.toLowerCase()){
          thecelo_exchange.getBuyAndSellBuckets(theceloconst.Contracts.Exchange);
          thecelo_exchange.get_exchange_history();
          logs_blockNumber.exchange = result.blockNumber
        }
        ////////////////////////////////////////
        ////////////////////////////////////////
        if(logs_blockNumber.governance != result.blockNumber &&
          result.address.toLowerCase() == theceloconst.Contracts.Governance.toLowerCase()){
          thecelo_governance.update_proposalList()
          logs_blockNumber.governance = result.blockNumber
        }
        ////////////////////////////////////////
        ////////////////////////////////////////
        if(logs_blockNumber.election != result.blockNumber &&
          result.address.toLowerCase() == theceloconst.Contracts.Election.toLowerCase()){
          thecelo_election.election_vote()
          thecelo_election.latest_epoch_election_votes()
          logs_blockNumber.election = result.blockNumber
        }
        ////////////////////////////////////////
        ////////////////////////////////////////
        if(logs_blockNumber.attestations != result.blockNumber &&
          result.address.toLowerCase() == theceloconst.Contracts.Attestations.toLowerCase()){
          thecelo_attestations.getAttestationLogs()
          logs_blockNumber.attestations = result.blockNumber
        }
        ////////////////////////////////////////
        ////////////////////////////////////////
      }
  })
  .on("connected", function(subscriptionId){
      console.log(subscriptionId);
  })
  .on("data", function(log){
      console.log('data:'+log);
  })
  .on("changed", function(log){
  });
  // unsubscribes the subscription
  subscription_logs.unsubscribe(function(error, success){
      if(success)
          console.log('Successfully unsubscribed!');
  });
}

///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
var signers_groups = {};
function subscribe_newBlockHeaders(){
  var subscription = web3.eth.subscribe('newBlockHeaders', function(error, result){
      if (!error) {
          let eth_blockNumber = '0x'+result.number.toString(16);
          //
          if(Object.keys(signers_groups).length == 0 ||
            result.number % theceloconst.EPOCH_SIZE == 1){
            let signers = validatorsproxy.getRegisteredValidatorSigners();
            signers.forEach((signer, i) => {
              signers_groups[signer] = validatorsproxy.getMembershipInLastEpochFromSigner(signer);
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
          //
          thecelo_exchange.update_exchange_prices()
          //
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
}
///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
