(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORAGE='inj_node_futures_positions_v1';
const ACTIVE='inj_node_futures_active_v1';
const SPOT_STORAGE='inj_node_futures_spot_inj_v1';
const SIM_PRICE_STORAGE='inj_node_futures_sim_price_v1';
const SIM_STAKED_STORAGE='inj_node_futures_staked_inj_v1';
const SIM_SCOPE_STORAGE='inj_node_futures_sim_scope_v1';
const LANG=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'?'en':'it'}catch(_){return'it'}};
const state={side:'long',price:0,lastPrice:0,source:'KuCoin',positions:[],activeId:'',timer:null,eur:1,spot:0,spotStored:false,simPrice:0,simScope:'active',staked:0,stakedStored:false,simEdited:false};
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=(v,d=4)=>Number.isFinite(v)?v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const money=(v)=>{const eur=localStorage.getItem('inj_monitor_currency')==='EUR';const amount=eur?v*state.eur:v;return `${v>=0?'+':'-'}${eur?'€':'$'}${Math.abs(amount).toLocaleString(eur?'it-IT':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`.replace(`${eur?'€':'$'}-`,`${eur?'€':'$'}`)};
function read(){try{state.positions=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(!Array.isArray(state.positions))state.positions=[]}catch(_){state.positions=[]}try{state.activeId=localStorage.getItem(ACTIVE)||''}catch(_){}try{const raw=localStorage.getItem(SPOT_STORAGE);state.spotStored=raw!==null&&raw!=='';state.spot=Math.max(0,n(raw))}catch(_){state.spot=0;state.spotStored=false}try{const v=localStorage.getItem(SIM_PRICE_STORAGE);state.simPrice=v&&n(v)>0?n(v):0;state.simEdited=state.simPrice>0;state.simScope=localStorage.getItem(SIM_SCOPE_STORAGE)==='all'?'all':'active';const raw=localStorage.getItem(SIM_STAKED_STORAGE);state.stakedStored=raw!==null&&raw!=='';state.staked=Math.max(0,n(raw))}catch(_){state.simPrice=0;state.simScope='active';state.staked=0;state.stakedStored=false} }
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state.positions));localStorage.setItem(ACTIVE,state.activeId||'')}catch(_){} }
function current(){return state.positions.find(p=>p.id===state.activeId)||null}
function draft(){return {side:state.side,entry:n($('entryInput')?.value),leverage:Math.max(1,n($('leverageInput')?.value)||1),margin:n($('marginInput')?.value),mode:$('marginModeInput')?.value||'isolated',liq:n($('liquidationInput')?.value),name:($('nameInput')?.value||'').trim()}}
function estimatedLiq(p){if(p.liq>0)return p.liq;if(p.mode==='cross')return 0;if(!(p.entry>0&&p.leverage>0))return 0;const raw=p.side==='long'?p.entry*(1-1/p.leverage):p.entry*(1+1/p.leverage);return Math.max(0,raw)}
function calc(p){const price=state.price,entry=p.entry,lev=p.leverage,margin=p.margin;if(!(price>0&&entry>0&&lev>0&&margin>0))return null;const size=margin*lev,qty=size/entry,dir=p.side==='short'?-1:1,pnl=qty*(price-entry)*dir,roi=pnl/margin*100,move=(price/entry-1)*100,liq=estimatedLiq(p),liqDist=liq>0?Math.abs(price-liq)/price*100:0;return{price,size,qty,pnl,roi,move,liq,liqDist}}
function renderPortfolio(){const list=state.positions||[];let invested=0,pnl=0;list.forEach(p=>{const margin=Math.max(0,n(p.margin));invested+=margin;const c=calc(p);if(c)pnl+=c.pnl});const equity=invested+pnl,roi=invested>0?pnl/invested*100:0,futuresInj=state.price>0?Math.max(0,equity)/state.price:0,spot=Math.max(0,state.spot||0),spotValue=state.price>0?spot*state.price:0,totalInj=spot+futuresInj,totalValue=state.price>0?totalInj*state.price:0;const eur=localStorage.getItem('inj_monitor_currency')==='EUR';const rate=eur?state.eur:1;const plain=v=>`${eur?'€':'$'}${Math.abs(v*rate).toLocaleString(eur?'it-IT':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;if($('portfolioInvested'))$('portfolioInvested').textContent=list.length?plain(invested):'—';if($('portfolioPnl')){$('portfolioPnl').textContent=list.length&&state.price>0?`${pnl>0?'+':pnl<0?'−':''}${plain(pnl)}`:'—';$('portfolioPnl').className=pnl>0?'positive':pnl<0?'negative':'neutral'}if($('portfolioRoi'))$('portfolioRoi').textContent=list.length&&state.price>0?`ROI ${roi>0?'+':''}${roi.toFixed(2)}%`:'ROI —';if($('portfolioEquity'))$('portfolioEquity').textContent=list.length&&state.price>0?plain(equity):'—';if($('portfolioInj'))$('portfolioInj').textContent=list.length&&state.price>0?`${futuresInj.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:3})} INJ`:'—';if($('portfolioCount'))$('portfolioCount').textContent=`${list.length} ${LANG()==='en'?(list.length===1?'position':'positions'):(list.length===1?'posizione':'posizioni')}`;if($('spotValue'))$('spotValue').textContent=state.spotStored&&state.price>0?plain(spotValue):'—';if($('futuresCloseInj'))$('futuresCloseInj').textContent=list.length&&state.price>0?`${futuresInj.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:4})} INJ`:'—';if($('totalCloseInj'))$('totalCloseInj').textContent=state.price>0&&(state.spotStored||list.length)?`${totalInj.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:4})} INJ`:'—';if($('totalCloseValue'))$('totalCloseValue').textContent=state.price>0&&(state.spotStored||list.length)?`${plain(totalValue)} · Spot + Futures`:'—'}
// Scenario Lab: model the same linear USDT-margined approximation as the live monitor.
function simWords(it,en){return LANG()==='en'?en:it}
function simMoney(value, signed=false){if(!Number.isFinite(value))return'—';let euro=false;try{euro=localStorage.getItem('inj_monitor_currency')==='EUR'}catch(_){}const rate=euro?state.eur:1;const num=Math.abs(value*rate).toLocaleString(euro?'it-IT':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return `${signed?(value>0?'+':value<0?'−':''):value<0?'−':''}${euro?'€':'$'}${num}`}
function simInj(value,signed=false){if(!Number.isFinite(value))return'—';return `${signed?(value>0?'+':value<0?'−':''):value<0?'−':''}${fmt(Math.abs(value),4)} INJ`}
function calcSimAt(p,price){const entry=n(p.entry),lev=n(p.leverage),margin=n(p.margin);if(!(price>0&&entry>0&&lev>0&&margin>0))return null;const qty=margin*lev/entry,dir=p.side==='short'?-1:1,pnl=qty*(price-entry)*dir,liq=estimatedLiq(p);return{margin,qty,pnl,liq,side:p.side,equity:Math.max(0,margin+pnl),beyondLiq:liq>0&&(p.side==='short'?price>=liq:price<=liq)}}

// Scenario Lab follows the actual Home carousel selection, not the manual spot field.
const WALLET_KEYS=['inj_node_comparison_selected_wallet_v1','inj_monitor_address','inj_monitor_wallets_v1','inj_monitor_summaries_v1'];
const WALLET_LCD=['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
const walletState={address:'',label:'',balance:null,origin:'',busy:false,revision:0};
function storedWallet(){
 try{
  const rows=JSON.parse(localStorage.getItem(WALLET_KEYS[2])||'[]');
  const valid=a=>/^inj1[0-9a-z]{38,60}$/i.test(String(a||'').trim());
  const wallets=(Array.isArray(rows)?rows:[]).filter(w=>valid(w?.address));
  const selected=[localStorage.getItem(WALLET_KEYS[0]),localStorage.getItem(WALLET_KEYS[1])].map(a=>String(a||'').toLowerCase()).find(a=>wallets.some(w=>w.address.toLowerCase()===a));
  const wallet=wallets.find(w=>w.address.toLowerCase()===selected)||wallets[0];
  if(wallet)return {address:wallet.address.toLowerCase(),label:wallet.label||'Wallet'};
  const legacy=localStorage.getItem(WALLET_KEYS[1]);
  return valid(legacy)?{address:legacy.toLowerCase(),label:'Wallet'}:null;
 }catch(_){return null}
}
function exactWalletBalance(raw){
 if(!raw||raw.available==null||raw.staked==null||raw.available===''||raw.staked==='')return null;
 const available=Number(raw.available),staked=Number(raw.staked),updated=Number(raw.updated);
 return [available,staked,updated].every(Number.isFinite)&&available>=0&&staked>=0&&updated>0?{available,staked,updated}:null;
}
function walletCache(address){
 try{return exactWalletBalance(JSON.parse(localStorage.getItem(WALLET_KEYS[3])||'{}')[address])}catch(_){return null}
}
function showWallet(){
 const wallet=walletState,b=wallet.balance;
 $('simWalletName').textContent=wallet.address?wallet.label:simWords('Nessun wallet selezionato','No wallet selected');
 $('simWalletAvailable').textContent=b?simInj(b.available):'—';
 $('simStakedInput').value=b?String(Number(b.staked.toFixed(8))):'';
 $('simWalletStatus').textContent=!wallet.address?simWords('Seleziona un wallet dalla Home','Select a wallet on Home'):!b?simWords('In attesa dei saldi on-chain','Waiting for on-chain balances'):(wallet.origin==='live'?simWords('On-chain','On-chain'):simWords('Ultimo saldo salvato','Last saved balance'))+' · '+new Date(b.updated).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function syncWalletSelection(){
 const row=storedWallet(),address=row?.address||'';
 if(address!==walletState.address){walletState.address=address;walletState.balance=null;walletState.origin='';walletState.revision++}
 walletState.label=row?.label||'';
 const cached=address?walletCache(address):null;
 if(cached&&(!walletState.balance||cached.updated>walletState.balance.updated)){walletState.balance=cached;walletState.origin='cache'}
 showWallet();renderSimulator();
}
async function walletPages(host,path,key){
 let next='',seen=new Set(),result=[];
 do{
  const query='?pagination.limit=100'+(next?'&pagination.key='+encodeURIComponent(next):'');
  const data=await quoteJson(host+path+query,4500);
  if(!data||!Array.isArray(data[key]))throw Error('Invalid wallet data');
  result.push(...data[key]);next=data.pagination?.next_key||'';
  if(next&&seen.has(next))throw Error('Pagination loop');
  if(next)seen.add(next);
  if(seen.size>30)throw Error('Too many wallet pages');
 }while(next);
 return result;
}
async function refreshScenarioWallet(){
 syncWalletSelection();if(document.hidden||walletState.busy||!walletState.address)return;
 const address=walletState.address,revision=walletState.revision;walletState.busy=true;
 try{
  for(const host of WALLET_LCD){
   try{
    const [bank,delegations]=await Promise.all([walletPages(host,'/cosmos/bank/v1beta1/balances/'+address,'balances'),walletPages(host,'/cosmos/staking/v1beta1/delegations/'+address,'delegation_responses')]);
    const amount=x=>{const v=Number(x);if(x==null||x===''||!Number.isFinite(v)||v<0)throw Error('Invalid INJ amount');return v/1e18};
    const available=bank.filter(x=>x.denom==='inj').reduce((s,x)=>s+amount(x.amount),0);
    const staked=delegations.filter(x=>x.balance?.denom==='inj').reduce((s,x)=>s+amount(x.balance.amount),0);
    if(revision!==walletState.revision||address!==storedWallet()?.address)return;
    walletState.balance={available,staked,updated:Date.now()};walletState.origin='live';showWallet();renderSimulator();return;
   }catch(_){}
  }
  if(revision===walletState.revision){walletState.origin='cache';showWallet();renderSimulator()}
 }finally{walletState.busy=false}
}

function simSource(){return state.simScope==='all'?state.positions.slice():[draft()]}
function simSummaryAt(list,price){let margin=0,pnl=0,equity=0,beyondLiq=0,valid=0;for(const p of list){const c=calcSimAt(p,price);if(!c)continue;valid++;margin+=c.margin;pnl+=c.pnl;equity+=c.equity;if(c.beyondLiq)beyondLiq++}return{margin,pnl,equity,beyondLiq,valid,roi:margin>0?pnl/margin*100:0}}
function simTranslate(){document.querySelectorAll('[data-sim-it][data-sim-en]').forEach(el=>{el.textContent=LANG()==='en'?el.dataset.simEn:el.dataset.simIt});}
function simMoveSlider(){const range=$('simPriceSlider');if(!range)return;const live=state.price,target=state.simPrice;if(!(live>0))return;const lo=Math.max(.0001,Math.min(live*.5,target>0?target*.92:live)),hi=Math.max(live*1.7,target>0?target*1.08:0,lo+.0002);range.min=String(lo);range.max=String(hi);range.step=String(Math.max(.0001,(hi-lo)/2500));range.value=String(target>0?target:live)}
function renderSimulator(){const simInput=$('simPriceInput');if(!simInput)return;const price=state.price;if(!(state.simPrice>0)&&price>0){state.simPrice=price;simInput.value=state.simPrice.toFixed(4)}const target=state.simPrice;const curr=$('simLiveLabel'),diff=$('simPriceChange');curr.textContent=price>0?`LIVE $${fmt(price,4)}`:'LIVE —';diff.textContent=price>0&&target>0?`${simWords('SCENARIO','SCENARIO')} $${fmt(target,4)} · ${target>=price?'+':''}${((target/price-1)*100).toFixed(2)}%`:'SCENARIO —';simMoveSlider();const ids=['simPnl','simPnlDiff','simRoi','simEquity','simInj','simInjDiff','simTotalInj'];const list=simSource();const base=price>0?simSummaryAt(list,price):null;const hypo=target>0?simSummaryAt(list,target):null;const alert=$('simAlert');alert.className='sim-alert';alert.textContent='';if(!base||!hypo||!base.valid||!hypo.valid){ids.forEach(id=>$(id).textContent='—');$('simTotalMeta').textContent=simWords('Wallet selezionato + Futures','Selected wallet + Futures');if(state.simScope==='all'&&!state.positions.length){alert.className='sim-alert visible info';alert.textContent=simWords('Salva almeno una posizione per simulare tutto il portafoglio.','Save a position first to simulate your whole portfolio.')}else if(price<=0){alert.className='sim-alert visible info';alert.textContent=simWords('In attesa del prezzo live KuCoin per il confronto.','Waiting for KuCoin live price to compare scenarios.')}else{alert.className='sim-alert visible info';alert.textContent=simWords('Inserisci entry, leva e margine della posizione, oppure seleziona le posizioni salvate.','Enter entry, leverage and margin, or select saved positions.')}return}
  const liquidated=hypo.beyondLiq>0;
  const deltaPnl=hypo.pnl-base.pnl;
  const baselineInj=base.equity/price;
  const resultInj=liquidated?NaN:hypo.equity/target;
  const deltaInj=resultInj-baselineInj;
  const balance=walletState.balance;
  const spot=balance?.available,staked=balance?.staked;
  const totalInj=balance?spot+staked+resultInj:NaN;
  $('simPnl').textContent=simMoney(hypo.pnl,true);
  $('simPnl').parentElement.classList.toggle('positive',hypo.pnl>0);
  $('simPnl').parentElement.classList.toggle('negative',hypo.pnl<0);
  $('simPnlDiff').textContent=`${simWords('Dal P/L live','Vs live P/L')}: ${simMoney(deltaPnl,true)}`;
  $('simPnlDiff').className=deltaPnl>0?'delta-positive':deltaPnl<0?'delta-negative':'';
  $('simRoi').textContent=`${hypo.roi>=0?'+':''}${hypo.roi.toFixed(2)}%`;
  $('simRoi').parentElement.classList.toggle('positive',hypo.roi>0);
  $('simRoi').parentElement.classList.toggle('negative',hypo.roi<0);
  $('simEquity').textContent=liquidated?'—':simMoney(hypo.equity);
  $('simInj').textContent=simInj(resultInj);
  $('simInjDiff').textContent=simInj(deltaInj,true);
  $('simInjDiff').parentElement.classList.toggle('positive',deltaInj>0);
  $('simInjDiff').parentElement.classList.toggle('negative',deltaInj<0);
  $('simTotalInj').textContent=simInj(totalInj);
  $('simTotalMeta').textContent=balance?simWords(`Futures + ${fmt(spot,4)} Disponibili + ${fmt(staked,4)} Staking`,`Futures + ${fmt(spot,4)} Available + ${fmt(staked,4)} Staked`):simWords('Saldo wallet non disponibile','Wallet balance unavailable');
  if(liquidated){alert.className='sim-alert visible';alert.textContent=simWords(`Attenzione: a questo prezzo ${hypo.beyondLiq} posizione/i raggiungerebbero o supererebbero la liquidazione ${list.some(p=>p.liq>0)?'indicata':'indicativa'}. Il P/L mostrato è solo matematico; equity e INJ ottenibili non sono stimabili come chiusura effettiva.`,`Warning: at this price ${hypo.beyondLiq} position(s) would hit or pass the provided/indicative liquidation level. P/L is purely mathematical; closing equity and INJ cannot be reliably projected.`)}else if(target>0&&price>0&&Math.abs(target-price)/price>0.50){alert.className='sim-alert visible info';alert.textContent=simWords('Scenario molto distante dal prezzo attuale: considera liquidazione, funding e variazioni di margine prima di interpretare il risultato.','Scenario far from the current price: account for liquidation, funding and margin changes before interpreting results.')}
}
function bindSimulator(){simTranslate();$('simScope').value=state.simScope;$('simPriceInput').value=state.simEdited?String(state.simPrice):'';$('simStakedInput').value='';$('simScope').addEventListener('change',()=>{state.simScope=$('simScope').value==='all'?'all':'active';try{localStorage.setItem(SIM_SCOPE_STORAGE,state.simScope)}catch(_){}renderSimulator()});
  const updatePrice=v=>{const candidate=n(v);if(!(candidate>0))return;state.simPrice=candidate;state.simEdited=true;$('simPriceInput').value=String(Number(candidate.toFixed(4)));try{localStorage.setItem(SIM_PRICE_STORAGE,String(state.simPrice))}catch(_){}renderSimulator()};
  $('simPriceInput').addEventListener('input',()=>{const raw=$('simPriceInput').value;if(raw===''||n(raw)<=0){state.simPrice=0;state.simEdited=false;try{localStorage.removeItem(SIM_PRICE_STORAGE)}catch(_){}renderSimulator();return}state.simPrice=n(raw);state.simEdited=true;try{localStorage.setItem(SIM_PRICE_STORAGE,raw)}catch(_){}renderSimulator()});
  $('simPriceSlider').addEventListener('input',()=>updatePrice($('simPriceSlider').value));
  document.querySelectorAll('[data-sim-shift]').forEach(b=>b.addEventListener('click',()=>{if(state.price>0)updatePrice(state.price*(1+n(b.dataset.simShift)/100))}));
  $('simReset').addEventListener('click',()=>{if(state.price>0)updatePrice(state.price)});

}

function setSide(side){state.side=side==='short'?'short':'long';document.querySelectorAll('[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===state.side));render()}
function formToCurrent(){const p=draft();const card=$('positionCard');const c=calc(p);card.classList.remove('profit','loss');if(c){card.classList.add(c.pnl>0?'profit':c.pnl<0?'loss':'');$('pnlValue').textContent=money(c.pnl);$('pnlPercent').textContent=`ROI ${c.roi>=0?'+':''}${c.roi.toFixed(2)}%`; $('entryMetric').textContent=`$${fmt(p.entry,4)}`;$('priceMetric').textContent=`$${fmt(c.price,4)}`;$('leverageMetric').textContent=`${p.leverage.toFixed(p.leverage%1?1:0)}×`;$('marginMetric').textContent=`$${fmt(p.margin,2)}`;$('sizeMetric').textContent=`$${fmt(c.size,2)}`;$('moveMetric').textContent=`${c.move>=0?'+':''}${c.move.toFixed(2)}%`;$('quantityValue').textContent=`${fmt(c.qty,3)} INJ`;$('liqDistance').textContent=`${c.liqDist.toFixed(2)}%`;$('liqValue').textContent=c.liq?`$${fmt(c.liq,4)}`:'—';$('rangeEntry').textContent=`$${fmt(p.entry,4)}`;$('rangeLive').textContent=`$${fmt(c.price,4)}`;$('liqMeta').textContent=p.liq>0?(LANG()==='en'?'KuCoin value entered manually':'Valore KuCoin inserito manualmente'):(LANG()==='en'?'Indicative estimate · fees/funding excluded':'Stima indicativa · commissioni/funding esclusi');$('positionNote').textContent=p.mode==='cross'?(LANG()==='en'?'Cross margin: liquidation cannot be estimated precisely without account equity and KuCoin risk tier.':'Cross margin: la liquidazione non è stimabile con precisione senza equity account e risk tier KuCoin.'):(LANG()==='en'?'Isolated position monitor · P/L excludes fees and funding.':'Monitor posizione Isolated · P/L al netto di fee/funding non incluso.');renderRange(p,c)}else{$('pnlValue').textContent='—';$('pnlPercent').textContent='ROI —';['entryMetric','priceMetric','leverageMetric','marginMetric','sizeMetric','moveMetric','quantityValue','liqDistance','liqValue','rangeEntry','rangeLive'].forEach(id=>$(id).textContent='—');$('positionNote').textContent=LANG()==='en'?'Enter position data to start.':'Inserisci i dati della posizione per iniziare.'}}
function renderRange(p,c){const vals=[c.liq,p.entry,c.price].filter(v=>v>0);if(vals.length<2)return;let min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;const pad=span*.22;min=Math.max(0,min-pad);max+=pad;span=max-min||1;const pos=v=>Math.max(0,Math.min(100,(v-min)/span*100));$('liqMarker').style.left=`${pos(c.liq)}%`;$('entryMarker').style.left=`${pos(p.entry)}%`;$('liveMarker').style.left=`${pos(c.price)}%`;const a=Math.min(pos(c.liq),pos(c.price)),b=Math.max(pos(c.liq),pos(c.price));$('rangeFill').style.left=`${a}%`;$('rangeFill').style.width=`${Math.max(1,b-a)}%`}
function renderSaved(){const host=$('savedList');$('savedCount').textContent=String(state.positions.length);if(!state.positions.length){host.innerHTML='<div class="empty-state">Nessuna posizione salvata.</div>';return}host.innerHTML=state.positions.map(p=>{const c=calc(p);const pnl=c?`${c.roi>=0?'+':''}${c.roi.toFixed(1)}%`:'—';return `<article class="saved-position ${p.id===state.activeId?'active':''}" data-id="${p.id}"><div class="saved-row"><strong>${escapeHtml(p.name||`INJ ${p.side.toUpperCase()} ${p.leverage}x`)}</strong><span class="side ${p.side}">${p.side.toUpperCase()}</span></div><small>Entry $${fmt(p.entry,4)} · ${p.leverage}× · ${p.mode==='cross'?'Cross':'Isolated'} · ROI ${pnl}</small><button type="button" class="delete-position" data-delete="${p.id}">Elimina</button></article>`}).join('');host.querySelectorAll('[data-id]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-delete]'))return;loadPosition(el.dataset.id)}));host.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();removePosition(btn.dataset.delete)}))}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function loadPosition(id){const p=state.positions.find(x=>x.id===id);if(!p)return;state.activeId=id;state.side=p.side;setSide(p.side);$('entryInput').value=p.entry||'';$('leverageInput').value=p.leverage||'';$('marginInput').value=p.margin||'';$('marginModeInput').value=p.mode||'isolated';$('liquidationInput').value=p.liq||'';$('nameInput').value=p.name||'';save();render()}
function removePosition(id){state.positions=state.positions.filter(p=>p.id!==id);if(state.activeId===id)state.activeId=state.positions[0]?.id||'';save();if(state.activeId)loadPosition(state.activeId);else clearForm();renderSaved()}
function clearForm(){state.activeId='';state.side='long';$('entryInput').value='';$('leverageInput').value='';$('marginInput').value='';$('marginModeInput').value='isolated';$('liquidationInput').value='';$('nameInput').value='';setSide('long');save();render()}
function persistForm(){const p=draft();if(!(p.entry>0&&p.leverage>0&&p.margin>0))return;const existing=current();const item={...p,id:existing?.id||`f_${Date.now().toString(36)}`,updated:Date.now()};const idx=state.positions.findIndex(x=>x.id===item.id);if(idx>=0)state.positions[idx]=item;else state.positions.unshift(item);state.activeId=item.id;save();renderSaved();render()}
let quotePending=false;
function normalizeQuote(price,ts,kind){
 price=Number(price);ts=Number(ts);
 if(ts>1e17)ts/=1e6;else if(ts>1e14)ts/=1e3;else if(ts<1e11)ts*=1000;
 if(!(Number.isFinite(price)&&price>0&&Number.isFinite(ts)&&Date.now()-ts<=30000&&ts<=Date.now()+10000))return null;
 return {price,timestamp:ts,kind};
}
async function quoteJson(url,timeout=5500){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal,headers:{accept:'application/json'}});return r.ok?await r.json():null}catch(_){return null}finally{clearTimeout(timer)}
}
async function directKucoin(){
 const base='https://api-futures.kucoin.com/api/v1/';
 const [m,t]=await Promise.all([quoteJson(base+'mark-price/INJUSDTM/current',3600),quoteJson(base+'ticker?symbol=INJUSDTM',3600)]);
 const md=m?.data,td=t?.data;
 return (m?.code==='200000'&&md?.symbol==='INJUSDTM'?normalizeQuote(md.value,md.timePoint,'mark'):null)
 ||(t?.code==='200000'&&td?.symbol==='INJUSDTM'?normalizeQuote(td.price,td.ts,'last'):null);
}
async function fetchPrice(){
 if(quotePending||document.hidden)return;quotePending=true;
 try{
  const j=await quoteJson('./api/futures-quote');
  let q=j?.exchange==='KuCoin'&&j?.symbol==='INJUSDTM'&&['mark','last'].includes(j?.kind)?normalizeQuote(j.price,j.timestamp,j.kind):null;
  if(!q)q=await directKucoin();
  const badge=$('liveBadge'),feed=$('portfolioFeed'),live=!!q;
  badge.classList.toggle('off',!live);feed.classList.toggle('off',!live);
  badge.textContent=live?(q.kind==='mark'?'KUCOIN · MARK':'KUCOIN · LAST'):'KUCOIN OFFLINE';
  feed.textContent=live?(q.kind==='mark'?'MARK LIVE':'LAST LIVE'):'OFFLINE';
  state.lastPrice=state.price;state.price=live?q.price:0;
  $('livePrice').textContent=live?'$'+fmt(q.price,4):'—';
  $('sourceValue').textContent=live?(q.kind==='mark'?'KuCoin Mark Price':'KuCoin Last Price'):'—';
  $('updatedValue').textContent=live?new Date(q.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):(LANG()==='en'?'Market feed unavailable · retrying':'Feed non disponibile · riconnessione');
  render();
 }finally{quotePending=false}
}
async function loadEur(){try{const cached=n(localStorage.getItem('inj_monitor_eur_rate'));if(cached>0)state.eur=cached}catch(_){} }
function render(){formToCurrent();renderSaved();renderPortfolio();renderSimulator()}
function bind(){bindSimulator();document.querySelectorAll('[data-side]').forEach(b=>b.addEventListener('click',()=>setSide(b.dataset.side)));['entryInput','leverageInput','marginInput','marginModeInput','liquidationInput','nameInput'].forEach(id=>$(id).addEventListener('input',render));const spotInput=$('spotInjInput');if(spotInput){spotInput.value=state.spotStored?String(state.spot):'';spotInput.addEventListener('input',()=>{state.spot=Math.max(0,n(spotInput.value));state.spotStored=spotInput.value!=='';try{if(state.spotStored)localStorage.setItem(SPOT_STORAGE,String(state.spot));else localStorage.removeItem(SPOT_STORAGE)}catch(_){}renderPortfolio()})}$('positionForm').addEventListener('submit',e=>{e.preventDefault();persistForm()});$('clearButton').addEventListener('click',clearForm);$('newPositionButton').addEventListener('click',clearForm);$('futuresHome').addEventListener('click',e=>{e.preventDefault();try{sessionStorage.setItem('inj_node_return_tools','1')}catch(_){}let back=false;try{const ref=document.referrer?new URL(document.referrer):null;back=!!(ref&&ref.origin===location.origin&&(ref.pathname.endsWith('/index.html')||ref.pathname.endsWith('/'))&&history.length>1)}catch(_){}if(back)history.back();else location.replace('./index.html?tab=tools')});window.addEventListener('storage',e=>{if(e.key==='inj_monitor_theme')document.documentElement.dataset.theme=localStorage.getItem('inj_monitor_theme')||'obsidian';if(e.key==='inj_monitor_privacy')document.documentElement.dataset.injPrivacy=localStorage.getItem('inj_monitor_privacy')==='1'?'on':'off';if(e.key==='inj_monitor_currency')render();if(e.key==='inj_node_language_v1'){simTranslate();renderSimulator()}if(WALLET_KEYS.includes(e.key)||e.key===null){void refreshScenarioWallet()}if(e.key===SPOT_STORAGE){const raw=localStorage.getItem(SPOT_STORAGE);state.spotStored=raw!==null&&raw!=='';state.spot=Math.max(0,n(raw));if($('spotInjInput'))$('spotInjInput').value=state.spotStored?String(state.spot):'';renderPortfolio()}})}
function init(){read();loadEur();bind();syncWalletSelection();void refreshScenarioWallet();window.setInterval(refreshScenarioWallet,12000);window.addEventListener('pageshow',refreshScenarioWallet);window.addEventListener('online',refreshScenarioWallet);if(state.activeId&&state.positions.some(p=>p.id===state.activeId))loadPosition(state.activeId);else if(state.positions.length)loadPosition(state.positions[0].id);else render();fetchPrice();state.timer=setInterval(fetchPrice,3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){fetchPrice();void refreshScenarioWallet()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
