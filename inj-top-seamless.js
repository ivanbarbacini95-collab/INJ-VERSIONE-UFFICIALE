/* INJ VERSIONE UFFICIALE · iOS 27 native status-bar continuity.
   iOS 27 no longer supports drawing arbitrary web content beneath the
   status area of a newly installed Home Screen PWA. WebKit recommends
   OMITTING apple-mobile-web-app-status-bar-style altogether.
   Do not reinsert or mutate that tag: launch-time chrome is installation-scoped.
   Keep metadata colour theme-aware for Safari, Android and other browsers.
   This file never alters positions, scrolling or wallet state. */
(()=>{
  'use strict';
  const root=document.documentElement;
  let queued=false;
  function sync(){
    queued=false;
    const computed=getComputedStyle(root);
    const color=computed.getPropertyValue('--theme-canvas').trim() ||
      computed.getPropertyValue('--bg').trim() ||
      computed.getPropertyValue('--canvas').trim();
    const tag=document.querySelector('meta[name="theme-color"]');
    if(tag && color && tag.content!==color)tag.content=color;
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  window.addEventListener('pageshow',sync);
  window.addEventListener('injnode:themechange',queue);
  new MutationObserver(queue).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();
