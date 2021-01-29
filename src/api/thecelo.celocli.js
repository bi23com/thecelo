const thecelo = require("./thecelo.utils.js");
const redis = require("./thecelo.redis.js");
const theceloconst = require("./thecelo.const.js");
const fs = require('fs');
const req = require('request');
const weblogopath = '/thecelocom/logos/';
const attestations = require("./thecelo.attestations.js");
const ethweb3 = require("./thecelo.ethweb3.js");
const ethrpc = require("./thecelo.ethrpc.js");
//
function getSubscribeData() {
    //
    redis.redis_subscribe_client.on("ready", function () {
        //订阅消息
        redis.redis_subscribe_client.subscribe("tx");
    });
    redis.redis_subscribe_client.on("subscribe", function (channel, count) {
        console.log("client subscribed to " + channel + "," + count + " total subscriptions");
    });
    //
    redis.redis_subscribe_client.on("message", function (channel, message) {
        console.log(channel+":" + message);
        if(channel=='tx'){
          var address = message;
          redis.redis_client.get(theceloconst.groups_key, function(err, data) {
              if(!err && data){
                var obj = JSON.parse(data);
                if(thecelo.containsKey(obj.groups,address)!=undefined){
                  console.log("update group:" + address);
                  celocli_group_info(address);
                }
                else{
                  console.log("isn't group address:" + address);
                }
              }
              else {
                console.log(err);
              }
          });
        }
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
function get_validators_score(){
  let validators_score = {};
  let cmd = 'celocli validator:list';
  let rep = thecelo.execCmd(cmd);
  let lines = rep.toString().trim().split('\n');
  lines.forEach( function  (line) {
    if(line.indexOf('0x')==0){
      let values = line.trim().split(/\s+/);//blank or blanks
      let address = values[0];
      let score = values[values.length-4];
      let afiliation = values[values.length-5];
      //console.log(score);
      validators_score[address] = [afiliation,score];
    }
  });
  return validators_score;
}
//
function update_validators_balance(){
  thecelo.log_out('update_validators_balance begin...');
  let validators_balance = {};
  //
  let validators = get_validators_score();
  Object.keys(validators).forEach((address, i) => {
     var balance = account_balance(address);
     validators_balance[address] = balance;
  });
  redis.redis_client.set('validators_balance',JSON.stringify(validators_balance));
  thecelo.log_out('update_validators_balance end...');
}
//
function update_groups_balance(){
  thecelo.log_out('update_groups_balance begin...');
  let groups_balance = {};
  //
  let cmd = 'celocli validatorgroup:list';
  let rep = thecelo.execCmd(cmd);
  let lines = rep.toString().trim().split('\n');
  lines.forEach( function  (line) {
    if(line.indexOf('0x')==0){
      let values = line.trim().split(/\s+/);//blank or blans
      let address = values[0];
      var balance = account_balance(address);
      console.log({address,balance});
      groups_balance[address] = balance;
    }
  });
  //console.log(JSON.stringify(groups_balance));
  redis.redis_client.set('groups_balance',JSON.stringify(groups_balance));
  thecelo.log_out('update_groups_balance end...');
}
//
function account_balance (address) {
    var result = ethweb3.getAccount(address);
    let lockedGold = result.lockedGold;
    let pending = result.pendingWithdrawals;
    let nonVotingLockedGold = result.nonVotingLockedGold;

    var balances = ethrpc.getBalanceOf(address);
    let gold = balances.cgld;
    let usd = balances.cusd;
    return {lockedGold,pending,nonVotingLockedGold,gold,usd};
}
//celocli validatorgroup:list
async function celocli_validatorgroup_list(groups) {
  //
  var groups_metadata = await redis.get_redis_data(theceloconst.groups_metadata_key);
  if(groups_metadata&&groups_metadata.length>0){
    groups_metadata = JSON.parse(groups_metadata);
  }
  //
  var cmd = 'celocli validatorgroup:list';
  var rep = thecelo.execCmd(cmd);
  var lines = rep.toString().trim().split('\n');
  lines.forEach( function  (line) {
    if(line.indexOf('0x')==0){
      var values = line.trim().split(/\s+/);//blank or blans
      var address = values[0]
      var len = values.length;
      var members = values[len-1];
      var commission = values[len-2];
      var name = '';
      for(var i=1;i<len-2;i++){
        if(name.indexOf('cLabs')==-1)
          name+=values[i]+' ';
      }
      name = name.trim();
      var logo =logoExists(address);
      var domain = '';
      if(groups_metadata[address]) domain = groups_metadata[address].domain;
      var keybase = '';
      if(groups_metadata[address]) keybase = groups_metadata[address].keybase;
      //0:name 1:votes,2:Capacity, 3:ElectedCount 4:MemberCount 5:eligible 6:commission,7:logo,8:score,9:domain,10:keybase
      //
      groups[address]=[name,0,0,0,parseInt(members),true,parseFloat(commission),logo,0,domain,keybase];
    }
  });
}
//
function logoExists(address){
  var exists =false;
  var logopath = weblogopath + address.toLowerCase() + '.jpg';
  if(fs.existsSync(logopath)) {
    exists = true;
  }
  return exists;
}
//
function celocli_election_list(groups){
  try {
    var cmd = 'celocli election:list';
    var rep = thecelo.execCmd(cmd);

    var lines = rep.toString().trim().split('\n');
    lines.forEach( function  (line) {
      if(line.indexOf('0x')==0){
        var values = line.trim().split(/\s+/);//blank or blanks
        var address = values[0]
        var len = values.length;
        var eligible = values[len-1];
        var capacity = values[len-2];
        var votes = values[len-3];
        //
        groups[address][1] =+ votes;
        groups[address][2] =+ capacity;
        groups[address][5] = eligible;
      }
    });
  }
  catch(err) {
    if (err) throw err;
  }
}
//celocli election:current
function celocli_election_current (groups,election_current) {
  try {
      var cmd = 'celocli election:current';//
      var rep = thecelo.execCmd(cmd,print=true);
      var lines = rep.toString().trim().split('\n');
      lines.forEach( function  (line) {
        if(line.indexOf('0x')==0){
            var pos1 = line.indexOf(' ');
            var pos2 = line.indexOf(' 0x');
            var address = line.substr(0,pos1);
            var name = line.substr(pos1+1,pos2-(pos1+1)).trim();
            var subline = line.substr(pos2+1,line.length);

            var subvalues = subline.split(' ');
            var affiliation = subvalues[0];
            var score = subvalues[1];
            election_current[address] = [affiliation,score];
            //
            if(groups[affiliation])
              groups[affiliation][3] ++;
        }
      });
    }
    catch(err) {
        if (err) throw err;
    }
  }
//celocli validator:status
async function update_validator_status_all(){
  //address,name,votes,members
  let validators_score = get_validators_score();
  //
  var accounts = {};
  var accounts_data = await redis.get_redis_data(theceloconst.accounts_key);
  if(accounts_data){
    accounts = JSON.parse(accounts_data).addresses;
  }
  //
  var election_current = await redis.get_redis_data(theceloconst.election_current_key);
  if(election_current){
    election_current = JSON.parse(election_current).election_current;
  }
  //address name signer Elected Frontrunner Proposed Signatures score logo metadata_url
  var validators = {};
  try {
    //
    let attestationInfos = await redis.get_redis_data('attestation_infos');
    attestationInfos = JSON.parse(attestationInfos);
    //
    var cmd = 'celocli validator:status --all';
    var rep = thecelo.execCmd(cmd,3,10,false);//cmd,loop = 3,seconds = 10,print=true
    console.log(rep.toString());
    var lines = rep.toString().trim().split('\n');
    for(let i=0;i<lines.length;i++){
      line = lines[i];
      if(line.indexOf('0x')==0){
        //address
        var b = 0;
        var e = line.indexOf(' ',b);
        var address = line.substr(b,e-b).trim();
        //name
        b = e;
        e = line.indexOf('0x',e);
        var name = line.substr(b,e-b).trim();
        //Signer Elected Frontrunner Proposed Signatures
        var l = line.substr(e,line.length-e);
        var values = l.trim().split(/\s+/);
        var signer = values[0];
        var elected = (values[1] == 'true');
        ////////////////////////////////////////
        //tip: after Validator Signer Key Rotation
        ////////////////////////////////////////
        if(election_current[address]) elected = true;
        ////////////////////////////////////////
        ////////////////////////////////////////
        //
        var frontrunner = (values[2] == 'true');
        var proposed = 0;//values[3];
        var signatures = values[3];
        if(signatures==null)
          signatures = '0%';
        var score = 0;
        if(validators_score[address])
          score = validators_score[address][1];
        var logo =logoExists(address);
        //
        var metadata_url="";
        var key = thecelo.containsKey(accounts,address);
        if(key){
          metadata_url = accounts[key][7];
        }
        //Attestations fulfilled/requested
        let attestation =[0,0];
        let key_address = thecelo.containsKey(attestationInfos,address);
        if(key_address){
          attestation = attestationInfos[key_address];
        }
        //console.log(JSON.stringify(attestation));
        let affiliation = '';
        if(validators_score[address]){
          affiliation = validators_score[address][0];
        }
        validators[address] = [name,signer,elected,frontrunner,proposed,signatures,parseFloat(score),logo,metadata_url,attestation[0],attestation[1],affiliation];
      }
    };
  }
  catch(err) {
      if (err) throw err;
  }
  var timestamp = new Date().getTime();
  redis.redis_client.set(theceloconst.validators_key,JSON.stringify({timestamp,validators}));
  redis.redis_client.publish(theceloconst.validators_key,theceloconst.validators_key,function(err,result){});
}

//
async function update_all_group_info(){
  //
  var data = await redis.get_redis_data(theceloconst.groups_key);
  var obj = JSON.parse(data);
  Object.keys(obj.groups).forEach((address,i) => {
     celocli_group_info(obj.groups,address);
  });
  //
  update_networkparameters();
}
//
async function celocli_group_info(groups,group_address){
  //
  thecelo.log_out('celocli_group_info '+group_address+' begin....');
  //
  var validators_balance = await redis.get_redis_data('validators_balance');
  var validators_balance = JSON.parse(validators_balance);
  //
  var data = await redis.get_redis_data(theceloconst.validators_key);
    if(data){
      //thecelo.log_out('data:'+data);
      //address,name,votes,members
      var group = new Array();
      var obj = JSON.parse(data);
      var validators = obj.validators;
      try {
        //address
        group.push(group_address);
        var key = thecelo.containsKey(groups,group_address);
        //name
        group.push(groups[key][0]);
        //votes
        group.push(groups[key][1]);
        //
        var groups_balance = await redis.get_redis_data('groups_balance');
        groups_balance = JSON.parse(groups_balance);
        var balance = groups_balance[group_address];
        group.push(balance['gold']);
        group.push(balance['lockedGold']);
        group.push(balance['usd']);
        group.push(balance['pending']);
        //groupmembers
        var groupmembers = new Array();
        cmd = 'celocli validatorgroup:show '+group_address;
        var rep1 = thecelo.execCmd(cmd);
        var lines1 = rep1.toString().trim().split('\n');
        //
        let commission = 0;
        let nextCommission = 0;
        let nextCommissionBlock = 0;
        let slashingMultiplier = 0;
        let lastSlashed = 0;
        let membersUpdated = 0;
        let members = '';
        lines1.forEach( function  (line) {
          if(line.indexOf('commission: ')>=0){
            commission = line.replace('commission: ','');
          }
          else if(line.indexOf('nextCommission: ')>=0){
            nextCommission = line.replace('nextCommission: ','');
          }
          else if(line.indexOf('nextCommissionBlock: ')>=0){
            nextCommissionBlock = line.replace('nextCommissionBlock: ','');
          }
          else if(line.indexOf('slashingMultiplier: ')>=0){
            slashingMultiplier = line.replace('slashingMultiplier: ','');
          }
          else if(line.indexOf('lastSlashed: ')>=0){
            lastSlashed = line.replace('lastSlashed: ','');
          }
          else if(line.indexOf('membersUpdated: ')>=0){
            membersUpdated = line.replace('membersUpdated: ','');
          }
          else if(line.indexOf('members: ')>=0){
            members = line.replace('members: ','');
          }
        });
        group.push(commission);
        group.push(nextCommission);
        group.push(nextCommissionBlock);
        group.push(slashingMultiplier);
        group.push(lastSlashed);
        group.push(membersUpdated);
        //
        let attestationInfos = await redis.get_redis_data('attestation_infos');
        attestationInfos = JSON.parse(attestationInfos);
        //
        let addresses = members.split(',');
        addresses.forEach( function  (address) {
          if(address.indexOf('0x')>=0){
            let pending = 0;
            let active = 0;
            /*
            cmd = 'celocli election:show '+address+' --voter';
            var rep2 = thecelo.execCmd(cmd);
            var lines2 = rep2.toString().trim().split('\n');
            //pending

            if(lines2.length>6){
                var pendings = lines2[6].trim().split(' ');
                pending = pendings[1];
            }
            //active
            if(lines2.length>7){
                var actives = lines2[7].trim().split(' ');
                active = actives[1];
            }
            */
            ////address name signer Elected Frontrunner Proposed Signatures score logo

            var name = validators[address][0];
            var signer = validators[address][1];
            var elected = validators[address][2];
            var frontrunner = validators[address][3];
            var proposed = validators[address][4];
            var signatures = validators[address][5];
            var score = validators[address][6];
            //////////
            var member = new Array();
            member.push(name);
            member.push(address);
            member.push(score);
            member.push(pending);
            member.push(active);
            member.push(thecelo.getBool(elected));
            //
            var balance = validators_balance[address];
            member.push(balance['gold']);
            member.push(balance['lockedGold']);
            member.push(balance['usd']);
            member.push(balance['pending']);
            //memeber.push(parseFloat(balance['gold'])+parseFloat(balance['lockedGold'])+parseFloat(balance['pending']));
            //
            member.push(signer);
            member.push(thecelo.getBool(frontrunner));
            member.push(proposed);
            member.push(signatures);
            //Attestations fulfilled/requested
            let attestation =[0,0];
            let key_address = thecelo.containsKey(attestationInfos,address);
            if(key_address){
              attestation = attestationInfos[key_address];
            }
            member.push(attestation[0]);
            member.push(attestation[1]);
            //
            groupmembers.push(member);
          }
        });
        //
        group.push(groupmembers);
        //
        var timestamp = new Date().getTime();
        redis.redis_client.set('group_'+group_address,JSON.stringify({timestamp,group}));
      }
      catch(err) {
        if (err) throw err;
      }
    }
    thecelo.log_out('celocli_group_info '+group_address+' end....');
}
//
function update_networkparameters(){
  var timespans = ["updateFrequency","dequeueFrequency","queueExpiry","Approval","Referendum",
    "Execution","unlockingPeriod","reportExpirySeconds","updatePeriod","duration","SlashingMultiplierResetPeriod"];
  var timestamps = ["FactorLastUpdated"];
  var cmd = 'celocli network:parameters';
  var rep = thecelo.execCmd(cmd);
  rep = rep.toString().trim();
  //Using a regular expression with the g flag set will replace all
  //rep = rep.replace(/0000000000000000/g,'cGold');
  var lines = rep.split('\n');
  var html = '';
  var depath=0,old_depath=0;
  lines.forEach( function  (line) {
    if(line.indexOf('Warning')>=0){
      return true
    }
    //
    if(line.indexOf('      ')==0){
      depath = 3;
    }
    else if(line.indexOf('    ')==0){
        depath = 2;
    }
    else if(line.indexOf('  ')==0){
        depath = 1;
      }
    else{
      depath = 0;
    }
    //
    if(depath > 0 && depath == old_depath)
      html += '</li>';
      //
    for(var i=0;i<old_depath-depath;i++){
        html += '</li></ul>';
    }
    //
    if(depath > old_depath)
      html += '<ul>';
    //
    var key_value = line.split(':');
    //
    var key = key_value[0].trim();
    var value = key_value[1].trim();
    //
    if(value.indexOf('000000000')>0){
      var cGolds = value.split(' ');
      value = cGolds[0]/1000000000000000000 + 'CELO';
    }
    if(timespans.indexOf(key)>-1){
      value = thecelo.formatDuraton(value);
    }
    if(timestamps.indexOf(key)>-1){
      var date = new Date(value);
      value = date.toJSON().substr(0, 19);
    }
    //
    key = key.replace( /([A-Z])/g, ' $1')
    //
    var keyvalue = '<span class="text-secondary" set-lan="html:'+key+': ">' + key+ ': </span><span class="text-success" > '+value+'</span>';
    //
    if(depath == 0){
      if(old_depath != 0)
        html += '<hr/>';
      html += '<p><strong>' + keyvalue + '</strong></p>';
    }
    else{
      html += '<li>' + keyvalue;
    }
    //
    old_depath = depath;
  });
  //
  for(var i=0;i<depath;i++){
      html += '</li></ul>';
  }
  //
  var htmlString = 'var parameters = \''+html+'\';';
  redis.redis_client.set(theceloconst.network_parameters_key,htmlString);
}
/////////////////////////////////////////////////
async function update_groups_list(){
  //address 0:name 1:votes,2:Capacity, 3:ElectedCount 4:MemberCount 5:eligible 6:commission,7:logo,8:score
  var groups = {};
  await celocli_validatorgroup_list(groups);
  //address Affiliation Score
  var election_current = {};
  celocli_election_current(groups,election_current);
  //
  celocli_election_list(groups);
  var timestamp =new Date().getTime();
  //
  redis.redis_client.set(theceloconst.groups_key,JSON.stringify({timestamp,groups}));
  redis.redis_client.set(theceloconst.election_current_key,JSON.stringify({timestamp,election_current}));
  redis.redis_client.publish(theceloconst.groups_key,theceloconst.groups_key,function(err,result){});
  redis.redis_client.publish(theceloconst.election_current_key,theceloconst.election_current_key,function(err,result){});
}
//account:unlock
function account_unlock (address,password) {
    //console.log('============================account:unlock begin!============================');
    var cmd = 'celocli account:unlock '+address+'  --password '+password;
    var rep = execCmd(cmd);
    //console.log(util.format('%s',rep));
    //console.log('============================account:unlock end!============================');
}
//transfer:dollars
function transfer_dollars(validator_address,validator_group_address) {
    try {
        var balances = account_balance(validator_address);
        //
        if(balances['usd'] > 0){
          var cmd = 'celocli transfer:dollars --from '+validator_address+' --to '+validator_group_address+' --value '+balances['usd'];
          var rep = thecelo.execCmd(cmd);
        }
        //
        balances = account_balance(validator_group_address);
        if(balances['usd'] > 0){
            var cmd = 'celocli exchange:dollars --value '+ balances['usd'] +' --from '+validator_group_address+' --forAtLeast '+(balances['usd']*0.9);
            var rep = thecelo.execCmd(cmd);
          }
        //
        balances = account_balance(validator_group_address);
        if(balances['gold'] > 1){
            var lockedgold = Number.parseFloat(balances['gold']).toFixed()/Number.parseFloat('1e+18').toFixed()-1;
            lockedgold = lockedgold * Number.parseFloat('1e+18').toFixed();
            console.log(util.format('lockedgold=%d',lockedgold));
            lockedgold = Number.parseInt(lockedgold);
            var cmd = 'celocli lockedgold:lock --value '+ lockedgold +' --from '+validator_group_address;
            var rep = thecelo.execCmd(cmd);
            //
            var cmd = 'celocli election:vote --value '+ lockedgold +' --from '+validator_group_address+' --for '+validator_group_address;
            var rep = thecelo.execCmd(cmd);
            //
            var cmd = 'celocli election:activate --wait --from '+validator_group_address;
            var rep = ethecelo.xecCmd(cmd);
          }
      }
    catch(err) {
        console.log(util.format('error: %s',err));
      }
}
//
module.exports = {
       update_all_group_info,update_groups_list,update_validator_status_all,
       transfer_dollars,
       getSubscribeData,
       update_groups_balance,
       update_validators_balance,
       account_balance
     }
