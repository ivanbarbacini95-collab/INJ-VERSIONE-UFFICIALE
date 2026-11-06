/* INJ Node Official · Fund-flow zero baseline and traded-share volume.
   Fund flows: only issuer/qualified verified daily creations/redemptions.
   Volume: real reported INJC shares traded, never fund inflow or INJ spot volume.
   No interpolation between missing dates, no invented market data. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const lang=()=>document.documentElement.lang==='en'?'en':'it';
 const tr=(it,en)=>lang()==='en'?en:it;
 const nyDay=time=>{
   const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
     year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));
   const parts=Object.fromEntries(p.map(x=>[x.type,x.value]));
   return parts.year+'-'+parts.month+'-'+parts.day;
 };
 const dateFmt=k=>k.slice(8)+'/'+k.slice(5,7);
 const number=n=>Number(n).toLocaleString(lang()==='en'?'en-US':'it-IT',{maximumFractionDigits:0});
 const compact=(n,unit='')=>{
   if(!Number.isFinite(n))return '—';
   const abs=Math.abs(n),suffix=abs>=1e9?'B':abs>=1e6?'M':abs>=1e3?'K':'';
   const value=abs>=1e9?n/1e9:abs>=1e6?n/1e6:abs>=1e3?n/1e3:n;
   const decimals=suffix&&Math.abs(value)<10?1:0;
   return (unit?unit:'')+value.toLocaleString(lang()==='en'?'en-US':'it-IT',
     {maximumFractionDigits:decimals})+suffix;
 };
 const roundTop=value=>{
   if(!(value>0))return 0;
   const exponent=Math.pow(10,Math.floor(Math.log10(value)));
   const target=value*1.075/exponent;
   const step=[1,2,2.5,5,10].find(n=>n>=target)||10;
   return step*exponent;
 };
 const cssNum=id=>Math.max(1,Number.parseFloat(getComputedStyle($(id)).getPropertyValue('--injc-flow-day-width'))||58);
 let flowDates=[],flowMap=new Map(),flowRenderKey='',flowFirst=true,flowRaf=0;
 function axisValues(id,top,half,unit=''){
   const root=$(id);if(!root)return;
   const nodes=root.querySelectorAll('[data-y-axis]');
   const values=[top,top/2,0,-top/2,-top];
   nodes.forEach((node,i)=>{node.textContent=top?compact(values[i],unit):(i===2?'0':'—');});
 }
 function flowScale(){
   const el=$('etfFlowHistory');if(!el||!flowDates.length)return;
   const width=cssNum('etfFlowHistory');
   const first=Math.max(0,Math.floor(el.scrollLeft/width));
   const end=Math.min(flowDates.length,Math.ceil((el.scrollLeft+el.clientWidth)/width)+1);
   let high=0;
   for(let i=first;i<end;i++){
     const data=flowMap.get(flowDates[i]);
     if(data)high=Math.max(high,data.inflowUsd,data.outflowUsd);
   }
   const scale=roundTop(high);
   axisValues('etfFlowRightAxis',scale,scale/2,'$');
   el.querySelectorAll('.injc-flow-day').forEach(day=>{
     const row=flowMap.get(day.dataset.day);
     if(!row)return;
     for(const side of ['inflow','outflow']){
       const bar=day.querySelector('.injc-flow-column.'+side);
       if(!bar)continue;
       const value=row[side+'Usd'];
       bar.style.height=value===0?'2px':(scale>0?Math.min(50,value/scale*50):0).toFixed(3)+'%';
     }
   });
   setText('etfFlowScaleNote',scale?tr('Scala ±','Scale ±')+compact(scale,'$'):tr('In attesa dei flussi','Awaiting flows'));
 }
 function setText(id,value){const e=$(id);if(e)e.textContent=value;}
 function scheduleFlowScale(){
   if(flowRaf)return;
   flowRaf=requestAnimationFrame(()=>{flowRaf=0;flowScale();});
 }
 function showFlowTooltip(day,evt){
   const el=$('etfFlowTooltip'),wrap=$('etfFlowGraph');
   if(!el||!wrap)return;
   const d=flowMap.get(day.dataset.day);
   const title=el.querySelector('.injc-tip-date');
   const body=el.querySelector('.injc-tip-body');
   title.textContent=day.dataset.day;
   body.textContent=d
     ?'INFLOW '+compact(d.inflowUsd,'$')+' · OUTFLOW '+compact(d.outflowUsd,'$')+
       ' · NET '+compact(d.inflowUsd-d.outflowUsd,'$')
     :tr('Report giornaliero non ancora verificato','Daily report not yet verified');
   el.hidden=false;
   const graphRect=wrap.getBoundingClientRect();
   const dayRect=day.getBoundingClientRect();
   const x=evt&&Number.isFinite(evt.clientX)?evt.clientX-graphRect.left:
     dayRect.left-graphRect.left+dayRect.width/2;
   el.style.left=Math.max(90,Math.min(wrap.clientWidth-90,x))+'px';
 }
 function hideFlowTooltip(){const t=$('etfFlowTooltip');if(t)t.hidden=true;}
 window.__injcEtfFlowsRender=function({dateKeys,rows,today}){
   const el=$('etfFlowHistory');if(!el)return;
   flowDates=dateKeys.slice();
   flowMap=new Map(rows.filter(Boolean).map(r=>[r.date,r]));
   const key=flowDates.join('|')+'::'+[...flowMap.values()].map(r=>[r.date,r.inflowUsd,r.outflowUsd].join(':')).join('|');
   if(key===flowRenderKey){scheduleFlowScale();return;}
   const atEnd=flowFirst||el.scrollWidth-el.clientWidth-el.scrollLeft<85,previousScroll=el.scrollLeft;
   flowRenderKey=key;
   const frag=document.createDocumentFragment();
   for(const k of flowDates){
     const row=flowMap.get(k);
     const day=document.createElement('div');day.className='injc-flow-day';day.dataset.day=k;
     if(k===today)day.classList.add('is-current');
     day.tabIndex=0;
     day.setAttribute('role','group');
     day.setAttribute('aria-label',k+' '+(row?'Inflow '+number(row.inflowUsd)+' USD, Outflow '+number(row.outflowUsd)+' USD':
       tr('dati in attesa','pending report')));
     const columns=document.createElement('div');columns.className='injc-flow-columns';
     for(const side of ['inflow','outflow']){
       const bar=document.createElement('i');
       bar.className='injc-flow-column '+side+(row?' is-verified':' is-pending');
       if(row&&row[side+'Usd']===0)bar.classList.add('is-zero');
       bar.style.height=row?'0%':'18px';
       columns.appendChild(bar);
     }
     day.appendChild(columns);
     const stamp=document.createElement('span');stamp.className='injc-flow-date';stamp.textContent=dateFmt(k);day.appendChild(stamp);
     const state=document.createElement('small');state.className='injc-flow-day-state';state.textContent=row?'✓':k===today?tr('OGGI','TODAY'):'·';day.appendChild(state);
     day.addEventListener('pointerenter',e=>showFlowTooltip(day,e));
     day.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')showFlowTooltip(day,e);});
     day.addEventListener('pointerleave',hideFlowTooltip);
     day.addEventListener('click',e=>showFlowTooltip(day,e));
     day.addEventListener('focus',()=>showFlowTooltip(day));
     day.addEventListener('blur',hideFlowTooltip);
     frag.appendChild(day);
   }
   el.replaceChildren(frag);
   if(atEnd)el.scrollLeft=el.scrollWidth;
   else el.scrollLeft=Math.min(previousScroll,Math.max(0,el.scrollWidth-el.clientWidth));
   flowFirst=false;
   scheduleFlowScale();
 };
 const byDay=new Map();
 let volumeDays=[],volumeFirst=true,volumeLoading=false,volumeRaf=0,volumeSnapshot='',lastVolumeSource='';
 function validVolume(k,value){
   return /^\d{4}-\d{2}-\d{2}$/.test(k)&&k>='2026-11-05'&&k<=nyDay(Date.now())&&
     Number.isSafeInteger(value)&&value>=0;
 }
 function mergeVolume(k,v,priority=0){
   const volume=Number(v);
   if(!validVolume(k,volume))return;
   const previous=byDay.get(k);
   if(!previous||priority>previous.priority||(priority===previous.priority&&volume>previous.volume))
     byDay.set(k,{volume,priority});
 }
 function parseYahooVolume(data){
   const obj=data?.chart?.result?.[0];
   if(!obj||data?.chart?.error||obj.meta?.symbol?.toUpperCase()!=='INJC')throw Error('No INJC daily-volume feed');
   const q=obj.indicators?.quote?.[0],ts=obj.timestamp||[];
   if(!q||!ts.length)throw Error('No dated volume points');
   let added=0;
   ts.forEach((timestamp,i)=>{
     const v=q.volume?.[i],close=q.close?.[i];
     if(v===null||v===undefined||!(Number(close)>0))return;
     const k=nyDay(Number(timestamp)*1000);
     if(validVolume(k,Number(v))){mergeVolume(k,v,2);added++;}
   });
   if(!added)throw Error('No actual dated INJC volume');
   lastVolumeSource='Yahoo Finance · '+tr('dati potenzialmente ritardati','potential delay');
 }
 async function fetchJson(url,timeout=10500){
   const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
   try{
     const response=await fetch(url,{signal:c.signal,cache:'no-store',credentials:'omit',headers:{accept:'application/json'}});
     if(!response.ok)throw Error('HTTP '+response.status);
     return await response.json();
   }finally{clearTimeout(timer);}
 }
 function queueVolumeDraw(){
   if(volumeRaf)return;
   volumeRaf=requestAnimationFrame(()=>{volumeRaf=0;drawVolume();});
 }
 function drawVolume(){
   const scroller=$('etfVolumeHistory'),axis=$('etfVolumeRightAxis');
   const label=$('etfVolumeSourceLabel');
   if(!scroller||!axis)return;
   if(label)label.textContent=lastVolumeSource||tr('In attesa del volume negoziato','Awaiting traded volume');
   const days=volumeDays;
   const usable=days.map((date,i)=>({date,i,volume:byDay.get(date)?.volume??null})).filter(p=>Number.isFinite(p.volume));
   setText('etfVolumeSummary',tr(
     usable.length+' sedute con volume riportato · quantità di quote INJC',
     usable.length+' sessions with reported volume · INJC shares traded'
   ));
   const empty=$('etfVolumeEmpty');
   if(empty)empty.hidden=usable.length>0;
   if(!days.length){scroller.replaceChildren();return;}
   const step=58,pxWidth=Math.max(scroller.clientWidth,days.length*step+30),height=220;
   const plotTop=21,plotBottom=180,plotHeight=plotBottom-plotTop;
   const first=Math.max(0,Math.floor(scroller.scrollLeft/step));
   const end=Math.min(days.length,Math.ceil((scroller.scrollLeft+scroller.clientWidth)/step)+1);
   let peak=0;
   for(let i=first;i<end;i++)peak=Math.max(peak,byDay.get(days[i])?.volume||0);
   const scale=roundTop(peak);
   const rightLabels=axis.querySelectorAll('[data-volume-axis]');
   [scale,scale/2,0].forEach((v,i)=>{if(rightLabels[i])rightLabels[i].textContent=scale?compact(v):(i===2?'0':'—');});
   const x=i=>30+i*step;
   const y=n=>scale>0?plotBottom-n/scale*plotHeight:plotBottom;
   const grid=[plotTop,(plotTop+plotBottom)/2,plotBottom].map(yv=>
     '<line x1="0" y1="'+yv+'" x2="'+pxWidth+'" y2="'+yv+'" stroke="currentColor" stroke-opacity=".11" stroke-dasharray="3 6"/>'
   ).join('');
   const cadence=days.length>24?Math.ceil(days.length/24):1;
   const labels=days.map((d,i)=>i%cadence===0||i===days.length-1
     ?'<text x="'+x(i)+'" y="211" text-anchor="middle" fill="currentColor" opacity=".64" font-size="10">'+dateFmt(d)+'</text>':'').join('');
   let paths='',segments=[],current=[];
   for(let i=0;i<days.length;i++){
     const v=byDay.get(days[i])?.volume;
     if(Number.isFinite(v)){current.push([x(i),y(v)]);}
     else if(current.length){segments.push(current);current=[];}
   }
   if(current.length)segments.push(current);
   const radius=3.5;
   const dots=usable.map(p=>'<circle class="injc-volume-dot" cx="'+x(p.i)+'" cy="'+y(p.volume)+'" r="'+radius+'"/>').join('');
   for(const segment of segments){
     if(segment.length<2)continue;
     const d=segment.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1].toFixed(2)).join(' ');
     const fill=d+' L'+segment.at(-1)[0]+' '+plotBottom+' L'+segment[0][0]+' '+plotBottom+' Z';
     paths+='<path class="injc-volume-fill" d="'+fill+'"/><path class="injc-volume-line" d="'+d+'"/>';
   }
   const html='<svg class="injc-volume-svg" width="'+pxWidth+'" height="'+height+'" viewBox="0 0 '+pxWidth+' '+height+'" role="img" aria-label="'+
     tr('Grafico cronologico dei volumi di quote INJC effettivamente riportati','Chronological reported INJC share trading volume')+
     '" tabindex="0">'+grid+paths+dots+labels+'<g class="injc-volume-cursor" visibility="hidden" pointer-events="none">'+
     '<line class="injc-volume-crosshair" y1="'+plotTop+'" y2="'+plotBottom+'"/>'+
     '<circle class="injc-volume-select-dot" r="6"/></g></svg>';
   const wasAtEnd=volumeFirst||scroller.scrollWidth-scroller.clientWidth-scroller.scrollLeft<82;
   const previousX=scroller.scrollLeft;
   scroller.innerHTML=html;
   const svg=scroller.querySelector('svg'),cursor=svg.querySelector('.injc-volume-cursor');
   const line=cursor.querySelector('line'),dot=cursor.querySelector('circle');
   let selected=-1;
   const tooltip=$('etfVolumeTooltip');
   const update=i=>{
     const p=usable[i];if(!p)return;
     selected=i;cursor.setAttribute('visibility','visible');
     line.setAttribute('x1',x(p.i));line.setAttribute('x2',x(p.i));
     dot.setAttribute('cx',x(p.i));dot.setAttribute('cy',y(p.volume));
     if(tooltip){
       tooltip.querySelector('strong').textContent=number(p.volume)+' '+tr('quote','shares');
       tooltip.querySelector('small').textContent=p.date+' · INJC';
       tooltip.hidden=false;
       tooltip.style.left=Math.max(80,Math.min(scroller.clientWidth-80,x(p.i)-scroller.scrollLeft))+'px';
     }
   };
   const nearest=evt=>{
     const rect=svg.getBoundingClientRect();
     const px=(evt.clientX-rect.left)*pxWidth/Math.max(1,rect.width);
     let k=-1,best=Infinity;
     usable.forEach((p,i)=>{const delta=Math.abs(px-x(p.i));if(delta<best){best=delta;k=i;}});
     if(k>=0&&best<=step*1.3)update(k);
   };
   svg.addEventListener('pointermove',nearest,{passive:true});
   svg.addEventListener('pointerdown',nearest,{passive:true});
   svg.addEventListener('pointerleave',e=>{
     if(e.pointerType==='mouse'){cursor.setAttribute('visibility','hidden');if(tooltip)tooltip.hidden=true;}
   });
   svg.addEventListener('keydown',e=>{
     if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
     e.preventDefault();
     const next=Math.max(0,Math.min(usable.length-1,
       (selected<0?usable.length-1:selected)+(e.key==='ArrowLeft'?-1:1)));
     update(next);
     scroller.scrollLeft=Math.max(0,x(usable[next].i)-scroller.clientWidth*.5);
   });
   svg.addEventListener('blur',()=>{cursor.setAttribute('visibility','hidden');if(tooltip)tooltip.hidden=true;});
   if(wasAtEnd)scroller.scrollLeft=scroller.scrollWidth;
   else scroller.scrollLeft=Math.min(previousX,scroller.scrollWidth-scroller.clientWidth);
   volumeFirst=false;
 }
 async function refreshVolume(){
   if(volumeLoading||document.hidden)return;
   volumeLoading=true;
   try{
     const source='https://proxy.cors.dev/https://query1.finance.yahoo.com/v8/finance/chart/INJC?range=1y&interval=1d&includePrePost=false';
     const results=await Promise.allSettled([
       fetchJson(source,10500),
       fetchJson('./market-data/injc-etf-volume.json?t='+Date.now(),8000),
       fetchJson('./market-data/injc-etf-quotes.json?t='+Date.now(),8000)
     ]);
     if(results[1].status==='fulfilled'){
       const d=results[1].value;
       if(d?.ticker==='INJC'&&Array.isArray(d.sessions)){
         d.sessions.forEach(row=>mergeVolume(row.date,row.volume,1));
         if(d.sessions.length)lastVolumeSource=tr('Storico INJC · feed aggiornato periodicamente','INJC history · periodically refreshed feed');
       }
     }
     if(results[0].status==='fulfilled'){
       try{parseYahooVolume(results[0].value);}catch(_){}
     }
     if(results[2].status==='fulfilled'){
       const d=results[2].value,q=d?.quote;
       if(d?.ticker==='INJC'&&q&&Number.isFinite(Date.parse(q.quoteTime))
           &&Number.isSafeInteger(Number(q.volume))&&Number(q.volume)>=0){
         mergeVolume(nyDay(Date.parse(q.quoteTime)),q.volume,0);
         if(!lastVolumeSource)lastVolumeSource=tr('Snapshot INJC · dati potenzialmente ritardati','INJC snapshot · potential delay');
       }
     }
     const today=nyDay(Date.now()),start=new Date('2026-11-05T12:00:00Z'),keys=[];
     const weekdays=new Set();
     for(let i=0;i<2500&&start.toISOString().slice(0,10)<=today;i++,start.setUTCDate(start.getUTCDate()+1)){
       const day=start.getUTCDay(),key=start.toISOString().slice(0,10);
       if(day!==0&&day!==6)weekdays.add(key);
     }
     volumeDays=[...weekdays].filter(k=>k<=today);
     const signature=volumeDays.join(',')+';'+[...byDay].map(([k,v])=>k+':'+v.volume).join(',');
     if(signature!==volumeSnapshot){volumeSnapshot=signature;drawVolume();}
     else queueVolumeDraw();
   }catch(error){console.warn('INJC traded-volume chart:',error.message);drawVolume();}
   finally{volumeLoading=false;}
 }
 function bind(){
   const fs=$('etfFlowHistory');
   fs?.addEventListener('scroll',()=>{hideFlowTooltip();scheduleFlowScale();},{passive:true});
   $('etfVolumeHistory')?.addEventListener('scroll',queueVolumeDraw,{passive:true});
   if(typeof ResizeObserver==='function'){
     const obs=new ResizeObserver(()=>{scheduleFlowScale();queueVolumeDraw();});
     for(const id of ['etfFlowHistory','etfVolumeHistory'])if($(id))obs.observe($(id));
   }else window.addEventListener('resize',()=>{scheduleFlowScale();queueVolumeDraw()});
   $('etfRefresh')?.addEventListener('click',refreshVolume);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshVolume();});
   window.addEventListener('pageshow',refreshVolume);
   refreshVolume();
   setInterval(()=>{if(!document.hidden)refreshVolume();},120000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();