const web3wrapper = require("./web3wrapper").default;
const web3 = web3wrapper.web3http();

const request = require("request");
const redis = require("./thecelo.redis.js");
const thecelo = require("./thecelo.utils.js");
const ethrpc = require("./thecelo.ethrpc.js");
//
var celo_addr_1 = "0x9380fA34Fd9e4Fd14c06305fd7B6199089eD4eb9";
var celo_addr_2 = "0x246f4599eFD3fA67AC44335Ed5e749E518Ffd8bB";
var btc_addr = "38EPdP4SPshc5CiUCzKcLP9v7Vqo5u1HBL";
var eth_addr = "0xe1955eA2D14e60414eBF5D649699356D8baE98eE";
var dai_addr = "0x16B34Ce9A6a6F7FC2DD25Ba59bf7308E7B38E186";

var bittrex_celo_url =
  "https://bittrex.com/v3/markets/CELO-USDT/candles/DAY_1/recent";
var binance_eth_url =
  "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT";
var binance_btc_url =
  "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
var gate_dai_url = "https://data.gateio.la/api2/1/ticker/dai_usdt";

var reserve_proxy = "0x9380fA34Fd9e4Fd14c06305fd7B6199089eD4eb9";

//
async function getReserveInfo() {
  var result = {};

  var celo_1 = ethrpc.getBalanceOf(celo_addr_1);
  var celo_2 = ethrpc.getBalanceOf(celo_addr_2);
  //
  var btc_info = await thecelo.get_http_data(
    request,
    "https://blockchain.info/rawaddr/" + btc_addr
  );
  var eth_info = await thecelo.get_http_data(
    request,
    "https://api.blockcypher.com/v1/eth/main/addrs/" + eth_addr
  );
  var dai_info = await thecelo.get_http_data(
    request,
    "https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x6b175474e89094c44da98b954eedeac495271d0f&address=" +
      dai_addr +
      "&tag=latest&apikey=MYQGYSV57WPNINCP1Z9A3QP6C67V9KUDFB"
  );
  //celo_price
  var data = await redis.get_redis_data("bittrex_day_prices");
  var celo_price = JSON.parse(data);
  celo_price = celo_price[celo_price.length - 1].close;
  result["celo1"] = [
    celo_addr_1,
    celo_1.cgld / 1e18,
    celo_1.cusd / 1e18,
    parseFloat(celo_price),
  ];
  result["celo2"] = [
    celo_addr_2,
    celo_2.cgld / 1e18,
    celo_2.cusd / 1e18,
    parseFloat(celo_price),
  ];
  //
  var btc_price = await thecelo.get_http_data(request, binance_btc_url);
  btc_price = JSON.parse(btc_price);
  btc_price = btc_price.price;
  var btc_info = JSON.parse(btc_info);
  result["btc"] = [btc_addr, btc_info.final_balance / 1e8, btc_price];
  //
  var eth_price = await thecelo.get_http_data(request, binance_eth_url);
  eth_price = JSON.parse(eth_price);
  eth_price = eth_price.price;
  var eth_info = JSON.parse(eth_info);
  result["eth"] = [
    eth_addr,
    eth_info.final_balance / 1e18,
    parseFloat(eth_price),
  ];
  //
  var dai_price = await thecelo.get_http_data(request, gate_dai_url);
  dai_price = JSON.parse(dai_price);
  dai_price = dai_price.last;
  var dai_info = JSON.parse(dai_info);
  result["dai"] = [dai_addr, dai_info.result / 1e18, parseFloat(dai_price)];
  //
  result["unfrozenReserveGoldBalance"] =
    parseInt(eth_call("getUnfrozenReserveGoldBalance")) / 1e18;
  result["otherReserveAddressesGoldBalance"] =
    parseInt(eth_call("getOtherReserveAddressesGoldBalance")) / 1e18;
  result["reserveGoldBalance"] =
    parseInt(eth_call("getReserveGoldBalance")) / 1e18;
  result["unfrozenBalance"] = parseInt(eth_call("getUnfrozenBalance")) / 1e18;
  result["frozenReserveGoldBalance"] =
    parseInt(eth_call("getFrozenReserveGoldBalance")) / 1e18;
  result["reserveRatio"] = parseInt(eth_call("getReserveRatio")) / 1e18;
  //
  console.log(JSON.stringify(result));
  redis.redis_client.set("reserve_info", JSON.stringify(result));
  //
  return result;
}
//
function eth_call(method) {
  var data = web3.eth.abi.encodeFunctionCall(
    {
      name: method,
      type: "function",
      inputs: [],
    },
    []
  );
  var result = thecelo.eth_rpc(
    "eth_call",
    '[{"to": "' + reserve_proxy + '", "data":"' + data + '"}, "latest"]'
  );
  console.log(result);
  return web3.eth.abi.decodeParameter("uint256", result);
}
//
module.exports = { getReserveInfo };
