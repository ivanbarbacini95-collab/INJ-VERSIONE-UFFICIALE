/* INJ Node · Aqua Mirage v16.01.13. Passive CSS-only atmosphere. */
(() => {
 'use strict';
 const hosts='#entryGate,.app-shell,.treasury-shell,.rewards-shell,.live-page,.book-page,.cc-shell,.shell,.cap-shell';
 function mount(){
  for(const host of document.querySelectorAll(hosts)){
   if(Array.from(host.children).some(el=>el.classList?.contains('aqua-mirage-atmosphere')))continue;
   const layer=document.createElement('div');layer.className='aqua-mirage-atmosphere';
   layer.setAttribute('aria-hidden','true');
   for(const id of ['a','b','c']){
    const field=document.createElement('i');
    field.className='aqua-mirage-field aqua-mirage-field--'+id;
    layer.appendChild(field);
   }
   host.prepend(layer);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('pageshow',mount,{passive:true});
})();