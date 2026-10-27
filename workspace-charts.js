/* Shared interactive surface. Live cards use the same trade buckets and the
   38ms price easing of Live Charts; history cards retain their real timestamps. */
(function(root){
'use strict';
function domain(rows){const values=rows.flatMap(r=>r.o===undefined?[r.v]:[r.l,r.h]).filter(Number.isFinite);if(!values.length)return null;const min=Math.min(...values),max=Math.max(...values),pad=(max-min||Math.abs(max)*.001||1)*.06;return {min:min-pad,max:max+pad};}
function nearest(rows,time){if(!rows.length)return -1;let lo=0,hi=rows.length-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(rows[mid].t<time)lo=mid+1;else hi=mid;}return lo>0&&Math.abs(rows[lo-1].t-time)<=Math.abs(rows[lo].t-time)?lo-1:lo;}
function render(host,{rows,getRows,label,formatValue,locale='it-IT',candles=false,el,live=null}){
 const clean=rr=>rr.filter(r=>Number.isFinite(r.t)&&Number.isFinite(r.v)).sort((a,b)=>a.t-b.t);
 let all=clean(rows),shown=all,range=domain(all);if(all.length<2||!range)return;
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n},set=(n,k,v)=>n.setAttribute(k,String(v));
 const box=el('div','ws-interactive-chart'),plot=el('div','ws-plot'),scale=el('div','ws-price-scale'),times=el('div','ws-time-scale');
 plot.setAttribute('tabindex','0');plot.setAttribute('role','group');plot.setAttribute('aria-label',label+(locale==='it-IT'?' · Mouse o frecce per ispezionare; trascina per lo storico':' · Pointer or arrows to inspect; drag to browse history'));
 const svg=make('svg',{viewBox:'0 0 600 180',preserveAspectRatio:'none',role:'img','aria-label':label});svg.classList.add('ws-chart');
 const layer=make('g'),grid=[];for(let j=0;j<5;j++){const line=make('line',{x1:0,x2:600,y1:j*45,y2:j*45,class:'ws-chart-grid','vector-effect':'non-scaling-stroke'});svg.append(line);const tick=el('span','ws-price-tick');tick.style.top=j*25+'%';scale.append(tick);grid.push(tick)}svg.append(layer);
 const dateFormatter=new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'2-digit'}),timeFormatter=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'});
 const dateText=t=>dateFormatter.format(new Date(t)),timeText=t=>timeFormatter.format(new Date(t));
 const timeTicks=[];for(let j=0;j<3;j++){const tick=el('span','ws-time-tick'),clock=el('span'),date=el('small');tick.append(clock,date);times.append(tick);timeTicks.push({clock,date})}
 const vertical=el('div','ws-crosshair-v'),horizontal=el('div','ws-crosshair-h'),dot=el('div','ws-chart-point'),tooltip=el('div','ws-chart-tooltip'),priceTag=el('span','ws-inspect-price');tooltip.setAttribute('role','tooltip');
 const overlays=[vertical,horizontal,dot,tooltip,priceTag];overlays.forEach(n=>n.hidden=true);plot.append(svg,vertical,horizontal,dot,tooltip);scale.append(priceTag);
 const liveLine=el('div','ws-live-line'),liveDot=el('div','ws-live-dot'),livePrice=el('span','ws-live-price'),liveState=el('span','ws-chart-live-state'),returnLive=el('button','ws-return-live','LIVE ↗');
 if(live){returnLive.type='button';returnLive.setAttribute('aria-label',locale==='it-IT'?'Torna al grafico live':'Return to live chart');plot.append(liveLine,liveDot,liveState,returnLive);scale.append(livePrice)}
 box.append(plot,scale,times,el('div','ws-chart-corner'));host.append(box);
 let first=all[0].t,last=all.at(-1).t,windowMs=live?.windowMs||last-first,follow=true,viewEnd=last,visual=all.at(-1).v,target=visual,previous=visual,tickDirection=1,frameId=0,frameAt=0,labelAt=0,inspectTime=null,drag=null,disposed=false,requestAt=0;
 const nodes=new Map();let linePath=null;
 const x=t=>(t-first)/(last-first||1)*600,y=v=>180-(v-range.min)/(range.max-range.min)*180;
 function inspectTimeAt(time){if(!shown.length)return;const row=shown[nearest(shown,time)];inspectTime=row.t;const xx=x(row.t)/6,yy=y(row.v)/1.8;plot.dataset.inspecting='true';for(const n of overlays)n.hidden=false;
  vertical.style.left=xx+'%';horizontal.style.top=yy+'%';dot.style.left=xx+'%';dot.style.top=yy+'%';priceTag.style.top=Math.max(4,Math.min(96,yy))+'%';priceTag.textContent=formatValue(row.v);
  tooltip.replaceChildren(el('strong','',dateText(row.t)+' · '+timeText(row.t)));if(candles)for(const [name,value]of [['O',row.o],['H',row.h],['L',row.l],['C',row.v]])tooltip.append(el('span','',name+' '+formatValue(value)));else tooltip.append(el('span','',formatValue(row.v)));
  tooltip.style.left=xx>50?'8px':'auto';tooltip.style.right=xx>50?'auto':'8px';
 }
 function hide(){inspectTime=null;delete plot.dataset.inspecting;overlays.forEach(n=>n.hidden=true)}
 function draw(now=Date.now(),dt=16,force=false){
  if(getRows)all=clean(getRows());if(all.length<2)return;
  if(live){if(follow)viewEnd=now+windowMs*.025;first=viewEnd-windowMs;last=viewEnd;shown=all.filter(r=>r.t>=first-(live.bucketMs||0)&&r.t<=last);if(!shown.length)shown=all.slice(0,1);}else{first=all[0].t;last=all.at(-1).t;shown=all;}
  const fresh=live&&now-live.lastTick()<15000;target=fresh&&live.getPrice()>0?live.getPrice():all.at(-1).v;
  visual+= (target-visual)*(1-Math.exp(-dt/38));if(Math.abs(target-visual)<Math.max(.0000005,target*1e-8))visual=target;
  const plotted=shown.map(r=>({...r}));if(live&&follow&&fresh&&plotted.length){const end=plotted.at(-1);end.v=visual;if(candles){end.h=Math.max(end.h,visual);end.l=Math.min(end.l,visual)}else end.t=Math.max(end.t,Math.min(now,live.lastTick()));}
  const next=domain(plotted);if(!next)return;if(!live||force)range=next;else{const expanding=next.min<range.min||next.max>range.max,a=1-Math.exp(-dt/(expanding?100:4300));range={min:range.min+(next.min-range.min)*a,max:range.max+(next.max-range.max)*a};}
  if(candles){const seen=new Set(),width=Math.max(.6,Math.min(20,600*(live?.bucketMs||(last-first)/plotted.length)/(last-first)*.7));for(const r of plotted){seen.add(r.t);let n=nodes.get(r.t);if(!n){const group=make('g'),wick=make('line',{stroke:'currentColor','stroke-width':1,'vector-effect':'non-scaling-stroke'}),body=make('rect',{fill:'currentColor'});group.append(wick,body);layer.append(group);n={group,wick,body};nodes.set(r.t,n)}set(n.group,'class',r.v>=r.o?'ws-candle-up':'ws-candle-down');const xx=x(r.t)+(live?600*(live.bucketMs||0)/(last-first)/2:0);for(const [k,v]of Object.entries({x1:xx,x2:xx,y1:y(r.h),y2:y(r.l)}))set(n.wick,k,v);for(const [k,v]of Object.entries({x:xx-width/2,y:Math.min(y(r.o),y(r.v)),width,height:Math.max(1,Math.abs(y(r.o)-y(r.v)))}))set(n.body,k,v);}for(const [t,n]of nodes)if(!seen.has(t)){n.group.remove();nodes.delete(t)}}
  else{if(!linePath){linePath=make('path',{fill:'none',stroke:'currentColor','stroke-width':2,'vector-effect':'non-scaling-stroke'});layer.append(linePath)}set(linePath,'d',plotted.map((r,j)=>(j?'L':'M')+x(r.t).toFixed(2)+' '+y(r.v).toFixed(2)).join(' '));}
  if(force||now-labelAt>150){for(let j=0;j<5;j++)grid[j].textContent=formatValue(range.max-(range.max-range.min)*j/4);for(let j=0;j<3;j++){const stamp=first+(last-first)*j/2;timeTicks[j].clock.textContent=timeText(stamp);timeTicks[j].date.textContent=dateText(stamp)}labelAt=now;}
  if(live){returnLive.hidden=follow;liveState.textContent=fresh?'LIVE':locale==='it-IT'?'IN ATTESA':'WAITING';liveState.classList.toggle('is-live',!!fresh);const on=follow&&fresh&&shown.length;liveLine.hidden=liveDot.hidden=livePrice.hidden=!on;if(on){const yy=y(visual)/1.8,end=plotted.at(-1),xx=x(candles?end.t+(live.bucketMs||0)/2:end.t)/6;liveLine.style.top=yy+'%';liveDot.style.left=Math.min(100,xx)+'%';liveDot.style.top=yy+'%';livePrice.style.top=Math.max(4,Math.min(96,yy))+'%';livePrice.textContent=formatValue(visual);if(target!==previous)tickDirection=target>previous?1:-1;const color=tickDirection>0?'var(--up,#39c9a0)':'var(--down,#f26980)';liveLine.style.color=liveDot.style.color=livePrice.style.color=color;previous=target;}}
  if(inspectTime!==null)inspectTimeAt(inspectTime);
 }
 function goLive(){follow=true;windowMs=live.windowMs;hide();draw(Date.now(),16,true)}
 function pan(end){follow=false;viewEnd=Math.min(Date.now()+windowMs*.025,end);hide();draw(Date.now(),16,true);if(live.loadEarlier&&viewEnd-windowMs<all[0].t&&Date.now()-requestAt>1500){requestAt=Date.now();Promise.resolve(live.loadEarlier(all[0].t)).catch(()=>{});}}
 function pointer(e){const rect=plot.getBoundingClientRect();if(!rect.width)return;if(drag&&live){const dx=e.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;if(drag.moved){pan(drag.end-dx/rect.width*windowMs);return}}inspectTimeAt(first+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(last-first));}
 plot.addEventListener('pointermove',pointer);plot.addEventListener('pointerdown',e=>{if(e.target?.closest?.('button'))return;if(live&&e.button===0){drag={x:e.clientX,end:viewEnd,moved:false};plot.setPointerCapture(e.pointerId)}pointer(e)});
 plot.addEventListener('pointerup',()=>{drag=null});plot.addEventListener('lostpointercapture',()=>{drag=null});plot.addEventListener('pointerleave',()=>{if(!drag)hide()});plot.addEventListener('pointercancel',()=>{drag=null;hide()});plot.addEventListener('blur',hide);
 if(live){returnLive.addEventListener('click',goLive);plot.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))pan(viewEnd+(e.deltaX||e.deltaY)/plot.getBoundingClientRect().width*windowMs);else{windowMs=Math.max(live.windowMs/20,Math.min(live.windowMs*10,windowMs*Math.exp(e.deltaY*.001)));pan(viewEnd)}},{passive:false});}
 plot.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(live&&e.key==='End'){goLive();return}const index=inspectTime===null?shown.length-1:nearest(shown,inspectTime),next=e.key==='Home'?0:e.key==='End'?shown.length-1:index+(e.key==='ArrowLeft'?-1:1);inspectTimeAt(shown[Math.max(0,Math.min(shown.length-1,next))].t);});
 function frame(ts){if(disposed||!box.isConnected)return;frameId=requestAnimationFrame(frame);if(document.hidden||!box.getClientRects().length||ts-frameAt<16)return;const dt=Math.max(8,Math.min(80,ts-(frameAt||ts-16)));frameAt=ts;draw(Date.now(),dt);}
 draw(Date.now(),16,true);if(live)frameId=requestAnimationFrame(frame);
 return {box,destroy(){disposed=true;if(frameId)cancelAnimationFrame(frameId)},refresh(){draw(Date.now(),16,true)}};
}
const api={domain,nearest,render};if(typeof module!=='undefined')module.exports=api;root.INJWorkspaceCharts=api;
})(globalThis);
