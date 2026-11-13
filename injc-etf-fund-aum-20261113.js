/* INJ Node Official · minimal INJC holdings history and spot-based USD estimate.
   The quantity chart shows only issuer-dated INJ holdings observations; no
   fictional intraday movement or conflation with ETF share trade volume. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const isEn=()=>{try{return (localStorage.getItem('inj_node_language_v1')||'it').toLowerCase().startsWith('en')}catch{return false}};
 const tr=(it,en)=>isEn()?en:it;
 const locale=()=>isEn()?'en-US':'it-IT';
 const fmt=(value,digits=2)=>Number(value).toLocaleString(locale(),{minimumFractionDigits:digits,maximumFractionDigits:digits});
 const usd=value=>'$'+fmt(value,2);
 const valid=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null};
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
   Number.isFinite(Date.parse(value+'T00:00:00Z'));
 const labelDate=value=>{if(!validDate(value))return '—';const [y,m,d]=value.split('-');return isEn()?m+'/'+d+'/'+y:d+'/'+m+'/'+y};
 const put=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 let current=null,history=[],spot=null,spotAt=0,spotBusy=false,holdingsBusy=false,historyBusy=false,
   range='all',plotPoints=[];
 const snapshotAsPoint=data=>({date:data.asOf,injHeld:Number(data.injHeld)});
 const requireIssuerSnapshot=data=>{
   if(data?.schemaVersion!==1||data.ticker!=='INJC'||data.sourceType!=='issuer_holdings'||
     data.source!=='https://canaryetfs.com/injc/'||!validDate(data.asOf)||
     Date.parse(data.asOf+'T00:00:00Z')>Date.now()+86400000||
     !valid(data.injHeld)||!valid(data.officialNetAssetsUsd)||!valid(data.officialInjMarketValueUsd)||
     !valid(data.sharesOutstanding))throw Error('Unverified issuer holdings');
   return data;
 };
 function mergeHistory(points){
   const byDay=new Map(history.map(p=>[p.date,p]));
   for(const p of points){
     if(!validDate(p?.date)||!valid(p?.injHeld)||p.injHeld>1e9||
       Date.parse(p.date+'T00:00:00Z')>Date.now()+86400000)continue;
     byDay.set(p.date,{date:p.date,injHeld:Number(p.injHeld)});
   }
   if(current)byDay.set(current.asOf,snapshotAsPoint(current));
   history=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
   renderChart();
 }
 function renderNumbers(){
   put('injcFundInj',current?fmt(current.injHeld,2):'—');
   const fresh=spot!==null&&Date.now()-spotAt<120000;
   const estimate=current&&fresh?current.injHeld*spot:null;
   put('injcFundUsd',estimate!==null?usd(estimate):
     current?usd(current.officialInjMarketValueUsd):'—');
   put('injcFundUsdTag',estimate!==null?tr('STIMA LIVE · USD','LIVE ESTIMATE · USD'):
     tr('VALORE UFFICIALE · USD','REPORTED VALUE · USD'));
   put('injcFundDate',current
     ?tr('Rilevazione ','Reported ')+labelDate(current.asOf)
     :tr('In attesa dei dati','Awaiting report'));
   const status=$('injcFundFreshness');
   if(status){
     status.dataset.state=estimate!==null?'live':current?'reported':'unavailable';
     status.textContent=estimate!==null?'LIVE':current?tr('REPORT','REPORT'):'—';
   }
 }
 async function getJson(url,timeout=7500){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   try{
     const response=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
     if(!response.ok)throw Error('HTTP '+response.status);
     return await response.json();
   }finally{clearTimeout(timer)}
 }
 async function refreshHoldings(){
   if(holdingsBusy)return;holdingsBusy=true;
   try{
     const data=requireIssuerSnapshot(await getJson('./market-data/injc-fund-holdings.json?t='+Date.now()));
     if(!current||data.asOf>=current.asOf){
       current={asOf:data.asOf,injHeld:Number(data.injHeld),
         officialInjMarketValueUsd:Number(data.officialInjMarketValueUsd)};
       mergeHistory([snapshotAsPoint(current)]);
     }
   }catch(_){ /* never replace dated issuer holdings with estimates or stale synthetic values */ }
   finally{holdingsBusy=false;renderNumbers()}
 }
 async function refreshHistory(){
   if(historyBusy)return;historyBusy=true;
   try{
     const data=await getJson('./market-data/injc-fund-holdings-history.json?t='+Date.now());
     if(data?.schemaVersion!==1||data.ticker!=='INJC'||data.source!=='https://canaryetfs.com/injc/'||
       !Array.isArray(data.points))throw Error('Unverified history');
     mergeHistory(data.points);
   }catch(_){renderChart()}
   finally{historyBusy=false}
 }
 const feeds=[
   {url:'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd',
    read:d=>valid(d?.['injective-protocol']?.usd)},
   {url:'https://api.coinbase.com/v2/prices/INJ-USD/spot',
    read:d=>valid(d?.data?.amount)},
   {url:'https://api.kraken.com/0/public/Ticker?pair=INJUSD',
    read:d=>valid(Object.values(d?.result||{})[0]?.c?.[0])},
   {url:'https://data-api.binance.vision/api/v3/ticker/price?symbol=INJUSDC',
    read:d=>valid(d?.price)}
 ];
 async function refreshSpot(){
   if(spotBusy)return;spotBusy=true;
   try{
     for(const feed of feeds){
       try{
         const value=feed.read(await getJson(feed.url,5200));
         if(!value||value>100000)continue;
         spot=value;spotAt=Date.now();break;
       }catch(_){}
     }
   }finally{spotBusy=false;renderNumbers()}
 }
 function selectedHistory(){
   if(!history.length)return [];
   if(range==='all')return history;
   const days={'1m':31,'3m':93,'1y':366}[range]||366;
   const end=Date.now();
   const start=end-days*86400000;
   const rows=history.filter(p=>Date.parse(p.date+'T00:00:00Z')>=start&&
     Date.parse(p.date+'T00:00:00Z')<=end+86400000);
   return rows.length?rows:history.slice(-1);
 }
 function renderChart(){
   const svg=$('injcHoldingsSvg'),host=$('injcHoldingsChart');
   if(!svg||!host)return;
   const rows=selectedHistory();
   const width=Math.max(260,Math.round(host.clientWidth||700));
   const height=width<500?180:218;
   const left=16,right=16,top=15,bottom=30,plotW=width-left-right,plotH=height-top-bottom;
   svg.setAttribute('viewBox','0 0 '+width+' '+height);
   svg.setAttribute('preserveAspectRatio','none');
   plotPoints=[];
   if(!rows.length){
     svg.innerHTML='<line class="injc-holdings-grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+(height-bottom-2)+'" y2="'+(height-bottom-2)+'"/>';
     host.setAttribute('aria-label',tr('In attesa della prima rilevazione ufficiale di INJ detenuti',
       'Waiting for first issuer-reported INJ holdings observation'));
     return;
   }
   const values=rows.map(p=>p.injHeld),min=Math.min(...values),max=Math.max(...values);
   const pad=Math.max(0.1,(max-min)*0.13,Math.abs(max)*0.0007);
   const yMin=min-pad,yMax=max+pad;
   const ts=rows.map(p=>Date.parse(p.date+'T00:00:00Z'));
   const tMin=ts[0],tMax=ts[ts.length-1];
   const xAt=(t,i)=>tMax>tMin?left+(t-tMin)/(tMax-tMin)*plotW:left+plotW/2;
   const yAt=v=>top+(yMax-v)/(yMax-yMin)*plotH;
   plotPoints=rows.map((p,i)=>({...p,x:xAt(ts[i],i),y:yAt(p.injHeld)}));
   const color=rows.length>1?
     (rows.at(-1).injHeld>rows[0].injHeld?'up':rows.at(-1).injHeld<rows[0].injHeld?'down':'neutral'):'neutral';
   host.dataset.trend=color;
   host.setAttribute('aria-label',tr('Storico quantità INJ detenuta dal fondo, ','Fund INJ holdings by issuer date, ')+
     rows.length+tr(' rilevazioni. Ultima: ',' reports. Latest: ')+fmt(rows.at(-1).injHeld,2)+' INJ · '+labelDate(rows.at(-1).date));
   const grids=[0,0.5,1].map(frac=>{
     const y=top+plotH*frac;
     return '<line class="injc-holdings-grid" x1="'+left+'" x2="'+(width-right)+'" y1="'+y.toFixed(2)+'" y2="'+y.toFixed(2)+'"/>';
   }).join('');
   let markup=grids;
   if(plotPoints.length>1){
     const line=plotPoints.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
     const area=line+' L '+plotPoints.at(-1).x.toFixed(2)+' '+(top+plotH).toFixed(2)+
       ' L '+plotPoints[0].x.toFixed(2)+' '+(top+plotH).toFixed(2)+' Z';
     markup+='<path class="injc-holdings-area" d="'+area+'"/>'+
       '<path class="injc-holdings-line" d="'+line+'"/>';
   }
   markup+=plotPoints.map((p,i)=>i===plotPoints.length-1
     ?'<circle class="injc-holdings-last-halo" cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="7"/>'+
       '<circle class="injc-holdings-last-dot" cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="3.4"/>'
     :'').join('');
   // Actual timestamp on the horizontal axis, without inventing intraday values.
   const earliest=plotPoints[0],latest=plotPoints.at(-1);
   const escapeLabel=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;');
   markup+='<text class="injc-holdings-date" x="'+left+'" y="'+(height-7)+'">'+escapeLabel(labelDate(earliest.date))+'</text>';
   if(latest.date!==earliest.date)
     markup+='<text class="injc-holdings-date" text-anchor="end" x="'+(width-right)+'" y="'+(height-7)+'">'+
       escapeLabel(labelDate(latest.date))+'</text>';
   markup+='<rect class="injc-holdings-hit" x="0" y="0" width="'+width+'" height="'+height+'" fill="transparent"/>'+
     '<line id="injcHoldingsCursor" class="injc-holdings-cursor" visibility="hidden" y1="'+top+'" y2="'+(top+plotH)+'"/>'+
     '<circle id="injcHoldingsCursorDot" class="injc-holdings-cursor-dot" r="5" visibility="hidden"/>';
   svg.innerHTML=markup;
 }
 function hoverChart(event){
   const host=$('injcHoldingsChart'),svg=$('injcHoldingsSvg'),tip=$('injcHoldingsTooltip');
   if(!host||!svg||!tip||!plotPoints.length)return;
   const rect=svg.getBoundingClientRect();
   if(!rect.width)return;
   const x=(event.clientX-rect.left)/rect.width*(Number(svg.viewBox.baseVal.width)||rect.width);
   const row=plotPoints.reduce((best,p)=>!best||Math.abs(p.x-x)<Math.abs(best.x-x)?p:best,null);
   const px=row.x/(Number(svg.viewBox.baseVal.width)||rect.width)*rect.width;
   const py=row.y/(Number(svg.viewBox.baseVal.height)||rect.height)*rect.height;
   tip.textContent=labelDate(row.date)+' · '+fmt(row.injHeld,2)+' INJ';
   tip.hidden=false;
   tip.style.left=Math.min(Math.max(px,70),rect.width-70)+'px';
   tip.style.top=Math.max(8,py-38)+'px';
   const line=$('injcHoldingsCursor'),dot=$('injcHoldingsCursorDot');
   if(line){line.setAttribute('x1',row.x);line.setAttribute('x2',row.x);line.setAttribute('visibility','visible')}
   if(dot){dot.setAttribute('cx',row.x);dot.setAttribute('cy',row.y);dot.setAttribute('visibility','visible')}
 }
 function hideHover(){
   const tip=$('injcHoldingsTooltip');if(tip)tip.hidden=true;
   $('injcHoldingsCursor')?.setAttribute('visibility','hidden');
   $('injcHoldingsCursorDot')?.setAttribute('visibility','hidden');
 }
 function init(){
   if(!$('injcFundInj'))return;
   renderNumbers();renderChart();
   refreshHoldings();refreshHistory();refreshSpot();
   document.querySelectorAll('[data-injc-holdings-range]').forEach(button=>
     button.addEventListener('click',()=>{
       range=button.dataset.injcHoldingsRange||'all';
       document.querySelectorAll('[data-injc-holdings-range]').forEach(el=>{
         const active=el===button;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
       });
       hideHover();renderChart();
     }));
   const host=$('injcHoldingsChart');
   host?.addEventListener('pointermove',hoverChart);
   host?.addEventListener('pointerleave',hideHover);
   if(host&&typeof ResizeObserver==='function')new ResizeObserver(()=>{hideHover();renderChart()}).observe(host);
   else window.addEventListener('resize',()=>{hideHover();renderChart()});
   const refreshDated=()=>{refreshHoldings();refreshHistory()};
   setInterval(()=>{if(!document.hidden){renderNumbers();refreshSpot()}},30000);
   setInterval(()=>{if(!document.hidden)refreshDated()},600000);
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshDated();refreshSpot()}});
   window.addEventListener('pageshow',()=>{refreshDated();refreshSpot()});
   $('etfRefresh')?.addEventListener('click',()=>{refreshDated();refreshSpot()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
