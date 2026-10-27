/* INJ Node · Potential Value: interactive staking growth forecast.
 * Separate from the original price simulator and APR fetcher. Never writes balances. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const SCOPE_KEY='inj_node_growth_scope_v1';
const MODE_KEY='inj_node_growth_mode_v1';
const YEARS_KEY='inj_node_growth_years_v1';
const DAYS=365, W=760, H=300, L=70, R=19, T=13, B=38;
const SVG_NS='http://www.w3.org/2000/svg';
const COMPOUND='#25c69b', SIMPLE='#e2a56e';
const OPTIONS=[1,2,3,5,7,10,15,20,25,30];
const read=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(_){}};
const en=()=>read('inj_node_language_v1')==='en';
const format=(n,min=2,max=2)=>new Intl.NumberFormat(en()?'en-US':'it-IT',{minimumFractionDigits:min,maximumFractionDigits:max}).format(n);
const unit=n=>format(n,2,2)+' INJ';
const updateText=(id,value)=>{const target=$(id);if(target&&target.textContent!==value)target.textContent=value};
const yearLabel=t=>format(t,0,1)+' '+(en()?(t===1?'year':'years'):(t===1?'anno':'anni'));
const storedYears=Number(read(YEARS_KEY));
let years=OPTIONS.includes(storedYears)?storedYears:10;
let scope=read(SCOPE_KEY)==='all'?'all':'selected';
let mode=read(MODE_KEY)==='simple'?'simple':'compound';
let previousKey='';
let pointYears=years;
let chartRefs=null;
let currentRows=[];
let currentPrice=NaN;

function num(value){const n=Number(value);return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(n)&&n>=0?n:NaN}
function parsePrice(value){
 const str=String(value||'').trim().replace(/[\s\u00a0\u202f€$]/g,'');
 if(!str||!/^[\d.,]+$/.test(str))return NaN;
 const d=str.lastIndexOf('.'),c=str.lastIndexOf(',');
 let clean=str;
 if(d>=0&&c>=0){const sep=d>c?'.':',';clean=str.split(sep==='.'?',':'.').join('').replace(sep,'.')}
 else if((str.match(/[.,]/g)||[]).length>1){const p=Math.max(d,c);clean=str.slice(0,p).replace(/[.,]/g,'')+'.'+str.slice(p+1)}
 else clean=str.replace(',','.');
 return num(clean);
}
function money(n){
 const c=read('inj_monitor_currency')==='EUR'?'EUR':'USD';
 return new Intl.NumberFormat(c==='EUR'?'it-IT':'en-US',{style:'currency',currency:c,minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
}
function colorValue(n){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=10000?(n/1000).toFixed(1)+'k':format(n,0,0)}
function getData(){try{return window.INJ_POTENTIAL_COMPOUND_DATA?.()||null}catch(e){return null}}
function valid(row){return !!row&&Number.isFinite(row.staked)&&row.staked>=0&&(row.staked===0||(Number.isFinite(row.apr)&&row.apr>=0&&row.apr<=100))}
function amountAt(rows,t,reinvest){
 return rows.reduce((sum,r)=>sum+(reinvest
  ?r.staked*Math.pow(1+r.apr/100/DAYS,DAYS*t)
  :r.staked*(1+r.apr/100*t)),0);
}
function dailyAt(rows,t,reinvest){
 return rows.reduce((sum,r)=>{
  const multiplier=reinvest?Math.pow(1+r.apr/100/DAYS,DAYS*t):1;
  return sum+r.staked*multiplier*r.apr/100/DAYS;
 },0);
}
function create(type,attrs,parent){
 const node=document.createElementNS(SVG_NS,type);
 for(const [k,v] of Object.entries(attrs||{}))node.setAttribute(k,String(v));
 if(parent)parent.appendChild(node);
 return node;
}
function paintChart(rows){
 const svg=$('wealthGrowthPlot');
 if(!svg)return;
 svg.replaceChildren();
 const x=t=>L+(W-L-R)*t/years;
 const start=amountAt(rows,0,false),end=amountAt(rows,years,true);
 const rise=Math.max(end-start,start*.05,.5);
 const min=Math.max(0,start-rise*.23);
 const max=end+rise*.13;
 const y=v=>T+(H-T-B)*(1-(v-min)/(max-min));
 for(let index=0;index<=4;index++){
  const level=min+(max-min)*index/4,yy=y(level);
  create('line',{x1:L,y1:yy,x2:W-R,y2:yy,class:'wealth-growth-gridline'},svg);
  create('text',{x:L-10,y:yy+4.5,'text-anchor':'end',class:'wealth-growth-tick'},svg).textContent=colorValue(level);
 }
 const steps=Math.max(140,years*20);
 function plot(reinvest,c,active){
  let d='';
  for(let i=0;i<=steps;i++){
   const t=years*i/steps;
   d+=(i?'L':'M')+x(t).toFixed(2)+' '+y(amountAt(rows,t,reinvest)).toFixed(2)+' ';
  }
  create('path',{d,stroke:c,fill:'none',opacity:active?1:.76,'stroke-linecap':'round','stroke-linejoin':'round','stroke-width':active?3.5:2.5,class:'wealth-growth-series'},svg);
 }
 plot(false,SIMPLE,mode==='simple');
 plot(true,COMPOUND,mode==='compound');
 for(const t of [0,years/2,years]){
  create('text',{x:x(t),y:H-7,'text-anchor':t===0?'start':t===years?'end':'middle',class:'wealth-growth-tick'},svg).textContent=
   t===0?(en()?'Today':'Oggi'):'+'+yearLabel(t);
 }
 const cursor=create('line',{x1:0,x2:0,y1:T,y2:H-B,class:'wealth-growth-cursor'},svg);
 const simpleDot=create('circle',{r:4,fill:SIMPLE,stroke:'var(--bg)','stroke-width':1.3},svg);
 const compoundDot=create('circle',{r:4.5,fill:COMPOUND,stroke:'var(--bg)','stroke-width':1.3},svg);
 // Overlay is transparent: pointer events are supported on both iPhone and desktop.
 create('rect',{x:L,y:T,width:W-L-R,height:H-T-B,class:'wealth-growth-hit'},svg);
 chartRefs={svg,x,y,cursor,simpleDot,compoundDot};
 svg.setAttribute('aria-label',en()
  ?'Interactive comparison. Drag, touch or use arrow keys to inspect INJ per day over time.'
  :'Confronto interattivo. Trascina, tocca o usa le frecce per vedere gli INJ al giorno.');
 updatePoint(rows);
}
function updatePoint(rows){
 if(!chartRefs)return;
 const t=Math.max(0,Math.min(years,pointYears));
 const simple=amountAt(rows,t,false),compound=amountAt(rows,t,true);
 const simpleDaily=dailyAt(rows,t,false),compoundDaily=dailyAt(rows,t,true);
 const cx=chartRefs.x(t);
 chartRefs.cursor.setAttribute('x1',cx);
 chartRefs.cursor.setAttribute('x2',cx);
 chartRefs.simpleDot.setAttribute('cx',cx);
 chartRefs.simpleDot.setAttribute('cy',chartRefs.y(simple));
 chartRefs.compoundDot.setAttribute('cx',cx);
 chartRefs.compoundDot.setAttribute('cy',chartRefs.y(compound));
 updateText('wealthGrowthPointTime',t===0?(en()?'Today':'Oggi'):'+'+yearLabel(t));
 updateText('wealthGrowthPointHint',en()?'Drag on chart to inspect any year':'Trascina sul grafico per esplorare gli anni');
 updateText('wealthGrowthPointSimpleDaily',format(simpleDaily,5,5)+' INJ/'+(en()?'day':'giorno'));
 updateText('wealthGrowthPointCompoundDaily',format(compoundDaily,5,5)+' INJ/'+(en()?'day':'giorno'));
 updateText('wealthGrowthPointSimpleTotal',unit(simple));
 updateText('wealthGrowthPointCompoundTotal',unit(compound));
}
function pointerAt(event){
 if(!chartRefs||!currentRows.length||read('inj_monitor_privacy')==='1')return;
 const rect=chartRefs.svg.getBoundingClientRect();
 const clientRatio=(event.clientX-rect.left)/rect.width;
 const proportion=Math.max(0,Math.min(1,(clientRatio*W-L)/(W-L-R)));
 pointYears=proportion*years;
 updatePoint(currentRows);
}
function render(){
 const source=getData(),rows=Array.isArray(source?.rows)?source.rows:[];
 const selected=rows.find(r=>r.address===source?.selected);
 const relevant=scope==='all'?rows:selected?[selected]:[];
 const complete=relevant.length>0&&relevant.every(valid);
 const privateOn=read('inj_monitor_privacy')==='1';
 const shownPrice=parsePrice($('wealthPrice')?.value);
 const ccy=read('inj_monitor_currency')==='EUR'?'EUR':'USD';
 const key=JSON.stringify({rows:relevant.map(r=>[r.address,r.staked,r.apr]),selected:source?.selected,
  size:rows.length,years,scope,mode,privateOn,price:shownPrice,currency:ccy,language:en()});
 if(key===previousKey)return;
 previousKey=key;
 const concealed=privateOn?'••••••':'—';
 updateText('wealthGrowthTitle',en()?'STAKING GROWTH':'CRESCITA DELLO STAKING');
 updateText('wealthGrowthSelectedScope',en()?'Selected wallet':'Wallet selezionato');
 updateText('wealthGrowthAllScope',en()?'All wallets':'Tutti i wallet');
 updateText('wealthGrowthPeriodLabel',en()?'PERIOD':'PERIODO');
 updateText('wealthGrowthCompoundMode',en()?'Reinvest daily':'Reinvesti ogni giorno');
 updateText('wealthGrowthSimpleMode',en()?'Do not reinvest':'Non reinvestire');
 updateText('wealthGrowthCompoundLabel',en()?'Daily compound':'Compound giornaliero');
 updateText('wealthGrowthSimpleLabel',en()?'Without compound':'Senza compound');
 updateText('wealthGrowthExtraLabel',en()?'EXTRA INJ WITH COMPOUND':'INJ EXTRA CON COMPOUND');
 updateText('wealthGrowthFinalLabel',en()?'SELECTED SCENARIO':'SCENARIO SELEZIONATO');
 updateText('wealthGrowthDailyLabel',en()?'DAILY INJ AT PERIOD END':'INJ AL GIORNO A FINE PERIODO');
 updateText('wealthGrowthStartLabel',en()?'STARTING STAKE':'STAKING INIZIALE');
 updateText('wealthGrowthPointSimpleLabel',en()?'Without compound':'Senza compound');
 updateText('wealthGrowthPointCompoundLabel',en()?'With compound':'Con compound');
 updateText('wealthGrowthNote',en()
  ?'Illustrative projection with unchanged net APR, 365 days per year, no extra deposits, fees or taxes. Without reinvestment, rewards are outside staking but included in the totals. Hypothetical INJ price stays constant.'
  :'Proiezione indicativa con APR netto costante, 365 giorni/anno, senza aggiunte, commissioni o imposte. Senza reinvestire, i reward restano fuori dallo staking ma sono inclusi nel totale. Prezzo INJ ipotetico costante.');
 $('wealthGrowthYears').value=String(years);
 for(const btn of document.querySelectorAll('[data-growth-scope]'))btn.setAttribute('aria-pressed',String(scope===btn.dataset.growthScope));
 for(const btn of document.querySelectorAll('[data-growth-mode]'))btn.setAttribute('aria-pressed',String(mode===btn.dataset.growthMode));
 updateText('wealthGrowthSource',scope==='all'
  ?(en()?rows.length+' wallets from Dashboard':rows.length+' wallet dalla Dashboard')
  :selected?.label||(en()?'Select a wallet in Home':'Seleziona un wallet dalla Home'));
 const status=$('wealthGrowthStatus');
 if(privateOn)status.textContent=en()?'PRIVACY ON':'PRIVACY ATTIVA';
 else if(!relevant.length)status.textContent=en()?'NO WALLET':'NESSUN WALLET';
 else if(!complete)status.textContent=(en()?'APR/DATA PENDING ':'APR/DATI IN ATTESA ')+relevant.filter(valid).length+'/'+relevant.length;
 else{
  const staked=relevant.reduce((sum,r)=>sum+r.staked,0);
  const effective=staked>0?relevant.reduce((sum,r)=>sum+r.staked*r.apr,0)/staked:0;
  status.textContent=(en()?'NET APR ':'APR NETTO ')+format(effective,3,3)+'%';
 }
 if(privateOn||!complete){
  $('wealthGrowthPlot').replaceChildren();
  chartRefs=null;
  currentRows=[];
  $('wealthGrowthEmpty').hidden=false;
  updateText('wealthGrowthEmpty',privateOn
   ?(en()?'Values hidden in privacy mode.':'Valori nascosti dalla modalità Privacy.')
   :(en()?'Waiting for real staking balances and validator APR.':'In attesa dei saldi staking e dell’APR netto dei validatori.'));
  ['wealthGrowthCompoundValue','wealthGrowthSimpleValue','wealthGrowthExtra','wealthGrowthFinal',
    'wealthGrowthDaily','wealthGrowthStart','wealthGrowthCompoundFiat','wealthGrowthSimpleFiat',
    'wealthGrowthPointSimpleDaily','wealthGrowthPointCompoundDaily',
    'wealthGrowthPointSimpleTotal','wealthGrowthPointCompoundTotal'].forEach(id=>updateText(id,concealed));
  $('wealthGrowthCompoundBar').style.width='0%';
  $('wealthGrowthSimpleBar').style.width='0%';
  return;
 }
 $('wealthGrowthEmpty').hidden=true;
 currentRows=relevant;
 const start=amountAt(relevant,0,false);
 const simple=amountAt(relevant,years,false);
 const compound=amountAt(relevant,years,true);
 const chosen=mode==='compound'?compound:simple;
 const daily=dailyAt(relevant,years,mode==='compound');
 updateText('wealthGrowthStart',unit(start));
 updateText('wealthGrowthCompoundValue',unit(compound));
 updateText('wealthGrowthSimpleValue',unit(simple));
 updateText('wealthGrowthExtra','+'+unit(Math.max(0,compound-simple)));
 updateText('wealthGrowthFinal',unit(chosen));
 updateText('wealthGrowthDaily',format(daily,5,5)+' INJ');
 updateText('wealthGrowthCompoundFiat',Number.isFinite(shownPrice)?money(compound*shownPrice):'');
 updateText('wealthGrowthSimpleFiat',Number.isFinite(shownPrice)?money(simple*shownPrice):'');
 $('wealthGrowthSimpleBar').style.width=Math.min(100,simple/Math.max(compound,simple,1)*100)+'%';
 $('wealthGrowthCompoundBar').style.width=Math.min(100,compound/Math.max(compound,simple,1)*100)+'%';
 if(!Number.isFinite(pointYears)||pointYears>years)pointYears=years;
 paintChart(relevant);
}
document.querySelectorAll('[data-growth-scope]').forEach(button=>button.addEventListener('click',()=>{
 scope=button.dataset.growthScope==='all'?'all':'selected';save(SCOPE_KEY,scope);render();
}));
document.querySelectorAll('[data-growth-mode]').forEach(button=>button.addEventListener('click',()=>{
 mode=button.dataset.growthMode==='simple'?'simple':'compound';save(MODE_KEY,mode);render();
}));
$('wealthGrowthYears')?.addEventListener('change',event=>{
 const next=Number(event.target.value);
 if(OPTIONS.includes(next)){
  years=next;pointYears=years;save(YEARS_KEY,years);render();
 }
});
$('wealthGrowthPlot')?.addEventListener('pointermove',pointerAt);
$('wealthGrowthPlot')?.addEventListener('pointerdown',pointerAt);
$('wealthGrowthPlot')?.addEventListener('keydown',event=>{
 if(!currentRows.length)return;
 const delta=Math.max(.05,years/100);
 if(event.key==='ArrowLeft')pointYears=Math.max(0,pointYears-delta);
 else if(event.key==='ArrowRight')pointYears=Math.min(years,pointYears+delta);
 else if(event.key==='Home')pointYears=0;
 else if(event.key==='End')pointYears=years;
 else return;
 event.preventDefault();updatePoint(currentRows);
});
$('wealthPrice')?.addEventListener('input',render);
window.addEventListener('storage',render);
window.addEventListener('pageshow',()=>{previousKey='';render()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){previousKey='';render()}});
render();
setInterval(()=>{if(!document.hidden)render()},3500);
})();