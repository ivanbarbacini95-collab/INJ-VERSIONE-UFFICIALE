/* INJ Node Official · INJC ETF market phases and price-point inspector.
   Yellow dashed overnight connector is a previous-close reference, NOT a trade.
   Crosshair inspects only genuinely received time-stamped bars/quotes. */
(() => {
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const sv=(tag,attrs={})=>{
   const el=document.createElementNS(NS,tag);
   Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
   return el;
 };
 const localTime=(ms,language)=>{
   return new Date(ms).toLocaleString(language==='en'?'en-US':'it-IT',{
     timeZone:'America/New_York',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'
   })+' NY';
 };
 window.__injcEtfChartEnhance=function(ctx){
   const {wrap,points,timeframe,state,x,y,left,top,plotRight,plotBottom,preColor,normalColor,hasOvernightTail,usd,lang}=ctx;
   const svg=wrap.querySelector('svg');
   if(!svg||!points.length)return;
   const language=lang(),lastIndex=points.length-1;
   const anchorIndex=points.findIndex(p=>p.session==='close-anchor');
   const preIndex=points.findIndex(p=>p.session==='pre');
   const overnight=sv('g',{'class':'injc-overnight-reference','pointer-events':'none'});
   const appendGap=(from,to,price,label)=>{
     if(!(Number.isFinite(from)&&Number.isFinite(to)&&to>from+3&&Number.isFinite(price)))return;
     overnight.appendChild(sv('rect',{x:from,y:top,width:to-from,height:plotBottom-top,fill:preColor,'fill-opacity':'.085'}));
     overnight.appendChild(sv('line',{x1:from,y1:y(price),x2:to,y2:y(price),
       stroke:preColor,'stroke-opacity':'.9','stroke-width':'1.7','stroke-dasharray':'4 5'}));
     if(label&&to-from>48){
       const title=sv('text',{x:(from+to)/2,y:top+19,fill:preColor,'font-size':10,
         'font-weight':750,'text-anchor':'middle'});
       title.textContent='PRE-MARKET';
       overnight.appendChild(title);
     }
     const info=sv('title');
     info.textContent=language==='en'
       ?'Dashed line: last verified close reference; no trades are implied.'
       :'Tratteggio: riferimento all’ultima chiusura verificata; non rappresenta nuovi scambi.';
     overnight.appendChild(info);
   };
   if(timeframe==='1d'){
     if(hasOvernightTail){
       appendGap(x(lastIndex),plotRight,points[lastIndex].close,true);
     }else if(anchorIndex>=0&&preIndex>anchorIndex){
       appendGap(x(anchorIndex),x(preIndex),points[anchorIndex].close,false);
       overnight.appendChild(sv('circle',{cx:x(anchorIndex),cy:y(points[anchorIndex].close),r:3.5,fill:preColor}));
     }
   }
   if(overnight.childNodes.length){
     const before=svg.querySelector('path');
     svg.insertBefore(overnight,before||null);
   }

   // A price must have its own time and value; never make non-trading periods selectable.
   const actual=points.map((p,i)=>({...p,index:i}))
     .filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.close)&&p.close>0);
   if(actual.length<2)return;
   wrap.style.position='relative';
   svg.classList.add('injc-price-inspectable');
   svg.setAttribute('tabindex','0');
   svg.setAttribute('aria-label',(language==='en'
     ?'INJC verified prices chart. Touch, hover or use arrow keys to inspect prices.'
     :'Grafico dei prezzi verificati INJC. Tocca, passa il mouse o usa le frecce per esplorare i prezzi.'));

   const overlay=sv('g',{'class':'injc-chart-cursor','visibility':'hidden','pointer-events':'none'});
   const line=sv('line',{y1:top,y2:plotBottom,'stroke-width':1.15,'stroke-dasharray':'3 5',
     stroke:'currentColor','stroke-opacity':'.65'});
   const dot=sv('circle',{r:5.5,stroke:'var(--etf-bg)','stroke-width':2});
   overlay.appendChild(line);overlay.appendChild(dot);svg.appendChild(overlay);
   const tip=document.createElement('div');
   tip.className='injc-price-inspector';
   tip.hidden=true;
   tip.innerHTML='<strong class="injc-inspector-price"></strong><small class="injc-inspector-time"></small><span class="injc-inspector-session"></span>';
   wrap.appendChild(tip);
   const priceNode=tip.querySelector('.injc-inspector-price');
   const timeNode=tip.querySelector('.injc-inspector-time');
   const sessionNode=tip.querySelector('.injc-inspector-session');
   let selection=-1;
   const pick=index=>{
     if(index<0||index>=actual.length)return;
     selection=index;
     const p=actual[index],xx=x(p.index),yy=y(p.close);
     const pre=p.session==='pre'||p.session==='close-anchor';
     line.setAttribute('x1',xx);line.setAttribute('x2',xx);
     dot.setAttribute('cx',xx);dot.setAttribute('cy',yy);dot.setAttribute('fill',pre?preColor:normalColor);
     overlay.setAttribute('visibility','visible');
     priceNode.textContent=usd(p.close);
     timeNode.textContent=localTime(p.time,language);
     sessionNode.textContent=p.session==='pre'?'PRE-MARKET':
       p.session==='close-anchor'?(language==='en'?'PREVIOUS CLOSE':'CHIUSURA PRECEDENTE'):'NASDAQ';
     sessionNode.dataset.state=pre?'pre':'open';
     const svgWidth=svg.viewBox.baseVal.width||svg.clientWidth||360;
     const tipWidth=Math.min(176,Math.max(126,wrap.clientWidth-24));
     const cssX=xx*wrap.clientWidth/svgWidth;
     tip.style.left=Math.max(tipWidth/2+6,Math.min(wrap.clientWidth-tipWidth/2-6,cssX))+'px';
     tip.hidden=false;
     window.__injcEtfSelectedTradeTime=p.time;
   };
   const nearest=event=>{
     const rect=svg.getBoundingClientRect();
     const px=(event.clientX-rect.left)*(svg.viewBox.baseVal.width||rect.width)/Math.max(1,rect.width);
     const lastDataX=x(lastIndex);
     if(px<left-12||px>lastDataX+12)return;
     let result=0,dist=Infinity;
     actual.forEach((p,i)=>{const dx=Math.abs(px-x(p.index));if(dx<dist){dist=dx;result=i;}});
     pick(result);
   };
   svg.addEventListener('pointermove',nearest,{passive:true});
   svg.addEventListener('pointerdown',nearest,{passive:true});
   svg.addEventListener('pointerleave',e=>{
     if(e.pointerType==='mouse'){
       overlay.setAttribute('visibility','hidden');tip.hidden=true;
       window.__injcEtfSelectedTradeTime=null;
       selection=-1;
     }
   });
   svg.addEventListener('keydown',e=>{
     if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
     e.preventDefault();
     pick(Math.max(0,Math.min(actual.length-1,(selection<0?actual.length-1:selection)+(e.key==='ArrowLeft'?-1:1))));
   });
   svg.addEventListener('blur',()=>{
     overlay.setAttribute('visibility','hidden');tip.hidden=true;selection=-1;
   });
   const stored=window.__injcEtfSelectedTradeTime;
   if(Number.isFinite(stored)){
     const index=actual.findIndex(p=>p.time===stored);
     if(index>=0)pick(index);
   }
 };
})();
