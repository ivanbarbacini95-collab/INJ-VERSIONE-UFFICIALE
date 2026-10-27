/* Live Charts trade semantics: preserve OHLC history, grow only observed bars,
   retain older history while panning, and share one trade socket per Workspace. */
(function(root){
'use strict';
const intervalMs=s=>{const m=/^(\d+)(s|m|h|d|w)$/.exec(s||'');return m?Number(m[1])*{s:1000,m:60000,h:3600000,d:86400000,w:604800000}[m[2]]:60000};
function aggregate(rows,bucket){const map=new Map();for(const r of [...rows].sort((a,b)=>a.t-b.t)){const t=Math.floor(r.t/bucket)*bucket,old=map.get(t);if(!old)map.set(t,{...r,t});else{old.h=Math.max(old.h,r.h);old.l=Math.min(old.l,r.l);old.c=r.c;}}return [...map.values()];}
function merge(history,incoming){const latest=history.candles?.at(-1)?.t,map=new Map((history.candles||[]).map(c=>[c.t,c]));for(const row of incoming){const old=map.get(row.t);map.set(row.t,old?.liveAt&&row.t===latest?{...row,h:Math.max(row.h,old.h),l:Math.min(row.l,old.l),c:old.c,liveAt:old.liveAt}:{...row});}history.candles=[...map.values()].sort((a,b)=>a.t-b.t).slice(-25000);history.points=history.candles.map(c=>[c.liveAt||c.t,c.c]);return history;}
function apply(history,price,time,bucket){if(!(price>0)||!Number.isFinite(price)||!Number.isFinite(time)||time<(history.liveAt||0))return false;const t=Math.floor(time/bucket)*bucket,rows=history.candles;if(!rows?.length)return false;let bar=rows.at(-1);if(t<bar.t)return false;if(t>bar.t){bar={t,o:bar.c,h:Math.max(bar.c,price),l:Math.min(bar.c,price),c:price,liveAt:time};rows.push(bar);history.points.push([time,price]);}else{bar.h=Math.max(bar.h,price);bar.l=Math.min(bar.l,price);bar.c=price;bar.liveAt=time;history.points[history.points.length-1]=[time,price];}history.liveAt=time;if(rows.length>25000){rows.shift();history.points.shift();}return true;}
function createFeed(onTrade){let socket=null,wanted=false,timer=0,generation=0,attempt=0;const endpoints=['wss://stream.binance.com:9443/ws/injusdt@aggTrade','wss://data-stream.binance.vision/ws/injusdt@aggTrade','wss://stream.binance.com:443/ws/injusdt@aggTrade'];
 function open(){if(!wanted||document.hidden||socket)return;const gen=++generation;try{const ws=new WebSocket(endpoints[attempt%endpoints.length]);socket=ws;ws.onmessage=e=>{if(gen!==generation)return;try{const d=JSON.parse(e.data),p=Number(d.p),time=Number(d.T||d.E);if(p>0&&time>0)onTrade(p,time)}catch(_){}};ws.onerror=()=>ws.close();ws.onclose=()=>{if(gen!==generation)return;socket=null;if(wanted&&!document.hidden){attempt++;timer=setTimeout(open,Math.min(20000,1000+attempt*1500));}};}catch(_){attempt++;timer=setTimeout(open,5000);}}
 function stop(){generation++;clearTimeout(timer);const old=socket;socket=null;if(old){old.onclose=null;old.close();}}
 return {watch(on){wanted=on;if(on)open();else stop();},resume(){if(wanted)open()},pause:stop,close(){wanted=false;stop()}};
}
const api={intervalMs,aggregate,merge,apply,createFeed};if(typeof module!=='undefined')module.exports=api;root.INJWorkspaceLive=api;
})(globalThis);
