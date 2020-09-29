const redis = require("./thecelo.redis.js");
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
//
const web3wrapper = require("./web3wrapper").default;
const web3ws = web3wrapper.web3ws();

///////////////////////////////////////////////
///////////////////////////////////////////////
///////////////////////////////////////////////
var subscription = web3ws.eth
  .subscribe("pendingTransactions", function (error, result) {
    if (!error) thecelo.log_out(result);
  })
  .on("data", function (transaction) {
    console.log(transaction);
  });

// unsubscribes the subscription
subscription.unsubscribe(function (error, success) {
  if (success) console.log("Successfully unsubscribed!");
});
