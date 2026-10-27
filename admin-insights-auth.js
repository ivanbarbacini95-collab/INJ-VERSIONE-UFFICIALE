/* Admin Insights · Cloudflare Worker bearer auth. Ephemeral token: memory only. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const endpoint=String(window.INJ_INSIGHTS_ENDPOINT||'').trim();
const base=/^https:\/\/[^\s/]+\/api\/ingest$/.test(endpoint)?endpoint.slice(0,-'/api/ingest'.length):'';
const gate=$('adminGate'),dashboard=$('adminDashboard'),form=$('adminLoginForm');
const user=$('adminUsername'),pass=$('adminPassword'),error=$('adminLoginError'),submit=$('adminLoginButton'),status=$('adminConnectStatus');
let adminToken='',dataConnected=false;
const config={get base(){return base;},headers(){return adminToken?{Authorization:'Bearer '+adminToken}:{};}};
window.INJ_ADMIN_INSIGHTS_API=Object.freeze(config);
function errorText(message){error.textContent=message;error.hidden=!message;}
function loginVisible(message=''){
 dashboard.hidden=true;gate.hidden=false;pass.value='';errorText(message);status.textContent='ACCESSO RISERVATO';
}
function reportVisible(){
 gate.hidden=true;dashboard.hidden=false;pass.value='';errorText('');
 status.textContent=dataConnected?'LIVE DATA / SYNC':'DATABASE DA COLLEGARE';
 $('adminDataNotice').hidden=Boolean(dataConnected);
 document.dispatchEvent(new CustomEvent('inj-admin:ready'));
}
async function api(path,options={}){
 if(!base)return {ok:false,status:0,data:{error:'Collega prima il Worker Cloudflare in inj-node-insights-config.js.'}};
 try{
  const response=await fetch(base+path,{mode:'cors',credentials:'omit',cache:'no-store',...options});
  return {ok:response.ok,status:response.status,data:await response.json().catch(()=>({}))};
 }catch(_){return {ok:false,status:0,data:{error:'Worker Cloudflare non raggiungibile. Controlla URL, deploy e ALLOWED_ORIGINS.'}}}
}
async function startup(){
 if(!base){submit.disabled=true;loginVisible('Servizio Cloudflare non ancora collegato. La sezione è pronta: serve l’URL del Worker dopo il deploy.');return}
 const r=await api('/api/admin/status');
 if(!r.ok){submit.disabled=true;loginVisible(r.data.error||'Worker Cloudflare non raggiungibile.');return}
 if(!r.data.configured){submit.disabled=true;loginVisible('Configura in Cloudflare i segreti ADMIN_USERNAME, ADMIN_PASSWORD e ADMIN_SESSION_SECRET.');return}
 dataConnected=Boolean(r.data.dataConnected);
 submit.disabled=false;
 loginVisible();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();errorText('');submit.disabled=true;submit.textContent='VERIFICA IN CORSO…';
 const r=await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.value,password:pass.value})});
 submit.disabled=false;submit.textContent='ACCEDI ALLE STATISTICHE';
 if(!r.ok||!r.data.token){adminToken='';errorText(r.data.error||'Accesso non riuscito');pass.value='';return}
 adminToken=r.data.token;pass.value='';user.value='';reportVisible();
});
$('adminLogout').addEventListener('click',()=>{adminToken='';loginVisible()});
document.addEventListener('inj-admin:expired',()=>{adminToken='';loginVisible('Sessione scaduta. Effettua nuovamente l’accesso.')});
$('adminGoHome').addEventListener('click',e=>{
 if(window.parent!==window){e.preventDefault();parent.postMessage({type:'injnode:section:home'},location.origin)}
});
window.addEventListener('pagehide',()=>{adminToken=''});
startup();
})();