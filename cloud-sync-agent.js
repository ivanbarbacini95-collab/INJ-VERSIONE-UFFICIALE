/* INJ Node in-memory Cloud Sync engine. Never persists auth tokens.
 * Runs in Home while a user has explicitly enabled background backup.
 */
(()=>{
'use strict';
let token='',base='',version=0,lastProfile='',enabled=false,conflict=false,busy=false,tick=0;
const allow=k=>/^(?:inj_monitor_(?:wallets_v1|address|average_buy_price_v1|currency|theme|ui_style|privacy|card_style|targets_v1|compound_mode|compound_weekly|native_chart_range)|inj_node_(?:language_v1|crypto_favorites_v1|workspace_v1|workspace_histories_v1|timeline_layout_v1|comparison_selected_wallet_v1))$/.test(k);
function snapshot(){
 const p={};
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);
  if(!allow(k))continue;
  const val=localStorage.getItem(k);
  if(typeof val!=='string'||val.length>24000)throw Error('Una configurazione supera il limite di backup: '+k);
  p[k]=val;
 }
 if(new TextEncoder().encode(JSON.stringify(p)).length>64000)throw Error('Backup superiore a 64 KB');
 return p;
}
function broadcast(type,detail){window.dispatchEvent(new CustomEvent('inj-cloud-sync:'+type,{detail}))}
async function save(){
 if(!token||!enabled||conflict||busy||!base)return;
 let p;try{p=snapshot()}catch(e){enabled=false;broadcast('error',e.message);return}
 const raw=JSON.stringify(p);
 if(raw===lastProfile)return;
 busy=true;
 try{
  const r=await fetch(base+'/api/sync/profile',{method:'PUT',cache:'no-store',mode:'cors',credentials:'omit',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({expectedVersion:version,profile:p})});
  if(r.status===409){enabled=false;conflict=true;broadcast('conflict','Backup interrotto: nuovi dati cloud da un altro dispositivo.');return}
  if(r.status===401){enabled=false;token='';broadcast('error','Sessione Cloud Sync scaduta');return}
  if(!r.ok){broadcast('error','Salvataggio Cloud Sync non riuscito');return}
  const data=await r.json();version=data.version;lastProfile=raw;broadcast('saved',{version,at:data.updatedAt});
 }catch(_){broadcast('error','Connessione Cloud Sync assente')}
 finally{busy=false}
}
window.INJCloudSyncAgent=Object.freeze({
 getSession(){return token?{token,base,version,enabled,conflict}:null},
 attach(info){
  if(!info||typeof info.token!=='string'||!/^https:\/\/[^/\s]+$/.test(info.base))return;
  const sameAccount=token===info.token&&base===info.base;
  const remoteAdvanced=sameAccount&&(Number(info.version)||0)!==version;
  const previousAuto=enabled,previousConflict=conflict;
  token=info.token;base=info.base;version=Number(info.version)||0;
  lastProfile=JSON.stringify(info.profile||{});
  enabled=sameAccount&&!remoteAdvanced?previousAuto:false;
  conflict=remoteAdvanced||(sameAccount?previousConflict:false);
  if(remoteAdvanced)broadcast('conflict','Il cloud contiene una versione aggiornata da un altro dispositivo. Backup automatico disattivato.');
 },
 update(versionNumber,profile){version=Number(versionNumber)||0;lastProfile=JSON.stringify(profile||{});conflict=false},
 enable(value){enabled=Boolean(value)&&!!token&&!conflict;broadcast('status',{enabled})},
 stop(){token='';base='';version=0;lastProfile='';enabled=false;conflict=false;busy=false},
 async flush(){await save()}
});
setInterval(()=>{if(++tick && enabled && !document.hidden)save()},15000);
window.addEventListener('pagehide',()=>{enabled=false;token='';});
})();