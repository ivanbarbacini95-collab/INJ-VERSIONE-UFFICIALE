/* INJ Node Light · standalone Home UI bound to the existing Pro data source.
   No dummy values, duplicate APIs, cloned app state or second chart clock. */
(()=>{
 'use strict';
 const root=document.documentElement;
 if(root.dataset.injPage!=='index')return;
 const gate=document.getElementById('entryGate');
 const shell=gate&&gate.querySelector('.entry-gate-shell');
 if(!gate||!shell)return;
 if(document.getElementById('injLightHome'))return;
 const light=document.createElement('section');
 light.id='injLightHome';
 light.hidden=true;
 light.setAttribute('aria-label','INJ Node Lite');
 light.innerHTML=
  '<div class="inj-light-screen">'+
    '<header class="inj-light-header">'+
      '<div><h1 class="inj-light-brand">INJ <span>Node</span></h1><small class="inj-light-kicker">INJECTIVE PORTFOLIO</small></div>'+
      '<button id="injLightModeToggle" type="button" aria-label="Passa a Pro">'+
        '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>'+
        '<span>LITE</span><span aria-hidden="true">⌄</span></button>'+
    '</header>'+
    '<div class="inj-light-walletbar"><button id="injLightWalletToggle" type="button" aria-haspopup="dialog" aria-controls="injLightWalletSheet">'+
       '<span class="inj-light-wallet-copy"><span class="inj-light-eyebrow" data-light-it="WALLET SELEZIONATO" data-light-en="SELECTED WALLET">WALLET SELEZIONATO</span>'+
       '<span id="injLightAddress" class="inj-light-address private">—</span></span>'+
       '<span class="inj-light-wallet-chevron" aria-hidden="true">⌄</span></button><i class="inj-light-status" aria-hidden="true"></i></div>'+
    '<div class="inj-light-values">'+
      '<div><span class="inj-light-eyebrow" data-light-it="INJ DETENUTI" data-light-en="INJ HOLDINGS">INJ DETENUTI</span>'+
      '<p class="inj-light-value private"><span id="injLightHoldings">—</span> <small>INJ</small></p>'+
      '<small class="inj-light-meta" data-light-it="Totale wallet" data-light-en="Wallet total">Totale wallet</small></div>'+
      '<div><span class="inj-light-eyebrow" data-light-it="PREZZO INJ" data-light-en="INJ PRICE">PREZZO INJ</span>'+
      '<div id="injLightPriceRow" class="inj-light-price-row">'+
        '<p id="injLightPrice" class="inj-light-value">—</p>'+
        '<span id="injLightPriceArrow" class="inj-light-price-arrow" aria-hidden="true">'+
          '<svg viewBox="0 0 20 20" focusable="false"><path d="M10 16V4M5.25 8.75 10 4l4.75 4.75"/></svg>'+
        '</span></div>'+
      '<small id="injLightChange" class="inj-light-meta">— · 24H</small></div>'+
    '</div>'+
    '<section class="inj-light-chart"><div class="inj-light-chart-head">'+
       '<h2 data-light-it="Andamento INJ" data-light-en="INJ price movement">Andamento INJ</h2>'+ 
       '<span class="inj-light-6h-performance" id="injLightPerf6h" aria-live="off">— · 1W</span>'+
       '<span class="inj-light-live"><i aria-hidden="true"></i><span id="injLightLive">SYNC</span></span></div>'+
       '<p class="inj-light-chart-sub" data-light-it="INJ / USDT · ULTIMI 7 GIORNI" data-light-en="INJ / USDT · ROLLING 7 DAYS">INJ / USDT · ULTIMI 7 GIORNI</p>'+
       '<div id="injLightChartPlot" class="inj-light-chart-plot">'+
          '<svg viewBox="0 0 320 150" preserveAspectRatio="none" role="img" aria-label="Grafico settimanale a linee del prezzo INJ">'+
          '<g class="inj-light-grid"><path d="M0 24H320M0 72H320M0 120H320"/></g>'+
          '<path id="injLightGraphArea" d=""/><path id="injLightGraphLine" d=""/>'+
          '<circle id="injLightGraphHalo" cx="0" cy="0" r="9" visibility="hidden"/>'+ 
          '<circle id="injLightGraphDot" cx="0" cy="0" r="3.5" visibility="hidden"/></svg>'+
          '<div class="inj-light-price-axis" aria-hidden="true">'+
            '<span class="inj-light-price-tick" id="injLightPriceHigh" hidden>—</span>'+
            '<span class="inj-light-price-tick" id="injLightPriceMid" hidden>—</span>'+
            '<span class="inj-light-price-tick" id="injLightPriceLow" hidden>—</span>'+
            '<span class="inj-light-price-now" id="injLightPriceNow" hidden>—</span>'+
          '</div>'+
       '</div>'+
       '<div class="inj-light-axis" id="injLightTimeAxis" aria-label="Orari del grafico, ora locale">'+
         '<span id="injLightTime0">—</span><span id="injLightTime1">—</span>'+
         '<span id="injLightTime2">—</span><span id="injLightTime3">—</span></div>'+
    '</section>'+
    '<section class="inj-light-reward"><div class="inj-light-reward-head">'+
      '<span class="inj-light-eyebrow" data-light-it="REWARD MATURATI" data-light-en="ACCRUED REWARDS">REWARD MATURATI</span>'+
      '<span>STAKING</span></div>'+
      '<div class="inj-light-reward-values"><strong class="private" id="injLightRewardText"><span id="injLightReward">—</span> <small>INJ</small></strong>'+
      '<strong id="injLightRewardFiat" class="private">—</strong></div>'+
      '<small class="inj-light-reward-note" data-light-it="Controvalore al prezzo corrente" data-light-en="Value at the current market price">Controvalore al prezzo corrente</small>'+
    '</section>'+
    '<footer class="inj-light-footer">INJ NODE / LITE EXPERIENCE</footer>'+
  '</div>'+
  '<div id="injLightWalletSheet" role="dialog" aria-modal="true" aria-label="Seleziona wallet" hidden>'+
    '<div class="inj-light-wallet-panel"><div class="inj-light-wallet-panel-head"><h2 id="injLightWalletHeading">Seleziona wallet</h2>'+
    '<button id="injLightWalletClose" type="button" aria-label="Chiudi">×</button></div>'+
    '<div id="injLightWalletOptions"></div></div></div>';
 document.body.appendChild(light);
 const $=id=>document.getElementById(id);
 const source=id=>$(id);
 const output=(id,val)=>{const el=$(id);if(el&&el.textContent!==val)el.textContent=val};
 const readText=id=>{
   const el=source(id);
   return el ? (el.dataset.entryRenderedValue||el.textContent||'—').trim() : '—';
 };
 const readNum=id=>{
   const raw=source(id)?.dataset.entryNumericValue;
   const n=raw===undefined?NaN:Number(raw);
   return Number.isFinite(n)?n:NaN;
 };
 const english=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'||root.lang==='en'}catch(_){return root.lang==='en'}};
 const locale=()=>english()?'en-US':'it-IT';
 const short=n=>Number.isFinite(n)?n.toLocaleString(locale(),{minimumFractionDigits:4,maximumFractionDigits:4}):'—';
 const parseMoney=text=>{
   const clean=String(text||'').replace(/[^\d,.]/g,'');
   if(!clean)return NaN;
   const lastComma=clean.lastIndexOf(','),lastDot=clean.lastIndexOf('.');
   const decimal=lastComma>lastDot?',':'.';
   const numeric=decimal===','?clean.replace(/\./g,'').replace(',','.'):clean.replace(/,/g,'');
   const n=Number(numeric);
   return Number.isFinite(n)?n:NaN;
 };
 function isForeground(){
   return root.dataset.injViewMode==='light'&&
     root.dataset.injHomeTab==='home'&&
     gate.classList.contains('visible')&&
     gate.getAttribute('aria-hidden')==='false'&&
     !shell.classList.contains('first-access')&&
     document.body.classList.contains('entry-gate-open')&&
     !document.body.classList.contains('boot-loading')&&
     !document.body.classList.contains('menu-overlay-open')&&
     !document.body.classList.contains('drawer-open')&&
     !document.body.classList.contains('inj-section-open')&&
     !document.body.classList.contains('entry-live-launch');
 }

 // The Home dock may be a native manual popover (browser top layer).
 // CSS/z-index alone cannot reliably hide that layer on iOS Safari.
 // Explicitly close the popover and apply inline-important display:none
 // while Light is selected, then restore the exact original Pro behavior.
 function enforceLightDock(){
   const nav=$('injPrimaryBottomNav');
   if(!nav)return;
   const isLight=root.dataset.injViewMode==='light'||root.dataset.injModeTransition==='leaving';
   if(isLight){
     if(typeof nav.hidePopover==='function'){
       try{if(nav.matches(':popover-open'))nav.hidePopover()}catch(_){}
     }
     nav.style.setProperty('display','none','important');
     nav.style.setProperty('visibility','hidden','important');
     nav.style.setProperty('pointer-events','none','important');
     nav.setAttribute('aria-hidden','true');
     nav.inert=true;
   }else{
     nav.style.removeProperty('display');
     nav.style.removeProperty('visibility');
     nav.style.removeProperty('pointer-events');
     nav.removeAttribute('aria-hidden');
     nav.inert=false;
   }
 }
 // The Light dashboard and Pro Home are already mounted. Crossfade those
 // existing screens rather than mounting/unmounting either during a toggle.
 // Keep the original Pro scroll position and suppress the dock until the
 // final crossfade frame, so switching feels native on iOS/Android.
 let transitionTimer=0;
 let transitionFrame=0;
 let transitionGeneration=0;
 const TRANSITION_MS=300;
 const motionReduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 function stopTransition(){
   ++transitionGeneration;
   window.clearTimeout(transitionTimer);
   transitionTimer=0;
   window.cancelAnimationFrame(transitionFrame);
   transitionFrame=0;
 }
 function finalizePro(){
   stopTransition();
   light.hidden=true;
   light.classList.remove('inj-light-fade-in-start','inj-light-fade-out');
   root.dataset.injLightActive='false';
   delete root.dataset.injModeTransition;
   enforceLightDock();
   closeSheet();
   clearQuoteDirection();
   lastDirectionalQuote=NaN;
 }
 function refreshVisibility(){
   const show=isForeground();
   const mode=root.dataset.injViewMode;
   if(show){
     if(root.dataset.injModeTransition==='entering'&&!light.hidden)return;
     if(light.hidden || root.dataset.injModeTransition==='leaving'){
       stopTransition();
       root.dataset.injModeTransition='entering';
       // Apply the initial opacity BEFORE the first layout/paint.
       light.classList.remove('inj-light-fade-out');
       light.classList.add('inj-light-fade-in-start');
       light.hidden=false;
       root.dataset.injLightActive='true';
       enforceLightDock();
       scheduleSync();
       if(motionReduced()){
         light.classList.remove('inj-light-fade-in-start');
         delete root.dataset.injModeTransition;
       }else{
         const generation=transitionGeneration;
         transitionFrame=window.requestAnimationFrame(()=>{
           if(generation!==transitionGeneration||root.dataset.injViewMode!=='light')return;
           light.classList.remove('inj-light-fade-in-start');
           transitionTimer=window.setTimeout(()=>{
             if(generation===transitionGeneration)delete root.dataset.injModeTransition;
           },TRANSITION_MS+30);
         });
       }
     }else{
       root.dataset.injLightActive='true';
       enforceLightDock();
       scheduleSync();
     }
     return;
   }
   if(mode==='pro'&&!light.hidden){
     if(root.dataset.injModeTransition==='leaving')return;
     stopTransition();
     root.dataset.injModeTransition='leaving';
     root.dataset.injLightActive='false';
     closeSheet();
     clearQuoteDirection();
     lastDirectionalQuote=NaN;
     // Do not show the native popover navigation above the fading overlay.
     enforceLightDock();
     if(motionReduced()){
       finalizePro();
     }else{
       const generation=transitionGeneration;
       // Keep the Light surface mounted while Pro appears underneath.
       transitionFrame=window.requestAnimationFrame(()=>{
         if(generation!==transitionGeneration||root.dataset.injViewMode!=='pro')return;
         light.classList.add('inj-light-fade-out');
         transitionTimer=window.setTimeout(()=>{
           if(generation===transitionGeneration)finalizePro();
         },TRANSITION_MS+30);
       });
     }
     return;
   }
   if(root.dataset.injModeTransition==='leaving')return;
   // Non-mode navigation (first access, overlay, other tabs) stays immediate.
   stopTransition();
   light.hidden=true;
   light.classList.remove('inj-light-fade-in-start','inj-light-fade-out');
   root.dataset.injLightActive='false';
   delete root.dataset.injModeTransition;
   enforceLightDock();
   closeSheet();
   clearQuoteDirection();
   lastDirectionalQuote=NaN;
 }
 function updateLang(){
   const en=english();
   light.querySelectorAll('[data-light-it]').forEach(el=>{
     const name=en?'lightEn':'lightIt';
     const value=el.dataset[name];
     if(el.textContent!==value)el.textContent=value;
   });
   $('injLightModeToggle').setAttribute('aria-label',en?'Switch to Pro mode':'Passa alla modalità Pro');
   $('injLightWalletHeading').textContent=en?'Select wallet':'Seleziona wallet';
   $('injLightWalletClose').setAttribute('aria-label',en?'Close':'Chiudi');
 }
 function updateWalletOptions(){
   const list=$('injLightWalletOptions');
   const rows=Array.from(document.querySelectorAll('#entryWallets .entry-wallet-row'));
   const key=rows.map(row=>row.dataset.address).join('|')+'|'+rows.findIndex(row=>row.classList.contains('selected'));
   if(list.dataset.rendered===key)return;
   list.dataset.rendered=key;
   list.replaceChildren();
   rows.forEach(row=>{
     const button=document.createElement('button');
     button.type='button';button.className='inj-light-wallet-option';
     button.setAttribute('aria-selected',String(row.classList.contains('selected')));
     const left=document.createElement('span');
     const name=document.createElement('strong');name.textContent=row.querySelector('.entry-wallet strong')?.textContent||'Wallet';
     const address=document.createElement('small');address.textContent=row.querySelector('.entry-wallet small')?.textContent||'';
     left.append(name,address);
     const check=document.createElement('span');check.textContent=row.classList.contains('selected')?'✓':'';
     button.append(left,check);
     button.addEventListener('click',()=>{
       const original=Array.from(document.querySelectorAll('#entryWallets .entry-wallet-row')).find(el=>el.dataset.address===row.dataset.address);
       if(original)original.querySelector('.entry-wallet')?.click();
       closeSheet();
       scheduleSync();
     });
     list.appendChild(button);
   });
 }
 function openSheet(){
   updateWalletOptions();
   if(!$('injLightWalletOptions').children.length)return;
   $('injLightWalletSheet').hidden=false;
   $('injLightWalletClose').focus({preventScroll:true});
 }
 function closeSheet(){
   if(!$('injLightWalletSheet').hidden)$('injLightWalletSheet').hidden=true;
 }
 $('injLightWalletToggle').addEventListener('click',openSheet);
 $('injLightWalletClose').addEventListener('click',closeSheet);
 $('injLightWalletSheet').addEventListener('click',e=>{if(e.target===$('injLightWalletSheet'))closeSheet()});
 $('injLightModeToggle').addEventListener('click',()=>{
   closeSheet();
   const original=$('injViewModeToggle');
   if(original)original.click();
   else{
     root.dataset.injViewMode='pro';
     try{localStorage.setItem('inj_node_view_mode_v1','pro')}catch(_){}
   }
   refreshVisibility();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
 // Wallet swipe: use the original dots and selection events, no shadow wallet state.
 let touchStart=null;
 $('injLightWalletToggle').addEventListener('touchstart',e=>{
   if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
 },{passive:true});
 $('injLightWalletToggle').addEventListener('touchend',e=>{
   if(!touchStart||!e.changedTouches.length)return;
   const dx=e.changedTouches[0].clientX-touchStart.x;
   const dy=e.changedTouches[0].clientY-touchStart.y;
   touchStart=null;
   if(Math.abs(dx)<38||Math.abs(dx)<Math.abs(dy)*1.25)return;
   e.preventDefault();
   const dots=Array.from(document.querySelectorAll('#entryWalletDots .entry-wallet-dot'));
   const selected=dots.findIndex(dot=>dot.classList.contains('active'));
   const next=selected+(dx<0?1:-1);
   if(dots[next])dots[next].click();
   scheduleSync();
 },{passive:false});

 // Monotone cubic Hermite interpolation: every real market sample remains
 // on the curve, and monotonic segments cannot invent a new high or low.
 // Flat derivatives at local reversals make the dense 3m feed less angular
 // without averaging away spikes, dumps or real intraday extremes.
 function curveFromMarketPath(path){
   const points=[];
   const re=/[ML]\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/g;
   let match;
   while((match=re.exec(path))!==null){
     const x=Number(match[1]),y=Number(match[2]);
     if(!Number.isFinite(x)||!Number.isFinite(y))continue;
     const prev=points[points.length-1];
     if(prev&&x<=prev.x){
       if(Math.abs(x-prev.x)<0.0001)prev.y=y;
       continue;
     }
     points.push({x,y});
   }
   if(points.length<3)return{path,last:points[points.length-1]||null,first:points[0]||null};
   const n=points.length;
   const h=[],s=[],m=new Array(n);
   for(let i=0;i<n-1;i++){
     h.push(points[i+1].x-points[i].x);
     s.push((points[i+1].y-points[i].y)/h[i]);
   }
   m[0]=s[0];m[n-1]=s[n-2];
   for(let i=1;i<n-1;i++){
     if(s[i-1]===0||s[i]===0||Math.sign(s[i-1])!==Math.sign(s[i])){
       m[i]=0;
     }else{
       const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
       m[i]=(w1+w2)/(w1/s[i-1]+w2/s[i]);
     }
   }
   const fmt=v=>Number(v.toFixed(3));
   let d='M'+fmt(points[0].x)+' '+fmt(points[0].y);
   for(let i=0;i<n-1;i++){
     const a=points[i],b=points[i+1],step=h[i]/3;
     d+=' C'+fmt(a.x+step)+' '+fmt(a.y+m[i]*step)+' '+fmt(b.x-step)+' '+fmt(b.y-m[i+1]*step)+' '+fmt(b.x)+' '+fmt(b.y);
   }
   return{path:d,first:points[0],last:points[n-1]};
 }
 let lastSourceGeometry='';
 let lastVisualPoint=null;
 let lastQuotePrice=NaN;
 let lastPulseAt=0;
 // A constant-size endpoint with an understated glow: no scale jump, forced
 // reflow or simultaneous animations on each websocket price update.
 const dotHalo=$('injLightGraphHalo');
 dotHalo.addEventListener('animationend',event=>{
   if(event.animationName==='inj-light-quote-soft-glow'){
     dotHalo.classList.remove('inj-light-quote-pulse');
   }
 });
 function pulsePriceDot(direction){
   const plot=$('injLightChartPlot');
   plot.dataset.tick=direction>0?'up':'down';
   // Direction updates for EVERY tick; coalesce rapid flashes so the user
   // sees one soft, completed glow instead of an exhausting strobe.
   const now=performance.now();
   if(now-lastPulseAt<1000 || dotHalo.classList.contains('inj-light-quote-pulse'))return;
   lastPulseAt=now;
   if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
     dotHalo.classList.add('inj-light-quote-pulse');
   }
 }

 function renderLightPriceScale(currentPrice) {
   const stage=source('entrySparkStage');
   const plot=$('injLightChartPlot');
   const now=$('injLightPriceNow');
   const high=$('injLightPriceHigh');
   const mid=$('injLightPriceMid');
   const low=$('injLightPriceLow');
   const hasDomain=stage?.dataset.priceScaleMin!==undefined;
   const min=Number(stage?.dataset.priceScaleMin);
   const max=Number(stage?.dataset.priceScaleMax);
   const top=Number(stage?.dataset.priceScaleTop);
   const bottom=Number(stage?.dataset.priceScaleBottom);
   const valid=hasDomain && Number.isFinite(min)&&Number.isFinite(max)&&max>min &&
     Number.isFinite(top)&&Number.isFinite(bottom)&&bottom>top;
   if(!valid||!lastVisualPoint){
     for(const el of [high,mid,low,now])el.hidden=true;
     return;
   }
   const format=(price,digits=4)=>new Intl.NumberFormat('en-US',{
     minimumFractionDigits:digits,maximumFractionDigits:digits
   }).format(price);
   // Reproduce the real y-domain used by the Pro Home sparkline.
   const anchor=[{el:high,y:top},{el:mid,y:(top+bottom)/2},{el:low,y:bottom}];
   anchor.forEach(({el,y})=>{
     const value=min+(max-min)*(bottom-y)/(bottom-top);
     output(el.id,format(value,3));
     el.style.top=(y/150*100)+'%';
     el.hidden=false;
   });
   const y=Math.max(11,Math.min(139,lastVisualPoint.y));
   const current=Number.isFinite(currentPrice)&&currentPrice>0?currentPrice:NaN;
   if(!Number.isFinite(current)){now.hidden=true;return;}
   output('injLightPriceNow',format(current,4));
   now.style.top=(y/150*100)+'%';
   now.hidden=false;
   for(const item of anchor) {
     // Prevent overlaps between static ticks and current quote.
     if(Math.abs(y-item.y)<14)item.el.hidden=true;
   }
   const svg=plot.querySelector('svg');
   if(svg)svg.setAttribute('aria-label',(english()?'INJ rolling seven-day price line. Current price ':'Grafico settimanale INJ. Prezzo corrente ')+format(current,4)+' USDT');
 }
 let frame=0;
 function scheduleSync(){
   if(frame||light.hidden)return;
   frame=requestAnimationFrame(()=>{frame=0;if(!light.hidden)syncData()});
 }

 // Each quote change briefly highlights its direction with a solid color
 // and a static arrow. The quote returns to neutral without any glow,
 // blur or brightness animation; bursts are coalesced for readability.
 let lastDirectionalQuote=NaN;
 let lastPriceBlinkAt=-Infinity;
 let priceNeutralTimer=0;
 const priceRow=$('injLightPriceRow');
 const priceArrow=$('injLightPriceArrow');
 const priceValue=$('injLightPrice');
 function clearQuoteDirection(){
   window.clearTimeout(priceNeutralTimer);
   priceNeutralTimer=0;
   delete priceRow.dataset.direction;
   priceRow.removeAttribute('title');
 }
 function updateLiveQuoteDirection(next){
   if(!Number.isFinite(next)||next<=0)return;
   if(Number.isFinite(lastDirectionalQuote)){
     const threshold=Math.max(1e-9,Math.abs(lastDirectionalQuote)*1e-12);
     const diff=next-lastDirectionalQuote;
     if(Math.abs(diff)>threshold){
       const now=performance.now();
       // Let the previous directional color finish and return to neutral
       // even if the websocket continues delivering ticks continuously.
       if(now-lastPriceBlinkAt>=950){
         clearQuoteDirection();
         lastPriceBlinkAt=now;
         const rising=diff>0;
         priceRow.dataset.direction=rising?'up':'down';
         priceRow.title=english()
           ? rising?'Latest tick: price increased':'Latest tick: price decreased'
           : rising?'Ultimo aggiornamento: prezzo in salita':'Ultimo aggiornamento: prezzo in discesa';
         // A fixed, non-restarting lifetime: normal color and hidden arrow
         // after the update, even in very active market conditions.
         priceNeutralTimer=window.setTimeout(clearQuoteDirection,660);
       }
     }
   }
   lastDirectionalQuote=next;
 }
 function syncData(){
   const selected=document.querySelector('#entryWallets .entry-wallet-row.selected');
   const name=selected?.querySelector('.entry-wallet strong')?.textContent||readText('entryOverviewWallet');
   const address=selected?.querySelector('.entry-wallet small')?.textContent||'—';
   const walletCount=document.querySelectorAll('#entryWallets .entry-wallet-row').length;
   output('injLightAddress',walletCount>1?name+' · '+address:address);
   output('injLightHoldings',short(readNum('entryWalletTotal')));
   output('injLightPrice',readText('entryMarketPrice'));
   updateLiveQuoteDirection(readNum('entryMarketPrice'));
   const change=readText('entryMarketChange');
   output('injLightChange',change);
   const changeNode=$('injLightChange');
   changeNode.classList.toggle('positive',source('entryMarketChange')?.classList.contains('positive'));
   changeNode.classList.toggle('negative',source('entryMarketChange')?.classList.contains('negative'));
   const rewards=readNum('entryWalletRewards');
   output('injLightReward',short(rewards));
   const renderedPrice=readText('entryMarketPrice');
   const currency=renderedPrice.includes('€')?'EUR':'USD';
   const displayPrice=parseMoney(renderedPrice);
   const fiat=Number.isFinite(rewards)&&Number.isFinite(displayPrice)&&displayPrice>0?
     new Intl.NumberFormat(locale(),{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(rewards*displayPrice):'—';
   output('injLightRewardFiat',fiat==='—'?'—':'≈ '+fiat);
   // Rolling 1W hourly line is rendered by inj-home-candles-20261102.js.
   // Never draw the old UTC-day curve, scale or tick colors over it.
   if(!$('injLightWalletSheet').hidden)updateWalletOptions();
 }
 // Observe the actual existing data elements rather than creating a second
 // websocket or market polling loop. Coalesce all changes into one paint.
 [
  'entryWalletTotal','entryWalletRewards','entryMarketPrice','entryMarketChange',
  'entrySparkPath','entrySparkArea','entrySparkStage','entrySparkLiveDot','entryInsights',
  'entryOverviewWallet','entryWallets','entryWalletDots'
 ].forEach(id=>{
   const el=source(id);
   if(!el)return;
   const mo=new MutationObserver(scheduleSync);
   mo.observe(el,{subtree:true,childList:true,characterData:true,attributes:true,
     attributeFilter:['d','style','class','hidden','data-entry-numeric-value','data-entry-rendered-value','data-price-scale-min','data-price-scale-max','data-price-scale-top','data-price-scale-bottom','aria-selected']});
 });
 const visibilityObserver=new MutationObserver(refreshVisibility);
 visibilityObserver.observe(root,{attributes:true,attributeFilter:['data-inj-view-mode','data-inj-home-tab']});
 visibilityObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 visibilityObserver.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
 visibilityObserver.observe(shell,{attributes:true,attributeFilter:['class']});
 window.addEventListener('injnode:viewmodechange',refreshVisibility);
 window.addEventListener('injnode:viewmodechange',enforceLightDock);
 window.addEventListener('injnode:languagechange',()=>{updateLang();scheduleSync()});
 window.addEventListener('injnode:fontchange',scheduleSync);
 window.addEventListener('pageshow',()=>{refreshVisibility();scheduleSync()});
 window.addEventListener('online',scheduleSync);
 window.setInterval(()=>{if(!light.hidden)syncData()},10000);
 updateLang();
 refreshVisibility();
})();