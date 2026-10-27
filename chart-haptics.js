/* INJ Node · Chart touch haptics 16.07.20
 * Native Vibration API: a slightly longer entry pulse and gentle, throttled
 * pulses while actively dragging a market chart. No vibration outside touch
 * gestures; stops immediately on release/cancel/hide.
 * iOS PWA: navigator.vibrate is unsupported. Native iOS slider haptics are
 * device-controlled and may produce tactile detents; no fake programmatic
 * switch clicks, timers, or transparent touch-trapping layers. */
(()=>{
 'use strict';
 const KEY='inj_node_feedback_haptic_v1';
 const enabled=()=>{try{return localStorage.getItem(KEY)!=='off'}catch(_){return true}};
 const canVibrate=()=>typeof navigator.vibrate==='function';
 const ios=()=>{
  const ua=String(navigator.userAgent||'');
  return /iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
 };
 const vibrate=pattern=>{
  try{if(enabled()&&canVibrate())navigator.vibrate(pattern)}catch(_){}
 };
 const targets=['detailChart','mainCanvas'];
 let active=null,lastPulse=0;
 function stop(){
  if(active&&canVibrate())try{navigator.vibrate(0)}catch(_){}
  active=null;
 }
 for(const id of targets){
  const element=document.getElementById(id);if(!element)continue;
  element.addEventListener('pointerdown',event=>{
   if(!enabled()||!canVibrate()||event.pointerType==='mouse'||(event.button!==undefined&&event.button!==0))return;
   stop();
   active={id:event.pointerId,target:element,x:event.clientX,y:event.clientY};
   lastPulse=performance.now();
   vibrate(44); // normal 14ms section tick, longer 44ms chart contact
  },{passive:true});
  element.addEventListener('pointermove',event=>{
   if(!active||active.target!==element||event.pointerId!==active.id)return;
   const distance=Math.hypot(event.clientX-active.x,event.clientY-active.y);
   if(distance<4)return;
   const now=performance.now();
   if(now-lastPulse<120)return;
   lastPulse=now;active.x=event.clientX;active.y=event.clientY;
   vibrate(110); // bounded gentle repetition only while a finger moves
  },{passive:true});
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
   element.addEventListener(type,event=>{
    if(active?.target===element&&(type==='lostpointercapture'||event.pointerId===active.id))stop();
   },{passive:true});
  }
  element.addEventListener('pointerleave',event=>{
   if(active?.target===element&&event.pointerType==='touch'&&!element.hasPointerCapture?.(active.id))stop();
  },{passive:true});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop);
 // A native range input can be physically scrubbed by the user's thumb.
 // iPhone decides whether to emit slider detent haptics. It is never a
 // synthetic switch and it never intercepts the main chart's drag gesture.
 const row=document.getElementById('detailHapticScrubRow');
 const range=document.getElementById('detailHapticScrub');
 function update(){
  if(!row||!range)return;
  const supported=ios()&&!canVibrate()&&enabled();
  row.hidden=!supported;
  range.disabled=!supported;
  const it=document.documentElement.lang!=='en';
  range.setAttribute('aria-label',it?'Scorri e ispeziona prezzi':'Scrub and inspect prices');
  const label=row.querySelector('label');
  if(label)label.textContent=it?'Scorrimento tattile (prova iPhone)':'Tactile scrub (iPhone test)';
  const hint=row.querySelector('small');
  if(hint)hint.textContent=it?'Feedback a scatti se previsto da iOS':'Haptic detents if supported by iOS';
 }
 range?.addEventListener('input',()=>{
  window.MARKET_PRO?.scrubAt?.(Math.max(0,Math.min(1,Number(range.value)/100)));
 });
 window.addEventListener('storage',event=>{if(!event.key||event.key===KEY)update()});
 window.addEventListener('injnode:languagechange',update);
 update();
})();
