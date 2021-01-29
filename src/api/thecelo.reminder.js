const thecelo_config = require("./thecelo.config.js");
const thecelo = require("./thecelo.utils.js");
const redis = require("./thecelo.redis.js");


//
let telegram_bot_ids = [];
//
async function telegram_bot_getUpdates(){
  //
  telegram_bot_ids = await redis.get_redis_data('telegram_bot_ids');
  if(telegram_bot_ids && telegram_bot_ids.length>0) telegram_bot_ids = JSON.parse(telegram_bot_ids);
  //
  let cmd = 'curl https://api.telegram.org/'+thecelo_config.items.telegram_bot_thecelo+'/getUpdates';
  let updates = thecelo.execCmd(cmd);
  updates = JSON.parse(updates);
  if(updates.ok){
    updates.result.forEach((update, i) => {
      if(update.message.text == '/start'){
        telegram_bot_ids.indexOf(update.message.from.id) === -1 ? telegram_bot_ids.push(update.message.from.id) : console.log("This item already exists");
      }
    })
    redis.redis_client.set('telegram_bot_ids',JSON.stringify(telegram_bot_ids));
  }
  console.log({telegram_bot_ids});
}
telegram_bot_getUpdates();
setInterval(function(){telegram_bot_getUpdates();},20*1000);
//
function remind_logs_fromto(message,item,flg,from,to){
  if(item[0] == flg){
    message.text += 'From: '
    message.text += item[from][1].trim().length>0 ? item[from][1]+'\n':''
    message.text += '<a href="https://thecelo.com/account/'+item[from][0]+'">'+item[from][0]+'</a>\n'
    message.text += 'To: '
    message.text += item[to][1].trim().length>0 ? item[to][1]+'\n':''
    message.text += '<a href="https://thecelo.com/account/'+item[to][0]+'">'+item[to][0]+'</a>\n'
    //
    message.mdtext += '*From* : '
    message.mdtext += item[from][1].trim().length>0 ? item[from][1]+'\\n':''
    message.mdtext += '['+item[from][0]+'](https://thecelo.com/account/'+item[from][0]+')\\n'
    message.mdtext += '*To* : '
    message.mdtext += item[to][1].trim().length>0 ? item[to][1]+'\\n':''
    message.mdtext += '['+item[to][0]+'](https://thecelo.com/account/'+item[to][0]+')\\n'
    return true
  }
  return false
}
function remind_logs_from(message,item,flg,from){
  if(item[0] == flg){
    if(Array.isArray(item[from])){
      message.text += (item[0] == 'Exchange'?'Exchanger':'Account') +': '
      message.mdtext += '*'+(item[0] == 'Exchange'?'Exchanger':'Account')+'* : '

      message.text += item[from][1].trim().length>0 ? item[from][1]+'\n':''
      message.text += '<a href="https://thecelo.com/account/'+item[from][0]+'">'+item[from][0]+'</a>\n';
      message.mdtext += item[from][1].trim().length>0 ? item[from][1]+'\\n':''
      message.mdtext += '['+item[from][0]+'](https://thecelo.com/account/'+item[from][0]+')\\n';
    }
    return true
  }
  return false
}
//telegram bot
function remind_logs(item){
  //console.log(item);
  let bot_url = thecelo_config.items.telegram_host+'/'+thecelo_config.items.telegram_bot_thecelo+'/sendMessage';
  //
  let amount = thecelo.thousands(item[6].toFixed(2)) + ' CELO';
  if(item[0] == 'Transfer'){
    amount = thecelo.thousands(item[6].toFixed(2)) +' '+ item[7];
  }
  else if(item[0] == 'Exchange'){
    if(item[8] == true){
      amount = thecelo.thousands(item[6].toFixed(2))+' CELO -> '+thecelo.thousands(item[7].toFixed(2))+ ' cUSD';
    }
    else{
      amount = thecelo.thousands(item[6].toFixed(2))+' cUSD -> '+thecelo.thousands(item[7].toFixed(2))+ ' CELO';
    }
  }
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  let text = '<b>Event: '+item[0]+'</b>\n';
  text += 'Amount: '+amount+'\n';
  let mdtext = '**Event : '+item[0]+'**\\n';
  mdtext += '*Amount* : '+amount+'\\n';
  //
  let message ={text,mdtext};
  //
  remind_logs_fromto(message,item,'Transfer',4,5);
  //
  remind_logs_from(message,item,'Exchange',4);
  //
  remind_logs_from(message,item,'Unlock',4);
  remind_logs_from(message,item,'Locked',4);
  remind_logs_from(message,item,'Relocked',4);
  remind_logs_from(message,item,'Withdrawn',4);
  //
  remind_logs_fromto(message,item,'Vote',4,5);
  remind_logs_fromto(message,item,'VoteActivated',4,5);
  remind_logs_fromto(message,item,'ActiveVoteRevoked',4,5);
  remind_logs_fromto(message,item,'PendingVoteRevoked',4,5);
  //
  remind_logs_from(message,item,'Queued',6);
  remind_logs_from(message,item,'Upvoted',6);
  remind_logs_from(message,item,'UpvoteRevoked',6) ;
  remind_logs_from(message,item,'Voted',6);

  //text += 'BlockNumber: '+item[1]+'\n';
  message.text += 'TxHash: <a href="https://explorer.celo.org/tx/'+item[3]+'">'+item[3]+'</a>';
  message.text = encodeURIComponent(message.text);
  //mdtext += '*BlockNumber* : '+item[1]+'\\n';
  message.mdtext += '*TxHash* : ['+item[3]+'](https://explorer.celo.org/tx/'+item[3]+')';
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  let params = 'chat_id='+thecelo_config.items.telegram_bot_thecelo_groupchat_id+'&parse_mode=HTML&text='+message.text;//HTML,MarkdownV2
  let cmd = 'curl -d "'+ params + '" ' + bot_url;
  thecelo.execCmd(cmd);
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  //console.log(message.text);
  telegram_bot_ids.forEach((id, i) => {
    params = 'chat_id='+id+'&parse_mode=HTML&text='+message.text;//HTML,MarkdownV2
    cmd = 'curl -d "'+ params + '" ' + bot_url;
    thecelo.execCmd(cmd);
  });
  //////////////////////////////////////////////
  //////////////////////////////////////////////
  //console.log(message.mdtext);
  cmd  = 'curl -X POST -H "Content-Type: application/json" -d \'{"content": "' + message.mdtext + '"}\' ' + thecelo_config.items.discord_webhook_url;
  thecelo.execCmd(cmd);
  cmd  = 'curl -X POST -H "Content-Type: application/json" -d \'{"content": "' + message.mdtext + '"}\' ' + thecelo_config.items.discord_webhook_celo_url;
  thecelo.execCmd(cmd);
}

module.exports = {
    remind_logs
}
