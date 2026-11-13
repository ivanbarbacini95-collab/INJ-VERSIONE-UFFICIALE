/* INJ Node Official · INJC fund holdings / indicative live underlying valuation.
   Underlying coins are the issuer's dated holdings, not ETF shares traded.
   USD intraday = reported INJ units × most recent available INJ/USD spot quote.
   Official NAV / AUM is separate and is not extrapolated from share volume. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const en=()=>{try{return (localStorage.getItem('inj_node_language_v1')||'it').toLowerCase().startsWith('en')}catch{return false}};
 const tr=(it,english)=>en()?english:it;
 const locale=()=>en()?'en-US':'it-IT';
 const fmt=(value,digits=2)=>Number(value).toLocaleString(locale(),{minimumFractionDigits:digits,maximumFractionDigits:digits});
 const usd=value=>'$'+fmt(value,2);
 let holdings=null,spot=null,priceAt=0,spotSource='',priceBusy=false,holdingsBusy=false;
 const valid=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:null};
 const updatedDate=iso=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return iso||'—';
   const [year,month,day]=iso.split('-');return en()?month+'/'+day+'/'+year:day+'/'+month+'/'+year};
 function put(id,value){const node=$(id);if(node)node.textContent=value}
 function render(){
  const hasHoldings=holdings&&holdings.injHeld>0;
  put('injcFundInj',hasHoldings?fmt(holdings.injHeld,2):'—');
  put('injcFundOfficial',hasHoldings?usd(holdings.officialNetAssetsUsd):'—');
  put('injcFundDate',hasHoldings?tr('Holdings ufficiali al ','Issuer holdings as of ')+updatedDate(holdings.asOf):
   tr('Holdings non disponibili','Holdings unavailable'));
  const fresh=spot>0&&Date.now()-priceAt<120000;
  const estimate=hasHoldings&&fresh?holdings.injHeld*spot:null;
  // If the live spot feed goes stale, show the issuer's *dated* figure, never an invented live amount.
  put('injcFundUsd',estimate!==null?usd(estimate):
   hasHoldings?usd(holdings.officialInjMarketValueUsd):'—');
  put('injcFundUsdTag',estimate!==null?tr('STIMA LIVE · USD','LIVE ESTIMATE · USD'):
   tr('VALORE UFFICIALE · USD','REPORTED VALUE · USD'));
  put('injcFundUsdDescription',estimate!==null
    ?tr('Quantità INJ ufficiale × prezzo spot INJ/USD','Reported INJ quantity × INJ/USD spot price')
    :hasHoldings?tr('Ultimo valore INJ pubblicato dall’emittente','Last INJ value reported by issuer')
    :tr('Nessun valore verificato','No verified value'));
  put('injcFundPrice',fresh?usd(spot):'—');
  put('injcFundPriceSource',fresh
    ?tr('INJ/USD · ','INJ/USD · ')+spotSource+
      ' · '+new Date(priceAt).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    :tr('Prezzo spot temporaneamente non disponibile','Spot price temporarily unavailable'));
  const tag=$('injcFundFreshness');
  if(tag){tag.dataset.state=fresh?'live':hasHoldings?'reported':'unavailable';
    tag.textContent=fresh?'LIVE':hasHoldings?tr('ULTIMO REPORT','LAST REPORT'):'—'}
 }
 async function getJson(url,timeout=6500){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  try{
   const res=await fetch(url,{signal:ctl.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
   if(!res.ok)throw Error('HTTP '+res.status);
   return await res.json();
  }finally{clearTimeout(timer)}
 }
 async function refreshHoldings(){
  if(holdingsBusy)return;holdingsBusy=true;
  try{
   const data=await getJson('./market-data/injc-fund-holdings.json?asof='+Date.now(),8000);
   const inj=valid(data?.injHeld),aum=valid(data?.officialNetAssetsUsd),
     value=valid(data?.officialInjMarketValueUsd),shares=valid(data?.sharesOutstanding);
   if(data?.schemaVersion!==1||data.ticker!=='INJC'||data.sourceType!=='issuer_holdings'||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.asOf||'')||
      data.source!=='https://canaryetfs.com/injc/'||!inj||!aum||!value||!shares||
      Date.parse(data.asOf+'T00:00:00Z')>Date.now()+86400000)throw Error('Holdings unverified');
   if(!holdings||data.asOf>=holdings.asOf)
     holdings={injHeld:inj,officialNetAssetsUsd:aum,officialInjMarketValueUsd:value,sharesOutstanding:shares,asOf:data.asOf};
  }catch(e){ /* Keep the last verified dated issuer reading, if any. */ }
  finally{holdingsBusy=false;render()}
 }
 const feeds=[
  {name:'CoinGecko',url:'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd',
   parse:j=>valid(j?.['injective-protocol']?.usd)},
  {name:'Coinbase',url:'https://api.coinbase.com/v2/prices/INJ-USD/spot',
   parse:j=>valid(j?.data?.amount)},
  {name:'Kraken',url:'https://api.kraken.com/0/public/Ticker?pair=INJUSD',
   parse:j=>valid(Object.values(j?.result||{})[0]?.c?.[0])},
  {name:'Binance · INJ/USDC ≈ USD',url:'https://data-api.binance.vision/api/v3/ticker/price?symbol=INJUSDC',
   parse:j=>valid(j?.price)}
 ];
 async function refreshSpot(){
  if(priceBusy)return;priceBusy=true;
  try{
   for(const feed of feeds){
    try{
     const data=await getJson(feed.url,5500);
     const next=feed.parse(data);
     if(!next||next>1e5)continue;
     spot=next;priceAt=Date.now();spotSource=feed.name;break;
    }catch(_){/* try a distinct public USD source */}
   }
  }finally{priceBusy=false;render()}
 }
 function init(){
  if(!$('injcFundInj'))return;
  render();refreshHoldings();refreshSpot();
  setInterval(()=>{if(!document.hidden){render();refreshSpot()}},30000);
  setInterval(()=>{if(!document.hidden)refreshHoldings()},600000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshHoldings();refreshSpot()}});
  window.addEventListener('pageshow',()=>{refreshHoldings();refreshSpot()});
  $('etfRefresh')?.addEventListener('click',()=>{refreshHoldings();refreshSpot()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
