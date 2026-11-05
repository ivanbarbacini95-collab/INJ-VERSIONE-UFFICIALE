/* INJ Node · Pro native UTC-day chart untouched. Lite offers authentic
   INJ OHLC chart types and 1H / 1D / 1W / 1M / 1Y windows. */
(()=>{
 'use strict';
 if(document.documentElement.dataset.injPage!=='index')return;
 const root=document.documentElement;
 const get=id=>document.getElementById(id);
 const SVG='http://www.w3.org/2000/svg';
 const HOUR=3600000,DAY=86400000,WEEK=7*DAY;
 const PERIODS={
   '1h':{span:HOUR,step:3*60000,interval:'3m',short:'1H'},
   '1d':{span:DAY,step:30*60000,interval:'30m',short:'1D'},
   '1w':{span:WEEK,step:4*HOUR,interval:'4h',short:'1W'},
   '1mo':{span:30*DAY,step:DAY,interval:'1d',short:'1M'},
   '1y':{span:365*DAY,step:WEEK,interval:'1w',short:'1Y'}
 };
 const sources=Object.fromEntries(Object.keys(PERIODS).map(key=>[key,{rows:[],updatedAt:0,lastAttempt:0,loading:false}]));
 let period='1w',chartType='line';
 try{
   const saved=JSON.parse(localStorage.getItem('inj_lite_chart_prefs_v1')||'null');
   if(PERIODS[saved?.period])period=saved.period;
   if(['line','candles'].includes(saved?.type))chartType=saved.type;
 }catch(_){}
 let source=sources[period];
 let lastPrice=NaN,lastGlow=0,lightSvg=null,proSvg=null,lastQuoteRead=NaN;
 let candleHalo=null,candleDot=null,markerSvg=null;
 let pending=false;
 const asNumber=x=>Number(x);
 const format=(x,d=4)=>new Intl.NumberFormat('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}).format(x);
 const isVisible=()=>document.visibilityState!=='hidden' && get('entryGate')?.classList.contains('visible');
 const realPrice=()=>{
   const el=get('entryMarketPrice');
   const n=Number(el?.dataset.entryNumericValue);
   return el?.dataset.entryNumericValue!==undefined&&Number.isFinite(n)&&n>0?n:NaN;
 };
 const node=(tag,attrs={})=>{
   const el=document.createElementNS(SVG,tag);
   for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
   return el;
 };
 const put=(id,value)=>{
   const el=get(id);if(el&&el.textContent!==String(value))el.textContent=String(value);
 };
 function ensureChart(stage,id){
   if(!stage)return null;
   let el=get(id);
   if(!el){
     el=node('svg',{id,viewBox:'0 0 320 150',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});
     stage.appendChild(el);
   }
   return el;
 }
 async function refreshCandles(force=false){
   const now=Date.now(),key=period,config=PERIODS[key],target=sources[key];
   if(target.loading||!isVisible())return;
   if(!force&&now-target.lastAttempt<60000)return;
   target.lastAttempt=now;target.loading=true;
   try{
     const earliest=now-config.span-config.step*2;
     const url='https://api.binance.com/api/v3/klines?symbol=INJUSDT&interval='+
       encodeURIComponent(config.interval)+'&startTime='+earliest+'&endTime='+now+'&limit=500';
     const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10500)});
     if(!response.ok)throw new Error('OHLC '+response.status);
     const data=await response.json();
     if(!Array.isArray(data))throw new Error('OHLC response not an array');
     const rows=data.map(c=>{
       const [t,o,h,l,z]=c;
       return{t:Number(t),o:Number(o),h:Number(h),l:Number(l),c:Number(z)};
     }).filter(c=>Number.isFinite(c.t)&&c.t>0&&c.o>0&&c.c>0&&
       c.h>=Math.max(c.o,c.c)&&c.l>0&&c.l<=Math.min(c.o,c.c))
       .sort((a,b)=>a.t-b.t);
     if(rows.length>=2){target.rows=rows;target.updatedAt=Date.now();}
   }catch(error){
     if(!target.rows.length){
       console.warn('INJ Node Lite '+key+' OHLC unavailable:',error);
       if(period===key)put('injLightLive','OFFLINE');
     }
   }finally{
     target.loading=false;
     if(period===key)schedule();
   }
 }
  function aggregate(rows,interval){
   const groups=[];
   for(const bar of rows){
     const stamp=Math.floor(bar.t/interval)*interval;
     const last=groups[groups.length-1];
     if(last&&last.t===stamp){
       last.h=Math.max(last.h,bar.h);
       last.l=Math.min(last.l,bar.l);
       last.c=bar.c;
     }else groups.push({t:stamp,o:bar.o,h:bar.h,l:bar.l,c:bar.c});
   }
   return groups;
 }
 function getCandles(now){
   if(!source.rows.length)return[];
   const config=PERIODS[period],start=now-config.span;
   const bars=source.rows.filter(c=>c.t+config.step>start&&c.t<=now).map(c=>({...c}));
   if(!bars.length)return[];
   // Completed OHLC bars are immutable; only the unfinished candle
   // incorporates the app's already-shared spot quote.
   const quote=realPrice(),last=bars[bars.length-1];
   if(now>=last.t&&now<last.t+config.step&&Number.isFinite(quote)){
     last.c=quote;last.h=Math.max(last.h,quote);last.l=Math.min(last.l,quote);
   }
   return bars;
 }
  function geometry(bars,now){
   const config=PERIODS[period],x0=5,x1=284,from=now-config.span,to=now;
   const highs=bars.map(c=>c.h),lows=bars.map(c=>c.l);
   const rawMax=Math.max(...highs),rawMin=Math.min(...lows);
   const rawSpan=rawMax-rawMin;
   const padding=Math.max(rawSpan*.18,((rawMax+rawMin)/2)*.0025);
   const min=Math.max(1e-9,rawMin-padding);
   const max=rawMax+padding;
   const top=10,bottom=140;
   const y=price=>bottom-((price-min)/(max-min))*(bottom-top);
   // The 7-day time domain continuously moves with the clock.
   // Keep past hourly samples at their genuine timestamps; the live point
   // follows the clock until the current hour has completed.
   const center=bar=>{
     const at=Math.min(bar.t+config.step,now);
     return x0+(at-from)/(to-from)*(x1-x0);
   };
   return{min,max,top,bottom,x0,x1,from,to,y,center};
 }
 function svgContent(svg,bars,geo){
   if(!svg)return;
   const pts=bars.map(bar=>({
     x:Math.min(geo.x1,Math.max(geo.x0,geo.center(bar))),
     y:Math.max(geo.top,Math.min(geo.bottom,geo.y(bar.c))),
     t:bar.t
   })).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
   const frag=document.createDocumentFragment();
   if(chartType==='candles'){
     // Consistent candle slot based on exchange interval, not on a
      // partially formed last bar whose timestamp hugs the prior close.
      const slot=(geo.x1-geo.x0)*PERIODS[period].step/PERIODS[period].span;
      const width=Math.min(8.5,Math.max(2.3,slot*.72));
     for(const bar of bars){
       const x=Math.max(geo.x0,Math.min(geo.x1,geo.center(bar)));
       const cls=bar.c>=bar.o?'inj-candle-up':'inj-candle-down';
       const yo=geo.y(bar.o),yc=geo.y(bar.c);
       frag.appendChild(node('line',{
         x1:x.toFixed(3),x2:x.toFixed(3),
         y1:geo.y(bar.h).toFixed(3),y2:geo.y(bar.l).toFixed(3),
         class:'inj-candle-wick '+cls
       }));
       frag.appendChild(node('rect',{
         x:(x-width/2).toFixed(3),y:Math.min(yo,yc).toFixed(3),
         width:width.toFixed(3),height:Math.max(1.15,Math.abs(yc-yo)).toFixed(3),rx:'.35',
         class:'inj-candle-body '+cls
       }));
     }
     svg.replaceChildren(frag);
     svg.setAttribute('data-inj-points',String(bars.length));
     return;
   }
   let segment=[];
   const flush=()=>{
     if(segment.length<2){segment=[];return;}
     const first=segment[0],last=segment[segment.length-1];
     const line='M'+segment.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3)).join(' L');
     const area=line+' L'+last.x.toFixed(3)+','+geo.bottom+
       ' L'+first.x.toFixed(3)+','+geo.bottom+' Z';
     frag.appendChild(node('path',{d:area,class:'inj-six-hour-line-area'}));
     frag.appendChild(node('path',{d:line,class:'inj-six-hour-line-path'}));
     segment=[];
   };
   pts.forEach((point,i)=>{
     if(i>0&&point.t-pts[i-1].t>PERIODS[period].step*1.5)flush();
     segment.push(point);
   });
   flush();
   svg.replaceChildren(frag);
   svg.setAttribute('data-inj-points',String(pts.length));
 }
 function paintPriceAxis(geo,price,last){
   const plot=get('injLightChartPlot');
   if(!plot)return;
   const labels=[
     {id:'injLightPriceHigh',y:geo.top},
     {id:'injLightPriceMid',y:(geo.top+geo.bottom)/2},
     {id:'injLightPriceLow',y:geo.bottom}
   ];
   for(const item of labels){
     const el=get(item.id);if(!el)continue;
     el.hidden=false;
     el.style.top=(item.y/150*100)+'%';
     put(item.id,format(geo.min+(geo.max-geo.min)*(geo.bottom-item.y)/(geo.bottom-geo.top),3));
   }
   const now=get('injLightPriceNow');
   if(now){
     const y=Math.max(10,Math.min(140,geo.y(price)));
     now.hidden=false;
     now.style.top=(y/150*100)+'%';
     put('injLightPriceNow',format(price,4));
     // Same vertical coordinate as the right-hand live-price chip.
     const guide=get('injLiteCurrentPriceGuide');
     if(guide){guide.hidden=false;guide.style.top=(y/150*100)+'%';}
     labels.forEach(t=>{
       const el=get(t.id);if(el)el.hidden=Math.abs(y-t.y)<15;
     });
   }
   const graphic=lightSvg;
   if(graphic)graphic.setAttribute('aria-label','INJ/USDT · '+PERIODS[period].short+' · '+chartType+' · '+format(price,4));
 }

 // Keep interactive inspection independent of the automatically refreshed
 // line. Pointer/touch events are bound once to the overlay.
 const views={light:{active:false,bars:[],geo:null,selected:-1,hideTimer:0,layer:null},
              pro:{active:false,bars:[],geo:null,selected:-1,hideTimer:0,layer:null}};
 function dayLabel(timestamp){
   const locale=document.documentElement.lang==='en'?'en-US':'it-IT';
   const opts=['1h','1d'].includes(period)?{hour:'2-digit',minute:'2-digit'}:
     period==='1y'?{month:'short',year:'2-digit'}:{day:'2-digit',month:'short'};
   return new Intl.DateTimeFormat(locale,opts).format(new Date(timestamp));
 }
 function updateLightTimeline(now,geo){
   ['injLightTime0','injLightTime1','injLightTime2','injLightTime3'].forEach((id,n)=>{
     const el=get(id);if(!el)return;
     const fraction=n/3,t=geo.from+fraction*(geo.to-geo.from);
     put(id,dayLabel(t));
     const x=geo.x0+fraction*(geo.x1-geo.x0);
     el.style.left=(x/320*100)+'%';
   });
 }
   function proPriceAxis(stage,geo,price){
   if(!stage)return;
   let axis=get('injProPriceAxis');
   if(!axis){
     axis=document.createElement('div');
     axis.id='injProPriceAxis';
     axis.className='inj-pro-price-axis';
     axis.setAttribute('aria-hidden','true');
     axis.innerHTML='<span id="injProPriceHigh" class="inj-pro-price-tick"></span>'+
       '<span id="injProPriceMid" class="inj-pro-price-tick"></span>'+
       '<span id="injProPriceLow" class="inj-pro-price-tick"></span>'+
       '<span id="injProPriceNow" class="inj-pro-price-now"></span>';
     stage.appendChild(axis);
   }
   const levels=[
    {id:'injProPriceHigh',y:geo.top},
    {id:'injProPriceMid',y:(geo.top+geo.bottom)/2},
    {id:'injProPriceLow',y:geo.bottom}
   ];
   const y=Math.max(geo.top,Math.min(geo.bottom,geo.y(price)));
   for(const item of levels){
     const el=get(item.id);
     put(item.id,format(geo.min+(geo.max-geo.min)*(geo.bottom-item.y)/(geo.bottom-geo.top),3));
     el.style.top=(item.y/150*100)+'%';
     el.hidden=Math.abs(y-item.y)<14;
   }
   const current=get('injProPriceNow');
   put('injProPriceNow',format(price,4));
   current.style.top=(y/150*100)+'%';
   current.hidden=false;
 }
 function clearProAxis(){
   const axis=get('injProPriceAxis');
   if(axis)axis.hidden=true;
 }
 function selectionMarkup(){
   return '<span class="inj-candle-inspect-line" aria-hidden="true"></span>'+
          '<span class="inj-candle-inspect-point" aria-hidden="true"></span>'+
          '<span class="inj-candle-inspect-tooltip" aria-live="off"></span>';
 }
 function showCandleInspection(mode,index){
   const v=views[mode];
   if(!v.layer||!v.bars.length||!v.geo)return;
   const safe=Math.max(0,Math.min(v.bars.length-1,index));
   const c=v.bars[safe],x=Math.min(v.geo.x1,Math.max(v.geo.x0,v.geo.center(c)));
   const y=Math.max(v.geo.top,Math.min(v.geo.bottom,v.geo.y(c.c)));
   const line=v.layer.querySelector('.inj-candle-inspect-line');
   const dot=v.layer.querySelector('.inj-candle-inspect-point');
   const tip=v.layer.querySelector('.inj-candle-inspect-tooltip');
   const percent=x/320*100;
   line.style.left=percent+'%';
   dot.style.left=percent+'%';
   dot.style.top=(y/150*100)+'%';
   tip.style.left=Math.max(21,Math.min(79,percent))+'%';
   // Read only the real price at the selected point.
   // Keep the tooltip compact: no time, no OHLC labels.
   tip.textContent=format(c.c,4)+' USDT';
   v.selected=safe;
   v.layer.classList.add('is-inspecting');
 }
 function nearestCandle(mode,clientX){
   const v=views[mode];
   const rect=v.layer.getBoundingClientRect();
   if(!(rect.width>0)||!v.bars.length)return -1;
   const x=Math.max(0,Math.min(320,(clientX-rect.left)/rect.width*320));
   let nearest=0,dist=Infinity;
   v.bars.forEach((bar,i)=>{
     const next=Math.abs(v.geo.center(bar)-x);
     if(next<dist){dist=next;nearest=i;}
   });
   return nearest;
 }
 function hideInspection(mode,delay=0){
   const v=views[mode];clearTimeout(v.hideTimer);
   const close=()=>{v.active=false;v.selected=-1;v.layer?.classList.remove('is-inspecting')};
   if(delay)v.hideTimer=window.setTimeout(close,delay);
   else close();
 }
 function bindCandleInteraction(stage,mode){
   const v=views[mode];
   if(!stage)return;
   let layer=v.layer;
   if(!layer){
     layer=document.createElement('div');
     layer.className='inj-candle-interaction inj-candle-interaction-'+mode;
     layer.setAttribute('role','group');
     layer.setAttribute('tabindex','0');
     layer.setAttribute('aria-label','Esplora il grafico: tocca, trascina o usa le frecce per leggere il prezzo selezionato');
     layer.innerHTML=selectionMarkup();
     stage.appendChild(layer);
     v.layer=layer;
     const inspect=event=>{
       event.stopPropagation();
       if(!v.bars.length)return;
       const idx=nearestCandle(mode,event.clientX);
       if(idx<0)return;
       clearTimeout(v.hideTimer);
       v.active=true;
       showCandleInspection(mode,idx);
     };
     layer.addEventListener('pointerdown',event=>{
       if(event.pointerType==='mouse'&&event.button!==0)return;
       inspect(event);
       if(event.pointerType==='mouse')try{layer.setPointerCapture(event.pointerId)}catch(_){}
     });
     layer.addEventListener('pointermove',event=>{
       if(event.pointerType==='mouse'||v.active)inspect(event);
     });
     layer.addEventListener('pointerup',event=>{
       event.stopPropagation();
       hideInspection(mode,event.pointerType==='mouse'?1500:2500);
     });
     layer.addEventListener('pointercancel',()=>hideInspection(mode));
     layer.addEventListener('pointerleave',()=>hideInspection(mode,450));
     layer.addEventListener('keydown',event=>{
       if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight'&&event.key!=='Escape')return;
       event.stopPropagation();
       if(event.key==='Escape'){hideInspection(mode);return;}
       event.preventDefault();
       clearTimeout(v.hideTimer);
       v.active=true;
       const delta=event.key==='ArrowRight'?1:-1;
       const current=v.selected<0?v.bars.length-1:v.selected;
       showCandleInspection(mode,current+delta);
     });
   }
 }
 function updateInspection(mode,bars,geo){
   const v=views[mode];v.bars=bars;v.geo=geo;
   if(v.active&&v.selected>=0&&v.selected<bars.length)showCandleInspection(mode,v.selected);
 }
 function clearChart(light){
   const stage=get(light?'injLightChartPlot':'entrySparkStage');
   if(stage){delete stage.dataset.injCandlesReady;delete stage.dataset.injLineReady;}
   if(light){
     ['injLightPriceHigh','injLightPriceMid','injLightPriceLow','injLightPriceNow','injLiteCurrentPriceGuide'].forEach(id=>{const el=get(id);if(el)el.hidden=true;});
     put('injLightPerf6h','— · '+PERIODS[period].short);
     put('injLightLive','SYNC');
     hideInspection('light');
     get('injLightLineSvg')?.replaceChildren();
     get('injLightLineMarkerSvg')?.replaceChildren();
     candleHalo=null;candleDot=null;
   }else{
     clearProAxis();
     hideInspection('pro');
   }
 }
 function render(){
   if(!isVisible()||!source.rows.length)return;
   const now=Date.now();
   const proStage=get('entrySparkStage'),lightStage=get('injLightChartPlot');
   const lite=getCandles(now);
   if(lightStage)lightStage.dataset.chartType=chartType;
   // Pro Home: restore the existing app.js SVG line. That original renderer
   // owns the real 00:00-24:00 UTC timeline, streaming updates, vertical
   // autoscale, touch inspection and day rollover. Do not overlay it.
   if(proStage){
     delete proStage.dataset.injCandlesReady;
     proStage.querySelector('#injProCandleSvg')?.remove();
     proStage.querySelector('.inj-candle-interaction-pro')?.remove();
     proStage.querySelector('#injProPriceAxis')?.remove();
   }
   if(!lightStage||lite.length<2){clearChart(true);return;}
   lightSvg=ensureChart(lightStage,'injLightLineSvg');
   const geo=geometry(lite,now);
   svgContent(lightSvg,lite,geo);
   updateLightTimeline(now,geo);
   bindCandleInteraction(lightStage,'light');
   updateInspection('light',lite,geo);
   // Keep the live-dot SVG outside the repeatedly redrawn candle scene.
   // Animations finish naturally even if the quote updates several times.
   markerSvg=ensureChart(lightStage,'injLightLineMarkerSvg');
   markerSvg.style.display=chartType==='candles'?'none':'';
   if(!candleHalo || candleHalo.ownerSVGElement!==markerSvg){
     // The marker SVG stretches to the chart size (preserveAspectRatio:none).
     // Its circles previously became ovals on tall mobile screens. Ellipses
     // with separately calibrated radii draw perfectly round CSS-pixel dots.
     candleHalo=node('ellipse',{rx:8,ry:8,class:'inj-candle-last-halo'});
     candleDot=node('ellipse',{rx:2.1,ry:2.1,class:'inj-candle-last-dot'});
     markerSvg.replaceChildren(candleHalo,candleDot);
     candleHalo.addEventListener('animationend',event=>event.currentTarget.classList.remove('is-pulsing'));
   }
   // Always size the center and halo in REAL screen pixels. Recalibrate
   // whenever chart bounds change; keep the soft glow animation untouched.
   const markerRect=markerSvg.getBoundingClientRect();
   if(markerRect.width>0&&markerRect.height>0){
     const unitsPerPxX=320/markerRect.width;
     const unitsPerPxY=150/markerRect.height;
     const size=(element,radiusPx)=>{
       element.setAttribute('rx',(radiusPx*unitsPerPxX).toFixed(4));
       element.setAttribute('ry',(radiusPx*unitsPerPxY).toFixed(4));
     };
     size(candleDot,2.1);   // crisp, 4.2px circular core
     size(candleHalo,8);    // existing understated 16px glow
   }
   const latest=lite[lite.length-1];
   const latestX=Math.min(geo.x1,Math.max(geo.x0,geo.center(latest)));
   const latestY=geo.y(latest.c);
   for(const el of [candleHalo,candleDot]){
     el.setAttribute('cx',latestX.toFixed(3));
     el.setAttribute('cy',latestY.toFixed(3));
   }
   const first=lite[0];
   const perf=first.o>0?(latest.c/first.o-1)*100:0;
   const direction=perf>1e-10?'positive':perf< -1e-10?'negative':'neutral';
   lightStage.dataset.performance=direction;
   // Exchange-backed OHLC chart ready.
   lightStage.dataset.injLineReady='true';
   const change=get('injLightPerf6h');
   if(change){
     const label=(perf>0?'+':'')+perf.toLocaleString(root.lang==='en'?'en-US':'it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'% · '+PERIODS[period].short;
     put('injLightPerf6h',label);
     change.classList.toggle('positive',direction==='positive');
     change.classList.toggle('negative',direction==='negative');
   }
   paintPriceAxis(geo,latest.c,latest);
   put('injLightLive','LIVE');
   if(Number.isFinite(lastPrice)&&lastPrice!==latest.c&&candleHalo&&document.documentElement.dataset.injViewMode==='light'){
     const time=performance.now();
     if(time-lastGlow>1050&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
       candleHalo.classList.add('is-pulsing');
       lastGlow=time;
     }
   }
   lastPrice=latest.c;
 }
 function schedule(){
   if(pending)return;
   pending=true;
   requestAnimationFrame(()=>{pending=false;render();});
 }
 function syncChartControls(){
   const controls=get('injLiteChartControls'),en=root.lang==='en';
   const labels={
     '1h':['ULTIMA ORA','LAST HOUR'],'1d':['ULTIME 24 ORE','LAST 24 HOURS'],
     '1w':['ULTIMI 7 GIORNI','LAST 7 DAYS'],'1mo':['ULTIMI 30 GIORNI','LAST 30 DAYS'],
     '1y':['ULTIMI 365 GIORNI','LAST 365 DAYS']
   };
   put('injLiteChartSub','INJ / USDT · '+labels[period][en?1:0]);
   controls?.querySelectorAll('[data-lite-chart-type]').forEach(el=>{
     el.setAttribute('aria-pressed',String(el.dataset.liteChartType===chartType));
   });
   controls?.querySelectorAll('[data-lite-chart-timeframe]').forEach(el=>{
     el.setAttribute('aria-pressed',String(el.dataset.liteChartTimeframe===period));
   });
 }
 function bootChartControls(){
   const controls=get('injLiteChartControls');
   if(!controls)return;
   controls.addEventListener('click',event=>{
     const selected=event.target.closest('button[data-lite-chart-type],button[data-lite-chart-timeframe]');
     if(!selected||!controls.contains(selected))return;
     const requested=selected.dataset.liteChartTimeframe,type=selected.dataset.liteChartType;
     const nextPeriod=requested&&PERIODS[requested]?requested:period;
     const nextType=['line','candles'].includes(type)?type:chartType;
     if(nextPeriod===period&&nextType===chartType)return;
     const periodChanged=nextPeriod!==period;
     period=nextPeriod;chartType=nextType;source=sources[period];
     try{localStorage.setItem('inj_lite_chart_prefs_v1',JSON.stringify({period,type:chartType}));}catch(_){}
     if(periodChanged){
       clearChart(true);lastPrice=NaN;
       put('injLightLive',source.rows.length?'LIVE':'SYNC');
       void refreshCandles(true);
     }
     syncChartControls();schedule();
   });
   syncChartControls();
   window.addEventListener('injnode:languagechange',()=>{syncChartControls();schedule()});
 }
 function boot(){
   bootChartControls();
   const litePlot=get('injLightChartPlot');
   if(litePlot && typeof ResizeObserver==='function'){
     // Recalibrate after Pro → Lite and on device rotation.
     new ResizeObserver(schedule).observe(litePlot);
   }
   window.addEventListener('resize',schedule,{passive:true});
   const price=get('entryMarketPrice');
   if(price)new MutationObserver(schedule).observe(price,{
     subtree:true,childList:true,characterData:true,attributes:true,
     attributeFilter:['data-entry-numeric-value','data-entry-rendered-value','class']
   });
   const gate=get('entryGate');
   if(gate)new MutationObserver(()=>{
     if(isVisible())void refreshCandles();
     schedule();
   }).observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
   document.addEventListener('visibilitychange',()=>{
     if(document.visibilityState==='visible'){void refreshCandles(true);schedule();}
   });
   window.addEventListener('pageshow',()=>{void refreshCandles(true);schedule()});
   window.addEventListener('online',()=>{void refreshCandles(true)});
   window.addEventListener('injnode:viewmodechange',schedule);
   window.setInterval(()=>{void refreshCandles();schedule()},10000);
   void refreshCandles(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
