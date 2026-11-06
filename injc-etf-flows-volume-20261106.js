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
   return (n<0?'-':'')+(unit?unit:'')+Math.abs(value).toLocaleString(lang()==='en'?'en-US':'it-IT',
     {maximumFractionDigits:decimals})+suffix;
 };
 const roundTop=value=>{
   if(!(value>0))return 0;
   const exponent=Math.pow(10,Math.floor(Math.log10(value)));
   const target=value/exponent;
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
 const dailyPrice=new Map();
 const usdPrice=v=>Number.isFinite(v)&&v>0?'$'+v.toLocaleString(lang()==='en'?'en-US':'it-IT',
   {minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 const usdEstimate=v=>Number.isFinite(v)&&v>=0?'$'+v.toLocaleString(lang()==='en'?'en-US':'it-IT',
   {minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 function rememberPrice(date,price,priority=0){
   const n=Number(price),old=dailyPrice.get(date);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(n)||n<=0)return;
   if(!old||priority>=old.priority)dailyPrice.set(date,{price:n,priority});
 }
 let volumeDays=[],volumeFirst=true,volumeLoading=false,volumeRaf=0,volumeSnapshot='',lastVolumeSource='';
 let volumeMode='session',intradayPoints=[],intradaySource='';
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
     if(validVolume(k,Number(v))){mergeVolume(k,v,2);rememberPrice(k,close,2);added++;}
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
 const nyHour=ms=>{
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
     hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
   return (Number(parts.hour)%24)*60+Number(parts.minute);
 };
 const formatNYTime=ms=>new Date(ms).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',
   {timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'});
 function cumulativeVolumeRows(rows){
   const valid=rows.filter(p=>Number.isFinite(p.time)&&Number.isSafeInteger(p.volume)&&p.volume>=0
      &&Number(p.close)>0&&nyHour(p.time)>=570&&nyHour(p.time)<960&&nyDay(p.time)>='2026-11-05')
     .sort((a,b)=>a.time-b.time);
   if(!valid.length)return [];
   const date=nyDay(valid.at(-1).time),points=[];let total=0,lastTime=0;
   for(const p of valid){
     if(nyDay(p.time)!==date||p.time===lastTime)continue;
     lastTime=p.time;total+=p.volume;
     points.push({date,time:p.time,volume:total,price:Number(p.close)});
   }
   return points;
 }
 function snapshotIntraday(json){
   if(json?.ticker!=='INJC'||!Array.isArray(json.points))return [];
   const raw=json.points.filter(p=>p.session==='regular').map(p=>({
     time:Date.parse(p.time),close:p.close,volume:p.volume===null?NaN:Number(p.volume)
   }));
   const points=cumulativeVolumeRows(raw),last=points.at(-1),q=json.quote;
   const time=Date.parse(q?.quoteTime||''),volume=Number(q?.volume);
   if(last&&Number.isFinite(time)&&nyDay(time)===last.date&&nyHour(time)>=570&&nyHour(time)<960
     &&Number.isSafeInteger(volume)&&volume>last.volume){
     const row={date:last.date,time:Math.max(time,last.time),volume,price:Number(q?.price)>0?Number(q.price):last.price};
     if(row.time===last.time)points[points.length-1]=row;
     else points.push(row);
   }
   return points;
 }
 function yahooIntraday(data){
   const o=data?.chart?.result?.[0],q=o?.indicators?.quote?.[0],times=o?.timestamp||[];
   if(!o||o?.meta?.symbol?.toUpperCase()!=='INJC'||!q)return [];
   return cumulativeVolumeRows(times.map((t,i)=>({
     time:Number(t)*1000,close:q.close?.[i],
     volume:q.volume?.[i]===null||q.volume?.[i]===undefined?NaN:Number(q.volume[i])
   })));
 }
 function drawVolume(newData=false){
   const scroller=$('etfVolumeHistory'),axis=$('etfVolumeRightAxis'),empty=$('etfVolumeEmpty');
   if(!scroller||!axis)return;
   const session=volumeMode==='session';
   const pts=session?intradayPoints.map(p=>({...p})):
     volumeDays.map(date=>({date,volume:byDay.get(date)?.volume??null,
       price:dailyPrice.get(date)?.price??null}));
   const source=session?intradaySource:lastVolumeSource;
   setText('etfVolumeSourceLabel',source||tr('In attesa del volume riportato','Awaiting reported volume'));
   const good=pts.map((p,i)=>({...p,i})).filter(p=>Number.isFinite(p.volume));
   if(empty){
     empty.hidden=good.length>0;
     empty.textContent=session?tr('In attesa dei volumi intraday','Awaiting intraday volume')
       :tr('In attesa dello storico dei volumi','Awaiting volume history');
   }
   setText('etfVolumeSummary',session
     ?tr('Volume cumulato nella seduta '+(pts.at(-1)?.date||'—')+' · '+good.length+' punti',
         'Cumulative session volume '+(pts.at(-1)?.date||'—')+' · '+good.length+' points')
     :tr(good.length+' sedute con volume riportato · quote INJC',
         good.length+' sessions with reported volume · INJC shares'));
   if(!pts.length){scroller.replaceChildren();return;}
   const width=Math.max(scroller.clientWidth,
     session?Math.min(5000,Math.max(390,pts.length*24+130)):pts.length*58+130);
   const top=21,bottom=180,plotHeight=bottom-top,previousX=scroller.scrollLeft;
   const atEnd=volumeFirst||scroller.scrollWidth-scroller.clientWidth-previousX<82;
   const earliest=pts[0].time,latest=pts.at(-1).time;
   const leftMargin=66,rightMargin=66;
   const x=i=>session?leftMargin+(pts[i].time-earliest)/Math.max(1,latest-earliest)*(width-leftMargin-rightMargin)
     :width-rightMargin-(pts.length-1-i)*58;
   let max=0;
   good.forEach(p=>{const px=x(p.i);if(px>=previousX-50&&px<=previousX+scroller.clientWidth+50)max=Math.max(max,p.volume);});
   if(!max)max=Math.max(0,...good.map(p=>p.volume));
   const scale=roundTop(max);
   axis.querySelectorAll('[data-volume-axis]').forEach((label,i)=>{
     label.textContent=scale?compact([scale,scale/2,0][i]):(i===2?'0':'—');
   });
   const y=v=>scale>0?bottom-v/scale*plotHeight:bottom;
   const grid=[top,(top+bottom)/2,bottom].map(t=>
     '<line x1="0" y1="'+t+'" x2="'+width+'" y2="'+t+'" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="3 6"/>').join('');
   let lastLabel=-Infinity;
   const dates=pts.map((p,i)=>{
     if(x(i)-lastLabel<75&&i!==pts.length-1)return '';
     lastLabel=x(i);
     return '<text x="'+x(i).toFixed(2)+'" y="210" text-anchor="middle" fill="currentColor" opacity=".67" font-size="10">'+
       (session?formatNYTime(p.time):dateFmt(p.date))+'</text>';
   }).join('');
   const segments=[];let part=[];
   pts.forEach((p,i)=>{if(Number.isFinite(p.volume))part.push([x(i),y(p.volume)]);
     else if(part.length){segments.push(part);part=[];}});
   if(part.length)segments.push(part);
   let shapes='';
   for(const segment of segments){
     if(segment.length<2)continue;
     const d=segment.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
     const fill=d+' L'+segment.at(-1)[0].toFixed(2)+' '+bottom+' L'+segment[0][0].toFixed(2)+' '+bottom+' Z';
     shapes+='<path class="injc-volume-fill" d="'+fill+'"/><path class="injc-volume-line" d="'+d+'"/>';
   }
   const dots=good.map(p=>'<circle class="injc-volume-dot" cx="'+x(p.i).toFixed(2)+
     '" cy="'+y(p.volume).toFixed(2)+'" r="3.5"/>').join('');
   const svg='<svg class="injc-volume-svg'+(newData?' is-new-data':'')+'" width="'+width+
     '" height="220" viewBox="0 0 '+width+' 220" tabindex="0" role="img" aria-label="'+
     tr('Volume delle quote INJC · usa il dito o mouse per vedere i dati','INJC share volume · touch or hover to inspect')+
     '">'+grid+shapes+dots+dates+
     '<g class="injc-volume-cursor" visibility="hidden" pointer-events="none">'+
     '<line class="injc-volume-crosshair" y1="'+top+'" y2="'+bottom+'"/>'+
     '<circle class="injc-volume-select-dot" r="6"/></g></svg>';
   scroller.innerHTML=svg;
   const plot=scroller.querySelector('svg'),cursor=plot.querySelector('.injc-volume-cursor');
   const line=cursor.querySelector('line'),dot=cursor.querySelector('circle');
   const tip=$('etfVolumeTooltip');let selected=-1;
   const select=i=>{
     const p=good[i];if(!p)return;
     selected=i;cursor.setAttribute('visibility','visible');
     line.setAttribute('x1',x(p.i));line.setAttribute('x2',x(p.i));
     dot.setAttribute('cx',x(p.i));dot.setAttribute('cy',y(p.volume));
     if(tip){
       tip.querySelector('strong').textContent=number(p.volume)+' '+tr('quote','shares');
       tip.querySelector('small').textContent=(session?formatNYTime(p.time)+' NY · ':'')+p.date;
       tip.hidden=false;
       tip.style.left=Math.max(80,Math.min(scroller.clientWidth-80,x(p.i)-scroller.scrollLeft))+'px';
     }
   };
   const hover=event=>{
     const rect=plot.getBoundingClientRect(),px=(event.clientX-rect.left)*width/Math.max(1,rect.width);
     let best=Infinity,index=-1;
     good.forEach((p,i)=>{const distance=Math.abs(px-x(p.i));if(distance<best){best=distance;index=i;}});
     if(index>=0)select(index);
   };
   plot.addEventListener('pointermove',hover,{passive:true});
   plot.addEventListener('pointerdown',hover,{passive:true});
   plot.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){
     cursor.setAttribute('visibility','hidden');if(tip)tip.hidden=true;
   }});
   plot.addEventListener('keydown',event=>{
     if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
     event.preventDefault();
     const next=Math.max(0,Math.min(good.length-1,(selected<0?good.length-1:selected)+(event.key==='ArrowLeft'?-1:1)));
     select(next);scroller.scrollLeft=Math.max(0,x(good[next].i)-scroller.clientWidth*.5);
   });
   plot.addEventListener('blur',()=>{cursor.setAttribute('visibility','hidden');if(tip)tip.hidden=true;});
   if(atEnd)scroller.scrollLeft=scroller.scrollWidth;
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
       fetchJson('./market-data/injc-etf-quotes.json?t='+Date.now(),8000),
       fetchJson('https://proxy.cors.dev/https://query1.finance.yahoo.com/v8/finance/chart/INJC?range=5d&interval=5m&includePrePost=false',10500)
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
     let snapshotPts=[];
     if(results[2].status==='fulfilled'){
       const d=results[2].value,q=d?.quote;
       snapshotPts=snapshotIntraday(d);
       if(d?.ticker==='INJC'&&q&&Number.isFinite(Date.parse(q.quoteTime))
           &&Number.isSafeInteger(Number(q.volume))&&Number(q.volume)>=0){
         mergeVolume(nyDay(Date.parse(q.quoteTime)),q.volume,0);
         if(!lastVolumeSource)lastVolumeSource=tr('Snapshot INJC · dati potenzialmente ritardati','INJC snapshot · potential delay');
       }
     }
     let yahooPts=[];
     if(results[3].status==='fulfilled')yahooPts=yahooIntraday(results[3].value);
     if(yahooPts.length>=2&&yahooPts.at(-1).date>=(snapshotPts.at(-1)?.date||'')){
       intradayPoints=yahooPts;
       intradaySource=tr('Volumi intraday Yahoo · feed potenzialmente ritardato','Yahoo intraday volumes · potentially delayed');
     }else if(snapshotPts.length){
       intradayPoints=snapshotPts;
       intradaySource=tr('Volumi intraday snapshot · feed potenzialmente ritardato','Intraday snapshot volume · potentially delayed');
     }else if(yahooPts.length){
       intradayPoints=yahooPts;
       intradaySource=tr('Volumi intraday Yahoo · feed potenzialmente ritardato','Yahoo intraday volumes · potentially delayed');
     }
     const today=nyDay(Date.now()),start=new Date('2026-11-05T12:00:00Z'),keys=[];
     const weekdays=new Set();
     for(let i=0;i<2500&&start.toISOString().slice(0,10)<=today;i++,start.setUTCDate(start.getUTCDate()+1)){
       const day=start.getUTCDay(),key=start.toISOString().slice(0,10);
       if(day!==0&&day!==6)weekdays.add(key);
     }
     volumeDays=[...weekdays].filter(k=>k<=today);
     const signature=volumeMode+';'+volumeDays.join(',')+';'+[...byDay].map(([k,v])=>k+':'+v.volume).join(',')+
       ';'+intradayPoints.map(p=>p.time+':'+p.volume).join(',');
     if(signature!==volumeSnapshot){volumeSnapshot=signature;drawVolume(true);}
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
   document.querySelectorAll('[data-injc-volume-mode]').forEach(button=>{
     button.addEventListener('click',()=>{
       const mode=button.dataset.injcVolumeMode;
       if(mode!=='session'&&mode!=='history')return;
       volumeMode=mode;volumeFirst=true;
       document.querySelectorAll('[data-injc-volume-mode]').forEach(b=>{
         const active=b===button;b.classList.toggle('active',active);
         b.setAttribute('aria-pressed',String(active));
       });
       drawVolume(true);
     });
   });
   $('etfRefresh')?.addEventListener('click',refreshVolume);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshVolume();});
   window.addEventListener('pageshow',refreshVolume);
   refreshVolume();
   setInterval(()=>{if(!document.hidden)refreshVolume();},120000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
})();