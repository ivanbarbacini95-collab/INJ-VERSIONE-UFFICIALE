/* INJ Node · November 2026 · focused UX improvements.
   Preserves existing wallet/market data engines and IDs. */
(()=>{
'use strict';
const root=document.documentElement;
const isEn=()=>root.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en';
const t=(it,en)=>isEn()?en:it;
function onceReady(callback){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',callback,{once:true});else callback();}
function init(){
  // Keep the existing selected typeface through every menu, card and data panel.
  function recheckFont(){
    const id=localStorage.getItem('inj_node_font_v1')||'official';
    if(root.dataset.injFont!==id)root.dataset.injFont=id;
  }
  recheckFont();
  window.addEventListener('injnode:fontchange',recheckFont);
  window.addEventListener('pageshow',recheckFont);

  // A lightweight, semantic entrance instead of a blocking splash animation.
  root.classList.add('inj-ux-ready');
  const gate=document.getElementById('entryGate');
  if(gate){
    // The Home dock remains visible; inactivity affects other destinations only.
    // Interaction handling never intercepts scrolling or clicks.
    let idleTimer=0;
    const dock=document.getElementById('injPrimaryBottomNav');
    const foreground=()=>gate.classList.contains('visible')&&
      gate.getAttribute('aria-hidden')==='false'&&
      document.body.classList.contains('entry-gate-open')&&
      !document.body.classList.contains('boot-loading');
    function showDock(){
      if(root.dataset.injHomeTab==='mercato'||!foreground())return;
      root.dataset.injDockIdle='false';
      root.dataset.injHomeNavVisible='true';
      clearTimeout(idleTimer);
      if(root.dataset.injHomeTab!=='home')
        idleTimer=setTimeout(()=>{root.dataset.injDockIdle='true';},4300);
    }
    for(const type of ['pointerdown','touchstart','keydown','wheel']){
      document.addEventListener(type,showDock,{passive:true,capture:true});
    }
    root.addEventListener('injnode:languagechange',showDock);
    if(dock){
      dock.addEventListener('focusin',showDock);
      const ob=new MutationObserver(()=>{
        if(root.dataset.injHomeTab==='mercato'){root.dataset.injDockIdle='true';clearTimeout(idleTimer);return;}
        showDock();
      });
      ob.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab']});
      const initDock=new MutationObserver(()=>{
        if(foreground()){showDock();initDock.disconnect();}
      });
      initDock.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
      initDock.observe(document.body,{attributes:true,attributeFilter:['class']});
      if(foreground())showDock();
    }
  }

  // Global Market — retain the live quote engine; focus on the requested
  // geographic area without duplicating or falsifying index prices.
  const world=document.getElementById('injWorldMarket');
  const frame=document.querySelector('.inj-world-mapframe');
  const svg=document.getElementById('injWorldMapSvg');
  if(world&&frame&&svg&&!document.getElementById('injWorldRegionNavigation')){
    const nav=document.createElement('nav');
    nav.id='injWorldRegionNavigation';
    nav.className='inj-world-region-navigation';
    nav.setAttribute('aria-label',t('Selezione geografica','Geographic selection'));
    const items=[
      {id:'america',it:'America',en:'Americas',zoom:1.68,x:31,y:5,group:0},
      {id:'europe',it:'Europa',en:'Europe',zoom:2.0,x:0,y:18,group:1},
      {id:'asia',it:'Asia Pacifico',en:'Asia Pacific',zoom:1.53,x:-28,y:6,group:2}
    ];
    function select(item){
      world.dataset.injWorldRegion=item.id;
      frame.style.setProperty('--inj-region-zoom',String(item.zoom));
      frame.style.setProperty('--inj-region-pan-x',item.x+'%');
      frame.style.setProperty('--inj-region-pan-y',item.y+'%');
      nav.querySelectorAll('button').forEach(b=>{
        const on=b.dataset.region===item.id;
        b.setAttribute('aria-pressed',String(on));
        b.classList.toggle('is-active',on);
      });
      const regions=[...document.querySelectorAll('#injWorldIndexRegions .inj-wm-region')];
      regions.forEach((r,i)=>r.classList.toggle('is-inj-region-selected',i===item.group));
      const caption=document.getElementById('injWorldMapCaption');
      if(caption)caption.textContent=t('Area selezionata: ','Selected region: ')+(isEn()?item.en:item.it)+
        t(' · Tocca un indice per i dettagli',' · Tap an index for details');
    }
    items.forEach(item=>{
      const b=document.createElement('button');
      b.type='button';b.dataset.region=item.id;
      b.textContent=isEn()?item.en:item.it;
      b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>select(item));
      nav.append(b);
    });
    const all=document.createElement('button');
    all.type='button';all.dataset.region='all';
    all.textContent=t('Mondo','World');
    all.setAttribute('aria-pressed','true');
    all.addEventListener('click',()=>{
      world.dataset.injWorldRegion='all';
      frame.style.setProperty('--inj-region-zoom','1');
      frame.style.setProperty('--inj-region-pan-x','0%');
      frame.style.setProperty('--inj-region-pan-y','0%');
      nav.querySelectorAll('button').forEach(b=>{const on=b===all;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});
      document.querySelectorAll('#injWorldIndexRegions .inj-wm-region').forEach(r=>r.classList.remove('is-inj-region-selected'));
      const caption=document.getElementById('injWorldMapCaption');
      if(caption)caption.textContent=t('Seleziona un punto per leggere l’indice di riferimento','Tap a point to view its benchmark index');
    });
    nav.prepend(all);frame.before(nav);all.click();
    window.addEventListener('injnode:languagechange',()=>{
      nav.setAttribute('aria-label',t('Selezione geografica','Geographic selection'));
      items.forEach(item=>{nav.querySelector('[data-region="'+item.id+'"]').textContent=isEn()?item.en:item.it});
      all.textContent=t('Mondo','World');
    });
    // Region chips may be re-rendered with fresh market data.
    const chips=document.getElementById('injWorldIndexRegions');
    let debounce=0;
    if(chips)new MutationObserver(()=>{if(debounce)return;debounce=requestAnimationFrame(()=>{debounce=0;const selected=items.find(i=>i.id===world.dataset.injWorldRegion);if(selected){[...chips.querySelectorAll('.inj-wm-region')].forEach((r,i)=>r.classList.toggle('is-inj-region-selected',i===selected.group));}});}).observe(chips,{childList:true});
  }
}
onceReady(init);
})();