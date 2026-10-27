/* INJ Node boot field: lightweight random floating micro-markets, no timers,
   no data calls, no synthetic prices and no impact outside the boot overlay. */
(()=>{
 'use strict';
 const splash=document.getElementById('bootSplash');
 const field=document.getElementById('nodeAmbientField');
 if(!splash||!field||document.documentElement.dataset.returnHome==='1')return;
 // Each launch varies gently while preserving a clear center for INJ NODE.
 const labels=['INJ','APR','TVL','MCAP','STAKING','LIVE','NETWORK','SYNC'];
 const rand=(a,b)=>a+Math.random()*(b-a);
 const points=[];
 for(let i=0;i<28;i++){
  const angle=(i+.28+Math.random()*.44)/28*Math.PI*2;
  const radiusX=rand(24,46),radiusY=rand(23,43);
  const x=50+Math.cos(angle)*radiusX;
  const y=50+Math.sin(angle)*radiusY;
  // Keep the safe area and the focal headline clear.
  if(Math.abs(x-50)<20&&Math.abs(y-50)<17)continue;
  points.push({x:Math.max(6,Math.min(94,x)),y:Math.max(9,Math.min(91,y))});
 }
 const frag=document.createDocumentFragment();
 points.forEach((point,i)=>{
  const node=document.createElement('span');
  node.className='node-ambient-element';
  node.setAttribute('aria-hidden','true');
  node.style.setProperty('--ambient-x',point.x.toFixed(2)+'%');
  node.style.setProperty('--ambient-y',point.y.toFixed(2)+'%');
  node.style.setProperty('--ambient-dx',rand(-13,13).toFixed(1)+'px');
  node.style.setProperty('--ambient-dy',rand(-13,13).toFixed(1)+'px');
  node.style.setProperty('--ambient-duration',rand(2.4,4.7).toFixed(2)+'s');
  node.style.setProperty('--ambient-delay',(-rand(0,3.8)).toFixed(2)+'s');
  node.style.setProperty('--ambient-opacity',rand(.26,.70).toFixed(2));
  const type=i%7===0?'ticker':i%6===0?'line':i%5===0?'cross':'dot';
  if(type==='ticker'){
   node.classList.add('is-ticker');
   node.textContent=labels[i%labels.length];
   node.dataset.hideMobile=i%2===0?'true':'false';
  }else if(type==='line'){
   node.classList.add('is-line');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 30 12');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d','M1 10 L6 7 L11 9 L17 2 L22 5 L29 1');
   svg.appendChild(path);node.appendChild(svg);
   node.dataset.hideMobile=i%2===0?'true':'false';
  }else if(type==='cross'){
   node.classList.add('is-cross');
   node.dataset.hideMobile=i%2===0?'true':'false';
  }else{
   node.classList.add('node-ambient-dot');
   if(i%4===0)node.classList.add('large');
  }
  frag.appendChild(node);
 });
 field.appendChild(frag);
})();
