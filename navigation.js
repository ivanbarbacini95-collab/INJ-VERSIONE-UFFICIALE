/* Keep Home mounted; use only the original page controls. */
(() => {
'use strict';
const main=!!document.getElementById('entryGate');
/* v16.10.27 — Stable touch navigation for the iPhone PWA and browser.
   No page pinch/reflow, no horizontal browser-history escape. Maintain native
   vertical scrolling, wallet/timeline rails, sliders and chart interactions. */
(function installInjGestureShield() {
 const root=document.documentElement;
 // WebKit exposes an independent page-pinch gesture. Prevent its default
 // viewport scaling, not the custom gestures consumed by chart components.
 const preventViewportPinch=e=>{if(e.cancelable)e.preventDefault();};
 document.addEventListener('gesturestart',preventViewportPinch,{capture:true,passive:false});
 document.addEventListener('gesturechange',preventViewportPinch,{capture:true,passive:false});
 document.addEventListener('wheel',event=>{
   // Trackpad pinch is exposed as Ctrl+wheel in desktop WebKit/Chromium.
   // Leave ordinary wheel/trackpad scrolling completely native.
   if(event.ctrlKey&&event.cancelable)event.preventDefault();
 },{capture:true,passive:false});
 let start=null;
 const isEditable=el=>Boolean(el?.closest?.('input,textarea,select,[contenteditable="true"]'));
 const isCustomHorizontal=el=>Boolean(el?.closest?.(
   'canvas,svg,[role="slider"],input[type="range"],[data-scroll-edge-exempt],'+
   '.ws-grid,#wsGrid,.ws-card,[class*="chart-stage"],[class*="chart-canvas"],'+
   '[class*="chart-pane"],[class*="tradingview"],[class*="lightweight-chart"],'+
   '.entry-wallets,.entry-pnl-timeline-scroll'
 ));
 function scrollCanMove(node,dx) {
   let target=node instanceof Element?node:node?.parentElement;
   while(target && target!==document.documentElement){
     if(target.scrollWidth>target.clientWidth+6){
       const css=getComputedStyle(target);
       if(/auto|scroll|overlay/.test(css.overflowX)){
         const max=target.scrollWidth-target.clientWidth;
         if(dx>0&&target.scrollLeft>2)return true;
         if(dx<0&&target.scrollLeft<max-2)return true;
       }
     }
     target=target.parentElement;
   }
   return false;
 }
 document.addEventListener('touchstart',event=>{
   if(event.touches.length!==1){start=null;return;}
   const finger=event.touches[0];
   start={x:finger.clientX,y:finger.clientY,target:event.target,axis:null};
 },{capture:true,passive:true});
 document.addEventListener('touchmove',event=>{
   if(event.touches.length>1){
     start=null;
     if(event.cancelable)event.preventDefault(); // no whole-page pinch zoom
     return;
   }
   if(!start||event.touches.length!==1||!event.cancelable)return;
   const finger=event.touches[0],dx=finger.clientX-start.x,dy=finger.clientY-start.y;
   if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9){
     start.axis=Math.abs(dx)>Math.abs(dy)*1.23?'horizontal':'vertical';
   }
   if(start.axis!=='horizontal')return; // native vertical scroll stays untouched
   if(Math.abs(dy)>Math.abs(dx)*1.1){start.axis='vertical';return;}
   // Horizontal controls still work, including at the physical screen edge.
   if(isEditable(start.target)||scrollCanMove(start.target,dx)||isCustomHorizontal(start.target))return;
   // Only a non-interactive sideways page drag is cancelled.
   event.preventDefault();
 },{capture:true,passive:false});
 for(const type of ['touchend','touchcancel'])document.addEventListener(type,()=>{start=null;},{capture:true,passive:true});
 // A native browser history swipe may bypass DOM touchmove completely on iOS.
 // Keep a same-document history buffer while the main app is mounted.
 if(!document.getElementById('entryGate')||window.parent!==window)return;
 try{
   const current=history.state||{};
   const cleanUrl=(location.hash==='#section'||location.hash==='#market')
     ?location.pathname+location.search:location.href;
   if(current.injGestureShield!=='top'){
     const base={...current,injSection:false,injMarketPortal:false,injGestureShield:'base'};
     history.replaceState(base,'',cleanUrl);
     history.pushState({...base,injGestureShield:'top'},'',cleanUrl);
   }
   // Re-install on every real page load, including a reload at the top guard.
   window.addEventListener('popstate',()=>{
     if(history.state?.injGestureShield==='base'){
       history.pushState({...history.state,injGestureShield:'top'},'',location.href);
     }
   });
 }catch(_){/* Browser restrictions: CSS/touch protection remains active. */}
})();


// Reuse the selected palette in every standalone/embedded section.
const themeKeys=['--bg','--surface','--surface-strong','--surface-soft','--line','--line-strong','--text','--muted','--muted-strong','--accent','--accent-soft','--up','--up-soft','--down','--down-soft','--page-gradient','--theme-canvas','--theme-canvas-soft','--theme-backdrop','--theme-browser','--panel','--panel-strong',
 '--card-gradient','--market-gradient','--dock-gradient','--floating-surface','--dialog-gradient',
 '--card-orb','--card-orb-alt','--card-inner-highlight','--card-shadow-accent','--shadow','--accent-ink'];
function syncSectionTheme(){
 if(main)return;
 let theme='navy';
 try{theme=localStorage.getItem('inj_monitor_theme')||theme;}catch(_){}
 if(theme==='dynamic')theme='ocean';
 if(!['navy','black','light','amber','ocean','chromatic','velvet','aqua','ocean-x-electric','ocean-x-ion','ocean-x-toxic','ocean-x-solar'].includes(theme))theme='navy';
 const root=document.documentElement;root.dataset.theme=theme;
 try{
  if(parent!==window && parent.location.origin===location.origin){
   const css=parent.getComputedStyle(parent.document.documentElement);
   for(const key of themeKeys){const value=css.getPropertyValue(key).trim();if(value)root.style.setProperty(key,value);else root.style.removeProperty(key);}
  }
 }catch(_){}
 root.style.colorScheme=(theme==='light'||theme==='aqua')?'light':'dark';
 const color=getComputedStyle(root).getPropertyValue('--bg').trim();
 if(color)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
}
syncSectionTheme();
window.addEventListener('storage',event=>{if(event.key==='inj_monitor_theme')syncSectionTheme();});
window.addEventListener('pageshow',syncSectionTheme);

function home(){
 if(parent===window)return;
 parent.postMessage({type:location.pathname.endsWith('market.html')?'injnode:market:home':'injnode:section:home'},location.origin);
}
// Retain the parent app while isolated sections run in their own document.
let section=null,sectionLauncher=null,sectionCover=null;
function closeSection(fromHistory=false){
 if(!section)return;
 section.remove();section=null;
 sectionCover?.remove();sectionCover=null;
 document.body.classList.remove('inj-section-open');
 // Native history never changes for section opens/closes; Home stays mounted.
 sectionLauncher?.focus({preventScroll:true});
 // Section iframe is gone: hand the native scroll surface back to Home.
 window.INJ_SCROLL_GUARD?.refresh();
 window.INJ_HOME_SCROLL?.restore();
}
window.INJ_OPEN_SECTION=function(url){
 if(!main || section)return;
 window.INJ_HOME_SCROLL?.save();
 setHeaderMenuOpen(false);
 sectionLauncher=document.activeElement;
 sectionCover=document.createElement('div');
 sectionCover.className='inj-section-cover';
 sectionCover.setAttribute('aria-hidden','true');
 sectionCover.innerHTML='<span class="inj-section-loading-mark">INJ NODE</span>';
 section=document.createElement('iframe');section.className='inj-content-frame';
 section.title='INJ Node';section.allow='fullscreen';
 const currentSection=section;
 const targetPath=new URL(url,location.href).pathname;
 section.addEventListener('load',()=>{
   if(section!==currentSection)return;
   try {
     if(currentSection.contentWindow?.location.pathname!==targetPath)return;
   }catch(_){return;}
   // CSS, scripts and document load have completed: never expose Safari's
   // temporary white about:blank document before this point.
   requestAnimationFrame(()=>{
     if(section===currentSection)currentSection.dataset.ready='true';
   });
 });
 document.body.append(sectionCover,section);
 document.body.classList.add('inj-section-open');
 section.src=url;
 // Opening a section no longer adds a swipe-back history entry.
};
if(main){
 document.addEventListener('click',event=>{
  const link=event.target.closest('#entryInjcEtfButton,#entryWorkspaceButton,#entryTreasuryButton,#entryLiveRewardsButton,#entryRewardLadderButton,#entryComparisonButton,#entryVisualizeWealthButton,#injAdminInsightsMenuButton,#injCloudSyncMenuButton');
  if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
  event.preventDefault();event.stopImmediatePropagation();window.INJ_OPEN_SECTION(link.href);
 },true);
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  const fromSection=event.source===section?.contentWindow;
  if(fromSection && event.data?.type==='injnode:section:home')closeSection();
 });
 window.addEventListener('popstate',()=>{if(history.state?.injGestureShield)return;if(section && !history.state?.injSection)closeSection(true);});
 window.addEventListener('keydown',event=>{if(section && event.key==='Escape')closeSection();});
}else if(parent!==window){
 document.addEventListener('click',event=>{
  if(!event.target.closest('#workspaceBack,#treasuryClose,#rewardsClose,#liveChartsBack,#ccBack,#bookBack,#ladderBack,#comparisonBack,#injcBack'))return;
  event.preventDefault();event.stopImmediatePropagation();home();
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape' && !document.querySelector('dialog[open]'))home();});
}
function language(){const en=localStorage.getItem('inj_node_language_v1')==='en';const el=document.querySelector('#entryMarketButton strong');if(el)el.textContent=en?'Market':'Mercato';}
window.addEventListener('injnode:languagechange',language);window.addEventListener('storage',language);language();
// The common i18n observer owns live text translation (no competing observer).
})();
