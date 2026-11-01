/* INJ Node · Native-style five-destination Home navigation, 30 Oct 2026.
   Existing launchers, IDs, listeners and wallet/chart DOM remain untouched.
   Switch only their presentation; never clone wallet/trading components. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const gate=document.getElementById('entryGate');
 const actions=gate?.querySelector('.entry-actions.entry-flat-v44');
 if(!gate||!actions||document.getElementById('injPrimaryBottomNav'))return;
 const sections=[
  {id:'mercato',it:'Mercato',en:'Market',titleIt:'MERCATO',titleEn:'MARKET',subIt:'Prezzi, analisi e calendario macro',subEn:'Prices, research and macro calendar',ids:['entryGlobalMarketsButton','entryGlobalCryptoButton','entryLiveChartsButton','entryOrderBookButton','entryPerformanceButton','entryMacroCalendarButton'],icon:'<path d="M3 20h18M5 17V6M7 15l4-4 3 2 5-7M16 6h3v3"/>'},
  {id:'etf',it:'ETF',en:'ETF',titleIt:'',titleEn:'',subIt:'',subEn:'',ids:[],icon:'<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h4m-4 5 3-3 2 2 3-4"/>'},
  {id:'home',it:'Home',en:'Home',titleIt:'',titleEn:'',subIt:'',subEn:'',ids:['entryDashboardButton','entryLiveButton','entryTreasuryButton'],icon:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'},
  {id:'reward',it:'My Reward',en:'My Reward',titleIt:'MY REWARD',titleEn:'MY REWARD',subIt:'Staking e ricompense del wallet selezionato',subEn:'Selected wallet staking and rewards',ids:[],icon:'<path d="M12 2v20M16 6H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H7"/>'},
  {id:'altro',it:'Tools',en:'Tools',titleIt:'TOOLS',titleEn:'TOOLS',subIt:'Simulazioni, libertà finanziaria e altri strumenti',subEn:'Simulations, financial freedom and other tools',ids:['entryComparisonButton','entryVisualizeWealthButton','entryFreedomButton','entryWorkspaceButton','entryConverterButton','entryCommandCenterButton'],icon:'<circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none"/>'}
 ];
 const originalDisplay=new WeakMap();
 const heading=document.createElement('header');
 heading.id='injTabHeading';heading.className='inj-tab-heading';heading.hidden=true;
 heading.innerHTML='<div><span class="inj-tab-eyebrow">INJ NODE / EXPLORE</span><h2 id="injTabHeadingTitle"></h2><p id="injTabHeadingSubtitle"></p></div>';
 actions.before(heading);
 // ETF is a direct, dedicated tab — no intermediate INJC ETF launcher.
 // Embed the existing stand-alone INJC page to preserve its live data and code.
 const etfPanel=document.createElement('section');
 etfPanel.id='injEtfTabPanel';
 etfPanel.className='inj-etf-tab-panel';
 etfPanel.hidden=true;
 etfPanel.setAttribute('aria-label','INJC ETF');
 const etfFrame=document.createElement('iframe');
 etfFrame.className='inj-etf-tab-frame';
 etfFrame.title='INJC ETF';
 etfFrame.setAttribute('loading','eager');
 etfFrame.setAttribute('referrerpolicy','same-origin');
 etfPanel.appendChild(etfFrame);
 document.body.appendChild(etfPanel);
 let etfLoaded=false;
 function loadEtfTab(){
  if(etfLoaded)return;
  etfLoaded=true;
  const source=document.getElementById('entryInjcEtfButton')?.getAttribute('href')||'./injc-etf.html';
  etfFrame.src=new URL(source,document.baseURI).href;
 }
 etfFrame.addEventListener('load',()=>{
  try{
   const language=localStorage.getItem('inj_node_language_v1')==='en'?'en':'it';
   etfFrame.contentWindow?.postMessage({type:'injnode:languagechange',language},location.origin);
  }catch(_){}
 });
 // Existing INJC back-home button posts this message from navigation.js.
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==etfFrame.contentWindow)return;
  if(event.data?.type==='injnode:section:home')activate('home',true);
 });

 const nav=document.createElement('nav');
 nav.id='injPrimaryBottomNav';
 nav.className='inj-primary-bottom-nav';
 nav.setAttribute('aria-label','Navigazione principale');
 const buttons=new Map();
 sections.forEach(section=>{
  const button=document.createElement('button');
  button.type='button';button.className='inj-bottom-tab';button.dataset.injTab=section.id;
  button.innerHTML='<span class="inj-bottom-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+section.icon+'</svg></span><span class="inj-bottom-tab-label"></span>';
  nav.append(button);buttons.set(section.id,button);
  button.addEventListener('click',()=>{
   if(root.dataset.injHomeTab!==section.id){activate(section.id,true);}
   else if(section.id==='home')scrollHomeTop();
  });
 });
 document.body.append(nav);
 /* Promote the five-tab dock to the browser top layer. Fixed elements inside
    a transformed/scroll-locked PWA body can otherwise move with its content
    or sit below the Home overlay on iOS. Manual popovers are non-modal, so
    wallet swipes and vertical page scrolling remain fully interactive. */
 const supportsTopLayer=typeof nav.showPopover==='function' && typeof nav.hidePopover==='function';
 let syncTopLayer=()=>{};
 if(supportsTopLayer){
  nav.setAttribute('popover','manual');
  syncTopLayer=()=>{
   const shell=gate.querySelector('.entry-gate-shell');
   const performanceView=document.getElementById('performanceTimelineView');
   const marketPerformance=root.dataset.injHomeTab==='mercato' &&
     performanceView && !performanceView.hidden;
   const visible=gate.classList.contains('visible') &&
     (gate.getAttribute('aria-hidden')==='false'||marketPerformance) &&
     document.body.classList.contains('entry-gate-open') &&
     root.dataset.injHomeTab!=='mercato' &&
     root.dataset.injHomeTab!=='reward' &&
     !document.body.classList.contains('boot-loading') &&
     !document.body.classList.contains('inj-section-open') &&
     !document.body.classList.contains('menu-overlay-open') &&
     !document.body.classList.contains('drawer-open') &&
     (!document.body.classList.contains('entry-live-launch')||marketPerformance) &&
     !shell?.classList.contains('first-access');
   if(visible&&!nav.matches(':popover-open')){
    try{nav.showPopover()}catch(_){/* Retry after the Home becomes renderable. */}
   }else if(!visible&&nav.matches(':popover-open')){
    try{nav.hidePopover()}catch(_){}
   }
  };
  const visibilityObserver=new MutationObserver(syncTopLayer);
  visibilityObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  visibilityObserver.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
  visibilityObserver.observe(gate.querySelector('.entry-gate-shell'),{attributes:true,attributeFilter:['class']});
  visibilityObserver.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab']});
  const performanceView=document.getElementById('performanceTimelineView');
  if(performanceView)visibilityObserver.observe(performanceView,{attributes:true,attributeFilter:['hidden','class']});
  window.addEventListener('pageshow',syncTopLayer);
  requestAnimationFrame(syncTopLayer);
 }else{
  /* Older browsers still use the high-z-index fixed CSS fallback. */
  nav.removeAttribute('popover');
 }
 const getEnglish=()=>{
  try{return localStorage.getItem('inj_node_language_v1')==='en'||root.lang==='en';}
  catch(_){return root.lang==='en';}
 };
 function refreshLanguage(){
  const en=getEnglish();
  for(const section of sections){
   const button=buttons.get(section.id);
   button.querySelector('.inj-bottom-tab-label').textContent=en?section.en:section.it;
   button.setAttribute('aria-label',en?section.en:section.it);
  }
  nav.setAttribute('aria-label',en?'Main navigation':'Navigazione principale');
  const section=sections.find(item=>item.id===root.dataset.injHomeTab)||sections[0];
  document.getElementById('injTabHeadingTitle').textContent=en?section.titleEn:section.titleIt;
  document.getElementById('injTabHeadingSubtitle').textContent=en?section.subEn:section.subIt;
 }
 let tabScrollRevision=0;
 function resetTabScroll(){
  const s=document.scrollingElement||document.documentElement;
  for(const el of [s,document.documentElement,document.body,gate]){
   if(el && el.scrollTop>0)el.scrollTop=0;
  }
  if(window.scrollY>0)window.scrollTo(0,0);
 }
 function scrollHomeTop(){
  const current=++tabScrollRevision;
  resetTabScroll();
  requestAnimationFrame(()=>{
   if(current!==tabScrollRevision)return;
   resetTabScroll();
   requestAnimationFrame(()=>{
    if(current===tabScrollRevision)resetTabScroll();
   });
  });
 }

 /* Native Home scroll: no scrollTop clamp, no wheel/touch preventDefault.
    The document's real height and small padding below Treasury determine its
    natural endpoint. The scroll observer changes only the dock's CSS state. */
 let revealFrame=0;
 const primaryScroller=()=>document.scrollingElement||document.documentElement;
 const isHomeForeground=()=>root.dataset.injHomeTab==='home' &&
  gate.classList.contains('visible') &&
  gate.getAttribute('aria-hidden')==='false' &&
  document.body.classList.contains('entry-gate-open') &&
  !document.body.classList.contains('boot-loading') &&
  !document.body.classList.contains('menu-overlay-open') &&
  !document.body.classList.contains('drawer-open') &&
  !document.body.classList.contains('inj-section-open') &&
  !document.body.classList.contains('entry-live-launch') &&
  !document.body.classList.contains('chart-overlay-open') &&
  !document.body.classList.contains('focus-display-open') &&
  !document.body.classList.contains('pulse-view-open') &&
  !document.body.classList.contains('live-charts-open') &&
  !document.querySelector('#injMarketEventsOverlay:not([hidden]),#injMarketPortal:not([hidden]),#injFreedomOverlay:not([hidden]),#converterView.open,#performanceTimelineView.open,dialog[open],.inj-content-frame');
 // The Home dock must remain present from the first visible Home screen,
 // independent of vertical scrolling; fullscreen overlays still hide it.
 function updateDockReveal(){
  const show=root.dataset.injHomeTab==='home'?isHomeForeground():true;
  const value=String(show);
  if(root.dataset.injHomeNavVisible!==value)root.dataset.injHomeNavVisible=value;
 }
 function scheduleDockRefresh(){
  if(revealFrame)return;
  revealFrame=requestAnimationFrame(()=>{
   revealFrame=0;
   updateDockReveal();
  });
 }
 window.addEventListener('scroll',scheduleDockRefresh,{passive:true});
 gate.addEventListener('scroll',scheduleDockRefresh,{passive:true});
 window.addEventListener('resize',scheduleDockRefresh,{passive:true});
 window.visualViewport?.addEventListener('resize',scheduleDockRefresh,{passive:true});
 window.addEventListener('pageshow',scheduleDockRefresh,{passive:true});

 function applyVisibility(section){
  const shown=new Set(section.ids);
  for(const element of actions.querySelectorAll(':scope > .entry-action')){
   if(!originalDisplay.has(element))originalDisplay.set(element,{
    value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')
   });
   if(shown.has(element.id)){
    const old=originalDisplay.get(element);
    if(old.value)element.style.setProperty('display',old.value,old.priority);
    else element.style.removeProperty('display');
   }else element.style.setProperty('display','none','important');
  }
 }
 function activate(id,scroll){
  const section=sections.find(item=>item.id===id)||sections[0];
  root.dataset.injHomeTab=section.id;
  if(section.id==='home')root.dataset.injHomeNavVisible='true';
  else root.dataset.injHomeNavVisible='true';
  // The original launcher elements remain direct children in their original order.
  applyVisibility(section);
  heading.hidden=section.id==='home'||section.id==='etf';
  etfPanel.hidden=section.id!=='etf';
  etfPanel.setAttribute('aria-hidden',section.id==='etf'?'false':'true');
  etfFrame.tabIndex=section.id==='etf'?0:-1;
  if(section.id==='etf')loadEtfTab();
  for(const [key,button] of buttons){
   const selected=key===section.id;
   button.classList.toggle('is-active',selected);
   if(selected)button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  }
  refreshLanguage();
  if(scroll)scrollHomeTop();
  scheduleDockRefresh();
 }
 // Only re-check direct launchers if other startup scripts append one.
 // Child text mutations from streaming prices do not trigger this observer.
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;
  pending=true;
  requestAnimationFrame(()=>{
   pending=false;
   const selected=sections.find(x=>x.id===root.dataset.injHomeTab)||sections[0];
   applyVisibility(selected);
  });
 });
 observer.observe(actions,{childList:true});
 activate('home',false);
 requestAnimationFrame(()=>scheduleDockRefresh());
 window.addEventListener('injnode:languagechange',refreshLanguage);
 window.addEventListener('storage',event=>{if(event.key==='inj_node_language_v1')refreshLanguage();});
 window.addEventListener('pageshow',refreshLanguage);
 window.INJ_BOTTOM_NAV={select:id=>activate(id,true),active:()=>root.dataset.injHomeTab};
})();
