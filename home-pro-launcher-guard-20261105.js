/* INJ Node · Home launcher cleanup, 2026-11-05.
   Legacy theme/decoration scripts may append artwork into the three compact
   quick links. Keep ONLY the native animated symbol and native text wrapper.
   No event listeners, wallet data or navigation are modified. */
(() => {
  'use strict';
  if (window.__injHomeProLauncherGuard) return;
  window.__injHomeProLauncherGuard = true;
  const ids=['entryDashboardButton','entryLiveButton','entryTreasuryButton'];
  const clean=()=>{
    for(const id of ids){
      const tile=document.getElementById(id);
      if(!tile) continue;
      const icon=tile.querySelector(':scope > .inj-pro-launcher-symbol');
      if(!icon) continue;
      const label=Array.from(tile.children).find(el=>
        el.tagName==='SPAN' && el!==icon &&
        !!el.querySelector(':scope > .inj-home-tile-title'));
      if(!label) continue;
      for(const child of Array.from(tile.children)){
        if(child!==icon && child!==label)child.remove();
      }
      tile.classList.add('inj-pro-launcher-clean');
    }
  };
  const init=()=>{
    const host=document.querySelector('#entryGate .entry-actions.entry-flat-v44');
    if(!host)return;
    clean();
    if(typeof MutationObserver!=='function')return;
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;clean()});
    });
    observer.observe(host,{childList:true,subtree:true});
    window.addEventListener('pageshow',clean,{passive:true});
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else init();
})();
