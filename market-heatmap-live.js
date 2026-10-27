/* INJ Node · Heatmap historical multi-timeframe chart engine v16.07.31.
   Historical timestamps: verified Binance public spot candles first; CoinGecko
   per-coin market_chart fallback. Subsequent live points: existing Market feed.
   No fabricated candles, stretched 7D proxy or simultaneous 200-coin requests. */
(()=>{
 'use strict';
 const market=()=>window.INJ_MARKET_VIEW_API;
 const views=window.INJ_MARKET_VIEWS;
 const global=document.getElementById('injGlobalMarket');
 const heat=document.getElementById('marketHeatmap');
 const grid=document.getElementById('marketHeatmapGrid');
 const note=document.getElementById('heatmapHourSource');
 if(!market()||!views||!global||!heat||!grid)return;
 const frames={
  '1h':{span:3600000,interval:'1m',limit:70,days:1,ttl:150000,gap:420000},
  '24h':{span:86400000,interval:'15m',limit:104,days:1,ttl:480000,gap:5400000},
  '7d':{span:604800000,interval:'2h',limit:90,days:7,ttl:1500000,gap:25200000},
  '30d':{span:2592000000,interval:'8h',limit:96,days:30,ttl:2700000,gap:86400000}
 };
 const historyKey='inj_node_heatmap_historical_v2',liveKey='inj_node_heatmap_real_1h_v1';
 const liveStep=30000,oneHour=3600000;
 const history=new Map(),live=new Map(),tasks=[],queued=new Set(),inflight=new Set(),inView=new Set();
 let frame=localRange(),currency='',dirty=false,lastSave=0,lastPaint=0,paintQueued=false,
     paintingTimer=0,running=0,epoch=0,requestsSuspendedUntil=0,cgCooldownUntil=0,observer=null;
 const time=()=>Date.now();
 const coinById=id=>market()?.getCoins?.().find(x=>x.id===id);
 const memoryKey=(id,period)=>id+'|'+period;
 function localRange(){
  try{const r=localStorage.getItem('inj_node_market_heat_range_v1');return frames[r]?r:'24h'}catch(_){return '24h'}
 }
 function getCurrency(){return market()?.getCurrency?.()||'usd'}
 function acceptCurrency(){
  const curr=getCurrency();
  if(curr!==currency){
   currency=curr;live.clear();
   for(const [key,item] of history)if(item.source==='coingecko'&&item.currency!==currency)history.delete(key);
   dirty=true;
  }
 }
 function readSaved(){
  try{
   const value=JSON.parse(localStorage.getItem(historyKey)||'null');
   if(!value||value.version!==2||!Array.isArray(value.items))return;
   for(const item of value.items.slice(0,110)){
    const id=String(item?.id||'');
    if(!/^[a-z0-9][a-z0-9_.-]{0,99}$/i.test(id)||!frames[item?.frame])continue;
    if(!['binance','coingecko'].includes(item.source))continue;
    if(!Array.isArray(item.points)||!Number.isFinite(item.at))continue;
    const points=item.points.filter(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[1]>0)
      .slice(-210).sort((a,b)=>a[0]-b[0]);
    if(!points.length||time()-item.at>86400000)continue;
    history.set(memoryKey(id,item.frame),{id,frame:item.frame,source:item.source,
      currency:item.currency||'usd',points,at:item.at});
   }
  }catch(_){}
 }
 function readLive(){
  try{
   const item=JSON.parse(localStorage.getItem(liveKey)||'null');
   if(!item||item.version!==1||!Array.isArray(item.series)||item.currency!==currency)return;
   for(const [id,raw] of item.series.slice(0,200)){
    if(!Array.isArray(raw))continue;
    const points=raw.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])
      &&p[1]>0&&p[0]>time()-oneHour&&p[0]<=time()+liveStep).slice(-130);
    if(points.length)live.set(id,points);
   }
  }catch(_){}
 }
 function save(){
  if(!dirty)return;
  const now=time();
  try{
   const valid=[...history.values()]
    .filter(item=>item.source==='binance'||item.currency===currency)
    .sort((a,b)=>b.at-a.at).slice(0,100);
   localStorage.setItem(historyKey,JSON.stringify({version:2,items:valid}));
   const l=[...live].filter(([id,pts])=>pts.length).slice(0,200);
   localStorage.setItem(liveKey,JSON.stringify({version:1,currency,series:l}));
   dirty=false;lastSave=now;
  }catch(_){/* Private browsing or quota: memory cache remains active. */}
 }
 function record(coin,at=time()){
  if(!coin?.id)return false;
  const price=Number(coin.current_price);
  if(!Number.isFinite(price)||price<=0)return false;
  acceptCurrency();
  const bucket=Math.floor(at/liveStep)*liveStep;
  const pts=live.get(coin.id)||[];
  const last=pts[pts.length-1];
  if(last&&last[0]===bucket){
   if(last[1]===price)return false;
   last[1]=price;
  }else if(!last||bucket>last[0]){
   pts.push([bucket,price]);
  }else return false;
  while(pts.length&&(pts.length>135||pts[0][0]<at-oneHour))pts.shift();
  live.set(coin.id,pts);dirty=true;
  return true;
 }
 function visible(){return !document.hidden&&!global.hidden&&!heat.hidden&&grid.isConnected}
 function isStoredCurrent(item,at=time()){
  return item&&(item.source==='binance'||item.currency===currency)
   &&at-item.at<frames[item.frame].ttl;
 }
 function info(){
  if(!note)return;
  const label=frame.toUpperCase();
  note.textContent=(document.documentElement.lang==='en'?'Real history':'Storico reale')+' '+label+' · Binance / CoinGecko';
 }
 function draw(svg,id,at){
  if(!svg)return;
  const settings=frames[frame],cutoff=at-settings.span;
  const historical=history.get(memoryKey(id,frame));
  const useHistory=historical&&(historical.source==='binance'||historical.currency===currency);
  const base=useHistory?historical.points.filter(p=>p[0]>=cutoff&&p[0]<=at):[];
  // Klines are priced in native USDT; align current live quote values into
  // that same scale using the last verified spot observation. No FX label.
  const coin=coinById(id),current=Number(coin?.current_price);
  const factor=useHistory&&historical.source==='binance'&&base.length&&current>0
    ?base[base.length-1][1]/current:1;
  const freshRaw=(live.get(id)||[]).filter(p=>p[0]>=cutoff&&p[0]<=at)
    .map(p=>[p[0],p[1]*factor]);
  // A month's chart must never lose its earliest historical points because
  // 30-second live quotes are more frequent than 8-hour historical bars.
  const streamStep={'1h':30000,'24h':300000,'7d':3600000,'30d':14400000}[frame];
  const fresh=[];
  for(const point of freshRaw){
   if(!fresh.length||point[0]-fresh[fresh.length-1][0]>=streamStep)fresh.push(point);
   else fresh[fresh.length-1]=point;
  }
  const after=base.length?base[base.length-1][0]:0;
  const data=base.concat(fresh.filter(p=>p[0]>after));
  const ns='http://www.w3.org/2000/svg',frag=document.createDocumentFragment();
  if(data.length){
   const lo=Math.min(...data.map(p=>p[1])),hi=Math.max(...data.map(p=>p[1]));
   const pad=(hi-lo)*.12||lo*.001||.000001,min=lo-pad,span=hi-lo+pad*2;
   const xy=p=>[
    Math.max(0,Math.min(100,(p[0]-cutoff)/settings.span*100)),
    Math.max(2,Math.min(22,22-(p[1]-min)/span*20))
   ];
   const sampled=data.length>145?data.filter((_,i)=>i===0||i===data.length-1||i%Math.ceil(data.length/142)===0):data;
   let points=[],previous=null;
   const emit=()=>{
    if(points.length>=2){
     const line=document.createElementNS(ns,'polyline');
     line.setAttribute('points',points.join(' '));frag.appendChild(line);
    }
    points=[];
   };
   for(const point of sampled){
    if(previous&&point[0]-previous[0]>settings.gap)emit();
    const [x,y]=xy(point);points.push(x.toFixed(2)+','+y.toFixed(2));previous=point;
   }
   emit();
   const last=sampled[sampled.length-1],coords=xy(last);
   const circle=document.createElementNS(ns,'circle');
   circle.setAttribute('cx',coords[0].toFixed(2));
   circle.setAttribute('cy',coords[1].toFixed(2));
   circle.setAttribute('r','1.65');frag.appendChild(circle);
  }
  svg.replaceChildren(frag);
  if(svg.parentElement)svg.parentElement.classList.toggle('hm-spark-loading',!base.length&&fresh.length<2);
 }
 function paint(){
  if(!visible())return;
  acceptCurrency();
  const now=time();
  for(const tile of grid.querySelectorAll('.heatmap-tile[data-coin]')){
   if(inView.size&&!inView.has(tile.dataset.coin))continue;
   draw(tile.querySelector('.hm-spark'),tile.dataset.coin,now);
  }
  lastPaint=now;
 }
 function repaintSoon(){
  if(!visible()||paintQueued)return;
  paintQueued=true;
  paintingTimer=setTimeout(()=>{
   paintQueued=false;
   if(visible())requestAnimationFrame(paint);
  },Math.max(0,700-(time()-lastPaint)));
 }
 function parseKlines(raw,now){
  if(!Array.isArray(raw))throw Error('No candle data');
  const out=[];
  for(const row of raw){
   if(!Array.isArray(row)||row.length<7)continue;
   const t=Math.min(now,Number(row[6])),p=Number(row[4]);
   if(Number.isFinite(t)&&Number.isFinite(p)&&p>0&&t<=now)out.push([t,p]);
  }
  return out;
 }
 async function requestJson(url){
  const ctrl=new AbortController(),handle=setTimeout(()=>ctrl.abort(),10500);
  try{
   const response=await fetch(url,{signal:ctrl.signal,headers:{accept:'application/json'},cache:'no-store'});
   if(!response.ok){const err=new Error('Historical quote HTTP '+response.status);err.status=response.status;throw err}
   return await response.json();
  }finally{clearTimeout(handle)}
 }
 async function fetchHistorical(coin,period){
  const config=frames[period],now=time(),pair=market()?.getVerifiedPair?.(coin);
  if(pair){
   try{
    const url='https://data-api.binance.vision/api/v3/klines?symbol='+encodeURIComponent(pair)
     +'&interval='+config.interval+'&limit='+config.limit;
    const raw=await requestJson(url),points=parseKlines(raw,now).filter(p=>p[0]>=now-config.span);
    if(points.length>=3)return {source:'binance',currency:'usdt',points};
   }catch(e){
    if(e.status===429||e.status===418){requestsSuspendedUntil=now+120000;throw e}
   }
  }
  // CoinGecko market_chart is rate-limited and may be inaccessible without
  // credentials; use only after verification, and never imitate missing history.
  if(now<cgCooldownUntil)return null;
  try{
   const currency=getCurrency();
   const url='https://api.coingecko.com/api/v3/coins/'+encodeURIComponent(coin.id)
    +'/market_chart?vs_currency='+encodeURIComponent(currency)+'&days='+config.days;
   const data=await requestJson(url);
   const points=(Array.isArray(data.prices)?data.prices:[]).filter(p=>Array.isArray(p)
     &&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[1]>0&&p[0]>=now-config.span&&p[0]<=now);
   // Retain the entire requested time window (including the beginning of
   // the month), rather than silently truncating 30D to the final 230 hours.
   if(points.length>=3){
    const stride=Math.max(1,Math.ceil(points.length/190));
    const sampled=points.filter((_,i)=>i===0||i===points.length-1||i%stride===0);
    return {source:'coingecko',currency,points:sampled};
   }
  }catch(e){
   if(e.status===429||e.status===401||e.status===403)cgCooldownUntil=time()+300000;
  }
  return null;
 }
 function schedule(id,period){
  if(!visible()||!frames[period])return;
  const coin=coinById(id);if(!coin)return;
  const item=history.get(memoryKey(id,period)),key=memoryKey(id,period);
  if(isStoredCurrent(item)||queued.has(key)||inflight.has(key))return;
  if(market()?.getPairStatus?.()==='pending')return;
  queued.add(key);tasks.push({id,period,epoch});
  pump();
 }
 function pump(){
  if(!visible()||running>=2)return;
  if(time()<requestsSuspendedUntil){setTimeout(pump,requestsSuspendedUntil-time()+100);return}
  while(running<2&&tasks.length){
   const job=tasks.shift(),key=memoryKey(job.id,job.period);
   queued.delete(key);
   if(job.epoch!==epoch||inflight.has(key)||isStoredCurrent(history.get(key)))continue;
   const coin=coinById(job.id);
   if(!coin)continue;
   inflight.add(key);running++;
   (async()=>{
    try{
     const result=await fetchHistorical(coin,job.period);
     if(result&&result.points.length){
      history.set(key,{id:job.id,frame:job.period,...result,at:time()});
      dirty=true;repaintSoon();
     }
    }catch(_){/* Keep real prior points; missing historical data stays unknown. */}
    finally{
     running--;inflight.delete(key);
     if(tasks.length){
      const pause=Math.max(450,requestsSuspendedUntil-time());
      setTimeout(pump,pause);
     }
    }
   })();
  }
 }
 function focusVisible(){
  if(!visible())return;
  inView.clear();
  observer?.disconnect();
  const nodes=grid.querySelectorAll('.heatmap-tile[data-coin]');
  if(typeof IntersectionObserver==='function'){
   if(!observer)observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     const id=entry.target.dataset.coin;
     if(entry.isIntersecting){inView.add(id);schedule(id,frame)}
     else inView.delete(id);
    }
    repaintSoon();
   },{root:null,rootMargin:'250px 0px 250px 0px',threshold:0});
   for(const node of nodes)observer.observe(node);
  }else{
   for(const node of [...nodes].slice(0,18)){inView.add(node.dataset.coin);schedule(node.dataset.coin,frame)}
  }
  repaintSoon();
 }
 function changeRange(next){
  if(!frames[next])return;
  if(frame!==next){frame=next;epoch++;queued.clear();tasks.length=0;inView.clear()}
  info();focusVisible();pump();
 }
 function observeSnapshot(coins){
  if(!Array.isArray(coins))return;
  const now=time();
  for(const coin of coins)record(coin,now);
  if(visible()){repaintSoon();focusVisible()}
 }
 const originalTick=views.tick;
 views.tick=function(coin){
  const updated=record(coin);
  const result=originalTick?.(coin);
  if(updated)repaintSoon();
  return result;
 };
 // Top-level asset grid mutations only. SVG point edits must not reschedule.
 const mutation=new MutationObserver(()=>focusVisible());
 mutation.observe(grid,{childList:true});
 window.addEventListener('injnode:market:pairsready',()=>focusVisible());
 window.addEventListener('injnode:market:heatrange',event=>changeRange(event.detail?.range));
 window.addEventListener('injnode:market:currencychange',()=>{acceptCurrency();focusVisible()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else focusVisible()});
 window.addEventListener('pagehide',save);
 setInterval(()=>{if(visible()){paint();if(time()-lastSave>60000)save()}},10000);
 setInterval(()=>{if(!document.hidden){save();if(visible()){for(const id of inView)schedule(id,frame)}}},60000);
 window.INJ_MARKET_HEATMAP_LIVE={observeSnapshot};
 currency=getCurrency();readSaved();readLive();info();
 observeSnapshot(market()?.getCoins?.()||[]);
 setTimeout(focusVisible,0);
})();
