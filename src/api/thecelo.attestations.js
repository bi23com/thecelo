const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://xxx.xxx.xxx.xxx:8545'))

const redis = require("./thecelo.redis.js");
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
//
var attestations_proxy = '0xdC553892cdeeeD9f575aa0FBA099e5847fd88D20';
var attestationCompleted_topic = '0x414ff2c18c092697c4b8de49f515ac44f8bebc19b24553cf58ace913a6ac639d';
var attestationIssuerSelected_topic = '0xaf7f470b643316cf44c1f2898328a075e7602945b4f8584f48ba4ad2d8a2ea9d';
var attestationsRequested_topic = '0x381545d9b1fffcb94ffbbd0bccfff9f1fb3acd474d34f7d59112a5c9973fee49';
//
let fromHeight = 'earliest';
let toHeight = 'latest';
//Attestations fulfilled/requested
var attestationInfos = {};
//
function getAttestationLogs(){
  //
  Object.keys(attestationInfos).forEach((key, i) => {
    attestationInfos[key]=[0,0];
  });
  //attestationsRequested
  let attestationsRequestedLogs = [];
  let result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "'+fromHeight+'","toBlock":"'+toHeight+'","address":"'+attestations_proxy+'","topics":["'+attestationsRequested_topic+'"]}]');
  result.forEach((item, i) => {
    let identifier = web3.eth.abi.decodeParameter('bytes32',item.topics[1]);
    let account = web3.eth.abi.decodeParameter('address',item.topics[2]);
    let data = web3.eth.abi.decodeParameters(['uint256', 'address'], item.data);
    let attestationsRequested = data['0'];
    let attestationRequestFeeToken = data['1'];
    let blockNumber = item.blockNumber;
    attestationsRequestedLogs.unshift({blockNumber,identifier,account,attestationsRequested,attestationRequestFeeToken});
  });
  //attestationIssuerSelected
  let attestationIssuerSelectedLogs = [];
  result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "'+fromHeight+'","toBlock":"'+toHeight+'","address":"'+attestations_proxy+'","topics":["'+attestationIssuerSelected_topic+'"]}]');
  result.forEach((item, i) => {
    let identifier = web3.eth.abi.decodeParameter('bytes32',item.topics[1]);
    let account = web3.eth.abi.decodeParameter('address',item.topics[2]);
    let issuer = web3.eth.abi.decodeParameter('address',item.topics[3]);
    let attestationRequestFeeToken = web3.eth.abi.decodeParameter('address', item.data);
    let blockNumber = item.blockNumber;
    attestationIssuerSelectedLogs.unshift({blockNumber,identifier,account,issuer,attestationRequestFeeToken});
    //
    if(attestationInfos[issuer]) attestationInfos[issuer][1]++;
    else attestationInfos[issuer]=[0,1];
  });
  //attestationCompleted
  let attestationCompletedLogs = [];
  result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "'+fromHeight+'","toBlock":"'+toHeight+'","address":"'+attestations_proxy+'","topics":["'+attestationCompleted_topic+'"]}]');
  result.forEach((item, i) => {
    let identifier = web3.eth.abi.decodeParameter('bytes32',item.topics[1]);
    let account = web3.eth.abi.decodeParameter('address',item.topics[2]);
    let issuer = web3.eth.abi.decodeParameter('address',item.topics[3]);
    let blockNumber = item.blockNumber;
    attestationCompletedLogs.unshift({blockNumber,identifier,account,issuer});
    //
    if(attestationInfos[issuer]) attestationInfos[issuer][0]++;
    else attestationInfos[issuer]=[1,0];
  });
  let attestation_logs = {attestationsRequestedLogs,attestationIssuerSelectedLogs,attestationCompletedLogs};
  redis.redis_client.set('attestation_logs',JSON.stringify(attestation_logs));
  //
  getEpochAttestation();
}
//
function getAttestationInfo(address){
  if(Object.keys(attestationInfos).length==0) {getAttestationLogs();};
  //Attestations fulfilled/requested
  //thecelo.log_out('len:'+Object.keys(attestationInfos).length);
  let result = [0,0];
  let key = thecelo.containsKey(attestationInfos,address);
  if(key){
    result = attestationInfos[key];
    //console.log("key:"+key+';result='+result[0]+'/'+result[1]);
  }
  return result;
}
//
async function getEpochAttestation(){
  //Requested,Selected,Completed
  let epochCount = {};
  //
  let attestations = await redis.get_redis_data('attestation_logs');
  if(attestations&&attestations.length>0){
    attestations = JSON.parse(attestations);
  }
  let requestedLogs = attestations.attestationsRequestedLogs;
  let issuerSelectedLogs = attestations.attestationIssuerSelectedLogs;
  let completedLogs = attestations.attestationCompletedLogs;
  //
  let epochIdentifierCount = {};
  requestedLogs.forEach((item, i) => {
    let epoch = Math.ceil(item.blockNumber/theceloconst.EPOCH_SIZE);
    //
    if(epochCount[epoch]) epochCount[epoch][0]+=parseInt(item.attestationsRequested);
    else epochCount[epoch]=[parseInt(item.attestationsRequested),0,0,0,0,0];
    //
    if(epochIdentifierCount[epoch]){
      if(epochIdentifierCount[epoch].indexOf(item.identifier)==-1)
        epochIdentifierCount[epoch].push(item.identifier);
    }
    else epochIdentifierCount[epoch] = [item.identifier];
    epochCount[epoch][3] = epochIdentifierCount[epoch].length;
  });
  //
  epochIdentifierCount = {};
  issuerSelectedLogs.forEach((item, i) => {
    let epoch = Math.ceil(item.blockNumber/theceloconst.EPOCH_SIZE);
    if(epochCount[epoch]) epochCount[epoch][1]++;
    else epochCount[epoch]=[0,1,0,0,0,0];
    //
    if(epochIdentifierCount[epoch]){
      if(epochIdentifierCount[epoch].indexOf(item.identifier)==-1)
        epochIdentifierCount[epoch].push(item.identifier);
    }
    else epochIdentifierCount[epoch] = [item.identifier];
    epochCount[epoch][4] = epochIdentifierCount[epoch].length;
  });
  //
  epochIdentifierCount = {};
  completedLogs.forEach((item, i) => {
    let epoch = Math.ceil(item.blockNumber/theceloconst.EPOCH_SIZE);
    if(epochCount[epoch]) epochCount[epoch][2]++;
    else epochCount[epoch]=[0,0,1,0,0,0];
    //
    if(epochIdentifierCount[epoch]){
      if(epochIdentifierCount[epoch].indexOf(item.identifier)==-1)
        epochIdentifierCount[epoch].push(item.identifier);
    }
    else epochIdentifierCount[epoch] = [item.identifier];
    epochCount[epoch][5] = epochIdentifierCount[epoch].length;
  });
  thecelo.log_out(JSON.stringify(epochCount));
  return epochCount;
}
/*
var receipt = web3.eth.getTransaction('0x28f10652eb541e0f2edfa3ecd9fb1f292b4a9fedfecca7e62e9d63f620ec9659')
.then(console.log);
var receipt = web3.eth.getTransactionReceipt('0x28f10652eb541e0f2edfa3ecd9fb1f292b4a9fedfecca7e62e9d63f620ec9659')
.then(console.log);
web3.eth.getBlock(
    "pending",
    function (error, block) {
      console.log(block);
        if (error) {
            console.error(error);
        } else {
            console.log(block.transactions.length);
        }
    });
*/
//console.log(web3.eth.pendingTransactions.length);
//web3.eth.getPendingTransactions().then(console.log);
//console.log(web3.version);
//
module.exports = {getAttestationLogs,getAttestationInfo}
