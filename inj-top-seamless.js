/* INJ VERSIONE UFFICIALE · theme-aware iOS status bar, 2026-10-28.
   Metadata only. No scroll, layout or panel changes. */
(()=>{
 'use strict';
 const root=document.documentElement;
 function sync(){
   const style=getComputedStyle(root);
   const value=style.getPropertyValue('--inj-status-tone').trim()
     ||style.getPropertyValue('--theme-canvas').trim()
     ||style.getPropertyValue('--bg').trim();
   const themeColor=document.querySelector('meta[name="theme-color"]');
   if(themeColor && value && themeColor.content!==value)themeColor.content=value;
   const native=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
   const light=['light','aqua'].includes(root.dataset.theme);
   if(native){const next=light?'default':'black-translucent';if(native.content!==next)native.content=next}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 else sync();
 window.addEventListener('pageshow',sync);
 window.addEventListener('injnode:themechange',sync);
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();
