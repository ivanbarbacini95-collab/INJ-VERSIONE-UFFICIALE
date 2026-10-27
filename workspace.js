(() => {
'use strict';
const M=window.INJWorkspaceModel,$=id=>document.getElementById(id),KEY='inj_node_workspace_v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const t=(it,en)=>localStorage.getItem('inj_node_language_v1')==='en'?en:it;
const uid=()=>crypto.randomUUID?.()||'ws-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const C=window.INJWorkspaceCatalog;
const catalog=C.entries;
const marketType=type=>C.byType[type].scope==='market';
const title=i=>i.title||t(C.byType[i.type].it,C.byType[i.type].en);
const previewOptions=new Map();
let catalogSource='selected',catalogSection='Dashboard';
let db,storageFailed=false;
try{db=M.sanitize(read(KEY,null))}catch(_){db={version:1,presets:[{id:uid(),name:'Workspace 1',locked:false,items:[]}],active:'',defaultId:null};db.active=db.presets[0].id;}
if(db.defaultId)db.active=db.defaultId;
const active=()=>db.presets.find(p=>p.id===db.active)||db.presets[0];
const layoutLocked=()=>immersive||(mode()==='mobile'?!mobileEditing:!!active().locked); // Mobile opens read-only; fullscreen always locks geometry.
const mode=()=>matchMedia('(max-width:600px)').matches?'mobile':'desktop';
const cols=()=>mode()==='mobile'?4:12;
const ROW=56,GAP=8;
let immersive=false,mobileEditing=false,lastPresetId=active().id;
const Live=window.INJWorkspaceLive;
const data={lastTradeAt:0,rows:{},supplements:{},price:null,priceAt:0,priceSource:'Binance',change:null,charts:{},loading:false,chartBusy:new Set(),lastWallet:0,marketBusy:false};
let drag=null,editingCard=null,lastMode=mode(),timer=0,networkTimer=0,statusTimer=0;
function notice(msg){$('wsStatus').textContent=msg;clearTimeout(statusTimer);statusTimer=setTimeout(()=>$('wsStatus').textContent='',5000)}
function persist(show=false){try{localStorage.setItem(KEY,JSON.stringify(db));storageFailed=false;if(show)notice(t('Preset salvato','Preset saved'))}catch(_){storageFailed=true;notice(t('Salvataggio non riuscito. Esporta il setup per conservarlo.','Save failed. Export your setup to keep it.'))}}
function wallets(){const raw=read('inj_monitor_wallets_v1',[]);const list=Array.isArray(raw)?raw.filter(w=>/^inj1[a-z0-9]{38,60}$/.test(w.address||'')).map(w=>({address:w.address,label:w.label||w.address.slice(0,10)})):[];const legacy=localStorage.getItem('inj_monitor_address');if(legacy&&/^inj1[a-z0-9]{38,60}$/.test(legacy)&&!list.some(w=>w.address===legacy))list.push({address:legacy,label:'Wallet'});return list.filter((w,i)=>list.findIndex(x=>x.address===w.address)===i)}
function selectedSnapshot(){try{return parent!==window?parent.INJ_GET_SELECTED_WALLET_SNAPSHOT?.():null}catch(_){return null}}
function selected(){return selectedSnapshot()?.address||localStorage.getItem('inj_node_comparison_selected_wallet_v1')||localStorage.getItem('inj_monitor_address')||wallets()[0]?.address||''}
function sources(select,value='selected',market=false){
 select.replaceChildren();
 const option=(group,v,label)=>{const o=document.createElement('option');o.value=v;o.textContent=label;group.append(o)};
 if(market){option(select,'market',t('Mercato · indipendente dai wallet','Market · independent of wallets'));select.value='market';return}
 const modes=document.createElement('optgroup');modes.label=t('Modalità','Modes');option(modes,'selected',t('Wallet della Home · segue la selezione','Home wallet · follows selection'));option(modes,'all',t('Tutti i wallet','All wallets')+' ('+wallets().length+')');select.append(modes);
 const single=document.createElement('optgroup');single.label=t('Wallet specifici · selezione fissa','Specific wallets · fixed selection');
 for(const w of wallets())option(single,w.address,w.label+' · '+w.address.slice(0,8)+'…'+w.address.slice(-5));
 if(!['all','selected'].includes(value)&&!wallets().some(w=>w.address===value))option(single,value,t('Wallet non più salvato','Wallet no longer saved'));
 select.append(single);select.value=value;
}
function catalogSourceUI(){
 const specific=!['all','selected'].includes(catalogSource),list=wallets();$('wsSpecificWallet').hidden=!specific;
 document.querySelectorAll('[data-source-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.sourceMode===(specific?'single':catalogSource)));if(b.dataset.sourceMode==='single')b.disabled=!list.length;b.textContent=b.dataset.sourceMode==='all'?t('Tutti i wallet','All wallets')+' ('+list.length+')':b.dataset.sourceMode==='selected'?t('Wallet della Home','Home wallet'):t('Wallet specifico','Specific wallet');});
 $('wsSpecificWallet').setAttribute('aria-label',t('Scegli il wallet specifico','Choose a specific wallet'));
 const address=specific?catalogSource:selected(),wallet=list.find(w=>w.address===address);
 $('wsSourceSummary').textContent=catalogSource==='all'?t('La card userà la somma di tutti i wallet salvati.','The card will use the sum of all saved wallets.'):specific?t('Selezione fissa: ','Fixed selection: ')+(wallet?.label||t('Wallet non disponibile','Wallet unavailable'))+' · '+address.slice(0,8)+'…'+address.slice(-5):t('La card seguirà il wallet scelto nella Home: ','The card follows the wallet selected in Home: ')+(wallet?.label||t('nessun wallet','no wallet'));
}
function chooseCatalogSource(value){catalogSource=value;$('wsSource').value=value;if(!['all','selected'].includes(value))$('wsSpecificWallet').value=value;catalogSourceUI();renderCatalog();refresh();}

function sourceLabel(i){if(marketType(i.type))return 'INJ / '+(localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD');if(i.source==='all')return t('Tutti i wallet','All wallets')+' · '+wallets().length;const address=i.source==='selected'?selected():i.source;const label=wallets().find(w=>w.address===address)?.label||t('Wallet assente','Wallet unavailable');return (i.source==='selected'?t('Home · ','Home · '):'')+label}
const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const num=(n,d=5)=>n===null?'—':n.toLocaleString(t('it-IT','en-US'),{minimumFractionDigits:d,maximumFractionDigits:d});
const quantity=(n,digits=4)=>{if(n===null)return '— INJ';try{if(parent!==window&&typeof parent.formatInj==='function')return parent.formatInj(n,digits)}catch(_){}return n.toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits})+' INJ'};
function money(v,digits=2){if(v===null||!Number.isFinite(v))return '—';try{if(parent!==window&&typeof parent.money==='function')return parent.money(v,digits)}catch(_){}const currency=localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD';const fx=currency==='EUR'?Number(localStorage.getItem('inj_monitor_eur_rate')):1;return fx>0?new Intl.NumberFormat(currency==='EUR'?'it-IT':'en-US',{style:'currency',currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v*fx):'—';}
function sharedSource(){try{return parent!==window&&typeof parent.INJ_MORNING_SOURCE==='function'?parent.INJ_MORNING_SOURCE():null}catch(_){return null}}
function useSharedMarket(){const s=sharedSource();if(s&&s.price>0&&Date.now()-s.priceAt<120000){if(s.priceAt<data.priceAt)return true;data.price=s.price;data.priceAt=s.priceAt;data.change=Number.isFinite(s.change24h)?s.change24h:null;data.priceSource='INJ Node';return true}return false}
function rowsFor(i){const ws=wallets(),addresses=i.source==='all'?ws.map(w=>w.address):[i.source==='selected'?selected():i.source];const cached=read('inj_monitor_summaries_v1',{}),snapshot=selectedSnapshot();if(snapshot?.address&&snapshot.updated>0&&Number.isFinite(snapshot.total))cached[snapshot.address]={...cached[snapshot.address],...snapshot};return addresses.filter(Boolean).map(a=>{const row=data.rows[a]&&(!cached[a]||data.rows[a].updated>cached[a].updated)?data.rows[a]:cached[a]||null;return row?{...row,...data.supplements[a]}:null})}
function metrics(i){return M.aggregate(rowsFor(i));}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function bodyFor(i,host){const sig=JSON.stringify([i,sections.stamp(),marketType(i.type)?null:rowsFor(i),sourceLabel(i),data.price,data.priceAt,data.change,data.charts[i.timeframe]?.at,localStorage.getItem('inj_monitor_currency'),localStorage.getItem('inj_monitor_eur_rate'),localStorage.getItem('inj_node_language_v1'),Math.floor(Date.now()/(['target','velocity','accumulation'].includes(i.type)?1000:60000))]);if(host._wsSignature===sig)return;host._wsSignature=sig;host.classList.toggle('ws-center-value',!C.isChart(i.type)&&!['ratio','ladder'].includes(i.type)&&!sections.supported.includes(i.type));host.classList.toggle('ws-price-body',i.type==='price');if(sections.render(i,host))return;if(C.isChart(i.type)){const key=[i.timeframe,i.chartStyle,localStorage.getItem('inj_monitor_currency'),localStorage.getItem('inj_node_language_v1')].join('|');if(host._chartController&&host._chartKey===key)return;host._chartController?.destroy();host._chartKey=key;host.replaceChildren();renderChart(i,host,'');return;}const priorValue=host.querySelector(':scope > .ws-value, :scope > .ws-price-main > .ws-value'),priorArrow=host.querySelector(':scope > .ws-price-main > .ws-price-arrow'),priorSub=host.querySelector(':scope > .ws-sub');host.replaceChildren();const market=marketType(i.type),m=market?null:metrics(i),p=Date.now()-data.priceAt<120000?data.price:null;let value='—',sub='',status='',numeric=null,subNumeric=null;
if(market){numeric=p;value=money(p,i.type==='price'?4:2);sub=data.change===null?'INJ':num(data.change,2)+'% · 24h';status=p===null?t('Mercato in attesa','Waiting for market'):data.priceSource+' · '+new Date(data.priceAt).toLocaleTimeString();}
else if(!m){sub=t('Dati wallet incompleti o assenti','Wallet data incomplete or unavailable');status=t('In attesa della sincronizzazione','Waiting for sync');}
else{const v={worth:p===null?null:m.total*p,total:m.total,staked:m.staked,available:m.available,rewards:m.rewards,daily:m.daily,ratio:m.total?m.staked/m.total*100:0};numeric=v[i.type]??null;subNumeric=p!==null&&numeric!==null?numeric*p:null;value=i.type==='worth'?money(v.worth):i.type==='ratio'?num(v.ratio,2)+'%':quantity(v[i.type]??null,i.type==='available'?5:4);sub=i.type==='ratio'?quantity(m.staked)+' / '+quantity(m.total):i.type==='worth'?quantity(m.total):i.type==='daily'?t('Stima con APR netto disponibile','Estimate using available net APR')+' · '+money(m.daily!==null&&p!==null?m.daily*p:null):p!==null?money((v[i.type]??0)*p):'';
status=(Date.now()-m.at>90000?t('Snapshot · ','Snapshot · '):m.verified?t('On-chain · ','On-chain · '):t('Cache · ','Cache · '))+(m.at?new Date(m.at).toLocaleTimeString():'—');
if(i.type==='ratio'){const track=el('div','ws-track'),fill=el('i');fill.style.width=Math.max(0,Math.min(100,v.ratio))+'%';track.setAttribute('role','progressbar');track.setAttribute('aria-label','Staking ratio');track.setAttribute('aria-valuenow',String(v.ratio));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.append(fill);host.append(track);}
if(i.type==='ladder'){const fiat=m.rewards*(p??NaN),daily=(m.daily??NaN)*(p??NaN);numeric=Number.isFinite(fiat)?fiat:null;value=money(Number.isFinite(fiat)?fiat:null)+' / '+money(i.goal);const percent=Number.isFinite(fiat)?Math.min(100,fiat/i.goal*100):0;const track=el('div','ws-track'),fill=el('i');fill.style.width=percent+'%';track.setAttribute('role','progressbar');track.setAttribute('aria-valuenow',String(Math.round(percent)));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.append(fill);host.append(track);const seconds=Math.max(0,(i.goal-fiat)/daily*86400);sub=fiat>=i.goal?t('Traguardo raggiunto','Milestone reached'):Number.isFinite(seconds)&&daily>0?t('Stima: ','Estimate: ')+Math.floor(seconds/86400)+'d '+Math.floor(seconds%86400/3600)+'h '+Math.floor(seconds%3600/60)+'m':t('Countdown non disponibile','Countdown unavailable');}
}
const identity=[i.type,i.source,market?'market':i.source==='all'?wallets().map(w=>w.address).join(','):i.source==='selected'?selected():i.source,localStorage.getItem('inj_monitor_currency'),localStorage.getItem('inj_node_language_v1')].join('|');
const v=priorValue||el('div');v.className='ws-value'+(!market?' ws-sensitive':'')+(i.type==='rewards'?' ws-reward-value':'');
if(i.type==='price'){
 // Only visible price ticks trigger a directional cue. Static 24h direction stays in its own badge.
 const card=host.closest('.ws-card, .ws-preview');
 const currency=localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD';
 const rate=currency==='EUR'?Number(localStorage.getItem('inj_monitor_eur_rate')):1;
 const displayed=p!==null&&rate>0?Math.round(p*rate*10000)/10000:null;
 const prev=host._wsPriceShown,now=Date.now(),sameCurrency=host._wsPriceCurrency===currency;
 const moved=sameCurrency&&displayed!==null&&Number.isFinite(prev)&&displayed!==prev;
 if(moved&&now-(host._wsPriceCueAt||0)>=950){
  const direction=displayed>prev?'up':'down';
  host._wsPriceCueAt=now;
  host.dataset.priceTrend=direction;
  if(card)card.dataset.priceTrend=direction;
  clearTimeout(host._wsPriceCueTimer);
  host._wsPriceCueTimer=setTimeout(()=>{
   host.dataset.priceTrend='neutral';
   if(card?.isConnected)card.dataset.priceTrend='neutral';
   const arrow=host.querySelector('.ws-price-arrow');
   if(arrow)arrow.dataset.direction='neutral';
  },820);
 }else if(!host.dataset.priceTrend){
  host.dataset.priceTrend='neutral';
  if(card)card.dataset.priceTrend='neutral';
 }
 host._wsPriceCurrency=currency;
 host._wsPriceShown=displayed;
 const group=el('div','ws-price-main');
 const arrow=priorArrow||el('span','ws-price-arrow');
 const direction=host.dataset.priceTrend||'neutral';
 arrow.dataset.direction=direction;
 arrow.textContent=direction==='up'?'↑':direction==='down'?'↓':'•';
 arrow.setAttribute('aria-hidden','true');
 group.append(v,arrow);host.prepend(group);
}else host.prepend(v);
INJWorkspaceValues.paint(v,value,numeric,{calm:i.type==='rewards',identity});
if(i.details){const detail=priorSub||el('div');detail.className='ws-sub'+(!market?' ws-sensitive':'')+(i.type==='price'?' ws-price-change':'');if(i.type==='price'){const change=p!==null?data.change:null;detail.dataset.trend=change>0?'up':change<0?'down':'neutral';sub=change===null?'— · 24H':(change>0?'↗ +':change<0?'↘ ':'')+num(change,2)+'% · 24H';}INJWorkspaceValues.paint(detail,sub,subNumeric,{calm:i.type==='rewards',identity});host.append(detail);}
if(C.isChart(i.type))status=renderChart(i,host,status);
host.append(el('div','ws-data-status',status));}
function renderChart(i,host,status){
 const history=data.charts[i.timeframe],candles=i.chartStyle==='candles';host.append(el('span','ws-chart-timeframe',i.timeframe.toUpperCase()));
 const wrap=el('div','ws-chart-wrap');host.append(wrap);
 if(!history?.points?.length){wrap.append(el('small','ws-chart-empty',t('Storico in attesa','Waiting for history')));return status}
 const bars=history.candles||[],points=history.points.map(x=>x[1]);
 if(candles&&!bars.length){wrap.append(el('small','ws-chart-empty',t('Dati OHLC in attesa. Le candele richiedono dati reali di apertura, massimo, minimo e chiusura.','Waiting for OHLC data. Candles require real open, high, low and close data.')));return status}
 host._chartController=INJWorkspaceCharts.render(wrap,{rows:candles?bars.map(b=>({t:b.t,o:b.o,h:b.h,l:b.l,v:b.c})):history.points.map(([t,v])=>({t,v})),getRows:()=>{const h=data.charts[i.timeframe];return candles?(h?.candles||[]).map(b=>({t:b.t,o:b.o,h:b.h,l:b.l,v:b.c})):(h?.points||[]).map(([t,v])=>({t,v}));},label:'INJ '+i.timeframe+' · '+(candles?t('Candele','Candles'):t('Linee','Line')),formatValue:v=>money(v,4),locale:t('it-IT','en-US'),candles,el,live:{windowMs:M.timeframes[i.timeframe].ms,bucketMs:M.timeframes[i.timeframe].bucketMs||Live.intervalMs(M.timeframes[i.timeframe].interval),getPrice:()=>data.price,lastTick:()=>data.lastTradeAt,loadEarlier:before=>loadEarlier(i.timeframe,before)}});

 return (Date.now()-history.at>120000?'Snapshot · ':'')+history.source+' · '+new Date(history.at).toLocaleTimeString();
}

function createCard(i){const node=el('article','ws-card');node.dataset.uid=i.uid;node.dataset.type=i.type;const head=el('div','ws-card-head'),heading=el('div','ws-card-heading');heading.append(el('strong','',title(i)),el('small','',sourceLabel(i)));const controls=el('div','ws-card-controls');for(const [action,label,glyph]of [['move',t('Trascina','Drag'),'⠿'],['config',t('Configura','Configure'),'⚙'],['duplicate',t('Duplica','Duplicate'),'⧉'],['front',t('Porta davanti','Bring forward'),'▣'],['back',t('Porta dietro','Send back'),'▢'],['remove',t('Rimuovi','Remove'),'×']]){const b=el('button',action==='move'?'ws-drag':'',glyph);b.dataset.action=action;b.title=label;b.setAttribute('aria-label',label);controls.append(b)}head.append(heading,controls);const body=el('div','ws-card-body');node.append(head,body);for(const edge of ['n','ne','e','se','s','sw','w','nw']){const resize=el('button','ws-resize ws-resize-'+edge,edge==='se'?'◢':'');resize.dataset.action='resize';resize.dataset.edge=edge;resize.setAttribute('aria-label',t('Ridimensiona ','Resize ')+edge.toUpperCase());node.append(resize);}return node;}
const canvasUnit=()=>($('wsGrid').clientWidth+GAP)/cols();
function geometry(node,i){const r=i.layouts[mode()],unit=($('wsGrid').clientWidth+GAP)/cols();node.style.zIndex=String(drag?.item===i?100:active().items.indexOf(i)+1);Object.assign(node.style,{left:(r.x*unit)+'px',top:(r.y*ROW)+'px',width:(r.w*unit-GAP)+'px',height:(r.h*ROW-GAP)+'px'});}
function layout(){const preset=active();if(lastPresetId!==preset.id){lastPresetId=preset.id;mobileEditing=false;window.INJWorkspaceProHooks?.editModeChange?.(false);}const mobile=mode()==='mobile';document.body.classList.toggle('ws-view-only',mobile&&!mobileEditing);document.body.classList.toggle('ws-mobile-editing',mobile&&mobileEditing);$('wsName').textContent=preset.name;$('wsEdit').textContent=mobile?(mobileEditing?t('✓ Fine','✓ Done'):t('✎ Modifica','✎ Edit')):(preset.locked?t('Modifica','Edit'):t('Blocca layout','Lock layout'));$('wsEdit').setAttribute('aria-pressed',String(!layoutLocked()));$('wsGrid').classList.toggle('editing',!layoutLocked()&&!!preset.snap);$('wsSnap').textContent=preset.snap?t('Griglia: ON','Grid: ON'):t('Posizione libera','Free positioning');$('wsSnap').setAttribute('aria-pressed',String(!!preset.snap));$('wsSnap').disabled=layoutLocked();const nodes=new Map([...$('wsGrid').children].map(n=>[n.dataset.uid,n]));let end=0;for(const i of preset.items){let node=nodes.get(i.uid);if(!node){node=createCard(i);$('wsGrid').append(node)}nodes.delete(i.uid);node.classList.toggle('editable',!layoutLocked());node.classList.toggle('no-border',!i.border);node.dataset.style=i.style;node.dataset.view=i.view||'standard';node.classList.toggle('pro-card-locked',!!i.cardLocked);node.querySelector('.ws-card-heading strong').textContent=title(i);node.querySelector('.ws-card-heading small').textContent=sourceLabel(i);geometry(node,i);bodyFor(i,node.querySelector('.ws-card-body'));end=Math.max(end,i.layouts[mode()].y+i.layouts[mode()].h)}nodes.forEach(n=>n.remove());$('wsGrid').style.height=(end*ROW)+'px';$('wsEmpty').hidden=!!preset.items.length;window.INJWorkspaceProHooks?.afterLayout?.();}
function updateValues(){if(document.hidden||drag)return;useSharedMarket();document.body.classList.toggle('ws-private',localStorage.getItem('inj_monitor_privacy')==='1');for(const i of active().items){const node=[...$('wsGrid').children].find(n=>n.dataset.uid===i.uid);if(node){node.querySelector('.ws-card-heading small').textContent=sourceLabel(i);if(!node.querySelector('.ws-section-controls')?.contains(document.activeElement)&&!node.querySelector('.ws-plot[data-inspecting]'))bodyFor(i,node.querySelector('.ws-card-body'));}}if($('wsCatalog').open)document.querySelectorAll('.ws-preview').forEach(n=>{if(n._item&&!n.querySelector('.ws-section-controls')?.contains(document.activeElement)&&!n.querySelector('.ws-plot[data-inspecting]'))bodyFor(n._item,n.querySelector('.ws-card-body'))});$('wsConnection').textContent=data.priceSource.endsWith('snapshot')?'SNAPSHOT':Date.now()-data.priceAt<60000?t('MERCATO LIVE','MARKET LIVE'):t('MERCATO IN ATTESA','WAITING FOR MARKET');window.INJWorkspaceProHooks?.refreshStatus?.();}
function add(type,source,options={}){
 window.INJWorkspaceProHooks?.beforeChange?.();
 if(active().items.length>=80)return notice(t('Massimo 80 card per preset','Maximum 80 cards per preset'));
 const item={...C.defaults(type),...options,uid:uid(),type,source:marketType(type)?'market':source,title:'',style:'solid',border:true,details:true,layouts:{}};
 const spec=C.byType[type];for(const [key,c]of [['desktop',12],['mobile',4]])item.layouts[key]=M.firstFree(active().items,key,c,spec.w,spec.h);
 active().items.push(item);active().locked=false;persist();layout();if($('wsCatalog').open)$('wsCatalog').close();refresh();notice(t('Card aggiunta','Card added'));requestAnimationFrame(()=>{const node=[...$('wsGrid').children].find(n=>n.dataset.uid===item.uid);if(node){node.tabIndex=-1;node.scrollIntoView({block:'nearest',behavior:'auto'});node.focus({preventScroll:true})}});
}
function previewChartControls(item,preview,body){
 const tools=el('div','ws-preview-controls');
 for(const [key,label,options]of [['chartStyle',t('Tipo di grafico','Chart type'),[['line',t('Linee','Line')],['candles',t('Candele','Candles')]]],['timeframe',t('Periodo grafico','Chart period'),Object.keys(M.timeframes).map(v=>[v,v])]]){
  const holder=el('label','',label),select=el('select');select.setAttribute('aria-label',label);
  for(const [v,text]of options){const o=el('option','',text);o.value=v;select.append(o)}select.value=item[key];select.addEventListener('change',()=>{item[key]=select.value;previewOptions.set(item.type,item);bodyFor(item,body);chart(item.timeframe);});holder.append(select);tools.append(holder);
 }preview.append(tools);
}
function renderCatalog(){
 const list=$('wsCatalogList'),query=$('wsSearch').value.toLowerCase(),open=new Map([...list.querySelectorAll('details')].map(d=>[d.dataset.section,d.open]));list.replaceChildren();
 const kind=$('wsKind').value||'all',matches=c=>!query||(t(c.it,c.en)+' '+c.section+' '+c.type).toLowerCase().includes(query);
 const nav=$('wsCatalogNav');nav.replaceChildren();for(const section of ['all',...new Set(catalog.map(c=>c.section))]){const count=catalog.filter(c=>(section==='all'||c.section===section)&&matches(c)&&(kind==='all'||c.kind===kind)).length;const b=el('button','', (section==='all'?t('Tutte le sezioni','All sections'):section)+' · '+count);b.type='button';b.setAttribute('aria-pressed',String(section===catalogSection));b.onclick=()=>{catalogSection=section;renderCatalog();refresh()};nav.append(b);}
 const filtered=catalog.filter(c=>(query||catalogSection==='all'||c.section===catalogSection)&&matches(c)&&(kind==='all'||c.kind===kind));
 $('wsCatalogCount').textContent=filtered.length+' / '+catalog.length+' '+t('elementi','elements');
 for(const section of [...new Set(filtered.map(c=>c.section))]){
  const group=el('details','ws-catalog-section');group.dataset.section=section;group.open=open.get(section)??true;group.append(el('summary','',section+' · '+filtered.filter(c=>c.section===section).length));const cards=el('div','ws-catalog-cards');
  for(const c of filtered.filter(c=>c.section===section)){
   const preview=el('article','ws-preview'),saved=previewOptions.get(c.type)||C.defaults(c.type),item={...saved,type:c.type,source:marketType(c.type)?'market':$('wsSource').value,details:true};previewOptions.set(c.type,item);preview._item=item;preview.dataset.type=c.type;preview.dataset.kind=c.kind;preview.append(el('small','ws-preview-kind',t({chart:'Grafico interattivo',heatmap:'Heatmap',bar:'Barra / avanzamento',list:'Lista',panel:'Pannello',metric:'Valore'}[c.kind],{chart:'Interactive chart',heatmap:'Heatmap',bar:'Bar / progress',list:'List',panel:'Panel',metric:'Value'}[c.kind])));preview.append(el('h3','',t(c.it,c.en)));preview.append(el('small','ws-preview-source',marketType(c.type)?t('Mercato · nessun wallet richiesto','Market · no wallet required'):sourceLabel(item)));
   const body=el('div','ws-card-body');preview.append(body);if(C.isChart(item.type))previewChartControls(item,preview,body);
   const button=el('button','ws-insert',t('＋ Inserisci','＋ Insert'));button.addEventListener('click',()=>{const options={};for(const k of Object.keys(C.defaults(item.type)))options[k]=item[k];add(c.type,$('wsSource').value,options)});preview.append(button);cards.append(preview);bodyFor(item,body);
  }group.append(cards);list.append(group);
 }if(!filtered.length)list.append(el('p','ws-sub',t('Nessuna card trovata','No cards found')));
}

function openCatalog(){
 if(!['selected','all'].includes(catalogSource)&&!wallets().some(w=>w.address===catalogSource))catalogSource='selected';
 sources($('wsSource'),catalogSource);$('wsSpecificWallet').replaceChildren();for(const w of wallets()){const o=document.createElement('option');o.value=w.address;o.textContent=w.label+' · '+w.address.slice(0,8)+'…'+w.address.slice(-5);$('wsSpecificWallet').append(o)}$('wsSpecificWallet').value=!['selected','all'].includes(catalogSource)?catalogSource:wallets().find(w=>w.address===selected())?.address||wallets()[0]?.address||'';
 $('wsKind').replaceChildren();for(const [v,it,en]of [['all','Tutti i tipi','All types'],['metric','Valori','Values'],['panel','Pannelli','Panels'],['bar','Barre e progressi','Bars and progress'],['chart','Grafici','Charts'],['heatmap','Heatmap','Heatmap'],['list','Liste','Lists']]){const o=el('option','',t(it,en));o.value=v;$('wsKind').append(o)}catalogSourceUI();$('wsCatalog').showModal();renderCatalog();refresh();
}
$('wsSourceModes').addEventListener('click',e=>{const b=e.target.closest('[data-source-mode]');if(!b||b.disabled)return;chooseCatalogSource(b.dataset.sourceMode==='single'?$('wsSpecificWallet').value:b.dataset.sourceMode)});
$('wsSpecificWallet').addEventListener('change',()=>chooseCatalogSource($('wsSpecificWallet').value));
function configure(i){if(immersive)return;editingCard=i;$('wsConfigTitle').textContent=title(i);const form=$('wsConfigForm');for(const k of ['title','style','timeframe','chartStyle','goal'])form.elements[k].value=i[k];for(const k of ['border','details'])form.elements[k].checked=i[k];sources(form.elements.source,i.source,marketType(i.type));const r=i.layouts[mode()];const unit=canvasUnit();for(const key of ['width','height','column','row'])form.elements[key].max=key==='height'?48*ROW:key==='row'?10000*ROW:Math.round($('wsGrid').clientWidth);form.elements.width.min=Math.min(100,Math.round(r.w*unit-GAP));form.elements.height.min=90;form.elements.width.value=Math.round(r.w*unit-GAP);form.elements.height.value=Math.round(r.h*ROW-GAP);form.elements.column.value=Math.round(r.x*unit);form.elements.row.value=Math.round(r.y*ROW);form.elements.timeframe.closest('label').hidden=!C.isChart(i.type);form.elements.chartStyle.closest('label').hidden=!C.isChart(i.type);form.elements.goal.closest('label').hidden=i.type!=='ladder';$('wsConfig').show();}
$('wsConfigForm').addEventListener('submit',e=>{e.preventDefault();if(!editingCard)return;const f=e.currentTarget,i=editingCard;if(i.cardLocked||immersive)return;window.INJWorkspaceProHooks?.beforeChange?.();for(const k of ['title','style','timeframe','chartStyle','source'])i[k]=f.elements[k].value;i.goal=Number(f.elements.goal.value);i.border=f.elements.border.checked;i.details=f.elements.details.checked;i.layouts[mode()]=M.normalize({x:Number(f.elements.column.value)/canvasUnit(),y:Number(f.elements.row.value)/ROW,w:(Number(f.elements.width.value)+GAP)/canvasUnit(),h:(Number(f.elements.height.value)+GAP)/ROW},cols());if(active().snap)M.settle(active().items,mode(),cols(),i.uid);persist();layout();$('wsConfig').close();refresh();});
$('wsGrid').addEventListener('change',e=>{const option=e.target.dataset.chartOption,node=e.target.closest('.ws-card'),i=active().items.find(i=>i.uid===node?.dataset.uid);if(!i||!['chartStyle','timeframe'].includes(option))return;i[option]=e.target.value;persist();bodyFor(i,node.querySelector('.ws-card-body'));refresh();});
// Clone any card (including custom selections, chart range and data source).
// The duplicated instance is independent and starts its feeds immediately.
function duplicateCards(sources){
 if(layoutLocked())return [];
 const originals=[...new Set(sources)].filter(i=>active().items.includes(i)&&!i.cardLocked);
 if(!originals.length)return [];
 if(active().items.length+originals.length>80){notice(t('Massimo 80 card per preset','Maximum 80 cards per preset'));return []}
 window.INJWorkspaceProHooks?.beforeChange?.();
 const created=[],groups=new Map();
 for(const i of originals){
  const copy=M.cloneCard(i,active().items,uid());
  if(i.group){if(!groups.has(i.group))groups.set(i.group,uid());copy.group=groups.get(i.group)}
  active().items.push(copy);created.push(copy);
 }
 persist();layout();
 refresh();updateValues();
 requestAnimationFrame(()=>{
  const node=[...$('wsGrid').children].find(n=>n.dataset.uid===created[0]?.uid);
  node?.scrollIntoView({block:'nearest',behavior:'auto'});
 });
 return created;
}
$('wsGrid').addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action,node=e.target.closest('.ws-card'),i=active().items.find(i=>i.uid===node?.dataset.uid);if(!i||layoutLocked()||i.cardLocked)return;if(['front','back','remove'].includes(action))window.INJWorkspaceProHooks?.beforeChange?.();if(action==='front'||action==='back'){active().items=active().items.filter(x=>x!==i);if(action==='front')active().items.push(i);else active().items.unshift(i);persist();layout();}if(action==='config')configure(i);if(action==='remove'){active().items=active().items.filter(x=>x!==i);persist();layout()}if(action==='duplicate')duplicateCards([i]);});
document.querySelectorAll('[data-config-action]').forEach(b=>b.onclick=()=>{const node=[...$('wsGrid').children].find(n=>n.dataset.uid===editingCard?.uid);if(node){node.querySelector('[data-action='+b.dataset.configAction+']')?.click();$('wsConfig').close();}});
$('wsGrid').addEventListener('pointerdown',e=>{
 if(immersive)return; // Touch and mouse never start layout edits in fullscreen.
 const handle=e.target.closest('[data-action]')||(!e.target.closest('button,input,select,a')?e.target.closest('.ws-card-head'):null),action=handle?.dataset.action||'move';
 if(!handle||!['move','resize'].includes(action)||layoutLocked()||e.button!==0)return;
 const node=handle.closest('.ws-card'),item=active().items.find(i=>i.uid===node.dataset.uid);if(!item||item.cardLocked)return;
 if(window.INJWorkspaceProHooks?.pointerSelect?.(e,item))return;
 e.preventDefault();handle.setPointerCapture(e.pointerId);drag={handle,node,item,action,edge:handle.dataset.edge||'se',key:mode(),startX:e.clientX,startY:e.clientY,scrollY:window.scrollY,unit:canvasUnit(),rect:{...item.layouts[mode()]},snapshot:structuredClone(active().items),moved:false,pointerY:e.clientY};node.classList.add('is-moving');window.INJWorkspaceProHooks?.dragStart?.(drag);
});
function moveDrag(clientX,clientY){if(!drag||immersive)return;const d=drag,dx=(clientX-d.startX)/d.unit,dy=(clientY-d.startY+window.scrollY-d.scrollY)/ROW;
 if(Math.abs(dx*d.unit)<2&&Math.abs(dy*ROW)<2&&!d.moved)return;d.moved=true;
 for(const i of active().items){const old=d.snapshot.find(x=>x.uid===i.uid);i.layouts[d.key]={...old.layouts[d.key]};}
 d.item.layouts[d.key]=M.transform(d.rect,d.action==='move'?'move':d.edge,dx,dy,cols(),{snap:!!active().snap,minW:Math.min(cols(),108/d.unit),minH:98/ROW});
 const movingGroup=window.INJWorkspaceProHooks?.dragMove?.(d);
 if(active().snap&&!movingGroup)M.settle(active().items,d.key,cols(),d.item.uid);
 for(const i of active().items)geometry([...$('wsGrid').children].find(n=>n.dataset.uid===i.uid),i);
 const end=Math.max(...active().items.map(i=>i.layouts[d.key].y+i.layouts[d.key].h));$('wsGrid').style.height=Math.max(end*ROW,innerHeight*.7)+'px';
}
let dragFrame=0;
function scrollDrag(){if(!drag||immersive)return;const y=drag.pointerY,dy=y>innerHeight-55?Math.min(18,(y-innerHeight+55)/3):y<55?-Math.min(18,(55-y)/3):0;if(dy){window.scrollBy(0,dy);moveDrag(drag.pointerX,drag.pointerY);}dragFrame=requestAnimationFrame(scrollDrag);}
$('wsGrid').addEventListener('pointermove',e=>{if(!drag||immersive)return;drag.pointerX=e.clientX;drag.pointerY=e.clientY;moveDrag(e.clientX,e.clientY);if(!dragFrame)dragFrame=requestAnimationFrame(scrollDrag);});
function endDrag(cancel=false){if(!drag)return;if(immersive)cancel=true;const d=drag;if(cancel)active().items=d.snapshot;else if(d.moved&&!active().snap){active().items=active().items.filter(i=>i!==d.item);active().items.push(d.item);}window.INJWorkspaceProHooks?.dragEnd?.(d,cancel);d.node.classList.remove('is-moving');drag=null;cancelAnimationFrame(dragFrame);dragFrame=0;persist();layout();}
$('wsGrid').addEventListener('pointerup',()=>endDrag());$('wsGrid').addEventListener('pointercancel',()=>endDrag(true));$('wsGrid').addEventListener('lostpointercapture',()=>endDrag());
$('wsGrid').addEventListener('keydown',e=>{const handle=e.target.closest('.ws-drag,.ws-resize'),node=handle?.closest('.ws-card'),i=active().items.find(i=>i.uid===node?.dataset.uid);if(!i||layoutLocked()||i.cardLocked||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();window.INJWorkspaceProHooks?.beforeChange?.();const px=e.shiftKey?10:1,dx=(e.key==='ArrowRight'?px:e.key==='ArrowLeft'?-px:0)/canvasUnit(),dy=(e.key==='ArrowDown'?px:e.key==='ArrowUp'?-px:0)/ROW;i.layouts[mode()]=M.transform(i.layouts[mode()],handle.classList.contains('ws-drag')?'move':handle.dataset.edge,dx,dy,cols(),{snap:false,minW:108/canvasUnit(),minH:98/ROW});if(active().snap)M.settle(active().items,mode(),cols(),i.uid);persist();layout();});
$('wsSnap').onclick=()=>{window.INJWorkspaceProHooks?.beforeChange?.();active().snap=!active().snap;persist();layout();};
function ask(label,value,callback){$('wsPromptTitle').textContent=label;$('wsPromptValue').value=value;$('wsPrompt').showModal();$('wsPromptValue').focus();$('wsPromptForm').onsubmit=e=>{e.preventDefault();const v=$('wsPromptValue').value.trim();if(!v)return;$('wsPrompt').close();callback(v)};}
function presetList(){const list=$('wsPresetList');list.replaceChildren();for(const p of db.presets){const row=el('div','ws-preset-row');row.dataset.presetId=p.id;row.append(el('strong','',p.name+(p.id===db.active?' ✓':'')+(p.id===db.defaultId?' ★':'')));const controls=el('div');const button=(label,fn)=>{const b=el('button','',label);b.onclick=fn;controls.append(b)};button(t('Apri','Open'),()=>{db.active=p.id;persist();layout();$('wsPresetDialog').close();refresh()});button(t('Rinomina','Rename'),()=>ask(t('Nome preset','Preset name'),p.name,name=>{window.INJWorkspaceProHooks?.beforeChange?.();p.name=name;persist();presetList();layout()}));button(p.id===db.defaultId?t('Rimuovi predefinito','Unset default'):t('Predefinito','Default'),()=>{window.INJWorkspaceProHooks?.beforeChange?.();db.defaultId=db.defaultId===p.id?null:p.id;persist();presetList()});button(t('Elimina','Delete'),()=>{if(db.presets.length===1)return notice(t('Mantieni almeno un preset','Keep at least one preset'));if(!confirm(t('Eliminare il preset ','Delete preset ')+p.name+'?'))return;window.INJWorkspaceProHooks?.beforeChange?.();db.presets=db.presets.filter(x=>x!==p);if(db.active===p.id)db.active=db.presets[0].id;if(db.defaultId===p.id)db.defaultId=null;persist();presetList();layout()});row.append(controls);list.append(row)}}
function newPreset(duplicate){if(db.presets.length>=50)return notice(t('Massimo 50 preset','Maximum 50 presets'));ask(t('Nome preset','Preset name'),duplicate?active().name+' copy':'Workspace '+(db.presets.length+1),name=>{window.INJWorkspaceProHooks?.beforeChange?.();const p=duplicate?structuredClone(active()):{items:[],locked:false};p.id=uid();p.name=name;p.items.forEach(i=>i.uid=uid());db.presets.push(p);db.active=p.id;persist();layout();$('wsPresetDialog').close();refresh()})}
$('wsNew').onclick=()=>newPreset(false);$('wsDuplicatePreset').onclick=()=>newPreset(true);
$('wsExport').onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='INJ-Workspace-presets.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('wsImport').onclick=()=>$('wsFile').click();$('wsFile').onchange=async e=>{const file=e.target.files[0];try{if(!file||file.size>2_000_000)throw Error();const imported=M.sanitize(JSON.parse(await file.text()));if(db.presets.length+imported.presets.length>50)throw Error();window.INJWorkspaceProHooks?.beforeChange?.();for(const p of imported.presets){p.id=uid();p.items.forEach(i=>i.uid=uid());db.presets.push(p)}db.active=db.presets.at(-1).id;persist();presetList();layout();refresh();notice(t('Preset importati','Presets imported'))}catch(_){notice(t('File non valido o limite di 50 preset superato','Invalid file or 50 preset limit exceeded'))}e.target.value='';};
$('wsAdd').onclick=$('wsEmptyAdd').onclick=openCatalog;$('wsSearch').oninput=()=>{renderCatalog();refresh()};$('wsKind').onchange=()=>{renderCatalog();refresh()};$('wsSource').onchange=()=>{renderCatalog();refresh()};$('wsPresets').onclick=()=>{presetList();$('wsPresetDialog').showModal()};$('wsEdit').onclick=()=>{if(mode()==='mobile'){if(drag)endDrag(true);mobileEditing=!mobileEditing;window.INJWorkspaceProHooks?.editModeChange?.(mobileEditing);layout();return;}window.INJWorkspaceProHooks?.beforeChange?.();active().locked=!active().locked;persist();layout()};$('wsSave').onclick=()=>persist(true);function setImmersive(on){
 if(on&&drag)endDrag(true);
 if(on&&mobileEditing){mobileEditing=false;window.INJWorkspaceProHooks?.editModeChange?.(false);}
 immersive=on;
 document.body.classList.toggle('ws-immersive',on);
 window.INJWorkspaceProHooks?.immersiveChange?.(on);
 $('wsExitFull').hidden=!on;
 $('wsFull').setAttribute('aria-pressed',String(on));
 layout();
}
async function exitImmersive(){setImmersive(false);try{if(document.fullscreenElement)await document.exitFullscreen()}catch(_){}$('wsFull').focus();}
$('wsFull').onclick=async()=>{if(immersive)return exitImmersive();persist();setImmersive(true);try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen()}catch(_){/* Keep the clean presentation view on browsers without native fullscreen. */}};
$('wsExitFull').onclick=exitImmersive;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&immersive)setImmersive(false);else if(document.fullscreenElement&&!immersive)setImmersive(true)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&immersive){e.preventDefault();e.stopImmediatePropagation();exitImmersive();}},true);

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
const labels={chartStyle:['Tipo di grafico','Chart type'],title:['Titolo personalizzato','Custom title'],source:['Sorgente wallet','Wallet source'],width:['Larghezza (px)','Width (px)'],height:['Altezza (px)','Height (px)'],column:['Posizione X (px)','X position (px)'],row:['Posizione Y (px)','Y position (px)'],appearance:['Aspetto','Appearance'],timeframe:['Timeframe','Timeframe'],goal:['Traguardo (USD)','Goal (USD)'],border:['Mostra bordo','Show border'],details:['Mostra dettagli','Show details']};
function language(){document.documentElement.lang=t('it','en');for(const [id,it,en]of [['wsAdd','＋ Aggiungi','＋ Add'],['wsPresets','Preset','Presets'],['wsSave','Salva','Save'],['wsCatalogTitle','Aggiungi una card','Add a card'],['wsSourceLabel','Sorgente per le nuove card','Source for new cards'],['wsEmptyAdd','＋ Aggiungi la prima card','＋ Add your first card'],['wsApply','Applica','Apply'],['wsNew','＋ Nuovo vuoto','＋ New blank'],['wsDuplicatePreset','Duplica attuale','Duplicate current'],['wsExport','Esporta','Export'],['wsImport','Importa','Import']])$(id).textContent=t(it,en);$('wsSearch').placeholder=t('Cerca una card…','Search cards…');$('wsEmpty').querySelector('h1').textContent=t('Il tuo spazio, i tuoi dati','Your space, your data');$('wsEmpty').querySelector('p').textContent=t('Scegli le card, collega i wallet e componi il tuo setup. Parti da uno spazio completamente vuoto.','Choose cards, connect wallets and compose your setup. Start with a completely blank space.');$('wsStorageNote').textContent=t('Salvataggio automatico su questo dispositivo. Esporta i preset per trasferirli: il file contiene i riferimenti agli indirizzi pubblici. Nessuna sincronizzazione cloud.','Autosaved on this device. Export presets to transfer them: the file includes references to public addresses. No cloud sync.');$('wsConfigForm').elements.chartStyle.options[0].textContent=t('Linee','Line');$('wsConfigForm').elements.chartStyle.options[1].textContent=t('Candele','Candles');$('wsExitFull').title=t('Esci da schermo intero','Exit fullscreen');$('wsExitFull').setAttribute('aria-label',$('wsExitFull').title);document.querySelectorAll('[data-config-action]').forEach(b=>b.textContent=({front:t('Porta davanti','Bring forward'),back:t('Porta dietro','Send back'),duplicate:t('Duplica','Duplicate'),remove:t('Rimuovi','Remove')})[b.dataset.configAction]);document.querySelectorAll('[data-text]').forEach(n=>n.textContent=t(...labels[n.dataset.text]));layout();}
async function json(url){const c=new AbortController(),timeout=setTimeout(()=>c.abort(),7000);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(timeout)}}
async function lcd(path){for(const root of ['https://sentry.lcd.injective.network:443','https://lcd.injective.network','https://1rpc.io/inj-lcd'])try{return await json(root+path)}catch(_){}throw Error('LCD unavailable')}
async function walletData(address){try{const [bank,reward,staking,unbond]=await Promise.all([lcd('/cosmos/bank/v1beta1/balances/'+address+'/by_denom?denom=inj'),lcd('/cosmos/distribution/v1beta1/delegators/'+address+'/rewards'),lcd('/cosmos/staking/v1beta1/delegations/'+address+'?pagination.limit=1000'),lcd('/cosmos/staking/v1beta1/delegators/'+address+'/unbonding_delegations?pagination.limit=1000')]);if(staking.pagination?.next_key||unbond.pagination?.next_key||!Array.isArray(staking.delegation_responses)||!Array.isArray(reward.total)||!Array.isArray(unbond.unbonding_responses)||!bank.balance)throw Error('Incomplete');const fromWei=v=>Number(v||0)/1e18;const staked=staking.delegation_responses.reduce((a,r)=>a+fromWei(r.balance?.amount),0),available=fromWei(bank.balance.amount),rewards=reward.total.filter(c=>c.denom==='inj').reduce((a,r)=>a+fromWei(r.amount),0),unbonding=unbond.unbonding_responses.reduce((a,r)=>a+(r.entries||[]).reduce((s,x)=>s+fromWei(x.balance),0),0);const cache=read('inj_monitor_summaries_v1',{})[address]||{};const validators=staking.delegation_responses.map(r=>({operator:r.delegation?.validator_address,amount:fromWei(r.balance?.amount)}));const row={...cache,validators:cache.validators||validators,staked,available,rewards,unbonding,total:staked+available+rewards+unbonding,updated:Date.now(),verified:true};if(![row.staked,row.available,row.rewards,row.total].every(Number.isFinite))throw Error('Invalid response');data.rows[address]=row;}catch(_){/* Retain last successful snapshot with its timestamp. */}}
function neededAddresses(){const cards=$('wsCatalog').open?[...active().items,{source:$('wsSource').value,type:'total'}]:active().items;const w=wallets();return [...new Set(cards.filter(i=>!marketType(i.type)).flatMap(i=>i.source==='all'?w.map(w=>w.address):[i.source==='selected'?selected():i.source]))].filter(a=>/^inj1[a-z0-9]{38,60}$/.test(a||''))}
async function refreshWallets(){if(data.loading||document.hidden)return;data.loading=true;try{const addresses=neededAddresses();if(sharedSource()&&typeof parent.INJ_MORNING_REFRESH==='function'){await parent.INJ_MORNING_REFRESH();const saved=new Set(wallets().map(w=>w.address));await Promise.all(addresses.filter(a=>!saved.has(a)).map(walletData));}else await Promise.all(addresses.map(walletData));data.lastWallet=Date.now();updateValues()}finally{data.loading=false}}
async function refreshMarket(){if(data.marketBusy||document.hidden)return;if(useSharedMarket()){updateValues();return}data.marketBusy=true;try{let d;try{d=await json('https://api.binance.com/api/v3/ticker/24hr?symbol=INJUSDT');const p=Number(d.lastPrice);if(!(p>0))throw Error('Price');if(Date.now()-data.lastTradeAt>15000){data.price=p;data.priceAt=Date.now();data.priceSource='Binance';}data.market={open24:Number(d.openPrice),low24:Number(d.lowPrice),high24:Number(d.highPrice)};data.change=Number(d.priceChangePercent);if(Date.now()-data.lastTradeAt>15000){data.priceSource='Binance';data.priceAt=Date.now();}}catch(_){d=await json('https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd&include_24hr_change=true');const p=Number(d?.['injective-protocol']?.usd);if(p>0){data.change=Number(d['injective-protocol'].usd_24h_change);if(Date.now()-data.lastTradeAt>15000){data.price=p;data.priceSource='CoinGecko';data.priceAt=Date.now()}}}}catch(_){}finally{data.marketBusy=false;updateValues()}}
async function chart(tf){
 const needsCandles=[...active().items,...($('wsCatalog').open?[...document.querySelectorAll('.ws-preview')].map(n=>n._item):[])].some(i=>C.isChart(i.type)&&i.timeframe===tf&&i.chartStyle==='candles');
 if(!M.timeframes[tf]||data.chartBusy.has(tf)||Date.now()-(data.charts[tf]?.at||0)<55000&&(!needsCandles||data.charts[tf]?.candles?.length))return;
 data.chartBusy.add(tf);
 try{
  let points,candles=[],source='Binance';const config=M.timeframes[tf];
  for(const base of ['https://api.binance.com','https://data-api.binance.vision','https://api1.binance.com']){
   try{const raw=await json(base+'/api/v3/klines?symbol=INJUSDT&interval='+config.interval+'&limit='+config.limit);candles=Live.aggregate(M.parseKlines(raw),config.bucketMs||Live.intervalMs(config.interval));if(candles.length>1){points=candles.map(c=>[c.t,c.c]);break}}catch(_){}
  }
  if(!points){const days=tf==='7d'?7:tf==='30d'?30:1;const d=await json('https://api.coingecko.com/api/v3/coins/injective-protocol/market_chart?vs_currency=usd&days='+days);points=(d.prices||[]).filter(r=>r[0]>=Date.now()-config.ms&&r.every(Number.isFinite));source='CoinGecko';}
  if(points.length>1){if(!candles.length&&data.charts[tf]?.candles?.length)return;const old=data.charts[tf];data.charts[tf]=candles.length?{...Live.merge(old||{candles:[],points:[]},candles),at:Date.now(),source}:{at:Date.now(),points,candles,source};const last=points.at(-1);if(data.price===null&&last[1]>0&&Date.now()-last[0]<120000){data.price=last[1];data.priceAt=last[0];data.priceSource=source+' snapshot';}}
 }catch(_){}finally{data.chartBusy.delete(tf);updateValues()}
}

const earlierBusy=new Set();
async function loadEarlier(tf,before){if(earlierBusy.has(tf))return;earlierBusy.add(tf);try{const config=M.timeframes[tf];for(const base of ['https://api.binance.com','https://data-api.binance.vision','https://api1.binance.com'])try{const raw=await json(base+'/api/v3/klines?symbol=INJUSDT&interval='+config.interval+'&limit=500&endTime='+(Math.floor(before)-1));const rows=Live.aggregate(M.parseKlines(raw),config.bucketMs||Live.intervalMs(config.interval));if(rows.length){Live.merge(data.charts[tf],rows);return}}catch(_){}}finally{earlierBusy.delete(tf)}}
const feed=Live.createFeed((price,time)=>{if(time<data.lastTradeAt)return;data.lastTradeAt=time;data.price=price;data.priceAt=Date.now();data.priceSource='Binance live';for(const [tf,h]of Object.entries(data.charts))Live.apply(h,price,time,M.timeframes[tf].bucketMs||Live.intervalMs(M.timeframes[tf].interval));});

function refresh(){feed.watch(active().items.some(i=>C.isChart(i.type)||i.type==='price')||$('wsCatalog').open);sections.refresh([...active().items,...($('wsCatalog').open?[...document.querySelectorAll('.ws-preview')].map(n=>n._item):[])]);refreshWallets();refreshMarket();const tfs=new Set(active().items.filter(i=>C.isChart(i.type)).map(i=>i.timeframe));if($('wsCatalog').open)for(const i of [...document.querySelectorAll('.ws-preview')].map(n=>n._item))if(C.isChart(i.type))tfs.add(i.timeframe);tfs.forEach(chart);}
window.addEventListener('resize',()=>{if(drag)endDrag(true);if(lastMode!==mode()){lastMode=mode();mobileEditing=false;window.INJWorkspaceProHooks?.editModeChange?.(false);}layout()});window.addEventListener('storage',e=>{if(e.key===KEY){try{db=M.sanitize(read(KEY,null));layout()}catch(_){}}else{language();refresh()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden){feed.resume();refresh();updateValues()}else feed.pause()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)endDrag(true)});
function changeSectionOption(item,key,value){const actual=active().items.find(i=>i===item);if(actual)window.INJWorkspaceProHooks?.beforeChange?.();item[key]=value;if(key==='targetAmount')item._targetEdited=true;if(actual)persist();else previewOptions.set(item.type,item);updateValues();refresh();}
const sections=INJWorkspaceSections.create({M,C,t,read,el,money,quantity,num,metrics,rowsFor,selected,wallets,paint:INJWorkspaceValues.paint,json,lcd,supplement:(address,patch)=>{data.supplements[address]={...data.supplements[address],...patch};updateValues()},
 price:()=>Date.now()-data.priceAt<120000?data.price:null,priceAt:()=>data.priceAt,marketChange:()=>Number.isFinite(data.change)?data.change:null,
 currency:()=>localStorage.getItem('inj_monitor_currency')==='EUR'?'EUR':'USD',fx:()=>localStorage.getItem('inj_monitor_currency')==='EUR'?Number(localStorage.getItem('inj_monitor_eur_rate')):1,
 row:address=>rowsFor({source:address,type:'total'})[0]||null,market:()=>data.market,updated:updateValues,
 change:changeSectionOption
});

window.INJWorkspaceProAPI={configure,duplicateCards,feedInfo:i=>sections.feedInfo(i),getDb:()=>db,active,mode,canEdit:()=>!layoutLocked(),cols,unit:canvasUnit,layout,persist,refresh,uid,t,metrics,rowsFor,selected,wallets,marketType,priceInfo:()=>({price:data.price,priceAt:data.priceAt,priceSource:data.priceSource}),catalog:C,model:M,notice};
language();persist();refresh();timer=setInterval(updateValues,500);networkTimer=setInterval(refresh,30000);
window.addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(networkTimer);feed.close();persist()},{once:true});
})();
