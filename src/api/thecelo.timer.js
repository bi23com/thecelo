const theceloconst = require("./thecelo.const.js");
const thecelo = require("./thecelo.utils.js");
const ethrpc = require("./thecelo.ethrpc.js");
const celocli = require("./thecelo.celocli.js");
// pm2 start thecelo.timer.js --name timer-updateaccounts -- updateaccounts --watch
// pm2 start thecelo.timer.js --name timer-election_vote -- election_vote --watch
// pm2 start thecelo.timer.js --name timer-update_all_group_info -- update_all_group_info --watch
// pm2 start thecelo.timer.js --name timer-update_groups_list -- update_groups_list --watch
// pm2 start thecelo.timer.js --name timer-update_validator_status_all -- update_validator_status_all --watch
// pm2 start thecelo.timer.js --name timer-update_locked_votes_supply_history -- update_locked_votes_supply_history --watch
// pm2 start thecelo.timer.js --name timer-batch_get_metadataURL -- batch_get_metadataURL --watch
// pm2 start thecelo.timer.js --name timer-getReserveInfo -- getReserveInfo --watch
// pm2 start thecelo.timer.js --name timer-getAttestationLogs -- getAttestationLogs --watch
// pm2 start v0.1.js  --watch
// pm2 start get_all_addresses.js  --watch
// pm2 start thecelo.ethrpc.exchange.js  --watch
// pm2 start thecelo.ethrpc.governance.js --watch
// pm2 start thecelo.ethrpc.validatorsproxy.js --watch
// pm2 start thecelo.subscribe.js --watch
if(process.argv.length<3){
  console.log('argvs lenth must be 3');
}
else {
  var type = process.argv[2];
  if(type=='updateaccounts'){
    setInterval(function(){ethrpc.getAddresses(0x1000);},5*60*1000);
  }
  else if(type=='updateAllBalance'){
    ethrpc.updateAllBalance();
  }
  // else if(type=='election_vote'){
  //   const ethrpc_election = require("./thecelo.ethrpc.election.js");
  //   //
  //   ethrpc_election.election_vote();
  //   setInterval(function(){ethrpc_election.election_vote();},2*60*1000);
  //   //
  //   ethrpc_election.latest_epoch_election_votes();
  //   setInterval(function(){ethrpc_election.latest_epoch_election_votes();},2*60*1000);
  // }
  else if(type=='update_all_group_info'){
    //
    celocli.update_groups_balance();
    setInterval(function(){celocli.update_groups_balance();},10*60*1000);
    //
    celocli.update_validators_balance();
    setInterval(function(){celocli.update_validators_balance();},10*60*1000);
    //
    celocli.update_all_group_info();
    setInterval(function(){celocli.update_all_group_info();},10*60*1000);
  }
  else if(type=='update_groups_list'){
    celocli.update_groups_list();
    setInterval(function(){celocli.update_groups_list();},5*60*1000);
  }
  else if(type=='update_validator_status_all'){
    celocli.update_validator_status_all();
    setInterval(function(){celocli.update_validator_status_all();},5*60*1000);
  }
  else if(type=='update_locked_votes_supply_history'){
    const ethweb3 = require("./thecelo.ethweb3.js");
    ethweb3.getTotalDataHistory();
    setInterval(function(){ethweb3.getTotalDataHistory();},5*60*1000);
  }
  else if(type=='batch_get_metadataURL'){
    const ethrpc_account = require("./thecelo.ethrpc.account.js");
    ethrpc_account.batchGetMetadataURL();
    setInterval(function(){ethrpc_account.batchGetMetadataURL();},60*60*1000);
  }
  else if(type=='getReserveInfo'){
    const ethrpc_reserve = require("./thecelo.reserve.info.js");
    ethrpc_reserve.getReserveInfo();
    setInterval(function(){ethrpc_reserve.getReserveInfo();},5*60*1000);
  }
  // else if(type=='getAttestationLogs'){
  //   const attestations = require("./thecelo.attestations.js");
  //   attestations.getAttestationLogs();
  //   setInterval(function(){attestations.getAttestationLogs();},5*60*1000);
  // }
}
