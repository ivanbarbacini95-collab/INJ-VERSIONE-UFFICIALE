/* Market Reactor · INJ Node. All scores derive from live public spot data;
   no simulated market state is ever presented. Read-only, no wallet access. */
(()=>{
 'use strict';
 if(document.documentElement.dataset.injPage!=='market-reactor')return;
 const root=document.documentElement,$=id=>document.getElementById(id);
 const pairs={IT:'it-IT',EN:'en-US'};
 const options={
  '1H':{interval:'1m',limit:160,count:60},
  '1D':{interval:'15m',limit:160,count:96},
  '1W':{interval:'1h',limit:220,count:168},
  '1M':{interval:'4h',limit:240,count:180}
 };
 const config={range:'1D',candles:[],candlesAt:0,price:null,priceAt:0,wsAt:0,change:null,changeAt:0,book:null,bookAt:0,benchmark:null,benchmarkAt:0,feed:null,ws:null,wsFailures:0,polling:false,requestId:0,displayAt:0,graph:[],lastScore:null};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const finite=v=>Number.isFinite(v);
 const isEn=()=>root.lang==='en';
 const tr=(it,en)=>isEn()?en:it;
 const locale=()=>isEn()?pairs.EN:pairs.IT;
 const fmt=(n,d=2)=>finite(n)?new Intl.NumberFormat(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}).format(n):'—';
 const when=t=>t?new Date(t).toLocaleString(locale(),{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'—';
 function applyLanguage(){
  try{root.lang=localStorage.getItem('inj_node_language_v1')==='en'?'en':'it'}catch(_){}
  document.querySelectorAll('[data-it][data-en]').forEach(el=>{el.textContent=el.getAttribute('data-'+root.lang)});
  $('mrBack').setAttribute('aria-label',tr('Torna a Tools','Back to Tools'));
  paint();
 }
 function applyTheme(){
  try{
   const themes=['obsidian','arctic','orbit','classic-black','classic-white'];
   const theme=localStorage.getItem('inj_monitor_theme')||'obsidian';
   root.dataset.theme=themes.includes(theme)?theme:'obsidian';
   root.dataset.injFont=localStorage.getItem('inj_node_font_v1')==='slim'?'slim':'bold';
   const light=root.dataset.theme==='arctic'||root.dataset.theme==='classic-white';
   document.querySelector('meta[name="theme-color"]').content=light?'#edf5fa':(root.dataset.theme==='orbit'?'#080b1a':'#060b11');
  }catch(_){}
 }
 function signalFrom(score){
  return score>=80?'strong-bull':score>=60?'bull':score<=20?'strong-bear':score<=40?'bear':'neutral';
 }
 function nameFrom(score){
  if(score>=80)return tr('FORTE RIALZISTA','STRONG BULLISH');
  if(score>=60)return tr('RIALZISTA','BULLISH');
  if(score<=20)return tr('FORTE RIBASSISTA','STRONG BEARISH');
  if(score<=40)return tr('RIBASSISTA','BEARISH');
  return tr('NEUTRALE','NEUTRAL');
 }
 function intensity(score){
  const strength=Math.abs(score-50)/50;
  root.style.setProperty('--mr-speed',(24-17*strength).toFixed(1)+'s');
  root.style.setProperty('--mr-speed-b',(36-23*strength).toFixed(1)+'s');
  root.style.setProperty('--mr-speed-c',(47-30*strength).toFixed(1)+'s');
  root.style.setProperty('--mr-strength',String(.42+.55*strength));
 }
 async function getJson(path){
  const hosts=['https://data-api.binance.vision','https://api.binance.com'];
  for(const host of hosts){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),6500);
   try{
    const res=await fetch(host+path,{cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!res.ok)throw Error('HTTP '+res.status);
    const data=await res.json();
    clearTimeout(timeout);
    return data;
   }catch(_){clearTimeout(timeout)}
  }
  throw Error('Spot source unavailable');
 }
 const simpleAvg=(list,start,end,getter)=>{
  let sum=0,count=0;
  for(let i=start;i<=end;i++){const value=getter(list[i]);if(finite(value)){sum+=value;count++}}
  return count?sum/count:NaN;
 };
 function technical(list,i){
  if(i<38)return null;
  const p=list[i].c;
  if(!(p>0))return null;
  const fast=simpleAvg(list,i-8,i,x=>x.c);
  const slow=simpleAvg(list,i-33,i,x=>x.c);
  let trueRanges=[];
  for(let n=i-13;n<=i;n++){
   const x=list[n],prev=list[n-1]?.c??x.c;
   trueRanges.push(Math.max(x.h-x.l,Math.abs(x.h-prev),Math.abs(x.l-prev)));
  }
  const atr=Math.max(.000000001,trueRanges.reduce((a,b)=>a+b,0)/trueRanges.length);
  let up=0,down=0;
  for(let n=i-13;n<=i;n++){
   const d=list[n].c-list[n-1].c;
   if(d>0)up+=d;else down-=d;
  }
  const rsi=down===0?(up===0?50:100):100-100/(1+up/down);
  const momentum=(p-list[i-6].c)/(atr*4);
  const trend=clamp((fast-slow)/(atr*2.7),-1,1);
  // Use only the last CLOSED candle for volume ratios (not the in-progress bar).
  const closed=list[i-1],reference=simpleAvg(list,i-22,i-2,x=>x.v);
  const volumeRatio=reference>0?closed.v/reference:null;
  const volumeDir=closed.c>=closed.o?1:-1;
  const volume=volumeRatio===null?0:clamp((volumeRatio-1)/1.5,-1,1)*volumeDir;
  const rsiNorm=clamp((rsi-50)/25,-1,1);
  const momentumNorm=clamp(momentum,-1,1);
  const base=50+18*trend+16*rsiNorm+10*momentumNorm+6*volume;
  return {base,trend,volumeRatio,momentum:momentumNorm,rsi,atr};
 }
 function parseCandles(rows){
  if(!Array.isArray(rows))throw Error('Bad candles');
  const parsed=rows.map(x=>{
   if(!Array.isArray(x)||x.length<7)return null;
   const c={t:Number(x[0]),o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v:Number(x[5])};
   return [c.t,c.o,c.h,c.l,c.c,c.v].every(finite)&&c.t>0&&c.o>0&&c.h>=c.l&&c.c>0&&c.v>=0?c:null;
  });
  if(parsed.length<75||parsed.some(x=>!x))throw Error('Incomplete candles');
  for(let i=1;i<parsed.length;i++)if(parsed[i].t<=parsed[i-1].t)throw Error('Unordered candles');
  return parsed;
 }
 function parseBook(rows){
  if(!rows||!Array.isArray(rows.bids)||!Array.isArray(rows.asks))throw Error('Book invalid');
  const amount=orders=>orders.slice(0,100).reduce((sum,item)=>{
   const price=Number(item[0]),qty=Number(item[1]);
   return sum+(price>0&&qty>=0&&finite(price*qty)?price*qty:0);
  },0);
  const bid=amount(rows.bids),ask=amount(rows.asks),total=bid+ask;
  if(!(total>0))throw Error('Book empty');
  return {balance:clamp((bid-ask)/total,-1,1),bidPct:100*bid/total};
 }
 function currentCandles(){
  if(config.candles.length<75)return null;
  const list=config.candles.slice();
  const fresh=finite(config.price)&&config.price>0&&Date.now()-config.priceAt<65000;
  if(fresh){
   const last={...list[list.length-1]};
   last.c=config.price;
   last.h=Math.max(last.h,last.c);
   last.l=Math.min(last.l,last.c);
   list[list.length-1]=last;
  }
  return list;
 }
 function readTechnical(){
  const list=currentCandles();
  if(!list)return null;
  const info=technical(list,list.length-1);
  if(!info)return null;
  const bookOk=config.book&&Date.now()-config.bookAt<70000;
  const benchmarkOk=!!config.benchmark&&Date.now()-config.benchmarkAt<120000;
  const broad=benchmarkOk?clamp((config.benchmark.btc+config.benchmark.eth)/8,-1,1):0;
  const score=clamp(Math.round(info.base+(bookOk?10*config.book.balance:0)+6*broad),0,100);
  return {...info,score,bookOk:!!bookOk,benchmarkOk};
 }
 const interpret=x=>x>.23?tr('Rialzista','Bullish'):x<-.23?tr('Ribassista','Bearish'):tr('Laterale','Sideways');
 function paint(){
  const now=Date.now();
  const freshCandles=config.candlesAt>0&&now-config.candlesAt<125000;
  const indicator=freshCandles?readTechnical():null;
  const wsFresh=config.wsAt>0&&now-config.wsAt<20000;
  const quoteFresh=config.priceAt>0&&now-config.priceAt<95000;
  const rawPrice=quoteFresh?config.price:(freshCandles?config.candles[config.candles.length-1]?.c:null);
  $('mrPrice').textContent=rawPrice>0?'$'+fmt(rawPrice,4):'—';
  const changeFresh=finite(config.change)&&now-config.changeAt<120000;
  $('mrChange').textContent=changeFresh?(config.change>=0?'+':'')+fmt(config.change,2)+'% · 24H':'—';
  $('mrChange').dataset.dir=!changeFresh?'flat':config.change>0?'up':config.change<0?'down':'flat';
  const feed=wsFresh?'live':(freshCandles?'poll':(config.candlesAt>0?'stale':'sync'));
  $('mrFeed').dataset.feed=feed;
  $('mrFeedText').textContent=feed==='live'?'LIVE':feed==='poll'?tr('ONLINE · HTTP','ONLINE · HTTP'):feed==='stale'?tr('DATI SCADUTI','STALE DATA'):tr('SYNC','SYNC');
  if(!indicator){
   root.dataset.signal='loading';
   $('mrScore').textContent='—';
   $('mrState').textContent=tr('DATI NON DISPONIBILI','DATA UNAVAILABLE');
   $('mrDescription').textContent=tr('Attendo dati di mercato aggiornati','Waiting for fresh market data');
   for(const id of ['mrTrend','mrVolume','mrMomentum','mrBook'])$(id).textContent='—';
   $('mrBenchmark').textContent='BTC / ETH · —';
   $('mrQuality').textContent=tr('Punteggio non verificabile','Score not verifiable');
   $('mrUpdated').textContent=config.candlesAt?when(config.candlesAt):'—';
   config.lastScore=null;
   return;
  }
  config.lastScore=indicator.score;
  root.dataset.signal=signalFrom(indicator.score);
  intensity(indicator.score);
  $('mrScore').textContent=String(indicator.score);
  $('mrState').textContent=nameFrom(indicator.score);
  $('mrDescription').textContent=tr('Pressione di mercato · indicatori tecnici INJ spot','Market pressure · INJ spot technical indicators');
  $('mrTrend').textContent=interpret(indicator.trend);
  $('mrMomentum').textContent=interpret(indicator.momentum);
  $('mrVolume').textContent=indicator.volumeRatio===null?'—':indicator.volumeRatio>=1.4?tr('Elevato','High'):indicator.volumeRatio<=.7?tr('Basso','Low'):tr('Normale','Normal');
  $('mrBook').textContent=indicator.bookOk?tr('Bid ','Bids ')+fmt(config.book.bidPct,0)+'%':tr('N/D','N/A');
  const signed=n=>(n>=0?'+':'')+fmt(n,2)+'%';
  $('mrBenchmark').textContent=indicator.benchmarkOk?'BTC 24H '+signed(config.benchmark.btc)+' · ETH 24H '+signed(config.benchmark.eth):tr('Contesto BTC/ETH non disponibile','BTC/ETH context unavailable');
  const available=3+Number(indicator.bookOk)+Number(indicator.benchmarkOk);
  $('mrQuality').textContent=available+'/5 '+tr('indicatori · spot Binance','inputs · Binance spot');
  $('mrUpdated').textContent=tr('Aggiornato ','Updated ')+when(config.candlesAt);
 }
 function buildHistory(){
  const closed=config.candles.slice(0,-1);
  const chart=$('mrChart');
  let history=[];
  for(let i=39;i<closed.length;i++){
   const value=technical(closed,i);
   if(value)history.push({t:closed[i].t,v:clamp(Math.round(value.base),0,100)});
  }
  const count=options[config.range].count;
  history=history.slice(-count);
  config.graph=history;
  const empty=$('mrChartEmpty');
  const line=$('mrChartLine'),fill=$('mrChartFill');
  if(history.length<8){
   line.setAttribute('d','');fill.setAttribute('d','');
   empty.hidden=false;$('mrStart').textContent='—';$('mrEnd').textContent='—';
   return;
  }
  empty.hidden=true;
  const at=(point,i)=>[i/(history.length-1)*800,132-point.v/100*120];
  const vertices=history.map(at);
  const path='M'+vertices.map(x=>x[0].toFixed(2)+' '+x[1].toFixed(2)).join(' L');
  line.setAttribute('d',path);
  fill.setAttribute('d',path+' L800 144 L0 144 Z');
  $('mrStart').textContent=when(history[0].t);
  $('mrEnd').textContent=when(history[history.length-1].t);
  chart.setAttribute('aria-label',tr('Storico tecnico Market Score, da ','Technical Market Score history, from ')+when(history[0].t)+' '+tr('a','to')+' '+when(history[history.length-1].t));
  clearCursor();
 }
 function clearCursor(){
  $('mrChartTip').hidden=true;
  $('mrChartCursor').setAttribute('visibility','hidden');
  $('mrChartPoint').setAttribute('visibility','hidden');
 }
 function showCursor(event){
  const data=config.graph;
  if(data.length<2)return;
  const rect=$('mrChart').getBoundingClientRect();
  if(!rect.width)return;
  const x=clamp(event.clientX-rect.left,0,rect.width)/rect.width;
  const pos=Math.round(x*(data.length-1));
  const item=data[pos],cx=pos/(data.length-1)*800,cy=132-item.v/100*120;
  const marker=$('mrChartCursor'),point=$('mrChartPoint');
  marker.setAttribute('x1',cx);marker.setAttribute('x2',cx);marker.setAttribute('visibility','visible');
  point.setAttribute('cx',cx);point.setAttribute('cy',cy);point.setAttribute('visibility','visible');
  $('mrChartTip').textContent=when(item.t)+' · '+item.v+'/100';
  $('mrChartTip').hidden=false;
 }
 async function refresh(){
  if(config.polling||document.hidden||!navigator.onLine)return;
  config.polling=true;
  const token=config.requestId;
  const opt=options[config.range];
  const candleTask=getJson('/api/v3/klines?symbol=INJUSDT&interval='+encodeURIComponent(opt.interval)+'&limit='+opt.limit);
  const quoteTask=getJson('/api/v3/ticker/24hr?symbol=INJUSDT');
  const bookTask=getJson('/api/v3/depth?symbol=INJUSDT&limit=100');
  const btcTask=getJson('/api/v3/ticker/24hr?symbol=BTCUSDT');
  const ethTask=getJson('/api/v3/ticker/24hr?symbol=ETHUSDT');
  const responses=await Promise.allSettled([candleTask,quoteTask,bookTask,btcTask,ethTask]);
  if(token!==config.requestId){config.polling=false;return}
  const time=Date.now();
  if(responses[0].status==='fulfilled'){
   try{config.candles=parseCandles(responses[0].value);config.candlesAt=time;buildHistory()}catch(_){}
  }
  if(responses[1].status==='fulfilled'){
   const q=responses[1].value,p=Number(q.lastPrice),d=Number(q.priceChangePercent);
   if(finite(p)&&p>0&&time-config.wsAt>15000){config.price=p;config.priceAt=time}
   if(finite(d)){config.change=d;config.changeAt=time}
  }
  if(responses[2].status==='fulfilled'){
   try{config.book=parseBook(responses[2].value);config.bookAt=time}catch(_){config.book=null;config.bookAt=0}
  }else{config.book=null;config.bookAt=0}
  if(responses[3].status==='fulfilled'&&responses[4].status==='fulfilled'){
   const btc=Number(responses[3].value?.priceChangePercent),eth=Number(responses[4].value?.priceChangePercent);
   if(finite(btc)&&finite(eth)){config.benchmark={btc,eth};config.benchmarkAt=time}
   else{config.benchmark=null;config.benchmarkAt=0}
  }else{config.benchmark=null;config.benchmarkAt=0}
  config.polling=false;
  paint();
 }
 function connect(){
  if(document.hidden||!navigator.onLine||config.ws)return;
  const urls=['wss://data-stream.binance.vision/ws/injusdt@aggTrade','wss://stream.binance.com:9443/ws/injusdt@aggTrade'];
  try{
   const socket=new WebSocket(urls[config.wsFailures%urls.length]);
   config.ws=socket;
   socket.onopen=()=>{config.wsFailures=0;paint()};
   socket.onmessage=e=>{
    try{
     const msg=JSON.parse(e.data),price=Number(msg.p);
     if(msg.e!=='aggTrade'||!finite(price)||price<=0)return;
     config.price=price;config.priceAt=Date.now();config.wsAt=Date.now();
     if(config.wsAt-config.displayAt>1700){config.displayAt=config.wsAt;paint()}
    }catch(_){}
   };
   socket.onerror=()=>{try{socket.close()}catch(_){}};
   socket.onclose=()=>{if(config.ws===socket){config.ws=null;config.wsFailures++}paint()};
  }catch(_){config.ws=null;config.wsFailures++}
 }
 function chooseRange(range){
  if(!options[range]||range===config.range)return;
  config.range=range;config.requestId++;
  config.candles=[];config.candlesAt=0;config.graph=[];
  config.polling=false;
  document.querySelectorAll('[data-range]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.range===range)));
  $('mrChartEmpty').hidden=false;
  $('mrChartLine').setAttribute('d','');$('mrChartFill').setAttribute('d','');
  $('mrStart').textContent='—';$('mrEnd').textContent='—';
  clearCursor();paint();refresh();
 }
 function exitToTools(){
  try{sessionStorage.setItem('inj_node_return_tools','1')}catch(_){}
  if(window.parent!==window){window.parent.postMessage({type:'injnode:section:tools'},location.origin);return}
  try{
   const prev=document.referrer?new URL(document.referrer):null;
   if(prev&&prev.origin===location.origin&&(prev.pathname.endsWith('/')||prev.pathname.endsWith('/index.html'))&&history.length>1){history.back();return}
  }catch(_){}
  location.replace('./index.html?tab=tools');
 }
 $('mrBack').addEventListener('click',exitToTools);
 document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>chooseRange(b.dataset.range)));
 $('mrChart').addEventListener('pointerdown',showCursor);
 $('mrChart').addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)showCursor(e)});
 $('mrChart').addEventListener('pointerleave',clearCursor);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')exitToTools()});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){config.ws?.close();config.ws=null}
  else{paint();connect();refresh()}
 });
 window.addEventListener('online',()=>{connect();refresh()});
 window.addEventListener('offline',()=>{config.ws?.close();config.ws=null;paint()});
 window.addEventListener('storage',e=>{
  if(e.key==='inj_monitor_theme'||e.key==='inj_node_font_v1')applyTheme();
  if(e.key==='inj_node_language_v1')applyLanguage();
 });
 window.addEventListener('message',e=>{
  if(e.origin===location.origin&&e.data?.type==='injnode:languagechange')applyLanguage();
 });
 applyTheme();applyLanguage();connect();refresh();
 setInterval(()=>{if(!document.hidden){paint();if(!config.ws)connect()}},5000);
 setInterval(()=>{if(!document.hidden)refresh()},30000);
})();