//
function storageAvailable() {
    var storage;
    try {
        storage = window['localStorage'];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}
//
function setStorage(key,value) {
  if(storageAvailable()){
    window['localStorage'].setItem(key, value);
  }
}
//
function getStorage(key) {
  var value='';
  if(storageAvailable){
    value = window['localStorage'].getItem(key);
    if(value==null)
      value = '';
  }
  return value;
}
//
var lan = getStorage('lan');
if(lan == '') lan = 'en';
//
function get_lan(m){
    if(!window.lans) return m;
    if(!window.lans[lan]) return m;
    if(!window.lans[lan][m]) return m;
    return lans[lan][m];
}
//
function set_lan(){
  $('[set-lan]').each(function(){
      var me = $(this);
      var a = me.attr('set-lan').split(':');
      var p = a[0];
      var m = a[1];

      var t = get_lan(m);
      t=(t=='')?m:t;
      switch(p){
          case 'html':
              me.html(t);
              break;
          case 'val':
          case 'value':
              me.val(t);
              break;
          default:
              me.html(t);
      }
    });
}
//
function getQueryVariable(variable){
  //
   var query = window.location.search.substring(1);
   var vars = query.split("&");
   for (var i=0;i<vars.length;i++) {
       var pair = vars[i].split("=");
       if(pair[0] == variable){return pair[1];}
   }
   return(false);
}
//
function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // IE specific code path to prevent textarea being shown while dialog is visible.
        return clipboardData.setData("Text", text);

    } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        } catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}
////////////////////////
function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}
function thousands(num){
  var str = num.toString();
  var reg = str.indexOf(".") > -1 ? /(\d)(?=(\d{3})+\.)/g : /(\d)(?=(?:\d{3})+$)/g;
  return str.replace(reg,"$1,");
}
//
function timeSpan(timesData,prestr=get_lan('Updated'),endstr='!') {
    var dateBegin = new Date(timesData);
    var dateEnd = new Date();
    var dateDiff = dateEnd.getTime() - dateBegin.getTime();
    var dayDiff = Math.floor(dateDiff / (24 * 3600 * 1000));
    var leave1 = dateDiff % (24 * 3600 * 1000);
    var hours = Math.floor(leave1 / (3600 * 1000));
    var leave2 = leave1 % (3600 * 1000);
    var minutes = Math.floor(leave2 / (60 * 1000));
    var leave3 = leave2 % (60 * 1000);
    var seconds = Math.round(leave3 / 1000);
    var timesString = prestr;
    if (dayDiff != 0) {
        timesString += dayDiff + ' ' + get_lan('days')+get_lan("ago");
    } else if (dayDiff == 0 && hours != 0) {
        timesString += hours + ' ' + get_lan('hours')+get_lan("ago");
    } else if (dayDiff == 0 && hours == 0) {
        timesString += minutes + ' ' + get_lan('minutes')+get_lan("ago");
    }
    timesString += endstr;
    return timesString;
}
//yyyy-MM-dd hh:mm:ss
function formatDate(timestamp,year=true,month=true,day=true,hour=true,minute=true,second=true){
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
function formatAmount(amount,thound = true){
  if(amount==null) return 0.00;
   var value = Number.parseFloat(amount).toFixed()/Number.parseFloat('1e+18');
   if(thound)
      return thousands(value.toFixed(2));
   else
      return value;
}
//
function rankStr(num){
  if(parseInt(num) == 1)
    return '1st';
  else if(parseInt(num) == 2)
    return '2nd';
  else if(parseInt(num) == 3)
    return '3rd';
  else
    return num+'th';
}
//
function formatAddress(address,link=true,whole=false,cp=false,onlyicon=false) {
  if(address.trim().length==0) return '';
  var result ='';
  if(whole){
    result=address;
  }
  else {
    result=address.substr(0, 6) + '....' + address.substr(address.length-4, address.length)
  }
  if(onlyicon) result = '';
  if(link)result+=' <i id="address-link-'+address+'" class="iconfont iconlink" style="cursor: pointer;"></i>';
  if(cp)result+='  <i id="address-copy-'+address+'" class="iconfont iconcopy" style="cursor: pointer;"></i>'
  return result;
}
//
function addressOP(){
  $("i[id*='address-link-']")
    .each(function(){
      var options = tooltip_options();
      options['title'] = 'Go Explorer';
      options['placement'] = 'top';
      $(this).tooltip(options);
    })
    .off('click')
    .click(function(){
      $(this).tooltip('hide');
      var address = $(this).attr("id").replace('address-link-','');
      //btc
      if(address=='38EPdP4SPshc5CiUCzKcLP9v7Vqo5u1HBL'){
        window.open('https://www.blockchain.com/btc/address/'+address);
      }
      //eth
      else if(address=='0xe1955eA2D14e60414eBF5D649699356D8baE98eE'){
        window.open('https://etherscan.io/address/'+address);
      }
      //dai
      else if(address=='0x16B34Ce9A6a6F7FC2DD25Ba59bf7308E7B38E186'){
        window.open('https://etherscan.io/address/'+address);
      }
      else{
        if(address.length>43) window.open(blockscoutlink+'tx/'+address);
        else  window.open(blockscoutlink+'address/'+address);
      }
      return false;
  });
  $("i[id*='address-copy-']")
    .each(function(){
      var address = $(this).attr("id").replace('address-copy-','');
      var options = tooltip_options();
      options['title'] = 'Copy Address:' + address;
      options['placement'] = 'top';
      $(this).tooltip(options);
    })
    .hover(function(){
      var address = $(this).attr("id").replace('address-copy-','');
      $(this).attr('data-original-title','Copy Address:'+address);
    })
    .off('click')
    .click(function(){
      var address = $(this).attr("id").replace('address-copy-','');
      var result = copyToClipboard(address);
      if(result){
        $(this).attr('data-original-title','Copied');
        $(this).tooltip('show');
      }
      return false;
    });
}
//
function hideBords(lanok=true){
  //
  lanok?$('#timespan').html(get_lan('loading...')):$('#timespan').html('loading...');
  $('#timespan_body').show();
  //$('#body_content').hide();
  $('#footer_about').hide();
}
//
var block_timer;
//
function heartOP(flag,favstr){
  //
  $("i[id*='"+flag+"-heart-']")
    .each(function(i){
      var address = $(this).attr("id").replace(flag+'-heart-','');
      var favs = getStorage(favstr);
      var fav_index = favs.indexOf(address);
      if (fav_index==-1) {
        $(this).css({display: 'none'});
      }else{
        $(this).css({display: 'block'});
      }
    })
    .click(function(){
      var address = $(this).attr("id").replace(flag+'-heart-','');
      var favs = getStorage(favstr);
      var fav_index = favs.indexOf(address);
      if (fav_index==-1) {
        $(this).removeClass('far');
        $(this).addClass('fas');
        favs+=address;
      }
      else{
        favs = favs.replace(address,'');
        $(this).removeClass('fas');
        $(this).addClass('far');
      }
      setStorage(favstr, favs);
      //update
      if(flag=='btus')btus_board();
      if(flag=='groups')groups_board();
      if(flag=='status')validators_board();
      return false;
    });
}
//
function trOP(flag,favstr){
  $("tr[id*='"+flag+"-line-']").click(function () {
      //$(this).next('tr').toggle('slow');
      //$(this).find(".table-expandable-"+flag).toggleClass("iconarrow_up");
      //
      var address = $(this).attr("id").replace(flag+'-line-','');
      if(flag=='groups'){
        //switchTab('group',address);
        var url = thecelohost+'/group/';
        if($(this).attr("domain").length > 0){
          var domain = $(this).attr("domain").split('.');
          url += domain[domain.length-2];
        }
        else if($(this).attr("keybase").length > 0)
            url += $(this).attr("keybase");
        else
            url += address;
        window.location.href = url;
      }
      else if(flag=='status'){
        if($(this).attr("group").length > 0){
          var url = thecelohost+'/group/'+$(this).attr("group");
          window.location.href = url;
        }
      }
      else if(flag=='accounts'){
        //switchTab('account',address);
        var url = thecelohost+'/account/'+address;
        window.location.href = url;
      }
  })
    .mouseenter(function() {
      $(this).find("i[id*='"+flag+"-heart-'").css({display: 'block'});
    })
    .mouseleave(function() {
      var address = $(this).attr("id").replace(flag+'-line-','');
      var favs = getStorage(favstr);
      var fav_index = favs.indexOf(address);
      if (fav_index==-1) {
        $(this).find("i[id*='"+flag+"-heart-'").css({display: 'none'});
      }
    });
}

//
var sort_down ='<i class="iconfont iconarrow_down1 text-primary" style="font-size:20px;"></i>';
var sort_up ='<i class="iconfont iconarrow_up1 text-primary" style="font-size:20px;"></i>';
var sort_normal ='<i class="iconfont iconarrow_sort text-success" style="font-size:20px;"></i>';
//
var network = 'rc1';
var blockscoutlink ='https://rc1-blockscout.celo-testnet.org/';
if(window.location.host.indexOf('baklava')!=-1){
  network = 'baklava';
  blockscoutlink ='https://baklava-blockscout.celo-testnet.org/';
}
// Load google charts
google.charts.load('current', {'packages':['corechart']});
var thecelohost = document.location.protocol+'//'+window.location.host;
/*
window.onscroll = function() {topFun()};
var navbar = document.getElementById("navbar_tab");
var sticky = navbar.offsetTop;
function topFun() {
  if (window.pageYOffset >= sticky) {
    navbar.classList.add("fixed-top")
  } else {
    navbar.classList.remove("fixed-top");
  }
}
*/
jQuery(function(){
		function textslide(){
			var height=(jQuery('.info_text ul li').height());
	       jQuery('.info_text ul li').eq(0).animate({marginTop:-height},function(){
	       	jQuery(this).remove().appendTo('.info_text ul').css({marginTop:0})
	       });
	   }
		var t=setInterval(textslide,5000);
		jQuery('.info_text').hover(function(){
			clearInterval(t);
		},function(){
			t=setInterval(textslide,5000);
		})
	})
//
var navbar_tab = 'dashboard';
function switchTab(which,address=''){
  //
  navbar_tab = which;
  //setStorage("tab",which);
  hideBords(false);
  //
  if(block_timer)
    clearInterval(block_timer);
  //
  $('#body_content').empty();
  //$('#body_content').hide();
  //
  var url = thecelohost+'/api/v0.1.js?method=html&filename=index_' + which;
  if(address.length>0)
    url +='&address='+address;
  $(function(){
      $.ajax({
          url:url,
          type: 'GET',
          cache: false,
          dataType:'html',
          error:function(data, err){
            alert('Please try again later!');
          },
          success:function(data,result){
            $('#body_content').html(data);
            //
            tooltip_datatoggle();
            //
          }
      })
    });
    $('#navbar_tab .btn').each(function() {
      var val = $(this).find('input').val();
        if(val!=which){
          $(this).removeClass("active");
          $(this).find('input').attr("checked",false);
        }
        else{
          $(this).addClass("active");
          $(this).find('input').attr("checked",true);
        }
      })
}
function tooltip_options(){
  return {
    html: true,
    trigger:"hover",
    template:'<div class="tooltip success" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
  }
}
//
function tooltip_datatoggle(){
  $('[data-toggle="tooltip"]').each(function() {
    $(this).tooltip(tooltip_options());
  })
}
//
$(document).ready(function(){
  //var donation = 'To keep thecelo project is free open and more features, ';
  var donation = get_lan('Like what we do? Support thecelo by making a donation!');
  donation += '<br/><span class="text-success">';
  donation += formatAddress('0xdD6B923D48E5A8Ca3eb0db3E995D59fa94A33930',link=true,whole=true,cp=true,false)+'</span>';
  $('#donation').html(donation);
  //
  hideBords(false);
  //
  $.ajax({
    url: thecelohost+'/lans/lans-'+lan+'.js',
    dataType: "script",
    success:function(data){
        //
        $('#dropdown-lan-menu .dropdown-item').on('click', function(event) {
              var val = $(this).val();
              setStorage('lan',val);
              //refresh page
              window.location.reload();
        });
        //
        $('#navbar_tab .btn').on('click', function(event) {
            var val = $(this).find('input').val();
            //$(this).addClass("active");
            //$(this).button("toggle");
            //
            if(val==-1){
              $('#more_tab').slideToggle("fast");
            }
            else{
              $('#more_tab').slideUp("fast");
              switchTab(val);
            }
            return false;
        });
        $(document).on("click", function(event){
            var $trigger = $('#more_tab');
            if($trigger !== event.target && !$trigger.has(event.target).length){
                $('#more_tab').slideUp("fast");
            }
        });
        //
        $('#dropdown-net-menu .dropdown-item').each(function() {
            if(network=='rc1') $('#network_name').html(' Celo Mainnet ');
            if(network=='baklava') $('#network_name').html(' Testnet Baklava ');
          })
          .on('click', function(event) {
          //refresh page
          var val = $(this).val();
          if(val == 'rc1')
            window.location.href='https://thecelo.com';
          else if(val == 'baklava')
            window.location.href='http://baklava.thecelo.com';
        });
        //
        $('#more_tab .dropdown-item').on('click', function(event) {
              //$('#more_tab .dropdown-item .active').removeClass("active");
              //$(this).addClass("active");
              $('#more_tab').slideUp("fast");
              //
              switchTab($(this).val());
              return false;
        });
        //
        var paths = ['group','groups','account','accounts','gov','governance','validator','validators','exchange','ex'];
        var pathnames = window.location.pathname.split('/');
        if(pathnames.length>1&&paths.includes(pathnames[1]))
          navbar_tab = pathnames[1];
        else
          navbar_tab = getQueryVariable('tab');
        //
        if(!navbar_tab||navbar_tab.trim().length==0) navbar_tab = 'dashboard';//getStorage('tab');
        switchTab(navbar_tab);
      }
    })
});
