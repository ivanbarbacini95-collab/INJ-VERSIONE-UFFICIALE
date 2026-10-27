/* v16.01.30 — Section identity localization and precise Home title baseline.
   Only text and vertical title offset; no scrolling, DOM rerenders or timers. */
(() => {
 'use strict';
 const root=document.documentElement;
 const titles={
   dashboard:['Dashboard','Dashboard'],
   treasury:['INJ Treasury','INJ Treasury'],
   'live-rewards':['Live Rewards','Live Rewards'],
   'live-charts':['Grafici Live','Live Charts'],
   'order-book':['Order Book','Order Book'],
   'command-center':['Command Center','Command Center'],
   market:['Mercato','Market'],
   comparison:['Market Cap Comparison','Market Cap Comparison'],
   'visualize-wealth':['Valore Potenziale','Potential Value'],
   performance:['Cronologia rendimenti','Performance Timeline'],
   converter:['Convertitore INJ','INJ Converter']
 };
 const lang=()=>{try{return(window.INJ_I18N?.getLanguage?.()||localStorage.getItem('inj_node_language_v1')||'it')==='en'?'en':'it'}catch(_){return 'it'}};
 function updateNames(){
   const lng=lang();
   document.querySelectorAll('[data-inj-section-name]').forEach(el=>{
     const names=titles[el.dataset.injSectionName];
     if(!names)return;
     const value=names[lng==='en'?1:0];
     if(el.textContent!==value)el.textContent=value;
   });
 }
 let raf=0;
 function alignHomeTitle(){
   raf=0;
   if(root.dataset.injPage!=='index')return;
   const title=document.querySelector('#entryGate .home-safe-heading');
   const menu=document.getElementById('entryMenuButton');
   if(!title||!menu)return;
   if(!window.matchMedia('(max-width:900px)').matches){
     title.style.removeProperty('--inj-home-heading-offset');return;
   }
   const gate=document.getElementById('entryGate');
   if(!gate?.classList.contains('visible')||gate.querySelector('.entry-gate-shell.first-access'))return;
   const a=menu.getBoundingClientRect(),b=title.getBoundingClientRect();
   if(a.width<10||b.height<10)return;
   const prior=parseFloat(title.style.getPropertyValue('--inj-home-heading-offset'))||0;
   const desired=Math.max(-26,Math.min(26,prior+(a.top+a.height/2)-(b.top+b.height/2)));
   if(Math.abs(desired-prior)>.6)title.style.setProperty('--inj-home-heading-offset',desired.toFixed(1)+'px');
 }
 function refresh(){updateNames();if(!raf)raf=requestAnimationFrame(alignHomeTitle);}
 function start(){
   refresh();
   window.addEventListener('resize',refresh,{passive:true});
   window.addEventListener('orientationchange',refresh,{passive:true});
   window.addEventListener('pageshow',refresh,{passive:true});
   window.addEventListener('injnode:languagechange',refresh);
   window.addEventListener('storage',e=>{if(e.key==='inj_node_language_v1')refresh()});
   // Home becomes visible after wallet/bootstrap checks. Measure at that moment.
   if(root.dataset.injPage==='index'){
     const gate=document.getElementById('entryGate');
     const shell=gate?.querySelector('.entry-gate-shell');
     const observer=new MutationObserver(refresh);
     if(gate)observer.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
     if(shell)observer.observe(shell,{attributes:true,attributeFilter:['class']});
     observer.observe(root,{attributes:true,attributeFilter:['data-theme']});
   }
   // Font loading may shift the optical center after first paint.
   document.fonts?.ready?.then(refresh).catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
