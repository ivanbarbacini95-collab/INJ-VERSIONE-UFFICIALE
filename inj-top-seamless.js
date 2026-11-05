/* INJ Node · Native PWA chrome palette sync · 2026-11-05.
   Do not inject a high-z-index fake status bar on top of Home.
   iOS owns the clock/sensor cutout; the page paints a full-bleed
   theme canvas underneath whenever the installed PWA permits it. */
(() => {
 'use strict';
 const root=document.documentElement;
 let pending=false;
 function isLight(hex){
   const m=/^#([0-9a-f]{6})$/i.exec(hex.trim());
   if(!m)return root.dataset.theme==='classic-white'||root.dataset.theme==='arctic';
   const c=[1,3,5].map(i=>parseInt(m[1].slice(i-1,i+1),16)/255)
       .map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
   return c[0]*.2126+c[1]*.7152+c[2]*.0722>.53;
 }
 function sync(){
   pending=false;
   // Previously the 7px edge sample was fixed above all application
   // surfaces (including modal controls). Never reinstall it.
   document.getElementById('injNativeChromeEdgeSample')?.remove();
   const css=getComputedStyle(root);
   const color=css.getPropertyValue('--theme-canvas').trim()||
     css.getPropertyValue('--bg').trim()||
     css.getPropertyValue('--canvas').trim();
   if(!color)return;
   const theme=document.querySelector('meta[name="theme-color"]');
   if(theme&&theme.content!==color)theme.content=color;
   // On light palettes prefer readable dark system text. On dark palettes
   // ask iOS for a translucent native status area so the actual page
   // canvas can extend to the upper edge; it is not a fake HTML overlay.
   const status=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
   const mode=isLight(color)?'default':'black-translucent';
   if(status&&status.content!==mode)status.content=mode;
 }
 function queue(){
   if(pending)return;
   pending=true;
   requestAnimationFrame(sync);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 else sync();
 window.addEventListener('pageshow',sync,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();});
 window.addEventListener('injnode:themechange',queue);
 new MutationObserver(queue).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();
