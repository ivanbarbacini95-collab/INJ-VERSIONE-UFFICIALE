/* INJ Node | Read-only network health. No wallet or signing endpoints. */
const RPCS = [
  { name: 'Injective', url: 'https://sentry.tm.injective.network/status' },
  { name: 'PublicNode', url: 'https://injective-rpc.publicnode.com/status' },
  { name: 'Polkachu', url: 'https://injective-rpc.polkachu.com/status' }
];
async function jsonWithTimeout(url, ms=6500) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try {
    const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    return await response.json();
  } finally {clearTimeout(timer);}
}
async function inspectNode(source) {
  try {
    const data=await jsonWithTimeout(source.url);
    const info=data?.result?.sync_info;
    const chain=data?.result?.node_info?.network;
    const height=Number(info?.latest_block_height);
    const timestamp=Date.parse(info?.latest_block_time||'');
    if(chain!=='injective-1'||!Number.isSafeInteger(height)||height<=0||!Number.isFinite(timestamp))throw Error('Invalid chain status');
    const now=Date.now();
    const age=Math.max(0,Math.floor((now-timestamp)/1000));
    if(timestamp>now+30000)throw Error('Future block time');
    return {name:source.name,available:true,height,blockTime:new Date(timestamp).toISOString(),ageSeconds:age,catchingUp:Boolean(info.catching_up)};
  }catch(_){return {name:source.name,available:false};}
}
async function providerStatus(){
  try{
    const result=await jsonWithTimeout('https://quicknode.statuspage.io/api/v2/summary.json',5500);
    const component=(result.components||[]).find(x=>/injective\s*[-–]\s*mainnet/i.test(x.name||''));
    const incidents=(result.incidents||[]).filter(x=>/injective/i.test((x.name||'')+' '+(x.incident_updates||[]).map(u=>u.body||'').join(' ')) && !/testnet/i.test(x.name||''));
    const inc=incidents[0];
    const status=component?.status||'unknown';
    return {source:'QuickNode',level:status,description:component?.name||'Injective - Mainnet',incident:inc?{name:inc.name,url:inc.shortlink||'https://status.quicknode.com/',status:inc.status,updatedAt:inc.updated_at||null}:null,available:Boolean(component)};
  }catch(_){return {source:'QuickNode',level:'unknown',available:false,incident:null};}
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=5, must-revalidate');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const [nodes,provider]=await Promise.all([Promise.all(RPCS.map(source=>inspectNode(source))),providerStatus()]);
  const now=Date.now();
  const valid=nodes.filter(n=>n.available);
  const fresh=valid.filter(n=>n.ageSeconds<=20&&!n.catchingUp);
  const delayed=valid.filter(n=>n.ageSeconds>20&&n.ageSeconds<=120);
  const stale=valid.filter(n=>n.ageSeconds>120);
  let state='unknown';
  if(fresh.length>=2)state='online';
  else if(fresh.length===1||delayed.length||valid.some(n=>n.catchingUp))state='degraded';
  else if(stale.length>=2)state='halted';
  else if(stale.length===1)state='degraded';
  // A lagging third-party endpoint must not disqualify two agreeing, fresh nodes.
  const freshHeights=fresh.map(n=>n.height);
  if(state==='online' && Math.max(...freshHeights)-Math.min(...freshHeights)>100)state='degraded';
  // Provider notices are separate from observed chain health.
  return res.status(200).json({
    chainId:'injective-1',state,checkedAt:new Date(now).toISOString(),
    latest:valid.length?valid.reduce((a,b)=>a.blockTime>b.blockTime?a:b):null,
    nodes,provider,source:'on-chain'
  });
}
