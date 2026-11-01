/* INJ Node · Responsive Heatmap density controller.
   Same grid for Market Heatmap and Favorites Heatmap.
   No modification of pricing, streaming or candle/chart data. */
(()=>{
 'use strict';
 const grid=document.getElementById('marketHeatmapGrid');
 const slider=document.getElementById('heatmapDensitySlider');
 const minus=document.getElementById('heatmapDensitySmaller');
 const plus=document.getElementById('heatmapDensityLarger');
 const label=document.getElementById('heatmapDensityLabel');
 const status=document.getElementById('heatmapDensityValue');
 if(!grid||!slider||!minus||!plus||!label||!status)return;

 const KEY='inj_node_heatmap_tile_density_v1';
 const min=0,max=100,initial=58;
 let current=initial,raf=0;
 const clamp=n=>Math.max(min,Math.min(max,Number.isFinite(n)?n:initial));
 const it=()=>document.documentElement.lang!=='en';
 const translate=(italian,english)=>it()?italian:english;
 const labelByDensity={
  logo:['SOLO LOGHI','LOGOS ONLY'],
  micro:['MINIMALE','MINIMAL'],
  compact:['COMPATTA','COMPACT'],
  full:['DETTAGLI','DETAILS']
 };
 function saved(){
  try{
   const value=localStorage.getItem(KEY);
   return value===null?initial:clamp(Number(value));
  }catch(_){return initial}
 }
 function persist(){
  try{localStorage.setItem(KEY,String(current))}catch(_){}
 }
 function markMissingLogos(){
  grid.querySelectorAll('.heatmap-tile').forEach(tile=>{
   const icon=tile.querySelector('img.hm-icon');
   // A pending lazy image is not yet a usable logo. Show the coin ticker
   // immediately instead of a blank logo-only Heatmap square.
   tile.classList.toggle('heatmap-no-logo',!icon||!icon.complete||icon.naturalWidth===0);
  });
 }
 function sizeFor(value){
  // 44–204px, gradual across the entire usable slider.
  return Math.round(44+1.6*value);
 }
 function recalculate(){
  raf=0;
  const desired=sizeFor(current);
  const gap=desired<81?4:desired<116?5:7;
  const gridWidth=grid.getBoundingClientRect().width;
  const slots=gridWidth>0?Math.max(1,Math.floor((gridWidth+gap)/(desired+gap))):1;
  const width=gridWidth>0?Math.max(1,(gridWidth-gap*(slots-1))/slots):desired;
  // Density is based on the *real* final width, not just the slider value.
  const tier=width<79?'logo':width<104?'micro':width<133?'compact':'full';
  grid.dataset.density=tier;
  const height=desired<79?Math.max(45,Math.round(width*.91))
   :tier==='micro'?Math.max(67,Math.round(width*.84))
   :tier==='compact'?Math.max(87,Math.round(width*.88))
   :Math.max(106,Math.min(157,Math.round(width*.79)));
  grid.style.setProperty('--heat-card-height',height+'px');
  grid.style.setProperty('--heat-card-gap',gap+'px');
  grid.style.setProperty('--heat-card-padding',(tier==='logo'?4:tier==='micro'?5:tier==='compact'?6:9)+'px');
  grid.style.setProperty('--heat-card-content-gap',(tier==='full'?4:tier==='compact'?3:2)+'px');
  grid.style.setProperty('--heat-logo-size',Math.round(tier==='logo'?Math.max(21,Math.min(37,width*.66)):
   tier==='micro'?22:tier==='compact'?23:Math.min(32,width*.21))+'px');
  grid.style.setProperty('--heat-symbol-size',(tier==='micro'?10:tier==='compact'?11:Math.min(16,Math.max(12,Math.round(width*.095))))+'px');
  grid.style.setProperty('--heat-change-size',(tier==='micro'?11:tier==='compact'?12:Math.min(21,Math.max(14,Math.round(width*.12))))+'px');
  grid.style.setProperty('--heat-price-size',(tier==='compact'?10:Math.min(14,Math.max(11,Math.round(width*.075))))+'px');
  const modeLabel=labelByDensity[tier];
  const text=translate(modeLabel[0],modeLabel[1]);
  status.textContent=text;
  slider.setAttribute('aria-valuetext',text);
  // Also keeps the title useful when the card is logo-only.
  label.textContent=translate('DIMENSIONE','SIZE');
  slider.setAttribute('aria-label',translate('Dimensione delle card Heatmap','Heatmap card size'));
  minus.setAttribute('aria-label',translate('Più crypto visibili, card più piccole','Show more cryptos, smaller cards'));
  plus.setAttribute('aria-label',translate('Card più grandi','Larger cards'));
 }
 function schedule(){
  if(raf)return;
  raf=requestAnimationFrame(recalculate);
 }
 function apply(value,save=true){
  current=clamp(Number(value));
  slider.value=String(current);
  slider.style.setProperty('--density-progress',current+'%');
  grid.style.setProperty('--heat-card-size',sizeFor(current)+'px');
  minus.disabled=current===min;
  plus.disabled=current===max;
  if(save)persist();
  schedule();
 }
 slider.addEventListener('input',()=>apply(slider.value,true));
 minus.addEventListener('click',()=>apply(current-10,true));
 plus.addEventListener('click',()=>apply(current+10,true));
 const nativeResize=()=>schedule();
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(nativeResize);
  observer.observe(grid);
 }else window.addEventListener('resize',nativeResize,{passive:true});
 window.addEventListener('orientationchange',nativeResize,{passive:true});
 window.addEventListener('injnode:languagechange',schedule);
 const langObserver=new MutationObserver(schedule);
 langObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const tilesObserver=new MutationObserver(records=>{
  // Only changes to the tile list or logo images matter; live text updates
  // must not repeatedly trigger an expensive rescan of 200 cards.
  const changed=records.some(record=>record.target===grid ||
   Array.from(record.removedNodes).some(node=>node.nodeType===1&&node.matches?.('img.hm-icon')));
  if(!changed)return;
  markMissingLogos();
  schedule();
 });
 tilesObserver.observe(grid,{childList:true,subtree:true});
 grid.addEventListener('load',event=>{
  if(!event.target?.matches?.('img.hm-icon'))return;
  const image=event.target,tile=image.closest('.heatmap-tile');
  if(tile)tile.classList.toggle('heatmap-no-logo',!image.complete||image.naturalWidth===0);
 },true);
 grid.addEventListener('error',event=>{
  if(event.target?.matches?.('img.hm-icon')){
   const tile=event.composedPath?.().find(el=>el?.classList?.contains('heatmap-tile'));
   if(tile)tile.classList.add('heatmap-no-logo');
  }
 },true);
 window.addEventListener('storage',event=>{
  if(event.key===KEY)apply(saved(),false);
 });
 markMissingLogos();
 apply(saved(),false);
})();
