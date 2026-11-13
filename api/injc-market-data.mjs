/* INJ Node Official · same-origin INJC market gateway.
   Public Nasdaq.com/Yahoo data can be delayed; this route fixes browser CORS
   without manufacturing prices or pretending to offer a licensed live stream. */
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const ranges=new Set(['1d','5d','1mo','3mo','1y','max']);
const intervals=new Set(['1m','5m','30m','1d']);
async function fetchSource(url,timeout=6500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{
   Accept:'application/json, text/plain, */*','User-Agent':UA,
   Referer:url.includes('nasdaq.com')?'https://www.nasdaq.com/':'https://finance.yahoo.com/'
  }});
  if(!response.ok)throw Error('Upstream HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timer);}
}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const params=new URL(req.url||'/api/injc-market-data','https://injnode.invalid').searchParams;
 const provider=String(req.query?.provider??params.get('provider')??'').toLowerCase();
 const range=String(req.query?.range??params.get('range')??'1d');
 const interval=String(req.query?.interval??params.get('interval')??'1m');
 if(!['nasdaq','yahoo'].includes(provider)||(provider==='yahoo'&&(!ranges.has(range)||!intervals.has(interval)))){
  res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Unsupported INJC request'});
 }
 const urls=provider==='nasdaq'
  ?['https://api.nasdaq.com/api/quote/INJC/info?assetclass=etf']
  :['query1.finance.yahoo.com','query2.finance.yahoo.com'].map(host=>
   'https://'+host+'/v8/finance/chart/INJC?range='+range+'&interval='+interval+
   '&includePrePost='+(['1d','5d'].includes(range)?'true':'false'));
 let error='No market data';
 for(const url of urls){
  try{
   const data=await fetchSource(url,provider==='nasdaq'?6500:8500);
   if(provider==='nasdaq'){
    const d=data?.data,market=d?.primaryData;
    if(!market||(d.symbol&&String(d.symbol).toUpperCase()!=='INJC')||
       !market.lastSalePrice||!(market.lastTradeTimestamp||market.lastTradeTime||market.lastTradeDateTime))
     throw Error('Nasdaq quote missing trade timestamp');
   }else{
    const c=data?.chart?.result?.[0];
    if(!c||data.chart?.error||c.meta?.symbol?.toUpperCase()!=='INJC'||
       !Array.isArray(c.timestamp)||!c.timestamp.length||
       !Array.isArray(c.indicators?.quote?.[0]?.close))throw Error('No dated INJC chart');
   }
   const ttl=provider==='nasdaq'?8:interval==='1d'?45:12;
   res.setHeader('Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=15');
   return res.status(200).json(data);
  }catch(e){error=e?.message||'Upstream unavailable';}
 }
 res.setHeader('Cache-Control','no-store');
 return res.status(503).json({error:'INJC upstream unavailable',detail:error});
}
