// Public read-only KuCoin INJ perpetual quotes. No credentials or wallet data.
const SYMBOL='INJUSDTM';
const BASE='https://api-futures.kucoin.com/api/v1/';
function valid(price,ts,maxAge,kind){
  price=Number(price);ts=Number(ts);
  if(ts>1e17)ts/=1e6;else if(ts>1e14)ts/=1e3;else if(ts<1e11)ts*=1000;
  if(!Number.isFinite(price)||price<=0||!Number.isFinite(ts)||ts>Date.now()+10000||Date.now()-ts>maxAge)return null;
  return {symbol:SYMBOL,exchange:'KuCoin',kind,price,timestamp:Math.round(ts)};
}
async function read(path,kind){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
  try{
    const r=await fetch(BASE+path,{signal:controller.signal,headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)return null;
    const j=await r.json(),d=j?.data;
    if(j?.code!=='200000'||d?.symbol!==SYMBOL)return null;
    return kind==='mark'?valid(d.value,d.timePoint,30000,'mark'):valid(d.price,d.ts,30000,'last');
  }catch(_){return null}finally{clearTimeout(timer)}
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
  const [mark,last]=await Promise.all([read('mark-price/'+SYMBOL+'/current','mark'),read('ticker?symbol='+SYMBOL,'last')]);
  // Mark price is the exchange reference for unrealized P/L; last trade is a labelled fallback.
  const quote=mark||last;
  if(!quote)return res.status(503).json({symbol:SYMBOL,error:'KuCoin Futures quote unavailable'});
  return res.status(200).json(quote);
}
