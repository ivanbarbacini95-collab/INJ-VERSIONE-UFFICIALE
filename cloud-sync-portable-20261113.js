/* INJ Node · Portable Cloud Sync backup between devices · 2026-11-13
   Optional copy/paste workflow. No account, network, tokens or signing keys.
   Only explicit public wallet/configuration storage keys can be transferred. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const FORMAT='inj-node-portable-backup', VERSION=1, MAX_BYTES=2000000;
 const keys=[
  'inj_monitor_wallets_v1','inj_monitor_address','inj_monitor_average_buy_price_v1',
  'inj_monitor_currency','inj_monitor_theme','inj_monitor_ui_style',
  'inj_monitor_privacy','inj_monitor_card_style','inj_monitor_targets_v1',
  'inj_monitor_compound_mode','inj_monitor_compound_weekly','inj_monitor_native_chart_range',
  'inj_node_language_v1','inj_node_font_v1','inj_node_view_mode_v1',
  'inj_node_app_icon_v1','inj_node_theme_motion_v1',
  'inj_node_crypto_favorites_v1','inj_node_workspace_v1',
  'inj_node_workspace_histories_v1','inj_node_timeline_layout_v1',
  'inj_node_comparison_selected_wallet_v1','inj_node_comparison_coins_v1',
  'inj_node_comparison_us_caps_v2','inj_node_comparison_index_caps_v1',
  'inj_node_freedom_preferences_v1','inj_node_freedom_spending_v1',
  'inj_node_reward_ladder_goals_v1','inj_node_treasury_wallet_labels_v1',
  'inj_node_cash_reserve_goal_v1','inj_node_cash_reserve_privacy_v1',
  'inj_node_launcher_order_v1_home','inj_node_launcher_order_v1_market',
  'inj_node_launcher_order_v1_reward','inj_node_launcher_order_v1_altro'
 ];
 const allow=new Set(keys);
 const utf8Length=x=>new TextEncoder().encode(x).byteLength;
 const label=$('csPortableStatus'),preview=$('csPortablePreview');
 const exported=$('csPortableOutput'),incoming=$('csPortableInput');
 const exportBtn=$('csPortableExport'),copyBtn=$('csPortableCopy'),
       verifyBtn=$('csPortableVerify'),restoreBtn=$('csPortableRestore');
 if(!label||!exported||!incoming||!exportBtn||!copyBtn||!verifyBtn||!restoreBtn)return;
 let verified=null,verifying=false;
 function say(msg,error=false){
  label.textContent=msg;label.classList.toggle('error',error);
 }
 function walletList(raw){
  let list;try{list=JSON.parse(raw)}catch(_){throw Error('L’elenco dei wallet nel backup non è valido.')}
  if(!Array.isArray(list)||list.length>100)throw Error('Il backup contiene un elenco wallet non valido.');
  const seen=new Set();
  return list.map((item,index)=>{
   const address=String(item&&item.address||'').trim().toLowerCase();
   const name=String(item&&item.label||'Wallet '+(index+1)).trim().slice(0,28);
   if(!/^inj1[0-9a-z]{20,100}$/.test(address)||seen.has(address))throw Error('Il backup contiene indirizzi wallet non validi o duplicati.');
   seen.add(address);
   return {address,label:name};
  });
 }
 function cleanData(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Struttura dati backup non valida.');
  const result=Object.create(null);
  for(const [k,val] of Object.entries(data)){
   if(!allow.has(k))throw Error('Il backup contiene una voce non supportata: '+k);
   if(typeof val!=='string'||utf8Length(val)>700000)throw Error('La voce '+k+' non è valida o supera il limite.');
   result[k]=k==='inj_monitor_wallets_v1'?JSON.stringify(walletList(val)):val;
  }
  if(result.inj_monitor_address&&!/^inj1[0-9a-z]{20,100}$/.test(result.inj_monitor_address))
   throw Error('L’indirizzo wallet selezionato non è valido.');
  if(utf8Length(JSON.stringify(result))>MAX_BYTES)throw Error('Backup troppo grande (limite 2 MB).');
  return result;
 }
 function snapshot(){
  const obj=Object.create(null);
  for(const k of keys){
   const value=localStorage.getItem(k);
   if(value!==null)obj[k]=value;
  }
  return cleanData(obj);
 }
 function payload(data,at){
  return {format:FORMAT,version:VERSION,createdAt:at,data};
 }
 async function digest(obj){
  if(!crypto||!crypto.subtle||!crypto.subtle.digest)throw Error('Serve una connessione HTTPS per verificare il backup.');
  const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(obj)));
  return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function countWallets(data){
  if(data.inj_monitor_wallets_v1)return walletList(data.inj_monitor_wallets_v1).length;
  return data.inj_monitor_address?1:0;
 }
 async function exportData(){
  const data=snapshot(), count=Object.keys(data).length;
  if(!count)throw Error('Nessuna configurazione locale da esportare.');
  const core=payload(data,new Date().toISOString());
  const backup=Object.assign({},core,{sha256:await digest(core)});
  const text=JSON.stringify(backup);
  if(utf8Length(text)>MAX_BYTES+1000)throw Error('Backup superiore al limite consentito.');
  exported.value=text;
  copyBtn.disabled=false;
  say('Backup pronto: '+count+' voci e '+countWallets(data)+' wallet. Copialo e incollalo sul secondo dispositivo.');
 }
 async function copyData(){
  if(!exported.value)throw Error('Prima genera il backup.');
  try{
   if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('clipboard');
   await navigator.clipboard.writeText(exported.value);
   say('Backup copiato. Apri Cloud Sync sull’altro dispositivo e incollalo nel campo Ripristino.');
  }catch(_){
   exported.focus();exported.select();
   say('Selezione pronta: usa Copia dal menu del dispositivo per trasferire il backup.');
  }
 }
 function invalidate(){
  verified=null;restoreBtn.disabled=true;preview.textContent='';
 }
 async function validateInput(){
  const text=incoming.value.trim();
  if(!text)throw Error('Incolla prima il backup ricevuto dall’altro dispositivo.');
  if(utf8Length(text)>MAX_BYTES+2000)throw Error('Codice troppo grande: limite 2 MB.');
  let parsed;try{parsed=JSON.parse(text)}catch(_){throw Error('Il testo incollato non è un backup JSON valido di INJ Node.')}
  if(!parsed||parsed.format!==FORMAT||parsed.version!==VERSION||
     typeof parsed.createdAt!=='string'||!Number.isFinite(Date.parse(parsed.createdAt))||
     !/^[a-f0-9]{64}$/.test(parsed.sha256||''))
   throw Error('Formato backup non riconosciuto oppure versione non supportata.');
  const data=cleanData(parsed.data);
  // All transferred values must be byte-identical: no silent repairs to a
  // forged backup, even if a JSON structure happens to be parseable.
  if(JSON.stringify(data)!==JSON.stringify(parsed.data))
   throw Error('L’elenco wallet nel backup deve essere normalizzato. Crea un nuovo backup.');
  const core=payload(parsed.data,parsed.createdAt);
  if(await digest(core)!==parsed.sha256)throw Error('Controllo integrità fallito: il backup è incompleto o modificato.');
  if(!Object.keys(data).length)throw Error('Il backup non contiene dati trasferibili.');
  return {data,raw:text,createdAt:parsed.createdAt,items:Object.keys(data).length,wallets:countWallets(data)};
 }
 async function verifyInput(){
  verifying=true;verifyBtn.disabled=true;
  invalidate();
  try{
   verified=await validateInput();
   const date=new Date(verified.createdAt).toLocaleString('it-IT');
   preview.textContent='Backup verificato · '+verified.wallets+' wallet · '+verified.items+' impostazioni · '+date;
   restoreBtn.disabled=false;
   say('Backup valido. Ripristina per riportare le configurazioni sul dispositivo attuale.');
  }finally{verifying=false;verifyBtn.disabled=false}
 }
 function parentAgent(){
  try{return parent!==window&&parent.location.origin===location.origin?parent.INJCloudSyncAgent:null}
  catch(_){return null}
 }
 async function restoreInput(){
  if(verifying||!verified||incoming.value.trim()!==verified.raw){
   invalidate();throw Error('Il codice è cambiato: verifica nuovamente il backup.');
  }
  // A second validation ensures contents were not changed after preview.
  const ready=await validateInput();
  const old=snapshot(),beforeWallets=countWallets(old),afterWallets=ready.wallets;
  const text='Ripristinare '+ready.items+' voci e '+afterWallets+' wallet dal backup?\n'+
   'I dati locali sincronizzabili di questo dispositivo ('+beforeWallets+' wallet) saranno SOSTITUITI.\n'+
   'Questa operazione non importa chiavi private. Continuare?';
  if(!confirm(text))return;
  const agent=parentAgent();agent&&agent.enable(false);
  const touched=keys;
  try{
   for(const k of touched)localStorage.removeItem(k);
   for(const [k,v] of Object.entries(ready.data))localStorage.setItem(k,v);
  }catch(e){
   // A full local rollback on quota/permission failures; no partial import.
   try{
    for(const k of touched)localStorage.removeItem(k);
    for(const [k,v] of Object.entries(old))localStorage.setItem(k,v);
   }catch(_){}
   throw Error('Impossibile scrivere tutti i dati sul dispositivo. I dati precedenti sono stati ripristinati quando possibile. Verifica lo spazio disponibile.');
  }
  say('Ripristino completato: '+afterWallets+' wallet e '+ready.items+' impostazioni. INJ Node viene ricaricato.');
  invalidate();
  setTimeout(()=>{
   try{
    if(parent!==window&&parent.location.origin===location.origin){parent.location.reload();return}
   }catch(_){}
   location.href='./index.html';
  },900);
 }
 async function run(fn){
  try{await fn()}catch(e){say(e&&e.message?e.message:'Operazione non riuscita.',true)}
 }
 exportBtn.addEventListener('click',()=>run(exportData));
 copyBtn.addEventListener('click',()=>run(copyData));
 verifyBtn.addEventListener('click',()=>run(verifyInput));
 restoreBtn.addEventListener('click',()=>run(restoreInput));
 incoming.addEventListener('input',invalidate);
 if(new URLSearchParams(location.search).get('source')==='qr')
  say('Secondo dispositivo: puoi incollare un backup qui, oppure accedere con passkey al cloud.');
})();
