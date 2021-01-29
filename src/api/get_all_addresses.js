const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");
const celocli = require("./thecelo.celocli.js");

let run = async () => {
  let positiveAddresses = {}
  let epoch_address_txs = {}
  let blockNum = 0;
  let data = await redis.get_redis_data(theceloconst.addresses_key);
  if(data){
    let obj = JSON.parse(data)
    blockNum = obj.blockNum;
    positiveAddresses = obj.positiveAddresses;
  }
  data = await redis.get_redis_data('epoch_address_txs');
  if(data){
    let obj = JSON.parse(data)
    blockNum = obj.blockNum;
    epoch_address_txs = obj.epoch_address_txs;
  }//
  //
  let addresses = {};
  let toBlockNum = blockNum + theceloconst.EPOCH_SIZE;
  while (blockNum <= toBlockNum) {
    let blck = blockNum++
    let block = await web3.eth.getBlock(blck)
    if (!block)
      break
    //
    let epoch = Math.ceil(blockNum/theceloconst.EPOCH_SIZE);
    if(!epoch_address_txs[epoch]){
      epoch_address_txs[epoch] = [0,0];
    }
    //
    epoch_address_txs[epoch][0] += block.transactions.length;
    for(let i = 0; i < block.transactions.length; i++) {
      let tx = await web3.eth.getTransaction(block.transactions[i])
      if (parseInt(tx.value) > 0) {
        //
        if( ! Object.keys(positiveAddresses).hasOwnProperty(tx.to)){
          epoch_address_txs[epoch][1] ++;
        }
        //
        addresses[tx.to] = true
        addresses[tx.from] = true
        console.log('block', blck, 'transactions', block.transactions.length,'addtess',tx.to)
      }
    }
  }
  //
  for (address in addresses) {
    try {
      //{'usd':0,'gold':0,'lockedGold':0,'pending':0};
      let balance = celocli.account_balance(address)
      if (balance.usd > 0 || balance.gold >0 || balance.lockedGold > 0 || balance.pending > 0) {
        balance = [balance.usd/(1e+18),balance.gold/(1e+18),balance.lockedGold/(1e+18),balance.pending/(1e+18)]
        positiveAddresses[address] = balance
        console.log(JSON.stringify(balance))
      }
    } catch (err) {
      console.log(err)
    }
  }
  //
  let cusd_addresses_count = 0;
  let celo_addresses_count = 0;
  for (address in positiveAddresses) {
    if(positiveAddresses[address][0]>0) cusd_addresses_count++;
    if(positiveAddresses[address][1] >0 || positiveAddresses[address][2] > 0 || positiveAddresses[address][3] > 0) celo_addresses_count++;
  }
  //
  redis.redis_client.set('epoch_address_txs',JSON.stringify({blockNum,celo_addresses_count,cusd_addresses_count,epoch_address_txs}));
  redis.redis_client.set(theceloconst.addresses_key,JSON.stringify({blockNum,positiveAddresses}));
  console.log(blockNum,Object.keys(positiveAddresses).length)

  //
  sleep(10000).then(() => {
      run()
  })
}
//
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
//
run()
