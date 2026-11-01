/* INJ Node · My Reward · wallet-scoped read-only reward home.
 * Reuses INJ_FINANCIAL_FREEDOM_SOURCE and the existing 10–15s on-chain
 * wallet refresh loop. Between confirmations, accrual is explicitly estimated.
 */
(()=>{
'use strict';
const root=document.documentElement;
const $=id=>document.getElementById(id);
const isEn=()=>root.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en';
const tr=(it,en)=>isEn()?en:it;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME='home', REWARD='reward';
const tabs=[
 {id:'overview',it:'My Reward',en:'My Reward'},
 {id:'live',it:'Live Reward',en:'Live Reward',url:'./live-rewards.html?embedded=my-reward'},
 {id:'ladder',it:'Reward Ladder',en:'Reward Ladder',url:'./reward-ladder.html?embedded=my-reward'}
];
const fmt=(value,digits)=>Number(value).toLocaleString(isEn()?'en-US':'it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const money=(value,currency)=>Number(value).toLocaleString(isEn()?'en-US':'it-IT',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2});
const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
let current='overview',panel=null, frames=new Map(),timer=0,wasOpen=false,lastAddress='',boundFrames=new WeakSet(),lastEnrichAt=0;
function source(){
 try{return typeof window.INJ_FINANCIAL_FREEDOM_SOURCE==='function'?window.INJ_FINANCIAL_FREEDOM_SOURCE():null;}
 catch(_){return null;}
}
function updateLabels(){
 if(!panel)return;
 panel.querySelectorAll('[data-myreward-it]').forEach(el=>{
  el.textContent=tr(el.dataset.myrewardIt,el.dataset.myrewardEn);
 });
 const picker=$('injMyRewardPicker');
 if(picker)picker.setAttribute('aria-label',tr('Wallet in osservazione','Selected wallet'));
 panel.querySelectorAll('[data-myreward-page]').forEach(btn=>{
  const tab=tabs.find(x=>x.id===btn.dataset.myrewardPage);
  if(tab)btn.setAttribute('aria-label',(isEn()?tab.en:tab.it)+(tab.id==='live'?' · Treasury':''));
 });
}
function renderPicker(rows,selected){
 const picker=$('injMyRewardPicker'),wrap=$('injMyRewardPickerWrap');
 if(!picker||!wrap)return;
 const signature=rows.map(r=>r.address+'|'+r.label).join(':');
 if(picker.dataset.options!==signature){
  picker.dataset.options=signature;
  picker.replaceChildren();
  rows.forEach(w=>{const option=document.createElement('option');option.value=w.address;option.textContent=w.label||w.address.slice(0,12)+'…';picker.append(option);});
 }
 wrap.hidden=rows.length<2;
 if(selected&&picker.value!==selected)picker.value=selected;
}
function note(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value;}
function renderSummary(){
 if(!panel||root.dataset.injHomeTab!==REWARD||current!=='overview'||document.hidden)return;
 const snap=source(),rows=Array.isArray(snap?.wallets)?snap.wallets:[],
  selected=rows.find(w=>w.address===snap?.selectedAddress)||rows[0]||null,
  address=selected?.address||'';
 if(address!==lastAddress){
  lastAddress=address;
  for(const id of ['injMyRewardStaked','injMyRewardValue','injMyRewardAccrued','injMyRewardRewardValue'])note(id,'—');
 }
 renderPicker(rows,address);
 const name=selected?.label||tr('Nessun wallet selezionato','No wallet selected');
 note('injMyRewardWalletName',name);
 note('injMyRewardAddress',address?address.slice(0,13)+'…'+address.slice(-8):tr('Aggiungi un wallet dalla Home','Add a wallet from Home'));
 const updated=numeric(selected?.updated);
 const staked=numeric(selected?.staked),reward=numeric(selected?.rewards),apr=numeric(selected?.apr);
 const age=updated&&updated>0?Math.max(0,Date.now()-updated):Infinity;
 const verified=!!address&&updated>0&&staked!==null&&staked>=0&&reward!==null&&reward>=0;
 const currentData=verified&&age<120000;
 const price=numeric(snap?.price);
 const rate=snap?.currency==='EUR'?(snap.fxVerified&&numeric(snap.eurRate)>0?numeric(snap.eurRate):null):1;
 const currency=snap?.currency==='EUR'?'EUR':'USD';
 const validPrice=price!==null&&price>0&&rate!==null;
 // Only interpolate a recent verified on-chain reward, never fabricate an
 // initial balance or continue indefinitely when network data stop arriving.
 const delta=verified&&age<35000&&apr>0&&staked>0?
    staked*(apr/100)*Math.min(age,20000)/(365.25*86400000):0;
 const displayedReward=verified?reward+delta:null;
 const baseline=verified?fmt(staked,4)+' INJ':'—';
 const worth=verified&&validPrice?money(staked*price*rate,currency):'—';
 const earnings=displayedReward!==null?fmt(displayedReward,8)+' INJ':'—';
 const rewardFiat=displayedReward!==null&&validPrice?money(displayedReward*price*rate,currency):'—';
 note('injMyRewardStaked',baseline);
 note('injMyRewardValue',worth);
 note('injMyRewardAccrued',earnings);
 note('injMyRewardRewardValue',rewardFiat);
 note('injMyRewardPrice',price>0?money(price,'USD'):'—');
 note('injMyRewardApr',apr>0?fmt(apr,2)+'%':'—');
 const badge=$('injMyRewardStatus');
 if(badge){
  badge.dataset.state=!verified?'loading':!currentData?'stale':age<35000&&apr>0?'live':'verified';
  badge.textContent=!verified?tr('SINCRONIZZAZIONE','SYNCING'):
   !currentData?tr('DATI DA AGGIORNARE','STALE DATA'):
   age<35000&&apr>0?tr('STIMA LIVE','LIVE ESTIMATE'):
   tr('DATO VERIFICATO','VERIFIED DATA');
 }
 note('injMyRewardUpdated',!updated||!Number.isFinite(age)?tr('In attesa dei dati on-chain','Waiting for on-chain data'):
  tr('Rete aggiornata ','Network updated ')+Math.floor(age/1000)+'s '+tr('fa','ago'));
 note('injMyRewardExplanation',tr(
  'I reward partono dal saldo verificato sulla rete Injective. La crescita tra due aggiornamenti è stimata dall’APR netto del wallet, non è una nuova transazione confermata.',
  'Rewards start from a verified Injective balance. Growth between network updates is estimated using the wallet’s net APR, not a newly confirmed transaction.'));
 panel.classList.toggle('inj-myreward-private',!!snap?.privacy);
}
function embeddedStyle(frame,tab){
 try{
  const doc=frame.contentDocument;if(!doc||boundFrames.has(doc))return;
  boundFrames.add(doc);
  doc.documentElement.dataset.injRewardEmbedded='true';
  const style=doc.createElement('style');
  style.id='injRewardNativeScroll';
  style.textContent=`html[data-inj-reward-embedded="true"],html[data-inj-reward-embedded="true"] body{
  height:auto!important;min-height:100%!important;max-height:none!important;
  overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;
  overscroll-behavior-y:auto!important;touch-action:pan-y!important}
 html[data-inj-reward-embedded="true"] body :is(.rewards-close,.ladder-back,.ladder-home,.home){display:none!important}
 html[data-inj-reward-embedded="true"] body :is(.rewards-shell,.ladder-shell,.ladder-main){height:auto!important;min-height:100%!important;max-height:none!important;overflow:visible!important}
 html[data-inj-reward-embedded="true"] body .rewards-header{position:relative!important;top:0!important;grid-template-columns:1fr auto!important;padding-top:12px!important}
 html[data-inj-reward-embedded="true"] body .rewards-total-panel{position:relative!important;top:0!important}
 @media(max-width:820px){html[data-inj-reward-embedded="true"] body .rewards-layout{grid-template-columns:minmax(0,1fr)!important}}
 `;
  (doc.head||doc.documentElement).appendChild(style);
  let sx=0,sy=0,start=null;
  doc.addEventListener('touchstart',e=>{
   if(e.touches.length!==1||e.target.closest('button,a,input,select,textarea,[contenteditable],.ladder-track')){start=null;return;}
   sx=e.touches[0].clientX;sy=e.touches[0].clientY;start=performance.now();
  },{passive:true});
  doc.addEventListener('touchend',e=>{
   if(start===null||!e.changedTouches.length)return;
   const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
   start=null;
   if(Math.abs(dx)>95&&Math.abs(dx)>Math.abs(dy)*1.8){
    const idx=tabs.findIndex(t=>t.id===tab.id);const n=tabs[idx+(dx<0?1:-1)];
    if(n)window.INJ_MY_REWARD?.select(n.id);
   }
  },{passive:true});
 }catch(_){}
}
function switchFrame(tab){
 for(const [id,obj] of frames){
  const active=id===tab;
  obj.host.hidden=!active;
  obj.frame.tabIndex=active?0:-1;
  if(active){
   if(!obj.frame.getAttribute('src'))obj.frame.src=obj.url;
   else embeddedStyle(obj.frame,tabs.find(t=>t.id===id));
  }
 }
}
function select(id){
 if(!tabs.some(t=>t.id===id))id='overview';
 current=id;panel.dataset.myrewardCurrent=id;
 panel.querySelectorAll('[data-myreward-page]').forEach(btn=>{
  const on=btn.dataset.myrewardPage===id;
  btn.classList.toggle('is-active',on);btn.setAttribute('aria-selected',String(on));
  btn.tabIndex=on?0:-1;
  if(on)btn.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',inline:'nearest',block:'nearest'});
 });
 $('injMyRewardOverview').hidden=id!=='overview';
 switchFrame(id);
 if(id==='overview')renderSummary();
}
function createPanel(actions){
 panel=document.createElement('section');
 panel.id='injMyRewardPanel';panel.className='inj-myreward-panel';
 panel.setAttribute('aria-label','My Reward');
 panel.innerHTML='<nav class="inj-myreward-pages" id="injMyRewardPages" role="tablist" aria-label="Reward">'+
 tabs.map((tab,i)=>'<button type="button" data-myreward-page="'+tab.id+'" role="tab" aria-selected="'+(i===0?'true':'false')+'">'+tab.it+'</button>').join('')+
 '</nav><div class="inj-myreward-viewport">'+
 '<div id="injMyRewardOverview" class="inj-myreward-overview" role="tabpanel">'+
 '<div class="inj-myreward-wallet-head">'+
 '<div class="inj-myreward-wallet-title"><small data-myreward-it="WALLET SELEZIONATO" data-myreward-en="SELECTED WALLET">WALLET SELEZIONATO</small>'+
 '<strong id="injMyRewardWalletName">—</strong><span id="injMyRewardAddress">—</span></div>'+
 '<label id="injMyRewardPickerWrap" class="inj-myreward-picker" hidden><span data-myreward-it="CAMBIA WALLET" data-myreward-en="CHANGE WALLET">CAMBIA WALLET</span>'+
 '<select id="injMyRewardPicker"></select></label></div>'+
 '<article class="inj-myreward-stake-card"><div class="inj-myreward-card-top">'+
 '<span data-myreward-it="TOTALE IN STAKING" data-myreward-en="TOTAL STAKED">TOTALE IN STAKING</span>'+
 '<span id="injMyRewardStatus" class="inj-myreward-status" data-state="loading">SINCRONIZZAZIONE</span></div>'+
 '<strong class="inj-myreward-staked private" id="injMyRewardStaked">—</strong>'+
 '<div class="inj-myreward-fiat private" id="injMyRewardValue">—</div>'+
 '<div class="inj-myreward-separator"></div>'+
 '<span class="inj-myreward-reward-label" data-myreward-it="REWARD MATURATI" data-myreward-en="ACCRUED REWARDS">REWARD MATURATI</span>'+
 '<strong class="inj-myreward-accrued private" id="injMyRewardAccrued">—</strong>'+
 '<div class="inj-myreward-reward-fiat private" id="injMyRewardRewardValue">—</div></article>'+
 '<div class="inj-myreward-meta">'+
 '<div><small>INJ / USD</small><strong id="injMyRewardPrice">—</strong></div>'+
 '<div><small data-myreward-it="APR NETTO" data-myreward-en="NET APR">APR NETTO</small><strong id="injMyRewardApr">—</strong></div></div>'+
 '<p id="injMyRewardUpdated" class="inj-myreward-updated" aria-live="polite"></p>'+
 '<p id="injMyRewardExplanation" class="inj-myreward-explanation"></p>'+
 '</div></div>';
 actions.prepend(panel);
 const viewport=panel.querySelector('.inj-myreward-viewport');
 tabs.filter(x=>x.url).forEach(tab=>{
  const host=document.createElement('div');host.className='inj-myreward-frame-host';host.hidden=true;host.id='injMyRewardPage'+tab.id;
  host.setAttribute('role','tabpanel');host.setAttribute('aria-label',tab.it);
  const frame=document.createElement('iframe');
  frame.className='inj-myreward-frame';frame.title=tab.it;frame.loading='lazy';
  frame.referrerPolicy='same-origin';
  frame.addEventListener('load',()=>embeddedStyle(frame,tab));
  host.append(frame);viewport.append(host);
  frames.set(tab.id,{host,frame,url:tab.url});
 });
 panel.querySelectorAll('[data-myreward-page]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.myrewardPage)));
 $('injMyRewardPicker').addEventListener('change',event=>{
  const address=event.target.value;
  const selected=Array.from(document.querySelectorAll('#entryWallets .entry-wallet-row')).find(row=>row.dataset.address===address);
  // Use the existing Home wallet selector, never mutate the app's private state.
  const button=selected?.querySelector('.entry-wallet');
  if(button)button.click();
  else{
   // Do not show stale values if a wallet was just added or the rail is rebuilding.
   lastAddress='';renderSummary();
  }
  renderSummary();
 });
 let start=null;
 $('injMyRewardOverview').addEventListener('touchstart',e=>{
  if(e.touches.length!==1||e.target.closest('button,input,select,a')){start=null;return;}
  start={x:e.touches[0].clientX,y:e.touches[0].clientY};
 },{passive:true});
 $('injMyRewardOverview').addEventListener('touchend',e=>{
  if(!start||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;
  if(dx< -90&&Math.abs(dx)>Math.abs(dy)*1.8)select('live');
 },{passive:true});
 updateLabels();select('overview');
}
function sync(){
 if(!panel)return;
 const open=root.dataset.injHomeTab===REWARD;
 if(open!==wasOpen){
  wasOpen=open;
  if(open){select('overview');renderSummary();}
  else {
   // Stop heavy native views and network loops outside Reward.
   for(const obj of frames.values()){
    obj.host.hidden=true;obj.frame.removeAttribute('src');
   }
  }
 }
 if(open&&Date.now()-lastEnrichAt>90000&&typeof window.INJ_FINANCIAL_FREEDOM_ENRICH_APR==='function'){
   lastEnrichAt=Date.now();
   // Ask the existing verified validator/APR engine for any missing wallet APR.
   // This is rate limited and never substitutes a global APR for the wallet.
   void window.INJ_FINANCIAL_FREEDOM_ENRICH_APR().catch(()=>{});
 }
 if(open&&current==='overview')renderSummary();
}
function init(){
 const gate=$('entryGate'),actions=gate?.querySelector('.entry-actions.entry-flat-v44');
 if(!actions||!$('injPrimaryBottomNav'))return;
 createPanel(actions);
 const observer=new MutationObserver(sync);
 observer.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab']});
 window.addEventListener('pageshow',sync);
 window.addEventListener('injnode:languagechange',updateLabels);
 document.addEventListener('visibilitychange',sync);
 timer=setInterval(sync,450);
 window.INJ_MY_REWARD={select(id){select(id);if(root.dataset.injHomeTab!==REWARD)window.INJ_BOTTOM_NAV?.select(REWARD);},active:()=>current};
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();