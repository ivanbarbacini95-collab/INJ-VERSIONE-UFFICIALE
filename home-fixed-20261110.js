/* INJ Node · 2026-11-10 · A genuinely fixed, single-screen Home Pro.
   Match the current Home when it fits: no vertical document or panel scroll.
   Only shrink existing chart / spare gaps if the bottom dock would overlap.
   Never alter first access, Lite, wallet horizontal rail or other tabs. */
(()=>{
 'use strict';
 if(window.__injHomeStatic20261110)return;
 window.__injHomeStatic20261110=true;
 const root=document.documentElement;
 const media=matchMedia('(max-width:700px) and (orientation:portrait)');
 const $=id=>document.getElementById(id);
 let pending=false,dimension='',observer=null;
 const eligible=()=>{
  const gate=$('entryGate');
  return media.matches && root.dataset.injPage==='index' &&
   root.dataset.injHomeTab==='home' && root.dataset.injViewMode!=='light' &&
   document.body.classList.contains('entry-gate-open') &&
   !document.body.classList.contains('boot-loading') &&
   !document.body.classList.contains('inj-section-open') &&
   !document.body.classList.contains('menu-overlay-open') &&
   !document.body.classList.contains('entry-live-launch') &&
   !document.body.classList.contains('focus-display-open') &&
   !document.body.classList.contains('pulse-view-open') &&
   !document.body.classList.contains('live-charts-open') &&
   gate?.classList.contains('visible') && gate.getAttribute('aria-hidden')!=='true' &&
   !!gate.querySelector('.entry-gate-shell:not(.first-access)');
 };
 // Ignore temporary visual viewport shifts while Safari chrome settles.
 // Dock position itself is still remeasured on visualViewport changes.
 const sizeKey=()=>[
   Math.round(document.documentElement.clientWidth||innerWidth),
   Math.round(innerHeight),
   media.matches?'portrait':'other'
  ].join('x');
 function setLevel(level){
  const value=String(level);
  if(root.dataset.injHomeStaticLevel!==value)root.dataset.injHomeStaticLevel=value;
 }
 function schedule(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(layout);
 }
 function layout(){
  pending=false;
  if(!eligible()){
   if(root.dataset.injHomeStatic)delete root.dataset.injHomeStatic;
   return;
  }
  const gate=$('entryGate'),nav=$('injPrimaryBottomNav'),chart=$('entryInsights');
  const actions=gate?.querySelector('.entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44');
  if(!actions||!chart||!nav)return;
  root.dataset.injHomeStatic='true';
  root.dataset.injHomeFit='true';
  if(gate.scrollTop!==0)gate.scrollTop=0;
  if(window.scrollY>0)window.scrollTo(0,0);
  const key=sizeKey();
  if(key!==dimension){
   dimension=key;
   setLevel(0);
   const initialHeight=Math.max(214,Math.min(276,Math.round(innerHeight*.315)));
   chart.style.setProperty('--inj-home-fit-chart-height',initialHeight+'px');
  }
  const dock=nav.getBoundingClientRect();
  const safeGap=18;
  const dockTop=(dock.width>200&&dock.height>42&&dock.top>100 &&
   (!nav.hasAttribute('popover')||nav.matches(':popover-open')))
   ?dock.top:Math.max(0,innerHeight-95);
  if(dockTop<140)return;

  // Measure from the smallest gap. This prevents a previously centered
  // row from making the chart-fit routine think the Home is overflowing.
  if(actions.style.getPropertyValue('--inj-home-links-gap')!=='8px')
   actions.style.setProperty('--inj-home-links-gap','8px');
  const overlap=()=>actions.getBoundingClientRect().bottom-(dockTop-safeGap);
  let excess=overlap();
  function shrink(){
   const actual=chart.getBoundingClientRect().height;
   if(actual<149)return;
   const desired=Math.max(148,Math.round(actual-excess-4));
   const previous=Number.parseFloat(chart.style.getPropertyValue('--inj-home-fit-chart-height'));
   if(desired<actual-0.5 && (!Number.isFinite(previous)||desired<previous-0.5)){
    chart.style.setProperty('--inj-home-fit-chart-height',desired+'px');
   }
   excess=overlap();
  }
  if(excess>0){shrink();}
  if(excess>0){setLevel(1);excess=overlap();}
  if(excess>0){shrink();}
  if(excess>0){setLevel(2);excess=overlap();}
  if(excess>0){shrink();}

  // Center Dashboard / Live View / INJ Treasury in the REAL measured
  // free strip between the price chart and the fixed bottom navigation.
  // Keep 18px minimum dock clearance and never push a link under the dock.
  if(excess<=0){
   const chartBottom=chart.getBoundingClientRect().bottom;
   const rowHeight=actions.getBoundingClientRect().height;
   const free=dockTop-safeGap-chartBottom-rowHeight;
   const centered=Math.max(8,Math.min(150,Math.floor(free/2)));
   if(centered>8){
    actions.style.setProperty('--inj-home-links-gap',centered+'px');
    if(overlap()>0)actions.style.setProperty('--inj-home-links-gap','8px');
   }
  }
  // On exceptionally short viewports, retain the existing compact state
  // rather than hiding or overlaying a launcher.
 }
 function init(){
  const gate=$('entryGate'),nav=$('injPrimaryBottomNav'),chart=$('entryInsights');
  if(!gate||!nav||!chart)return;
  const elements=[
   gate,nav,chart,gate.querySelector('.entry-wallet-section'),
   $('entryOverview'),
   gate.querySelector('.entry-gate-shell > .entry-actions.entry-flat-v44')
  ].filter(Boolean);
  if(typeof ResizeObserver==='function'){
   observer=new ResizeObserver(schedule);
   for(const el of elements)observer.observe(el);
  }
  if(typeof MutationObserver==='function'){
   new MutationObserver(schedule).observe(root,{
    attributes:true,attributeFilter:['data-inj-home-tab','data-inj-view-mode']
   });
   new MutationObserver(schedule).observe(document.body,{
    attributes:true,attributeFilter:['class']
   });
   new MutationObserver(schedule).observe(gate,{
    attributes:true,attributeFilter:['class','aria-hidden']
   });
   new MutationObserver(schedule).observe(nav,{
    attributes:true,attributeFilter:['popover','style']
   });
  }
  // Previous Home versions could restore a saved vertical offset even when
  // CSS disallows touch scrolling. Explicitly keep its origin at zero.
  gate.addEventListener('scroll',()=>{
   if(root.dataset.injHomeStatic==='true'&&gate.scrollTop!==0)gate.scrollTop=0;
  },{passive:true});
  window.addEventListener('scroll',()=>{
   if(root.dataset.injHomeStatic==='true'&&window.scrollY!==0)window.scrollTo(0,0);
  },{passive:true});
  for(const event of ['pageshow','resize','orientationchange','focus'])
   window.addEventListener(event,schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  nav.addEventListener('toggle',schedule,{passive:true});
  document.fonts?.ready?.then(schedule,()=>{});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();