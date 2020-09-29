const web3wrapper = require("./web3wrapper").default;
const web3 = web3wrapper.web3http();
const web3ws = web3wrapper.web3ws();
const thecelo = require("./thecelo.utils.js");
const theceloconst = require("./thecelo.const.js");
const redis = require("./thecelo.redis.js");
//
var method_ProposalQueued =
  "0x1bfe527f3548d9258c2512b6689f0acfccdd0557d80a53845db25fc57e93d8fe";
var method_ProposalUpvoted =
  "0xd19965d25ef670a1e322fbf05475924b7b12d81fd6b96ab718b261782efb3d62";
var method_ProposalDequeue =
  "0x3e069fb74dcf5fbc07740b0d40d7f7fc48e9c0ca5dc3d19eb34d2e05d74c5543";
var method_ProposalApproval =
  "0x28ec9e38ba73636ceb2f6c1574136f83bd46284a3c74734b711bf45e12f8d929";
var method_ProposalVoted =
  "0xf3709dc32cf1356da6b8a12a5be1401aeb00989556be7b16ae566e65fef7a9df";
var method_ProposalExecuted =
  "0x712ae1383f79ac853f8d882153778e0260ef8f03b504e2866e0593e04d2b291f";
//
var upvote_timestamp = 24 * 60 * 60; //1 day
var dequeue_timestamp = 24 * 60 * 60; //1 day
var approval_timestamp = 24 * 60 * 60; //1 day
var vote_timestamp = 5 * 24 * 60 * 60; //5 days
var execute_timestamp = 3 * 24 * 60 * 60; //3 days
//
var proposal_contract_address = "0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972";
if ("rc1" != thecelo.celo_network) {
  upvote_timestamp = 4 * 60 * 60; //4 hours
  vote_timestamp = 24 * 60 * 60; //1 days
  execute_timestamp = 7 * 24 * 60 * 60; //7 days
  //
  proposal_contract_address = "0x28443b1d87db521320a6517A4F1B6Ead77F8C811";
}
//
var proposalList = {};
//
function getProposal(proposalId) {
  var data = web3.eth.abi.encodeFunctionCall(
    {
      name: "getProposal",
      type: "function",
      inputs: [
        {
          type: "uint256",
          name: "proposalId",
        },
      ],
    },
    [proposalId]
  );
  var result = thecelo.eth_rpc(
    "eth_call",
    '[{"to": "' +
      proposal_contract_address +
      '", "data":"' +
      data +
      '"}, "latest"]'
  );
  //console.log(result);
  let datatype = ["address", "uint256", "uint256", "uint256", "string"];
  return web3.eth.abi.decodeParameters(datatype, result);
}
//
function update_proposalList() {
  thecelo.log_out("update_proposalList begin....");
  var result = thecelo.eth_rpc(
    "eth_getLogs",
    '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
      proposal_contract_address +
      '","topics":["' +
      method_ProposalQueued +
      '"]}]'
  );
  result.forEach((item, i) => {
    var proposal = {
      status: "Queued",
      timespan: 0,
      descriptionUrl: "",
      ProposalQueued: {},
      ProposalUpvoted: {},
      ProposalDequeued: {},
      ProposalApproval: {},
      ProposalVoted: {},
      ProposalExecuted: {},
    };
    //ProposalQueued
    var proposalId = parseInt(item["topics"][1]);
    //
    let proposalInfo = getProposal(proposalId);
    console.log(proposalInfo);
    proposal.descriptionUrl = proposalInfo[4];
    console.log(proposal.descriptionUrl);
    //
    var proposer =
      "0x" + item["topics"][2].replace("0x000000000000000000000000", "");
    var data = item["data"];
    var transactionCount_len = "0x0000000000000000000000000000000000000000000000000000000000000000"
      .length;
    var deposit_len = "0000000000000000000000000000000000000000000000056bc75e2d63100000"
      .length;
    var deposit = parseInt(
      "0x" + data.substr(transactionCount_len, deposit_len)
    );
    var timestamp = parseInt(
      "0x" + data.substr(transactionCount_len + deposit_len)
    );
    var blockNumber = item["blockNumber"];
    var transactionHash = item["transactionHash"];
    proposal["ProposalQueued"] = {
      proposer,
      deposit,
      timestamp,
      blockNumber,
      transactionHash,
    };
    //ProposalUpvoted
    var result1 = thecelo.eth_rpc(
      "eth_getLogs",
      '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
        proposal_contract_address +
        '","topics":["' +
        method_ProposalUpvoted +
        '","' +
        item["topics"][1] +
        '"]}]'
    );
    result1.forEach((item1, i1) => {
      var account = item1["topics"][2].replace(
        "0x000000000000000000000000",
        ""
      );
      var upvotes = parseInt(item1["data"]);
      var blockNumber = item1["blockNumber"];
      var transactionHash = item1["transactionHash"];
      proposal["ProposalUpvoted"][account] = {
        upvotes,
        blockNumber,
        transactionHash,
      };
    });
    //ProposalDequeued
    var result11 = thecelo.eth_rpc(
      "eth_getLogs",
      '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
        proposal_contract_address +
        '","topics":["' +
        method_ProposalDequeue +
        '","' +
        item["topics"][1] +
        '"]}]'
    );
    result11.forEach((item11, i11) => {
      var timestamp = parseInt(item11["data"]);
      var blockNumber = item11["blockNumber"];
      var transactionHash = item11["transactionHash"];
      console.log(transactionHash);
      var result111 = thecelo.eth_rpc(
        "eth_getTransactionByHash",
        '["' + transactionHash + '"]'
      );
      //console.log(JSON.stringify(result111));
      var from = result111.from;
      proposal["ProposalDequeued"] = {
        from,
        timestamp,
        blockNumber,
        transactionHash,
      };
    });
    //ProposalApproval
    var result12 = thecelo.eth_rpc(
      "eth_getLogs",
      '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
        proposal_contract_address +
        '","topics":["' +
        method_ProposalApproval +
        '","' +
        item["topics"][1] +
        '"]}]'
    );
    result12.forEach((item12, i12) => {
      var blockNumber = item12["blockNumber"];
      var transactionHash = item12["transactionHash"];
      var result122 = thecelo.eth_rpc(
        "eth_getTransactionByHash",
        '["' + transactionHash + '"]'
      );
      var from = result122.from;
      var result1222 = thecelo.eth_rpc(
        "eth_getBlockByHash",
        '["' + item12.blockHash + '",true]'
      );
      var timestamp = result1222.timestamp;
      proposal["ProposalApproval"] = {
        from,
        timestamp,
        blockNumber,
        transactionHash,
      };
    });
    //ProposalVoted
    var result2 = thecelo.eth_rpc(
      "eth_getLogs",
      '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
        proposal_contract_address +
        '","topics":["' +
        method_ProposalVoted +
        '","' +
        item["topics"][1] +
        '"]}]'
    );
    result2.forEach((item2, i2) => {
      var account = item2["topics"][2].replace(
        "0x000000000000000000000000",
        ""
      );
      var data = item2["data"];
      var value_len = "0x0000000000000000000000000000000000000000000000000000000000000003"
        .length;
      var value = parseInt(data.substr(0, value_len));
      var weight = parseInt("0x" + data.substr(value_len));
      var blockNumber = item2["blockNumber"];
      var transactionHash = item2["transactionHash"];
      proposal["ProposalVoted"][account] = {
        value,
        weight,
        blockNumber,
        transactionHash,
      };
    });
    //ProposalExecuted
    var result3 = thecelo.eth_rpc(
      "eth_getLogs",
      '[{"fromBlock": "earliest","toBlock":"latest","address":"' +
        proposal_contract_address +
        '","topics":["' +
        method_ProposalExecuted +
        '","' +
        item["topics"][1] +
        '"]}]'
    );
    result3.forEach((item3, i3) => {
      var blockNumber = item3["blockNumber"];
      var transactionHash = item3["transactionHash"];
      var result4 = thecelo.eth_rpc(
        "eth_getTransactionByHash",
        '["' + transactionHash + '"]'
      );
      var from = result4["from"];
      var result133 = thecelo.eth_rpc(
        "eth_getBlockByHash",
        '["' + item3.blockHash + '",true]'
      );
      var timestamp = result133.timestamp;
      proposal["ProposalExecuted"] = {
        from,
        timestamp,
        blockNumber,
        transactionHash,
      };
    });
    //
    var margin_timestamp =
      parseInt(new Date().getTime() / 1000) -
      proposal["ProposalQueued"].timestamp;
    var timespan = upvote_timestamp - margin_timestamp;
    if (timespan > 0) proposal["status"] = "Upvote";
    else {
      if (proposal["ProposalDequeued"].timestamp) {
        if (proposal["ProposalApproval"].timestamp) {
          margin_timestamp =
            parseInt(new Date().getTime() / 1000) -
            proposal["ProposalDequeued"].timestamp; //proposal['ProposalApproval'].timestamp;
          var timespan = vote_timestamp + approval_timestamp - margin_timestamp;
          if (timespan > 0) proposal["status"] = "Vote";
          else {
            if (proposal["ProposalExecuted"].timestamp) {
              proposal["status"] = "Passed";
            } else {
              margin_timestamp =
                parseInt(new Date().getTime() / 1000) -
                proposal["ProposalDequeued"].timestamp; //proposal['ProposalApproval'].timestamp;
              timespan =
                execute_timestamp +
                vote_timestamp +
                approval_timestamp -
                margin_timestamp;
              if (timespan > 0) {
                proposal["status"] = "Execute";
              } else {
                proposal["status"] = "Rejected";
              }
            }
          }
        } else {
          margin_timestamp =
            parseInt(new Date().getTime() / 1000) -
            proposal["ProposalDequeued"].timestamp;
          timespan = approval_timestamp - margin_timestamp;
          if (timespan > 0) {
            proposal["status"] = "Approval";
          } else {
            proposal["status"] = "Rejected";
          }
        }
      } else {
        timespan = dequeue_timestamp + upvote_timestamp - margin_timestamp;
        if (timespan > 0) {
          proposal["status"] = "Dequeue";
        } else {
          proposal["status"] = "Rejected";
        }
      }
    }
    proposal["timespan"] = timespan;
    //
    proposalList[proposalId] = proposal;
  });
  redis.redis_client.set(
    theceloconst.proposalList_key,
    JSON.stringify(proposalList)
  );
  //thecelo.log_out(JSON.stringify(proposalList));
  thecelo.log_out("update_proposalList end....");
}
///////////////////////////////////////////////
////////////Governance//////////////
///////////////////////////////////////////////
setInterval(function () {
  update_proposalList();
}, 1 * 60 * 1000);
//
let logs_blockNumber = 0;
var subscription = web3ws.eth
  .subscribe(
    "logs",
    {
      address: proposal_contract_address,
      topics: [null],
    },
    function (error, result) {
      if (!error) {
        console.log(result);
        if (result.blockNumber != logs_blockNumber) {
          logs_blockheigh = result.blockNumber;
          update_proposalList();
        }
      }
    }
  )
  .on("connected", function (subscriptionId) {
    console.log(subscriptionId);
  })
  .on("data", function (log) {
    console.log(log);
  })
  .on("changed", function (log) {});
