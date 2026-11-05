/* INJ Node · one-screen Home fit (2026-11-05).
   Adapts ONLY the height budget of the native interactive price chart to
   available space above the fixed bottom bar. Does not replace card DOM,
   listeners, graph data, wallet carousel, or navigation. */
(()=>{
 'use strict';
 if(window.__injHomeSingleScreen)return;
 window.__injHomeSingleScreen=true;
 const root=document.documentElement;
 let pending=false;
 let stableLayout=null;
 // A palette change (and its settings overlay) must never cause chart
 // geometry to be recalculated against a hidden/covered bottom dock.
 const media=window.matchMedia('(max-width:700px) and (orientation:portrait)');
 const byId=id=>document.getElementById(id);
 const cssVar='--inj-home-fit-chart-height';
 // Use the device's physical portrait size, not visualViewport.height:
 // iOS can alter its visible viewport during menu/status chrome updates.
 const geometryKey=()=>[
   Math.round(window.innerWidth||document.documentElement.clientWidth),
   Math.round(window.screen?.height||window.innerHeight),
   Math.round(window.screen?.width||window.innerWidth)
 ].join('x');
 function restoreStable(chart){
   if(!stableLayout||stableLayout.key!==geometryKey())return false;
   chart.style.setProperty(cssVar,stableLayout.chartHeight+'px');
   root.dataset.injHomeFit=stableLayout.fits?'true':'false';
   return true;
 }
 const eligible=()=>root.dataset.injPage==='index'&&root.dataset.injHomeTab==='home'
    &&root.dataset.injViewMode!=='light'&&media.matches;
 function reset(){
  stableLayout=null;
  root.removeAttribute('data-inj-home-fit');
  const chart=byId('entryInsights');
  if(chart)chart.style.removeProperty(cssVar);
 }
 function fit(){
  pending=false;
  if(!eligible()){reset();return;}
  const gate=byId('entryGate'),chart=byId('entryInsights');
  const overview=byId('entryOverview');
  const actions=gate?.querySelector('.entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44');
  const nav=byId('injPrimaryBottomNav');
  if(!gate||!chart||!overview||!actions||!gate.classList.contains('visible')){
   root.removeAttribute('data-inj-home-fit');return;
  }
  // While Control Center or theme picker is open, the dock can be detached
  // or covered and its measured top stops being a reliable space boundary.
  // Preserve the original Home fit, never squeeze the price chart.
  if(document.body.classList.contains('menu-overlay-open') ||
     document.getElementById('headerMenu')?.classList.contains('open')){
   restoreStable(chart);
   return;
  }
  // Theme changes are presentation-only: keep cards/chart/quick links at
  // their last correct sizes until the real device geometry changes.
  if(restoreStable(chart))return;
  const navRect=nav?.getBoundingClientRect();
  const viewportTop=window.visualViewport?.offsetTop||0;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  // In normal PWA Home, the floating menu is a native top-layer popover.
  // If it has not mounted yet, reserve its full 88px footprint.
  const navTop=navRect&&navRect.width>0&&navRect.height>0
    ?navRect.top
    :viewportTop+viewportHeight-90;
  // Establish a stable baseline: never cumulatively subtract a prior fit.
  chart.style.setProperty(cssVar,'244px');
  const baseH=chart.getBoundingClientRect().height;
  // Measure against the unscrolled Home origin; Safari may reopen the PWA
  // at an old scroll offset from the previous (tall) layout.
  const offset=gate.scrollTop||0;
  const buttonsBottom=actions.getBoundingClientRect().bottom+offset;
  const overviewTop=overview.getBoundingClientRect().top+offset;
  if(!(baseH>100&&buttonsBottom>overviewTop&&navTop>150)){
   root.removeAttribute('data-inj-home-fit');return;
  }
  const available=Math.floor(baseH + navTop - buttonsBottom - 13);
  // On very short screens, scrolling is preferable to crushing the chart.
  const chartHeight=Math.max(218,Math.min(288,available));
  chart.style.setProperty(cssVar,chartHeight+'px');
  // Commit the no-scroll layout only when ALL three destinations will be
  // visible and the chart still has enough room for price/time/P&L.
  const actualBottom=actions.getBoundingClientRect().bottom+offset;
  const fits=available>=218 && actualBottom<=navTop-8;
  root.dataset.injHomeFit=fits?'true':'false';
  stableLayout={key:geometryKey(),chartHeight,fits};
  if(fits&&gate.scrollTop>0)gate.scrollTop=0;
 }
 function schedule(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(fit);
 }
 function init(){
  const wallet=byId('entryGate')?.querySelector('.entry-wallet-section');
  const overview=byId('entryOverview');
  const actions=byId('entryGate')?.querySelector('.entry-actions.entry-flat-v44');
  const gate=byId('entryGate');
  if(typeof ResizeObserver==='function'){
   const observer=new ResizeObserver(schedule);
   [wallet,overview,actions].filter(Boolean).forEach(el=>observer.observe(el));
  }
  if(typeof MutationObserver==='function'){
   new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-inj-home-tab','data-inj-view-mode']});
   if(gate)new MutationObserver(schedule).observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
   // Recheck after Settings closes. Cached geometry is restored if unchanged.
   new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('load',schedule,{once:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  document.fonts?.ready?.then(schedule,()=>{});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
