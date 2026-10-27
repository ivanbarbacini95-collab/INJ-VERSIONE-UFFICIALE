/* INJ Node · Market Pro v16.07.20
   Per-asset chart controls. Binance 1m close series for available USDT pairs;
   CoinGecko fallback only at the historical sample frequency actually supplied.
   Streaming tick updates move the rightmost point; historical bars refresh
   on a bounded interval without fabricating candles. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const modal=$('detail'),chart=$('detailChart'),buttons=$('detailRanges');
 if(!modal||!chart||!buttons)return;
 const ranges={ '1h':1,'1d':1,'7d':7,'30d':30,'90d':90,'1y':365 };
 let active=null,token=0,refresher=0,lastPricePaint=0,lastChartPaint=0;
 const english=()=>document.documentElement.lang==='en';
 const tr=(it,en)=>english()?en:it;
 const finite=v=>Number.isFinite(v);
 const val=v=>finite(v)&&v>0?v:NaN;
 const number=v=>finite(v)?new Intl.NumberFormat(english()?'en-US':'it-IT',{maximumFractionDigits:2}).format(v):'—';
 const formatTime=(stamp,range)=>{
  const opts=range==='1h'||range==='1d'?{hour:'2-digit',minute:'2-digit'}:
   range==='7d'?{weekday:'short',day:'2-digit',hour:'2-digit'}:
   {day:'2-digit',month:'short',year:range==='1y'?'2-digit':undefined};
  return new Intl.DateTimeFormat(english()?'en-US':'it-IT',opts).format(new Date(stamp));
 };
 function updateTabs(){
  buttons.querySelectorAll('[data-detail-range]').forEach(b=>{
   const current=b.dataset.detailRange===active?.range;
   b.classList.toggle('active',current);b.setAttribute('aria-pressed',String(current));
  });
 }
 function renderPrimary(){
  if(!active||!modal.open)return;
  const {coin,helpers}=active;
  $('detailName').textContent=coin.name+' ('+coin.symbol.toUpperCase()+')';
  $('detailPrice').textContent=helpers.money(coin.current_price);
  const percent=helpers.change(coin,'24h');
  const ch=$('detailChange');ch.className='detail-change '+helpers.tone(percent);
  ch.textContent=helpers.pct(percent)+' · 24H';
  $('detailInfo').textContent=tr('Dati asset CoinGecko · Prezzo aggiornato quando disponibile','CoinGecko asset data · Price updates where supported');
  const icon=$('detailIcon');if(!icon.firstElementChild||icon.dataset.id!==coin.id){
   icon.dataset.id=coin.id;icon.replaceChildren();
   const img=document.createElement('img');img.src=coin.image||'';img.alt='';
   img.loading='lazy';img.referrerPolicy='no-referrer';icon.append(img);
  }
  const stats=[
   [tr('Capitalizzazione','Market cap'),helpers.money(coin.market_cap,true)],
   [tr('Volume 24H','24H volume'),helpers.money(coin.total_volume,true)],
   ['1H',helpers.pct(helpers.change(coin,'1h')),helpers.tone(helpers.change(coin,'1h'))],
   ['24H',helpers.pct(helpers.change(coin,'24h')),helpers.tone(helpers.change(coin,'24h'))],
   ['7D',helpers.pct(helpers.change(coin,'7d')),helpers.tone(helpers.change(coin,'7d'))],
   ['30D',helpers.pct(helpers.change(coin,'30d')),helpers.tone(helpers.change(coin,'30d'))],
   [tr('Rank','Rank'),finite(coin.market_cap_rank)?'#'+number(coin.market_cap_rank):'—'],
   [tr('Offerta circolante','Circulating supply'),number(coin.circulating_supply)+' '+coin.symbol.toUpperCase()],
   [tr('Offerta massima','Max supply'),finite(coin.max_supply)?number(coin.max_supply)+' '+coin.symbol.toUpperCase():'—'],
   ['FDV',helpers.money(coin.fully_diluted_valuation,true)],
   ['ATH',helpers.money(coin.ath)],
   ['ATL',helpers.money(coin.atl)]
  ];
  const host=$('detailStats'),frag=document.createDocumentFragment();
  for(const [label,display,tone] of stats){
   const a=document.createElement('article'),small=document.createElement('small'),strong=document.createElement('strong');
   small.textContent=label;strong.textContent=display;
   if(tone)strong.className=tone;
   a.append(small,strong);frag.append(a);
  }
  host.replaceChildren(frag);
 }
 function clearTimer(){if(refresher){clearInterval(refresher);refresher=0}}
 function setStatus(str){const el=$('detailStatus');if(el)el.textContent=str}
 const rangeSpan={'1h':3600000,'1d':86400000,'7d':604800000,'30d':2592000000,'90d':7776000000,'1y':31536000000};
 let gesture=null,selectedPointer=null;
 function dataLimits(){
  const points=(active?.series||[]).filter(pt=>finite(pt.t)&&finite(pt.v)&&pt.v>0).sort((a,b)=>a.t-b.t);
  if(points.length<2)return null;
  return {points,start:points[0].t,end:points.at(-1).t};
 }
 function clampView(view,limits){
  const width=limits.end-limits.start;
  const duration=Math.max(1,Math.min(width,view.end-view.start));
  let start=Math.max(limits.start,Math.min(view.start,limits.end-duration));
  return {start,end:start+duration,follow:view.follow===true};
 }
 function currentViewport(limits,range){
  const target=Math.min(rangeSpan[range]||86400000,limits.end-limits.start);
  if(!active.viewport)active.viewport={start:limits.end-target,end:limits.end,follow:true};
  if(active.viewport.follow){
   const oldSpan=Math.min(limits.end-limits.start,active.viewport.end-active.viewport.start||target);
   active.viewport={start:limits.end-oldSpan,end:limits.end,follow:true};
  }else active.viewport=clampView(active.viewport,limits);
  return active.viewport;
 }
 function draw(points,range){
  if(!active||!modal.open)return;
  const limits=dataLimits();
  if(!limits){chart.textContent=tr('Punti insufficienti per il periodo','Not enough data points for this period');return}
  const {points:data}=limits,view=currentViewport(limits,range);
  const visible=data.filter(point=>point.t>=view.start&&point.t<=view.end);
  if(visible.length<2){chart.textContent=tr('Dati insufficienti per questa finestra','Not enough data for this window');return}
  const stride=Math.max(1,Math.ceil(visible.length/240));
  const sample=visible.filter((_,i)=>i%stride===0||i===visible.length-1);
  const W=660,H=235,left=14,right=646,top=17,bottom=210;
  const lo=Math.min(...sample.map(x=>x.v)),hi=Math.max(...sample.map(x=>x.v));
  const pad=(hi-lo||Math.abs(lo)*.001||1)*.10,min=lo-pad,max=hi+pad;
  const x=t=>left+(t-view.start)/(view.end-view.start||1)*(right-left);
  const y=value=>bottom-(value-min)/(max-min||1)*(bottom-top);
  const line=sample.map((pt,i)=>(i?'L':'M')+x(pt.t).toFixed(2)+' '+y(pt.v).toFixed(2)).join(' ');
  const last=sample.at(-1),up=last.v>=sample[0].v;
  const stroke=up?'var(--positive,#31d99c)':'var(--negative,#fa6b84)';
  const fill=up?'rgba(49,217,156,.10)':'rgba(250,107,132,.10)';
  const area=line+' L'+x(last.t).toFixed(2)+' '+bottom+' L'+x(sample[0].t).toFixed(2)+' '+bottom+' Z';
  const guides=[.25,.5,.75].map(f=>'<line x1="'+left+'" x2="'+right+'" y1="'+(top+(bottom-top)*f).toFixed(2)+'" y2="'+(top+(bottom-top)*f).toFixed(2)+'" stroke="var(--line)" opacity=".55"/>').join('');
  chart.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+guides+
   '<path d="'+area+'" fill="'+fill+'"/>'+
   '<path d="'+line+'" fill="none" stroke="'+stroke+'" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>'+
   '<line class="detail-cross-x" x1="0" x2="0" y1="'+top+'" y2="'+bottom+'" visibility="hidden"/>'+
   '<circle class="detail-cross-dot" cx="0" cy="0" r="4.5" visibility="hidden"/>'+
   '</svg><div class="detail-cross-tooltip" hidden></div>';
  active.plot={sample,view,left,right,top,bottom,W,H,x,y};
  $('detailChartStart').textContent=formatTime(view.start,range);
  $('detailChartEnd').textContent=formatTime(view.end,range);
  $('detailChartHint').textContent=view.follow?
   tr('Trascina per lo storico · +/− per zoom','Drag for history · +/− to zoom'):
   tr('Storico · premi Live per tornare a oggi','History · press Live to return to today');
  if(selectedPointer!=null)inspectPoint(selectedPointer);
 }
 function localFraction(event){
  const bounds=chart.getBoundingClientRect();
  return bounds.width?Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)):0.5;
 }
 function inspectPoint(fraction){
  if(!active?.plot)return;
  const scrub=$('detailHapticScrub');
  if(scrub&&document.activeElement!==scrub){
   const next=String(Math.max(0,Math.min(100,Math.round(fraction*100))));
   if(scrub.value!==next)scrub.value=next;
  }
  const plot=active.plot;
  const target=plot.view.start+fraction*(plot.view.end-plot.view.start);
  let nearest=null,delta=Infinity;
  for(const pt of plot.sample){const distance=Math.abs(pt.t-target);if(distance<delta){nearest=pt;delta=distance}}
  if(!nearest)return;
  const px=plot.x(nearest.t),py=plot.y(nearest.v),v=plot.W;
  const line=chart.querySelector('.detail-cross-x'),dot=chart.querySelector('.detail-cross-dot'),tooltip=chart.querySelector('.detail-cross-tooltip');
  if(line){line.setAttribute('x1',px);line.setAttribute('x2',px);line.setAttribute('visibility','visible')}
  if(dot){dot.setAttribute('cx',px);dot.setAttribute('cy',py);dot.setAttribute('visibility','visible')}
  if(tooltip){
   tooltip.hidden=false;
   tooltip.textContent=active.helpers.money(nearest.v)+' · '+formatTime(nearest.t,active.range);
   tooltip.style.left=(px/v*100).toFixed(2)+'%';
   tooltip.classList.toggle('align-right',px>plot.W*.58);
  }
 }
 function scrubAt(fraction){
  if(!active?.series?.length||!modal.open)return;
  selectedPointer=Math.max(0,Math.min(1,Number(fraction)||0));
  inspectPoint(selectedPointer);
 }
 function zoom(scale,position=.5){
  if(!active)return;
  const limits=dataLimits();if(!limits)return;
  const old=currentViewport(limits,active.range),extent=limits.end-limits.start;
  const spacing=extent/Math.max(2,limits.points.length-1);
  const minSpan=Math.max(spacing*3,extent/500);
  const duration=Math.max(minSpan,Math.min(extent,(old.end-old.start)*scale));
  const anchor=old.start+(old.end-old.start)*position;
  active.viewport=clampView({start:anchor-duration*position,end:anchor+duration*(1-position),follow:false},limits);
  selectedPointer=null;draw(active.series,active.range);
 }
 function resetView(){
  if(!active)return;
  active.viewport=null;selectedPointer=null;
  draw(active.series,active.range);
 }
 const binanceFrames={
  '1h':{interval:'1m',limit:240},
  '1d':{interval:'5m',limit:450},
  '7d':{interval:'1h',limit:370},
  '30d':{interval:'4h',limit:330},
  '90d':{interval:'1d',limit:165},
  '1y':{interval:'1d',limit:600}
 };
 async function binanceSeries(range,signal){
  if(!active?.helpers.canStream||!['usd','eur'].includes(active.helpers.currency))throw Error('No verified Binance Spot pair');
  const symbol=String(active.coin.symbol||'').toUpperCase();
  if(!/^[A-Z0-9]{2,15}$/.test(symbol))throw Error('Unsupported symbol');
  const cfg=binanceFrames[range];
  const url='https://data-api.binance.vision/api/v3/klines?symbol='+encodeURIComponent(symbol+'USDT')+'&interval='+cfg.interval+'&limit='+cfg.limit;
  const res=await fetch(url,{cache:'no-store',signal});
  if(!res.ok)throw Error('Binance HTTP '+res.status);
  const raw=await res.json();
  if(!Array.isArray(raw)||raw.length<3)throw Error('No Binance candles');
  const values=raw.map(row=>({t:Number(row[0]),v:Number(row[4])})).filter(pt=>finite(pt.t)&&finite(pt.v)&&pt.v>0);
  if(values.length<3||values.at(-1).t<Date.now()-86400000)throw Error('Stale Binance candles');
  // Binance candles are USDT-denominated. Anchor them to the latest
  // CoinGecko/Binance-displayed price in the selected display currency.
  const close=values.at(-1).v,market=Number(active.coin.current_price);
  const ratio=market>0&&close>0?market/close:1;
  return values.map(pt=>({t:pt.t,v:pt.v*ratio}));
 }
 async function getSeries(range,signal){
  try{
   const data=await binanceSeries(range,signal);
   return {data,provider:tr('Binance Spot · storico reale · scorrimento interattivo','Binance Spot · real historical candles · interactive navigation')};
  }catch(_){/* CoinGecko fallback for unlisted pairs, regional restrictions or outages. */}
  const days=ranges[range],{helpers,coin}=active;
  const requestDays=range==='1h'?1:Math.min(365,days*2);
  const base=helpers.API+'/coins/'+encodeURIComponent(coin.id)+'/market_chart?vs_currency='+helpers.currency+'&days=';
  let response;
  try{response=await helpers.getJson(base+requestDays+'&precision=full',signal)}
  catch(error){
   if(requestDays===days)throw error;
   // A longer window may be rejected by the free API; retry the selected range.
   response=await helpers.getJson(base+days+'&precision=full',signal);
  }
  const all=(response?.prices||[]).map(v=>({t:Number(v[0]),v:Number(v[1])})).filter(x=>finite(x.t)&&finite(x.v)&&x.v>0);
  return {data:all,provider:tr('CoinGecko · storico reale alla frequenza disponibile','CoinGecko · real history at source sampling frequency')};
 }
 async function loadChart(force=false){
  if(!active||!modal.open||document.hidden)return;
  const {range}=active,ref=active,id=++token;
  if(ref.loading&&!force)return;
  ref.loading=true;
  if(!ref.series.length)chart.textContent=tr('Caricamento grafico…','Loading chart…');
  setStatus(tr('Sincronizzazione dati reali…','Syncing real data…'));
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),13500);
  try{
   const {data,provider}=await getSeries(range,ctrl.signal);
   if(!active||active!==ref||token!==id||!modal.open)return;
   if(data.length<2)throw Error('Insufficient chart history');
   ref.series=data;ref.provider=provider;ref.lastFetch=Date.now();
   draw(data,range);setStatus(provider+' · '+new Date().toLocaleTimeString(english()?'en-US':'it-IT'));
  }catch(e){
   if(!active||active!==ref||token!==id)return;
   if(ref.series.length<2)chart.textContent=tr('Grafico non disponibile per questo periodo','Chart not available for this timeframe');
   setStatus(tr('Dati non disponibili · riprova cambiando timeframe','Data unavailable · try another timeframe'));
  }finally{clearTimeout(timer);if(active===ref)ref.loading=false}
 }
 function beginRefresh(){
  clearTimer();
  refresher=setInterval(()=>{
   if(!active||!modal.open||document.hidden)return;
   const cooldown=active.range==='1h'?60000:120000;
   if(Date.now()-active.lastFetch>=cooldown)void loadChart();
  },12000);
 }
 function open(coin,helpers){
  if(!coin||!helpers)return;
  token++;lastPricePaint=0;lastChartPaint=0;selectedPointer=null;gesture=null;
  active={coin,helpers,range:'1h',series:[],provider:'',lastFetch:0,loading:false,viewport:null,plot:null};
  updateTabs();
  if(!modal.open)modal.showModal();
  renderPrimary();chart.textContent='';$('detailChartStart').textContent='—';$('detailChartEnd').textContent='—';
  $('detailChartHeading').textContent=tr('GRAFICO · TIMEFRAME','CHART · TIMEFRAME');
  setStatus(tr('Preparazione grafico 1H…','Preparing 1H chart…'));
  void loadChart(true);beginRefresh();
 }
 function updateCoin(coin,helpers){
  if(!active||!coin||coin.id!==active.coin.id)return;
  const currencyChanged=helpers?.currency!==active.helpers.currency;
  active.coin=coin;if(helpers)active.helpers=helpers;
  renderPrimary();
  if(currencyChanged){active.series=[];active.lastFetch=0;active.viewport=null;void loadChart(true)}
 }
 function priceTick(coin,timestamp){
  if(!active||active.coin.id!==coin.id||!modal.open)return;
  active.coin=coin;
  if(timestamp-lastPricePaint>900){
   lastPricePaint=timestamp;
   const detail=$('detailPrice');if(detail)detail.textContent=active.helpers.money(coin.current_price);
   const p=active.helpers.change(coin,'24h'),label=$('detailChange');
   if(label){label.className='detail-change '+active.helpers.tone(p);label.textContent=active.helpers.pct(p)+' · 24H'}
  }
  if(active.range!=='1h'||!active.series.length||!active.helpers.canStream)return;
  const now=Date.now(),series=active.series;
  const last=series.at(-1);
  if(last&&now-last.t<55000)last.v=coin.current_price;
  else series.push({t:now,v:coin.current_price});
  while(series.length>2&&series[0].t<now-3600000)series.shift();
  if(now-lastChartPaint>1350){lastChartPaint=now;draw(series,'1h');}
 }
 function close(){token++;clearTimer();active=null;selectedPointer=null;gesture=null}
 function languageChange(){
  if(!active||!modal.open)return;
  renderPrimary();
  $('detailChartHeading').textContent=tr('GRAFICO · TIMEFRAME','CHART · TIMEFRAME');
  if(active.series.length>1)draw(active.series,active.range);
 }
 buttons.addEventListener('click',e=>{
  const b=e.target.closest('[data-detail-range]');
  if(!b||!active||!ranges[b.dataset.detailRange])return;
  const next=b.dataset.detailRange;
  if(active.range===next)return;
  active.range=next;active.series=[];active.lastFetch=0;active.loading=false;active.viewport=null;selectedPointer=null;
  updateTabs();$('detailChartStart').textContent='—';$('detailChartEnd').textContent='—';
  void loadChart(true);
 });

 const zoomIn=$('detailZoomIn'),zoomOut=$('detailZoomOut'),reset=$('detailZoomReset');
 zoomIn?.addEventListener('click',()=>zoom(.65));
 zoomOut?.addEventListener('click',()=>zoom(1.5));
 reset?.addEventListener('click',resetView);
 chart.addEventListener('pointerdown',event=>{
  if(!active?.series?.length)return;
  if(event.button!=null&&event.button!==0)return;
  const limits=dataLimits();if(!limits)return;
  gesture={id:event.pointerId,x:event.clientX,start:{...currentViewport(limits,active.range)},dragged:false};
  selectedPointer=localFraction(event);
  inspectPoint(selectedPointer);
  try{chart.setPointerCapture(event.pointerId)}catch(_){}
 });
 chart.addEventListener('pointermove',event=>{
  if(!active?.series?.length)return;
  if(gesture&&event.pointerId===gesture.id){
   const bounds=chart.getBoundingClientRect();
   const delta=event.clientX-gesture.x;
   if(Math.abs(delta)>4)gesture.dragged=true;
   if(gesture.dragged&&bounds.width>0){
    const span=gesture.start.end-gesture.start.start;
    const offset=-(delta/bounds.width)*span;
    const limits=dataLimits();
    if(limits){
     active.viewport=clampView({start:gesture.start.start+offset,end:gesture.start.end+offset,follow:false},limits);
     selectedPointer=null;draw(active.series,active.range);
    }
   }else{selectedPointer=localFraction(event);inspectPoint(selectedPointer)}
  }else if(event.pointerType==='mouse'){
   selectedPointer=localFraction(event);inspectPoint(selectedPointer);
  }
 });
 const pointerEnd=event=>{if(gesture?.id===event.pointerId)gesture=null};
 chart.addEventListener('pointerup',pointerEnd);
 chart.addEventListener('pointercancel',pointerEnd);
 chart.addEventListener('pointerleave',()=>{if(!gesture)selectedPointer=null});
 chart.addEventListener('dblclick',event=>{event.preventDefault();resetView()});
 chart.addEventListener('wheel',event=>{
  if(!event.ctrlKey&&!event.metaKey)return; // normal scrolling must still scroll the dialog
  event.preventDefault();zoom(event.deltaY<0?.8:1.25,localFraction(event));
 },{passive:false});
 // Scroll spotlight: one row near viewport middle breathes by ~1%; never
 // modifies page scrolling or per-card heights.
 let spotlight=null,queued=false;
 function updateSpotlight(){
  queued=false;
  if(modal.open||!matchMedia('(pointer:coarse)').matches)return;
  const el=document.elementFromPoint(Math.min(window.innerWidth*.5,window.innerWidth-20),window.innerHeight*.56);
  const row=el?.closest?.('#rows tr[data-coin]')||null;
  if(row===spotlight)return;
  spotlight?.classList.remove('in-spotlight');
  spotlight=row;
  spotlight?.classList.add('in-spotlight');
 }
 function onScroll(){if(!queued){queued=true;requestAnimationFrame(updateSpotlight)}}
 document.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('resize',onScroll,{passive:true});
 window.addEventListener('pageshow',onScroll,{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&active&&modal.open&&Date.now()-active.lastFetch>60000)void loadChart();
 });
 window.MARKET_PRO={open,close,updateCoin,priceTick,languageChange,scrubAt};
})();
