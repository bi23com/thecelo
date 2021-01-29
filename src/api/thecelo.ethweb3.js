const thecelo = require("./thecelo.utils.js");
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(thecelo.http_host))

const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
function getAccountInfo(contract,method,address,datatype){
  var data = web3.eth.abi.encodeFunctionCall({
      name: method,
      type: 'function',
      inputs: [{
          type: 'address',
          name: 'account'
      }]
  }, [address]);
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+contract+'", "data":"'+data+'"}, "latest"]');
  //console.log(contract+':'+method+':'+result);
  return web3.eth.abi.decodeParameter(datatype, result);
}
//
function getAccount(address){
  var name = getAccountInfo(theceloconst.Contracts.Accounts,'getName',address,'string');
  if(name.indexOf('cLabs')!==-1){
    name = name.split(' ')[0];
  }
  var metadataURL = getAccountInfo(theceloconst.Contracts.Accounts,'getMetadataURL',address,'string');
  //thecelo.log_out(metadataURL);
  var lockedGold = getAccountInfo(theceloconst.Contracts.LockedGold,'getAccountTotalLockedGold',address,'uint256');
  //thecelo.log_out(lockedGold);
  var nonVotingLockedGold = getAccountInfo(theceloconst.Contracts.LockedGold,'getAccountNonvotingLockedGold',address,'uint256');
  //thecelo.log_out(nonVotingLockedGold);
  var pendingWithdrawals = getAccountInfo(theceloconst.Contracts.LockedGold,'getTotalPendingWithdrawals',address,'uint256');
  //thecelo.log_out(pendingWithdrawals);
  return {name,lockedGold,nonVotingLockedGold,pendingWithdrawals,metadataURL};
}
//
function getTotalData(blockNum){
  var method = '0x30a61d59';//getTotalLockedGold
  var totalLockedGold = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.LockedGold+'", "data":"'+method+'"}, "'+blockNum+'"]');
  totalLockedGold = totalLockedGold/(1e+18);
  method = '0x807876b7';//getNonvotingLockedGold
  var nonvotingLockedGold = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.LockedGold+'", "data":"'+method+'"}, "'+blockNum+'"]');
  nonvotingLockedGold = nonvotingLockedGold/(1e+18);
  //method = '0x9a0e7d66';//getTotalVotes
  //var totalVotes = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.LockedGold+'", "data":"'+method+'"}, "'+blockNum+'"]');
  //totalVotes = totalVotes/(1e+18);
  totalVotes = totalLockedGold - nonvotingLockedGold;
  //
  var cgldSupply = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.GoldToken+'", "data":"'+theceloconst.totalSupplyCode+'"}, "'+blockNum+'"]');
  cgldSupply = cgldSupply/(1e+18);
  //
  var cusdSupply = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.StableToken+'", "data":"'+theceloconst.totalSupplyCode+'"}, "'+blockNum+'"]');
  cusdSupply = cusdSupply/(1e+18);
  //
  var result = {cgldSupply,cusdSupply,totalLockedGold,totalVotes,nonvotingLockedGold};
  thecelo.log_out(JSON.stringify(result));
  return result;
}
//
function getTotalDataHistory(){
  thecelo.log_out('getTotalDataHistory begin...');
  var eth_blockNumber = thecelo.eth_rpc('eth_blockNumber','[]','');
  var total_epoch = Math.ceil(eth_blockNumber/theceloconst.EPOCH_SIZE);
  var totalLockedGoldHistory = {};
  for(var epoch = 1 ; epoch <= total_epoch ;epoch ++ ){
    var blockNum = '0x'+(epoch*theceloconst.EPOCH_SIZE).toString(16);
    if(epoch*theceloconst.EPOCH_SIZE>eth_blockNumber){
      blockNum = 'latest';
    }
    thecelo.log_out(blockNum);
    totalLockedGoldHistory[epoch]  = getTotalData(blockNum);
  }
  var str = JSON.stringify(totalLockedGoldHistory);
  thecelo.log_out(str);
  redis.redis_client.set(theceloconst.lockedGoldHistory_key,str);
  thecelo.log_out('getTotalDataHistory end...');
}
//
//getTotalDataHistory();
//var account = getAccount('0xf823E8A4BA6adddb02E97B5b8886D18e41b2723e');
//thecelo.log_out(JSON.stringify(account));
//
//
let getPastLogs = function (fromBlock,toBlock,topics,contracts){
  return new Promise(function(resolve, reject){

    web3.eth.getPastLogs({
      fromBlock: fromBlock,
      toBlock: toBlock,
      address: contracts,
      topics: topics},
      function(err, data) {
        if(err){reject(err);}else{resolve(data);}
      })
    })
  }
let call = function (block,contract,data){
  return new Promise(function(resolve, reject){
    web3.eth.defaultBlock = block;
    web3.eth.call({
      to:contract,
      data:data},
      function(err, data) {
        if(err){reject(err);}else{resolve(data);}
      })
      web3.eth.defaultBlock = 'latest'
    })
  }
let getBlock = function (blockHashOrBlockNumber){
  return new Promise(function(resolve, reject){
    web3.eth.getBlock(blockHashOrBlockNumber,
      function(err, data) {
        if(err){reject(err);}else{resolve(data);}
      })
    })
  }
let getBlockNumber = function (){
  return new Promise(function(resolve, reject){
    web3.eth.getBlockNumber(
      function(err, data) {
        if(err){reject(err);}else{resolve(data);}
      })
    })
  }
//
module.exports = {
       getAccountInfo,getAccount,
       getTotalDataHistory,
       getPastLogs,call,getBlock,getBlockNumber
     }
/*
let topics = ["0x0b5629fec5b6b5a1c2cfe0de7495111627a8cf297dced72e0669527425d3f01b","0x000000000000000000000000d5fb8a8e6e81bc77d7d807c05b5b8aeae7c2a458"];
let data = 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008368747470733a2f2f676973742e67697468756275736572636f6e74656e742e636f6d2f6762756e65612f39343463353163326263363561653361326538343437646239333563396161362f7261772f333138313538353736343133383262386463366436376639363032626133613261376438336436352f6d657461646174615f56310000000000000000000000000000000000000000000000000000000000";

console.log(web3.eth.abi.decodeLog("string", data, topics,metadataURL));

let blockNum = 0

let run = async () => {
  let addresses = {}

  while (true) {
    let blck = blockNum++
    let block = await web3.eth.getBlock(blck)
    if (!block)
      break

    console.log('block', blck, 'transactions', block.transactions.length)
    for(let i = 0; i < block.transactions.length; i++) {
      let tx = await web3.eth.getTransaction(block.transactions[i])
      if (parseInt(tx.value) > 0) {
        addresses[tx.to] = true
      }
    }
  }

  let positiveAddresses = []
  for (address in addresses) {
    try {
      let balance = await web3.eth.getBalance(address)
      if (balance > 0) {
        positiveAddresses.push(address)
      }
    } catch (err) {
      console.log(err)
    }
  }
  console.log(positiveAddresses)
}

run()
*/
