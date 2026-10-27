/* Section cards consume INJ Node snapshots and the same public data endpoints.
   One refresh per feed, regardless of the number of copies on the canvas. */
(function(root){
'use strict';
const simple=['apr','unbonding','hourly','weekly','monthly','yearly','pnl','pnl24','avgprice','low24','high24','change24','volume24','marketcap','circulating','fullydiluted','dominance','globalcap','globalvolume','btcdom','networkstake','nativesupply','walletcount','bid','ask','spread','periodpnl','bestday','worstday'];
const rich=['coinspot','validators','milestone','orderbook','timeline','converter','levels','session','production','rewardwallets','marketlist','heatmap','favorites','marketleaders','marketlosers','comparison','potential','potentialstake','potentialincome','growth','composition','ownership','walletlist','treasurygrowth','worthhistory','ladderall'];
const extra=['walletpnl','marketintelligence','genesis','holdertiers','incomeperiods','allpotential','portfolio','target','usdc','rewardoverview','velocity','accumulation','productionlevel','favoritesheatmap','priceposition','athrecovery','atlrecovery','supplydistribution','globaloverview','marketbreadth','treasuryoverview','treasuryallocation','treasuryproduction','treasurymilestone','treasuryperformance','position','bookbalance','growthsimple'];
const supported=[...simple,...rich,...extra];
const marketChange=(coin,range)=>{const v=coin?.['price_change_percentage_'+range+'_in_currency']??(range==='24h'?coin?.price_change_percentage_24h:null);return typeof v==='number'&&Number.isFinite(v)?v:null};
const BOOK_STEPS=[0.001,0.01,0.1,1];
const normalizedBookStep=s=>BOOK_STEPS.includes(Number(s))?Number(s):0.001;
function bucketBookLevels(rows,side,step){
 step=normalizedBookStep(step);
 const count=String(step).split('.')[1]?.length||0,buckets=new Map();
 for(const [rawPrice,rawSize] of rows||[]){
  const price=Number(rawPrice),size=Number(rawSize);
  if(!(price>0&&size>0&&Number.isFinite(price)&&Number.isFinite(size)))continue;
  const idx=side==='ask'?Math.ceil(price/step-1e-10):Math.floor(price/step+1e-10);
  const groupedPrice=Number((idx*step).toFixed(Math.max(4,count)));
  buckets.set(groupedPrice,(buckets.get(groupedPrice)||0)+size);
 }
 return [...buckets].map(([price,size])=>({price,size})).sort((a,b)=>side==='ask'?a.price-b.price:b.price-a.price).slice(0,100);
}
const boundedPercent=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>0?Math.max(0,Math.min(100,a/b*100)):null;
const Charts=root.INJWorkspaceCharts||(typeof require==='function'?require('./workspace-charts.js'):null);
const sum=(rows,key)=>rows.length&&rows.every(r=>r&&Number.isFinite(r[key]))?rows.reduce((n,r)=>n+r[key],0):null;
const compound=(stake,apr,years)=>[stake,apr,years].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)?stake*Math.pow(1+apr/100/365,365*years):null;
const ratio=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>0?a/b:null;
 const stableSymbols=new Set(['USDT','USDC','DAI','USDS','USDE','USDD','USD1','PYUSD','FDUSD','TUSD','FRAX','LUSD','GUSD','PAX','USDP','RLUSD','USDY','USD0','CRVUSD','GHO','EURI','EURC','EUROC','AEUR','SUSD','USDB','USDT0','BUSD','USTC','MIM','CUSD','USDF','BFUSD','USDX']);
 const wrappedSymbols=new Set(['WBTC','WETH','WBETH','WSTETH','STETH','WEETH','EETH','CBETH','CBBTC','BTCB','BBTC','TBTC','FBTC','RETH','SFRXETH','WBNB','WSOL','WMATIC','WPOL','WAVAX','WFTM','WTRX','WSTUSR','WUSDM','WRSETH','RSETH','EZETH']);
 const stableIds=new Set(['tether','usd-coin','dai','usds','ethena-usde','first-digital-usd','paypal-usd','world-liberty-financial-usd','frax','frax-usd','pax-dollar','paxos-standard','true-usd','gemini-dollar','ripple-usd','global-dollar','usual-usd','sky-dollar','usdd','liquity-usd','gho','curve-usd','euro-coin','euro-coinvertible','binance-usd','magic-internet-money','stasis-eurs','usd1']);
 function heatmapEligible(coin){
  const symbol=String(coin.symbol||'').trim().toUpperCase();
  const id=String(coin.id||'').trim().toLowerCase();
  const name=String(coin.name||'').trim().toLowerCase();
  if(stableSymbols.has(symbol)||wrappedSymbols.has(symbol)||stableIds.has(id))return false;
  if(/^(wrapped|bridged|binance-peg|wormhole|coinbase-wrapped|synthetic|liquid-staked|liquid-staking|wrapped-staked|staked|restaked|restaking)[-\s]/i.test(id)||/^(wrapped|bridged|binance-peg|wormhole|coinbase wrapped|synthetic|liquid staked|staked|restaked)\b/.test(name))return false;
  if(/\b(stablecoin|stable coin|bridged usdt|bridged usdc|wrapped bitcoin|wrapped ethereum|wrapped ether|wrapped btc|wrapped eth)\b/.test(name))return false;
  return true;
 }

// Same coverage threshold and nearest observation used by treasury.js.
function performanceBaseline(rows,windowMs){if(!rows.length)return null;if(windowMs===Infinity)return rows[0];const end=rows.at(-1).t;if(end-rows[0].t<windowMs*.92)return null;const target=end-windowMs;return rows.reduce((best,row)=>Math.abs(row.t-target)<Math.abs(best.t-target)?row:best,rows[0]);}
function create(api){
 const {t,read,el,money,quantity,num,metrics,rowsFor,selected,wallets,paint,json}=api;
 const state={favorites:[],favoritesAt:0,version:0,coins:[],coinsAt:0,global:null,globalAt:0,coin:null,coinAt:0,depth:null,depthAt:0,busy:new Set(),histories:read('inj_node_workspace_histories_v1',{}),historyAt:0};
 // A single live depth20 socket is shared across all Workspace Order Book
 // and bid/ask cards. REST snapshots add deeper levels for larger STEP sizes.
 const depthStreamEndpoints=[
  'wss://stream.binance.com:443/ws/injusdt@depth20@100ms',
  'wss://data-stream.binance.vision/ws/injusdt@depth20@100ms',
  'wss://stream.binance.com:9443/ws/injusdt@depth20@100ms'
 ];
 let depthSocket=null,depthWanted=false,depthSocketAttempt=0;
 let depthReconnectTimer=0,depthIdleTimer=0,depthPaintTimer=0;
 state.depthRest=null;state.depthRestAt=0;
 state.depthLive=null;state.depthLiveAt=0;

 function validLevels(list){
  return Array.isArray(list)?list.filter(row=>Array.isArray(row)&&
   Number(row[0])>0&&Number(row[1])>0).map(row=>[String(row[0]),String(row[1])]):[];
 }
 function composeWorkspaceDepth(){
  const snapshot=state.depthRest;
  const live=state.depthLive;
  const fresh=live&&Date.now()-state.depthLiveAt<7000;
  if(!fresh){
   if(snapshot){state.depth=snapshot;state.depthAt=state.depthRestAt;}
   else {state.depth=null;state.depthAt=0;}
   return;
  }
  const merge=(raw,head,ask)=>{
   const sortedHead=validLevels(head).sort((a,b)=>ask?Number(a[0])-Number(b[0]):Number(b[0])-Number(a[0]));
   if(!sortedHead.length)return validLevels(raw);
   const threshold=Number(sortedHead.at(-1)[0]);
   const tail=validLevels(raw).filter(row=>ask?Number(row[0])>threshold:Number(row[0])<threshold);
   return [...sortedHead,...tail].slice(0,state.depthRequestedLimit||100);
  };
  state.depth={asks:merge(snapshot?.asks,live.asks,true),bids:merge(snapshot?.bids,live.bids,false)};
  state.depthAt=state.depthLiveAt;
 }
 function notifyDepthCards(){
  if(depthPaintTimer)return;
  depthPaintTimer=setTimeout(()=>{
   depthPaintTimer=0;
   if(!depthWanted||document.hidden)return;
   state.version++;
   api.updated();
  },850);
 }
 function disconnectDepthSocket(){
  clearTimeout(depthReconnectTimer);
  clearTimeout(depthIdleTimer);
  depthReconnectTimer=0;depthIdleTimer=0;
  const socket=depthSocket;
  depthSocket=null;
  if(socket)try{socket.close()}catch(_){}
 }
 function connectDepthStream(){
  if(!depthWanted||document.hidden||navigator.onLine===false||depthSocket)return;
  const idx=depthSocketAttempt++%depthStreamEndpoints.length;
  try{
   const socket=new WebSocket(depthStreamEndpoints[idx]);
   depthSocket=socket;
   let received=false;
   clearTimeout(depthIdleTimer);
   depthIdleTimer=setTimeout(()=>{
    if(!received&&depthSocket===socket)try{socket.close()}catch(_){}
   },7500);
   socket.onmessage=event=>{
    if(depthSocket!==socket)return;
    try{
     const data=JSON.parse(event.data);
     const asks=validLevels(data.a),bids=validLevels(data.b);
     if(!asks.length||!bids.length)return;
     received=true;
     clearTimeout(depthIdleTimer);
     state.depthLive={asks,bids};
     state.depthLiveAt=Date.now();
     composeWorkspaceDepth();
     notifyDepthCards();
    }catch(_){}
   };
   socket.onclose=()=>{
    if(depthSocket!==socket)return;
    depthSocket=null;
    clearTimeout(depthIdleTimer);
    composeWorkspaceDepth();
    if(depthWanted&&!document.hidden){
     depthReconnectTimer=setTimeout(connectDepthStream,1500);
    }
   };
   socket.onerror=()=>{try{socket.close()}catch(_){}};
  }catch(_){
   depthSocket=null;
   depthReconnectTimer=setTimeout(connectDepthStream,2000);
  }
 }
 function manageWorkspaceDepth(needed){
  depthWanted=Boolean(needed);
  if(depthWanted){
   connectDepthStream();
  }else if(depthSocket||depthReconnectTimer){
   disconnectDepthSocket();
   state.depthLive=null;state.depthLiveAt=0;
   composeWorkspaceDepth();
  }
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){disconnectDepthSocket();}
  else if(depthWanted){connectDepthStream();}
 });
 window.addEventListener('pagehide',disconnectDepthSocket);
 window.addEventListener('pageshow',()=>{if(depthWanted)connectDepthStream()});

 const safe=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const product=(a,b)=>safe(a)!==null&&safe(b)!==null?a*b:null;
 function age(at){return at?(Date.now()-at>120000?'Snapshot · ':'')+new Date(at).toLocaleTimeString():t('Dati in attesa','Waiting for data')}
 function identity(i){return i.type+'|'+i.source+'|'+selected()+'|'+localStorage.getItem('inj_monitor_currency')+'|'+localStorage.getItem('inj_node_language_v1')}
 function value(host,i,key,label,text,numeric,calm=false){host._wsNodes??=new Map();const keyId=key+'|'+identity(i);let node=host._wsNodes.get(keyId);if(!node){node=el('strong','ws-section-value');host._wsNodes.set(keyId,node);if(host._wsNodes.size>800)host._wsNodes.delete(host._wsNodes.keys().next().value)}paint(node,text,numeric,{calm,identity:identity(i)});const row=el('div','ws-section-row');if(label)row.append(el('span','ws-section-label',label));row.append(node);host.append(row);return row}
 function note(host,text){host.append(el('small','ws-section-note',text))}
 function empty(host){note(host,t('Dati non disponibili. In attesa della sorgente INJ Node.','Data unavailable. Waiting for the INJ Node source.'))}
 function controls(i,host,fields){const wrap=el('div','ws-section-controls');for(const f of fields){const label=el('label','',f.label),input=el(f.options?'select':'input');input.setAttribute('aria-label',f.label);if(f.options){for(const [v,title]of f.options){const o=el('option','',title);o.value=v;input.append(o)}}else{input.type='number';input.min=f.key==='years'?'1':'0';input.max=String(f.key==='years'?30:1e12);input.step='any'}input.value=String(i[f.key]??'');input.addEventListener(f.options?'change':'input',()=>{const v=f.options?input.value:Number(input.value);if(!f.options&&(!Number.isFinite(v)||v<Number(input.min)||v>Number(input.max)))return;i[f.key]=v;api.change(i,f.key,v);});label.append(input);wrap.append(label)}host.append(wrap)}
 function addresses(i){return i.source==='all'?wallets().map(w=>w.address):[i.source==='selected'?selected():i.source].filter(Boolean)}
 function selectedWalletRows(i){const cached=read('inj_monitor_summaries_v1',{});return addresses(i).map(address=>({address,label:wallets().find(w=>w.address===address)?.label||address.slice(0,10),row:api.row(address)||cached[address]||null}))}
 function pnlRows(i){const all=read('inj_node_daily_pnl_timeline_v1',{}),byDay=new Map(),aa=addresses(i);for(const a of aa){for(const r of Array.isArray(all[a])?all[a]:[]){if(!Number.isFinite(r.dayStart)||!Number.isFinite(r.pnlUsd))continue;const day=byDay.get(r.dayStart)||{t:r.dayStart,value:0,count:0};day.value+=r.pnlUsd;day.count++;byDay.set(r.dayStart,day)}}const span={'1d':864e5,'7d':7*864e5,'30d':30*864e5,all:Infinity}[i.historyRange]||30*864e5;return [...byDay.values()].filter(r=>r.count===aa.length&&r.t>=Date.now()-span).sort((a,b)=>a.t-b.t)}
 function avgCost(i){const costs=read('inj_monitor_average_buy_price_v1',{}),rows=selectedWalletRows(i);if(!rows.length||rows.some(w=>!w.row||!(Number(costs[w.address])>0)))return null;return rows.reduce((n,w)=>n+Number(costs[w.address])*w.row.total,0)}
 function dataFor(i){const m=metrics(i),p=api.price(),coin=state.coins.find(c=>c.id==='injective-protocol')||state.coin;
 const open=api.market()?.open24??(safe(api.marketChange())!==null&&p!==null?p/(1+api.marketChange()/100):null),cost=m?avgCost(i):null;
 const bids=state.depth?.bids||[],asks=state.depth?.asks||[],bid=bids.length?Number(bids[0][0]):null,ask=asks.length?Number(asks[0][0]):null;
 const rows=rowsFor(i),stake=m?.staked,apr=m&&m.daily!==null&&stake>0?m.daily*365/stake*100:null,period=pnlRows(i);
 const g=state.global||{},globalCap=g.total_market_cap?.usd,globalVolume=g.total_volume?.usd;
 const values={apr,unbonding:sum(rows,'unbonding'),hourly:m?.daily===null?null:m?.daily/24,weekly:m?.daily===null?null:m?.daily*7,monthly:m?.daily===null?null:m?.daily*30,yearly:m?.daily===null?null:m?.daily*365,pnl:m&&p!==null&&cost!==null?m.total*p-cost:null,pnl24:m&&p!==null&&open>0?(p-open)*m.total:null,avgprice:m&&m.total>0&&cost!==null?cost/m.total:null,low24:safe(api.market()?.low24)??safe(coin?.low_24h),high24:safe(api.market()?.high24)??safe(coin?.high_24h),change24:api.marketChange(),volume24:safe(coin?.total_volume),marketcap:safe(coin?.market_cap),circulating:safe(coin?.circulating_supply),fullydiluted:safe(coin?.fully_diluted_valuation),dominance:ratio(coin?.market_cap,globalCap)===null?null:coin.market_cap/globalCap*100,globalcap:safe(globalCap),globalvolume:safe(globalVolume),btcdom:safe(g.market_cap_percentage?.btc),networkstake:safe(read('inj_node_intel_chain_snapshot_v2',{})?.data?.bonded),nativesupply:safe(read('inj_node_intel_native_supply_v1',{})?.amount),walletcount:addresses(i).length,bid,ask,spread:bid!==null&&ask!==null?ask-bid:null,periodpnl:period.length?period.reduce((n,r)=>n+r.value,0):null,bestday:period.length?Math.max(...period.map(r=>r.value)):null,worstday:period.length?Math.min(...period.map(r=>r.value)):null};
 return {m,p,coin,values,bids,asks,period,at:['bid','ask','spread','orderbook'].includes(i.type)?state.depthAt:['periodpnl','bestday','worstday','timeline'].includes(i.type)?period.at(-1)?.t:api.C.byType[i.type].scope==='market'?state.coinsAt||state.globalAt:m?.at};}
 const quantities=new Set(['unbonding','hourly','weekly','monthly','yearly','circulating','networkstake','nativesupply']);
 const percents=new Set(['apr','change24','dominance','btcdom']);
 function pathChart(host,points,label,formatValue=money){if(points.length<2){note(host,t('Lo storico disponibile non ha ancora due rilevazioni.','Available history does not yet contain two observations.'));return}Charts.render(host,{rows:points.map(p=>({t:p.t,v:p.value})),label,formatValue,locale:t('it-IT','en-US'),el});}

 function progress(host,percent){const track=el('div','ws-track'),bar=el('i');track.setAttribute('role','progressbar');track.setAttribute('aria-label',t('Avanzamento','Progress'));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');if(percent!==null&&Number.isFinite(percent))track.setAttribute('aria-valuenow',String(Math.max(0,Math.min(100,percent))));else track.setAttribute('aria-valuetext',t('Dati non disponibili','Data unavailable'));bar.style.width=(Number.isFinite(percent)?Math.max(0,Math.min(100,percent)):0)+'%';bar.style.animationDelay=-(Date.now()%3000)/1000+'s';track.append(bar);host.append(track)}
 function historyControls(i,host){if(!host.closest('.ws-preview')){host.append(el('span','ws-chart-timeframe',i.historyRange==='all'?t('TUTTO','ALL'):i.historyRange.toUpperCase()));return}controls(i,host,[{key:'historyRange',label:t('Storico','History'),options:[['1d','1D'],['7d','7D'],['30d','30D'],['all',t('Tutto','All')]]}])}
 function metric(host,i,key,label,x,format=quantity,tone='accent'){const row=value(host,i,key,label,format(safe(x)),safe(x));row.dataset.tone=tone;return row;}
 function dual(host,i,key,label,x,tone){const row=metric(host,i,key,label,x,quantity,tone);const fiat=el('small','ws-metric-fiat',money(product(x,api.price())));row.append(fiat);return row;}
 function gauge(host,i,key,label,x,max,format=quantity){metric(host,i,key,label,x,format);progress(host,boundedPercent(x,max));note(host,format(safe(x))+' / '+format(safe(max)));}
 function stream(host,index,daily){const rail=el('div','reward-velocity');rail.dataset.velocityIndex=String(index%5);rail.dataset.idle=String(!(daily>0));const track=el('span','reward-velocity-track'),travel=el('span','reward-velocity-travel');travel.append(el('i'),el('b'));track.append(travel,el('span','reward-velocity-beacon'));rail.append(track);const duration=daily>0?Math.max(2.4,Math.min(14,10-Math.log10(daily*1000+1)*1.5)):8;rail.style.setProperty('--velocity-duration',duration+'s');rail.style.setProperty('--velocity-phase',-(Date.now()/1000%duration)+'s');host.append(rail);}
 function heatmapControls(i,host,coins){
  const favorite=i.type==='favoritesheatmap';
  const saved=read('inj_node_crypto_favorites_v1',[]);
  const initial=Array.isArray(i.heatmapCoins)?i.heatmapCoins:
   favorite?(Array.isArray(saved)?saved.map(c=>c.id):[]):
   i.type==='coinspot'?[]:coins.map(c=>c.id);
  const assigned=Array.isArray(i.heatmapCoins)&&i.heatmapCoins.length>0;
  const wrap=el('div',favorite?'ws-section-controls ws-favorites-toolbar':'ws-section-controls ws-heatmap-controls');
  if(assigned&&!favorite)wrap.classList.add('ws-selection-done');
  if(favorite){
   const ranges=el('div','ws-favorites-ranges');
   ranges.setAttribute('role','group');ranges.setAttribute('aria-label',t('Periodo della Heatmap','Heatmap period'));
   for(const [range,label]of [['1h','1H'],['24h','24H'],['7d','7D'],['30d','30D']]){
    const b=el('button','ws-favorites-range',label);b.type='button';
    b.dataset.marketRange=range;b.setAttribute('aria-pressed',String((i.marketRange||'24h')===range));
    b.addEventListener('click',()=>{if((i.marketRange||'24h')!==range)api.change(i,'marketRange',range);});
    ranges.append(b);
   }
   wrap.append(ranges);
  }
  const button=el('button',favorite?'ws-favorites-edit':'',favorite?t('✎ MONETE','✎ COINS'):assigned?t('Modifica','Edit'):t('Scegli monete','Choose coins'));
  button.type='button';
  if(favorite){
   button.setAttribute('aria-label',t('Modifica le crypto in questa Heatmap','Edit coins in this Heatmap'));
   button.title=t('Modifica senza cambiare preset','Edit without switching presets');
  }
  button.addEventListener('click',()=>{
   const dialog=el('dialog','ws-dialog ws-small ws-coin-picker'),heading=el('h2','',t('Crypto in questa Heatmap','Coins in this Heatmap')),search=el('input');
   search.type='search';search.placeholder=t('Cerca nome o simbolo','Search name or symbol');search.setAttribute('aria-label',search.placeholder);
   const available=new Map(coins.map(c=>[c.id,c]));
   if(favorite&&Array.isArray(saved))for(const c of saved)if(c?.id&&!available.has(c.id))available.set(c.id,c);
   for(const id of initial)if(!available.has(id))available.set(id,{id,name:id,symbol:'',missing:true});
   const chosen=new Set(initial),list=el('div','ws-coin-picker-list'),count=el('p'),inputs=[];
   const update=()=>{count.textContent=chosen.size+' '+t('monete selezionate','coins selected');};
   for(const coin of available.values()){
    const label=el('label'),input=el('input');input.type='checkbox';input.checked=chosen.has(coin.id);
    input.addEventListener('change',()=>{
     if(input.checked){if(i.type==='coinspot'){chosen.clear();for(const row of inputs)row.input.checked=false;input.checked=true;}chosen.add(coin.id);}
     else chosen.delete(coin.id);
     update();
    });
    label.append(input,el('span','',coin.name+' · '+String(coin.symbol||'').toUpperCase()+(coin.missing?' · '+t('in attesa','waiting'):'')));
    list.append(label);inputs.push({input,label,coin});
   }
   search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();for(const {label,coin}of inputs)label.hidden=!(coin.name+' '+coin.symbol).toLowerCase().includes(q);});
   const actions=el('div','ws-coin-picker-actions');
   for(const [it,en,on]of [['Tutte','All',true],['Nessuna','None',false]]){
    const b=el('button','',t(it,en));b.type='button';
    b.addEventListener('click',()=>{chosen.clear();for(const {input,coin}of inputs){input.checked=on;if(on)chosen.add(coin.id);}update();});
    actions.append(b);
   }
   const apply=el('button','ws-primary',t('Applica selezione','Apply selection')),close=el('button','',t('Annulla','Cancel'));
   apply.type=close.type='button';
   apply.addEventListener('click',()=>{
    const ids=[...chosen].slice(0,250);
    api.change(i,'heatmapCoins',i.type==='coinspot'?ids.slice(0,1):favorite?ids:ids.length===available.size&&ids.length>0?null:ids);
    dialog.close();dialog.remove();
   });
   close.addEventListener('click',()=>{dialog.close();dialog.remove();});
   dialog.addEventListener('cancel',()=>dialog.remove());
   dialog.append(heading,search,actions,count,list,apply,close);
   if(!available.size)list.append(el('p','',t('Elenco monete in caricamento. Riapri il selettore tra poco.','Coin list loading. Reopen the picker shortly.')));
   update();document.body.append(dialog);dialog.showModal();
  });
  wrap.append(button);host.append(wrap);
 }
 function marketControls(i,host){
  if(i.type==='favoritesheatmap')return;
  if(host.closest('.ws-preview'))controls(i,host,[{key:'marketRange',label:t('Intervallo performance','Performance range'),options:[['1h','1H'],['24h','24H'],['7d','7D'],['30d','30D']]}]);
  else host.append(el('span','ws-chart-timeframe',(i.marketRange||'24h').toUpperCase()));
 }
 function nativeHistory(i){const key=addresses(i).sort().join('|'),native=key===api.C.treasuryWallets.slice().sort().join('|')?read('inj_node_treasury_growth_v1',[]):[];return [...(Array.isArray(native)?native.map(r=>({t:r.t,total:r.value,worth:(read('inj_node_treasury_worth_growth_v1',[]).find(w=>w.t===r.t)||{}).value})):[]),...(state.histories[key]||[])].filter(r=>Number.isFinite(r.total)).sort((a,b)=>a.t-b.t);}
 function renderExtra(i,host,d){const {m,p,values:v}=d,type=i.type;
 if(type==='genesis'){
  for(const [j,[it,en,x]]of [['Sviluppo ecosistema','Ecosystem development',36.33],['Team / contributori','Team / contributors',20],['Vendita privata','Private sale',16.67],['Crescita community','Community growth',10],['Binance Launchpad','Binance Launchpad',9],['Seed sale','Seed sale',6],['Consulenti','Advisors',2]].entries()){metric(host,i,'gen'+j,t(it,en),x,x=>num(x,2)+'%');progress(host,x);}note(host,t('Allocazione iniziale di 100 milioni INJ, 2020. Non rappresenta le partecipazioni attuali di Labs o Foundation.','Initial 100 million INJ allocation, 2020. Does not represent current Labs or Foundation holdings.'));
 }else if(type==='holdertiers'){
  const tiers=[['🦐 Shrimp',0,100],['🦀 Crab',100,1000],['🐟 Fish',1000,10000],['🦈 Shark',10000,100000],['🐋 Whale',100000,Infinity]],rows=selectedWalletRows(i),known=rows.filter(w=>Number.isFinite(w.row?.total));for(const [j,[name,min,max]]of tiers.entries()){const count=known.filter(w=>w.row.total>=min&&w.row.total<max).length;metric(host,i,'tier'+j,name,known.length?count:null,x=>num(x,0));progress(host,known.length?count/known.length*100:null);}note(host,t('Fasce illustrative dei soli wallet salvati. Non è una classifica dell’intera rete.','Illustrative tiers among saved wallets only. Not a network-wide holder ranking.'));
 }else if(type==='marketintelligence'){
  for(const [key,label,x,format]of [['price',t('Prezzo INJ','INJ price'),p,money],['cap','Market cap',v.marketcap,money],['vol','Volume 24h',v.volume24,money],['dominance',t('Dominanza','Dominance'),v.dominance,x=>num(x,4)+'%'],['stake','Network staking',v.networkstake,quantity]])metric(host,i,key,label,x,format);
 }else if(['incomeperiods','allpotential'].includes(type)){
  controls(i,host,[{key:'scenarioPrice',label:t('Prezzo ipotetico · ','Hypothetical price · ')+api.currency()}]);const price=api.fx()>0?i.scenarioPrice/api.fx():null;if(type==='incomeperiods')for(const [label,factor]of [['1h',1/24],['24h',1],['7d',7],['30d',30],['365d',365]])metric(host,i,label,label,product(product(m?.daily,factor),price),money,'staking');else for(const w of selectedWalletRows(i)){metric(host,i,w.address,w.label,product(safe(w.row?.total),price),money);metric(host,i,w.address+'stake','Staking',product(safe(w.row?.staked),price),money,'staking');}note(host,t('Simulazione · prezzo e APR costanti.','Simulation · constant price and APR.'));
 }else if(['portfolio','treasuryoverview','rewardoverview','treasuryallocation','position'].includes(type)){
  if(!m){empty(host);return;}
  const reward=type==='rewardoverview';metric(host,i,'hero',reward?t('Reward maturati','Accrued rewards'):t('Patrimonio','Net worth'),reward?m.rewards:product(m.total,p),reward?quantity:money,reward?'rewards':'accent');
  const keys=reward?['rewards','staked']:['total','staked','available','rewards'];for(const key of keys)dual(host,i,key,{total:t('Totale INJ','Total INJ'),staked:'Staking',available:t('Disponibile','Available'),rewards:'Reward'}[key],m[key],key==='staked'?'staking':key==='available'?'available':key==='rewards'?'rewards':'accent');
  metric(host,i,'ratio','Staking ratio',boundedPercent(m.staked,m.total),x=>num(x,2)+'%','staking');progress(host,boundedPercent(m.staked,m.total));
  if(type==='treasuryoverview')metric(host,i,'pnl','P/L 24h',v.pnl24,money,v.pnl24<0?'down':'up');
  if(reward){dual(host,i,'daily',t('Produzione 24h · stima','24h production · estimate'),m.daily,'staking');metric(host,i,'apr','APR',v.apr,x=>num(x,3)+'%');}
 }else if(type==='usdc'){const x=sum(rowsFor(i),'nativeUsdc');metric(host,i,'usdc','Circle · Injective',x,x=>num(x,2)+' USDC','available');if(x===null)empty(host);
 }else if(type==='velocity'){
  for(const [j,w]of selectedWalletRows(i).entries()){const r=w.row,daily=r&&Number.isFinite(r.personalApr)?r.staked*r.personalApr/100/365:null;dual(host,i,w.address,w.label,safe(r?.rewards),'rewards');stream(host,j,daily);note(host,quantity(daily)+' / 24h · '+t('stima da APR netto','net APR estimate'));}
 }else if(type==='accumulation'){
  const earned=m?.rewards,unit=.001,remainder=Number.isFinite(earned)?earned%unit:null;gauge(host,i,'accumulation',t('Frazione reward corrente','Current reward fraction'),remainder,unit);metric(host,i,'reward','Reward',earned,quantity,'rewards');note(host,t('Ciclo di 0,001 INJ sui reward maturati on-chain.','0.001 INJ cycle based on accrued on-chain rewards.'));
 }else if(type==='productionlevel'){
  const daily=product(m?.daily,p),target=daily===null?null:[.5,1,3,5,10,15,20,30,50,100,500,1000].find(x=>x>daily)||Math.ceil(daily/1000+1)*1000;gauge(host,i,'daily',t('Produzione USD / giorno · stima','USD production / day · estimate'),daily,target,money);
 }else if(type==='target'){
  const aa=addresses(i),stored=read('inj_monitor_targets_v1',{}),native=aa.length===1?Number(stored[aa[0]]):null;if(host.closest('.ws-preview')){if(native>0&&!i._targetEdited)i.targetAmount=native;controls(i,host,[{key:'targetAmount',label:t('Obiettivo INJ','INJ goal')}]);}
  const target=i.targetAmount,elapsed=m?Math.min(120000,Math.max(0,Date.now()-m.at)):0,total=m?m.total+(m.daily??0)*elapsed/864e5:null;gauge(host,i,'target',t('Obiettivo INJ','INJ goal'),total,target);metric(host,i,'remaining',t('INJ mancanti','Remaining INJ'),total===null?null:Math.max(0,target-total));const rate=v.apr===null?null:v.apr/100/365,principal=m?m.staked+m.rewards:null,days=total!==null&&total>=target?0:rate>0&&principal>0?Math.ceil(Math.log((target-m.available)/principal)/Math.log(1+rate)):null;note(host,'ETA · '+(days!==null&&days<=14600?Math.max(0,days)+' '+t('giorni','days'):t('non disponibile','unavailable'))+' · '+t('stima con reinvestimento giornaliero','daily reinvestment estimate'));
 }else if(type==='walletpnl'){
  const periods=[['1d','24H'],['7d','7D'],['30d','30D'],['all','ALL']];
  controls(i,host,[{key:'historyRange',label:t('Periodo P&L','P&L period'),options:periods}]);
  const history=d.period,observed=history.length,amount=observed?history.reduce((n,r)=>n+r.value,0):null;
  const tone=amount===null?'accent':amount<0?'down':'up';
  metric(host,i,'recorded',t('P/L registrato','Recorded P/L'),amount,money,tone);
  if(i.historyRange==='1d')metric(host,i,'price24',t('Variazione prezzo 24H · stima','24H price movement · estimate'),v.pnl24,money,v.pnl24<0?'down':'up');
  if(observed>1)pathChart(host,history,t('Storico P/L','P/L history'));
  note(host,t('Fonte: storico giornaliero salvato da INJ Node. I giorni mancanti non sono stimati. Il P/L da prezzo non include i flussi di capitale.','Source: daily history saved by INJ Node. Missing days are not estimated. Price-based P/L excludes capital flows.'));
  if(amount===null)empty(host);
 }else if(type==='treasuryproduction'){render({...i,type:'production'},host);metric(host,i,'apr','APR',v.apr,x=>num(x,3)+'%','staking');
 }else if(type==='treasurymilestone'){render({...i,type:'milestone'},host);
 }else if(type==='treasuryperformance'){
  const rows=nativeHistory(i),now=rows.at(-1),first=rows[0];for(const [label,span]of [['24H',864e5],['7D',7*864e5],['30D',30*864e5],['ALL',Infinity]]){const base=performanceBaseline(rows,span),x=now&&base?now.total-base.total:null;const row=metric(host,i,label,label,x,quantity,x<0?'down':'up');if(x!==null){row.append(el('small','ws-metric-fiat',num(base.total>0?x/base.total*100:0,2)+'%'));const worthNow=rows.filter(r=>Number.isFinite(r.worth)),worthBase=performanceBaseline(worthNow,span),delta=worthBase&&worthNow.length?worthNow.at(-1).worth-worthBase.worth:null;row.append(el('small','ws-metric-fiat',money(delta)+(delta!==null?' · '+num(worthBase.worth>0?delta/worthBase.worth*100:0,2)+'%':'')));}}

  const closes=new Map();for(const r of rows){const date=new Date(r.t),day=date.getFullYear()+'-'+date.getMonth()+'-'+date.getDate();closes.set(day,r);}const days=new Map(),closed=[...closes.values()];for(let j=1;j<closed.length;j++)days.set(j,closed[j].total-closed[j-1].total);const dd=[...days.values()];metric(host,i,'best',t('Miglior giorno','Best day'),dd.length?Math.max(...dd):null,quantity,'up');metric(host,i,'worst',t('Peggior giorno','Worst day'),dd.length?Math.min(...dd):null,quantity,'down');metric(host,i,'ath','ATH Treasury',rows.length?Math.max(...rows.map(r=>r.total)):null);note(host,t('Differenza INJ da storico registrato; include depositi e prelievi.','INJ change from recorded history; includes deposits and withdrawals.'));
 }else if(type==='priceposition'){metric(host,i,'price',t('Prezzo attuale','Current price'),p,money);progress(host,Number.isFinite(p)&&v.high24>v.low24?boundedPercent(p-v.low24,v.high24-v.low24):null);metric(host,i,'low','LOW 24h',v.low24,money,'available');metric(host,i,'high','HIGH 24h',v.high24,money,'staking');
 }else if(['athrecovery','atlrecovery'].includes(type)){
  const key=type==='athrecovery'?'ath':'atl',x=safe(d.coin?.[key]),pct=x>0&&p!==null?(p/x-1)*100:null;metric(host,i,'record',key.toUpperCase(),x,money);metric(host,i,'distance',key==='ath'?t('Distanza dal massimo','Distance from ATH'):t('Crescita dal minimo','Gain from ATL'),pct,n=>num(n,2)+'%',pct<0?'down':'up');progress(host,key==='ath'?boundedPercent(p,x):d.coin?.ath>x?boundedPercent(p-x,d.coin.ath-x):null);const date=Date.parse(d.coin?.[key+'_date']);note(host,Number.isFinite(date)?new Date(date).toLocaleDateString(t('it-IT','en-US')):'—');
 }else if(type==='supplydistribution'){
  const total=v.nativesupply,staked=v.networkstake;metric(host,i,'native',t('Offerta nativa','Native supply'),total);metric(host,i,'staked','Staking',staked,quantity,'staking');metric(host,i,'unstaked',t('Non in staking','Unstaked'),total!==null&&staked!==null&&total>=staked?total-staked:null,quantity,'available');progress(host,total>=staked?boundedPercent(staked,total):null);metric(host,i,'circulating',t('Circolante · CoinGecko','Circulating · CoinGecko'),v.circulating);
 }else if(type==='globaloverview'){for(const [key,label,x,format]of [['cap',t('Capitalizzazione','Market cap'),v.globalcap,money],['volume','Volume 24h',v.globalvolume,money],['btc','BTC dominance',v.btcdom,x=>num(x,2)+'%'],['eth','ETH dominance',safe(state.global?.market_cap_percentage?.eth),x=>num(x,2)+'%'],['change','Market cap 24h',safe(state.global?.market_cap_change_percentage_24h_usd),x=>num(x,2)+'%']])metric(host,i,key,label,x,format);
 }else if(type==='marketbreadth'){
  const coins=state.coins.filter(c=>marketChange(c,'24h')!==null),up=coins.filter(c=>marketChange(c,'24h')>0).length,down=coins.filter(c=>marketChange(c,'24h')<0).length;metric(host,i,'up',t('In rialzo','Gainers'),coins.length?up:null,x=>num(x,0),'up');metric(host,i,'down',t('In ribasso','Losers'),coins.length?down:null,x=>num(x,0),'down');progress(host,coins.length?up/coins.length*100:null);note(host,coins.length+' / 200 · 24h');
 }else if(type==='bookbalance'){const volume=rows=>rows.reduce((n,r)=>n+Number(r[0])*Number(r[1]),0),bid=d.bids.length?volume(d.bids):null,ask=d.asks.length?volume(d.asks):null;metric(host,i,'bid','Bid · USDT',bid,money,'up');metric(host,i,'ask','Ask · USDT',ask,money,'down');progress(host,bid!==null&&ask!==null?boundedPercent(bid,bid+ask):null);note(host,t('Profondità dei primi 20 livelli · Binance INJ/USDT','First 20 depth levels · Binance INJ/USDT'));
 }else if(type==='growthsimple'){
  controls(i,host,[{key:'years',label:t('Anni','Years')},{key:'scenarioPrice',label:t('Prezzo ipotetico · ','Hypothetical price · ')+api.currency()}]);const amount=m&&m.daily!==null?m.staked+m.daily*365*i.years:null,points=m&&m.daily!==null?Array.from({length:i.years*12+1},(_,j)=>({t:Date.now()+j*365.25/12*864e5,value:m.staked+m.daily*365*j/12})):[];metric(host,i,'result',t('Capitale finale','Final principal'),amount);metric(host,i,'fiat',t('Valore simulato','Simulated value'),api.fx()>0?product(amount,i.scenarioPrice/api.fx()):null,money);pathChart(host,points,t('Crescita senza compound','Growth without compounding'),quantity);note(host,t('Stima · APR e prezzo costanti, senza reinvestimento.','Estimate · constant APR and price, without reinvestment.'));
 }
 }
 function render(i,host){if(!supported.includes(i.type))return false;
  let oldBook=null;
  if(i.type==='orderbook'){
   const ask=host.querySelector?.('.ws-book-ask'),bid=host.querySelector?.('.ws-book-bid');
   oldBook={ask:ask?{top:ask.scrollTop,pinned:ask.scrollHeight-ask.clientHeight-ask.scrollTop<30}:null,
            bid:bid?{top:bid.scrollTop,pinned:bid.scrollTop<30}:null};
  }
 const d=dataFor(i),{m,p,values:v}=d;
 if(i.type==='orderbook'&&state.depth){
  const step=normalizedBookStep(i.bookStep),cacheKey=state.depthAt+'|'+step+'|'+api.currency();
  const priceNode=host.querySelector?.('.ws-book-live-price');
  if(priceNode&&host._wsBookCacheKey===cacheKey){
   const bestAsk=Number(d.asks[0]?.[0]),bestBid=Number(d.bids[0]?.[0]);
   const live=p!==null?p:bestAsk>0&&bestBid>0?(bestAsk+bestBid)/2:null;
   const before=host._wsBookPrice;
   const trend=live!==null&&before!==undefined?(live>before?'up':live<before?'down':'flat'):'flat';
   if(live!==null)host._wsBookPrice=live;
   paint(priceNode,money(live,5),live,{});
   const center=host.querySelector('.ws-book-price');
   if(center)center.dataset.trend=trend;
   const arrow=host.querySelector('.ws-book-live-arrow');
   if(arrow)arrow.textContent=trend==='up'?'↑':trend==='down'?'↓':'•';
   return true;
  }
 }
 const previousScroll=i.type==='favoritesheatmap'?host.scrollTop:null;
 host.replaceChildren();host.classList.add('ws-section-body');host.classList.toggle('ws-sensitive',api.C.byType[i.type].scope!=='market');host.classList.toggle('ws-single-metric',simple.includes(i.type));
 host.dataset.widget=i.type;
 if(extra.includes(i.type)&&i.type!=='favoritesheatmap'){renderExtra(i,host,d);
 }else if(simple.includes(i.type)){
  const x=safe(v[i.type]),text=i.type==='walletcount'?String(v.walletcount):percents.has(i.type)?num(x,3)+'%':quantities.has(i.type)?quantity(x):money(x,['bid','ask','spread'].includes(i.type)?5:2);
  value(host,i,'main','',text,x);if(i.type==='walletcount')note(host,rowsFor(i).filter(Boolean).length+'/'+addresses(i).length+' '+t('wallet con dati','wallets with data'));else if(x===null)empty(host);else if(quantities.has(i.type)&&p!==null&&i.type!=='circulating')note(host,money(x*p));if(i.type==='pnl24')note(host,t('Variazione da prezzo, a quantità costante','Price change at constant holdings'));if(i.type==='apr')note(host,t('APR netto ponderato per lo staking','Net APR weighted by stake'));if(['periodpnl','bestday','worstday'].includes(i.type))historyControls(i,host);
 }else if(i.type==='session'){
  value(host,i,'market',t('Ultimo prezzo','Last price'),age(api.priceAt()),null);value(host,i,'wallets','Wallet',String(wallets().length),wallets().length);
 }else if(i.type==='levels'){
  for(const k of ['low24','high24','bid','ask'])value(host,i,k,{low24:t('Minimo 24h','24h low'),high24:t('Massimo 24h','24h high'),bid:'Bid',ask:'Ask'}[k],money(v[k]),v[k]);
 }else if(i.type==='converter'){
  controls(i,host,[{key:'amount',label:t('Importo','Amount')},{key:'direction',label:t('Direzione','Direction'),options:[['injToFiat','INJ → '+api.currency()],['fiatToInj',api.currency()+' → INJ']]}]);const rate=api.fx(),x=p!==null&&rate>0?(i.direction==='fiatToInj'?i.amount/(p*rate):i.amount*p):null;value(host,i,'result','',i.direction==='fiatToInj'?quantity(x):money(x),x);
 }else if(['potential','potentialstake','potentialincome','growth'].includes(i.type)){
  controls(i,host,[{key:'scenarioPrice',label:t('Prezzo ipotetico · ','Hypothetical price · ')+api.currency()},...(i.type==='growth'?[{key:'years',label:t('Anni','Years')}]:[])]);const fx=api.fx(),price=fx>0?i.scenarioPrice/fx:null;
  const amount=i.type==='potential'?m?.total:i.type==='potentialstake'?m?.staked:i.type==='potentialincome'?m?.daily:compound(m?.staked,v.apr,i.years);
  value(host,i,'result',i.type==='potentialincome'?t('Stima al giorno','Daily estimate'):'',money(product(amount,price)),product(amount,price));if(i.type==='growth'&&m&&v.apr!==null){const points=Array.from({length:i.years*12+1},(_,j)=>({t:(()=>{const date=new Date();date.setMonth(date.getMonth()+j);return date.getTime()})(),value:compound(m.staked,v.apr,j/12)}));pathChart(host,points,t('Crescita composta simulata','Simulated compound growth'),quantity);note(host,quantity(amount));}note(host,t('Simulazione · prezzo e APR costanti; compound giornaliero, senza aggiunte.','Simulation · constant price and APR; daily compounding, no additions.'));
 }else if(i.type==='comparison'){
  const choices=state.coins.filter(c=>c.market_cap>0).map(c=>[c.id,c.name+' · '+String(c.symbol).toUpperCase()]);if(!choices.some(c=>c[0]===i.targetCoin))choices.unshift([i.targetCoin,i.targetCoin]);controls(i,host,[{key:'targetCoin',label:t('Market cap di riferimento','Reference market cap'),options:choices}]);const target=state.coins.find(c=>c.id===i.targetCoin),multiple=ratio(target?.market_cap,d.coin?.market_cap),simulatedPrice=product(p,multiple);value(host,i,'multiple',t('Moltiplicatore','Multiple'),multiple===null?'—':num(multiple,2)+'×',multiple);value(host,i,'price',t('Prezzo INJ equivalente','Equivalent INJ price'),money(simulatedPrice),simulatedPrice);value(host,i,'worth',t('Patrimonio simulato','Simulated net worth'),money(product(m?.total,simulatedPrice)),product(m?.total,simulatedPrice));note(host,t('Scenario teorico a offerta circolante costante.','Theoretical scenario at constant circulating supply.'));
 }else if(i.type==='coinspot'){
  const available=state.coins.filter(heatmapEligible),ids=i.heatmapCoins||[],coin=state.coins.find(c=>c.id===ids[0]);
  heatmapControls(i,host,available);
  if(!coin){note(host,ids.length?t('Quotazione in caricamento','Loading quote'):t('Seleziona una crypto','Select a crypto'));}
  else {const change=marketChange(coin,i.marketRange||'24h'),tile=el('div','ws-spot-tile '+(change>0?'ws-up':change<0?'ws-down':''));
   tile.append(el('strong','ws-spot-symbol',String(coin.symbol||'').toUpperCase()),el('small','ws-spot-name',coin.name));
   tile.append(el('strong','ws-spot-price',money(safe(coin.current_price))),el('span','ws-spot-change',change===null?'—':(change>0?'+':'')+num(change,2)+'%'));
   host.append(tile);}
 }else if(i.type==='orderbook'){
  const bookStep=normalizedBookStep(i.bookStep);
  const toolbar=el('div','ws-book-toolbar');
  const pair=el('span','ws-book-pair','INJ / USDT');
  const label=el('label','ws-book-step-label','SIZE');
  const select=el('select','ws-book-step');
  select.setAttribute('aria-label',t('Dimensione aggregazione ordini','Order book grouping size'));
  for(const step of BOOK_STEPS){const option=el('option','',String(step));option.value=String(step);select.append(option);}
  select.value=String(bookStep);
  select.addEventListener('change',()=>api.change(i,'bookStep',normalizedBookStep(select.value)));
  label.append(select);toolbar.append(pair,label);host.append(toolbar);
  if(!state.depth)empty(host);
  else{
   // One vertical stack, like the standalone Order Book in Home.
   const grid=el('div','ws-book ws-book-stacked');
    // Force a single column even if shared workspace .ws-book CSS defines two columns.
    grid.style.gridTemplateColumns='minmax(0,1fr)';
    grid.style.gridTemplateRows='minmax(0,1fr) auto minmax(0,1fr)';
    grid.style.gridAutoFlow='row';
   const makeSide=(key,rows,label)=>{
    const section=el('section','ws-book-'+key);
    section.setAttribute('aria-label',label);
    section.append(el('h3','',label));
    const columns=el('div','ws-book-columns');
    columns.append(el('span','',t('PREZZO','PRICE')+' · '+api.currency()),el('span','','SIZE INJ'),el('span','',t('TOTALE','TOTAL')+' · '+api.currency()));
    section.append(columns);
    const levels=bucketBookLevels(rows,key,bookStep);
    let cumulative=0;
    const enriched=levels.map(r=>({...r,total:(cumulative+=r.price*r.size)}));
    const max=Math.max(1,...enriched.map(r=>r.size));
    for(const r of key==='ask'?enriched.reverse():enriched){
     const line=el('div','ws-book-level');
     line.style.setProperty('--depth',(r.size/max*100)+'%');
     const price=el('strong','ws-book-level-price');
     const size=el('span','ws-book-level-size');
     const total=el('span','ws-book-level-total');
     paint(price,num(r.price,Math.max(3,String(bookStep).split('.')[1]?.length||0)),r.price,{});
     paint(size,num(r.size,4),r.size,{});
     paint(total,money(r.total,2),r.total,{});
     line.append(price,size,total);
     section.append(line);
    }
    return section;
   };
   const asks=makeSide('ask',d.asks,t('Ordini di vendita','Sell orders'));
   asks.style.gridColumn='1 / -1';grid.append(asks);
   const topAsk=Number(d.asks[0]?.[0]),topBid=Number(d.bids[0]?.[0]);
   const live=p!==null?p:topAsk>0&&topBid>0?(topAsk+topBid)/2:null;
   const old=host._wsBookPrice;
   const trend=live!==null&&old!==undefined?(live>old?'up':live<old?'down':'flat'):'flat';
   if(live!==null)host._wsBookPrice=live;
   const priceRow=el('div','ws-book-price');
   priceRow.dataset.trend=trend;
   priceRow.append(el('small','ws-book-price-label',p!==null?'LAST TRADE':'MID PRICE'));
   const line=el('div','ws-book-price-line');
   line.append(el('strong','ws-book-live-price',money(live,5)),el('span','ws-book-live-arrow',trend==='up'?'↑':trend==='down'?'↓':'•'));
   priceRow.append(line);
   priceRow.style.gridColumn='1 / -1';grid.append(priceRow);
   const bids=makeSide('bid',d.bids,t('Ordini di acquisto','Buy orders'));
   bids.style.gridColumn='1 / -1';grid.append(bids);
   host.append(grid);
   host._wsBookCacheKey=state.depthAt+'|'+bookStep+'|'+api.currency();
   if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
    if(!asks.isConnected||!bids.isConnected)return;
    asks.scrollTop=oldBook?.ask&&!oldBook.ask.pinned?oldBook.ask.top:asks.scrollHeight;
    bids.scrollTop=oldBook?.bid&&!oldBook.bid.pinned?oldBook.bid.top:0;
   });
  }
 }else if(['marketlist','heatmap','favorites','favoritesheatmap','marketleaders','marketlosers'].includes(i.type)){
  const isFavorite=['favorites','favoritesheatmap'].includes(i.type),heat=['heatmap','favoritesheatmap'].includes(i.type),range=i.marketRange||'24h';marketControls(i,host);
  let coins=[...state.coins];if(isFavorite){
   const saved=read('inj_node_crypto_favorites_v1',[]),favorites=Array.isArray(saved)?saved:[];
   const ids=i.type==='favoritesheatmap'&&Array.isArray(i.heatmapCoins)?i.heatmapCoins:favorites.map(c=>c.id);
   const available=new Map([...state.coins,...state.favorites].map(c=>[c.id,c]));
   coins=[...new Set(ids)].map(id=>available.get(id)||{id,name:favorites.find(c=>c.id===id)?.name||id,symbol:favorites.find(c=>c.id===id)?.symbol||id});
   if(!coins.length)note(host,Array.isArray(i.heatmapCoins)?t('Nessuna crypto selezionata. Tocca MONETE per modificarle.','No coins selected. Tap COINS to edit.'):t('Nessun preferito. Aggiungi le crypto dalla sezione Market.','No favorites. Add crypto in Market.'));
  }
  if(['marketleaders','marketlosers'].includes(i.type))coins=coins.filter(c=>marketChange(c,range)!==null).sort((a,b)=>(marketChange(b,range)-marketChange(a,range))*(i.type==='marketlosers'?-1:1)).slice(0,10);
  if(heat){const eligible=i.type==='favoritesheatmap'?[...new Map([...state.coins,...state.favorites,...coins].map(c=>[c.id,c])).values()]:coins.filter(c=>isFavorite||heatmapEligible(c));heatmapControls(i,host,eligible);if(Array.isArray(i.heatmapCoins)){coins=coins.filter(c=>i.heatmapCoins.includes(c.id));if(!i.heatmapCoins.length)note(host,t('Nessuna moneta selezionata','No coins selected'));}const missing=coins.filter(c=>marketChange(c,range)===null).length;coins=coins.filter(c=>(isFavorite||heatmapEligible(c))&&marketChange(c,range)!==null);if(missing&&isFavorite)note(host,missing+' '+t('preferiti in attesa della quotazione per questo intervallo','favorites awaiting a quote for this range'));}if(host.closest('.ws-preview'))coins=coins.slice(0,8);const list=el('div',heat?'ws-mini-heatmap':'ws-coin-list');
  if(!heat){const head=el('div','ws-market-table-head');for(const label of [t('Asset','Asset'),t('Prezzo','Price'),'1H','24H','7D','30D','Market cap','Vol. 24h','7D'])head.append(el('span','',label));list.append(head);}
  for(const c of coins){const change=marketChange(c,range),row=el('div',change>0?'ws-up':change<0?'ws-down':'');if(heat){row.append(el('strong','',String(c.symbol).toUpperCase()),el('span','',money(safe(c.current_price))),el('small','',num(change,2)+'%'));row.style.setProperty('--ws-heat',String(change===null?0:Math.min(.62,.12+Math.abs(change)/30*.5)));}else{row.append(el('span','ws-coin-name',c.name+' · '+String(c.symbol).toUpperCase()));value(row,i,c.id,'',money(safe(c.current_price)),safe(c.current_price));for(const frame of ['1h','24h','7d','30d']){const x=marketChange(c,frame);const changeNode=el('small',x>0?'ws-up':x<0?'ws-down':'',num(x,2)+'%');changeNode.dataset.active=String(frame===range);row.append(changeNode);}row.append(el('small','',money(safe(c.market_cap))),el('small','',money(safe(c.total_volume))));const points=c.sparkline_in_7d?.price?.filter(Number.isFinite)||[];if(points.length>1){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','polyline'),lo=Math.min(...points),span=Math.max(...points)-lo||1;svg.setAttribute('viewBox','0 0 90 28');svg.setAttribute('class','ws-market-spark');svg.setAttribute('aria-label','7D');path.setAttribute('points',points.map((x,j)=>(j/(points.length-1)*90).toFixed(1)+','+(26-(x-lo)/span*24).toFixed(1)).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');svg.append(path);row.append(svg);}else row.append(el('small','','—'));}list.append(row);}host.append(list);if(i.type==='favoritesheatmap'&&previousScroll!==null)host.scrollTop=previousScroll;if(!state.coins.length&&!state.favorites.length)empty(host);note(host,'CoinGecko · '+range.toUpperCase()+' · '+age(isFavorite?state.favoritesAt||state.coinsAt:state.coinsAt));
 }else if(['composition','ownership','walletlist','rewardwallets'].includes(i.type)){
  if(!m)empty(host);else if(i.type==='composition'){
   const parts=[['Staking',m.staked,'var(--donut-staked-a)'],[t('Disponibile','Available'),m.available,'var(--donut-available-a)'],['Reward',m.rewards,'var(--donut-rewards-a)'],[t('In sblocco / altro','Unbonding / other'),Math.max(0,m.total-m.staked-m.available-m.rewards),'var(--muted,#8196aa)']];let cursor=0;const stops=parts.map(([name,x,color])=>{const from=cursor;cursor+=m.total?x/m.total*100:0;return color+' '+from+'% '+cursor+'%'}),pie=el('div','ws-composition');pie.style.background=m.total?'conic-gradient('+stops.join(',')+')':'var(--ws-line)';pie.setAttribute('role','img');pie.setAttribute('aria-label',t('Composizione del patrimonio','Portfolio composition'));pie.append(el('strong','ws-donut-center',num(m.total?m.staked/m.total*100:0,1)+'%'));host.append(pie);for(const [j,[name,x,color]]of parts.entries()){const row=value(host,i,name,name,num(m.total?x/m.total*100:0,2)+'% · '+quantity(x),x);row.style.color=color;row.dataset.tone=['staking','available','rewards','neutral'][j];}
  }else for(const w of selectedWalletRows(i)){const x=i.type==='rewardwallets'?safe(w.row?.rewards):safe(w.row?.total);value(host,i,w.address,w.label,i.type==='ownership'?num(x!==null&&m.total?x/m.total*100:null,2)+'%':i.type==='walletlist'?money(product(x,p)):quantity(x),x,i.type==='rewardwallets');if(i.type==='ownership'&&x!==null)progress(host,m.total?x/m.total*100:0);}
 }else if(i.type==='validators'){
  const rows=selectedWalletRows(i);let count=0;for(const w of rows){const validators=w.row?.validators;if(!Array.isArray(validators))continue;for(const [j,vv]of validators.entries()){const x=safe(vv.amount)??safe(vv.balance)??safe(vv.staked);value(host,i,w.address+j,w.label+' · '+String(vv.moniker||vv.name||vv.operator||vv.address||'Validator').slice(0,60),quantity(x),x);count++;}}if(!count)note(host,t('Delegazioni non ancora presenti nello snapshot del wallet.','Delegations are not yet available in the wallet snapshot.'));
 }else if(i.type==='production'){
  for(const [label,factor]of [['1h',1/24],['24h',1],['7d',7],['30d',30],['365d',365]]){const x=product(m?.daily,factor);dual(host,i,label,label,x,'staking')}note(host,t('Stima con APR netto disponibile','Estimate using available net APR'));
 }else if(i.type==='milestone'){
  const targets=[.01,.05,.1,.5,1,5,10,50,100,500,1000,2000,2500,5000,10000,25000,50000,100000],base=m?.total,next=base===undefined?null:targets.find(x=>x>base)||Math.ceil(base/100000+1)*100000;value(host,i,'next',t('Prossimo livello','Next level'),quantity(next),next);if(m&&next){progress(host,m.total/next*100);note(host,quantity(next-m.total)+' '+t('rimanenti','remaining'));}
 }else if(i.type==='ladderall'){
  for(const goal of [.5,1,3,5,10,15,20,30,50]){const earned=product(m?.rewards,p);value(host,i,'goal'+goal,money(goal),money(earned),earned,true);progress(host,earned===null?null:earned/goal*100);const daily=product(m?.daily,p),days=earned!==null&&daily>0?Math.max(0,(goal-earned)/daily):null;note(host,days===null?'ETA · —':days===0?t('Raggiunto','Reached'):'ETA · '+num(days,2)+' '+t('giorni · stima','days · estimate'));}
 }else if(i.type==='timeline'){
  historyControls(i,host);pathChart(host,d.period,t('Cronologia P/L giornaliero','Daily P/L history'));if(host.closest('.ws-preview'))note(host,t('Storico registrato da Performance Timeline. Nessuna ricostruzione di giorni mancanti.','History recorded by Performance Timeline. Missing days are not reconstructed.'));
 }else if(['treasurygrowth','worthhistory','treasuryperformance'].includes(i.type)){
  historyControls(i,host);const key=addresses(i).sort().join('|'),isNative=key===api.C.treasuryWallets.slice().sort().join('|'),native=isNative?read(i.type==='treasurygrowth'?'inj_node_treasury_growth_v1':'inj_node_treasury_worth_growth_v1',[]):[],stored=[...(Array.isArray(native)?native.map(r=>({t:r.t,total:i.type==='treasurygrowth'?r.value:null,worth:i.type==='worthhistory'?r.value:null})):[]),...(state.histories[key]||[])].sort((a,b)=>a.t-b.t),span={'1d':864e5,'7d':7*864e5,'30d':30*864e5,all:Infinity}[i.historyRange]||Infinity;const rows=stored.filter(r=>r.t>=Date.now()-span).map(r=>({t:r.t,value:i.type==='treasurygrowth'?r.total:r.worth})).filter(r=>safe(r.value)!==null);pathChart(host,rows,i.type==='treasurygrowth'?t('Crescita INJ','INJ growth'):t('Andamento patrimonio','Net worth history'),i.type==='treasurygrowth'?quantity:money);if(host.closest('.ws-preview'))note(host,t('Rilevazioni effettive dei wallet scelti, dal primo utilizzo di queste card.','Actual observations for the chosen wallets, from first use of these cards.'));
 }
 if(!['treasuryproduction','treasurymilestone','marketlist','heatmap','favorites','favoritesheatmap','marketleaders','marketlosers','timeline','treasurygrowth','worthhistory'].includes(i.type))note(host,age(d.at));return true;
 }
 async function feed(key,ttl,fn){if(state.busy.has(key)||Date.now()-(state[key+'At']||0)<ttl)return;state.busy.add(key);try{await fn();state.version++;api.updated()}catch(_){}finally{state.busy.delete(key)}}
 function hydrate(){const saved=read('inj_node_intel_summary_cache_v1',{});if(saved.coin&&saved.at>state.coinAt){const c=saved.coin,md=c.market_data;state.coin=md?{id:'injective-protocol',market_cap:md.market_cap?.usd,total_volume:md.total_volume?.usd,circulating_supply:md.circulating_supply,fully_diluted_valuation:md.fully_diluted_valuation?.usd,low_24h:md.low_24h?.usd,high_24h:md.high_24h?.usd}:c;state.coinAt=saved.at;}const g=read('inj_node_crypto_global_v1',{});if(g.data&&g.updatedAt>state.globalAt){state.global=g.data;state.globalAt=g.updatedAt}if(!state.global&&saved.global){state.global=saved.global;state.globalAt=saved.at}}
 function record(items){if(Date.now()-state.historyAt<30000)return;state.historyAt=Date.now();let changed=false;for(const i of items.filter(i=>['treasurygrowth','worthhistory','treasuryperformance'].includes(i.type))){const m=metrics(i);if(!m)continue;const key=addresses(i).sort().join('|'),rows=state.histories[key]||[],last=rows.at(-1),at=m.at;if(!at||Date.now()-at>120000||last&&Date.now()-last.t<30000)continue;rows.push({t:Date.now(),total:m.total,worth:product(m.total,api.price())});state.histories[key]=rows.slice(-10000);changed=true}if(changed){try{localStorage.setItem('inj_node_workspace_histories_v1',JSON.stringify(state.histories))}catch(_){}state.version++;}}

 const validatorMeta=new Map();let networkApr=null,networkAprAt=0;
 async function validator(operator){const saved=validatorMeta.get(operator);if(saved&&Date.now()-saved.at<600000)return saved;const d=await api.lcd('/cosmos/staking/v1beta1/validators/'+operator),v=d.validator,rate=Number(v?.commission?.commission_rates?.rate);if(!v||!Number.isFinite(rate))throw Error('Validator');const result={moniker:v.description?.moniker||operator,commission:rate,at:Date.now()};validatorMeta.set(operator,result);return result;}
 function refreshWalletDetails(items){
  const needs=items.filter(i=>['usdc','validators','unbonding','apr','hourly','daily','weekly','monthly','yearly','production','potentialincome','growth','growthsimple','target','velocity','rewardoverview','treasuryproduction','productionlevel','incomeperiods','rewardwallets','ladder','ladderall'].includes(i.type));
  const groups=new Map();for(const i of needs)for(const address of addresses(i)){if(!groups.has(address))groups.set(address,new Set());groups.get(address).add(i.type)}
  for(const [address,kinds]of groups)feed('detail:'+address,120000,async()=>{
   const existing=api.row(address),patch={};if(!existing)return;
   if(kinds.has('usdc')){const d=await api.lcd('/cosmos/bank/v1beta1/balances/'+address+'?pagination.limit=1000');if(Array.isArray(d.balances)&&!d.pagination?.next_key)patch.nativeUsdc=Number(d.balances.find(c=>String(c.denom).toLowerCase()==='erc20:0xa00c59ff5a080d2b954d0c75e46e22a0c371235a')?.amount||0)/1e6;} 
   if(kinds.has('unbonding')){const d=await api.lcd('/cosmos/staking/v1beta1/delegators/'+address+'/unbonding_delegations?pagination.limit=1000');if(Array.isArray(d.unbonding_responses)&&!d.pagination?.next_key)patch.unbonding=d.unbonding_responses.reduce((n,r)=>n+(r.entries||[]).reduce((s,e)=>s+Number(e.balance||0)/1e18,0),0);}
   if(kinds.has('validators')||!(existing.personalApr>0)){
    const d=await api.lcd('/cosmos/staking/v1beta1/delegations/'+address+'?pagination.limit=1000');if(Array.isArray(d.delegation_responses)&&!d.pagination?.next_key){
     const rows=d.delegation_responses.map(r=>({operator:r.delegation?.validator_address,amount:Number(r.balance?.amount||0)/1e18})).filter(r=>r.operator&&r.amount>0);
     const results=await Promise.allSettled(rows.map(async r=>({...r,...await validator(r.operator)})));patch.validators=results.map((v,j)=>v.status==='fulfilled'?v.value:rows[j]);
     if(!(existing.personalApr>0)&&rows.length&&results.every(v=>v.status==='fulfilled')){
      if(networkApr===null||Date.now()-networkAprAt>300000){try{const a=await json('https://api.ui.injective.network/api/v1/cache/stats/apr'),n=Number(a.apr);if(n>0&&n<=100){networkApr=n<=1?n*100:n;networkAprAt=Date.now()}}catch(_){}}
      const total=rows.reduce((n,r)=>n+r.amount,0);if(networkApr!==null&&total>0)patch.personalApr=networkApr*(1-patch.validators.reduce((n,r)=>n+r.amount*r.commission,0)/total);
     }
    }
   }
   if(Object.keys(patch).length)api.supplement(address,patch);state['detail:'+address+'At']=Date.now();
  });
 }
 function refresh(items){if(document.hidden)return;hydrate();if(items.some(i=>['favorites','favoritesheatmap'].includes(i.type))){const saved=read('inj_node_crypto_favorites_v1',[]),cards=items.filter(i=>i.type==='favoritesheatmap'),ids=[...new Set([...(Array.isArray(saved)?saved:[]).map(c=>c.id),...cards.flatMap(i=>Array.isArray(i.heatmapCoins)?i.heatmapCoins:[])])].filter(id=>typeof id==='string'&&/^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(id)).slice(0,250),key=ids.slice().sort().join(',');if(state.favoriteKey!==key){state.favoriteKey=key;state.favorites=[];state.favoritesAt=0;}if(ids.length)feed('favorites',120000,async()=>{const d=await json('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(key)+'&per_page=250&sparkline=true&price_change_percentage=1h,24h,7d,30d');if(Array.isArray(d)&&state.favoriteKey===key){state.favorites=d;state.favoritesAt=Date.now()}});} record(items);const types=new Set(items.map(i=>i.type));refreshWalletDetails(items);if([...types].some(x=>['networkstake','nativesupply','supplydistribution','marketintelligence'].includes(x)))feed('chain',300000,async()=>{const calls=[['networkstake','/cosmos/staking/v1beta1/pool'],['nativesupply','/cosmos/bank/v1beta1/supply/inj']].filter(([type])=>types.has(type)||types.has('supplydistribution')||types.has('marketintelligence'));for(const [type,path]of calls){const d=await api.lcd(path),n=Number(type==='networkstake'?d.pool?.bonded_tokens:d.amount?.amount)/1e18;if(!(n>0))continue;try{if(type==='networkstake'){const old=read('inj_node_intel_chain_snapshot_v2',{});localStorage.setItem('inj_node_intel_chain_snapshot_v2',JSON.stringify({at:Date.now(),data:{...old.data,bonded:n}}))}else localStorage.setItem('inj_node_intel_native_supply_v1',JSON.stringify({at:Date.now(),amount:n}))}catch(_){}}state.chainAt=Date.now()});if([...types].some(x=>['coinspot','marketlist','heatmap','favorites','favoritesheatmap','marketleaders','marketlosers','comparison','marketcap','volume24','circulating','fullydiluted','dominance','low24','high24','priceposition','athrecovery','atlrecovery','supplydistribution','marketbreadth','marketintelligence'].includes(x)))feed('coins',120000,async()=>{const d=await json('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=true&price_change_percentage=1h,24h,7d,30d');if(!Array.isArray(d))throw Error();state.coins=d.filter(c=>c&&typeof c.id==='string');state.coinsAt=Date.now()});if([...types].some(x=>['globalcap','globalvolume','btcdom','dominance','globaloverview','marketintelligence'].includes(x)))feed('global',120000,async()=>{const d=await json('https://api.coingecko.com/api/v3/global');if(!d.data)throw Error();state.global=d.data;state.globalAt=Date.now()});if([...types].some(x=>['bid','ask','spread','orderbook','levels','bookbalance'].includes(x))){
 const maxStep=Math.max(0.001,...items.filter(i=>i.type==='orderbook').map(i=>normalizedBookStep(i.bookStep)));
 const limit=maxStep>=1?5000:maxStep>=0.1?1000:maxStep>=0.01?500:100;
 state.depthRequestedLimit=limit;
 manageWorkspaceDepth(true);
 feed('depth:'+limit,12000,async()=>{for(const base of ['https://api.binance.com','https://data-api.binance.vision','https://api1.binance.com'])try{
  const d=await json(base+'/api/v3/depth?symbol=INJUSDT&limit='+limit);
  if(Array.isArray(d.bids)&&Array.isArray(d.asks)){
   if(limit===state.depthRequestedLimit){
    state.depthRest=d;
    state.depthRestAt=Date.now();
    composeWorkspaceDepth();
    state['depth:'+limit+'At']=state.depthRestAt;
   }
   return;
  }
 }catch(_){}throw Error()});
 }else{manageWorkspaceDepth(false);}
}
 function feedInfo(i){
 const type=i.type;
 if(['bid','ask','spread','orderbook','bookbalance','levels'].includes(type))return {at:state.depthAt,source:state.depthLiveAt&&Date.now()-state.depthLiveAt<7000?'Binance live depth':'Binance depth snapshot',fresh:state.depthLiveAt&&Date.now()-state.depthLiveAt<7000?8000:30000};
 if(['favorites','favoritesheatmap'].includes(type))return {at:state.favoritesAt,source:'CoinGecko favorites',fresh:180000};
 if(['globalcap','globalvolume','btcdom','globaloverview'].includes(type))return {at:state.globalAt,source:'CoinGecko global',fresh:180000};
 if(['networkstake','nativesupply'].includes(type))return {at:state.chainAt||0,source:'Injective LCD',fresh:360000};
 if(['coinspot','marketlist','heatmap','marketleaders','marketlosers','marketcap','volume24','circulating','fullydiluted','dominance','priceposition','athrecovery','atlrecovery','marketbreadth','supplydistribution','marketintelligence'].includes(type))return {at:state.coinsAt,source:'CoinGecko market',fresh:180000};
 return null;
 }
 hydrate();return {render,refresh,feedInfo,stamp:()=>state.version,supported};
}
const api={create,supported,compound,ratio,sum,marketChange,boundedPercent,performanceBaseline,normalizedBookStep,bucketBookLevels};if(typeof module!=='undefined')module.exports=api;root.INJWorkspaceSections=api;
})(globalThis);
