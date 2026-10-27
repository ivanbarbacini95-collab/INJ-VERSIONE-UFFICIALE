/* INJ Node · private Cloud Sync account. WebAuthn passkeys; explicit first sync. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),base=String(window.INJ_CLOUD_SYNC_URL||'').trim().replace(/\/$/,'');
const validBase=/^https:\/\/[^/\s?#]+$/.test(base);
const allow=k=>/^(?:inj_monitor_(?:wallets_v1|address|average_buy_price_v1|currency|theme|ui_style|privacy|card_style|targets_v1|compound_mode|compound_weekly|native_chart_range)|inj_node_(?:language_v1|crypto_favorites_v1|workspace_v1|workspace_histories_v1|timeline_layout_v1|comparison_selected_wallet_v1))$/.test(k);
const parentAgent=()=>{try{return parent!==window&&parent.location.origin===location.origin?parent.INJCloudSyncAgent:null}catch(_){return null}};
let token='',version=0,remote={},updatedAt=null,auto=false,busy=false,locallyLinked=false;
const toB64=buffer=>{const bytes=new Uint8Array(buffer);let str='';for(const v of bytes)str+=String.fromCharCode(v);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const fromB64=str=>Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4)),c=>c.charCodeAt(0));
function localSnapshot(){
 const obj={};
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(!allow(key))continue;
  const val=localStorage.getItem(key);
  if(typeof val!=='string'||val.length>24000)throw Error('Troppi dati per '+key);
  obj[key]=val;
 }
 if(new TextEncoder().encode(JSON.stringify(obj)).byteLength>64000)throw Error('Backup superiore a 64 KB');
 return obj;
}
function message(str,isError=false){const el=$('csMessage');el.textContent=str;el.classList.toggle('error',isError);el.hidden=false;}
function status(s){$('cloudSyncState').textContent=s;}
function busyState(next){busy=next;for(const id of ['cloudSyncRegister','cloudSyncLogin','csSave','csRestore','csAddKey','csLogout','csDelete'])$(id).disabled=next;}
function showAccount(){ $('cloudSyncEntry').hidden=true;$('cloudSyncAccount').hidden=false;render(); }
function render(){
 if(!token)return;
 let local={};try{local=localSnapshot()}catch(e){message(e.message,true)}
 $('csLocalCount').textContent=Object.keys(local).length.toLocaleString('it-IT');
 $('csBackupStatus').textContent=version?'Versione '+version:'Nessun backup';
 $('csUpdatedAt').textContent=updatedAt?new Date(updatedAt).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—';
 $('csRestore').disabled=!version;
 $('csAuto').disabled=!version||!locallyLinked;
 $('csAuto').checked=auto;
 const same=JSON.stringify(local)===JSON.stringify(remote);
 $('csCloudDifference').textContent=!version?'Il cloud è vuoto. Puoi creare il primo backup delle configurazioni salvate su questo dispositivo.':
  same?'Le configurazioni locali corrispondono all’ultimo backup cloud.':
  'Le configurazioni su questo dispositivo e nel cloud sono diverse. Scegli consapevolmente se sovrascrivere il backup o ripristinare i dati online.';
}
async function call(path,method='GET',body=null,auth=true){
 if(!validBase)throw Error('Servizio Cloud Sync non ancora pubblicato. Manca l’URL Cloudflare.');
 const options={method,mode:'cors',credentials:'omit',cache:'no-store',headers:{}};
 if(auth&&token)options.headers.Authorization='Bearer '+token;
 if(body!==null){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 let res;try{res=await fetch(base+path,options)}catch(_){
  const e=new Error('Richiesta Cloudflare bloccata o non raggiungibile da '+location.origin+'. Verifica il collegamento Worker e il dominio autorizzato.');
  e.code='NETWORK';throw e;
 }
 const data=await res.json().catch(()=>({}));
 if(!res.ok){const e=new Error(data.message||data.error||'Errore di rete '+res.status);e.code=res.status;throw e}
 return data;
}
function webauthnCreation(o){
 if(window.PublicKeyCredential?.parseCreationOptionsFromJSON)return PublicKeyCredential.parseCreationOptionsFromJSON(o);
 return {...o,challenge:fromB64(o.challenge),user:{...o.user,id:fromB64(o.user.id)},excludeCredentials:(o.excludeCredentials||[]).map(c=>({...c,id:fromB64(c.id)}))};
}
function webauthnRequest(o){
 if(window.PublicKeyCredential?.parseRequestOptionsFromJSON)return PublicKeyCredential.parseRequestOptionsFromJSON(o);
 return {...o,challenge:fromB64(o.challenge),allowCredentials:(o.allowCredentials||[]).map(c=>({...c,id:fromB64(c.id)}))};
}
function serializeCredential(c){
 if(typeof c.toJSON==='function')return c.toJSON();
 const r=c.response,isCreate=!!r.attestationObject;
 return {id:c.id,rawId:toB64(c.rawId),type:c.type,authenticatorAttachment:c.authenticatorAttachment||undefined,
  clientExtensionResults:c.getClientExtensionResults?.()||{},
  response:isCreate?
    {clientDataJSON:toB64(r.clientDataJSON),attestationObject:toB64(r.attestationObject),transports:r.getTransports?.()||[]}:
    {clientDataJSON:toB64(r.clientDataJSON),authenticatorData:toB64(r.authenticatorData),signature:toB64(r.signature),userHandle:r.userHandle?toB64(r.userHandle):undefined}};
}
async function createPasskey(){
 const flow=await call('/api/sync/register/options','POST',{},false);
 const credential=await navigator.credentials.create({publicKey:webauthnCreation(flow.options)});
 if(!credential)throw Error('Creazione passkey annullata');
 const result=await call('/api/sync/register/verify','POST',{flowId:flow.flowId,credential:serializeCredential(credential)},false);
 token=result.token;await afterLogin();
 message('Account creato. Nessuna configurazione è stata ancora caricata sul cloud.');
}
async function login(){
 const flow=await call('/api/sync/login/options','POST',{},false);
 const credential=await navigator.credentials.get({publicKey:webauthnRequest(flow.options)});
 if(!credential)throw Error('Accesso annullato');
 const result=await call('/api/sync/login/verify','POST',{flowId:flow.flowId,credential:serializeCredential(credential)},false);
 token=result.token;await afterLogin();message('Accesso Cloud Sync completato.');
}
async function afterLogin(){
 const data=await call('/api/sync/profile');
 version=Number(data.version)||0;remote=data.profile||{};updatedAt=data.updatedAt||null;
 const running=parentAgent()?.getSession();
 locallyLinked=version>0&&JSON.stringify(localSnapshot())===JSON.stringify(remote);
 auto=Boolean(locallyLinked&&running&&running.token===token&&running.base===base&&running.enabled);
 parentAgent()?.attach({token,base,version,profile:remote});
 status('ACCOUNT PERSONALE / CONNESSO');
 showAccount();
}
async function saveCloud(fromAuto=false){
 if(!token)return;
 let p;try{p=localSnapshot()}catch(e){message(e.message,true);return}
 if(!fromAuto&&version>0&&JSON.stringify(p)!==JSON.stringify(remote)
    &&!confirm('Il backup sul cloud verrà sostituito dalle configurazioni di questo dispositivo. Continuare?'))return;
 try{
  const d=await call('/api/sync/profile','PUT',{expectedVersion:version,profile:p});
  version=d.version;updatedAt=d.updatedAt;remote=p;locallyLinked=true;
  parentAgent()?.update(version,p);
  if(!fromAuto)message('Backup completato e cifrato su Cloudflare. Versione '+version+'.');
  render();
 }catch(e){
  if(e.code===409){auto=false;$('csAuto').checked=false;parentAgent()?.enable(false);message('Conflitto: il backup è cambiato su un altro dispositivo. Esci e accedi di nuovo, poi scegli Ripristina o Salva.',true)}
  else message(e.message,true);
 }
}
async function restore(){
 if(!version)return;
 if(!confirm('Ripristinare le configurazioni cloud su questo dispositivo? Verranno sostituiti wallet pubblici, preferenze e preset locali sincronizzabili.'))return;
 auto=false;locallyLinked=true;parentAgent()?.enable(false);
 for(const k of Object.keys(localStorage))if(allow(k))localStorage.removeItem(k);
 for(const [k,v] of Object.entries(remote))if(allow(k)&&typeof v==='string')localStorage.setItem(k,v);
 parentAgent()?.update(version,remote);
 message('Ripristino completato. INJ Node verrà ricaricato per applicare i nuovi dati.');
 setTimeout(()=>{try{if(parent!==window&&parent.location.origin===location.origin)parent.location.reload();else location.href='./index.html'}catch(_){location.href='./index.html'}},650);
}
async function additionalKey(){
 const flow=await call('/api/sync/add-key/options','POST',{});
 const credential=await navigator.credentials.create({publicKey:webauthnCreation(flow.options)});
 if(!credential)throw Error('Operazione annullata');
 await call('/api/sync/add-key/verify','POST',{flowId:flow.flowId,credential:serializeCredential(credential)});
 message('Una nuova passkey è stata aggiunta all’account.');
}
async function logout(){
 try{await call('/api/sync/logout','POST',{})}catch(_){}
 token='';version=0;remote={};auto=false;parentAgent()?.stop();
 $('cloudSyncAccount').hidden=true;$('cloudSyncEntry').hidden=false;status('SESSIONE TERMINATA');
 message('Accesso terminato. I dati locali restano sul dispositivo.');
}
async function deleteCloud(){
 const answer=prompt('Per eliminare definitivamente l’account e tutti i backup Cloud Sync, scrivi ELIMINA:');
 if(answer!=='ELIMINA')return;
 await call('/api/sync/account','DELETE');token='';version=0;remote={};auto=false;
 parentAgent()?.stop();$('cloudSyncAccount').hidden=true;$('cloudSyncEntry').hidden=false;
 status('ACCOUNT ELIMINATO');
 message('Account e dati cloud eliminati. I dati locali non sono stati cancellati.');
}
async function perform(fn){
 if(busy)return;
 busyState(true);
 try{await fn()}catch(e){message(e.name==='NotAllowedError'?'Passkey annullata o non disponibile sul dispositivo.':e.message,true)}
 finally{busyState(false)}
}
$('cloudSyncRegister').onclick=()=>perform(createPasskey);
$('cloudSyncLogin').onclick=()=>perform(login);
$('csSave').onclick=()=>perform(saveCloud);
$('csRestore').onclick=()=>perform(restore);
$('csAddKey').onclick=()=>perform(additionalKey);
$('csLogout').onclick=()=>perform(logout);
$('csDelete').onclick=()=>perform(deleteCloud);
$('csAuto').onchange=()=>{
 auto=$('csAuto').checked;
 if(!version||!locallyLinked){auto=false;$('csAuto').checked=false;return}
 const agent=parentAgent();
 if(agent){agent.enable(auto)}else if(auto){message('Backup automatico disponibile solo quando questa schermata è aperta.')}
 render();
};
let prev='';
setInterval(async()=>{
 if(!token||!auto||busy||document.hidden||parentAgent())return;
 try{const now=JSON.stringify(localSnapshot());if(now!==prev){prev=now;await saveCloud(true)}}catch(e){auto=false;message(e.message,true)}
},15000);
window.addEventListener('inj-cloud-sync:conflict',e=>{auto=false;$('csAuto').checked=false;message(e.detail,true)});
window.addEventListener('inj-cloud-sync:saved',e=>{version=e.detail.version;updatedAt=e.detail.at;remote=localSnapshot();render()});
window.addEventListener('inj-cloud-sync:error',e=>message(e.detail,true));
$('cloudSyncBack').onclick=e=>{try{if(parent!==window&&parent.location.origin===location.origin){e.preventDefault();parent.postMessage({type:'injnode:section:home'},location.origin)}}catch(_){}};
(async()=>{
 if(!validBase){status('CLOUD SYNC / CONFIGURAZIONE IN ATTESA');message('Cloud Sync è pronto nel codice, ma il Worker personale Cloudflare e il suo database devono ancora essere collegati. I tuoi dati rimangono locali.',true);
 $('cloudSyncRegister').disabled=true;$('cloudSyncLogin').disabled=true;return}
 try{
  if(!['https://injectiveportfolio.com','https://www.injectiveportfolio.com'].includes(location.origin)){
   throw Error('Questa versione di INJ Node è aperta da '+location.origin+'. Per proteggere le passkey, Cloud Sync funziona soltanto da https://injectiveportfolio.com (anche www).');
  }
  const d=await call('/api/sync/status','GET',null,false);
  if(!d.originAllowed)throw Error('Cloudflare non autorizza l’origine '+location.origin+'. Controlla la variabile ALLOWED_ORIGINS del Worker.');
  if(!d.available)throw Error('Worker raggiungibile, ma configurazione server incompleta. Controlla i Secret e il database D1.');
  status('CLOUD SYNC / PASSKEY DISPONIBILI');
  const previous=parentAgent()?.getSession();
  if(previous?.token&&previous.base===base){token=previous.token;try{await afterLogin()}catch(_){token='';parentAgent()?.stop()}}
 }catch(e){status('CLOUD SYNC / NON DISPONIBILE');message(e.message,true);$('cloudSyncRegister').disabled=true;$('cloudSyncLogin').disabled=true}
})();
})();