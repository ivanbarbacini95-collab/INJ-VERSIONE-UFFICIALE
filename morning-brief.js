/* INJ Node Morning Brief v16.07.36. Local first-open briefing; never claim to send a push while the app is closed. */
(() => {
 'use strict';
 const el = id => document.getElementById(id);
 const root = el('morningBriefOverlay');
 if (!root) return;
 const STORE='inj_node_morning_brief_v1',NIGHTS='inj_node_morning_night_samples_v1';
 const lang=()=>document.documentElement.lang==='en';
 const tr=(it,en)=>lang()?en:it;
 const read=(key,def)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?def:value}catch(_){return def}};
 const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}};
 const settings=Object.assign({enabled:true,wake:7,shown:''},read(STORE,{}));
 settings.wake=Number.isInteger(Number(settings.wake))?Math.max(5,Math.min(12,Number(settings.wake))):7;
 const source=()=>typeof window.INJ_MORNING_SOURCE==='function'?window.INJ_MORNING_SOURCE():null;
 const now=()=>Date.now();
 const valid=v=>typeof v==='number'&&Number.isFinite(v);
 const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const num=(v,n=4)=>Number(v).toLocaleString(lang()?'en-US':'it-IT',{minimumFractionDigits:n,maximumFractionDigits:n});
 const hhmm=t=>new Date(t).toLocaleTimeString(lang()?'en-GB':'it-IT',{hour:'2-digit',minute:'2-digit'});
 const nightStart=(timestamp=now())=>{
  const start=new Date(timestamp);start.setHours(23,0,0,0);
  if(new Date(timestamp).getHours()<20)start.setDate(start.getDate()-1);
  return start.getTime();
 };
 const fmtPrice=(usd,data)=>{
  if(!valid(usd)||usd<=0)return '—';
  const eur=data?.currency==='EUR'&&Number(data?.eurRate)>0;
  const value=eur?usd*data.eurRate:usd;
  return new Intl.NumberFormat(eur?'it-IT':'en-US',{style:'currency',currency:eur?'EUR':'USD',minimumFractionDigits:2,maximumFractionDigits:value<10?4:2}).format(value);
 };
 const fmtInj=amount=>valid(amount)&&amount>=0?num(amount,6)+' INJ':'—';
 const gain=v=>!valid(v)?'':v>0?'up':v<0?'down':'flat';
 const set=(id,value)=>{const node=el(id);if(node&&node.textContent!==String(value))node.textContent=value};
 let nightData=null,nightFor=0,fetching=false,lastData=null,onceOpening=false,refreshing=false;
 let nightSamples=read(NIGHTS,{});
 if(!nightSamples||typeof nightSamples!=='object')nightSamples={};
 let seenShow=false,lastFocus=null,readyAttemptAt=0;
 function freshWallets(data){
  const wallets=Array.isArray(data?.wallets)?data.wallets:[];
  const t=now();
  const validRows=wallets.filter(w=>valid(w.rewards)&&w.rewards>=0&&valid(w.updated)&&t-w.updated<15*60*1000);
  return {wallets,validRows,complete:wallets.length>0&&validRows.length===wallets.length};
 }
 function snapshotNight(data){
  const t=now(),time=new Date(t),hour=time.getHours();
  if(!(hour>=20||hour===0)||!data)return;
  const start=nightStart(t);
  if(Math.abs(t-start)>3*60*60*1000)return;
  const group=freshWallets(data);
  if(!group.complete)return;
  const key=dateKey(new Date(start)),existing=nightSamples[key];
  const dist=Math.abs(t-start);
  if(existing&&Math.abs(existing.at-start)<=dist)return;
  nightSamples[key]={at:t,price:data.price>0?data.price:null,
    rewards:Object.fromEntries(group.validRows.map(w=>[w.address,w.rewards]))};
  const keys=Object.keys(nightSamples).sort();
  while(keys.length>8)delete nightSamples[keys.shift()];
  save(NIGHTS,nightSamples);
 }
 function estimateOvernight(group,start){
  if(!group.complete)return null;
  const snapshot=nightSamples[dateKey(new Date(start))];
  const elapsed=Math.max(0,(now()-start)/86400000);
  if(snapshot&&valid(snapshot.at)&&snapshot.at<=now()&&Math.abs(snapshot.at-start)<3*3600000){
    const values=group.validRows.map(w=>{
      const prior=snapshot.rewards?.[w.address];
      if(!valid(prior)||prior<0||w.rewards+1e-8<prior)return NaN;
      return w.rewards-prior;
    });
    if(values.length&&values.every(valid))return {value:values.reduce((a,b)=>a+b,0),kind:'delta',since:snapshot.at};
  }
  const values=group.validRows.map(w=>valid(w.staked)&&w.staked>=0&&valid(w.apr)&&w.apr>0
    ?w.staked*(w.apr/100)/365*elapsed:NaN);
  if(values.length&&values.every(valid))return {value:values.reduce((a,b)=>a+b,0),kind:'estimate',since:start};
  return null;
 }
 async function getNightHistory(start) {
  if(fetching||nightFor===start&&nightData)return;
  fetching=true;nightFor=start;
  try{
   const endpoint='https://api.binance.com/api/v3/klines?symbol=INJUSDT&interval=1h&startTime='+start+'&endTime='+now()+'&limit=24';
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
   let response;
   try{response=await fetch(endpoint,{cache:'no-store',signal:controller.signal});}
   finally{clearTimeout(timeout)}
   if(!response.ok)throw Error('Market history offline');
   const raw=await response.json();
   const rows=(Array.isArray(raw)?raw:[]).filter(row=>Number(row?.[1])>0&&Number(row?.[2])>0&&Number(row?.[3])>0);
   nightData=rows.length?{open:Number(rows[0][1]),high:Math.max(...rows.map(row=>Number(row[2]))),low:Math.min(...rows.map(row=>Number(row[3])))}:null;
  }catch(_){
   const local=nightSamples[dateKey(new Date(start))];
   nightData=valid(local?.price)&&local.price>0?{open:local.price,high:null,low:null}:null;
  }finally{fetching=false;render();}
 }
 function resetTexts(){
  set('morningBriefMenuTitle','Morning Brief');
  set('morningBriefMenuSubtitle',tr('Riepilogo notturno al risveglio','Overnight briefing when you wake up'));
  set('morningBriefTitle',tr('Buongiorno · INJ Brief','Good morning · INJ Brief'));
  set('morningBriefEnabledLabel',tr('Apri al mattino','Open in the morning'));
  set('morningBriefWakeLabel',tr('Dalle','From'));
  set('morningBriefRefresh',refreshing?tr('Sincronizzazione…','Syncing…'):tr('Aggiorna','Refresh'));
  set('morningBriefDone',tr('Chiudi','Close'));
  el('morningBriefClose')?.setAttribute('aria-label',tr('Chiudi riepilogo','Close briefing'));
  set('morningBriefNotify',typeof Notification==='undefined'?tr('Avviso non supportato','Alerts unsupported'):
   Notification.permission==='granted'?tr('Avvisi attivi','Alerts enabled'):tr('Attiva avviso','Enable alert'));
  if(el('morningBriefNotify'))el('morningBriefNotify').disabled=typeof Notification==='undefined'||Notification.permission==='denied';
 }
 function render(){
  resetTexts();
  if(root.hidden)return;
  const data=source()||{},start=nightStart();
  lastData=data;
  const stale=!data.priceAt||now()-Number(data.priceAt)>120000;
  const price=!stale&&data.price>0?Number(data.price):null;
  const performance=nightFor===start&&nightData&&price?100*(price/nightData.open-1):null;
  const min=nightFor===start?nightData?.low:null;
  const max=nightFor===start?nightData?.high:null;
  set('morningBriefTimestamp',tr('Dalle ','From ')+hhmm(start)+tr(' a ora · ',' to now · ')+hhmm(now()));
  set('morningBriefPriceLabel',tr('INJ / USDT · ','INJ / USDT · ')+(price?'LIVE':tr('IN ATTESA','WAITING')));
  set('morningBriefPrice',fmtPrice(price,data));
  const change=el('morningBriefChange');
  if(change)change.className='morning-brief-change '+gain(performance);
  set('morningBriefChange',valid(performance)?(performance>=0?'+':'')+num(performance,2)+'%':tr('Storico in attesa','Waiting for history'));
  set('morningBriefHighLabel',tr('Massimo dal riepilogo notturno','Highest since last night'));
  set('morningBriefLowLabel',tr('Minimo dal riepilogo notturno','Lowest since last night'));
  set('morningBriefHigh',fmtPrice(valid(max)&&price?Math.max(max,price):max,data));
  set('morningBriefLow',fmtPrice(valid(min)&&price?Math.min(min,price):min,data));
  const group=freshWallets(data);
  const reward=group.complete?group.validRows.reduce((sum,w)=>sum+w.rewards,0):null;
  const accrued=estimateOvernight(group,start);
  set('morningBriefRewardsLabel',tr('REWARD DISPONIBILI ORA · ','AVAILABLE REWARDS NOW · ')+group.validRows.length+'/'+group.wallets.length+tr(' WALLET',' WALLETS'));
  set('morningBriefRewards',fmtInj(reward));
  set('morningBriefRewardsValue',valid(reward)&&price?fmtPrice(reward*price,data):'—');
  const measured=accrued?.kind==='delta';
  set('morningBriefAccruedLabel',measured?tr('VARIAZIONE REWARD DALLE ','REWARD CHANGE SINCE ')+hhmm(accrued.since):
   tr('PRODUZIONE NOTTURNA · STIMA','OVERNIGHT PRODUCTION · ESTIMATE'));
  set('morningBriefAccrued',accrued?fmtInj(accrued.value):'—');
  set('morningBriefAccruedValue',accrued&&price?fmtPrice(accrued.value*price,data):'—');
  const headline=!valid(performance)?tr('Il mercato notturno è in sincronizzazione.','Overnight market data is syncing.'):
    performance>0.05?tr('INJ è salito durante la notte.','INJ moved higher overnight.'):
    performance< -0.05?tr('INJ è sceso durante la notte.','INJ moved lower overnight.'):
    tr('INJ è rimasto quasi stabile.','INJ was largely unchanged.');
  set('morningBriefHeadline',headline);
  set('morningBriefExplanation',!group.complete?
   tr('Attendo i dati aggiornati di tutti i wallet; non mostro totali parziali come completi.','Waiting for fresh data from every wallet; partial sums are not reported as totals.'):
   measured?tr('La variazione riguarda reward non prelevati: claim e reinvestimenti possono influire sul dato.','Change reflects unclaimed rewards: claims and restaking can affect the amount.'):
   accrued?tr('La produzione nella notte è una stima basata sugli APR salvati. Il totale reward è invece letto dalla blockchain.','Overnight production is estimated using saved APRs. Available rewards are read from the blockchain.'):
   tr('Reward disponibili verificati on-chain; stima notturna non disponibile senza APR validi.','Available rewards verified on-chain; overnight estimate unavailable without valid APRs.'));
 }
 function show(manual=false){
  if(!root.hidden)return;
  lastFocus=document.activeElement;
  root.hidden=false;
  root.classList.add('is-open');
  el('morningBriefWake').value=String(settings.wake);
  el('morningBriefEnabled').checked=settings.enabled!==false;
  document.querySelector('#menuCloseButton')?.click();
  render();
  getNightHistory(nightStart());
  setTimeout(()=>el('morningBriefClose')?.focus({preventScroll:true}),40);
  if(!manual){
   settings.shown=dateKey(new Date());save(STORE,settings);
   if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&!document.body.classList.contains('privacy-on')){
    const data=source(),price=data?.price>0&&now()-(data?.priceAt||0)<120000?fmtPrice(data.price,data):'—';
    const walletSet=freshWallets(data);
    const rewardText=walletSet.complete?fmtInj(walletSet.validRows.reduce((sum,w)=>sum+w.rewards,0)):'—';
    navigator.serviceWorker?.ready.then(reg=>reg.showNotification('INJ Morning Brief',{
     body:tr('INJ live: ','INJ live: ')+price+tr(' · Reward disponibili: ',' · Available rewards: ')+rewardText,
     tag:'inj-morning-'+settings.shown,icon:'./icons/inj-node-minimal-192-v16.06.29.png'
    })).catch(()=>{});
   }
  }
 }
 function hide(){
  if(root.hidden)return;
  root.classList.remove('is-open');root.hidden=true;
  try{lastFocus?.focus({preventScroll:true})}catch(_){}
 }
 async function refresh(){
  if(refreshing)return;
  refreshing=true;render();
  try{await window.INJ_MORNING_REFRESH?.();}catch(_){}
  refreshing=false;render();
  if(!root.hidden)getNightHistory(nightStart());
 }
 async function permissions(){
  if(typeof Notification==='undefined')return;
  try{await Notification.requestPermission();}catch(_){}
  render();
 }
 function pulse(){
  const data=source();
  if(!data)return;
  snapshotNight(data);
  if(!root.hidden){render();return;}
  if(settings.enabled===false||seenShow||document.hidden||data.view!=='home'||document.body.classList.contains('boot-loading'))return;
  const d=new Date(),hour=d.getHours(),min=d.getMinutes();
  if(hour<settings.wake||hour>=15)return;
  const today=dateKey(d);
  if(settings.shown===today)return;
  if(!onceOpening){onceOpening=true;setTimeout(()=>{onceOpening=false},900);}
  const info=freshWallets(data);
  if(!readyAttemptAt)readyAttemptAt=now();
  const ready=data.price>0&&data.priceAt&&now()-data.priceAt<=120000&&(!info.wallets.length||info.complete);
  // Offline and temporarily unavailable APIs must not silently swallow the brief.
  if(!ready&&now()-readyAttemptAt<25000)return;
  seenShow=true;
  show(false);
 }
 el('morningBriefMenuButton')?.addEventListener('click',()=>show(true));
 el('morningBriefClose')?.addEventListener('click',hide);
 el('morningBriefDone')?.addEventListener('click',hide);
 root.querySelector('[data-morning-close]')?.addEventListener('click',hide);
 el('morningBriefRefresh')?.addEventListener('click',refresh);
 el('morningBriefNotify')?.addEventListener('click',permissions);
 el('morningBriefEnabled')?.addEventListener('change',event=>{settings.enabled=event.target.checked;save(STORE,settings)});
 el('morningBriefWake')?.addEventListener('change',event=>{settings.wake=Number(event.target.value)||7;save(STORE,settings)});
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();hide()}
  if(e.key!=='Tab')return;
  const buttons=[...root.querySelectorAll('button:not([disabled]),select,input')];
  if(!buttons.length)return;
  if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus()}
 });
 el('morningBriefWake').value=String(settings.wake);
 el('morningBriefEnabled').checked=settings.enabled!==false;
 resetTexts();
 setTimeout(pulse,2000);
 setInterval(pulse,4000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(pulse,900)});
 window.addEventListener('pageshow',()=>setTimeout(pulse,600));
 window.addEventListener('injnode:languagechange',render);
})();
