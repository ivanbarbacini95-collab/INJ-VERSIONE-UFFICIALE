(() => {
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('it-IT').format(Number(n || 0));
const duration = s => { s=Math.round(Number(s||0)); return s<60 ? `${s} s` : `${Math.floor(s/60)}m ${s%60}s`; };
const safeDate = s => {try{return new Date(s).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'});}catch(_){return '—';}};
let days = 30, map, geoLayer, lastLocations = '', inProgress = false, shownError = false;
let mapFitted=false, mapResizeObserver=null, mapResizeFrame=0;
const firstSeen = new Set();
const make = (tag,cls,text) => { const el = document.createElement(tag); if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
function showMessage(message) { const t=$('toast'); t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),6000); }
function status(ok) { const x=$('connectionState');x.textContent=ok?'LIVE DATA / SYNC':'DATI NON DISPONIBILI';document.querySelector('.signal').classList.toggle('off',!ok); }
function refreshMapSize() {
 if (!map || $('adminDashboard').hidden) return;
 cancelAnimationFrame(mapResizeFrame);
 mapResizeFrame=requestAnimationFrame(()=>{
   if (!map || $('adminDashboard').hidden) return;
   map.invalidateSize({pan:false,animate:false});
 });
}
function settleMapSize() {
 refreshMapSize();
 // iOS PWA and embedded section iframes can change width after the first paint.
 [100,350,900].forEach(delay=>setTimeout(refreshMapSize,delay));
}
function setupMap() {
 if (map) {settleMapSize();return;}
 if (!window.L) { $('map').textContent='Impossibile avviare la mappa. Verifica la connessione.';return; }
 const host=$('map');
 map=L.map(host,{zoomControl:true,scrollWheelZoom:false,worldCopyJump:true,minZoom:2,maxZoom:10,
   fadeAnimation:false,zoomAnimation:false,markerZoomAnimation:false}).setView([30,12],2);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:10,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    updateWhenIdle:true,keepBuffer:2
 }).addTo(map);
 geoLayer=L.layerGroup().addTo(map);
 if ('ResizeObserver' in window) {
   mapResizeObserver=new ResizeObserver(refreshMapSize);
   mapResizeObserver.observe(host);
 }
 window.addEventListener('resize',settleMapSize,{passive:true});
 window.addEventListener('orientationchange',settleMapSize,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)settleMapSize()});
 settleMapSize();
}
function updateMap(locations) {
 $('mapAreaCount').textContent=fmt(locations.length);
 if(!map)return;
 const valid=locations.filter(x=>x.lat!==null&&x.lat!==undefined&&x.lng!==null&&x.lng!==undefined&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng)));
 const encoded=JSON.stringify(locations.map(x=>[x.country,x.city,x.lat,x.lng,x.visits,x.last_seen]));
 if(lastLocations===encoded)return;
 lastLocations=encoded;
 geoLayer.clearLayers();
 const now=Date.now();
 valid.forEach(x=>{
   const lat=Number(x.lat),lng=Number(x.lng),visits=Number(x.visits)||0;
   const active=now-Date.parse(x.last_seen)<120000;
   const r=active?15:Math.min(14,7+Math.sqrt(visits)*1.4);
   const point=L.circleMarker([lat,lng],{radius:r,color:active?'#86ffd9':'#7db8ca',weight:1.6,
    fillColor:active?'#49e6b5':'#388cab',fillOpacity:active?.75:.52,bubblingMouseEvents:false});
   const popup=make('div');
   popup.append(make('strong',null,`${x.city || 'Zona'} · ${x.country||'--'}`));
   popup.append(make('div',null,`${fmt(visits)} accessi · area approssimativa`));
   popup.append(make('small',null,`Ultimo accesso: ${safeDate(x.last_seen)}`));
   point.bindPopup(popup);
   if(active)point.on('add',()=>{ const path=point.getElement();if(path)path.classList.add('geo-new'); });
   point.addTo(geoLayer);
   const key=`${x.country}-${x.city}-${lat}-${lng}`;
   if(active&&!firstSeen.has(key)&&firstSeen.size>0) point.bringToFront();
   firstSeen.add(key);
 });
 if(!mapFitted&&valid.length){
   mapFitted=true;
   if(valid.length===1)map.setView([Number(valid[0].lat),Number(valid[0].lng)],6,{animate:false});
   else map.fitBounds(valid.map(x=>[Number(x.lat),Number(x.lng)]),{padding:[28,28],maxZoom:7,animate:false});
 }
 settleMapSize();
}
function drawRanking(id, data, title, sub) {
 const host=$(id);host.replaceChildren();
 if(!data.length) {host.append(make('div','empty','Nessuna attività ancora registrata'));return;}
 const max=Math.max(1,...data.map(x=>Number(x.views||x.visits||0)));
 data.slice(0,10).forEach((x,i)=>{
  const views=Number(x.views||x.visits||0),row=make('div','rank-row');
  row.append(make('div','rank-no',String(i+1).padStart(2,'0')));
  const info=make('div','rank-info');info.append(make('strong',null,title(x)));info.append(make('small',null,sub(x)));
  row.append(info,make('div','rank-value',fmt(views)));
  const bar=make('div','rank-meter');const fill=make('span');fill.style.width=Math.max(3,views/max*100)+'%';bar.append(fill);row.append(bar);host.append(row);
 });
}
function drawChart(trend){const svg=$('trafficChart');svg.replaceChildren();const w=720,h=230,l=15,r=14,t=17,b=18;
 const values=trend.map(x=>Number(x.visits)||0);const max=Math.max(1,...values);const count=Math.max(1,values.length-1);
 const X=i=>l+(w-l-r)*i/count,Y=n=>h-b-(h-b-t)*(n/max);
 for(let i=0;i<5;i++){const y=t+(h-b-t)*i/4;const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const[k,v]of Object.entries({x1:l,y1:y,x2:w-r,y2:y}))line.setAttribute(k,v);line.setAttribute('class','chart-grid');svg.append(line)}
 if(values.length){const points=values.map((v,i)=>`${X(i)},${Y(v)}`).join(' ');
 const fill=document.createElementNS('http://www.w3.org/2000/svg','polygon');fill.setAttribute('points',`${X(0)},${h-b} ${points} ${X(values.length-1)},${h-b}`);fill.setAttribute('class','chart-fill');svg.append(fill);
 const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points);line.setAttribute('class','chart-line');svg.append(line);
 const last=document.createElementNS('http://www.w3.org/2000/svg','circle');last.setAttribute('cx',X(values.length-1));last.setAttribute('cy',Y(values.at(-1)));last.setAttribute('r',5);last.setAttribute('class','chart-circle');svg.append(last);
 }
 $('chartAxis').replaceChildren(make('span',null,trend[0]?.day||'—'),make('span',null,trend.at(-1)?.day||'—'));
}
function drawDevices(devices) {const labels={mobile:'MOBILE',tablet:'TABLET',desktop:'DESKTOP'};const colors={mobile:'#58e2bc',tablet:'#59b5db',desktop:'#b8a377'};const total=devices.reduce((a,v)=>a+Number(v.count||0),0);const sorted=['mobile','tablet','desktop'].map(k=>({device:k,count:Number(devices.find(d=>d.device===k)?.count||0)}));const track=$('deviceTrack'),list=$('deviceList');track.replaceChildren();list.replaceChildren();sorted.forEach(d=>{const pct=total?100*d.count/total:0;const piece=make('span');piece.style.width=`${pct}%`;piece.style.background=colors[d.device];piece.title=`${labels[d.device]} ${pct.toFixed(0)}%`;track.append(piece);const row=make('div','device-row');row.append(make('span',null,labels[d.device]),make('strong',null,`${fmt(d.count)} · ${pct.toFixed(0)}%`));list.append(row);});}
function drawRecent(recent){const host=$('recentEvents');host.replaceChildren();if(!recent.length) {host.append(make('div','empty','Nessuna attività recente'));return;}recent.forEach(x=>{const row=make('div','event-row');row.append(make('strong',null,`${x.kind==='wallet'?'WALLET':'SEZIONE'} · ${x.label}`),make('span',null,safeDate(x.at)));host.append(row)});}
async function update() {
 if(document.body.classList.contains('insights-pro-ready'))return;
 if (inProgress) return; inProgress=true;
 try {
  const cfg=window.INJ_ADMIN_INSIGHTS_API;if(!cfg?.base||!cfg.headers().Authorization)throw new Error('Autenticazione Admin non disponibile');
  const response=await fetch(cfg.base+'/api/admin/overview?days='+days,{mode:'cors',headers:cfg.headers(),credentials:'omit',cache:'no-store'});
  if(!response.ok){if(response.status===401){document.dispatchEvent(new CustomEvent('inj-admin:expired'));return;}const data=await response.json().catch(()=>({}));throw new Error(data.error||('HTTP '+response.status));}
  const data=await response.json(); status(true);shownError=false;
  $('kLive').textContent=fmt(data.summary.live);$('kToday').textContent=fmt(data.summary.today);$('kTotal').textContent=fmt(data.summary.total);$('kDuration').textContent=duration(data.summary.average_duration);$('kWeek').textContent=fmt(data.summary.last7);
  $('lastUpdate').textContent='ULTIMO AGGIORNAMENTO · '+safeDate(data.generatedAt);
  const loc=data.locations||[];updateMap(loc);
  drawRanking('topLocations', [...loc].sort((a,b)=>Number(b.visits)-Number(a.visits)),x=>`${x.city}, ${x.country}`,x=>`Ultimo: ${safeDate(x.last_seen)}`);
  drawRanking('topSections',data.sections||[],x=>x.label,x=>`${duration(x.seconds)} di visualizzazione attiva`);
  drawRanking('topWallets',data.wallets||[],x=>x.label,x=>`${fmt(x.observers)} sessioni interessate`);
  drawChart(data.trend||[]);drawDevices(data.devices||[]);drawRecent(data.recent||[]);
 } catch(err){status(false);if(!shownError){showMessage('Impossibile caricare dati reali: '+err.message);shownError=true;}}
 finally {inProgress=false;}
}
for(const button of document.querySelectorAll('[data-days]'))button.addEventListener('click',()=>{days=Number(button.dataset.days);document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===button));update();});
$('refreshButton').addEventListener('click',update);
let adminReportStarted=false;
function startAdminReport(){if(adminReportStarted){settleMapSize();update();return;}adminReportStarted=true;setupMap();update();setInterval(()=>{if(!document.hidden&&!document.getElementById('adminDashboard').hidden)update();},10000);}
document.addEventListener('inj-admin:ready',startAdminReport);

})();
