/* INJ Node · Market snapshot only (INJ Intelligence), v16.05.01
 * Keeps Global Market intact. No chart polling, burn endpoints or fabricated numbers. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
if(!$('injIntelligenceMain')||!$('injGlobalMarket'))return;
const CACHE='inj_node_intel_summary_cache_v1',STAKE_CACHE='inj_node_intel_chain_snapshot_v2',SUPPLY_CACHE='inj_node_intel_native_supply_v1';
const CG='https://api.coingecko.com/api/v3';
const LCD=['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'];
const now=()=>Date.now();
const read=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const en=()=>document.documentElement.lang==='en';
const tr=(it,eng)=>en()?eng:it;
const num=v=>(v===undefined||v===null||v===''?NaN:Number(v));
const positive=v=>{const n=num(v);return Number.isFinite(n)&&n>0?n:NaN};
const formatted=(n,d=2)=>Number.isFinite(n)?new Intl.NumberFormat(en()?'en-US':'it-IT',{maximumFractionDigits:d}).format(n):'—';
const usd=v=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v<1?5:2}).format(v):'—';
const cap=v=>!Number.isFinite(v)?'—':v>=1e12?'$'+(v/1e12).toFixed(2)+'T':v>=1e9?'$'+(v/1e9).toFixed(2)+'B':v>=1e6?'$'+(v/1e6).toFixed(2)+'M':usd(v);
const percent=(n,d=2)=>Number.isFinite(n)?formatted(n,d)+'%':'—';
const time=t=>new Date(t).toLocaleTimeString(en()?'en-US':'it-IT',{hour:'2-digit',minute:'2-digit'});
const text=(id,v)=>{const el=$(id);if(el&&el.textContent!==v)el.textContent=v};
let view=['intel','global','heatmap','favorites'].includes(read('inj_node_intel_view_v1'))?read('inj_node_intel_view_v1'):'intel';
let coin=null,global=null,marketAt=0,marketFetched=0,marketBusy=false;
let staked=NaN,stakingAt=0,stakingFetched=0,stakingBusy=false;
let nativeSupply=NaN,supplyAt=0;
try{
 const saved=JSON.parse(read(CACHE)||'null');
 if(saved?.at>now()-3600000){
  coin=saved.coin||null;global=saved.global||null;marketAt=saved.at;
 }
 const chain=JSON.parse(read(STAKE_CACHE)||'null');
 if(chain?.at>now()-86400000&&Number.isFinite(Number(chain?.data?.bonded))){
  staked=Number(chain.data.bonded);stakingAt=chain.at;
 }
 const native=JSON.parse(read(SUPPLY_CACHE)||'null');
 if(native?.at>now()-86400000&&Number.isFinite(Number(native.amount))&&Number(native.amount)>0){
  nativeSupply=Number(native.amount);supplyAt=native.at;
 }
}catch(_){}
function labels(){
 text('injIntelTabIntel','INJ Intelligence');
 text('injIntelTabGlobal','Global Crypto');
 text('injIntelTabHeatmap','Heatmap');
  text('injFavoriteTabLabel',tr('Preferiti','Favorites'));
  text('injIntelHeaderSuffix',view==='intel'?'INJ':view==='heatmap'?'HEATMAP':view==='favorites'?tr('PREFERITI','FAVORITES'):'TOP 200');
  window.INJ_MARKET_VIEWS?.languageChange?.();
 text('injIntelHeaderSubtitle',tr('Il centro di analisi di Injective','Injective market intelligence terminal'));
 text('injIntelPriceLabel',tr('PREZZO INJ','INJ PRICE'));
 text('injIntelMCLabel','MARKET CAP');
 text('injIntelVolLabel',tr('VOLUME 24H','24H VOLUME'));
 text('injIntelDominanceLabel','INJ DOMINANCE');
 text('injIntelStakedLabel',tr('INJ IN STAKING','STAKED INJ'));
 render();
}
function viewSwitch(next){
 view=['intel','global','heatmap','favorites'].includes(next)?next:'intel';
 try{localStorage.setItem('inj_node_intel_view_v1',view)}catch(_){}
 $('injIntelligenceMain').hidden=view!=='intel';
 $('injGlobalMarket').hidden=view==='intel';
 document.documentElement.dataset.marketSection=view;
 text('injIntelHeaderSuffix',view==='intel'?'INJ':view==='heatmap'?'HEATMAP':view==='favorites'?tr('PREFERITI','FAVORITES'):'TOP 200');
 for(const button of document.querySelectorAll('[data-inj-intel-view]')){
  button.setAttribute('aria-pressed',String(button.dataset.injIntelView===view));
 }
 window.INJ_MARKET_VIEWS?.setView?.(view==='favorites'?'favorites':view==='heatmap'?'heatmap':'list');
}
window.INJ_MARKET_NAVIGATE=viewSwitch;
function render(){
 const mcap=positive(coin?.market_cap),total=positive(global?.total_market_cap?.usd);
 const dominance=mcap&&total&&mcap<=total?mcap/total*100:NaN;
 text('injIntelPrice',usd(positive(coin?.current_price)));
 text('injIntelMarketCap',cap(mcap));
 text('injIntelVolume',cap(positive(coin?.total_volume)));
 text('injIntelDominance',percent(dominance,4));
 text('injIntelStaked',Number.isFinite(staked)?formatted(staked,0)+' INJ':'—');
 const daily=num(coin?.price_change_percentage_24h);
 text('injIntelDaily',Number.isFinite(daily)?(daily>0?'+':'')+percent(daily):'—');
 $('injIntelDaily')?.classList.toggle('is-down',Number.isFinite(daily)&&daily<0);
 insightRender();
 const t=Math.max(marketAt,stakingAt);
 const stale=t&&now()-t>6*60000;
 text('injIntelUpdate',t
  ?(stale?tr('Ultimi dati salvati · ','Last saved data · '):tr('Dati aggiornati · ','Data updated · '))+time(t)
  :tr('Sincronizzazione dati di mercato…','Syncing market data…'));
}

function insightRender(){
 const current=positive(coin?.current_price);
 const low=positive(coin?.low_24h),high=positive(coin?.high_24h);
 const ath=positive(coin?.ath),atl=positive(coin?.atl);
 const circulating=positive(coin?.circulating_supply);
 const supply=positive(coin?.total_supply);
 const validRange=Number.isFinite(current)&&Number.isFinite(low)&&Number.isFinite(high)&&high>low&&current>=low*.95&&current<=high*1.05;
 const validAth=Number.isFinite(current)&&Number.isFinite(ath)&&ath>0;
 // Total supply is distinct from max supply and from staking.
 const validSupply=Number.isFinite(nativeSupply)&&Number.isFinite(staked)&&nativeSupply>=staked&&staked>=0;
 const label=(id,it,eng)=>text(id,tr(it,eng));
 const percentLabel=(v)=>Number.isFinite(v)?formatted(v,1)+'%':'—';
 const uint=v=>Number.isFinite(v)?formatted(v,0)+' INJ':'—';
 label('injInsightTitle','Indicatori essenziali','Market essentials');
 text('injInsightSource',tr('CoinGecko · ','CoinGecko · ')+(marketAt?time(marketAt):'—'));
 label('injRangeTitle','Range prezzo 24H','24H price range');
 label('injRangeLowLabel','MIN 24H','24H LOW');
 label('injRangeHighLabel','MAX 24H','24H HIGH');
 label('injAthTitle',"Distanza dall'ATH",'ATH recovery');
 label('injAthCenterLabel','DEL MASSIMO','OF ATH');
 label('injAthMaxLabel','MASSIMO STORICO','ALL-TIME HIGH');
 label('injAtlTitle',"Risalita dall'ATL",'ATL recovery');
 label('injAtlCenterLabel','RANGE STORICO','PRICE RANGE');
 label('injAtlMinLabel','MINIMO STORICO','ALL-TIME LOW');
 label('injSupplyTitle','Distribuzione on-chain','On-chain distribution');
 label('injSupplyCenterLabel','IN STAKING','STAKED');
 label('injSupplyCirculatingLabel','IN STAKING','STAKED');
 label('injSupplyRemainingLabel','NON IN STAKING','NOT STAKED');
 label('injInsightNote',
  'ATH/ATL e prezzo: CoinGecko. Supply e staking: blockchain Injective. Staking non equivale a proprietà.',
  'ATH/ATL and price: CoinGecko. Supply and staking: Injective blockchain. Staking is not ownership.');
 const track=$('injRangeTrack');
 text('injRangePrice',usd(current));
 text('injRangeLow',usd(low));text('injRangeHigh',usd(high));
 if(track)track.dataset.ready=String(validRange);
 if(validRange){
  const n=Math.max(0,Math.min(1,(current-low)/(high-low)));
  track.style.setProperty('--inj-range-position',(n*100).toFixed(2)+'%');
  track.setAttribute('aria-label',tr('Prezzo INJ nel range 24 ore: ','INJ in 24-hour price range: ')+usd(current)+'. '+usd(low)+' — '+usd(high));
  text('injRangeNote',current<low||current>high?tr('Fuori intervallo','Outside range'):tr('POSIZIONE 24H','24H POSITION'));
 }else{
  track?.setAttribute('aria-label',tr('Range 24H non disponibile','24H range unavailable'));
  text('injRangeNote',tr('Dati insufficienti','Insufficient data'));
 }
 const ring=(arcId,gaugeId,ratio,description)=>{
  const r=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):NaN;
  const arc=$(arcId),gauge=$(gaugeId);
  if(arc)arc.style.strokeDasharray=Number.isFinite(r)?(r*314.1593).toFixed(2)+' 314.1593':'0 314.1593';
  if(gauge)gauge.setAttribute('aria-label',description);
 };
 if(validAth){
  const relative=current/ath;
  const recovering=Math.min(100,relative*100);
  text('injAthPercent',percentLabel(recovering));
  text('injAthPrice',usd(ath));
  text('injAthDistance',current<=ath?tr('Dal massimo: ','From ATH: ')+percentLabel((current/ath-1)*100):
   tr('Prezzo oltre ATH registrato','Price above recorded ATH'));
  ring('injAthArc','injAthGauge',relative,tr('Prezzo INJ pari al ','INJ price equals ')+percentLabel(recovering)+tr(' del massimo storico',' of the all-time high'));
 }else{
  text('injAthPercent','—');text('injAthPrice',usd(ath));text('injAthDistance',tr('ATH non disponibile','ATH unavailable'));
  ring('injAthArc','injAthGauge',NaN,tr('ATH non disponibile','ATH unavailable'));
 }
 const at=Date.parse(coin?.ath_date||'');
 text('injAthDate',Number.isFinite(at)?new Date(at).toLocaleDateString(en()?'en-US':'it-IT',{day:'2-digit',month:'short',year:'numeric'}):'—');
 // ATL gauge measures the price position between the recorded ATL and ATH,
 // not the (unbounded) gain multiplier since ATL.
 const validATL=Number.isFinite(atl)&&atl>0&&Number.isFinite(current);
 const hasFullRange=validATL&&Number.isFinite(ath)&&ath>atl;
 if(validATL){
  const gain=(current/atl-1)*100;
  const position=hasFullRange?Math.max(0,Math.min(1,(current-atl)/(ath-atl))):NaN;
  text('injAtlPercent',Number.isFinite(position)?percentLabel(position*100):'—');
  text('injAtlPrice',usd(atl));
  text('injAtlDistance',tr('Dal minimo: ','From ATL: ')+(gain>=0?'+':'')+percentLabel(gain));
  ring('injAtlArc','injAtlGauge',position,tr('Posizione del prezzo tra ATL e ATH: ','Price position between ATL and ATH: ')+percentLabel(position*100));
 }else{
  text('injAtlPercent','—');text('injAtlPrice',usd(atl));
  text('injAtlDistance',tr('ATL non disponibile','ATL unavailable'));
  ring('injAtlArc','injAtlGauge',NaN,tr('ATL non disponibile','ATL unavailable'));
 }
 const atlDate=Date.parse(coin?.atl_date||'');
 text('injAtlDate',Number.isFinite(atlDate)?new Date(atlDate).toLocaleDateString(en()?'en-US':'it-IT',{day:'2-digit',month:'short',year:'numeric'}):'—');

 // Supply distribution is now backed by a native LCD chain total, not the
 // sometimes-static circulating/max figures returned by price aggregators.
 text('injSupplyCG',tr('Circolante (CoinGecko): ','Circulating (CoinGecko): ')+uint(circulating));
 if(validSupply){
  const fraction=staked/nativeSupply;
  text('injSupplyPercent',percentLabel(fraction*100));
  text('injSupplyCirculating',uint(staked));
  text('injSupplyRemaining',uint(nativeSupply-staked));
  text('injSupplyTotal',tr('Supply nativa totale: ','Total native supply: ')+uint(nativeSupply));
  ring('injSupplyArc','injSupplyGauge',fraction,tr('INJ in staking sulla supply nativa: ','INJ staked vs native supply: ')+percentLabel(fraction*100));
 }else{
  text('injSupplyPercent','—');
  text('injSupplyCirculating',uint(staked));
  text('injSupplyRemaining','—');
  text('injSupplyTotal',tr('Supply nativa non disponibile','Native supply unavailable'));
  ring('injSupplyArc','injSupplyGauge',NaN,tr('Rapporto staking/supply non verificato','Staking/supply ratio unavailable'));
 }
}

function ingestShared(){
 try{
  const current=window.INJ_MARKET_READONLY_SNAPSHOT?.();
  const incoming=current?.injective;
  if(incoming&&positive(incoming.current_price)&&Number.isFinite(current.updated)&&current.updated>marketAt){
   coin=incoming;
   if(positive(current.global?.total_market_cap?.usd))global=current.global;
   marketAt=current.updated;
   save(CACHE,{at:marketAt,coin,global});
   render();
   return true;
  }
  if(current?.global?.total_market_cap?.usd&&!global){
   global=current.global;render();
  }
 }catch(_){}
 return false;
}
async function getJson(url,timeout=10500){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),timeout);
 try{
  const response=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal:ctrl.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
}
async function marketFallback(force=false){
 if(marketBusy||document.hidden)return;
 if(!force&&coin&&global&&now()-marketAt<240000)return;
 if(!force&&now()-marketFetched<60000)return;
 marketBusy=true;marketFetched=now();
 try{
  const result=await Promise.allSettled([
   getJson(CG+'/coins/markets?vs_currency=usd&ids=injective-protocol&sparkline=false'),
   getJson(CG+'/global')
  ]);
  let changed=false;
  if(result[0].status==='fulfilled'){
   const c=result[0].value?.[0];
   if(c?.id==='injective-protocol'&&positive(c.current_price)){coin=c;changed=true}
  }
  if(result[1].status==='fulfilled'){
   const g=result[1].value?.data;
   if(positive(g?.total_market_cap?.usd)){global=g;changed=true}
  }
  if(changed){
   marketAt=now();save(CACHE,{at:marketAt,coin,global});
  }
 }catch(_){/* Keep last verified reading. */}finally{marketBusy=false;render()}
}
async function chainStaking(){
 if(stakingBusy||document.hidden||now()-stakingFetched<300000)return;
 stakingBusy=true;stakingFetched=now();
 let gotStake=false,gotSupply=false;
 for(const url of LCD){
  // Query independently: a failed bank supply response must not hide staking.
  const results=await Promise.allSettled([
   gotStake?Promise.resolve(null):getJson(url+'/cosmos/staking/v1beta1/pool',4500),
   gotSupply?Promise.resolve(null):getJson(url+'/cosmos/bank/v1beta1/supply/inj',4500)
  ]);
  if(!gotStake&&results[0].status==='fulfilled'){
   const amount=Number(results[0].value?.pool?.bonded_tokens)/1e18;
   if(Number.isFinite(amount)&&amount>0&&amount<2e8){
    staked=amount;stakingAt=now();gotStake=true;
    // Do not overwrite other chain fields previously saved by older views.
    let extra={};
    try{extra=JSON.parse(read(STAKE_CACHE)||'{}')?.data||{}}catch(_){}
    save(STAKE_CACHE,{at:stakingAt,data:{...extra,bonded:staked}});
   }
  }
  if(!gotSupply&&results[1].status==='fulfilled'){
   const amount=Number(results[1].value?.amount?.amount)/1e18;
   if(Number.isFinite(amount)&&amount>0&&amount<1e9){
    nativeSupply=amount;supplyAt=now();gotSupply=true;
    save(SUPPLY_CACHE,{at:supplyAt,amount:nativeSupply});
   }
  }
  if(gotStake&&gotSupply)break;
 }
 stakingBusy=false;render();
}

function tick(){
 if(document.hidden)return;
 ingestShared();
 if(!coin||!global||now()-marketAt>240000)void marketFallback();
 if(!Number.isFinite(staked)||now()-stakingAt>300000)void chainStaking();
}
for(const button of document.querySelectorAll('[data-inj-intel-view]')){
 button.addEventListener('click',()=>viewSwitch(button.dataset.injIntelView));
}
window.addEventListener('storage',e=>{
 if(e.key==='inj_node_language_v1')labels();
});
window.addEventListener('message',e=>{
 if(e.origin===location.origin&&e.data?.type==='injnode:market:language')labels();
});
window.addEventListener('pageshow',()=>{labels();tick()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
// The independent holder module can reuse verified market data without
// fetching additional price endpoints or reading undocumented globals.
window.INJ_INTEL_READONLY_SNAPSHOT=()=>({
 coin,staked,nativeSupply,marketAt,stakingAt,supplyAt
});
viewSwitch(view);labels();tick();
setInterval(tick,15000);
})();