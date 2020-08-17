const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://xxx.xxx.xxx.xxx:8545'))
//
const request = require('request');
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");
const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");

//
var accountsProxy_address = '0x7d21685C17607338b313a7174bAb6620baD0aaB7';
if('rc1' != thecelo.celo_network){
  accountsProxy_address = '0x64FF4e6F7e08119d877Fd2E26F4C20B537819080';
}
//
async function batchGetMetadataURL(){
  var groups = validatorsproxy.getRegisteredValidatorGroups();
  var data = web3.eth.abi.encodeFunctionCall({
      name: 'batchGetMetadataURL',
      type: 'function',
      inputs: [{"type":"address[]","name":"accountsToQuery"}]
  },[groups]);
  var block = 'latest';
  var result = thecelo.eth_rpc('eth_call','[{"to": "'+accountsProxy_address+'", "data":"'+data+'"}, "'+block+'"]');
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
  console.log(result)
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
  batchGetMetadataURL,getMetaInfo,findAddress
}
