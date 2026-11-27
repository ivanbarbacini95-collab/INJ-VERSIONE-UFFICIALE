/* Refresh dated INJC ETF-share daily trading volumes from Yahoo Finance.
   Scheduled runner cache for browser/PWA fallback. Never fabricate amounts. */
import fs from 'node:fs/promises';
const path='market-data/injc-etf-volume.json';
const first='2026-11-05';
const nyDate=ms=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
   timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
};
const today=nyDate(Date.now());
const positive=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;
const ohlc=row=>({open:positive(row.open),high:positive(row.high),low:positive(row.low)});
const existing=JSON.parse(await fs.readFile(path,'utf8'));
const previous=new Map((existing.sessions||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)
 &&Number.isSafeInteger(Number(x.volume))&&Number(x.volume)>0).map(x=>[x.date,{
  volume:Number(x.volume),...ohlc(x),
  close:Number.isFinite(Number(x.close))&&Number(x.close)>0?Number(x.close):null,
  ...(typeof x.verifiedSource==='string'&&/^https:\/\//.test(x.verifiedSource)?{verifiedSource:x.verifiedSource}:{})
 }]));
let incoming=null;
for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
 try{
  const endpoint='https://'+host+'/v8/finance/chart/INJC?range=max&interval=1d&includePrePost=false';
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(16000),headers:{
   accept:'application/json','user-agent':'Mozilla/5.0 (compatible; INJNodeETFDailyVolume/1.0)'
  }});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json(),result=json?.chart?.result?.[0];
  if(!result||result.meta?.symbol?.toUpperCase()!=='INJC'||json.chart?.error)throw Error('INJC quote history unavailable');
  const q=result.indicators?.quote?.[0],times=result.timestamp||[];
  if(!q||!times.length)throw Error('Missing daily quote bars');
  const rows=new Map();
  times.forEach((time,i)=>{
   const date=nyDate(Number(time)*1000),volume=Number(q.volume?.[i]),close=Number(q.close?.[i]);
   // Zero for a ticker that has actual traded prices is often an incomplete
   // provider bar. Never publish it as a verified zero-volume session.
   if(date<first||date>today||q.volume?.[i]===null||q.volume?.[i]===undefined||!(close>0)
      ||!Number.isSafeInteger(volume)||volume<=0)return;
   const day=new Date(date+'T12:00:00Z').getUTCDay();
   if(day===0||day===6)return;
   rows.set(date,{volume,close,...ohlc({open:q.open?.[i],high:q.high?.[i],low:q.low?.[i]})});
  });
  if(!rows.size)throw Error('No dated valid share volume on '+host);
  incoming=rows;break;
 }catch(error){console.warn(host+': '+error.message);}
}
// Independent official historical endpoint fills dates missing from Yahoo.
try{
 const r=await fetch('https://api.nasdaq.com/api/quote/INJC/historical?assetclass=etf&fromdate='+first+'&todate='+today+'&limit=5000',{signal:AbortSignal.timeout(16000),headers:{accept:'application/json, text/plain, */*','user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',referer:'https://www.nasdaq.com/'}});
 if(!r.ok)throw Error('Nasdaq HTTP '+r.status);
 const d=(await r.json())?.data;
 if(d?.symbol&&String(d.symbol).toUpperCase()!=='INJC')throw Error('Symbol mismatch');
 for(const row of d?.tradesTable?.rows||[]){
  const m=String(row.date||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m)continue;
  const date=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
  const volume=Number(String(row.volume??'').replace(/,/g,'')),close=Number(String(row.close??'').replace(/[$,]/g,''));
  if(date<first||date>today||!Number.isSafeInteger(volume)||volume<=0||!(close>0))continue;
  if(!incoming)incoming=new Map();
  if(!incoming.has(date)||volume>incoming.get(date).volume)incoming.set(date,{volume,close,...ohlc(Object.fromEntries(['open','high','low'].map(k=>[k,String(row[k]??'').replace(/[$,]/g,'')]))),verifiedSource:'https://www.nasdaq.com/market-activity/etf/injc/historical'});
 }
}catch(error){console.warn('Nasdaq historical fallback:',error.message);}
// The separate five-minute quote collector can observe a higher cumulative
// exchange-session total than Yahoo's broken/incomplete daily bar. Its dated
// cumulative value is a conservative lower bound, not a fabricated close.
let quoteSnapshot=null;
try{
 const snapshot=JSON.parse(await fs.readFile('market-data/injc-etf-quotes.json','utf8'));
 const q=snapshot?.ticker==='INJC'?snapshot.quote:null;
 const time=Date.parse(q?.quoteTime||''),date=Number.isFinite(time)?nyDate(time):'';
 const volume=Number(q?.volume),price=Number(q?.price);
 if(q?.session==='regular'&&date>=first&&date<=today&&
     Number.isSafeInteger(volume)&&volume>0&&Number.isFinite(price)&&price>0){
   quoteSnapshot={date,volume,close:price};
 }
}catch(error){console.warn('Quote-snapshot cross-check unavailable:',error.message);}
if(!incoming&&quoteSnapshot)incoming=new Map();
if(incoming&&quoteSnapshot){
 const daily=incoming.get(quoteSnapshot.date);
 if(!daily||quoteSnapshot.volume>daily.volume){
   incoming.set(quoteSnapshot.date,{
     ...daily,volume:quoteSnapshot.volume,close:daily?.close??quoteSnapshot.close
   });
 }
}
if(!incoming){
 console.log('Providers unavailable. Preserve prior reported historical volumes.');
 process.exit(0);
}
for(const [date,row] of incoming){
 const prev=previous.get(date);
 // Yahoo may return incomplete/corrupt daily volume bars even for old sessions.
 // Quarantine drastic downward revisions instead of corrupting stored history.
 if(date<today&&prev&&prev.volume>0&&row.volume<prev.volume) {
   console.warn('Reject suspicious INJC history revision:',date,
     'cached',prev?.volume??'none','provider',row.volume);
   continue;
 }
 // The ongoing session is cumulative; protect it against delayed snapshots.
 // Once a session is completed, accept plausible provider corrections.
 const volume=date===today&&prev?Math.max(prev.volume,row.volume):row.volume;
 previous.set(date,{
   volume,
   ...Object.fromEntries(['open','high','low'].map(k=>[k,positive(row[k])??positive(prev?.[k])])),
   close:row.close>0?row.close:(prev?.close??null),
   ...(row.verifiedSource?{verifiedSource:row.verifiedSource}:prev?.verifiedSource&&volume===prev.volume?{verifiedSource:prev.verifiedSource}:{})
 });
}
const sessions=[...previous].filter(([date])=>date>=first&&date<=today)
 .sort(([a],[b])=>a.localeCompare(b))
 .map(([date,row])=>({date,volume:row.volume,close:row.close,...ohlc(row),
   ...(row.verifiedSource?{verifiedSource:row.verifiedSource}:{})}));
const old=JSON.stringify((existing.sessions||[]).map(x=>({
 date:x.date,volume:x.volume,close:Number.isFinite(Number(x.close))&&Number(x.close)>0?Number(x.close):null,...ohlc(x),
 ...(x.verifiedSource?{verifiedSource:x.verifiedSource}:{})
})));
if(JSON.stringify(sessions)===old){
 console.log('No new INJC share volume data. Existing cache unchanged.');
 process.exit(0);
}
const payload={
 schemaVersion:1,ticker:'INJC',exchange:'Nasdaq',
 firstTradingSession:first,timeZone:'America/New_York',unit:'ETF shares',
 note:'Reported daily INJC ETF shares traded and same-session reported close used only for indicative valuation. Not fund flows. Latest session may be partial.',
 source:'Yahoo Finance / Nasdaq historical · daily quote bars · potentially delayed',
 generatedAt:new Date().toISOString(),sessions
};
await fs.writeFile(path,JSON.stringify(payload,null,2)+'\n');
console.log('INJC traded-share daily volumes updated:',sessions.length,'sessions; last',sessions.at(-1));