/* Night View Ambient · read-only, wallet scoped, OLED · 2026-11-10.
   A verified app snapshot is preferred over cached wallet values; live trade
   data come from the same INJ/USDT market used by Multi Chart. */
(() => {
 'use strict';
 if(document.documentElement.dataset.injPage!=='night-view')return;
 const $=id=>document.getElementById(id);
 const msYear=365.25*86400000;
 const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
 const valid=n=>n!==null&&n>=0;
 const lang=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'?'en':'it'}catch(_){return 'it'}};
 const tr=(it,en)=>lang()==='en'?en:it;
 const fmt=(v,d=2)=>Number(v).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
 const money=(v,c='USD',digits=2)=>new Intl.NumberFormat(lang()==='en'?'en-US':'it-IT',{style:'currency',currency:c,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v);
 const unit=(v,d=2)=>fmt(v,d)+' <span class="unit">INJ</span>';
 const note=(id,value)=>{const node=$(id);if(node&&node.innerHTML!==value)node.innerHTML=value};
 const app=()=>{try{return parent!==window && parent.location.origin===location.origin && typeof parent.INJ_FINANCIAL_FREEDOM_SOURCE==='function'?parent.INJ_FINANCIAL_FREEDOM_SOURCE():null}catch(_){return null}};
 const state={price:null,tradeAt:0,lastTick:null,priceAt:0,change:null,tickerAt:0,networkAt:0,networkOk:null,networkAge:0,ws:null,wsRetry:0,walletAt:0,selected:'',timer:0,fetching:false};
 function fallback(){
  try{
   const wallets=JSON.parse(localStorage.getItem('inj_monitor_wallets_v1')||'[]');
   const summaries=JSON.parse(localStorage.getItem('inj_monitor_summaries_v1')||'{}');
   const selectedAddress=localStorage.getItem('inj_monitor_address')||'';
   return {wallets:wallets.map(w=>Object.assign({address:w.address,label:w.label},summaries[w.address]||{})),selectedAddress,price:null,priceAt:0,currency:'USD',privacy:false};
  }catch(_){return {wallets:[],selectedAddress:'',price:null,priceAt:0,currency:'USD',privacy:false}}
 }
 function snapshot(){return app()||fallback()}
 function paint(){
  const now=Date.now(),snap=snapshot(),rows=Array.isArray(snap.wallets)?snap.wallets:[],
   selected=rows.find(w=>w.address===snap.selectedAddress)||rows[0]||null;
  const parentPrice=num(snap.price),parentPriceAt=num(snap.priceAt)||0;
  const parentValid=parentPrice>0 && parentPriceAt>0 && now-parentPriceAt>=0 && now-parentPriceAt<60000;
  const tradeValid=state.price>0 && now-state.tradeAt>=0 && now-state.tradeAt<45000;
  const usd=tradeValid && (!parentValid||state.tradeAt>=parentPriceAt)?state.price:(parentValid?parentPrice:null);
  const eur=num(snap.eurRate),fx=snap.currency==='EUR'&&snap.fxVerified&&eur>0;
  const currency=fx?'EUR':'USD',rate=fx?eur:1;
  $('nightPrice').textContent=usd>0?money(usd*rate,currency,2):'—';
  let direction='flat',change='— (24h)';
  if(state.change!==null&&now-state.tickerAt<180000){
    direction=state.change>=0?'up':'down';
    change=(state.change>=0?'↗ +':'↘ ')+fmt(state.change,2)+'% (24h)';
  }
  $('nightChange').dataset.direction=direction;
  $('nightChange').textContent=change;
  const feed=tradeValid?'live':parentValid?'delayed':'sync';
  $('nightFeed').dataset.status=feed;
  $('nightFeedText').textContent=feed==='live'?'LIVE':feed==='delayed'?tr('AGGIORNAMENTO','UPDATING'):(navigator.onLine?'SYNC':'OFFLINE');
  const address=selected?.address||'';
  if(state.selected!==address){state.selected=address;state.walletAt=0;}
  const staked=num(selected?.staked),total=num(selected?.total),rewards=num(selected?.rewards),apr=num(selected?.apr);
  const updated=num(selected?.updated)||0,age=updated?Math.max(0,now-updated):Infinity;
  const walletVerified=!!address&&valid(staked)&&valid(total)&&valid(rewards)&&updated>0;
  const walletFresh=walletVerified&&age<120000;
  const available=walletVerified?Math.max(0,total-staked):null;
  const privacy=!!snap.privacy;
  note('nightStaked',privacy?'••••':walletVerified?unit(staked,2):'—');
  note('nightAvailable',privacy?'••••':available!==null?unit(available,2):'—');
  // Both balances use the exact same recent quote and currency as the rewards.
  // Preserve privacy and avoid presenting missing prices as zero.
  const fiatQuantity=(quantity)=>privacy?'••••':(quantity!==null&&usd>0?'≈ '+money(quantity*usd*rate,currency,2):'—');
  $('nightStakedFiat').textContent=fiatQuantity(walletVerified?staked:null);
  $('nightAvailableFiat').textContent=fiatQuantity(available);
  // Interpolation is an estimate, limited to 20s after an on-chain snapshot.
  const mayEstimate=walletFresh&&age<35000&&apr!==null&&apr>0&&staked>0;
  const estimated=mayEstimate?staked*apr/100*Math.min(age,20000)/msYear:0;
  const shown=walletVerified?rewards+estimated:null;
  note('nightReward',privacy?'••••':shown!==null?unit(shown,6):'—');
  const canConvert=usd>0&&shown!==null;
  $('nightRewardFiat').textContent=privacy?'••••':canConvert?'≈ '+money(shown*usd*rate,currency,2):'—';
  $('nightRewardConfidence').textContent=!address?tr('Seleziona un wallet dalla Home','Select a wallet on Home'):
   !walletVerified?tr('In attesa dei dati on-chain','Awaiting on-chain data'):
   !walletFresh?tr('Snapshot on-chain da aggiornare','On-chain snapshot needs refresh'):
   mayEstimate&&estimated>0?tr('Crescita stimata tra conferme on-chain','Estimated accrual between on-chain confirmations'):
   tr('Ultimo saldo confermato on-chain','Last on-chain confirmed balance');
  $('nightApr').textContent=apr!==null&&apr>=0&&walletFresh?fmt(apr,2)+'%':'—';
  $('nightNetwork').dataset.status=state.networkOk===true?'online':'unknown';
  $('nightNetwork').textContent=state.networkOk===true?tr('Operativa','Online'):state.networkOk===false?tr('Da verificare','Check needed'):'—';
  const freshest=Math.max(parentValid?parentPriceAt:0,tradeValid?state.tradeAt:0,walletFresh?updated:0);
  $('nightUpdated').textContent=freshest?new Date(freshest).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  $('nightNote').textContent=!walletFresh&&address?tr('Dati wallet non aggiornati: valori non considerati live','Wallet data are stale; balances are not live'):
   (!usd?tr('Prezzo in sincronizzazione','Synchronizing price'):'');
 }
 function back(){
  if(parent!==window){parent.postMessage({type:'injnode:section:tools'},location.origin);}
  else location.href='./index.html?tab=tools';
 }
 $('nightBack').addEventListener('click',back);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')back()});
 function translate(){
  document.documentElement.lang=lang();
  try{document.documentElement.dataset.injFont=localStorage.getItem('inj_node_font_v1')==='slim'?'slim':'bold'}catch(_){}
  document.querySelectorAll('[data-it]').forEach(node=>{node.textContent=tr(node.dataset.it,node.dataset.en)});
  $('nightBack').setAttribute('aria-label',tr('Torna a Tools','Back to Tools'));
  paint();
 }
 window.addEventListener('storage',e=>{if(['inj_node_language_v1','inj_node_font_v1'].includes(e.key))translate()});
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:languagechange')translate()});
 function trade(price,time){
  if(!(price>0))return;
  if(state.lastTick!==null && price!==state.lastTick){
   // Direction is secondary to the 24h change, which is independently verified.
  }
  state.lastTick=price;state.price=price;state.tradeAt=time>0?Math.min(Date.now(),time):Date.now();
  paint();
 }
 async function ticker(){
  if(state.fetching||!navigator.onLine)return;
  state.fetching=true;
  const hosts=['https://data-api.binance.vision','https://api.binance.com'];
  for(const host of hosts){
   const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);
   try{
    const res=await fetch(host+'/api/v3/ticker/24hr?symbol=INJUSDT',{cache:'no-store',signal:c.signal,credentials:'omit'});
    if(!res.ok)throw Error(String(res.status));
    const data=await res.json(),price=Number(data.lastPrice),change=Number(data.priceChangePercent);
    if(Number.isFinite(change)){state.change=change;state.tickerAt=Date.now();}
    if(price>0 && Date.now()-state.tradeAt>18000)trade(price,Date.now());
    clearTimeout(t);break;
   }catch(_){clearTimeout(t)}
  }
  state.fetching=false;paint();
 }
 function connect(){
  if(document.hidden||!navigator.onLine||state.ws)return;
  const urls=['wss://stream.binance.com:9443/ws/injusdt@aggTrade','wss://data-stream.binance.vision/ws/injusdt@aggTrade'];
  let ws;
  try{ws=new WebSocket(urls[state.wsRetry%urls.length]);state.ws=ws}
  catch(_){state.ws=null;return}
  ws.onopen=()=>{state.wsRetry=0;paint()};
  ws.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.e==='aggTrade')trade(Number(d.p),Number(d.T)||Date.now())}catch(_){}};
  ws.onerror=()=>{try{ws.close()}catch(_){}};
  ws.onclose=()=>{if(state.ws===ws){state.ws=null;state.wsRetry+=1;}paint()};
 }
 async function checkNetwork(){
  if(document.hidden||!navigator.onLine)return;
  for(const host of ['https://sentry.lcd.injective.network:443','https://lcd.injective.network']){
   const c=new AbortController(),timeout=setTimeout(()=>c.abort(),4500);
   try{
    const res=await fetch(host+'/cosmos/base/tendermint/v1beta1/blocks/latest',{cache:'no-store',signal:c.signal});
    if(!res.ok)throw Error('http');
    const data=await res.json(),time=Date.parse(data?.block?.header?.time||data?.sdk_block?.header?.time||'');
    if(!Number.isFinite(time))throw Error('timestamp');
    const age=(Date.now()-time)/1000;
    state.networkOk=age>=0&&age<45;
    state.networkAge=age;state.networkAt=Date.now();break;
   }catch(_){state.networkOk=null}
   finally{clearTimeout(timeout)}
  }
  paint();
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){state.ws?.close();state.ws=null;}
  else{paint();connect();ticker();checkNetwork();}
 });
 window.addEventListener('online',()=>{connect();ticker();checkNetwork()});
 window.addEventListener('offline',()=>{state.ws?.close();state.ws=null;paint()});
 translate();connect();ticker();checkNetwork();paint();
 setInterval(()=>{if(!document.hidden)paint()},1000);
 setInterval(()=>{if(!document.hidden){if(!state.ws)connect();if(Date.now()-state.tickerAt>55000)ticker()}},12000);
 setInterval(()=>{if(!document.hidden)checkNetwork()},30000);
})();