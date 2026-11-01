/* INJ NODE · direct Global Market / Global Crypto navigation.
 * Uses the already-active market router and its shared CoinGecko data.
 * No duplicate charts, API requests, favorites or live subscriptions. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const query=new URLSearchParams(location.search);
 const type=['world','crypto','intel','favorites'].includes(query.get('entry'))?query.get('entry'):null;
 if(type)root.dataset.injMarketEntry=type;
 const route=window.INJ_MARKET_NAVIGATE;
 if(typeof route!=='function')return;
 // Each entry is a standalone screen, including INJ Intelligence.
 // Keep nonselected data modules mounted but hidden so handlers remain safe.
 if(type){
  document.getElementById('injIntelRoot')?.remove();
  const panels={intel:'injIntelligenceMain',world:'injWorldMarket',crypto:'injGlobalMarket'};
  const keep=type==='favorites'?'crypto':type;
  for(const [kind,id] of Object.entries(panels)){
   if(kind===keep)continue;
   const panel=document.getElementById(id);
   if(panel){panel.hidden=true;panel.inert=true;panel.setAttribute('aria-hidden','true')}
  }
  const suffix=document.getElementById('injIntelHeaderSuffix');
  if(suffix)suffix.hidden=true;
 }
 const KEY='inj_node_crypto_layout_v1';
 const readMode=()=>{try{return localStorage.getItem(KEY)==='heatmap'?'heatmap':'list'}catch(_){return 'list'}};
 const switcher=document.getElementById('injGlobalCryptoLayoutSwitch');
 const scopeNav=document.getElementById('injCryptoScopeNav');
 if(switcher)switcher.hidden=type!=='crypto';
 if(scopeNav)scopeNav.hidden=type!=='crypto';
 const viewingFavorites=()=>root.dataset.marketSection==='favorites';
 const selectedMode=()=>viewingFavorites()
  ?root.dataset.marketMode==='heatmap'?'heatmap':'list'
  :root.dataset.marketSection==='heatmap'?'heatmap':'list';
 function sync(){
  const mode=selectedMode(),en=root.lang==='en';
  if(type==='crypto'&&scopeNav){
   for(const button of scopeNav.querySelectorAll('[data-crypto-scope]')){
    const active=(button.dataset.cryptoScope==='favorites')===viewingFavorites();
    button.setAttribute('aria-pressed',String(active));
   }
   const saved=window.INJ_MARKET_VIEWS?.favoriteCount?.()||0;
   const count=document.getElementById('injCryptoSavedCount');
   if(count){count.hidden=!saved;count.textContent=String(saved)}
   const label=scopeNav.querySelector('[data-crypto-fav-label]');
   if(label)label.textContent=en?'Favorites':'Preferiti';
   const all=scopeNav.querySelector('[data-crypto-scope="all"]');
   if(all)all.textContent=en?'All crypto':'Tutte le crypto';
   scopeNav.setAttribute('aria-label',en?'Global Crypto sections':'Sezioni Global Crypto');
  }
  if(switcher){
   const next=mode==='heatmap'?'list':'heatmap',label=next==='list'?(en?'List':'Lista'):'Heatmap';
   const text=switcher.querySelector('[data-next-view]');
   if(text&&text.textContent!==label)text.textContent=label;
   switcher.setAttribute('aria-label',next==='list'?(en?'Switch to List':'Passa alla Lista'):(en?'Switch to Heatmap':'Passa alla Heatmap'));
   switcher.setAttribute('aria-pressed',String(mode==='heatmap'));
  }
  const title=document.getElementById('marketTitle');
  if(type==='intel'&&title)title.textContent='INJ Intelligence';
  if(type==='favorites'&&title)title.textContent=en?'Favorites':'Preferiti';
  if(type==='favorites'){
   const label=document.getElementById('marketHeading');
   if(label)label.textContent=en?'Favorites':'Preferiti';
  }
  if(type==='world'&&title)title.textContent='Global Market';
  if(type==='crypto'){
   const meta=document.getElementById('mpMetaTitle');
   if(meta)meta.innerHTML=(en?'CRYPTO MARKET':'MERCATO CRYPTO')+' <span>· LIVE</span>';
   document.getElementById('marketTitle')?.replaceChildren(document.createTextNode('Global Crypto'));
   const head=document.getElementById('marketHeading');
   if(head)head.textContent=viewingFavorites()?(en?'Favorites':'Preferiti'):'Global Crypto';
  }
 }
 function cryptoMode(mode){
  if(type!=='crypto'||!['list','heatmap'].includes(mode))return;
  if(viewingFavorites()){
   window.INJ_MARKET_VIEWS?.setFavoriteLayout?.(mode);
  }else{
   try{localStorage.setItem(KEY,mode)}catch(_){}
   route(mode==='heatmap'?'heatmap':'global');
  }
  sync();
 }
 switcher?.addEventListener('click',()=>cryptoMode(selectedMode()==='heatmap'?'list':'heatmap'));
 scopeNav?.addEventListener('click',event=>{
  const button=event.target.closest('[data-crypto-scope]');
  if(!button||type!=='crypto')return;
  const target=button.dataset.cryptoScope;
  if(target==='favorites'&&!viewingFavorites())route('favorites');
  else if(target==='all'&&viewingFavorites())route(readMode()==='heatmap'?'heatmap':'global');
  sync();
 });
 window.addEventListener('injnode:crypto-favorites-changed',sync);
 if(type==='world')route('world');
 else if(type==='crypto')route(readMode()==='heatmap'?'heatmap':'global');
 else if(type==='intel')route('intel');
 else if(type==='favorites')route('favorites');
 sync();
 const observer=new MutationObserver(sync);
 observer.observe(root,{attributes:true,attributeFilter:['data-market-section','data-market-mode','lang']});
 window.addEventListener('message',event=>{
  if(event.origin===location.origin&&event.data?.type==='injnode:market:language')
   requestAnimationFrame(sync);
 });
 window.addEventListener('pageshow',sync);
})();
