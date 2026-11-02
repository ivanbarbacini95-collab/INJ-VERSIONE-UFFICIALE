/* INJ Node · Light / Pro Home experiment (development edition).
   PRO is the untouched existing experience; LIGHT only reduces Home density. */
(()=>{
 'use strict';
 const root=document.documentElement;
 if(root.dataset.injPage!=='index')return;
 const STORE='inj_node_view_mode_v1';
 const readMode=()=>{
  try{return localStorage.getItem(STORE)==='light'?'light':'pro'}
  catch(_){return 'pro'}
 };
 const english=()=>{
  try{return localStorage.getItem('inj_node_language_v1')==='en'||root.lang==='en'}
  catch(_){return root.lang==='en'}
 };
 let mode=readMode();
 root.dataset.injViewMode=mode;
 let toggle;
 function updateText(){
  if(!toggle)return;
  const en=english();
  const isLight=mode==='light';
  toggle.dataset.mode=mode;
  toggle.setAttribute('aria-pressed',String(!isLight));
  toggle.setAttribute('aria-label',en?
   (isLight?'Lite mode active. Switch to Pro':'Pro mode active. Switch to Lite'):
   (isLight?'Modalità Lite attiva. Passa a Pro':'Modalità Pro attiva. Passa a Lite'));
  toggle.title=en?(isLight?'Switch to Pro mode':'Switch to Lite mode'):
   (isLight?'Passa alla modalità Pro':'Passa alla modalità Lite');
  toggle.querySelector('.inj-mode-name').textContent=isLight?'Lite':'Pro';
  toggle.querySelector('.inj-mode-symbol').innerHTML=isLight?
   '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M18.4 5.6l-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="3.5"/></svg>':
   '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M13 2 5.5 13h6l-1 9L19 10h-6l0-8z"/></svg>';
 }
 function setMode(next,save){
  mode=next==='light'?'light':'pro';
  root.dataset.injViewMode=mode;
  if(save){try{localStorage.setItem(STORE,mode)}catch(_){}}
  updateText();
  try{window.dispatchEvent(new CustomEvent('injnode:viewmodechange',{detail:{mode}}))}catch(_){}
 }
 function alignNavFonts(){
  const nav=document.getElementById('injPrimaryBottomNav');
  if(!nav)return;
  nav.querySelectorAll('.inj-bottom-tab-label').forEach(label=>{
   // Inline important wins prior global rules regardless of the chosen typeface.
   const rules={
    'font-family':'var(--inj-chosen-face,var(--inj-node-terminal-font,system-ui,sans-serif))',
    'font-weight':'var(--inj-chosen-detail,var(--inj-chosen-weight,500))',
    'font-style':'normal',
    'font-stretch':'normal',
    'font-size':'clamp(9px,2.7vw,10px)',
    'letter-spacing':'0',
    'line-height':'1.2',
    'text-transform':'uppercase',
    'text-align':'center'
   };
   for(const [property,value] of Object.entries(rules)){
    label.style.setProperty(property,value,'important');
   }
  });
 }
 function mount(){
  const heading=document.querySelector('#entryGate .entry-wallet-section > .home-safe-heading');
  if(!heading)return;
  if(!document.getElementById('injViewModeToggle')){
   toggle=document.createElement('button');
   toggle.type='button';toggle.id='injViewModeToggle';toggle.className='inj-mode-toggle';
   toggle.innerHTML='<span class="inj-mode-symbol" aria-hidden="true"></span><span class="inj-mode-name">PRO</span>';
   heading.appendChild(toggle);
   heading.classList.add('inj-terminal-hero-arranged');
   toggle.addEventListener('click',()=>setMode(mode==='pro'?'light':'pro',true));
  }else toggle=document.getElementById('injViewModeToggle');
  updateText();
  alignNavFonts();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.addEventListener('injnode:languagechange',updateText);
 window.addEventListener('injnode:fontchange',alignNavFonts);
 window.addEventListener('pageshow',()=>{setMode(readMode(),false);alignNavFonts()});
 window.addEventListener('storage',e=>{
  if(e.key===STORE)setMode(readMode(),false);
  if(e.key==='inj_node_language_v1')updateText();
 });
})();
