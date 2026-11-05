/* INJ Node · theme-aware browser/status color.
   The content canvas and meta theme-color use the same selected palette.
   iOS Home Screen native status chrome may remain installation-controlled;
   do not create a fake bar or change safe-area dimensions. */
(()=>{
  'use strict';
  const root=document.documentElement;
  let queued=false;
  let edgeSample=null;
  // On newer iOS versions, Safari may sample a real fixed element at the
  // content edge when choosing native chrome colors. This is a best-effort
  // hint only: the OS-owned status area can still be fixed at install time.
  function installEdgeSample(){
    if(root.dataset.injPage!=='index'||!document.body)return;
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const standalone=navigator.standalone===true||
      Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches);
    if(!ios||!standalone)return;
    edgeSample=document.getElementById('injNativeChromeEdgeSample');
    if(edgeSample)return;
    edgeSample=document.createElement('span');
    edgeSample.id='injNativeChromeEdgeSample';
    edgeSample.setAttribute('aria-hidden','true');
    edgeSample.style.cssText=[
      'position:fixed','top:0','left:0','width:100%','height:7px',
      'z-index:2147483646','pointer-events:none','display:block',
      'visibility:visible','opacity:1',
      'background-color:var(--theme-canvas,var(--bg,#060b11))'
    ].join(';');
    document.body.appendChild(edgeSample);
  }
  function sync(){
    queued=false;
    installEdgeSample();
    const computed=getComputedStyle(root);
    const color=computed.getPropertyValue('--theme-canvas').trim() ||
      computed.getPropertyValue('--bg').trim() ||
      computed.getPropertyValue('--canvas').trim();
    // Read exactly the same tone as the theme canvas. Mixing a separate
    // accent here made the native top strip visibly different after switching.
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
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();});
  window.addEventListener('injnode:themechange',queue);
  new MutationObserver(queue).observe(root,{attributes:true,attributeFilter:['data-theme']});
})();
