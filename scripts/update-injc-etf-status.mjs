/* INJ Node / INJC ETF verified SEC document monitor.
   The 8-A expressly confirms NASDAQ LISTING APPLICATION APPROVAL, not trading.
   Never infer first trade or price from an S-1, 8-A, or EFFECT filing.
   HTTP failures fail the workflow instead of silently dating stale data as fresh.
*/
import fs from 'node:fs/promises';

const FILE='market-data/injc-etf-status.json';
const CIK='0002073616';
const ROOT='https://www.sec.gov/Archives/edgar/data/2073616';
const HEADERS={
  'User-Agent':'INJNode ETF Filing Monitor contact: support@injectiveportfolio.com',
  'Accept':'application/json',
  'Accept-Encoding':'gzip, deflate',
};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchFilings(){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const res=await fetch(`https://data.sec.gov/submissions/CIK${CIK}.json`,{
        headers:HEADERS,signal:AbortSignal.timeout(19000),cache:'no-store'
      });
      if(!res.ok)throw Error('SEC '+res.status);
      const body=await res.json();
      const recent=body?.filings?.recent;
      if(!recent||!Array.isArray(recent.form)||!Array.isArray(recent.accessionNumber)||!Array.isArray(recent.filingDate)){
        throw Error('Missing recent EDGAR filing arrays');
      }
      return recent.form.map((form,i)=>({
        form:String(form||''),
        date:String(recent.filingDate[i]||''),
        accession:String(recent.accessionNumber[i]||''),
        doc:String(recent.primaryDocument?.[i]||'')
      })).filter(f=>f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date))
         .sort((a,b)=>b.date.localeCompare(a.date));
    }catch(error){
      lastError=error;
      if(attempt<2)await sleep(1200*(attempt+1));
    }
  }
  throw Error('SEC retrieval failed: '+String(lastError));
}
const source=f=>`${ROOT}/${f.accession.replaceAll('-','')}/${encodeURIComponent(f.doc||'')}`;
const first=(list,form)=>list.find(x=>x.form===form)||null;
const old=JSON.parse(await fs.readFile(FILE,'utf8'));
const rows=await fetchFilings();
// An EFFECT submission is a specific SEC notice. An 8-A alone is not enough.
const effect=first(rows,'EFFECT');
const latestS1=first(rows,'S-1/A')||first(rows,'S-1');
const latest424=rows.find(x=>/^424B/.test(x.form))||null;
const latest8a=rows.find(x=>/^8-A/.test(x.form))||null;
const now=new Date().toISOString();
const updated={
 ...old,
 schemaVersion:1,
 asOf:now.slice(0,10),
 checkedAt:now,
 sourceStatus:'sec-edgar-checked',
 listing:{...old.listing,status:'approved',date:'2026-11-03',
   source:'https://www.sec.gov/Archives/edgar/data/2073616/000199937126024343/canary-8a12b_110326.htm'
 },
 registration:{
   ...old.registration,
   status:effect?'effective':'unconfirmed',
   ...(effect?{effectiveDate:effect.date,effectiveSource:source(effect)}:{effectiveDate:null,effectiveSource:null}),
   ...(latestS1?{latestForm:latestS1.form,latestDate:latestS1.date,source:source(latestS1)}:{})
 },
 trading:{...old.trading},
 latestProspectus:latest424?{
    form:latest424.form,date:latest424.date,source:source(latest424)
 }:old.latestProspectus||null,
 recentSEC:rows.filter(x=>/^(8-A|S-1|EFFECT|424B)/.test(x.form)).slice(0,8)
 .map(x=>({form:x.form,date:x.date,source:source(x)})),
 ...(latest8a?{latest8A:{form:latest8a.form,date:latest8a.date,source:source(latest8a)}}:{})
};
await fs.writeFile(FILE,JSON.stringify(updated,null,2)+'\n');
console.log('INJC ETF SEC checked',updated.checkedAt,
  'Nasdaq listing',updated.listing.status,
  'S-1 effectiveness',updated.registration.status,
  'trading',updated.trading.status);
