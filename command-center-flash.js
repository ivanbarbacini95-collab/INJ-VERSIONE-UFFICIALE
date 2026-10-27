/* INJ Node — Flash Terminal composition.
   Reuses the real Command Center live nodes, chart canvases and update engine.
   Does not poll a second market/wallet feed or replace the original engine. */
(function(){
 'use strict';
 var root=document.getElementById('commandCenter');
 var main=root&&root.querySelector('.cc-main');
 var market=main&&main.querySelector('.cc-market-stage');
 var controls=market&&market.querySelector('.cc-chart-tools');
 var select=document.getElementById('ccMainRange');
 if(!root||!main||!market||!controls||!select)return;
 document.body.classList.add('cc-flash-terminal');

 var strip=document.createElement('section');
 strip.className='cc-flash-strip';
 strip.setAttribute('aria-label','Indicatori rapidi del wallet selezionato');
 var fields=[
  {label:'STAKING',id:'ccStaked'},
  {label:'APR NETTO',id:'ccApr'},
  {label:'REWARD / GIORNO',id:'ccDailyReward'},
  {label:'P/L 24H · STIMA',id:'ccDailyPnl'}
 ];
 fields.forEach(function(field){
  var source=document.getElementById(field.id);
  if(!source)return;
  var metric=document.createElement('div');
  metric.className='cc-flash-metric';
  var label=document.createElement('span');
  label.textContent=field.label;
  var value=document.createElement('div');
  value.className='cc-flash-value';
  value.appendChild(source); // Same native ID: one live value, no duplicate.
  metric.append(label,value);
  strip.appendChild(metric);
  if(field.id==='ccDailyPnl'){
   source.classList.add('private');
   try{
    if(localStorage.getItem('inj_monitor_privacy')==='1'){
     source.classList.add('privacy-on');
    }
   }catch(_){}
  }
 });
 main.insertBefore(strip,main.querySelector('.cc-data-stage'));

 var tf=document.createElement('div');
 tf.className='cc-flash-timeframes';
 tf.setAttribute('role','group');
 tf.setAttribute('aria-label','Intervallo del grafico live');
 var frames=[
  ['m1','1m','1 minuto'],['m5','5m','5 minuti'],['m10','10m','10 minuti'],
  ['h1','1H','1 ora'],['h3','3H','3 ore'],['h6','6H','6 ore'],
  ['h12','12H','12 ore'],['d1','1G','1 giorno'],['d3','3G','3 giorni'],
  ['w1','1S','1 settimana'],['mo1','1M','1 mese'],
  ['y1','1Y','1 anno'],['all','TUTTO','Dalla prima quotazione disponibile di INJ/USDT']
 ];
 var buttons=[];
 frames.forEach(function(pair){
  var b=document.createElement('button');
  b.type='button';
  b.dataset.range=pair[0];
  b.textContent=pair[1];
  b.title='Mostra storico: '+pair[2];
  b.setAttribute('aria-label','Grafico '+pair[2]);
  b.addEventListener('click',function(){
   if(select.value===pair[0])return;
   select.value=pair[0];
   select.dispatchEvent(new Event('change',{bubbles:true}));
   syncButtons();
  });
  tf.appendChild(b);
  buttons.push(b);
 });
 function syncButtons(){
  var current=select.value;
  buttons.forEach(function(b){
   b.setAttribute('aria-pressed',String(b.dataset.range===current));
  });
  // Keep the native draw loop on ONE visible chart; comparison canvases are
  // excluded rather than silently rendered off-screen every 32 ms.
  root.querySelectorAll('.cc-chart').forEach(function(card){
   card.hidden=card.id!=='ccHistoryChart';
  });
 }
 controls.insertBefore(tf,select);
 select.addEventListener('change',syncButtons);
 window.addEventListener('resize',syncButtons,{passive:true});
 syncButtons();

 // Existing chart update loop remains native. Let its canvas recalculate once
 // the legacy comparison charts are removed from the visible grid.
 try{
  window.requestAnimationFrame(function(){
   window.dispatchEvent(new Event('resize'));
  });
 }catch(_){}
})();
