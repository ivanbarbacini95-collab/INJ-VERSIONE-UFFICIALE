/* INJ Node · Validators · on-chain directory and exact delegation ranking */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const en=document.documentElement.lang==='en';
 const t=(it,english)=>en?english:it;
 const LCDS=['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
 const LIST_REFRESH=60_000,COUNT_REFRESH=180_000,RANK_REFRESH=240_000,PRICE_REFRESH=25_000,PRICE_MAX_AGE=120_000;
 const nf=new Intl.NumberFormat(en?'en-US':'it-IT',{maximumFractionDigits:2});
 const pf=new Intl.NumberFormat(en?'en-US':'it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
 const fi=n=>new Intl.NumberFormat(en?'en-US':'it-IT',{maximumFractionDigits:0}).format(n);
 const short=s=>String(s||'').slice(0,9)+'…'+String(s||'').slice(-6);
 const raw=v=>{try{return BigInt(String(v||'0').split('.')[0])}catch(_){return 0n}};
 const amount=n=>nf.format(Number(n)/1e18);
 const status=v=>String(v?.status||'');
 const active=v=>['BOND_STATUS_BONDED','3'].includes(status(v))&&!v.jailed;
 const fee=v=>Number(v?.commission?.commission_rates?.rate);
 const state={validators:[],updatedAt:0,apr:null,counts:new Map(),countFail:new Map(),countQueue:[],countPending:new Set(),countActive:0,visible:30,wallet:'',savedWallet:'',walletDelegations:new Map(),activeOperator:'',rankCache:new Map(),rankAbort:null,rankRows:[],rankLoadedAt:0,rankShown:25,rankLoading:false,refreshing:false,observer:null,priceUsd:null,priceAt:0,priceSource:'',pricePending:null,eurRate:null,eurAt:0,eurPending:null};
 const safeStore='inj_node_validators_verified_v1';
 const NUM_LIMIT=300000;
 const validWallet=a=>/^inj1[0-9a-z]{38,60}$/.test(String(a||'').toLowerCase());
 const currency=()=>{try{return localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD'}catch(_){return 'USD'}};
 function selectedSavedWallet(){
  try{
   const saved=JSON.parse(localStorage.getItem('inj_monitor_wallets_v1')||'[]');
   const known=Array.isArray(saved)?saved.map(v=>String(v?.address||'').trim().toLowerCase()).filter(validWallet):[];
   const legacy=String(localStorage.getItem('inj_monitor_address')||'').trim().toLowerCase();
   if(validWallet(legacy)&&!known.includes(legacy))known.push(legacy);
   const selected=String(localStorage.getItem('inj_node_comparison_selected_wallet_v1')||'').trim().toLowerCase();
   return known.includes(selected)?selected:known.includes(legacy)?legacy:known[0]||'';
  }catch(_){return ''}
 }
 function syncSavedWallet(){
  const saved=selectedSavedWallet();
  if(state.savedWallet===saved)return false;
  const oldSaved=state.savedWallet;
  state.savedWallet=saved;
  if(!state.wallet||state.wallet===oldSaved)state.wallet=saved;
  if(saved&&!$('walletAddress').value.trim())$('walletAddress').value=saved;
  return true;
 }
 async function priceJson(url,timeout=6500){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
   const response=await fetch(url,{cache:'no-store',signal:ctrl.signal});
   if(!response.ok)throw new Error('Market quote HTTP '+response.status);
   return await response.json();
  }finally{clearTimeout(timer)}
 }
 function moneyFromInj(wei){
  const usd=state.priceUsd;
  if(!(usd>0)||Date.now()-state.priceAt>PRICE_MAX_AGE)return '';
  const fiat=currency();
  const conversion=fiat==='EUR'?state.eurRate:1;
  if(!(conversion>0)||fiat==='EUR'&&Date.now()-state.eurAt>24*3600_000)return '';
  const value=Number(wei)/1e18*usd*conversion;
  if(!Number.isFinite(value)||value<0)return '';
  return '≈ '+new Intl.NumberFormat(fiat==='EUR'?'it-IT':'en-US',{
   style:'currency',currency:fiat,maximumFractionDigits:2,minimumFractionDigits:2
  }).format(value);
 }
 const balanceWithFiat=wei=>amount(wei)+' INJ'+(moneyFromInj(wei)?' · '+moneyFromInj(wei):'');
 function updatePriceStatus(){
  const priceFresh=state.priceUsd>0&&Date.now()-state.priceAt<=PRICE_MAX_AGE;
  const value=priceFresh?moneyFromInj(1000000000000000000n):'';
  setText('priceStatus',value
   ?t('Controvalori indicativi · 1 INJ ','Indicative values · 1 INJ ')+value.replace(/^≈ /,'')+' · '+new Date(state.priceAt).toLocaleTimeString(en?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
   :t('Controvalore in aggiornamento: prezzo/cambio live non disponibile.','Estimated value unavailable: live price or FX quote pending.'));
 }
 async function updateFx(force=false){
  if(currency()!=='EUR')return;
  if(state.eurPending)return state.eurPending;
  if(!force&&state.eurRate>0&&Date.now()-state.eurAt<3600_000)return;
  state.eurPending=(async()=>{
   const data=await priceJson('https://api.frankfurter.app/latest?from=USD&to=EUR');
   const rate=Number(data?.rates?.EUR);
   if(!(rate>0&&rate<3))throw new Error('Invalid USD/EUR conversion rate');
   state.eurRate=rate;state.eurAt=Date.now();
   try{localStorage.setItem('inj_monitor_eur_rate',String(rate))}catch(_){}
  })().catch(()=>{}).finally(()=>{state.eurPending=null});
  return state.eurPending;
 }
 async function updatePrice(force=false){
  if(state.pricePending)return state.pricePending;
  if(!force&&state.priceUsd>0&&Date.now()-state.priceAt<PRICE_REFRESH)return;
  state.pricePending=(async()=>{
   let usd=null,source='';
   const endpoints=[
    ['https://api.binance.com/api/v3/ticker/price?symbol=INJUSDT','Binance'],
    ['https://data-api.binance.vision/api/v3/ticker/price?symbol=INJUSDT','Binance'],
    ['https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd','CoinGecko']
   ];
   for(const [url,name] of endpoints){
    try{
     const response=await priceJson(url);
     const n=Number(name==='CoinGecko'?response?.['injective-protocol']?.usd:response?.price);
     if(n>0&&Number.isFinite(n)){usd=n;source=name;break}
    }catch(_){}
   }
   if(!(usd>0))return;
   state.priceUsd=usd;state.priceAt=Date.now();state.priceSource=source;
  })().finally(()=>{
   state.pricePending=null;
   if($('validatorDetail').open&&state.rankRows.length)renderRanking();
   updatePriceStatus();
   document.querySelectorAll('[data-balance-wei]').forEach(node=>{
    const wei=raw(node.dataset.balanceWei);
    node.textContent=balanceWithFiat(wei);
   });
  });
  return state.pricePending;
 }
 async function refreshMarket(force=false){
  await Promise.allSettled([updatePrice(force),updateFx(force)]);
  if($('validatorDetail').open&&state.rankRows.length)renderRanking();
  updatePriceStatus();
 }

 const valByOp=op=>state.validators.find(v=>v.operator_address===op);
 const commission=v=>Number.isFinite(fee(v))?pf.format(fee(v)*100)+'%':'—';
 const netApr=v=>{
  if(!state.apr||!Number.isFinite(Number(state.apr.apr))||!Number.isFinite(fee(v)))return null;
  const fn=window.INJ_STAKING_APR?.validatorNetApr;
  const result=fn?fn(state.apr.apr,fee(v),status(v),Boolean(v.jailed)):(active(v)?state.apr.apr*(1-fee(v)):0);
  return Number.isFinite(result)?result:null;
 };
 function setText(id,value){const node=$(id);if(node)node.textContent=value;}
 function metric(label,value){const node=document.createElement('div');node.className='detail-metric';const s=document.createElement('span');s.textContent=label;const b=document.createElement('strong');b.textContent=value;node.append(s,b);return node;}
 function escapeStatus(v){return v.jailed?t('In carcere','Jailed'):active(v)?t('Attivo','Active'):t('Inattivo','Inactive')}
 async function json(path,signal){
  let error;
  for(const base of LCDS){
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
   const ctrl=new AbortController();
   const abort=()=>ctrl.abort();
   signal?.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(()=>ctrl.abort(),7300);
   try{
    const response=await fetch(base+path,{cache:'no-store',signal:ctrl.signal,headers:{'Accept':'application/json'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(!data||typeof data!=='object')throw new Error('Empty API response');
    return data;
   }catch(e){error=e;if(signal?.aborted)throw e}
   finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
  }
  throw error||new Error('Injective LCD unavailable');
 }
 async function paged(path,key,maxPages,signal,onProgress){
  const all=[],seen=new Set();
  let next='',page=0,total=null;
  do{
   if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
   const join=path.includes('?')?'&':'?';
   const q=path+join+'pagination.limit='+key+'&pagination.count_total='+(page===0?'true':'false')+(page===0?'&pagination.offset=0':'')+(next?'&pagination.key='+encodeURIComponent(next):'');
   const data=await json(q,signal);
   if(!Array.isArray(data[key==='150'?'validators':'delegation_responses']))throw new Error('Unexpected staking response');
   const rows=data[key==='150'?'validators':'delegation_responses'];
   all.push(...rows);
   if(page===0&&data.pagination?.total&&Number.isSafeInteger(Number(data.pagination.total)))total=Number(data.pagination.total);
   if(onProgress)onProgress(all.length,total);
   const newKey=String(data.pagination?.next_key||'');
   if(newKey&&seen.has(newKey))throw new Error('Repeated page cursor');
   if(newKey)seen.add(newKey);
   next=newKey;page++;
   if(page>maxPages||all.length>NUM_LIMIT)throw new Error('Pagination exceeded safe limit');
  }while(next);
  if(total!==null&&all.length!==total)throw new Error('Incomplete on-chain data: '+all.length+'/'+total);
  return all;
 }
 function updateTop(){
  const total=state.validators.length, bonded=state.validators.filter(active);
  setText('totalValidators',total?fi(total):'—');
  setText('activeValidators',total?fi(bonded.length)+' '+t('attivi','active'):'—');
  setText('networkApr',state.apr?pf.format(state.apr.apr)+'%':'—');
  setText('aprSource',state.apr?String(state.apr.source||'Injective')+(state.apr.stale?' · '+t('in ritardo','stale'):''):t('APR non verificabile','APR unavailable'));
  setText('stakedTotal',total?nf.format(bonded.reduce((sum,v)=>sum+Number(v.tokens||'0')/1e18,0)):'—');
  setText('updatedAt',state.updatedAt?new Date(state.updatedAt).toLocaleTimeString(en?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit'}):'—');
  const fresh=Date.now()-state.updatedAt<2*LIST_REFRESH;
  $('liveIndicator').dataset.live=fresh?(state.apr&&!state.apr.stale?'true':'stale'):'false';
  setText('liveText',fresh?t('AUTO · 60s','AUTO · 60s'):t('OFFLINE','OFFLINE'));
 }
 async function updateApr(force){
  const service=window.INJ_STAKING_APR;
  if(!service){state.apr=null;updateTop();return}
  try{state.apr=await service.load(Boolean(force));}catch(_){state.apr=service.snapshot?.()||null}
  updateTop();
 }
 function rowsFiltered(){
  const query=$('searchValidator').value.trim().toLocaleLowerCase();
  const f=$('statusFilter').value;
  const sort=$('sortFilter').value;
  const rows=state.validators.filter(v=>{
   const ok=f==='all'||(f==='bonded'?active(v):!active(v));
   return ok&&(!query||String(v.description?.moniker||'').toLocaleLowerCase().includes(query)||String(v.operator_address||'').toLowerCase().includes(query));
  });
  rows.sort((a,b)=>{
   if(sort==='name')return String(a.description?.moniker||'').localeCompare(String(b.description?.moniker||''));
   if(sort==='fee')return (Number.isFinite(fee(a))?fee(a):Infinity)-(Number.isFinite(fee(b))?fee(b):Infinity);
   if(sort==='apr')return (netApr(b)??-1)-(netApr(a)??-1);
   const aa=raw(a.tokens),bb=raw(b.tokens);
   return aa===bb?0:bb>aa?1:-1;
  });
  return rows;
 }
 function renderList(){
  const host=$('validatorList'),list=rowsFiltered(),selected=list.slice(0,state.visible);
  state.observer?.disconnect();
  host.replaceChildren();
  if(!list.length){const el=document.createElement('div');el.className='empty';el.textContent=state.validators.length?t('Nessun validatore corrisponde ai filtri.','No validators match the filters.'):t('Connessione alla rete Injective…','Connecting to Injective…');host.append(el)}
  const frag=document.createDocumentFragment();
  selected.forEach(v=>{
   const op=v.operator_address;
   const item=document.createElement('button');item.type='button';item.className='validator';item.dataset.operator=op;
   const lead=document.createElement('div');lead.className='validator-name';
   const logo=document.createElement('div');logo.className='validator-logo';logo.textContent=String(v.description?.moniker||'V').trim().slice(0,2).toUpperCase();
   const texts=document.createElement('div');texts.className='validator-text';
   const title=document.createElement('strong');title.textContent=v.description?.moniker||short(op);
   const stake=document.createElement('small');stake.textContent=escapeStatus(v)+' · '+amount(v.tokens)+' INJ'+(state.walletDelegations.has(op)?' · '+t('WALLET PRESENTE','WALLET FOUND'):'');
   const dot=document.createElement('i');dot.className='state-dot'+(v.jailed?' jailed':active(v)?'':' inactive');
   stake.prepend(dot);texts.append(title,stake);lead.append(logo,texts);
   const c=document.createElement('span');c.className='validator-value fee';c.textContent=commission(v);
   const a=document.createElement('span');a.className='validator-value net';const net=netApr(v);a.textContent=net===null?'—':pf.format(net)+'%';
   const n=document.createElement('span');n.className='delegator-count';n.dataset.countOperator=op;
   n.textContent=state.counts.has(op)?fi(state.counts.get(op).value)+' '+t('wallet','accounts'):t('— wallet','— accounts');
   const arrow=document.createElement('span');arrow.className='validator-arrow';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
   item.append(lead,c,a,n,arrow);
   item.addEventListener('click',()=>openDetail(op));
   frag.append(item);
  });
  host.append(frag);
  setText('resultsCount',fi(list.length)+' '+t('valid.','validators'));
  $('loadMore').hidden=selected.length===list.length;
  if('IntersectionObserver' in window){
   state.observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){state.observer.unobserve(entry.target);queueCount(entry.target.dataset.operator)}});
   },{rootMargin:'160px 0px'});
   host.querySelectorAll('.validator').forEach(el=>state.observer.observe(el));
  }else{selected.slice(0,20).forEach(v=>queueCount(v.operator_address))}
 }
 function queueCount(op){
  const old=state.counts.get(op);
  if(old&&Date.now()-old.at<COUNT_REFRESH)return;
  if(state.countFail.get(op)>Date.now()||state.countPending.has(op)||state.countQueue.includes(op))return;
  state.countQueue.push(op);drainCountQueue();
 }
 function drainCountQueue(){
  while(state.countActive<3&&state.countQueue.length){
   const op=state.countQueue.shift();state.countActive++;state.countPending.add(op);
   json('/cosmos/staking/v1beta1/validators/'+encodeURIComponent(op)+'/delegations?pagination.limit=1&pagination.offset=0&pagination.count_total=true')
    .then(data=>{
     const count=Number(data?.pagination?.total);
     if(Number.isSafeInteger(count)&&count>=0){
      state.counts.set(op,{value:count,at:Date.now()});
      document.querySelectorAll('[data-count-operator]').forEach(el=>{
       if(el.dataset.countOperator===op)el.textContent=fi(count)+' '+t('wallet','accounts');
      });
      if(state.activeOperator===op)fillDetailMetrics(valByOp(op));
     }else{state.countFail.set(op,Date.now()+60_000)}
    })
    .catch(()=>state.countFail.set(op,Date.now()+60_000))
    .finally(()=>{state.countActive--;state.countPending.delete(op);drainCountQueue()});
  }
 }
 async function refresh(force){
  if(state.refreshing)return;
  if(!force&&Date.now()-state.updatedAt<LIST_REFRESH-10_000&&state.validators.length)return;
  state.refreshing=true;$('refresh').disabled=true;
  try{
   const list=await paged('/cosmos/staking/v1beta1/validators','150',20);
   if(!list.length)throw new Error('No validators');
   state.validators=list.filter(v=>v&&v.operator_address);
   state.updatedAt=Date.now();
   try{localStorage.setItem(safeStore,JSON.stringify({validators:state.validators,at:state.updatedAt}))}catch(_){}
   renderList();
  }catch(e){
   if(!state.validators.length){
    try{
     const c=JSON.parse(localStorage.getItem(safeStore)||'null');
     if(Array.isArray(c?.validators)&&Date.now()-Number(c.at)<12*3600_000){state.validators=c.validators;state.updatedAt=Number(c.at);renderList()}
    }catch(_){}
   }
   if(!state.validators.length){$('validatorList').replaceChildren();const err=document.createElement('div');err.className='empty';err.textContent=t('Validatore non disponibile. Verifica la connessione e riprova.','Validator data unavailable. Check your connection and retry.');$('validatorList').append(err)}
  }finally{state.refreshing=false;$('refresh').disabled=false;updateTop()}
 }
 async function refreshAll(force){
  await Promise.allSettled([refresh(force),updateApr(force)]);
  renderList();updateTop();
 }
 async function walletLookup(ev){
  ev?.preventDefault();
  const addr=$('walletAddress').value.trim().toLowerCase();
  const host=$('walletResult');
  host.hidden=false;host.replaceChildren();
  const info=document.createElement('strong');host.append(info);
  if(!/^inj1[0-9a-z]{38,60}$/.test(addr)){
   info.textContent=t('Indirizzo Injective non valido.','Invalid Injective address.');return;
  }
  state.wallet=addr;
  $('walletSubmit').disabled=true;
  info.textContent=t('Ricerca delle deleghe in blockchain…','Reading on-chain delegations…');
  try{
   const records=await paged('/cosmos/staking/v1beta1/delegations/'+encodeURIComponent(addr),'500',100,null);
   state.walletDelegations.clear();
   for(const row of records){
    const op=row?.delegation?.validator_address;
    if(op){state.walletDelegations.set(op,(state.walletDelegations.get(op)||0n)+raw(row.balance?.amount))}
   }
   const total=Array.from(state.walletDelegations.values()).reduce((a,b)=>a+b,0n);
   info.textContent=fi(state.walletDelegations.size)+' '+t('validatori trovati','validators found')+' · '+balanceWithFiat(total);
   if(!state.walletDelegations.size){
    const p=document.createElement('p');p.className='help';p.textContent=t('Nessuna delega attiva trovata su Injective.','No active Injective delegations found.');host.append(p);
   }
   for(const [op,balance] of state.walletDelegations){
    const r=document.createElement('div');r.className='wallet-item';
    const name=document.createElement('strong');name.textContent=valByOp(op)?.description?.moniker||short(op);
    const st=document.createElement('span');st.dataset.balanceWei=String(balance);st.textContent=balanceWithFiat(balance);
    const b=document.createElement('button');b.type='button';b.textContent=t('Vedi posizione','View rank');b.addEventListener('click',()=>openDetail(op));
    r.append(name,st,b);host.append(r);
   }
   renderList();
   if($('validatorDetail').open&&state.rankRows.length)renderRanking();
  }catch(_){info.textContent=t('Impossibile verificare le deleghe: dati non disponibili.','Unable to verify delegations: data unavailable.');state.walletDelegations.clear();state.wallet='';renderList()}
  finally{$('walletSubmit').disabled=false}
 }
 function fillDetailMetrics(v){
  if(!v)return;
  const node=$('detailMetrics');node.replaceChildren();
  const count=state.counts.get(v.operator_address)?.value;
  const n=netApr(v);
  node.append(
   metric('NET APR',n===null?'—':pf.format(n)+'%'),
   metric('COMMISSION',commission(v)),
   metric(t('DELEGATO','STAKED'),amount(v.tokens)+' INJ'),
   metric('DELEGATORS',count===undefined?'—':fi(count)),
   metric('STATUS',escapeStatus(v)),
   metric(t('VARIAZIONE MAX FEE','MAX FEE CHANGE'),Number.isFinite(Number(v.commission?.commission_rates?.max_change_rate))?pf.format(Number(v.commission.commission_rates.max_change_rate)*100)+'%':'—')
  );
 }
 function openDetail(op){
  const v=valByOp(op);
  if(!v)return;
  if(state.rankAbort)state.rankAbort.abort();
  state.activeOperator=op;state.rankShown=25;state.rankRows=[];state.rankLoading=false;
  $('detailTitle').textContent=v.description?.moniker||short(op);
  $('operatorAddress').textContent=op;
  $('myRank').hidden=true;$('delegatorList').replaceChildren();
  $('moreDelegators').hidden=true;
  setText('rankingAge','');
  setText('rankStatus',t('Preparazione classifica on-chain…','Preparing on-chain ranking…'));
  fillDetailMetrics(v);queueCount(op);
  const dialog=$('validatorDetail');if(!dialog.open)dialog.showModal();
  void loadRanking(op);
 }
 async function loadRanking(op){
  if(state.rankLoading)return;
  const cached=state.rankCache.get(op);
  if(cached&&Date.now()-cached.at<RANK_REFRESH){
   state.rankRows=cached.rows;state.rankLoadedAt=cached.at;renderRanking();return;
  }
  state.rankLoading=true;
  const ctrl=new AbortController();state.rankAbort=ctrl;
  $('delegatorList').replaceChildren();$('moreDelegators').hidden=true;
  const total=state.counts.get(op)?.value;
  try{
   const rows=await paged('/cosmos/staking/v1beta1/validators/'+encodeURIComponent(op)+'/delegations','500',650,ctrl.signal,(loaded,reported)=>{
    if(state.activeOperator!==op)return;
    setText('rankStatus',t('Lettura on-chain: ','Reading on-chain: ')+fi(loaded)+(reported!==null?' / '+fi(reported):'')+' '+t('delegatori. Classifica completa in preparazione.','delegators. Full ranking in progress.'));
   });
   if(ctrl.signal.aborted||state.activeOperator!==op)return;
   const grouped=new Map();
   for(const item of rows){
    const address=String(item?.delegation?.delegator_address||'');
    if(!address)continue;
    grouped.set(address,(grouped.get(address)||0n)+raw(item.balance?.amount));
   }
   const sorted=Array.from(grouped,([address,balance])=>({address,balance})).filter(x=>x.balance>0n);
   sorted.sort((a,b)=>a.balance===b.balance?a.address.localeCompare(b.address):a.balance>b.balance?-1:1);
   let lastAmount=null,prevRank=0;
   sorted.forEach((row,i)=>{row.rank=lastAmount!==null&&row.balance===lastAmount?prevRank:i+1;lastAmount=row.balance;prevRank=row.rank});
   const at=Date.now();
   state.rankCache.set(op,{at,rows:sorted});
   state.rankRows=sorted;state.rankLoadedAt=at;
   state.counts.set(op,{value:sorted.length,at});
   fillDetailMetrics(valByOp(op));
   renderRanking();
  }catch(e){
   if(!ctrl.signal.aborted&&state.activeOperator===op){
    state.rankRows=[];setText('rankStatus',t('Classifica non verificabile: il nodo non ha restituito tutte le deleghe. Riprova più tardi.','Ranking unavailable: the node did not return all delegations. Please retry later.'));
   }
  }finally{if(state.rankAbort===ctrl)state.rankAbort=null;state.rankLoading=false}
 }
 function renderRanking(){
  const rows=state.rankRows;
  const op=state.activeOperator;
  if(!op||!$('validatorDetail').open)return;
  syncSavedWallet();
  const mybox=$('myRank');mybox.replaceChildren();
  const targets=[];
  if(state.savedWallet)targets.push({address:state.savedWallet,saved:true});
  if(state.wallet&&state.wallet!==state.savedWallet)targets.push({address:state.wallet,saved:false});
  for(const target of targets){
   const matched=rows.find(r=>r.address===target.address);
   const entry=document.createElement('div');entry.className='my-rank-entry'+(target.saved?' saved':' searched');
   const left=document.createElement('div');left.className='my-rank-main';
   const label=document.createElement('span');label.className='my-rank-label';
   label.textContent=target.saved?t('IL TUO WALLET SALVATO','YOUR SAVED WALLET'):t('WALLET CERCATO','SEARCHED WALLET');
   const rank=document.createElement('strong');rank.textContent=matched?'#'+fi(matched.rank):'—';
   const addr=document.createElement('code');addr.className='saved-address';addr.textContent=target.address;
   left.append(label,rank,addr);
   const right=document.createElement('div');right.className='my-rank-balance';
   right.textContent=matched?balanceWithFiat(matched.balance):t('Nessuna delega a questo validatore','No delegation to this validator');
   entry.append(left,right);mybox.append(entry);
  }
  mybox.hidden=!targets.length;
  setText('rankStatus',fi(rows.length)+' '+t('delegatori ordinati per INJ delegati.','delegators ranked by delegated INJ.'));
  setText('rankingAge',new Date(state.rankLoadedAt).toLocaleTimeString(en?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit'}));
  updatePriceStatus();
  const host=$('delegatorList');host.replaceChildren();
  const fragment=document.createDocumentFragment();
  rows.slice(0,state.rankShown).forEach(row=>{
   const saved=Boolean(state.savedWallet&&row.address===state.savedWallet);
   const searched=Boolean(state.wallet&&row.address===state.wallet);
   const node=document.createElement('div');node.className='delegator-row'+(saved?' saved':searched?' mine':'');
   const rank=document.createElement('span');rank.className='rank';rank.textContent='#'+fi(row.rank);
   const addressBox=document.createElement('div');addressBox.className='delegator-address';
   const address=document.createElement('code');address.textContent=saved?row.address:short(row.address);address.title=row.address;
   addressBox.append(address);
   if(saved){const tag=document.createElement('span');tag.className='saved-badge';tag.textContent=t('SALVATO','SAVED');addressBox.append(tag)}
   const balance=document.createElement('b');balance.className='delegator-balance';balance.dataset.balanceWei=String(row.balance);balance.textContent=balanceWithFiat(row.balance);
   node.append(rank,addressBox,balance);fragment.append(node);
  });
  host.append(fragment);
  $('moreDelegators').hidden=rows.length<=state.rankShown;
 }
 function exitTools(){
  try{sessionStorage.setItem('inj_node_return_tools','1')}catch(_){}
  if(window.parent!==window){window.parent.postMessage({type:'injnode:section:tools'},location.origin);return}
  try{const p=document.referrer?new URL(document.referrer):null;if(p&&p.origin===location.origin&&(p.pathname.endsWith('/')||p.pathname.endsWith('/index.html'))&&history.length>1){history.back();return}}catch(_){}
  location.replace('./index.html?tab=tools');
 }
 function initialize(){
  document.querySelectorAll('[data-it][data-en]').forEach(el=>{el.textContent=el.getAttribute(en?'data-en':'data-it')});
  syncSavedWallet();
  updatePriceStatus();
  $('back').addEventListener('click',exitTools);
  $('refresh').addEventListener('click',()=>refreshAll(true));
  $('walletForm').addEventListener('submit',walletLookup);
  $('searchValidator').addEventListener('input',()=>{state.visible=30;renderList()});
  for(const id of ['statusFilter','sortFilter'])$(id).addEventListener('change',()=>{state.visible=30;renderList()});
  $('loadMore').addEventListener('click',()=>{state.visible+=30;renderList()});
  $('moreDelegators').addEventListener('click',()=>{state.rankShown+=50;renderRanking()});
  $('closeDetail').addEventListener('click',()=>$('validatorDetail').close());
  $('validatorDetail').addEventListener('close',()=>{state.rankAbort?.abort();state.activeOperator='';state.rankRows=[];state.rankLoading=false});
  $('validatorDetail').addEventListener('click',event=>{if(event.target===$('validatorDetail'))$('validatorDetail').close()});
  $('copyOperator').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('operatorAddress').textContent);$('copyOperator').textContent=t('COPIATO','COPIED');setTimeout(()=>$('copyOperator').textContent='COPY',1800)}catch(_){}});
  try{
   const c=JSON.parse(localStorage.getItem(safeStore)||'null');
   if(Array.isArray(c?.validators)&&Date.now()-Number(c.at)<12*3600_000){state.validators=c.validators;state.updatedAt=Number(c.at);renderList();updateTop()}
  }catch(_){}
  void refreshAll(true);
  void refreshMarket(true);
  setInterval(()=>{if(!document.hidden)void refreshAll(false)},LIST_REFRESH);
  setInterval(()=>{if(!document.hidden)void refreshMarket(false)},PRICE_REFRESH);
  setInterval(()=>{if(!document.hidden&&$('validatorDetail').open&&state.activeOperator&&!state.rankLoading&&Date.now()-state.rankLoadedAt>RANK_REFRESH)void loadRanking(state.activeOperator)},60_000);
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden){
    if(syncSavedWallet()){if($('validatorDetail').open&&state.rankRows.length)renderRanking();renderList()}
    void refreshAll(false);void refreshMarket(false);
   }
  });
  window.addEventListener('storage',event=>{
   if(!['inj_monitor_wallets_v1','inj_monitor_address','inj_node_comparison_selected_wallet_v1','inj_monitor_currency'].includes(event.key))return;
   if(syncSavedWallet()){if($('validatorDetail').open&&state.rankRows.length)renderRanking();renderList()}
   void refreshMarket(true);
  });
  window.addEventListener('online',()=>void refreshAll(true));
 }
 initialize();
})();