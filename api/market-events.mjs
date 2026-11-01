// INJ Node · macroeconomic calendar service.
// Source priority: licensed near-real-time Trading Economics (optional server-side key),
// ShowMyTrades public API (15-minute upstream cache), then Forex Factory schedule.
// Published values are copied only from provider actual fields. Never infer releases.
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  // Short edge cache; the free provider still has its OWN 15-minute cache.
  res.setHeader('Cache-Control','public, s-maxage=15, stale-while-revalidate=10');
  if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return;}
  const days=[1,3,7,14,30].includes(Number(req.query?.days))?Number(req.query.days):7;
  const allowed=new Set(['USD','EUR','GBP','CHF','JPY','CNY']);
  const region={USD:'US',EUR:'EU',GBP:'EU',CHF:'EU',JPY:'ASIA',CNY:'ASIA'};
  const text=(v,max=150)=>String(v??'').replace(/[\x00-\x1f]/g,'').trim().slice(0,max);
  const value=v=>{
    if(v===null||v===undefined)return null;
    const clean=text(v,48);
    return !clean||/^(null|undefined|n\/?a|none|pending|[-—])$/i.test(clean)?null:clean;
  };
  const dateISO=v=>{
    if(!v)return null;
    const iso=String(v);
    // Trading Economics' ISO timestamps omit UTC marker (their API documents UTC).
    const ms=Date.parse(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(iso)?iso+'Z':iso);
    return Number.isFinite(ms)?new Date(ms).toISOString():null;
  };
  const clock=Date.now(),start=clock-8*86400000,end=clock+(days+1)*86400000;
  const stamp=d=>new Date(d).toISOString().slice(0,10);
  const stableId=e=>'macro-'+e.country+'-'+e.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,90)+'-'+e.date.slice(0,16);
  async function download(url){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7000);
    try{
      const response=await fetch(url,{signal:ctrl.signal,cache:'no-store',headers:{Accept:'application/json','User-Agent':'INJNodeMarketEvents/2.0'}});
      if(!response.ok)throw Error('calendar HTTP '+response.status);
      const raw=await response.text();
      if(raw.length>2000000)throw Error('calendar too large');
      return JSON.parse(raw);
    }finally{clearTimeout(timer);}
  }
  let raw=[],source='',sourceUrl='',coverage='',providerAsOf=null,liveResults=false;
  const teKey=String(process.env.TRADING_ECONOMICS_API_KEY||process.env.TE_API_KEY||'').trim();
  if(teKey){
    try{
      const countryNames='united states,euro area,united kingdom,switzerland,japan,china';
      const url='https://api.tradingeconomics.com/calendar/country/'+encodeURIComponent(countryNames)+'/'+stamp(start)+'/'+stamp(end)+'?importance=3&f=json&c='+encodeURIComponent(teKey);
      const data=await download(url);
      if(!Array.isArray(data)||!data.length)throw Error('Trading Economics unavailable');
      const currencyFor=country=>{
        const c=text(country).toLowerCase();
        if(c==='united states')return 'USD';
        if(c==='euro area'||['germany','france','italy','spain'].includes(c))return 'EUR';
        return {'united kingdom':'GBP','switzerland':'CHF','japan':'JPY','china':'CNY'}[c]||'';
      };
      raw=data.map(e=>({
        id:'te-'+text(e.CalendarId,60),title:text(e.Event),
        country:currencyFor(e.Country),date:dateISO(e.Date),
        impact:text(e.Importance,16),actual:value(e.Actual),
        forecast:value(e.Forecast),previous:value(e.Previous),
        status:value(e.Actual)?'released':'scheduled'
      }));
      source='Trading Economics';
      sourceUrl='https://tradingeconomics.com/calendar';
      coverage='Valori dal feed Trading Economics; la latenza dipende dal provider';
      liveResults=true;
    }catch{raw=[];}
  }
  if(!raw.length){
    try{
      const data=await download('https://showmytrades.com/api/public/calendar/v1?currency=USD,EUR,GBP,CHF,JPY,CNY&impact=high&days='+days);
      if(!Array.isArray(data.events)||!data.events.length)throw Error('Economic calendar empty');
      raw=data.events.map(e=>({
        id:text(e.id,100),title:text(e.title),country:text(e.currency,8).toUpperCase(),
        date:dateISO(e.time||e.date||(Number(e.ts)>0?new Date(Number(e.ts)*1000).toISOString():null)),
        impact:text(e.impact,16),actual:value(e.actual),
        forecast:value(e.forecast),previous:value(e.previous),
        status:text(e.status||'scheduled',24)
      }));
      source='ShowMyTrades';
      sourceUrl='https://showmytrades.com/tools/economic-calendar';
      coverage='Fonte gratuita: risultati soggetti a cache fino a 15 minuti';
      providerAsOf=dateISO(data.generated_at);
      liveResults=false;
    }catch{raw=[];}
  }
  if(!raw.length){
    // The Forex Factory weekly export does NOT carry an Actual field. Its
    // published rate limit is restrictive; use only when other sources fail.
    const weeks=['thisweek','nextweek'];
    const settled=await Promise.allSettled(weeks.map(w=>download('https://nfs.faireconomy.media/ff_calendar_'+w+'.json')));
    const available=settled.filter(r=>r.status==='fulfilled'&&Array.isArray(r.value)).flatMap(r=>r.value);
    if(!available.length){
      res.setHeader('Cache-Control','no-store');
      res.status(503).json({error:'Economic calendar temporarily unavailable',events:[],source:'unavailable'});
      return;
    }
    raw=available.map(e=>({
      id:'',title:text(e.title),country:text(e.country,8).toUpperCase(),
      date:dateISO(e.date),impact:text(e.impact,16),
      actual:null,forecast:value(e.forecast),previous:value(e.previous),
      status:'scheduled'
    }));
    source='Forex Factory (weekly export)';
    sourceUrl='https://www.forexfactory.com/calendar';
    coverage='Solo calendario; questo feed non pubblica i risultati Actual';
    liveResults=false;
  }
  const found=new Map();
  for(const e of raw){
    if(!allowed.has(e.country)||!['high','3'].includes(String(e.impact).toLowerCase())||
       !e.title||!e.date)continue;
    const when=Date.parse(e.date);
    if(!Number.isFinite(when)||when<start||when>end)continue;
    const id=e.id||stableId(e);
    const record={...e,id,region:region[e.country],importance:3};
    const old=found.get(id);
    if(!old||(!old.actual&&record.actual))found.set(id,record);
  }
  const events=[...found.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,250);
  res.status(200).json({asOf:new Date(clock).toISOString(),providerAsOf,source,sourceUrl,coverage,liveResults,days,events});
}
