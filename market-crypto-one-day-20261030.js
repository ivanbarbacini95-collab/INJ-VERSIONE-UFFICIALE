/* INJ Node · synchronized high-definition crypto market mini charts.
 * Historical points are real CoinGecko or verified Binance Spot quotes.
 * The 7d CoinGecko sparkline is a fallback for 1D/1W, never labeled as 1M.
 * Fetch extra history only for visible rows; throttle shared public APIs.
 */
(()=>{
'use strict';
const api=()=>window.INJ_MARKET_VIEW_API;
const SPANS={ '1h':3600000,'1d':86400000,'1w':604800000,'1m':2592000000 };
const CG_FRAMES={ '1h':'1h','1d':'24h','1w':'7d','1m':'30d' };
const SETTINGS={
 '1h':{interval:'1m',step:60000,limit:66,ttl:150000},
 '1d':{interval:'5m',step:300000,limit:296,ttl:480000},
 '1w':{interval:'1h',step:3600000,limit:174,ttl:1200000},
 '1m':{interval:'4h',step:14400000,limit:186,ttl:2400000}
};
const KEY='inj_node_crypto_chart_frame_v1';
const MIN_POINTS={'1h':9,'1d':22,'1w':28,'1m':25};
const MIN_COVER={'1h':.88,'1d':.88,'1w':.9,'1m':.92};
const MAX_AGE={'1h':12*60000,'1d':3*3600000,'1w':20*3600000,'1m':48*3600000};
const DIRECT_PAIRS={
 bitcoin:['btc','BTCUSDT'],ethereum:['eth','ETHUSDT'],binancecoin:['bnb','BNBUSDT'],
 ripple:['xrp','XRPUSDT'],solana:['sol','SOLUSDT'],'usd-coin':['usdc','USDCUSDT'],
 dogecoin:['doge','DOGEUSDT'],cardano:['ada','ADAUSDT'],tron:['trx','TRXUSDT'],
 chainlink:['link','LINKUSDT'],'avalanche-2':['avax','AVAXUSDT'],
 polkadot:['dot','DOTUSDT'],litecoin:['ltc','LTCUSDT'],
 'bitcoin-cash':['bch','BCHUSDT']
};
const prices=new Map(),observed=new Map(),queue=[],pending=new Set(),inflight=new Set();
const MAX_PENDING=10,MAX_CONCURRENT=3;
const DISK_KEY='inj_node_crypto_chart_history_v3';
let frame='1d',currencyKey='',active=0,observer=null,cgAfter=0,cgBlockedUntil=0,disk=null;
try{const stored=localStorage.getItem(KEY);if(SPANS[stored])frame=stored}catch(_){}
const good=n=>Number.isFinite(Number(n))&&Number(n)>0;
const fmt=()=>api()?.formatPercent;
const getFrame=()=>frame;
const currentKey=coin=>String(api()?.getCurrency?.()||'usd')+':'+coin.id+':'+frame;
function checkCurrency(){
 const cur=String(api()?.getCurrency?.()||'usd');
 if(cur===currencyKey)return;
 currencyKey=cur;prices.clear();observed.clear();
 queue.length=0;pending.clear();cgAfter=0;
 for(const controller of inflight)controller.abort();
}
function sample(coin,now=Date.now()){
 if(!coin?.id||!good(coin.current_price)||api()?.isCached?.())return;
 checkCurrency();
 const arr=observed.get(coin.id)||[];
 while(arr.length&&arr[0].t<now-SPANS['1m'])arr.shift();
 const last=arr.at(-1);
 if(!last||now-last.t>30000)arr.push({t:now,v:Number(coin.current_price)});
 else if(now>=last.t){last.t=now;last.v=Number(coin.current_price)}
 if(arr.length>2200)arr.splice(0,arr.length-2200);
 observed.set(coin.id,arr);
}

function sevenDay(coin,now){
 const src=coin?.sparkline_in_7d?.price;
 if(!Array.isArray(src)||src.length<2)return [];
 const updated=Number(api()?.getMarketUpdatedAt?.())||0;
 // The last verified 7d market sparkline can be shown immediately even
 // during a temporary provider outage, but must be labeled as historical.
 if(!updated||updated>now+60000||now-updated>48*3600000)return [];
 const end=Math.min(now,updated),duration=SPANS['1w'];
 return src.map((v,i)=>({t:end-duration*(src.length-1-i)/(src.length-1),v:Number(v)}))
  .filter(p=>good(p.v)&&p.t<=now);
}
function inWindow(points,now,period=frame){
 const start=now-SPANS[period],filter=Array.isArray(points)?points:[];
 const result=filter.filter(p=>Number.isFinite(p?.t)&&good(p.v)&&p.t>=start-SETTINGS[period].step&&p.t<=now+1000)
  .map(p=>({t:Math.min(now,Number(p.t)),v:Number(p.v)})).sort((a,b)=>a.t-b.t);
 const unique=[];
 for(const p of result){if(unique.length&&unique[unique.length-1].t===p.t)unique[unique.length-1]=p;else unique.push(p)}
 return unique.filter(p=>p.t>=start-1000);
}
function validSeries(points,now,period=frame){
 const data=inWindow(points,now,period);
 if(data.length<MIN_POINTS[period])return null;
 const first=data[0],last=data.at(-1),coverage=(last.t-first.t)/SPANS[period];
 if(coverage<MIN_COVER[period]||now-last.t>MAX_AGE[period])return null;
 return data;
}
function shrink(data){
 if(data.length<=235)return data;
 const result=[data[0]],step=Math.ceil((data.length-2)/112);
 for(let i=1;i<data.length-1;i+=step){
  const batch=data.slice(i,Math.min(data.length-1,i+step));
  let lo=batch[0],hi=batch[0];
  for(const p of batch){if(p.v<lo.v)lo=p;if(p.v>hi.v)hi=p}
  if(lo.t===hi.t)result.push(lo);
  else result.push(...(lo.t<hi.t?[lo,hi]:[hi,lo]));
 }
 result.push(data.at(-1));return result;
}
function readDisk(key){
 try{
  if(!disk)disk=JSON.parse(localStorage.getItem(DISK_KEY)||'{}')||{};
  const saved=disk[key];
  if(saved&&Array.isArray(saved.values)&&saved.values.length>=MIN_POINTS[key.split(':').at(-1)]&&
     saved.source!=='none'&&saved.until>Date.now()-48*3600000)
   return {values:saved.values,until:saved.until,source:saved.source,pair:saved.pair||''};
 }catch(_){disk={}}
 return null;
}
function writeDisk(key,item,period=frame){
 if(!item.values||item.values.length<MIN_POINTS[period])return;
 try{
  if(!disk)disk=JSON.parse(localStorage.getItem(DISK_KEY)||'{}')||{};
  disk[key]={values:item.values,until:item.until,source:item.source,pair:item.pair};
  const keys=Object.keys(disk).sort((a,b)=>(disk[a]?.until||0)-(disk[b]?.until||0));
  while(keys.length>72)delete disk[keys.shift()];
  localStorage.setItem(DISK_KEY,JSON.stringify(disk));
 }catch(_){/* storage quota/private mode: memory cache still works */}
}
function history(coin,now=Date.now()){
 checkCurrency();
 const key=currentKey(coin),lastMarketAt=Number(api()?.getMarketUpdatedAt?.())||0;
 let cached=prices.get(key);
 if(!cached){cached=readDisk(key);if(cached)prices.set(key,cached)}
 let source=cached?.source||'',anchor=now;
 let data=cached?.values?.length?validSeries(cached.values,now):null;
 if(!data&&cached?.values?.length>=MIN_POINTS[frame]&&cached.source!=='none'){
  // Present an older VERIFIED snapshot while the next network request runs.
  // Never position it on the current time axis or mark it as live.
  const end=Number(cached.values.at(-1)?.t);
  if(Number.isFinite(end)&&now-end<48*3600000){
   data=validSeries(cached.values,end);
   if(data)anchor=end;
  }
 }
 if(!data&&(frame==='1d'||frame==='1w')){
  // The 7d market-feed sparkline is already included with the Top 200 and
  // provides the fastest honest preview for the two supported windows.
  const feedAt=lastMarketAt&&now-lastMarketAt<=48*3600000
   ?(now-lastMarketAt>MAX_AGE[frame]||api()?.isCached?.()?lastMarketAt:now):now;
  const preview=sevenDay(coin,now);
  data=validSeries(preview,feedAt);
  if(data){source='feed';anchor=feedAt}
 }
 if(!data)return null;
 let points=data;
 const last=points.at(-1),current=Number(coin.current_price);
 const stale=Boolean(api()?.isCached?.())||now-anchor>MAX_AGE[frame];
 const marketFresh=!stale&&now-lastMarketAt<12*60000;
 if(marketFresh&&good(current)&&good(last.v)){
  const ratio=current/last.v;
  if(ratio>.45&&ratio<2.2){
   points=points.map(p=>({t:p.t,v:p.v*ratio}));
   if(now-last.t>12000)points.push({t:now,v:current});
  }
 }
 return {points:inWindow(points,anchor),source,anchor,stale};
}
function percentFrom(coin,now=Date.now()){
 const series=history(coin,now)?.points;
 if(!series?.length||!good(series[0].v))return NaN;
 return (series.at(-1).v/series[0].v-1)*100;
}

function chart(coin,now=Date.now()){
 sample(coin,now);
 const state=history(coin,now),points=state?.points;
 if(!points||points.length<MIN_POINTS[frame]){
  const key=currentKey(coin),wasTried=prices.get(key)?.values?.length===0;
  const label=wasTried
    ?(document.documentElement.lang==='en'?'Historical data temporarily unavailable':'Storico temporaneamente non disponibile')
    :(document.documentElement.lang==='en'?'Loading real historical prices':'Caricamento dello storico reale');
  return '<span class="inj-1d-empty '+(wasTried?'inj-chart-unavailable':'inj-chart-loading')+'" aria-label="'+label+'">'+(wasTried?'—':'···')+'</span>';
 }
 const data=shrink(points),low=Math.min(...data.map(p=>p.v)),high=Math.max(...data.map(p=>p.v));
 const start=(state?.anchor||now)-SPANS[frame],span=SPANS[frame],w=320,h=76,margin=7;
 const extra=(high-low)*.07||Math.abs(high)*.0005||.0000001,lo=low-extra,hi=high+extra;
 const px=t=>Math.max(0,Math.min(w,(t-start)/span*w));
 const py=v=>h-margin-(v-lo)/(hi-lo)*(h-2*margin);
 const path=data.map((p,i)=>(i?'L':'M')+px(p.t).toFixed(2)+' '+py(p.v).toFixed(2)).join(' ');
 const pct=percentFrom(coin,now);
 const up=Number.isFinite(pct)?pct>=0:data.at(-1).v>=data[0].v;
 const label=(document.documentElement.lang==='en'?'Verified price history':'Storico prezzi verificato')+
  ' · '+frame.toUpperCase()+
  (state?.stale?(document.documentElement.lang==='en'?' · last verified snapshot, not live':' · ultimo storico verificato, non live'):'');
 return '<svg class="inj-1d-chart '+(up?'up':'down')+(state?.stale?' is-verified-snapshot':'')+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" role="img" aria-label="'+label+'"><title>'+label+'</title><path d="'+path+'"/></svg>';
}
function render(coin,now=Date.now()){return chart(coin,now)}
function selectedChange(coin){return percentFrom(coin)}
function percentHtml(coin){
 const p=selectedChange(coin);
 const tone=!Number.isFinite(p)?'flat':p>0?'up':p<0?'down':'flat';
 return '<span class="mp-percent mp-period '+tone+'">'+(Number.isFinite(p)?fmt()?.(p)||'—':'···')+'</span>';
}
function paintPercent(coin,row){
 if(!coin||!row)return;
 const field=row.querySelector('.mp-day');
 if(!field)return;
 const value=percentHtml(coin);
 if(field.innerHTML!==value)field.innerHTML=value;
}
function paintRow(row,coin,now=Date.now(),force=false){
 if(!row||!coin)return;
 const slot=row.querySelector('.mp-chart');
 if(!slot)return;
 // Keep chart and percentage in lockstep, but avoid rebuilding a 180-point
 // SVG with each 1.5s websocket tick on mobile Safari.
 if(!force&&row.dataset.injChartFrame===frame&&now-Number(row.dataset.injChartPaintAt||0)<12000)return;
 const markup=render(coin,now);
 if(slot.innerHTML!==markup)slot.innerHTML=markup;
 paintPercent(coin,row);
 row.dataset.injChartFrame=frame;
 row.dataset.injChartPaintAt=String(now);
}

function pairFor(coin){
 const verified=api()?.getPairForCoin?.(coin.id);
 if(typeof verified==='string'&&/^[A-Z0-9]{2,18}USDT$/.test(verified))return verified;
 // Direct, unambiguous CoinGecko ID mappings let the major coins load
 // historical candles before Binance exchangeInfo completes.
 const direct=DIRECT_PAIRS[coin?.id];
 return direct&&String(coin.symbol||'').toLowerCase()===direct[0]?direct[1]:'';
}
async function json(url,timeout=9500){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 inflight.add(ctrl);
 try{const res=await fetch(url,{signal:ctrl.signal,cache:'no-store',headers:{accept:'application/json'}});
  if(!res.ok){const e=new Error('HTTP '+res.status);e.status=res.status;throw e}
  return await res.json()
 }finally{clearTimeout(timer);inflight.delete(ctrl)}
}

async function loadHistory(coin,requestedFrame,pair){
 const now=Date.now(),spec=SETTINGS[requestedFrame],span=SPANS[requestedFrame];
 if(pair){
  try{
   const start=Math.max(0,Math.floor(now-span-2*spec.step));
   const url='https://data-api.binance.vision/api/v3/klines?symbol='+pair+
    '&interval='+spec.interval+'&startTime='+start+'&endTime='+now+'&limit='+spec.limit;
   const raw=await json(url,10500);
   // Kline close times, not artificial timestamps. The current candle's
   // provisional last close is timestamped at now.
   const arr=Array.isArray(raw)?raw.map(p=>({
    t:Math.min(now,Number(p[6]??p[0])),v:Number(p[4])
   })).filter(p=>good(p.v)&&Number.isFinite(p.t)):[];
   if(validSeries(arr,now,requestedFrame))return {values:arr,source:'binance'};
  }catch(_){/* Pair unavailable in this region: CoinGecko fallback. */}
 }
 if(requestedFrame!==frame||Date.now()<cgBlockedUntil)return {values:[],source:'none'};
 // Respect the shared public API quota without treating throttled requests as
 // permanent missing history, particularly after rapid timeframe switches.
 const delay=Math.max(0,cgAfter-Date.now());
 if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
 if(requestedFrame!==frame)return {values:[],source:'none'};
 if(Date.now()<cgBlockedUntil)return {values:[],source:'none'};
 cgAfter=Date.now()+6500;
 const days=requestedFrame==='1h'||requestedFrame==='1d'?1:requestedFrame==='1w'?7:30;
 const url='https://api.coingecko.com/api/v3/coins/'+encodeURIComponent(coin.id)+
  '/market_chart?vs_currency='+encodeURIComponent(currencyKey)+'&days='+days;
 try{
  const raw=await json(url,11500);
  const arr=Array.isArray(raw?.prices)?raw.prices.map(p=>({t:Number(p[0]),v:Number(p[1])})):[];
  if(validSeries(arr,Date.now(),requestedFrame))return {values:arr,source:'coingecko'};
  return {values:[],source:'none'};
 }catch(e){
  if([401,403,418,429].includes(e?.status))cgBlockedUntil=Date.now()+180000;
  return {values:[],source:'none'};
 }
}
function nearViewport(row,margin=160){
 if(!row?.isConnected)return false;
 const rect=row.getBoundingClientRect?.();
 if(!rect)return true;
 const height=window.innerHeight||document.documentElement.clientHeight||800;
 return rect.bottom>=-margin&&rect.top<=height+margin;
}
function eligible(row,coin){
 return row?.isConnected&&coin?.id&&row.dataset.coin===coin.id&&
  document.documentElement.dataset.marketMode==='list';
}

function schedule(coin,row){
 if(!eligible(row,coin)||!nearViewport(row))return;
 checkCurrency();
 const key=currentKey(coin),now=Date.now(),pair=pairFor(coin);
 // The CoinGecko Top 200 response already brings the REAL 7-day sparkline.
 // Use it instantly for 1D/1W where it adequately covers that window.
 // Request extra precision only for a verified Binance pair. Otherwise
 // hundreds of individual CoinGecko calls would delay every later chart.
 if(!pair&&(frame==='1d'||frame==='1w')&&history(coin,now)?.points?.length>=MIN_POINTS[frame])return;
 let cached=prices.get(key);
 if(!cached){cached=readDisk(key);if(cached)prices.set(key,cached)}
 if(cached&&now<cached.until&&cached.pair===pair)return;
 if(pending.has(key)||queue.some(job=>job.key===key))return;
 // Drop the jobs for coins that have scrolled away before starting requests.
 for(let i=queue.length-1;i>=0;i--)
  if(!nearViewport(queue[i].row)||queue[i].frame!==frame)queue.splice(i,1);
 if(queue.length>=MAX_PENDING)return;
 queue.push({coin,row,key,frame,pair,currency:currencyKey});
 // First visible rows, then a small overscan. Never queue all 200 assets.
 queue.sort((a,b)=>Math.abs(a.row.getBoundingClientRect?.().top||0)-Math.abs(b.row.getBoundingClientRect?.().top||0));
 pump();
}
function pump(){
 while(active<MAX_CONCURRENT&&queue.length){
  const currentIndex=queue.findIndex(item=>item.frame===frame&&item.currency===currencyKey);
  if(currentIndex<0){queue.length=0;break}
  const job=queue.splice(currentIndex,1)[0];
  if(pending.has(job.key)||!eligible(job.row,job.coin)||!nearViewport(job.row,200))continue;
  pending.add(job.key);active++;
  loadHistory(job.coin,job.frame,job.pair).then(record=>{
   if(job.currency!==currencyKey)return;
   const values=Array.isArray(record?.values)?record.values:[];
   const ttl=values.length>=MIN_POINTS[job.frame]?SETTINGS[job.frame].ttl:90000;
   const item={values,source:record?.source||'none',until:Date.now()+ttl,pair:job.pair};
   if(prices.size>500)prices.delete(prices.keys().next().value);
   prices.set(job.key,item);
   if(values.length>=MIN_POINTS[job.frame])writeDisk(job.key,item,job.frame);
  }).catch(()=>{}).finally(()=>{
   pending.delete(job.key);active--;pump();
   if(job.currency!==currencyKey||job.frame!==frame)return;
   const coin=api()?.getCoins?.()?.find(c=>c.id===job.coin.id);
   if(!coin)return;
   document.querySelectorAll('#marketProRows .mp-row[data-coin]').forEach(row=>{
    if(row.dataset.coin===coin.id)paintRow(row,coin,Date.now(),true);
   });
  });
 }
}
function onRowsRendered(){
 const container=document.getElementById('marketProRows');
 if(!container||!SPANS[frame])return;
 if(observer){observer.disconnect();observer=null}
 const rows=[...container.querySelectorAll('.mp-row[data-coin]')];
 if(typeof IntersectionObserver==='function'){
  observer=new IntersectionObserver(entries=>{
   const coins=new Map((api()?.getCoins?.()||[]).map(c=>[c.id,c]));
   for(const e of entries){
    if(!e.isIntersecting)continue;
    const row=e.target,coin=coins.get(row.dataset.coin);
    if(coin){paintRow(row,coin);schedule(coin,row)}
   }
  },{root:null,rootMargin:'140px 0px',threshold:0});
  rows.forEach(row=>observer.observe(row));
 }else{
  const coins=new Map((api()?.getCoins?.()||[]).map(c=>[c.id,c]));
  rows.slice(0,12).forEach(row=>{
   const coin=coins.get(row.dataset.coin);
   if(coin){paintRow(row,coin);schedule(coin,row)}
  });
 }
}
function repaint(){
 if(document.hidden||document.documentElement.dataset.marketMode==='heatmap')return;
 const coins=new Map((api()?.getCoins?.()||[]).map(c=>[c.id,c]));
 const now=Date.now();
 for(const row of document.querySelectorAll('#marketProRows .mp-row[data-coin]')){
  // Avoid repainting ~200 SVG elements that are far offscreen on iPhone.
  // Newly visible rows are always repainted by IntersectionObserver.
  const rect=row.getBoundingClientRect?.();
  const height=window.innerHeight||document.documentElement.clientHeight||800;
  if(rect&&(rect.bottom< -220||rect.top>height+350))continue;
  const coin=coins.get(row.dataset.coin);
  if(coin)paintRow(row,coin,now);
 }
}
function updateButtons(){
 const panel=document.getElementById('injCryptoChartTimeframe');
 if(!panel)return;
 const label=document.documentElement.lang==='en'?'Chart timeframe':'Timeframe grafici';
 const current=document.getElementById('injCryptoFrameCurrent');
 const trigger=document.getElementById('injCryptoFrameTrigger');
 const menu=document.getElementById('injCryptoFrameOptions');
 if(current)current.textContent=frame.toUpperCase();
 if(trigger)trigger.setAttribute('aria-label',label+': '+frame.toUpperCase());
 if(menu)menu.setAttribute('aria-label',document.documentElement.lang==='en'?'Select chart timeframe':'Seleziona timeframe grafici');
 panel.querySelectorAll('[data-crypto-chart-frame]').forEach(button=>{
  const selected=button.dataset.cryptoChartFrame===frame;
  button.setAttribute('aria-selected',String(selected));
 });
 panel.setAttribute('aria-label',label+' · '+frame.toUpperCase());
}
function setMenuOpen(open){
 const trigger=document.getElementById('injCryptoFrameTrigger');
 const menu=document.getElementById('injCryptoFrameOptions');
 if(!trigger||!menu)return;
 const state=Boolean(open);
 menu.hidden=!state;
 trigger.setAttribute('aria-expanded',String(state));
}
function setFrame(next){
 if(!Object.hasOwn(SPANS,next)||next===frame)return;
 frame=next;
 // Cancel obsolete historical requests and prioritize the new range.
 queue.length=0;
 for(const controller of inflight)controller.abort();
 try{localStorage.setItem(KEY,frame)}catch(_){}
 updateButtons();
 repaint();onRowsRendered();
}
function tick(coin,slot){
 sample(coin);
 if(!slot)return;
 const row=slot.closest('.mp-row');
 if(row)paintRow(row,coin);
}
function previewFor(coin,period){
 if(!coin?.id||!SPANS[period])return null;
 checkCurrency();
 const now=Date.now(),stamp=Number(api()?.getMarketUpdatedAt?.())||0;
 if(period===frame){
  const current=history(coin,now);
  if(current?.points?.length>=MIN_POINTS[period])
   return {data:current.points,stale:Boolean(current.stale),source:current.source};
 }
 const key=String(api()?.getCurrency?.()||'usd')+':'+coin.id+':'+period;
 const saved=prices.get(key)||readDisk(key);
 if(saved?.values?.length){
  const latest=Number(saved.values.at(-1)?.t),anchor=latest&&now-latest>MAX_AGE[period]?latest:now;
  const data=validSeries(saved.values,anchor,period);
  if(data)return {data,stale:now-anchor>MAX_AGE[period]||Boolean(api()?.isCached?.()),source:saved.source||'cached'};
 }
 if((period==='1d'||period==='1w')&&stamp&&now-stamp<48*3600000){
  const data=validSeries(sevenDay(coin,now),stamp,period);
  if(data)return {data,stale:now-stamp>12*60000||Boolean(api()?.isCached?.()),source:'feed'};
 }
 return null;
}
window.INJ_DAY_CHART={
 render,tick,repaint,onRowsRendered,getFrame,setFrame,percentHtml,paintPercent,previewFor,
 getPairForCoin:coin=>pairFor(coin),
 placeholderChart:()=>'<span class="inj-1d-empty inj-chart-loading" aria-hidden="true">···</span>',
 placeholderPercent:()=>'<span class="mp-percent mp-period flat">···</span>'
};
const timeframePanel=document.getElementById('injCryptoChartTimeframe');
timeframePanel?.addEventListener('click',event=>{
 const option=event.target.closest('[data-crypto-chart-frame]');
 if(option){
  setFrame(option.dataset.cryptoChartFrame);
  setMenuOpen(false);
  document.getElementById('injCryptoFrameTrigger')?.focus();
  return;
 }
 if(event.target.closest('#injCryptoFrameTrigger')){
  const menu=document.getElementById('injCryptoFrameOptions');
  setMenuOpen(menu?.hidden);
 }
});
timeframePanel?.addEventListener('keydown',event=>{
 const menu=document.getElementById('injCryptoFrameOptions');
 if(event.key==='Escape'&&!menu?.hidden){
  event.preventDefault();setMenuOpen(false);
  document.getElementById('injCryptoFrameTrigger')?.focus();return;
 }
 if((event.key==='ArrowDown'||event.key==='ArrowUp')&&menu){
  event.preventDefault();setMenuOpen(true);
  const buttons=[...menu.querySelectorAll('[data-crypto-chart-frame]')];
  const index=buttons.indexOf(document.activeElement);
  buttons[(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();
 }
});
document.addEventListener('pointerdown',event=>{
 if(timeframePanel&&!timeframePanel.contains(event.target))setMenuOpen(false);
},{passive:true});
updateButtons();
function retryVisible(){
 const coins=new Map((api()?.getCoins?.()||[]).map(c=>[c.id,c]));
 let checked=0;
 for(const row of document.querySelectorAll('#marketProRows .mp-row[data-coin]')){
  if(checked>=12)break;
  if(!nearViewport(row))continue;
  const coin=coins.get(row.dataset.coin);
  if(coin){checked++;schedule(coin,row)}
 }
}
setInterval(()=>{if(!document.hidden){repaint();retryVisible()}},45000);
window.addEventListener('pageshow',()=>{repaint();onRowsRendered()});
window.addEventListener('injnode:binance-pairs-ready',onRowsRendered);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){repaint();onRowsRendered()}});
})();
