/* INJ Node Insights Pro — all visualizations read authenticated aggregate data from Cloudflare. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('insightsPro');if(!root)return;
const state={days:30,country:'',section:'',tab:'overview',data:null,allCountries:[],allSections:[],busy:false,map:null,mapLayer:null,firstMap:true,requestId:0};
const number=n=>Number.isFinite(Number(n))?Number(n):0;
const fmt=n=>new Intl.NumberFormat('it-IT').format(number(n));
const time=s=>{const x=Math.max(0,Math.round(number(s)));return x>=3600?`${Math.floor(x/3600)}h ${Math.floor(x%3600/60)}m`:x>=60?`${Math.floor(x/60)}m ${x%60}s`:`${x}s`};
const when=s=>s?new Date(s).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—';
const el=(tag,className,txt)=>{const e=document.createElement(tag);if(className)e.className=className;if(txt!==undefined)e.textContent=String(txt);return e};
const clear=id=>{const x=$(id);if(x)x.replaceChildren();return x};
const empty=(host,message='Nessun dato disponibile per i filtri selezionati.')=>host.append(el('div','pro-empty',message));
const aggregate=(items,k='value')=>(items||[]).reduce((n,x)=>n+number(x[k]),0);
const pickTop=x=>Array.isArray(x)&&x.length?x[0]:null;
function renderRows(id,values,opts={}){
 const host=clear(id);if(!host)return;
 const rows=(values||[]).slice(0,opts.limit||12);if(!rows.length){empty(host,opts.empty);return}
 const max=Math.max(1,...rows.map(x=>number(x[opts.val||'value'])));
 for(const r of rows){
  const val=number(r[opts.val||'value']),row=el(opts.onClick?'button':'div','pro-row');
  if(opts.onClick){row.type='button';row.addEventListener('click',()=>opts.onClick(r))}
  const main=el('div','pro-row-main');main.append(el('strong','pro-row-title',opts.title?opts.title(r):r.label||'—'));
  if(opts.sub)main.append(el('span','pro-row-sub',opts.sub(r)));
  const bar=el('div','pro-bar'),fill=el('span','pro-bar-fill');fill.style.width=(100*val/max).toFixed(1)+'%';bar.append(fill);main.append(bar);
  row.append(main,el('strong','pro-row-value',opts.format?opts.format(val,r):fmt(val)));host.append(row);
 }
}
function setOptions(id,items,labeler,current){
 const host=$(id);if(!host)return;
 host.replaceChildren();
 const def=el('option',null,id==='proCountry'?'TUTTI I PAESI':'TUTTE LE SEZIONI');def.value='';host.append(def);
 for(const x of items){const v=String(labeler(x));if(!v||v==='--')continue;const opt=el('option',null,v);opt.value=v;host.append(opt)}
 host.value=current;
 if(host.value!==current)host.value='';
}
function note(message){$('proScope').textContent=message}
function showTab(tab){
 state.tab=tab;
 for(const b of document.querySelectorAll('#proTabs [data-pro-tab]')){const on=b.dataset.proTab===tab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))}
 for(const page of root.querySelectorAll('[data-pro-page]'))page.hidden=page.dataset.proPage!==tab;
 if(tab==='overview')requestAnimationFrame(()=>{if(state.data)renderMap(state.data.locations||[])});
}
function fillKpis(d){
 $('proSessions').textContent=fmt(d.summary?.sessions);
 $('proOnline').textContent=fmt(d.summary?.active);
 $('proDuration').textContent=time(d.summary?.average_duration);
 $('proSectionCount').textContent=fmt((d.sections||[]).length);
 $('proInteractions').textContent=fmt(aggregate(d.sections));
 const delta=d.summary?.change_percent;
 $('proGrowth').textContent=delta==null?'—':(number(delta)>0?'+':'')+new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(number(delta))+'%';
 $('proGrowth').style.color=delta==null?'#b3c2c1':number(delta)>0?'#72ebbf':number(delta)<0?'#e5a19c':'#cbd6d2';
 $('proUpdated').textContent='DATI LIVE · '+when(d.generatedAt);
 note('Periodo: '+$('proDays').selectedOptions[0].text+' · '+(state.country||'tutti i Paesi')+' · '+(state.section||'tutte le sezioni')+' · solo sessioni consenzienti · orari in UTC nella heatmap');
}
const svgNS='http://www.w3.org/2000/svg';
const shape=(name,attrs={})=>{const n=document.createElementNS(svgNS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n};
function renderTrend(d){
 const host=clear('proTrend'),tip=$('proTrendTooltip');if(!host)return;
 const observations=new Map((d.trend||[]).map(x=>[x.label,number(x.value)]));
 let pts=(d.trend||[]).map(x=>({...x,value:number(x.value)}));
 if(state.days===1){pts=Array.from({length:24},(_,i)=>{const dt=new Date(Date.now()-(23-i)*3600000),label=dt.toISOString().slice(0,13);return {label,value:observations.get(label)||0}})}
 else if(state.days>1){pts=Array.from({length:state.days},(_,i)=>{const dt=new Date(Date.now()-(state.days-1-i)*86400000),label=dt.toISOString().slice(0,10);return {label,value:observations.get(label)||0}})}
 if(aggregate(d.trend)===0)pts=[];
 $('proTrendType').textContent=state.days===1?'ORARIO (UTC)':state.days===0?'MENSILE (UTC)':'GIORNALIERO (UTC)';
 if(!pts.length){host.append(shape('text',{x:90,y:130,fill:'#8fa8ab','font-size':16}));host.lastChild.textContent='Nessuna sessione nel periodo';tip.textContent='Non sono disponibili osservazioni.';return}
 const w=900,h=260,L=30,R=18,T=20,B=36,max=Math.max(1,...pts.map(x=>x.value)),X=i=>L+(w-L-R)*(pts.length===1?.5:i/(pts.length-1)),Y=v=>h-B-(h-T-B)*(v/max);
 for(let i=0;i<5;i++){const y=T+(h-T-B)*i/4;host.append(shape('line',{x1:L,y1:y,x2:w-R,y2:y,stroke:'#34545a','stroke-opacity':.6,'stroke-dasharray':'4 7'}));const lab=shape('text',{x:1,y:y+4,fill:'#91a9ae','font-size':11});lab.textContent=fmt(Math.round(max*(4-i)/4));host.append(lab)}
 const pointstr=pts.map((x,i)=>X(i)+','+Y(x.value)).join(' ');
 host.append(shape('polygon',{points:X(0)+','+(h-B)+' '+pointstr+' '+X(pts.length-1)+','+(h-B),fill:'#54d6b5','fill-opacity':.13}));
 host.append(shape('polyline',{points:pointstr,fill:'none',stroke:'#68ebc1','stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'}));
 pts.forEach((x,i)=>{
  const dot=shape('circle',{cx:X(i),cy:Y(x.value),r:pts.length>60?4:6,fill:'#a2f8db',stroke:'#173e3a','stroke-width':1.5,tabindex:0,role:'button','aria-label':x.label+': '+fmt(x.value)+' sessioni'});
  const select=()=>{tip.textContent=x.label+' · '+fmt(x.value)+' sessioni';dot.setAttribute('r',8);setTimeout(()=>dot.setAttribute('r',pts.length>60?4:6),900)};
  dot.addEventListener('click',select);dot.addEventListener('focus',select);host.append(dot);
 });
 const first=shape('text',{x:L,y:h-9,fill:'#9ab6b6','font-size':11});first.textContent=pts[0].label;
 const last=shape('text',{x:w-R,y:h-9,fill:'#9ab6b6','font-size':11,'text-anchor':'end'});last.textContent=pts.at(-1).label;
 host.append(first,last);
 tip.textContent='Seleziona uno dei '+fmt(pts.length)+' punti per esplorare la serie.';
}
function setupMap(){
 if(state.map||!window.L||$('proMap').offsetWidth===0)return;
 state.map=L.map('proMap',{zoomControl:true,scrollWheelZoom:false,worldCopyJump:true,minZoom:2,maxZoom:10,zoomAnimation:false}).setView([30,11],2);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:10,attribution:'© OpenStreetMap contributors'}).addTo(state.map);
 state.mapLayer=L.layerGroup().addTo(state.map);
}
function renderMap(locations){
 setupMap();if(!state.map)return;
 state.map.invalidateSize({animate:false,pan:false});state.mapLayer.clearLayers();
 const bounds=[];for(const x of locations){
  const lat=x.lat,lng=x.lng;if(lat===null||lng===null||lat===undefined||lng===undefined)continue;
  if(!Number.isFinite(number(lat))||!Number.isFinite(number(lng)))continue;
  const p=[Number(lat),Number(lng)],active=Date.now()-Date.parse(x.last_seen)<120000,r=Math.min(16,5+Math.sqrt(number(x.visits))*1.6);
  const marker=L.circleMarker(p,{radius:r,color:active?'#7af5cf':'#80b9ce',weight:1.5,fillColor:active?'#54eabc':'#3994ab',fillOpacity:active?.78:.5});
  const pop=el('div');pop.append(el('strong',null,(x.city||'Zona')+', '+(x.country||'—')));pop.append(el('div',null,fmt(x.visits)+' sessioni aggregate'));
  marker.bindPopup(pop);marker.on('click',()=>{if(x.country&&x.country!=='--'){state.country=x.country;$('proCountry').value=x.country;load()}});
  marker.addTo(state.mapLayer);bounds.push(p);
 }
 if(state.firstMap&&bounds.length){state.firstMap=false;if(bounds.length===1)state.map.setView(bounds[0],6);else state.map.fitBounds(bounds,{padding:[20,20],maxZoom:7,animate:false})}
}
function renderOverview(d){
 renderTrend(d);const x=clear('proExecutive');
 const top=pickTop(d.sections),country=pickTop(d.countries);
 const paragraphs=[
  'Nel periodo selezionato sono state rilevate '+fmt(d.summary?.sessions)+' sessioni consenzienti.',
  'La sezione con più interazioni è '+(top?top.label+' ('+fmt(top.value)+' visualizzazioni).':'non ancora determinabile.'),
  'L’area di maggior provenienza è '+(country?country.label+' ('+fmt(country.value)+' sessioni).':'non ancora disponibile.'),
  'Tempo attivo medio per sessione: '+time(d.summary?.average_duration)+'.'
 ];
 paragraphs.forEach(p=>x.append(el('p',null,p)));
 renderRows('proAreas',d.locations,{val:'visits',title:v=>(v.city||'Zona')+' · '+(v.country||'—'),sub:v=>'Ultima attività: '+when(v.last_seen),onClick:v=>{state.country=v.country||'';$('proCountry').value=state.country;load()},limit:30});
 if(state.tab==='overview')renderMap(d.locations||[]);
}
function renderLive(d){
 renderRows('proLive',(d.live||[]).map(x=>({...x,label:(x.country||'Area non disponibile')+' · '+(x.device||'dispositivo')})),{title:x=>x.label,sub:x=>'Ultima attività '+when(x.last_seen),empty:'Nessuna sessione attiva negli ultimi 90 secondi.'});
 const counts=new Map();for(const x of d.live||[])counts.set(x.device,(counts.get(x.device)||0)+number(x.value));
 renderRows('proLiveDevices',Array.from(counts,([label,value])=>({label,value})),{empty:'Nessun dispositivo attivo adesso.'});
}
function renderAudience(d){
 renderRows('proDevices',d.devices);
 renderRows('proSystems',d.systems,{empty:'Non sono ancora disponibili dati sul sistema operativo.'});
 renderRows('proBrowsers',d.browsers,{empty:'Non sono ancora disponibili dati sul browser.'});
 renderRows('proWallets',d.wallets,{val:'value',title:x=>x.label,sub:x=>fmt(x.observers)+' sessioni interessate',limit:18,empty:'Nessuna visualizzazione di wallet registrata.'});
}
function renderHeatmap(d){
 const host=clear('proHeatmap'),values=new Map();
 for(const x of d.heatmap||[])values.set(Number(x.weekday)+'-'+Number(x.hour),number(x.value));
 const max=Math.max(1,...values.values()),days=['DOM','LUN','MAR','MER','GIO','VEN','SAB'],grid=el('div','pro-heatmap-grid');
 grid.append(el('span','pro-hour-label','UTC'));
 for(let hour=0;hour<24;hour++)grid.append(el('span','pro-hour-label',hour%3===0?String(hour).padStart(2,'0'):'·'));
 for(let day=0;day<7;day++){grid.append(el('div','pro-day-label',days[day]));
  for(let hour=0;hour<24;hour++){const n=values.get(day+'-'+hour)||0;const cell=el('div','pro-cell');cell.style.background=n?'rgba(87,229,187,'+(0.16+0.75*n/max).toFixed(2)+')':'#1d333d';
   cell.title=days[day]+' '+String(hour).padStart(2,'0')+':00 UTC · '+fmt(n)+' visite alle sezioni';grid.append(cell)}
 }
 host.append(grid,el('p','pro-heatmap-footer','Più intensa è la cella, più visite alle sezioni sono state registrate. I valori sono aggregati per ora UTC.'));
}
function renderBehaviour(d){
 renderRows('proJourney',d.transitions,{title:x=>x.label_from+'  →  '+x.label_to,sub:x=>'Transizioni tra sezioni',limit:20,empty:'Percorsi non ancora disponibili: servono più passaggi tra sezioni.'});
 renderHeatmap(d);
 const tags={'timeframe':'Timeframe','wallet-select':'Selezione wallet','workspace-edit':'Interazioni Workspace','workspace-add':'Aggiunta Workspace','workspace-fullscreen':'Workspace fullscreen','heatmap':'Heatmap','chart-interaction':'Grafici','treasury':'Treasury','market':'Mercato','orderbook':'Order Book','converter':'Converter','reward':'Reward','navigation':'Navigazione'};
 renderRows('proFeatures',d.features,{title:x=>tags[x.label]||x.label,empty:'Le nuove interazioni verranno conteggiate soltanto dopo il consenso aggiornato.'});
 const durations=new Map((d.durations||[]).map(x=>[x.label,number(x.seconds)]));
 renderRows('proSections',d.sections,{title:x=>x.label,sub:x=>'Tempo attivo totale: '+time(durations.get(x.label)||0),limit:40,onClick:x=>{state.section=x.label;$('proSection').value=x.label;load()}});
}
function renderSystem(d){
 const status=clear('proHealthStatus');status.append(el('p',null,'● Endpoint di analisi raggiungibile e risposta amministratore autenticata.'));
 status.append(el('p',null,'Ultima risposta: '+when(d.generatedAt)));
 status.append(el('p',null,'Ultima attività nel periodo: '+when(d.summary?.last_seen)));
 status.append(el('p',null,'Le misurazioni non equivalgono a un controllo continuo di disponibilità del sito.'));
 const nav=(d.health||[]).find(x=>x.label==='navigation'),errors=(d.health||[]).filter(x=>x.label!=='navigation');
 const quality=clear('proHealth');
 if(!d.health?.length){empty(quality,'Nessuna diagnostica raccolta. I conteggi saranno disponibili dopo l’accettazione del nuovo consenso.');return}
 quality.append(el('p',null,'Caricamenti misurati: '+fmt(nav?.value||0)));
 quality.append(el('p',null,'Tempo medio di caricamento: '+(nav?fmt(nav.avg_ms)+' ms':'non disponibile')));
 quality.append(el('p',null,'Caricamenti ≥ 4 secondi: '+fmt(nav?.slow||0)));
 quality.append(el('p',null,'Errori rilevati (senza messaggio): '+fmt(aggregate(errors))));
 renderRows('proHealthBreakdown',errors);
}
function renderReport(d){
 const host=clear('proReport'),title=el('h4',null,'B CAPITAL GROUP · AUDIENCE REPORT');host.append(title);
 host.append(el('p',null,'Generato il '+when(d.generatedAt)+' · '+$('proDays').selectedOptions[0].text+' · Paese: '+(state.country||'tutti')+' · Sezione: '+(state.section||'tutte')));
 const ul=el('ul'),top=pickTop(d.sections),country=pickTop(d.countries),device=pickTop(d.devices);
 const metrics=[
  'Sessioni rilevate: '+fmt(d.summary?.sessions)+'. Sessioni attive ora: '+fmt(d.summary?.active)+'.',
  'Periodo precedente: '+(d.summary?.previous_sessions==null?'non applicabile':fmt(d.summary.previous_sessions))+' sessioni. Variazione: '+(d.summary?.change_percent==null?'non calcolabile':d.summary.change_percent+'%')+'.',
  'Durata attiva media stimata: '+time(d.summary?.average_duration)+'.',
  'Sezione più visitata: '+(top?top.label+' ('+fmt(top.value)+' eventi).':'non disponibile.'),
  'Paese più rappresentato: '+(country?country.label+' ('+fmt(country.value)+' sessioni).':'non disponibile.'),
  'Dispositivo prevalente: '+(device?device.label+' ('+fmt(device.value)+' sessioni).':'non disponibile.'),
  'Transizioni tra sezioni registrate: '+fmt(aggregate(d.transitions))+'.',
  'Azioni di interazione avanzate registrate: '+fmt(aggregate(d.features))+'.',
  'Eventi di diagnostica disponibili: '+fmt(aggregate(d.health))+'.'
 ];
 for(const str of metrics)ul.append(el('li',null,str));host.append(ul);
 host.append(el('p',null,'Nota metodologica: statistiche di sessioni che hanno dato il consenso, non utenti unici. Classifiche, percorsi e aree sono aggregati; alcuni dati avanzati sono disponibili solo dopo l’aggiornamento della telemetria.'));
}
function render(d){
 state.data=d;root.hidden=false;document.body.classList.add('insights-pro-ready');$('adminDataNotice').hidden=true;fillKpis(d);
 renderOverview(d);renderLive(d);renderAudience(d);renderBehaviour(d);renderSystem(d);renderReport(d);
 showTab(state.tab);
}
function exportCsv(){
 const d=state.data;if(!d)return;
 const data=[['INJ NODE INSIGHTS PRO','B CAPITAL GROUP'],['Periodo',$('proDays').selectedOptions[0].text],['Paese',state.country||'Tutti'],['Sezione',state.section||'Tutte'],['Generato',d.generatedAt],['Sessioni',d.summary?.sessions],['Online',d.summary?.active],['Tempo medio (s)',d.summary?.average_duration]];
 for(const [key,label] of [['trend','Trend'],['countries','Paesi'],['locations','Aree'],['devices','Dispositivi'],['systems','Sistemi'],['browsers','Browser'],['sections','Sezioni'],['wallets','Wallet aggregati'],['features','Funzionalità'],['transitions','Percorsi'],['health','Health']]){
  data.push([],['# '+label]);const arr=d[key]||[];if(!arr.length)continue;
  const fields=Object.keys(arr[0]).filter(x=>!['lat','lng','last_seen','wallet_hash'].includes(x));data.push(fields);
  for(const item of arr)data.push(fields.map(f=>item[f]??''));
 }
 const escape=x=>{let str=String(x??'');if(/^[=+@\-\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};
 const csv='\ufeff'+data.map(row=>row.map(escape).join(';')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.href=url;link.download='INJ-Node-Insights-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function load(){
 const cfg=window.INJ_ADMIN_INSIGHTS_API;if(!cfg?.base||!cfg.headers().Authorization)return;
 if(state.busy)return;
 state.busy=true;$('proUpdated').textContent='AGGIORNAMENTO…';const requestId=++state.requestId;
 try{
  const query=new URLSearchParams({days:String(state.days)});
  if(state.country)query.set('country',state.country);
  if(state.section)query.set('section',state.section);
  const resp=await fetch(cfg.base+'/api/admin/advanced?'+query.toString(),{mode:'cors',credentials:'omit',cache:'no-store',headers:cfg.headers()});
  if(resp.status===401){document.dispatchEvent(new CustomEvent('inj-admin:expired'));return}
  if(!resp.ok)throw Error('API avanzata non disponibile (HTTP '+resp.status+'). Pubblica il nuovo Worker Cloudflare.');
  const d=await resp.json();if(requestId!==state.requestId)return;
  if(!state.country&&!state.section){state.allCountries=(d.countries||[]).map(x=>x.label).filter(x=>/^[A-Z]{2}$/.test(x));state.allSections=(d.sections||[]).map(x=>x.label).filter(Boolean)}
  if(state.allCountries.length)setOptions('proCountry',state.allCountries,x=>x,state.country);
  if(state.allSections.length)setOptions('proSection',state.allSections,x=>x,state.section);
  render(d);
 }catch(e){
  $('proUpdated').textContent='DATI AVANZATI NON DISPONIBILI';
  root.hidden=true;document.body.classList.remove('insights-pro-ready');state.data=null;
  const notice=$('adminDataNotice');notice.hidden=false;notice.textContent='Insights Pro non è ancora raggiungibile: verifica il deployment del Worker Cloudflare con l’API /api/admin/advanced. È disponibile la dashboard precedente.';
  console.warn('INJ Insights Pro:',e.message);
 }finally{state.busy=false}
}
function reset(){state.days=30;state.country='';state.section='';$('proDays').value='30';$('proCountry').value='';$('proSection').value='';state.firstMap=true;load()}
$('proDays').addEventListener('change',e=>{state.days=Number(e.target.value);load()});
$('proCountry').addEventListener('change',e=>{state.country=e.target.value;state.firstMap=true;load()});
$('proSection').addEventListener('change',e=>{state.section=e.target.value;load()});
$('proReset').addEventListener('click',reset);
$('proRefresh').addEventListener('click',load);
$('proMapReset').addEventListener('click',()=>{state.firstMap=true;state.map?.setView([30,11],2,{animate:false});if(state.country){state.country='';$('proCountry').value='';load()}});
for(const b of document.querySelectorAll('#proTabs [data-pro-tab]'))b.addEventListener('click',()=>showTab(b.dataset.proTab));
for(const id of ['proCsv','proReportCsv'])$(id).addEventListener('click',exportCsv);
for(const id of ['proPrint','proReportPrint'])$(id).addEventListener('click',()=>window.print());
document.addEventListener('inj-admin:ready',()=>{load();});
function closePro(){root.hidden=true;document.body.classList.remove('insights-pro-ready');state.data=null;state.requestId++}
document.addEventListener('inj-admin:expired',closePro);
$('adminLogout').addEventListener('click',closePro);
setInterval(()=>{if(!document.hidden&&!document.getElementById('adminDashboard')?.hidden)load()},10000);
window.addEventListener('resize',()=>{if(state.map&&!root.hidden&&state.tab==='overview')state.map.invalidateSize({animate:false,pan:false})},{passive:true});
})();