(()=>{'use strict';const $=id=>document.getElementById(id);const t=(key,vars)=>window.MARKET_I18N?.t(key,vars)||key;const marketLocale=()=>window.MARKET_I18N?.getLanguage()==='en'?'en-US':'it-IT';const API='https://api.coingecko.com/api/v3';const state={coins:[],currency:'usd',sort:'market_cap_rank',desc:false,range:'1h',busy:false,last:0,selected:null,previousPercentages:new Map(),scrollDirections:new Map(),sockets:[],socketTimer:null,liveCount:0,priceSnapshot:new Map(),pairCoins:new Map(),livePriceTimes:new Map(),globalData:null,globalAt:0,top200Volume:NaN,tickerSignature:'',cached:false,binancePairs:null,binancePairUpdated:0};try{state.currency=localStorage.getItem('inj_monitor_currency')?.toLowerCase()==='eur'?'eur':'usd'}catch(_){}$('currency').textContent=state.currency.toUpperCase()+' '+(state.currency==='eur'?'€':'$');const sym=()=>state.currency==='eur'?'€':'$';const money=(v,compact=false)=>{if(!Number.isFinite(v))return '—';if(compact&&Math.abs(v)>=1e12)return sym()+(v/1e12).toFixed(2)+'T';if(compact&&Math.abs(v)>=1e9)return sym()+(v/1e9).toFixed(2)+'B';if(compact&&Math.abs(v)>=1e6)return sym()+(v/1e6).toFixed(2)+'M';return new Intl.NumberFormat(marketLocale(),{style:'currency',currency:state.currency.toUpperCase(),maximumFractionDigits:v<0.01?8:v<1?5:2}).format(v)};const pct=v=>Number.isFinite(v)?(v>0?'+':'')+new Intl.NumberFormat(marketLocale(),{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+'%':'—';const tone=v=>!Number.isFinite(v)?'neutral':v>0?'up':v<0?'down':'neutral';const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const seriesSvg=(values,w=100,h=30)=>{let a=values.filter(Number.isFinite);if(a.length<2)return '<span class="neutral">—</span>';let lo=Math.min(...a),hi=Math.max(...a),span=hi-lo||1,points=a.map((v,i)=>((i/(a.length-1))*w).toFixed(1)+','+((h-3)-((v-lo)/span)*(h-6)).toFixed(1)).join(' ');return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-label="'+t('chart')+'"><polyline class="'+(a.at(-1)>=a[0]?'up':'down')+'" style="stroke:var(--'+(a.at(-1)>=a[0]?'positive':'negative')+')" points="'+points+'"/></svg>'};const change=(c,k)=>c['price_change_percentage_'+k+'_in_currency'];const frames=['1h','24h','7d','30d'];const performanceHeat=v=>Number.isFinite(v)?Math.min(.18,Math.abs(v)/30*.18).toFixed(3):'0';function comparePercentages(coins){const next=new Map(),scrolls=new Map();for(const c of coins){for(const k of frames){const id=c.id+':'+k,val=change(c,k),before=state.previousPercentages.get(id);next.set(id,val);if(Number.isFinite(val)&&Number.isFinite(before)&&pct(val)!==pct(before)){scrolls.set(id,val>before?'rise':'fall');}}}state.previousPercentages=next;state.scrollDirections=scrolls;}function render(){const q=$('search').value.toLowerCase().trim(),limit=+$('scope').value,d=$('direction').value;let items=state.coins.slice(0,limit).filter(c=>(!q||(c.name+' '+c.symbol).toLowerCase().includes(q))&&(d==='all'||(d==='up'?change(c,'24h')>=0:change(c,'24h')<0)));items.sort((a,b)=>{const va=state.sort==='name'?a.name.toLowerCase():a[state.sort],vb=state.sort==='name'?b.name.toLowerCase():b[state.sort];let cmp=(va==null)-(vb==null);if(!cmp)cmp=typeof va==='string'?va.localeCompare(vb):((va??0)-(vb??0));return state.desc?-cmp:cmp});$('rows').innerHTML=items.length?items.map(c=>{const spark=c.sparkline_in_7d?.price||[];return '<tr data-coin="'+escape(c.id)+'" tabindex="0" class="'+(c.symbol==='inj'?'inj':'')+'"><td>'+c.market_cap_rank+'</td><td><button class="asset" data-id="'+escape(c.id)+'"><img src="'+escape(c.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer"><span><strong>'+escape(c.name)+'</strong><small>'+escape(c.symbol.toUpperCase())+'</small></span></button></td><td class="live-price-cell"><span class="live-price'+(state.priceRefreshDirections?.get(c.id)?' price-pulse price-'+state.priceRefreshDirections.get(c.id):'')+'"><span class="price-amount">'+money(c.current_price)+'</span><span class="price-tick-arrow" aria-hidden="true">'+(state.priceRefreshDirections?.get(c.id)==='rise'?'↗':state.priceRefreshDirections?.get(c.id)==='fall'?'↘':'')+'</span></span></td>'+frames.map(k=>{return '<td class="percent-cell '+tone(change(c,k))+'" style="--perf-alpha:'+performanceHeat(change(c,k))+'"><span data-frame="'+k+'" class="percent-value">'+pct(change(c,k))+'</span></td>'}).join('')+'<td>'+money(c.market_cap,true)+'</td><td>'+money(c.total_volume,true)+'</td><td><button class="chartbtn" data-id="'+escape(c.id)+'" title="'+t('chartOpen')+escape(c.name)+'" style="background:none;border:0;padding:0;cursor:pointer">'+(spark.length?seriesSvg(spark):'<span style="color:var(--muted)">'+t('open')+'</span>')+'</button></td></tr>'}).join(''):'<tr><td colspan="10" class="empty">'+(state.coins.length?t('noResults'):t('noMarket'))+'</td></tr>';window.INJ_MARKET_VIEWS?.render?.(); }function summary(){let a=state.coins,up=a.filter(c=>change(c,'24h')>0).length,down=a.filter(c=>change(c,'24h')<0).length;$('breadth').textContent=a.length?up+' ↑ / '+down+' ↓':'—';$('breadthMeta').textContent=t('rising');$('currency').textContent=state.currency.toUpperCase()+' '+sym();$('foot').textContent=state.cached?cacheNotice():(state.last?t('updated')+new Date(state.last).toLocaleTimeString(marketLocale())+t('nontick'):t('provider'));updateGlobalTicker();}async function getJson(url,signal){let r=await fetch(url,{headers:{accept:'application/json'},cache:'no-store',signal});if(!r.ok){const e=new Error(r.status===429?t('limit'):'HTTP '+r.status);e.status=r.status;throw e;}return r.json()}/* Currency-safe market loading: CoinGecko supplies actual vs_currency prices,
   caps and volumes. Never relabel stale USD values as EUR (or vice versa). */
const MARKET_CACHE_KEY='inj_node_market_verified_top200_v1';
const MARKET_CACHE_TTL=48*60*60*1000;
let marketRetryAfter=0,marketFailures=0;
function cacheNotice(){
 const stamped=state.last?new Date(state.last).toLocaleString(marketLocale()):'—';
 return (marketLocale()==='it-IT'?'ULTIMI DATI VERIFICATI · ':'LAST VERIFIED DATA · ')+stamped+
   (marketLocale()==='it-IT'?' · NON LIVE':' · NOT LIVE');
}
function persistMarket(coins,currency,at){
 try{
  const fields=['id','symbol','name','image','current_price','market_cap','market_cap_rank','total_volume',
   'price_change_percentage_1h_in_currency','price_change_percentage_24h_in_currency',
   'price_change_percentage_7d_in_currency','price_change_percentage_30d_in_currency',
   'price_change_percentage_24h','ath','atl','high_24h','low_24h','circulating_supply','total_supply','max_supply'];
  const compact=coins.slice(0,200).map(c=>{
   const record={};for(const key of fields)if(c[key]!==undefined)record[key]=c[key];
   const points=c.sparkline_in_7d?.price;
   if(Array.isArray(points)&&points.length>1){
    const stride=Math.max(1,Math.ceil(points.length/48));
    record.sparkline_in_7d={price:points.filter((_,i)=>i===0||i===points.length-1||i%stride===0)};
   }
   return record;
  });
  localStorage.setItem(MARKET_CACHE_KEY,JSON.stringify({version:1,at,currency,coins:compact}));
 }catch(_){/* Private mode/quota: live feed continues without persistence. */}
}
function hydrateMarket(){
 try{
  const saved=JSON.parse(localStorage.getItem(MARKET_CACHE_KEY)||'null');
  if(saved?.version!==1||saved.currency!==state.currency||!Number.isFinite(saved.at)||
    Date.now()-saved.at>MARKET_CACHE_TTL||saved.at>Date.now()+60000||
    !Array.isArray(saved.coins)||saved.coins.length<25)return;
  if(!saved.coins.every(c=>c?.id&&c?.symbol&&Number.isFinite(c.current_price)&&c.current_price>0))return;
  state.coins=saved.coins;state.last=saved.at;state.cached=true;
  state.priceSnapshot=new Map(saved.coins.map(c=>[c.id,{
    price:c.current_price,percent:Object.fromEntries(frames.map(k=>[k,change(c,k)]))}]));
  state.top200Volume=saved.coins.reduce((sum,c)=>sum+(Number.isFinite(c.total_volume)&&c.total_volume>0?c.total_volume:0),0);
  render();summary();$('status').textContent=cacheNotice();
 }catch(_){/* Never let an invalid cache prevent a fresh live request. */}
}
let activeMarketLoad=null;
function load(force=false,targetCurrency=state.currency){
 if(activeMarketLoad)return activeMarketLoad;
 if(!force&&document.hidden)return Promise.resolve(false);
 if(Date.now()<marketRetryAfter){
   if(force)$('status').textContent=(state.cached?cacheNotice()+' · ':'')+
     (marketLocale()==='it-IT'?'Limite API: nuovo tentativo tra ':'API cooldown: retry in ')+
     Math.ceil((marketRetryAfter-Date.now())/1000)+'s';
   return Promise.resolve(false);
 }
 const task=fetchMarket(targetCurrency);
 activeMarketLoad=task;
 void task.finally(()=>{if(activeMarketLoad===task)activeMarketLoad=null});
 return task;
}
async function fetchMarket(targetCurrency){
 state.busy=true;
 const switching=targetCurrency!==state.currency;
 $('status').textContent=state.coins.length?t('updating'):t('connectingCg');
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),17000);
  let response;
  try{
   response=await getJson(API+'/coins/markets?vs_currency='+targetCurrency+'&order=market_cap_desc&per_page=200&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d',controller.signal);
  }finally{clearTimeout(timeout)}
  if(!Array.isArray(response)||!response.length)throw new Error(t('empty'));
  // A single atomic assignment ensures both display modes show the same currency.
  const oldCurrency=state.currency;
  const previousPrices=switching?new Map():new Map(state.coins.map(c=>[c.id,c.current_price]));
  state.priceRefreshDirections=new Map();
  for(const coin of response){
   const old=previousPrices.get(coin.id);
   if(Number.isFinite(old)&&Number.isFinite(coin.current_price)&&old!==coin.current_price&&money(old)!==money(coin.current_price)){
    state.priceRefreshDirections.set(coin.id,coin.current_price>old?'rise':'fall');
   }
  }
  state.currency=targetCurrency;
  state.coins=response;
  state.last=Date.now();state.cached=false;
  marketFailures=0;marketRetryAfter=0;
  persistMarket(response,targetCurrency,state.last);
  state.priceSnapshot=new Map(response.map(c=>[c.id,{price:c.current_price,percent:Object.fromEntries(frames.map(k=>[k,change(c,k)]))}]));
  state.top200Volume=response.reduce((sum,c)=>sum+(Number.isFinite(c.total_volume)&&c.total_volume>0?c.total_volume:0),0);
  try{
   localStorage.setItem('inj_node_crypto_breadth_v1',JSON.stringify({updatedAt:state.last,count:response.length,up:response.filter(c=>change(c,'24h')>0).length,down:response.filter(c=>change(c,'24h')<0).length,source:'CoinGecko'}));
  }catch(_){}
  // Discard stale price display caches when denominators change.
  if(oldCurrency!==targetCurrency){state.previousPercentages.clear();state.scrollDirections.clear();}
  render();
  state.scrollDirections.clear();state.priceRefreshDirections.clear();
  summary();
  void startStreams();
  if(state.selected){
   const selected=state.coins.find(c=>c.id===state.selected);
   if(selected)window.MARKET_PRO?.updateCoin?.(selected,{currency:state.currency,money,pct,tone,change,getJson,API,marketLocale,canStream:state.pairCoins.get(String(selected.symbol||'').toUpperCase()+'USDT')===selected});
  }
  updateConnectionStatus();
  return true;
 }catch(e){
  marketFailures++;
  // Rate limits are shared per public API/IP. Avoid repeating doomed calls.
  const restricted=[401,403,418,429].includes(e.status);
  const seconds=restricted?Math.min(900,120*Math.pow(2,Math.min(marketFailures-1,3))):
    Math.min(240,30*Math.pow(2,Math.min(marketFailures-1,3)));
  marketRetryAfter=Date.now()+seconds*1000;
  const reason=e.name==='AbortError'?t('timeout'):(e.message||t('retry'));
  $('status').textContent='⚠ '+reason+' · '+(state.cached?cacheNotice()+' · ':'')+
    (marketLocale()==='it-IT'?'Riprovo tra ':'Retry in ')+seconds+'s';
  // Display only previously verified quotes, clearly marked as not live.
  render();
  return false;
 }finally{
  state.busy=false;
 }
}
let currencyToggleBusy=false;
async function switchCurrency(target){
 if(!['usd','eur'].includes(target)||target===state.currency||currencyToggleBusy)return;
 currencyToggleBusy=true;
 const control=$('currency');
 control.disabled=true;
 control.setAttribute('aria-busy','true');
 control.textContent=target.toUpperCase()+' …';
 try{
  // The initial or scheduled market request may still be in flight.
  // Wait for it, then obtain a verified fresh set for the requested currency.
  if(activeMarketLoad)await activeMarketLoad;
  const changed=await load(true,target);
  if(changed){
   try{localStorage.setItem('inj_monitor_currency',target.toUpperCase())}catch(_){}
   renderGlobal();
   // CoinGecko global payload already contains separate USD/EUR aggregates.
   // Notify the other app documents so their own currency preference can update.
   window.dispatchEvent(new CustomEvent('injnode:market:currencychange',{detail:{currency:target}}));
  }
 }finally{
  control.disabled=false;
  control.removeAttribute('aria-busy');
  control.textContent=state.currency.toUpperCase()+' '+sym();
 }
}
const GLOBAL_KEY='inj_node_crypto_global_v1';
function updateGlobalTicker(){
 const host=$('marketTickerTrack');if(!host)return;
 const g=state.globalData||{},cap=Number(g.total_market_cap?.[state.currency]),vol=Number(g.total_volume?.[state.currency]);
 const diff=Number(g.market_cap_change_percentage_24h_usd),btc=Number(g.market_cap_percentage?.btc),eth=Number(g.market_cap_percentage?.eth);
 const active=Number(g.active_cryptocurrencies),up=state.coins.filter(c=>change(c,'24h')>0).length;
 const values=[
  [t('tickerGlobalCap'),Number.isFinite(cap)&&cap>0?money(cap,true):'—',''],
  [t('tickerCapChange'),Number.isFinite(diff)?pct(diff):'—',tone(diff)],
  [t('tickerGlobalVolume'),Number.isFinite(vol)&&vol>0?money(vol,true):'—',''],
  [t('tickerBtcDominance'),Number.isFinite(btc)&&btc>0?btc.toFixed(2)+'%':'—',''],
  [t('tickerEthDominance'),Number.isFinite(eth)&&eth>0?eth.toFixed(2)+'%':'—',''],
  [t('tickerActive'),Number.isFinite(active)&&active>0?new Intl.NumberFormat(marketLocale()).format(active):'—',''],
  [t('tickerBreadth'),state.coins.length?up+'/'+state.coins.length:'—',''],
  [t('tickerTopVolume'),Number.isFinite(state.top200Volume)&&state.top200Volume>0?money(state.top200Volume,true):'—','']
 ];
 const signature=JSON.stringify(values);
 if(signature===state.tickerSignature)return;
 state.tickerSignature=signature;
 const groups=[document.createElement('div'),document.createElement('div')];
 groups.forEach((group,i)=>{
   group.className='market-ticker-group';if(i)group.setAttribute('aria-hidden','true');
   for(const [label,value,tint] of values){
     const item=document.createElement('span');item.className='market-ticker-item';
     const labelNode=document.createElement('span');labelNode.className='market-ticker-label';labelNode.textContent=label;
     const valueNode=document.createElement('strong');valueNode.className='market-ticker-number '+tint;valueNode.textContent=value;
     const separator=document.createElement('i');separator.className='market-ticker-divider';
     item.append(labelNode,valueNode);group.append(item,separator);
   }
 });
 host.replaceChildren(...groups);
}
function renderGlobal(){
 const g=state.globalData;if(!g){updateGlobalTicker();return;}
 const cap=Number(g.total_market_cap?.[state.currency]),volume=Number(g.total_volume?.[state.currency]);
 const diff=Number(g.market_cap_change_percentage_24h_usd),btc=Number(g.market_cap_percentage?.btc),eth=Number(g.market_cap_percentage?.eth);
 $('globalCap').textContent=Number.isFinite(cap)&&cap>0?money(cap,true):'—';
 $('globalVolume').textContent=Number.isFinite(volume)&&volume>0?money(volume,true):'—';
 $('globalVolume').title=t('volumeScopeHint');
 const capNote=$('globalCapMeta');capNote.textContent=Number.isFinite(diff)?pct(diff)+' · 24H':'24H · —';
 capNote.className='overview-detail '+tone(diff);
 $('globalVolumeMeta').textContent=t('volumeGlobalNote');
 $('dominance').textContent=Number.isFinite(btc)&&btc>0?btc.toFixed(1)+'%':'—';
 $('dominanceMeta').textContent=t('dominanceEthNote')+' · '+(Number.isFinite(eth)&&eth>0?eth.toFixed(1)+'%':'—');
 updateGlobalTicker();
}
async function global(){
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let payload;try{payload=await getJson(API+'/global',controller.signal);}finally{clearTimeout(timer);}
  if(!payload?.data?.total_market_cap)throw new Error('Invalid global stats');
  state.globalData=payload.data;state.globalAt=Date.now();
  try{localStorage.setItem(GLOBAL_KEY,JSON.stringify({updatedAt:state.globalAt,data:payload.data}));}catch(_){}
  renderGlobal();
 }catch(e){if(!state.globalData){try{const cached=JSON.parse(localStorage.getItem(GLOBAL_KEY)||'null');if(cached&&Date.now()-cached.updatedAt<3600000){state.globalData=cached.data;state.globalAt=cached.updatedAt;renderGlobal();}}catch(_){}}}
}
try{const cached=JSON.parse(localStorage.getItem(GLOBAL_KEY)||'null');if(cached&&Date.now()-cached.updatedAt<3600000){state.globalData=cached.data;state.globalAt=cached.updatedAt;renderGlobal();}}catch(_){}
function detail(id){
 const c=state.coins.find(x=>x.id===id);if(!c)return;
 state.selected=id;
 window.MARKET_PRO?.open?.(c,{currency:state.currency,money,pct,tone,change,getJson,API,marketLocale,
  canStream:state.pairCoins.get(String(c.symbol||'').toUpperCase()+'USDT')===c});
}
// Streaming delle coppie USDT disponibili su Binance; CoinGecko resta la fonte
// per tutte le 200 crypto, ranking, capitalizzazione e volumi. Le coppie assenti
// proseguono con aggiornamenti periodici CoinGecko e non vengono chiamate live.
function updateConnectionStatus(){
 if(state.cached){$('status').textContent=cacheNotice();return;}
 const when=state.last?new Date(state.last).toLocaleTimeString(marketLocale()):'—';
 const source=state.liveCount>0?t('realtime')+state.liveCount+t('streamSuffix')+when:
  state.binancePairUpdated>0?'● CoinGecko '+when+(marketLocale()==='it-IT'?' · Binance Spot in attesa dati':' · Binance Spot awaiting data'):
  '● CoinGecko '+when+(marketLocale()==='it-IT'?' · Binance non disponibile / verifica in corso':' · Binance unavailable / checking');
 $('status').textContent=source;
}
function stopStreams(){
 streamGeneration++;
 if(state.socketTimer){clearTimeout(state.socketTimer);state.socketTimer=null}
 for(const socket of state.sockets){socket.onclose=null;socket.onerror=null;try{socket.close()}catch(_){}}
 state.sockets=[];state.liveCount=0;state.livePriceTimes.clear();
}
// Trading Terminal: update only changed price glyphs; percent values never move.
function flashPrice(el,direction,nextText){
 if(!el)return;
 const amount=el.querySelector('.price-amount');
 if(!amount)return;
 const previous=Array.from(amount.textContent||'');
 const next=Array.from(nextText);
 const fragment=document.createDocumentFragment();
 // Compare from right to left, so thousands separators and currency symbols
 // do not cause every unchanged digit to animate when the price grows.
 for(let i=0;i<next.length;i++){
   const char=next[i],was=previous[previous.length-next.length+i];
   const unit=document.createElement('span');
   unit.className='price-digit';
   if(/\d/.test(char)&&char!==was)unit.classList.add('price-digit-changed',direction==='rise'?'digit-rise':'digit-fall');
   unit.textContent=char;
   fragment.appendChild(unit);
 }
 amount.replaceChildren(fragment);
 const arrow=el.querySelector('.price-tick-arrow');
 if(arrow){
   const nextArrow=arrow.cloneNode(false);nextArrow.textContent=direction==='rise'?'↗':'↘';
   arrow.replaceWith(nextArrow);
 }
 // Only newly created changed digits and the unobtrusive arrow animate.
 // No forced synchronous layout read and no glowing whole-price container.
 el.classList.remove('price-pulse','price-rise','price-fall');
 el.classList.add('price-pulse',direction==='rise'?'price-rise':'price-fall');
}
function streamTick(data){
 if(!data||!data.s||!data.c)return;
 const coin=state.pairCoins.get(data.s);
 if(!coin)return;
 const raw=Number(data.c);if(!Number.isFinite(raw)||raw<=0)return;
 // Conversione indicativa USDT -> valuta visualizzata; il fattore EUR/USD è
 // riconciliato al prezzo CoinGecko quando si crea la connessione.
 const base=state.priceSnapshot.get(coin.id);
 if(!base||!Number.isFinite(base.price)||base.price<=0)return;
 if(!coin.__streamRatio)coin.__streamRatio=base.price/raw;
 const price=raw*coin.__streamRatio,old=coin.current_price;
 if(!Number.isFinite(old)||Math.abs(price-old)<1e-12)return;
 const direction=price>old?'rise':'fall';
 coin.current_price=price;
 for(const k of frames){
   const starting=base.percent[k];
   if(!Number.isFinite(starting))continue;
   const reference=base.price/(1+starting/100);
   if(reference<=0)continue;
   coin['price_change_percentage_'+k+'_in_currency']=(price/reference-1)*100;
 }
 const row=Array.from($('rows').querySelectorAll('tr[data-coin]')).find(el=>el.dataset.coin===coin.id);
 if(row){
   const value=row.querySelector('.live-price');
   if(value){const oldLabel=value.querySelector('.price-amount')?.textContent||'';const next=money(price);if(next!==oldLabel)flashPrice(value,direction,next)}
   // Percentages stay anchored in place: no vertical roll, glow or movement.
   // Refresh the written numbers at most every 1.8 s to keep them readable.
   const now=Date.now();
   if(!coin.__percentPaintAt||now-coin.__percentPaintAt>=1800){
     row.querySelectorAll('[data-frame]').forEach(el=>{
       const k=el.dataset.frame,nextValue=change(coin,k),next=pct(nextValue);
       if(el.textContent===next)return;
       el.textContent=next;
       el.parentElement.classList.remove('up','down','neutral');
       el.parentElement.classList.add(tone(nextValue));el.parentElement.style.setProperty('--perf-alpha',performanceHeat(nextValue));
     });
     coin.__percentPaintAt=now;
   }
 }
 if(state.selected===coin.id)window.MARKET_PRO?.priceTick?.(coin,Date.now());
 window.INJ_MARKET_VIEWS?.tick?.(coin);
 if(!state.livePriceTimes.has(coin.id)){
    state.livePriceTimes.set(coin.id,Date.now());state.liveCount=state.livePriceTimes.size;updateConnectionStatus();
 }
}
const BINANCE_SPOT_URL='https://data-api.binance.vision/api/v3/exchangeInfo';
let streamGeneration=0;
async function refreshBinancePairs(){
 if(state.binancePairs&&Date.now()-state.binancePairUpdated<6*3600000)return state.binancePairs;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9500);
 try{
  // Verify pairs instead of subscribing to nonexistent ticker streams.
  // Public Binance market data needs no account or credentials.
  const response=await fetch(BINANCE_SPOT_URL+'?permissions=SPOT',{signal:ctrl.signal,cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('Binance exchange info HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json?.symbols))throw Error('Binance returned no symbols');
  const known=new Set(json.symbols.filter(p=>p?.status==='TRADING'&&p.quoteAsset==='USDT'&&p.isSpotTradingAllowed!==false).map(p=>p.symbol));
  if(!known.size)throw Error('No spot USDT pairs found');
  state.binancePairs=known;state.binancePairUpdated=Date.now();
  return known;
 }catch(_){
  // Do not turn invalid symbols or unavailable Binance regions into false live prices.
  // CoinGecko continues to cover the full top 200.
  return state.binancePairs||new Set();
 }finally{clearTimeout(timer)}
}
async function startStreams(){
 stopStreams();
 const generation=++streamGeneration;
 state.pairCoins=new Map();
 if(document.hidden||!state.coins.length)return;
 const available=await refreshBinancePairs();
 if(generation!==streamGeneration||document.hidden)return;
 const symbolCounts=new Map();
 for(const coin of state.coins){
  const symbol=String(coin.symbol||'').toUpperCase();
  symbolCounts.set(symbol,(symbolCounts.get(symbol)||0)+1);
 }
 for(const coin of state.coins){
  coin.__streamRatio=0;
  const symbol=String(coin.symbol||'').toUpperCase();
  const pair=symbol+'USDT';
  if(!/^[A-Z0-9]{2,15}$/.test(symbol)||symbolCounts.get(symbol)!==1||!available.has(pair))continue;
  state.pairCoins.set(pair,coin);
 }
 const pairs=[...state.pairCoins.keys()];
 for(let i=0;i<pairs.length;i+=70){
  const streams=pairs.slice(i,i+70).map(x=>x.toLowerCase()+'@miniTicker').join('/');
  try{
   const ws=new WebSocket('wss://data-stream.binance.vision:443/stream?streams='+streams);
   ws.onmessage=ev=>{try{const msg=JSON.parse(ev.data);streamTick(msg.data||msg)}catch(_){}};
   ws.onerror=()=>{};
   ws.onclose=()=>{
    if(!document.hidden&&state.sockets.includes(ws)&&!state.socketTimer){
     state.socketTimer=setTimeout(()=>{state.socketTimer=null;void startStreams()},8000);
    }
   };
   state.sockets.push(ws);
  }catch(_){/* unavailable network: CoinGecko still refreshes */ }
 }
 updateConnectionStatus();
}
// Single data source for list and heatmap: no parallel network feed.
window.INJ_MARKET_VIEW_API={getCoins:()=>state.coins,getCurrency:()=>state.currency,formatMoney:money,formatPercent:pct,getChange:change,open:detail,switchCurrency};
// Shared read-only observation: this does not trigger additional network calls.
window.INJ_MARKET_READONLY_SNAPSHOT=()=>({
 injective:state.coins.find(c=>c.id==='injective-protocol')||null,
 bitcoin:state.coins.find(c=>c.id==='bitcoin')||null,
 ethereum:state.coins.find(c=>c.id==='ethereum')||null,
 global:state.globalData||null,
 updated:Math.max(state.last||0,state.globalAt||0)
});
window.marketOnLanguageChange=()=>{window.INJ_MARKET_VIEWS?.languageChange?.();if(state.coins.length){render();summary();renderGlobal();updateConnectionStatus();window.MARKET_PRO?.languageChange?.()}else{const placeholder=$('rows').querySelector('.empty');if(placeholder)placeholder.textContent=t('loading');$('status').textContent=t('connectingCg');$('foot').textContent=t('provider');}};$('rows').addEventListener('click',e=>{const el=e.target.closest('[data-id]')||e.target.closest('tr[data-coin]');if(el)detail(el.dataset.id||el.dataset.coin)});$('rows').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const row=e.target.closest('tr[data-coin]');if(!row)return;e.preventDefault();detail(row.dataset.coin)});$('closeDetail').onclick=()=>{$('detail').close();state.selected=null;window.MARKET_PRO?.close?.()};$('detail').addEventListener('close',()=>{state.selected=null;window.MARKET_PRO?.close?.()});$('search').oninput=render;$('scope').onchange=render;$('direction').onchange=render;document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{if(state.sort===b.dataset.sort)state.desc=!state.desc;else{state.sort=b.dataset.sort;state.desc=state.sort!=='market_cap_rank'&&state.sort!=='name'}render()});$('currency').onclick=()=>{void switchCurrency(state.currency==='usd'?'eur':'usd')};$('refresh').onclick=()=>{void load(true);void global()};hydrateMarket();void load(true);void global();setInterval(()=>load(),90000);setInterval(()=>{if(!document.hidden)global()},300000);document.addEventListener('visibilitychange',()=>{if(document.hidden){stopStreams()}else{if(Date.now()-state.last>90000)load();else void startStreams()}});})();