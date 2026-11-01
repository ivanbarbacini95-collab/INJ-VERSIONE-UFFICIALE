/* INJ Node / local screen privacy lock.
 * This is a device-side display lock, not encryption or cloud authentication.
 * WebAuthn assertions are locally verified against the registered public key.
 */
(()=>{
'use strict';
const KEY='inj_node_access_lock_v1',PASS='inj_node_access_session_v1';
const root=document.documentElement;
const $=id=>document.getElementById(id);
let overlay=null,failures=0,blockedUntil=0,bioBusy=false;
const en=()=>root.lang==='en'||localStorage.getItem('inj_node_language_v1')==='en';
const t=(it,eng)=>en()?eng:it;
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=b=>{let str='';for(const v of new Uint8Array(b))str+=String.fromCharCode(v);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}};
const inEmbed=()=>{try{return window!==window.top&&parent.location.origin===location.origin}catch(_){return false}};
const sessionOpen=()=>{try{const s=JSON.parse(sessionStorage.getItem(PASS)||'null');return !!s&&Date.now()-s.at<45*60*1000}catch(_){return false}};
async function digest(pin,salt){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 const buf=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unb64(salt),iterations:230000,hash:'SHA-256'},material,256);
 return b64(buf);
}
const same=(a,b)=>{const x=unb64(a),y=unb64(b);if(x.length!==y.length)return false;let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;};
async function checkPin(pin){
 const saved=read();if(!saved)return false;
 if(!/^\d{6,12}$/.test(pin))return false;
 return same(await digest(pin,saved.salt),saved.digest);
}
function unlocked(){
 try{sessionStorage.setItem(PASS,JSON.stringify({at:Date.now()}))}catch(_){}
 root.removeAttribute('data-inj-lock-pending');
 if(overlay)overlay.hidden=true;
 document.documentElement.style.removeProperty('overflow');
 document.body.style.removeProperty('overflow');
}
function lock(){
 if(!read()||inEmbed())return;
 try{sessionStorage.removeItem(PASS)}catch(_){}
 root.dataset.injLockPending='1';
 ensureShield();overlay.hidden=false;
 const pin=$('injAccessPin');if(pin)pin.value='';
 $('injAccessMessage').textContent=t('Inserisci il codice per continuare.','Enter your code to continue.');
}
function ensureShield(){
 if(overlay)return;
 overlay=document.createElement('div');
 overlay.id='injAccessShield';overlay.className='inj-access-shield';overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','injAccessTitle');
 overlay.innerHTML='<form id="injAccessForm" class="inj-access-card" autocomplete="off">'+
 '<div class="inj-access-emblem" aria-hidden="true">◈</div>'+
 '<div class="inj-access-eyebrow">INJ NODE / B CAPITAL GROUP</div>'+
 '<h2 id="injAccessTitle">ACCESSO PROTETTO</h2>'+
 '<p class="inj-access-description" id="injAccessIntro">Protezione locale del dispositivo.</p>'+
 '<label for="injAccessPin" id="injAccessPinLabel">Codice personale</label>'+
 '<input id="injAccessPin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="6" maxlength="12" autocomplete="off" required />'+
 '<div id="injAccessMessage" class="inj-access-message" role="status" aria-live="polite"></div>'+
 '<button class="inj-access-primary" id="injAccessSubmit" type="submit">SBLOCCA</button>'+
 '<button class="inj-access-biometric" id="injAccessBiometric" type="button" hidden>USA BIOMETRIA</button>'+
 '<small id="injAccessFoot">Blocco privacy locale · non cifra i dati memorizzati nel browser.</small>'+
 '</form>';
 document.body.appendChild(overlay);
 const form=$('injAccessForm');
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const msg=$('injAccessMessage');
  if(Date.now()<blockedUntil){msg.textContent=t('Troppi tentativi. Riprova tra poco.','Too many attempts. Try again shortly.');return}
  const button=$('injAccessSubmit');button.disabled=true;
  try{
   if(await checkPin($('injAccessPin').value)){failures=0;unlocked();}
   else{
    failures++;if(failures>=5){blockedUntil=Date.now()+30000;failures=0}
    msg.textContent=t('Codice non valido.','Incorrect code.');
    $('injAccessPin').value='';
   }
  }catch(_){msg.textContent=t('Verifica non disponibile.','Verification unavailable.')}
  finally{button.disabled=false;}
 });
 $('injAccessBiometric').addEventListener('click',()=>{void unlockBiometric()});
 updateBioButton();
 refreshWords();
}
function refreshWords(){
 if(!overlay)return;
 $('injAccessTitle').textContent=t('ACCESSO PROTETTO','PRIVATE ACCESS');
 $('injAccessIntro').textContent=t('Accedi alla tua area privata.','Unlock your personal workspace.');
 $('injAccessPinLabel').textContent=t('Codice personale','Personal code');
 $('injAccessSubmit').textContent=t('SBLOCCA','UNLOCK');
 $('injAccessBiometric').textContent=t('USA BIOMETRIA','USE BIOMETRICS');
 $('injAccessFoot').textContent=t('Protezione locale · non cifra i dati nel browser.',
  'Local privacy lock · does not encrypt browser data.');
 const title=$('injAccessSettingsTitle');if(title)title.textContent=t('Protezione accesso','Access protection');
}
function updateBioButton(){
 if(!overlay)return;
 const cfg=read();
 $('injAccessBiometric').hidden=!(cfg?.bio?.id&&window.PublicKeyCredential);
}
function derToRaw(input){
 const b=new Uint8Array(input);let i=0;if(b[i++]!==0x30)throw Error('DER sequence');
 let n=b[i++];if(n&128){let count=n&127;n=0;while(count--)n=(n<<8)|b[i++];}
 const parts=[];
 for(let j=0;j<2;j++){
  if(b[i++]!==0x02)throw Error('DER integer');
  let len=b[i++];if(len&128){let count=len&127;len=0;while(count--)len=(len<<8)|b[i++];}
  let bytes=b.slice(i,i+len);i+=len;
  while(bytes.length>32&&bytes[0]===0)bytes=bytes.slice(1);
  if(bytes.length>32)throw Error('DER oversized');
  const padded=new Uint8Array(32);padded.set(bytes,32-bytes.length);parts.push(padded);
 }
 return Uint8Array.of(...parts[0],...parts[1]);
}
async function addBiometric(){
 const cfg=read();if(!cfg)throw Error(t('Imposta prima un codice.','Create a PIN first.'));
 if(!window.PublicKeyCredential||!navigator.credentials?.create||!crypto.subtle)throw Error(t('Biometria non supportata qui.','Biometrics unsupported on this device.'));
 const challenge=rnd(32);
 const credential=await navigator.credentials.create({publicKey:{
  challenge,rp:{name:'INJ Node',id:location.hostname},
  user:{id:rnd(16),name:'injnode-local',displayName:'INJ Node local lock'},
  pubKeyCredParams:[{type:'public-key',alg:-7}],
  authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'discouraged',userVerification:'required'},
  attestation:'none',timeout:60000
 }});
 if(!credential)throw Error(t('Operazione annullata.','Operation cancelled.'));
 const key=credential.response.getPublicKey?.();
 if(!key||credential.response.getPublicKeyAlgorithm?.()!==-7)throw Error(t('Questo dispositivo non supporta la verifica biometrica locale.','Local biometric verification unsupported.'));
 cfg.bio={id:b64(credential.rawId),publicKey:b64(key)};
 localStorage.setItem(KEY,JSON.stringify(cfg));updateBioButton();
}
async function unlockBiometric(){
 if(bioBusy)return;bioBusy=true;
 const button=$('injAccessBiometric');if(button)button.disabled=true;
 try{
  const cfg=read();if(!cfg?.bio?.publicKey)throw Error('Not configured');
  const challenge=rnd(32),cred=await navigator.credentials.get({publicKey:{
   challenge,allowCredentials:[{type:'public-key',id:unb64(cfg.bio.id)}],
   userVerification:'required',timeout:60000
  }});
  if(!cred)throw Error('No credential');
  const r=cred.response;
  const parsed=JSON.parse(new TextDecoder().decode(r.clientDataJSON));
  if(parsed.type!=='webauthn.get'||parsed.challenge!==b64(challenge)||parsed.origin!==location.origin)
    throw Error('Invalid challenge or origin');
  const data=new Uint8Array(r.authenticatorData);
  const rp= new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(location.hostname)));
  if(data.length<37||(data[32]&4)!==4||rp.some((v,i)=>v!==data[i]))
    throw Error('User verification or RP mismatch');
  const signed=new Uint8Array(data.length+32);signed.set(data);
  signed.set(new Uint8Array(await crypto.subtle.digest('SHA-256',r.clientDataJSON)),data.length);
  const publicKey=await crypto.subtle.importKey('spki',unb64(cfg.bio.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,derToRaw(r.signature),signed);
  if(!ok)throw Error('Signature invalid');
  unlocked();
 }catch(e){if($('injAccessMessage'))$('injAccessMessage').textContent=t('Verifica biometrica non riuscita. Usa il codice.','Biometric verification failed. Use your PIN.');}
 finally{bioBusy=false;if(button)button.disabled=false;}
}
async function setupPin(){
 if(!crypto.subtle){alert(t('Connessione HTTPS e Web Crypto necessari.','HTTPS and Web Crypto required.'));return}
 const first=prompt(t('Scegli un codice numerico da 6 a 12 cifre:','Choose a numeric code, 6 to 12 digits:'));
 if(first===null)return;
 if(!/^\d{6,12}$/.test(first)){alert(t('Usa da 6 a 12 cifre.','Use 6–12 digits.'));return}
 const again=prompt(t('Ripeti il nuovo codice:','Repeat the new code:'));
 if(again!==first){alert(t('I codici non corrispondono.','The codes do not match.'));return}
 const salt=b64(rnd(16)),hash=await digest(first,salt);
 localStorage.setItem(KEY,JSON.stringify({v:1,salt,digest:hash}));
 try{sessionStorage.setItem(PASS,JSON.stringify({at:Date.now()}))}catch(_){}
 alert(t('Blocco locale attivato. Non protegge il browser da chi possiede il dispositivo sbloccato.','Local privacy lock enabled. It is not device-level encryption.'));
 updateSettingsButton();updateBioButton();
}
async function removePin(){
 const cfg=read();if(!cfg)return;
 const pin=prompt(t('Inserisci il codice attuale per disattivare il blocco:','Enter your current code to disable the lock:'));
 if(pin===null)return;
 if(!await checkPin(pin)){alert(t('Codice non valido.','Incorrect code.'));return}
 localStorage.removeItem(KEY);sessionStorage.removeItem(PASS);root.removeAttribute('data-inj-lock-pending');
 updateSettingsButton();updateBioButton();
}
function updateSettingsButton(){
 const btn=$('injAccessSettings');
 if(!btn)return;
 btn.querySelector('small').textContent=read()?t('Attiva, cambia o disattiva il blocco','Lock, change or disable'):t('PIN e biometria sul dispositivo','PIN and device biometrics');
}
function settings(){
 const opt=prompt(t(
  'PROTEZIONE ACCESSO\n1 · Imposta o cambia codice\n2 · Registra biometria (se supportata)\n3 · Blocca adesso\n4 · Disattiva blocco',
  'ACCESS PROTECTION\n1 · Set or change PIN\n2 · Enrol biometrics (if supported)\n3 · Lock now\n4 · Disable lock'),'1');
 if(opt===null)return;
 if(opt==='1')void setupPin().catch(()=>alert(t('Impossibile salvare il codice.','Could not save PIN.')));
 else if(opt==='2')void addBiometric().then(()=>alert(t('Biometria registrata.','Biometrics enrolled.'))).catch(e=>alert(e.message));
 else if(opt==='3')lock();
 else if(opt==='4')void removePin().catch(()=>alert(t('Verifica non riuscita.','Verification failed.')));
}
function boot(){
 if(inEmbed()){root.removeAttribute('data-inj-lock-pending');return}
 const cloud=document.getElementById('injCloudSyncMenuButton');
 if(cloud&&!$('injAccessSettings')){
  const btn=document.createElement('button');
  btn.type='button';btn.id='injAccessSettings';btn.className='menu-action menu-setting';
  btn.innerHTML='<span aria-hidden="true" class="menu-action-icon">◈</span>'+
   '<span class="menu-action-copy"><strong id="injAccessSettingsTitle">Protezione accesso</strong><small></small></span>'+
   '<span class="menu-action-value">›</span>';
  cloud.after(btn);btn.addEventListener('click',settings);
  updateSettingsButton();
 }
 window.INJ_LOCAL_LOCK={lock,enabled:()=>!!read()};
 const cfg=read();
 if(cfg&&!sessionOpen()){lock();}
 else root.removeAttribute('data-inj-lock-pending');
 window.addEventListener('injnode:languagechange',refreshWords);
 window.addEventListener('storage',e=>{
  if(e.key===KEY){if(read()&&!sessionOpen())lock();else if(!read())unlocked();updateSettingsButton()}
 });
 let hiddenAt=0;
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();return;}
  if(hiddenAt&&Date.now()-hiddenAt>120000&&read())lock();
  hiddenAt=0;
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();