'use strict';

const $ = (id) => document.getElementById(id);
const INJ_DECIMALS = 1e18;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const REWARD_REFRESH_MS = 1500;
const VELOCITY_PULSE_QUANTUM = 0.00001;
const reducedVelocityMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const REWARD_COMPARE_TOLERANCE = 2e-8;
const STATUS_REFRESH_MS = 15000;
const CLAIM_DROP_EPSILON = 1e-9;
const CLAIM_REBOUND_GUARD_MS = 45000;
const OFFICIAL_APR_ENDPOINT = 'https://api.ui.injective.network/api/v1/cache/stats/apr';
const LCD_ENDPOINTS = [
  'https://sentry.lcd.injective.network:443',
  'https://lcd.injective.network',
  'https://1rpc.io/inj-lcd'
];
const MANAGED_ADDRESSES = Object.freeze([
  'inj1cqvjau8tl4ge874crfaj6gkw55pnn6n2vmwdhv',
  'inj1ewp22h79mx9ln494nnx08laan4u2x7xyf37ceu',
  'inj19ue2rs8a8vr5q7fc7a52ee9kx8axt46wndhzv9',
  'inj1tgy6auqyps9uql9xpmnkwfd7gsf3hrkdx9cv3q',
  'inj1x2pste4f04pltkmaw6wzqflrgpgsu9x6gn3l9m'
]);
const LABELS_KEY = 'inj_node_treasury_wallet_labels_v1';
const SAVED_WALLETS_KEY = 'inj_monitor_wallets_v1';
const VALIDATOR_COMMISSION_CACHE_MS = 120000;
const validatorCommissionCache = new Map();

const state = {
  rows: MANAGED_ADDRESSES.map((address, index) => ({
    address, index, label:`Wallet ${index + 1}`,
    staked:0,
    apr:0,
    validatorCount:0,
    aprVerified:false,
    confirmedReward:0,
    displayedReward:0,
    displayFrom:0,
    displayTo:0,
    displayStartedAt:0,
    displayDuration:REWARD_REFRESH_MS-350,
    ratePerMs:0,
    lastNetworkReward:0,
    lastNetworkAt:0,
    online:false,
    synced:false,
    confidence:'sync',lastClaimAt:0,preClaimReward:0,
    velocityCarry:0,velocityLastPaintAt:0,velocityLastFlashAt:0
  })),
  apr: 0,
  price: 0,
  eurRate: 0.86,
  currency: 'USD',
  rewardLoading: false,
  statusLoading: false,
  lastSync: 0,
  lastStatusSync: 0,
  socket: null,
  reconnectTimer: 0,
  socketGeneration: 0,
  lastPriceAt: 0,
  editorAddress: ''
};

const number = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const fromWei = (value) => number(value) / INJ_DECIMALS;
const shortAddress = (address) => address ? `${address.slice(0,9)}…${address.slice(-7)}` : '—';
const lang = () => { try { return localStorage.getItem('inj_node_language_v1') === 'en' ? 'en' : 'it'; } catch (_) { return 'it'; } };
const copy = (it, en) => lang() === 'en' ? en : it;
function updateVelocityIntro(){
  const kicker=$('rewardsKicker');
  if(kicker)kicker.textContent=copy('5 WALLET GESTITI','5 MANAGED WALLETS');
  const intro=$('rewardVelocityIntro');
  if(intro)intro.textContent=copy(
    'I reward partono da un dato verificato on-chain e scorrono secondo staking e APR netto di ciascun wallet. Le scie Reward Velocity mostrano una velocità stimata, non transazioni della rete; toccale per i dettagli. Il saldo disponibile resta escluso.',
    'Rewards start from verified on-chain data and accrue at each wallet’s net validator APR. Reward Velocity trails visualize estimated accrual, not blockchain transfers. Tap a trail for details. Available balances are excluded.'
  );
}
const formatInj = (value, digits = 8) => number(value).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:true});
const formatRate = (value, digits = 6) => number(value).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:true});

function smartMoney(value,currency) {
  const valid=number(value);
  const abs=Math.abs(valid);
  const digits=abs===0?2:(abs>=1?2:(abs>=0.01?4:6));
  return valid.toLocaleString(lang()==='en'?'en-US':'it-IT',{style:'currency',currency,minimumFractionDigits:digits,maximumFractionDigits:digits});
}
function money(value) {
  const usd=Math.max(0,number(value));
  if(state.currency==='EUR'){
    const eur=usd*Math.max(0,number(state.eurRate)||0);
    return smartMoney(eur,'EUR');
  }
  return smartMoney(usd,'USD');
}
function fiatFromInj(inj){
  if(!(state.price>0))return '—';
  const usd=Math.max(0,number(inj))*state.price;
  return money(usd);
}
function updateHeaderPrice(){
  const node=$('rewardsHeaderPrice');
  if(!node||!(state.price>0))return;
  if(state.currency==='EUR'){
    const rate=Math.max(0,number(state.eurRate)||0);
    if(!(rate>0)){node.textContent='INJ —';return;}
    const eur=state.price*rate;
    node.textContent=`INJ €${eur.toFixed(eur<10?4:3)}`;
  }else{
    node.textContent=`INJ $${state.price.toFixed(state.price<10?4:3)}`;
  }
}
function formatStaked(value){
  return number(value).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:true});
}
function currentReward(row, now = Date.now()) {
  // Il primo dato mostrato e' SEMPRE l'ultimo reward verificato on-chain.
  // Tra due conferme il contatore continua a crescere senza pause usando
  // esclusivamente il ritmo teorico del wallet: INJ in staking × APR rete.
  if(!row.synced) return NaN;
  const anchor=Math.max(0,number(row.confirmedReward));
  const anchorAt=number(row.lastNetworkAt);
  const elapsed=anchorAt>0?Math.max(0,now-anchorAt):0;
  const rate=Math.max(0,number(row.ratePerMs));
  return Math.max(0,anchor + rate*elapsed);
}
function currentTotal() {
  const now=Date.now();
  return state.rows.reduce((sum,row)=>sum + currentReward(row,now),0);
}
function totalDailyRate() { return state.rows.reduce((sum,row)=>sum + Math.max(0,row.ratePerMs) * 86400000,0); }

function readLabels() {
  const matched = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_WALLETS_KEY) || '[]');
    for (const item of Array.isArray(saved)?saved:[]) {
      const address=String(item?.address||'').toLowerCase();
      const label=String(item?.label||'').trim();
      if(address&&label) matched.set(address,label.slice(0,28));
    }
  } catch (_) {}
  try {
    const custom = JSON.parse(localStorage.getItem(LABELS_KEY) || '{}');
    if(custom&&typeof custom==='object') for(const [address,label] of Object.entries(custom)) if(String(label||'').trim()) matched.set(address.toLowerCase(),String(label).trim().slice(0,28));
  } catch (_) {}
  state.rows.forEach((row,index)=>{row.label=matched.get(row.address) || `Wallet ${index+1}`;});
}
function saveLabel(address,label) {
  const clean=String(label||'').trim().slice(0,28);
  if(!clean)return;
  try {
    const map=JSON.parse(localStorage.getItem(LABELS_KEY)||'{}');
    map[address]=clean;
    localStorage.setItem(LABELS_KEY,JSON.stringify(map));
  } catch (_) {}
  try {
    const saved=JSON.parse(localStorage.getItem(SAVED_WALLETS_KEY)||'[]');
    if(Array.isArray(saved)){
      const wallet=saved.find((item)=>String(item?.address||'').toLowerCase()===address);
      if(wallet){wallet.label=clean;localStorage.setItem(SAVED_WALLETS_KEY,JSON.stringify(saved));}
    }
  } catch (_) {}
  const row=state.rows.find((item)=>item.address===address);if(row)row.label=clean;
  renderRows();
}


/* Reward Velocity is visual-only: the source of truth remains confirmedReward,
   and the between-sync accrual estimate remains based on staked INJ × net APR.
   Every wallet has its own pace; the labels are relative to these five wallets. */
let expandedVelocityAddress='';
function velocityActive(row){return Boolean(row.aprVerified && row.staked>0 && row.ratePerMs>0)}
function velocityPeriod(row){
  const highest=Math.max(...state.rows.map(r=>velocityActive(r)?r.ratePerMs:0),0);
  if(!velocityActive(row)||highest<=0)return 0;
  const ratio=Math.max(0.00001,Math.min(1,row.ratePerMs/highest));
  return Math.max(2.4,Math.min(12,2.4/Math.sqrt(ratio)));
}
function velocityLevel(row){
  if(!velocityActive(row))return copy('IN ATTESA','WAITING');
  const highest=Math.max(...state.rows.map(r=>velocityActive(r)?r.ratePerMs:0),0);
  const ratio=highest>0?row.ratePerMs/highest:0;
  if(ratio>=.65)return copy('ALTA','HIGH');
  if(ratio>=.23)return copy('MEDIA','MEDIUM');
  return copy('BASSA','LOW');
}
function velocityEta(ms){
  if(!(ms>0)||!Number.isFinite(ms))return '—';
  const seconds=Math.max(1,Math.ceil(ms/1000));
  const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),
        m=Math.floor(seconds%3600/60),s=seconds%60;
  if(d)return copy(`${d} g ${h} h`,`${d}d ${h}h`);
  if(h)return copy(`${h} h ${m} min`,`${h}h ${m}m`);
  if(m)return copy(`${m} min ${s} s`,`${m}m ${s}s`);
  return `${s} s`;
}
function updateVelocityDetails(node,row){
  const widget=node.querySelector('.reward-velocity');
  if(!widget)return;
  const active=velocityActive(row);
  widget.classList.toggle('velocity-idle',!active);
  widget.style.setProperty('--velocity-duration', active?`${velocityPeriod(row).toFixed(2)}s`:'12s');
  widget.style.setProperty('--velocity-phase',`-${(row.index*.87).toFixed(2)}s`);
  const set=(selector,value)=>{const el=widget.querySelector(selector);if(el && el.textContent!==value)el.textContent=value;};
  set('[data-velocity-title]',copy('REWARD VELOCITY · STIMA','REWARD VELOCITY · ESTIMATE'));
  set('[data-velocity-level]',active?velocityLevel(row):row.aprVerified&&row.staked===0?copy('NESSUNO STAKING','NO STAKING'):copy('IN ATTESA','WAITING'));
  set('[data-velocity-rate]',active?`${formatRate(row.ratePerMs*3600000,6)} INJ/${copy('ora','hour')}`:copy('Ritmo non disponibile','Rate unavailable'));
  set('[data-velocity-hint]',expandedVelocityAddress===row.address?copy('RIDUCI','CLOSE'):copy('DETTAGLI','DETAILS'));
  set('[data-velocity-estimate]',active?
    copy(`+0,001 INJ stimati in ${velocityEta(.001/row.ratePerMs)}`,`+0.001 INJ estimated in ${velocityEta(.001/row.ratePerMs)}`):
    copy('Produzione non ancora calcolabile','Production not available'));
  set('[data-velocity-sample]',row.synced&&row.lastNetworkAt>0?
    copy(`Ultima verifica on-chain · ${new Date(row.lastNetworkAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`,`Last on-chain verification · ${new Date(row.lastNetworkAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`):
    copy('In attesa del primo dato on-chain','Awaiting first on-chain sample'));
  const expanded=expandedVelocityAddress===row.address;
  const control=widget.querySelector('[data-velocity-toggle]');
  if(control){
    control.setAttribute('aria-expanded',String(expanded));
    control.setAttribute('aria-label',expanded?
      copy(`Riduci i dettagli della produzione di ${row.label}`,`Hide production details for ${row.label}`):
      copy(`Mostra dettagli della produzione di ${row.label}`,`Show production details for ${row.label}`));
  }
  const detail=widget.querySelector('.reward-velocity-detail');
  if(detail)detail.hidden=!expanded;
  node.classList.toggle('velocity-expanded',expanded);
}
function toggleVelocity(address){
  expandedVelocityAddress=expandedVelocityAddress===address?'':address;
  document.querySelectorAll('.reward-row').forEach(node=>{
    const row=state.rows.find(row=>row.address===node.dataset.address);
    if(row)updateVelocityDetails(node,row);
  });
}
function tickVelocityPulse(node,row,now){
  const elapsed=row.velocityLastPaintAt>0?now-row.velocityLastPaintAt:0;
  row.velocityLastPaintAt=now;
  if(!velocityActive(row)||!row.synced){
    row.velocityCarry=0;return;
  }
  // Skip large gaps: backgrounding a PWA must never create a burst on resume.
  if(elapsed<=0||elapsed>2500)return;
  row.velocityCarry+=elapsed*row.ratePerMs;
  if(row.velocityCarry<VELOCITY_PULSE_QUANTUM)return;
  row.velocityCarry%=VELOCITY_PULSE_QUANTUM;
  // Desktop keeps the live values but does not animate repeated bright beacons.
   if((matchMedia('(min-width:1000px) and (hover:hover) and (pointer:fine)').matches)||reducedVelocityMotion.matches||now-row.velocityLastFlashAt<400)return;
  const beacon=node?.querySelector('[data-velocity-beacon]');
  if(!beacon||typeof beacon.animate!=='function')return;
  beacon.animate([
    {opacity:.18,transform:'translateY(-50%) scale(.7)'},
    {opacity:1,transform:'translateY(-50%) scale(1.95)',offset:.28},
    {opacity:0,transform:'translateY(-50%) scale(2.7)'}
  ],{duration:650,easing:'ease-out',iterations:1});
  row.velocityLastFlashAt=now;
}

function renderRows() {
  const host=$('rewardsList');if(!host)return;
  const existing=new Map(Array.from(host.children).map((node)=>[node.dataset.address,node]));
  state.rows.forEach((row,index)=>{
    let node=existing.get(row.address);
    if(!node){
      node=document.createElement('article');node.className='reward-row';node.dataset.address=row.address;
      node.innerHTML=`
        <div class="reward-wallet">
          <div class="reward-wallet-index">${String(index+1).padStart(2,'0')}</div>
          <div class="reward-wallet-copy"><strong data-wallet-name></strong><small>${shortAddress(row.address)}</small></div>
          <button class="reward-edit" type="button" aria-label="Rinomina wallet" title="Rinomina wallet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg></button>
        </div>
        <div class="reward-card-content">
          <div class="reward-card-livehead"><span>REWARD LIVE</span><span class="row-live"><i></i><b>LIVE</b></span></div>
          <div class="reward-live-number">
            <strong data-reward>—</strong>
            <div class="reward-fiat-pair" data-fiat>—</div>
          </div>
          <div class="reward-velocity" data-velocity-index="${index}">
            <button class="reward-velocity-toggle" type="button" data-velocity-toggle aria-expanded="false" aria-controls="rewardVelocityDetail-${index}">
              <span class="reward-velocity-heading"><span data-velocity-title>REWARD VELOCITY · STIMA</span><b data-velocity-level>IN ATTESA</b></span>
              <span class="reward-velocity-track" aria-hidden="true">
                <span class="reward-velocity-travel"><i></i><b></b></span>
                <span class="reward-velocity-beacon" data-velocity-beacon></span>
              </span>
              <span class="reward-velocity-summary"><span data-velocity-rate>—</span><small data-velocity-hint>DETTAGLI</small></span>
            </button>
            <div class="reward-velocity-detail" id="rewardVelocityDetail-${index}" hidden>
              <span data-velocity-estimate>—</span>
              <span data-velocity-sample>—</span>
            </div>
          </div>
        </div>
        <div class="reward-card-stats">
          <div><span>24H</span><strong data-rate>—</strong></div>
          <div><span>STAKING</span><strong data-staked>—</strong></div>
          <div><span>APR</span><strong data-apr>—</strong></div>
        </div>`;
      node.querySelector('.reward-edit')?.addEventListener('click',()=>openEditor(row.address));
       node.querySelector('[data-velocity-toggle]')?.addEventListener('click',()=>toggleVelocity(row.address));
      host.appendChild(node);
    }
    existing.delete(row.address);
    node.classList.toggle('offline',!row.online);
    const name=node.querySelector('[data-wallet-name]');if(name)name.textContent=row.label;
    const rate=node.querySelector('[data-rate]');if(rate)rate.textContent=`${formatRate(row.ratePerMs*86400000,6)} INJ`;
    const staked=node.querySelector('[data-staked]');if(staked)staked.textContent=row.staked>0?`${formatStaked(row.staked)} INJ`:'—';
    const apr=node.querySelector('[data-apr]');if(apr)apr.textContent=row.apr>0?`${row.apr.toFixed(3)}%`:'—';
    const live=node.querySelector('.row-live b');if(live)live.textContent=row.synced?(row.confidence==='hold'?copy('VERIFICA','VERIFY'):'ON-CHAIN'):copy('SYNC','SYNC');
     updateVelocityDetails(node,row);
  });
  existing.forEach((node)=>node.remove());
}
function retainLiveDirection(element, previous, next) {
  if (!element) return;
  const reset = () => {
    delete element.dataset.liveDirection;
    element.style.removeProperty('color');
    element.classList.remove('value-change-up','value-change-down','entry-value-up','entry-value-down','focus-value-up','focus-value-down');
  };
  if (!Number.isFinite(next) || !Number.isFinite(previous)) {
    clearTimeout(element._directionTimer);element._directionTimer=null;
    element._directionCooldown=0;reset();return;
  }
  if (Math.abs(next-previous)<=Math.max(1e-12,Math.abs(previous)*1e-10)) return;
  if (Date.now() < (element._directionCooldown || 0)) { reset();return; }
  const direction=next>previous?'up':'down';
  element.dataset.liveDirection=direction;
  element.style.setProperty('color',`var(--${direction})`,'important');
  // A burst has a fixed end: frequent ticks cannot keep it colored indefinitely.
  if (!element._directionTimer) element._directionTimer=setTimeout(()=>{
    element._directionTimer=null;element._directionCooldown=Date.now()+180;reset();
  },650);
}

function setRewardLiveText(element, text, value) {
  if (!element) return;
  // v15.99.118: Live Rewards stays visually calm. The live line/dot carries
  // the motion; numeric values no longer flash green/red on every accrual tick.
  if (element.textContent !== text) element.textContent = text;
  clearTimeout(element._directionTimer);
  element._directionTimer = null;
  element._directionCooldown = 0;
  delete element.dataset.liveDirection;
  element.style.removeProperty('color');
  element.classList.remove('value-change-up','value-change-down','entry-value-up','entry-value-down','focus-value-up','focus-value-down');
  element._rewardNumeric=value;
}
let lastFramePaint = 0;
function renderFrame(frameNow = 0) {
  requestAnimationFrame(renderFrame);
  if (frameNow - lastFramePaint < 50) return;
  lastFramePaint = frameNow;
  const wallNow=Date.now();
  let total=0;
  let syncedCount=0;
  state.rows.forEach((row)=>{
    const value=currentReward(row,wallNow);
    const node=document.querySelector(`.reward-row[data-address="${row.address}"]`);
    const target=node?.querySelector('[data-reward]');
    const fiat=node?.querySelector('[data-fiat]');
     tickVelocityPulse(node,row,wallNow);
    if(Number.isFinite(value)){
      total+=value; syncedCount++;
      setRewardLiveText(target,`${formatInj(value,8)} INJ`,value);
      setRewardLiveText(fiat,fiatFromInj(value),value*state.price);
    }else{
      setRewardLiveText(target,'—',NaN);
      setRewardLiveText(fiat,'—',NaN);
    }
  });
  setRewardLiveText($('rewardsTotal'),syncedCount?formatInj(total,8):'—',syncedCount?total:NaN);
  setRewardLiveText($('rewardsTotalFiat'),syncedCount?fiatFromInj(total):'—',syncedCount?total*state.price:NaN);
  if($('rewardsTotalDay'))$('rewardsTotalDay').textContent=`${formatRate(totalDailyRate(),6)} INJ`;
  const totalStaked=state.rows.reduce((sum,row)=>sum+Math.max(0,number(row.staked)),0);
  if($('rewardsTotalStaked'))$('rewardsTotalStaked').textContent=totalStaked>0?`${formatStaked(totalStaked)} INJ`:'—';
  const weightedAprNumerator=state.rows.reduce((sum,row)=>sum + Math.max(0,number(row.staked))*Math.max(0,number(row.apr)),0);
  const weightedApr=totalStaked>0?weightedAprNumerator/totalStaked:0;
  if($('rewardsApr'))$('rewardsApr').textContent=weightedApr>0?`${weightedApr.toFixed(3)}%`:'—';
}
async function fetchJson(url,timeout=7000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}finally{clearTimeout(timer)}}
async function lcd(path){let lastError;for(const base of LCD_ENDPOINTS){try{return await fetchJson(base+path)}catch(error){lastError=error}}throw lastError||new Error('Injective unavailable')}
function delegationTotal(data){return (data?.delegation_responses||[]).reduce((sum,row)=>sum+fromWei(row?.balance?.amount),0)}
function rewardTotal(data){return (data?.total||[]).filter((coin)=>coin?.denom==='inj').reduce((sum,coin)=>sum+fromWei(coin.amount),0)}
function aprPercent(value){const n=number(value);if(n<=0)return 0;return n<=1?n*100:n}
async function loadApr(){try{const data=await fetchJson(OFFICIAL_APR_ENDPOINT,7000);return aprPercent(data?.apr)}catch(_){return state.apr}}
async function rewardFromEndpoint(base,address){
  const path=`/cosmos/distribution/v1beta1/delegators/${address}/rewards`;
  const data=await fetchJson(base+path,6500);
  const value=rewardTotal(data);
  if(!Number.isFinite(value)||value<0)throw new Error('Invalid reward');
  return value;
}
function rewardTolerance(row,a,b){
  const elapsed=Math.max(REWARD_REFRESH_MS, Date.now()-(row.lastNetworkAt||Date.now()));
  const modelDrift=Math.max(0,row.ratePerMs)*elapsed*4;
  const magnitude=Math.max(Math.abs(a),Math.abs(b));
  return Math.max(REWARD_COMPARE_TOLERANCE,modelDrift,magnitude*1e-8);
}
function closestPairMedian(values){
  const sorted=[...values].sort((a,b)=>a-b);
  if(sorted.length<3)return sorted[sorted.length-1];
  const d01=Math.abs(sorted[1]-sorted[0]);
  const d12=Math.abs(sorted[2]-sorted[1]);
  // Se due nodi sono chiaramente più vicini tra loro, usa la loro media;
  // altrimenti la mediana evita sia spike che letture stale estreme.
  if(d01<d12*.45)return (sorted[0]+sorted[1])/2;
  if(d12<d01*.45)return (sorted[1]+sorted[2])/2;
  return sorted[1];
}
async function loadPendingRewardConfirmed(address,row){
  const path=`/cosmos/distribution/v1beta1/delegators/${address}/rewards`;
  const requests=LCD_ENDPOINTS.filter(Boolean).map(base=>({base,promise:fetchJson(base+path,4500).then(data=>{
    const value=rewardTotal(data);
    if(!Number.isFinite(value)||value<0)throw new Error('Reward on-chain non valido');
    return value;
  })}));
  // Tre LCD letti in parallelo. Un claim richiede due nodi diversi che
  // convergono sul nuovo valore, anche se il PRIMO a rispondere è stale.
  const first=await Promise.any(requests.map(x=>x.promise));
  if(!row.synced)return {address,rewards:first,confidence:'verified'};
  const previous=row.confirmedReward;
  const tolerance=rewardTolerance(row,first,previous);
  const recentClaim=row.lastClaimAt&&Date.now()-row.lastClaimAt<CLAIM_REBOUND_GUARD_MS;
  const staleBounce=recentClaim&&row.preClaimReward>previous+CLAIM_DROP_EPSILON&&first>=row.preClaimReward-tolerance;
  const isSuspectedDrop=first<previous-tolerance;
  const pairs=[];
  for(let i=0;i<requests.length;i++)for(let j=i+1;j<requests.length;j++){
    pairs.push(Promise.all([requests[i].promise,requests[j].promise]).then(([left,right])=>{
      if(left<previous-CLAIM_DROP_EPSILON&&right<previous-CLAIM_DROP_EPSILON&&
         Math.abs(left-right)<=rewardTolerance(row,left,right))return Math.max(left,right);
      throw new Error('LCD non concordi');
    }));
  }
  const consensus=Promise.any(pairs).catch(()=>null);
  // Per gli incrementi normali non attendiamo il nodo lento, ma offriamo un
  // breve intervallo agli altri LCD per smentire una lettura pre-claim arretrata.
  const waitMs=isSuspectedDrop?4500:(staleBounce?1250:650);
  const confirmedDrop=await Promise.race([consensus,new Promise(resolve=>setTimeout(()=>resolve(null),waitMs))]);
  if(confirmedDrop!==null)return {address,rewards:confirmedDrop,confidence:'double'};
  if(isSuspectedDrop||staleBounce)return {address,rewards:previous,confidence:'hold'};
  return {address,rewards:first,confidence:'verified'};
}

function commissionPercentFromValidator(data){
  const raw=number(data?.validator?.commission?.commission_rates?.rate);
  if(!Number.isFinite(raw)||raw<0)return NaN;
  // Cosmos SDK espone la commissione come decimale: 0.10 = 10%.
  return Math.min(100, raw<=1 ? raw*100 : raw);
}
async function validatorCommissionPercent(validatorAddress){
  const cached=validatorCommissionCache.get(validatorAddress);
  const now=Date.now();
  if(cached&&now-cached.at<VALIDATOR_COMMISSION_CACHE_MS)return cached.value;
  const data=await lcd(`/cosmos/staking/v1beta1/validators/${validatorAddress}`);
  const value=commissionPercentFromValidator(data);
  if(!Number.isFinite(value))throw new Error('Validator commission unavailable');
  validatorCommissionCache.set(validatorAddress,{value,at:now});
  return value;
}
async function loadDelegation(address,networkApr){
  const data=await lcd(`/cosmos/staking/v1beta1/delegations/${address}`);
  const delegations=Array.isArray(data?.delegation_responses)?data.delegation_responses:[];
  const rows=delegations.map((entry)=>({
    validator:String(entry?.delegation?.validator_address||''),
    amount:fromWei(entry?.balance?.amount)
  })).filter((entry)=>entry.validator&&entry.amount>0);
  const staked=rows.reduce((sum,entry)=>sum+entry.amount,0);
  if(!(staked>0))return {address,staked:0,apr:0,validatorCount:0,aprVerified:true};

  const details=await Promise.all(rows.map(async(entry)=>{
    const commission=await validatorCommissionPercent(entry.validator);
    const effectiveApr=Math.max(0,number(networkApr)) * Math.max(0,1-commission/100);
    return {...entry,commission,effectiveApr};
  }));
  const weightedApr=details.reduce((sum,entry)=>sum+entry.amount*entry.effectiveApr,0)/staked;
  return {address,staked,apr:weightedApr,validatorCount:details.length,aprVerified:true};
}

/*
  Questa pagina legge SOLO i reward staking pendenti dal modulo distribution.
  Il saldo INJ disponibile/spendibile del wallet non viene mai interrogato né sommato.
*/
async function syncRewardFlow(force=false){
  if(state.rewardLoading)return;
  if(!force&&state.lastSync&&Date.now()-state.lastSync<REWARD_REFRESH_MS-700)return;
  state.rewardLoading=true;
  $('rewardsLiveBadge')?.classList.add('sync');
  $('rewardsLiveBadge')?.classList.remove('error');
  let liveCount=0;
  try{
    // Ogni wallet viene applicato appena la sua lettura on-chain risponde.
    // Non aspettiamo il wallet più lento per mostrare quelli già verificati.
    await Promise.all(state.rows.map(async(row)=>{
      try{
        const entry=await loadPendingRewardConfirmed(row.address,row);
        const now=Date.now();
        const networkReward=Math.max(0,number(entry.rewards));
        const previous=row.confirmedReward;
        const verified=entry.confidence!=='hold';
        const claimDetected=verified&&row.synced&&networkReward+CLAIM_DROP_EPSILON<previous;
        if(verified){
          if(claimDetected){row.lastClaimAt=now;row.preClaimReward=previous;}
          row.confirmedReward=networkReward;
          row.lastNetworkReward=networkReward;
          row.lastNetworkAt=now;
          row.displayedReward=networkReward;
          row.online=true;
          row.synced=true;
        }
        row.confidence=entry.confidence||'verified';
        if(verified)liveCount++;
        if(verified)state.lastSync=now;
        if(verified&&$('rewardsUpdated'))$('rewardsUpdated').textContent=`${copy('Dato on-chain verificato','Verified on-chain')} · ${new Date(now).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
        if($('rewardsWalletStatus'))$('rewardsWalletStatus').textContent=`${state.rows.filter(r=>r.synced).length}/5 LIVE`;
        $('rewardsLiveBadge')?.classList.remove('sync','error');
        renderRows();
      }catch(_){
        // Non sostituire mai un dato valido con una lettura dubbia.
        row.online=row.synced;
        row.confidence='hold';
      }
    }));

    if(!liveCount && !state.rows.some(row=>row.synced))throw new Error('No wallets live');
    state.lastSync=state.lastSync||Date.now();
    if(state.rows.some(row=>row.synced)){
      $('rewardsLiveBadge')?.classList.remove('sync','error');
      if($('rewardsWalletStatus'))$('rewardsWalletStatus').textContent=`${state.rows.filter(r=>r.synced).length}/5 LIVE`;
    }
    renderRows();
  }catch(_){
    $('rewardsLiveBadge')?.classList.remove('sync');
    $('rewardsLiveBadge')?.classList.add('error');
    if($('rewardsUpdated'))$('rewardsUpdated').textContent=copy('In attesa di conferma on-chain','Waiting for on-chain confirmation');
    renderRows();
  }finally{
    state.rewardLoading=false;
  }
}

async function syncStatus(force=false){
  if(state.statusLoading)return;
  if(!force&&state.lastStatusSync&&Date.now()-state.lastStatusSync<STATUS_REFRESH_MS-1500)return;
  state.statusLoading=true;
  try{
    const apr=await loadApr();
    if(apr>0)state.apr=apr;
    const effectiveNetworkApr=state.apr;
    const settled=await Promise.all(
      MANAGED_ADDRESSES.map((address)=>
        loadDelegation(address,effectiveNetworkApr)
          .then((value)=>({ok:true,value}))
          .catch(()=>({ok:false,address}))
      )
    );
    settled.forEach((entry)=>{
      if(!entry.ok)return;
      const row=state.rows.find((item)=>item.address===entry.value.address);
      if(!row)return;
      row.staked=Math.max(0,number(entry.value.staked));
      row.apr=Math.max(0,number(entry.value.apr));
      row.validatorCount=Math.max(0,number(entry.value.validatorCount));
      row.aprVerified=Boolean(entry.value.aprVerified);
      const modelRate=row.staked*Math.max(0,row.apr)/100/YEAR_MS;
      // Ogni wallet scorre al SUO APR effettivo, ponderato sui validator
      // a cui e' realmente delegato. Il saldo disponibile resta escluso.
      row.ratePerMs=modelRate>0?modelRate:0;
    });
    state.lastStatusSync=Date.now();
    renderRows();
  }finally{
    state.statusLoading=false;
  }
}

async function loadPrice(){try{const ticker=await fetchJson('https://api.binance.com/api/v3/ticker/price?symbol=INJUSDT',6000);const price=number(ticker?.price);if(price>0){state.price=price;state.lastPriceAt=Date.now();updateHeaderPrice();}}catch(_){}}
async function loadEurRate(){try{const cached=number(localStorage.getItem('inj_monitor_eur_rate'));if(cached>0){state.eurRate=cached;updateHeaderPrice();}const data=await fetchJson('https://api.frankfurter.app/latest?from=USD&to=EUR',6000);const next=number(data?.rates?.EUR);if(next>0){state.eurRate=next;localStorage.setItem('inj_monitor_eur_rate',String(next));updateHeaderPrice();renderRows();}}catch(_){}}
function schedulePriceReconnect(delay=1100){
  clearTimeout(state.reconnectTimer);
  if(navigator.onLine===false)return;
  state.reconnectTimer=setTimeout(()=>{state.reconnectTimer=0;connectPriceSocket(false)},delay);
}
function connectPriceSocket(force=false){
  if(navigator.onLine===false)return;
  const current=state.socket;
  if(!force&&current&&(current.readyState===WebSocket.OPEN||current.readyState===WebSocket.CONNECTING))return;
  clearTimeout(state.reconnectTimer);state.reconnectTimer=0;
  if(current){current.onmessage=current.onclose=current.onerror=current.onopen=null;try{current.close()}catch(_){}}
  const generation=++state.socketGeneration;
  try{
    const socket=new WebSocket('wss://stream.binance.com:9443/ws/injusdt@trade');state.socket=socket;
    socket.addEventListener('message',(event)=>{if(state.socket!==socket||generation!==state.socketGeneration)return;try{const tick=JSON.parse(event.data);const price=number(tick?.p);if(price>0){state.price=price;state.lastPriceAt=Date.now();updateHeaderPrice();}}catch(_){}});
    socket.addEventListener('close',()=>{if(state.socket!==socket||generation!==state.socketGeneration)return;state.socket=null;if(navigator.onLine!==false)schedulePriceReconnect(1100)});
    socket.addEventListener('error',()=>{if(state.socket===socket)try{socket.close()}catch(_){}});
  }catch(_){if(generation===state.socketGeneration)schedulePriceReconnect(1400)}
}
function maintainPriceRealtime(){
  if(navigator.onLine===false)return;
  const socket=state.socket,open=socket&&socket.readyState===WebSocket.OPEN,connecting=socket&&socket.readyState===WebSocket.CONNECTING;
  const age=state.lastPriceAt?Date.now()-state.lastPriceAt:Infinity;
  if(!open&&!connecting)connectPriceSocket(false);
  if(age>8000)void loadPrice();
  if(open&&age>15000)connectPriceSocket(true);
}
function resumeLiveRewardData(force=false){
  if(navigator.onLine===false)return;
  readLabels();renderRows();connectPriceSocket(false);void loadPrice();void syncRewardFlow(true);void syncStatus(force);
}


function openEditor(address){const row=state.rows.find((item)=>item.address===address);if(!row)return;state.editorAddress=address;$('rewardEditorAddress').textContent=shortAddress(address);$('rewardEditorInput').value=row.label.startsWith('Wallet ')?'':row.label;$('rewardEditor').hidden=false;$('rewardEditor').setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';setTimeout(()=>{$('rewardEditorInput')?.focus();$('rewardEditorInput')?.select()},40)}
function closeEditor(){state.editorAddress='';$('rewardEditor').hidden=true;$('rewardEditor').setAttribute('aria-hidden','true');document.documentElement.style.overflow=''}
function bindEditor(){$('rewardEditorForm')?.addEventListener('submit',(event)=>{event.preventDefault();const value=$('rewardEditorInput')?.value.trim();if(value&&state.editorAddress)saveLabel(state.editorAddress,value);closeEditor()});document.querySelectorAll('[data-editor-close]').forEach((node)=>node.addEventListener('click',closeEditor));document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!$('rewardEditor')?.hidden)closeEditor()})}
function bindHomeReturn(){const close=$('rewardsClose');if(!close)return;close.addEventListener('click',(event)=>{event.preventDefault();try{sessionStorage.setItem('inj_node_return_home','1')}catch(_){}let canBack=false;try{const ref=document.referrer?new URL(document.referrer):null;canBack=Boolean(ref&&ref.origin===location.origin&&(ref.pathname.endsWith('/index.html')||ref.pathname.endsWith('/'))&&history.length>1)}catch(_){}if(canBack)history.back();else location.replace('./index.html')})}

let rewardRunwayTimer=null;
function startRewardRunway(){
  clearInterval(rewardRunwayTimer);
  let step=0;
  const tick=()=>{
    document.querySelectorAll('.reward-flow-total.reward-runway-live').forEach(flow=>{
      const dots=flow.querySelectorAll(':scope > i');
      dots.forEach((dot,index)=>dot.classList.toggle('runway-active',index===step));
    });
    step=(step+1)%6;
  };
  tick();
  rewardRunwayTimer=setInterval(tick,270);
}

function boot(){
  try{state.currency=localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD'}catch(_){}
  readLabels();updateVelocityIntro();renderRows();bindEditor();bindHomeReturn();startRewardRunway();requestAnimationFrame(renderFrame);
  // Prima otteniamo staking + APR specifico dei validator, poi il reward verificato. In questo modo
  // il PRIMO numero mostrato e' gia' esatto e parte subito alla velocita' corretta.
  // Reward e staking partono in parallelo: un LCD/validator lento non può bloccare Live Reward.
  void Promise.allSettled([loadPrice(),loadEurRate(),syncStatus(true)]);
  void syncRewardFlow(true);
  connectPriceSocket();
  setInterval(()=>{if(!document.hidden)void syncRewardFlow(false)},REWARD_REFRESH_MS);
  setInterval(()=>{if(!document.hidden)void syncStatus(false)},STATUS_REFRESH_MS);
  setInterval(()=>{if(!document.hidden)maintainPriceRealtime()},2500);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeLiveRewardData(true)});
  window.addEventListener('online',()=>resumeLiveRewardData(true));
  window.addEventListener('focus',()=>{if(!document.hidden)resumeLiveRewardData(false)},{passive:true});
  window.addEventListener('pageshow',()=>{if(!document.hidden)resumeLiveRewardData(false)});
  window.addEventListener('storage',(event)=>{if([LABELS_KEY,SAVED_WALLETS_KEY,'inj_monitor_currency','inj_node_language_v1'].includes(event.key)){if(event.key==='inj_monitor_currency'){state.currency=localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD';updateHeaderPrice();}readLabels();updateVelocityIntro();renderRows();}});
  window.addEventListener('injnode:languagechange',()=>{updateVelocityIntro();renderRows();if(state.lastSync&&$('rewardsUpdated'))$('rewardsUpdated').textContent=`${copy('Aggiornato','Updated')} ${new Date(state.lastSync).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
