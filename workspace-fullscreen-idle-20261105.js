/* INJ Node · Workspace · 2026-11-05.
   Keep Align All · 2 px reachable in fullscreen on both touch and desktop;
   hide it after inactivity so it never permanently obscures widget data. */
(()=>{
  'use strict';
  if(window.__injWorkspaceFullscreenIdle)return;
  window.__injWorkspaceFullscreenIdle=true;
  const body=document.body;
  if(!body)return;
  let active=false;
  let timer=0;
  let lastMove=0;
  const delay=2200;
  function show(){
    if(!body.classList.contains('ws-immersive'))return;
    body.classList.remove('ws-controls-idle');
    clearTimeout(timer);
    timer=window.setTimeout(()=>{
      if(body.classList.contains('ws-immersive')){
        body.classList.add('ws-controls-idle');
      }
    },delay);
  }
  function sync(){
    const next=body.classList.contains('ws-immersive');
    if(next===active)return;
    active=next;
    clearTimeout(timer);
    body.classList.remove('ws-controls-idle');
    if(next)show();
  }
  new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('pointerdown',show,{passive:true,capture:true});
  document.addEventListener('touchstart',show,{passive:true,capture:true});
  document.addEventListener('keydown',show,{capture:true});
  document.addEventListener('focusin',show,true);
  document.addEventListener('wheel',show,{passive:true,capture:true});
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
    const now=Date.now();
    if(now-lastMove<120)return;
    lastMove=now;
    show();
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)show();
  });
  window.addEventListener('pageshow',sync,{passive:true});
  sync();
})();
