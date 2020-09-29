const http = require("http");
const util = require("util");
const url = require("url");
const fs = require("fs");
const req = require("request");
const regeneratorRuntime = require("regenerator-runtime");
const querystring = require("querystring");
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");
const thecelo = require("./thecelo.utils.js");
const election = require("./thecelo.ethrpc.election.js");
const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
const thecelo_account = require("./thecelo.ethrpc.account.js");
const webpath = "/";
const port = 8481;
//
//
var eth_blockdata;
var eth_dataset;
var users = {}; //key:address  value:[name,website,keybase,twitter]
var groups = {};
var groups_timestamp = 0;
var validators = {};
var validators_timestamp = 0;
var election_current = {};
var election_current_timestamp = 0;
//
setSubscribe();
getSubscribeData(theceloconst.groups_key);
getSubscribeData(theceloconst.election_current_key);
getSubscribeData(theceloconst.validators_key);
//
function sync_datas() {
  redis.redis_client.get(theceloconst.eth_dataset_key, function (err, data) {
    if (!err && data) {
      eth_dataset = JSON.parse(data);
    }
  });
  redis.redis_client.get(theceloconst.users_key, function (err, data) {
    if (!err && data) {
      users = JSON.parse(data);
    }
  });
}
//
setInterval(sync_datas, 5 * 1000);
//
http
  .createServer(async function (request, response) {
    try {
      //
      let parsedUrl = url.parse(request.url);
      let params = querystring.parse(parsedUrl.query);
      //console.log(params);
      //
      let data_body = [];
      await request
        .on("error", (err) => {
          console.error(err);
        })
        .on("data", (chunk) => {
          //console.log(chunk);
          data_body.push(chunk);
        })
        .on("end", () => {
          data_body = Buffer.concat(data_body).toString();
          //console.log(data_body);
        });
      //
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      //response.writeHead(200, {'Content-Type': 'text/javascript'});
      //
      var method = params["method"];
      if (method != "dashboard") {
        console.log("url:" + request.url);
      }
      //
      var address = params["address"];
      if (address && address.indexOf("0x") != 0) {
        //address = findAddress(address);
      }
      //////////////////////////////////////////////////////
      if (method == "groups") {
        var jsonString = '{"timestamp":"' + groups_timestamp + '",';
        jsonString += '"groups":' + JSON.stringify(groups) + "}";
        response.end(jsonString);
      } else if (method == "find_address") {
        var name = params["name"];
        var address = await thecelo_account.findAddress(name);
        response.end(JSON.stringify({ name, address }));
      }
      //
      else if (method == "find_group") {
        var name = params["name"];
        var address;
        var type;
        var keys = Object.keys(groups);
        keys.forEach((key, i) => {
          if (name.toLowerCase() == groups[key][0].toLowerCase()) {
            address = key;
            type = "group";
          }
        });
        if (address) {
        } else {
          keys = Object.keys(validators);
          keys.forEach((key, i) => {
            if (
              name.toLowerCase() == validators[key][1].toLowerCase() &&
              (validators[key][3] || validators[key][4])
            ) {
              address = key;
              type = "validator";
            }
          });
        }
        response.end(JSON.stringify({ type, address }));
      }
      //////////////////////////////////////////////////////
      else if (method == "dashboard") {
        get_dashboard(response);
      }
      //
      else if (method == "update_dashboard") {
        //
        response.end("Timer unseccussed! \n");
      }
      //////////////////////////////////////////////////////
      else if (method == "group") {
        var data = await redis.get_redis_data("group_" + address);
        if (!data || data.trim().length == 0) {
          response.end();
        } else {
          //
          var keys = Object.keys(groups).sort(function (x, y) {
            return groups[y][1] - groups[x][1];
          });
          const address_pos = (element) => element == address;
          var rank = keys.findIndex(address_pos) + 1;
          //
          var obj = JSON.parse(data);
          var timestamp = obj.timestamp;
          var group = obj.group;
          var result = { timestamp, rank, group };
          response.end(JSON.stringify(result));
        }
      }
      //
      else if (method == "update_group") {
        var jsonString = update_group(address);
        response.end(jsonString);
      }
      //////////////////////////////////////////////////////
      else if (method == "validators") {
        var jsonString = '{"timestamp":"' + validators_timestamp + '",';
        jsonString += '"validators":' + JSON.stringify(validators) + "}";
        response.end(jsonString);
      }
      //
      else if (method == "validator") {
        redis.redis_client.get("validator_" + address, function (err, data) {
          response.end(data);
        });
      } else if (method == "metadata") {
        const themeta = require("./thecelo.metadata.js");
        themeta.getMetaInfo(
          thecelo,
          theceloconst,
          redis,
          address,
          groups,
          response,
          eth_blockdata.eth_blockNumber
        );
      }
      //
      else if (method == "account") {
        let ethweb3 = require("./thecelo.ethweb3.js");
        var result = ethweb3.getAccount(address);
        let ethrpc = require("./thecelo.ethrpc.js");
        var balances = ethrpc.getBalanceOf(address);
        result["cgld"] = balances.cgld;
        result["cusd"] = balances.cusd;
        response.end(JSON.stringify(result));
      }
      //
      else if (method == "accounts") {
        redis.redis_client.get(theceloconst.accounts_key, function (err, data) {
          var accounts = {};
          var totalcGld = 0;
          var totalcUSD = 0;
          if (!err && data) {
            var obj = JSON.parse(data);
            accounts = obj.addresses;
            Object.keys(accounts).forEach((address, i) => {
              //banlance+lockedGold+pendingWithdrawals
              var total =
                accounts[address][1] +
                accounts[address][4] +
                accounts[address][6];
              totalcGld += total;
              totalcUSD += accounts[address][2];
              if (total < 10 && accounts[address][2] < 10)
                delete accounts[address];
            });
          }
          jsonString =
            '{"cGLD_totalSupply":' + eth_dataset.cGLD_totalSupply + ",";
          jsonString +=
            '"cUSD_totalSupply":' + eth_dataset.cUSD_totalSupply + ",";
          jsonString += '"totalcGld":' + totalcGld + ",";
          jsonString += '"totalcUSD":' + totalcUSD + ",";
          jsonString +=
            '"cgld_total_addresses":' + eth_dataset.cGLD_addresses + ",";
          jsonString +=
            '"cusd_total_addresses":' + eth_dataset.cUSD_addresses + ",";
          jsonString +=
            '"cgld_total_transfers":' + eth_dataset.cGLD_transfers + ",";
          jsonString +=
            '"cusd_total_transfers":' + eth_dataset.cUSD_transfers + ",";
          jsonString += '"accounts":' + JSON.stringify(accounts) + "}";
          response.end(jsonString);
        });
      }
      //
      else if (method == "get_reserve_info") {
        var data = await redis.get_redis_data("reserve_info");
        response.end(data);
      }
      //////////////////////////////////////////////////////
      else if (method == "exchange_records") {
        let exchange_records = await redis.get_redis_data(
          "celo_exchange_records"
        );
        response.end(exchange_records);
      } else if (method == "get_k_line") {
        var k_time = params["k_time"];
        let exchange_kline = await redis.get_redis_data(
          "celo_exchange_kline_" + k_time
        );
        response.end(exchange_kline);
      } else if (method == "trading_records") {
        var count = params["count"];
        let exchange_records = await redis.get_redis_data(
          "celo_exchange_records"
        );
        exchange_records = JSON.parse(exchange_records);
        //
        let trading_records = [];
        exchange_records.forEach(function (item, index) {
          if (index < count) {
            trading_records.push(item);
          }
        });
        response.end(JSON.stringify(trading_records));
      }
      //////////////////////////////////////////////////////
      else if (method == "attestation_logs") {
        let attestation_logs = await redis.get_redis_data("attestation_logs");
        attestation_logs = JSON.parse(attestation_logs);
        //Attestations fulfilled/requested
        let requested = 0;
        attestation_logs.attestationIssuerSelectedLogs.forEach((item, i) => {
          if (item.issuer.toLowerCase() == address.toLowerCase()) requested++;
        });
        let fulfilled = 0;
        attestation_logs.attestationCompletedLogs.forEach((item, i) => {
          if (item.issuer.toLowerCase() == address.toLowerCase()) fulfilled++;
        });

        response.end({ fulfilled, fulfilled });
      }
      //
      else if (method == "get_day_prices") {
        var data = await redis.get_redis_data("bittrex_day_prices");
        response.end(data);
      }
      //
      else if (method == "get_week_prices") {
        var data = await redis.get_redis_data("bittrex_week_prices");
        response.end(data);
      }
      //
      else if (method == "getprices") {
        //
        var exchange_prices = [];
        var exchange_data = await redis.get_redis_data("exchange_prices");
        var exchange_prices_list = {};
        if (exchange_data) {
          exchange_prices_list = JSON.parse(exchange_data);
        }
        //
        var bittrex_prices = [];
        var bittrex_data = await redis.get_redis_data("bittrex_prices");
        var bittrex_prices_list = {};
        if (bittrex_data) {
          bittrex_prices_list = JSON.parse(bittrex_data);
        }
        //
        var max_count = 60;
        var count = 0;
        var pre_hhmm = "";
        var keys = Object.keys(exchange_prices_list).reverse();
        keys.forEach(function (timestamp) {
          if (count < max_count) {
            var hhmm = thecelo.formatHHMM(timestamp);
            if (pre_hhmm != hhmm) {
              exchange_prices.unshift([
                hhmm,
                parseFloat(exchange_prices_list[timestamp]["CELO"]),
              ]);
              bittrex_prices.unshift([
                hhmm,
                parseFloat(bittrex_prices_list[timestamp]),
              ]);
              count++;
              pre_hhmm = hhmm;
            }
          }
        });
        //
        response.end(JSON.stringify({ exchange_prices, bittrex_prices }));
      }
      //
      else if (method == "getlockedgold") {
        redis.redis_client.get(theceloconst.lockedGoldHistory_key, function (
          err,
          data
        ) {
          if (!err && data) {
            var jsonString =
              '{"cgld_total_supply":' + eth_dataset.cGLD_totalSupply + ",";
            jsonString +=
              '"cusd_total_supply":' + eth_dataset.cUSD_totalSupply + ",";
            jsonString += '"locked_gold":' + data + "}";
            response.end(jsonString);
          } else {
            response.end("empty");
          }
        });
      }
      //
      else if (method == "network_parameters") {
        redis.redis_client.get(theceloconst.network_parameters_key, function (
          err,
          data
        ) {
          response.end(data);
        });
      } else if (method == "proposalList") {
        redis.redis_client.get(theceloconst.proposalList_key, function (
          err,
          data
        ) {
          var proposals = JSON.parse(data);
          var items_vote = [];
          var items = {};
          var items_info = {
            1: { title: "Start validator rewards" },
            2: { title: "Unfreeze Celo Gold voter rewards" },
            3: { title: "thecelo test" },
            5: { title: "DowntimeSlasher.setSlashableDowntime" },
            6: {
              title:
                "1.Remove existing in-memory Oracles 2. Add new HSM Oracles",
            },
            7: {
              title:
                "1.Remove existing in-memory Oracles 2. Add new HSM Oracles",
            },
            8: {
              title:
                "1.Remove existing in-memory Oracles 2. Add new HSM Oracles",
            },
            9: {
              title:
                "1.Remove existing in-memory Oracles 2. Add new HSM Oracles",
            },
          };
          if (thecelo.celo_network == "rc1") {
            items_info = {
              1: {
                title: "Unfreeze Election contract",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0001.md",
              },
              2: {
                title: "Unfreeze Voter Rewards",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0002.md",
              },
              3: {
                title: "Unfreeze Celo Gold Transfers",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0003.md",
              },
              4: {
                title: "Rename Celo Gold to Celo Native Asset",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0004.md",
              },
              5: {
                title: "Setting Frozen Part of Reserve CELO",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0005.md",
              },
              6: {
                title: "Setting Frozen Part of Reserve CELO",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0006.md",
              },
              7: {
                title:
                  "Enabling Celo Dollar transfers and activating the stability protocol",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0007.md",
              },
              8: {
                title:
                  "Increase the Reserve Fraction to Increase On-chain Liquidity",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0008.md",
              },
              9: {
                title: "Extend the Governance Referendum Stage Duration",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0009.md",
              },
              10: {
                title: "Bump Minimum Client Version",
                descriptionUrl:
                  "https://github.com/celo-org/celo-proposals/blob/master/CGPs/0010.md",
              },
            };
          }
          //
          if (proposals != null) {
            Object.keys(proposals).forEach((id, i) => {
              //proposer
              var address = proposals[id]["ProposalQueued"]["proposer"];
              var deposit = parseInt(
                proposals[id]["ProposalQueued"]["deposit"] / 1e18
              );
              var timestamp = proposals[id]["ProposalQueued"]["timestamp"];
              var proposer = { address, deposit, timestamp };
              //ProposalDequeued
              var address = proposals[id]["ProposalDequeued"]["from"];
              var timestamp = proposals[id]["ProposalDequeued"]["timestamp"];
              var dequeue = { address, timestamp };
              //ProposalApproval
              var address = proposals[id]["ProposalApproval"]["from"];
              var timestamp = proposals[id]["ProposalApproval"]["timestamp"];
              var approval = { address, timestamp };
              //upvoted
              var peoples = 0;
              var upvotes = 0;
              var ProposalUpvoted = proposals[id]["ProposalUpvoted"];
              Object.keys(ProposalUpvoted).forEach((address, i) => {
                peoples++;
                upvotes += parseInt(ProposalUpvoted[address]["upvotes"] / 1e18);
              });
              var upvoted = { peoples, upvotes };
              //voted
              var yes = 0;
              var no = 0;
              var abstain = 0;
              peoples = 0;
              var ProposalVoted = proposals[id]["ProposalVoted"];
              Object.keys(ProposalVoted).forEach((voter, i) => {
                var voted = ProposalVoted[voter];
                if (voted["value"] == 3)
                  yes += parseInt(voted["weight"] / 1e18);
                if (voted["value"] == 2) no += parseInt(voted["weight"] / 1e18);
                if (voted["value"] == 1)
                  abstain += parseInt(voted["weight"] / 1e18);
                //
                peoples++;
              });
              var weight = yes + no + abstain;
              var voted = { peoples, weight };

              //executed
              var executed = {};
              if (proposals[id]["ProposalExecuted"]) {
                var from = proposals[id]["ProposalExecuted"]["from"];
                var blockNumber =
                  proposals[id]["ProposalExecuted"]["blockNumber"];
                var transactionHash =
                  proposals[id]["ProposalExecuted"]["transactionHash"];
                var timestamp = proposals[id]["ProposalExecuted"]["timestamp"];
                executed = { from, timestamp, blockNumber, transactionHash };
              }
              //
              var title = items_info.hasOwnProperty(id)
                ? items_info[id]["title"]
                : "";
              var descriptionUrl = proposals[id]["descriptionUrl"];
              if (descriptionUrl.trim().length == 0) {
                descriptionUrl = items_info[id]["descriptionUrl"];
              }
              var status = proposals[id]["status"];
              var timespan = proposals[id]["timespan"];
              var item = {
                status,
                timespan,
                title,
                descriptionUrl,
                proposer,
                upvoted,
                dequeue,
                approval,
                voted,
                executed,
              };
              items[id] = item;
              //
              var item_vote = [];
              item_vote.push(["id", id]);
              item_vote.push(["Yes", yes]);
              item_vote.push(["No", no]);
              item_vote.push(["Abstain", abstain]);
              items_vote.push(item_vote);
            });
          }
          var jsonString = '{"items":' + JSON.stringify(items) + ",";
          jsonString += '"items_vote":' + JSON.stringify(items_vote) + "}";
          response.end(jsonString);
        });
      } else if (method == "redis_keys") {
        redis.redis_client.keys("*", function (err, keys) {
          if (err) return console.log(err);
          response.end(JSON.stringify(keys.sort()));
        });
      } else if (method == "redis_key_value") {
        var key = params["key"];
        redis.redis_client.get(key, function (err, data) {
          if (err) return console.log(err);
          response.end(data);
        });
      }
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
      else if (method == "save_lans") {
        console.log(data_body);
        var lans = JSON.parse(data_body);
        //
        var fileName = webpath + "js/lans.js";
        fs.writeFile(fileName, data_body, "utf8", function (err) {
          if (err) response.end("err:" + err);
          else response.end("The file was saved!");
        });
        //
        var lans_str = ["cn", "en", "hk", "de"];
        lans_str.forEach((lan, i) => {
          var fileName = webpath + "lans/lans-" + lan + ".js";
          var data =
            'var lans = {"' + lan + '":' + JSON.stringify(lans[lan]) + "}";
          fs.writeFile(fileName, data, "utf8", function (err) {
            console.log("save failed!");
          });
        });
      }
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
      else if (method == "query_keybase") {
        var key = "keybase_" + address;
        redis.redis_client.get(key, function (err, data) {
          response.end(data);
        });
      }
      //
      else if (method == "query_keybase_logo") {
        var key = "keybase_" + address;
        redis.redis_client.get(key, function (err, data) {
          var id = JSON.parse(data);
          var logo = id[3];
          response.end(logo);
        });
      }
      //
      else if (method == "add_keybase") {
        var username = params["username"];
        var website = params["website"];
        users[address] = thecelo.add_keybase(username, website);
        redis.redis_client.set(theceloconst.users_key, JSON.stringify(users));
        //save logo image
        //console.log(users[address].logo);
        var fileName = webpath + "logos/" + address.toLowerCase() + ".jpg";
        thecelo.saveImage(fs, req, users[address].logo, fileName);
        response.end(JSON.stringify(users[address]));
      }
      //
      else if (method == "update_user") {
        redis.redis_client.get(theceloconst.users_key, function (err, data) {
          var users = JSON.parse(data);
          //
          address = address.toLowerCase();
          //
          var website = params["website"];
          var twitter = params["twitter"];
          var github = params["github"];
          var logo = params["logo"];
          if (logo && logo.trim().length > 0) {
            var fileName = webpath + "logos/" + address + ".jpg";
            thecelo.saveImage(fs, req, logo, fileName);
          }
          var dns = params["dns"];
          var bio = params["bio"];
          //
          var key = thecelo.containsKey(users, address);
          if (key) {
            if (website && website.trim().length > 0)
              users[key].website = website;
            if (twitter && twitter.trim().length > 0)
              users[key].twitter = twitter;
            if (github && github.trim().length > 0) users[key].github = github;
            if (logo && logo.trim().length > 0) {
              users[key].logo = logo;
            }
            if (dns && dns.trim().length > 0) users[key].dns = dns;
            if (bio && bio.trim().length > 0) users[key].bio = bio;
          } else {
            key = address;
            users[address] = { website, twitter, github, logo, dns, bio };
          }
          redis.redis_client.set(theceloconst.users_key, JSON.stringify(users));
          response.end(JSON.stringify(users[key]));
        });
        response.end();
      }
      //
      else if (method == "user") {
        redis.redis_client.get(theceloconst.users_key, function (err, data) {
          var users = JSON.parse(data);
          var key = thecelo.containsKey(users, address);
          if (thecelo.containsKey(users, address)) {
            response.end(JSON.stringify(users[key]));
          } else {
            response.end();
          }
        });
      } else if (method == "voters") {
        redis.redis_client.get(theceloconst.voters_key, function (err, data) {
          var voters = JSON.parse(data);
          var key = thecelo.containsKey(voters, address);
          if (key) {
            response.end(JSON.stringify(voters[key]));
          } else {
            response.end();
          }
        });
      } else if (method == "voteds") {
        redis.redis_client.get(theceloconst.votes_key, function (err, data) {
          var votes = JSON.parse(data);
          var voteds = [];
          votes.forEach((vote, i) => {
            if (vote[1].toLowerCase() == address.toLowerCase()) {
              voteds.push([
                vote[0],
                vote[2],
                vote[3],
                vote[4],
                vote[5],
                vote[6],
              ]);
            }
          });
          //
          var blockNumber = 0;
          if (eth_blockdata && eth_blockdata.eth_blockNumber)
            blockNumber = eth_blockdata.eth_blockNumber;
          //
          response.end(JSON.stringify({ blockNumber, voteds }));
        });
      } else if (method == "group_votes_status") {
        var result = election.getGroupVotesStatus(address);
        response.end(JSON.stringify(result));
      } else if (method == "get_group_epoch_votes") {
        var result = await election.getGroupEpochVotes(address);
        response.end(JSON.stringify(result));
      }
      //////////////////////////////////////////////////////
      else if (method == "get_groups_epoch_votes") {
        var blockNumber = "latest";
        var epoch = election.getEpochNumber();
        var epoch_param = params["epoch"];
        if (epoch_param && epoch_param.trim().length > 0) {
          if (epoch_param == "pre_epoch") {
            epoch_param = epoch - 1;
          }
          if (parseInt(epoch_param) < epoch) {
            epoch = epoch_param;
            blockNumber = "0x" + (theceloconst.EPOCH_SIZE * epoch).toString(16);
          }
        }
        var epochvotes = {};
        var key = "get_groups_epoch_votes_" + epoch;
        var redis_value;
        if (blockNumber != "latest")
          redis_value = await redis.get_redis_data(key);
        if (redis_value && redis_value.length > 0) {
          epochvotes = JSON.parse(redis_value);
        } else {
          var groups1 = validatorsproxy.getRegisteredValidatorGroups();
          groups1.forEach((address, i) => {
            epochvotes[address] = election.getGroupVotesStatus(
              address,
              blockNumber
            );
          });
          redis.redis_client.set(key, JSON.stringify(epochvotes));
        }
        response.end(JSON.stringify({ epoch, epochvotes }));
      }
      //////////////////////////////////////////////////////
      else if (method == "latest_epoch_election_votes") {
        let result = await redis.get_redis_data("latest_epoch_election_votes");
        response.end(result);
      }
      //////////////////////////////////////////////////////
      else if (method == "epochRewardsDistributedToVoters") {
        var epoch = 0;
        if (eth_blockdata && eth_blockdata.eth_blockNumber)
          epoch = Math.ceil(
            eth_blockdata.eth_blockNumber / theceloconst.EPOCH_SIZE
          );
        var result = election.epochRewardsDistributedToVoters(address);
        response.end(JSON.stringify({ epoch, result }));
      } else if (method == "validatorEpochPaymentDistributed") {
        var epoch = 0;
        if (eth_blockdata && eth_blockdata.eth_blockNumber)
          epoch = Math.ceil(
            eth_blockdata.eth_blockNumber / theceloconst.EPOCH_SIZE
          );
        var group = params["group"];
        var validator = params["validator"];
        var result = validatorsproxy.validatorEpochPaymentDistributed(
          validator,
          group
        );
        response.end(JSON.stringify({ epoch, result }));
      } else if (method == "validatorScoreUpdated") {
        var result = validatorsproxy.validatorScoreUpdated(address);
        response.end(JSON.stringify(result));
      }
      //
      else if (method == "html") {
        var filename = params["filename"];
        fs.readFile(webpath + "html/" + filename + ".html", "utf8", function (
          err,
          data
        ) {
          if (err) response.end("come soon ......");
          else {
            response.end(data);
          }
        });
      }
      //
      else {
        response.end('{"error parameter!"}\n');
      }
      //
    } catch (e) {
      console.log("Error:", e.stack);
      response.end();
    }
  })
  .listen(port, "127.0.0.1");
//http://127.0.0.1:3000/?method=group_info&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261
//http://127.0.0.1:3000/?method=add_keybase&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261&username=sunxmldapp&website=https://bi23.com
//http://127.0.0.1:3000/?method=query_keybase&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261
//http://127.0.0.1:3000/?method=update_groups
//http://127.0.0.1:3000/?method=groups
//
function get_dashboard(response) {
  var dashboard = new Array();
  //
  if (eth_blockdata && eth_blockdata.eth_blockNumber)
    dashboard.push(eth_blockdata.eth_blockNumber);
  else {
    dashboard.push(0);
  }
  //Average Block Time
  var averageblocktime = 5;
  dashboard.push(averageblocktime);
  //Blocks until Epoch
  if (eth_blockdata && eth_blockdata.eth_blockNumber)
    dashboard.push(eth_blockdata.eth_blockNumber % theceloconst.EPOCH_SIZE);
  else {
    dashboard.push(0);
  }
  dashboard.push(theceloconst.EPOCH_SIZE);
  //Total Transactions
  dashboard.push(6988);
  //Gas Price
  dashboard.push(0);
  //cGLD Price
  var cGLD_price = 0;
  dashboard.push(cGLD_price);
  //cUSD Price
  var cUSD_price = 0;
  dashboard.push(cUSD_price);
  //Market Cap
  if (eth_dataset && eth_dataset.cGLD_totalSupply)
    dashboard.push(cGLD_price * eth_dataset.cGLD_totalSupply);
  else {
    dashboard.push(0);
  }
  //Active Nodes
  dashboard.push(9);
  //Elected Groups
  //
  var elected_groups = 0;
  Object.keys(groups).forEach((key, i) => {
    if (groups[key][3] > 0) {
      elected_groups++;
    }
  });
  dashboard.push(elected_groups);
  //Registered Groups
  dashboard.push(Object.keys(groups).length);
  //Elected Validators
  dashboard.push(Object.keys(election_current).length);
  //Registered Validators
  dashboard.push(Object.keys(validators).length);
  //cGLD_totalSupply
  if (eth_dataset && eth_dataset.cGLD_totalSupply)
    dashboard.push(eth_dataset.cGLD_totalSupply);
  else {
    dashboard.push(0);
  }
  //cGLD_addresses
  if (eth_dataset && eth_dataset.cGLD_addresses)
    dashboard.push(eth_dataset.cGLD_addresses);
  else {
    dashboard.push(0);
  }
  //cGLD_transfers
  if (eth_dataset && eth_dataset.cGLD_transfers)
    dashboard.push(eth_dataset.cGLD_transfers);
  else {
    dashboard.push(0);
  }
  //cUSD_totalSupply
  if (eth_dataset && eth_dataset.cUSD_totalSupply)
    dashboard.push(eth_dataset.cUSD_totalSupply);
  else {
    dashboard.push(0);
  }
  //cUSD_addresses
  if (eth_dataset && eth_dataset.cUSD_addresses)
    dashboard.push(eth_dataset.cUSD_addresses);
  else {
    dashboard.push(0);
  }
  //cUSD_transfers
  if (eth_dataset && eth_dataset.cUSD_transfers)
    dashboard.push(eth_dataset.cUSD_transfers);
  else {
    dashboard.push(0);
  }
  //miner/group
  if (eth_blockdata && eth_blockdata.eth_group) {
    dashboard.push(eth_blockdata.eth_group);
    dashboard.push(eth_blockdata.name);
    dashboard.push(eth_blockdata.logo);
  }
  //
  var jsonString = '{"timestamp":"' + new Date().getTime();
  jsonString += '","dashboard":' + JSON.stringify(dashboard) + "}";
  //thecelo.log_out('jsonString:'+jsonString);
  //
  response.end(jsonString);
}
//
function setSubscribe() {
  //
  redis.redis_subscribe_client.on("ready", function () {
    //subscribe messages
    redis.redis_subscribe_client.subscribe(theceloconst.eth_blockdata_key);
    redis.redis_subscribe_client.subscribe(theceloconst.groups_key);
    redis.redis_subscribe_client.subscribe(theceloconst.election_current_key);
    redis.redis_subscribe_client.subscribe(theceloconst.validators_key);
  });
  redis.redis_subscribe_client.on("subscribe", function (channel, count) {
    console.log(
      "client subscribed to " + channel + "," + count + " total subscriptions"
    );
  });
  //
  redis.redis_subscribe_client.on("message", function (channel, message) {
    console.log(channel + ":" + message);
    getSubscribeData(channel, message);
  });
  //
  redis.redis_subscribe_client.on("error", function (error) {
    console.log("redis_subscribe_client Error " + error);
  });
  //
  redis.redis_subscribe_client.on("unsubscribe", function (channel, count) {
    console.log(
      "client unsubscribed from" +
        channel +
        ", " +
        count +
        " total subscriptions"
    );
  });
}
//
function getSubscribeData(channel, message = "") {
  thecelo.log_out("getSubscribeData: " + channel);
  if (channel == theceloconst.groups_key) {
    redis.redis_client.get(theceloconst.groups_key, function (err, data) {
      if (!err && data) {
        var obj = JSON.parse(data);
        groups = obj.groups;
        groups_timestamp = obj.timestamp;
        //
        Object.keys(groups).forEach((address, i) => {
          //
          redis.redis_client.get("group_" + address, function (err, data) {
            if (!err && data) {
              var obj = JSON.parse(data);
              var group = obj.group;
              var members = group[13];
              var scores = 0;
              var count = 0;
              for (var i = 0; i < members.length; i++) {
                if (members[i][5]) {
                  scores += members[i][2];
                  count++;
                }
              }
              groups[address][8] = scores / count;
            }
          });
          //
        });
      }
    });
  }
  //
  if (channel == theceloconst.election_current_key) {
    redis.redis_client.get(theceloconst.election_current_key, function (
      err,
      data
    ) {
      if (!err && data) {
        var obj = JSON.parse(data);
        election_current = obj.election_current;
        election_current_timestamp = obj.timestamp;
      }
    });
  }
  //
  if (channel == theceloconst.validators_key) {
    redis.redis_client.get(theceloconst.validators_key, function (err, data) {
      if (!err && data) {
        var obj = JSON.parse(data);
        validators = obj.validators;
        validators_timestamp = obj.timestamp;
      }
    });
  }
  //
  if (channel == theceloconst.eth_blockdata_key) {
    if (message) {
      //console.log(message);
      eth_blockdata = JSON.parse(message);
      let group = groups[eth_blockdata.eth_group];
      if (group) {
        eth_blockdata["name"] = group[0];
        eth_blockdata["logo"] = group[7];
      }
    }
  }
}
