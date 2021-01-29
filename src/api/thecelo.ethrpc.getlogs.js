const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const theceloaccount = require("./thecelo.ethrpc.account.js");
//
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(thecelo.http_host))
const ethweb3 = require("./thecelo.ethweb3.js");
//
async function item_log(result){
  //
  let item = [];//type,blockNumber,timestamp,transactionHash,from,to,value
  //thecelo.log_out(JSON.stringify(result));
  let block = await ethweb3.getBlock(result.blockNumber);
  let timestamp = parseInt(block.timestamp);
  //
  let value = 0;
  //
    if(result.topics[0]==theceloconst.methods.transfer_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.transfer_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      ///////
      if(log.from != theceloconst.Contracts.Exchange && log.to != theceloconst.Contracts.Exchange &&
        log.from != '0x0000000000000000000000000000000000000000' && log.to != '0x0000000000000000000000000000000000000000' &&
        log.from != theceloconst.Contracts.Reserve && log.to != theceloconst.Contracts.Reserve){
        value = parseInt(log.value)/1e+18;
        let coin_name = 'CELO';
        if(result.address == theceloconst.Contracts.StableToken) coin_name = 'cUSD';
        let from = await theceloaccount.getName(log.from);
        let to = await theceloaccount.getName(log.to);
        item = ['Transfer',result.blockNumber,timestamp,result.transactionHash,[log.from,from],[log.to,to],value,coin_name];
      }
    }
    else if(result.topics[0]==theceloconst.methods.unlock_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.unlock_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      value = parseInt(log.value)/1e+18;
      let available = parseInt(log.available)/1e+18;
      let account = await theceloaccount.getName(log.account);
      item = ['Unlock',result.blockNumber,timestamp,result.transactionHash,[log.account,account],'',value,available];
    }
    //GoldLocked
    else if(result.topics[0]==theceloconst.methods.goldLocked_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.goldLocked_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      value = parseInt(log.value)/1e+18;
      let account = await theceloaccount.getName(log.account);
      item = ['Locked',result.blockNumber,timestamp,result.transactionHash,[log.account,account],'',value];
    }
    //GoldRelocked
    else if(result.topics[0]==theceloconst.methods.goldRelocked_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.goldRelocked_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      value = parseInt(log.value)/1e+18;
      let account = await theceloaccount.getName(log.account);
      item = ['Relocked',result.blockNumber,timestamp,result.transactionHash,[log.account,account],'',value];
    }
    //GoldWithdrawn
    else if(result.topics[0]==theceloconst.methods.goldWithdrawn_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.goldWithdrawn_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      value = parseInt(log.value)/1e+18;
      let account = await theceloaccount.getName(log.account);
      item = ['Withdrawn',result.blockNumber,timestamp,result.transactionHash,[log.account,account],'',value];
    }
    //Exchanged(address indexed exchanger, uint256 sellAmount, uint256 buyAmount, bool soldGold)
    else if(result.topics[0]==theceloconst.methods.exchange_method){
      let exchanger = web3.eth.abi.decodeParameter('address', result.topics[1]);
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.exchange_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let sellAmount = parseInt(log.sellAmount)/1e+18;
      let minBuyAmount = parseInt(log.minBuyAmount)/1e+18;
      value = sellAmount > minBuyAmount ? sellAmount : minBuyAmount;
      let name = await theceloaccount.getName(exchanger);
      item  = ['Exchange',result.blockNumber,timestamp,result.transactionHash,[exchanger,name],'',sellAmount,minBuyAmount,log.sellGold];
    }
  //Election
    //ValidatorGroupVoteCast(address indexed account, address indexed group, uint256 value)
    else if(result.topics[0]==theceloconst.methods.validatorGroupVoteCast_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.validatorGroupVoteCast_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let account = await theceloaccount.getName(log.account);
      let group = await theceloaccount.getName(log.group);
      value = parseInt(log.value)/1e+18;
      item = ['Vote',result.blockNumber,timestamp,result.transactionHash,[log.account,account],[log.group,group],value];
    }
    //ValidatorGroupVoteActivated(address indexed account,address indexed group,uint256 value,uint256 units)
    else if(result.topics[0]==theceloconst.methods.validatorGroupVoteActivated_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.validatorGroupVoteActivated_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let account = await theceloaccount.getName(log.account);
      let group = await theceloaccount.getName(log.group);
      value = parseInt(log.value)/1e+18;
      item = ['VoteActivated',result.blockNumber,timestamp,result.transactionHash,[log.account,account],[log.group,group],value,log.units];
    }
    //ValidatorGroupActiveVoteRevoked(address indexed account,address indexed group,uint256 value,uint256 units)
    else if(result.topics[0]==theceloconst.methods.validatorGroupActiveVoteRevoked_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.validatorGroupActiveVoteRevoked_input,
        result.data,
        [result.topics[1],result.topics[2]]);//An array with the index parameter topics of the log, without the topic[0] if its a non-anonymous event, otherwise with topic[0].
      let account = await theceloaccount.getName(log.account);
      let group = await theceloaccount.getName(log.group);
      value = parseInt(log.value)/1e+18;
      item = ['ActiveVoteRevoked',result.blockNumber,timestamp,result.transactionHash,[log.account,account],[log.group,group],value,log.units];
    }
    //ValidatorGroupPendingVoteRevoked(address indexed account,address indexed group,uint256 value,uint256 units)
    else if(result.topics[0]==theceloconst.methods.validatorGroupPendingVoteRevoked_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.validatorGroupPendingVoteRevoked_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let account = await theceloaccount.getName(log.account);
      let group = await theceloaccount.getName(log.group);
      value = parseInt(log.value)/1e+18;
      item = ['PendingVoteRevoked',result.blockNumber,timestamp,result.transactionHash,[log.account,account],[log.group,group],value,log.units];
    }
    //////////////////////////////
    else if(result.topics[0]==theceloconst.methods.ProposalQueued_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.ProposalQueued_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let proposer = await theceloaccount.getName(log.proposer);
      item = ['Queued',result.blockNumber,timestamp,result.transactionHash,log.proposalId,theceloconst.governance_items_info[log.proposalId],[log.proposer,proposer],parseInt(log.transactionCount)/1e+18,log.deposit,log.timestamp];
    }
    //
    else if(result.topics[0]==theceloconst.methods.ProposalUpvoted_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.ProposalUpvoted_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      value = parseInt(log.upvotes)/1e+18
      let upvotes = (parseInt(log.upvotes)/1e+18).toFixed(2)+' CELO'
      let account = await theceloaccount.getName(log.account);
      item = ['Upvoted',result.blockNumber,timestamp,result.transactionHash,log.proposalId,theceloconst.governance_items_info[log.proposalId],[log.account,account],upvotes];
    }
    //
    else if(result.topics[0]==theceloconst.methods.ProposalUpvoteRevoked_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.ProposalUpvoteRevoked_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let revokedUpvotes = (parseInt(log.revokedUpvotes)/1e+18).toFixed(2)+' CELO'
      let account = await theceloaccount.getName(log.account);
      value = parseInt(log.revokedUpvotes)/1e+18;
      item = ['UpvoteRevoked',result.blockNumber,timestamp,result.transactionHash,log.proposalId,theceloconst.governance_items_info[log.proposalId],[log.account,account],revokedUpvotes];
    }
    //
    else if(result.topics[0]==theceloconst.methods.ProposalVoted_method){
      let log = web3.eth.abi.decodeLog(
        theceloconst.inputs.ProposalVoted_input,
        result.data,
        [result.topics[1],result.topics[2]]);
      let yesno = theceloconst.governance_vote_values[log.value-1];
      let account = await theceloaccount.getName(log.account);
      value = parseInt(log.weight)/1e+18
      item = ['Voted',result.blockNumber,timestamp,result.transactionHash,log.proposalId,theceloconst.governance_items_info[log.proposalId],[log.account,account],yesno,value];
    }
  return {value,item};
}
//
async function getlogs(address,pageNum,pageCount,type=''){
  address = web3.eth.abi.encodeParameter('address',address);
  let contracts = [
    theceloconst.Contracts.Accounts,
    theceloconst.Contracts.Attestations,
    theceloconst.Contracts.Election,
    theceloconst.Contracts.EpochRewards,
    theceloconst.Contracts.Exchange,
    theceloconst.Contracts.GoldToken,
    theceloconst.Contracts.Governance,
    theceloconst.Contracts.LockedGold,
    theceloconst.Contracts.StableToken,
    theceloconst.Contracts.Validators
  ];
  let topics = [null,address];
  //
  let logs_records = {};
  //
  if(type=='transfer'){
    contracts = [theceloconst.Contracts.GoldToken,theceloconst.Contracts.StableToken];
    //
    let otherTopics = [null,null,address]
    logs_records = await get_logs(topics,contracts,pageNum,pageCount,otherTopics);
  }
  else {
    if(type=='accounts')
      contracts = [theceloconst.Contracts.Accounts];
    else if(type=='governance'){
      contracts = [theceloconst.Contracts.Governance];
      topics = [null,null,address];
    }
    else if(type=='locked')
      contracts = [theceloconst.Contracts.LockedGold];
    else if(type=='validator')
      contracts = [theceloconst.Contracts.Election,theceloconst.Contracts.EpochRewards,theceloconst.Contracts.Validators];
    else if(type=='exchange')
      contracts = [theceloconst.Contracts.Exchange];
    else if(type=='attestations')
      contracts = [theceloconst.Contracts.Attestations];
    //
    logs_records = await get_logs(topics,contracts,pageNum,pageCount);
  }
  //console.log(tx_logs)
  return logs_records;
}
//
async function get_transfer_logs(accounts = null){
  let logs = []
  let timestamp = new Date().getTime()
  let contracts = [theceloconst.Contracts.GoldToken,theceloconst.Contracts.StableToken]
  let topics = [theceloconst.methods.transfer_method]
  if(accounts != null){
    accounts = web3.eth.abi.encodeParameter('address',accounts)
    topics.push(accounts)
  }
  let to = await ethweb3.getBlockNumber();
  let from = to - theceloconst.EPOCH_SIZE*10;
  while(from > 0){
    //console.log({from,to,topics,contracts})
    try{
      //let result = await ethweb3.getPastLogs(from,to,topics,contracts);
      ///////////////////////////////
      let fromBlock = '0x'+from.toString(16)
      let toBlock = '0x'+to.toString(16)
      let address = contracts;
      let params = {fromBlock,toBlock,address,topics}
      params = '['+JSON.stringify(params)+']';
      //console.log(params)
      let result = thecelo.eth_rpc('eth_getLogs',params);
      ///////////////////////////////
      result.forEach(async(item, i)=>{
        let log = await item_log(item);
        log = log.item
        logs.push.apply(logs,log);
      });
    }
    catch(err){
      console.log(err)
    }
    to = from - 1;
    from = to - theceloconst.EPOCH_SIZE * 10;
    if(to > 0 &&from < 0)
      from = 1;
  }
  timestamp = new Date().getTime() - timestamp
  return [timestamp,logs.length]
}
//
async function get_logs(topics,contracts,pageNum,pageCount,otherTopics=[]){
  let logs_records = [];
  let loop_count = 0;
  let hasNextPage = false;
  //address = web3.eth.abi.encodeParameter('address',address);
  //let result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "earliest","toBlock":"latest","topics":[null,"'+address+'"]}]');
  let to = await ethweb3.getBlockNumber();
  let from = to - theceloconst.EPOCH_SIZE*10;
  while(logs_records.length < pageCount){
    //from = "earliest";
    //to = "latest";
    console.log({from})
    let result = await ethweb3.getPastLogs(from,to,topics,contracts);
    result = result.reverse();
    //
    if(otherTopics.length>0){
      let otherResult = await ethweb3.getPastLogs(from,to,otherTopics,contracts);
      result = result.concat(otherResult);
      result.sort(async function(x, y){
        return y[1] - x[1];
      });
    }
    //
    for(var i=0;i<result.length;i++){
      let item = result[i];
      let log = await item_log(item);
      log = log.item
      if(log.length>0){
        if(loop_count >= pageNum * pageCount && logs_records.length < pageCount){
          logs_records.push(log);
        }
        if(loop_count >= (pageNum+1) * pageCount){
          break;
        }
        loop_count ++;
      }
    }
    to = from - 1;
    if(to < 0)break;
    from = to - theceloconst.EPOCH_SIZE*10;
    if(from < 0) from = 0;
  }
  if(from > 0x0) hasNextPage = true;
  return {hasNextPage,logs_records};
}
//
module.exports = {item_log,getlogs}
///////////////////////
/*
let address = web3.eth.abi.encodeParameter('address','0x07fa1874ad4655AD0C763a7876503509be11e29E');
web3.eth.getPastLogs({
  fromBlock:"earliest",
  address:[theceloconst.Contracts.Governance],
  topics: [null,null,[address]]
})
.then(console.log);
*/
