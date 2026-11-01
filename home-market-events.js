/* INJ NODE / High Impact Global Market Events + Live Crypto Ribbon.
 * All market values come from /api/crypto-ribbon and /api/market-events.
 * No dummy events, actual values, fake times, background push promises.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 if(!$('injMarketTicker')||!$('injMarketEventsOverlay'))return;
 const STORE='inj_node_market_events_v1';
 const REGIONS={USD:'US',EUR:'EU',GBP:'EU',CHF:'EU',JPY:'ASIA',CNY:'ASIA'};
 const tr=(it,en)=>String(document.documentElement.lang||'it').toLowerCase().startsWith('en')?en:it;
 const fmtNum=(n,d=2)=>new Intl.NumberFormat(tr('it-IT','en-US'),{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
 const dateFmt=(date,opts)=>{try{return new Date(date).toLocaleString(tr('it-IT','en-US'),opts)}catch{return '—'}};
 const byDate=(a,b)=>Date.parse(a.date)-Date.parse(b.date);
 const now=()=>Date.now();
 const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
 const config=read();
 const state={
   open:false,events:[],source:'',coverage:'',sourceURL:'',period:['today','tomorrow','dayAfter','thisWeek','nextWeek'].includes(config.period)?config.period:'thisWeek',
   region:['ALL','US','EU','ASIA'].includes(config.region)?config.region:'ALL',
   reminder:[5,10,15,30].includes(+config.reminder)?+config.reminder:10,
   alerts:config.alerts===true,initialized:false,
   seen:config.seen&&typeof config.seen==='object'?config.seen:{},
   notified:config.notified&&typeof config.notified==='object'?config.notified:{},
   results:config.results&&typeof config.results==='object'?config.results:{},
   current:null,processing:false,reloadQueued:false,lastMarket:0,lastCalendar:0,inFlight:null,recentReleases:{}
 };
 const save=()=>{
  try{
   const compact=(obj)=>Object.fromEntries(Object.entries(obj).slice(-120));
   localStorage.setItem(STORE,JSON.stringify({
    period:state.period,region:state.region,reminder:state.reminder,alerts:state.alerts,
    seen:compact(state.seen),notified:compact(state.notified),results:compact(state.results)
   }));
  }catch{}
 };
 const elt=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const validActual=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&!/^(null|undefined|n\/?a|none|pending|[-—])$/i.test(String(v).trim());
 const nice=v=>validActual(v)?String(v):'—';
 const todayUTC=()=>new Date().toISOString().slice(0,10);
 function countdown(ms){
  if(ms<=0)return tr('PUBBLICAZIONE IN CORSO','RELEASE IN PROGRESS');
  const m=Math.ceil(ms/60000),h=Math.floor(m/60);
  if(h>=24)return tr('tra ','in ')+Math.floor(h/24)+tr('g ','d ')+(h%24)+'h';
  if(h>=1)return tr('tra ','in ')+h+'h '+(m%60)+'m';
  return tr('tra ','in ')+m+'m';
 }
 function validateEvent(e){
  const ts=Date.parse(e.date||'');
  if(!Number.isFinite(ts)||!REGIONS[e.country]||e.importance!==3||String(e.title||'').length<2)return null;
  return {id:String(e.id||e.country+'-'+e.title+'-'+e.date).slice(0,170),title:String(e.title).slice(0,160),
    date:new Date(ts).toISOString(),country:e.country,region:REGIONS[e.country],
    actual:validActual(e.actual)?String(e.actual):null,forecast:validActual(e.forecast)?String(e.forecast):null,
    previous:validActual(e.previous)?String(e.previous):null,status:String(e.status||'scheduled')};
 }
 // One frame-driven animation owns the translation. Never restart a CSS marquee
 // when prices update: it would otherwise jump back to its first item.
 const tickerViewport=$('injMarketTicker').querySelector('.inj-market-ticker-viewport');
 const tickerTrack=$('injMarketTickerTrack');
 const tickerMotion={
  offset:0,lap:0,lastTime:0,dragging:false,pointerId:null,lastX:0,visible:true,pending:null,
  speed:30,group:null,observer:null,hadData:false
 };
 let lastTickerPayload=null;
 const reducedTickerMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function modulo(n,length){return length>0?((n%length)+length)%length:0}
 function measureTicker(){
  const group=tickerTrack.firstElementChild;
  if(!group?.classList.contains('inj-market-ticker-group'))return;
  const width=group.getBoundingClientRect().width;
  const gap=parseFloat(getComputedStyle(tickerTrack).columnGap)||0;
  const length=width+gap;
  if(length<=0)return;
  tickerMotion.lap=length;
  tickerMotion.offset=modulo(tickerMotion.offset,length);
 }
 function paintTicker(){
  tickerTrack.style.transform='translate3d('+(-tickerMotion.offset).toFixed(2)+'px,0,0)';
 }
 function tickerFrame(t){
  const elapsed=tickerMotion.lastTime?Math.min(50,Math.max(0,t-tickerMotion.lastTime)):0;
  tickerMotion.lastTime=t;
  if(!tickerMotion.lap&&tickerMotion.hadData)measureTicker();
  if(tickerMotion.lap&&!document.hidden&&tickerMotion.visible&&!tickerMotion.dragging&&!reducedTickerMotion){
   tickerMotion.offset=modulo(tickerMotion.offset+tickerMotion.speed*elapsed/1000,tickerMotion.lap);
   paintTicker();
  }
  requestAnimationFrame(tickerFrame);
 }
 function dropTickerPointer(e){
  if(!tickerMotion.dragging||(e&&e.pointerId!==tickerMotion.pointerId))return;
  const id=tickerMotion.pointerId;
  tickerMotion.dragging=false;tickerMotion.pointerId=null;tickerMotion.lastTime=0;
  if(tickerMotion.pending){const queued=tickerMotion.pending;tickerMotion.pending=null;renderTicker(queued)}
  if(id!==null&&tickerViewport.hasPointerCapture?.(id)){
   try{tickerViewport.releasePointerCapture(id)}catch(_){}
  }
 }
 tickerViewport.addEventListener('pointerdown',event=>{
  if(tickerMotion.dragging||(!event.isPrimary)||(event.pointerType==='mouse'&&event.button!==0))return;
  if(!tickerMotion.lap)measureTicker();
  tickerMotion.dragging=true;tickerMotion.pointerId=event.pointerId;
  tickerMotion.lastX=event.clientX;tickerMotion.lastTime=0;
  try{tickerViewport.setPointerCapture(event.pointerId)}catch(_){}
 },{passive:true});
 tickerViewport.addEventListener('pointermove',event=>{
  if(!tickerMotion.dragging||event.pointerId!==tickerMotion.pointerId||!tickerMotion.lap)return;
  const dx=event.clientX-tickerMotion.lastX;
  tickerMotion.lastX=event.clientX;
  tickerMotion.offset=modulo(tickerMotion.offset-dx,tickerMotion.lap);
  paintTicker();
 },{passive:true});
 tickerViewport.addEventListener('pointerup',dropTickerPointer,{passive:true});
 tickerViewport.addEventListener('pointercancel',dropTickerPointer,{passive:true});
 tickerViewport.addEventListener('lostpointercapture',dropTickerPointer,{passive:true});
 window.addEventListener('blur',()=>dropTickerPointer(),{passive:true});
 tickerViewport.tabIndex=0;
 tickerViewport.addEventListener('keydown',event=>{
  if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
  if(!tickerMotion.lap)return;
  event.preventDefault();
  tickerMotion.offset=modulo(tickerMotion.offset+(event.key==='ArrowRight'?100:-100),tickerMotion.lap);
  paintTicker();
 });
 if('ResizeObserver' in window){
  tickerMotion.observer=new ResizeObserver(()=>{measureTicker();paintTicker()});
  tickerMotion.observer.observe(tickerViewport);
 }
 if('IntersectionObserver' in window){
  new IntersectionObserver(records=>{
   tickerMotion.visible=!!records[0]?.isIntersecting;
   tickerMotion.lastTime=0;
  },{threshold:0}).observe(tickerViewport);
 }
 requestAnimationFrame(tickerFrame);
 function usdCompact(x){
  const value=Number(x);
  if(!Number.isFinite(value)||value<=0)return '—';
  const scale=value>=1e12?1e12:value>=1e9?1e9:value>=1e6?1e6:1;
  return '$'+fmtNum(value/scale,2)+(scale===1e12?'T':scale===1e9?'B':scale===1e6?'M':'');
 }
 function percent(x,hasSign=false){
  if(x===null||x===undefined||!Number.isFinite(Number(x)))return '—';
  const n=Number(x);return (hasSign&&n>0?'+':'')+fmtNum(n,2)+'%';
 }
 function tickerItems(data){
  const ticks=Array.isArray(data.tickers)?data.tickers.filter(x=>x&&Number.isFinite(Number(x.price))&&Number(x.price)>0):[];
  const bySymbol=new Map(ticks.map(x=>[x.symbol,x]));
  const result=[];
  const addSymbol=symbol=>{
   if(bySymbol.has(symbol))result.push({kind:'coin',key:symbol,record:bySymbol.get(symbol)});
  };
  const g=data.global||{};
  const positive=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>0;
  const numeric=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
  const addGlobal=(key,label,value,display,trend)=>{
   if(numeric(value))result.push({kind:'global',key,label,value:display,trend});
  };
  ['INJ','BTC','ETH','SOL'].forEach(addSymbol);
  if(positive(g.marketCapUsd))addGlobal('CAP',tr('CAP. CRYPTO','CRYPTO CAP'),g.marketCapUsd,usdCompact(g.marketCapUsd));
  addGlobal('BTCD','BTC DOM',g.btcDominance,percent(g.btcDominance));
  if(positive(g.volume24hUsd))addGlobal('VOL',tr('VOL. 24H','24H VOL'),g.volume24hUsd,usdCompact(g.volume24hUsd));
  ['BNB','XRP','AVAX','DOT','LINK','ADA','DOGE'].forEach(addSymbol);
  addGlobal('ETHD','ETH DOM',g.ethDominance,percent(g.ethDominance));
  addGlobal('CAP24',tr('MERCATO 24H','MARKET 24H'),g.marketCapChange24h,
    percent(g.marketCapChange24h,true),g.marketCapChange24h);
  for(const tick of ticks)if(!result.some(item=>item.kind==='coin'&&item.key===tick.symbol))
    result.push({kind:'coin',key:tick.symbol,record:tick});
  return result;
 }
 function createTickerItem(item){
  const node=elt('span','inj-market-ticker-item'+(item.kind==='global'?' inj-market-ticker-global':''));
  node.dataset.ribbonKey=item.kind+':'+item.key;
  const label=elt('b','inj-market-ticker-symbol');
  const value=elt('span','inj-market-ticker-price');
  node.append(label,value);
  if(item.kind==='coin')node.append(elt('em','inj-market-ticker-change'));
  return node;
 }
 function updateTickerItem(node,item,currency){
  const label=node.querySelector('.inj-market-ticker-symbol');
  const value=node.querySelector('.inj-market-ticker-price');
  if(item.kind==='coin'){
   const x=item.record,n=Number(x.price);
   const digits=['BTC','ETH','SOL','BNB'].includes(x.symbol)?2:x.symbol==='DOGE'?5:4;
   label.textContent=x.symbol+'/'+currency;
   value.textContent='$'+fmtNum(n,digits);
   const pct=node.querySelector('.inj-market-ticker-change');
   pct.textContent=percent(x.change24h,true);
   pct.className='inj-market-ticker-change '+(x.change24h===null||x.change24h===undefined?'neutral':Number(x.change24h)>=0?'positive':'negative');
  }else{
   label.textContent=item.label;
   value.textContent=item.value;
   value.className='inj-market-ticker-price'+(item.trend===null||item.trend===undefined?'':Number(item.trend)>=0?' positive':' negative');
  }
 }
 function renderTicker(data){
  if(tickerMotion.dragging){tickerMotion.pending=data;return}
  const entries=tickerItems(data);
  if(!entries.some(x=>x.kind==='coin')){
   if(!tickerMotion.hadData)tickerTrack.replaceChildren(elt('span','inj-market-ticker-loading',tr('Dati crypto non disponibili','Crypto quotes unavailable')));
   return;
  }
  lastTickerPayload=data;
  const quote=data.currency==='USDT'?'USDT':'USD';
  const fingerprint=entries.map(x=>x.kind+':'+x.key).join('|')+'|'+quote;
  let first=tickerTrack.firstElementChild;
  const rebuild=tickerTrack.dataset.keys!==fingerprint||!first?.classList.contains('inj-market-ticker-group');
  if(rebuild){
   const group=elt('span','inj-market-ticker-group');
   for(const item of entries)group.append(createTickerItem(item));
   const copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');
   tickerTrack.replaceChildren(group,copy);
   tickerTrack.dataset.keys=fingerprint;
   first=group;
   tickerMotion.hadData=true;
   if(tickerMotion.observer){tickerMotion.observer.disconnect();tickerMotion.observer.observe(tickerViewport);tickerMotion.observer.observe(group)}
  }
  for(const group of tickerTrack.children)
   Array.from(group.children).forEach((node,index)=>updateTickerItem(node,entries[index],quote));
  measureTicker();paintTicker();
  $('injMarketTicker').classList.remove('is-stale');
 }
 // Secondary sources keep the ribbon useful if the Vercel API route is absent.
 const tickerPairs=[
  ['INJ','INJUSDT','injective-protocol'],['BTC','BTCUSDT','bitcoin'],
  ['ETH','ETHUSDT','ethereum'],['SOL','SOLUSDT','solana'],
  ['BNB','BNBUSDT','binancecoin'],['XRP','XRPUSDT','ripple'],
  ['AVAX','AVAXUSDT','avalanche-2'],['DOT','DOTUSDT','polkadot'],
  ['LINK','LINKUSDT','chainlink'],['ADA','ADAUSDT','cardano'],
  ['DOGE','DOGEUSDT','dogecoin']
 ];
 async function tickerGet(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),6500);
  try{
   const result=await fetch(url,{signal:controller.signal,cache:'no-store'});
   if(!result.ok)throw Error('HTTP '+result.status);
   return await result.json();
  }finally{clearTimeout(timeout)}
 }
 function parseMarketFigure(value){
  if(value===null||value===undefined||value==='')return null;
  const number=Number(String(value).replace(/[^0-9.-]/g,''));
  return Number.isFinite(number)?number:null;
 }
 function liveHomeTicker(){
  // This is a last-resort real value already shown in the active INJ dashboard.
  const text=$('entryMarketPrice')?.textContent||'';
  const value=parseMarketFigure(text);
  if(value===null||value<=0)return null;
  const changeText=$('entryMarketChange')?.textContent||'';
  const changeMatch=changeText.match(/[-+]?\d+(?:[.,]\d+)?\s*%/);
  const change=changeMatch?parseMarketFigure(changeMatch[0].replace(',','.')):null;
  return {source:'INJ Node Home',currency:'USDT',tickers:[{symbol:'INJ',price:value,change24h:change}],global:null};
 }
 async function alternateTicker(){
  try{
   const symbols=JSON.stringify(tickerPairs.map(p=>p[1]));
   const rows=await tickerGet('https://data-api.binance.vision/api/v3/ticker/24hr?symbols='+encodeURIComponent(symbols));
   if(!Array.isArray(rows))throw Error('Unexpected Binance response');
   const byPair=new Map(rows.map(row=>[row.symbol,row]));
   const tickers=tickerPairs.map(([symbol,pair])=>{
    const row=byPair.get(pair),price=parseMarketFigure(row?.lastPrice);
    return {symbol,price,change24h:parseMarketFigure(row?.priceChangePercent)};
   }).filter(t=>t.price!==null&&t.price>0);
   if(tickers.length<4)throw Error('Insufficient Binance quotes');
   return {source:'Binance direct',currency:'USDT',tickers,global:null};
  }catch{}
  try{
   const ids=tickerPairs.map(p=>p[2]).join(',');
   const rows=await tickerGet('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&price_change_percentage=24h');
   if(!Array.isArray(rows))throw Error('Unexpected CoinGecko response');
   const byId=new Map(rows.map(row=>[row.id,row]));
   const tickers=tickerPairs.map(([symbol,,id])=>{
    const row=byId.get(id),price=parseMarketFigure(row?.current_price);
    return {symbol,price,change24h:parseMarketFigure(row?.price_change_percentage_24h)};
   }).filter(t=>t.price!==null&&t.price>0);
   if(!tickers.length)throw Error('No CoinGecko quotes');
   return {source:'CoinGecko direct',currency:'USD',tickers,global:null};
  }catch{}
  return liveHomeTicker();
 }
 // Market-wide metrics are separate from exchange quotes and can be rate-limited.
 // Refresh them independently instead of showing frozen dashes in the strip.
 let cachedGlobal=null,lastGlobalFetch=0,lastGoodGlobalAt=0;
 const validGlobal=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x));
 const fromPaprika=p=>({
  marketCapUsd:parseMarketFigure(p?.market_cap_usd),
  volume24hUsd:parseMarketFigure(p?.volume_24h_usd),
  btcDominance:parseMarketFigure(p?.bitcoin_dominance_percentage),
  ethDominance:null,
  marketCapChange24h:parseMarketFigure(p?.market_cap_change_24h)
 });
 const fromLore=data=>{
  const p=Array.isArray(data)?data[0]:data;
  return {
   marketCapUsd:parseMarketFigure(p?.total_mcap),
   volume24hUsd:parseMarketFigure(p?.total_volume),
   btcDominance:parseMarketFigure(p?.btc_d),
   ethDominance:parseMarketFigure(p?.eth_d),
   marketCapChange24h:parseMarketFigure(p?.mcap_change)
  };
 };
 async function augmentGlobals(payload){
  const existing=payload.global&&typeof payload.global==='object'?payload.global:{};
  const complete=['marketCapUsd','volume24hUsd','btcDominance','ethDominance','marketCapChange24h']
   .every(key=>validGlobal(existing[key]));
  if(complete){cachedGlobal=existing;lastGlobalFetch=now();lastGoodGlobalAt=now();return {...payload,global:existing}}
  const isFresh=lastGlobalFetch&&now()-lastGlobalFetch<120000;
  let additional=isFresh&&cachedGlobal?cachedGlobal:{};
  if(!isFresh){
   lastGlobalFetch=now();
   try{additional=fromPaprika(await tickerGet('https://api.coinpaprika.com/v1/global'))}
   catch{
    try{additional=fromLore(await tickerGet('https://api.coinlore.net/api/global/'))}
    catch{additional=cachedGlobal||{}}
   }
   if(Object.values(additional).some(validGlobal)){cachedGlobal={...cachedGlobal,...additional};lastGoodGlobalAt=now()}
  }
  const combined=lastGoodGlobalAt&&now()-lastGoodGlobalAt<600000?{...additional}:{};
  for(const [key,val] of Object.entries(existing))if(validGlobal(val))combined[key]=val;
  return {...payload,global:combined};
 }
 let tickerUpdating=false;
 async function updateTicker(){
  if(document.hidden||tickerUpdating)return;
  tickerUpdating=true;
  try{
   let payload=null;
   try{
    const response=await tickerGet('/api/crypto-ribbon');
    if(!Array.isArray(response.tickers)||!response.tickers.some(t=>Number(t?.price)>0))throw Error('Invalid ribbon feed');
    payload=response;
   }catch{payload=await alternateTicker()}
   if(!payload)throw Error('No live quote source');
   payload=await augmentGlobals(payload);
   renderTicker(payload);state.lastMarket=now();
  }catch{
   if(!tickerMotion.hadData){
    tickerTrack.replaceChildren(elt('span','inj-market-ticker-loading',tr('Feed crypto temporaneamente non disponibile','Crypto feed temporarily unavailable')));
   }else if(now()-state.lastMarket>180000)$('injMarketTicker').classList.add('is-stale');
  }finally{tickerUpdating=false}
 }
 function setMessage(msg){
  $('injEventsWarning').textContent=msg;
 }
 function displaySource(){
   const host=$('injEventsSource');host.replaceChildren();
   const label=elt('span',null,tr('Fonte: ','Source: '));
   const safeURL=state.source.startsWith('Trading Economics')?'https://tradingeconomics.com/calendar':
     state.source.startsWith('ShowMyTrades')?'https://showmytrades.com/tools/economic-calendar':
    state.source.startsWith('Forex Factory')?'https://www.forexfactory.com/calendar':null;
   if(safeURL){const link=elt('a',null,state.source);link.href=safeURL;link.target='_blank';link.rel='noopener noreferrer';host.append(label,link);}
   else host.append(elt('span',null,tr('Fonte non disponibile','Source unavailable')));
 }
 function localClock(d){return dateFmt(d,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}

 // Date ranges are device-local, with midnight and exclusive end even across DST.
 const dayStart=(d,offset=0)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+offset);
 function selectedRange(){
  const d=new Date(),dow=(d.getDay()+6)%7;
  let a,b;
  switch(state.period){
   case 'today':a=dayStart(d);b=dayStart(d,1);break;
   case 'tomorrow':a=dayStart(d,1);b=dayStart(d,2);break;
   case 'dayAfter':a=dayStart(d,2);b=dayStart(d,3);break;
   case 'nextWeek':a=dayStart(d,7-dow);b=dayStart(d,14-dow);break;
   default:a=dayStart(d,-dow);b=dayStart(d,7-dow);
  }
  return {start:+a,end:+b};
 }
 function visibleEvents(){
  const {start,end}=selectedRange();
  return state.events.filter(e=>{
   const ts=Date.parse(e.date);
   return ts>=start&&ts<end&&(state.region==='ALL'||e.region===state.region);
  }).sort(byDate);
 }
 function updatePeriodUI(){
  for(const btn of document.querySelectorAll('#injEventsPeriod [data-period]'))
   btn.setAttribute('aria-pressed',String(btn.dataset.period===state.period));
  const {start,end}=selectedRange();
  const fmt=t=>dateFmt(t,{day:'numeric',month:'short'});
  const label=$('injEventsRangeLabel');
  if(label)label.textContent=(end-start<3*86400000?fmt(start):fmt(start)+' – '+fmt(end-1));
 }
 function translatedEventTitle(t){
  if(!String(document.documentElement.lang||'it').toLowerCase().startsWith('it'))return t;
  const names=[
   [/^fed.s monetary policy statement$/i,'Comunicato di politica monetaria della Fed'],
   [/^fed interest rate decision$/i,'Decisione sui tassi di interesse della Fed'],
   [/^fomc press conference$/i,'Conferenza stampa FOMC'],
   [/^gross domestic product annualized$/i,'PIL annualizzato'],
   [/^gross domestic product price index$/i,'Indice dei prezzi del PIL'],
   [/^consumer price index(?: \(cpi\))?$/i,'Indice dei prezzi al consumo (CPI)'],
   [/^core consumer price index(?: \(cpi\))?$/i,'Indice dei prezzi al consumo core'],
   [/^non.farm payrolls?$/i,'Occupati non agricoli (NFP)'],
   [/^unemployment rate$/i,'Tasso di disoccupazione'],
   [/^retail sales$/i,'Vendite al dettaglio'],
   [/^initial jobless claims$/i,'Richieste iniziali di disoccupazione'],
   [/^pce price index$/i,'Indice dei prezzi PCE'],
   [/^core pce price index$/i,'Indice dei prezzi PCE core'],
   [/^ecb interest rate decision$/i,'Decisione sui tassi della BCE'],
   [/^ecb press conference$/i,'Conferenza stampa BCE'],
   [/^bank of japan interest rate decision$/i,'Decisione sui tassi della Banca del Giappone'],
   [/^boe interest rate decision$/i,'Decisione sui tassi della Banca d’Inghilterra']
  ];
  return names.find(([pattern])=>pattern.test(t))?.[1]||t;
 }

 /* Risk-on/off = conditional macro scenarios, not observed market direction. */
 function macroRiskProfile(event){
  const title=String(event?.title||'').toLowerCase();
  if(/press conference|policy statement|fomc statement|monetary policy statement|meeting minutes|fed minutes|central bank statement|chair.*speech|governor.*speech/.test(title))
   return {kind:'words',hint:tr('Fed/banca centrale più restrittiva → Risk-off · accomodante → Risk-on',
    'More hawkish central bank → Risk-off · more dovish → Risk-on')};
  if(/interest rate decision|rate decision|policy rate|deposit facility rate|refinancing rate|cash rate target|overnight rate/.test(title))
   return {kind:'numeric'};
  if(/average hourly earnings|wage growth|consumer price|producer price|inflation|price index|\bcpi\b|\bppi\b|\bpce\b/.test(title))
   return {kind:'numeric'};
  if(/non.farm payroll|employment change|payroll employment|unemployment|jobless|gross domestic product|\bgdp\b|industrial production|retail sales|\bpmi\b|consumer confidence|purchasing managers/.test(title))
   return {kind:'words',hint:tr('Dato forte: crescita ma tassi più alti · debole: rischio rallentamento. Lettura mista',
    'Strong data: growth but higher rates · weak: slowdown risk. Mixed reaction')};
  return {kind:'words',hint:tr('Risk-on/off dipende da sorpresa, tassi e contesto',
    'Risk-on/off depends on surprise, rates and context')};
 }
 function marketRiskHint(event){
  const profile=macroRiskProfile(event);
  if(profile.kind!=='numeric')return {tone:'neutral',text:profile.hint};
  const actual=parseNumeric(event.actual),forecast=parseNumeric(event.forecast);
  if(actual!==null&&forecast!==null){
   const delta=actual-forecast;
   if(Math.abs(delta)<=Math.max(1e-8,Math.abs(forecast)*1e-9))
    return {tone:'neutral',text:tr('In linea con le attese · reazione incerta','In line with forecast · reaction uncertain')};
   const higher=delta>0;
   return {tone:higher?'off':'on',text:tr(
    higher?'Sopra attese → possibile Risk-off':'Sotto attese → possibile Risk-on',
    higher?'Above forecast → possible Risk-off':'Below forecast → possible Risk-on')};
  }
  return {tone:'neutral',text:tr('↑ Attese → possibile Risk-off · ↓ → Risk-on',
     '↑ Forecast → possible Risk-off · ↓ → Risk-on')};
 }
 function appendMacroHint(container,event){
  const hint=marketRiskHint(event);
  const line=elt('span','inj-events-risk-hint tone-'+hint.tone);
  line.append(elt('small',null,tr('SCENARIO','SCENARIO')),elt('span','inj-events-risk-copy',hint.text));
  container.append(line);
 }
 function noNumericOutcome(e){
  return /press conference|speech|testimony|statement|meeting minutes|minutes of|economic projections|press briefing|report release|chair .*speaks|president .*speaks/i.test(String(e.title||''));
 }
 function calendarRefreshUrgent(){
  const t=now();
  return state.events.some(e=>!validActual(e.actual)&&!noNumericOutcome(e)&&Date.parse(e.date)>=t-45*60000&&Date.parse(e.date)<=t+10*60000);
 }
 function list(){
  const events=visibleEvents(), host=$('injEventsRows');
  host.replaceChildren();updatePeriodUI();
  $('injEventsCount').textContent=String(events.length);
  const next=events.find(e=>Date.parse(e.date)>=now()-60000&&!validActual(e.actual));
  $('injEventsNext').textContent=next?countdown(Date.parse(next.date)-now()):'—';
  $('injEventsDataStatus').textContent=!state.source?'OFFLINE':now()-state.lastCalendar>180000?tr('DATI DATATI','STALE DATA'):tr('SINCRONIZZATO','SYNCED');
  const featured=$('injEventsFeatured');featured.hidden=!next;
  if(next){
   $('injEventsFeaturedTime').textContent=next.country+' · '+dateFmt(next.date,{weekday:'short',day:'numeric',month:'short'})+' · '+localClock(next.date);
   $('injEventsFeaturedTitle').textContent=translatedEventTitle(next.title);
   const featureCopy=$('injEventsFeaturedTitle')?.parentElement;
   featureCopy?.querySelector('.inj-events-risk-hint')?.remove();
   if(featureCopy)appendMacroHint(featureCopy,next);
   $('injEventsFeaturedCountdown').textContent=countdown(Date.parse(next.date)-now());
   const details=$('injEventsFeaturedDetails');details.replaceChildren();
   // Numerical metrics stay in the detail sheet, not the calendar preview.
   const more=elt('button','inj-events-feature-open',tr('VEDI DETTAGLI','VIEW DETAILS')+' ↗');
   more.type='button';more.addEventListener('click',()=>showResult(next,false));details.append(more);
  }
  if(!events.length){
   host.append(elt('p','inj-events-empty',state.source?
     tr('Nessun evento ad alto impatto per il periodo selezionato.','No high-impact events in this period.'):
     tr('Calendario temporaneamente non disponibile.','Calendar temporarily unavailable.')));
   return;
  }
  let lastDay='';
  for(const event of events){
   if(next&&event.id===next.id)continue;
   const label=dateFmt(event.date,{weekday:'long',day:'2-digit',month:'long'});
   if(label!==lastDay){
    const h=elt('div','inj-events-day');
    h.append(elt('span',null,label),elt('span',null,tr('ORA LOCALE','LOCAL TIME')));
    host.append(h);lastDay=label;
   }
   const released=validActual(event.actual),future=Date.parse(event.date)>now();
   const button=elt('button','inj-events-item');button.type='button';
   if(released)button.classList.add('is-released');
   if(state.recentReleases[event.id]&&now()-state.recentReleases[event.id]<20000)button.classList.add('inj-events-new-actual');
   button.setAttribute('aria-label',translatedEventTitle(event.title)+', '+localClock(event.date)+', '+event.country);
   const time=elt('span','inj-events-item-time');
   time.append(elt('strong',null,localClock(event.date)),elt('small',null,event.country));
   const main=elt('span','inj-events-item-main'),heading=elt('span','inj-events-item-headline');
   heading.append(elt('strong',null,translatedEventTitle(event.title)));
   const status=elt('span','inj-events-item-status');
   if(released){status.classList.add('released');status.textContent=tr('PUBBLICATO','RELEASED')}
   else if(future){status.classList.add('upcoming');status.textContent=countdown(Date.parse(event.date)-now())}
   else if(noNumericOutcome(event)){
    status.classList.add('no-numeric');status.textContent=tr('EVENTO AVVIATO','EVENT STARTED');
   }else{
    status.classList.add('pending');
    status.textContent=Date.parse(event.date)<now()-30*60000?
     tr('DATO NON DISPONIBILE','RESULT UNAVAILABLE'):
     tr('IN AGGIORNAMENTO','AWAITING RESULT');
   }
   heading.append(status);main.append(heading);
   if(released){
    const metric=elt('span','inj-events-published-values');
    metric.append(elt('span','inj-events-published-label',tr('EFFETTIVO','ACTUAL')),
     elt('strong','inj-events-published-actual',nice(event.actual)));
    if(validActual(event.forecast))metric.append(elt('span','inj-events-published-forecast',tr('Atteso: ','Forecast: ')+nice(event.forecast)));
    main.append(metric);
   }
   appendMacroHint(main,event);
   button.append(time,main,elt('span','inj-events-item-chevron','›'));
   button.addEventListener('click',()=>showResult(event,false));
   host.append(button);
  }
  if(events.length===1&&next)host.append(elt('p','inj-events-empty',tr('Nessun altro evento nel periodo selezionato.','No other events in this period.')));
 }
 function showResult(e,auto,refreshOnly=false){
  if(!e)return;
  state.current=e;
  $('injEventsResultTitle').textContent=translatedEventTitle(e.title);
  $('injEventsResultTime').textContent=e.country+' · '+dateFmt(e.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+localClock(e.date);
  $('injEventsResultPrevious').textContent=nice(e.previous);
  $('injEventsResultForecast').textContent=nice(e.forecast);
  $('injEventsResultActual').textContent=nice(e.actual);
  const actual=parseNumeric(e.actual),forecast=parseNumeric(e.forecast);
  $('injEventsResultReading').textContent=!validActual(e.actual)?
    noNumericOutcome(e)&&Date.parse(e.date)<now()?
     tr('Evento avviato: discorso, comunicato o conferenza senza risultato numerico obbligatorio.','Event started: speech, statement or press conference with no required numeric actual.'):
     tr('Dato effettivo non disponibile dalla fonte. Le previsioni non sono risultati confermati.','Actual not yet available from source. Forecasts are not confirmed outcomes.'):
    actual!==null&&forecast!==null?
      (actual>forecast?tr('Sopra le attese','Above forecast'):actual<forecast?tr('Sotto le attese','Below forecast'):tr('In linea con le attese','In line with forecast'))+
      tr(' · La differenza non indica automaticamente un effetto positivo o negativo su INJ.',' · Surprise direction alone does not predict the price of INJ.'):
      tr('Dato pubblicato. Nessun consenso numerico disponibile per il confronto.','Data released. Numeric consensus unavailable.');
  $('injEventsResultReading').textContent+=' · '+tr('Scenario indicativo, non previsione: ','Illustrative scenario, not a forecast: ')+marketRiskHint(e).text+'.';
  $('injEventsResultBackdrop').hidden=false;
  if(!refreshOnly)$('injEventsResultClose').focus({preventScroll:true});
  if(auto){state.results[e.id]=now();save()}
 }
 function parseNumeric(v){
  if(!validActual(v))return null;
  const input=String(v).trim().replace(/,/g,'');
  if(/[<>]/.test(input))return null;
  const m=input.match(/^[$€£]?\s*([-+]?\d*\.?\d+)\s*([KMBT%]?)$/i);
  if(!m)return null;
  const factor={K:1e3,M:1e6,B:1e9,T:1e12,'%':1,'':1}[m[2].toUpperCase()];
  const n=Number(m[1])*factor;return Number.isFinite(n)?n:null;
 }
 function hideResult(){
  $('injEventsResultBackdrop').hidden=true;state.current=null;
  $('injEventsClose').focus({preventScroll:true});
 }
 function openPanel(){
  const root=$('injMarketEventsOverlay');if(state.open)return;
  state.open=true;root.hidden=false;root.scrollTop=0;
  const preferences=$('injEventsPreferences');if(preferences)preferences.open=false;
  updatePeriodUI();
  $('injEventsRegion').value=state.region;
  $('injEventsReminder').value=String(state.reminder);
  updateAlertButton();list();loadCalendar(true);
  $('injEventsClose').focus({preventScroll:true});
 }
 function closePanel(){
  if(!$('injEventsResultBackdrop').hidden){hideResult();return}
  state.open=false;$('injMarketEventsOverlay').hidden=true;
  $('entryMacroCalendarButton').focus({preventScroll:true});
 }
 function updateAlertButton(){
  const btn=$('injEventsAlerts');btn.setAttribute('aria-pressed',String(state.alerts));
  btn.textContent=state.alerts?tr('AVVISI ATTIVI · APP APERTA','ALERTS ON · APP OPEN'):tr('ATTIVA AVVISI','ENABLE ALERTS');
 }
 async function setAlerts(){
  if(state.alerts){state.alerts=false;save();updateAlertButton();return}
  if(!('Notification' in window)){
   setMessage(tr('Le notifiche non sono disponibili su questo dispositivo. Gli eventi restano consultabili.','Notifications are unavailable here. The calendar still works.'));return;
  }
  try{
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){setMessage(tr('Autorizzazione non concessa. Puoi comunque consultare eventi e dati.','Permission not granted. You can still view events and actuals.'));return}
    state.alerts=true;save();updateAlertButton();
    setMessage(tr('Avvisi attivi mentre INJ Node è aperta. Per riceverli a app chiusa serve un servizio push server non ancora configurato.','Alerts work while INJ Node is open. Background delivery requires a server push service not configured yet.'));
    // Registration is for visible foreground notifications only. We don't register a push endpoint.
  }catch{setMessage(tr('Non è stato possibile attivare gli avvisi.','Unable to enable alerts.'))}
 }
 async function notification(title,body,id){
  if(!state.alerts||Notification.permission!=='granted')return;
  try{
    const reg=await navigator.serviceWorker?.ready;
    const options={body,tag:'inj-macro-'+id,icon:'/icons/inj-node-minimal-192-v16.06.29.png',data:{source:'inj-market-events',eventId:String(id).replace(/-actual$/,'')}};
    if(reg&&reg.showNotification){await reg.showNotification(title,options);return}
    const notice=new Notification(title,options);
    notice.onclick=()=>{window.focus();openPanel();const evt=state.events.find(x=>x.id===options.data.eventId);if(evt)showResult(evt,false)};
  }catch{}
 }
 function saveUpcoming(events){
  for(const e of events){
    if(!validActual(e.actual)&&Date.parse(e.date)>=now()-60*60000&&Date.parse(e.date)<now()+31*86400000)
       state.seen[e.id]=now();
  }
  save();
 }
 function maybeAnnounce(events){
  if(!state.alerts)return;
  const t=now(),windowMs=state.reminder*60000;
  for(const e of events){
    const ms=Date.parse(e.date),delta=ms-t;
    if(delta>0&&delta<=windowMs&&!state.notified[e.id]){
      state.notified[e.id]=t;
      notification('★★★ '+e.country+' · '+e.title,countdown(delta)+' · '+tr('Impatto elevato','High impact'),e.id);
    }
    if(validActual(e.actual)&&state.seen[e.id]&&!state.results[e.id]&&ms<t&&t-ms<12*3600000){
      state.results[e.id]=t;save();
      notification('★★★ '+tr('DATO PUBBLICATO','DATA RELEASED')+' · '+e.title,tr('Effettivo','Actual')+': '+e.actual+' · '+tr('Atteso','Forecast')+': '+nice(e.forecast),e.id+'-actual');
      if(state.open&&$('injEventsResultBackdrop').hidden&&document.visibilityState==='visible')showResult(e,false);
    }
  }
  save();
 }
 // Keep the date/time anchored while only the long event name moves.
 let nextTitleObserver = null;
 function renderNext(){
  const upcoming=state.events.find(e=>Date.parse(e.date)>now()-60000);
  const node=$('injMarketNextSummary');
  if(!node)return;
  if(!upcoming){
   nextTitleObserver?.disconnect();
   nextTitleObserver=null;
   delete node.dataset.marketSignature;
   node.removeAttribute('title');
   node.removeAttribute('aria-label');
   const empty=state.source?
    tr('Calendario ★★★ · nessun evento imminente','★★★ calendar · no upcoming events'):
    tr('Calendario macro ★★★ · USA / Europa / Asia','★★★ macro calendar · US / Europe / Asia');
   if(node.textContent!==empty)node.textContent=empty;
   return;
  }
  const date=dateFmt(upcoming.date,{weekday:'short',day:'numeric',month:'short'});
  const clock=localClock(upcoming.date);
  const stamp=date+' · '+clock;
  const title=translatedEventTitle(upcoming.title);
  const signature=stamp+'|'+upcoming.country+'|'+title;
  if(node.dataset.marketSignature===signature)return;
  nextTitleObserver?.disconnect();
  nextTitleObserver=null;
  node.dataset.marketSignature=signature;
  node.title=stamp+' · '+upcoming.country+' · '+title;
  node.setAttribute('aria-label',node.title);
  const dateNode=elt('span','inj-events-next-date',stamp);
  const scroll=elt('span','inj-events-next-scroll');
  const track=elt('span','inj-events-next-track');
  const original=elt('span','inj-events-next-title',title);
  track.append(original);
  scroll.append(track);
  node.replaceChildren(dateNode,scroll);
  const measure=()=>{
   if(!scroll.isConnected)return;
   track.classList.remove('is-running');
   track.querySelector('.inj-events-next-duplicate')?.remove();
   const width=Math.ceil(original.getBoundingClientRect().width);
   const available=scroll.clientWidth;
   if(!width||!available||width<=available+3)return;
   const duplicate=elt('span','inj-events-next-title inj-events-next-duplicate',title);
   duplicate.setAttribute('aria-hidden','true');
   track.append(duplicate);
   track.style.setProperty('--inj-events-travel',(width+32)+'px');
   track.style.setProperty('--inj-events-duration',Math.max(13,Math.min(36,(width+32)/22)).toFixed(1)+'s');
   track.classList.add('is-running');
  };
  if(typeof ResizeObserver==='function'){
   nextTitleObserver=new ResizeObserver(measure);
   nextTitleObserver.observe(scroll);
  }
  requestAnimationFrame(measure);
 }
 // Direct public calendar fallback when the hosting provider does not serve /api.
 // ShowMyTrades documents browser CORS and 1-30 day ranges.
 function normaliseCalendarRows(rows,provider){
  const currencySet=new Set(['USD','EUR','GBP','CHF','JPY','CNY']);
  const normalised=[];
  for(const e of rows){
   const country=String(e.country||e.currency||'').toUpperCase();
   const impact=String(e.importance||e.impact||'').toLowerCase();
   if(!currencySet.has(country)||!['3','high'].includes(impact))continue;
   let sourceDate=e.date||e.time||null;
   if(!sourceDate&&e.ts!==null&&e.ts!==undefined&&Number.isFinite(Number(e.ts))&&Number(e.ts)>0){
    sourceDate=new Date(Number(e.ts)*1000).toISOString();
   }
   const timestamp=Date.parse(sourceDate||'');
   if(!Number.isFinite(timestamp)||!String(e.title||'').trim())continue;
   const record=validateEvent({
    id:e.id||country+'-'+e.title+'-'+sourceDate,
    country,title:e.title,importance:3,date:new Date(timestamp).toISOString(),
    forecast:e.forecast,actual:e.actual,previous:e.previous,status:e.status||'scheduled'
   });
   if(record)normalised.push(record);
  }
  return normalised.sort(byDate);
 }
 async function directCalendar(){
  try{
   const url='https://showmytrades.com/api/public/calendar/v1?currency=USD,EUR,GBP,CHF,JPY,CNY&impact=high&days=30';
   const data=await tickerGet(url);
   if(!Array.isArray(data.events)||!data.events.length)throw Error('No public economic calendar');
   const sourceEvents=normaliseCalendarRows(data.events,'ShowMyTrades');
   if(!sourceEvents.length)throw Error('No high-impact records in public feed');
   return {events:sourceEvents,
    source:'ShowMyTrades',coverage:tr('Fonte diretta · aggiornamento periodico','Direct source · periodic updates'),
    sourceUrl:'https://showmytrades.com/tools/economic-calendar'};
  }catch{}
  // Public week exports; coverage may be partial on two-week or month filters.
  const files=['thisweek','nextweek'];
  const result=await Promise.allSettled(files.map(async week=>{
   const data=await tickerGet('https://nfs.faireconomy.media/ff_calendar_'+week+'.json');
   if(!Array.isArray(data))throw Error('Invalid weekly feed');
   return data;
  }));
  const available=result.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
  if(!available.length)throw Error('Economic calendar sources unavailable');
  return {events:normaliseCalendarRows(available,'Forex Factory'),
   source:'Forex Factory (weekly export)',
   coverage:tr('Copertura delle sole settimane disponibili','Available weeks only'),
   sourceUrl:'https://www.forexfactory.com/calendar'};
 }
 async function loadCalendar(force=false){
  if(state.processing){if(force)state.reloadQueued=true;return state.inFlight}
  if(!force&&state.lastCalendar&&now()-state.lastCalendar<150000)return;
  state.processing=true;
  state.inFlight=(async()=>{
   try{
    let data=null;
    try{
     const response=await fetch('/api/market-events?days=30',{cache:'no-store'});
     if(!response.ok)throw Error('Calendar HTTP '+response.status);
     const json=await response.json();
     if(!Array.isArray(json.events))throw Error('Invalid calendar feed');
     const events=json.events.map(validateEvent).filter(Boolean).sort(byDate);
     if(events.length) data={...json,events};
    }catch{}
    if(!data)data=await directCalendar();
    if(!Array.isArray(data.events))throw Error('No calendar records');
    const previous=new Map(state.events.map(e=>[e.id,e]));
    const unique=new Map(data.events.map(event=>{
     const prev=previous.get(event.id);
     // A stale reply must not undo a previously observed release.
     if(prev)for(const key of ['actual','forecast','previous'])
      if(!validActual(event[key])&&validActual(prev[key]))event[key]=prev[key];
     return [event.id,event];
    }));
    const events=[...unique.values()].sort(byDate);
    for(const e of events){
     const old=previous.get(e.id);
     if(old&&!validActual(old.actual)&&validActual(e.actual))state.recentReleases[e.id]=now();
    }
    state.events=events;
    state.source=String(data.source||'');
    state.coverage=String(data.coverage||'');
    state.sourceURL=String(data.sourceUrl||'');
    state.lastCalendar=now();
    displaySource();
    maybeAnnounce(events);
    saveUpcoming(events);
    setMessage(tr('Solo eventi ★★★ · aggiornamento automatico · avvisi ad app aperta. ','★★★ events only · automatic refresh · alerts while app is open. ')+state.coverage);
    renderNext();
    if(state.open)list();
    if(state.current&&!$('injEventsResultBackdrop').hidden){
     const updated=events.find(e=>e.id===state.current.id);
     if(updated)showResult(updated,false,true);
    }
   }catch(error){
    // Do not discard verified data because one feed temporarily times out.
    if(!state.lastCalendar){state.source='';state.events=[]}
    setMessage(tr('Calendario temporaneamente non raggiungibile. Gli eventi non vengono inventati.','Calendar feed temporarily unreachable. No events are fabricated.'));
    if(state.open)list();
    renderNext();
   }finally{
    state.processing=false;state.inFlight=null;
    if(state.reloadQueued){state.reloadQueued=false;queueMicrotask(()=>loadCalendar(true))}
   }
  })();
  return state.inFlight;
 }
 function applyLanguage(){
  const sub=$('injEventsSubtitle');if(sub)sub.textContent=tr('Calendario macroeconomico · solo impatto ★★★','Macroeconomic calendar · only ★★★ events');
  const note=$('injEventsWarning');if(note&&!state.source)note.textContent=tr('Orari locali · I dati effettivi compaiono dopo la pubblicazione.','Local time · Actual values appear only when published.');
  const options={
   injEventsRegion:{ALL:['TUTTE / ALL','ALL REGIONS'],US:['USA','USA'],EU:['EUROPA','EUROPE'],ASIA:['ASIA','ASIA']}
  };
  for(const [id,opts] of Object.entries(options)){
   const select=$(id);for(const option of select.options){const item=opts[option.value];if(item)option.textContent=tr(item[0],item[1])}
  }
  const labels=[['injEventsRegion','REGIONE','REGION'],['injEventsReminder','AVVISO','REMINDER']];
  for(const [id,it,en] of labels){const lbl=document.querySelector('label[for="'+id+'"]');if(lbl)lbl.textContent=tr(it,en)}
  for(const el of document.querySelectorAll('#injMarketEventsOverlay [data-it][data-en]'))el.textContent=tr(el.dataset.it,el.dataset.en);
  const footer=$('injEventsSource');if(!state.source&&footer)footer.textContent=tr('Fonte in verifica','Checking data source');
  updateAlertButton();renderNext();updatePeriodUI();if(state.open)list();
 }

 function openFromNotification(eventId){
  openPanel();
  Promise.resolve(state.inFlight).then(()=>{
    const evt=state.events.find(e=>e.id===eventId);
    if(evt)showResult(evt,false);
  });
 }
 window.addEventListener('message',event=>{
  if(event.data?.type==='inj-market-events-open'&&typeof event.data.eventId==='string')openFromNotification(event.data.eventId);
 });
 const hash=location.hash.match(/^#inj-market-event=(.+)$/);
 if(hash){try{openFromNotification(decodeURIComponent(hash[1]));history.replaceState(null,'',location.pathname+location.search)}catch{}}

 $('entryMacroCalendarButton').addEventListener('click',openPanel);
 $('injMarketTickerEvents')?.addEventListener('click',openPanel);
 $('injEventsClose').addEventListener('click',closePanel);
 $('injEventsResultClose').addEventListener('click',hideResult);
 $('injEventsResultDone').addEventListener('click',hideResult);
 $('injEventsResultBackdrop').addEventListener('click',e=>{if(e.target===$('injEventsResultBackdrop'))hideResult()});
 for(const btn of document.querySelectorAll('#injEventsPeriod [data-period]')){
  btn.addEventListener('click',()=>{
   if(!['today','tomorrow','dayAfter','thisWeek','nextWeek'].includes(btn.dataset.period))return;
   state.period=btn.dataset.period;save();list();
   btn.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
  });
 }
 $('injEventsRegion').addEventListener('change',e=>{state.region=e.target.value;save();list()});
 $('injEventsReminder').addEventListener('change',e=>{state.reminder=Number(e.target.value);save()});
 $('injEventsAlerts').addEventListener('click',setAlerts);
 $('injEventsRefresh').addEventListener('click',()=>loadCalendar(true));
 $('injEventsPreferencesDone')?.addEventListener('click',()=>{
  // Every change is applied and saved as it is made; Done only collapses.
  const prefs=$('injEventsPreferences');
  if(!prefs)return;
  prefs.open=false;
  $('injEventsPreferencesToggle')?.focus({preventScroll:true});
  list();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open){e.preventDefault();closePanel()}});
 new MutationObserver(()=>{applyLanguage();if(lastTickerPayload)renderTicker(lastTickerPayload);if(state.open)list()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 updatePeriodUI();
 $('injEventsRegion').value=state.region;
 $('injEventsReminder').value=String(state.reminder);
 applyLanguage();
 // Background page refreshes cannot create push; only foreground visits can.
 updateTicker();loadCalendar();
 setInterval(()=>{if(document.hidden)return;updateTicker()},45000);
 // Poll frequently around a numeric release, otherwise spare provider requests.
 let lastCalendarPoll=now();
 setInterval(()=>{
  if(document.hidden)return;
  const interval=calendarRefreshUrgent()?20000:90000;
  if(now()-lastCalendarPoll>=interval){lastCalendarPoll=now();loadCalendar(true);}
 },5000);
 setInterval(()=>{if(document.hidden)return;renderNext();if(state.open)list();maybeAnnounce(state.events)},45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastCalendarPoll=now();updateTicker();loadCalendar(true)}});
})();
