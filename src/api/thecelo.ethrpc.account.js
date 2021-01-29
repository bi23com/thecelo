//
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const celomainnetreleasegoldall = require("./thecelo.celomainnetreleasegoldall.js");
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(thecelo.http_host))
const ethweb3 = require("./thecelo.ethweb3.js");
//
const request = require('request');
//
const redis = require("./thecelo.redis.js");
const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
//
async function getAccountBalance(address,blockNum='latest'){
  let inputs = [{type: 'address',name: 'account'}];
  let datatype = 'uint256';
  let type = 'function';
  //
  let method = 'getAccountTotalLockedGold';
  let data = web3.eth.abi.encodeFunctionCall({name: method,type: type,inputs: inputs}, [address]);
  let result = await ethweb3.call(blockNum,theceloconst.Contracts.LockedGold,data);
  let totalLockedGold = parseInt(web3.eth.abi.decodeParameter(datatype, result))/1e+18;
  //
  method = 'getAccountNonvotingLockedGold';
  data = web3.eth.abi.encodeFunctionCall({name: method,type: type,inputs: inputs}, [address]);
  result = await ethweb3.call(blockNum,theceloconst.Contracts.LockedGold,data);
  let nonvotingLockedGold = parseInt(web3.eth.abi.decodeParameter(datatype, result))/1e+18;
  //
  method = 'getTotalPendingWithdrawals';
  data = web3.eth.abi.encodeFunctionCall({name: method,type: type,inputs: inputs}, [address]);
  result = await ethweb3.call(blockNum,theceloconst.Contracts.LockedGold,data);
  let pendingWithdrawals = parseInt(web3.eth.abi.decodeParameter(datatype, result))/1e+18;
  //
  method = 'balanceOf';
  data = web3.eth.abi.encodeFunctionCall({name: method,type: type,inputs: inputs}, [address]);
  result = await ethweb3.call(blockNum,theceloconst.Contracts.GoldToken,data);
  let celo = parseInt(web3.eth.abi.decodeParameter(datatype, result))/1e+18;
  //
  method = 'balanceOf';
  data = web3.eth.abi.encodeFunctionCall({name: method,type: type,inputs: inputs}, [address]);
  result = await ethweb3.call(blockNum,theceloconst.Contracts.StableToken,data);
  let cusd = parseInt(web3.eth.abi.decodeParameter(datatype, result))/1e+18;
  //
  result = {totalLockedGold,nonvotingLockedGold,pendingWithdrawals,celo,cusd};
  return result;
}
//
function getReleaseGold(address){
  let releasegold = {}
  let keys = ['beneficiary','releaseOwner','refundAddress','canValidate','canVote',
                'liquidityProvisionMet','releaseStartTime','releaseCliff','numReleasePeriods','releasePeriod','amountReleasedPerPeriod',
              'isRevoked','revocable','canExpire','releasedBalanceAtRevoke','revokeTime',
              'totalWithdrawn','currentReleasedTotalAmount']
  let cmd = 'celocli releasegold:show --contract '+address;
  let rep = thecelo.execCmd(cmd);
  let lines = rep.toString().trim().split('\n')
  lines.forEach(function(line) {
    keys.forEach(function(key) {
      if(line.indexOf(key)>=0){
        releasegold[key] = line.replace(key,'').replace(':','').trim()
      }
    })
  })
  return releasegold
}
//
async function getAccountEpochBalance(address){
  let key = address+'_epoch_balances';
  let epoch = 1;
  let balance_pre = [];
  let balances = {};
  let data = await redis.get_redis_data(key);
  if(data && data.length > 0){
    balances = JSON.parse(data);
    epoch = Math.max.apply(Math, Object.keys(balances));
    balance_pre = balances[epoch];
  }
  let lastest = await ethweb3.getBlockNumber()
  let lastest_epoch = Math.ceil(lastest / theceloconst.EPOCH_SIZE)
  for(;epoch <= lastest_epoch;epoch++){
    let blockNum = epoch * theceloconst.EPOCH_SIZE;
    blockNum = blockNum > lastest ? lastest : blockNum
    console.log({epoch,blockNum})
    let balance = await getAccountBalance(address,blockNum)
    if(JSON.stringify(balance_pre) != JSON.stringify(balance)){
      balances[epoch] = [balance.totalLockedGold,balance.nonvotingLockedGold,balance.pendingWithdrawals,balance.celo,balance.cusd]
      balance_pre = balance
    }
  }
  redis.redis_client.set(key,JSON.stringify(balances))
  return balances;
}
/////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////
async function getName(address){
  let name = thecelo.findKey(theceloconst.Contracts,address);
  if(name) return name+'Proxy';
  let data = web3.eth.abi.encodeFunctionCall({
      name: 'getName',
      type: 'function',
      inputs: [{"type":"address","name":"address"}]
  },[address]);
  //let result = thecelo.eth_rpc('eth_call','[{"to": "'+theceloconst.Contracts.Accounts+'", "data":"'+data+'"}, "latest"]');
  let result = await ethweb3.call('latest',theceloconst.Contracts.Accounts,data);
  let datatype = ['string'];
  //
  name = web3.eth.abi.decodeParameters(datatype, result);
  return name[0];
}
//
async function getType(address){
  let type = '';//1:celo_contract_proxy 2:releasegold_contract 3:accountt 4:contrac
  if(thecelo.containsValue(Object.values(theceloconst.Contracts),address))
    type = 'CeloContract'
  else {
    if(celomainnetreleasegoldall.isReleaseGold(address))
      type = 'Releasegold'
    else {
      let data = web3.eth.abi.encodeFunctionCall({
          name: 'isAccount',
          type: 'function',
          inputs: [{"type":"address","name":"address"}]
      },[address]);
      let result = await ethweb3.call('latest',theceloconst.Contracts.Accounts,data);
      let datatype = ['bool'];
      let isAccount = web3.eth.abi.decodeParameters(datatype, result);
      if(isAccount[0])
        type = 'Account'
      else{
        let code = await web3.eth.getCode(address)
        //console.log('code:'+code);
        if(code.length > ('0x'.length) ? true : false)
          type = 'Contract'
      }
    }
  }
  return type;
}
//
async function getMetadataURL(address){
  let data = web3.eth.abi.encodeFunctionCall({
      name: 'getMetadataURL',
      type: 'function',
      inputs: [{"type":"address","name":"address"}]
  },[address]);
  let result = await ethweb3.call('latest',theceloconst.Contracts.Accounts,data);
  let datatype = ['string'];
  //
  let metadataURL = web3.eth.abi.decodeParameters(datatype, result);
  return metadataURL[0];
}

//let testAddress = '0x9380fa34fd9e4fd14c06305fd7b6199089ed4eb9';
//getName(testAddress).then(console.log);;
//getMetadataURL(testAddress).then(console.log);
//getAccountEpochBalance(testAddress);
//getAccountMoney(testAddress,theceloconst.EPOCH_SIZE *1 ).then(console.log);
//
async function batchGetMetadataURL(){
  var groups = validatorsproxy.getRegisteredValidatorGroups();
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'batchGetMetadataURL',
      type: 'function',
      inputs: [{"type":"address[]","name":"accountsToQuery"}]
  },[groups]);
  let result = await ethweb3.call('latest',theceloconst.Contracts.Accounts,data);
  var datatype = ['uint256[]', 'bytes'];
  //
  result = web3.eth.abi.decodeParameters(datatype, result);
  var result0 = result['0'];
  var result1 = result['1'];
  //
  var users = await redis.get_redis_data(theceloconst.users_key);
  users = JSON.parse(users);
  //
  result = {};
  var bytes = web3.utils.hexToBytes(result1);
  var index = 0;
  for(var i=0;i<result0.length;i++){
    var metadataURL='',domain='',keybase='',attestation_service_url='';
    var len = parseInt(result0[i]);
    if(len>0){
      var bs = bytes.slice(index,index+len);
      var hex = toHexString(bs);
      var metadataURL = web3.utils.hexToUtf8('0x'+hex);
      //
      console.log(metadataURL);
      var infos = await getMetaInfo(metadataURL);
      domain = infos.domain;
      keybase = infos.keybase;
      attestation_service_url = infos.attestation_service_url;
      //
      index += len;
    }
    //
    if(keybase.trim().length==0){
      if(users.hasOwnProperty(groups[i])){
        keybase = users[groups[i]].username;
      }
    }
    result[groups[i]] = {metadataURL,domain,keybase,attestation_service_url};
  }
  //
  redis.redis_client.set(theceloconst.groups_metadata_key,JSON.stringify(result));
  return result;
}
//
function toHexString(byteArray) {
  return byteArray.reduce((output, elem) =>
    (output + ('0' + elem.toString(16)).slice(-2)),
    '');
}
//
async function getMetaInfo(metadataURL){
  var domain='',keybase='',attestation_service_url='';
  try{
    var content = await thecelo.get_http_data(request,metadataURL);
    var metadata = JSON.parse(content);
    if(metadata && metadata.claims){
      for(var i=0;i<metadata.claims.length;i++){
        if(metadata.claims[i].hasOwnProperty('domain')) domain = metadata.claims[i].domain;
        if(metadata.claims[i].type=='ATTESTATION_SERVICE_URL') attestation_service_url = metadata.claims[i].url;
        if(metadata.claims[i].type=='KEYBASE') keybase = metadata.claims[i].username;
      }
    }
  }
  catch(err){console.log(err);console.log(content);}
  return {metadataURL,domain,keybase,attestation_service_url};
}
//
async function findAddress(name){
  var groups_metadata = await redis.get_redis_data(theceloconst.groups_metadata_key);
  if(groups_metadata&&groups_metadata.length>0){
    groups_metadata = JSON.parse(groups_metadata);
  }
  else {
    groups_metadata = await batchGetMetadataURL();
  }
  //
  var result = '';
  Object.keys(groups_metadata).forEach((address, i) => {
    if(groups_metadata[address].keybase == name){
      result =  address;
    }
    else{
      var domain = groups_metadata[address].domain;
      if(domain.trim().length>0){
        var aa = domain.split('.');
        if(aa[aa.length-2] == name)
          result =  address;
      }
    }
  });
  return result;
}
//
//batchGetMetadataURL();
//var result = findAddress('bi23');
//var result = findAddress('sunxmldapp');
//var address = findAddress('aaa');
//var address = findAddress('keyko');
//
module.exports = {
  batchGetMetadataURL,getMetaInfo,findAddress,getName,getAccountEpochBalance,getType,getAccountBalance,getMetadataURL,getReleaseGold
}
