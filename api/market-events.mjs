// INJ NODE · High-impact macro calendar proxy · Vercel Node (no API credentials).
// Data: ShowMyTrades economic calendar (preferred); Forex Factory weekly feed fallback.
// NO fabricated events, forecasts or figures. JSON is strict with short CDN caching.
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=240');
  if(req.method!=='GET'){res.status(405).json({error:'Metodo non consentito'});return}
  const days=[1,3,7,14,30].includes(Number(req.query?.days))?Number(req.query.days):7;
  const allowed=new Set(['USD','EUR','GBP','CHF','JPY','CNY']);
  const region={USD:'US',EUR:'EU',GBP:'EU',CHF:'EU',JPY:'ASIA',CNY:'ASIA'};
  const txt=(x,max=140)=>String(x??'').replace(/[\x00-\x1f]/g,'').slice(0,max).trim();
  const value=x=>x==null||String(x).trim()===''?null:txt(x,48);
  // Include the beginning of the current week when source data still has it.
  const clock=Date.now(),start=clock-8*86400000,end=clock+(days+1)*86400000;
  async function download(url){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7000);
    try{
      const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json','User-Agent':'INJNodeMarketEvents/1.0'}});
      if(!response.ok)throw Error('calendar HTTP '+response.status);
      const data=await response.json();
      if(JSON.stringify(data).length>2000000)throw Error('calendar too large');
      return data;
    }finally{clearTimeout(timer)}
  }
  let raw=[],source='',sourceUrl='',coverage='';
  try{
    const data=await download('https://showmytrades.com/api/public/calendar/v1?currency=USD,EUR,GBP,CHF,JPY,CNY&impact=high&days='+days);
    if(!Array.isArray(data.events))throw Error('calendar response invalid');
    raw=data.events.map(e=>({id:txt(e.id,110),title:txt(e.title),country:txt(e.currency,8).toUpperCase(),date:e.time||null,impact:txt(e.impact,16),actual:value(e.actual),forecast:value(e.forecast),previous:value(e.previous),status:txt(e.status,24),confidence:txt(e.confidence,32)}));
    source='ShowMyTrades';sourceUrl='https://showmytrades.com/tools/economic-calendar';coverage='Fino a 30 giorni; fonte aggiornata periodicamente, effettivi non istantanei';
  }catch(error){
    try{
      // Only current week; no claim of two-week coverage when the source is missing.
      const data=await download('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
      if(!Array.isArray(data))throw Error('weekly calendar response invalid');
      raw=data.map(e=>({id:'ff-'+txt(e.country,8)+'-'+txt(e.title,75)+'-'+txt(e.date,40),title:txt(e.title),country:txt(e.country,8).toUpperCase(),date:e.date||null,impact:txt(e.impact,16),actual:value(e.actual),forecast:value(e.forecast),previous:value(e.previous),status:'scheduled',confidence:'third_party'}));
      source='Forex Factory (weekly export)';sourceUrl='https://www.forexfactory.com/calendar';coverage='Ripiego: solo settimana corrente; le altre settimane potrebbero non essere disponibili';
    }catch(e){
      res.setHeader('Cache-Control','no-store');
      res.status(503).json({error:'Calendario macroeconomico temporaneamente non disponibile',events:[],source:'unavailable'});
      return;
    }
  }
  const seen=new Set();
  const events=raw.filter(e=>{
    const ms=Date.parse(e.date||'');
    if(!allowed.has(e.country)||!['high','3'].includes(e.impact.toLowerCase())||!Number.isFinite(ms)||ms<start||ms>end)return false;
    if(seen.has(e.id))return false;seen.add(e.id);return true;
  }).map(e=>({...e,region:region[e.country],date:new Date(e.date).toISOString(),importance:3})).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,250);
  res.status(200).json({asOf:new Date(clock).toISOString(),source,sourceUrl,coverage,days,events});
}
