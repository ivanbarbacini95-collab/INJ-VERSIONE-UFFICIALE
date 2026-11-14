/* INJ Node · Cash Reserve · watch-only portfolio and verified yield monitor */
(() => {
  'use strict';
  // Fixed address configuration is held in cash-portfolio-onchain.js; never rendered.
  // V4 starts a new, truthful history including invested principal and accrued yield.
  // Old liquid-only snapshots are intentionally not mixed into the chart.
  const KEY_HISTORY = 'inj_node_cash_reserve_history_v4_yield_included';
  const KEY_TARGET = 'inj_node_cash_reserve_goal_v1';
  const KEY_PRIVACY = 'inj_node_cash_reserve_privacy_v1';
  const $ = (id) => document.getElementById(id);
  if (!$('cashReservePanel')) return;

  const state = { amounts: null, usd: null, fx: null, lastSync: 0, loading: false, error: false, partial: false, errorDetail: '', privacy: false, target: 0, currency: 'USD', lang: 'it', range: 'ALL', history: [], portfolio: null, pendingDrop: null, reconciling: false, selectedTime: null, chartExploring: false, chartSelect: null, chartPoints: [] };
  const historyKey = () => KEY_HISTORY;
  const phrases = {
    it: {reserve:'CASH RESERVE', sub:'Riserva patrimoniale · Injective + Solana', nominal:'Valore nominale della riserva', note:'Valore nominale: 1 stablecoin = 1 USD. Non è una quotazione di mercato né un capitale assicurato.', target:'Obiettivo di accumulo', targetHint:'Imposta un obiettivo in USD', save:'Salva', noGoal:'Nessun obiettivo impostato', ofGoal:'del target', history:'Evoluzione riserva', historyEmpty:'Lo storico si formerà da questo dispositivo a partire dalle prossime sincronizzazioni.', sync:'Sincronizza', updating:'Sincronizzazione…', online:'Online', offline:'Offline', pending:'In attesa', copied:'Indirizzo copiato', copy:'Copia', privacy:'Privacy', address:'Wallet di riserva', updated:'Aggiornato', noFX:'Cambio EUR/USD temporaneamente non disponibile', source:'Sola lettura · saldo on-chain · nessuna firma richiesta', warning:'Solo USDC nativo su Injective e USDC/USDT ufficiali su Solana. I saldi delle due reti restano distinti.', solPlaceholder:'Indirizzo pubblico wallet Solana', solMissing:'Solana non configurata: totale riferito solo a Injective.', solConfigured:'Solana collegata · lettura pubblica dei saldi', solInvalid:'Indirizzo Solana non valido.', partial:'Parziale', solFailed:'Impossibile leggere Solana; verifica la rete RPC.', injFailed:'Impossibile leggere Injective; verifica la rete LCD.', failed:'Saldo non verificabile: controlla la rete o riprova.', fx:'Controvalore stimato con cambio di riferimento USD/EUR.'},
    en: {reserve:'CASH RESERVE', sub:'Capital reserve · Injective + Solana', nominal:'Nominal reserve value', note:'Nominal valuation: 1 stablecoin = 1 USD. Not a market quote or insured capital.', target:'Savings target', targetHint:'Set a target in USD', save:'Save', noGoal:'No target set', ofGoal:'of target', history:'Reserve history', historyEmpty:'History starts on this device with the next successful syncs.', sync:'Sync', updating:'Syncing…', online:'Online', offline:'Offline', pending:'Waiting', copied:'Address copied', copy:'Copy', privacy:'Privacy', address:'Reserve wallet', updated:'Updated', noFX:'EUR/USD rate temporarily unavailable', source:'Read-only · on-chain balance · no wallet signature required', warning:'Only native USDC on Injective and official USDC/USDT on Solana. Balances stay separated by network.', solPlaceholder:'Public Solana wallet address', solMissing:'Solana not configured: total includes Injective only.', solConfigured:'Solana connected · public balance monitoring', solInvalid:'Invalid Solana address.', partial:'Partial', solFailed:'Solana balance unavailable; check RPC.', injFailed:'Injective balance unavailable; check LCD.', failed:'Balance cannot be verified: check the network and try again.', fx:'Estimated value using a reference USD/EUR exchange rate.'}
  };
  const tr = (k) => phrases[state.lang][k] || k;
  const store = (k, value) => { try { localStorage.setItem(k, JSON.stringify(value)); } catch (_) {} };
  const load = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const fmt = (n, places = 2) => Number(n).toLocaleString(state.lang === 'it' ? 'it-IT' : 'en-US',{ minimumFractionDigits: places, maximumFractionDigits: places });
  const money = (n, c = 'USD') => (c === 'EUR' ? '€ ' : '$ ') + fmt(n);
  const shown = (v) => (state.privacy || document.documentElement.dataset.injPrivacy === 'on') ? '••••••' : v;
  const updateTexts = () => {
    document.querySelectorAll('[data-cash-it]').forEach((node) => {
      const label = state.lang === 'en' ? node.dataset.cashEn : node.dataset.cashIt;
      if (label) node.textContent = label;
    });
    $('cashGoalAmount').placeholder = tr('targetHint');
    $('cashSync').textContent = state.loading ? tr('updating') : tr('sync');
    $('cashPrivacy').setAttribute('aria-label',tr('privacy'));
  };
  const readPrefs = () => {
    try {
      state.lang = localStorage.getItem('inj_node_language_v1') === 'en' ? 'en' : 'it';
      state.currency = localStorage.getItem('inj_monitor_currency') === 'EUR' ? 'EUR' : 'USD';
    } catch (_) {}
  };
  const pickCurrency = () => {
    const c = state.currency;
    $('cashCurrency').value = c;
    const value = state.usd == null ? null : (c === 'EUR' && state.fx != null ? state.usd * state.fx : c === 'USD' ? state.usd : null);
    $('cashTotal').textContent = state.usd == null ? '—' : (value == null ? '—' : shown(money(value,c)));
    $('cashFxNote').textContent = c === 'EUR' && state.fx == null ? tr('noFX') : c === 'EUR' ? tr('fx') : tr('note');
  };
  const updateStatus = () => {
    const el = $('cashStatus');
    const online = !state.error && state.lastSync > 0;
    el.className = 'cash-pill ' + (state.error ? (state.partial ? 'is-partial' : 'is-error') : online ? 'is-ok' : 'is-idle');
    el.textContent = state.error ? (state.partial ? tr('partial') : tr('offline')) : online ? tr('online') : tr('pending');
    $('cashSyncInfo').textContent = state.reconciling?(state.lang==='it'?'Riconciliazione movimenti in corso':'Reconciling wallet movements'):(state.lastSync ? tr('updated') + ' ' + new Date(state.lastSync).toLocaleTimeString(state.lang === 'it'?'it-IT':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : tr('pending'));
    $('cashError').textContent = state.error ? (state.errorDetail || tr('failed')) : '';
  };
  function updateAmounts() {
    for (const [id, key] of [['cashUsdc','usdcInj'],['cashUsdcSol','usdcSol'],['cashUsdtSol','usdtSol']]) {
      const amount = state.amounts?.[key];
      $(id).textContent = Number.isFinite(amount) ? shown(fmt(amount,2)) : '—';
    }
  }

  function makeNode(tag, cls, value) {
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!=null)e.textContent=value;
    return e;
  }
  function makeTokenIcon(url) {
    const holder=makeNode('span','cash-token-icon');
    holder.append(makeNode('span','cash-token-placeholder','◈'));
    try {
      const u=new URL(String(url));
      // External images are only accepted over HTTPS, and never include wallet addresses.
      if(u.protocol==='https:'&&!u.username&&!u.password&&url.length<1024){
        const img=document.createElement('img');
        img.className='cash-token-logo';img.alt='';img.loading='lazy';
        img.decoding='async';img.referrerPolicy='no-referrer';
        img.addEventListener('error',()=>img.remove(),{once:true});
        img.src=u.href;
        holder.prepend(img);
      }
    }catch(_){}
    return holder;
  }
  function renderAssetList(target,network) {
    const root=$(target);
    if(!root)return;
    root.replaceChildren();
    if(!network) {
      root.append(makeNode('p','cash-token-empty',state.lang==='it'?'Rete non disponibile · riprova la sincronizzazione':'Network unavailable · retry sync'));
      return;
    }
    const list=network.assets.slice().sort((a,b)=>{
      const rank=v=>v.kind==='stable'?0:v.kind==='native'?1:2;
      return rank(a)-rank(b)||a.name.localeCompare(b.name);
    });
    if(!list.length) {
      root.append(makeNode('p','cash-token-empty',state.lang==='it'?'Nessun asset con saldo positivo.':'No positive asset balances.'));
      return;
    }
    for(const entry of list) {
      const row=makeNode('div','cash-token-row');
      const icon=makeTokenIcon(entry.logoUrl);
      icon.setAttribute('aria-hidden','true');
      const main=makeNode('div','cash-token-name');
      main.append(makeNode('strong','',entry.name));
      main.append(makeNode('small','',entry.note));
      const amount=makeNode('div','cash-token-amount');
      amount.append(makeNode('strong','',shown(entry.amount.text)));
      if(entry.unformatted)amount.append(makeNode('small','',state.lang==='it'?'Unità base, decimali non disponibili':'Raw units; decimals unavailable'));
      else amount.append(makeNode('small','',entry.symbol));
      row.append(icon,main,amount);
      root.append(row);
    }
  }
  function renderYield() {
    const root=$('cashYieldList');
    if(!root)return;
    root.replaceChildren();
    const base=state.portfolio?.yield;
    const jupiter=state.portfolio?.jupiter;
    const positions=[...(base?.positions||[]),...(jupiter?.positions||[])];
    if(!positions.length){
      const note=!jupiter?(state.lang==='it'
        ?'Jupiter Earn non verificabile: posizioni e rendimento non disponibili (non significa saldo zero).'
        :'Jupiter Earn unavailable: positions and yield could not be verified (not a zero balance).'):
        (state.lang==='it'?'Nessuna posizione staking o Jupiter Earn rilevata.':'No Injective staking or Jupiter Earn positions detected.');
      root.append(makeNode('p','cash-token-empty',note));
    }
    for(const p of positions) {
      const row=makeNode('article','cash-yield-position');
      const top=makeNode('div','cash-yield-heading');
      const identity=makeNode('div','cash-yield-identity');
      identity.append(makeTokenIcon(p.logoUrl||null),makeNode('strong','',p.name));
      top.append(identity);
      const rate=p.apr!=null?fmt(p.apr,2)+'% '+(p.rateKind||'APR'):
        (state.lang==='it'?'Rendimento —':'Yield —');
      top.append(makeNode('span','',rate));
      const info=makeNode('div','cash-yield-metrics');
      function cell(label,val) {
        const wrapper=makeNode('div','');
        wrapper.append(makeNode('span','',label),makeNode('strong','',shown(val)));
        return wrapper;
      }
      if(p.kind==='jupiter'){
        info.classList.add('cash-yield-metrics-jupiter');
        const earned=Number.isFinite(p.rewards)&&p.rewards>=0?p.rewards:null;
        // Net principal is only reconstructible when Jupiter supplies accrued earnings.
        // Do not infer wallet deposits or lifetime profit from an arbitrary first snapshot.
        const principal=earned!=null&&earned<=p.amount+0.000001?
          Math.max(0,p.amount-earned):null;
        const earnedDigits=earned!=null&&earned>0&&earned<0.000001?9:6;
        info.append(cell(state.lang==='it'?'SALDO ATTUALE':'CURRENT BALANCE',fmt(p.amount,4)+' '+p.asset));
        info.append(cell(state.lang==='it'?'CAPITALE NETTO':'NET PRINCIPAL',
          principal==null?'—':fmt(principal,6)+' '+p.asset));
        info.append(cell(state.lang==='it'?'INTERESSI MATURATI':'ACCRUED INTEREST',
          earned==null?'—':fmt(earned,earnedDigits)+' '+p.asset));
        info.append(cell(state.lang==='it'?'STIMA / GIORNO':'EST. / DAY',
          p.day==null?'—':fmt(p.day,6)+' '+p.asset));
        const meta=makeNode('div','cash-yield-meta');
        meta.append(makeNode('span','cash-yield-compound',
          state.lang==='it'?'✓ Compound automatico':'✓ Automatic compounding'));
        if(Number.isFinite(p.day)&&p.day>=0){
          const live=makeNode('span','cash-yield-live');
          live.dataset.cashLiveDay=String(p.day);
          meta.append(live);
        }
        const hint=earned==null?
          (state.lang==='it'?
            'Saldo comprensivo degli interessi; il capitale netto e il maturato non sono disponibili finché Jupiter non conferma i dati. APY variabile.':
            'Balance includes interest; net principal and earnings remain unavailable until confirmed by Jupiter. Variable APY.'):
          (state.lang==='it'?
            'Capitale netto = saldo meno interessi maturati comunicati da Jupiter; non è lo storico di tutti i depositi. Gli interessi restano nelle quote jlToken. Stima live non accreditata, APY variabile.':
            'Net principal = balance minus accrued earnings reported by Jupiter; not lifetime deposits. Yield stays in jlToken shares. Live estimate is not credited; APY varies.');
        row.append(top,info,meta,makeNode('small','cash-yield-hint',hint));
      } else {
        info.append(cell(state.lang==='it'?'IN DELEGA':'STAKED',fmt(p.amount,4)+' '+p.asset));
        info.append(cell(state.lang==='it'?'REWARD MATURATI':'ACCRUED REWARDS',
          p.rewards==null?'—':fmt(p.rewards,6)+' '+p.asset));
        info.append(cell(state.lang==='it'?'STIMA / GIORNO':'EST. / DAY',
          p.day==null?'—':fmt(p.day,6)+' '+p.asset));
        row.append(top,info,makeNode('small','cash-yield-hint',
          state.lang==='it'?'APR netto stimato in base ai validatori effettivi; reward verificati on-chain.':
            'Estimated net APR based on actual validators; rewards verified on-chain.'));
      }
      root.append(row);
    }
    updateYieldLive();
    if(!jupiter){
      root.append(makeNode('p','cash-yield-disclaimer',state.lang==='it'
        ?'Jupiter Earn non disponibile dalla fonte dati. La riserva viene indicata come parziale; il grafico non registra saldi incompleti.'
        :'Jupiter Earn data source unavailable. Reserve is marked partial and no incomplete chart snapshots are recorded.'));
    }
    root.append(makeNode('p','cash-yield-disclaimer',state.lang==='it'
      ?'Le posizioni Hydro o su altre dApp richiedono letture specifiche: mai attribuire rendimenti non verificati.'
      :'Hydro and other dApps require individual adapters; unverified returns are never shown as confirmed.'));
  }
  function updateYieldLive() {
    // Animation of an *estimate* since the last sync, not a recorded on-chain reward.
    const elapsed=state.lastSync>0?Math.max(0,Math.min(Date.now()-state.lastSync,120000)):0;
    document.querySelectorAll('.cash-yield-live[data-cash-live-day]').forEach(node=>{
      const daily=Number(node.dataset.cashLiveDay);
      const estimate=Number.isFinite(daily)&&daily>=0?daily*elapsed/86400000:null;
      const number=estimate==null?'—':fmt(estimate,9)+' '+(node.closest('.cash-yield-position')?.querySelector('.cash-yield-metrics-jupiter strong')?.textContent?.split(' ').pop()||'');
      node.textContent=state.lang==='it'?'Stima live da ultima lettura: +'+shown(number):
        'Live estimate since last sync: +'+shown(number);
    });
  }
  function renderPortfolio() {
    renderAssetList('cashInjectiveTokens',state.portfolio?.inj);
    renderAssetList('cashSolanaTokens',state.portfolio?.sol);
    const inj=$('cashInjAssetsStatus'),sol=$('cashSolAssetsStatus');
    if(inj)inj.textContent=state.portfolio?.inj?(state.lang==='it'?'ONLINE':'ONLINE'):'OFFLINE';
    if(sol)sol.textContent=state.portfolio?.sol?(state.lang==='it'?'ONLINE':'ONLINE'):'OFFLINE';
    const count=[state.portfolio?.inj,state.portfolio?.sol].filter(Boolean).reduce((sum,b)=>sum+b.assets.length,0)+(state.portfolio?.jupiter?.positions?.length||0);
    const counter=$('cashTokenCount');
    if(counter)counter.textContent=count+(state.portfolio?.inj&&state.portfolio?.sol&&state.portfolio?.jupiter?'':' · PARZIALE');
    const solUnsupported=$('cashSolAssetsNote');
    if(solUnsupported)solUnsupported.textContent=state.portfolio?.sol?.unsupported?(state.lang==='it'?'Alcuni token con formato non leggibile: '+state.portfolio.sol.unsupported:'Unreadable token accounts: '+state.portfolio.sol.unsupported):'';
    renderYield();
  }
  const updateGoal = () => {
    const progress = state.target > 0 && state.usd != null ? Math.max(0, Math.min(100, state.usd / state.target * 100)) : 0;
    $('cashProgressBar').style.width = progress + '%';
    $('cashGoalProgress').textContent = state.target > 0 ? (state.usd != null ? shown(fmt(progress,1)+'% '+tr('ofGoal')) : (state.lang==='it'?'Saldi in sincronizzazione':'Waiting for balances')) : tr('noGoal');
    $('cashGoalTotal').textContent = state.target > 0 ? shown(money(state.target)) : '—';
    $('cashGoalAmount').value = state.target > 0 ? String(state.target) : '';
  };
  // Periodic samples are throttled to preserve months/years of history.
  // Meaningful movements create distinct event points, while earned interest
  // remains in the total and is not falsely presented as an external deposit.
  const saveSnapshot = () => {
    if (state.usd == null || !Number.isFinite(state.usd)) return;
    const now = Date.now();
    const last = state.history[state.history.length-1];
    if (!last) {
      state.history.push({t:now,v:state.usd,kind:'start',delta:0});
    } else {
      const delta = state.usd - last.v;
      const elapsed = Math.max(0,now-last.t);
      const daily = (state.portfolio?.jupiter?.positions||[]).reduce((sum,p)=>sum+(Number(p.day)||0),0);
      const expectedYield = daily*Math.min(elapsed/86400000,14);
      const eventLimit = Math.max(0.02,last.v*0.00002,delta>0?expectedYield*2.5+0.02:0);
      const kind = delta < -eventLimit ? 'out' : delta > eventLimit ? 'in' : 'sample';
      if(kind!=='sample'||elapsed>=3600000) {
        state.history.push({t:now,v:state.usd,kind,delta});
      }
    }
    state.history = state.history.slice(-12000);
    store(historyKey(),state.history);
  };
  const updateChart = () => {
    const chart = $('cashHistoryChart');
    const viewport = $('cashChartScroll');
    const detail = $('cashChartDetail');
    if(!chart||!viewport||!detail)return;
    const now = Date.now();
    const windows = {'1D':86400000,'1M':30*86400000,'1Y':365*86400000,'ALL':Infinity};
    const windowMs=windows[state.range]??Infinity;
    const saved = state.history.filter(p=>p.t>=now-windowMs);
    const points = saved.slice();
    // Timeframe filters only the observations; total always refers to the whole reserve.
    const total=Number.isFinite(state.usd)?state.usd:state.history.at(-1)?.v;
    const totalEl=$('cashChartTotal');
    if(totalEl)totalEl.textContent=Number.isFinite(total)?shown('$ '+fmt(total,4)+' USD'):'—';
    const periodEl=$('cashChartPeriodInfo');
    if(periodEl){
      const labels=state.lang==='it'?{'1D':'Ultime 24 ore','1M':'Ultimi 30 giorni','1Y':'Ultimi 12 mesi','ALL':'Dall’inizio delle rilevazioni'}:
        {'1D':'Last 24 hours','1M':'Last 30 days','1Y':'Last 12 months','ALL':'Since tracking began'};
      periodEl.textContent=labels[state.range]+' · '+saved.length+' '+
        (state.lang==='it'?(saved.length===1?'lettura':'letture'):(saved.length===1?'reading':'readings'));
    }
    if(state.usd!=null&&!state.error&&!state.reconciling&&now-state.lastSync<120000) {
      const last=points[points.length-1];
      if(!last||now-last.t>5000)points.push({t:now,v:state.usd,kind:'live',delta:last?state.usd-last.v:0});
    }
    state.chartPoints=points;
    chart.replaceChildren();
    const empty=$('cashChartEmpty');
    empty.hidden=points.length>1;
    if(!empty.hidden)empty.textContent=state.lang==='it'?
      (points.length===1?'Una sola rilevazione nel periodo: l’andamento apparirà dopo nuovi dati.':'Nessuna rilevazione nel periodo selezionato. I dati non vengono ricostruiti artificialmente.'):
      (points.length===1?'Only one reading in this period. The trend will appear as more data arrives.':'No readings in the selected period. Missing history is never fabricated.');
    const allRange=state.range==='ALL';
    // ALL is an overview: show the entire chronological series inside the card,
    // regardless of point count. Other ranges retain their detailed scrolling.
    viewport.classList.toggle('cash-chart-all',allRange);
    const previousLeft=viewport.scrollLeft;
    const navPrev=$('cashChartPrev'),navNext=$('cashChartNext');
    if(points.length<=1) {
      const locale=state.lang==='it'?'it-IT':'en-US';
      detail.replaceChildren();
      const label=makeNode('strong','',points[0]?new Date(points[0].t).toLocaleString(locale,{
        day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
      }):(state.lang==='it'?'Nessun dato nel periodo':'No data in this period'));
      const value=makeNode('span','',points[0]?shown('$ '+fmt(points[0].v,4)+' USD'):'—');
      detail.append(label,value);
      if(navPrev)navPrev.disabled=true;
      if(navNext)navNext.disabled=true;
      $('cashChartFirst').textContent=points[0]?new Date(points[0].t).toLocaleDateString(locale):'—';
      $('cashChartLast').textContent=points[0]?new Date(points[0].t).toLocaleDateString(locale):'—';
      state.chartSelect=null;
      chart.onpointermove=null;chart.onpointerdown=null;chart.onkeydown=null;
      chart.setAttribute('viewBox','0 0 660 180');
      chart.style.width=allRange?'100%':'660px';
      if(allRange)viewport.scrollLeft=0;
      if(points.length===1){
        const ns='http://www.w3.org/2000/svg';
        const dot=document.createElementNS(ns,'circle');
        dot.setAttribute('cx','330');dot.setAttribute('cy','90');dot.setAttribute('r','4.5');
        dot.setAttribute('fill','#45e5ce');chart.appendChild(dot);
      }
      return;
    }
    const w=allRange?660:Math.max(660,Math.min(12000,points.length*30));
    chart.setAttribute('viewBox','0 0 '+w+' 180');
    chart.style.width=allRange?'100%':w+'px';
    const minT=points[0].t,maxT=Math.max(points[points.length-1].t,minT+1000);
    const values=points.map(p=>p.v);
    const lo=Math.min(...values),hi=Math.max(...values);
    // Adaptive range makes genuine small daily interest visible without implying growth.
    const padding=Math.max((hi-lo)*.14,hi*.00035,.0005);
    const yMin=Math.max(0,lo-padding),yMax=hi+padding;
    const x=p=>12+(p.t-minT)/(maxT-minT)*(w-24);
    const y=p=>164-(p.v-yMin)/(yMax-yMin)*146;
    const ns='http://www.w3.org/2000/svg';
    const shape=(tag,attrs)=>{
      const el=document.createElementNS(ns,tag);
      Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
      chart.appendChild(el);
      return el;
    };
    [24,72,120,164].forEach(yy=>shape('line',{x1:12,x2:w-12,y1:yy,y2:yy,stroke:'currentColor','stroke-opacity':'.12','stroke-dasharray':'3 6','pointer-events':'none'}));
    let d='M '+x(points[0]).toFixed(2)+' '+y(points[0]).toFixed(2);
    points.slice(1).forEach((p,i)=>{
      const prev=points[i],delta=p.v-prev.v;
      const smallYield=delta>=0&&delta<=Math.max(.05,prev.v*.001);
      d+=(smallYield?' L ':' H ')+x(p).toFixed(2)+(smallYield?' ':' V ')+y(p).toFixed(2);
    });
    shape('path',{d,fill:'none',stroke:'#45e5ce','stroke-width':2.6,'stroke-linejoin':'round','stroke-linecap':'round','pointer-events':'none'});
    points.forEach((p,i)=>{
      if(!['in','out'].includes(p.kind))return;
      shape('circle',{cx:x(p),cy:y(p),r:4.5,fill:p.kind==='in'?'#48e4a4':'#ff7782',stroke:'var(--surface,#10202c)','stroke-width':1.5,'pointer-events':'none'});
    });
    const cursor=shape('line',{x1:0,y1:15,x2:0,y2:165,stroke:'#c2f8ec','stroke-width':1,'stroke-dasharray':'3 4','stroke-opacity':'.75','pointer-events':'none'});
    const dot=shape('circle',{cx:0,cy:0,r:5,fill:'#45e5ce',stroke:'var(--surface,#10202c)','stroke-width':2,'pointer-events':'none'});
    const locale=state.lang==='it'?'it-IT':'en-US';
    const describe=p=>{
      if(p.kind==='in')return state.lang==='it'?'Aumento rilevato':'Detected increase';
      if(p.kind==='out')return state.lang==='it'?'Diminuzione rilevata':'Detected decrease';
      if(p.kind==='live')return state.lang==='it'?'Saldo in tempo reale':'Live balance';
      if(p.kind==='start')return state.lang==='it'?'Inizio rilevazioni':'History start';
      return state.lang==='it'?'Rilevazione verificata':'Verified observation';
    };
    const selectPoint=(index,reveal=false)=>{
      const i=Math.max(0,Math.min(points.length-1,index));
      const p=points[i];
      state.selectedTime=p.t;
      state.chartIndex=i;
      cursor.setAttribute('x1',x(p));cursor.setAttribute('x2',x(p));
      dot.setAttribute('cx',x(p));dot.setAttribute('cy',y(p));
      dot.setAttribute('fill',p.kind==='out'?'#ff7782':p.kind==='in'?'#48e4a4':'#45e5ce');
      const stamp=new Date(p.t).toLocaleString(locale,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const previous=points[i-1];
      const delta=Number.isFinite(p.delta)?p.delta:(previous?p.v-previous.v:0);
      const sign=delta>0?'+':'';
      const deltaDisplay=(state.privacy?'••••••':sign+'$ '+fmt(delta,Math.abs(delta)<.01?6:4));
      const suffix=p.kind==='start'?'':' · '+deltaDisplay;
      detail.replaceChildren();
      const label=document.createElement('strong');
      label.textContent=stamp+' · '+describe(p);
      const amount=document.createElement('span');
      amount.textContent=shown('$ '+fmt(p.v,4))+' USD'+suffix;
      amount.className=delta<0?'cash-history-negative':delta>0?'cash-history-positive':'';
      detail.append(label,amount);
      if(navPrev)navPrev.disabled=i===0;
      if(navNext)navNext.disabled=i===points.length-1;
      if(reveal){
        const center=x(p)-viewport.clientWidth/2;
        viewport.scrollLeft=Math.max(0,Math.min(viewport.scrollWidth-viewport.clientWidth,center));
      }
    };
    state.chartSelect=selectPoint;
    const nearest=clientX=>{
      const bounds=chart.getBoundingClientRect();
      if(!bounds.width)return points.length-1;
      const xx=(clientX-bounds.left)/bounds.width*w;
      let a=0,b=points.length-1;
      while(a<b){const mid=(a+b)>>1;if(x(points[mid])<xx)a=mid+1;else b=mid;}
      return a>0&&Math.abs(x(points[a-1])-xx)<Math.abs(x(points[a])-xx)?a-1:a;
    };
    chart.onpointermove=e=>{
      if(e.pointerType==='touch'&&e.buttons===0)return;
      state.chartExploring=true;
      selectPoint(nearest(e.clientX));
    };
    chart.onpointerdown=e=>{
      state.chartExploring=true;
      selectPoint(nearest(e.clientX));
    };
    chart.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();state.chartExploring=true;
      const current=state.chartIndex??points.length-1;
      selectPoint(e.key==='Home'?0:e.key==='End'?points.length-1:current+(e.key==='ArrowLeft'?-1:1),true);
    };
    const selected=state.chartExploring&&state.selectedTime!=null
      ?points.reduce((best,p,i)=>Math.abs(p.t-state.selectedTime)<Math.abs(points[best].t-state.selectedTime)?i:best,0)
      :points.length-1;
    selectPoint(selected);
    viewport.scrollLeft=allRange?0:(state.chartExploring?previousLeft:viewport.scrollWidth);
    $('cashChartFirst').textContent=new Date(minT).toLocaleDateString(locale);
    $('cashChartLast').textContent=new Date(maxT).toLocaleDateString(locale);
  };
  const render = () => { readPrefs(); updateTexts(); updateAmounts(); pickCurrency(); updateGoal(); updateStatus(); updateChart(); renderPortfolio(); };
  async function getJSON(url,ms=6500) {
    const abort = new AbortController(), timer = setTimeout(()=>abort.abort(),ms);
    try {
      const result = await fetch(url,{cache:'no-store',signal:abort.signal});
      if (!result.ok) throw new Error('HTTP '+result.status);
      return await result.json();
    } finally { clearTimeout(timer); }
  }
  async function refreshFX() {
    try {
      const j = await getJSON('https://api.frankfurter.app/latest?from=USD&to=EUR',6000);
      if (Number(j?.rates?.EUR) > 0) { state.fx = Number(j.rates.EUR); render(); }
    } catch (_) { /* Never invent a live FX rate. USD remains available. */ }
  }
  async function sync() {
    if(state.loading||document.hidden)return;
    state.loading=true;render();
    let p;
    try {p=await window.INJ_CASH_PORTFOLIO.scan();}
    catch(e) {p={inj:null,sol:null,yield:null,errors:{inj:true,sol:true,yield:true}};}
    state.portfolio=p;
    const injOK=Boolean(p.inj),solOK=Boolean(p.sol);
    const jupOK=Boolean(p.jupiter);
    state.amounts={
      usdcInj:injOK?p.inj.usdc:null,
      usdcSol:solOK?p.sol.usdc+(jupOK?p.jupiter.usdc:0):null,
      usdtSol:solOK?p.sol.usdt+(jupOK?p.jupiter.usdt:0):null
    };
    const detail=$('cashSolanaEarnDetail');
    if(detail) detail.textContent=solOK
      ?(jupOK
        ?(state.lang==='it'?'Disponibili '+fmt(p.sol.usdc)+' · Jupiter Earn '+fmt(p.jupiter.usdc):'Available '+fmt(p.sol.usdc)+' · Jupiter Earn '+fmt(p.jupiter.usdc))
        :(state.lang==='it'?'Solo saldo disponibile · Jupiter da verificare':'Available only · Jupiter unavailable'))
      : '—';
    state.error=!injOK||!solOK||!jupOK;
    state.partial=state.error&&(injOK||solOK||jupOK);
    state.errorDetail=[
      !injOK&&tr('injFailed'),
      !solOK&&tr('solFailed'),
      !jupOK&&(state.lang==='it'?'Jupiter Earn non raggiungibile: posizione investita non verificabile.':'Jupiter Earn unavailable: invested balance could not be verified.')
    ].filter(Boolean).join(' ');
    // Do not call a partial total a complete reserve.
    // Never mistake moving funds from liquid wallet into Jupiter Earn for an outflow.
    // Do not commit incomplete snapshots when any source is temporarily unavailable.
    const candidate=injOK&&solOK&&jupOK
      ?p.inj.usdc+p.sol.usdc+p.sol.usdt+p.jupiter.usdc+p.jupiter.usdt:null;
    const last=state.history[state.history.length-1];
    state.reconciling=false;
    // RPC and Jupiter may disagree briefly in EITHER direction during Earn
    // deposits/redemptions. Confirm material balance shifts before charting them.
    if(candidate!=null&&last&&Math.abs(candidate-last.v)>Math.max(0.1,last.v*0.0005)){
      const pending=state.pendingDrop;
      if(!pending||Math.abs(pending.value-candidate)>Math.max(0.02,candidate*0.0001))
        state.pendingDrop={value:candidate,count:1};
      else state.pendingDrop={value:candidate,count:pending.count+1};
      if(state.pendingDrop.count<4){
        state.usd=last.v;
        state.reconciling=true;
      } else {
        state.usd=candidate;
        state.pendingDrop=null;
      }
    } else {
      state.usd=candidate;
      state.pendingDrop=null;
    }
    if(injOK||solOK)state.lastSync=Date.now();
    if(state.usd!=null&&!state.reconciling)saveSnapshot();
    state.loading=false;
    render();
  }
  function boot() {
    state.history = (load(historyKey(),[]) || []).filter(p=>Number.isFinite(p?.t)&&Number.isFinite(p?.v)&&p.v>=0).sort((a,b)=>a.t-b.t).slice(-12000);
    state.target = Math.max(0,Number(load(KEY_TARGET,0))||0);
    state.privacy = document.documentElement.dataset.injPrivacy === 'on';
    $('cashPrivacy').setAttribute('aria-pressed',String(state.privacy));
    $('cashGoalForm').addEventListener('submit',event=>{
      event.preventDefault();
      const v = Number($('cashGoalAmount').value);
      if (!Number.isFinite(v) || v < 0) return;
      state.target = v;store(KEY_TARGET,v);render();
    });
    $('cashPrivacy').addEventListener('click',()=>{
      state.privacy = !state.privacy;
      if (window.INJPrivacy) window.INJPrivacy.set(state.privacy);
      else {
        try { localStorage.setItem('inj_monitor_privacy',state.privacy?'1':'0'); } catch (_) {}
        document.documentElement.dataset.injPrivacy = state.privacy?'on':'off';
        document.body.classList.toggle('privacy-on',state.privacy);
      }
      $('cashPrivacy').setAttribute('aria-pressed',String(state.privacy));render();
    });
    window.addEventListener('inj:privacy',event=>{
      state.privacy = !!event.detail?.active;
      $('cashPrivacy').setAttribute('aria-pressed',String(state.privacy));
      render();
    });
    $('cashCurrency').addEventListener('change',event=>{
      state.currency = event.target.value;
      try{localStorage.setItem('inj_monitor_currency',state.currency)}catch(_){}
      render();
    });
    $('cashSync').addEventListener('click',()=>void sync());
    const chartScroll=$('cashChartScroll');
    ['touchstart','wheel','pointerdown'].forEach(type=>chartScroll?.addEventListener(type,()=>{state.chartExploring=true;},{passive:true}));
    $('cashChartPrev')?.addEventListener('click',()=>{state.chartExploring=true;state.chartSelect?.((state.chartIndex??state.chartPoints.length-1)-1,true);});
    $('cashChartNext')?.addEventListener('click',()=>{state.chartExploring=true;state.chartSelect?.((state.chartIndex??0)+1,true);});
    $('cashChartLatest')?.addEventListener('click',()=>{state.chartExploring=false;state.selectedTime=null;updateChart();});
    document.querySelectorAll('[data-cash-range]').forEach(button=>{
      button.addEventListener('click',()=>{
        state.range=button.dataset.cashRange;
        state.chartExploring=false;state.selectedTime=null;
        document.querySelectorAll('[data-cash-range]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
        updateChart();
      });
    });
    // Start each session in Total, regardless of which timeframe was inspected before.
    state.range='ALL';
    document.querySelectorAll('[data-cash-range]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.cashRange==='ALL')));
    window.addEventListener('storage',event=>{
      if (['inj_node_language_v1','inj_monitor_currency'].includes(event.key)) render();
    });
    document.addEventListener('visibilitychange',()=>{ if (!document.hidden) void sync(); });
    window.addEventListener('online',()=>void sync());
    render();void sync();void refreshFX();
    setInterval(()=>{ if (!document.hidden) void sync(); },30000);
    setInterval(()=>{ if (!document.hidden) updateYieldLive(); },5000);
    setInterval(()=>{ if (!document.hidden) void refreshFX(); },3600000);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
