/* Status Network | persistent independent measurements + QuickNode incident overlays.
 * Historical green means recorded recent blocks, never an inferred green interval.
 * Live current bar updates from actual RPC verification every ~10 seconds.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 if(!$('uptimeBars'))return;
 const en=document.documentElement.lang==='en';
 const tr=(it,english)=>en?english:it;
 const DAY=86400000,MINUTE=60000,FIVE_MINUTES=5*MINUTE,intervalMinutes=5;
 const STORAGE_KEY='injnode_network_verified_samples_v1';
 const MAX_SAMPLE_AGE=32*DAY;
 const ranges={
  '1D':{duration:DAY,count:48,step:30*MINUTE},
  '1S':{duration:7*DAY,count:56,step:180*MINUTE},
  '1M':{duration:30*DAY,count:60,step:720*MINUTE}
 };
 const states=['online','degraded','halted','unknown'];
 const stateLabel={
  online:tr('Produzione confermata','Production confirmed'),
  degraded:tr('Rallentamento / incidente','Delay / reported incident'),
  halted:tr('Possibile interruzione','Possible halt'),
  unknown:tr('Dati non disponibili','No measurements')
 };
 let range='1D',selected=null,latestLive=null,history={samples:[],incidents:[],generatedAt:null,intervalMinutes:5};
 let localSamples=[];
 try{const stored=localStorage.getItem('inj_network_range_v1');if(ranges[stored])range=stored;}catch(_){}
 const fmtTime=ms=>new Intl.DateTimeFormat(en?'en-GB':'it-IT',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms));
 const fmtDate=ms=>new Intl.DateTimeFormat(en?'en-GB':'it-IT',{day:'2-digit',month:'short'}).format(new Date(ms));
 const fmtRange=(a,b)=>fmtDate(a)+' '+fmtTime(a)+' – '+fmtDate(b)+' '+fmtTime(b);
 const isFresh=(obj,ms)=>{
  const elapsed=Date.now()-Date.parse(obj?.checkedAt||'');
  return Number.isFinite(elapsed)&&elapsed>=-5000&&elapsed<ms;
 };
 // One independently verified observation per 5-minute slot, kept across PWA restarts.
 // Local checks supplement the shared Actions archive; they never invent past uptime.
 function sampleSlot(minutes){return Math.floor(minutes/5)*5;}
 function validSample(row){
  return Array.isArray(row)&&Number.isInteger(row[0])&&Number.isFinite(row[0])&&
   row[0]*MINUTE>=Date.now()-MAX_SAMPLE_AGE&&row[0]*MINUTE<=Date.now()+MINUTE&&states.includes(row[1]);
 }
 const severity={unknown:0,online:1,degraded:2,halted:3};
 function combineSamples(){
  const slots=new Map();
  for(const row of [...(history.samples||[]),...localSamples]){
   if(!validSample(row))continue;
   const key=sampleSlot(row[0]),prev=slots.get(key);
   if(!prev||severity[row[1]]>severity[prev[1]]){
    slots.set(key,[key,row[1],Number.isSafeInteger(row[2])&&row[2]>0?row[2]:null]);
   }
  }
  return [...slots.values()].sort((a,b)=>a[0]-b[0]);
 }
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  if(Array.isArray(saved))localSamples=saved.filter(validSample);
 }catch(_){}
 function rememberVerified(data){
  const checked=Date.parse(data?.checkedAt||''),state=data?.state;
  if(!Number.isFinite(checked)||Math.abs(Date.now()-checked)>45000||
    !states.includes(state)||state==='unknown')return;
  const nodes=Array.isArray(data.nodes)?data.nodes:[];
  const valid=nodes.filter(n=>n?.available&&Number.isSafeInteger(Number(n.height))&&
   Number(n.height)>0&&Number.isFinite(Date.parse(n.blockTime||'')));
  // History is based on actual node responses, not a status-page incident.
  if(!valid.length)return;
  const minute=Math.floor(checked/MINUTE),slot=sampleSlot(minute);
  const prior=localSamples.find(row=>row[0]===slot);
  if(prior && severity[prior[1]]>=severity[state])return;
  localSamples=localSamples.filter(row=>row[0]!==slot&&validSample(row));
  localSamples.push([slot,state,Number.isSafeInteger(Number(data.latest?.height))?Number(data.latest.height):null]);
  localSamples.sort((a,b)=>a[0]-b[0]);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(localSamples));}catch(_){}
 }
 function normalizeIncident(incident){
  const start=Date.parse(incident.start||''),end=Date.parse(incident.end||'');
  if(!Number.isFinite(start))return null;
  return {...incident,_start:start,_end:Number.isFinite(end)?end:Date.now()};
 }
 function calculate(timeNow=Date.now()){
  const definition=ranges[range],start=timeNow-definition.duration;
  const samples=combineSamples();
  const incidents=(Array.isArray(history.incidents)?history.incidents:[]).map(normalizeIncident).filter(Boolean);
  const last=isFresh(latestLive,35000)?latestLive:null;
  const values=[];
  for(let i=0;i<definition.count;i++){
   const from=start+i*definition.step,to=from+definition.step;
   const bucketSamples=samples.filter(row=>Array.isArray(row)&&Number.isFinite(row[0])&&row[0]*MINUTE>=from&&row[0]*MINUTE<to);
   const observed=bucketSamples.filter(row=>states.includes(row[1])&&row[1]!=='unknown');
   const expected=Math.max(1,Math.round(definition.step/((history.intervalMinutes||intervalMinutes)*MINUTE)));
   const coverage=observed.length/expected;
   const overlapped=incidents.filter(item=>item._start<to&&item._end>from&&item._start<=timeNow);
   const incidentStarts=overlapped.some(item=>item._start>=from&&item._start<to);
   const live=Boolean(last && last.state!=='unknown' && i===definition.count-1 && Date.parse(last.checkedAt)>=from);
   const signals=observed.map(row=>row[1]);
   let level='unknown',source='none';
   // An archived time bucket receives a network colour only when the RPC
   // measurement coverage is sufficient. Provider incidents are independent.
   if(coverage>=0.5&&observed.length){
    level=signals.includes('halted')?'halted':signals.includes('degraded')?'degraded':'online';
    source='rpc';
   }
   // The current bar always reflects the most recent verified live RPC state,
   // including recovery while a QuickNode incident remains open.
   if(live){level=last.state;source='live';}
   const mixed=live&&signals.some(signal=>signal!==last.state);
   values.push({i,from,to,level,source,observed:observed.length,expected,coverage,incident:overlapped[0]||null,incidentCount:overlapped.length,incidentStarts,live,mixed,latestHeight:bucketSamples.at(-1)?.[2]||null});
  }
  return {start,timeNow,values,range:definition,incidents};
 }
 function summaryFor(bucket){
  const providerNotice=bucket.incident?tr(' Avviso QuickNode separato: non determina il colore della rete.',' Separate QuickNode notice: does not determine network colour.'):'';
  if(bucket.live)return tr('Stato attuale verificato dai nodi RPC.','Current state verified from RPC nodes.')+
   (bucket.mixed?tr(' Durante questo intervallo sono stati registrati anche stati differenti.',' Other states were also recorded during this interval.'):'')+providerNotice;
  const coverage=Math.min(100,Math.round(bucket.coverage*100));
  if(bucket.level==='unknown')return tr('Campioni RPC insufficienti per confermare lo stato di questo intervallo.','Not enough RPC samples to verify this interval.')+
   ' '+bucket.observed+'/'+bucket.expected+' ('+coverage+'%).'+providerNotice;
  return tr('Campioni RPC verificati: ','Verified RPC samples: ')+bucket.observed+'/'+bucket.expected+
   ' · '+tr('copertura intervallo','interval coverage')+' '+coverage+'%.'+providerNotice;
 }
 function render(){
  const {start,timeNow,values,incidents}=calculate();
  const count=values.length;
  if(selected===null||selected>=count||selected<0)selected=count-1;
  const root=$('uptimeBars');root.style.setProperty('--segments',count);
  // Keep bar nodes stable: refreshing every 10 seconds should not steal focus
  // or visibly flash a freshly selected time slot.
  if(root.children.length!==count){
   const fragment=document.createDocumentFragment();
   for(let i=0;i<count;i++){
    const button=document.createElement('button');
    button.type='button';
    button.className='uptime-bar';
    fragment.appendChild(button);
   }
   root.replaceChildren(fragment);
  }
  for(const bar of values){
   const button=root.children[bar.i];
   button.dataset.level=bar.level;
   // Incident markers denote the beginning of a provider notice, not an RPC outage.
   button.dataset.provider=String(bar.incidentStarts);
   button.dataset.index=String(bar.i);
   button.dataset.current=String(bar.i===count-1);
   button.setAttribute('aria-pressed',String(bar.i===selected));
   const label=fmtRange(bar.from,bar.to)+' · '+stateLabel[bar.level]+
    (bar.incident?' · QuickNode: '+bar.incident.name:'');
   button.setAttribute('aria-label',label);
   button.title=label;
  }
  for(const button of document.querySelectorAll('[data-network-range]')){
   button.setAttribute('aria-pressed',String(button.dataset.networkRange===range));
  }
  $('uptimeAxisLeft').textContent=fmtDate(start)+' '+fmtTime(start);
  $('uptimeAxisRight').textContent=fmtDate(timeNow)+' '+fmtTime(timeNow);
  const chosen=values[selected];
  $('uptimeDetailTitle').textContent=fmtRange(chosen.from,chosen.to)+' · '+stateLabel[chosen.level];
  $('uptimeDetailBody').textContent=summaryFor(chosen);
  const link=$('uptimeIncidentLink');
  if(chosen.incident){
   const dest=String(chosen.incident.url||'');
   link.href=/^https:\/\/(?:[\w-]+\.)?(?:quicknode\.com|statuspage\.io)(?:\/|$)/i.test(dest)?dest:'https://status.quicknode.com/';
   link.textContent=tr('QuickNode: ','QuickNode: ')+chosen.incident.name+' ↗';
   link.hidden=false;
  }else link.hidden=true;
  // This is sampling coverage, NOT the network uptime percentage.
  const allSamples=combineSamples();
  const observations=allSamples.filter(row=>
   row[0]*MINUTE>=start&&row[0]*MINUTE<=timeNow&&row[1]!=='unknown').length;
  const archiveSamples=(history.samples||[]).filter(row=>validSample(row)&&row[0]*MINUTE>=start&&row[0]*MINUTE<=timeNow&&row[1]!=='unknown').length;
  const localCount=localSamples.filter(row=>validSample(row)&&row[0]*MINUTE>=start&&row[0]*MINUTE<=timeNow&&row[1]!=='unknown').length;
  const expectedTotal=Math.max(1,Math.ceil((timeNow-start)/((history.intervalMinutes||intervalMinutes)*MINUTE)));
  const coverage=Math.min(100,Math.round(100*observations/expectedTotal));
  $('uptimeCoverage').textContent=tr('Copertura campionamento RPC: ','RPC sampling coverage: ')+coverage+'%';
  const archiveAge=Date.now()-Date.parse(history.generatedAt||'');
  const archiveLate=!Number.isFinite(archiveAge)||archiveAge>20*MINUTE;
  $('uptimeCoverageNote').textContent=tr('Verifiche disponibili: ','Available checks: ')+observations+
   ' · '+tr('Archivio: ','Archive: ')+archiveSamples+
   ' · '+tr('Su dispositivo: ','On device: ')+localCount+
   (history.generatedAt?' · '+tr('Ultimo archivio ','Last archive ')+fmtDate(Date.parse(history.generatedAt))+' '+fmtTime(Date.parse(history.generatedAt)): ' · '+tr('Archivio non disponibile','Archive unavailable'))+
   (archiveLate?' · '+tr('Archivio in ritardo','Archive delayed'):'');
  const activeIncidents=incidents.filter(i=>i._start<=timeNow&&i._end>=timeNow);
  const providerNote=$('uptimeProviderNote');
  if(providerNote){
   providerNote.hidden=!activeIncidents.length;
   providerNote.textContent=activeIncidents.length?
    tr('QuickNode segnala un evento in corso: non equivale a un blocco della rete Injective.',
       'QuickNode reports an active notice: this does not mean Injective is halted.'):'';
  }
  const verifiedLive=Boolean(isFresh(latestLive,35000)&&latestLive?.state!=='unknown');
  $('uptimeLive').dataset.live=String(verifiedLive);
  $('uptimeLiveText').textContent=verifiedLive?'LIVE · 10s':tr('VERIFICA IN CORSO','CHECKING LIVE');
  $('uptimeSourceNote').textContent=tr(
   'I colori rappresentano soltanto verifiche RPC: verde operativa, arancione degradata, rosso possibile halt. La piccola tacca indica l’inizio di un evento QuickNode indipendente. Grigio significa dati insufficienti, non interruzione. Le verifiche locali vengono salvate mentre la pagina è aperta.',
   'Bar colours reflect verified RPC checks only: green operational, amber degraded, red possible halt. A tiny marker identifies a separate QuickNode event. Gray means insufficient samples, not an outage. Local checks are stored while this page is open.'
  );
 }
 function labels(){
  $('uptimeTitle').textContent=tr('Storico rete','Network history');
  $('uptimeLegendOnline').textContent=tr('Operativa','Operational');
  $('uptimeLegendDegraded').textContent=tr('Degradata (RPC)','Degraded (RPC)');
  $('uptimeLegendProvider').textContent=tr('Evento QuickNode','QuickNode event');
  $('uptimeLegendHalted').textContent=tr('Possibile halt','Possible halt');
  $('uptimeLegendUnknown').textContent=tr('Non verificata','Unverified');
 }
 async function loadHistory(){
  try{
   const response=await fetch('./market-data/inj-network-history.json?ts='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!Array.isArray(data.samples)||!Array.isArray(data.incidents)||data.chainId!=='injective-1')throw Error('Invalid history');
   history=data;
  }catch(_){/* Keep prior verified records; never turn missing measurements green. */}
  render();
 }
 const rangeControls=document.querySelectorAll('[data-network-range]');
 for(const button of rangeControls){
  button.addEventListener('click',()=>{
   const value=button.dataset.networkRange;if(!ranges[value])return;
   range=value;selected=null;
   try{localStorage.setItem('inj_network_range_v1',range);}catch(_){}
   render();
  });
 }
 $('uptimeBars').addEventListener('click',event=>{
  const bar=event.target.closest('button[data-index]');if(!bar)return;
  selected=Number(bar.dataset.index);render();
 });
 window.addEventListener('injnode:network-status',event=>{
  latestLive=event.detail;
  rememberVerified(latestLive);
  render();
 });
 labels();
 render();
 loadHistory();
 setInterval(()=>{if(!document.hidden)render();},10000);
 setInterval(()=>{if(!document.hidden)loadHistory();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadHistory();});
})();
