/* INJ Node Ocean X Series · CSS-only motion. No timers or data hooks. */
(() => {
 'use strict';
 const hosts='#entryGate,.app-shell,.treasury-shell,.rewards-shell,.live-page,.book-page,.cc-shell,.shell,.cap-shell';
 function mount(){
  for(const host of document.querySelectorAll(hosts)){
   if(Array.from(host.children).some(el=>el.classList?.contains('ocean-x-atmosphere')))continue;
   const layer=document.createElement('div');
   layer.className='ocean-x-atmosphere';layer.setAttribute('aria-hidden','true');
   for(const suffix of ['a','b','c']){
    const el=document.createElement('i');el.className='ocean-x-field ocean-x-field--'+suffix;layer.appendChild(el);
   }
   host.prepend(layer);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('pageshow',mount,{passive:true});
})();