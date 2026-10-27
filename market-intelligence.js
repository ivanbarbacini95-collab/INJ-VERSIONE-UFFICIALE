/* INJ Node · INJ Intelligence v1
   Isolated intelligence panel: actual provider data only, no fabricated history. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
if(!$('injIntelRoot'))return;
const API='https://api.coingecko.com/api/v3';
const LCD=['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
const ID='injective-protocol', DAY=86400000, WINDOW={1:DAY,7:7*DAY,30:30*DAY,365:365*DAY};
const HISTORY={dominance:'inj_node_intel_dom_verified_v2',staking:'inj_node_intel_staking_v1',burn:'inj_node_intel_burn_v1'};
const MEM='inj_node_intel_market_snapshot_v1';
const CHAIN_MEM='inj_node_intel_chain_snapshot_v2',CHART_MEM='inj_node_intel_chart_cache_v2';
const retryAfterFailure=45000;
const dataStamp=()=>new Date().toLocaleTimeString(en()?'en-US':'it-IT');
function marketFromExisting(){
 try{
  const state=window.INJ_MARKET_READONLY_SNAPSHOT?.();
  if(!state)return false;
  const old=market||{coins:{},global:null};
  let changed=false;
  const coins={...old.coins};
  for(const c of [state.injective,state.bitcoin,state.ethereum]){
   if(c&&c.id&&pos(c.current_price)){
    if(!coins[c.id]||state.updated>marketAt){coins[c.id]=c;changed=true}
   }
  }
  const global=state.global?.total_market_cap?.usd?state.global:old.global;
  if(!market&&Object.keys(coins).length)changed=true;
  if(changed||global!==old.global){
   market={coins,global};
   if(Number.isFinite(state.updated)&&state.updated>0)marketAt=Math.max(marketAt,state.updated);
   return true;
  }
 }catch(_){}
 return false;
}

const RATE=180000, CHAIN_RATE=300000;
const read=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v))}catch(_){}};
const en=()=>document.documentElement.lang==='en';
const tr=(it,english)=>en()?english:it;
const valid=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):NaN;
const pos=v=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):NaN;
const fmt=(v,max=2)=>Number.isFinite(v)?new Intl.NumberFormat(en()?'en-US':'it-IT',{maximumFractionDigits:max}).format(v):'—';
const usd=v=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v<1?5:2}).format(v):'—';
const compact=v=>!Number.isFinite(v)?'—':v>=1e12?'$'+(v/1e12).toFixed(2)+'T':v>=1e9?'$'+(v/1e9).toFixed(2)+'B':v>=1e6?'$'+(v/1e6).toFixed(2)+'M':usd(v);
const percent=(v,d=2)=>Number.isFinite(v)?fmt(v,d)+'%':'—';
const signed=(v,unit='%')=>Number.isFinite(v)?(v>0?'+':'')+fmt(v,2)+unit:'—';
const text=(id,value)=>{const el=$(id);if(el&&el.textContent!==value)el.textContent=value};
const time=t=>new Date(t).toLocaleString(en()?'en-US':'it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const now=()=>Date.now();
let view=read('inj_node_intel_view_v1')==='global'?'global':'intel';
let metric=['price','dominance','relative','staking','burn'].includes(read('inj_node_intel_metric_v1'))?read('inj_node_intel_metric_v1'):'price';
let days=[1,7,30,365].includes(Number(read('inj_node_intel_days_v1')))?Number(read('inj_node_intel_days_v1')):7;
let market=null,marketAt=0,chain={bonded:NaN,ratio:NaN,validators:NaN,burn:NaN,tvl:NaN},chainAt=0;
let chart=[],chartLabel='',chartProvider='',chartAt=0,chartLoading=false,selectedIndex=null,serial=0;
let liveLast=0, fetching=false, fetchingChain=false, errors={};
const dataHistory={};
for(const [kind,key] of Object.entries(HISTORY)){
 let a;try{a=JSON.parse(read(key)||'[]')}catch(_){}
 dataHistory[kind]=Array.isArray(a)?a.filter(p=>Number.isFinite(p?.t)&&p.t>now()-365*DAY).slice(-2500):[];
}
try{
 const old=JSON.parse(read(MEM)||'null');
 if(old?.data&&now()-old.at<3600000){market=old.data;marketAt=old.at;}
}catch(_){}
try{
 const cached=JSON.parse(read(CHAIN_MEM)||'null');
 if(cached?.at&&now()-cached.at<DAY&&cached.data){
  for(const name of ['bonded','ratio','validators','burn','tvl']){
   const v=Number(cached.data[name]);if(Number.isFinite(v)&&v>=0)chain[name]=v;
  }
  chainAt=cached.at;
 }
}catch(_){}
function append(kind,item){
 const a=dataHistory[kind];
 const last=a.at(-1);
 if(last&&item.t-last.t<RATE-10000)return;
 a.push(item);
 dataHistory[kind]=a.filter(v=>v.t>now()-365*DAY).slice(-2000);
 save(HISTORY[kind],dataHistory[kind]);
}
function normalizedBurn(j){
 // Older and newer indexer versions use different response fields. Do not
 // guess scale for ambiguous numbers: convert only documented atomic nINJ.
 const raw=j?.total_burnt??j?.totalBurnt??j?.total_inj_burnt??j?.totalInjBurnt??j?.data?.total_inj_burnt;
 if(typeof raw!=='string'||!/^\d+$/.test(raw))return NaN;
 const value=Number(raw)/1e18;
 return Number.isFinite(value)&&value>1&&value<1e9?value:NaN;
}
async function fetchJson(url,ms=11000){
 const ctrl=new AbortController(),stop=setTimeout(()=>ctrl.abort(),ms);
 try{
  const response=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:ctrl.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(stop)}
}
async function getLCD(path){
 let error;
 for(const base of LCD){
  try{return await fetchJson(base+path,4500)}catch(e){error=e}
 }
 throw error||Error('LCD offline');
}
function currentINJ(){
 return market?.coins?.[ID]||null;
}
function currentBTC(){return market?.coins?.bitcoin||null}
function currentETH(){return market?.coins?.ethereum||null}
function updateBar(){
 const coin=currentINJ(),btc=currentBTC(),global=pos(market?.global?.total_market_cap?.usd);
 const dom=pos(coin?.market_cap)&&global?coin.market_cap/global*100:NaN;
 text('injIntelPrice',usd(pos(coin?.current_price)));
 text('injIntelDaily',signed(Number(coin?.price_change_percentage_24h), '%'));
 text('injIntelMarketCap',compact(pos(coin?.market_cap)));
 text('injIntelVolume',compact(pos(coin?.total_volume)));
 text('injIntelDominance',percent(dom,4));
 text('injIntelStaked',Number.isFinite(chain.bonded)?fmt(chain.bonded,0)+' INJ':'—');
 text('injIntelStakingRatio',Number.isFinite(chain.ratio)?percent(chain.ratio,2):'—');
 text('injIntelBurn',Number.isFinite(chain.burn)?fmt(chain.burn,2)+' INJ':'—');
 text('injIntelBurnDetail',Number.isFinite(chain.burn)?fmt(chain.burn,2)+' INJ':'—');
 text('injIntelRel7',signed(Number(coin?.price_change_percentage_7d_in_currency)-Number(btc?.price_change_percentage_7d_in_currency),' pp'));
 text('injIntelRel30',signed(Number(coin?.price_change_percentage_30d_in_currency)-Number(btc?.price_change_percentage_30d_in_currency),' pp'));
 text('injIntelVal',Number.isFinite(chain.validators)?fmt(chain.validators,0):'—');
 text('injIntelTVL',compact(chain.tvl));
 $('injIntelDaily')?.classList.toggle('is-down',Number(coin?.price_change_percentage_24h)<0);
 const last=Math.max(marketAt,chainAt);
 text('injIntelUpdate',last?(now()-last>RATE*2?tr('Ultima rilevazione salvata · ','Last saved reading · '):tr('Ultima sincronizzazione · ','Last sync · '))+time(last):tr('In attesa dei dati dalle fonti','Waiting for data providers'));
 text('injIntelSource',tr('Mercato CoinGecko · Rete Injective · DeFiLlama','CoinGecko market · Injective network · DefiLlama'));
 text('injIntelBurnStatus',Number.isFinite(chain.burn)?tr('Aste di burn · totale cumulativo','Burn auctions · cumulative total'):tr('Burn non disponibile dall’API · consulta la fonte ufficiale','Burn API unavailable · see official source'));
}
async function loadMarket(force=false){
 if(fetching||(marketAt&&!force&&now()-marketAt<RATE))return;
 fetching=true;errors.market='';
 // Market's existing Top 200 feed acts as a complementary live, verified source.
 marketFromExisting();
 try{
  const results=await Promise.allSettled([
   fetchJson(API+'/coins/markets?vs_currency=usd&ids=injective-protocol%2Cbitcoin%2Cethereum&order=market_cap_desc&per_page=3&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C30d'),
   fetchJson(API+'/global')
  ]);
  const coins=results[0].status==='fulfilled'&&Array.isArray(results[0].value)?results[0].value:[];
  const g=results[1].status==='fulfilled'?results[1].value?.data:null;
  if(!coins.length&&!g?.total_market_cap?.usd)throw Error('Market providers unavailable');
  const byId={...(market?.coins||{})};
  for(const c of coins)if(['injective-protocol','bitcoin','ethereum'].includes(c.id)&&pos(c.current_price))byId[c.id]=c;
  market={coins:byId,global:g?.total_market_cap?.usd?g:market?.global||null};
  marketAt=now();liveLast=marketAt;
  save(MEM,{at:marketAt,data:market});
  const coin=currentINJ(),global=pos(market?.global?.total_market_cap?.usd);
  if(coins.some(c=>c.id===ID)&&pos(coin?.market_cap)&&global){
   const d=coin.market_cap/global*100;
   if(d>0&&d<100)append('dominance',{t:marketAt,d,i:Number(coin.market_cap),g:global});
  }
 }catch(e){
  errors.market=String(e?.message||e);
  marketFromExisting();
  // Do not pretend a stale cache is a fresh dominance measurement.
  if(!marketAt)marketAt=now()-RATE+retryAfterFailure;
 }finally{fetching=false;updateBar();if(metric==='dominance')renderChart()}
}
async function loadChain(force=false){
 if(fetchingChain||(chainAt&&!force&&now()-chainAt<CHAIN_RATE))return;
 fetchingChain=true;errors.chain='';
 const settled=await Promise.allSettled([
  getLCD('/cosmos/staking/v1beta1/pool'),
   getLCD('/cosmos/bank/v1beta1/supply/inj'),
  getLCD('/cosmos/staking/v1beta1/validators?pagination.limit=1&status=BOND_STATUS_BONDED'),
  fetchJson('https://api.llama.fi/v2/chains',10000),
  (async()=>{
   // Indexer auction statistics; if unsupported, the UI shows unavailable.
   let response;
   for(const suffix of ['/api/exchange/auction/v1/auctions/stats','/api/exchange/auction/v1/inj_burnt']){
    try{response=await fetchJson('https://api.injective.exchange'+suffix,6000);
     if(Number.isFinite(normalizedBurn(response)))return response;
    }catch(_){}
   }
   throw Error('Burn statistics unavailable');
  })()
 ]);
 let success=false;
 if(settled[0].status==='fulfilled'){
  const bonded=Number(settled[0].value?.pool?.bonded_tokens)/1e18;
  if(Number.isFinite(bonded)&&bonded>0&&bonded<2e8){chain.bonded=bonded;success=true}
 }
 if(settled[1].status==='fulfilled'){
  const supply=Number(settled[1].value?.amount?.amount)/1e18;
  if(Number.isFinite(supply)&&supply>=chain.bonded&&supply<2e8&&supply>0){
   chain.ratio=chain.bonded/supply*100;success=true;
   append('staking',{t:now(),v:chain.ratio});
  }
 }
 if(settled[2].status==='fulfilled'){
  const v=Number(settled[2].value?.pagination?.total);
  if(Number.isFinite(v)&&v>0&&v<1000){chain.validators=v;success=true}
 }
 if(settled[3].status==='fulfilled'){
  const a=settled[3].value;
  if(Array.isArray(a)){const match=a.find(x=>String(x.name||'').toLowerCase()==='injective');const value=Number(match?.tvl);if(Number.isFinite(value)&&value>=0){chain.tvl=value;success=true}}
 }
 if(settled[4].status==='fulfilled'){
  const burn=normalizedBurn(settled[4].value);
  if(Number.isFinite(burn)){chain.burn=burn;append('burn',{t:now(),v:burn});success=true}
 }
 if(success){
  chainAt=now();save(CHAIN_MEM,{at:chainAt,data:Object.fromEntries(Object.entries(chain).filter(([k,v])=>Number.isFinite(v)))});
 }else chainAt=now()-CHAIN_RATE+retryAfterFailure;
 fetchingChain=false;updateBar();
 if(metric==='staking'||metric==='burn')renderChart();
}
function viewSwitch(value){
 view=value==='global'?'global':'intel';save('inj_node_intel_view_v1',view);
 $('injIntelligenceMain').hidden=view!=='intel';
 $('injGlobalMarket').hidden=view!=='global';
 for(const button of document.querySelectorAll('[data-inj-intel-view]'))button.setAttribute('aria-pressed',String(button.dataset.injIntelView===view));
 $('injIntelRoot').classList.toggle('is-global',view==='global');
 text('injIntelHeaderSuffix',view==='global'?'TOP 200':'INJ');
 // No reload and no scroll lock: native page scrolling continues on iOS.
}
function heading(){
 const titles={
 price:[tr('PREZZO INJ','INJ PRICE'),tr('Prezzo storico · USD','Historical price · USD')],
 dominance:[tr('INJ DOMINANCE','INJ DOMINANCE'),tr('Quota di mercato crypto · %','Share of global crypto market · %')],
 relative:[tr('FORZA RELATIVA','RELATIVE STRENGTH'),tr('INJ, BTC ed ETH · rendimento da inizio periodo (%)','INJ, BTC and ETH · period return (%)')],
 staking:[tr('STAKING RATIO','STAKING RATIO'),tr('Percentuale di INJ delegati · rete Injective','Share of INJ bonded · Injective network')],
 burn:[tr('INJ BURN','INJ BURN'),tr('Totale token bruciati nelle aste · INJ','Total tokens burned in auctions · INJ')]
 };
 text('injIntelChartTitle',titles[metric][0]);text('injIntelChartSubtitle',titles[metric][1]);
 text('injIntelChartSource',chartProvider||tr('Rilevazioni verificabili, nessun dato simulato','Verified readings only, no simulated data'));
 for(const b of document.querySelectorAll('[data-inj-intel-metric]'))b.setAttribute('aria-pressed',String(b.dataset.injIntelMetric===metric));
 for(const b of document.querySelectorAll('[data-inj-intel-days]'))b.setAttribute('aria-pressed',String(Number(b.dataset.injIntelDays)===days));
}
function fromHistory(kind){
 const start=now()-WINDOW[days],arr=dataHistory[kind]||[];
 const real=arr.filter(p=>p.t>=start&&Number.isFinite(kind==='dominance'?p.d:p.v))
  .map(p=>({t:p.t,v:kind==='dominance'?p.d:p.v,label:'INJ'}));
 if(real.length)return real;
 // A verified stored snapshot is also a genuine reading. Use its original
 // observation timestamp; never manufacture earlier history or a time series.
 let reading=NaN,stamp=0;
 if(kind==='staking'){reading=chain.ratio;stamp=chainAt;}
 else if(kind==='burn'){reading=chain.burn;stamp=chainAt;}
 else if(kind==='dominance'){
  const cap=pos(currentINJ()?.market_cap),global=pos(market?.global?.total_market_cap?.usd);
  if(cap&&global&&cap<global)reading=cap/global*100;
  stamp=marketAt;
 }
 if(Number.isFinite(reading)&&reading>=0&&stamp>=start&&stamp<=now()&&
    now()-stamp<24*3600000){
  return [{t:stamp,v:reading,label:'INJ'}];
 }
 return [];
}
function metricPoints(){
 if(metric==='dominance')return fromHistory('dominance');
 if(metric==='staking')return fromHistory('staking');
 if(metric==='burn')return fromHistory('burn');
 return chart;
}
let plotted=[];
function renderChart(){
 heading();
 const svg=$('injIntelChart'),note=$('injIntelChartEmpty'),inspect=$('injIntelInspect');
 if(!svg||!note||!inspect)return;
 const data=metricPoints().filter(p=>Number.isFinite(p?.t)&&Number.isFinite(p?.v))
  .sort((a,b)=>a.t-b.t);
 plotted=data;
 svg.replaceChildren();
 svg.onpointermove=null;svg.onpointerdown=null;svg.onkeydown=null;
 const count=data.length;
 const sampleText= count===0?tr('NESSUNA RILEVAZIONE','NO READINGS'):
  count===1?tr('1 RILEVAZIONE REALE','1 REAL READING'):
  fmt(count,0)+tr(' RILEVAZIONI REALI',' REAL READINGS');
 text('injIntelChartSamples',sampleText);
 const metricValue=p=>metric==='price'?usd(p.v):metric==='burn'?fmt(p.v,2)+' INJ':percent(p.v,4);
 const ns='http://www.w3.org/2000/svg',W=840,H=315,L=69,R=18,T=17,B=37;
 const make=(kind,attrs={},parent=svg)=>{
  const el=document.createElementNS(ns,kind);
  for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));
  parent.appendChild(el);return el;
 };
 svg.hidden=false;
 svg.setAttribute('viewBox','0 0 840 315');
 svg.setAttribute('aria-label',tr('Grafico interattivo con letture verificate.','Interactive chart with verified readings.'));
 note.replaceChildren();
 if(!count){
  note.hidden=false;
  svg.hidden=true;
  note.textContent=chartLoading?tr('Sincronizzazione dati reali…','Syncing real data…'):
   metric==='burn'?tr('La fonte burn non ha ancora fornito un totale verificabile.','Burn provider has not yet returned a verifiable total.'):
   metric==='staking'?tr('Attesa dei dati staking dalla blockchain.','Waiting for on-chain staking data.'):
   metric==='dominance'?tr('Attesa dei dati di capitalizzazione INJ e del mercato crypto.','Waiting for INJ and total-market capitalization.'):
   tr('Storico non disponibile dalle fonti dati.','Price history unavailable from data providers.');
  if(metric==='burn'){
   const a=document.createElement('a');
   a.href='https://injective.com/inj';a.target='_blank';a.rel='noopener noreferrer';
   a.textContent=tr('Verifica sul sito Injective ↗','Check Injective official site ↗');
   a.className='inj-mi-source-link';note.append(a);
  }
  inspect.textContent='—';return;
 }
 note.hidden=true;
 // With exactly one real measurement, draw a substantial CURRENT SNAPSHOT.
 // No artificial time series: the horizontal guide is explicitly a snapshot
 // reference, not a flat historic price or inferred line.
 if(count===1){
  const p=data[0],v=metricValue(p);
  for(const y of [48,98,148,198,248]){
   make('line',{x1:L,y1:y,x2:W-R,y2:y,class:'inj-mi-grid'});
  }
  for(const x of [L+60,290,550,W-R-60]){
   make('line',{x1:x,y1:27,x2:x,y2:262,class:'inj-mi-grid',opacity:'.48'});
  }
  make('text',{x:W/2,y:56,'text-anchor':'middle',class:'inj-mi-snapshot-eyebrow'})
   .textContent=tr('VALORE ATTUALE RILEVATO','LATEST VERIFIED READING');
  make('text',{x:W/2,y:111,'text-anchor':'middle',class:'inj-mi-snapshot-value'}).textContent=v;
  make('line',{x1:145,x2:695,y1:187,y2:187,class:'inj-mi-snapshot-guide'});
  make('circle',{cx:W/2,cy:187,r:30,class:'inj-mi-snapshot-halo'});
  make('circle',{cx:W/2,cy:187,r:13,class:'inj-mi-snapshot-ring'});
  make('circle',{cx:W/2,cy:187,r:7,class:'inj-mi-snapshot-dot'});
  make('text',{x:W/2,y:237,'text-anchor':'middle',class:'inj-mi-snapshot-time'}).textContent=time(p.t);
  make('text',{x:W/2,y:265,'text-anchor':'middle',class:'inj-mi-snapshot-caption'})
   .textContent=tr('PRIMA RILEVAZIONE · STORICO IN COSTRUZIONE','FIRST READING · BUILDING HISTORY');
  inspect.textContent=time(p.t)+' · '+v;
  svg.onpointermove=()=>{inspect.textContent=time(p.t)+' · '+v};
  svg.onpointerdown=svg.onpointermove;
  svg.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();inspect.textContent=time(p.t)+' · '+v}};
  svg.setAttribute('aria-label',tr('Valore corrente verificato: ','Verified current value: ')+v+'. '+tr('Prima rilevazione: storico in costruzione.','First reading: history is being built.'));
  return;
 }
 const seriesNames=[...new Set(data.map(p=>p.label||'INJ'))];
 const firstTime=Math.min(...data.map(p=>p.t)),lastTime=Math.max(...data.map(p=>p.t));
 const values=data.map(p=>p.v),mn=Math.min(...values),mx=Math.max(...values);
 const pad=Math.max((mx-mn)*.15,Math.abs(mx)*.006,.00000001);
 const lo=mn-pad,hi=mx+pad;
 const x=t=>L+(t-firstTime)/(lastTime-firstTime||1)*(W-L-R);
 const y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
 for(let i=0;i<5;i++){
  const yy=T+i/4*(H-T-B),value=hi-i/4*(hi-lo);
  make('line',{x1:L,y1:yy,x2:W-R,y2:yy,class:'inj-mi-grid'});
  make('text',{x:L-9,y:yy+4,'text-anchor':'end',class:'inj-mi-tick'}).textContent=
   metric==='price'?'$'+fmt(value,2):metric==='burn'?fmt(value,0):fmt(value,4)+'%';
 }
 make('text',{x:L,y:H-8,class:'inj-mi-tick'}).textContent=time(firstTime);
 make('text',{x:W-R,y:H-8,'text-anchor':'end',class:'inj-mi-tick'}).textContent=time(lastTime);
 const defs=make('defs');
 const grad=make('linearGradient',{id:'injMiFillV3',x1:0,y1:0,x2:0,y2:1},defs);
 make('stop',{offset:'0%','stop-color':'var(--accent)','stop-opacity':'.25'},grad);
 make('stop',{offset:'100%','stop-color':'var(--accent)','stop-opacity':'0'},grad);
 const colors={INJ:'var(--accent)',BTC:'#f4a24a',ETH:'#909aeb'};
 for(const label of seriesNames){
  const rows=data.filter(p=>(p.label||'INJ')===label);
  if(rows.length<2)continue;
  const d=rows.map((p,i)=>(i?'L':'M')+x(p.t).toFixed(2)+' '+y(p.v).toFixed(2)).join(' ');
  const col=colors[label]||'var(--accent)';
  if(label==='INJ'){
   const area=d+' L'+x(rows.at(-1).t).toFixed(2)+' '+(H-B)+' L'+x(rows[0].t).toFixed(2)+' '+(H-B)+' Z';
   make('path',{d:area,fill:'url(#injMiFillV3)',stroke:'none'});
  }
  make('path',{d,stroke:col,fill:'none','stroke-width':label==='INJ'?4:2.4,
   'stroke-linecap':'round','stroke-linejoin':'round',
   class:'inj-mi-trend-line',opacity:label==='INJ'?1:.88});
  const last=rows.at(-1);
  make('circle',{cx:x(last.t),cy:y(last.v),r:label==='INJ'?7:5,fill:col,
   stroke:'var(--bg)','stroke-width':2,class:'inj-mi-final-dot'});
 }
 let selection=null,selectionIndex=data.length-1;
 function show(p){
  if(!p)return;
  if(selection)selection.remove();
  selection=make('g');
  make('line',{x1:x(p.t),x2:x(p.t),y1:T,y2:H-B,class:'inj-mi-crosshair'},selection);
  make('circle',{cx:x(p.t),cy:y(p.v),r:7.5,fill:colors[p.label]||'var(--accent)',
   stroke:'var(--bg)','stroke-width':2.3},selection);
  inspect.textContent=time(p.t)+' · '+(p.label||'INJ')+' '+metricValue(p);
 }
 show(data.filter(p=>p.label==='INJ').at(-1)||data.at(-1));
 function hover(e){
  const rect=svg.getBoundingClientRect();
  const pixel=(e.clientX-rect.left)/(rect.width||1)*W;
  let closest=0,distance=Infinity;
  data.forEach((p,i)=>{const dx=Math.abs(x(p.t)-pixel);if(dx<distance){distance=dx;closest=i}});
  selectionIndex=closest;show(data[closest]);
 }
 svg.onpointermove=hover;svg.onpointerdown=hover;
 svg.onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='Home')selectionIndex=0;
  else if(e.key==='End')selectionIndex=data.length-1;
  else selectionIndex=Math.max(0,Math.min(data.length-1,selectionIndex+(e.key==='ArrowLeft'?-1:1)));
  show(data[selectionIndex]);
 };
 svg.setAttribute('aria-label',tr('Grafico dei dati reali con ', 'Real data chart with ')+sampleText);
}
function cleanChart(payload,id){
 const rows=Array.isArray(payload?.prices)?payload.prices:[];
 return rows.filter(row=>Array.isArray(row)&&Number.isFinite(row[0])&&Number.isFinite(row[1])&&row[1]>0)
  .map(([t,v])=>({t,v,label:id})).sort((a,b)=>a.t-b.t);
}

function rememberChart(label,period,series,provider){
 let all={};try{all=JSON.parse(read(CHART_MEM)||'{}')||{}}catch(_){}
 all[label+':'+period]={at:now(),data:series.slice(-1200),provider};
 save(CHART_MEM,all);
}
function recoveredChart(label,period){
 try{
  const saved=JSON.parse(read(CHART_MEM)||'{}')?.[label+':'+period];
  if(saved?.at>now()-7*DAY&&Array.isArray(saved.data)&&saved.data.length>1){
   return {data:saved.data.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v)),provider:saved.provider||'Cache'};
  }
 }catch(_){}
 return null;
}
async function binanceCandles(id,period){
 const pairs={'injective-protocol':'INJUSDT',bitcoin:'BTCUSDT',ethereum:'ETHUSDT'};
 const pair=pairs[id];if(!pair)throw Error('Unsupported Binance market');
 const durations={1:['5m',300],7:['1h',170],30:['4h',185],365:['1d',366]};
 const [interval,limit]=durations[period];
 const raw=await fetchJson('https://data-api.binance.vision/api/v3/klines?symbol='+pair+'&interval='+interval+'&limit='+limit,12000);
 if(!Array.isArray(raw))throw Error('No Binance candles');
 const minTime=now()-period*DAY;
 const data=raw.map(c=>({t:Number(c?.[0]),v:Number(c?.[4]),label:id==='injective-protocol'?'INJ':id==='bitcoin'?'BTC':'ETH'}))
  .filter(c=>Number.isFinite(c.t)&&Number.isFinite(c.v)&&c.v>0&&c.t>=minTime-12*3600000);
 if(data.length<2)throw Error('Insufficient Binance candles');
 return data;
}
async function historical(id,period){
 const ticker=id==='injective-protocol'?'INJ':id==='bitcoin'?'BTC':'ETH';
 try{
  const data=await binanceCandles(id,period);
  return {data,provider:'Binance '+ticker+'/USDT'};
 }catch(binanceError){
  const payload=await fetchJson(API+'/coins/'+id+'/market_chart?vs_currency=usd&days='+period,14000);
  const data=cleanChart(payload,ticker);
  if(data.length<2)throw Error('Both Binance and CoinGecko history unavailable');
  return {data,provider:'CoinGecko '+ticker+'/USD'};
 }
}
function displayPoint(p){
 if(!p)return '—';
 if(metric==='price')return usd(p.v);
 if(metric==='burn')return fmt(p.v,2)+' INJ';
 return percent(p.v,4);
}
function nearest(arr,t,maxDiff){
 let low=0,high=arr.length-1;
 while(low<high){const middle=(low+high)>>1;if(arr[middle].t<t)low=middle+1;else high=middle}
 const a=arr[low],b=arr[Math.max(0,low-1)];
 const p=!b||Math.abs(a.t-t)<Math.abs(b.t-t)?a:b;
 return p&&Math.abs(p.t-t)<=maxDiff?p:null;
}
async function loadChart(force=false){
 if(!['price','relative'].includes(metric)){
  chart=[];chartProvider=tr('Rilevazioni verificate salvate sul dispositivo','Verified readings stored on this device');chartLoading=false;renderChart();return;
 }
 if(chartLoading&&!force)return;
 const generation=++serial,localMetric=metric,localDays=days;
 const cached=recoveredChart(localMetric,localDays);
 if(cached){chart=cached.data;chartProvider=cached.provider+' · '+tr('ultimo storico salvato','last saved history');}
 chartLoading=true;renderChart();
 try{
  const ids=localMetric==='relative'?[ID,'bitcoin','ethereum']:[ID];
  const responses=await Promise.all(ids.map(id=>historical(id,localDays)));
  if(generation!==serial)return;
  const inj=responses[0].data;
  if(inj.length<2)throw Error('No INJ chart observations');
  let result;
  if(localMetric==='price')result=inj;
  else{
   const btc=responses[1].data,eth=responses[2].data;
   const maxDiff=localDays===1?20*60000:localDays<=30?6*3600000:3*DAY;
   const aligned=inj.map(p=>{const b=nearest(btc,p.t,maxDiff),e=nearest(eth,p.t,maxDiff);return b&&e?{p,b,e}:null}).filter(Boolean);
   if(aligned.length<2)throw Error('No aligned historic comparison');
   const first=aligned[0];
   result=aligned.flatMap(x=>[
    {t:x.p.t,v:(x.p.v/first.p.v-1)*100,label:'INJ'},
    {t:x.p.t,v:(x.b.v/first.b.v-1)*100,label:'BTC'},
    {t:x.p.t,v:(x.e.v/first.e.v-1)*100,label:'ETH'}
   ]);
  }
  chart=result;chartAt=now();chartProvider=[...new Set(responses.map(r=>r.provider))].join(' · ');
  rememberChart(localMetric,localDays,result,chartProvider);
 }catch(e){
  if(generation===serial){
   if(!chart.length){chart=[];chartProvider=tr('Storico non disponibile da Binance/CoinGecko','History unavailable from Binance/CoinGecko');}
   errors.chart=String(e?.message||e);
  }
 }finally{if(generation===serial){chartLoading=false;renderChart()}}
}
function pickMetric(m){if(!['price','relative','dominance','staking','burn'].includes(m))return;
 metric=m;chart=[];serial++;chartLoading=false;save('inj_node_intel_metric_v1',metric);void loadChart();}
function updateTranslation(){
 text('injIntelHeaderSubtitle',tr('Il centro di analisi di Injective','Injective market intelligence terminal'));
 text('injIntelTabIntel','INJ Intelligence');text('injIntelTabGlobal','Global Market');
 text('injIntelPriceLabel',tr('PREZZO INJ','INJ PRICE'));
 text('injIntelMCLabel','MARKET CAP');
 text('injIntelVolLabel',tr('VOLUME 24H','24H VOLUME'));
 text('injIntelDominanceLabel','INJ DOMINANCE');
 text('injIntelStakedLabel',tr('INJ IN STAKING','STAKED INJ'));
 text('injIntelBurnLabel','INJ BURNED');
 text('injIntelMetricsTitle',tr('TOKENOMICS & NETWORK','TOKENOMICS & NETWORK'));
 text('injIntelStakingTitle',tr('Staking Network','Staking Network'));
 text('injIntelBurnTitle','Burn Tracker');
 text('injIntelRelativeTitle','Relative Strength');
 text('injIntelRatioLabel',tr('STAKING RATIO','STAKING RATIO'));
 text('injIntelValidatorLabel',tr('VALIDATORI ATTIVI','ACTIVE VALIDATORS'));
 text('injIntelBurnSub',tr('INJ bruciati tramite le aste, quando verificabili','INJ destroyed by auction, when verifiable'));
 text('injIntelRel7Label',tr('INJ vs BTC · 7G','INJ vs BTC · 7D'));
 text('injIntelRel30Label',tr('INJ vs BTC · 30G','INJ vs BTC · 30D'));
 text('injIntelTVLLabel',tr('DEFI TVL · INJECTIVE','DEFI TVL · INJECTIVE'));
 text('injIntelChartPriceLabel',tr('Prezzo','Price'));
 text('injIntelChartDomLabel','Dominance');
 text('injIntelChartRelativeLabel',tr('Forza relativa','Relative'));
 text('injIntelChartStakingLabel','Staking');
 text('injIntelChartBurnLabel','Burn');
 text('injIntelSmallPrint',tr('Grafico basato su dati reali. Dominance, staking e burn costruiscono lo storico dalle rilevazioni sul dispositivo. Nessuna interpolazione o storico inventato. Dati ritardati in base al provider.','Actual data only. Dominance, staking and burn histories build from observations saved on this device. No synthetic history or invented data. Updates depend on providers.'));
 updateBar();heading();renderChart();
}
for(const button of document.querySelectorAll('[data-inj-intel-view]'))button.addEventListener('click',()=>viewSwitch(button.dataset.injIntelView));
for(const button of document.querySelectorAll('[data-inj-intel-metric]'))button.addEventListener('click',()=>pickMetric(button.dataset.injIntelMetric));
for(const button of document.querySelectorAll('[data-inj-intel-days]'))button.addEventListener('click',()=>{
 const value=Number(button.dataset.injIntelDays);if(!WINDOW[value])return;
 days=value;chart=[];serial++;chartLoading=false;save('inj_node_intel_days_v1',days);void loadChart();
});
$('injIntelRefresh')?.addEventListener('click',()=>{marketAt=0;chainAt=0;void Promise.all([loadMarket(true),loadChain(true)])});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='injnode:market:language')updateTranslation()});
window.addEventListener('storage',e=>{if(e.key==='inj_node_language_v1')updateTranslation()});
window.addEventListener('pageshow',()=>{updateTranslation();void loadMarket();void loadChain()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){void loadMarket();void loadChain();if(['price','relative'].includes(metric)&&now()-chartAt>RATE)void loadChart()}});
viewSwitch(view);updateTranslation();void Promise.all([loadMarket(),loadChain()]);void loadChart();
setInterval(()=>{if(!document.hidden){if(marketFromExisting())updateBar();void loadMarket();void loadChain()}},60000);
setInterval(()=>{if(!document.hidden&&['price','relative'].includes(metric)&&now()-chartAt>RATE&&!chartLoading)void loadChart()},RATE);
})();