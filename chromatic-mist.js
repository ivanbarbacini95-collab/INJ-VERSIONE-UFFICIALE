/* INJ Node / Chromatic Mist v16.01.10
   Passive ambient overlay. CSS-only motion, no timers or scroll listeners. */
(() => {
 'use strict';
 const selector='#entryGate,.app-shell,.treasury-shell,.rewards-shell,.live-page,.book-page,.cc-shell,.shell';
 function mount(){
   for(const host of document.querySelectorAll(selector)){
     if(Array.from(host.children).some(el=>el.classList?.contains('chromatic-mist-atmosphere')))continue;
     const layer=document.createElement('div');
     layer.className='chromatic-mist-atmosphere';
     layer.setAttribute('aria-hidden','true');
     for(const id of ['a','b','c']){
       const field=document.createElement('i');
       field.className='chromatic-mist-field chromatic-mist-field--'+id;
       layer.appendChild(field);
     }
     host.prepend(layer);
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('pageshow',mount,{passive:true});
})();
