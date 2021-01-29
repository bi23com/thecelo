const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const redis = require("./thecelo.redis.js");
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
//
var attestationCompleted_topic = '0x414ff2c18c092697c4b8de49f515ac44f8bebc19b24553cf58ace913a6ac639d';
var attestationIssuerSelected_topic = '0xaf7f470b643316cf44c1f2898328a075e7602945b4f8584f48ba4ad2d8a2ea9d';
var attestationsRequested_topic = '0x381545d9b1fffcb94ffbbd0bccfff9f1fb3acd474d34f7d59112a5c9973fee49';

async function clear(){
  let counts = [0,0,0]
  let attestations = await redis.get_redis_data('attestation_logs');
  if(attestations&&attestations.length>0){
    attestations = JSON.parse(attestations);
    let fromHeight = attestations.fromHeight
    let attestationsRequestedLogs = attestations.attestationsRequestedLogs
    let attestationIssuerSelectedLogs = attestations.attestationIssuerSelectedLogs
    let attestationCompletedLogs = attestations.attestationCompletedLogs
    //
    let len = attestationCompletedLogs.length
    for(var i = len-1;i>=0;i--){
      let item = attestationCompletedLogs[i]
      for(var j = i-1;j>=0;j--){
        let item1 = attestationCompletedLogs[j]
        //{blockNumber,timestamp,identifier,account,issuer}
        if(item.blockNumber==item1.blockNumber &&
          item.timestamp==item1.timestamp &&
          item.issuer==item1.issuer &&
          item.identifier==item1.identifier &&
          item.account==item1.account){
            console.log([item,item1])
            attestationCompletedLogs.splice(j,1)
            counts[0]++
        }
        len = attestationCompletedLogs.length
      }
    }
    //
    len = attestationsRequestedLogs.length
    for(var i = len-1;i>=0;i--){
      let item = attestationsRequestedLogs[i]
      for(var j = i-1;j>=0;j--){
        let item1 = attestationsRequestedLogs[j]
        //{blockNumber,timestamp,identifier,account,attestationsRequested,attestationRequestFeeToken}
        if(item.blockNumber==item1.blockNumber &&
          item.timestamp==item1.timestamp &&
          item.identifier==item1.identifier &&
          item.account==item1.account){
            console.log([item,item1])
            attestationsRequestedLogs.splice(j,1)
            counts[1]++
        }
        len = attestationsRequestedLogs.length
      }
    }
    //
    len = attestationIssuerSelectedLogs.length
    for(var i = len-1;i>=0;i--){
      let item = attestationIssuerSelectedLogs[i]
      for(var j = i-1;j>=0;j--){
        let item1 = attestationIssuerSelectedLogs[j]
        //{blockNumber,timestamp,identifier,account,issuer,attestationRequestFeeToken}
        if(item.blockNumber==item1.blockNumber &&
          item.timestamp==item1.timestamp &&
          item.identifier==item1.identifier &&
          item.issuer==item1.issuer &&
          item.account==item1.account){
            console.log([item,item1])
            attestationIssuerSelectedLogs.splice(j,1)
            counts[2]++
          }
        len = attestationIssuerSelectedLogs.length
      }
    }
    let attestation_logs = {fromHeight,attestationsRequestedLogs,attestationIssuerSelectedLogs,attestationCompletedLogs};
    redis.redis_client.set('attestation_logs',JSON.stringify(attestation_logs));
  }
  return counts
}
//clear().then(console.log)
//getAttestationLogs()
//
async function getAttestationLogs(){
  //Attestations fulfilled/requested
  let attestationInfos  = {}
  let data = await redis.get_redis_data('attestation_infos');
  if(data&&data.length>0){
    attestationInfos = JSON.parse(data);
  }
  //
  let attestationsRequestedLogs = []
  let attestationIssuerSelectedLogs = []
  let attestationCompletedLogs = []
  let fromHeight = '0x0';//'earliest';
  let toHeight = 'latest';
  //
  let attestations = await redis.get_redis_data('attestation_logs');
  //console.log([attestations.length])
  if(attestations&&attestations.length>0){
    attestations = JSON.parse(attestations);

    attestationsRequestedLogs = attestations.attestationsRequestedLogs
    attestationIssuerSelectedLogs = attestations.attestationIssuerSelectedLogs
    attestationCompletedLogs = attestations.attestationCompletedLogs
    fromHeight = attestations.fromHeight
  }
  fromHeight = '0x'+(parseInt(fromHeight)+1).toString(16)
  console.log({fromHeight})
  let topics = [attestationsRequested_topic,attestationIssuerSelected_topic,attestationCompleted_topic]
  topics = JSON.stringify(topics)
  let result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "'+fromHeight+'","toBlock":"'+toHeight+'","address":"'+theceloconst.Contracts.Attestations+'","topics":['+topics+']}]');
  //console.log(result)
  result.forEach(async(item, i) => {
    let identifier = web3.eth.abi.decodeParameter('bytes32',item.topics[1]);
    let account = web3.eth.abi.decodeParameter('address',item.topics[2]);
    let blockNumber = item.blockNumber;
    //let block = await web3.eth.getBlock(blockNumber);
    let block = thecelo.eth_rpc('eth_getBlockByNumber','["'+blockNumber+'", true]');
    let timestamp = block.timestamp;
    //console.log(timestamp);
    if(item.topics[0]==attestationsRequested_topic){
      let data = web3.eth.abi.decodeParameters(['uint256', 'address'], item.data);
      let attestationsRequested = data['0'];
      let attestationRequestFeeToken = data['1'];
      attestationsRequestedLogs.unshift({blockNumber,timestamp,identifier,account,attestationsRequested,attestationRequestFeeToken});
    }
    else if(item.topics[0]==attestationIssuerSelected_topic){
      let issuer = web3.eth.abi.decodeParameter('address',item.topics[3]);
      let attestationRequestFeeToken = web3.eth.abi.decodeParameter('address', item.data);
      attestationIssuerSelectedLogs.unshift({blockNumber,timestamp,identifier,account,issuer,attestationRequestFeeToken});
      //
      if(attestationInfos[issuer]) attestationInfos[issuer][1]++;
      else attestationInfos[issuer]=[0,1];
    }
    else if(item.topics[0]==attestationCompleted_topic){
      let issuer = web3.eth.abi.decodeParameter('address',item.topics[3]);
      attestationCompletedLogs.unshift({blockNumber,timestamp,identifier,account,issuer});
      //
      if(attestationInfos[issuer]) attestationInfos[issuer][0]++;
      else attestationInfos[issuer]=[1,0];
    }
    fromHeight = blockNumber;
  });
  //
  let attestation_logs = {fromHeight,attestationsRequestedLogs,attestationIssuerSelectedLogs,attestationCompletedLogs};
  redis.redis_client.set('attestation_logs',JSON.stringify(attestation_logs));
  redis.redis_client.set('attestation_infos',JSON.stringify(attestationInfos));
  //
  getEpochAttestation();
  //
  getIdentifiersLog();
}
//
async function getAttestationRecords(address){
  let attestations = await redis.get_redis_data('attestation_logs');
  if(attestations&&attestations.length>0){
    attestations = JSON.parse(attestations);
  }
  let addr  = address.toLowerCase();
  let result = [];
  let selectedLogs = attestations.attestationIssuerSelectedLogs;
  let completedLogs = attestations.attestationCompletedLogs;
  selectedLogs.forEach((item, i) => {
    if(item.issuer.toLowerCase() == addr){
      result.push(item);
    }
  });
  completedLogs.forEach((item, i) => {
    if(item.issuer.toLowerCase() == addr){
      result.push(item);
    }
  });
  console.log(JSON.stringify(result));
  return result;
}
//
async function getIdentifiersLog(){
  //
  let identifiers = {};
  //
  let attestations = await redis.get_redis_data('attestation_logs');
  if(attestations&&attestations.length>0){
    attestations = JSON.parse(attestations);
  }
  let requestedLogs = attestations.attestationsRequestedLogs;
  let issuerSelectedLogs = attestations.attestationIssuerSelectedLogs;
  let completedLogs = attestations.attestationCompletedLogs;
  //
  requestedLogs.forEach((item, i) => {
    let requested = [item.blockNumber,item.timestamp,item.account,item.attestationsRequested];
    if(!identifiers.hasOwnProperty(item.identifier))
      identifiers[item.identifier] = [[],[]];
    identifiers[item.identifier][0].push(requested);
  })
  //
  issuerSelectedLogs.forEach((item, i) => {
    if(!identifiers.hasOwnProperty(item.identifier))
      identifiers[item.identifier] = [[],[]];
    let selected = [item.blockNumber,item.timestamp,item.issuer,0,0];
    identifiers[item.identifier][1].push(selected);
  })
  //
  completedLogs.forEach((item, i) => {
    identifiers[item.identifier][1].forEach((item1, i1) => {
      if(item.issuer == item1[2]){
        //let completed = [item.blockNumber,item.timestamp];
        //identifiers[item.identifier][1][3].push(completed);
        if(Math.abs(item.blockNumber-item1[0])<1200){
          item1[3] = item.blockNumber;
          item1[4] = item.timestamp;
        }
      }
    })
  })
  //
  redis.redis_client.set('attestationIdentifiers',JSON.stringify(identifiers));
  //console.log(JSON.stringify(identifiers));
}
//
async function getEpochAttestation(){
  //Requested,issuerSelected,Completed,requestedIdentifierCount,issuerSelectedIdentifierCount,completedIdentifierCount
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
  //thecelo.log_out(JSON.stringify(epochCount));
  return epochCount;
}
//getAttestationRecords('0x1F15d4210e34DfeeEc087C906b426509da1b01f1');

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
module.exports = {getAttestationLogs,getEpochAttestation}
