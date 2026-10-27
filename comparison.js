/* INJ Node · Market Cap Comparison · v16.00.92
   CoinGecko live crypto capitalizations, Nasdaq daily US-stock values, manual index fallback.
   Same-origin parent wallet selection; no wallet credentials, no trades.
*/
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const API='https://api.coingecko.com/api/v3';
 const COIN_CACHE='inj_node_comparison_coins_v1';
 const QUERY_CACHE='inj_node_comparison_recent_v1';
 const SELECTED_KEY='inj_node_comparison_selected_wallet_v1';
 const NASDAQ_URL='https://raw.githubusercontent.com/zyhe16/top-us-stock-tickers/main/tickers/all.csv';
 const usMarketCaps=new Map(),usStockNames=new Map(), estimatedIndexCaps=new Map();
 const INDEX_DATASETS={
   SPX:'https://raw.githubusercontent.com/zyhe16/top-us-stock-tickers/main/tickers/sp500.csv',
   NDX:'https://raw.githubusercontent.com/Gary-Strauss/NASDAQ100_Constituents/master/data/nasdaq100_constituents.json'
 };
 let indexPending=false,indexError='',indexRequestSeq=0;
 let usCapUpdated=0,usCapDownload=null,usCapPending=false,usCapFailure='',usCapSequence=0;
 const SOURCE_DEFAULT={id:'injective-protocol',name:'Injective',symbol:'INJ'};
 const TARGET_DEFAULT={id:'bitcoin',name:'Bitcoin',symbol:'BTC'};
 const state={
   source:{...SOURCE_DEFAULT},target:{...TARGET_DEFAULT},kind:'crypto',
   quotes:new Map(),lastRemote:0,busy:false,chosenWallet:null,walletSnapshotSignature:'',
   sourceSearchTimer:0,targetSearchTimer:0,searchTicket:{source:0,target:0},
   quoteError:'',resultAge:0,results:{source:[],target:[]},language:'it'
 };
 const translations={
  subTitle:['Confronta market cap e valore del wallet','Compare market caps and wallet value'],
  title:['Quanto potrebbe valere?','How much could it be worth?'],
  intro:['Scegli A e B: market cap e valore del wallet INJ calcolati automaticamente.','Select A and B: market caps and INJ wallet value calculated automatically.'],
  starting:['ASSET DI PARTENZA','SOURCE ASSET'],
  sourceHeading:['Asset A','Asset A'],
  sourceSearchLabel:['Cerca crypto per nome o simbolo','Search crypto by name or ticker'],
  sourceCap:['MARKET CAP A','MARKET CAP A'],
  sourcePrice:['PREZZO ATTUALE','CURRENT PRICE'],
  sourceSupply:['OFFERTA CIRCOLANTE','CIRCULATING SUPPLY'],
  target:['MARKET CAP DI RIFERIMENTO','REFERENCE MARKET CAP'],
  targetHeading:['Asset B','Asset B'],
  crypto:['Crypto','Crypto'],stock:['Azione','Stock'],index:['Indice','Index'],
  targetSearchLabel:['Cerca la crypto di riferimento','Search reference cryptocurrency'],
  manualNameLabel:['Cerca per nome o ticker','Search by name or ticker'],
  manualCapLabel:['Capitalizzazione di riferimento','Reference capitalization'],
  manualScale:['Unità · USD','Units · USD'],
  billions:['Miliardi (B)','Billions (B)'],trillions:['Migliaia di miliardi (T)','Trillions (T)'],
  millions:['Milioni (M)','Millions (M)'],fullUsd:['USD interi','Full USD'],
  manualWarning:['Market cap calcolata automaticamente.','Market cap calculated automatically.'],
  targetCap:['MARKET CAP B','MARKET CAP B'],
  autoSource:['Dati crypto CoinGecko · USD','CoinGecko crypto data · USD'],
  scenario:['Scenario a pari market cap','Equal-market-cap scenario'],
  moreDetails:['Mostra i dettagli del calcolo','Show calculation details'],
  ready:['ANALISI','ANALYSIS'],multiples:['MOLTIPLICATORE','MULTIPLIER'],
  multipleHelp:['Rapporto fra capitalizzazioni','Ratio of market capitalizations'],
  projectedPrice:['PREZZO TEORICO','THEORETICAL PRICE'],
  supplyAssumption:['Offerta circolante invariata','Assuming unchanged circulating supply'],
  priceChange:['VARIAZIONE TEORICA','THEORETICAL CHANGE'],
  vsNow:['Rispetto al prezzo attuale','Versus current price'],
  disclaimer:['Simulazione matematica: non prevede il prezzo futuro, non considera variazioni dell’offerta, liquidità o impatto di mercato.','Mathematical simulation, not a forecast; excludes supply changes, liquidity and market impact.'],
  portfolioTitle:['Valore del wallet selezionato','Selected wallet value'],
  holdings:['INJ POSSEDUTI','INJ HOLDINGS'],
  included:['Disponibili + staking + reward','Available + staked + rewards'],
  currentWallet:['VALORE ATTUALE · USD','CURRENT VALUE · USD'],
  walletNowHelp:['INJ al prezzo attuale','INJ at current price'],
  futureWallet:['VALORE IPOTETICO · USD','THEORETICAL VALUE · USD'],
  walletFutureHelp:['Se INJ raggiungesse la market cap selezionata','If INJ reached the reference market cap'],
  walletNote:['Il controvalore ipotetico si calcola quando la crypto di partenza è INJ. Il wallet non viene modificato.','The hypothetical wallet value applies when INJ is the source crypto. The wallet is never modified.'],
  sources:['CoinGecko crypto; azioni USA Nasdaq giornaliero; stime parziali per indici supportati.','CoinGecko crypto; daily Nasdaq US equities; partial supported-index estimates.']
 };
 const language=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'?'en':'it'}catch(_){return 'it'}};
 const english=()=>language()==='en';
 const t=(it,en)=>english()?en:it;
 const locale=()=>english()?'en-US':'it-IT';
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const number=n=>{if(n==null||n==='')return NaN;const v=Number(n);return Number.isFinite(v)?v:NaN};
 const fmt=(n,digits=2)=>Number.isFinite(n)?new Intl.NumberFormat(locale(),{maximumFractionDigits:digits}).format(n):'—';
 const money=n=>{
  if(!Number.isFinite(n)||n<0)return '—';
  if(n>=1e12)return '$'+fmt(n/1e12,3)+'T';
  if(n>=1e9)return '$'+fmt(n/1e9,3)+'B';
  if(n>=1e6)return '$'+fmt(n/1e6,3)+'M';
  if(n>=1e3)return '$'+fmt(n,2);
  if(n>=1)return '$'+fmt(n,4);
  return '$'+fmt(n,8);
 };
 const priceMoney=n=>positive(n)?'$'+fmt(n,n<.0001?12:n<1?8:n<100?5:2):'—';
 const set=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=String(value)};
 const assetSafe=asset=>({
  id:String(asset.id||'').replace(/[^a-z0-9-]/gi,'').slice(0,100),
  name:String(asset.name||'').slice(0,80),
  symbol:String(asset.symbol||'').replace(/[^\w.]/g,'').slice(0,18).toUpperCase()
 });
 function parseUserNumber(raw){
  let s=String(raw||'').replace(/[^\d.,\-]/g,'');
  if(!s||s==='-'||s.startsWith('-'))return NaN;
  const c=s.lastIndexOf(','),d=s.lastIndexOf('.');
  if(c>=0&&d>=0){
    if(c>d)s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(c>=0){s=/^\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.');}
  else if(d>=0){s=/^\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,''):s;}
  return Number(s);
 }
 function localize(){
  document.documentElement.lang=language();
  document.querySelectorAll('[data-t]').forEach(node=>{
   const pair=translations[node.dataset.t];if(pair)node.textContent=pair[english()?1:0];
  });
  $('comparisonBack').setAttribute('aria-label',t('Torna alla Home','Return Home'));
  $('comparisonBack').title=t('Torna alla Home','Return Home');
  $('capSourceSearch').placeholder=t('INJ · Injective','INJ · Injective');
  $('capTargetSearch').placeholder=t('BTC · Bitcoin','BTC · Bitcoin');
  $('capManualName').placeholder=t('Apple, AAPL, S&P 500…','Apple, AAPL, S&P 500…');
  $('capManualCap').placeholder=t('es. 3000 (in miliardi)','e.g. 3000 (in billions)');
  render();
  if(!$('capManualSuggestions').hidden)renderManualSuggestions();
 }
 async function fetchJson(url,timeoutMs=10000){
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
   const response=await fetch(url,{signal:ctrl.signal,cache:'no-store',headers:{accept:'application/json'}});
   if(!response.ok)throw Error('CoinGecko HTTP '+response.status);
   return await response.json();
  }finally{clearTimeout(timeout);}
 }
 function normalizeMarket(row){
  const id=String(row?.id||'').toLowerCase(),cap=number(row?.market_cap),price=number(row?.current_price),supply=number(row?.circulating_supply);
  if(!id||!positive(cap)||!positive(price))return null;
  return {id,cap,price,supply:positive(supply)?supply:NaN,updated:Date.now(),name:String(row?.name||id),symbol:String(row?.symbol||'').toUpperCase()};
 }
 function restoreQuotes(){
  try{
   const cache=JSON.parse(localStorage.getItem(COIN_CACHE)||'null');
   if(!cache||!Array.isArray(cache.rows))return;
   if(!cache.savedAt||Date.now()-cache.savedAt>12*3600000)return;
   for(const row of cache.rows){
    if(row&&positive(row.cap)&&positive(row.price))state.quotes.set(row.id,{...row,fromCache:true});
   }
  }catch(_){}
 }
 function persistQuotes(){
  try{localStorage.setItem(COIN_CACHE,JSON.stringify({savedAt:Date.now(),rows:[...state.quotes.values()].slice(0,30)}));}catch(_){}
 }
 async function refreshQuotes(force=false){
  if(state.busy)return;
  const allIds=[state.source.id,'injective-protocol'];
  if(state.kind==='crypto')allIds.push(state.target.id);
  const ids=[...new Set(allIds)].filter(Boolean);
  const stale=ids.some(id=>!state.quotes.has(id)||Date.now()-state.quotes.get(id).updated>100000);
  if(!force&&!stale)return;
  state.busy=true;
  state.quoteError='';
  renderStatus();
  try{
   const uri=API+'/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids.join(','))+'&order=market_cap_desc&per_page=20&page=1&sparkline=false';
   const result=await fetchJson(uri);
   if(!Array.isArray(result)||!result.length)throw Error('No CoinGecko market quotes');
   for(const row of result){
    const normalized=normalizeMarket(row);
    if(normalized)state.quotes.set(normalized.id,normalized);
   }
   state.lastRemote=Date.now();persistQuotes();
  }catch(error){state.quoteError=String(error?.message||error);}
  finally{state.busy=false;render();}
 }
 function quote(id){return state.quotes.get(id)||null;}
 function recentCrypto(id){const q=quote(id);return q&&Date.now()-q.updated<180000&&!q.fromCache;}
 function renderStatus(){
  const needed=[state.source.id,...(state.kind==='crypto'?[state.target.id]:[])];
  const fresh=state.kind==='crypto'&&needed.every(id=>recentCrypto(id));
  const cached=needed.some(id=>quote(id));
  const status=$('comparisonStatus');
  status.classList.toggle('live',fresh);
  status.classList.toggle('cache',!fresh&&cached);
  set('comparisonStatusText',state.busy?'SYNC':fresh?'LIVE':cached?t('SALVATO','CACHED'):t('ATTESA','WAITING'));
 }

 function tickerKey(symbol){return String(symbol||'').trim().toUpperCase().replace(/\./g,'/');}
 function isUsEquity(){
  return state.kind==='stock'&&manualPicked?.kind==='stock';
 }
 // Public Nasdaq screener snapshot, republished on weekdays via GitHub.
 // This is updated daily, not a live exchange tick.
 async function loadUsStockCaps(){
  if(usMarketCaps.size&&Date.now()-usCapUpdated<20*60_000)return;
  if(usCapDownload)return usCapDownload;
  usCapDownload=(async()=>{
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12500);
   try{
    const response=await fetch(NASDAQ_URL,{cache:'no-store',signal:abort.signal});
    if(!response.ok)throw Error('Nasdaq '+response.status);
    const csv=await response.text(),fresh=new Map(),names=new Map();
    const pattern=/^([^,]+),(?:"((?:[^"]|"")*)"|([^,]*)),[^,]*,([^,\r\n]+)/;
    for(const line of csv.split(/\r?\n/).slice(1)){
     const match=line.match(pattern);
     if(!match)continue;
     const symbol=tickerKey(match[1]),cap=Number(match[4]),name=String(match[2]||match[3]||symbol).replace(/""/g,'"');
     if(symbol&&positive(cap)){fresh.set(symbol,cap);names.set(symbol,name);}
    }
    if(fresh.size<100)throw Error('Incomplete Nasdaq CSV');
    usMarketCaps.clear();usStockNames.clear();
    for(const [symbol,cap] of fresh)usMarketCaps.set(symbol,cap);
    for(const [symbol,name] of names)usStockNames.set(symbol,name);
    usCapUpdated=Date.now();usCapFailure='';
   }finally{clearTimeout(timer);usCapDownload=null;}
  })();
  return usCapDownload;
 }
 async function updateUsStock(){
  const sequence=++usCapSequence;
  if(!isUsEquity()){usCapPending=false;render();return;}
  const symbol=tickerKey(manualPicked.symbol);
  usCapPending=true;usCapFailure='';render();
  try{await loadUsStockCaps();
   if(sequence!==usCapSequence)return;
   if(!usMarketCaps.has(symbol))usCapFailure='Ticker unavailable';
  }catch(err){if(sequence===usCapSequence)usCapFailure=String(err?.message||err);}
  finally{if(sequence===usCapSequence){usCapPending=false;render();}}
 }

 /* An index value in points is not a market cap. Estimate supported indices
    as the sum of covered constituent stock caps, from DAILY source snapshots. */
 async function estimateIndex(){
  const request=++indexRequestSeq,selected=manualPicked;
  if(state.kind!=='index'||!selected){indexPending=false;render();return;}
  const url=INDEX_DATASETS[selected.symbol];
  if(!url){indexPending=false;render();return;}
  const prior=estimatedIndexCaps.get(selected.symbol);
  if(prior&&Date.now()-prior.updated<20*60000){render();return;}
  indexPending=true;indexError='';render();
  try{
   await loadUsStockCaps();
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),14000);
   let raw='';
   try{const response=await fetch(url,{signal:abort.signal,cache:'no-store'});
    if(!response.ok)throw Error('Index dataset '+response.status);
    raw=await response.text();
   }finally{clearTimeout(timer)}
   if(request!==indexRequestSeq)return;
   const symbols=selected.symbol==='SPX'
     ?raw.split(/\r?\n/).slice(1).map(line=>line.split(',')[0]).filter(Boolean)
     :(JSON.parse(raw)||[]).map(item=>item.Ticker).filter(Boolean);
   if(symbols.length<70)throw Error('Missing constituents');
   const unique=new Map();let matched=0;
   for(const ticker of symbols){
    const key=tickerKey(ticker),cap=usMarketCaps.get(key);
    if(!positive(cap))continue;matched++;
    const issuer=({'GOOG':'GOOGL','FOX':'FOXA','NWS':'NWSA'})[key]||key;
    unique.set(issuer,Math.max(unique.get(issuer)||0,cap));
   }
   if(matched/symbols.length<.85)throw Error('Insufficient coverage');
   const cap=[...unique.values()].reduce((sum,v)=>sum+v,0);
   if(!positive(cap))throw Error('Empty capitalization');
   estimatedIndexCaps.set(selected.symbol,{cap,matched,total:symbols.length,updated:Date.now()});
  }catch(error){if(request===indexRequestSeq)indexError=String(error?.message||error);}
  finally{if(request===indexRequestSeq){indexPending=false;render();}}
 }
 function marketCapSource(ref){
  const status=$('capStockStatus'),fields=$('capManualValues');
  if(!status||!fields)return;
  fields.hidden=true;
  status.hidden=state.kind==='crypto';
  if(state.kind==='crypto')return;
  status.textContent=state.kind==='stock'?
    usCapPending?t('Recupero capitalizzazione in corso…','Fetching capitalization…'):
    positive(ref.cap)?t('Nasdaq · rilevazione giornaliera (non tick live)','Nasdaq · daily snapshot (not live ticks)'):
    t('Dato non disponibile: nessun inserimento manuale','Unavailable: no manual data input'):
    indexPending?t('Calcolo capitalizzazione dei componenti…','Calculating constituent capitalization…'):
    positive(ref.cap)?t('Stima parziale dei componenti · dato giornaliero','Partial constituents estimate · daily snapshot'):
    indexError?t('Indice non disponibile · riprova più tardi','Index unavailable · retry later'):
    t('Stima automatica non disponibile per questo indice','Automatic estimate not available for this index');
 }
 function currentReference(){
  if(state.kind==='crypto'){
   const q=quote(state.target.id);
   return {cap:q?.cap||NaN,name:state.target.name,symbol:state.target.symbol,manual:false,source:'CoinGecko'};
  }
  if(!manualPicked)return {cap:NaN,name:'',symbol:'',manual:false,source:'Unavailable'};
  if(state.kind==='stock'){
   const cap=usMarketCaps.get(tickerKey(manualPicked.symbol));
   return {cap:positive(cap)?cap:NaN,name:manualPicked.name,symbol:manualPicked.symbol,manual:false,source:'Nasdaq'};
  }
  const row=estimatedIndexCaps.get(manualPicked.symbol);
  return {cap:row?.cap||NaN,name:manualPicked.name,symbol:manualPicked.symbol,manual:false,source:row?'IndexBasket':'Unavailable',coverage:row};
 }
 function selectedWallet(){
  try{
   if(window.parent!==window&&window.parent.location.origin===location.origin&&typeof window.parent.INJ_GET_SELECTED_WALLET_SNAPSHOT==='function'){
    const parentData=window.parent.INJ_GET_SELECTED_WALLET_SNAPSHOT();
    if(parentData?.address)return parentData;
   }
  }catch(_){}
  let address='';
  try{address=localStorage.getItem(SELECTED_KEY)||localStorage.getItem('inj_monitor_address')||'';}catch(_){}
  if(!address)return null;
  try{
   const wallets=JSON.parse(localStorage.getItem('inj_monitor_wallets_v1')||'[]');
   const rows=JSON.parse(localStorage.getItem('inj_monitor_summaries_v1')||'{}');
   const wallet=Array.isArray(wallets)?wallets.find(w=>w.address===address):null;
   const row=rows?.[address];
   if(!wallet)return null;
   const inj=Number(row?.total);
   return {address,label:wallet.label||'Wallet',total:Number.isFinite(inj)&&inj>=0?inj:NaN,
    updated:Number(row?.updated)||0,available:Number(row?.available)||0,staked:Number(row?.staked)||0,rewards:Number(row?.rewards)||0};
  }catch(_){return null;}
 }
 function privacyEnabled(){try{return localStorage.getItem('inj_monitor_privacy')==='1'}catch(_){return false}}
 function renderWallet(multiplier){
  const wallet=selectedWallet();
  const sourceInj=state.source.id==='injective-protocol';
  const currentInj=quote('injective-protocol')?.price||NaN;
  const count=number(wallet?.total);
  const known=wallet&&Number.isFinite(count)&&count>=0&&wallet.updated>0;
  const privateOn=privacyEnabled();
  const now=known&&positive(currentInj)?count*currentInj:NaN;
  const future=sourceInj&&positive(multiplier)&&Number.isFinite(now)?now*multiplier:NaN;
  set('capWalletName',wallet?.label||t('Nessun wallet selezionato','No selected wallet'));
  const fresh=known&&Date.now()-wallet.updated<120000;
  set('capWalletFresh',fresh?'LIVE':known?t('DATI SALVATI','CACHED'):t('IN ATTESA','WAITING'));
  $('capWalletFresh').classList.toggle('live',fresh);
  set('capWalletInj',known?(privateOn?'••••':fmt(count,4)+' INJ'):'—');
  set('capWalletNow',Number.isFinite(now)?(privateOn?'••••':money(now)):'—');
  set('capWalletFuture',Number.isFinite(future)?(privateOn?'••••':money(future)):'—');
  set('capWalletFutureHelp',sourceInj?t('Se INJ raggiungesse il riferimento','If INJ reached the reference cap'):t('Disponibile solo con INJ come crypto di partenza','Available when source crypto is INJ'));
  set('capWalletNote',privateOn?t('Valori nascosti nelle preferenze Privacy.','Values hidden by Privacy settings.'):
    !sourceInj?t('Il wallet contiene INJ: per il valore teorico seleziona Injective come crypto di partenza.','This wallet holds INJ. Select Injective as the source to see its hypothetical value.'):
    t('Snapshot del wallet selezionato; il valore teorico riguarda solo gli INJ (staking, liquidità e reward), non eventuali altri token.','Selected wallet snapshot; this scenario values INJ holdings only (staked, liquid and rewards), not other tokens.'));
 }
 function render(){
  const source=quote(state.source.id),ref=currentReference();
  set('capSourceSymbol',state.source.symbol);set('capSourceName',state.source.name);set('capSourceId',state.source.id);
  set('capTargetSymbol',state.target.symbol);set('capTargetName',state.target.name);set('capTargetId',state.target.id);
  set('capSourceCap',money(source?.cap));set('capSourcePrice',priceMoney(source?.price));
  set('capSourceSupply',positive(source?.supply)?fmt(source.supply,0)+' '+state.source.symbol:'—');
  set('capTargetCap',money(ref.cap));
  set('capTargetMeta',ref.source==='Nasdaq'?t('Nasdaq · snapshot giornaliero · USD','Nasdaq · daily snapshot · USD'):
     ref.source==='IndexBasket'?t('Stima '+ref.coverage.matched+'/'+ref.coverage.total+' società · giornaliero','Estimate '+ref.coverage.matched+'/'+ref.coverage.total+' constituents · daily'):
     ref.source==='CoinGecko'?'CoinGecko · USD'+(recentCrypto(state.target.id)?' · LIVE':' · '+t('salvato','cached')):
     t('In attesa del dato automatico','Waiting for automatic data'));
   marketCapSource(ref);
   const can=source&&positive(source.cap)&&positive(source.price)&&positive(ref.cap);
  const multiplier=can?ref.cap/source.cap:NaN;
  const theoretical=positive(multiplier)?source.price*multiplier:NaN;
  const change=positive(multiplier)?(multiplier-1)*100:NaN;
  set('capMultiple',positive(multiplier)?fmt(multiplier,multiplier<1?4:2)+'×':'—');
  set('capProjectedPrice',priceMoney(theoretical));
  set('capPriceChange',Number.isFinite(change)?(change>0?'+':'')+fmt(change,2)+'%':'—');
  $('capPriceChange').className=change>0?'up':change<0?'down':'';
  $('capScenarioState').textContent=can?t('CALCOLATO','CALCULATED'):t('IN ATTESA DATI','WAITING FOR DATA');
  $('capScenarioState').classList.toggle('ready',can);
  set('capBarSourceLabel',state.source.symbol);
  set('capBarTargetLabel',state.kind==='crypto'?state.target.symbol:(ref.symbol||'—'));
  set('capBarSourceValue',money(source?.cap));
  set('capBarTargetValue',money(ref.cap));
  const max=can?Math.max(source.cap,ref.cap):NaN;
  $('capBarSource').style.width=positive(max)?Math.max(1,source.cap/max*100)+'%':'0%';
  $('capBarTarget').style.width=positive(max)?Math.max(1,ref.cap/max*100)+'%':'0%';
  $('capUpdatedAt').textContent=state.lastRemote?
   t('Crypto aggiornate ','Crypto updated ')+new Date(state.lastRemote).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'}):
   t('In attesa delle quotazioni','Waiting for market quotes');
  renderWallet(multiplier);
  renderStatus();
 }
 function buildOptions(type,results){
  const host=$(type==='source'?'capSourceResults':'capTargetResults');
  host.replaceChildren();
  if(!results.length){
   const msg=document.createElement('div');msg.className='cap-search-message';msg.textContent=t('Nessun risultato trovato','No results found');host.append(msg);
  }else for(const raw of results.slice(0,9)){
   const item=assetSafe(raw);if(!item.id)continue;
   const btn=document.createElement('button');
   btn.type='button';btn.className='cap-search-item';btn.setAttribute('role','option');
   const symbol=document.createElement('span');symbol.textContent=item.symbol;
   const name=document.createElement('span');name.textContent=item.name;
   btn.append(symbol,name);
   btn.addEventListener('click',()=>{
    if(type==='source'){state.source=item;$('capSourceSearch').value=item.symbol+' · '+item.name;}
    else{state.target=item;$('capTargetSearch').value=item.symbol+' · '+item.name;}
    host.hidden=true;render();void refreshQuotes(true);
   });
   host.append(btn);
  }
  host.hidden=false;
 }
 async function search(type,term){
  const ticket=++state.searchTicket[type];
  const input=$(type==='source'?'capSourceSearch':'capTargetSearch');
  const spin=$(type==='source'?'capSourceSpin':'capTargetSpin');
  const host=$(type==='source'?'capSourceResults':'capTargetResults');
  if(!term.trim()||term.trim().length<2){host.hidden=true;spin.classList.remove('busy');return;}
  spin.classList.add('busy');
  try{
   const response=await fetchJson(API+'/search?query='+encodeURIComponent(term.trim()),10000);
   if(state.searchTicket[type]!==ticket)return;
   if(input.value.trim()!==term.trim())return;
   const cryptos=Array.isArray(response?.coins)?response.coins:[];
   buildOptions(type,cryptos);
  }catch(_){
   if(state.searchTicket[type]===ticket){
    host.replaceChildren();
    const msg=document.createElement('div');msg.className='cap-search-message';msg.textContent=t('Ricerca non disponibile, riprova tra poco','Search unavailable. Please retry shortly.');
    host.append(msg);host.hidden=false;
   }
  }finally{if(state.searchTicket[type]===ticket)spin.classList.remove('busy');}
 }
 function searchDebounced(type){
  const input=$(type==='source'?'capSourceSearch':'capTargetSearch');
  const key=type==='source'?'sourceSearchTimer':'targetSearchTimer';
  clearTimeout(state[key]);
  state[key]=setTimeout(()=>void search(type,input.value),350);
 }
 function setKind(kind){
  if(!['crypto','stock','index'].includes(kind))return;
  const kindChanged=state.kind!==kind;
  state.kind=kind;
  if(kindChanged){
    $('capManualName').value='';
    $('capManualCap').value='';
    $('capManualSelected').hidden=true;
    $('capManualSuggestions').hidden=true;
    manualPicked=null;
    usCapSequence++;usCapPending=false;indexRequestSeq++;indexPending=false;
    $('capManualName').setAttribute('aria-expanded','false');
  }
  $('capTargetCryptoPanel').hidden=kind!=='crypto';
  $('capTargetManualPanel').hidden=kind==='crypto';
  document.querySelectorAll('[data-target-kind]').forEach(btn=>{
   const active=btn.dataset.targetKind===kind;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
  });
  $('capManualName').placeholder=kind==='stock'?t('Apple, Nvidia, Microsoft…','Apple, Nvidia, Microsoft…'):t('S&P 500, Nasdaq-100…','S&P 500, Nasdaq-100…');
  $('capManualHint').textContent=kind==='stock'?
   t('Capitalizzazione automatica delle azioni USA · snapshot giornaliero Nasdaq.','Automatic US stock caps · Nasdaq daily snapshot.'):
   t('Stima automatica per S&P 500 e Nasdaq-100: somma dei componenti disponibili, dato giornaliero.','Automatic S&P 500 / Nasdaq-100 estimate: available constituents, daily snapshot.');
  if(kind==='stock')void loadUsStockCaps().then(()=>{render();if(document.activeElement===$('capManualName'))renderManualSuggestions();}).catch(()=>render());
  if(kind==='crypto')hideManualSuggestions();
  render();if(kind==='crypto')void refreshQuotes();
 }

 /* Offline type-ahead for major equities and indexes: company names and
    ticker symbols only. No market caps are bundled or invented. Free-form
    lookup remains available for instruments outside this catalog. */
 const securityCatalog={
  stock:[
   ['AAPL','Apple','NASDAQ','iphone mac'],['MSFT','Microsoft','NASDAQ','windows azure'],
   ['NVDA','NVIDIA','NASDAQ','nvidia ai'],['GOOGL','Alphabet (Google)','NASDAQ','google'],
   ['AMZN','Amazon','NASDAQ','aws'],['META','Meta Platforms','NASDAQ','facebook instagram'],
   ['TSLA','Tesla','NASDAQ','elon musk'],['BRK.B','Berkshire Hathaway','NYSE','buffett berkshire'],
   ['AVGO','Broadcom','NASDAQ','broadcom'],['TSM','Taiwan Semiconductor','NYSE','tsmc'],
   ['LLY','Eli Lilly','NYSE','pharma'],['WMT','Walmart','NYSE','retail'],
   ['JPM','JPMorgan Chase','NYSE','bank'],['V','Visa','NYSE','payments'],
   ['MA','Mastercard','NYSE','payments'],['XOM','Exxon Mobil','NYSE','energy'],
   ['JNJ','Johnson & Johnson','NYSE','healthcare'],['ORCL','Oracle','NYSE','cloud'],
   ['NFLX','Netflix','NASDAQ','streaming'],['COST','Costco','NASDAQ','wholesale'],
   ['AMD','Advanced Micro Devices','NASDAQ','chips'],['PLTR','Palantir Technologies','NASDAQ','ai'],
   ['CRM','Salesforce','NYSE','saas'],['UBER','Uber Technologies','NYSE','mobility'],
   ['DIS','Walt Disney','NYSE','disney'],['KO','Coca-Cola','NYSE','coca cola'],
   ['PEP','PepsiCo','NASDAQ','pepsi'],['NKE','Nike','NYSE','apparel'],
   ['MCD','McDonald’s','NYSE','restaurants'],['BA','Boeing','NYSE','aerospace'],
   ['INTC','Intel','NASDAQ','microchip'],['PYPL','PayPal','NASDAQ','payments'],
   ['SHOP','Shopify','NYSE','ecommerce'],['COIN','Coinbase Global','NASDAQ','crypto exchange'],
   ['MSTR','Strategy (MicroStrategy)','NASDAQ','bitcoin microstrategy'],
   ['HOOD','Robinhood Markets','NASDAQ','trading'],['SQ','Block','NYSE','square'],
   ['ARM','Arm Holdings','NASDAQ','semiconductors'],['QCOM','Qualcomm','NASDAQ','chip'],
   ['TXN','Texas Instruments','NASDAQ','semiconductor'],['CAT','Caterpillar','NYSE','industry'],
   ['GE','GE Aerospace','NYSE','aircraft'],['IBM','IBM','NYSE','technology'],
   ['SAP','SAP','XETRA','germany software'],['ASML','ASML Holding','EURONEXT','semiconductors netherlands'],
   ['MC','LVMH','EURONEXT','louis vuitton luxury'],['OR','L’Oréal','EURONEXT','loreal'],
   ['RMS','Hermès','EURONEXT','hermes luxury'],['AIR','Airbus','EURONEXT','aircraft'],
   ['SHEL','Shell','LSE','energy'],['AZN','AstraZeneca','LSE','pharma'],
   ['HSBA','HSBC Holdings','LSE','bank'],['BP','BP','LSE','petroleum'],
   ['RACE','Ferrari','NYSE','ferrari automotive'],['STLA','Stellantis','NYSE','fiat jeep'],
   ['ENI','Eni','MIL','italia energia'],['ENEL','Enel','MIL','italia elettrica'],
   ['ISP','Intesa Sanpaolo','MIL','italia banca'],['UCG','UniCredit','MIL','italia banca'],
   ['G','Assicurazioni Generali','MIL','italia insurance'],['PST','Poste Italiane','MIL','italia poste'],
   ['MONC','Moncler','MIL','italia fashion'],['TIT','Telecom Italia','MIL','tim'],
   ['PIRC','Pirelli','MIL','italia tires'],['TRN','Terna','MIL','italia electricity'],
   ['FINE','FinecoBank','MIL','italia finance'],['STM','STMicroelectronics','MIL','semiconductors'],
   ['NOVN','Novartis','SIX','swiss pharma'],['NESN','Nestlé','SIX','nestle foods'],
   ['ROG','Roche','SIX','swiss pharma'],['7203','Toyota Motor','TSE','japan automotive'],
   ['6758','Sony Group','TSE','japan entertainment'],['9984','SoftBank Group','TSE','japan telecom'],
   ['0700','Tencent Holdings','HKEX','china technology'],['9988','Alibaba Group','HKEX','baba ecommerce'],
   ['BABA','Alibaba ADR','NYSE','alibaba'],['BIDU','Baidu','NASDAQ','china search'],
   ['NVO','Novo Nordisk','NYSE','obesity pharma'],['PFE','Pfizer','NYSE','pharma'],
   ['ABBV','AbbVie','NYSE','pharma'],['PG','Procter & Gamble','NYSE','consumer'],
   ['ABNB','Airbnb','NASDAQ','travel'],['SPOT','Spotify','NYSE','music']
  ],
  index:[
   ['SPX','S&P 500','INDEX','sp500 standard poors usa us500'],
   ['NDX','Nasdaq-100','INDEX','nasdaq 100 us tech nas100'],
   ['IXIC','Nasdaq Composite','INDEX','nasdaq composite technology'],
   ['DJI','Dow Jones Industrial Average','INDEX','dow jones djia wall street'],
   ['RUT','Russell 2000','INDEX','russell small cap'],
   ['VIX','CBOE Volatility Index','INDEX','volatility fear vix'],
   ['FTSEMIB','FTSE MIB','INDEX','italia borsa italiana milano it40 mib'],
   ['DAX','DAX 40','INDEX','germany german germany40 german40'],
   ['CAC','CAC 40','INDEX','france paris fra40'],
   ['FTSE','FTSE 100','INDEX','uk london footsie'],
   ['STOXX50E','EURO STOXX 50','INDEX','europe eurozone'],
   ['SXXP','STOXX Europe 600','INDEX','europe 600'],
   ['N225','Nikkei 225','INDEX','japan tokyo'],
   ['TOPIX','TOPIX','INDEX','japan japan market'],
   ['HSI','Hang Seng Index','INDEX','hong kong'],
   ['CSI300','CSI 300','INDEX','china shanghai shenzhen'],
   ['000001','Shanghai Composite','INDEX','shanghai china'],
   ['NIFTY50','NIFTY 50','INDEX','india nifty'],
   ['SENSEX','BSE Sensex','INDEX','india bombay'],
   ['IBOV','Ibovespa','INDEX','brazil sao paulo'],
   ['TSX','S&P/TSX Composite','INDEX','canada toronto'],
   ['ASX200','S&P/ASX 200','INDEX','australia'],
   ['MSCIWORLD','MSCI World','INDEX','global developed world'],
   ['MSCIEmerging','MSCI Emerging Markets','INDEX','emerging markets'],
   ['MSCIACWI','MSCI ACWI','INDEX','all country world'],
   ['SMI','Swiss Market Index','INDEX','switzerland swiss']
  ]
 };
 const normSearch = v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 let manualPicked=null;
 function manualChoices(){
   const q=normSearch($('capManualName').value);
   const pool=state.kind==='index'?securityCatalog.index.filter(row=>Boolean(INDEX_DATASETS[row[0]])):
   state.kind==='stock'&&usMarketCaps.size?
     [...usMarketCaps.keys()].map(symbol=>[symbol,usStockNames.get(symbol)||symbol,'US','']):
     securityCatalog.stock.filter(row=>['NASDAQ','NYSE'].includes(row[2]));
   if(!q)return pool.slice(0,7);
   const parts=q.split(/\s+/).filter(Boolean);
   return pool.map(entry=>{
     const [symbol,name,market,aliases]=entry;
     const search=normSearch(symbol+' '+name+' '+market+' '+aliases);
     if(!parts.every(part=>search.includes(part)))return {entry,score:-1};
     const code=normSearch(symbol),title=normSearch(name);
     const score=(code===q?1000:0)+(code.startsWith(q)?250:0)+(title.startsWith(q)?100:0)+parts.length*15;
     return {entry,score};
   }).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.entry[1].localeCompare(b.entry[1])).slice(0,9).map(x=>x.entry);
 }
 function hideManualSuggestions(){
   const host=$('capManualSuggestions');
   if(host)host.hidden=true;
   $('capManualName')?.setAttribute('aria-expanded','false');
 }
 function pickManual(entry){
   const [symbol,name,market]=entry;
   manualPicked={symbol,name,market,kind:state.kind};
   $('capManualName').value=symbol+' · '+name;
   $('capManualSelected').hidden=false;
   set('capManualTicker',symbol);
   set('capManualSelectedName',name+' · '+market);
   // The next symbol must never inherit a prior company's market cap.
   $('capManualCap').value='';
   $('capManualScale').value='1000000000';
   hideManualSuggestions();
   render();
   if(state.kind==='stock')void updateUsStock();
   else void estimateIndex();
 }
 function renderManualSuggestions(){
   if(state.kind==='crypto')return hideManualSuggestions();
   const host=$('capManualSuggestions');
   host.replaceChildren();
   const items=manualChoices();
   if(!items.length){
     const empty=document.createElement('div');
     empty.className='cap-search-message';
     empty.textContent=t('Nessun suggerimento. Puoi comunque inserire un nome e una market cap verificata.','No suggestions. You can still enter any name and a verified market cap.');
     host.append(empty);
   }
   items.forEach((entry,index)=>{
     const btn=document.createElement('button');
     btn.type='button';btn.className='cap-search-item';btn.setAttribute('role','option');
     btn.id='capManualOption'+index;
     btn.setAttribute('aria-label',entry[1]+' '+entry[0]);
     const ticker=document.createElement('span');ticker.textContent=entry[0];
     const label=document.createElement('span');label.textContent=entry[1]+' · '+entry[2];
     btn.append(ticker,label);
     btn.addEventListener('click',()=>pickManual(entry));
     host.append(btn);
   });
   host.hidden=false;
   $('capManualName').setAttribute('aria-expanded','true');
 }
 function bindManualSuggestions(){
   const input=$('capManualName');
   const host=$('capManualSuggestions');
   input.addEventListener('focus',renderManualSuggestions);
   input.addEventListener('input',()=>{
     if(manualPicked){
       manualPicked=null;
       usCapSequence++;usCapPending=false;indexRequestSeq++;indexPending=false;
       $('capManualSelected').hidden=true;
       $('capManualCap').value='';
     }
     renderManualSuggestions();
   });
   input.addEventListener('keydown',event=>{
     if(event.key==='Escape'){hideManualSuggestions();return;}
     if(event.key==='ArrowDown'){
       if(host.hidden)renderManualSuggestions();
       const first=host.querySelector('.cap-search-item');
       if(first){event.preventDefault();first.focus({preventScroll:true});}
     }else if(event.key==='Enter'&&!host.hidden){
       const first=host.querySelector('.cap-search-item');
       if(first){event.preventDefault();first.click();}
     }
   });
   host.addEventListener('keydown',event=>{
     if(!['ArrowDown','ArrowUp','Escape','Enter'].includes(event.key))return;
     const options=[...host.querySelectorAll('.cap-search-item')];
     const index=options.indexOf(document.activeElement);
     if(event.key==='Escape'){event.preventDefault();hideManualSuggestions();input.focus({preventScroll:true});}
     else if(event.key==='Enter'&&index>=0){event.preventDefault();options[index].click();}
     else if(event.key==='ArrowDown'&&options.length){event.preventDefault();options[Math.min(index+1,options.length-1)].focus({preventScroll:true});}
     else if(event.key==='ArrowUp'){event.preventDefault();if(index>0)options[index-1].focus({preventScroll:true});else input.focus({preventScroll:true});}
   });
   document.addEventListener('pointerdown',event=>{
     if(!host.hidden && !host.contains(event.target) && !input.contains(event.target))hideManualSuggestions();
   },{passive:true});
 }

 function boot(){
  restoreQuotes();localize();setKind('crypto');render();
  $('comparisonBack').addEventListener('click',event=>{
   event.preventDefault();
   if(window.parent!==window&&window.parent.location.origin===location.origin){
    window.parent.postMessage({type:'injnode:section:home'},location.origin);
   }else location.assign('./index.html');
  });
  for(const type of ['source','target']){
   const input=$(type==='source'?'capSourceSearch':'capTargetSearch');
   input.addEventListener('input',()=>searchDebounced(type));
   input.addEventListener('keydown',e=>{
    if(e.key==='Escape'){const host=$(type==='source'?'capSourceResults':'capTargetResults');host.hidden=true;}
    if(e.key==='Enter'){e.preventDefault();const host=$(type==='source'?'capSourceResults':'capTargetResults');const first=host.querySelector('.cap-search-item');if(!host.hidden&&first)first.click();}
   });
  }
  document.addEventListener('pointerdown',e=>{
   for(const type of ['source','target']){
    const input=$(type==='source'?'capSourceSearch':'capTargetSearch'),host=$(type==='source'?'capSourceResults':'capTargetResults');
    if(!host.contains(e.target)&&e.target!==input)host.hidden=true;
   }
  },{passive:true});
  document.querySelectorAll('[data-target-kind]').forEach(btn=>btn.addEventListener('click',()=>setKind(btn.dataset.targetKind)));
  bindManualSuggestions();
  for(const id of ['capManualName','capManualCap','capManualScale']){
   $(id).addEventListener('input',render);$(id).addEventListener('change',render);
  }
  window.addEventListener('pageshow',()=>{render();void refreshQuotes(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void refreshQuotes();}});
  window.addEventListener('storage',event=>{
   if(event.key==='inj_node_language_v1')localize();
   else if(event.key==='inj_monitor_theme')location.reload();
   else if([SELECTED_KEY,'inj_monitor_address','inj_monitor_wallets_v1','inj_monitor_summaries_v1','inj_monitor_privacy'].includes(event.key))render();
  });
  setInterval(()=>{if(!document.hidden){render();void refreshQuotes();if(isUsEquity()&&Date.now()-usCapUpdated>20*60_000)void updateUsStock();}},90000);
  setInterval(()=>{if(!document.hidden)renderWallet((()=>{const source=quote(state.source.id),ref=currentReference();return positive(source?.cap)&&positive(ref.cap)?ref.cap/source.cap:NaN})());},4000);
  void refreshQuotes(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
