/* INJ Node · six curated themes, cross-page persistence and gentle ambient mode. */
(function(){
 'use strict';
 var root=document.documentElement;
 var key='inj_monitor_theme',motionKey='inj_node_theme_motion_v1';
 var tones={obsidian:'#0b1722',arctic:'#f3f9fc',orbit:'#15152e',emerald:'#10251e',ember:'#24141d',titanium:'#2b363f', 'pure-black':'#020305', 'graphite':'#101419', 'frost-white':'#f6f9fc', 'warm-ivory':'#f9f4e9', 'midnight-blue':'#081426', 'slate-grey':'#1e272e', 'liquid-silver':'#0d141d', 'chrome-blue':'#061324', 'pearl-glass':'#edf4f7', 'rose-copper':'#21151c', 'sapphire-glass':'#0a0f2c', 'golden-satin':'#21180f', 'neon-grid':'#040b16', 'cyber-cyan':'#03151b', 'quantum-purple':'#0e0820', 'matrix-green':'#05120c', 'solar-circuit':'#1a0f10', 'red-horizon':'#190b14', 'classic-black':'#050505', 'classic-white':'#ffffff', 'classic-navy':'#0a1625', 'classic-ivory':'#f8f3e9', 'classic-stone':'#30383d', 'classic-champagne':'#e8dcc9'};
 var legacy={navy:'obsidian',black:'obsidian',light:'arctic',amber:'ember',velvet:'orbit','ocean-x-solar':'ember',ocean:'emerald',chromatic:'orbit',aqua:'arctic','ocean-x-electric':'orbit','ocean-x-ion':'orbit','ocean-x-toxic':'emerald',dynamic:'obsidian'};
 function get(k){try{return localStorage.getItem(k)}catch(_){return null}}
 function put(k,v){try{localStorage.setItem(k,v)}catch(_){}}
 function normalize(v){return Object.prototype.hasOwnProperty.call(tones,v)?v:(legacy[v]||'obsidian')}
 var names={obsidian:'Obsidian Pulse',arctic:'Arctic Glass',orbit:'Deep Orbit',emerald:'Emerald Flux',ember:'Ember Gold',titanium:'Liquid Titanium', 'pure-black':'Pure Black', 'graphite':'Graphite', 'frost-white':'Frost White', 'warm-ivory':'Warm Ivory', 'midnight-blue':'Midnight Blue', 'slate-grey':'Slate Grey', 'liquid-silver':'Liquid Silver', 'chrome-blue':'Chrome Blue', 'pearl-glass':'Pearl Glass', 'rose-copper':'Rose Copper', 'sapphire-glass':'Sapphire Glass', 'golden-satin':'Golden Satin', 'neon-grid':'Neon Grid', 'cyber-cyan':'Cyber Cyan', 'quantum-purple':'Quantum Purple', 'matrix-green':'Matrix Green', 'solar-circuit':'Solar Circuit', 'red-horizon':'Red Horizon', 'classic-black':'Nero', 'classic-white':'Bianco', 'classic-navy':'Navy Classico', 'classic-ivory':'Avorio', 'classic-stone':'Stone Grey', 'classic-champagne':'Champagne'};
 function updateThemeControls(theme){
  document.querySelectorAll('[data-theme-choice]').forEach(function(button){
   var active=button.dataset.themeChoice===theme;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',active?'true':'false');
  });
  document.querySelectorAll('#themePicker .inj-theme-family').forEach(function(group){
   group.dataset.selected=group.querySelector('[data-theme-choice="'+theme+'"]')?'true':'false';
  });
  var button=document.getElementById('themeButton');
  if(button){
   button.dataset.theme=theme;
   button.title='Tema: '+names[theme];
   button.setAttribute('aria-label','Tema attuale '+names[theme]+'. Cambia tema');
  }
 }
 function currentMotion(){return get(motionKey)==='static'?'static':'dynamic'}
 function refreshTone(){
  var value=tones[normalize(root.dataset.theme)];
  var tag=document.querySelector('meta[name="theme-color"]');
  if(tag)tag.setAttribute('content',value);
 }
 function setTheme(value,save){
  var theme=normalize(value);
  // Save before changing the DOM. This prevents observers from restoring a
  // stale theme during an iOS tap or after an embedded page wakes up.
  if(save)put(key,theme);
  if(root.dataset.theme!==theme)root.dataset.theme=theme;
  refreshTone();
  updateThemeControls(theme);
 }
 function setMotion(mode,save){
  var selected=mode==='static'?'static':'dynamic';
  root.dataset.injThemeMotion=selected;
  if(save)put(motionKey,selected);
  document.querySelectorAll('#injThemeMotionSwitch [data-theme-motion-choice]').forEach(function(button){
   button.setAttribute('aria-pressed',button.dataset.themeMotionChoice===selected?'true':'false');
  });
 }
 function english(){return root.lang==='en'||get('inj_node_language_v1')==='en'}
 function updateLabels(){
  var wrap=document.getElementById('injThemeMotionSwitch');if(!wrap)return;
  var en=english();
  var title=wrap.querySelector('.theme-motion-label strong');
  var note=wrap.querySelector('.theme-motion-label small');
  if(title)title.textContent=en?'Ambient motion':'Animazione ambientale';
  if(note)note.textContent=en?'Gentle background movement':'Movimento leggero dello sfondo';
  var staticButton=wrap.querySelector('[data-theme-motion-choice="static"]');
  var dynamicButton=wrap.querySelector('[data-theme-motion-choice="dynamic"]');
  if(staticButton)staticButton.textContent=en?'Static':'Statico';
  if(dynamicButton)dynamicButton.textContent=en?'Dynamic':'Dinamico';
 }
 function bindThemeFamilies(picker){
  var groups=Array.from(picker.querySelectorAll('details.inj-theme-family'));
  if(!groups.length)return;
  groups.forEach(function(group){
   if(group.dataset.injFamilyBound)return;
   group.dataset.injFamilyBound='1';
   group.addEventListener('toggle',function(){
    if(!group.open)return;
    groups.forEach(function(other){if(other!==group&&other.open)other.open=false;});
   });
  });
  // Keep the menu compact until the user explicitly opens a family.
  groups.forEach(function(group){group.open=false});
 }
 function mountControl(){
  var picker=document.getElementById('themePicker');
  if(!picker||document.getElementById('injThemeMotionSwitch'))return;
  var row=document.createElement('div');row.id='injThemeMotionSwitch';row.className='theme-motion-switch';
  row.innerHTML='<span class="theme-motion-label"><strong>Animazione ambientale</strong><small>Movimento leggero dello sfondo</small></span>'+
   '<span class="theme-motion-options" role="group" aria-label="Motion mode">'+
   '<button type="button" data-theme-motion-choice="static" aria-pressed="false">Statico</button>'+
   '<button type="button" data-theme-motion-choice="dynamic" aria-pressed="true">Dinamico</button></span>';
  picker.appendChild(row);
  bindThemeFamilies(picker);
  row.querySelectorAll('[data-theme-motion-choice]').forEach(function(button){
   button.addEventListener('pointerdown',function(event){event.stopPropagation()},{passive:true});
   button.addEventListener('click',function(event){
    event.preventDefault();event.stopPropagation();setMotion(button.dataset.themeMotionChoice,true);
   });
  });
  setMotion(currentMotion(),false);updateLabels();
 }
 /* An independent compositor layer makes the 20-second animation obvious on
    iOS Safari. It stays underneath the Home shell and never touches data. */
 function mountHomeAtmosphere(){
  if(root.dataset.injPage!=='index')return;
  var gate=document.getElementById('entryGate');
  if(!gate||gate.querySelector('.inj-theme-flow-layer'))return;
  var layer=document.createElement('div');
  layer.className='inj-theme-flow-layer';
  layer.setAttribute('aria-hidden','true');
  var track=document.createElement('div');
  track.className='inj-theme-flow-track';
  layer.appendChild(track);
  gate.insertBefore(layer,gate.firstChild);
 }
 // Capture choice before other scripts and deferred iPhone handlers can
 // close/rebuild the menu. The regular app click handler remains unchanged.
 document.addEventListener('click',function(event){
  var choice=event.target&&event.target.closest&&event.target.closest('[data-theme-choice]');
  if(!choice||!Object.prototype.hasOwnProperty.call(tones,choice.dataset.themeChoice))return;
  setTheme(choice.dataset.themeChoice,true);
 },true);
 // Apply before the deferred app initializer; legacy palettes migrate safely.
 setTheme(get(key)||root.dataset.theme,true);
 setMotion(currentMotion(),false);
 var observer=new MutationObserver(function(records){
  if(!records.some(function(r){return r.attributeName==='data-theme'}))return;
  // Never treat a legacy script's DOM reset as a user preference. The value
  // saved by the last explicit selection always wins, on every page.
  var selected=normalize(get(key)||root.dataset.theme);
  if(root.dataset.theme!==selected){setTheme(selected,false);return}
  refreshTone();updateThemeControls(selected);
  document.querySelectorAll('iframe').forEach(function(frame){
   try{if(frame.contentWindow&&frame.contentWindow.location.origin===location.origin)
    frame.contentWindow.postMessage({type:'injnode:theme:sync',theme:selected,motion:currentMotion()},location.origin)}catch(_){}
  });
 });
 observer.observe(root,{attributes:true,attributeFilter:['data-theme']});
 function initialize(){mountControl();mountHomeAtmosphere();updateThemeControls(normalize(get(key)||root.dataset.theme));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
 window.addEventListener('injnode:languagechange',updateLabels);
 window.addEventListener('storage',function(event){
  if(event.key===key)setTheme(get(key),false);
  if(event.key===motionKey)setMotion(currentMotion(),false);
  if(event.key==='inj_node_language_v1')updateLabels();
 });
 window.addEventListener('message',function(event){
  if(event.origin!==location.origin||event.data?.type!=='injnode:theme:sync')return;
  setTheme(event.data.theme,false);setMotion(event.data.motion,false);
 });
 window.addEventListener('pageshow',function(){
  setTheme(get(key)||root.dataset.theme,false);setMotion(currentMotion(),false);updateLabels();mountHomeAtmosphere();
 });
})();
