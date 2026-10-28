/* INJ Node Insights: privacy-conscious telemetry bridge. Disabled until configured. */
(()=>{'use strict';
const endpoint=String(window.INJ_INSIGHTS_ENDPOINT||'').trim();
if(!/^https:\/\/[^\s]+\/api\/ingest$/.test(endpoint))return;
const CONSENT='inj_node_insights_consent_v1',SID='inj_node_insights_session_v1';
const home=/\/(?:index\.html)?$/.test(location.pathname);
const labels={'index.html':'HOME','live-charts.html':'LIVE CHARTS','order-book.html':'ORDER BOOK','market.html':'GLOBAL MARKET','treasury.html':'INJ TREASURY','comparison.html':'MARKET CAP COMPARISON','live-rewards.html':'LIVE REWARD','reward-ladder.html':'REWARD LADDER','workspace.html':'INJ WORKSPACE','visualize-wealth.html':'POTENTIAL VALUE','command-center.html':'COMMAND CENTER','injc-etf.html':'INJC ETF'};
let consent='',session='',started=false,starting=Promise.resolve(),wallet='',section=labels[location.pathname.split('/').pop()]||'HOME';
try{consent=localStorage.getItem(CONSENT)||''}catch(_){}
function send(type,extra={}){
 if(consent!=='yes'||!session)return Promise.resolve();
 const execute=()=>fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({type,sessionId:session,...extra})}).catch(()=>{});
 try{return type==='start'?execute():starting.then(execute)}catch(_){return Promise.resolve()}
}
function selectedWallet(){
 const row=document.querySelector('#entryWallets .entry-wallet-row.selected[data-address]');
 const address=row?.dataset?.address||'';
 if(address&&address!==wallet&&/^inj1[a-z0-9]{30,100}$/.test(address)){wallet=address;send('wallet',{walletAddress:address})}
}
function begin(){
 if(started||consent!=='yes')return;
 started=true;try{session=sessionStorage.getItem(SID)||''}catch(_){}
 if(!/^[0-9a-f-]{36}$/i.test(session)){session=crypto.randomUUID();try{sessionStorage.setItem(SID,session)}catch(_){}}
 const ua=navigator.userAgent;const device=/ipad|tablet/i.test(ua)?'tablet':/mobi|iphone|android/i.test(ua)?'mobile':'desktop';
 starting=send('start',{device});send('section',{section});
 if(home){setTimeout(selectedWallet,1300);setTimeout(selectedWallet,4500)}
}
function decide(value){
 consent=value;try{localStorage.setItem(CONSENT,value)}catch(_){}
 document.getElementById('injInsightsConsentBar')?.remove();
 if(value==='yes')begin();
 else{started=false;session='';wallet='';starting=Promise.resolve();try{sessionStorage.removeItem(SID)}catch(_){}}
}
function showConsent(){
 if(!home||document.getElementById('injInsightsConsentBar'))return;
 const en=document.documentElement.lang==='en';
 const el=document.createElement('div');el.id='injInsightsConsentBar';el.setAttribute('role','dialog');el.setAttribute('aria-label',en?'Anonymous analytics':'Statistiche anonime');
 Object.assign(el.style,{position:'fixed',left:'max(14px,env(safe-area-inset-left))',right:'max(14px,env(safe-area-inset-right))',bottom:'max(18px,env(safe-area-inset-bottom))',zIndex:'2147483000',maxWidth:'640px',margin:'0 auto',padding:'16px 19px',border:'1px solid #3d6968',borderRadius:'14px',background:'#101e25',color:'#e0f3ee',boxShadow:'0 20px 60px #000a',font:'12px/1.6 ui-monospace,monospace'});
 const msg=document.createElement('div');msg.style.marginBottom='11px';
 msg.textContent=en?'Allow anonymous navigation analytics, approximate region and views of public wallet addresses? No GPS or IP is stored.':'Vuoi consentire statistiche anonime di navigazione, zona geografica approssimativa e wallet pubblici osservati? Non salviamo IP o GPS.';el.append(msg);
 const actions=document.createElement('div');actions.style.display='flex';actions.style.gap='9px';
 for(const [txt,value] of [[en?'Accept':'Accetta','yes'],[en?'Decline':'Rifiuta','no']]){
  const btn=document.createElement('button');btn.type='button';btn.textContent=txt;
  Object.assign(btn.style,{background:value==='yes'?'#6adeb9':'#24343b',color:value==='yes'?'#0a191d':'#d4e9e5',border:'1px solid #48615d',borderRadius:'8px',padding:'8px 14px',font:'700 12px ui-monospace,monospace',cursor:'pointer'});
  btn.addEventListener('click',()=>decide(value));actions.append(btn)
 }el.append(actions);document.body.append(el)
}
function settings(){
 const panel=document.getElementById('headerMenuPanel');
 if(!panel||document.getElementById('injInsightsSettingsButton'))return;
 const group=panel.querySelector('#menuPreferencesAccordion .menu-settings-grid')||panel;
 const btn=document.createElement('button');btn.id='injInsightsSettingsButton';btn.type='button';
 btn.className='menu-action menu-setting menu-privacy-consent';
 btn.setAttribute('aria-label','Gestisci consenso statistiche');
 btn.innerHTML='<span aria-hidden="true" class="menu-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M12 10v6M12 7h.01"/></svg></span><span class="menu-action-copy"><strong>Privacy statistiche</strong><small>Gestisci consenso analisi</small></span><svg aria-hidden="true" class="menu-action-chevron menu-action-forward" viewBox="0 0 24 24"><path d="m10 7 5 5-5 5"/></svg>';
 btn.addEventListener('click',showConsent);
 group.append(btn);
 window.INJ_I18N?.translate?.(btn);
}
window.INJNodeInsights={openSettings:showConsent,consent:()=>consent};
function init(){
 if(consent==='yes')begin();
 else if(!consent&&home){const promptTimer=setInterval(()=>{if(consent){clearInterval(promptTimer);return}if(!document.querySelector('#entryGate .entry-gate-shell.first-access'))showConsent()},4500)}
 if(home){settings();const wallets=document.getElementById('entryWallets');if(wallets)new MutationObserver(()=>{if(consent==='yes')selectedWallet()}).observe(wallets,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected']})}
 document.addEventListener('click',e=>{
  if(consent!=='yes')return;
  const tile=e.target.closest('.entry-action');if(tile && tile.tagName==='BUTTON'){
   section=(tile.querySelector('strong')?.textContent||tile.getAttribute('aria-label')||'HOME ACTION').trim().slice(0,72);
   send('section',{section});
  }
  if(e.target.closest('[id^="close"][id$="Button"],#dashboardHomeButton,.nav-home-button'))section='HOME';
  setTimeout(selectedWallet,150)
 },true);
 document.addEventListener('visibilitychange',()=>{if(consent!=='yes')return;if(document.hidden)send('heartbeat',{section});else send('resume')});
 window.addEventListener('pagehide',()=>{if(consent==='yes'&&!document.hidden)send('heartbeat',{section})});
 setInterval(()=>{if(consent==='yes'&&!document.hidden)send('heartbeat',{section})},15000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();