/* INJ Node iOS converter keyboard: lock page geometry before first focus.
   Preserve user pinch zoom; NEVER scale the page or modify scroll positions. */
(()=>{
 'use strict';
 if(document.documentElement.dataset.injPage!=='index')return;
 const root=document.documentElement;
 const active=()=>document.querySelector('#converterView.open');
 let locked=false;
 const lock=()=>{
  const page=active();if(!page||locked)return;
  const h=Math.round(page.getBoundingClientRect().height)||window.innerHeight;
  if(h>250){root.style.setProperty('--inj-converter-locked-height',h+'px');locked=true;}
 };
 const unlock=()=>{root.style.removeProperty('--inj-converter-locked-height');locked=false;};
 document.addEventListener('focusin',e=>{
  if(e.target?.matches('#converterView input'))lock();
 },true);
 document.addEventListener('pointerdown',e=>{
  if(e.target?.matches('#converterView input'))lock();
 },{capture:true,passive:true});
 document.addEventListener('focusout',()=>setTimeout(()=>{
  if(!document.activeElement?.matches('#converterView input'))unlock();
 },220),true);
 window.addEventListener('orientationchange',unlock,{passive:true});
 const obs=new MutationObserver(()=>{if(!active())unlock()});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
  const section=document.getElementById('converterView');
  if(section)obs.observe(section,{attributes:true,attributeFilter:['class','hidden']});
 },{once:true});
 else {const section=document.getElementById('converterView');if(section)obs.observe(section,{attributes:true,attributeFilter:['class','hidden']});}
})();
