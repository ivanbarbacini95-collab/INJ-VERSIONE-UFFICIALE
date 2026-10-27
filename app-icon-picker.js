/* INJ Node · App Icon Picker v16.07.03
   Preview + saved choice + unique Safari Add to Home Screen install links.
   Installed iOS Home Screen icons cannot be replaced programmatically. */
(()=>{
'use strict';
const root=document.documentElement;
const host=document.getElementById('appIconControl');
if(!host)return;
const variants={
 minimal:{title:'Minimal',png180:'inj-node-minimal-180-v16.06.29.png',png192:'inj-node-minimal-192-v16.06.29.png',svg:'inj-node-minimal-v16.06.29.svg'},
 classic:{title:'Classic JN',png180:'inj-node-180-v16.06.28.png',png192:'inj-node-192-v16.06.28.png',svg:'inj-node-icon-v16.06.28.svg'},
 aurora:{title:'Aurora',png180:'inj-node-aurora-180-v16.07.03.png',png192:'inj-node-aurora-192-v16.07.03.png'},
 pulse:{title:'Pulse',png180:'inj-node-pulse-180-v16.07.03.png',png192:'inj-node-pulse-192-v16.07.03.png'}
};
const KEY='inj_node_app_icon_v1',item=id=>document.getElementById(id);
const read=()=>{try{return localStorage.getItem(KEY)}catch(_){return null}};
const save=id=>{try{localStorage.setItem(KEY,id)}catch(_){}};
// Static install routes contain the complete application with their own
// manifest and apple-touch-icon. Keep that icon stable, even when Safari's
// saved preference differs from the source PWA's preference.
const installMatch=(location.pathname||'').match(/\/install-icon-(minimal|classic|aurora|pulse)\.html$/);
const installedStyle=installMatch?.[1]||null;
let selected=installedStyle||(Object.hasOwn(variants,read())?read():'minimal');
const lang=()=>root.lang==='en'?'en':'it';
function text(id,value){const el=item(id);if(el&&el.textContent!==value)el.textContent=value}
function apply(){
 const data=variants[selected],english=lang()==='en';
 for(const button of host.querySelectorAll('[data-app-icon]')){
  button.setAttribute('aria-pressed',String(button.dataset.appIcon===selected));
 }
 const preview=item('appIconCurrentPreview');
 if(preview)preview.src='./icons/'+data.png180;
 text('appIconTitle',english?'App icon':'Icona app');
 text('appIconSubtitle',data.title+' · '+(english?'choose style':'scegli stile'));
 text('appIconNote',english?
  'Open INJ Node in Safari with your selected icon, then use Share → Add to Home Screen. Existing icons cannot change automatically. Keep your saved wallets and settings before replacing an installation.':
  'Apri INJ Node in Safari con l’icona scelta, poi usa Condividi → Aggiungi alla schermata Home. L’icona attuale non cambia automaticamente. Conserva i wallet e le impostazioni locali prima di sostituire la PWA.');
 text('appIconInstallText',english?'Open INJ Node in browser':'Apri INJ Node nel browser');
 text('appIconCopyLink',english?'Copy link for Safari':'Copia link per Safari');
 const link=item('appIconInstallLink');
 if(link){
  link.href='./install-icon-'+selected+'.html';
  link.target='_blank';
  link.rel='noopener noreferrer external';
 }
 host.querySelector('#appIconChoices')?.setAttribute('aria-label',english?'App icon styles':'Stili icona app');
 // A browser installation route MUST keep its statically declared icon.
 // Otherwise the active PWA's stored preference could overwrite the chosen
 // icon before Safari captures the Add to Home Screen preview.
 if(installedStyle)return;
 const apple=document.querySelector('link[rel="apple-touch-icon"]');
 if(apple)apple.href='./icons/'+data.png180;
 const favicon=document.querySelector('link[rel="icon"][type="image/png"]');
 if(favicon)favicon.href='./icons/'+data.png192;
 const svg=document.querySelector('link[rel="icon"][type="image/svg+xml"]');
 if(svg){
  if(data.svg){svg.href='./icons/'+data.svg;svg.disabled=false;svg.type='image/svg+xml'}
  else {svg.remove();}
 }
}
const copyButton=item('appIconCopyLink');
if(copyButton){
 copyButton.addEventListener('click',async()=>{
  const link=item('appIconInstallLink');
  if(!link)return;
  const url=new URL(link.getAttribute('href')||link.href,location.href).href;
  const english=lang()==='en';
  try{
   await navigator.clipboard.writeText(url);
   copyButton.textContent=english?'Link copied — open in Safari':'Link copiato — aprilo in Safari';
  }catch(_){
   // Older standalone WebKit environments can deny clipboard writes.
   window.prompt(english?'Copy and open this URL in Safari':'Copia questo link e aprilo in Safari',url);
  }
 });
}
for(const button of host.querySelectorAll('[data-app-icon]')){
 button.addEventListener('click',()=>{
  const value=button.dataset.appIcon;
  if(!Object.hasOwn(variants,value))return;
  selected=value;save(value);apply();
 });
}
const watch=new MutationObserver(changes=>{
 if(changes.some(x=>x.attributeName==='lang'))apply();
});
watch.observe(root,{attributes:true,attributeFilter:['lang']});
window.addEventListener('storage',event=>{
 if(event.key===KEY && Object.hasOwn(variants,event.newValue)){
  selected=event.newValue;apply();
 }
});
apply();
})();
