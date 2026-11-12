/* Live View: original view remains in the app theme; Night View is a disposable overlay. */
(() => {
'use strict';
const dialog=document.getElementById('focusDisplayDialog');
const shell=dialog?.querySelector('.focus-display-shell');
if(!dialog||!shell)return;
document.getElementById('injLiveNightFrame')?.remove();
document.getElementById('injLiveNightToggle')?.remove();
document.getElementById('injLiveNightClose')?.remove();
dialog.classList.remove('inj-live-night-active');
shell.inert=false;
function button(id,cls,svg,label){
 const b=document.createElement('button');b.id=id;b.className=cls;b.type='button';
 b.innerHTML=svg;b.setAttribute('aria-label',label);b.title=label;
 dialog.append(b);return b;
}
const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 15.6A8.6 8.6 0 0 1 8.4 3.7 8.6 8.6 0 1 0 20.3 15.6Z"/></svg>';
const cross='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const toggle=button('injLiveNightToggle','inj-live-night-toggle',moon,'Attiva Night View');
const close=button('injLiveNightClose','inj-live-night-close',cross,'Chiudi Live View');
close.hidden=true;
let active=false,frame=null;
function en(){try{return localStorage.getItem('inj_node_language_v1')==='en'}catch(_){return false}}
function visible(){return !dialog.hidden&&!dialog.classList.contains('mode-parked')&&!dialog.classList.contains('is-closing')}
function labels(){
 const msg=active?(en()?'Normal Live View':'Live View normale'):(en()?'Enable Night View':'Attiva Night View');
 toggle.setAttribute('aria-label',msg);toggle.title=msg;toggle.setAttribute('aria-pressed',String(active));
 close.setAttribute('aria-label',en()?'Close Live View':'Chiudi Live View');
}
function exitNight(){
 if(!active&&!frame)return;
 active=false;
 frame?.remove();frame=null;
 shell.inert=false;
 dialog.classList.remove('inj-live-night-active');
 close.hidden=true;labels();
}
function enterNight(){
 if(active||!visible())return;
 const child=document.createElement('iframe');
 child.id='injLiveNightFrame';child.className='inj-live-night-frame';
 child.title='Night View · INJ Node';child.setAttribute('referrerpolicy','same-origin');
 child.tabIndex=0;frame=child;active=true;
 dialog.classList.add('inj-live-night-active');
 shell.inert=true;close.hidden=false;
 dialog.insertBefore(child,toggle);
 child.src='./night-view.html?embedded=live&v=20261110-live-night-isolation2';
 labels();
}
toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(visible()){if(active)exitNight();else enterNight()}});
close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();exitNight();document.getElementById('closeFocusDisplayButton')?.click()});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data?.type==='injnode:live-view:normal')exitNight()});
function sync(){const show=visible();if(!show)exitNight();toggle.hidden=!show;close.hidden=!show||!active;labels()}
new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['hidden','class']});
window.addEventListener('injnode:languagechange',labels);
window.addEventListener('pageshow',sync);
window.addEventListener('pagehide',exitNight);
sync();
})();