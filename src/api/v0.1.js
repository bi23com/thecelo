
const http = require('http');
const util = require('util');
const url = require('url');
const fs = require('fs');
const req = require('request');
const querystring = require('querystring');
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");
const thecelo = require("./thecelo.utils.js");
const election = require("./thecelo.ethrpc.election.js");
const validatorsproxy = require("./thecelo.ethrpc.validatorsproxy.js");
const thecelo_account = require("./thecelo.ethrpc.account.js");
const attestations = require("./thecelo.attestations.js");
const ethrpc_logs = require("./thecelo.ethrpc.getlogs.js");
//const webpath = '/Users/sunxmldapp/Project/bi23.com/thecelo/';
const webpath = '/thecelocom/';
//const port = 3808;
const port = 808;
//
//
var eth_blockdata;
var eth_dataset;
var users = {};//key:address  value:[name,website,keybase,twitter]
var groups = {};
var groups_timestamp = 0;
var validators = {};
var validators_timestamp = 0;
var election_current = {};
var election_current_timestamp = 0;
//
setSubscribe();
//
reloadGroups()
reloadElectionCurrent()
reloadvalidators()
//getSubscribeData(theceloconst.groups_key);
//getSubscribeData(theceloconst.election_current_key);
//getSubscribeData(theceloconst.validators_key);
//
function sync_datas(){
  redis.redis_client.get(theceloconst.eth_dataset_key, function(err, data) {
    if(!err && data){
      eth_dataset = JSON.parse(data);
    }
  });
  redis.redis_client.get(theceloconst.users_key, function(err, data) {
    if(!err && data){
      users = JSON.parse(data);
    }
  });
}
//
setInterval(sync_datas,5*1000);
//
http.createServer(async function (request, response) {
    try {
      //
      let parsedUrl = url.parse(request.url);
      let params = querystring.parse(parsedUrl.query);
      //console.log(params);
      //
      let data_body = [];
      await request.on('error', (err) => {
        console.error(err);
      }).on('data', (chunk) => {
        //console.log(chunk);
        data_body.push(chunk);
      }).on('end', () => {
        data_body = Buffer.concat(data_body).toString();
        //console.log(data_body);
      });
      //
      response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      //response.writeHead(200, {'Content-Type': 'text/javascript'});
      //
      var method = params['method'];
      if(method!='dashboard'){
        console.log('url:'+request.url);
      }
      //
      var address = params['address'];
      if(address&&address.indexOf('0x')!=0){
        //address = findAddress(address);
      }
      //
      var page = 0;
      if(params['page'] != undefined)
        page = parseInt(params['page']);
      var count = 100;
      if(params['count'] != undefined)
        count = parseInt(params['count']);
      //////////////////////////////////////////////////////
      if(method=='groups'){
        var jsonString = '{"timestamp":"' + groups_timestamp + '",';
        jsonString += '"groups":'+JSON.stringify(groups)+'}';
        response.end(jsonString);
      }
      else if(method=='find_address'){
        var name = params['name'];
        var address  = await thecelo_account.findAddress(name);
        response.end(JSON.stringify({name,address}));
      }
      //
      else if(method=='find_group'){
        var name = params['name'];
        var address;
        var type;
        var keys = Object.keys(groups);
        keys.forEach((key, i) => {
          if(name.toLowerCase() == groups[key][0].toLowerCase()){
            address = key;
            type = 'group';
          }
        });
        if(address){}
        else{
          keys = Object.keys(validators);
          keys.forEach((key, i) => {
            if(name.toLowerCase() == validators[key][1].toLowerCase() &&
                (validators[key][3]||validators[key][4])){
              address = key;
              type = 'validator';
            }
          });
        }
        response.end(JSON.stringify({type,address}));
      }
      //////////////////////////////////////////////////////
      else if(method=='dashboard'){
        get_dashboard(response);
      }
      //
      else if(method=='update_dashboard'){
        //
        response.end('Timer unseccussed! \n');
      }
      //////////////////////////////////////////////////////
      else if(method=='group'){
        var data = await redis.get_redis_data('group_'+address);
        if(!data||data.trim().length==0){
          response.end();
        }
        else{
          //
          var keys = Object.keys(groups).sort(function(x,y){
            return (groups[y][1] - groups[x][1]);
          });
          const address_pos = (element) => element == address;
          var rank = keys.findIndex(address_pos) + 1;
          //
          var obj = JSON.parse(data);
          var timestamp = obj.timestamp;
          var group = obj.group;
          var result = {timestamp,rank,group};
          response.end(JSON.stringify(result));
        }
      }
      //
      else if(method=='update_group'){
        var jsonString = update_group(address);
        response.end(jsonString);
      }
      //////////////////////////////////////////////////////
      else if(method=='validators'){
        var jsonString = '{"timestamp":"' + validators_timestamp + '",';
        jsonString += '"validators":'+JSON.stringify(validators)+'}';
        response.end(jsonString);
      }
      //
      else if(method=='validator'){
        redis.redis_client.get('validator_'+address, function(err, data) {
          response.end(data);
        });
      }
      else if(method=='metadata'){
        const themeta = require("./thecelo.metadata.js");
        themeta.getMetaInfo(thecelo,theceloconst,redis,address,groups,response,eth_blockdata.eth_blockNumber);
      }
      //
      else if(method=='account'){
        //{totalLockedGold,nonvotingLockedGold,pendingWithdrawals,celo,cusd};
        var result = await thecelo_account.getAccountBalance(address)
        let name = await thecelo_account.getName(address)
        result['name'] = name
        let type = await thecelo_account.getType(address)
        result['type'] = type
        let metadataURL = await thecelo_account.getMetadataURL(address)
        result['metadataURL'] = metadataURL
        //
        if(type=='Releasegold'){
          let releaseGold = await thecelo_account.getReleaseGold(address)
          result['releaseGold'] = releaseGold
        }
        //
        response.end(JSON.stringify(result));
      }
      //
      else if(method=='account_epoch_balance'){
        var result = await thecelo_account.getAccountEpochBalance(address);
        response.end(JSON.stringify(result));
      }
      //
      else if(method=='accounts'){
        var data = await redis.get_redis_data(theceloconst.accounts_key);
        var obj = JSON.parse(data);
        var accounts = obj.addresses;
        //
        let sort_flg = 0;//0:celo 1:cusd
        if(params['sort_flg'] != undefined)
          sort_flg = params['sort_flg'];
        let keys = Object.keys(accounts).sort(function(x,y){
            if(sort_flg==0){//celo
              var tx = accounts[x][1] + accounts[x][4] + accounts[x][6];
              var ty = accounts[y][1] + accounts[y][4] + accounts[y][6];
              return (ty - tx);
            };
            if(sort_flg==1){//cusd
              var tx = accounts[x][2];
              var ty = accounts[y][2];
              return (ty - tx);
            };
            if(sort_flg==2){//txs
              var tx = accounts[x][0];
              var ty = accounts[y][0];
              return (ty - tx);
            };
        });
        //
        var totalcGld = 0;
        var totalcUSD = 0;
        let result = {};

        for(var i=0;i<keys.length;i++){
          address = keys[i]
          //banlance+lockedGold+pendingWithdrawals
          let tCELO = accounts[address][1]+accounts[address][4]+accounts[address][6];
          let tCUSD = accounts[address][2];
          //
          if(i >= (page * count) && i < (page + 1) * count){
            result[address] = accounts[address];
            //
            let cumulative_share_0 = 0
            let cumulative_share_1 = 0
            if(sort_flg==0){
              cumulative_share_0 = ((totalcGld*count)/eth_dataset.cGLD_totalSupply).toFixed(4);
              cumulative_share_1 = parseFloat((tCELO/eth_dataset.cGLD_totalSupply)*100).toFixed(4);
            }
            else if(sort_flg == 1 ){
              cumulative_share_0 = ((totalcUSD*count)/eth_dataset.cUSD_totalSupply).toFixed(4);
              cumulative_share_1 = parseFloat((tCUSD/eth_dataset.cUSD_totalSupply)*100).toFixed(4);
            }
            result[address].push(cumulative_share_0);
            result[address].push(cumulative_share_1);
            //
            let name = await thecelo_account.getName(address)
            result[address].push(name);
            let type = await thecelo_account.getType(address)
            result[address].push(type);
            //console.log({name,type});
          }
          //exclude Locked CELO contract address
          if(i>0){
            totalcGld += tCELO;
          }
          totalcUSD += tCUSD;
        }
        //
        jsonString = '{"cGLD_totalSupply":'+eth_dataset.cGLD_totalSupply+',';
        jsonString += '"cUSD_totalSupply":'+eth_dataset.cUSD_totalSupply+',';
        jsonString += '"totalcGld":'+totalcGld+',';
        jsonString += '"totalcUSD":'+totalcUSD+',';
        jsonString += '"cgld_total_addresses":'+eth_dataset.cGLD_addresses+',';
        jsonString += '"cusd_total_addresses":'+eth_dataset.cUSD_addresses+',';
        jsonString += '"cgld_total_transfers":'+eth_dataset.cGLD_transfers+',';
        jsonString += '"cusd_total_transfers":'+eth_dataset.cUSD_transfers+',';
        jsonString += '"accounts":'+JSON.stringify(result)+'}';
        response.end(jsonString);
      }
      //
      else if(method=='email_subscribe'){
        var email = params['email'];
        let result = 'Failed';
        if(thecelo.isValidEmail(email)){
          var emails = await redis.get_redis_data(theceloconst.email_subscribe_key);
          if(emails) emails = JSON.parse(emails);
          else emails = [];
          email = email.toLowerCase();
          if(!emails.includes(email)){
            emails.push(email)
            redis.redis_client.set(theceloconst.email_subscribe_key,JSON.stringify(emails));
          }
          result = 'Succeeded!';
        }
        response.end(result);
      }
      //
      else if(method=='get_reserve_info'){
        var data = await redis.get_redis_data('reserve_info');
        response.end(data);
      }
      //////////////////////////////////////////////////////
      else if(method=='exchange_records'){
        let exchange_records = await redis.get_redis_data('celo_exchange_records');
        response.end(exchange_records);
      }
      else if(method=='get_k_line'){
        var k_time = params['k_time'];
        let exchange_kline = await redis.get_redis_data('celo_exchange_kline_'+k_time);
        response.end(exchange_kline);
      }
      else if(method=='trading_records'){
        let exchange_records = await redis.get_redis_data('celo_exchange_records');
        exchange_records = JSON.parse(exchange_records);
      	//
        let trading_records = [];
        let totalCount = 0;
        let begin = page * 60;
        let end = begin + 60;
        for(let item of exchange_records){
          if(params['address']){
            if(params['address'].toLowerCase() != item.exchanger.toLowerCase()){
              continue;
            }
          }
          //0:all 1:buy 2:sell
          if((1 == params['type'] && item.soldGold) ||
             (2 == params['type'] && !item.soldGold)){
            continue;
          }
          if(totalCount < end){
            if(totalCount >= begin){
              trading_records.push(item);
            }
          }
          //else break;
          totalCount ++;
        }
        response.end(JSON.stringify({totalCount,trading_records}));
      }
      //
      else if(method=='tx_logs'){
        let whale_records = await redis.get_redis_data('whale_records');
        whale_records = JSON.parse(whale_records);
      	//
        let items = [];
        let totalCount = 0;
        let begin = page * 60;
        let end = begin + 60;
        for(let item of whale_records){
          if(params['address']){
            if(params['address'].toLowerCase() != item[4].toLowerCase() &&
                params['address'].toLowerCase() != item[5].toLowerCase()){
              continue;
            }
          }
          if(totalCount < end){
            if(totalCount >= begin){
              items.push(item);
            }
          }
          //else break;
          totalCount ++;
        }
        response.end(JSON.stringify({totalCount,items}));
      }
      //////////////////////////////////////////////////////
      else if(method=='attestation_logs'){
        let attestation_logs = await redis.get_redis_data('attestation_logs');
        response.end(attestation_logs);
      }
      else if(method=='attestationcount_epoch'){
        let epoch_attestationCount = await attestations.getEpochAttestation();
        response.end(JSON.stringify(epoch_attestationCount));
      }
      else if(method=='attestation_identifiers'){
        let identifiers = await redis.get_redis_data('attestationIdentifiers');
        identifiers = JSON.parse(identifiers);
        //
        if(params['address'] != undefined && params['address'].length>0){
          Object.keys(identifiers).forEach((identifier, i) => {
            let completeds = identifiers[identifier][1];
            let has = false;
            completeds.forEach((completed, i) => {
              if(address == completed[2]){
                has = true;
              }
            });
            if(!has) delete identifiers[identifier];
          });
        }
        //
        let result = {};
        Object.keys(identifiers).forEach((key, i) => {
          if(i >= (page * 30) && i < (page + 1) * 30){
            result[key] = identifiers[key];
          }
        });
        let totalIdentifiers = Object.keys(identifiers).length;
        response.end(JSON.stringify({totalIdentifiers,result}));
      }
      //
      else if(method=='get_day_prices'){
        var data = await redis.get_redis_data('bittrex_day_prices');
        response.end(data);
      }
      //
      else if(method=='get_week_prices'){
        var data = await redis.get_redis_data('bittrex_week_prices');
        response.end(data);
      }
      //
      else if(method=='getprices'){
        //
        var exchange_prices = [];
        var exchange_data = await redis.get_redis_data('exchange_prices');
        var exchange_prices_list = {};
        if(exchange_data){
          exchange_prices_list = JSON.parse(exchange_data);
        }
        //
        var bittrex_prices = [];
        var bittrex_data = await redis.get_redis_data('bittrex_prices');
        var bittrex_prices_list = {};
        if(bittrex_data){
          bittrex_prices_list = JSON.parse(bittrex_data);
        }
        //
        var max_count = 60;
        var loop_count =0;
        var pre_hhmm='';
        var keys = Object.keys(exchange_prices_list).reverse();
        keys.forEach(function(timestamp){
          if(loop_count < max_count){
            var hhmm = thecelo.formatHHMM(timestamp);
            if(pre_hhmm != hhmm){
              exchange_prices.unshift([hhmm,parseFloat(exchange_prices_list[timestamp]['CELO'])]);
              bittrex_prices.unshift([hhmm,parseFloat(bittrex_prices_list[timestamp])]);
              loop_count ++;
              pre_hhmm = hhmm;
            }
          }
        });
        //
        response.end(JSON.stringify({exchange_prices,bittrex_prices}));
      }
      //
      else if(method=='getlockedgold'){
          redis.redis_client.get(theceloconst.lockedGoldHistory_key, function(err, data) {
            if(!err && data){
              var jsonString = '{"cgld_total_supply":'+eth_dataset.cGLD_totalSupply+',';
              jsonString += '"cusd_total_supply":'+eth_dataset.cUSD_totalSupply+',';
              jsonString += '"locked_gold":'+data+'}';
              response.end(jsonString);
            }
            else{
              response.end('empty');
            }
          });
      }
      //
      else if(method == 'get_logs'){
        let type = params['type'];
        let logs = await ethrpc_logs.getlogs(address,page,count,type);
        response.end(JSON.stringify(logs));
      }
      //
      else if(method == 'telegram_webhook'){
          if('bot1412461894:AAHqYo_mqsREa7wACPdn2HkBBzWNGSHJjn1' == params['token']){
            console.log(data_body);
          }
          response.end('True');
      }
      //
      else if(method == 'network_parameters'){
          redis.redis_client.get(theceloconst.network_parameters_key, function(err, data) {
            response.end(data);
          });
      }
      else if(method == 'proposalList'){
          redis.redis_client.get(theceloconst.proposalList_key, function(err, data) {
            var proposals = JSON.parse(data);
            var items_vote =[];
            var items={};
            var items_info = theceloconst.governance_items_info;
              //
              if(proposals!=null){
                Object.keys(proposals).forEach((id, i) => {
                  //proposer
                  var address = proposals[id]['ProposalQueued']['proposer'];
                  var deposit = parseInt(proposals[id]['ProposalQueued']['deposit']/1e+18);
                  var timestamp = proposals[id]['ProposalQueued']['timestamp'];
                  var proposer = {address,deposit,timestamp};
                  //ProposalDequeued
                  var address = proposals[id]['ProposalDequeued']['from'];
                  var timestamp = proposals[id]['ProposalDequeued']['timestamp'];
                  var dequeue = {address,timestamp};
                  //ProposalApproval
                  var address = proposals[id]['ProposalApproval']['from'];
                  var timestamp = proposals[id]['ProposalApproval']['timestamp'];
                  var approval = {address,timestamp};
                  //upvoted
                  var peoples = 0;
                  var upvotes = 0;
                  var ProposalUpvoted = proposals[id]['ProposalUpvoted'];
                    Object.keys(ProposalUpvoted).forEach((address, i) => {
                      peoples ++ ;
                      upvotes += parseInt(ProposalUpvoted[address]['upvotes']/1e+18);
                  });
                  var upvoted = {peoples,upvotes};
                  //voted
                  var yes = 0;
                  var no = 0;
                  var abstain = 0;
                  peoples = 0;
                  var ProposalVoted = proposals[id]['ProposalVoted'];
                    Object.keys(ProposalVoted).forEach((voter, i) => {
                      var voted = ProposalVoted[voter];
                      if(voted['value']==3) yes += parseInt(voted['weight']/1e+18);
                      if(voted['value']==2) no += parseInt(voted['weight']/1e+18);
                      if(voted['value']==1) abstain += parseInt(voted['weight']/1e+18);
                      //
                      peoples ++;
                  });
                  var weight = (yes + no + abstain) ;
                  var voted = {peoples,weight};

                  //executed
                  var executed = {};
                  if(proposals[id]['ProposalExecuted']){
                    var from = proposals[id]['ProposalExecuted']['from'];
                    var blockNumber = proposals[id]['ProposalExecuted']['blockNumber'];
                    var transactionHash = proposals[id]['ProposalExecuted']['transactionHash'];
                    var timestamp = proposals[id]['ProposalExecuted']['timestamp'];
                    executed ={from,timestamp,blockNumber,transactionHash};
                  }
                  //
                  var title = items_info.hasOwnProperty(id)?items_info[id]['title']:'';
                  var descriptionUrl = proposals[id]['descriptionUrl'];
                  if(items_info[id]&&descriptionUrl.trim().length==0){
                    descriptionUrl = items_info[id]['descriptionUrl'];
                  }
                  var status = proposals[id]['status'];
                  var timespan = proposals[id]['timespan'];
                  var item ={status,timespan,title,descriptionUrl,proposer,upvoted,dequeue,approval,voted,executed};
                  items[id] = item;
                  //
                  var item_vote = [];
                  item_vote.push(['id',id]);
                  item_vote.push(['Yes',yes]);
                  item_vote.push(['No',no]);
                  item_vote.push(['Abstain',abstain]);
                  items_vote.push(item_vote);
    						});
            }
            var jsonString = '{"items":'+JSON.stringify(items)+',';
            jsonString += '"items_vote":'+JSON.stringify(items_vote)+'}';
            response.end(jsonString);
          });
      }
      else if(method == 'redis_keys'){
        redis.redis_client.keys('*', function (err, keys) {
          if (err) return console.log(err);
          response.end(JSON.stringify(keys.sort()));
        });
      }
      else if(method == 'redis_key_value'){
        var key = params['key'];
        redis.redis_client.get(key, function(err, data) {
          if (err) return console.log(err);
            response.end(data);
        });
      }
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
      else if(method == 'save_lans'){
        console.log(data_body);
        var lans = JSON.parse(data_body);
        //
        var fileName = webpath + "js/lans.js";
        fs.writeFile(fileName, data_body, 'utf8', function(err) {
          if(err) response.end('err:'+err);
          else response.end("The file was saved!");
        });
        //
        var lans_str = ['cn','en','hk','de'];
        lans_str.forEach((lan, i) => {
          var fileName = webpath + 'lans/lans-'+lan+'.js';
          var data = 'var lans = {"'+lan+'":'+ JSON.stringify(lans[lan]) + '}';
          fs.writeFile(fileName, data, 'utf8', function(err) {
            console.log('save failed!')
          });
        });
      }
      /////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////
      else if(method == 'query_keybase'){
          var key = 'keybase_'+address;
          redis.redis_client.get(key, function(err, data) {
            response.end(data);
          });
      }
      //
      else if(method == 'query_keybase_logo'){
          var key = 'keybase_'+address;
          redis.redis_client.get(key, function(err, data) {
            var id = JSON.parse(data);
            var logo = id[3];
            response.end(logo);
          });
      }
      //
      else if(method == 'add_keybase'){
          var username = params['username'];
          var website = params['website'];
          users[address] = thecelo.add_keybase(username,website);
          redis.redis_client.set(theceloconst.users_key,JSON.stringify(users));
          //save logo image
          //console.log(users[address].logo);
          var fileName = webpath + "logos/"+address.toLowerCase()+'.jpg';
          thecelo.saveImage(fs,req,users[address].logo,fileName);
          response.end(JSON.stringify(users[address]));
      }
      //
      else if(method == 'delete_keybase'){
        redis.redis_client.get(theceloconst.users_key, function(err, data) {
          var users = JSON.parse(data);
          address = address.toLowerCase();
          var key = thecelo.containsKey(users,address);
          if(key){
            delete users[key];
          }
          redis.redis_client.set(theceloconst.users_key,JSON.stringify(users));
          response.end('ok');
        })
      }
      //
      else if(method == 'update_user'){
          redis.redis_client.get(theceloconst.users_key, function(err, data) {
            var users = JSON.parse(data);
            //
            address = address.toLowerCase();
            //
            var website = params['website'];
            var twitter = params['twitter'];
            var github = params['github'];
            var logo = params['logo'];
            if(logo && logo.trim().length>0){
              var fileName = webpath + "logos/"+address+'.jpg';
              thecelo.saveImage(fs,req,logo,fileName);
            }
            var dns = params['dns'];
            var bio = params['bio'];
            //
            var key = thecelo.containsKey(users,address);
            if(key){
              if(website && website.trim().length>0)
                users[key].website = website;
              if(twitter && twitter.trim().length>0)
                users[key].twitter = twitter;
              if(github && github.trim().length>0)
                users[key].github = github;
              if(logo && logo.trim().length>0){
                users[key].logo = logo;
              }
              if(dns && dns.trim().length>0)
                users[key].dns = dns;
              if(bio && bio.trim().length>0)
                users[key].bio = bio;
            }
            else {
              key = address;
              users[address] = {website,twitter,github,logo,dns,bio};
            }
            redis.redis_client.set(theceloconst.users_key,JSON.stringify(users));
            response.end(JSON.stringify(users[key]));
          });
          response.end();
      }
      //
      else if(method == 'user'){
          redis.redis_client.get(theceloconst.users_key, function(err, data) {
            var users = JSON.parse(data);
            var key = thecelo.containsKey(users,address);
            if(thecelo.containsKey(users,address)){
              response.end(JSON.stringify(users[key]));
            }
            else{
              response.end();
            }
          });
      }
      else if(method == 'voters'){
        let data = await redis.get_redis_data(theceloconst.voters_key);
        var voters = JSON.parse(data);
        var key = thecelo.containsKey(voters,address);
        if(key){
          let addresses = Object.keys(voters[key]);
          for(var i=0;i<addresses.length;i++){
            voters[key][addresses[i]]['name'] = await thecelo_account.getName(addresses[i])
          }
          response.end(JSON.stringify(voters[key]));
        }
        else {
          response.end();
        }
      }
      else if(method == 'voteds'){
          redis.redis_client.get(theceloconst.votes_key, function(err, data) {
            var votes = JSON.parse(data);
            var voteds = [];
            votes.forEach((vote, i) => {
              if(vote[1].toLowerCase()==address.toLowerCase()){
                voteds.push([vote[0],vote[2],vote[3],vote[4],vote[5],vote[6]]);
              }
            });
            //
            var blockNumber = 0;
            if(eth_blockdata&&eth_blockdata.eth_blockNumber)
              blockNumber = eth_blockdata.eth_blockNumber;
            //
            response.end(JSON.stringify({blockNumber,voteds}));
          });
      }
      else if(method == 'group_votes_status'){
          var result = election.getGroupVotesStatus(address);
          response.end(JSON.stringify(result));
      }
      else if(method == 'get_group_epoch_votes'){
          var result = await election.getGroupEpochVotes(address);
          response.end(JSON.stringify(result));
      }
      //////////////////////////////////////////////////////
      else if(method == 'get_groups_epoch_votes'){
        var blockNumber = 'latest';
        var epoch = election.getEpochNumber();
        var epoch_param = params['epoch'];
        if(epoch_param&&epoch_param.trim().length>0){
          if(epoch_param == 'pre_epoch'){
            epoch_param = epoch -1;
          }
          if(parseInt(epoch_param) < epoch){
            epoch = epoch_param;
            blockNumber = '0x'+(theceloconst.EPOCH_SIZE * epoch).toString(16);
          }
        }
        var epochvotes = {};
        var key = 'get_groups_epoch_votes_'+epoch;
        var redis_value;
        if(blockNumber!='latest')
          redis_value = await redis.get_redis_data(key);
        if(redis_value&&redis_value.length>0){
          epochvotes = JSON.parse(redis_value);
        }
        else{
          var groups1 = validatorsproxy.getRegisteredValidatorGroups();
          groups1.forEach((address, i) => {
            epochvotes[address] = election.getGroupVotesStatus(address,blockNumber);
          });
          redis.redis_client.set(key,JSON.stringify(epochvotes));
        }
        response.end(JSON.stringify({epoch,epochvotes}));
      }
      //////////////////////////////////////////////////////
      else if(method == 'latest_epoch_election_votes'){
        let result = await redis.get_redis_data('latest_epoch_election_votes');
        response.end(result);
      }
      //////////////////////////////////////////////////////
      else if(method == 'epochRewardsDistributedToVoters'){
        let epoch = 0
        if(eth_blockdata&&eth_blockdata.eth_blockNumber)
          epoch = Math.ceil(eth_blockdata.eth_blockNumber/theceloconst.EPOCH_SIZE);
        let result = election.epochRewardsDistributedToVoters(address);
        response.end(JSON.stringify({epoch,result}));
      }
      else if(method == 'validatorEpochPaymentDistributed'){
        let epoch = 0
        if(eth_blockdata&&eth_blockdata.eth_blockNumber)
          epoch = Math.ceil(eth_blockdata.eth_blockNumber/theceloconst.EPOCH_SIZE);
        let group = params['group'];
        let validator = params['validator'];
        let result = validatorsproxy.validatorEpochPaymentDistributed(validator,group);
        response.end(JSON.stringify({epoch,result}));
      }
      else if(method == 'validatorScoreUpdated'){
          var result = validatorsproxy.validatorScoreUpdated(address);
          response.end(JSON.stringify(result));
      }
      else if(method == 'celo_release_schedule'){
        let release_schedule = require("./celo_release_schedule.js");
        let total_allocated = release_schedule.total_allocated;
        let month_allocated = release_schedule.month_allocated;
        response.end(JSON.stringify({total_allocated,month_allocated}));
      }
      else if(method == 'celo_release_schedule_year'){
        let release_schedule = require("./celo_release_schedule.js");
        let max_supply = release_schedule.getMaxSupply();
        let yearCirculatingSupply = release_schedule.yearCirculatingSupply();
        let currentCirculatingSupply = release_schedule.currentCirculatingSupply();
        response.end(JSON.stringify({max_supply,currentCirculatingSupply,yearCirculatingSupply}));
      }
      //
      else if(method == 'html'){
        var filename = params['filename'];
        fs.readFile(webpath + "html/" +filename+'.html', 'utf8', function(err,data) {
          if(err)
            response.end('come soon ......');
          else{
            response.end(data);
          }
        });
      }
      ///////////////////////////////////////////////
      ///////////////////////////////////////////////
      //https://docs.google.com/document/d/1S4urpzUnO2t7DmS_1dc4EL4tgnnbTObPYXvDeBnukCg/edit
      //Overview of market data for all tickers and all markets.
      //https://www.bitrue.com/kline-api/public.json?command=returnTicker
      //
      //https://thecelo.com/api/?method=ex_summary
      //https://thecelo.com/api/?method=ex_assets
      //https://thecelo.com/api/?method=ex_ticker
      //https://thecelo.com/api/?method=ex_orderbook
      //https://thecelo.com/api/?method=ex_celocusd
      //https://thecelo.com/api/?method=ex_totalcoins
      //https://thecelo.com/api/?method=ex_cusd_circulating
      //
      //
      else if(method.indexOf('ex_') == 0){
        let kline = await redis.get_redis_data('celo_exchange_kline_'+(60*24));
        kline = JSON.parse(kline);
        let kline_key = Object.keys(kline)[0];
        let kline_item = kline[kline_key];

        let exchange_prices = await redis.get_redis_data('exchange_prices');
        exchange_prices = JSON.parse(exchange_prices);
        let exchange_key = Object.keys(exchange_prices)[0];
        let exchange_item = exchange_prices[exchange_key];
        //
        let data;
        //
        if(method == 'ex_summary'){
          let asks_bids = await redis.get_redis_data('celo_exchange_bids_asks');
          asks_bids = JSON.parse(asks_bids);
          let bids = asks_bids.bids;
          let asks = asks_bids.asks;
          //
          let trading_pairs = "CELO_CUSD";
          let last_price = kline_item.close;
          let lowest_ask = asks[0][1];//1/exchange_item.cUSD;
          let highest_bid = bids[0][1];//exchange_item.CELO/1;
          let base_volume = kline_item.base_volume;
          let quote_volume = kline_item.volume;
          let price_change_percent_24h = parseFloat(((kline_item.close - kline_item.open)*100)/kline_item.close,2);
          let highest_price_24h = kline_item.high;
          let lowest_price_24h = kline_item.low;
          //
          data = {trading_pairs,last_price,lowest_ask,highest_bid,base_volume,quote_volume,price_change_percent_24h,highest_price_24h,lowest_price_24h};
        }
        //24-hour rolling window price change statistics for all markets.
        //https://open.bkiex.com/api/allticker
        else if(method == 'ex_assets'){
          let name = "CELO";
          //https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?CMC_PRO_API_KEY=UNIFIED-CRYPTOASSET-INDEX&listing_status=active
          let unified_cryptoasset_id = "5567";//CELO
          let can_withdraw = "true";
          let can_deposit = "true";
          let min_withdraw = "0.000000000000000001";
          let max_withdraw = "0.000000000000000001";
          let maker_fee = "0.00";
          let taker_fee = "0.005";
          let CELO = {name,unified_cryptoasset_id,can_withdraw,can_deposit,min_withdraw,max_withdraw,maker_fee,taker_fee};
          //
          name = "Celo Dollar";
          unified_cryptoasset_id = "7236";
          can_withdraw = "true";
          can_deposit = "true";
          min_withdraw = "0.000000000000000001";
          max_withdraw = "0.000000000000000001";
          maker_fee = "0.00";
          taker_fee = "0.005";
          let CUSD = {name,unified_cryptoasset_id,can_withdraw,can_deposit,min_withdraw,max_withdraw,maker_fee,taker_fee};
          //
          data = {CELO,CUSD};
        }
        //Market depth of a trading pair. One array containing a list of ask prices and another array containing bid prices.
        //Query for level 2 order book with full depth available as minimum requirement.
        //https://pub.bitnaru.com/v1/trades/ETH_BTC
        else if(method == 'ex_ticker'){
          let base_id = "5567";//CELO
          let quote_id = "7236";//CUSD
          let last_price = kline_item.close;
          let quote_volume = kline_item.volume;
          let base_volume = kline_item.base_volume;
          let isFrozen = "0";
          let CELO_CUSD = {base_id,quote_id,last_price,quote_volume,base_volume,isFrozen};

          data = {CELO_CUSD};
        }
        //Recently completed trades for a given market. 24 hour historical full trades available as minimum requirement.
        //https://poloniex.com/public?command=returnCurrencies
        else if(method == 'ex_orderbook'){
          let asks_bids = await redis.get_redis_data('celo_exchange_bids_asks');
          asks_bids = JSON.parse(asks_bids);
          let timestamp = new Date().getTime();
          let bids = asks_bids.bids;
          let asks = asks_bids.asks;
          //
          data = {timestamp,bids,asks};
        }
        //TRADES   /trades/market_pair
        //The trades endpoint is to return data on all recently completed trades for a given market pair.
        else if(method == 'ex_celocusd'){//base_quote
          let exchange_records = await redis.get_redis_data('celo_exchange_records');
          exchange_records = JSON.parse(exchange_records);
          //
          let CELO_CUSD = [];
          for(let i=0;i<100;i++){
            let item = exchange_records[i];
            let trade_id = parseInt(item.blockNumber);
            let price = item.sellAmount/item.buyAmount;
            let timestamp = parseInt(item.timestamp);
            let type = 'Buy';//cusd->celo
            let quote_volume = item.sellAmount/1e+18;
            let base_volume = item.buyAmount/1e+18;
            if(item.soldGold){
              type = 'Sell';//celo->cusd
              price = item.buyAmount/item.sellAmount;
              quote_volume = item.buyAmount/1e+18;
              base_volume = item.sellAmount/1e+18;
            }
            CELO_CUSD.push({trade_id,timestamp,price,quote_volume,base_volume,type});
          }
          data = {CELO_CUSD};
        }
        else if(method == 'ex_totalcoins'){
          let CELO = 0;
          if(eth_dataset&&eth_dataset.cGLD_totalSupply)
            CELO = eth_dataset.cGLD_totalSupply;
          let CUSD = 0;
          if(eth_dataset&&eth_dataset.cUSD_totalSupply)
            CUSD = eth_dataset.cUSD_totalSupply;
          data = {CELO,CUSD};
        }
        else if(method == 'ex_celo_circulating'){
          response.end(eth_dataset.cGLD_totalSupply.toString());
          return;
        }
        else if(method == 'ex_cusd_circulating'){
          response.end(eth_dataset.cUSD_totalSupply.toString());
          return;
        }
        let code = "200";
        let msg = "success";
        response.end(JSON.stringify({code,msg,data}));
      }
      ///////////////////////////////////////////////
      ///////////////////////////////////////////////
      else{
        response.end('{"error parameter!"}\n');
      }
      //
    } catch(e) {
        console.log('Error:', e.stack);
        response.end();
    }
}).listen(port, '127.0.0.1');
//http://127.0.0.1:3000/?method=group_info&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261
//http://127.0.0.1:3000/?method=add_keybase&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261&username=sunxmldapp&website=https://bi23.com
//http://127.0.0.1:3000/?method=query_keybase&address=0xffac3dcf14dc8e678204e2388031d4cc3e366261
//http://127.0.0.1:3000/?method=update_groups
//http://127.0.0.1:3000/?method=groups
//
function get_dashboard(response){
  var dashboard = new Array();
  //
  if(eth_blockdata&&eth_blockdata.eth_blockNumber)
    dashboard.push(eth_blockdata.eth_blockNumber);
  else {
    dashboard.push(0);
  }
  //Average Block Time
  var averageblocktime = 5;
  dashboard.push(averageblocktime);
  //Blocks until Epoch
  if(eth_blockdata&&eth_blockdata.eth_blockNumber)
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
  if(eth_dataset&&eth_dataset.cGLD_totalSupply)
    dashboard.push(cGLD_price*eth_dataset.cGLD_totalSupply);
  else {
    dashboard.push(0);
  }
  //Active Nodes
  dashboard.push(9);
  //Elected Groups
  //
  var elected_groups = 0;
  Object.keys(groups).forEach((key,i) => {
    if(groups[key][3]>0){
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
  if(eth_dataset&&eth_dataset.cGLD_totalSupply)
    dashboard.push(eth_dataset.cGLD_totalSupply);
  else {
    dashboard.push(0);
  }
  //cGLD_addresses
  if(eth_dataset&&eth_dataset.cGLD_addresses)
    dashboard.push(eth_dataset.cGLD_addresses);
  else {
    dashboard.push(0);
  }
  //cGLD_transfers
  if(eth_dataset&&eth_dataset.cGLD_transfers)
    dashboard.push(eth_dataset.cGLD_transfers);
  else {
    dashboard.push(0);
  }
  //cUSD_totalSupply
  if(eth_dataset&&eth_dataset.cUSD_totalSupply)
    dashboard.push(eth_dataset.cUSD_totalSupply);
  else {
    dashboard.push(0);
  }
  //cUSD_addresses
  if(eth_dataset&&eth_dataset.cUSD_addresses)
    dashboard.push(eth_dataset.cUSD_addresses);
  else {
    dashboard.push(0);
  }
  //cUSD_transfers
  if(eth_dataset&&eth_dataset.cUSD_transfers)
    dashboard.push(eth_dataset.cUSD_transfers);
  else {
    dashboard.push(0);
  }
  //miner/group
  if(eth_blockdata && eth_blockdata.eth_group){
    dashboard.push(eth_blockdata.eth_group);
    dashboard.push(eth_blockdata.name);
    dashboard.push(eth_blockdata.logo);
  }
  //vote_reward_apr
  dashboard.push('~ 5.48%');
  //
  var jsonString = '{"timestamp":"' + new Date().getTime();
  jsonString += '","dashboard":'+JSON.stringify(dashboard)+'}';
  //thecelo.log_out('jsonString:'+jsonString);
  //
  response.end(jsonString);
}

//
function reloadGroups(){
  redis.redis_client.get(theceloconst.groups_key, function(err, data) {
      if(!err && data){
        var obj = JSON.parse(data);
        groups = obj.groups;
        groups_timestamp = obj.timestamp;
        //
        Object.keys(groups).forEach((address, i) => {
          //
          redis.redis_client.get('group_'+address, function(err, data) {
              if(!err && data){
                var obj = JSON.parse(data);
                var group = obj.group;
                var members = group[13];
                var scores = 0;
                var loop_count = 0;
                for(var i=0;i < members.length;i++){
                  if(members[i][5]){
                    scores += members[i][2];
                    loop_count++;
                  }
                }
                groups[address][8] = scores/loop_count;
              }
            })
          //
        });
      }
  });
}
//
function reloadElectionCurrent(){
  redis.redis_client.get(theceloconst.election_current_key, function(err, data) {
      if(!err && data){
        var obj = JSON.parse(data);
        election_current = obj.election_current;
        election_current_timestamp = obj.timestamp;
      }
  });
}
//
function reloadvalidators(){
  redis.redis_client.get(theceloconst.validators_key, function(err, data) {
      if(!err && data){
        var obj = JSON.parse(data);
        validators = obj.validators;
        validators_timestamp = obj.timestamp;
      }
  });
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
        console.log("client subscribed to " + channel + "," + count + " total subscriptions");
    });
    //
    redis.redis_subscribe_client.on("message", function (channel, message) {
        console.log(channel+":" + message);
        getSubscribeData(channel,message);
    });
    //
    redis.redis_subscribe_client.on("error", function (error) {
        console.log("redis_subscribe_client Error " + error);
    });
    //
    redis.redis_subscribe_client.on("unsubscribe", function (channel, count) {
        console.log("client unsubscribed from" + channel + ", " + count + " total subscriptions")
    });
}
//
function getSubscribeData(channel,message=''){
  //thecelo.log_out('getSubscribeData: '+channel);
  if(channel==theceloconst.groups_key){
    reloadGroups()
  }
  //
  if(channel==theceloconst.election_current_key){
    reloadElectionCurrent()
  }
  //
  if(channel==theceloconst.validators_key){
    reloadvalidators()
  }
  //
  if(channel==theceloconst.eth_blockdata_key){
    if(message) {
      //console.log(message);
      eth_blockdata = JSON.parse(message);
      let group = groups[eth_blockdata.eth_group];
      if(group){
        eth_blockdata['name'] = group[0];
        eth_blockdata['logo'] = group[7];
      }
    }
  }
}
