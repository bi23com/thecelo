let
  os = require('os');
  hostName = os.hostname();
  console.log('hostName:'+hostName);
  //
  util = require('util');
  execSync = require('child_process').execSync;
  //
  celo_network = 'rc1';//baklava
  ws_host ='http://192.168.28.109:8546';//Mainnet
  http_host = 'http://127.0.0.1:8545';
  if('blockchain-server3'==hostName){
    celo_network = 'baklava';
    ws_host ='http://192.168.88.182:8546';//baklava
  }
  //
  function findKey(obj, value) {
    return Object.keys(obj).find(k => obj[k].toLowerCase() === value.toLowerCase())
  }
  function containsKey(object, key) {
    return Object.keys(object).find(k => k.toLowerCase() === key.toLowerCase());
  }
  function containsValue(object, value) {
    return object.find(k => k.toLowerCase() === value.toLowerCase());
  }
//
let get_http_data = function (req,url){
  return new Promise(function(resolve, reject){
    req.get({url: url, encoding: 'utf8',timeout:3000}, function (err, res, data) {
        if(err){resolve(null);}else{resolve(data);}
      })
    })
  }
//
function execCmd(cmd,loop = 3,seconds = 10,print=false){
  var reponse;
    try {
        if(print){
          var logstr = util.format('%d:%s',loop,cmd)
          log_out(logstr);
        }
        reponse = execSync(cmd,{stdio: ["ignore", "pipe", 'pipe']});
    }
    catch(err) {
        console.log(util.format('%d:execCmd error: %s',loop,err));
        if(loop > 1){
            var waitTill = new Date(new Date().getTime() + seconds * 1000);
            while(waitTill > new Date()){}
            reponse = execCmd(cmd,--loop,seconds);
        }
    }
    return reponse;
}
function eth_rpc(method,params,req = '-X POST'){
  const host = 'http://127.0.0.1:8545';
  //
  var cmd = 'curl '+req+' -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"' + method + '","params":'+params+',"id":1}\' ' + host;
  //console.log(cmd);
  var rep = execCmd(cmd,1,10,false);
  var obj = JSON.parse(rep);
  //console.log(JSON.stringify(obj.result));
  return obj.result;
}
//
function saveImage(fs,req,imgurl,fileName){
  req.get({url: imgurl, encoding: 'binary'}, function (err, response, imgbody) {
    fs.writeFile(fileName, imgbody, 'binary', function(err) {
      if(err)
        console.log(err);
      else{
        fs.chmod(fileName, '0644', (error) => {
            console.log('Changed file permissions');
        });
        console.log("The file was saved!");
      }
    });
  });
}
//
function getBool(val) {
    return !!JSON.parse(String(val).toLowerCase());
}
function log_out(title){
  var timestr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(util.format('====%s====\n%s',timestr,title));
}
//yyyy-MM-dd hh:mm:ss
function formatYMDhms(timestamp){
  let date = new Date(timestamp);
  let Y = date.getFullYear();
  let M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) ;
  let D = date.getDate();
  D = D<10 ? '0' + D : D;
  let h = date.getHours() ;
  h = h<10 ? '0' + h : h;
  let m = date.getMinutes();
  m = m<10 ? '0' + m : m;
  let s = date.getSeconds();
  s = s<10 ? '0' + s : s;
  return [Y,M,D,h,m,s];
}
//
var formatDate = function (days) {
  var seconds = new Date().getTime();
  var date = new Date(seconds + (1000*60*60*24)*days);
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return d + '/' + m;
};
var formatHHMM = function (timestamp) {
  var date = new Date(parseInt(timestamp));
  var HH = date.getHours();
  HH = HH<10?('0'+HH):HH;
  var MM = date.getMinutes();
  MM = MM<10?('0'+MM):MM;
  return HH + ':' + MM;
};
function formatDuraton(time){
  var result = '';
    if(time > -1){
        var day = Math.floor(time/(24*3600));
        time = time - day*24*3600;
        var hour = Math.floor(time/3600);
        time = time - hour*3600;
        var minute = Math.floor(time/60) ;
        var second = time - minute*60;
        if(day>0){
          result += ' '+day  + ((day>1)?'<span set-lan="html:days"></span>':'<span set-lan="html:day"></span>');
        }
        if(hour>0){
          result += ' '+hour + ((hour>1)?'<span set-lan="html:hours"></span>':'<span set-lan="html:hour"></span>');
        }
        if(minute>0){
          result += ' '+minute +((minute>1)?'<span set-lan="html:minutes"></span>':'<span set-lan="html:minute"></span>');
        }
        if(second>0){
          result += ' '+second + ((second>1)?'<span set-lan="html:seconds"></span>':'<span set-lan="html:second"></span>');
        }
    }
    return result;
}
//
function add_keybase(username,website){
    var url = 'https://keybase.io/_/api/1.0/user/lookup.json?username='+username;
    var cmd = "curl '"+url+"'";
    var rep = execCmd(cmd);
    //console.log(rep);
    const json = JSON.parse(rep);
    //
    var logo = json['them']['pictures']['primary']['url'];
    //console.log(logo);
    //
    var twitter = '';
    if(json['them']['proofs_summary']['by_presentation_group']['twitter'])
      twitter  =json['them']['proofs_summary']['by_presentation_group']['twitter'][0]['service_url'];
    //console.log(twitter);
    //
    var github = '';
    if(json['them']['proofs_summary']['by_presentation_group']['github'])
      github  =json['them']['proofs_summary']['by_presentation_group']['github'][0]['service_url'];
    //
    var dns = '';
    if(json['them']['proofs_summary']['by_presentation_group']['dns'])
      dns  =json['them']['proofs_summary']['by_presentation_group']['dns'][0]['service_url'];
    //console.log(github);
    //bio
    var bio = '';
    if(json['them']['profile'] && json['them']['profile']['bio'])
      bio  = json['them']['profile']['bio'];
    //
    var ids = {username,website,logo,twitter,github,dns,bio};
    console.log(JSON.stringify(ids));
    return ids;
}
//
const getWeekInYear=(date)=>{
  //判断该星期是否跨年，如果跨年就是第一周
  let weekStartDate = getWeekStartByDate(date);//一周开始时间
  var endDate = getDateFromDay(weekStartDate,6);//一周结束时间
  if(weekStartDate.getFullYear()!=endDate.getFullYear()) return 1;
  let d1 = new Date(date);
  let d2 = new Date(date);
  d2.setMonth(0);
  d2.setDate(1);
  d2 = getWeekStartByDate(d2)
  let rq = d1-d2;
  let days = Math.ceil(rq/(24*60*60*1000))+1;
  let num = Math.ceil(days/7);
  //console.log('第'+num + '周')
  return num;
}
//根据传入的日期查找周的开始日期，开始日期为周日，固定
const getWeekStartByDate = (date) =>{
  let day = date.getDay();
  return getDateFromDay(date,-day);
}
//
function getDateFromDay(dayDate , day){
  let date = new Date();
  date.setTime(dayDate.getTime() + day * 24 * 60 * 60 * 1000);
  return date;
}
function thousands(num){
  var str = num.toString();
  var reg = str.indexOf(".") > -1 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(?:\d{3})+$)/g;
  return str.replace(reg,"$1,");
}

function isValidEmail(email){
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return regex.test(email.toLowerCase())
}

module.exports = {
  findKey,
  celo_network,containsKey,containsValue,ws_host,http_host,
  add_keybase,execCmd,eth_rpc,log_out,formatDate,getBool,formatHHMM,formatDuraton,formatYMDhms,
  saveImage,get_http_data,
  getWeekInYear,thousands,isValidEmail
}
