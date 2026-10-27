/* INJ Workspace PRO: additive editor controls. All native widget renderers stay untouched. */
(() => {
'use strict';
const A=window.INJWorkspaceProAPI;
if(!A)return;
const $=id=>document.getElementById(id);
const T=(it,en)=>A.t(it,en);
const grid=$('wsGrid');
const selected=new Set();
const undoStack=[],redoStack=[];
let dragBefore=null,monitorOpen=false,prevStatus=0;
const snapshot=()=>JSON.stringify(A.getDb());
const preset=()=>A.active();
const items=()=>preset().items;
const get=id=>items().find(i=>i.uid===id);
const sealed=()=>document.body.classList.contains('ws-immersive');
const allowed=()=>A.canEdit()&&!sealed();
const notice=A.notice;
function pushHistory(before=snapshot()){
 if(undoStack.at(-1)!==before){undoStack.push(before);if(undoStack.length>80)undoStack.shift();}
 redoStack.length=0;buttons();
}
function restore(json){
 try{
  const replacement=A.model.sanitize(JSON.parse(json)),db=A.getDb();
  Object.keys(db).forEach(k=>delete db[k]);
  Object.assign(db,replacement);selected.clear();dragBefore=null;
  $('wsConfig').close();
  A.persist();A.layout();A.refresh();buttons();updateStatus(true);
 }catch(err){console.warn('Workspace history restore skipped',err);}
}
function undo(){if(!allowed()||!undoStack.length)return;const current=snapshot(),previous=undoStack.pop();redoStack.push(current);restore(previous);}
function redo(){if(!allowed()||!redoStack.length)return;const current=snapshot(),next=redoStack.pop();undoStack.push(current);restore(next);}
function mutate(fn){
 if(!allowed())return notice(T('Sblocca il layout per modificare','Unlock the layout to edit'));
 if(selection().some(i=>i.cardLocked))return notice(T('Sblocca le card selezionate prima di modificarle','Unlock selected cards before editing'));
 pushHistory();$('wsConfig').close();fn();A.persist();A.layout();A.refresh();buttons();
}
function select(uid,additive){
 if(!allowed())return;
 const item=get(uid);if(!item)return;
 const group=item.group||'';
 const groupIds=group?items().filter(x=>x.group===group).map(x=>x.uid):[uid];
 if(!additive)selected.clear();
 if(additive&&selected.has(uid))groupIds.forEach(x=>selected.delete(x));
 else groupIds.forEach(x=>selected.add(x));
 buttons();
 if(selected.size===1&&!item.cardLocked&&allowed()&&!document.body.classList.contains('ws-immersive'))A.configure(item);
 else $('wsConfig').close();
}
function selection(){return items().filter(i=>selected.has(i.uid));}
function languageButton(it,en){return T(it,en);}
function control(label,action,cls){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.proAction=action;
 if(cls)b.className=cls;return b;
}
const bar=document.createElement('div');bar.id='wsProContext';bar.className='ws-pro-context';bar.hidden=true;
bar.setAttribute('aria-label','Workspace editor');
bar.innerHTML='<span id="wsProSelection"></span>';
const actions=[
 ['Compatta','Compact','compact'],['Standard','Standard','standard'],['Espansa','Expanded','expanded'],
 ['Raggruppa','Group','group'],['Separa','Ungroup','ungroup'],['Allinea X','Align left','left'],
 ['Allinea Y','Align top','top'],['Distribuisci','Distribute','distribute'],
 ['Stessa larghezza','Equal width','width'],['Stessa altezza','Equal height','height'],['Distribuisci verticale','Distribute vertically','vertical'],
 ['Duplica','Duplicate','duplicate'],['Blocca/Sblocca','Lock/Unlock','cardlock'],
 ['Annulla','Undo','undo'],['Ripristina','Redo','redo']
];
for(const [it,en,key] of actions)bar.append(control(languageButton(it,en),key,key==='undo'||key==='redo'?'ws-pro-history':''));
document.querySelector('.ws-toolbar').insertAdjacentElement('afterend',bar);
const historyBar=document.createElement('span');historyBar.className='ws-pro-history-bar';
historyBar.append(control('↶ '+T('Annulla','Undo'),'undo'),control('↷ '+T('Ripristina','Redo'),'redo'));
$('wsSave').insertAdjacentElement('afterend',historyBar);
function buttons(){
 const valid=new Set(items().map(i=>i.uid));
 for(const id of selected)if(!valid.has(id))selected.delete(id);
 const chosen=selection();
 bar.hidden=selected.size===0||!allowed();
 $('wsProSelection').textContent=chosen.length+' '+T('card selezionate','selected cards');
 for(const node of grid.querySelectorAll('.ws-card')){
  node.classList.toggle('ws-pro-selected',selected.has(node.dataset.uid));
  node.classList.toggle('ws-pro-grouped',!!get(node.dataset.uid)?.group);
 }
 for(const btn of document.querySelectorAll('[data-pro-action]')){
  const a=btn.dataset.proAction;
  if(a==='undo')btn.disabled=!undoStack.length||!allowed();
  else if(a==='redo')btn.disabled=!redoStack.length||!allowed();
  else if(a.startsWith('template-'))btn.disabled=A.getDb().presets.length>=50;
  else if(a==='distribute')btn.disabled=chosen.length<3;
  else if(a!=='monitor')btn.disabled=!chosen.length||!allowed();
 }
}
function resizeView(v){
 const factor=v==='compact'?.72:v==='expanded'?1.42:1;
 mutate(()=>{
  for(const i of selection()){
   i.view=v;
   const spec=A.catalog.byType[i.type];
   for(const key of ['desktop','mobile']){
    const cols=key==='desktop'?12:4,r=i.layouts[key];
    const w=Math.max(.75,Math.min(cols,(key==='desktop'?spec.w:Math.min(4,spec.w))*factor));
    const h=Math.max(1.75,Math.min(48,spec.h*factor));
    i.layouts[key]=A.model.normalize({...r,w,h},cols);
   }
  }
  if(preset().snap)for(const [key,c] of [['desktop',12],['mobile',4]])A.model.settle(items(),key,c);
 });
}
function duplicate(){
 if(!allowed())return;
 const created=A.duplicateCards(selection());
 if(created.length){selected.clear();created.forEach(i=>selected.add(i.uid));buttons();}
}
function group(set){
 mutate(()=>{
  const id=set?A.uid():'';
  for(const i of selection())i.group=id;
 });
}
function align(axis){
 if(selection().length<2)return;
 mutate(()=>{
  const key=A.mode(),chosen=selection(),anchor=Math.min(...chosen.map(i=>i.layouts[key][axis]));
  if(axis==='x')for(const i of chosen)i.layouts[key].x=Math.max(0,Math.min(A.cols()-i.layouts[key].w,anchor));
  else for(const i of chosen)i.layouts[key].y=anchor;
  if(preset().snap)A.model.settle(items(),key,A.cols());
 });
}
function distribute(){
 if(selection().length<3)return;
 mutate(()=>{
  const key=A.mode(),sorted=selection().sort((a,b)=>a.layouts[key].x-b.layouts[key].x);
  const l=sorted[0].layouts[key].x,r=sorted.at(-1).layouts[key].x+sorted.at(-1).layouts[key].w;
  const gap=(r-l-sorted.reduce((sum,i)=>sum+i.layouts[key].w,0))/(sorted.length-1);
  let cursor=l;for(const i of sorted){i.layouts[key].x=cursor;cursor+=i.layouts[key].w+gap;}
  if(preset().snap)A.model.settle(items(),key,A.cols());
 });
}
bar.addEventListener('click',e=>{const a=e.target.closest('[data-pro-action]')?.dataset.proAction;if(a)run(a);});
historyBar.addEventListener('click',e=>{const a=e.target.closest('[data-pro-action]')?.dataset.proAction;if(a)run(a);});
function run(a){
 if(sealed())return;
 if(a==='undo')return undo();
 if(a==='redo')return redo();
 if(['compact','standard','expanded'].includes(a))return resizeView(a);
 if(a==='duplicate')return duplicate();
 if(a==='group')return group(true);
 if(a==='ungroup')return group(false);
 if(a==='left')return align('x');
 if(a==='top')return align('y');
 if(a==='distribute')return distribute();
 if(a==='width'||a==='height')return mutate(()=>{const key=A.mode(),field=a==='width'?'w':'h',value=selection()[0].layouts[key][field];for(const i of selection())i.layouts[key]=A.model.normalize({...i.layouts[key],[field]:value},A.cols());});
 if(a==='vertical')return mutate(()=>{const key=A.mode(),list=selection().sort((a,b)=>a.layouts[key].y-b.layouts[key].y);if(list.length<3)return;const first=list[0].layouts[key],last=list.at(-1).layouts[key];const gap=(last.y+last.h-first.y-list.reduce((s,i)=>s+i.layouts[key].h,0))/(list.length-1);let y=first.y;for(const i of list){i.layouts[key].y=y;y+=i.layouts[key].h+gap;}});
 if(a==='cardlock'&&allowed()){pushHistory();const lock=!selection().every(i=>i.cardLocked);for(const i of selection())i.cardLocked=lock;A.persist();A.layout();}
}
grid.addEventListener('pointerdown',e=>{
 if(!allowed())return;
 const node=e.target.closest('.ws-card');if(!node||e.target.closest('button,input,select,a,.ws-section-controls,.ws-interactive-chart,.ws-plot'))return;
 if(e.shiftKey||e.ctrlKey||e.metaKey){select(node.dataset.uid,true);e.stopImmediatePropagation();e.preventDefault();}
 else if(!e.target.closest('.ws-card-head')||get(node.dataset.uid)?.cardLocked)select(node.dataset.uid,false);
},true);
document.addEventListener('keydown',e=>{
 if(sealed())return;
 const el=e.target,isTyping=el?.matches?.('input,textarea,select,[contenteditable]')||el?.closest?.('dialog');
 if(isTyping)return;
 const cmd=e.ctrlKey||e.metaKey;
 if(cmd&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}
 else if(cmd&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
 else if(cmd&&e.key.toLowerCase()==='d'&&selection().length){e.preventDefault();duplicate();}
 else if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('ws-immersive')){selected.clear();buttons();}
});
const measurement=document.createElement('output');measurement.className='ws-pro-measure';measurement.hidden=true;grid.insertAdjacentElement('afterend',measurement);
const guides=()=>{measurement.hidden=true;grid.classList.remove('ws-guide-x','ws-guide-y');grid.style.removeProperty('--ws-guide-x');grid.style.removeProperty('--ws-guide-y');};
function alignGuide(d,rect){
 if(preset().snap){guides();return rect;}
 const unit=d.unit,thresholdX=8/unit,thresholdY=8/56;
 const candidates=items().filter(i=>i.uid!==d.item.uid&&!selected.has(i.uid)).map(i=>i.layouts[d.key]);
 const gaps=candidates.flatMap(r=>{const out=[];if(rect.y<r.y+r.h&&rect.y+rect.h>r.y){const g=Math.max(r.x-rect.x-rect.w,rect.x-r.x-r.w);if(g>=0)out.push(g*unit+8);}if(rect.x<r.x+r.w&&rect.x+rect.w>r.x){const g=Math.max(r.y-rect.y-rect.h,rect.y-r.y-r.h);if(g>=0)out.push(g*56+8);}return out;});
 measurement.hidden=false;measurement.textContent='X '+Math.round(rect.x*unit)+' · Y '+Math.round(rect.y*56)+' px'+(gaps.length?' · '+T('Spazio','Gap')+' '+Math.round(Math.min(...gaps))+' px':'');
 let bestX=null,bestY=null;
 const xedges=d.action==='move'?['x','right']:d.edge.includes('e')?['right']:d.edge.includes('w')?['x']:[];
 const yedges=d.action==='move'?['y','bottom']:d.edge.includes('s')?['bottom']:d.edge.includes('n')?['y']:[];
 const xof=(r,edge)=>edge==='right'?r.x+r.w:r.x;
 const yof=(r,edge)=>edge==='bottom'?r.y+r.h:r.y;
 for(const other of [...candidates,{x:0,y:0,w:A.cols(),h:Math.max(20,grid.clientHeight/56)}]){
  for(const edge of xedges)for(const target of [other.x,other.x+other.w,other.x+other.w/2]){
   const dist=target-xof(rect,edge);if(Math.abs(dist)<=thresholdX&&(!bestX||Math.abs(dist)<Math.abs(bestX.dist)))bestX={dist,target,edge};
  }
  for(const edge of yedges)for(const target of [other.y,other.y+other.h,other.y+other.h/2]){
   const dist=target-yof(rect,edge);if(Math.abs(dist)<=thresholdY&&(!bestY||Math.abs(dist)<Math.abs(bestY.dist)))bestY={dist,target,edge};
  }
 }
 if(bestX){
  if(d.action==='move')rect.x+=bestX.dist;
  else if(bestX.edge==='right')rect.w+=bestX.dist;
  else{rect.x+=bestX.dist;rect.w-=bestX.dist;}
  grid.style.setProperty('--ws-guide-x',bestX.target*unit+'px');grid.classList.add('ws-guide-x');
 }else{grid.classList.remove('ws-guide-x');}
 if(bestY){
  if(d.action==='move')rect.y+=bestY.dist;
  else if(bestY.edge==='bottom')rect.h+=bestY.dist;
  else{rect.y+=bestY.dist;rect.h-=bestY.dist;}
  grid.style.setProperty('--ws-guide-y',bestY.target*56+'px');grid.classList.add('ws-guide-y');
 }else{grid.classList.remove('ws-guide-y');}
 return A.model.normalize(rect,A.cols());
}
window.INJWorkspaceProHooks={
 beforeChange(){pushHistory();},
 pointerSelect(e,item){
  if(!allowed())return true;
  if(e.shiftKey||e.metaKey||e.ctrlKey){select(item.uid,true);return true;}
  if(!selected.has(item.uid))select(item.uid,false);
  return false;
 },
 dragStart(d){if(sealed())return;dragBefore=snapshot();$('wsConfig').close();if(!selected.has(d.item.uid))select(d.item.uid,false);},
 dragMove(d){
  if(sealed())return false;
  const moving=d.item.layouts[d.key];
  d.item.layouts[d.key]=alignGuide(d,{...moving});
  if(d.action!=='move'||selected.size<2||!selected.has(d.item.uid))return false;
  const originals=d.snapshot.filter(i=>selected.has(i.uid)&&!i.cardLocked).map(i=>i.layouts[d.key]);
  const dx=Math.max(-Math.min(...originals.map(r=>r.x)),Math.min(A.cols()-Math.max(...originals.map(r=>r.x+r.w)),d.item.layouts[d.key].x-d.rect.x));
  const dy=Math.max(-Math.min(...originals.map(r=>r.y)),d.item.layouts[d.key].y-d.rect.y);
  d.item.layouts[d.key]={...d.rect,x:d.rect.x+dx,y:d.rect.y+dy};
  for(const i of items()){
   if(!selected.has(i.uid)||i.uid===d.item.uid||i.cardLocked)continue;
   const original=d.snapshot.find(x=>x.uid===i.uid);
   if(original)i.layouts[d.key]=A.model.normalize({...original.layouts[d.key],x:original.layouts[d.key].x+dx,y:original.layouts[d.key].y+dy},A.cols());
  }
  if(preset().snap){
   const chosen=items().filter(i=>selected.has(i.uid)&&!i.cardLocked);
   const others=items().filter(i=>!selected.has(i.uid));
   // Move the group as one rectangle: preserve member offsets instead of settling them independently.
   for(let n=0;n<30;n++){
    let shift=0;
    for(const i of chosen)for(const other of others){
     const a=i.layouts[d.key],b=other.layouts[d.key];
     if(A.model.overlaps(a,b))shift=Math.max(shift,b.y+b.h-a.y);
    }
    if(shift<=0)break;
    for(const i of chosen)i.layouts[d.key].y+=shift;
   }
  }
  return true;
 },
 dragEnd(d,cancel){guides();if(!cancel&&d.moved&&dragBefore)pushHistory(dragBefore);dragBefore=null;},
 immersiveChange(on){if(on){selected.clear();dragBefore=null;guides();$('wsConfig').close();}buttons();},
 editModeChange(on){if(!on){selected.clear();dragBefore=null;guides();if($('wsConfig').open)$('wsConfig').close();}buttons();},
 afterLayout(){buttons();updateStatus();renderMonitor();},
 refreshStatus(){updateStatus();}
};
function updateStatus(force){
 if(!force&&Date.now()-prevStatus<1900)return;prevStatus=Date.now();
 const price=A.priceInfo(),now=Date.now(),estimates=new Set(['target','daily','hourly','weekly','monthly','yearly','velocity','accumulation','productionlevel','ladder','ladderall','growth','growthsimple','potentialincome','incomeperiods','potential','allpotential']);
 for(const node of grid.querySelectorAll('.ws-card')){
  const i=get(node.dataset.uid);if(!i)continue;
  let state='offline',source='',at=0;
  if(A.marketType(i.type)){at=price.priceAt||0;const directPrice=new Set(['chart','liveview','price','low24','high24','change24']);source=directPrice.has(i.type)?(price.priceSource||'Market'):T('Dati mercato · feed specifico','Market data · specific feed');state=price.price>0&&at?(directPrice.has(i.type)&&now-at<65000?'live':'snapshot'):'offline';}
  else{
   const rows=A.rowsFor(i),valid=rows.filter(r=>r&&Number.isFinite(r.updated));
   at=valid.length?Math.min(...valid.map(r=>r.updated)):0;
   source=valid.length&&valid.every(r=>r.verified)?'Injective on-chain':'Wallet cache';
   state=valid.length===rows.length&&at>0?(now-at<90000&&valid.every(r=>r.verified)?'live':'snapshot'):'offline';
   if(state!=='offline'&&estimates.has(i.type))state='estimate';
  }
  const feed=A.feedInfo(i);if(feed){at=feed.at;source=feed.source;state=at?'snapshot':'offline';}
  if(navigator.onLine===false)state='offline';
  const words={live:'LIVE',snapshot:'SNAPSHOT',estimate:T('STIMA','ESTIMATE'),offline:'OFFLINE'};
  const head=node.querySelector('.ws-card-heading');if(!head)continue;
  let badge=head.querySelector('.ws-pro-data');
  if(!badge){badge=document.createElement('button');badge.type='button';badge.className='ws-pro-data';badge.addEventListener('click',()=>notice(badge.title));head.append(badge);}
  badge.dataset.state=state;badge.textContent=words[state];
  badge.title=source+' · '+(at?new Date(at).toLocaleTimeString():'—');badge.setAttribute('aria-label',words[state]+' · '+badge.title);
  node.dataset.proStatus=state;
 }
}
const monitorBtn=control('◉ PRO','monitor','ws-pro-monitor-button');
monitorBtn.title=T('Opzioni modalità Monitor','Monitor mode options');
$('wsFull').insertAdjacentElement('beforebegin',monitorBtn);
const monitorDialog=document.createElement('div');monitorDialog.className='ws-pro-monitor-options';monitorDialog.hidden=true;
monitorDialog.innerHTML='<strong>MONITOR / PRO</strong><button type="button" data-pro-close aria-label="Close">×</button><label><input type="checkbox" name="controls"> '+T('Comandi al passaggio','Hover controls')+'</label><label><input type="checkbox" name="header"> '+T('Mostra intestazioni','Show headings')+'</label><label><input type="checkbox" name="status"> '+T('Mostra stati dati','Show data statuses')+'</label><label><input type="checkbox" name="density"> '+T('Densità compatta','Compact density')+'</label>';
document.body.append(monitorDialog);
const monitorFloat=control('⚙','monitor','ws-pro-monitor-float');monitorFloat.title=monitorBtn.title;document.body.append(monitorFloat);
function monitor(){
 const p=preset();if(!p.monitor)p.monitor={density:'comfortable',controls:true,header:true,status:true};
 return p.monitor;
}
function renderMonitor(){
 const m=monitor();
 document.body.classList.toggle('ws-monitor-condensed',m.density==='compact');
 document.body.classList.toggle('ws-monitor-no-controls',m.controls===false);
 document.body.classList.toggle('ws-monitor-no-headings',m.header===false);
 document.body.classList.toggle('ws-monitor-no-status',m.status===false);
 for(const input of monitorDialog.querySelectorAll('input')){
  input.checked=input.name==='density'?m.density==='compact':m[input.name]!==false;
 }
}
function toggleMonitor(){monitorOpen=!monitorOpen;monitorDialog.hidden=!monitorOpen;renderMonitor();}
monitorBtn.addEventListener('click',toggleMonitor);monitorFloat.addEventListener('click',toggleMonitor);
monitorDialog.querySelector('[data-pro-close]').addEventListener('click',()=>{monitorOpen=false;monitorDialog.hidden=true;});
monitorDialog.addEventListener('change',e=>{
 const field=e.target.name;
 pushHistory();const m=monitor();if(field==='density')m.density=e.target.checked?'compact':'comfortable';else m[field]=e.target.checked;A.persist();renderMonitor();
});
$('wsFull').addEventListener('click',()=>requestAnimationFrame(renderMonitor));
function thumbnail(itemsList){
 const thumb=document.createElement('div');thumb.className='ws-pro-preset-thumb';thumb.setAttribute('aria-hidden','true');
 const arranged=[];for(const entry of itemsList){if(typeof entry==='string'){const spec=A.catalog.byType[entry];arranged.push({layouts:{desktop:A.model.firstFree(arranged,'desktop',12,spec.w,spec.h)}});}else arranged.push(entry);}
 const height=Math.max(1,...arranged.map(i=>i.layouts.desktop.y+i.layouts.desktop.h));
 for(const i of arranged){const r=i.layouts.desktop,tile=document.createElement('span');tile.className='ws-pro-preset-tile';Object.assign(tile.style,{left:r.x/12*100+'%',top:r.y/height*100+'%',width:r.w/12*100+'%',height:r.h/height*100+'%'});thumb.append(tile);}
 return thumb;
}
const templates=[
 {id:'trading',it:'Trading',en:'Trading',types:['chart','orderbook','heatmap','price','change24','marketleaders']},
 {id:'staking',it:'Staking',en:'Staking',types:['staked','rewards','daily','velocity','ladderall','ratio']},
 {id:'treasury',it:'Treasury',en:'Treasury',types:['treasuryoverview','composition','treasuryproduction','walletlist','ownership']},
 {id:'overview',it:'Overview',en:'Overview',types:['worth','portfolio','price','chart','rewards','favoritesheatmap']}
];
const templateArea=document.createElement('section');templateArea.className='ws-pro-templates';
templateArea.innerHTML='<h3>'+T('Setup iniziali PRO','PRO starter setups')+'</h3><p>'+T('Crea un nuovo preset: quello attuale rimane invariato.','Create a new preset; your current setup stays untouched.')+'</p>';
const templateCards=document.createElement('div');templateCards.className='ws-pro-templates-grid';
for(const tmpl of templates){
 const b=control(T(tmpl.it,tmpl.en),'template-'+tmpl.id,'ws-pro-template');
 const heading=document.createElement('strong');heading.textContent=b.textContent;b.replaceChildren(thumbnail(tmpl.types),heading);
 b.title=T('Crea setup','Create setup')+' '+tmpl.it;b.addEventListener('click',()=>buildTemplate(tmpl));
 templateCards.append(b);
}
templateArea.append(templateCards);
$('wsPresetList').insertAdjacentElement('beforebegin',templateArea);
function buildTemplate(tmpl){
 const db=A.getDb();if(db.presets.length>=50)return notice(T('Massimo 50 preset','Maximum 50 presets'));
 pushHistory();
 const p={id:A.uid(),name:tmpl.it,locked:false,snap:true,monitor:{density:'comfortable',controls:true,header:true,status:true},items:[]};
 for(const type of tmpl.types){
  const spec=A.catalog.byType[type];if(!spec)continue;
  const item={...A.catalog.defaults(type),uid:A.uid(),type,source:spec.scope==='market'?'market':'selected',title:'',style:'solid',border:true,details:true,cardLocked:false,view:'standard',group:'',layouts:{}};
  for(const [key,c] of [['desktop',12],['mobile',4]])item.layouts[key]=A.model.firstFree(p.items,key,c,Math.min(c,spec.w),spec.h);
  p.items.push(item);
 }
 db.presets.push(p);db.active=p.id;A.persist();A.layout();A.refresh();$('wsPresetDialog').close();notice(T('Setup creato: ','Setup created: ')+tmpl.it);
}
function previewPresets(){
 for(const row of $('wsPresetList').querySelectorAll('.ws-preset-row')){
  if(row.querySelector('.ws-pro-preset-thumb'))continue;
  const p=A.getDb().presets.find(p=>p.id===row.dataset.presetId);
  if(p)row.insertBefore(thumbnail(p.items),row.firstChild);
 }
}
const presObs=new MutationObserver(previewPresets);presObs.observe($('wsPresetList'),{childList:true});$('wsPresets').addEventListener('click',()=>requestAnimationFrame(previewPresets));
window.addEventListener('storage',e=>{if(e.key==='inj_node_workspace_v1'){selected.clear();undoStack.length=0;redoStack.length=0;buttons();}});
window.addEventListener('pagehide',()=>{selected.clear();guides();});
buttons();renderMonitor();updateStatus(true);
})();
