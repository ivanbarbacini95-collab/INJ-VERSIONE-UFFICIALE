/* INJ Node · Home Circuit Network
   Adapts the approved branching-line concept to actual launcher positions.
   SVG remains entirely decorative and does not intercept clicks, gestures,
   scrolling, keyboard navigation or PWA navigation. */
(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const init=()=>{
  const host=document.querySelector('#entryGate .entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44');
  if(!host||host.dataset.circuitBound==='1')return;
  host.dataset.circuitBound='1';

  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('class','inj-home-circuit');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('role','presentation');
  svg.style.pointerEvents='none';
  host.appendChild(svg);

  const fixed=n=>Number(n).toFixed(2);
  let scheduled=false;
  let lastSignature='';
  const measure=()=>{
    scheduled=false;
    if(!host.isConnected)return;
    const base=host.getBoundingClientRect();
    const width=Math.round(host.clientWidth);
    const height=Math.round(host.clientHeight);
    const tiles=[...host.children].filter(el=>
      el.classList?.contains('entry-action')&&el.id!=='entryTreasuryButton'
    ).map(el=>{
      const r=el.getBoundingClientRect();
      return {
        left:r.left-base.left,right:r.right-base.left,
        top:r.top-base.top,bottom:r.bottom-base.top,
        width:r.width,height:r.height
      };
    }).filter(t=>t.width>40&&t.height>34&&Number.isFinite(t.top))
      .sort((a,b)=>a.top-b.top||a.left-b.left);

    if(width<210||height<200||tiles.length<6){
      svg.replaceChildren();
      svg.style.display='none';
      host.classList.remove('inj-circuit-ready');
      lastSignature='';
      return;
    }

    const rows=[];
    for(const item of tiles){
      const row=rows[rows.length-1];
      if(row&&Math.abs(row.top-item.top)<12){
        row.items.push(item);
        row.top=Math.min(row.top,item.top);
        row.bottom=Math.max(row.bottom,item.bottom);
      }else rows.push({top:item.top,bottom:item.bottom,items:[item]});
    }
    if(rows.length<3){
      host.classList.remove('inj-circuit-ready');
      svg.replaceChildren();
      return;
    }
    // Mobile/tablet: two cards per row. Wide monitors can have a single
    // launcher per row, so use a slim side conductor instead of a fake grid.
    const twoColumns=rows.filter(r=>r.items.length===2).length>=Math.max(2,rows.length-2);
    const mid=twoColumns?width/2:Math.min(15,Math.max(9,width*.021));
    const margin=Math.max(7,Math.min(17,width*.027));
    const first=rows[0],last=rows[rows.length-1];
    const start=Math.max(3,first.top+7);
    const finish=Math.min(height-3,last.bottom-7);
    if(!(finish-start>110))return;

    const junctions=[];
    for(let i=0;i<rows.length-1;i++){
      const gap=rows[i+1].top-rows[i].bottom;
      if(gap<2||gap>95)continue;
      const y=rows[i].bottom+gap/2;
      if(y<=start+6||y>=finish-6)continue;
      junctions.push({y,index:i,delay:Math.max(.45,(y-start)/(finish-start)*7.8)});
    }
    if(junctions.length<2){
      svg.replaceChildren();
      host.classList.remove('inj-circuit-ready');
      return;
    }

    const signature=[width,height,twoColumns?2:1,
      ...junctions.map(j=>Math.round(j.y)),
      Math.round(mid)].join(':');
    if(signature===lastSignature)return;
    lastSignature=signature;

    const mainD=`M ${fixed(mid)} ${fixed(start)} L ${fixed(mid)} ${fixed(finish)}`;
    const lines=[`<path class="inj-circuit-wire inj-circuit-wire-main" d="${mainD}"/>`];
    const beams=[
      `<path class="inj-circuit-beam-aura" d="${mainD}" pathLength="100"/>`,
      `<path class="inj-circuit-beam inj-circuit-beam-main" d="${mainD}" pathLength="100"/>`
    ];
    const nodes=[];
    for(const j of junctions){
      const y=fixed(j.y),cx=fixed(mid),delay=fixed(j.delay);
      let branches=[];
      if(twoColumns){
        const shoulder=Math.min(47,Math.max(26,width*.098));
        const bend=Math.min(10,Math.max(3,(rows[j.index+1].top-rows[j.index].bottom)*.75));
        branches=[
          `M ${cx} ${y} C ${fixed(mid-13)} ${fixed(j.y+bend)} ${fixed(mid-28)} ${y} ${fixed(mid-shoulder)} ${y} L ${fixed(margin)} ${y}`,
          `M ${cx} ${y} C ${fixed(mid+13)} ${fixed(j.y+bend)} ${fixed(mid+28)} ${y} ${fixed(mid+shoulder)} ${y} L ${fixed(width-margin)} ${y}`
        ];
      }else{
        // Compact but continuous alternative for one-column desktop menus.
        branches=[`M ${cx} ${y} Q ${fixed(mid+18)} ${fixed(j.y+5)} ${fixed(mid+36)} ${y} L ${fixed(width-margin)} ${y}`];
      }
      for(const d of branches){
        lines.push(`<path class="inj-circuit-wire" d="${d}"/>`);
        beams.push(`<path class="inj-circuit-beam inj-circuit-beam-branch" d="${d}" pathLength="100" style="--inj-circuit-delay:${delay}s"/>`);
      }
      nodes.push(`<circle class="inj-circuit-node-halo" cx="${cx}" cy="${y}" r="3.5"/>`);
      nodes.push(`<circle class="inj-circuit-node-core" cx="${cx}" cy="${y}" r="1.4"/>`);
      nodes.push(`<circle class="inj-circuit-node-aura" cx="${cx}" cy="${y}" r="7" style="--inj-circuit-delay:${delay}s"/>`);
      nodes.push(`<circle class="inj-circuit-node-signal" cx="${cx}" cy="${y}" r="2.4" style="--inj-circuit-delay:${delay}s"/>`);
    }
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.innerHTML=lines.join('')+beams.join('')+nodes.join('');
    svg.style.display='';
    svg.classList.toggle('inj-circuit-paused',document.hidden);
    host.classList.add('inj-circuit-ready');
  };

  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(measure);
  };
  schedule();
  if(typeof ResizeObserver==='function'){
    const resize=new ResizeObserver(schedule);
    resize.observe(host);
    // Different text lengths and viewport changes can resize individual rows
    // without changing the overall grid width.
    for(const el of host.querySelectorAll(':scope > .entry-action')){
      resize.observe(el);
    }
  }
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  window.addEventListener('orientationchange',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    svg.classList.toggle('inj-circuit-paused',document.hidden);
    if(!document.hidden)schedule();
  });
  document.fonts?.ready?.then(schedule).catch(()=>{});
  const shell=host.closest('.entry-gate-shell');
  if(shell&&typeof MutationObserver==='function'){
    const mutation=new MutationObserver(schedule);
    mutation.observe(shell,{attributes:true,attributeFilter:['class']});
  }
 };
 const start=()=>{
   if(document.querySelector('#entryGate .entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44')){
     init();return;
   }
   // On first access the shell acquires its returning-user class after
   // addresses are configured; the overlay should start only then.
   const gate=document.getElementById('entryGate');
   if(!gate||typeof MutationObserver!=='function')return;
   const observer=new MutationObserver(()=>{
     if(document.querySelector('#entryGate .entry-gate-shell:not(.first-access) > .entry-actions.entry-flat-v44')){
       observer.disconnect();init();
     }
   });
   observer.observe(gate,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
