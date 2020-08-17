const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
const thecelo = require("./thecelo.utils.js");
const request = require('request');
const validator_badges = require("./validator_badges.js");
//
var ReleaseGold_address= [];
//const Attestation_address = ['0x34084d6a4df32d9ad7395f4bAaD0dB55C9c38145'];
//0xb7Eb6BBDFA555a1065374b4a1aa2Bc446A05F442(manta labs 2,750,000)
//0x1dec9eae55fe9348bc195a57df03f1cd51fe13d1(tango)
//0x1ee3434e360BAAa9F0F693e15aAFb2985513177a(manta labs 2,000,000)
//
const TGSCO_addresses = {
  "0x07fa1874ad4655AD0C763a7876503509be11e29E":["Bi23","50.00%","https://thecelo.com"],
  "0x47b2dB6af05a55d42Ed0F3731735F9479ABF0673":["/","/"],
  "0x21FB4411FA5828344c2788aB07D4cc12a12571b9":["cnstnt.xyz","/"],
  "0xbf55dF76204f00AcF296F76cF4Aaf86A866a5eb0":["/","/"],
  "0xA432da0Ed5A2c15cbc681227cCec3b375908FdCB":["/","/"],
  "0xF83C93ea360B66DDCD532960304948B1c10786a1":["dsrv labs - WellDoneStake.com","75.00%",'https://www.celowhale.com'],
  "0x8a12caB622B8093208931fA008D12D6Ba5AF47E4":["Tdlabs","70.00%"],
  "0x7194DFE766a92308880A943fD70F31c8E7c50e66":["Chainlayer1","100.00%"],
  "0xB87f2354E34B26ba6406Ac60EA99DCD8cd5e63Bf":["/","/"],
  "0x2c2B0f71d59B546B2CAfd222696589c13C3c325C":["/","/"],
  "0xCc4B2Bcbbc9639ef1E91F47acfD12Bd131525e79":["daithi-blockdaemon","70.00%"],
  "0x0d4f8cEA48cDaDEAe345431577a64983c0535B12":["census0","72.50%"],
  "0x34649AdA2cB44D851a2103Feaa8922DedDABfc1c":["/","/"],
  "0x7C75B0B81A54359E9dCCDa9cb663ca2e3De6B710":["wotrust1","72.50%","https://celovote.com"],
  "0xddaa60B6d803674bBc434F1C2B261CeB67C2fd7c":["pretoria","66.70%",'https://cauldron.pretoriaresearchlab.io/block-map'],
  "0xAF2b000bAed202fA7de0d9DCeB6F6612De348011":["/","/","https://celoist.com"],
  "0xDaDBd6Cfb29b054aDC9c4c2Ef0F21f0BBdb44871":["Bison Trails","69.20%"],
  "0xc64DF5Be250264bf2888591D87cdeB13BFADC501":["kytzu","76.70%"],
  "0xd25c6a9FEf4744E8d4F90Bf6bdFAF7686909d799":["celvaly0 ","72.50%"],
  "0xEEFCfDFc8F5CeD9799A13EcA58DE2ba7534eAB92":["sparkpool-v1","30.00%"],
  "0x15Ed3f6b79F5Fb9Ef1D99D37314Dd626b3005F0b":["AGx1","53.30%"],
  "0xAcdf897493A6000dbe256791E8A2beCbb405FD4F":["Simply Staking","100.00%"],
  "0x82f8Bcf96f24BA60Ef041D192c7CE04C907E2fb8":["syncnode","75.00%"],
  "0x481EAdE762d6D0b49580189B78709c9347b395bf":["happycelo","88.30%"],
  "0xc8A81D473992c7c6D3F469A8263F24914625709d":["moonlime","72.50%"],
  "0x0f66619058BB9675f3d394FCc2cE236a29901571":["Alive29","82.50%"],
  "0xD72Ed2e3db984bAC3bB351FE652200dE527eFfcf":["chainvibes","100.00%"],
  "0xB33e9e01E561a1Da60f7Cb42508500e571afb6Eb":["Qoor.io","79.20%"],
  "0x01b2b83fDf26aFC3Ca7062C35Bc68c8DdE56dB04":["Figment Networks","95.80%"],
  "0xE075ba4b1dCAF75513118d7aA08A057c658842c9":["YYYYYYYYYYYYY","65.80%"],
  "0x81AE1C73A326325216E25ff1af9EA3871195036E":["Newroad","/"],
  "0x8851F4852ce427191Dc8D9065d720619889e3260":["MoonletV","100.00%"],
  "0xFaa0b40645Ee5E8D9AE38393e8cDF8e5baA71d13":["Staking Fund","75.00%"],
  "0x0339Df3FE4f5ccC864EAE8491E5c8AEc4611A631":["/","/"],
  "0x614B7654ba0cC6000ABe526779911b70C1F7125A":["huglester00","54.20%"],
  "0xC7d5409fEe80B3Ac37Dbc111664dC511a5982469":["nonce - validator1","/"],
  "0x3DcF2ED8dC84a63FfD2bfDc3CDb2fA0B1aeAfE5c":["StakesStoneGroup","75.00%"],
  "0x8eB004daD9397B8f23E1279905c584920000756D":["ZanshinDojo.org","63.30%"],
  "0x249a6B2B260000b08f50A2480e2d703bAf02E8BE":["Chainflow-Validator","/"],
  "0x81cef0668e15639D0b101bdc3067699309D73BED":["chorusone","75.80%"],
  "0x061E9958028dcAa66fd8B255AD95194203b6c4Da":["EZ_Group","84.20%"],
  "0x8580dB53C3ebC56230662B771ceF2707E92Ef83A":["/","/"],
  "0x5402172E972b31Fc9F0383F53f45823Ab5037379":["gunray01","0.00%"],
  "0xc24baeac0Fd189637112B7e33d22FfF2730aF993":["NGA_validator","/"],
  "0x3D451dd723797b3DE938C5B22412032B6452591A":["projecttent-ceres","70.00%"],
  "0xD018838832f6112dE72EE6CC9967C56B333a0d1C":["/","/"],
  "0x95aE59515915D6c493a846aE022F93726652b50A":["Masternode25.de","69.20%"],
  "0x6CF4bB9ff947610944c6D8E0E5Ea26B1dEa73196":["Bambarello","90.80%"],
  "0x602B65795BCc64b2fb329AC004236E194f077158":["SlavaMo","/"],
  "0xE141831c2c1198d79B9Ff61cD97C3bAca7F071E0":["sharpcelo","88.30%"],
  "0x98c62d86634bB0E3f818EFC550e2F33369Eae7F3":["/","/"],
  "0x2fd49E97262D505Fd76BB6E0e06eC10e1fd54589":["/","/"],
  "0x8954661e743c60C966E2ff6002B514126bb1cFe2":["/","/"],
  "0xf87a83a0FB9118102b7fE2F19B7940dE3D421932":["/","/"],
  "0x4D5A51039ea45063D4b665B21755db20A738DaDc":["stake.fish","66.70%"],
  "0xFA592ae90E407Da044602342625AAABBF5d50C22":["/","/"],
  "0xD491e5eC7bbB4C6Ea9eE522F21F6621706e65a3E":["Nodeasy","/"],
  "0xbB59448319755708d06DACaAc017308129FffdBb":["/","/"],
  "0xA1e923892df867fB5cb7575cCa2538c394aD1BD9":["bitcat","/"],
  "0xD19FB36B7F433fe13820767ef6d0E26FDbaB68CC":["hashquark","0.00%"],
  "0x0b04c6ca6f2eA2C57D51C28Bb3E82b0c9B4072Eb":["/","/"],
  "0x3FEf91a3422F4dA394C08f115632D3e075d0EFFd":["steakvalley01","79.20%"],
  "0x8493BD3De67AC341D4cC11531f96a1A2cdBf29aD":["ryabina-1","0.00%","https://celomap.io | https://t.me/Celo_Ryabina_bot"]
};

const FoundationVotes_address = [
  '0xb234e017ad9e29687474196a93d5c7df24415902',
  '0x489dca840aa686cf055c342c165e9358889840de',
  //'0xb7eb6bbdfa555a1065374b4a1aa2bc446a05f442',
  //'0x1dec9eae55fe9348bc195a57df03f1cd51fe13d1',
  //'0x1ee3434e360baaa9f0f693e15aafb2985513177a',
  '0x7ae2f01ab6b6681148b50248d0b99a6abc5a09d5',
  '0xbdaccf951c8a219fc69ce8f171a61a3ddaefeb39',
  '0x7034589832c20dad66533f53319009bbcf34e45f',

  '0x7cf091c954ed7e9304452d31fd59999505ddcb7a',
  '0xa5d2944c32a8d7b284ff0b84c20fdcc46937cf64',
  '0x3fa7c646599f3174380bd9a7b6efcde90b5d129d',
  '0xfc89c17525f08f2bc9ba8cb77bcf05055b1f7059',
  '0x989e1a3b344a43911e02ccc609d469fbc15ab1f1',
  '0xef283eca68de87e051d427b4be152a7403110647'
];
//
const releaseGold_url_1 = 'https://gist.githubusercontent.com/timmoreton/e60676b96bfd507228e9e56d718bc750/raw/f83fb3738ee6f759118d6e8ba98490f2e9696560/ValidatorReleaseGold.json';
const releaseGold_url_2 = 'https://gist.githubusercontent.com/timmoreton/27e975bbca63723e218288b1a1f9fa54/raw/d55f51fde470fe040407c02462aeb5a7adc3d57f/CeloRC1ReleaseGoldWave2.json';
//
async function getMetaInfo(thecelo,theceloconst,redis,address,groups,response,blockNumber){
  //0: Domain proven
  //1: Can receive votes
  //2: Participated in TGCSO
  //3: Will get elected
  //4: Secure
  //5: Reliable
  //6: No recent slashing
  //7: Runs an Attestation Service
  //8: Runs a Validator on Baklava
  //9: Receives Celo Foundation votes
  //10: Promotes the Celo mission
  //11: Broadens Diversity
  //12: Participates in the community
  var identify = ['',0,'','','','','','','','','','',''];
  //
  var result = await redis.get_redis_data('releaseGold_address');
  if(result){
    ReleaseGold_address = JSON.parse(result);
  }
  if(ReleaseGold_address.length==0){
    var data = await thecelo.get_http_data(request,releaseGold_url_1);
    if(data){
      var releaseGold_address_1 = JSON.parse(data);
      data = await thecelo.get_http_data(request,releaseGold_url_2);
      if(data){
        var releaseGold_address_2 = JSON.parse(data);
        ReleaseGold_address = releaseGold_address_1.concat(releaseGold_address_2);
        redis.redis_client.set('releaseGold_address',JSON.stringify(ReleaseGold_address));
      }
    }
  }
  //
  var metadataURL;
  //
  var groups_metadata = await redis.get_redis_data(theceloconst.groups_metadata_key);
  if(groups_metadata&&groups_metadata.length>0){
    groups_metadata = JSON.parse(groups_metadata);
    if(groups_metadata[address]){
      metadataURL = groups_metadata[address].metadataURL;
      //Domain proven
      identify[0] = groups_metadata[address].domain;
    }
  }
  /*

  var data = await redis.get_redis_data(theceloconst.accounts_key);
  if(data){
    var obj = JSON.parse(data);
    var accounts = obj.addresses;
    var key = thecelo.containsKey(accounts,address);
    if(key && accounts[key][7]){
      metadataURL = accounts[key][7];
    }
  }
  //
  if(metadataURL){
    var result = {};
    var content = await thecelo.get_http_data(request,metadataURL);
    if(content && content.trim().length > 0){
      try{
        var metadata = JSON.parse(content);
        if(metadata && metadata.claims){
          for(var i=0;i<metadata.claims.length;i++){
            if(metadata.claims[i].hasOwnProperty('domain')) result.domain = metadata.claims[i].domain;
            if(metadata.claims[i].type=='ATTESTATION_SERVICE_URL') result.attestation_service_url = metadata.claims[i].url;
            if(metadata.claims[i].type=='KEYBASE') result.keybase = metadata.claims[i].username;
          }
        }
      }
      catch(err){console.log(err);console.log(content);}
    }
    if(result.domain){
      //Domain proven
      identify[0] = result.domain;
    }
  }
  */
  var group;
  var data = await redis.get_redis_data('group_'+address);
  if(data){
    var obj = JSON.parse(data);
    group = obj.group;
  }
  if(group){
    //No recent slashing
    identify[6] = 'Last Slashed: '+ (group[11] == 0 ? 'No': group[11]);
    //
    var attestation_service_url = 0;
    //
    var epoch_scores = 0;
    var elected_count = 0;
    var epoch = Math.ceil(blockNumber/theceloconst.EPOCH_SIZE)-1;
    //members
    for(var i=0;i<group[13].length;i++){
      var item = group[13][i];
    //group[13].forEach((item, i) => {
      //frontrunner
      if(item[11]){
        //Will get elected
        identify[2] = 'Next epoch will get elected';
      }
      //
      var url;
      var member_address = item[1];
      var data = await redis.get_redis_data(theceloconst.accounts_key);
      if(data){
        var obj = JSON.parse(data);
        var accounts = obj.addresses;
        var key = thecelo.containsKey(accounts,member_address);
        if(key && accounts[key][7]){
          url = accounts[key][7];
        }
      }
      if(url){
        var result = {};
        var content = await thecelo.get_http_data(request,url);
        if(content && content.trim().length>0){
          try{
            var metadata = JSON.parse(content);
            if(metadata && metadata.claims){
              metadata.claims.forEach((item, ii) => {
                if(item.hasOwnProperty('domain')) result.domain = item.domain;
                if(item.type=='ATTESTATION_SERVICE_URL') result.attestation_service_url = item.url;
              });
            }
          }
          catch(err){
            console.log(url);
            console.log(content);
          }
        }
        if(result.attestation_service_url){
          attestation_service_url ++;
        }
      }
      //Reliable
      if(item && item[5]){//Elected
        elected_count++;
        var scores = validatorsproxy.validatorScoreUpdated(member_address);
        //console.log(scores);
        //console.log(epoch);
        if(scores[epoch]){
          epoch_scores += scores[epoch][1];
        }
      }
    };
    //Reliable
    //console.log(epoch_scores);
    if(elected_count*1e+24 == epoch_scores){
      identify[5] = epoch+'th Epoch Score: 100%';
    }
    //Runs an Attestation Service
    if(attestation_service_url>0)
      identify[7] = attestation_service_url+'/'+group[13].length;
  }
  //Receives Celo Foundation votes
  var votes_result = await redis.get_redis_data(theceloconst.votes_key);
  if(votes_result){
    var votes = JSON.parse(votes_result);
    var foundationVotes_address = JSON.stringify(FoundationVotes_address).toLowerCase();
    votes.forEach((vote, i) => {
      if(vote[1].toLowerCase()==address.toLowerCase()){
        if(foundationVotes_address.indexOf(vote[0].toLowerCase())>=0 && vote[2]>0){
          //Receives Celo Foundation votes
          if(identify[9].trim().length>0)
            identify[9]+=' , ';
          identify[9] += vote[0]+': '+ parseFloat(vote[2]/1e+18).toFixed(4);
        }
      }
    });
  }
  //
  var key = thecelo.containsKey(groups,address);
  if(key){
    //Can receive votes
    identify[1] = parseFloat(groups[key][2]/1e+18).toFixed(2);
  }
  //Secure
  if(thecelo.containsKey(TGSCO_addresses,address)){
    //Participated in TGCSO
    if(TGSCO_addresses[address][0].trim()!="/")
      identify[3] = 'TGCSO identity: ' + TGSCO_addresses[address][0];
    //Secure

    if(parseFloat(TGSCO_addresses[address][1].replace('/','0').replace('%',''))*1.3>=80)
      identify[4] = 'TGCSO master validator chanllege: ' + TGSCO_addresses[address][1];

    if(TGSCO_addresses[address][2] && TGSCO_addresses[address][2].trim().length>0)
      identify[12] = TGSCO_addresses[address][2];
  }
  //Runs a Validator on Baklava
  if(groups[key][0].trim().length>0){
    var url = 'http://baklava.thecelo.com/api/?method=find_group&name='+encodeURI(groups[key][0]);
    console.log(url);
    var data = await thecelo.get_http_data(request,url);
    if(data && data.trim().length > 0){
      var obj = JSON.parse(data);
      if(obj.address) identify[8] = 'Baklava '+obj.type+': '+obj.address;
    }
  }
  //
  var badges = validator_badges.getBadges(address);
  //
  response.end(JSON.stringify({metadataURL,identify,badges}))
}

//
module.exports = {getMetaInfo}
