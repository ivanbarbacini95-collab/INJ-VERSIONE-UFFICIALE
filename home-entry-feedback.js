/* INJ Node · Home launch micro-feedback v16.07.19.
 * Runs only on a genuine section-launch gesture, never on live data or timers.
 * iOS Safari has no navigator.vibrate; no unsafe switch/checkbox overlays. */
(()=>{
 'use strict';
 if(!document.getElementById('entryGate'))return;
 const SOUND_KEY='inj_node_feedback_sound_v1';
 const HAPTIC_KEY='inj_node_feedback_haptic_v1';
 const VOLUME_KEY='inj_node_feedback_volume_v1';
 const DEFAULT_VOLUME=40; // Standard: matches the original 0.018 peak gain.
 const volumeInput=()=>document.getElementById('menuFeedbackVolume');
 const volumeLabel=()=>document.getElementById('menuFeedbackVolumeValue');
 const volumeTitle=()=>document.getElementById('menuFeedbackVolumeTitle');
 const volumeHint=()=>document.getElementById('menuFeedbackVolumeHint');
 const volumeWrap=()=>document.getElementById('menuFeedbackVolumeControl');
 const volume=()=>{
  try {
   const raw=localStorage.getItem(VOLUME_KEY);
   return raw===null?DEFAULT_VOLUME:Math.max(0,Math.min(100,Math.round(Number(raw)||0)));
  }catch(_){return DEFAULT_VOLUME}
 };
 const writeVolume=value=>{try{localStorage.setItem(VOLUME_KEY,String(value))}catch(_){}};
 const volumeText=value=>value===DEFAULT_VOLUME?'Standard · '+value+'%':value+'%';
 const soundButton=()=>document.getElementById('menuFeedbackSoundButton');
 const hapticButton=()=>document.getElementById('menuFeedbackHapticButton');
 const read=(key)=>{try{return localStorage.getItem(key)!=='off'}catch(_){return true}};
 const write=(key,on)=>{try{localStorage.setItem(key,on?'on':'off')}catch(_){}};
 const english=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'}catch(_){return document.documentElement.lang==='en'}};
 const tr=(it,en)=>english()?en:it;
 const canVibrate=()=>typeof navigator.vibrate==='function';
 // Keep the regular vibration preference only when the browser supports it.
 let last=-Infinity,audio=null;
 function update(){
  const snd=soundButton(),hap=hapticButton(),volumeControl=volumeInput(),volumeDisplay=volumeLabel();
  const level=volume();
  if(volumeControl){volumeControl.value=String(level);volumeControl.setAttribute('aria-valuetext',volumeText(level))}
  if(volumeDisplay)volumeDisplay.textContent=volumeText(level);
  if(volumeTitle())volumeTitle().textContent=tr('Volume apertura','Opening volume');
  if(volumeHint())volumeHint().textContent=tr('Rilascia per ascoltare un’anteprima','Release to hear a preview');
  if(volumeWrap()){
   volumeWrap().classList.toggle('is-muted',!read(SOUND_KEY));
   volumeWrap().style.setProperty('--volume-percent',level+'%');
  }
  if(volumeControl)volumeControl.disabled=!read(SOUND_KEY);
  if(volumeControl)volumeControl.setAttribute('aria-label',tr('Volume suono apertura','Opening sound volume'));
  for(const [id,it,en] of [
   ['menuFeedbackVolumeDown','Riduci volume','Decrease volume'],
   ['menuFeedbackVolumeUp','Aumenta volume','Increase volume']
  ]){
   const button=document.getElementById(id);
   if(button){button.disabled=!read(SOUND_KEY);button.setAttribute('aria-label',tr(it,en))}
  }
  if(snd){
   const on=read(SOUND_KEY);
   snd.setAttribute('aria-pressed',String(on));
   snd.setAttribute('aria-label',tr('Suono apertura sezioni: ','Section opening sound: ')+(on?tr('attivo','on'):tr('spento','off')));
   snd.querySelector('.menu-action-copy strong').textContent=tr('Suono apertura','Opening sound');
   snd.querySelector('.menu-action-copy small').textContent=tr('Tono breve quando apri una sezione','Soft tone when opening a section');
   snd.querySelector('.menu-action-value').textContent=on?tr('ON','ON'):tr('OFF','OFF');
  }
  if(hap){
   const supported=canVibrate(),on=read(HAPTIC_KEY);
   hap.hidden=!supported;
   hap.disabled=!supported;
   hap.setAttribute('aria-pressed',String(on&&supported));
   hap.setAttribute('aria-label',tr('Vibrazione apertura sezioni: ','Section opening vibration: ')+(on?'ON':'OFF'));
   hap.querySelector('.menu-action-copy strong').textContent=tr('Vibrazione breve','Short vibration');
   hap.querySelector('.menu-action-copy small').textContent=tr('Piccolo impulso all’apertura','Small pulse on opening');
   hap.querySelector('.menu-action-value').textContent=supported?(on?'ON':'OFF'):tr('N/D','N/A');
  }
 }
 // INJ Node effects are interface feedback, not media playback.
 // Ambient audio follows the iPhone Ring/Silent switch automatically:
 // muted while Silent is active, audible again after Ring is restored.
 // Safari does not disclose the switch state, so never persist a false mute.
 function useSystemAudioMode(){
  try{
   const session=navigator.audioSession;
   if(session&&session.type!=='ambient')session.type='ambient';
  }catch(_){/* Older WebKit: retain its default Ring/Silent behavior. */}
 }
 function playSound(){
  if(!read(SOUND_KEY)||volume()===0)return;
  try{
   useSystemAudioMode();
   const Ctx=window.AudioContext||window.webkitAudioContext;
   if(!Ctx)return;
   if(!audio||audio.state==='closed')audio=new Ctx({latencyHint:'interactive'});
   if(audio.state==='suspended'||audio.state==='interrupted'){
    const resumed=audio.resume();
    if(resumed?.catch)void resumed.catch(()=>{});
   }
   const t=audio.currentTime;
   const oscillator=audio.createOscillator(),gain=audio.createGain();
   oscillator.type='sine';
   oscillator.frequency.setValueAtTime(690,t);
   oscillator.frequency.exponentialRampToValueAtTime(860,t+.072);
   gain.gain.setValueAtTime(.0001,t);
   // 40% == old standard volume; ceiling modest to protect device speakers.
   const peak=Math.max(.0001,Math.min(.045,.045*volume()/100));
   gain.gain.exponentialRampToValueAtTime(peak,t+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.105);
   oscillator.connect(gain);gain.connect(audio.destination);
   oscillator.start(t);oscillator.stop(t+.11);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
  }catch(_){/* Audio policies can block sound; navigation must never fail. */}
 }
 function vibrate(){
  if(!read(HAPTIC_KEY)||!canVibrate())return;
  try{navigator.vibrate(35)}catch(_){/* optional enhancement; iPhone native switch duration is OS-controlled */}
 }
 // Home has two genuine activation paths:
 // (1) pointerup for Safari's fast-tap buttons: app.js immediately invokes
 //     button.click(), producing an *untrusted* synthetic click.
 // (2) native trusted click for mouse, keyboard, and normal link activation.
 // Listening only for event.isTrusted clicks silently misses mobile buttons.
 const sectionFor=source=>{
  if(!(source instanceof Element))return null;
  const section=source.closest('#entryGate .entry-actions .entry-action');
  return section&&!section.matches('[disabled],[aria-disabled="true"]')?section:null;
 };
 let touchStart=null,lastPointerSection=null,lastPointerAt=0;
 function signal(section){
  if(!section)return;
  const now=performance.now();
  if(now-last<175)return;
  last=now;
  vibrate();
  playSound();
 }
 document.addEventListener('pointerdown',event=>{
  if(!event.isTrusted||(event.pointerType!=='touch'&&event.pointerType!=='pen'))return;
  const section=sectionFor(event.target);
  if(!section)return;
  touchStart={id:event.pointerId,section,x:event.clientX,y:event.clientY,moved:false};
 },{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{
  if(!touchStart||event.pointerId!==touchStart.id)return;
  const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;
  if(dx*dx+dy*dy>144)touchStart.moved=true;
 },{capture:true,passive:true});
 document.addEventListener('pointercancel',event=>{
  if(touchStart?.id===event.pointerId)touchStart=null;
 },{capture:true,passive:true});
 document.addEventListener('pointerup',event=>{
  if(!touchStart||event.pointerId!==touchStart.id)return;
  const gesture=touchStart;touchStart=null;
  if(gesture.moved||sectionFor(event.target)!==gesture.section)return;
  // One genuine sound before app.js performs the fast-tap synthetic click.
  lastPointerSection=gesture.section;
  lastPointerAt=performance.now();
  signal(gesture.section);
 },{capture:true,passive:true});
 document.addEventListener('click',event=>{
  if(!event.isTrusted||event.defaultPrevented||event.button>0||
    event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const section=sectionFor(event.target);
  if(!section)return;
  // Ignore Safari's delayed trusted click after the same pointer release.
  if(section===lastPointerSection&&performance.now()-lastPointerAt<1100)return;
  signal(section);
 },true);
 soundButton()?.addEventListener('click',()=>{
  write(SOUND_KEY,!read(SOUND_KEY));update();
 });
 hapticButton()?.addEventListener('click',()=>{
  if(!canVibrate())return;
  write(HAPTIC_KEY,!read(HAPTIC_KEY));update();
 });
 volumeInput()?.addEventListener('input',event=>{
  const next=Math.max(0,Math.min(100,Math.round(Number(event.target.value)||0)));
  writeVolume(next);
  update();
 });
 volumeInput()?.addEventListener('change',()=>{playSound()});
 for(const [id,step] of [['menuFeedbackVolumeDown',-10],['menuFeedbackVolumeUp',10]]){
  document.getElementById(id)?.addEventListener('click',()=>{
   if(!read(SOUND_KEY))return;
   writeVolume(Math.max(0,Math.min(100,volume()+step)));
   update();
   playSound();
  });
 }
 window.addEventListener('injnode:languagechange',update);
 window.addEventListener('storage',event=>{
  if([SOUND_KEY,HAPTIC_KEY,VOLUME_KEY,'inj_node_language_v1'].includes(event.key))update();
 });
 update();
})();
