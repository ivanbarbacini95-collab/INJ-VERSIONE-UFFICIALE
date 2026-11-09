/* Persistent Injective health measurements, every 5 minutes via GitHub Actions.
 * Historical "online" means actual verified RPC observations, not assumed uptime.
 * QuickNode incidents are kept separately and never masquerade as RPC measurements.
 */
import fs from 'node:fs/promises';
import networkHandler from '../api/network-status.mjs';

const OUTPUT='market-data/inj-network-history.json';
const DAY=86400000;
const now=Date.now();
const cutoff=now-32*DAY;
const TIMEOUT=9000;

function validTime(value){const n=Date.parse(String(value||''));return Number.isFinite(n)?n:NaN;}
async function json(url){
 const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(TIMEOUT),cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
function cleanIncident(item){
 if(!item||!item.id)return null;
 const name=String(item.name||'').slice(0,180);
 const affected=(item.components||[]).some(c=>/injective\s*[-–]\s*mainnet/i.test(c?.name||''));
 const titleMainnet=/injective\s*[-–]?\s*mainnet/i.test(name);
 if(!affected&&!titleMainnet)return null;
 if(/testnet/i.test(name)&&!titleMainnet&&!affected)return null;
 const type=String(item.impact||'none').slice(0,24);
 const planned=Boolean(item.scheduled_for||item.scheduled_until);
 const start=validTime((planned?item.scheduled_for:null)||item.started_at||item.created_at);
 if(!Number.isFinite(start)||start>now+40*DAY)return null;
 const end=validTime(item.resolved_at||item.completed_at||(planned&&['completed','resolved'].includes(item.status)?(item.scheduled_until||item.updated_at):null));
 return {
  id:String(item.id).slice(0,65),
  name,
  start:new Date(start).toISOString(),
  end:Number.isFinite(end)&&end>=start?new Date(end).toISOString():null,
  status:String(item.status||'').slice(0,35),
  impact:type,
  planned,
  url:'https://status.quicknode.com/incidents/'+encodeURIComponent(String(item.id))
 };
}
const old=JSON.parse(await fs.readFile(OUTPUT,'utf8'));
let measurement=null;
try {
 let answer;
 const mockResponse={
  setHeader(){return this;},
  status(){return this;},
  json(data){answer=data;return data;}
 };
 await networkHandler({method:'GET'},mockResponse);
 if(!answer||!['online','degraded','halted','unknown'].includes(answer.state))throw Error('Bad network status result');
 const latestHeight=Number(answer.latest?.height)||0;
 measurement=[Math.floor(now/60000),answer.state,Number.isSafeInteger(latestHeight)&&latestHeight>0?latestHeight:null];
} catch(error) {
 console.error('Network snapshot failed; recording unknown:',String(error));
 measurement=[Math.floor(now/60000),'unknown',null];
}
let incidents=Array.isArray(old.incidents)?old.incidents:[];
try{
 const response=await json('https://quicknode.statuspage.io/api/v2/incidents.json');
 if(!Array.isArray(response.incidents))throw Error('Missing incident list');
 const combined=new Map(incidents.map(x=>[x.id,x]));
 for(const incident of response.incidents){
  const normalized=cleanIncident(incident);
  if(normalized)combined.set(normalized.id,normalized);
 }
 incidents=[...combined.values()];
}catch(error){console.warn('QuickNode incident history unavailable:',String(error));}
try{
 const response=await json('https://quicknode.statuspage.io/api/v2/scheduled-maintenances.json');
 if(Array.isArray(response.scheduled_maintenances)){
  const combined=new Map(incidents.map(x=>[x.id,x]));
  for(const incident of response.scheduled_maintenances){
   const normalized=cleanIncident(incident);
   if(normalized)combined.set(normalized.id,normalized);
  }
  incidents=[...combined.values()];
 }
}catch(error){console.warn('QuickNode maintenance history unavailable:',String(error));}
const samples=[...(Array.isArray(old.samples)?old.samples:[]),measurement]
 .filter(row=>Array.isArray(row)&&Number.isInteger(row[0])&&row[0]*60000>=cutoff&&['online','degraded','halted','unknown'].includes(row[1]))
 .sort((a,b)=>a[0]-b[0]);
const uniqueSamples=[...new Map(samples.map(row=>[row[0],row])).values()];
const cleanIncidents=incidents.filter(x=>{
 const start=validTime(x.start),end=x.end?validTime(x.end):now;
 return Number.isFinite(start)&&Number.isFinite(end)&&end>=cutoff;
}).sort((a,b)=>b.start.localeCompare(a.start)).slice(0,250);
const output={
 schemaVersion:1,chainId:'injective-1',intervalMinutes:5,
 generatedAt:new Date(now).toISOString(),
 samples:uniqueSamples,
 incidents:cleanIncidents
};
await fs.writeFile(OUTPUT,JSON.stringify(output)+'\n');
console.log('Injective history',output.generatedAt,'samples',output.samples.length,'incidents',output.incidents.length,'latest state',measurement[1]);
