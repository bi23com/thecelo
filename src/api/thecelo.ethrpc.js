const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");
const ethweb3 = require("./thecelo.ethweb3.js");
//
var transfer_topic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
//
var cgld_address = '0x471ece3750da237f93b8e339c536989b8978a438';
var cusd_address = '0x765de816845861e75a25fca122bb6898b8b1282a';
if('rc1'!=thecelo.celo_network){
  cgld_address = '0xdDc9bE57f553fe75752D61606B94CBD7e0264eF8';
  cusd_address = '0x62492A644A588FD904270BeD06ad52B9abfEA1aE';
}
//
var eth_dataset = {'cGLD_totalSupply':0,'cGLD_addresses':0,'cGLD_transfers':0,
                   'cUSD_totalSupply':0,'cUSD_addresses':0,'cUSD_transfers':0};
var addressesList = {};
//
var accounts_height = 0x0;
//
function getAddresses(count,earliest = false){
  redis.redis_client.get(theceloconst.accounts_key, function(err, data) {
    if(!err && data){
      var obj = JSON.parse(data);
      if(!earliest)
        accounts_height =  obj.blockHeight;
      addressesList = obj.addresses;
      eth_dataset['cGLD_transfers'] = obj.cGLD_transfers;
      eth_dataset['cUSD_transfers'] = obj.cUSD_transfers;
    }
    //
    thecelo.log_out('accounts_height:'+accounts_height);
    var fromHeight = accounts_height;
    //
    var arr_addresses = {};
    delete addressesList['0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e'];
    delete addressesList['0xb952930a3656a9cbab21df5919f94c61a495bf79'];
    //arr_addresses['0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e'.toLowerCase()] = 0;
    //addressesList['0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e'.toLowerCase()] = [0,0,0];
    /*
    delete addressesList['0xAe1d640648009DbE0Aa4485d3BfBB68C37710924'];
    arr_addresses['0xAe1d640648009DbE0Aa4485d3BfBB68C37710924'.toLowerCase()] = 0;
    addressesList['0xAe1d640648009DbE0Aa4485d3BfBB68C37710924'.toLowerCase()] = [0,0,0];

    delete addressesList['0x1B6C64779F42BA6B54C853Ab70171aCd81b072F7'];
    arr_addresses['0x1B6C64779F42BA6B54C853Ab70171aCd81b072F7'.toLowerCase()] = 0;
    addressesList['0x1B6C64779F42BA6B54C853Ab70171aCd81b072F7'.toLowerCase()] = [0,0,0];
    delete addressesList['0x8A07541C2eF161F4e3f8de7c7894718dA26626B2'];
    arr_addresses['0x8A07541C2eF161F4e3f8de7c7894718dA26626B2'.toLowerCase()] = 0;
    addressesList['0x8A07541C2eF161F4e3f8de7c7894718dA26626B2'.toLowerCase()] = [0,0,0];
    delete addressesList['0x9033ff75af27222c8f36a148800c7331581933F3'];
    arr_addresses['0x9033ff75af27222c8f36a148800c7331581933F3'.toLowerCase()] = 0;
    addressesList['0x9033ff75af27222c8f36a148800c7331581933F3'.toLowerCase()] = [0,0,0];
    delete addressesList['0xB2fe7AFe178335CEc3564d7671EEbD7634C626B0'];
    arr_addresses['0xB2fe7AFe178335CEc3564d7671EEbD7634C626B0'.toLowerCase()] = 0;
    addressesList['0xB2fe7AFe178335CEc3564d7671EEbD7634C626B0'.toLowerCase()] = [0,0,0];
    delete addressesList['0xc471776eA02705004C451959129bF09423B56526'];
    arr_addresses['0xc471776eA02705004C451959129bF09423B56526'.toLowerCase()] = 0;
    addressesList['0xc471776eA02705004C451959129bF09423B56526'.toLowerCase()] = [0,0,0];
    delete addressesList['0xf8ed78A113cD2a34dF451Ba3D540FFAE66829AA0'];
    arr_addresses['0xf8ed78A113cD2a34dF451Ba3D540FFAE66829AA0'.toLowerCase()] = 0;
    addressesList['0xf8ed78A113cD2a34dF451Ba3D540FFAE66829AA0'.toLowerCase()] = [0,0,0];
    delete addressesList['0xf505be37703fcd9a1c7f8e8f5921699963cb1450'];
    arr_addresses['0xf505be37703fcd9a1c7f8e8f5921699963cb1450'.toLowerCase()] = 0;
    addressesList['0xf505be37703fcd9a1c7f8e8f5921699963cb1450'.toLowerCase()] = [0,0,0];
    */
    var updateAllBalance = false;
    //
    let lastestBlockNumber = thecelo.eth_rpc('eth_blockNumber','[]','');
    //
    for(;accounts_height <= (fromHeight+count) && accounts_height <= lastestBlockNumber; accounts_height++){
      //
      if((parseInt(accounts_height) % 17280) == 5) updateAllBalance = true;
      //
      var block = thecelo.eth_rpc('eth_getBlockByNumber','["0x'+accounts_height.toString(16)+'",true]');
      //thecelo.log_out('block:'+block);
      if(block){
        var txs = block['transactions'];
        for(let i = 0; i < txs.length; i++) {
          let tx = txs[i];
          if (tx['from']&&tx['to']) {
              var from = tx['from'];
              if(!addressesList[from])
                addressesList[from] = [0,0,0];
              addressesList[from][0] ++;
              //
              var to = tx['to'];
              if(!addressesList[to])
                addressesList[to] = [0,0,0];
              addressesList[to][0] ++;

              arr_addresses[from] = 0;
              arr_addresses[to] = 0;
          }
        }
      }
    }
    /////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////
    //https://baklava-blockscout.celo-testnet.org/tokens/0x44f434e83a3179fcede28941b3a81953fb575217/token_transfers
    //
    //updateAllBalance = true;
    if(updateAllBalance){
      thecelo.log_out('updateAllBalance begin....');
      Object.keys(addressesList).forEach(function(address){

        updateBalance(address);
      });
      thecelo.log_out('updateAllBalance end....');
    }
    //
    Object.keys(arr_addresses).forEach(function(address){
      console.log(address);
      updateBalance(address);
      //
      redis.redis_client.publish("tx",address,function(err,result){
        thecelo.log_out('publish result:'+result);
        if(err){
          console.log('publish result:'+err);
        }
      })
    });
    //
    var counts = {'txs':0,'cgld':0,'cusd':0};
    Object.keys(addressesList).forEach(function(address){
      if(addressesList[address][0]>0) counts['txs'] += addressesList[address][0];
      if(addressesList[address][1]>0) counts['cgld'] ++;
      if(addressesList[address][2]>0) counts['cusd'] ++;
    });
    //
    eth_dataset['cGLD_addresses'] = counts['cgld'];
    //var result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "earliest","toBlock":"latest","address":"'+theceloconst.cgld_address+'","topics":["'+transfer_topic+'"]}]');
    var result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "0x'+fromHeight.toString(16)+'","toBlock":"0x'+accounts_height.toString(16)+'","address":"'+cgld_address+'","topics":["'+transfer_topic+'"]}]');
    eth_dataset['cGLD_transfers'] += result.length;
    //https://baklava-blockscout.celo-testnet.org/tokens/0x4b84c2ef94a274dbf83e2f1ec1608456c9b62d96/token_transfers
    eth_dataset['cUSD_addresses'] = counts['cusd'];
    //var result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "earliest","toBlock":"latest","address":"'+theceloconst.cusd_address+'","topics":["'+transfer_topic+'"]}]');
    var result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "0x'+fromHeight.toString(16)+'","toBlock":"0x'+accounts_height.toString(16)+'","address":"'+cusd_address+'","topics":["'+transfer_topic+'"]}]');
    eth_dataset['cUSD_transfers'] += result.length;
    ////////////////////////////////////////////////
    //totalSupply
    ////////////////////////////////////////////////
    var cGLD_totalSupply = thecelo.eth_rpc('eth_call','[{"to": "'+cgld_address+'", "data":"'+theceloconst.totalSupplyCode+'"}, "latest"]');
    if(cGLD_totalSupply==null||cGLD_totalSupply=='0x')
      cGLD_totalSupply = 0;
    cGLD_totalSupply = cGLD_totalSupply/(1e+18);
    eth_dataset['cGLD_totalSupply'] = cGLD_totalSupply;

    //0x18160ddd (web3.sha3('totalSupply()').substring(0,10);)
    //0x4b84c2EF94A274DbF83E2F1Ec1608456c9B62D96 (Celo Dollar (cUSD) Contract Address)
    var cUSD_totalSupply = thecelo.eth_rpc('eth_call','[{"to": "'+cusd_address+'", "data":"'+theceloconst.totalSupplyCode+'"}, "latest"]');
    thecelo.log_out(cUSD_totalSupply);
    if(cUSD_totalSupply==null||cUSD_totalSupply=='0x')
      cUSD_totalSupply=0;
    cUSD_totalSupply = cUSD_totalSupply/(1e+18);
    eth_dataset['cUSD_totalSupply'] = cUSD_totalSupply;
    //
    redis.redis_client.set(theceloconst.eth_dataset_key,JSON.stringify(eth_dataset));
    ////////////////////////////////////////////////
    ////////////////////////////////////////////////
    //
    var jsonString = '{"blockHeight":'+accounts_height+',"cGLD_transfers":'+eth_dataset['cGLD_transfers']+',"cUSD_transfers":'+eth_dataset['cUSD_transfers']+',"addresses":'+JSON.stringify(addressesList)+'}';
    //thecelo.log_out(jsonString);
    redis.redis_client.set(theceloconst.accounts_key,jsonString);
  });
}
//
function updateBalance(address){
  //
  var cgld = ethweb3.getAccountInfo(cgld_address,'balanceOf',address,'uint256');
  if(parseInt(cgld)>1e+50){
    cgld = 0;
  }
  var cusd = ethweb3.getAccountInfo(cusd_address,'balanceOf',address,'uint256');
  addressesList[address][1] = cgld/(1e+18);
  addressesList[address][2] = cusd/(1e+18);
  //name,lockedGold,nonVotingLockedGold,pendingWithdrawals,metadataURL
  var account = ethweb3.getAccount(address);
  addressesList[address][3] = account.name;
  addressesList[address][4] = account.lockedGold/(1e+18);
  addressesList[address][5] = account.nonVotingLockedGold/(1e+18);
  addressesList[address][6] = account.pendingWithdrawals/(1e+18);
  addressesList[address][7] = account.metadataURL;
  //
  //if(addressesList['0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e'])
  //delete addressesList['0xf823e8a4ba6adddb02e97b5b8886d18e41b2723e'];
}
//
function getBalanceOf(address){
  var cgld = ethweb3.getAccountInfo(cgld_address,'balanceOf',address,'uint256');
  if(parseInt(cgld)>1e+50){
    cgld = 0;
  }
  var cusd = ethweb3.getAccountInfo(cusd_address,'balanceOf',address,'uint256');
  return {cgld,cusd};
}
//
module.exports = {
       eth_dataset,
       addressesList,
       getAddresses,
       getBalanceOf,
       eth_dataset
     }
