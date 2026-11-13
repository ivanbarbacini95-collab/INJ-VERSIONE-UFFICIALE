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
  // If the dock-collision guard enabled scrolling, never freeze Home again.
  if(root.dataset.injHomeDockClearance==='scroll'){
   delete root.dataset.injHomeFit;
   return;
  }
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

  // Fill the full chart-to-dock strip. Icons and text are centered between
  // matching upper/lower hairlines rather than anchored near the upper rule.
  const topGap=Math.max(10,Math.min(22,Math.round(innerHeight*.018)));
  const minZone=Math.max(58,Math.min(72,Math.round(innerHeight*.077)));
  const topValue=topGap+'px';
  if(actions.style.getPropertyValue('--inj-home-links-gap')!==topValue)
   actions.style.setProperty('--inj-home-links-gap',topValue);
  const room=()=>dockTop-safeGap-chart.getBoundingClientRect().bottom-topGap;
  function shrinkChart(){
   const actual=chart.getBoundingClientRect().height;
   const configured=Number.parseFloat(chart.style.getPropertyValue('--inj-home-fit-chart-height'));
   const available=Number.isFinite(configured)?Math.min(actual,configured):actual;
   if(actual<149||available<=149)return false;
   const shortfall=Math.max(0,minZone-room());
   const target=Math.max(148,Math.round(available-shortfall-4));
   if(target>=available-1)return false;
   chart.style.setProperty('--inj-home-fit-chart-height',target+'px');
   return true;
  }
  for(let pass=0;pass<3&&room()<minZone;pass++){
   shrinkChart();
   if(room()>=minZone)break;
   if(pass<2)setLevel(pass+1);
  }
  if(room()<minZone)shrinkChart();
  const zoneHeight=Math.max(minZone,Math.floor(room()));
  const heightValue=zoneHeight+'px';
  if(actions.style.getPropertyValue('--inj-home-shortcut-zone-height')!==heightValue)
   actions.style.setProperty('--inj-home-shortcut-zone-height',heightValue);
  const overflow=actions.getBoundingClientRect().bottom-(dockTop-safeGap);
  if(overflow>1&&zoneHeight>minZone){
   actions.style.setProperty('--inj-home-shortcut-zone-height',
    Math.max(minZone,Math.floor(zoneHeight-overflow-2))+'px');
  }
  // Avoid resetting expanded height on each ResizeObserver callback.
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
   if(root.dataset.injHomeStatic==='true'&&root.dataset.injHomeDockClearance!=='scroll'&&gate.scrollTop!==0)gate.scrollTop=0;
  },{passive:true});
  window.addEventListener('scroll',()=>{
   if(root.dataset.injHomeStatic==='true'&&root.dataset.injHomeDockClearance!=='scroll'&&window.scrollY!==0)window.scrollTo(0,0);
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