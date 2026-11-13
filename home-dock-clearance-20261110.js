/* INJ Node - iOS Home / fixed bottom dock clearance.
   The one-screen chart fit can be cached before the PWA dock settles.
   Correct only a measured collision, never move/resize the dock itself.
   When the chart cannot be shortened further, allow actual vertical scrolling.
*/
(()=>{
 'use strict';
 if(window.__injHomeDockClearance20261110)return;
 window.__injHomeDockClearance20261110=true;
 const root=document.documentElement;
 const portrait=matchMedia('(max-width:700px) and (orientation:portrait)');
 const varName='--inj-home-fit-chart-height';
 const clearance=22; // minimum visible gap between the launcher row and floating dock
 const minChartHeight=218; // preserve readable price, time axis and P/L
 let scheduled=false,secondFrame=0,measuredWidth=0,permanentScroll=false;
 const $=id=>document.getElementById(id);
 const eligible=()=>portrait.matches && root.dataset.injPage==='index'
  &&root.dataset.injHomeTab==='home'
  &&root.dataset.injViewMode!=='light'
  &&document.body.classList.contains('entry-gate-open')
  &&!document.body.classList.contains('boot-loading')
  &&!document.body.classList.contains('inj-section-open')
  &&!document.body.classList.contains('entry-live-launch')
  &&!document.body.classList.contains('menu-overlay-open')
  &&!document.body.classList.contains('drawer-open')
  &&!document.body.classList.contains('focus-display-open')
  &&!document.body.classList.contains('pulse-view-open')
  &&!document.body.classList.contains('live-charts-open');
 function cleanOnWidthChange(){
  const w=Math.round(root.clientWidth||window.innerWidth);
  if(!measuredWidth){measuredWidth=w;return;}
  if(w===measuredWidth)return;
  measuredWidth=w;permanentScroll=false;
  delete root.dataset.injHomeDockClearance;
  root.style.removeProperty('--inj-home-dock-space');
 }
 function finishWithScroll(nav){
  permanentScroll=true;
  // Reserve the actual floating dock footprint, even with iOS safe-area changes.
  const rect=nav.getBoundingClientRect();
  const bottomGap=Math.max(10,Math.ceil(window.innerHeight-rect.bottom));
  root.style.setProperty('--inj-home-dock-space',
    Math.ceil(rect.height+bottomGap+clearance)+'px');
  root.dataset.injHomeDockClearance='scroll';
 }
 function measure(){
  scheduled=false;
  cleanOnWidthChange();
  if(!eligible()||document.hidden)return;
  const gate=$('entryGate'),chart=$('entryInsights');
  const actions=gate?.querySelector('.entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44');
  const nav=$('injPrimaryBottomNav');
  if(!gate||!gate.classList.contains('visible')||!chart||!actions||!nav)return;
  if(gate.getAttribute('aria-hidden')==='true')return;
  if(nav.hasAttribute('popover')&&!nav.matches(':popover-open'))return;
  const dock=nav.getBoundingClientRect(),buttons=actions.getBoundingClientRect();
  if(dock.width<200||dock.height<45||dock.top<100||buttons.height<25)return;
  // Compare real viewport geometry after the top-layer popover and fonts settle.
  const overlap=Math.ceil(buttons.bottom-(dock.top-clearance));
  if(permanentScroll){
   // The single-screen fitter may restore a cached true flag after return.
   // Preserve the scroll safety state until a genuine screen-width change.
   root.dataset.injHomeDockClearance='scroll';
   return;
  }
  if(overlap<=0){
   if(root.dataset.injHomeDockClearance==='scroll')delete root.dataset.injHomeDockClearance;
   return;
  }
  const inline=parseFloat(chart.style.getPropertyValue(varName));
  const actual=chart.getBoundingClientRect().height;
  const current=Number.isFinite(inline)&&inline>100?inline:actual;
  // Never enlarge a chart already compressed by the one-screen fitter.
  const floor=Math.min(minChartHeight,current);
  const next=Math.max(floor,Math.floor(current-overlap-2));
  if(next<current-0.5){
   chart.style.setProperty(varName,next+'px');
   // Verify *real* resulting card position; the CSS may limit chart height.
   requestAnimationFrame(()=>{
    if(!eligible())return;
    const rect=actions.getBoundingClientRect();
    const dockRect=nav.getBoundingClientRect();
    if(rect.bottom<=dockRect.top-clearance+1)return;
    // Still too tall after using readable chart space? Keep the card reachable.
    if(next<=minChartHeight+1 ||
       Math.abs(rect.bottom-buttons.bottom)<1)finishWithScroll(nav);
    else schedule();
   });
  }else finishWithScroll(nav);
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  // Existing one-screen fit is scheduled on RAF too; measure after it.
  requestAnimationFrame(()=>{
   secondFrame=requestAnimationFrame(measure);
  });
 }
 function init(){
  const gate=$('entryGate'),nav=$('injPrimaryBottomNav');
  if(!gate||!nav)return;
  const shell=gate.querySelector('.entry-gate-shell');
  const actions=shell?.querySelector('.entry-actions.entry-flat-v44');
  if('ResizeObserver' in window){
   const observer=new ResizeObserver(schedule);
   [gate.querySelector('.entry-wallet-section'),$('entryOverview'),$('entryInsights'),actions,nav]
    .filter(Boolean).forEach(el=>observer.observe(el));
  }
  if('MutationObserver' in window){
   new MutationObserver(schedule).observe(root,{
    attributes:true,attributeFilter:['data-inj-home-tab','data-inj-view-mode','data-inj-home-fit']
   });
   new MutationObserver(schedule).observe(gate,{
    attributes:true,attributeFilter:['class','aria-hidden']
   });
   new MutationObserver(schedule).observe(document.body,{
    attributes:true,attributeFilter:['class']
   });
   new MutationObserver(schedule).observe(nav,{
    attributes:true,attributeFilter:['popover','style']
   });
  }
  // Popover visibility changes do not mutate its attributes on iOS Safari.
  nav.addEventListener('toggle',schedule,{passive:true});
  ['pageshow','orientationchange','resize','focus'].forEach(type=>
   window.addEventListener(type,schedule,{passive:true}));
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule,{passive:true});
  document.fonts?.ready?.then(schedule,()=>{});
  // Safari may restore the PWA viewport after its first layout/paint.
  // Lightweight rechecks cover that delayed transition without changing
  // an already fitting single-screen Home.
  window.setInterval(()=>{if(eligible()&&!document.hidden)schedule()},2500);
  requestAnimationFrame(schedule);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
