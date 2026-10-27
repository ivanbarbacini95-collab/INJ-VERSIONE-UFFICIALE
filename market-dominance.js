/* INJ Node · Market / INJ Dominance.
   Independent read-only module: strictly real CoinGecko snapshots.
   There is no synthetic historical backfill or fabricated live tick. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const API='https://api.coingecko.com/api/v3';
const KEY='injnode_inj_dominance_history_v1';
const RANGE_KEY='injnode_inj_dominance_range_v1';
const TWO_MIN=120000, DAY=86400000, MONTH=30*DAY;
const WINDOWS={'1h':3600000,'24h':DAY,'7d':7*DAY,'30d':MONTH};
const svg=$('injDomChart'),placeholder=$('injDomEmpty'),status=$('injDomStatus');
if(!svg||!placeholder||!status)return;
const read=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
const english=()=>document.documentElement.lang==='en';
const tr=(it,en)=>english()?en:it;
const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:NaN};
const pct=v=>Number.isFinite(v)?new Intl.NumberFormat(english()?'en-US':'it-IT',{minimumFractionDigits:4,maximumFractionDigits:4}).format(v)+'%':'—';
const num=v=>Number.isFinite(v)?new Intl.NumberFormat(english()?'en-US':'it-IT',{maximumFractionDigits:0}).format(v):'—';
const cap=v=>!Number.isFinite(v)?'—':v>=1e12?'$'+(v/1e12).toFixed(2)+'T':v>=1e9?'$'+(v/1e9).toFixed(2)+'B':v>=1e6?'$'+(v/1e6).toFixed(2)+'M':'$'+num(v);
const time=ms=>new Date(ms).toLocaleString(english()?'en-US':'it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
let selected=WINDOWS[read(RANGE_KEY)]?read(RANGE_KEY):'24h',loading=false,inFlight=null,lastFetch=0,updatedFresh=false;
function recover(){
 let items=[];try{items=JSON.parse(read(KEY)||'[]')}catch(_){}
 if(!Array.isArray(items))return [];
 const now=Date.now();
 return items.filter(v=>v&&Number.isFinite(v.t)&&v.t<=now+60000&&v.t>now-MONTH&&
 Number.isFinite(v.d)&&v.d>0&&v.d<=100&&n(v.i)&&n(v.g)&&v.i<=v.g)
 .map(v=>({t:v.t,d:v.d,i:v.i,g:v.g})).sort((a,b)=>a.t-b.t).slice(-2500);
}
let history=recover();
const last=()=>history.at(-1)||null;
function store(point){
 const older=last();
 if(older&&point.t-older.t<TWO_MIN-10000)return;
 history.push(point);
 history=history.filter(p=>p.t>Date.now()-MONTH);
 if(history.length>2200){
  // Keep actual observations: thin only the oldest half, never interpolate.
  const middle=Math.floor(history.length/2);
  history=[...history.slice(0,middle).filter((_,i)=>i%2===0),...history.slice(middle)];
 }
 save(KEY,JSON.stringify(history));
}
function set(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value}
function attrs(element,properties){for(const [k,v]of Object.entries(properties))element.setAttribute(k,String(v))}
function element(type,properties,parent=svg){
 const el=document.createElementNS('http://www.w3.org/2000/svg',type);
 attrs(el,properties||{});parent.appendChild(el);return el;
}
function visibleSamples(){
 const now=Date.now(),start=now-WINDOWS[selected];
 const samples=history.filter(p=>p.t>=start);
 // Retain the final real observation just before the selected window if relevant.
 // Avoid inserting fabricated endpoints at current time.
 return samples;
}
function toPointLabel(p){return p?time(p.t)+' · '+pct(p.d):'—'}
let pointerIndex=null;
function renderChart(){
 svg.replaceChildren();const samples=visibleSamples(),W=780,H=230,LEFT=65,RIGHT=16,TOP=18,BOTTOM=38;
 const first=last();
 if(samples.length===0){
  placeholder.hidden=false;placeholder.textContent=tr('In attesa della prima rilevazione reale.','Waiting for the first real observation.');
  return;
 }
 if(samples.length===1){
  placeholder.hidden=false;placeholder.textContent=tr('Primo dato ricevuto. Il grafico cresce con nuove rilevazioni.','First reading received. The chart will grow as new observations arrive.');
 }else placeholder.hidden=true;
 const minX=Date.now()-WINDOWS[selected],maxX=Date.now();
 const x=p=>LEFT+Math.max(0,Math.min(1,(p.t-minX)/(maxX-minX)))*(W-LEFT-RIGHT);
 const values=samples.map(p=>p.d),rawMin=Math.min(...values),rawMax=Math.max(...values);
 const spread=Math.max(rawMax-rawMin,rawMax*.004,.00001),minimum=Math.max(0,rawMin-spread*.20),maximum=rawMax+spread*.20;
 const y=v=>TOP+(H-TOP-BOTTOM)*(1-(v-minimum)/(maximum-minimum));
 for(let j=0;j<4;j++){
  const amount=minimum+(maximum-minimum)*j/3,yy=y(amount);
  element('line',{x1:LEFT,x2:W-RIGHT,y1:yy,y2:yy,class:'inj-dom-gridline'});
  element('text',{x:LEFT-10,y:yy+4.5,'text-anchor':'end',class:'inj-dom-tick'}).textContent=pct(amount);
 }
 element('text',{x:LEFT,y:H-11,class:'inj-dom-tick'}).textContent=time(minX);
 element('text',{x:W-RIGHT,y:H-11,'text-anchor':'end',class:'inj-dom-tick'}).textContent=tr('Ora','Now');
 if(samples.length>1){
  const d=samples.map((p,i)=>(i?'L':'M')+x(p).toFixed(2)+' '+y(p.d).toFixed(2)).join(' ');
  const path=element('path',{d,fill:'none',stroke:'var(--accent)','stroke-width':2.6,'stroke-linecap':'round','stroke-linejoin':'round'});
  const area=d+' L'+x(samples.at(-1)).toFixed(2)+' '+(H-BOTTOM)+' L'+x(samples[0]).toFixed(2)+' '+(H-BOTTOM)+' Z';
  const gradient=element('defs',{});const grad=element('linearGradient',{id:'injDominanceFill',x1:0,y1:0,x2:0,y2:1},gradient);
  element('stop',{offset:'0%','stop-color':'var(--accent)','stop-opacity':'.19'},grad);
  element('stop',{offset:'100%','stop-color':'var(--accent)','stop-opacity':'0'},grad);
  // Insert translucent fill behind the stroke.
  const fill=element('path',{d:area,fill:'url(#injDominanceFill)'});
  svg.insertBefore(fill,path);
 }
 const current=pointerIndex===null?samples.length-1:Math.max(0,Math.min(samples.length-1,pointerIndex));
 function paintSelection(i){
  const chosen=samples[i];if(!chosen)return;
  if(cursor)cursor.remove();
  cursor=element('g',{});
  element('line',{x1:x(chosen),x2:x(chosen),y1:TOP,y2:H-BOTTOM,class:'inj-dom-cursor'},cursor);
  element('circle',{cx:x(chosen),cy:y(chosen.d),r:5.1,fill:'var(--accent)',stroke:'var(--bg)','stroke-width':2},cursor);
  set('injDomInspect',toPointLabel(chosen));
  set('injDomInspectCap',tr('INJ: ','INJ: ')+cap(chosen.i)+'  ·  '+tr('Mercato: ','Market: ')+cap(chosen.g));
 }
 let cursor=null;
 paintSelection(current);
 svg.onpointermove=e=>{
  const rect=svg.getBoundingClientRect(),position=(e.clientX-rect.left)/rect.width*W;
  let closest=0,best=Infinity;
  samples.forEach((p,i)=>{const dist=Math.abs(x(p)-position);if(dist<best){best=dist;closest=i}});
  pointerIndex=closest;paintSelection(closest);
 };
 svg.onpointerdown=e=>svg.onpointermove(e);
 svg.onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='Home')pointerIndex=0;
  else if(e.key==='End')pointerIndex=samples.length-1;
  else pointerIndex=Math.max(0,Math.min(samples.length-1,(pointerIndex??samples.length-1)+(e.key==='ArrowLeft'?-1:1)));
  paintSelection(pointerIndex);
 };
 svg.setAttribute('aria-label',tr('Grafico della dominance INJ. Muovi il dito, il mouse o usa le frecce per esaminare le rilevazioni.','INJ dominance chart. Touch, hover or use arrow keys to inspect observations.'));
}
function render(){
 set('injDomTitle','INJ DOMINANCE');
 set('injDomDesc',tr('Quota di mercato di Injective rispetto a tutte le criptovalute.','Injective share of the total cryptocurrency market.'));
 set('injDomCapLabel',tr('CAPITALIZZAZIONE INJ','INJ MARKET CAP'));
 set('injDomGlobalLabel',tr('MERCATO CRYPTO','TOTAL CRYPTO MARKET'));
 set('injDomInspectLabel',tr('Rilevazione selezionata','Selected observation'));
 set('injDomNote',tr('CoinGecko · aggiornamento ogni 2 minuti, non tick-by-tick. Lo storico contiene solo rilevazioni reali raccolte da questo dispositivo; non viene ricostruito artificialmente.','CoinGecko · updated every 2 minutes, not tick-by-tick. History includes only real observations saved on this device; no synthetic backfill.'));
 for(const btn of document.querySelectorAll('[data-inj-dom-range]'))btn.setAttribute('aria-pressed',String(btn.dataset.injDomRange===selected));
 const p=last();
 set('injDomValue',p?pct(p.d):'—');
 set('injDomCap',p?cap(p.i):'—');
 set('injDomGlobal',p?cap(p.g):'—');
 const recent=history.filter(x=>x.t>Date.now()-DAY);
 const delta=recent.length>1?p.d-recent[0].d:NaN;
 set('injDomDelta',Number.isFinite(delta)?(delta>0?'+':'')+pct(delta).replace('%',' pp'):'—');
 set('injDomDeltaLabel',tr('VAR. RILEVATA · FINO A 24H','RECORDED CHANGE · UP TO 24H'));
 $('injDomDelta').className=Number.isFinite(delta)?delta>0?'up':delta<0?'down':'neutral':'neutral';
 status.textContent=loading?tr('SINCRONIZZAZIONE','SYNCING'):!p?tr('NESSUN DATO','NO DATA'):!updatedFresh?tr('ULTIMO DATO SALVATO · ','LAST SAVED DATA · ')+time(p.t):tr('AGGIORNATO · ','UPDATED · ')+time(p.t);
 if(last())renderChart();
 else{svg.replaceChildren();placeholder.hidden=false;placeholder.textContent=tr('Connessione a CoinGecko…','Connecting to CoinGecko…')}
}
async function request(url,signal){
 const result=await fetch(url,{headers:{accept:'application/json'},cache:'no-store',signal});
 if(!result.ok)throw new Error('CoinGecko HTTP '+result.status);
 return result.json();
}
async function refresh(force=false){
 if(loading||document.hidden)return;
 if(!force&&Date.now()-lastFetch<TWO_MIN)return;
 loading=true;render();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
 try{
  // Both numerator and denominator are read together from the same provider.
  const [coin,global]=await Promise.all([
   request(API+'/coins/markets?vs_currency=usd&ids=injective-protocol&sparkline=false',controller.signal),
   request(API+'/global',controller.signal)
  ]);
  const marketCap=n(coin?.[0]?.market_cap),globalCap=n(global?.data?.total_market_cap?.usd);
  if(!(marketCap>0&&globalCap>marketCap))throw Error('Missing coherent market capitalization');
  const now=Date.now();
  store({t:now,d:marketCap/globalCap*100,i:marketCap,g:globalCap});
  updatedFresh=true;lastFetch=now;
 }catch(err){
  updatedFresh=false;
  status.title=String(err?.message||err);
  lastFetch=Date.now()-TWO_MIN+30000;
 }finally{clearTimeout(timeout);loading=false;pointerIndex=null;render()}
}
document.querySelectorAll('[data-inj-dom-range]').forEach(btn=>btn.addEventListener('click',()=>{
 selected=WINDOWS[btn.dataset.injDomRange]?btn.dataset.injDomRange:'24h';
 pointerIndex=null;save(RANGE_KEY,selected);render();
}));
$('injDomRefresh')?.addEventListener('click',()=>refresh(true));
window.addEventListener('storage',e=>{if(e.key===KEY){history=recover();render()}if(e.key==='inj_node_language_v1')render()});
window.addEventListener('message',e=>{if(e.data?.type==='injnode:market:language')render()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void refresh()}});
render();void refresh();
setInterval(()=>{if(!document.hidden)void refresh()},TWO_MIN);
})();