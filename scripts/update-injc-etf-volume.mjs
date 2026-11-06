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
const existing=JSON.parse(await fs.readFile(path,'utf8'));
const previous=new Map((existing.sessions||[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)
 &&Number.isSafeInteger(Number(x.volume))&&Number(x.volume)>=0).map(x=>[x.date,Number(x.volume)]));
let incoming=null;
for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
 try{
  const endpoint='https://'+host+'/v8/finance/chart/INJC?range=1y&interval=1d&includePrePost=false';
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
   // A dated OHLC bar with valid share volume is required; 0 is valid if reported.
   if(date<first||date>today||q.volume?.[i]===null||q.volume?.[i]===undefined||!(close>0)
      ||!Number.isSafeInteger(volume)||volume<0)return;
   const day=new Date(date+'T12:00:00Z').getUTCDay();
   if(day===0||day===6)return;
   rows.set(date,volume);
  });
  if(!rows.size)throw Error('No dated valid share volume on '+host);
  incoming=rows;break;
 }catch(error){console.warn(host+': '+error.message);}
}
if(!incoming){
 console.log('Provider unavailable. Preserve prior reported historical volumes.');
 process.exit(0);
}
for(const [date,value] of incoming){
 const prev=previous.get(date);
 // Market volume is cumulative during a session. Avoid regressions from stale feeds.
 if(prev===undefined||value>=prev)previous.set(date,value);
}
const sessions=[...previous].filter(([date])=>date>=first&&date<=today)
 .sort(([a],[b])=>a.localeCompare(b))
 .map(([date,volume])=>({date,volume}));
const old=JSON.stringify((existing.sessions||[]).map(x=>({date:x.date,volume:x.volume})));
if(JSON.stringify(sessions)===old){
 console.log('No new INJC share volume data. Existing cache unchanged.');
 process.exit(0);
}
const payload={
 schemaVersion:1,ticker:'INJC',exchange:'Nasdaq',
 firstTradingSession:first,timeZone:'America/New_York',unit:'ETF shares',
 note:'Reported daily trading volume of INJC ETF shares; not fund flows or Injective token volume. Latest session may be partial.',
 source:'Yahoo Finance · daily quote bars · potentially delayed',
 generatedAt:new Date().toISOString(),sessions
};
await fs.writeFile(path,JSON.stringify(payload,null,2)+'\n');
console.log('INJC traded-share daily volumes updated:',sessions.length,'sessions; last',sessions.at(-1));