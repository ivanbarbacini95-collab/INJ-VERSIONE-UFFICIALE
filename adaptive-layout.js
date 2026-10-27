/* INJ NODE · Adaptive System v16.06.00
   Discrete responsive state, no polling or touch/wheel interception.
   Styles adapt immediately via CSS media queries; this emits a single
   optional event on breakpoint changes for interested charts. */
(() => {
  'use strict';
  const root=document.documentElement;
  if (!root || root.dataset.injAdaptiveLoaded==='1') return;
  root.dataset.injAdaptiveLoaded='1';
  const signals=[
    ['small',window.matchMedia('(max-width:599px)')],
    ['tablet',window.matchMedia('(min-width:600px) and (max-width:1023px)')],
    ['desktop',window.matchMedia('(min-width:1024px) and (max-width:1799px)')],
    ['wide',window.matchMedia('(min-width:1800px) and (max-width:2559px)')],
    ['ultrawide',window.matchMedia('(min-width:2560px)')]
  ];
  const coarse=window.matchMedia('(pointer:coarse)');
  const lessMotion=window.matchMedia('(prefers-reduced-motion:reduce)');
  let pending=0,oldClass='';
  function measure(){
    pending=0;
    const size=signals.find(s=>s[1].matches)?.[0]||'desktop';
    const mode=coarse.matches?'touch':'precision';
    const motion=lessMotion.matches?'reduced':'full';
    const key=size+'|'+mode+'|'+motion;
    if(key===oldClass)return;
    oldClass=key;
    root.dataset.injDisplay=size;
    root.dataset.injInput=mode;
    root.dataset.injMotion=motion;
    // Use one semantic signal instead of asking every widget to watch resize.
    window.dispatchEvent(new CustomEvent('inj:layout-change',{
      detail:{display:size,input:mode,motion}
    }));
  }
  function queue(){if(!pending)pending=window.requestAnimationFrame(measure)}
  for(const [,query] of signals)query.addEventListener('change',queue);
  coarse.addEventListener('change',queue);
  lessMotion.addEventListener('change',queue);
  window.addEventListener('pageshow',queue,{passive:true});
  queue();
})();
