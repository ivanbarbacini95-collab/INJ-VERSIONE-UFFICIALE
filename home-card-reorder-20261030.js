/* INJ Node · hold-to-reorder Home/category cards.
 * Operates on the existing real elements — no clones, no duplicated IDs or
 * event handlers. Orders are stored independently for each navigation tab.
 * Short taps remain normal navigation; moving before hold remains scrolling. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const actions=document.querySelector('#entryGate .entry-actions.entry-flat-v44');
 if(!actions)return;
 const groups={
  home:['entryDashboardButton','entryLiveButton','entryTreasuryButton'],
  mercato:['entryGlobalMarketsButton','entryGlobalCryptoButton','entryMacroCalendarButton','entryLiveChartsButton','entryOrderBookButton','entryPerformanceButton'],
  reward:['entryLiveRewardsButton','entryComparisonButton','entryVisualizeWealthButton','entryRewardLadderButton','entryFreedomButton'],
  altro:['entryMultiChartButton','entryAllTransactionsButton','entryComparisonButton','entryVisualizeWealthButton','entryFreedomButton','entryWorkspaceButton','entryConverterButton','entryCommandCenterButton']
 };
 const prefix='inj_node_launcher_order_v1_';
 const original=new Map(),live=new Map();
 const selected=()=>root.dataset.injHomeTab||'home';
 function readOrder(tab){
  const defaults=groups[tab]||[];
  if(!defaults.length)return [];
  try{
   const raw=JSON.parse(localStorage.getItem(prefix+tab)||'[]');
   if(!Array.isArray(raw))return defaults.slice();
   const stored=[...new Set(raw.filter(id=>defaults.includes(id)))];
   const missing=defaults.filter(id=>!stored.includes(id));
   if(tab==='altro'&&!stored.includes('entryMultiChartButton'))
     return ['entryMultiChartButton',...stored,...missing.filter(id=>id!=='entryMultiChartButton')];
   return [...stored,...missing];
  }catch(_){return defaults.slice()}
 }
 for(const tab of Object.keys(groups)){
  original.set(tab,readOrder(tab));
  live.set(tab,readOrder(tab));
 }
 function applyOrder(tab){
  (live.get(tab)||[]).forEach((id,index)=>{
   const el=document.getElementById(id);
   if(el&&el.parentElement===actions)
    el.style.setProperty('order',String(index+1),'important');
  });
 }
 for(const tab of Object.keys(groups))applyOrder(tab);
 let pressed=null,drag=null,suppressId='',suppressUntil=0;
 function clearPending(){
  if(pressed?.timer)clearTimeout(pressed.timer);
  pressed=null;
 }
 function nodeForEvent(target){
  const card=target?.closest?.('.entry-actions.entry-flat-v44 > .entry-action');
  const tab=selected();
  return card&&groups[tab]?.includes(card.id)&&card.parentElement===actions?card:null;
 }
 function visibleRects(tab){
  return (live.get(tab)||[]).map(id=>document.getElementById(id))
   .filter(node=>node&&node.getClientRects().length&&getComputedStyle(node).display!=='none');
 }
 function placeGhost(x,y){
  if(!drag?.ghost)return;
  drag.ghost.style.left=x+'px';
  drag.ghost.style.top=y+'px';
 }
 function beginDrag(){
  if(!pressed || selected()!==pressed.tab)return;
  const {card,tab,x,y,pointerId}=pressed;
  const ghost=document.createElement('div');
  ghost.className='inj-card-reorder-ghost';
  ghost.textContent=card.querySelector('.inj-home-tile-title')?.textContent?.trim()||card.textContent.trim().slice(0,60);
  ghost.setAttribute('aria-hidden','true');
  document.body.appendChild(ghost);
  drag={card,tab,pointerId,ghost,x,y,starting:live.get(tab).slice(),changed:false};
  root.classList.add('inj-card-dragging');
  card.classList.add('inj-card-drag-source');
  placeGhost(x,y);
  try{navigator.vibrate?.(12)}catch(_){}
  clearPending();
 }
 function reorderAt(x,y){
  if(!drag)return;
  drag.x=x;drag.y=y;
  placeGhost(x,y);
  const cards=visibleRects(drag.tab);
  let target=cards.find(node=>{
   const r=node.getBoundingClientRect();
   return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  });
  if(!target){
   let nearest=Infinity;
   for(const node of cards){
    const r=node.getBoundingClientRect();
    const dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2);
    const d=dx*dx+dy*dy;
    if(d<nearest){nearest=d;target=node;}
   }
  }
  if(!target||target===drag.card)return;
  const current=live.get(drag.tab);
  const from=current.indexOf(drag.card.id),to=current.indexOf(target.id);
  if(from<0||to<0||from===to)return;
  current.splice(from,1);
  current.splice(to,0,drag.card.id);
  applyOrder(drag.tab);
  drag.changed=true;
 }
 function finishDrag(commit){
  if(!drag)return;
  const d=drag;
  const now=Date.now();
  suppressId=d.card.id;suppressUntil=now+1000;
  if(!commit){
   live.set(d.tab,d.starting);
   applyOrder(d.tab);
  }else if(d.changed){
   try{localStorage.setItem(prefix+d.tab,JSON.stringify(live.get(d.tab)))}catch(_){}
  }
  d.card.classList.remove('inj-card-drag-source');
  d.ghost.remove();
  root.classList.remove('inj-card-dragging');
  drag=null;
 }
 // Window capture precedes document-level INJ navigation click delegation,
 // preventing accidental opening after a long press/reorder.
 window.addEventListener('click',event=>{
  if(Date.now()>=suppressUntil)return;
  const card=nodeForEvent(event.target);
  if(card?.id===suppressId){
   event.preventDefault();
   event.stopImmediatePropagation();
   suppressUntil=0;
  }
 },true);
 actions.addEventListener('pointerdown',event=>{
  if(drag||pressed||!event.isPrimary||event.button!==0)return;
  const card=nodeForEvent(event.target);
  if(!card||event.target.closest('input,textarea,select,[contenteditable],a[href] > button'))return;
  const p={card,tab:selected(),pointerId:event.pointerId,x:event.clientX,y:event.clientY,timer:null};
  pressed=p;
  p.timer=setTimeout(()=>{if(pressed===p)beginDrag()},480);
 },{passive:true});
 window.addEventListener('pointermove',event=>{
  if(pressed&&event.pointerId===pressed.pointerId&&!drag){
   const moved=Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y);
   if(moved>11)clearPending();
  }
  if(drag&&event.pointerId===drag.pointerId){
   if(event.cancelable)event.preventDefault();
   reorderAt(event.clientX,event.clientY);
  }
 },{capture:true,passive:false});
 window.addEventListener('pointerup',event=>{
  if(drag&&event.pointerId===drag.pointerId){
   reorderAt(event.clientX,event.clientY);
   finishDrag(true);
  }
  clearPending();
 },{capture:true,passive:true});
 window.addEventListener('pointercancel',()=>{
  if(drag)finishDrag(false);
  clearPending();
 },{capture:true,passive:true});
 // Safari long-touch must not pan the page while a card is being dragged.
 window.addEventListener('touchmove',event=>{
  if(!drag||!event.touches.length)return;
  if(event.cancelable)event.preventDefault();
  const touch=event.touches[0];
  reorderAt(touch.clientX,touch.clientY);
 },{capture:true,passive:false});
 actions.addEventListener('contextmenu',event=>{
  if(pressed||drag){event.preventDefault();}
 });
 window.addEventListener('blur',()=>{
  if(drag)finishDrag(false);
  clearPending();
 });
 // Tab switching never copies a card into a different category.
 const changes=new MutationObserver(()=>{
  const tab=selected();
  if(drag&&drag.tab!==tab)finishDrag(false);
  if(pressed&&pressed.tab!==tab)clearPending();
  applyOrder(tab);
 });
 changes.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab']});
 window.addEventListener('pageshow',()=>applyOrder(selected()));
})();
