/* Night View Ambient · read-only, wallet scoped, OLED · 2026-11-10.
   A verified app snapshot is preferred over cached wallet values; live trade
   data come from the same INJ/USDT market used by Multi Chart. */
(() => {
 'use strict';
 if(document.documentElement.dataset.injPage!=='night-view')return;
 const isLiveView=new URLSearchParams(location.search).get('embedded')==='live';
 document.documentElement.dataset.injView='live';
 document.documentElement.dataset.nightEmbedded=isLiveView?'live':'direct';
 const $=id=>document.getElementById(id);
 let nightEnabled=false;
 // One design, two palettes: the normal INJ Node theme and true-black OLED.
 // Capture the active parent theme when embedded, not a second theme setting.
 const palettes={
  obsidian:{bg:'#060b11',text:'#e8eef4',muted:'#90a5b8',accent:'#63b9e4',line:'#273747',surface:'#101924',up:'#6ed2a4',down:'#d88992'},
  arctic:{bg:'#f1f7fa',text:'#162b3b',muted:'#617e93',accent:'#267fa9',line:'#d2e0e9',surface:'#fff',up:'#198f6d',down:'#c05c69'},
  orbit:{bg:'#080b1a',text:'#e7e8fc',muted:'#939ab5',accent:'#a79bff',line:'#303b5a',surface:'#11182c',up:'#6ed2a4',down:'#d88992'},
  'classic-black':{bg:'#030304',text:'#ededf2',muted:'#94949d',accent:'#d3d3db',line:'#303034',surface:'#111113',up:'#6ed2a4',down:'#d88992'},
  'classic-white':{bg:'#ffffff',text:'#16191c',muted:'#656b74',accent:'#394a59',line:'#e0e2e5',surface:'#f7f8fa',up:'#198f6d',down:'#c05c69'}
 };
 function themeValues(){
  let selected='obsidian',fromParent=null;
  try{
   if(parent!==window&&parent.location.origin===location.origin){
    selected=parent.document.documentElement.dataset.theme||selected;
    fromParent=getComputedStyle(parent.document.documentElement);
   }else selected=localStorage.getItem('inj_monitor_theme')||selected;
  }catch(_){try{selected=localStorage.getItem('inj_monitor_theme')||selected}catch(__){}}
  const legacy={navy:'obsidian',black:'classic-black',light:'classic-white',velvet:'orbit',aqua:'arctic'};
  selected=palettes[selected]?selected:(legacy[selected]||'obsidian');
  const fallback=palettes[selected],read=(name,fallbackValue)=>{
   const value=fromParent?.getPropertyValue(name)?.trim();
   return value&&value!=='initial'?value:fallbackValue;
  };
  return {selected,light:selected==='arctic'||selected==='classic-white',
    bg:read('--theme-canvas',read('--bg',fallback.bg)),
    text:read('--text',fallback.text),muted:read('--muted',fallback.muted),
    accent:read('--accent',fallback.accent),line:read('--line',fallback.line),
    surface:read('--surface',fallback.surface),
    up:read('--up',fallback.up),down:read('--down',fallback.down)};
 }
 function applyPalette(){
  const p=themeValues();
  const colors=nightEnabled?
    {bg:'#000000',text:'#dce6e4',muted:'#85938f',accent:'#8bc9ba',
      line:'#202d2c',surface:'#06100d',up:'#90d5b3',down:'#cf8c8e'}:p;
  const root=document.documentElement;
  root.dataset.nightMode=nightEnabled?'on':'off';
  root.dataset.theme=p.selected;
  root.style.colorScheme=nightEnabled||!p.light?'dark':'light';
  for(const [token,value] of Object.entries({
   '--nv-bg':colors.bg,'--nv-text':colors.text,'--nv-muted':colors.muted,
   '--nv-accent':colors.accent,'--nv-line':colors.line,
   '--nv-control-bg':colors.surface,'--nv-up':colors.up,'--nv-down':colors.down
  }))root.style.setProperty(token,value);
  const themeTag=document.querySelector('meta[name="theme-color"]');
  if(themeTag)themeTag.content=nightEnabled?'#000000':(colors.bg.startsWith('#')?colors.bg:p.bg);
  const button=$('nightModeToggle');
  if(button){
   button.setAttribute('aria-pressed',String(nightEnabled));
   button.setAttribute('aria-label',nightEnabled?tr('Disattiva Night View','Disable Night View'):tr('Attiva Night View','Enable Night View'));
   button.title=nightEnabled?'Night View · ON':'Night View';
  }
 }
 const msYear=365.25*86400000;
 const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
 const valid=n=>n!==null&&n>=0;
 const lang=()=>{try{return localStorage.getItem('inj_node_language_v1')==='en'?'en':'it'}catch(_){return 'it'}};
 const tr=(it,en)=>lang()==='en'?en:it;
 const fmt=(v,d=2)=>Number(v).toLocaleString(lang()==='en'?'en-US':'it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
 const money=(v,c='USD',digits=2)=>new Intl.NumberFormat(lang()==='en'?'en-US':'it-IT',{style:'currency',currency:c,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v);
 const unit=(v,d=2)=>fmt(v,d)+' <span class="unit">INJ</span>';
 const note=(id,value)=>{const node=$(id);if(node&&node.innerHTML!==value)node.innerHTML=value};
 const app=()=>{try{return parent!==window && parent.location.origin===location.origin && typeof parent.INJ_FINANCIAL_FREEDOM_SOURCE==='function'?parent.INJ_FINANCIAL_FREEDOM_SOURCE():null}catch(_){return null}};
 const state={price:null,tradeAt:0,lastTick:null,priceAt:0,change:null,tickerAt:0,networkAt:0,networkOk:null,networkAge:0,ws:null,wsRetry:0,walletAt:0,selected:'',timer:0,fetching:false,lastDisplayedPrice:null,lastDisplayedCurrency:'',lastDisplayedText:'',directionTimer:0};
 function fallback(){
  try{
   const wallets=JSON.parse(localStorage.getItem('inj_monitor_wallets_v1')||'[]');
   const summaries=JSON.parse(localStorage.getItem('inj_monitor_summaries_v1')||'{}');
   const selectedAddress=localStorage.getItem('inj_monitor_address')||'';
   return {wallets:wallets.map(w=>Object.assign({address:w.address,label:w.label},summaries[w.address]||{})),selectedAddress,price:null,priceAt:0,currency:'USD',privacy:false};
  }catch(_){return {wallets:[],selectedAddress:'',price:null,priceAt:0,currency:'USD',privacy:false}}
 }
 function snapshot(){return app()||fallback()}
 // Match Home: only digits whose visible values change flash green/red.
 // Currency symbols, separators and unaffected digits keep their normal color.
 function renderPriceDigits(node,oldText,newText,direction){
  const previousDigits=Array.from(String(oldText||'')).filter(char=>/\d/.test(char));
  const nextDigits=Array.from(String(newText||'')).filter(char=>/\d/.test(char));
  let digitIndex=0;
  const offset=previousDigits.length-nextDigits.length;
  const fragment=document.createDocumentFragment();
  for(const char of newText){
   if(!/\d/.test(char)){fragment.append(document.createTextNode(char));continue}
   const originalIndex=digitIndex+offset;
   const previous=originalIndex>=0&&originalIndex<previousDigits.length?previousDigits[originalIndex]:'';
   const digit=document.createElement('span');
   digit.className='nv-price-digit';
   if(direction&&previous!==char)digit.classList.add('nv-digit-'+direction);
   digit.textContent=char;
   fragment.append(digit);
   digitIndex++;
  }
  node.replaceChildren(fragment);
  clearTimeout(node._digitClearTimer);
  if(direction){
   node._digitClearTimer=setTimeout(()=>{
    node.querySelectorAll('.nv-digit-up,.nv-digit-down').forEach(digit=>{
     digit.classList.remove('nv-digit-up','nv-digit-down');
    });
    node._digitClearTimer=null;
   },430);
  }
 }
 function renderHomeStylePrice(usd,currency,rate){
  const node=$('nightPrice');
  if(!node)return;
  const current=usd>0?usd*rate:null;
  const digits=usd>0?(usd<10?4:3):2;
  const text=current!==null?money(current,currency,digits):'—';
  const previous=state.lastDisplayedPrice;
  const oldText=state.lastDisplayedText;
  const sameCurrency=state.lastDisplayedCurrency===currency;
  const changed=Boolean(oldText&&oldText!==text);
  let direction='';
  if(current!==null&&previous!==null&&sameCurrency&&changed){
   const delta=usd-previous;
   if(Math.abs(delta)>Math.max(1e-10,Math.abs(previous)*1e-11))
    direction=delta>0?'up':'down';
  }
  if(changed||!oldText){
   renderPriceDigits(node,oldText,text,direction);
  }
  if(direction){
   node.dataset.injQuoteDirection=direction;
   clearTimeout(state.directionTimer);
   state.directionTimer=setTimeout(()=>{
    node.removeAttribute('data-inj-quote-direction');
    fitPriceToWidth();
   },1050);
  }else if(current===null||!sameCurrency){
   clearTimeout(state.directionTimer);
   node.removeAttribute('data-inj-quote-direction');
  }
  state.lastDisplayedPrice=current!==null?usd:null;
  state.lastDisplayedCurrency=currency;
  state.lastDisplayedText=text;
  fitPriceToWidth();
 }
 let fitQueued=false;
 let lastFitSignature='';
 // Fit once for each viewport / price format, not on each market tick.
 // Tabular digits have equal widths, so changing their values must never
 // enlarge or shrink the price. Refit only when the number format changes.
 function fitPriceToWidth(force=false){
  const node=$('nightPrice'),frame=node?.parentElement;
  if(!node||!frame)return;
  const signature=frame.clientWidth+'|'+node.textContent.replace(/\d/g,'8');
  if(!force&&signature===lastFitSignature)return;
  if(fitQueued)return;
  fitQueued=true;
  requestAnimationFrame(()=>{
   fitQueued=false;
   const output=$('nightPrice'),container=output?.parentElement;
   if(!output||!container)return;
   output.style.fontSize='';
   const css=getComputedStyle(output),maxFont=parseFloat(css.fontSize);
   const available=container.clientWidth-12;
   if(maxFont>0&&available>0){
    // A DOM Range measures the real Rubik font with tabular numerals,
    // including the actual letter-spacing (unlike canvas.measureText).
    const range=document.createRange();
    range.selectNodeContents(output);
    const textWidth=range.getBoundingClientRect().width;
    // The direction arrow always occupies .45em + .13em, even when hidden.
    // Leave a little extra space to prevent rounding-related overflow.
    const required=textWidth+maxFont*.65;
    if(required>available){
     output.style.fontSize=Math.max(22,maxFont*available/required)+'px';
    }
   }
   lastFitSignature=container.clientWidth+'|'+output.textContent.replace(/\d/g,'8');
  });
 }
 function paint(){
  const now=Date.now(),snap=snapshot(),rows=Array.isArray(snap.wallets)?snap.wallets:[],
   selected=rows.find(w=>w.address===snap.selectedAddress)||rows[0]||null;
  const parentPrice=num(snap.price),parentPriceAt=num(snap.priceAt)||0;
  const parentValid=parentPrice>0 && parentPriceAt>0 && now-parentPriceAt>=0 && now-parentPriceAt<60000;
  const tradeValid=state.price>0 && now-state.tradeAt>=0 && now-state.tradeAt<45000;
  const usd=tradeValid && (!parentValid||state.tradeAt>=parentPriceAt)?state.price:(parentValid?parentPrice:null);
  const eur=num(snap.eurRate),fx=snap.currency==='EUR'&&snap.fxVerified&&eur>0;
  const currency=fx?'EUR':'USD',rate=fx?eur:1;
  renderHomeStylePrice(usd,currency,rate);
  let direction='flat',change='— (24h)';
  if(state.change!==null&&now-state.tickerAt<180000){
    direction=state.change>=0?'up':'down';
    change=(state.change>=0?'↗ +':'↘ ')+fmt(state.change,2)+'% (24h)';
  }
  $('nightChange').dataset.direction=direction;
  $('nightChange').textContent=change;
  const feed=tradeValid?'live':parentValid?'delayed':'sync';
  $('nightFeed').dataset.status=feed;
  $('nightFeedText').textContent=feed==='live'?'LIVE':feed==='delayed'?tr('AGGIORNAMENTO','UPDATING'):(navigator.onLine?'SYNC':'OFFLINE');
  const address=selected?.address||'';
  if(state.selected!==address){state.selected=address;state.walletAt=0;}
  const staked=num(selected?.staked),total=num(selected?.total),rewards=num(selected?.rewards),apr=num(selected?.apr);
  const updated=num(selected?.updated)||0,age=updated?Math.max(0,now-updated):Infinity;
  const walletVerified=!!address&&valid(staked)&&valid(total)&&valid(rewards)&&updated>0;
  const walletFresh=walletVerified&&age<120000;
  const available=walletVerified?Math.max(0,total-staked):null;
  const privacy=!!snap.privacy;
  note('nightStaked',privacy?'••••':walletVerified?unit(staked,2):'—');
  note('nightAvailable',privacy?'••••':available!==null?unit(available,2):'—');
  // Both balances use the exact same recent quote and currency as the rewards.
  // Preserve privacy and avoid presenting missing prices as zero.
  const fiatQuantity=(quantity)=>privacy?'••••':(quantity!==null&&usd>0?'≈ '+money(quantity*usd*rate,currency,2):'—');
  $('nightStakedFiat').textContent=fiatQuantity(walletVerified?staked:null);
  $('nightAvailableFiat').textContent=fiatQuantity(available);
  // Interpolation is an estimate, limited to 20s after an on-chain snapshot.
  const mayEstimate=walletFresh&&age<35000&&apr!==null&&apr>0&&staked>0;
  const estimated=mayEstimate?staked*apr/100*Math.min(age,20000)/msYear:0;
  const shown=walletVerified?rewards+estimated:null;
  note('nightReward',privacy?'••••':shown!==null?unit(shown,6):'—');
  const canConvert=usd>0&&shown!==null;
  $('nightRewardFiat').textContent=privacy?'••••':canConvert?'≈ '+money(shown*usd*rate,currency,2):'—';
  $('nightRewardConfidence').textContent=!address?tr('Seleziona un wallet dalla Home','Select a wallet on Home'):
   !walletVerified?tr('In attesa dei dati on-chain','Awaiting on-chain data'):
   !walletFresh?tr('Snapshot on-chain da aggiornare','On-chain snapshot needs refresh'):
   mayEstimate&&estimated>0?tr('Crescita stimata tra conferme on-chain','Estimated accrual between on-chain confirmations'):
   tr('Ultimo saldo confermato on-chain','Last on-chain confirmed balance');
  $('nightApr').textContent=apr!==null&&apr>=0&&walletFresh?fmt(apr,2)+'%':'—';
  $('nightNetwork').dataset.status=state.networkOk===true?'online':'unknown';
  $('nightNetwork').textContent=state.networkOk===true?tr('Operativa','Online'):state.networkOk===false?tr('Da verificare','Check needed'):'—';
  const freshest=Math.max(parentValid?parentPriceAt:0,tradeValid?state.tradeAt:0,walletFresh?updated:0);
  $('nightUpdated').textContent=freshest?new Date(freshest).toLocaleTimeString(lang()==='en'?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  $('nightNote').textContent=!walletFresh&&address?tr('Dati wallet non aggiornati: valori non considerati live','Wallet data are stale; balances are not live'):
   (!usd?tr('Prezzo in sincronizzazione','Synchronizing price'):'');
 }
 function back(){
  if(parent!==window)parent.postMessage({type:'injnode:section:home'},location.origin);
  else location.href='./index.html';
 }
 $('nightBack').addEventListener('click',back);
 $('nightModeToggle').addEventListener('click',()=>{
  nightEnabled=!nightEnabled;
  applyPalette();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')back()});
 function translate(){
  document.documentElement.lang=lang();
  try{document.documentElement.dataset.injFont=localStorage.getItem('inj_node_font_v1')==='slim'?'slim':'bold'}catch(_){}
  document.querySelectorAll('[data-it]').forEach(node=>{node.textContent=tr(node.dataset.it,node.dataset.en)});
  $('nightBack').setAttribute('aria-label',tr('Torna alla Home','Back to Home'));
  applyPalette();
  paint();
 }
 window.addEventListener('storage',e=>{
  if(['inj_node_language_v1','inj_node_font_v1'].includes(e.key))translate();
  if(e.key==='inj_monitor_theme'&&!nightEnabled)applyPalette();
 });
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:languagechange')translate()});
 function trade(price,time){
  if(!(price>0))return;
  if(state.lastTick!==null && price!==state.lastTick){
   // Direction is secondary to the 24h change, which is independently verified.
  }
  state.lastTick=price;state.price=price;state.tradeAt=time>0?Math.min(Date.now(),time):Date.now();
  paint();
 }
 async function ticker(){
  if(state.fetching||!navigator.onLine)return;
  state.fetching=true;
  const hosts=['https://data-api.binance.vision','https://api.binance.com'];
  for(const host of hosts){
   const c=new AbortController(),t=setTimeout(()=>c.abort(),5000);
   try{
    const res=await fetch(host+'/api/v3/ticker/24hr?symbol=INJUSDT',{cache:'no-store',signal:c.signal,credentials:'omit'});
    if(!res.ok)throw Error(String(res.status));
    const data=await res.json(),price=Number(data.lastPrice),change=Number(data.priceChangePercent);
    if(Number.isFinite(change)){state.change=change;state.tickerAt=Date.now();}
    if(price>0 && Date.now()-state.tradeAt>18000)trade(price,Date.now());
    clearTimeout(t);break;
   }catch(_){clearTimeout(t)}
  }
  state.fetching=false;paint();
 }
 function connect(){
  if(document.hidden||!navigator.onLine||state.ws)return;
  const urls=['wss://stream.binance.com:9443/ws/injusdt@aggTrade','wss://data-stream.binance.vision/ws/injusdt@aggTrade'];
  let ws;
  try{ws=new WebSocket(urls[state.wsRetry%urls.length]);state.ws=ws}
  catch(_){state.ws=null;return}
  ws.onopen=()=>{state.wsRetry=0;paint()};
  ws.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.e==='aggTrade')trade(Number(d.p),Number(d.T)||Date.now())}catch(_){}};
  ws.onerror=()=>{try{ws.close()}catch(_){}};
  ws.onclose=()=>{if(state.ws===ws){state.ws=null;state.wsRetry+=1;}paint()};
 }
 async function checkNetwork(){
  if(document.hidden||!navigator.onLine)return;
  for(const host of ['https://sentry.lcd.injective.network:443','https://lcd.injective.network']){
   const c=new AbortController(),timeout=setTimeout(()=>c.abort(),4500);
   try{
    const res=await fetch(host+'/cosmos/base/tendermint/v1beta1/blocks/latest',{cache:'no-store',signal:c.signal});
    if(!res.ok)throw Error('http');
    const data=await res.json(),time=Date.parse(data?.block?.header?.time||data?.sdk_block?.header?.time||'');
    if(!Number.isFinite(time))throw Error('timestamp');
    const age=(Date.now()-time)/1000;
    state.networkOk=age>=0&&age<45;
    state.networkAge=age;state.networkAt=Date.now();break;
   }catch(_){state.networkOk=null}
   finally{clearTimeout(timeout)}
  }
  paint();
 }
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){state.ws?.close();state.ws=null;}
  else{paint();connect();ticker();checkNetwork();}
 });
 window.addEventListener('online',()=>{connect();ticker();checkNetwork()});
 window.addEventListener('resize',fitPriceToWidth,{passive:true});
 document.fonts?.ready?.then(fitPriceToWidth);
 window.addEventListener('offline',()=>{state.ws?.close();state.ws=null;paint()});
 translate();connect();ticker();checkNetwork();paint();
 setInterval(()=>{if(!document.hidden)paint()},1000);
 setInterval(()=>{if(!document.hidden){if(!state.ws)connect();if(Date.now()-state.tickerAt>55000)ticker()}},12000);
 setInterval(()=>{if(!document.hidden)checkNetwork()},30000);
})();