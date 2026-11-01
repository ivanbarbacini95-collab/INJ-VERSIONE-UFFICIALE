/* Global Markets static feed builder for INJNODE GitHub Pages.
 * Runs ONLY in GitHub Actions. No backend is needed at request time.
 * Source quotes are unlicensed/third-party and may be delayed or unavailable.
 * Missing values remain null; older verified values can be retained with dates.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const FILE='market-data/global-markets.json';
const GROUPS=['indices','sectors','stocks','etf','forex','commodities','bonds'];
const script=await fs.readFile('api/global-markets.js','utf8');
const moduleUrl='data:text/javascript;base64,'+Buffer.from(script).toString('base64');
const {default:handler}=await import(moduleUrl);
let old={groups:{}};
try{old=JSON.parse(await fs.readFile(FILE,'utf8'));}catch{}
const output={schema:1,generatedAt:new Date().toISOString(),type:'static-snapshot',groups:{}};
async function getGroup(group){
 const res={statusCode:200,headers:{},payload:null,
  setHeader(k,v){this.headers[k]=v;return this},
  status(n){this.statusCode=n;return this},
  json(value){this.payload=value;return this}};
 await handler({method:'GET',query:{group}},res);
 return res.payload;
}
const getValid=q=>q&&Number.isFinite(q.price)&&q.price>0;
async function updateGroup(group){
 let incoming;
 try{incoming=await getGroup(group)}catch(e){console.warn(group, String(e).slice(0,150));}
 const previous=old?.groups?.[group];
 const priorMap=new Map((previous?.quotes||[]).map(q=>[q.id,q]));
 const results=Array.isArray(incoming?.quotes)?incoming.quotes:[];
 const merged=results.length?results.map(q=>{
  const before=priorMap.get(q.id);
  return getValid(q)?q:getValid(before)?before:q;
 }):Array.isArray(previous?.quotes)?previous.quotes:[];
 const fresh=results.filter(getValid).length;
 output.groups[group]={quotes:merged,available:merged.filter(getValid).length,fresh,
  updatedAt:fresh?new Date().toISOString():(previous?.updatedAt||null),
  source:fresh?(incoming?.source||'third-party market providers'):(previous?.source||null),
  status:fresh===0?'unavailable':fresh===results.length?'complete':'partial'};
 console.log(group+': '+fresh+' fresh of '+results.length+' assets, '+output.groups[group].available+' visible');
}
for(let i=0;i<GROUPS.length;i+=3){
 await Promise.all(GROUPS.slice(i,i+3).map(updateGroup));
}
await fs.mkdir(path.dirname(FILE),{recursive:true});
await fs.writeFile(FILE,JSON.stringify(output,null,2)+'\n','utf8');
console.log('Saved '+FILE+'; groups='+Object.keys(output.groups).length);
