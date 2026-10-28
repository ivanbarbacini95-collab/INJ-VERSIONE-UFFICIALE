// INJ NODE · Crypto market ribbon · backed by real 24h exchange market data.
const PAIRS=[['BTC','BTCUSDT'],['ETH','ETHUSDT'],['SOL','SOLUSDT'],['INJ','INJUSDT']];
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
 if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return}
 async function grab(url){
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),6500);
  try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}
 }
 let tickers=[],source='',asOf=new Date().toISOString();
 try{
  const url='https://data-api.binance.vision/api/v3/ticker/24hr?symbols='+encodeURIComponent(JSON.stringify(PAIRS.map(x=>x[1])));
  const data=await grab(url);
  if(!Array.isArray(data))throw Error('Invalid ticker response');
  tickers=PAIRS.map(([symbol,pair])=>{
   const row=data.find(x=>x.symbol===pair);
   const price=Number(row?.lastPrice),change=Number(row?.priceChangePercent);
   return {symbol,price:Number.isFinite(price)&&price>0?price:null,change24h:Number.isFinite(change)?change:null};
  });
  if(tickers.filter(x=>x.price!==null).length<3)throw Error('Insufficient live tickers');
  source='Binance'; 
 }catch(e){
  try{
   const ids='bitcoin,ethereum,solana,injective-protocol';
   const data=await grab('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+ids+'&price_change_percentage=24h');
   const map={bitcoin:'BTC',ethereum:'ETH',solana:'SOL','injective-protocol':'INJ'};
   tickers=Array.isArray(data)?data.map(x=>({symbol:map[x.id],price:Number.isFinite(Number(x.current_price))?Number(x.current_price):null,change24h:Number.isFinite(Number(x.price_change_percentage_24h))?Number(x.price_change_percentage_24h):null})).filter(x=>x.symbol):[];
   if(!tickers.length)throw Error('No prices');source='CoinGecko';
  }catch(error){
   res.setHeader('Cache-Control','no-store');
   res.status(503).json({error:'Quotazioni temporaneamente non disponibili',tickers:[]});return;
  }
 }
 res.status(200).json({asOf,source,currency:'USD',tickers});
}
