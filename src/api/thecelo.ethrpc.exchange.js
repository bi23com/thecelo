const web3wrapper = require('./web3wrapper').default
const web3 = web3wrapper.web3http();
const web3ws = web3wrapper.web3ws();

const thecelo = require("./thecelo.utils.js");
const req = require('request');
const redis = require("./thecelo.redis.js");

//
const exchange_proxy = '0x67316300f17f063085Ca8bCa4bd3f7a5a3C66275';
const exchanged_topic = '0x402ac9185b4616422c2794bf5b118bfcc68ed496d52c0d9841dfa114fdeb05ba';
if('rc1' != thecelo.celo_network){
  exchange_proxy = '0x190480908c11Efca37EDEA4405f4cE1703b68b23';
}
//
let fromHeight = 'earliest';
let toHeight = 'latest';
//
async function get_exchange_history(){
  thecelo.log_out('===get_exchange_history begin....===');
  var exchange_records = [];
  var records = await redis.get_redis_data('celo_exchange_records');
  if(records && records.length>0){
    exchange_records = JSON.parse(records);
    if(exchange_records.length>0){
      // next block begin
      fromHeight = '0x'+(parseInt(exchange_records[0].blockNumber)+1).toString(16);
      console.log("fromHeight:"+fromHeight);
    }
  }
  let blockNumber = 0x0;
  let timestamp = 0x0;
  let result = thecelo.eth_rpc('eth_getLogs','[{"fromBlock": "'+fromHeight+'","toBlock":"'+toHeight+'","address":"'+exchange_proxy+'","topics":["'+exchanged_topic+'"]}]');
  result.forEach((item, i) => {
    //
    let exchanger = web3.eth.abi.decodeParameter('address',item.topics[1]);
    let data = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'bool'], item.data);
    let sellAmount = parseInt(data['0']);
    let buyAmount = parseInt(data['1']);
    let soldGold = data['2'];
    let transactionHash = item.transactionHash;
    //console.log(transactionHash);
    //
    if(parseFloat(sellAmount/1e+18) > 0.0001 && parseFloat(buyAmount/1e+18) > 0.0001){
      if(blockNumber != item.blockNumber){
        blockNumber = item.blockNumber;
        let block = thecelo.eth_rpc('eth_getBlockByNumber','["'+blockNumber+'", true]');
        //let block = web3.eth.getBlock(parseInt(blockNumber,10)).then(function);
        //console.log(block);
        timestamp = block.timestamp;
        //console.log('timestamp:'+timestamp);
      }
      exchange_records.unshift({blockNumber,timestamp,exchanger,sellAmount,buyAmount,soldGold,transactionHash});
    }
  });
  redis.redis_client.set('celo_exchange_records',JSON.stringify(exchange_records));
  //
  await get_k_line(60*24);// Day
  await get_k_line(60);// Hour
  await get_k_line(30);// 30minutes
  await get_k_line(10);// 10 minutes
  await get_k_line(5);// 5 minutes
  //
  thecelo.log_out('===get_exchange_history end....===');
  return exchange_records;
}
/////////////////////////////////////////////////
var exchange_prices_list = {};
var bittrex_prices_list = {};
//
async function update_exchange_prices(){
  if(Object.keys(exchange_prices_list).length == 0){
    var data = await redis.get_redis_data('exchange_prices');
    if(data) exchange_prices_list = JSON.parse(data);
  }
  if(Object.keys(bittrex_prices_list).length == 0){
    var data = await redis.get_redis_data('bittrex_prices');
    if(data) bittrex_prices_list = JSON.parse(data);
  }
  //
  try {
    var timestamp = new Date().getTime();
    var save_count = 100;//30*24*60;//1 month
    //
    var cmd = 'celocli exchange:show';
    var rep = thecelo.execCmd(cmd);
    var lines = rep.toString().trim().split('\n');
    var values = lines[0].trim().split(/\s+/);
    var exchange_prices = {};
    exchange_prices['CELO'] = (values[3]/values[0]).toFixed(4);
    values = lines[1].trim().split(/\s+/);
    exchange_prices['cUSD'] = (values[3]/values[0]).toFixed(4);
    //
    exchange_prices_list[timestamp] = exchange_prices;
    //
    let keys = Object.keys(exchange_prices_list);
    while(keys.length>save_count){
      delete exchange_prices_list[keys[0]];
      keys = Object.keys(exchange_prices_list);
    }
    redis.redis_client.set('exchange_prices',JSON.stringify(exchange_prices_list));
    //get bittrex
    var bittrex_url = 'https://api.bittrex.com/v3/markets/CELO-USDT/ticker';
    req.get({url: bittrex_url, encoding: 'utf8'}, function (err, res, content) {
      if(!err){
        var ticker = JSON.parse(content);
        bittrex_prices_list[timestamp] = ticker.lastTradeRate;
        let keys = Object.keys(bittrex_prices_list);
        while(keys.length>save_count){
          delete bittrex_prices_list[keys[0]];
          keys = Object.keys(bittrex_prices_list);
        }
        redis.redis_client.set('bittrex_prices',JSON.stringify(bittrex_prices_list));
      }
    })
    //get bittrex
    //https://bilaxy.com/api/v2/market/period?symbol=409&step=14400
    //candleInterval: string  MINUTE_1, MINUTE_5, HOUR_1, DAY_1
    var bittrex_day_url = 'https://bittrex.com/v3/markets/CELO-USDT/candles/DAY_1/recent';
    req.get({url: bittrex_day_url, encoding: 'utf8'}, function (err, res, content) {
      if(!err){
        //
        redis.redis_client.set('bittrex_day_prices',content);
        //
        let day_prices = JSON.parse(content);
        let pre_week = 0;
        let week_prices = [];
        //
        day_prices.forEach((item, i) => {
          let week = thecelo.getWeekInYear(new Date(item.startsAt));
          //
          if(week != pre_week){
            item.startsAt = item.startsAt.substr(5,5);
            week_prices.push(item);
            pre_week = week;
          }
          else{
            let pre_prices = week_prices[week_prices.length-1];
            if(item.high > pre_prices.high) pre_prices.high = item.high;
            if(item.low < pre_prices.low) pre_prices.low = item.low;
            pre_prices.close = item.close;
            pre_prices.volume += parseFloat(item.volume);
            pre_prices.quoteVolume += parseFloat(item.quoteVolume);
            pre_prices.startsAt = pre_prices.startsAt.substr(0,5)+'~'+ item.startsAt.substr(5,5);
          }
        });
        //
        console.log(JSON.stringify(week_prices));
        redis.redis_client.set('bittrex_week_prices',JSON.stringify(week_prices));
      }
    })
    //
  }
  catch(err) {
      if (err) throw err;
  }
}
//
async function get_k_line(k_time){
	var prices_data_rows = {};
  var exchangers = {};
  //
  let exchange_records = await redis.get_redis_data('celo_exchange_records');
  exchange_records = JSON.parse(exchange_records);
	//
	exchange_records.forEach(function(item,index){
    if(Object.keys(prices_data_rows).length<50){
  		//
  		let YMDhms = thecelo.formatYMDhms(parseInt(item.timestamp)*1000);
  		/////////////////////////////////
  		var sellTotal = [0,0,0];
  		var buyTotal = [0,0,0];
  		if(exchangers[item.exchanger]){
  			sellTotal = exchangers[item.exchanger][0];
  			buyTotal = exchangers[item.exchanger][1];
  		}
  		if(item.soldGold){
  			sellTotal[0]+=[item.sellAmount];
  			sellTotal[1]+=[item.buyAmount];
  			sellTotal[2]++;
  		}
  		else{
  			buyTotal[0]+=[item.sellAmount];
  			buyTotal[1]+=[item.buyAmount];
  			buyTotal[2]++;
  		}
  		exchangers[item.exchanger] = [sellTotal,buyTotal];
  		//////////////////////////////////
  		var celo_price = 0;
  		if(item.soldGold){
  			celo_price = parseFloat((item.buyAmount/item.sellAmount).toFixed(4));
  		}
  		else {
  			celo_price = parseFloat((item.sellAmount/item.buyAmount).toFixed(4));
  		}
  		//
  		let time_span;
  		if(k_time<=60){
  			time_span = YMDhms[1]+'-'+YMDhms[2]+' '+YMDhms[3]+':'+parseInt(YMDhms[4]/k_time)*k_time;
  		}
  		else{
  			time_span = YMDhms[0]+'-'+YMDhms[1]+'-'+YMDhms[2];
  		}
  		//
  		var open = celo_price;
  		var close = celo_price;
  		var high = celo_price;
  		var low = celo_price;
  		var volume = item.soldGold ? item.sellAmount : item.buyAmount;
  		volume = parseFloat((volume/1e+18).toFixed(2));
  		if(prices_data_rows[time_span]){
  			//
  			close = prices_data_rows[time_span].close;
  			high = prices_data_rows[time_span].high;
  			if(celo_price > high) high = celo_price;
  			low = prices_data_rows[time_span].low;
  			if(celo_price <low) low = celo_price;
  			volume = parseFloat(prices_data_rows[time_span].volume) + volume;
  		}
  		prices_data_rows[time_span] = {open,high,low,close,volume};
    }
	});
  redis.redis_client.set('celo_exchange_kline_'+k_time,JSON.stringify(prices_data_rows));
  return prices_data_rows;
}
///////////////////////////////////////////////
//////////////exchange_proxy///////////////////////
///////////////////////////////////////////////
setInterval(function(){update_exchange_prices();},60*1000);
//
let logs_blockNumber = 0;
//
var subscription = web3ws.eth.subscribe('logs', {
  address: exchange_proxy,
  topics: [null]
}, function(error, result){
    if (!error){
        console.log(result);
        if(result.blockNumber != logs_blockNumber){
          logs_blockheigh = result.blockNumber;
          get_exchange_history();
        }
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
subscription.unsubscribe(function(error, success){
    if(success)
        console.log('Successfully unsubscribed!');
});
