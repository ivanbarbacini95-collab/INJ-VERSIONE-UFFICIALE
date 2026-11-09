/* INJ Node network health - live, read-only, independent Tendermint websocket headers.
   Complements 10-second polling; never broadcasts or signs transactions.
   The source must identify chain injective-1 before any event is accepted. */
(()=>{
 'use strict';
 const NODES=[
  {name:'Injective',url:'wss://sentry.tm.injective.network/websocket'},
  {name:'PublicNode',url:'wss://injective-rpc.publicnode.com/websocket'}
 ];
 const sockets=new Map();
 let started=false;
 function connect(node){
  if(document.hidden)return;
  if(sockets.get(node.name)?.readyState===WebSocket.OPEN||sockets.get(node.name)?.readyState===WebSocket.CONNECTING)return;
  let ws;
  try{ws=new WebSocket(node.url);}catch(_){return;}
  sockets.set(node.name,ws);
  ws.onopen=()=>{
   try{ws.send(JSON.stringify({jsonrpc:'2.0',id:'injnode-network-'+node.name,method:'subscribe',params:{query:"tm.event='NewBlockHeader'"}}));}catch(_){}
  };
  let previousHeight=0,lastEmitted=0;
  ws.onmessage=event=>{
   try{
    const packet=JSON.parse(event.data);
    const value=packet?.result?.data?.value;
    const header=value?.header||value?.block?.header;
    if(!header||header.chain_id!=='injective-1')return;
    const height=Number(header.height),stamp=Date.parse(header.time||''),now=Date.now();
    if(!Number.isSafeInteger(height)||height<=previousHeight||height<=0||!Number.isFinite(stamp)||stamp>now+30000||now-stamp>30000)return;
    previousHeight=height;
    // Many blocks per second: update the user interface at most once every 4s/node.
    if(now-lastEmitted<4000)return;
    lastEmitted=now;
    window.dispatchEvent(new CustomEvent('injnode:network-ws-block',{
     detail:{name:node.name,height,blockTime:new Date(stamp).toISOString(),ageSeconds:Math.max(0,Math.floor((now-stamp)/1000)),catchingUp:false,available:true,seenAt:now}
    }));
   }catch(_){}
  };
  ws.onclose=()=>{
   if(sockets.get(node.name)===ws)sockets.delete(node.name);
   if(!document.hidden)setTimeout(()=>connect(node),6500);
  };
  ws.onerror=()=>{try{ws.close();}catch(_){}};
 }
 function start(){
  if(started||document.hidden)return;started=true;
  for(const node of NODES)connect(node);
 }
 function stop(){
  started=false;
  for(const ws of sockets.values()){try{ws.onclose=null;ws.close();}catch(_){}}
  sockets.clear();
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
 start();
})();
