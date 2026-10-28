/* INJ NODE / High Impact Global Market Events + Live Crypto Ribbon.
 * All market values come from /api/crypto-ribbon and /api/market-events.
 * No dummy events, actual values, fake times, background push promises.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 if(!$('injMarketTicker')||!$('injMarketEventsOverlay'))return;
 const STORE='inj_node_market_events_v1';
 const REGIONS={USD:'US',EUR:'EU',GBP:'EU',CHF:'EU',JPY:'ASIA',CNY:'ASIA'};
 const tr=(it,en)=>String(document.documentElement.lang||'it').toLowerCase().startsWith('en')?en:it;
 const fmtNum=(n,d=2)=>new Intl.NumberFormat(tr('it-IT','en-US'),{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
 const dateFmt=(date,opts)=>{try{return new Date(date).toLocaleString(tr('it-IT','en-US'),opts)}catch{return '—'}};
 const byDate=(a,b)=>Date.parse(a.date)-Date.parse(b.date);
 const now=()=>Date.now();
 const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}};
 const config=read();
 const state={
   open:false,events:[],source:'',coverage:'',sourceURL:'',days:[1,3,7,14,30].includes(+config.days)?+config.days:7,
   region:['ALL','US','EU','ASIA'].includes(config.region)?config.region:'ALL',
   reminder:[5,10,15,30].includes(+config.reminder)?+config.reminder:10,
   alerts:config.alerts===true,initialized:false,
   seen:config.seen&&typeof config.seen==='object'?config.seen:{},
   notified:config.notified&&typeof config.notified==='object'?config.notified:{},
   results:config.results&&typeof config.results==='object'?config.results:{},
   current:null,processing:false,reloadQueued:false,lastMarket:0,lastCalendar:0,inFlight:null
 };
 const save=()=>{
  try{
   const compact=(obj)=>Object.fromEntries(Object.entries(obj).slice(-120));
   localStorage.setItem(STORE,JSON.stringify({
    days:state.days,region:state.region,reminder:state.reminder,alerts:state.alerts,
    seen:compact(state.seen),notified:compact(state.notified),results:compact(state.results)
   }));
  }catch{}
 };
 const elt=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
 const validActual=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 const nice=v=>validActual(v)?String(v):'—';
 const todayUTC=()=>new Date().toISOString().slice(0,10);
 function countdown(ms){
  if(ms<=0)return tr('PUBBLICAZIONE IN CORSO','RELEASE IN PROGRESS');
  const m=Math.ceil(ms/60000),h=Math.floor(m/60);
  if(h>=24)return tr('tra ','in ')+Math.floor(h/24)+tr('g ','d ')+(h%24)+'h';
  if(h>=1)return tr('tra ','in ')+h+'h '+(m%60)+'m';
  return tr('tra ','in ')+m+'m';
 }
 function validateEvent(e){
  const ts=Date.parse(e.date||'');
  if(!Number.isFinite(ts)||!REGIONS[e.country]||e.importance!==3||String(e.title||'').length<2)return null;
  return {id:String(e.id||e.country+'-'+e.title+'-'+e.date).slice(0,170),title:String(e.title).slice(0,160),
    date:new Date(ts).toISOString(),country:e.country,region:REGIONS[e.country],
    actual:validActual(e.actual)?String(e.actual):null,forecast:validActual(e.forecast)?String(e.forecast):null,
    previous:validActual(e.previous)?String(e.previous):null,status:String(e.status||'scheduled')};
 }
 function renderTicker(data){
  const track=$('injMarketTickerTrack');track.replaceChildren();
  const entries=Array.isArray(data.tickers)?data.tickers.filter(x=>Number.isFinite(Number(x.price))&&Number(x.price)>0):[];
  if(!entries.length){track.append(elt('span','inj-market-ticker-loading',tr('Dati crypto non disponibili','Crypto quotes unavailable')));return;}
  const group=elt('span','inj-market-ticker-group');
  group.style.display='inline-flex';group.style.alignItems='center';group.style.gap='30px';
  for(const x of entries){
    const item=elt('span','inj-market-ticker-item');
    const code=elt('b',null,x.symbol+'/USDT');
    const price=elt('span',null,'$'+fmtNum(Number(x.price),x.symbol==='BTC'||x.symbol==='ETH'?2:x.symbol==='SOL'?3:4));
    const delta=Number(x.change24h);
    const change=elt('em',Number.isFinite(delta)?delta>=0?'positive':'negative':'neutral',Number.isFinite(delta)?(delta>=0?'+':'')+fmtNum(delta,2)+'%':'—');
    item.append(code,price,change);group.append(item);
  }
  const copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');
  track.append(group,copy);
  // CSS marquee moves exactly half of the identical doubled content.
  track.style.animationDuration=Math.max(30,entries.length*11)+'s';
 }
 async function updateTicker(){
  if(document.hidden)return;
  try{
    const r=await fetch('/api/crypto-ribbon',{cache:'no-store'});
    if(!r.ok)throw Error('ticker unavailable');
    const j=await r.json();renderTicker(j);state.lastMarket=now();
  }catch{
    // Never fabricate live values. Keep previously displayed quotes but mark stale.
    const track=$('injMarketTickerTrack');
    if(!state.lastMarket){track.replaceChildren(elt('span','inj-market-ticker-loading',tr('Quotazioni non disponibili','Prices unavailable')));}
    else if(now()-state.lastMarket>180000){track.replaceChildren(elt('span','inj-market-ticker-loading',tr('Quotazioni non aggiornate','Quotes not refreshed')));}
  }
 }
 function setMessage(msg){
  $('injEventsWarning').textContent=msg;
 }
 function displaySource(){
   const host=$('injEventsSource');host.replaceChildren();
   const label=elt('span',null,tr('Fonte: ','Source: '));
   const safeURL=state.source==='ShowMyTrades'?'https://showmytrades.com/tools/economic-calendar':
    state.source.startsWith('Forex Factory')?'https://www.forexfactory.com/calendar':null;
   if(safeURL){const link=elt('a',null,state.source);link.href=safeURL;link.target='_blank';link.rel='noopener noreferrer';host.append(label,link);}
   else host.append(elt('span',null,tr('Fonte non disponibile','Source unavailable')));
 }
 function localClock(d){return dateFmt(d,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}
 function list(){
  const events=state.events.filter(e=>state.region==='ALL'||e.region===state.region).sort(byDate);
  const host=$('injEventsRows');host.replaceChildren();
  $('injEventsCount').textContent=String(events.length);
  const upcoming=events.find(e=>Date.parse(e.date)>=now()-60000);
  $('injEventsNext').textContent=upcoming?countdown(Date.parse(upcoming.date)-now()):'—';
  $('injEventsDataStatus').textContent=state.source?tr('AGGIORNATO','UPDATED'):'OFFLINE';
  const featured=$('injEventsFeatured');
  featured.hidden=!upcoming;
  if(upcoming){
    const eventTime=dateFmt(upcoming.date,{weekday:'short',day:'numeric',month:'short'})+' · '+localClock(upcoming.date);
    $('injEventsFeaturedTime').textContent=upcoming.country+'  /  '+eventTime;
    $('injEventsFeaturedTitle').textContent=upcoming.title;
    $('injEventsFeaturedCountdown').textContent=countdown(Date.parse(upcoming.date)-now());
    const details=$('injEventsFeaturedDetails');details.replaceChildren();
    if(validActual(upcoming.forecast))details.append(elt('span',null,tr('Atteso ','Forecast ')+upcoming.forecast));
    if(validActual(upcoming.previous))details.append(elt('span',null,tr('Precedente ','Previous ')+upcoming.previous));
    const view=elt('button','inj-events-feature-open',tr('VEDI DETTAGLI ↗','VIEW DETAILS ↗'));view.type='button';
    view.addEventListener('click',()=>showResult(upcoming,false));details.append(view);
  }
  if(!events.length){
    host.append(elt('p','inj-events-empty',state.source?tr('Nessun evento ★★★ per il periodo e la regione selezionati.','No ★★★ events in this range and region.'):tr('Calendario non disponibile. Riprova tra poco.','Calendar unavailable. Retry later.')));
    return;
  }
  let lastDay='';
  for(const e of events){
    const day=dateFmt(e.date,{weekday:'long',day:'2-digit',month:'long'});
    if(day!==lastDay){
      const heading=elt('div','inj-events-day');
      heading.append(elt('span',null,day),elt('span',null,tr('ORA LOCALE · 24H','LOCAL TIME · 24H')));
      host.append(heading);lastDay=day;
    }
    const future=Date.parse(e.date)>now(),released=validActual(e.actual);
    const button=elt('button','inj-events-item');
    button.type='button';
    if(upcoming&&upcoming.id===e.id)button.classList.add('is-next');
    if(released)button.classList.add('is-released');
    button.setAttribute('aria-label',e.title+', '+localClock(e.date)+', '+e.country);
    const time=elt('div','inj-events-item-time');
    time.append(elt('strong',null,localClock(e.date)),elt('small',null,e.country));
    const main=elt('div','inj-events-item-main');
    main.append(elt('strong',null,e.title));
    const meta=elt('span','inj-events-item-meta');
    if(released){
      meta.textContent=tr('EFFETTIVO','ACTUAL')+'  '+e.actual+(validActual(e.forecast)?'   ·   '+tr('ATTESO','FORECAST')+'  '+e.forecast:'');
    }else if(validActual(e.forecast)){
      meta.textContent=tr('ATTESO','FORECAST')+'  '+e.forecast;
    }else if(future){
      meta.textContent=tr('DATO NON ANCORA PUBBLICATO','AWAITING RELEASE');
    }else{
      meta.textContent=tr('IN ATTESA DEL DATO','AWAITING ACTUAL');
    }
    main.append(meta);
    const status=elt('span','inj-events-item-status');
    if(released){status.classList.add('released');status.textContent=tr('PUBBLICATO','RELEASED')}
    else if(future){status.classList.add('upcoming');status.textContent=countdown(Date.parse(e.date)-now())}
    else{status.classList.add('pending');status.textContent=tr('IN ATTESA','PENDING')}
    button.append(time,main,status);
    button.addEventListener('click',()=>showResult(e,false));
    host.append(button);
  }
 }
 function showResult(e,auto){
  if(!e)return;
  state.current=e;
  $('injEventsResultTitle').textContent=e.title;
  $('injEventsResultTime').textContent=e.country+' · '+dateFmt(e.date,{dateStyle:'medium',timeStyle:'short'});
  $('injEventsResultPrevious').textContent=nice(e.previous);
  $('injEventsResultForecast').textContent=nice(e.forecast);
  $('injEventsResultActual').textContent=nice(e.actual);
  const actual=parseNumeric(e.actual),forecast=parseNumeric(e.forecast);
  $('injEventsResultReading').textContent=!validActual(e.actual)?
    tr('Dato effettivo non ancora pubblicato. I valori attesi non sono risultati confermati.','Actual result not yet released. Forecasts are not confirmed outcomes.'):
    actual!==null&&forecast!==null?
      (actual>forecast?tr('Sopra le attese','Above forecast'):actual<forecast?tr('Sotto le attese','Below forecast'):tr('In linea con le attese','In line with forecast'))+
      tr(' · La differenza non indica automaticamente un effetto positivo o negativo su INJ.',' · Surprise direction alone does not predict the price of INJ.'):
      tr('Dato pubblicato. Nessun consenso numerico disponibile per il confronto.','Data released. Numeric consensus unavailable.');
  $('injEventsResultBackdrop').hidden=false;
  $('injEventsResultClose').focus({preventScroll:true});
  if(auto){state.results[e.id]=now();save()}
 }
 function parseNumeric(v){
  if(!validActual(v))return null;
  const input=String(v).trim().replace(/,/g,'');
  if(/[<>]/.test(input))return null;
  const m=input.match(/^[$€£]?\s*([-+]?\d*\.?\d+)\s*([KMBT%]?)$/i);
  if(!m)return null;
  const factor={K:1e3,M:1e6,B:1e9,T:1e12,'%':1,'':1}[m[2].toUpperCase()];
  const n=Number(m[1])*factor;return Number.isFinite(n)?n:null;
 }
 function hideResult(){
  $('injEventsResultBackdrop').hidden=true;state.current=null;
  $('injEventsClose').focus({preventScroll:true});
 }
 function openPanel(){
  const root=$('injMarketEventsOverlay');if(state.open)return;
  state.open=true;root.hidden=false;root.scrollTop=0;
  $('injEventsDays').value=String(state.days);
  $('injEventsRegion').value=state.region;
  $('injEventsReminder').value=String(state.reminder);
  updateAlertButton();list();loadCalendar(true);
  $('injEventsClose').focus({preventScroll:true});
 }
 function closePanel(){
  if(!$('injEventsResultBackdrop').hidden){hideResult();return}
  state.open=false;$('injMarketEventsOverlay').hidden=true;
  $('entryMarketEventsButton').focus({preventScroll:true});
 }
 function updateAlertButton(){
  const btn=$('injEventsAlerts');btn.setAttribute('aria-pressed',String(state.alerts));
  btn.textContent=state.alerts?tr('AVVISI ATTIVI · APP APERTA','ALERTS ON · APP OPEN'):tr('ATTIVA AVVISI','ENABLE ALERTS');
 }
 async function setAlerts(){
  if(state.alerts){state.alerts=false;save();updateAlertButton();return}
  if(!('Notification' in window)){
   setMessage(tr('Le notifiche non sono disponibili su questo dispositivo. Gli eventi restano consultabili.','Notifications are unavailable here. The calendar still works.'));return;
  }
  try{
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){setMessage(tr('Autorizzazione non concessa. Puoi comunque consultare eventi e dati.','Permission not granted. You can still view events and actuals.'));return}
    state.alerts=true;save();updateAlertButton();
    setMessage(tr('Avvisi attivi mentre INJ Node è aperta. Per riceverli a app chiusa serve un servizio push server non ancora configurato.','Alerts work while INJ Node is open. Background delivery requires a server push service not configured yet.'));
    // Registration is for visible foreground notifications only. We don't register a push endpoint.
  }catch{setMessage(tr('Non è stato possibile attivare gli avvisi.','Unable to enable alerts.'))}
 }
 async function notification(title,body,id){
  if(!state.alerts||Notification.permission!=='granted')return;
  try{
    const reg=await navigator.serviceWorker?.ready;
    const options={body,tag:'inj-macro-'+id,icon:'/icons/inj-node-minimal-192-v16.06.29.png',data:{source:'inj-market-events',eventId:String(id).replace(/-actual$/,'')}};
    if(reg&&reg.showNotification){await reg.showNotification(title,options);return}
    const notice=new Notification(title,options);
    notice.onclick=()=>{window.focus();openPanel();const evt=state.events.find(x=>x.id===options.data.eventId);if(evt)showResult(evt,false)};
  }catch{}
 }
 function saveUpcoming(events){
  for(const e of events){
    if(!validActual(e.actual)&&Date.parse(e.date)>=now()-60*60000&&Date.parse(e.date)<now()+31*86400000)
       state.seen[e.id]=now();
  }
  save();
 }
 function maybeAnnounce(events){
  if(!state.alerts)return;
  const t=now(),windowMs=state.reminder*60000;
  for(const e of events){
    const ms=Date.parse(e.date),delta=ms-t;
    if(delta>0&&delta<=windowMs&&!state.notified[e.id]){
      state.notified[e.id]=t;
      notification('★★★ '+e.country+' · '+e.title,countdown(delta)+' · '+tr('Impatto elevato','High impact'),e.id);
    }
    if(validActual(e.actual)&&state.seen[e.id]&&!state.results[e.id]&&ms<t&&t-ms<12*3600000){
      state.results[e.id]=t;save();
      notification('★★★ '+tr('DATO PUBBLICATO','DATA RELEASED')+' · '+e.title,tr('Effettivo','Actual')+': '+e.actual+' · '+tr('Atteso','Forecast')+': '+nice(e.forecast),e.id+'-actual');
      if(state.open&&$('injEventsResultBackdrop').hidden&&document.visibilityState==='visible')showResult(e,false);
    }
  }
  save();
 }
 function renderNext(){
  const upcoming=state.events.find(e=>Date.parse(e.date)>now()-60000);
  const node=$('injMarketNextSummary');
  if(upcoming){
    node.textContent='★★★  '+upcoming.country+' · '+dateFmt(upcoming.date,{weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})+' · '+upcoming.title;
  }else node.textContent=state.source?
    tr('Calendario ★★★ · nessun evento imminente','★★★ calendar · no upcoming events'):
    tr('Calendario macro ★★★ · USA / Europa / Asia','★★★ macro calendar · US / Europe / Asia');
 }
 async function loadCalendar(force=false){
  if(state.processing){if(force)state.reloadQueued=true;return state.inFlight}
  if(!force&&state.lastCalendar&&now()-state.lastCalendar<150000)return;
  state.processing=true;
  state.inFlight=(async()=>{
    try{
      const response=await fetch('/api/market-events?days='+state.days,{cache:'no-store'});
      if(!response.ok)throw Error('Calendar HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.events))throw Error('Invalid event feed');
      const events=data.events.map(validateEvent).filter(Boolean).sort(byDate);
      state.events=events;
      state.source=String(data.source||'');state.coverage=String(data.coverage||'');state.sourceURL=String(data.sourceUrl||'');
      state.lastCalendar=now();
      displaySource();
      maybeAnnounce(events);
      saveUpcoming(events);
      setMessage(tr('Solo eventi ★★★ · fuso orario del dispositivo · avvisi con app aperta. ','★★★ events only · your local time · alerts while app open. ')+state.coverage);
      renderNext();
      if(state.open)list();
    }catch(error){
      state.source='';state.lastCalendar=0;state.events=[];
      setMessage(tr('Fonte calendario temporaneamente non disponibile. Nessun evento o dato viene inventato.','Calendar temporarily unavailable. No event or data is fabricated.'));
      if(state.open)list();
      renderNext();
    }finally{
      state.processing=false;state.inFlight=null;
      if(state.reloadQueued){state.reloadQueued=false;queueMicrotask(()=>loadCalendar(true))}
    }
  })();
  return state.inFlight;
 }
 function applyLanguage(){
  const fields=[
   ['injEventsSubtitle','Calendario macroeconomico · solo impatto ★★★','Macroeconomic calendar · high impact ★★★ only'],
   ['injEventsDays','PERIODO / RANGE','PERIOD / RANGE'],
  ];
  const sub=$('injEventsSubtitle');if(sub)sub.textContent=tr('Calendario macroeconomico · solo impatto ★★★','Macroeconomic calendar · only ★★★ events');
  const note=$('injEventsWarning');if(note&&!state.source)note.textContent=tr('Orari locali · I dati effettivi compaiono dopo la pubblicazione.','Local time · Actual values appear only when published.');
  const options={
   injEventsDays:{1:['24H','24H'],3:['3 GIORNI','3 DAYS'],7:['7 GIORNI','7 DAYS'],14:['2 SETTIMANE','2 WEEKS'],30:['30 GIORNI','30 DAYS']},
   injEventsRegion:{ALL:['TUTTE / ALL','ALL REGIONS'],US:['USA','USA'],EU:['EUROPA','EUROPE'],ASIA:['ASIA','ASIA']}
  };
  for(const [id,opts] of Object.entries(options)){
   const select=$(id);for(const option of select.options){const item=opts[option.value];if(item)option.textContent=tr(item[0],item[1])}
  }
  const labels=[['injEventsDays','PERIODO','PERIOD'],['injEventsRegion','REGIONE','REGION'],['injEventsReminder','AVVISO','REMINDER']];
  for(const [id,it,en] of labels){const lbl=document.querySelector('label[for="'+id+'"]');if(lbl)lbl.textContent=tr(it,en)}
  for(const el of document.querySelectorAll('#injMarketEventsOverlay [data-it][data-en]'))el.textContent=tr(el.dataset.it,el.dataset.en);
  const footer=$('injEventsSource');if(!state.source&&footer)footer.textContent=tr('Fonte in verifica','Checking data source');
  updateAlertButton();renderNext();
 }

 function openFromNotification(eventId){
  openPanel();
  Promise.resolve(state.inFlight).then(()=>{
    const evt=state.events.find(e=>e.id===eventId);
    if(evt)showResult(evt,false);
  });
 }
 window.addEventListener('message',event=>{
  if(event.data?.type==='inj-market-events-open'&&typeof event.data.eventId==='string')openFromNotification(event.data.eventId);
 });
 const hash=location.hash.match(/^#inj-market-event=(.+)$/);
 if(hash){try{openFromNotification(decodeURIComponent(hash[1]));history.replaceState(null,'',location.pathname+location.search)}catch{}}

 $('entryMarketEventsButton').addEventListener('click',openPanel);
 $('injMarketTickerEvents')?.addEventListener('click',openPanel);
 $('injEventsClose').addEventListener('click',closePanel);
 $('injEventsResultClose').addEventListener('click',hideResult);
 $('injEventsResultDone').addEventListener('click',hideResult);
 $('injEventsResultBackdrop').addEventListener('click',e=>{if(e.target===$('injEventsResultBackdrop'))hideResult()});
 $('injEventsDays').addEventListener('change',e=>{state.days=Number(e.target.value);save();loadCalendar(true)});
 $('injEventsRegion').addEventListener('change',e=>{state.region=e.target.value;save();list()});
 $('injEventsReminder').addEventListener('change',e=>{state.reminder=Number(e.target.value);save()});
 $('injEventsAlerts').addEventListener('click',setAlerts);
 $('injEventsRefresh').addEventListener('click',()=>loadCalendar(true));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open){e.preventDefault();closePanel()}});
 new MutationObserver(()=>{applyLanguage();if(state.open)list()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 $('injEventsDays').value=String(state.days);
 $('injEventsRegion').value=state.region;
 $('injEventsReminder').value=String(state.reminder);
 applyLanguage();
 // Background page refreshes cannot create push; only foreground visits can.
 updateTicker();loadCalendar();
 setInterval(()=>{if(document.hidden)return;updateTicker()},45000);
 setInterval(()=>{if(document.hidden)return;loadCalendar(true)},60000);
 setInterval(()=>{if(document.hidden)return;renderNext();if(state.open)list();maybeAnnounce(state.events)},45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTicker();loadCalendar(true)}});
})();
