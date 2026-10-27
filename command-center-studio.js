/* INJ Node Command Center Studio — workspace presets + shared live data, no duplicated wallet feed. */
(function(){
'use strict';
if(document.documentElement.dataset.injPage!=='command-center')return;
var legacy=document.getElementById('commandCenter');
var chartSection=legacy&&legacy.querySelector('.cc-market-stage');
if(!legacy||!chartSection)return;
var STORAGE='inj_node_cc_studio_presets_v2';
var defs=[
 ['chart','Live Charts','Grafico INJ/USDT originale','XL'],
 ['ticker','Prezzo INJ','Prezzo live e performance 24h','L'],
 ['networth','Net Worth','Patrimonio wallet selezionato','M'],
 ['pnl','P/L Wallet','Performance sul prezzo medio','M'],
 ['daily','P/L 24H','Movimento giornaliero stimato','M'],
 ['staking','Staking','Delegato, APR e quota','M'],
 ['rewards','Live Rewards','Reward e produzione prevista','M'],
 ['wallet','Wallet','Disponibile e delegazioni','M'],
 ['market','Range di mercato','Massimo e minimo INJ 24h','M'],
 ['validators','Validatori','Delegazioni dal wallet','M'],
 ['orderbook','Order Book','Migliori ordini INJ/USDT Binance','M'],
 ['timeline','Performance Timeline','Storico P/L salvato','M'],
 ['potential','Valore Potenziale','Simulatore del wallet','M'],
 ['converter','INJ Converter','Controvalore INJ immediato','S'],
 ['treasury','INJ Treasury','Aggregato dei wallet salvati','L'],
 ['marketlist','Crypto Market','Principali asset di mercato','M'],
 ['network','Stato live','Rete, feed, aggiornamento','S']
];
var byId=Object.fromEntries(defs.map(function(x){return [x[0],{id:x[0],name:x[1],desc:x[2],size:x[3]}]}));
/* A new Command Center must start with a blank canvas, not an imposed desk. */
var defaults=[{id:'workspace',name:'Il mio workspace',items:[]}];
function normalized(items){
 var seen=new Set();
 return (Array.isArray(items)?items:[]).slice(0,18).map(function(row){
  var id=Array.isArray(row)?row[0]:row&&row.id;
  var size=Array.isArray(row)?row[1]:row&&row.size;
  if(!byId[id]||seen.has(id))return null;
  seen.add(id);
  return {id:id,size:['S','M','L','XL'].includes(size)?size:byId[id].size};
 }).filter(Boolean);
}
var builtins=defaults.map(function(p){return {id:p.id,name:p.name,items:normalized(p.items)}});
function read(){
 try{
  var obj=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(!obj||!Array.isArray(obj.presets))return null;
  var ids=new Set();
  var presets=obj.presets.slice(0,40).map(function(p){
   var id=String(p.id||'').slice(0,64),name=String(p.name||'').trim().slice(0,38);
   if(!id||!name||ids.has(id))return null;
   ids.add(id);return {id:id,name:name,items:normalized(p.items)};
  }).filter(Boolean);
  return presets.length?{presets:presets,active:presets.some(function(p){return p.id===obj.active})?obj.active:presets[0].id}:null;
 }catch(_){return null}
}
/* Keep previous user-created presets available without carrying over the busy
   preloaded Trading/Wealth/Wall desks. The first launch is always empty. */
function migrateLegacy(){
 try {
  var old=JSON.parse(localStorage.getItem('inj_node_cc_studio_presets_v1')||'null');
  if(!old||!Array.isArray(old.presets))return null;
  var seen=new Set(['workspace']),saved=[];
  old.presets.forEach(function(p){
   var id=String(p.id||'').slice(0,64),name=String(p.name||'').trim().slice(0,38);
   if(!id||!name||seen.has(id)||['trading','wealth','wall'].includes(id))return;
   seen.add(id);saved.push({id:id,name:name,items:normalized(p.items)});
  });
  return {presets:[{id:'workspace',name:'Il mio workspace',items:[]}].concat(saved.slice(0,39)),active:'workspace'};
 }catch(_){return null}
}
var doc=read()||migrateLegacy()||{presets:builtins,active:'workspace'};
var editing=false,sidebar=false,modalMode='',dragged='',selectedCurrency='';
var liveData={depth:null,depthAt:0,market:null,marketAt:0};
var simValue=localStorage.getItem('inj_node_cc_studio_sim_value_v1')||'',converterValue=localStorage.getItem('inj_node_cc_studio_converter_v1')||'100';
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(doc))}catch(_){}}
function active(){return doc.presets.find(function(p){return p.id===doc.active})||doc.presets[0]}
function currency(){try{return localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD'}catch(_){return 'USD'}}
function fx(){var x=Number(localStorage.getItem('inj_monitor_eur_rate'));var fallback=typeof state!=='undefined'?Number(state.eur):NaN;return x>0&&x<10?x:fallback>0&&fallback<10&&Math.abs(fallback-1)>.00001?fallback:NaN}
function n(v){var x=Number(v);return Number.isFinite(x)?x:0}
function fmt(v,d){return new Intl.NumberFormat('it-IT',{maximumFractionDigits:d===undefined?4:d}).format(n(v))}
function money(usd,decimals){var eur=currency()==='EUR';var rate=eur?fx():1;if(!(rate>0))return '—';return new Intl.NumberFormat(eur?'it-IT':'en-US',{style:'currency',currency:eur?'EUR':'USD',maximumFractionDigits:decimals===undefined?2:decimals,minimumFractionDigits:2}).format(n(usd)*rate)}
function selectedState(){return typeof state!=='undefined'?state:null}
function privateOn(){try{return localStorage.getItem('inj_monitor_privacy')==='1'}catch(_){return false}}
function esc(str){return String(str).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var studio=document.createElement('div');
studio.className='cc-studio';studio.id='ccStudio';
studio.innerHTML='<header class="cc-studio-toolbar">'+
 '<button class="cc-studio-back" type="button" data-action="back" aria-label="Torna alla Home">‹</button>'+
 '<div class="cc-studio-brand"><strong>INJ NODE</strong><span>COMMAND CENTER</span></div>'+
 '<div class="cc-studio-divider"></div>'+
 '<select class="cc-studio-preset" id="ccStudioPreset" aria-label="Preset salvato"></select>'+
 '<span class="cc-studio-status" id="ccStudioStatus">SYNC</span>'+
 '<span class="cc-studio-spacer"></span>'+
 '<button class="cc-studio-action primary" data-action="add" title="Scegli quali moduli inserire">+ Moduli</button>'+
 '<button class="cc-studio-action" data-action="edit" title="Riordina e ridimensiona i moduli">Organizza</button>'+
 '<button class="cc-studio-action" data-action="new" title="Crea un workspace vuoto">Nuovo</button>'+
 '<button class="cc-studio-action" data-action="duplicate" title="Salva una copia di questo preset">Salva come</button>'+
 '<details class="cc-studio-more"><summary aria-label="Altre opzioni" title="Altre opzioni">···</summary>'+
 '<div class="cc-studio-more-menu">'+
 '<button class="cc-studio-action" data-action="edit">Organizza moduli</button>'+ 
 '<button class="cc-studio-action" data-action="new">Nuovo workspace vuoto</button>'+ 
 '<button class="cc-studio-action" data-action="rename">Rinomina preset</button>'+
 '<button class="cc-studio-action" data-action="delete">Elimina preset</button>'+
 '<button class="cc-studio-action" data-action="export">Esporta preset</button>'+
 '<button class="cc-studio-action" data-action="import">Importa preset</button>'+
 '</div></details>'+
 '</header>'+
 '<main class="cc-studio-stage" id="ccStudioStage"><div class="cc-studio-grid" id="ccStudioGrid"></div></main>'+
 '<footer class="cc-studio-footer"><span id="ccStudioFooter">Dati live INJ Node · dati aggregati da snapshot</span><span>INJ Node by B Capital Group</span></footer>'+
 '<div class="cc-studio-shade" id="ccStudioShade" hidden></div>'+
 '<aside class="cc-studio-sidebar" id="ccStudioSidebar" aria-label="Libreria dei moduli" hidden>'+
 '<div class="cc-studio-sidebar-header"><h2>Libreria moduli</h2><button data-action="close-library" aria-label="Chiudi">✕</button></div>'+
 '<p>Seleziona le informazioni da mostrare. Disponi i moduli trascinandoli o usando le frecce.</p>'+
 '<div class="cc-studio-catalog" id="ccStudioCatalog"></div></aside>'+
 '<dialog class="cc-studio-modal" id="ccStudioModal"><form id="ccStudioForm">'+
 '<h2 id="ccStudioModalTitle">Salva preset</h2>'+
 '<p id="ccStudioModalInfo">La configurazione rimane salvata su questo dispositivo.</p>'+
 '<label>Nome del preset<input id="ccStudioName" maxlength="38" required autocomplete="off"></label>'+
 '<div class="cc-studio-modal-controls"><button type="button" data-action="cancel-modal">Annulla</button>'+
 '<button type="submit" class="primary">Conferma</button></div></form></dialog>'+
 '<input type="file" id="ccStudioImportFile" accept="application/json,.json" hidden>';
document.body.insertBefore(studio,legacy);
var grid=document.getElementById('ccStudioGrid');
var stage=document.getElementById('ccStudioStage');
var parking=document.createElement('div');
parking.style.display='none';parking.id='ccStudioParking';
document.body.appendChild(parking);
var catalog=document.getElementById('ccStudioCatalog'),shade=document.getElementById('ccStudioShade');
var panel=document.getElementById('ccStudioSidebar'),modal=document.getElementById('ccStudioModal');
function textNode(binding){return '<span data-cc-bind="'+binding+'">—</span>'}
function val(binding,cls){return '<strong class="cc-studio-number '+(cls||'')+'" data-cc-bind="'+binding+'">—</strong>'}
function cell(label,binding){return '<div class="cc-studio-cell"><small>'+label+'</small><b data-cc-bind="'+binding+'">—</b></div>'}
function sourceMarkup(id){
 switch(id){
 case 'ticker':return '<div class="cc-studio-body">'+val('price','huge')+'<span class="cc-studio-caption" data-cc-bind="priceChange">INJ / USDT</span><span class="cc-studio-note">INJ/USDT · quotazione mercato</span></div>';
 case 'networth':return '<div class="cc-studio-body">'+val('networth')+'<span class="cc-studio-caption" data-cc-bind="totalQty">Wallet selezionato</span></div>';
 case 'pnl':return '<div class="cc-studio-body">'+val('pnl')+'<div class="cc-studio-mini-grid">'+cell('DA PREZZO MEDIO','pnlPct')+cell('COSTO MEDIO','avgPrice')+'</div></div>';
 case 'daily':return '<div class="cc-studio-body">'+val('daily')+'<span class="cc-studio-caption" data-cc-bind="dailyPct">Variazione 24h stimata</span></div>';
 case 'staking':return '<div class="cc-studio-body">'+val('staking')+'<div class="cc-studio-mini-grid">'+cell('APR NETTO','apr')+cell('STAKING RATIO','stakingRatio')+'</div></div>';
 case 'rewards':return '<div class="cc-studio-body">'+val('rewards')+'<div class="cc-studio-mini-grid">'+cell('REWARD DISPONIBILI','rewardsBalance')+cell('STIMA / GIORNO','rewardsFiat')+'</div></div>';
 case 'wallet':return '<div class="cc-studio-body"><dl class="cc-studio-list"><div><dt>Disponibili</dt><dd data-cc-bind="available">—</dd></div><div><dt>In staking</dt><dd data-cc-bind="staked">—</dd></div><div><dt>Totale INJ</dt><dd data-cc-bind="totalQty">—</dd></div></dl></div>';
 case 'market':return '<div class="cc-studio-body"><div class="cc-studio-mini-grid">'+cell('MIN 24H','marketLow')+cell('MAX 24H','marketHigh')+cell('VARIAZIONE 24H','priceChange')+cell('PREZZO ATTUALE','price')+'</div></div>';
 case 'validators':return '<div class="cc-studio-body"><div class="cc-studio-list-market" id="ccStudioValidators">In attesa delle delegazioni...</div></div>';
 case 'orderbook':return '<div class="cc-studio-body"><div class="cc-studio-mini-grid">'+cell('MIGLIOR BID','bestBid')+cell('MIGLIOR ASK','bestAsk')+cell('SPREAD','spread')+cell('FONTE','depthSource')+'</div><span class="cc-studio-note">Profondità INJ/USDT · Binance</span></div>';
 case 'timeline':return '<div class="cc-studio-body"><div class="cc-studio-list-market" id="ccStudioTimeline">Storico in caricamento...</div><small class="cc-studio-note">P/L giornaliero registrato sul dispositivo</small></div>';
 case 'potential':return '<div class="cc-studio-body"><small class="cc-studio-caption">PREZZO IPOTETICO / INJ <b data-cc-bind="unitSymbol">$</b></small><input class="cc-studio-input" id="ccStudioSim" type="number" min="0" step="any" inputmode="decimal" placeholder="50" aria-label="Prezzo INJ ipotetico"><div class="cc-studio-mini-grid">'+cell('NET WORTH SIMULATO','potentialTotal')+cell('SOLO STAKING','potentialStake')+'</div></div>';
 case 'converter':return '<div class="cc-studio-body"><small class="cc-studio-caption">INJ ➜ <b data-cc-bind="unitCode">USD</b></small><input class="cc-studio-input" id="ccStudioConverter" type="number" min="0" step="any" inputmode="decimal" aria-label="Quantità INJ da convertire">'+val('convertResult')+'</div>';
 case 'treasury':return '<div class="cc-studio-body">'+val('treasuryWorth')+'<div class="cc-studio-mini-grid">'+cell('INJ TOTALI','treasuryTotal')+cell('IN STAKING','treasuryStaked')+cell('REWARD','treasuryRewards')+cell('WALLET','treasuryCount')+'</div><small class="cc-studio-note" data-cc-bind="treasuryStatus">Ultimi snapshot salvati</small></div>';
 case 'marketlist':return '<div class="cc-studio-body"><div class="cc-studio-list-market" id="ccStudioMarketList">Caricamento Crypto Market...</div><small class="cc-studio-note">Prezzi e performance 24h · fonte CoinGecko</small></div>';
 case 'network':return '<div class="cc-studio-body"><dl class="cc-studio-list"><div><dt>Mercato INJ</dt><dd data-cc-bind="marketStatus">—</dd></div><div><dt>Wallet / API</dt><dd data-cc-bind="walletStatus">—</dd></div><div><dt>Ultima sincronizzazione</dt><dd data-cc-bind="lastSync">—</dd></div></dl></div>';
 default:return '<div class="cc-studio-body">Modulo non disponibile</div>';
 }
}
function buildWidget(entry){
 var def=byId[entry.id],article=document.createElement('article');
 article.className='cc-studio-tile';article.dataset.widget=entry.id;article.dataset.size=entry.size;article.draggable=editing;
 article.innerHTML='<header class="cc-studio-tile-head"><strong>'+esc(def.name)+'</strong>'+
 '<div class="cc-studio-tile-actions">'+(editing
 ?'<button data-widget-action="up" title="Sposta indietro" aria-label="Sposta indietro">←</button>'+
  '<button data-widget-action="down" title="Sposta avanti" aria-label="Sposta avanti">→</button>'+
  '<select data-widget-action="size" aria-label="Dimensione modulo">'+
  ['S','M','L','XL'].map(function(x){return '<option value="'+x+'"'+(x===entry.size?' selected':'')+'>'+x+'</option>'}).join('')+
  '</select><button data-widget-action="remove" title="Rimuovi modulo" aria-label="Rimuovi modulo">✕</button>'
 :'')+'</div></header>'+(entry.id==='chart'?'<div class="cc-studio-chart-slot"></div>':sourceMarkup(entry.id));
 return article;
}
function layout(){
 if(chartSection.parentElement!==parking)parking.appendChild(chartSection);
 grid.replaceChildren();
 var items=active().items;
 var narrow=window.innerWidth<800;
 var cols=12,occupied=[],maxRow=0;
 function fits(row,col,w,h){
  for(var y=row;y<row+h;y++)for(var x=col;x<col+w;x++)if(occupied[y]&&occupied[y][x])return false;
  return true;
 }
 items.forEach(function(entry){
  var tile=buildWidget(entry);
  if(!narrow){
   var dims={S:[3,1],M:[4,2],L:[6,2],XL:[8,4]}[entry.size],w=dims[0],h=dims[1];
   if(entry.id==='chart'){h=Math.max(3,h);w=Math.max(6,w)}
   var pos=null;
   for(var row=0;row<40&&!pos;row++)for(var col=0;col<=cols-w;col++){if(fits(row,col,w,h)){pos=[row,col];break}}
   if(!pos)pos=[maxRow,0];
   tile.style.gridColumn=(pos[1]+1)+' / span '+w;
   tile.style.gridRow=(pos[0]+1)+' / span '+h;
   for(var y=pos[0];y<pos[0]+h;y++){if(!occupied[y])occupied[y]=[];for(var x=pos[1];x<pos[1]+w;x++)occupied[y][x]=true}
   maxRow=Math.max(maxRow,pos[0]+h);
  }
  grid.append(tile);
  if(entry.id==='chart')tile.querySelector('.cc-studio-chart-slot').append(chartSection);
 });
 if(!items.length){
  var empty=document.createElement('div');empty.className='cc-studio-empty';
   empty.innerHTML='<div class="cc-studio-empty-glyph" aria-hidden="true">+</div>'+
     '<h2>Il tuo Command Center, da zero.</h2>'+
     '<p>Schermata libera. Scegli solo le informazioni che vuoi vedere.</p>'+
     '<button type="button" data-action="add">+ Scegli il primo modulo</button>';
   grid.append(empty);
 }
 if(!narrow){
  var rows=Math.max(5,maxRow);
  var minHeight=rows>8?110:78;
  grid.style.gridTemplateRows='repeat('+rows+', minmax('+minHeight+'px,1fr))';
  stage.classList.toggle('cc-studio-overflow',rows>8);
  if(rows>8)grid.style.height=(rows*minHeight+Math.max(0,rows-1)*12)+'px';else grid.style.height='100%';
 }else{grid.style.removeProperty('grid-template-rows');grid.style.removeProperty('height');stage.classList.remove('cc-studio-overflow')}
 var sim=document.getElementById('ccStudioSim');if(sim)sim.value=simValue;
 var convert=document.getElementById('ccStudioConverter');if(convert)convert.value=converterValue;
 studio.classList.toggle('cc-studio-edit',editing);
 document.querySelector('.cc-studio-toolbar [data-action="add"]').hidden=false;
 document.querySelector('[data-action="edit"]').textContent=editing?'Fine':'Organizza';
  document.querySelector('[data-action="edit"]').setAttribute('aria-pressed',String(editing));
 if(typeof state!=='undefined')state.lastDraw=0;
 update();
}
function drawCatalog(){
 catalog.replaceChildren();
 var taken=new Set(active().items.map(function(x){return x.id}));
 defs.forEach(function(d){
  var b=document.createElement('button');b.type='button';b.dataset.add=d[0];b.disabled=taken.has(d[0]);
  var text=document.createElement('span'),name=document.createElement('strong'),desc=document.createElement('small');
  name.textContent=d[1];desc.textContent=d[2];text.append(name,desc);
  var symbol=document.createElement('span');symbol.textContent=b.disabled?'✓':'+';
  b.append(text,symbol);catalog.append(b);
 });
}
function openLibrary(yes){sidebar=!!yes;shade.hidden=!sidebar;panel.hidden=!sidebar;if(sidebar)drawCatalog()}
function displayPresets(){
 var select=document.getElementById('ccStudioPreset');select.replaceChildren();
 doc.presets.forEach(function(p){var option=new Option(p.name,p.id);select.add(option)});
 select.value=doc.active;
}
function save(){persist();displayPresets();layout();if(sidebar)drawCatalog()}
function action(action){
 var p=active();
 if(action==='back'){var back=document.getElementById('ccBack');if(back)back.click();else location.href='./index.html';return}
 if(action==='edit'){editing=!editing;if(!editing)openLibrary(false);layout();return}
 if(action==='add'){openLibrary(true);return}
 if(action==='close-library'){openLibrary(false);return}
 if(action==='new'||action==='rename'||action==='duplicate'){
  modalMode=action;
  document.getElementById('ccStudioModalTitle').textContent=action==='rename'?'Rinomina preset':action==='new'?'Nuovo workspace vuoto':'Salva come nuovo preset';
  document.getElementById('ccStudioName').value=action==='rename'?p.name:action==='new'?'Nuovo workspace':p.name+' Copy';
  modal.showModal();document.getElementById('ccStudioName').focus();return;
 }
 if(action==='delete'){
  if(!confirm('Eliminare il preset '+p.name+'?'))return;
  doc.presets=doc.presets.filter(function(x){return x.id!==p.id});
  if(!doc.presets.length)doc.presets=builtins.map(function(b){return {id:b.id,name:b.name,items:normalized(b.items)}});
  doc.active=doc.presets[0].id;save();return;
 }
 if(action==='cancel-modal'){modal.close();return}
 if(action==='export'){
  var blob=new Blob([JSON.stringify({version:1,presets:doc.presets,active:doc.active},null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='inj-node-command-center-presets.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1500);return;
 }
 if(action==='import'){document.getElementById('ccStudioImportFile').click();return}
}
function panelAction(event){
 var act=event.target.closest('[data-action]');
 if(act){studio.querySelector('.cc-studio-more')?.removeAttribute('open');action(act.dataset.action);return}
 var add=event.target.closest('[data-add]');if(add&&!add.disabled){
  active().items.push({id:add.dataset.add,size:byId[add.dataset.add].size});
  if(active().items.length>18)active().items=active().items.slice(0,18);
  save();return;
 }
}
studio.addEventListener('click',panelAction);
shade.addEventListener('click',function(){openLibrary(false)});
document.getElementById('ccStudioPreset').addEventListener('change',function(event){doc.active=event.target.value;editing=false;openLibrary(false);persist();layout()});
document.getElementById('ccStudioForm').addEventListener('submit',function(event){
 event.preventDefault();var name=document.getElementById('ccStudioName').value.trim().slice(0,38);if(!name)return;
 if(modalMode==='rename')active().name=name;
 if(modalMode==='new'){
   var blankId='custom_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
   doc.presets.push({id:blankId,name:name,items:[]});
   doc.active=blankId;editing=false;openLibrary(false);
  }
  if(modalMode==='duplicate'){
  var id='custom_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  doc.presets.push({id:id,name:name,items:normalized(active().items)});
  doc.active=id;
 }
 modal.close();save();
});
document.getElementById('ccStudioImportFile').addEventListener('change',async function(event){
 var file=event.target.files&&event.target.files[0];event.target.value='';if(!file)return;
 try{
  if(file.size>250000)throw Error('File troppo grande');
  var raw=JSON.parse(await file.text());if(!Array.isArray(raw.presets))throw Error('Formato non valido');
  var names=new Set(doc.presets.map(function(x){return x.name.toLowerCase()}));
  var count=0;
  raw.presets.slice(0,25).forEach(function(p){
   var name=String(p.name||'').trim().slice(0,38),items=normalized(p.items);
   if(!name||names.has(name.toLowerCase())||doc.presets.length>=40)return;
   doc.presets.push({id:'import_'+Date.now()+'_'+count,name:name,items:items});
   names.add(name.toLowerCase());count++;
  });
  if(count){doc.active=doc.presets[doc.presets.length-1].id;save()}
  alert(count+' preset importati.');
 }catch(e){alert('Importazione non riuscita: '+e.message)}
});
grid.addEventListener('click',function(event){
 var button=event.target.closest('[data-widget-action]');
 if(!button||button.tagName==='SELECT')return;
 var item=button.closest('[data-widget]');if(!item)return;
 var idx=active().items.findIndex(function(x){return x.id===item.dataset.widget});
 if(idx<0)return;
 var what=button.dataset.widgetAction;
 if(what==='remove')active().items.splice(idx,1);
 else if(what==='up'&&idx>0){var temp=active().items[idx-1];active().items[idx-1]=active().items[idx];active().items[idx]=temp}
 else if(what==='down'&&idx<active().items.length-1){var temp2=active().items[idx+1];active().items[idx+1]=active().items[idx];active().items[idx]=temp2}
 save();
});
grid.addEventListener('change',function(event){
 var target=event.target;
 if(target.dataset.widgetAction!=='size')return;
 var row=active().items.find(function(x){return x.id===target.closest('[data-widget]').dataset.widget});
 if(row){row.size=target.value;save()}
});
grid.addEventListener('dragstart',function(e){
 var tile=e.target.closest('.cc-studio-tile');if(!editing||!tile){e.preventDefault();return}
 dragged=tile.dataset.widget;tile.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragged);
});
grid.addEventListener('dragover',function(e){if(!editing||!dragged)return;var target=e.target.closest('.cc-studio-tile');if(!target||target.dataset.widget===dragged)return;e.preventDefault();target.classList.add('drag-over')});
grid.addEventListener('dragleave',function(e){var target=e.target.closest('.cc-studio-tile');if(target)target.classList.remove('drag-over')});
grid.addEventListener('drop',function(e){
 e.preventDefault();var target=e.target.closest('.cc-studio-tile');if(!target||!dragged)return;
 var from=active().items.findIndex(function(x){return x.id===dragged}),to=active().items.findIndex(function(x){return x.id===target.dataset.widget});
 if(from>=0&&to>=0&&from!==to){var moved=active().items.splice(from,1)[0];active().items.splice(to,0,moved);save()}
 dragged='';
});
grid.addEventListener('dragend',function(){dragged='';grid.querySelectorAll('.dragging,.drag-over').forEach(function(x){x.classList.remove('dragging','drag-over')})});
grid.addEventListener('input',function(e){
 if(e.target.id==='ccStudioSim'){simValue=e.target.value;try{localStorage.setItem('inj_node_cc_studio_sim_value_v1',simValue)}catch(_){};update()}
 if(e.target.id==='ccStudioConverter'){converterValue=e.target.value;try{localStorage.setItem('inj_node_cc_studio_converter_v1',converterValue)}catch(_){};update()}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sidebar)openLibrary(false)});
function set(id,value){
 grid.querySelectorAll('[data-cc-bind="'+id+'"]').forEach(function(node){
  if(node.textContent!==String(value))node.textContent=String(value);
 });
}
function setSign(id,num){
 grid.querySelectorAll('[data-cc-bind="'+id+'"]').forEach(function(node){
  node.classList.toggle('cc-studio-positive',Number.isFinite(num)&&num>0);
  node.classList.toggle('cc-studio-negative',Number.isFinite(num)&&num<0);
 });
}
function qty(value){return fmt(value,4)+' INJ'}
function updateLists(){
 var st=selectedState()||{},validators=document.getElementById('ccStudioValidators');
 if(validators){
  validators.replaceChildren();
  if(!Array.isArray(st.validators)||!st.validators.length)validators.textContent='Nessuna delegazione rilevata';
  else st.validators.slice(0,5).forEach(function(v){
   var row=document.createElement('div');row.className='cc-studio-market-row';
   var name=document.createElement('strong');name.textContent=String(v.moniker||'Validatore');
   var amount=document.createElement('span');amount.textContent=qty(v.amount);
   row.append(name,amount);validators.append(row);
  });
 }
 var timeline=document.getElementById('ccStudioTimeline');
 if(timeline){
  timeline.replaceChildren();var entries=[];
  try{
   var all=JSON.parse(localStorage.getItem('inj_node_daily_pnl_timeline_v1')||'{}');
   entries=all[st.address]||[];
  }catch(_){}
  if(!entries.length)timeline.textContent='Nessuno storico salvato per questo wallet';
  else entries.slice(-7).reverse().forEach(function(v){
   var row=document.createElement('div');row.className='cc-studio-market-row';
   var name=document.createElement('strong');name.textContent=new Date(v.dayStart).toLocaleDateString('it-IT',{day:'2-digit',month:'short'});
   var amount=document.createElement('span');amount.textContent=money(v.pnlUsd||0);
   if(n(v.pnlUsd)>0)amount.className='cc-studio-positive';if(n(v.pnlUsd)<0)amount.className='cc-studio-negative';
   row.append(name,amount);timeline.append(row);
  });
 }
 var list=document.getElementById('ccStudioMarketList');
 if(list){list.replaceChildren();
  if(!Array.isArray(liveData.market)||!liveData.market.length)list.textContent='Dati non ancora disponibili';
  else liveData.market.forEach(function(coin){
   var row=document.createElement('div');row.className='cc-studio-market-row';
   var name=document.createElement('strong');name.textContent=String(coin.symbol||'').toUpperCase();
   var amount=document.createElement('span');amount.textContent=money(coin.current_price||0);
   var change=document.createElement('small');var x=Number(coin.price_change_percentage_24h);change.textContent=Number.isFinite(x)?(x>0?'+':'')+x.toFixed(2)+'%':'—';change.className=Number.isFinite(x)?(x>0?'cc-studio-positive':x<0?'cc-studio-negative':''):'';
   row.append(name,amount,change);list.append(row);
  });
 }
}
function update(){
 var st=selectedState();if(!st)return;
 var price=n(st.price),total=n(st.total),stake=n(st.staked),rate=n(st.apr);
 var gain=st.avgPrice>0?(price-st.avgPrice)*total:NaN;
 var daily=st.open24>0?(price-st.open24)*total:NaN;
 var rewardDay=stake*rate/36500;
 var depth=liveData.depth;
 var stamp=n(st.lastSync);
 set('price',price>0?'$'+price.toFixed(price<10?4:3):'—');
 set('priceChange',Number.isFinite(st.change24)?(n(st.change24)>0?'+':'')+n(st.change24).toFixed(2)+'% · 24H':'—');
 set('networth',price>0?money(total*price):'—');set('totalQty',qty(total));
 set('pnl',Number.isFinite(gain)?money(gain):'—');
 set('pnlPct',Number.isFinite(gain)&&st.avgPrice>0?((price/st.avgPrice-1)*100).toFixed(2)+'%':'—');
 set('avgPrice',st.avgPrice>0?'$'+n(st.avgPrice).toFixed(4):'—');
 set('daily',Number.isFinite(daily)?money(daily):'—');
 set('dailyPct',st.open24>0?((price/st.open24-1)*100).toFixed(2)+'% · stima 24h':'—');
 set('staking',qty(stake));set('apr',rate>0?rate.toFixed(2)+'%':'—');
 set('stakingRatio',total>0?(stake/total*100).toFixed(1)+'%':'—');
 set('rewards',qty(rewardDay)+' / giorno');
 set('rewardsBalance',qty(st.rewards));set('rewardsFiat',price>0?money(rewardDay*price):'—');
 set('available',qty(st.available));set('staked',qty(stake));
 set('marketLow',st.low24>0?'$'+n(st.low24).toFixed(4):'—');
 set('marketHigh',st.high24>0?'$'+n(st.high24).toFixed(4):'—');
 set('bestBid',depth&&depth.bids&&depth.bids[0]?'$'+n(depth.bids[0][0]).toFixed(4):'—');
 set('bestAsk',depth&&depth.asks&&depth.asks[0]?'$'+n(depth.asks[0][0]).toFixed(4):'—');
 set('spread',depth&&depth.bids&&depth.asks&&depth.bids[0]&&depth.asks[0]?(n(depth.asks[0][0])-n(depth.bids[0][0])).toFixed(5)+' $':'—');
 set('depthSource',liveData.depthAt?'Binance · '+new Date(liveData.depthAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'Attesa');
 set('unitSymbol',currency()==='EUR'?'€':'$');set('unitCode',currency());
 var sim=Number(simValue);set('potentialTotal',simValue!==''&&Number.isFinite(sim)&&sim>=0?money(total*sim/(currency()==='EUR'&&fx()>0?fx():1)):'—');
 set('potentialStake',simValue!==''&&Number.isFinite(sim)&&sim>=0?money(stake*sim/(currency()==='EUR'&&fx()>0?fx():1)):'—');
 var converted=Number(converterValue);
 set('convertResult',price>0&&converterValue!==''&&Number.isFinite(converted)&&converted>=0?money(converted*price):'—');
 var summaries=[],wallets=[];
 try{
  var raw=JSON.parse(localStorage.getItem('inj_monitor_summaries_v1')||'{}');
  wallets=JSON.parse(localStorage.getItem('inj_monitor_wallets_v1')||'[]');
  var seen=new Set();(Array.isArray(wallets)?wallets:[]).forEach(function(w){
   var key=String(w.address||'').toLowerCase();if(seen.has(key))return;
   seen.add(key);if(raw[key]&&n(raw[key].updated)>0)summaries.push(raw[key]);
  });
 }catch(_){}
 var sums=summaries.reduce(function(a,r){a.total+=n(r.total);a.staked+=n(r.staked);a.rewards+=n(r.rewards);return a},{total:0,staked:0,rewards:0});
 set('treasuryWorth',price>0&&summaries.length?money(sums.total*price):'—');
 set('treasuryTotal',qty(sums.total));set('treasuryStaked',qty(sums.staked));set('treasuryRewards',qty(sums.rewards));set('treasuryCount',String(summaries.length));
 set('treasuryStatus','Snapshot di '+summaries.length+' wallet · ultimo aggiornamento disponibile');
 var marketFresh=st.marketOk&&Date.now()-n(st.lastMarketTick)<20000;
 set('marketStatus',marketFresh?'LIVE':'In attesa');
 set('walletStatus',st.apiOk?'ONLINE':'CACHE / RETRY');
 set('lastSync',stamp?new Date(stamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):'—');
 var status=document.getElementById('ccStudioStatus');status.textContent=marketFresh?'MERCATO LIVE':'MERCATO IN ATTESA';
 setSign('pnl',gain);setSign('daily',daily);setSign('priceChange',n(st.change24));
 var confidential=privateOn();
 grid.querySelectorAll('.cc-studio-tile[data-widget="validators"] .cc-studio-body, .cc-studio-tile[data-widget="timeline"] .cc-studio-body').forEach(function(el){el.classList.toggle('cc-studio-private',confidential)});
 grid.querySelectorAll('[data-cc-bind]').forEach(function(el){
  var safe=['price','priceChange','marketLow','marketHigh','bestBid','bestAsk','spread','marketStatus','walletStatus','lastSync','depthSource','unitSymbol','unitCode'];
  el.classList.toggle('cc-studio-private',confidential&&!safe.includes(el.dataset.ccBind));
 });
 updateLists();
}
async function refreshExternal(){
 if(document.hidden)return;
 var ids=new Set(active().items.map(function(x){return x.id}));
 if(ids.has('orderbook')&&Date.now()-liveData.depthAt>12000){
  try{
   var response=await fetch('https://api.binance.com/api/v3/depth?symbol=INJUSDT&limit=5',{cache:'no-store'});
   if(response.ok){var data=await response.json();if(Array.isArray(data.bids)&&Array.isArray(data.asks)){liveData.depth=data;liveData.depthAt=Date.now()}}
  }catch(_){}
 }
 if(ids.has('marketlist')&&Date.now()-liveData.marketAt>120000){
  liveData.marketAt=Date.now();
  try{
   var r=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false',{cache:'no-store'});
   if(r.ok){var d=await r.json();if(Array.isArray(d))liveData.market=d}
  }catch(_){}
 }
 update();
}
var lastCurrency=currency();
function tick(){
 if(document.hidden)return;
 var nowCurrency=currency();
 if(nowCurrency!==lastCurrency){
  var x=Number(simValue),rate=fx();
  if(simValue!==''&&Number.isFinite(x)&&x>=0){simValue=rate>0?String(lastCurrency==='USD'?x*rate:x/rate):''}
  lastCurrency=nowCurrency;
  var input=document.getElementById('ccStudioSim');if(input)input.value=simValue;
 }
 update();
}
persist();displayPresets();layout();document.body.classList.add('cc-studio-ready');studio.hidden=false;
tick();refreshExternal();
setInterval(tick,1300);setInterval(refreshExternal,15000);
window.addEventListener('pageshow',function(){layout();refreshExternal()});
window.addEventListener('resize',function(){clearTimeout(window._ccStudioLayoutTimer);window._ccStudioLayoutTimer=setTimeout(layout,180)},{passive:true});
window.addEventListener('storage',function(e){if(!e.key||['inj_monitor_currency','inj_monitor_eur_rate','inj_monitor_privacy','inj_monitor_summaries_v1'].includes(e.key))tick()});
})();
