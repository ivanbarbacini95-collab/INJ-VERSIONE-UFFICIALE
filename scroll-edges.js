/* INJ Node v16.01.43 — Stop only gestures that pull past a real page boundary.
   Never take ownership of regular scrolling, wallet carousels or pinch zoom. */
(() => {
  'use strict';
  const root=document.documentElement;
  const isIOS= /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  // iOS Home and Dashboard must use Safari's native document scrolling.
  // A capture-phase preventDefault sometimes classified a valid downward
  // swipe as a boundary gesture after a mode return and froze the page.
  // Keep the overscroll fallback only on standalone screens.
  if(isIOS && root.dataset.injPage!=='index'){
    let lastX=0,lastY=0,tracking=false;
    const reset=()=>{tracking=false;};
    const canScrollY=(target,dy)=>{
      let node=target instanceof Element?target:target?.parentElement;
      while(node && node!==document.documentElement && node!==document.body){
        const style=getComputedStyle(node);
        if(/^(auto|scroll|overlay)$/.test(style.overflowY)){
          const max=node.scrollHeight-node.clientHeight;
          if(max>2 && (dy>0?node.scrollTop>1:node.scrollTop<max-1))return true;
        }
        node=node.parentElement;
      }
      const doc=document.scrollingElement||document.documentElement;
      const max=Math.max(0,doc.scrollHeight-doc.clientHeight);
      const pos=doc.scrollTop;
      return max>1&&(dy>0?pos>1:pos<max-1);
    };
    document.addEventListener('touchstart',(event)=>{
      if(event.touches.length!==1){reset();return;}
      tracking=true;lastX=event.touches[0].clientX;lastY=event.touches[0].clientY;
    },{capture:true,passive:true});
    document.addEventListener('touchmove',(event)=>{
      if(!tracking||event.touches.length!==1||!event.cancelable)return;
      const x=event.touches[0].clientX,y=event.touches[0].clientY;
      const dx=x-lastX,dy=y-lastY;
      lastX=x;lastY=y;
      // Horizontal wallet swipes, charts and two-finger zoom remain fully native.
      if(Math.abs(dy)<1.5||Math.abs(dx)>=Math.abs(dy)*.85)return;
      const target=event.target;
      if(target?.closest?.('input[type="range"],[data-scroll-edge-exempt]'))return;
      if(!canScrollY(target,dy))event.preventDefault();
    },{capture:true,passive:false});
    document.addEventListener('touchend',reset,{capture:true,passive:true});
    document.addEventListener('touchcancel',reset,{capture:true,passive:true});
  }

  if(root.dataset.injPage!=='index')return;
  const progress=document.getElementById('injScrollProgress');
  if(!progress)return;
  let frame=0;
  const render=()=>{
    frame=0;
    const home=document.getElementById('entryGate');
    const visible=home?.classList.contains('visible')&&home.getAttribute('aria-hidden')!=='true';
    const inHome=visible&&!home.querySelector('.entry-gate-shell.first-access')&&
      !document.querySelector('.inj-content-frame') &&
      !document.body.classList.contains('inj-section-open')&&
      !document.querySelector('#converterView.open,#performanceTimelineView.open');
    const el=document.scrollingElement||document.documentElement;
    const max=Math.max(0,el.scrollHeight-el.clientHeight);
    const show=inHome&&max>30;
    progress.hidden=!show;
    if(show){
      const ratio=Math.max(0,Math.min(1,el.scrollTop/max));
      progress.style.setProperty('--inj-reading-progress',ratio.toFixed(4));
    }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('popstate',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  const gate=document.getElementById('entryGate');
  const gateShell=gate?.querySelector('.entry-gate-shell');
  if(gate)observer.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
  if(gateShell)observer.observe(gateShell,{attributes:true,attributeFilter:['class']});
  schedule();
})();
