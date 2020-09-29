//
let util = require("util");
(redis = require("redis")),
  (redis_client = redis.createClient({
    port: 4378,
    host: "example.com",
    password: "XXXXXXX",
  }));
redis_client.on("connect", function () {
  console.log("Redis client connected");
});
//
var thecelo = require("./thecelo.utils.js");
var thecelodata = require("../js/celo.data.js");
//
/*
var ids = require("../js/keybase.ids.js");
//console.log(util.format('%s',JSON.stringify(ids.ids)+''));
ids.ids.forEach( function(id) {
  redis_client.set(id[0],JSON.stringify(id));
});
//
var address = '0x035eF01395e2cC1219482f0542a05B627FAC36B6';
redis_client.get(address, function(err, data) {
  var id = JSON.parse(data);
  console.log(id[3]);
  exit();
});
*/
//
function exit() {
  process.on("exit", function () {
    redis_client.quit();
    console.log("Redis client quited");
  });
  process.exit(0);
}

if (process.argv.length < 3) {
  console.log("argvs lenth must be 3 or above");
  exit();
} else {
  var type = process.argv[2];
  //
  if (type == "update-groups") {
    var groups = thecelodata.groups;
    //
    var new_groups = new Array();
    //
    groups.forEach(function (group) {
      //
      var elected = 0;
      group[9].forEach(function (member) {
        if (member[5]) {
          elected++;
        }
      });
      //
      var new_group = new Array();
      //Address
      new_group.push(group[0]);
      //GroupName
      new_group.push(group[1]);
      //Votes
      new_group.push(group[2]);
      //ElectedCount
      new_group.push(elected);
      //MemberCount
      new_group.push(group[9].length);
      //
      new_groups.push(new_group);
    });
    console.log(JSON.stringify(new_groups) + "");
    redis_client.set("groups", JSON.stringify(new_groups));
  } else if (type == "query-keybase") {
    if (process.argv.length < 4) {
      console.log("argvs lenth must be 4");
      console.log(
        "Example : node thecelo.data.redis.js query-keybase 0xfFAC3DcF14DC8e678204E2388031d4cc3e366261"
      );
      exit();
    } else {
      redis_client.get(process.argv[3], function (err, data) {
        var id = JSON.parse(data);
        console.log(id);
        exit();
      });
    }
  }
  //
  else if (type == "add-keybase") {
    if (process.argv.length < 6) {
      console.log("argvs lenth must be 6");
      console.log(
        'Example : node thecelo.data.redis.js add-keybase 0xfFAC3DcF14DC8e678204E2388031d4cc3e366261 "sunxmldapp" "https://bi23.com"'
      );
    } else {
      var address = process.argv[3];
      var username = process.argv[4];
      var website = process.argv[5];
      var url =
        "https://keybase.io/_/api/1.0/user/lookup.json?username=" + username;
      var cmd =
        "curl \
        '" +
        url +
        "' \
        --header 'Accept: application/json' \
        --compressed";
      var rep = thecelo.execCmd(cmd);
      console.log(rep);
      const json = JSON.parse(rep);
      //
      var logo = json["them"]["pictures"]["primary"]["url"];
      console.log(logo);
      //
      var twitter =
        json["them"]["proofs_summary"]["by_presentation_group"]["twitter"][0][
          "service_url"
        ];
      console.log(twitter);
      //
      var github =
        json["them"]["proofs_summary"]["by_presentation_group"]["github"][0][
          "service_url"
        ];
      console.log(github);
      var ids = new Array();
      ids.push(address);
      ids.push(username);
      ids.push(website);
      ids.push(logo);
      ids.push(twitter);
      ids.push(github);
      //
      redis_client.set(address, JSON.stringify(ids) + "");
    }
    //exit();
  }
}
