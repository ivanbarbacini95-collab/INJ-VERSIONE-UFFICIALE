// INJ Node · richer continuous crypto ribbon.
// Prices: real 24h Binance spot quotes, CoinGecko as a USD fallback.
// Aggregate metrics: CoinGecko global endpoint; omitted if temporarily unavailable.
const PAIRS=[
 ['INJ','INJUSDT','injective-protocol'],
 ['BTC','BTCUSDT','bitcoin'],
 ['ETH','ETHUSDT','ethereum'],
 ['SOL','SOLUSDT','solana'],
 ['BNB','BNBUSDT','binancecoin'],
 ['XRP','XRPUSDT','ripple'],
 ['AVAX','AVAXUSDT','avalanche-2'],
 ['DOT','DOTUSDT','polkadot'],
 ['LINK','LINKUSDT','chainlink'],
 ['ADA','ADAUSDT','cardano'],
 ['DOGE','DOGEUSDT','dogecoin']
];
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
 if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return}
 const validPrice=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:null};
 const validChange=x=>{if(x===null||x===undefined||x==='')return null;const n=Number(x);return Number.isFinite(n)?n:null};
 async function grab(url,timeout=6000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   return await response.json();
  }finally{clearTimeout(timer)}
 }
 async function prices(){
  try{
   const symbols=JSON.stringify(PAIRS.map(x=>x[1]));
   const rows=await grab('https://data-api.binance.vision/api/v3/ticker/24hr?symbols='+encodeURIComponent(symbols));
   if(!Array.isArray(rows))throw Error('Bad Binance response');
   const index=new Map(rows.map(row=>[row.symbol,row]));
   const tickers=PAIRS.map(([symbol,pair])=>{
    const row=index.get(pair);
    return {symbol,price:validPrice(row?.lastPrice),change24h:validChange(row?.priceChangePercent)};
   }).filter(x=>x.price!==null);
   if(tickers.length<6)throw Error('Not enough Binance quotes');
   return {source:'Binance',currency:'USDT',tickers};
  }catch(error){
   const ids=PAIRS.map(x=>x[2]).join(',');
   const rows=await grab('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+encodeURIComponent(ids)+'&price_change_percentage=24h');
   if(!Array.isArray(rows))throw Error('Bad CoinGecko response');
   const index=new Map(rows.map(row=>[row.id,row]));
   const tickers=PAIRS.map(([symbol,,id])=>{
    const row=index.get(id);
    return {symbol,price:validPrice(row?.current_price),change24h:validChange(row?.price_change_percentage_24h)};
   }).filter(x=>x.price!==null);
   if(!tickers.length)throw Error('No quote source');
   return {source:'CoinGecko',currency:'USD',tickers};
  }
 }
 async function globals(){
  try{
   const payload=await grab('https://api.coingecko.com/api/v3/global',4300);
   const d=payload?.data;
   if(!d) return null;
   const global={
    marketCapUsd:validPrice(d.total_market_cap?.usd),
    volume24hUsd:validPrice(d.total_volume?.usd),
    btcDominance:validChange(d.market_cap_percentage?.btc),
    ethDominance:validChange(d.market_cap_percentage?.eth),
    marketCapChange24h:validChange(d.market_cap_change_percentage_24h_usd)
   };
   return Object.values(global).some(v=>v!==null)?global:null;
  }catch{return null}
 }
 const [quoted,world]=await Promise.allSettled([prices(),globals()]);
 if(quoted.status!=='fulfilled'){
  res.setHeader('Cache-Control','no-store');
  res.status(503).json({error:'Quotazioni temporaneamente non disponibili',tickers:[]});return;
 }
 res.status(200).json({
  asOf:new Date().toISOString(),source:quoted.value.source,currency:quoted.value.currency,
  tickers:quoted.value.tickers,global:world.status==='fulfilled'?world.value:null
 });
}
