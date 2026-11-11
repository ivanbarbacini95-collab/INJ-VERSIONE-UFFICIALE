/* INJ Node / Tools · INJ Multi Chart.
   Actual Binance INJUSDT OHLC + a single aggTrade stream.
   Only active timeframe group is fetched/rendered. No permanent RAF. */
(() => {
  'use strict';
  if (document.documentElement.dataset.injPage !== 'multi-chart') return;
  const $ = id => document.getElementById(id);
  const defs = [
    {id:'1m',name:'1 MIN',interval:'1m',ms:60000},
    {id:'5m',name:'5 MIN',interval:'5m',ms:300000},
    {id:'15m',name:'15 MIN',interval:'15m',ms:900000},
    {id:'1h',name:'1 ORA',nameEn:'1 HOUR',interval:'1h',ms:3600000},
    {id:'4h',name:'4 ORE',nameEn:'4 HOURS',interval:'4h',ms:14400000},
    {id:'1d',name:'1 GIORNO',nameEn:'1 DAY',interval:'1d',ms:86400000},
    {id:'1w',name:'1 SETTIMANA',nameEn:'1 WEEK',interval:'1w',ms:604800000},
    {id:'1M',name:'1 MESE',nameEn:'1 MONTH',interval:'1M',ms:null}
  ];
  const groups = [defs.slice(0,2),defs.slice(2,4),defs.slice(4,6),defs.slice(6,8)];
  const cards = new Map();
  const state = {
    page:0,style:'candles',series:new Map(),loading:new Map(),lastLoad:new Map(),
    socket:null,lastTradeAt:0,reconnectTimer:0,retries:0,drawFrame:0,lastDraw:0,
    zoom:null,resizeObserver:null,trades:[],closed:false,
    quote:NaN,shownQuote:NaN,lastQuoteChangeAt:0,quoteResetTimer:0
  };
  const rail = $('mcRail');
  const zoom = $('mcZoom');
  // Keep the original swipe-based 2-chart pages on phones. On large
  // desktop / external screens the same eight chart canvases form a
  // single grid, with no duplicate feeds or sockets.
  const overviewMedia = window.matchMedia(
    '(min-width:1100px) and (min-height:650px), (min-width:780px) and (min-height:900px) and (orientation:portrait), (min-width:640px) and (min-height:800px) and (orientation:portrait) and (pointer:fine)'
  );
  const overview = () => overviewMedia.matches;
  const activeDefs = () => overview() ? defs : groups[state.page];
  const en = () => document.documentElement.lang === 'en';
  const text = (it,english) => en() ? english : it;
  const visible = () => !document.hidden && !state.closed;
  const priceLabel = p => !Number.isFinite(p) || p <= 0 ? '—' :
    p.toLocaleString(en()?'en-US':'it-IT',{minimumFractionDigits:p < 1?5:p < 10?4:2,maximumFractionDigits:p < 1?5:p < 10?4:2});
  const escapeState = () => {if(zoom.open)zoom.close();else goBack();};
  const getStyle = () => {
    try{const s=localStorage.getItem('inj_multi_chart_style_v1');return s==='lines'?'lines':'candles';}
    catch(_){return 'candles';}
  };
  state.style = getStyle();

  function goBack(){
    if (parent !== window) parent.postMessage({type:'injnode:section:home'}, location.origin);
    else location.href='./index.html';
  }
  function createCard(def,page){
    const card=document.createElement('article');card.className='mc-card';card.dataset.tf=def.id;
    const head=document.createElement('div');head.className='mc-card-head';
    const label=document.createElement('strong');label.className='mc-card-label';label.textContent=def.name;
    const detail=document.createElement('div');detail.className='mc-card-detail';
    const change=document.createElement('span');change.className='mc-card-change';change.textContent='—';
    const expand=document.createElement('button');expand.className='mc-expand';expand.type='button';
    expand.setAttribute('aria-label',text('Ingrandisci ','Expand ')+def.id);
    expand.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>';
    expand.addEventListener('click',()=>openZoom(def));
    detail.append(change,expand);head.append(label,detail);
    const stage=document.createElement('div');stage.className='mc-canvas-wrap';
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','INJ/USDT '+def.id);
    const empty=document.createElement('span');empty.className='mc-empty';empty.textContent='SYNC';
    stage.append(canvas,empty);card.append(head,stage);
    $('mcGrid'+page).append(card);
    cards.set(def.id,{def,card,canvas,empty,label,change});
  }
  groups.forEach((g,index)=>g.forEach(d=>createCard(d,index)));

  function refreshLanguage(){
    const doc=document.documentElement;
    try{doc.lang=localStorage.getItem('inj_node_language_v1')==='en'?'en':'it';}catch(_){}
    document.querySelectorAll('[data-it][data-en]').forEach(n=>{
      n.textContent=en()?n.dataset.en:n.dataset.it;
    });
    for(const {def,label,empty} of cards.values()){
      label.textContent=en()?(def.nameEn||def.name):def.name;
      if(empty.dataset.error==='true')empty.textContent=text('DATI NON DISPONIBILI','DATA UNAVAILABLE');
    }
    if(state.zoom)updateZoomText();
    if(overview())$('mcRangeHeading').textContent=text('TUTTI GLI 8 TIMEFRAME','ALL 8 TIMEFRAMES');
    updateFeed();
  }

  function setStyle(style){
    if(style!=='candles'&&style!=='lines')return;
    state.style=style;
    try{localStorage.setItem('inj_multi_chart_style_v1',style)}catch(_){}
    $('mcCandles').classList.toggle('selected',style==='candles');
    $('mcLines').classList.toggle('selected',style==='lines');
    $('mcCandles').setAttribute('aria-pressed',String(style==='candles'));
    $('mcLines').setAttribute('aria-pressed',String(style==='lines'));
    queueDraw(true);
  }
  function setPage(page,move){
    const next=Math.max(0,Math.min(groups.length-1,page));
    state.page=next;
    $('mcRangeHeading').textContent=overview()
      ? text('TUTTI GLI 8 TIMEFRAME','ALL 8 TIMEFRAMES')
      : ['1m · 5m','15m · 1H','4H · 1D','1W · 1M'][next];
    $('mcPrev').disabled=next===0;
    $('mcNext').disabled=next===groups.length-1;
    document.querySelectorAll('.mc-dots button').forEach(button=>{
      const current=Number(button.dataset.page)===next;
      button.classList.toggle('active',current);
      if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    if(move&&!overview())rail.scrollTo({left:rail.clientWidth*next,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    ensureCurrent();
    queueDraw(true);
  }

  function timeBucket(time,def){
    if(def.id==='1M'){
      const d=new Date(time);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);
    }
    if(def.id==='1w'){
      const d=new Date(time);
      const dow=(d.getUTCDay()+6)%7;
      return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-dow);
    }
    return Math.floor(time/def.ms)*def.ms;
  }
  function addPrice(rows,def,price,time){
    if(!(price>0)||!(time>0)||!rows.length)return;
    const bucket=timeBucket(time,def);
    const last=rows[rows.length-1];
    if(bucket<last.t)return;
    if(bucket>last.t){
      rows.push({t:bucket,o:price,h:price,l:price,c:price});
      if(rows.length>96)rows.splice(0,rows.length-96);
      return;
    }
    last.h=Math.max(last.h,price);last.l=Math.min(last.l,price);last.c=price;
  }
  function validateRows(raw){
    if(!Array.isArray(raw))throw Error('Not a kline array');
    return raw.map(r=>({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4])}))
      .filter(r=>Number.isFinite(r.t)&&r.t>0&&r.o>0&&r.c>0&&r.h>=Math.max(r.o,r.c)&&r.l>0&&r.l<=Math.min(r.o,r.c))
      .sort((a,b)=>a.t-b.t).slice(-96);
  }
  async function fetchRows(def){
    const bases=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
    for(const base of bases){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),7500);
      try{
        const url=base+'/api/v3/klines?symbol=INJUSDT&interval='+encodeURIComponent(def.interval)+'&limit=96';
        const response=await fetch(url,{cache:'no-store',signal:controller.signal,credentials:'omit'});
        if(!response.ok)throw Error('HTTP '+response.status);
        const rows=validateRows(await response.json());
        if(rows.length>1)return rows;
      }catch(_){}
      finally{clearTimeout(timer);}
      if(!visible())break;
    }
    throw Error('Market history unavailable');
  }
  async function ensureSeries(def,force){
    if(!visible())return;
    const last=state.lastLoad.get(def.id)||0;
    if(!force&&state.series.has(def.id)&&Date.now()-last<90000)return;
    if(state.loading.has(def.id))return state.loading.get(def.id);
    const card=cards.get(def.id);
    const started=Date.now();
    const job=(async()=>{
      try{
        const rows=await fetchRows(def);
        // Preserve any genuine trades received while the network snapshot loaded.
        state.trades.filter(t=>t.at>=started).forEach(t=>addPrice(rows,def,t.price,t.time));
        if(!visible())return;
        state.series.set(def.id,rows);
        state.lastLoad.set(def.id,Date.now());
        if(!(state.quote>0)){state.quote=rows.at(-1)?.c||NaN;paintQuote();}
        card.empty.hidden=true;
        card.empty.dataset.error='false';
        updateChange(def);
      }catch(_){
        if(!state.series.has(def.id)){
          card.empty.hidden=false;
          card.empty.dataset.error='true';
          card.empty.textContent=text('DATI NON DISPONIBILI','DATA UNAVAILABLE');
        }
      }finally{
        state.loading.delete(def.id);
        queueDraw();
        updateFeed();
      }
    })();
    state.loading.set(def.id,job);return job;
  }
  async function ensureGroup(index,force=false){
    if(!visible())return;
    const list=groups[index];
    // Two parallel REST requests at a time; the other page remains dormant.
    let cursor=0;
    async function worker(){
      while(cursor<list.length&&visible()&&state.page===index){
        const def=list[cursor++];
        await ensureSeries(def,force);
      }
    }
    await Promise.all([worker(),worker()]);
  }

  async function ensureOverview(force=false){
    if(!visible()||!overview())return;
    // All eight cards stay live on large screens. Only two historical
    // requests are inflight at once; a single trade websocket updates all.
    let cursor=0;
    async function worker(){
      while(cursor<defs.length&&visible()&&overview()){
        const def=defs[cursor++];
        await ensureSeries(def,force);
      }
    }
    await Promise.all([worker(),worker()]);
  }
  function ensureCurrent(force=false){
    return overview()?ensureOverview(force):ensureGroup(state.page,force);
  }

  function updateChange(def){
    const card=cards.get(def.id),arr=state.series.get(def.id);
    if(!card)return;
    const last=arr?.at(-1);
    // Display the current candle's change for the labeled timeframe, never
    // an unlabeled arbitrary 32-bar return.
    if(!last?.o||!last?.c){card.change.textContent='—';card.change.className='mc-card-change';return;}
    const pct=(last.c/last.o-1)*100;
    card.change.textContent=(pct>0?'+':'')+pct.toFixed(2)+'%';
    card.change.className='mc-card-change'+(pct>0?' up':pct<0?' down':'');
  }

  function draw(canvas,def,expanded=false){
    const rows=state.series.get(def.id);
    const parent=canvas.parentElement;
    const width=parent.clientWidth,height=parent.clientHeight;
    if(width<24||height<35)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    if(!rows?.length)return;
    const styles=getComputedStyle(document.documentElement);
    const ink=styles.getPropertyValue('--mc-ink').trim()||'#e4eef3';
    const dim=styles.getPropertyValue('--mc-dim').trim()||'#899da8';
    const green=styles.getPropertyValue('--mc-green').trim()||'#00eb8b';
    const red=styles.getPropertyValue('--mc-red').trim()||'#ff415c';
    const accent=styles.getPropertyValue('--mc-accent').trim()||green;
    // External portrait/landscape displays use a dedicated candle geometry.
    // Keep phone canvases and their original 7px candle cap unchanged.
    const externalDisplay=(window.innerWidth>=700 && window.innerHeight>=650 && width>=550)
      || (overview() && !expanded && width>=230);
    const portraitDisplay=window.innerHeight>window.innerWidth;
    const left=expanded?12:5,right=width-(externalDisplay? (expanded?80:72) : (expanded?57:45));
    const top=expanded?14:7,bottom=height-(externalDisplay? (expanded?36:30) : (expanded?29:21));
    const plotW=Math.max(1,right-left),plotH=Math.max(1,bottom-top);
    const maxBars=externalDisplay
      ? Math.max(24,Math.min(expanded?(portraitDisplay?56:76):(portraitDisplay?48:72),
          Math.floor(plotW/(portraitDisplay?12:13))))
      : Math.max(12,Math.min(expanded?90:62,Math.floor(plotW/(expanded?8:5))));
    const shown=rows.slice(-maxBars);
    let hi=-Infinity,lo=Infinity;
    for(const p of shown){hi=Math.max(hi,p.h);lo=Math.min(lo,p.l);}
    if(!(hi>0&&lo>0))return;
    const spread=Math.max(hi-lo,hi*0.0015);
    hi+=spread*0.10;lo=Math.max(0,lo-spread*.10);
    const mapY=p=>top+(hi-p)/(hi-lo)*plotH;
    const step=plotW/shown.length;
    ctx.lineWidth=1;ctx.strokeStyle=dim;ctx.globalAlpha=.13;
    for(const ratio of [.25,.5,.75]){
      const y=top+plotH*ratio;
      ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    }
    ctx.globalAlpha=1;
    if(state.style==='lines'){
      ctx.strokeStyle=accent;ctx.lineWidth=expanded?2:1.6;ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();
      shown.forEach((p,i)=>{const x=left+(i+.5)*step,y=mapY(p.c);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
      ctx.stroke();
    }else{
      // Scale candle bodies with their slot: the previous hard 7px cap
      // made them look like spaced-out needles on external monitors.
      // Preserve a visible gutter and a crisp wick at every resolution.
      const bodyWidth=externalDisplay
        ? Math.max(3,Math.min(30,step*.84))
        : Math.max(1,Math.min(expanded?10:7,step*.66));
      shown.forEach((p,i)=>{
        const x=left+(i+.5)*step,up=p.c>=p.o;
        ctx.strokeStyle=up?green:red;ctx.fillStyle=up?green:red;
        ctx.lineWidth=externalDisplay?Math.max(1.5,Math.min(2.5,step*.14))
          :Math.max(1,Math.min(1.5,step*.18));
        ctx.beginPath();ctx.moveTo(x,mapY(p.h));ctx.lineTo(x,mapY(p.l));ctx.stroke();
        const y1=mapY(Math.max(p.o,p.c)),y2=mapY(Math.min(p.o,p.c));
        ctx.fillRect(x-bodyWidth/2,y1,bodyWidth,Math.max(1.2,y2-y1));
      });
    }
    const last=shown[shown.length-1];
    if(last?.c>0){
      const y=mapY(last.c);
      // Price reference only: thin, readable yellow dashed line on every timeframe.
      const priceLine=styles.getPropertyValue('--mc-price-line').trim()||'#ffd84a';
      ctx.setLineDash([3,4]);ctx.strokeStyle=priceLine;ctx.lineWidth=.9;ctx.globalAlpha=.82;
      ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;
      ctx.font=(externalDisplay?(expanded?'14':'12'):(expanded?'11':'9'))+'px system-ui,sans-serif';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillStyle=ink;ctx.fillText(priceLabel(last.c),right+3,Math.max(top+5,Math.min(bottom-5,y)));
    }
    ctx.font=(externalDisplay?(expanded?'14':'12'):(expanded?'11':'9'))+'px system-ui,sans-serif';
    ctx.fillStyle=dim;ctx.textBaseline='middle';ctx.textAlign='left';
    ctx.fillText(priceLabel(hi),right+3,top+5);
    ctx.fillText(priceLabel(lo),right+3,bottom-5);
    const timeLabel=t=>{
      const d=new Date(t);
      if(def.ms&&def.ms<=3600000)return d.toLocaleTimeString(en()?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
      if(def.id==='1M')return d.toLocaleDateString(en()?'en-US':'it-IT',{month:'short',year:'2-digit',timeZone:'UTC'});
      return d.toLocaleDateString(en()?'en-US':'it-IT',{day:'2-digit',month:'short',timeZone:'UTC'});
    };
    ctx.textBaseline='alphabetic';ctx.textAlign='left';
    ctx.fillText(timeLabel(shown[0].t),left,height-3);
    ctx.textAlign='right';
    ctx.fillText(timeLabel(last.t),right,height-3);
  }
  function drawVisible(){
    if(!visible())return;
    paintQuote();
    for(const def of activeDefs()){
      const card=cards.get(def.id);
      if(card){updateChange(def);draw(card.canvas,def);}
    }
    if(state.zoom&&zoom.open)draw($('mcZoomCanvas'),state.zoom,true);
  }
  function queueDraw(force=false){
    if(!visible())return;
    if(state.drawFrame)return;
    const now=performance.now();
    const wait=force?0:Math.max(0,(overview()?350:200)-(now-state.lastDraw));
    if(wait){
      state.drawFrame=setTimeout(()=>{
        state.drawFrame=0;state.lastDraw=performance.now();drawVisible();
      },wait);
    }else{
      state.drawFrame=requestAnimationFrame(()=>{
        state.drawFrame=0;state.lastDraw=performance.now();drawVisible();
      });
    }
  }
  function applyTrade(price,time){
    if(!(price>0&&time>0))return;
    state.lastTradeAt=Date.now();
    state.quote=price;
    state.trades.push({at:Date.now(),price,time});
    if(state.trades.length>160)state.trades.splice(0,state.trades.length-160);
    for(const def of defs){
      const rows=state.series.get(def.id);
      if(!rows)continue;
      addPrice(rows,def,price,time);
    }
    queueDraw();
    // The exchange can send many trades per second; repaint the connection
    // badge at most once per second instead of writing the DOM every trade.
    if(Date.now()-(state.lastFeedPaint||0)>1200){
      state.lastFeedPaint=Date.now();updateFeed();
    }
  }
  function paintQuote(){
    const display=$('mcLivePrice'),arrow=$('mcPriceArrow'),quote=$('mcQuote');
    if(!display||!arrow||!quote)return;
    const value=state.quote;
    if(!(value>0)){display.textContent='—';arrow.textContent='';quote.classList.remove('up','down');return;}
    const label=priceLabel(value);
    if(display.textContent!==label)display.textContent=label;
    const previous=state.shownQuote;
    if(Number.isFinite(previous)&&value!==previous&&state.lastTradeAt>0){
      const rising=value>previous;
      quote.classList.toggle('up',rising);
      quote.classList.toggle('down',!rising);
      arrow.textContent=rising?'↗':'↘';
      state.lastQuoteChangeAt=Date.now();
      if(state.quoteResetTimer)clearTimeout(state.quoteResetTimer);
      state.quoteResetTimer=setTimeout(()=>{
        state.quoteResetTimer=0;
        quote.classList.remove('up','down');
        arrow.textContent='';
      },900);
    }else if(Date.now()-state.lastQuoteChangeAt>900){
      quote.classList.remove('up','down');
      arrow.textContent='';
    }
    state.shownQuote=value;
  }

  function updateFeed(){
    const feed=$('mcFeed'),label=$('mcFeedText');
    const paint=(next,message)=>{
      if(feed.dataset.state!==next)feed.dataset.state=next;
      if(label.textContent!==message)label.textContent=message;
      const badge=$('mcQuoteStatus');
      if(badge){
        if(badge.dataset.state!==next)badge.dataset.state=next;
        const short=next==='live'?'LIVE':next==='offline'?'OFF':next==='delayed'?'HIST':'SYNC';
        if(badge.textContent!==short)badge.textContent=short;
      }
    };
    if(!navigator.onLine){paint('offline','OFFLINE');return;}
    const open=state.socket?.readyState===WebSocket.OPEN;
    if(open&&Date.now()-state.lastTradeAt<65000){
      paint('live','LIVE');
    }else if(open){
      paint('connecting',text('CONNESSO','CONNECTED'));
    }else if(state.series.size){
      paint('delayed',text('STORICO','HISTORY'));
    }else {
      paint('connecting','SYNC');
    }
  }
  function closeSocket(){
    if(state.reconnectTimer){clearTimeout(state.reconnectTimer);state.reconnectTimer=0;}
    const socket=state.socket;
    state.socket=null;
    if(socket){socket.onclose=null;socket.onmessage=null;socket.onerror=null;try{socket.close()}catch(_){}}
  }
  function connectSocket(){
    if(!visible()||!navigator.onLine)return;
    if(state.socket?.readyState===WebSocket.OPEN||state.socket?.readyState===WebSocket.CONNECTING)return;
    closeSocket();
    const endpoints=[
      'wss://stream.binance.com:9443/ws/injusdt@aggTrade',
      'wss://data-stream.binance.vision/ws/injusdt@aggTrade'
    ];
    const ws=new WebSocket(endpoints[Math.min(state.retries%endpoints.length,endpoints.length-1)]);
    state.socket=ws;
    ws.onopen=()=>{state.retries=0;updateFeed();};
    ws.onmessage=event=>{
      try{
        const m=JSON.parse(event.data);
        if(m.e==='aggTrade')applyTrade(Number(m.p),Number(m.T)||Date.now());
      }catch(_){}
    };
    ws.onerror=()=>{try{ws.close()}catch(_){}};
    ws.onclose=()=>{
      if(state.socket!==ws)return;
      state.socket=null;updateFeed();
      if(!visible())return;
      state.retries+=1;
      const delay=Math.min(30000,1200*Math.pow(2,Math.min(4,state.retries)));
      state.reconnectTimer=setTimeout(()=>{state.reconnectTimer=0;connectSocket();},delay);
    };
  }
  function updateZoomText(){
    if(!state.zoom)return;
    $('mcZoomTitle').textContent='INJ / USDT';
    $('mcZoomRange').textContent=en()?(state.zoom.nameEn||state.zoom.name):state.zoom.name;
  }
  function openZoom(def){
    state.zoom=def;updateZoomText();
    try{zoom.showModal()}catch(_){zoom.setAttribute('open','');}
    requestAnimationFrame(()=>queueDraw(true));
  }
  function closeZoom(){
    if(zoom.open)zoom.close();else zoom.removeAttribute('open');
    state.zoom=null;
  }

  $('mcBack').addEventListener('click',goBack);
  $('mcCandles').addEventListener('click',()=>setStyle('candles'));
  $('mcLines').addEventListener('click',()=>setStyle('lines'));
  $('mcPrev').addEventListener('click',()=>setPage(state.page-1,true));
  $('mcNext').addEventListener('click',()=>setPage(state.page+1,true));
  $('mcZoomClose').addEventListener('click',closeZoom);
  zoom.addEventListener('close',()=>{state.zoom=null;});
  document.querySelectorAll('.mc-dots button').forEach(button=>{
    button.addEventListener('click',()=>setPage(Number(button.dataset.page),true));
  });
  rail.addEventListener('scroll',()=>{
    if(overview())return;
    const page=Math.round(rail.scrollLeft/Math.max(1,rail.clientWidth));
    if(page!==state.page)setPage(page,false);
  },{passive:true});
  rail.addEventListener('keydown',e=>{
    if(overview())return;
    if(e.key='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();setPage(state.page+(e.key==='ArrowRight'?1:-1),true);
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!zoom.open)escapeState();});
  if('ResizeObserver' in window){
    state.resizeObserver=new ResizeObserver(()=>queueDraw(true));
    cards.forEach(card=>state.resizeObserver.observe(card.canvas.parentElement));
    state.resizeObserver.observe($('mcZoomCanvas').parentElement);
  }else window.addEventListener('resize',()=>queueDraw(true),{passive:true});
  // Rotation, external display changes and window resizing all keep the
  // grid mode and chart canvases synchronized without reloading the page.
  let previousOverview=overview();
  function syncResponsiveLayout(){
    const expanded=overview();
    const switched=expanded!==previousOverview;
    previousOverview=expanded;
    if(!expanded){
      const alignRail=()=>rail.scrollTo({left:rail.clientWidth*state.page,behavior:'auto'});
      if(switched)requestAnimationFrame(alignRail);
      else alignRail();
    }
    setPage(state.page,false);
    queueDraw(true);
  }
  if(overviewMedia.addEventListener)overviewMedia.addEventListener('change',syncResponsiveLayout);
  else if(overviewMedia.addListener)overviewMedia.addListener(syncResponsiveLayout);
  window.addEventListener('resize',syncResponsiveLayout,{passive:true});
  window.addEventListener('orientationchange',syncResponsiveLayout,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){closeSocket();return;}
    connectSocket();ensureCurrent(true);queueDraw(true);
  });
  window.addEventListener('online',()=>{connectSocket();ensureCurrent(true);updateFeed();});
  window.addEventListener('offline',()=>{closeSocket();updateFeed();});
  window.addEventListener('pageshow',()=>{state.closed=false;connectSocket();ensureCurrent();});
  window.addEventListener('pagehide',()=>{state.closed=true;closeSocket();if(state.quoteResetTimer){clearTimeout(state.quoteResetTimer);state.quoteResetTimer=0;}});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type==='injnode:font:sync'){
      document.documentElement.dataset.injFont=event.data.font==='slim'?'slim':'bold';return;
    }
    if(event.data?.type==='injnode:languagechange'||event.data?.type==='injnode:market:language'){
      try{localStorage.setItem('inj_node_language_v1',event.data.language==='en'?'en':'it')}catch(_){}
      refreshLanguage();queueDraw(true);
    }
  });
  window.addEventListener('storage',event=>{
    if(event.key==='inj_node_language_v1')refreshLanguage();
    if(event.key==='inj_node_font_v1')document.documentElement.dataset.injFont=event.newValue==='slim'?'slim':'bold';
    if(event.key==='inj_monitor_theme'){
      const themes=['obsidian','arctic','orbit','classic-black','classic-white'];
      if(themes.includes(event.newValue))document.documentElement.dataset.theme=event.newValue;
      queueDraw(true);
    }
  });
  setStyle(state.style);refreshLanguage();setPage(0,false);updateFeed();connectSocket();
  // Reconcile candles periodically without another live socket. Dormant groups
  // and backgrounded iframes do not load network history or draw.
  setInterval(()=>{
    if(!visible())return;
    updateFeed();
    const stale=activeDefs().some(d=>Date.now()-(state.lastLoad.get(d.id)||0)>90000);
    if(stale)ensureCurrent(true);
    if(!state.socket||state.socket.readyState===WebSocket.CLOSED)connectSocket();
  },30000);
})();
