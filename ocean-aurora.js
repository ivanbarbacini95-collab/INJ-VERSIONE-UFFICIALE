/* INJ Node · Ocean Aurora v16.01.09
   Lightweight decorative layers, independently of market data.
   Safe for iOS PWA: only CSS transform is animated, no scroll listeners. */
(() => {
 'use strict';
 const selector='#entryGate,.app-shell,.treasury-shell,.rewards-shell,.live-page,.book-page,.cc-shell,.shell';
 function mount(){
   for(const host of document.querySelectorAll(selector)){
     if(Array.from(host.children).some(el=>el.classList?.contains('ocean-aurora-atmosphere')))continue;
     const layer=document.createElement('div');
     layer.className='ocean-aurora-atmosphere';
     layer.setAttribute('aria-hidden','true');
     for(const suffix of ['a','b','c']){
       const field=document.createElement('i');
       field.className='ocean-aurora-field ocean-aurora-field--'+suffix;
       layer.appendChild(field);
     }
     host.prepend(layer);
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('pageshow',mount,{passive:true});
})();
