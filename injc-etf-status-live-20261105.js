/* INJ Node · INJC SEC status reader (2026-11-05).
 * Reads dated snapshots, not crypto-spot prices, to show regulatory milestones.
 * SEC Form 8-A listing approval != S-1 effectiveness != first trade.
 * Refreshes after visibility changes and every five minutes while open.
 */
(() => {
 'use strict';
 if(window.__injcStatusReader)return;
 window.__injcStatusReader=true;
 const $=id=>document.getElementById(id);
 const locale=()=>localStorage.getItem('inj_node_language_v1')==='en'?'en':'it';
 const fmtDate=(date)=>{
   if(!/^\d{4}-\d\d-\d\d/.test(String(date||'')))return '—';
   const d=new Date(String(date).slice(0,10)+'T12:00:00Z');
   return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(locale()==='en'?'en-GB':'it-IT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});
 };
 let snapshot=null,loading=false,lastFetch=0;
 const set=(id,it,en)=>{
   const el=$(id);if(!el)return;
   el.dataset.it=it;el.dataset.en=en;
   el.textContent=locale()==='en'?en:it;
 };
 function paint(){
  if(!snapshot||!$('etfListingBadge'))return;
  const status=snapshot;
  const approved=status.listing?.status==='approved';
  const effective=status.registration?.status==='effective';
  const traded=status.trading?.status==='confirmed';
  const s1=status.registration?.latestDate;
  const nasdaq=status.listing?.date;
  set('etfListingBadge',approved?'NASDAQ ✓':'NASDAQ · IN ATTESA',approved?'NASDAQ ✓':'NASDAQ · PENDING');
  $('etfListingPill')?.setAttribute('aria-label',approved?'Nasdaq: domanda di quotazione approvata':'Nasdaq: approvazione non verificata');
  if(approved){
   set('etfApprovalHeadline','Quotazione Nasdaq approvata','Nasdaq listing approved');
   set('etfApprovalSummary',
     'Il Form 8-A del '+fmtDate(nasdaq)+' conferma l’approvazione della domanda di quotazione INJC sul Nasdaq. Non equivale all’avvio delle negoziazioni.',
     'The '+fmtDate(nasdaq)+' Form 8-A confirms Nasdaq approval of the INJC listing application. It does not establish that trading has started.');
  }
  if(status.listing?.source && /^https:\/\/www\.sec\.gov\//.test(status.listing.source))
   $('etfApprovalSource').href=status.listing.source;
  const regStage=$('etfStageEffective'),nasStage=$('etfStageNasdaq'),tradeStage=$('etfStageTrading');
  nasStage?.classList.toggle('past',approved);
  regStage?.classList.toggle('past',effective);
  tradeStage?.classList.toggle('past',traded);
  const regDot=regStage?.querySelector('.stage-dot'),nasDot=nasStage?.querySelector('.stage-dot'),tradeDot=tradeStage?.querySelector('.stage-dot');
  if(regDot)regDot.textContent=effective?'✓':'3';
  if(nasDot)nasDot.textContent=approved?'✓':'2';
  if(tradeDot)tradeDot.textContent=traded?'✓':'4';
  if(s1)set('etfStageFilingText',
   `Emendamento n. ${Number(status.registration?.amendment)||5} · ${fmtDate(s1)}`,
   `Amendment No. ${Number(status.registration?.amendment)||5} · ${fmtDate(s1)}`);
  set('etfStageNasdaqText',approved
   ?`Domanda approvata · ${fmtDate(nasdaq)}`:'Approvazione non verificata',
   approved?`Listing approved · ${fmtDate(nasdaq)}`:'Approval unverified');
  set('etfStageEffectiveText',
    effective?`Confermata · ${fmtDate(status.registration?.effectiveDate)}`:'Efficacia non verificata',
    effective?`Effective · ${fmtDate(status.registration?.effectiveDate)}`:'Effectiveness not verified');
  set('etfStageTradingText',
    traded?'Primi scambi confermati':'Avvio scambi non verificato',
    traded?'First trade confirmed':'Trading start not verified');
  if(status.registration?.source?.startsWith('https://www.sec.gov/'))
   $('etfS1Link').href=status.registration.source;
  const checked=status.checkedAt||status.asOf;
  const stale=checked && Date.now()-new Date(checked).getTime()>36*3600*1000;
  const time=checked?fmtDate(checked):'—';
  const automatic=Boolean(status.checkedAt)&&status.sourceStatus==='sec-edgar-checked';
  set('etfRegulatoryVerified',
   (stale?'Verifica SEC non recente · ':'Fonte SEC · ')+(automatic?'ultimo controllo ':'documento verificato ')+time,
   (stale?'SEC check is out of date · ':'SEC filing · ')+(automatic?'last checked ':'verified as of ')+time);
  set('etfRoadmapAsOf', 'SEC · '+time,'SEC · '+time);
  const latest=status.recentSEC?.[0]||status.latest8A;
  const docName=latest?.form||status.latestProspectus?.form||'8-A12B';
  const docDateText=fmtDate(latest?.date||status.latestProspectus?.date||status.listing?.date);
  set('etfFilingRefresh',
   (stale?'Verifica in ritardo · ':'Ultimo deposito: ')+docName+' · '+docDateText+' · controllo '+time,
   (stale?'Check delayed · ':'Latest filing: ')+docName+' · '+docDateText+' · checked '+time);
  if(latest?.source?.startsWith('https://www.sec.gov/'))$('etfLatestFiling').href=latest.source;
  const docDate=fmtDate(status.latestProspectus?.date||s1);
  if($('etfFundDocumentDate'))$('etfFundDocumentDate').textContent='SEC · '+docDate;
 }
 async function load(force=false){
  if(loading)return;
  if(!force && Date.now()-lastFetch<4*60*1000)return;
  loading=true;lastFetch=Date.now();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const res=await fetch('./market-data/injc-etf-status.json?v='+Date.now(),{
     cache:'no-store',headers:{accept:'application/json'},signal:controller.signal
   });
   if(!res.ok)throw Error('Snapshot HTTP '+res.status);
   const data=await res.json();
   if(data?.schemaVersion!==1||data.fund?.ticker!=='INJC' ||
      !['approved','unconfirmed'].includes(data.listing?.status) ||
      !['effective','unconfirmed'].includes(data.registration?.status)){
      throw Error('Unexpected ETF snapshot schema');
   }
   snapshot=data;
   paint();
  }catch(error){
   // Keep the latest previously verified legal event displayed. Do not
   // label a failed fetch as a new SEC verification.
   if(snapshot)paint();
   else set('etfRegulatoryVerified','Fonte SEC · ultimo documento verificato 03/11/2026 · sincronizzazione non disponibile',
      'SEC source · last verified filing Nov 3, 2026 · sync unavailable');
  }finally{clearTimeout(timeout);loading=false}
 }
 const run=()=>{
  void load(true);
  $('etfRefresh')?.addEventListener('click',()=>void load(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(true)});
  window.addEventListener('pageshow',()=>void load(true));
  window.addEventListener('storage',e=>{if(e.key==='inj_node_language_v1')queueMicrotask(paint)});
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:etf:language')queueMicrotask(paint)});
  setInterval(()=>{if(!document.hidden)void load()},300000);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
 else run();
})();
