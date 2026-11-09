/* Merge network monitor snapshots after pulling latest main, preserving concurrent samples. */
import fs from 'node:fs/promises';
const [incomingPath,basePath,targetPath]=process.argv.slice(2);
if(!incomingPath||!basePath||!targetPath)throw Error('Expected incoming, base and target paths');
const parse=async path=>JSON.parse(await fs.readFile(path,'utf8').catch(()=>'{ }'));
const [incoming,base]=await Promise.all([parse(incomingPath),parse(basePath)]);
const cutoff=Date.now()-32*86400000;
const sampleMap=new Map();
for(const item of [...(base.samples||[]),...(incoming.samples||[])]){
 if(!Array.isArray(item)||!Number.isInteger(item[0])||item[0]*60000<cutoff||!['online','degraded','halted','unknown'].includes(item[1]))continue;
 const prev=sampleMap.get(item[0]);
 if(!prev||prev[1]==='unknown')sampleMap.set(item[0],item);
}
const incidents=new Map();
for(const row of [...(base.incidents||[]),...(incoming.incidents||[])]){
 if(!row?.id||!Number.isFinite(Date.parse(row.start)))continue;
 const end=Date.parse(row.end||new Date().toISOString());
 if(!Number.isFinite(end)||end<cutoff)continue;
 const previous=incidents.get(row.id);
 if(!previous||(!previous.end&&row.end)||(!previous.end&&!row.end)||String(row.status)==='resolved'||String(row.status)==='completed')incidents.set(row.id,row);
}
const incomingTime=Date.parse(incoming.generatedAt||'');
const previousTime=Date.parse(base.generatedAt||'');
const generatedAt=Number.isFinite(incomingTime)&&(!Number.isFinite(previousTime)||incomingTime>=previousTime)?incoming.generatedAt:base.generatedAt;
const merged={
 schemaVersion:1,chainId:'injective-1',intervalMinutes:5,
 generatedAt:generatedAt||null,
 samples:[...sampleMap.values()].sort((a,b)=>a[0]-b[0]),
 incidents:[...incidents.values()].sort((a,b)=>String(b.start).localeCompare(String(a.start))).slice(0,250)
};
await fs.writeFile(targetPath,JSON.stringify(merged)+'\n');
console.log('Merged',merged.samples.length,'samples,',merged.incidents.length,'incidents');
