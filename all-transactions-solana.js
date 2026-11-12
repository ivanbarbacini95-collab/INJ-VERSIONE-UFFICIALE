/* All Transaction · Solana watch-only indexer (public RPC, no signing). */
(function(){
'use strict';
const RPCS=[
 'https://public.rpc.solanavibestation.com',
 'https://api.mainnet-beta.solana.com',
 'https://solana-rpc.publicnode.com',
 'https://rpc.solanatracker.io/public'
];
const TOKEN_PROGRAMS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const SYMBOLS={
 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':'USDC',
 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB':'USDT',
 'So11111111111111111111111111111111111111112':'wSOL',
 '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D':'jlUSDC'
};
const MAX_SOURCES=16;
async function rpc(method,params,signal){
 let err;
 for(const endpoint of RPCS){
  const controller=new AbortController();
  const listener=()=>controller.abort();
  if(signal){if(signal.aborted)throw new DOMException('Aborted','AbortError');signal.addEventListener('abort',listener,{once:true});}
  const timeout=setTimeout(()=>controller.abort(),8500);
  try{
   const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:controller.signal,cache:'no-store'});
   if(!res.ok)throw new Error('RPC '+res.status);
   const data=await res.json();
   if(data.error)throw new Error(String(data.error.message||'RPC error'));
   if(data.result===undefined)throw new Error('Invalid RPC response');
   return data.result;
  }catch(e){
   if(signal&&signal.aborted)throw e;
   err=e;
  }finally{clearTimeout(timeout);if(signal)signal.removeEventListener('abort',listener);}
 }
 throw err||new Error('Solana RPC unavailable');
}
function compact(num,max=6){
 if(!Number.isFinite(num))return '';
 return new Intl.NumberFormat(document.documentElement.lang==='en'?'en-US':'it-IT',{maximumFractionDigits:max}).format(num);
}
function accountKeys(tx){
 const msg=tx.transaction&&tx.transaction.message;
 return (msg&&msg.accountKeys||[]).map(k=>typeof k==='string'?k:k.pubkey||'');
}
function allInstructions(tx){
 const msg=tx.transaction&&tx.transaction.message||{};
 const top=Array.isArray(msg.instructions)?msg.instructions:[];
 const inner=(tx.meta&&tx.meta.innerInstructions||[]).flatMap(x=>x.instructions||[]);
 return top.concat(inner);
}
function makeItem(tx,record,account){
 const meta=tx&&tx.meta||{}, keys=accountKeys(tx);
 const instr=allInstructions(tx);
 const programs=instr.map(i=>(i.programId||i.program||'').toString().toLowerCase());
 const instructions=instr.map(i=>(i.parsed&&i.parsed.type||'').toLowerCase());
 const names=programs.concat(instructions).join(' ');
 const isJupiter=/jup|jupiter|route|swap|jup6|jup4|jupagg|j1toso|jup2/.test(names);
 const hasDeFiInstruction=/lend|deposit|withdraw|kamino|marginfi|solend|save|vault|flashloan|stakepool/.test(names);
 const isBridge=/worm|bridge|debridge|allbridge|portal|mayan|cctp|circle/.test(names);
 const isStaking=/delegate|deactivate|withdrawstake|splitstake|mergestake/.test(names);
 const ownerDiff=new Map();
 const before=meta.preTokenBalances||[], after=meta.postTokenBalances||[];
 for(const b of before.concat(after)){
  if(b.owner!==account)continue;
  const mint=String(b.mint||'');
  if(!mint)continue;
  const decimals=Number(b.uiTokenAmount&&b.uiTokenAmount.decimals||0);
  const raw=b.uiTokenAmount&&b.uiTokenAmount.amount||'0';
  const amount=Number(raw)/Math.pow(10,decimals);
  const key=mint+':'+String(b.accountIndex);
  const o=ownerDiff.get(key)||{mint,before:0,after:0};
  if(before.includes(b))o.before=amount;
  else o.after=amount;
  ownerDiff.set(key,o);
 }
 const delta=new Map();
 ownerDiff.forEach(x=>delta.set(x.mint,(delta.get(x.mint)||0)+x.after-x.before));
 const tokenDeltas=Array.from(delta.entries()).filter(x=>Number.isFinite(x[1])&&Math.abs(x[1])>1e-10);
 const isLend=hasDeFiInstruction||tokenDeltas.some(x=>SYMBOLS[x[0]]==='jlUSDC');
 const ownerIndex=keys.indexOf(account);
 const rawSol=ownerIndex<0?0:((Number((meta.postBalances||[])[ownerIndex]||0)-Number((meta.preBalances||[])[ownerIndex]||0))+(keys[0]===account?Number(meta.fee||0):0))/1e9;
 const isToken=tokenDeltas.length>0;
 const value=isToken?tokenDeltas.sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0]:['SOL',rawSol];
 const net=Number(value[1]);
 let dir=net>0?'in':net<0?'out':'neutral';
 let cat=dir==='in'?'received':dir==='out'?'sent':'other';
 if(isBridge)cat='bridge';
 else if(isStaking)cat='staking';
 else if(isJupiter&&!isLend)cat='swap';
 else if(isLend)cat='defi';
 else if(/swap|exchange/.test(names))cat='swap';
 // Contract calls, staking and deposits are not external wallet withdrawals by default.
 if(['bridge','staking','swap','defi'].includes(cat))dir='neutral';
 const symbol=value[0]==='SOL'?'SOL':SYMBOLS[value[0]]||value[0].slice(0,6)+'…';
 const hash=String(record.signature||'');
 return {
  hash,time:tx.blockTime?new Date(tx.blockTime*1000).toISOString():record.blockTime?new Date(record.blockTime*1000).toISOString():'',
  height:String(tx.slot||record.slot||''),network:'solana',cat,dir,
  amount:(Math.abs(net)>1e-10?compact(Math.abs(net))+' '+symbol:isToken?compact(Math.abs(net))+' '+symbol:''),
  asset:symbol,failed:Boolean(meta.err||record.err),
  fee:compact(Number(meta.fee||0)/1e9,9)+' SOL',peers:keys.filter(k=>k!==account).slice(0,4),
  msgs:instr.map(i=>String(i.parsed&&i.parsed.type||i.program||i.programId||'')).slice(0,7),
  note:cat==='defi'?'DeFi protocol interaction; verify position in protocol':'',
  movements:tokenDeltas.map(d=>({asset:SYMBOLS[d[0]]||d[0],delta:d[1]}))
 };
}
async function sourceAccounts(account,signal){
 const addresses=[account];
 let partial=false;
 for(const program of TOKEN_PROGRAMS){
  try{
   const data=await rpc('getTokenAccountsByOwner',[account,{programId:program},{encoding:'jsonParsed',commitment:'confirmed'}],signal);
   for(const x of data.value||[]){
    if(x.pubkey&&addresses.indexOf(x.pubkey)<0)addresses.push(x.pubkey);
   }
  }catch(e){if(signal&&signal.aborted)throw e;partial=true;}
 }
 return {addresses:addresses.slice(0,MAX_SOURCES),partial:partial||addresses.length>MAX_SOURCES};
}
async function load(account,cursors,signal){
 const sources=await sourceAccounts(account,signal);
 const fetched=await Promise.allSettled(sources.addresses.map(async a=>{
  const config={limit:3,commitment:'confirmed'};
  if(cursors&&cursors[a]==='END')return {account:a,records:[]};
  if(cursors&&cursors[a])config.before=cursors[a];
  const history=await rpc('getSignaturesForAddress',[a,config],signal);
  return {account:a,records:history||[]};
 }));
 const signatures=new Map(),next={...cursors},failures=[];
 fetched.forEach((result,i)=>{
  const a=sources.addresses[i];
  if(result.status!=='fulfilled'){failures.push(a);return;}
  const records=result.value.records;
  if(records.length)next[a]=records[records.length-1].signature;
  else next[a]='END';
  records.forEach(r=>{if(r&&r.signature)signatures.set(r.signature,r);});
 });
 const candidates=Array.from(signatures.values()).sort((a,b)=>(b.blockTime||0)-(a.blockTime||0));
 let parseErrors=0;
 const items=[];
 for(let i=0;i<candidates.length;i+=5){
  const chunk=await Promise.allSettled(candidates.slice(i,i+5).map(r=>rpc('getParsedTransaction',[r.signature,{commitment:'confirmed',maxSupportedTransactionVersion:0}],signal)));
  chunk.forEach((v,j)=>{if(v.status==='fulfilled'&&v.value){
   try{items.push(makeItem(v.value,candidates[i+j],account));}catch(_){parseErrors++;}
  }else parseErrors++;});
 }
 const exhausted=sources.addresses.every(a=>next[a]==='END');
 return {items,before:next,done:exhausted,partial:sources.partial||!!failures.length||parseErrors>0};
}
window.INJ_SOLANA_TRANSACTIONS={load};
})();