const fs = require("fs");
var util = require("util");
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
const config = require("configuration");
//
var validator_address = "f823e8a4ba6adddb02e97b5b8886d18e41b2723e";
var validator_group_address = "fFAC3DcF14DC8e678204E2388031d4cc3e366261";
//
function toNonExponential(num) {
  return Number.parseFloat(num).toFixed();
}
function group_ascend(x, y) {
  return x[2] - y[2];
}
function group_descend(x, y) {
  return y[2] - x[2];
}
function leaderboard_ascend(x, y) {
  return x[5] - y[5];
}
function leaderboard_descend(x, y) {
  return y[5] - x[5];
}
//
function formatDuraton(time) {
  var result = "";
  if (time > -1) {
    var day = Math.floor(time / (24 * 3600));
    time = time - day * 24 * 3600;
    var hour = Math.floor(time / 3600);
    time = time - hour * 3600;
    var minute = Math.floor(time / 60);
    var second = time - minute * 60;
    if (day > 0) {
      result +=
        " " +
        day +
        (day > 1
          ? '<span set-lan="html:days"></span>'
          : '<span set-lan="html:day"></span>');
    }
    if (hour > 0) {
      result +=
        " " +
        hour +
        (hour > 1
          ? '<span set-lan="html:hours"></span>'
          : '<span set-lan="html:hour"></span>');
    }
    if (minute > 0) {
      result +=
        " " +
        minute +
        (minute > 1
          ? '<span set-lan="html:minutes"></span>'
          : '<span set-lan="html:minute"></span>');
    }
    if (second > 0) {
      result +=
        " " +
        second +
        (second > 1
          ? '<span set-lan="html:seconds"></span>'
          : '<span set-lan="html:second"></span>');
    }
  }
  return result;
}
//account:unlock
function account_unlock(address, password) {
  //console.log('============================account:unlock begin!============================');
  var cmd = "celocli account:unlock " + address + "  --password " + password;
  var rep = execCmd(cmd);
  //console.log(util.format('%s',rep));
  //console.log('============================account:unlock end!============================');
}
//
function account_balance(address) {
  var balances = [
    ["usd", ""],
    ["gold", ""],
    ["lockedGold", ""],
    ["total", ""],
  ];
  //console.log('============================account:balance begin!============================');
  var cmd = "celocli account:balance " + address;
  var rep = execCmd(cmd);
  //console.log(util.format('%s',rep));
  var lines = rep.toString().trim().split("\n");
  //
  balances["gold"] = lines[1].trim().replace("gold: ", "");
  balances["lockedGold"] = lines[2].trim().replace("lockedGold: ", "");
  balances["usd"] = lines[3].trim().replace("usd: ", "");
  balances["total"] = lines[4].trim().replace("total: ", "");
  //console.log('============================account:balance end!============================');
  return balances;
}
//transfer:dollars
function transfer_dollars(validator_address, validator_group_address) {
  try {
    var balances = account_balance(validator_address);
    //
    if (balances["usd"] > 0) {
      //console.log('============================transfer:dollars begin!============================');
      var cmd =
        "celocli transfer:dollars --from " +
        validator_address +
        " --to " +
        validator_group_address +
        " --value " +
        balances["usd"];
      var rep = execCmd(cmd);
      //console.log(util.format('%s',rep));
      //console.log('============================transfer:dollars end!============================');
    }
    //
    balances = account_balance(validator_group_address);
    if (balances["usd"] > 0) {
      //console.log('============================exchange:dollars begin!============================');
      var cmd =
        "celocli exchange:dollars --value " +
        balances["usd"] +
        " --from " +
        validator_group_address +
        " --forAtLeast " +
        balances["usd"] * 0.9;
      var rep = execCmd(cmd);
      //console.log(util.format('%s',rep));
      //console.log('============================exchange:dollars end!============================');
    }
    //
    balances = account_balance(validator_group_address);
    if (balances["gold"] > 1) {
      var lockedgold =
        Number.parseFloat(balances["gold"]).toFixed() /
          Number.parseFloat("1e+18").toFixed() -
        1;
      lockedgold = lockedgold * Number.parseFloat("1e+18").toFixed();
      console.log(util.format("lockedgold=%d", lockedgold));
      lockedgold = Number.parseInt(lockedgold);
      //console.log('============================lockedgold:lock begin!============================');
      var cmd =
        "celocli lockedgold:lock --value " +
        lockedgold +
        " --from " +
        validator_group_address;
      var rep = execCmd(cmd);
      //console.log(util.format('%s',rep));
      //console.log('============================lockedgold:lock end!============================');
      //
      //console.log('============================election:vote begin!============================');
      var cmd =
        "celocli election:vote --value " +
        lockedgold +
        " --from " +
        validator_group_address +
        " --for " +
        validator_group_address;
      var rep = execCmd(cmd);
      //console.log(util.format('%s',rep));
      //console.log('============================election:vote end!============================');
      //
      //console.log('============================election:activate begin!============================');
      var cmd =
        "celocli election:activate --wait --from " + validator_group_address;
      var rep = execCmd(cmd);
      //console.log(util.format('%s',rep));
      //console.log('============================election:activate end!============================');
    }
  } catch (err) {
    console.log(util.format("error: %s", err));
  }
}
//
function execCmd(cmd, loop = 3, seconds = 10, print = true) {
  var reponse;
  try {
    if (print) {
      var logstr = util.format("%d:%s", loop, cmd);
      log_out(logstr);
    }
    reponse = execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    console.log(util.format("%d:execCmd error: %s", loop, err));
    if (loop > 1) {
      var waitTill = new Date(new Date().getTime() + seconds * 1000);
      while (waitTill > new Date()) {}
      reponse = execCmd(cmd, --loop, seconds);
    }
  }
  return reponse;
}
//
function getBool(val) {
  return !!JSON.parse(String(val).toLowerCase());
}
//
/*
circulatingsupply
totalsupply
totalvotes
totalvalidators
totalgroups

validator_election_current:Address Name Affiliation Score Ecdsapublickey Blspublickey Signer
group_election_list:Address Name Votes Capacity Eligible
validatorgroup_list:Address Name Commission Members

validatorlist:{address,name,v}
grouplist:{address,name,commission,votes,capacity,members,electeds,eligible}
validators
*/
function group_info(group_address, redis_client) {
  log_out("group_info begin!");
  //address,name,votes,members
  var item = new Array();
  try {
    //address
    item.push(group_address);
    //
    //
    var cmd = "celocli election:show " + group_address + " --group";
    var rep0 = execCmd(cmd);
    var lines0 = rep0.toString().trim().split("\n");
    //name
    var name = lines0[3].trim();
    name = name.replace("name: ", "");
    item.push(name);
    //votes
    var votes = lines0[4].trim().split(" ");
    var vote = votes[1];
    item.push(vote);
    //
    var balance = account_balance(group_address);
    item.push(balance["gold"]);
    item.push(balance["lockedGold"]);
    item.push(balance["usd"]);
    item.push(balance["total"]);
    //members
    var members = new Array();
    cmd = "celocli validatorgroup:show " + group_address;
    var rep1 = execCmd(cmd);
    var lines1 = rep1.toString().trim().split("\n");
    //commission
    var commission = lines1[6].replace("commission: ", "");
    item.push(commission);
    // membersUpdated
    var membersUpdated = lines1[5].replace("membersUpdated: ", "");
    item.push(membersUpdated);
    //
    var addresses = lines1[4].replace("members: ", "").split(",");
    addresses.forEach(function (address) {
      cmd = "celocli election:show " + address + " --voter";
      var rep2 = execCmd(cmd);
      var lines2 = rep2.toString().trim().split("\n");
      //pending
      var pending = 0;
      if (lines2.length > 6) {
        var pendings = lines2[6].trim().split(" ");
        pending = pendings[1];
      }
      //active
      var active = 0;
      if (lines2.length > 7) {
        var actives = lines2[7].trim().split(" ");
        active = actives[1];
      }
      //
      var name, score, signer;
      //
      cmd = "celocli validator:show " + address;
      var rep3 = execCmd(cmd);
      var lines3 = rep3.toString().trim().split("\n");
      name = lines3[2].trim().replace("name: ", "");
      score = lines3[7].trim().replace("score: ", "");
      signer = lines3[8].trim().replace("signer: ", "");
      //Elected Frontrunner Proposed Signatures
      var elected, frontrunner, proposed, signatures;
      cmd = "celocli validator:status --validator " + address;
      var rep4 = execCmd(cmd);
      //console.log(rep4.toString());
      var lines4 = rep4.toString().trim().split("\n");
      var line = lines4[4].toString().trim();
      //console.log(line);
      var b = line.indexOf(signer) + signer.length;
      line = line.substr(b, line.length);
      //console.log(line);
      var values = line.trim().split(/\s+/); //blank or blans
      elected = values[0];
      frontrunner = values[1];
      proposed = values[2];
      signatures = values[3];
      //////////
      var member = new Array();
      member.push(name);
      member.push(address);
      member.push(score);
      member.push(pending);
      member.push(active);
      member.push(getBool(elected));
      //
      var balance = account_balance(address);
      member.push(balance["gold"]);
      member.push(balance["lockedGold"]);
      member.push(balance["usd"]);
      member.push(balance["total"]);
      //
      member.push(signer);
      member.push(getBool(frontrunner));
      member.push(proposed);
      member.push(signatures);
      //
      members.push(member);
    });
    //
    item.push(members);
    //
    var jsonstring = JSON.stringify(item);
    console.log(jsonstring);
    redis_client.set(group_address, jsonstring);
    redis_client.get(group_address, function (err, reply) {
      console.log(reply);
    });
  } catch (err) {
    console.log(util.format("group_info error: %s", err));
    return null;
  }
  log_out("group_info end!");
  return item;
}
//celocli validatorgroup:list
function grouplist(redis_client) {
  var groups = new Array();
  //
  var cmd = "celocli validatorgroup:list";
  var rep = execCmd(cmd);
  var lines = rep.toString().trim().split("\n");
  lines.forEach(function (line) {
    if (line.indexOf("0x") == 0 && line.indexOf("C-Labs") == -1) {
      var values = line.trim().split(/\s+/); //blank or blans
      var address = values[0];
      var len = values.length;
      var members = values[len - 1];
      var commission = values[len - 2];
      var name = "";
      for (var i = 1; i < len - 2; i++) {
        name += values[i] + " ";
      }
      name = name.trim();
      //var group = group_info(address,redis_client);
      var group = [];
      group.push(address);
      group.push(name);
      group.push(members);
      group.push(commission);
      //
      groups.push({ address: address, group: group });
    }
  });
  //
  var cmd = "celocli election:list";
  var rep = execCmd(cmd);
  var lines = rep.toString().trim().split("\n");
  lines.forEach(function (line) {
    if (line.indexOf("0x") == 0 && line.indexOf("C-Labs") == -1) {
      var values = line.trim().split(/\s+/); //blank or blans
      var address = values[0];
      var len = values.length;
      var eligible = values[len - 1];
      var capacity = values[len - 2];
      var votes = values[len - 3];
      //
      var group = groups[address];
      group.push(votes);
      group.push(capacity);
      group.push(eligible);
    }
  });
  return groups; //address name members commission votes capacity eligible
}
//
function log_out(title) {
  var timestr = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  console.log(util.format("====%s %s====", timestr, title));
}
//celocli election:list
function validatorgroup_info() {
  log_out("validatorgroup_info begin!");
  try {
    var election_validators = {};
    var cmd = "celocli election:current";
    var rep = execCmd(cmd);
    var lines = rep.toString().trim().split("\n");
    lines.forEach(function (line) {
      if (line.indexOf("0x") == 0) {
        var pos1 = line.indexOf(" ");
        var pos2 = line.indexOf(" 0x");
        var address = line.substr(0, pos1);
        var name = line.substr(pos1 + 1, pos2 - (pos1 + 1)).trim();
        var subline = line.substr(pos2 + 1, line.length);
        var subvalues = subline.split(" ");
        var score = subvalues[1];
        election_validators[address] = { name, score };
      }
    });
    console.log(
      util.format("election_validators:%d", election_validators.length)
    );
    //
    var election_groups = new Array();
    cmd = "celocli election:list";
    rep = execCmd(cmd);
    lines = rep.toString().trim().split("\n");
    console.log(util.format("election_list:%d", lines.length));
    lines.forEach(function (line) {
      if (
        line.indexOf("0x") == 0 &&
        line.indexOf("C-Labs") == -1 &&
        line.indexOf(" false") == -1
      ) {
        var values = line.split(" ");
        cmd = "celocli election:show " + values[0] + " --group";
        var rep0 = execCmd(cmd);
        var lines0 = rep0.toString().trim().split("\n");
        //address,name,votes,members
        var item = new Array();
        //address
        item.push(values[0].trim());
        //name
        var name = lines0[3].trim();
        name = name.replace("name: ", "");
        item.push(name);
        //votes
        var votes = lines0[4].trim().split(" ");
        var vote = votes[1];
        item.push(vote);
        //
        var balance = account_balance(values[0]);
        item.push(balance["gold"]);
        item.push(balance["lockedGold"]);
        item.push(balance["usd"]);
        item.push(balance["total"]);
        //members
        var members = new Array();
        cmd = "celocli validatorgroup:show " + item[0];
        var rep1 = execCmd(cmd);
        var lines1 = rep1.toString().trim().split("\n");
        //commission
        var commission = lines1[6].replace("commission: ", "");
        item.push(commission);
        // membersUpdated
        var membersUpdated = lines1[5].replace("membersUpdated: ", "");
        item.push(membersUpdated);
        //
        var addresses = lines1[4].replace("members: ", "").split(",");
        addresses.forEach(function (address) {
          cmd = "celocli election:show " + address + " --voter";
          var rep2 = execCmd(cmd);
          var lines2 = rep2.toString().trim().split("\n");
          //pending
          var pending = 0;
          if (lines2.length > 6) {
            var pendings = lines2[6].trim().split(" ");
            pending = pendings[1];
          }
          //active
          var active = 0;
          if (lines2.length > 7) {
            var actives = lines2[7].trim().split(" ");
            active = actives[1];
          }
          //
          var name, score, elected;
          //if(address in election_validators){
          if (election_validators.hasOwnProperty(address)) {
            elected = true;
            //
            name = election_validators[address]["name"];
            score = election_validators[address]["score"];
          } else {
            elected = false;
            //
            cmd = "celocli validator:show " + address;
            console.log(util.format("%s", cmd));
            var rep3 = execCmd(cmd);
            var lines3 = rep3.toString().trim().split("\n");
            name = lines3[2].trim().replace("name: ", "");
            score = lines3[7].trim().replace("score: ", "");
          }
          //
          var member = new Array();
          member.push(name);
          member.push(address);
          member.push(score);
          member.push(pending);
          member.push(active);
          member.push(elected);
          //
          var balance = account_balance(address);
          member.push(balance["gold"]);
          member.push(balance["lockedGold"]);
          member.push(balance["usd"]);
          member.push(balance["total"]);
          //
          members.push(member);
        });
        //
        item.push(members);
        //
        election_groups.push(item);
      }
    });
  } catch (err) {
    console.log(util.format("validatorgroup_info error: %s", err));
    return null;
  }
  log_out("validatorgroup_info end!");
  return election_groups;
}
//
function all_validator_status() {
  log_out("all_validator_status begin!");
  //address,name,votes,members
  var validators = new Array();
  try {
    var cmd = "celocli validator:status --all";
    var rep = execCmd(cmd);
    var lines = rep.toString().trim().split("\n");
    lines.forEach(function (line) {
      if (line.indexOf("0x") == 0 && line.indexOf("CLabs") == -1) {
        //address
        var b = 0;
        var e = line.indexOf(" ", b);
        var address = line.substr(b, e - b).trim();
        //name
        b = e;
        e = line.indexOf("0x", e);
        var name = line.substr(b, e - b).trim();
        //Signer Elected Frontrunner Proposed Signatures
        var l = line.substr(e, line.length - e);
        var values = l.trim().split(/\s+/);
        var signer = values[0];
        var elected = getBool(values[1]);
        var frontrunner = getBool(values[2]);
        var proposed = values[3];
        var signatures = values[4];
        //
        var item = new Array();
        item.push(address);
        item.push(name);
        item.push(signer);
        item.push(elected);
        item.push(frontrunner);
        item.push(proposed);
        item.push(signatures);
        //
        if ((!elected && frontrunner) || (elected && !frontrunner))
          validators.unshift(item);
        else validators.push(item);
      }
    });
  } catch (err) {
    if (err) throw err;
    //console.log(util.format('all_validator_status error: %s',err));
    //return null;
  }
  log_out("all_validator_status end!");
  return validators;
}
//
function update_all_validator_status() {
  var validators = all_validator_status();
  if (validators != null) {
    var timestamp = new Date().getTime();
    var jsonString = "var validators_status_timstamp =" + timestamp + ";";
    validators = validators.sort(function (x, y) {
      if (y[3] && y[4] && x[3] && x[4]) return 0; //-
      if (y[3] && y[4] && !x[3] && !x[4]) return 1; //y x
      if (y[3] && y[4] && x[3] && !x[4]) return -1; //x y
      if (y[3] && y[4] && !x[3] && x[4]) return -1; //x y

      if (!y[3] && !y[4] && !x[3] && !x[4]) return 0; //-
      if (!y[3] && !y[4] && x[3] && x[4]) return -1; //x y
      if (!y[3] && !y[4] && x[3] && !x[4]) return -1; //x y
      if (!y[3] && !y[4] && !x[3] && x[4]) return -1; //x y

      if (!y[3] && y[4] && x[3] && x[4]) return 1; //y x
      if (!y[3] && y[4] && !x[3] && !x[4]) return 1; //y x
      if (!y[3] && y[4] && !x[3] && x[4]) return 0; //=
      if (!y[3] && y[4] && x[3] && !x[4]) return 0; //=

      if (y[3] && !y[4] && x[3] && x[4]) return 1; //y x
      if (y[3] && !y[4] && !x[3] && !x[4]) return 1; //y x
      if (y[3] && !y[4] && !x[3] && x[4]) return 0; //=
      if (y[3] && !y[4] && x[3] && !x[4]) return 0; //=

      return 0;
    });
    console.log(util.format("%s", JSON.stringify(validators) + ""));
    jsonString += "var validators_status =" + JSON.stringify(validators) + ";";
    //print json
    var filename = "/thecelocom/js/celo.validators.status.js";
    fs.writeFile(filename, jsonString, (err) => {
      if (err) throw err;
    });
  }
  return true;
}
//
function update_groups() {
  var groups = validatorgroup_info();
  if (groups != null) {
    var timestamp = new Date().getTime();
    var jsonString = "var timstamp =" + timestamp + ";";
    jsonString +=
      "var groups =" + JSON.stringify(groups.sort(group_descend)) + ";";
    //print json
    var filename = "/thecelocom/js/celo.data.js";
    fs.writeFile(filename, jsonString, (err) => {
      if (err) throw err;
    });
  }
  return true;
}
//
function get_leaderboard() {
  //
  var path = "logs/";
  var validators = new Array();
  //
  /*
    var data = fs.readFileSync(path+'TGCSO Leaderboard  - Detailed  - TGCSO.csv', 'utf8');
    var lines = data.toString().trim().split('\n');
    lines.forEach( function  (line) {
        if(line.indexOf('0x') == 0){
            var item = line.trim().split(',');
            if(item[1].trim().length > 0){
                var validator = new Array();
                validator.push(item[0]);
                validator.push(item[1]);
                validator.push(item[2]);
                validator.push(item[3]);
                validator.push(item[4]);
                validator.push(item[5]);
                validator.push(item[6]);
                validators.push(validator);
            }
        }
    });
    */
  //
  var spreadsheetId = "1Me56YkCHYmsN23gSMgDb1hZ_ezN0sTjNW4kyGbAO9vc";
  var cellRange = "A3%3AR111";
  var apiKey = "AIzaSyC2_r5XmQkIqOu-n0IQpXnAHBklQblGu2Q";
  var url =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    spreadsheetId +
    "/values/" +
    cellRange +
    "?";
  //https://sheets.googleapis.com/v4/spreadsheets/1Me56YkCHYmsN23gSMgDb1hZ_ezN0sTjNW4kyGbAO9vc/values/A3%3AR111?dateTimeRenderOption=SERIAL_NUMBER&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&key=AIzaSyC2_r5XmQkIqOu-n0IQpXnAHBklQblGu2Q
  url +=
    "dateTimeRenderOption=SERIAL_NUMBER&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&key=" +
    apiKey;
  var cmd =
    "curl \
      '" +
    url +
    "' \
      --header 'Accept: application/json' \
      --compressed";
  var rep = execCmd(cmd);
  const json = JSON.parse(rep);
  console.log(util.format("%s", rep));
  validators = json.values;
  //
  var timestamp = new Date().getTime();
  var jsonString = "var leader_timstamp =" + timestamp + ";";
  jsonString +=
    "var leader_validators =" +
    JSON.stringify(validators.sort(leaderboard_descend)) +
    ";";
  //print json
  var filename = "/thecelocom/js/celo.leaderboard.data.js";
  fs.writeFile(filename, jsonString, (err) => {
    if (err) throw err;
    /*
        try {
            var cmd = "sshpass -p 'Winner!587%@#456<>?' scp -r "+filename+" root@47.52.111.198:/var/www/bi23-show/public/js/celo.leaderboard.data.js";
            execCmd(cmd);
        }
        catch(err) {
            console.log(util.format('sshpass error: %s',err));
        }
        */
  });
}
//
function get_networkparameters() {
  var timespans = [
    "updateFrequency",
    "dequeueFrequency",
    "queueExpiry",
    "Approval",
    "Referendum",
    "Execution",
    "unlockingPeriod",
    "reportExpirySeconds",
    "updatePeriod",
    "duration",
  ];
  var cmd = "celocli network:parameters";
  var rep = execCmd(cmd);
  rep = rep.toString().trim();
  //Using a regular expression with the g flag set will replace all
  //rep = rep.replace(/0000000000000000/g,'cGold');
  var lines = rep.split("\n");
  var html = "";
  var depath = 0,
    old_depath = 0;
  lines.forEach(function (line) {
    //
    if (line.indexOf("      ") == 0) {
      depath = 3;
    } else if (line.indexOf("    ") == 0) {
      depath = 2;
    } else if (line.indexOf("  ") == 0) {
      depath = 1;
    } else {
      depath = 0;
    }
    //
    if (depath > 0 && depath == old_depath) html += "</li>";
    //
    for (var i = 0; i < old_depath - depath; i++) {
      html += "</li></ul>";
    }
    //
    if (depath > old_depath) html += "<ul>";
    //
    var key_value = line.split(":");
    //
    var key = key_value[0].trim();
    var value = key_value[1].trim();
    //
    if (value.indexOf("000000000") > 0) {
      var cGolds = value.split(" ");
      value = cGolds[0] / 1000000000000000000 + "Gold";
    }
    if (timespans.indexOf(key) > -1) {
      value = formatDuraton(value);
    }
    //
    var keyvalue =
      '<span class="text-secondary" set-lan="html:' +
      key +
      '">' +
      key +
      ':</span><span class="text-success" > ' +
      value +
      "</span>";
    //
    if (depath == 0) {
      if (old_depath != 0) html += "<hr/>";
      html += "<p><strong>" + keyvalue + "</strong></p>";
    } else {
      html += "<li>" + keyvalue;
    }
    //
    old_depath = depath;
  });
  //
  for (var i = 0; i < depath; i++) {
    html += "</li></ul>";
  }
  //
  var htmlString = "var parameters = '" + html + "';";
  var filename = "/thecelocom/js/celo.networkparameters.data.js";
  fs.writeFile(filename, htmlString, (err) => {
    if (err) throw err;
  });
}
//
function get_elected_validators() {
  var election_groups = new Array();
  cmd = "celocli election:current";
  //console.log(util.format('%s',cmd));
  rep = execCmd(cmd);
  lines = rep.toString().trim().split("\n");
  //lines.forEach( function  (line) {
  for (var i = lines.length; i >= lines.length - 10; i--) {
    var line = lines[i - 1];
    if (line.indexOf("0x") == 0) {
      var values = line.split(" ");
      var address = values[0];
      var cmd = "celocli validator:status --validator " + address;
      var rep1 = execCmd(cmd, 3, 10, false);
      var lines1 = rep1.toString().trim().split("\n");
      var status;
      if (lines1.length == 5) status = lines1[4];
      else status = rep1;
      console.log(util.format("%s", status));
    }
  }
}
function get_votes(address) {
  //celocli validator:show 7d838ea0e6bcd12b6dcc13087d0eb242f99ffe1e
  //affiliation:
  //celocli election:show 028fad6c3142681c21517cd4414a6be4438f2556 --group
  //
}
let redis = require("redis"),
  redis_client = redis.createClient({
    port: config.redis.port,
    host: config.redis.host,
    password: "REdis*&023NETua",
  });
redis_client.on("connect", function () {
  console.log("Redis client connected");
});
// /root/.pm2/logs
if (process.argv.length < 4) {
  console.log("argvs lenth must be 4 or above");
} else {
  var type = process.argv[2];
  var seconds = process.argv[3] * 1000;
  if (type == "transfer") {
    //pm2 start celo.bi23.data.js --watch --name celo.data.transfer.3600  -- transfer 3600
    account_unlock(validator_address, "shenqh135");
    account_unlock(validator_group_address, "shenqh135");
    transfer_dollars(validator_address, validator_group_address);
    var transfer_dollars_interval = setInterval(
      transfer_dollars,
      seconds,
      validator_address,
      validator_group_address
    );
    //clearInterval(transfer_dollars_interval);
  }
  if (type == "update_groups") {
    //pm2 start celo.bi23.data.js --watch --name celo.data.update_groups.3600  -- update_groups 3600
    if (seconds == -1) {
      while (update_groups() == false) {}
    } else {
      var update_groups_interval = setInterval(update_groups, seconds);
      //clearInterval(update_groups_interval);
    }
  }
  if (type == "get_leaderboard") {
    //pm2 start celo.bi23.data.js --watch --name celo.data.get_leaderboard.600  -- get_leaderboard 600
    get_leaderboard();
    if (seconds > 0) {
      var get_leaderboard_interval = setInterval(get_leaderboard, seconds);
    }
  }
  if (type == "get_networkparameters") {
    //pm2 start celo.bi23.data.js --watch --name celo.data.get_networkparameters.36000  -- get_networkparameters 36000
    get_networkparameters();
    if (seconds > 0) {
      var get_networkparameters_interval = setInterval(
        get_networkparameters,
        seconds
      );
    }
  }
  if (type == "get_elected_validators") {
    //pm2 start celo.bi23.data.js --watch --name celo.data.get_elected_validators.600  -- get_elected_validators 600
    get_elected_validators();
    if (seconds > 0) {
      var get_elected_validators_interval = setInterval(
        get_elected_validators,
        seconds
      );
    }
  }
  if (type == "update_all_validator_status") {
    //var group_address='028fad6c3142681c21517cd4414a6be4438f2556';
    //var group = group_info(group_address);
    //console.log(util.format('group info: %s',JSON.stringify(group)+''));
    //pm2 start celo.bi23.data.js --watch --name celo.data.update_all_validator_status.3600  -- update_all_validator_status 3600
    update_all_validator_status();
    if (seconds > 0) {
      var update_all_validator_status_interval = setInterval(
        update_all_validator_status,
        seconds
      );
    }
  }
  if (type == "group_info") {
    //node celo.bi23.data.js group_info 0 028fad6c3142681c21517cd4414a6be4438f2556
    //pm2 start celo.bi23.data.js --watch --celo.data.group_info.300  -- group_info 300 028fad6c3142681c21517cd4414a6be4438f2556
    var group_address = process.argv[4];
    console.log(redis_client.get(group_address));
    var group = group_info(group_address, redis_client);
    if (seconds > 0) {
      var group_info_interval = setInterval(
        group_info,
        seconds,
        group_address,
        redis_client
      );
    }
  }
}
