/* INJ Node Official · issuer-reported INJC assets.
   Never equate ETF trading volume with fund inflows or underlying holdings.
   This script updates a dated static snapshot for the GitHub Pages deployment. */
import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE='https://canaryetfs.com/injc/';
const TARGET='market-data/injc-fund-holdings.json';

function plain(value){
 return String(value||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
   .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function number(value){
 const text=plain(value).replace(/,/g,'').replace(/\$/g,'').trim();
 if(!/^-?\d+(?:\.\d+)?$/.test(text))return null;
 const n=Number(text);
 return Number.isFinite(n)?n:null;
}
function isoDate(value){
 const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(plain(value));
 if(!m)return null;
 const d=new Date(Date.UTC(Number(m[3]),Number(m[1])-1,Number(m[2])));
 if(d.getUTCFullYear()!==Number(m[3])||d.getUTCMonth()!==Number(m[1])-1||d.getUTCDate()!==Number(m[2]))return null;
 return d.toISOString().slice(0,10);
}
async function getHtml(){
 const ctl=new AbortController();
 const t=setTimeout(()=>ctl.abort(),18000);
 try{
  const response=await fetch(SOURCE,{signal:ctl.signal,headers:{
   'User-Agent':'Mozilla/5.0 (compatible; INJNodeHoldingsMonitor/1.0)',
   Accept:'text/html,application/xhtml+xml',
   'Cache-Control':'no-cache'
  }});
  if(!response.ok)throw Error('Issuer returned HTTP '+response.status);
  return await response.text();
 }finally{clearTimeout(t)}
}
function decode(html){
 const results=[];
 // The issuer's Holdings table contains rows for multiple funds.
 for(const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>plain(x[1]));
  if(cells.length<12||cells[1]!=='INJC'||cells[3]!=='INJUSD'||!/INJECTIVE/i.test(cells[2]))continue;
  const date=isoDate(cells[0]);
  const inj=number(cells[6])??number(cells[5]);
  const officialNetAssetsUsd=number(cells[10]);
  const marketValueUsd=number(cells[8]);
  const sharesOutstanding=number(cells[11]);
  if(!date||!(inj>0)||!(officialNetAssetsUsd>0)||!(marketValueUsd>0)||
     !(sharesOutstanding>0)||inj>1e9||officialNetAssetsUsd>1e11)continue;
  results.push({date,inj,officialNetAssetsUsd,marketValueUsd,sharesOutstanding});
 }
 results.sort((a,b)=>b.date.localeCompare(a.date));
 return results[0]||null;
}
const html=await getHtml();
const entry=decode(html);
if(!entry)throw Error('INJC issuer holdings row unavailable; refusing to publish unverified numbers');
const today=new Date().toISOString().slice(0,10);
if(entry.date>'2026-11-04'&&entry.date<=new Date(Date.now()+86400000).toISOString().slice(0,10)){
 let old=null;
 try{old=JSON.parse(await fs.readFile(TARGET,'utf8'))}catch{}
 if(old?.asOf&&old.asOf>entry.date)throw Error('Issuer data older than published snapshot');
 const result={
  schemaVersion:1,ticker:'INJC',asOf:entry.date,
  injHeld:entry.inj,officialNetAssetsUsd:entry.officialNetAssetsUsd,
  officialInjMarketValueUsd:entry.marketValueUsd,
  sharesOutstanding:entry.sharesOutstanding,
  source:SOURCE,sourceType:'issuer_holdings',
  verifiedAt:new Date().toISOString()
 };
 if(old?.asOf===result.asOf&&old?.injHeld===result.injHeld&&
    old?.officialNetAssetsUsd===result.officialNetAssetsUsd&&
    old?.sharesOutstanding===result.sharesOutstanding){
  console.log('No change to issuer holdings as of '+entry.date);process.exit(0);
 }
 await fs.mkdir(path.dirname(TARGET),{recursive:true});
 await fs.writeFile(TARGET,JSON.stringify(result,null,2)+'\n');
 console.log('Verified issuer holdings: '+entry.date+', INJ '+entry.inj+', NAV '+entry.officialNetAssetsUsd+' USD');
}else throw Error('Unexpected holdings as-of date: '+entry.date);
