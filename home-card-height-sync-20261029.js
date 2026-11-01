/* INJ Node Home: match chart-card height to the wallet overview without
   modifying graph data, wallet selection, chart touch gestures or card order. */
(()=>{
  'use strict';
  const run=()=>{
    const overview=document.getElementById('entryOverview');
    const chart=document.getElementById('entryInsights');
    if(!overview||!chart)return;
    let scheduled=false,last=0;
    const sync=()=>{
      scheduled=false;
      const rect=overview.getBoundingClientRect();
      const h=Math.round(rect.height);
      if(h<125||!Number.isFinite(h)||h===last)return;
      last=h;
      chart.style.setProperty('--inj-home-overview-card-height',h+'px');
    };
    const schedule=()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(sync);
    };
    if(typeof ResizeObserver==='function'){
      const observer=new ResizeObserver(schedule);
      observer.observe(overview);
    }
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('pageshow',schedule);
    schedule();
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run,{once:true});
  }else run();
})();
