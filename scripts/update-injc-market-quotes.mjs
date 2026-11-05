/* INJC verified delayed intraday prints, including actual pre-market trades.
 * Scheduled every 5m during US trading hours; never manufactures prices.
 */
import fs from 'node:fs/promises';
const path='market-data/injc-etf-quotes.json',now=new Date();
const parts=d=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).map(p=>[p.type,p.value]));
const ny=parts(now),min=(Number(ny.hour)%24)*60+Number(ny.minute),date=ny.year+'-'+ny.month+'-'+ny.day;
if(['Sat','Sun'].includes(ny.weekday)||min<240||min>1010){
 console.log('Outside Nasdaq pre-market/core-session snapshot window.');process.exit(0);
}
const nyKey=d=>{const p=parts(d);return p.year+'-'+p.month+'-'+p.day};
const safe=x=>x===null||x===undefined||x===''||!Number.isFinite(Number(x))?null:Number(x);
const session=time=>{
 const d=parts(new Date(time)),minutes=(Number(d.hour)%24)*60+Number(d.minute);
 return minutes>=240&&minutes<570?'pre':minutes>=570&&minutes<960?'regular':'other';
};
let payload;
for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
 try{
  const res=await fetch('https://'+host+'/v8/finance/chart/INJC?range=1d&interval=1m&includePrePost=true',{
   signal:AbortSignal.timeout(16000),headers:{accept:'application/json','user-agent':'Mozilla/5.0 (compatible; INJNodeMarketMonitor/2.0)'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const obj=(await res.json())?.chart?.result?.[0];
  if(!obj||obj.meta?.symbol!=='INJC')throw Error('No verified INJC quote chart');
  const meta=obj.meta||{},q=obj.indicators?.quote?.[0]||{};
  const pts=(obj.timestamp||[]).map((timestamp,i)=>{
   const time=new Date(Number(timestamp)*1000).toISOString();
   return {time,session:session(Date.parse(time)),open:safe(q.open?.[i]),high:safe(q.high?.[i]),low:safe(q.low?.[i]),close:safe(q.close?.[i]),volume:safe(q.volume?.[i])};
  }).filter(p=>p.close!==null&&p.close>0&&nyKey(new Date(p.time))===date&&(p.session==='pre'||p.session==='regular'));
  const regular=pts.filter(p=>p.session==='regular'),pre=pts.filter(p=>p.session==='pre');
  const active=regular.length?'regular':pre.length?'pre':null;
  if(!active)throw Error('No actual pre-market or regular-market INJC prints for '+date);
  const selected=(active==='pre'?pre:regular).at(-1);
  let price=selected.close,quoteTime=Date.parse(selected.time);
  const reportedPrice=safe(active==='pre'?meta.preMarketPrice:meta.regularMarketPrice);
  const reportedTime=Number(active==='pre'?meta.preMarketTime:meta.regularMarketTime)*1000;
  if(Number.isFinite(reportedPrice)&&reportedPrice>0&&Number.isFinite(reportedTime)&&reportedTime>quoteTime
    &&nyKey(new Date(reportedTime))===date&&session(reportedTime)===active){
    price=reportedPrice;quoteTime=reportedTime;
    pts.push({...selected,time:new Date(quoteTime).toISOString(),close:price,session:active});
  }
  const prev=safe(meta.chartPreviousClose)??safe(meta.previousClose);
  payload={schemaVersion:1,ticker:'INJC',generatedAt:now.toISOString(),source:'Yahoo Finance · quotes may be delayed',
   quote:{price,quoteTime:new Date(quoteTime).toISOString(),session:active,
    previous:prev,change:prev&&prev>0?(price-prev)/prev*100:null,
    open:regular[0]?.open??null,
    high:regular.length?(safe(meta.regularMarketDayHigh)??Math.max(...regular.map(p=>p.high??p.close))):null,
    low:regular.length?(safe(meta.regularMarketDayLow)??Math.min(...regular.map(p=>p.low??p.close))):null,
    volume:regular.length?(safe(meta.regularMarketVolume)??regular.reduce((sum,p)=>sum+(p.volume??0),0)):null},
   points:pts.slice(-500)};
  break;
 }catch(e){console.warn(host+': '+e.message);}
}
if(!payload){console.log('No real INJC prints yet. Preserve previous verified snapshot.');process.exit(0);}
const previous=JSON.parse(await fs.readFile(path,'utf8'));
if(previous.quote&&Date.parse(previous.quote.quoteTime)>Date.parse(payload.quote.quoteTime)){
 console.log('Stored verified quote is newer; skipping.');process.exit(0);
}
if(previous.quote&&previous.quote.quoteTime===payload.quote.quoteTime&&previous.quote.price===payload.quote.price&&previous.quote.volume===payload.quote.volume){
 console.log('No new quote; no repository commit needed.');process.exit(0);
}
await fs.writeFile(path,JSON.stringify(payload,null,2)+'\n');
console.log('INJC '+payload.quote.session+' '+payload.quote.price+' @ '+payload.quote.quoteTime);
