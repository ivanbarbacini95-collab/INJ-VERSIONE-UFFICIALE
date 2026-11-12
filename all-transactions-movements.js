/* INJ Node · All Transaction: wallet deposits/withdrawals only.
 * Watch-only decoding, no signatures or private keys. */
(function(root){
 'use strict';
 function coinEntries(raw){
  var out=[];
  function read(v){
   if(v==null)return;
   if(Array.isArray(v)){v.forEach(read);return;}
   if(typeof v==='object'){
    if(v.amount!=null&&v.denom!=null){
     var n=String(v.amount),denom=String(v.denom);
     if(/^\d+$/.test(n)&&BigInt(n)>0n&&denom)out.push({denom:denom,atoms:BigInt(n)});
    }else if(v.amount!=null)read(v.amount);
    return;
   }
   String(v).split(',').forEach(function(part){
    var match=part.trim().match(/^(\d+)([a-zA-Z][^\s,]*)$/);
    if(match&&BigInt(match[1])>0n)out.push({denom:match[2],atoms:BigInt(match[1])});
   });
  }
  read(raw);return out;
 }
 function token(denom){
  var s=String(denom||''),d=s.toLowerCase();
  if(d==='inj')return 'INJ';
  if(d==='uusdc'||d==='usdc')return 'USDC';
  if(d==='uusdt'||d==='usdt')return 'USDT';
  return s.length>22?s.slice(0,10)+'…'+s.slice(-6):s;
 }
 function formatted(atoms,denom,en){
  var d=String(denom||'').toLowerCase(),places=d==='inj'?18:/^(uusdc|usdc|uusdt|usdt)$/.test(d)?6:0;
  var v=BigInt(atoms),scale=10n**BigInt(places);
  var whole=(v/scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g,en?',':'.');
  var fraction=places?(v%scale).toString().padStart(places,'0').replace(/0+$/,''):'';
  if(d==='inj'&&fraction.length>12)fraction=fraction.slice(0,12).replace(/0+$/,'');
  return whole+(fraction?(en?'.':',')+fraction:'')+' '+token(denom);
 }
 function isTransferType(value){
  return /(?:^|[./])msg(?:send|multisend|transfer)$/i.test(String(value||''));
 }
 function extract(messages,events,address,eventAttrs,en){
  var wallet=String(address||'').toLowerCase(),groups=new Map(),candidate=false,hasExplicit=false;
  function add(category,raw,peer){
   coinEntries(raw).forEach(function(coin){
    var k=category+'|'+coin.denom.toLowerCase(),entry=groups.get(k);
    if(!entry)entry={cat:category,action:'transfer',denom:coin.denom,asset:token(coin.denom),total:0n,peers:[]};
    entry.total+=coin.atoms;
    if(peer&&String(peer).toLowerCase()!==wallet&&!entry.peers.includes(peer))entry.peers.push(peer);
    groups.set(k,entry);
   });
  }
  (Array.isArray(messages)?messages:[]).forEach(function(m){
   var type=String(m&&(m['@type']||m.type)||'').toLowerCase();
   if(!isTransferType(type))return;
   candidate=true;
   if(/msgsend$/.test(type)){
    var from=String(m.from_address||m.fromAddress||'').toLowerCase();
    var to=String(m.to_address||m.toAddress||'').toLowerCase();
    if(from===wallet&&to&&to!==wallet){hasExplicit=true;add('withdraw',m.amount,to);}
    else if(to===wallet&&from&&from!==wallet){hasExplicit=true;add('deposit',m.amount,from);}
   }else if(/msgmultisend$/.test(type)){
    var balance=new Map();
    (Array.isArray(m.inputs)?m.inputs:[]).forEach(function(v){
     if(String(v.address||'').toLowerCase()!==wallet)return;
     hasExplicit=true;
     coinEntries(v.coins||v.amount).forEach(function(coin){
      var k=coin.denom.toLowerCase(),old=balance.get(k)||{denom:coin.denom,net:0n};
      old.net-=coin.atoms;balance.set(k,old);
     });
    });
    (Array.isArray(m.outputs)?m.outputs:[]).forEach(function(v){
     if(String(v.address||'').toLowerCase()!==wallet)return;
     hasExplicit=true;
     coinEntries(v.coins||v.amount).forEach(function(coin){
      var k=coin.denom.toLowerCase(),old=balance.get(k)||{denom:coin.denom,net:0n};
      old.net+=coin.atoms;balance.set(k,old);
     });
    });
    balance.forEach(function(v){
     if(v.net===0n)return;add(v.net>0n?'deposit':'withdraw',[{denom:v.denom,amount:String(v.net>0n?v.net:-v.net)}],'');
    });
   }else if(/msgtransfer$/.test(type)){
    // IBC MsgTransfer initiated by this wallet is outgoing; receipt events are not guessed.
    if(String(m.sender||'').toLowerCase()===wallet){hasExplicit=true;add('withdraw',m.token,m.receiver||'');}
   }
  });
  // Indexers may provide only MsgSend type. Event fallback is restricted to
  // transactions explicitly identified as transfers, not staking or claims.
  if(candidate&&!hasExplicit){
   (Array.isArray(events)?events:[]).forEach(function(event){
    if(String(event.type||'').toLowerCase()!=='transfer')return;
    var attrs=eventAttrs(event)||{};
    var from=String(attrs.sender||'').toLowerCase(),to=String(attrs.recipient||'').toLowerCase();
    if(from===wallet&&to&&to!==wallet)add('withdraw',attrs.amount,to);
    else if(to===wallet&&from&&from!==wallet)add('deposit',attrs.amount,from);
   });
  }
  return {candidate:candidate,actions:Array.from(groups.values()).map(function(op){
   return {cat:op.cat,action:op.action,denom:op.denom,asset:op.asset,
    atoms:String(op.total),amount:formatted(op.total,op.denom,en),peers:op.peers};
  })};
 }
 root.INJ_NODE_TX_MOVEMENTS={extract:extract,isTransferType:isTransferType};
})(window);
