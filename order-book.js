// v15.99.12 — Order Book live aggressor arrow: green buy / red sell beside last trade price.
"use strict";
const $=id=>document.getElementById(id);
const GROUPINGS=[0.001,0.01,0.1,1];
const WS_DEPTH=['wss://stream.binance.com:443/ws/injusdt@depth20@100ms','wss://data-stream.binance.vision/ws/injusdt@depth20@100ms','wss://stream.binance.com:9443/ws/injusdt@depth20@100ms'];
const WS_TRADES=['wss://stream.binance.com:443/ws/injusdt@aggTrade','wss://data-stream.binance.vision/ws/injusdt@aggTrade','wss://stream.binance.com:9443/ws/injusdt@aggTrade'];
const REST=['https://api.binance.com','https://data-api.binance.vision','https://api1.binance.com'];
const savedGrouping=(()=>{try{const v=Number(localStorage.getItem('inj_node_book_grouping'));return GROUPINGS.includes(v)?v:.001}catch(_){return .001}})();
const state={grouping:savedGrouping,rawLimit:100,maxLevels:100,asks:[],bids:[],restAsks:[],restBids:[],liveAsks:[],liveBids:[],lastSnapshotAt:0,lastDepthAt:0,lastTradeAt:0,lastPriceCheckAt:0,priceCheckLoading:false,quote:'USD',eurRate:.86,lastPrice:0,lastUpdateAt:0,depthWs:null,tradeWs:null,depthEndpoint:0,tradeEndpoint:0,depthReconnect:0,tradeReconnect:0,snapshotTimer:0,watchdog:0,priceTimer:0,renderTimer:0,renderAt:0,priceFlashTimer:0,lastTradeSide:'',snapshotLoading:false,askPinned:true,bidPinned:true,stopped:false};
function decimals(step=state.grouping){const x=String(step);return x.includes('.')?x.split('.')[1].length:0}
function rawLimit(step=state.grouping){return step>=1?5000:step>=.1?1000:step>=.01?500:100}
function refreshMs(step=state.grouping){return step>=1?8000:step>=.1?4500:step>=.01?3000:2500}
function price(v){if(!(v>0))return '—';const d=v<10?4:v<100?3:2;return '$'+v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function orderPrice(v){if(!(v>0))return '—';const d=decimals();return Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}
function size(v){return v>0?Number(v).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:v<100?3:2}):'—'}
function total(usd){if(!(usd>=0))return '—';const eur=state.eurRate>0?state.eurRate:.86,isEur=state.quote==='EUR',value=isEur?usd*eur:usd;return new Intl.NumberFormat(isEur?'it-IT':'en-US',{style:'currency',currency:isEur?'EUR':'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}
function numberRollGroups(text){const value=String(text??''),groups=[],regex=/\d[\d.,]*/g;let m;while((m=regex.exec(value)))groups.push({text:m[0],start:m.index,end:m.index+m[0].length});return groups;}
function appendStableGroup(parent,group){for(const char of Array.from(String(group||''))){if(/\d/.test(char)){const d=document.createElement('span');d.className='number-roll-static-digit';d.textContent=char;parent.append(d);}else parent.append(document.createTextNode(char));}}
function renderStableNumberText(element,text){const value=String(text??''),groups=numberRollGroups(value);if(!groups.length){element.textContent=value;return;}const shell=document.createElement('span');shell.className='number-roll-text';shell.setAttribute('aria-label',value);let cursor=0;for(const group of groups){if(group.start>cursor)shell.append(document.createTextNode(value.slice(cursor,group.start)));appendStableGroup(shell,group.text);cursor=group.end;}if(cursor<value.length)shell.append(document.createTextNode(value.slice(cursor)));element.replaceChildren(shell);}
function appendRollingGroup(parent,oldGroup,newGroup,direction){const oldDigits=Array.from(String(oldGroup||'')).filter(c=>/\d/.test(c)),chars=Array.from(String(newGroup||'')),count=chars.reduce((n,c)=>n+(/\d/.test(c)?1:0),0),offset=oldDigits.length-count;let i=0;for(const char of chars){if(!/\d/.test(char)){parent.append(document.createTextNode(char));continue;}const oldIndex=i+offset,oldDigit=oldIndex>=0&&oldIndex<oldDigits.length?oldDigits[oldIndex]:'';const d=document.createElement('span');d.className='number-roll-static-digit';if(oldDigit!==char)d.classList.add('number-change-digit',`number-change-${direction}`);d.textContent=char;parent.append(d);i++;}}
function setLiveNumber(id, text, numericValue) {
  const element = $(id);
  if (!element) return;
  const targetText = String(text);
  const targetNumeric = Number(numericValue);
  const reduce = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const visualGap = 720;

  if (element._rollVisualText === undefined) {
    element._rollVisualText = targetText;
    element._rollVisualNumeric = Number.isFinite(targetNumeric) ? targetNumeric : NaN;
    element.classList.add('number-roll-host');
    renderStableNumberText(element, targetText);
    return;
  }

  clearTimeout(element._rollTimer);
  element._rollTimer = null;
  element._rollPending = null;
  element._rollTarget = null;

  const oldText = String(element._rollVisualText ?? targetText);
  const oldNumeric = Number(element._rollVisualNumeric);
  const changed = oldText !== targetText && Number.isFinite(oldNumeric) && Number.isFinite(targetNumeric) &&
    Math.abs(targetNumeric - oldNumeric) > Math.max(1e-12, Math.abs(oldNumeric) * 1e-10);
  const now = performance.now();
  const canCue = changed && !reduce && now - Number(element._rollLastAnimatedAt || 0) >= visualGap;

  if (canCue) {
    element._rollLastAnimatedAt = now;
    const direction = targetNumeric > oldNumeric ? 'up' : 'down';
    const shell = document.createElement('span');
    shell.className = 'number-roll-text';
    shell.setAttribute('aria-label', targetText);
    const oldGroups = numberRollGroups(oldText);
    const newGroups = numberRollGroups(targetText);
    let cursor = 0;
    newGroups.forEach((g, i) => {
      if (g.start > cursor) shell.append(document.createTextNode(targetText.slice(cursor, g.start)));
      appendRollingGroup(shell, oldGroups[i]?.text || '', g.text, direction);
      cursor = g.end;
    });
    if (cursor < targetText.length) shell.append(document.createTextNode(targetText.slice(cursor)));
    element.classList.add('number-roll-host');
    element.replaceChildren(newGroups.length ? shell : document.createTextNode(targetText));
    clearTimeout(element._digitColorTimer);
    element._digitColorTimer = setTimeout(() => {
      element.querySelectorAll('.number-change-up,.number-change-down').forEach((node) => node.classList.remove('number-change-up','number-change-down'));
      element._digitColorTimer = null;
    }, 260);
  } else {
    renderStableNumberText(element, targetText);
  }

  // Update the visual baseline immediately: there is never a queued old value
  // waiting to jump into place after an animation finishes.
  element._rollVisualText = targetText;
  element._rollVisualNumeric = Number.isFinite(targetNumeric) ? targetNumeric : NaN;
}
function setStatus(mode){const n=$('bookState');if(!n)return;n.className='status '+mode;const b=n.querySelector('b');if(b)b.textContent=mode==='online'?'LIVE':mode==='offline'?'OFF':'SYNC'}
function updateControls(){const s=$('bookGrouping');if(s)s.value=String(state.grouping);const hint=$('bookDepthHint');if(hint)hint.textContent=`INJ / USDT · ${orderPrice(state.grouping)} STEP · 100 LEVELS`;const sign=state.quote==='EUR'?'€':'$';if($('bookTotalLabel'))$('bookTotalLabel').textContent=`TOTAL ${sign}`;if($('currencyHint'))$('currencyHint').textContent=`TOTAL ${sign}`}
async function refreshCurrency(){try{state.quote=localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD';const cached=Number(localStorage.getItem('inj_monitor_eur_rate'));if(cached>0)state.eurRate=cached}catch(_){}updateControls();render();if(state.quote!=='EUR')return;try{const r=await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR',{cache:'no-store'});if(!r.ok)return;const data=await r.json(),rate=Number(data?.rates?.EUR);if(rate>0){state.eurRate=rate;try{localStorage.setItem('inj_monitor_eur_rate',String(rate))}catch(_){}render()}}catch(_){}}
function normalize(levels,desc=false){return (levels||[]).map(l=>Array.isArray(l)?{p:+l[0],q:+l[1]}:{p:+l.price,q:+l.qty}).filter(l=>l.p>0&&l.q>0).sort((a,b)=>desc?b.p-a.p:a.p-b.p)}
function bucket(levels,side){const step=state.grouping,d=Math.min(8,Math.max(decimals(step),4)),map=new Map();for(const l of levels){if(!(l?.p>0&&l?.q>0))continue;const ratio=l.p/step,idx=side==='ask'?Math.ceil(ratio-1e-10):Math.floor(ratio+1e-10),p=Number((idx*step).toFixed(d));const prev=map.get(p);if(prev)prev.q+=l.q;else map.set(p,{p,q:l.q})}return [...map.values()].sort((a,b)=>side==='ask'?a.p-b.p:b.p-a.p)}
// Binance @depth20@100ms is a PARTIAL snapshot of the top 20 prices,
// not a diff stream. Do not accumulate old near-market prices from earlier
// messages: they may have been cancelled or filled.
function reconcileDepth() {
  const fresh=state.lastDepthAt&&Date.now()-state.lastDepthAt<6500;
  const sideBook=(baseline,live,side)=>{
    if(!fresh||!live.length)return baseline.slice(0,state.rawLimit);
    const boundary=live[live.length-1].p;
    const outside=baseline.filter(row=>side==='ask'?row.p>boundary:row.p<boundary);
    return [...live,...outside].slice(0,state.rawLimit);
  };
  state.asks=sideBook(state.restAsks,state.liveAsks,'ask');
  state.bids=sideBook(state.restBids,state.liveBids,'bid');
}
function updateFeedStatus(){
  if(state.stopped){setStatus('offline');return}
  const socketFresh=state.depthWs?.readyState===WebSocket.OPEN&&
    state.lastDepthAt&&Date.now()-state.lastDepthAt<6500;
  const snapshotFresh=state.lastSnapshotAt&&
    Date.now()-state.lastSnapshotAt<Math.max(9000,refreshMs()*2.5);
  setStatus(socketFresh?'online':snapshotFresh?'connecting':'offline');
  const footer=$('bookFooterState');
  if(footer)footer.textContent=socketFresh?'DEPTH LIVE':snapshotFresh?'DEPTH SYNC':'DEPTH OFFLINE';
  const pair=$('bookFeedInfo');
  if(pair)pair.textContent=socketFresh?'BINANCE · REALTIME':snapshotFresh?'BINANCE · SYNC':'BINANCE · RECONNECTING';
}
function apply(payload,{snapshot=false}={}){
  const asks=normalize(payload?.asks||payload?.a,false).slice(0,snapshot?state.rawLimit:20);
  const bids=normalize(payload?.bids||payload?.b,true).slice(0,snapshot?state.rawLimit:20);
  if(!asks.length&&!bids.length)return false;
  const now=Date.now();
  if(snapshot){
    if(asks.length)state.restAsks=asks;
    if(bids.length)state.restBids=bids;
    state.lastSnapshotAt=now;
  }else{
    if(asks.length)state.liveAsks=asks;
    if(bids.length)state.liveBids=bids;
    state.lastDepthAt=now;
  }
  state.lastUpdateAt=now;
  reconcileDepth();
  updateFeedStatus();
  queueRender();
  return true;
}
function queueRender(){const wait=Math.max(0,120-(performance.now()-state.renderAt));if(state.renderTimer)return;state.renderTimer=setTimeout(()=>{state.renderTimer=0;render()},wait)}
function rows(hostId,data,side,maxQty){const host=$(hostId);if(!host)return;const old=host.scrollTop,near=side==='ask'?(host.scrollHeight-host.clientHeight-old<28):old<28;host.textContent='';if(!data.length){const e=document.createElement('div');e.className='empty';e.textContent='WAITING FOR BOOK';host.appendChild(e);return}const frag=document.createDocumentFragment();for(const r of data){const item=document.createElement('div');item.className=`row ${side}`;item.style.setProperty('--depth',`${Math.max(4,Math.min(100,r.q/Math.max(maxQty,1)*100))}%`);const p=document.createElement('span');p.className='price';p.textContent=orderPrice(r.p);const q=document.createElement('span');q.textContent=size(r.q);const t=document.createElement('span');t.className='muted';t.textContent=total(r.notional);item.append(p,q,t);frag.appendChild(item)}host.appendChild(frag);requestAnimationFrame(()=>{if(side==='ask'){if(state.askPinned||near){host.scrollTop=host.scrollHeight;state.askPinned=true}else host.scrollTop=Math.min(old,Math.max(0,host.scrollHeight-host.clientHeight))}else{if(state.bidPinned||near){host.scrollTop=0;state.bidPinned=true}else host.scrollTop=Math.min(old,Math.max(0,host.scrollHeight-host.clientHeight))}})}
function render(){state.renderAt=performance.now();const asks=bucket(state.asks,'ask').slice(0,state.maxLevels),bids=bucket(state.bids,'bid').slice(0,state.maxLevels);let an=0,bn=0;const ac=asks.map(l=>({...l,notional:(an+=l.p*l.q)})),bc=bids.map(l=>({...l,notional:(bn+=l.p*l.q)}));const max=Math.max(...asks.map(l=>l.q),...bids.map(l=>l.q),1);rows('bookAsks',ac.slice().reverse(),'ask',max);rows('bookBids',bc,'bid',max);if(!(state.lastPrice>0)&&asks[0]?.p>0&&bids[0]?.p>0){const mid=(asks[0].p+bids[0].p)/2;setLiveNumber('bookLivePrice',price(mid),mid);if($('bookPriceLabel'))$('bookPriceLabel').textContent='MID PRICE'}}
async function snapshot(){
  if(state.snapshotLoading||state.stopped||document.hidden||navigator.onLine===false)return false;
  state.snapshotLoading=true;
  try {
    for(const base of REST){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),4000);
      try {
        const r=await fetch(`${base}/api/v3/depth?symbol=INJUSDT&limit=${state.rawLimit}`,{
          cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}
        });
        if(!r.ok)throw new Error('Depth HTTP '+r.status);
        const data=await r.json();
        if(!apply(data,{snapshot:true}))throw new Error('Empty order book');
        return true;
      } catch(_) {
        // Retry through a separately hosted Binance data endpoint.
      } finally {clearTimeout(timer);}
    }
    updateFeedStatus();
    return false;
  } finally {state.snapshotLoading=false;}
}
function startSnapshotRefresh(){clearInterval(state.snapshotTimer);state.snapshotTimer=setInterval(()=>{if(!state.stopped&&!document.hidden)void snapshot()},refreshMs())}
function connectDepth(index=state.depthEndpoint){
  if(state.stopped||document.hidden||navigator.onLine===false)return;
  const old=state.depthWs;
  if(old&&(old.readyState===WebSocket.OPEN||old.readyState===WebSocket.CONNECTING))return;
  clearTimeout(state.depthReconnect);
  const i=((index%WS_DEPTH.length)+WS_DEPTH.length)%WS_DEPTH.length;
  state.depthEndpoint=i;
  try {
    const ws=new WebSocket(WS_DEPTH[i]);state.depthWs=ws;
    let got=false;
    const noData=setTimeout(()=>{if(!got&&state.depthWs===ws)try{ws.close()}catch(_){}},7000);
    ws.onmessage=e=>{
      if(ws!==state.depthWs)return;
      try {if(apply(JSON.parse(e.data))){got=true;clearTimeout(noData)}}catch(_){}
    };
    ws.onclose=()=>{
      clearTimeout(noData);
      if(state.depthWs!==ws)return; // A replacement connection already exists.
      state.depthWs=null;
      updateFeedStatus();
      if(state.stopped||document.hidden)return;
      state.depthEndpoint=(i+1)%WS_DEPTH.length;
      state.depthReconnect=setTimeout(()=>connectDepth(state.depthEndpoint),1400);
    };
    ws.onerror=()=>{try{ws.close()}catch(_){}};
  }catch(_){
    state.depthWs=null;
    state.depthEndpoint=(i+1)%WS_DEPTH.length;
    state.depthReconnect=setTimeout(()=>connectDepth(state.depthEndpoint),1800);
  }
}
function updateTradeArrow(side){
  const arrow=$('bookTradeArrow');
  if(!arrow)return;
  const buy=side==='buy',sell=side==='sell';
  state.lastTradeSide=buy?'buy':sell?'sell':'';
  arrow.classList.remove('buy','sell','neutral','tick');
  arrow.classList.add(buy?'buy':sell?'sell':'neutral');
  arrow.textContent=buy?'↑':sell?'↓':'•';
  arrow.setAttribute('aria-label',buy?'Ultimo trade: acquisto':sell?'Ultimo trade: vendita':'Direzione ultimo trade');
  void arrow.offsetWidth;
  arrow.classList.add('tick');
}
function flashTrade(v,side){if(!(v>0))return;state.lastPrice=v;state.lastTradeAt=Date.now();if($('bookPriceLabel'))$('bookPriceLabel').textContent='LAST TRADE';const host=$('bookMarketPrice');setLiveNumber('bookLivePrice',price(v),v);updateTradeArrow(side);host.classList.remove('buy-flash','sell-flash');void host.offsetWidth;host.classList.add(side==='buy'?'buy-flash':'sell-flash');clearTimeout(state.priceFlashTimer);state.priceFlashTimer=setTimeout(()=>host.classList.remove('buy-flash','sell-flash'),240)}
function connectTrades(index=state.tradeEndpoint){
  if(state.stopped||document.hidden||navigator.onLine===false)return;
  const old=state.tradeWs;
  if(old&&(old.readyState===WebSocket.OPEN||old.readyState===WebSocket.CONNECTING))return;
  clearTimeout(state.tradeReconnect);
  const i=((index%WS_TRADES.length)+WS_TRADES.length)%WS_TRADES.length;
  state.tradeEndpoint=i;
  try {
    const ws=new WebSocket(WS_TRADES[i]);state.tradeWs=ws;
    ws.onmessage=e=>{
      if(ws!==state.tradeWs)return;
      try{const d=JSON.parse(e.data),p=+d.p;if(p>0)flashTrade(p,d.m?'sell':'buy')}catch(_){}
    };
    ws.onclose=()=>{
      if(state.tradeWs!==ws)return;
      state.tradeWs=null;
      if(state.stopped||document.hidden)return;
      state.tradeEndpoint=(i+1)%WS_TRADES.length;
      state.tradeReconnect=setTimeout(()=>connectTrades(state.tradeEndpoint),1600);
    };
    ws.onerror=()=>{try{ws.close()}catch(_){}};
  }catch(_){
    state.tradeWs=null;
    state.tradeEndpoint=(i+1)%WS_TRADES.length;
    state.tradeReconnect=setTimeout(()=>connectTrades(state.tradeEndpoint),1900);
  }
}
async function refreshFallbackPrice(){
  if(state.stopped||document.hidden||navigator.onLine===false||state.priceCheckLoading)return;
  // If no recent trade came through, a real Binance ticker price is preferable
  // to leaving a stale last trade on screen. Keep the side arrow neutral.
  if(state.lastTradeAt&&Date.now()-state.lastTradeAt<12000)return;
  state.priceCheckLoading=true;
  try {
    for(const base of REST){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),3200);
      try{
        const response=await fetch(base+'/api/v3/ticker/price?symbol=INJUSDT',{
          cache:'no-store',signal:controller.signal
        });
        if(!response.ok)throw new Error('Price HTTP '+response.status);
        const payload=await response.json(),value=Number(payload?.price);
        if(!(value>0))throw new Error('Invalid price');
        // A trade tick that arrived during this request takes precedence.
        if(!state.lastTradeAt||Date.now()-state.lastTradeAt>=12000){
          state.lastPrice=value;
          state.lastPriceCheckAt=Date.now();
          if($('bookPriceLabel'))$('bookPriceLabel').textContent='MARKET PRICE';
          setLiveNumber('bookLivePrice',price(value),value);
          updateTradeArrow('');
        }
        return;
      }catch(_){}finally{clearTimeout(timeout)}
    }
  }finally{state.priceCheckLoading=false}
}
function startPriceRefresh(){
  clearInterval(state.priceTimer);
  state.priceTimer=setInterval(()=>{void refreshFallbackPrice()},9000);
  void refreshFallbackPrice();
}
function startWatchdog(){
  clearInterval(state.watchdog);
  state.watchdog=setInterval(()=>{
    if(state.stopped||document.hidden)return;
    if(navigator.onLine===false){
      setStatus('offline');
      if($('bookFooterState'))$('bookFooterState').textContent='DEPTH OFFLINE';
      return;
    }
    reconcileDepth();
    updateFeedStatus();
    if(!state.lastSnapshotAt||Date.now()-state.lastSnapshotAt>Math.max(12000,refreshMs()*3)){
      void snapshot();
    }
    // A socket with no depth messages for a sustained interval may be hung,
    // even when WebSocket.readyState falsely remains OPEN after iOS sleep.
    if(state.depthWs?.readyState===WebSocket.OPEN &&
      Date.now()-state.lastDepthAt>13000) {
      try{state.depthWs.close()}catch(_){}
    }else if(!state.depthWs||state.depthWs.readyState>1)connectDepth();
    if(!state.tradeWs||state.tradeWs.readyState>1)connectTrades();
    if(!state.lastTradeAt||Date.now()-state.lastTradeAt>12000)void refreshFallbackPrice();
  },3000);
}
function resumeOrderBookRealtime(){if(state.stopped||document.hidden||navigator.onLine===false)return;const depth=state.depthWs,trade=state.tradeWs;if(!depth||(depth.readyState!==WebSocket.OPEN&&depth.readyState!==WebSocket.CONNECTING))connectDepth();if(!trade||(trade.readyState!==WebSocket.OPEN&&trade.readyState!==WebSocket.CONNECTING))connectTrades();void snapshot();startSnapshotRefresh();startWatchdog();startPriceRefresh()}
function setGrouping(v){v=Number(v);if(!GROUPINGS.includes(v)||v===state.grouping)return;state.grouping=v;state.rawLimit=rawLimit(v);state.askPinned=true;state.bidPinned=true;try{localStorage.setItem('inj_node_book_grouping',String(v))}catch(_){}updateControls();render();startSnapshotRefresh();void snapshot()}
function stop(){state.stopped=true;clearTimeout(state.depthReconnect);clearTimeout(state.tradeReconnect);clearTimeout(state.renderTimer);clearTimeout(state.priceFlashTimer);clearInterval(state.snapshotTimer);clearInterval(state.watchdog);clearInterval(state.priceTimer);try{state.depthWs?.close()}catch(_){}try{state.tradeWs?.close()}catch(_){}state.depthWs=state.tradeWs=null}
function home(){stop();let from=false;try{from=sessionStorage.getItem('inj_node_orderbook_from_home')==='1';sessionStorage.removeItem('inj_node_orderbook_from_home')}catch(_){}const ref=(()=>{try{return !!document.referrer&&new URL(document.referrer).origin===location.origin}catch(_){return false}})();if((from||ref)&&history.length>1){history.back();return}location.replace('./index.html?v=16.00.14')}
state.rawLimit=rawLimit();$('bookGrouping').addEventListener('change',e=>setGrouping(e.currentTarget.value));$('bookAsks').addEventListener('scroll',e=>{const el=e.currentTarget;state.askPinned=(el.scrollHeight-el.clientHeight-el.scrollTop)<28},{passive:true});$('bookBids').addEventListener('scroll',e=>{state.bidPinned=e.currentTarget.scrollTop<28},{passive:true});$('bookBack').addEventListener('click',e=>{e.preventDefault();home()});window.addEventListener('pagehide',()=>stop());window.addEventListener('storage',e=>{if(e.key==='inj_monitor_currency'||e.key==='inj_monitor_eur_rate')void refreshCurrency()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeOrderBookRealtime()});window.addEventListener('online',resumeOrderBookRealtime);window.addEventListener('focus',resumeOrderBookRealtime,{passive:true});window.addEventListener('pageshow',event=>{if(event.persisted)state.stopped=false;resumeOrderBookRealtime()});
updateControls();render();setStatus('connecting');void refreshCurrency();void snapshot();connectDepth(0);connectTrades(0);startSnapshotRefresh();startWatchdog();startPriceRefresh();
