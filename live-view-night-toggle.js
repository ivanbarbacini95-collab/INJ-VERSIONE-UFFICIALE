/* INJ Node · Live View: theme-native normal mode + OLED Night View. */
(() => {
 'use strict';
 const dialog=document.getElementById('focusDisplayDialog');
 const shell=dialog?.querySelector('.focus-display-shell');
 if(!dialog||!shell||document.getElementById('injLiveNightToggle'))return;
 const toggle=document.createElement('button');
 toggle.id='injLiveNightToggle';
 toggle.type='button';
 toggle.className='inj-live-night-toggle';
 toggle.setAttribute('aria-pressed','false');
 toggle.setAttribute('aria-label','Attiva Night View');
 toggle.setAttribute('title','Night View');
 toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.3 15.6A8.6 8.6 0 0 1 8.4 3.7 8.6 8.6 0 1 0 20.3 15.6Z"/></svg>';
 const frame=document.createElement('iframe');
 frame.id='injLiveNightFrame';
 frame.className='inj-live-night-frame';
 frame.title='Live View · Night View';
 frame.setAttribute('aria-hidden','true');
 frame.setAttribute('referrerpolicy','same-origin');
 frame.tabIndex=-1;
 frame.hidden=true;
 shell.append(frame,toggle);
 let active=false;
 function en(){try{return localStorage.getItem('inj_node_language_v1')==='en'}catch(_){return false}}
 function labels(){
  const night=active;
  const text=night?(en()?'Return to normal Live View':'Torna a Live View normale'):(en()?'Enable Night View':'Attiva Night View');
  toggle.setAttribute('aria-label',text);
  toggle.title=text;
  toggle.setAttribute('aria-pressed',String(night));
 }
 function setNight(next){
  if(next===active)return;
  active=next;
  dialog.classList.toggle('inj-live-night-active',active);
  if(active){
   frame.hidden=false;
   frame.tabIndex=0;
   frame.setAttribute('aria-hidden','false');
   frame.src='./night-view.html?embedded=live&v=20261110-liveview-night-toggle1';
  }else{
   frame.hidden=true;
   frame.tabIndex=-1;
   frame.setAttribute('aria-hidden','true');
   // Do not leave a hidden WebSocket/market poller active.
   frame.removeAttribute('src');
  }
  labels();
 }
 toggle.addEventListener('click',event=>{
  event.preventDefault();
  event.stopPropagation();
  if(dialog.hidden||dialog.classList.contains('mode-parked')||dialog.classList.contains('is-closing'))return;
  setNight(!active);
 });
 function sync(){
  const visible=!dialog.hidden&&!dialog.classList.contains('mode-parked')&&!dialog.classList.contains('is-closing');
  toggle.hidden=!visible;
  if(!visible&&active)setNight(false);
  if(visible)labels();
 }
 const observer=new MutationObserver(sync);
 observer.observe(dialog,{attributes:true,attributeFilter:['hidden','class']});
 window.addEventListener('injnode:languagechange',labels);
 window.addEventListener('pageshow',sync);
 sync();
})();
