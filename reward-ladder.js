(() => {
  'use strict';
  const GOALS = [0.5, 1, 3, 5, 10, 15, 20, 30, 50];
  const WALLETS_KEY = 'inj_monitor_wallets_v1';
  const SUMMARIES_KEY = 'inj_monitor_summaries_v1';
  const SELECTED_KEY = 'inj_node_comparison_selected_wallet_v1';
  const LANGUAGE_KEY = 'inj_node_language_v1';
  const YEAR_SECONDS = 365.25 * 86400;
  const NETWORK_INTERVAL = 30000;
  const PRICE_INTERVAL = 25000;
  const MAX_ESTIMATE_AGE = 60000;
  const LCDS = ['https://sentry.lcd.injective.network:443', 'https://lcd.injective.network', 'https://1rpc.io/inj-lcd'];
  const $ = (id) => document.getElementById(id);
  const validAddress = (a) => /^inj1[a-z0-9]{38,60}$/i.test(String(a || ''));
  const finite = (n) => n !== '' && n !== null && n !== undefined && Number.isFinite(Number(n)) ? Number(n) : null;
  const positive = (v) => finite(v) !== null && Number(v) > 0;
  const t = (it, en) => localStorage.getItem(LANGUAGE_KEY) === 'en' ? en : it;
  const lang = () => localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en-US' : 'it-IT';
  const format = (n, digits = 2) => Number(n).toLocaleString(lang(), {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const usd = (n, digits = 2) => n === null ? '$—' : '$' + format(n, digits);
  const inj = (n, digits = 5) => n === null ? '— INJ' : format(n, digits) + ' INJ';
  const when = (ms) => ms ? new Date(ms).toLocaleTimeString(lang(), {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
  const set = (node, value) => {if (node && node.textContent !== value) node.textContent = value;};
  const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;} catch (_) {return fallback;}};
  const state = {
    wallets: [], rows: {}, selected: '', mode: 'single',
    price: null, priceAt: 0, priceSource: '',
    syncing: false, networkAt: 0, priceFetching: false, ws: null,
    reconnectTimer: 0, timer: 0, walletTimer: 0, priceTimer: 0, lastDraw: 0,
    officialApr: null, aprAt: 0,
    visible: !document.hidden
  };
  const stepEls = [];

  function loadWallets() {
    const raw = read(WALLETS_KEY, []);
    const fromStorage = Array.isArray(raw) ? raw : [];
    const mapped = fromStorage.map((item, i) => ({
      address: String(item?.address || '').trim().toLowerCase(),
      label: String(item?.label || ('Wallet ' + (i+1))).trim().slice(0, 32)
    })).filter((row, i, arr) => validAddress(row.address) && arr.findIndex(x => x.address === row.address) === i);
    const legacy = String(localStorage.getItem('inj_monitor_address') || '').trim().toLowerCase();
    if (validAddress(legacy) && !mapped.some(x => x.address === legacy)) mapped.push({address:legacy,label:'Wallet ' + (mapped.length+1)});
    state.wallets = mapped;
    const wanted = localStorage.getItem(SELECTED_KEY) || legacy;
    state.selected = mapped.find(x=>x.address===wanted)?.address || mapped[0]?.address || '';
    const cached = read(SUMMARIES_KEY, {});
    state.wallets.forEach((wallet)=>{
      const row = cached?.[wallet.address] || {};
      const age = Date.now() - (finite(row.updated) || 0);
      const reward = age < 30 * 60_000 ? finite(row.rewards) : null;
      const stake = age < 30 * 60_000 ? finite(row.staked) : null;
      const storedApr = finite(row.personalApr);
      const commission = finite(row.weightedCommission);
      state.rows[wallet.address] = {
        address: wallet.address, reward: reward !== null && reward >= 0 ? reward : null,
        stake: stake !== null && stake >= 0 ? stake : null,
        apr: storedApr !== null && storedApr > 0 && storedApr <= 100 ? storedApr : null,
        commission: commission !== null && commission >= 0 && commission <= 1 ? commission : null,
        at: reward !== null && reward >= 0 ? finite(row.updated) || 0 : 0,
        verified: false, cachedAt: finite(row.updated) || 0
      };
    });
  }
  function activeAddresses() {
    if (state.mode === 'all') return state.wallets.map(x=>x.address);
    return state.selected ? [state.selected] : [];
  }
  function applyLanguage() {
    document.documentElement.lang = localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'it';
    set($('ladderSingle'),t('Wallet selezionato','Selected Wallet'));
    set($('ladderAll'),'All Wallets');
    set($('ladderIntro'),t('Ogni dollaro maturato avvicina al traguardo successivo. Le barre seguono i reward disponibili, non il patrimonio investito.',
      'Each earned dollar gets you closer to the next milestone. Bars track unclaimed rewards, not invested holdings.'));
    set($('ladderRoadmapEyebrow'),t('NOVE TRAGUARDI','NINE MILESTONES'));
    set($('ladderRoadmapTitle'),t('La tua progressione','Your progress'));
    set($('ladderRewardTitle'),t('REWARD DISPONIBILI','UNCLAIMED REWARDS'));
    set($('ladderPriceTitle'),'INJ / USD');
    set($('ladderPaceTitle'),t('PRODUZIONE STIMATA / GIORNO','ESTIMATED PRODUCTION / DAY'));
    set($('ladderStakeTitle'),t('IN STAKING','STAKED INJ'));
    set($('ladderDisclaimer'),t('Countdown stimati assumendo prezzo INJ e APR netto costanti. I reward vengono verificati on-chain; tra due sincronizzazioni la progressione è una stima. Un claim o reinvestimento modifica le barre.',
       'Estimated countdowns assume constant INJ price and net APR. Rewards are checked on-chain; between checks progress is an estimate. Claims or compounding change the bars.'));
    $('ladderRefresh').childNodes[0].textContent = t('Aggiorna dati ','Refresh data ');
    $('ladderWalletPicker').setAttribute('aria-label',t('Scegli wallet','Choose wallet'));
    stepEls.forEach((s,i)=>set(s.number,String(i+1).padStart(2,'0')));
  }
  function buildCards() {
    const host = $('ladderSteps');
    host.textContent = '';
    GOALS.forEach((goal,i)=>{
      const card = document.createElement('article');
      card.className = 'ladder-step';
      card.dataset.state = 'pending';
      card.innerHTML =
        '<div class="ladder-step-top"><div class="ladder-step-target"><span class="ladder-step-number"></span><strong class="ladder-step-money"></strong></div><span class="ladder-step-status"></span></div>' +
        '<div class="ladder-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="ladder-fill"></div><span class="ladder-beacon" aria-hidden="true"></span></div>' +
        '<div class="ladder-step-foot"><span class="ladder-step-progress"></span><span class="ladder-step-eta"></span></div>';
      host.appendChild(card);
      const item = {
        card,
        number: card.querySelector('.ladder-step-number'),
        money: card.querySelector('.ladder-step-money'),
        status: card.querySelector('.ladder-step-status'),
        track: card.querySelector('.ladder-track'),
        fill: card.querySelector('.ladder-fill'),
        progress: card.querySelector('.ladder-step-progress'),
        eta: card.querySelector('.ladder-step-eta')
      };
      set(item.number,String(i+1).padStart(2,'0'));
      set(item.money,usd(goal,goal<1?2:0));
      stepEls.push(item);
    });
  }
  function pickWallet() {
    const picker = $('ladderWalletPicker');
    picker.textContent = '';
    state.wallets.forEach((wallet)=>{
      const option = document.createElement('option');
      option.value = wallet.address;
      option.textContent = wallet.label;
      picker.appendChild(option);
    });
    picker.value = state.selected;
    picker.disabled = state.mode === 'all' || !state.wallets.length;
    const wallet = state.wallets.find(x=>x.address===state.selected);
    set($('ladderWalletName'),state.mode==='all'?t('Tutti i wallet ('+state.wallets.length+')','All wallets ('+state.wallets.length+')'):wallet?.label || t('Nessun wallet','No wallets'));
    set($('ladderSelectionLabel'),state.mode==='all'?t('TOTALE AGGREGATO','AGGREGATED TOTAL'):t('WALLET ATTIVO','ACTIVE WALLET'));
    for(const mode of ['single','all']){
      const btn = document.querySelector('[data-ladder-mode="'+mode+'"]');
      const active=state.mode===mode;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-pressed',String(active));
    }
  }
  async function getJSON(url, timeout = 7000) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),timeout);
    try {
      const res = await fetch(url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
      if(!res.ok) throw Error('HTTP '+res.status);
      return await res.json();
    }finally{clearTimeout(timer);}
  }
  function fromWei(value){return Number(value||0)/1e18;}
  function parseRewards(data){
    if(!Array.isArray(data?.total)) return null;
    const value=data.total.filter(c=>c?.denom==='inj').reduce((sum,c)=>sum+fromWei(c.amount),0);
    return Number.isFinite(value) && value>=0 ? value : null;
  }
  function parseDelegations(data){
    if(!Array.isArray(data?.delegation_responses)) return null;
    const value=data.delegation_responses.reduce((sum,x)=>sum+fromWei(x?.balance?.amount),0);
    return Number.isFinite(value) && value>=0 ? value : null;
  }
  async function getWalletNetwork(address){
    for(const root of LCDS){
      try{
        const [rewards,stake] = await Promise.all([
          getJSON(root+'/cosmos/distribution/v1beta1/delegators/'+address+'/rewards'),
          getJSON(root+'/cosmos/staking/v1beta1/delegations/'+address)
        ]);
        const reward=parseRewards(rewards),staked=parseDelegations(stake);
        if(reward!==null && staked!==null) return {reward,stake:staked};
      }catch(_){}
    }
    return null;
  }
  async function fetchOfficialApr(){
    if(Date.now()-state.aprAt<5*60_000)return;
    state.aprAt=Date.now();
    try{
      const data=await getJSON('https://api.ui.injective.network/api/v1/cache/stats/apr',6500);
      const value=finite(data?.apr);
      if(value!==null && value>0){
        const percent=value<=1?value*100:value;
        if(percent>0 && percent<=100)state.officialApr=percent;
      }
    }catch(_){}
  }
  function aprFor(row){
    if(state.officialApr!==null && row.commission!==null) return state.officialApr*(1-row.commission);
    return row.apr;
  }
  async function syncNetwork(){
    if(state.syncing || !state.visible || !state.wallets.length)return;
    state.syncing=true;
    $('ladderRefresh').disabled=true;
    render();
    try{
      await fetchOfficialApr();
      const list=await Promise.all(state.wallets.map(w=>getWalletNetwork(w.address)));
      const now=Date.now();
      list.forEach((data,i)=>{
        if(!data)return;
        const address=state.wallets[i].address;
        const row=state.rows[address];
        if(!row)return;
        row.reward=data.reward;
        row.stake=data.stake;
        row.at=now;
        row.verified=true;
      });
      if(list.some(Boolean))state.networkAt=now;
    }finally{
      state.syncing=false;
      $('ladderRefresh').disabled=false;
      render();
    }
  }
  async function refreshPrice(){
    if(state.priceFetching||!state.visible)return;
    state.priceFetching=true;
    try{
      let next=null,origin='';
      try{
        const data=await getJSON('https://api.binance.com/api/v3/ticker/price?symbol=INJUSDT',5500);
        next=finite(data.price);origin='Binance';
      }catch(_){}
      if(!(next>0)){
        try{
          const data=await getJSON('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd',5500);
          next=finite(data?.['injective-protocol']?.usd);origin='CoinGecko';
        }catch(_){}
      }
      if(next>0){state.price=next;state.priceAt=Date.now();state.priceSource=origin;render();}
    }finally{state.priceFetching=false;}
  }
  function openPriceSocket(){
    if(!state.visible || state.ws || typeof WebSocket!=='function')return;
    try{
      const ws=new WebSocket('wss://stream.binance.com:9443/ws/injusdt@trade');
      state.ws=ws;
      ws.addEventListener('message',(event)=>{
        if(state.ws!==ws||!state.visible)return;
        try{
          const data=JSON.parse(event.data);
          const next=finite(data.p);
          if(!(next>0))return;
          state.price=next;
          state.priceAt=Date.now();
          state.priceSource='Binance';
          // The countdown loop is already ticking; only force a repaint for visible changes.
          if(Date.now()-state.lastDraw>400)render();
        }catch(_){}
      });
      const reconnect=()=>{
        if(state.ws===ws)state.ws=null;
        if(!state.visible)return;
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer=setTimeout(openPriceSocket,6000);
      };
      ws.addEventListener('close',reconnect);
      ws.addEventListener('error',()=>ws.close());
    }catch(_){}
  }
  function stopSocket(){
    clearTimeout(state.reconnectTimer);
    if(state.ws){const ws=state.ws;state.ws=null;try{ws.close();}catch(_){}}
  }
  function currentState(now) {
    const addresses=activeAddresses();
    if(!addresses.length)return {ready:false,missing:0,all:0};
    const rows=addresses.map(a=>state.rows[a]);
    const missing=rows.filter(x=>!x || x.reward===null || x.stake===null).length;
    if(missing)return {ready:false,missing,all:addresses.length};
    let reward=0,staking=0,rateInjSec=0,rateReady=true,estimation=false;
    rows.forEach((row)=>{
      const apr=aprFor(row);
      const rate=apr!==null && row.stake>0?row.stake*apr/100/YEAR_SECONDS:0;
      staking+=row.stake;
      if(row.stake>0 && apr===null)rateReady=false;
      if(row.at && row.stake>0 && apr!==null && now>row.at && now-row.at<=MAX_ESTIMATE_AGE)estimation=true;
      reward+=row.reward + (row.at && apr!==null && row.stake>0 ? rate*Math.min(MAX_ESTIMATE_AGE,Math.max(0,now-row.at))/1000 : 0);
      rateInjSec+=rate;
    });
    const hasPrice=positive(state.price);
    return {
      ready:hasPrice,reward,staking,
      rewardUsd:hasPrice?reward*state.price:null,
      rateUsdSec:rateReady&&hasPrice?rateInjSec*state.price:null,
      rateInjSec:rateReady?rateInjSec:null,
      estimation,
      all:addresses.length,missing:0,
      someCached:rows.some(x=>!x.verified),
      lastConfirmed:Math.min(...rows.map(x=>x.at||0))
    };
  }
  function countdown(seconds){
    if(seconds===null || !Number.isFinite(seconds))return '—';
    const n=Math.max(0,Math.ceil(seconds));
    if(n>10*365.25*86400)return t('oltre 10 anni','over 10 years');
    const days=Math.floor(n/86400);
    const hours=Math.floor(n%86400/3600);
    const min=Math.floor(n%3600/60);
    const sec=n%60;
    const two=(x)=>String(x).padStart(2,'0');
    if(days)return days+t('g ','d ')+two(hours)+':'+two(min)+':'+two(sec);
    return two(hours)+':'+two(min)+':'+two(sec);
  }
  // Pure sequential rung math: only the interval from the previous goal
  // progresses; higher goals remain at zero until their interval is reached.
  function rung(current,previous,target){
    if(current>=target)return {state:'done',percent:100};
    if(current<=previous)return {state:current===previous?'active':'pending',percent:0};
    return {state:'active',percent:100*(current-previous)/(target-previous)};
  }
  function render(){
    state.lastDraw=Date.now();
    const now=state.lastDraw;
    const d=currentState(now);
    const livePrice=positive(state.price) && now-state.priceAt<75_000;
    const confirmed=d.ready && !d.someCached && now-d.lastConfirmed<75_000;
    $('ladderConnection').classList.toggle('is-offline',!livePrice||!confirmed);
    set($('ladderConnectionLabel'),confirmed&&livePrice?t('LIVE · STIMA','LIVE · EST.'):state.syncing?'SYNC':t('IN ATTESA','WAITING'));
    set($('ladderPrice'),positive(state.price)?usd(state.price,state.price<10?4:3):'$—');
    set($('ladderRewardType'),d.ready?(d.someCached?t('CACHE','CACHED'):d.estimation?t('STIMA LIVE','LIVE EST.'):t('ON CHAIN','ON CHAIN')):'SYNC');
    set($('ladderRewardValue'),d.ready?usd(d.rewardUsd,4):'$—');
    set($('ladderRewardInj'),d.ready?inj(d.reward,7):'— INJ');
    set($('ladderStaked'),d.ready?inj(d.staking,3):'— INJ');
    set($('ladderRate'),d.rateUsdSec!==null&&d.ready?usd(d.rateUsdSec*86400,4):'$—');
    if(!state.wallets.length)set($('ladderUpdated'),t('Nessun wallet salvato in INJ Node. Aggiungilo dalla Home.','No saved wallets in INJ Node. Add one from Home.'));
    else if(!d.ready)set($('ladderUpdated'),t('Sincronizzazione dati wallet / prezzo…','Syncing wallet data / price…'));
    else set($('ladderUpdated'),t('Reward verificati','Rewards verified')+' · '+when(d.lastConfirmed)+'  |  '+t('Prezzo','Price')+' · '+when(state.priceAt));
    const current=d.ready?Math.max(0,d.rewardUsd):null;
    const active=GOALS.findIndex(goal=>current!==null && goal>current);
    const next=active<0?null:GOALS[active];
    set($('ladderNextTarget'),current===null?'—':next!==null?t('PROSSIMO','NEXT')+' '+usd(next,next<1?2:0):t('TUTTI COMPLETATI','ALL COMPLETE'));
    GOALS.forEach((target,i)=>{
      const item=stepEls[i],previous=i?GOALS[i-1]:0;
      const r=current!==null?rung(current,previous,target):{state:'pending',percent:0};
      if(item.card.dataset.state!==r.state)item.card.dataset.state=r.state;
      const p=Math.max(0,Math.min(100,r.percent));
      const width=p.toFixed(3)+'%';
      if(item.fill.style.width!==width)item.fill.style.width=width;
      if(item.track.style.getPropertyValue('--ladder-progress')!==width)item.track.style.setProperty('--ladder-progress',width);
      item.track.setAttribute('aria-valuenow',String(Math.round(p)));
      item.track.setAttribute('aria-label',usd(target,target<1?2:0)+' '+Math.round(p)+'%');
      set(item.status,r.state==='done'?t('COMPLETATO','COMPLETE'):r.state==='active'?t('IN CORSO','ACTIVE'):t('IN ATTESA','WAITING'));
      const inSegment=current===null?null:Math.min(target,Math.max(previous,current));
      set(item.progress,inSegment===null?'—':usd(inSegment-previous,3)+' / '+usd(target-previous,3));
      if(current===null){set(item.eta,t('IN ATTESA DATI','AWAITING DATA'));return;}
      if(r.state==='done'){set(item.eta,t('TRAGUARDO RAGGIUNTO','GOAL REACHED'));return;}
      if(d.rateUsdSec===null){set(item.eta,t('ETA · APR NON DISPONIBILE','ETA · APR UNAVAILABLE'));return;}
      if(d.rateUsdSec<=0){set(item.eta,t('ETA · NESSUNA PRODUZIONE','ETA · NO PRODUCTION'));return;}
      const remaining=(target-current)/d.rateUsdSec;
      set(item.eta,t('TEMPO STIMATO · ','EST. TIME · ')+countdown(remaining));
    });
  }
  function connectHandlers(){
    document.querySelectorAll('[data-ladder-mode]').forEach((btn)=>btn.addEventListener('click',()=>{
      state.mode=btn.dataset.ladderMode;
      pickWallet();render();
    }));
    $('ladderWalletPicker').addEventListener('change',(event)=>{
      const value=event.target.value;
      if(!state.wallets.some(x=>x.address===value))return;
      state.selected=value;
      try{localStorage.setItem(SELECTED_KEY,value);}catch(_){}
      pickWallet();render();
    });
    $('ladderRefresh').addEventListener('click',()=>{void Promise.allSettled([syncNetwork(),refreshPrice()]);});
    document.addEventListener('visibilitychange',()=>{
      state.visible=!document.hidden;
      if(state.visible){void Promise.allSettled([syncNetwork(),refreshPrice()]);openPriceSocket();render();}
      else stopSocket();
    });
    window.addEventListener('pageshow',()=>{
      state.visible=!document.hidden;
      if(state.visible){openPriceSocket();render();}
    });
    window.addEventListener('pagehide',stopSocket);
    window.addEventListener('storage',(event)=>{
      if(event.key===LANGUAGE_KEY){applyLanguage();pickWallet();render();}
      if(event.key===SELECTED_KEY && state.mode==='single'){
        const next=state.wallets.find(x=>x.address===event.newValue);
        if(next){state.selected=next.address;pickWallet();render();}
      }
    });
  }
  function initialize(){
    loadWallets();
    buildCards();
    applyLanguage();
    pickWallet();
    connectHandlers();
    render();
    void Promise.allSettled([syncNetwork(),refreshPrice()]);
    openPriceSocket();
    state.timer=setInterval(()=>{if(state.visible)render();},1000);
    state.walletTimer=setInterval(()=>{if(state.visible)void syncNetwork();},NETWORK_INTERVAL);
    state.priceTimer=setInterval(()=>{if(state.visible && Date.now()-state.priceAt>PRICE_INTERVAL)void refreshPrice();},PRICE_INTERVAL);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();