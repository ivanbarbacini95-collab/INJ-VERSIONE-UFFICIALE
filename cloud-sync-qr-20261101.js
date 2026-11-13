/* INJ Node Cloud Sync · QR-guided device onboarding.
 * QR contains only the public HTTPS Cloud Sync page; never a session,
 * wallet identifier, authentication challenge, or stored profile.
 * The other device MUST authenticate with its own passkey and explicitly restore.
 */
(()=>{
'use strict';
function init(){
 const anchor=document.getElementById('csCloudDifference');
 if(!anchor||document.getElementById('csDeviceLink'))return;
 const lang=()=>document.documentElement.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en';
 const t=(it,en)=>lang()?en:it;
 const qrUrl=new URL('./cloud-sync.html?source=qr',location.href).href;
 const node=document.createElement('section');
 node.id='csDeviceLink';node.className='cs-device-link';node.setAttribute('aria-labelledby','csDeviceLinkTitle');
 node.innerHTML='<div class="cs-device-link-header"><span class="cs-eyebrow">03 / DEVICE LINK</span>'+
 '<h3 id="csDeviceLinkTitle">COLLEGA UN ALTRO DISPOSITIVO</h3>'+
 '<p id="csDeviceLinkDescription"></p></div>'+
 '<div id="csDeviceLinkQr" class="cs-device-qr" aria-label="QR Code per aprire Cloud Sync"></div>'+
 '<div class="cs-device-link-actions">'+
 '<button type="button" id="csDeviceCopy" class="cs-secondary">COPIA LINK</button>'+
 '<button type="button" id="csDeviceToggle" class="cs-outline" aria-expanded="false">MOSTRA QR CODE</button></div>'+
 '<p id="csDeviceLinkStatus" role="status" aria-live="polite" class="cs-device-link-status"></p>'+
 '<small id="csDeviceLinkNote"></small>';
 anchor.after(node);
 const qr=document.getElementById('csDeviceLinkQr');
 const button=document.getElementById('csDeviceToggle');
 const status=document.getElementById('csDeviceLinkStatus');
 let visible=false,built=false;
 qr.hidden=true;
 function refresh(){
  document.getElementById('csDeviceLinkTitle').textContent=t('COLLEGA UN ALTRO DISPOSITIVO','CONNECT ANOTHER DEVICE');
  document.getElementById('csDeviceLinkDescription').textContent=t(
   'Apri Cloud Sync sul secondo dispositivo con il QR. Accedi alla stessa identità usando una passkey e scegli Ripristina per importare le impostazioni.',
   'Open Cloud Sync on the other device with this QR. Authenticate with a passkey for the same account and choose Restore to import your settings.');
  document.getElementById('csDeviceLinkNote').textContent=t(
   'Il QR è un collegamento pubblico e non concede accesso automatico. Non contiene password, token o dati del wallet.',
   'The QR is a public link, not an authentication token. It contains no passwords, session keys or wallet data.');
  document.getElementById('csDeviceCopy').textContent=t('COPIA LINK','COPY LINK');
  button.textContent=visible?t('NASCONDI QR CODE','HIDE QR CODE'):t('MOSTRA QR CODE','SHOW QR CODE');
 }
 function display(){
  visible=!visible;qr.hidden=!visible;button.setAttribute('aria-expanded',String(visible));
  if(visible&&!built){
   if(typeof window.QRCode==='function'){
    new window.QRCode(qr,{text:qrUrl,width:200,height:200,correctLevel:window.QRCode.CorrectLevel.M});
    built=true;
   }else{
    const link=document.createElement('a');link.href=qrUrl;link.textContent=qrUrl;link.rel='noopener';
    qr.append(link);built=true;
    status.textContent=t('Anteprima QR non disponibile: usa il link.','QR preview unavailable: use the link.');
   }
  }
  refresh();
 }
 button.addEventListener('click',display);
 document.getElementById('csDeviceCopy').addEventListener('click',async()=>{
  try{
   await navigator.clipboard.writeText(qrUrl);
   status.textContent=t('Link copiato. Aprilo sul secondo dispositivo.','Link copied. Open it on the other device.');
  }catch(_){
   status.textContent=t('Copia manualmente questo indirizzo: ','Copy this address manually: ')+qrUrl;
  }
 });
 refresh();
 if(new URLSearchParams(location.search).get('source')==='qr'){
  const message=document.getElementById('csMessage');
  if(message){message.hidden=false;message.textContent=t(
   'Sei sul secondo dispositivo: incolla e ripristina un backup oppure accedi al cloud con passkey.',
   'You are on the second device: paste and restore a backup, or sign in to Cloud Sync with your passkey.');}
 }
 window.addEventListener('injnode:languagechange',refresh);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();