/* INJ Node · Home position continuity 16.07.19.
 * Preserve the REAL scrolling owner (document on modern iOS PWA; #entryGate
 * on legacy/fixed layouts) while independent sections/Dashboard are active.
 * Never change the scroll position of an opened section or another page. */
(()=>{
 'use strict';
 if(!document.getElementById('entryGate'))return;
 const KEY='inj_node_home_position_v1';
 let saved=null;
 const root=()=>document.scrollingElement||document.documentElement;
 const gate=()=>document.getElementById('entryGate');
 function isHomeVisible(){
  const g=gate();
  return !!(g&&g.classList.contains('visible')&&g.getAttribute('aria-hidden')!=='true');
 }
 function snapshot(){
  const r=root(),g=gate();
  return {
   doc:Math.max(0,Number(r?.scrollTop)||0,Number(window.scrollY)||0),
   gate:Math.max(0,Number(g?.scrollTop)||0),
   at:Date.now()
  };
 }
 function save(){
  if(!isHomeVisible())return;
  saved=snapshot();
  try{sessionStorage.setItem(KEY,JSON.stringify(saved))}catch(_){}
 }
 function known(){
  if(saved)return saved;
  try{
   const parsed=JSON.parse(sessionStorage.getItem(KEY)||'null');
   if(parsed&&Date.now()-Number(parsed.at)<12*3600000&&
      Number.isFinite(parsed.doc)&&Number.isFinite(parsed.gate)){
    saved=parsed;return parsed;
   }
  }catch(_){}
  return null;
 }
 function restoreNow(){
  const pos=known(),g=gate();
  if(!pos||!g||!isHomeVisible())return;
  const r=root();
  const documentY=Math.max(0,Number(pos.doc)||0);
  // Use direct scrollTop (no smooth scroll/animations); Safari must not
  // jump via scrollIntoView while selected wallet rail is rebuilt.
  if(r&&Math.abs((r.scrollTop||0)-documentY)>1)r.scrollTop=documentY;
  if(Math.abs((window.scrollY||0)-documentY)>1)window.scrollTo(0,documentY);
  const gateY=Math.max(0,Number(pos.gate)||0);
  if(Math.abs((g.scrollTop||0)-gateY)>1)g.scrollTop=gateY;
 }
 function restore(){
  restoreNow();
  requestAnimationFrame(()=>{
   restoreNow();
   requestAnimationFrame(restoreNow);
  });
 }
 // Capture before both native clicks and the iPhone fast-tap programmatic
 // click that navigation handlers synthesize from a real pointer release.
 document.addEventListener('pointerup',event=>{
  if(!isHomeVisible())return;
  if(event.target?.closest?.('#entryGate .entry-actions .entry-action'))save();
 },{capture:true,passive:true});
 document.addEventListener('click',event=>{
  if(!isHomeVisible())return;
  if(event.target?.closest?.('#entryGate .entry-actions .entry-action'))save();
 },true);
 window.addEventListener('pageshow',event=>{
  if(event.persisted&&isHomeVisible())restore();
 });
 // On iOS, history.back() may apply a scroll position after the section
 // iframe has been removed. Win that final paint as well.
 window.addEventListener('popstate',()=>{
  // The same-page Safari swipe shield is not a section return. Do not jump.
  if(history.state?.injGestureShield)return;
  if(isHomeVisible()&&known())restore();
 });
 window.INJ_HOME_SCROLL={save,restore,restoreNow};
})();
