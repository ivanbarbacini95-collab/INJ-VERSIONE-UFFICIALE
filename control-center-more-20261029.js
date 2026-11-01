/* INJ Node · 2026-10-29 · Settings category layout and premium Home visuals.
   Keep every original control element, ID and event handler. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const svgIcon=(kind)=>{
  if(kind==='shield')return '<path d="M12 3 20 7v5c0 5-3 8-8 9-5-1-8-4-8-9V7z"/><path d="m9 12 2 2 4-4"/>';
  if(kind==='bell')return '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>';
  return '<path d="M4 7h16M7 12h10M9 17h6"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="12" cy="17" r="2"/>';
 };
 const createSection=(id,icon,italian,english,subIt,subEn)=>{
  const details=document.createElement('details');
  details.className='menu-accordion menu-compact-group';
  details.id=id;
  details.name='inj-settings-accordion';
  details.innerHTML='<summary class="menu-accordion-trigger">'+
   '<span aria-hidden="true" class="menu-accordion-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+svgIcon(icon)+'</svg></span>'+
   '<span class="menu-accordion-copy"><strong class="menu-compact-heading"></strong><small class="menu-compact-subtitle"></small></span>'+
   '<svg aria-hidden="true" class="menu-accordion-caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></summary>'+
   '<div class="menu-accordion-content"><div class="menu-settings-grid"></div></div>';
  details.dataset.it=italian;details.dataset.en=english;
  details.dataset.subIt=subIt;details.dataset.subEn=subEn;
  return details;
 };
 const settings=()=>{
  const panel=$('headerMenuPanel'),pref=$('menuPreferencesAccordion'),advanced=$('menuAdvancedAccordion');
  if(!panel||!pref||!advanced||panel.dataset.compactProBound==='1')return;
  panel.dataset.compactProBound='1';
  const quick=panel.querySelector('.menu-quick-grid');
  const cloud=$('injCloudSyncMenuButton');
  if(quick&&cloud&&!quick.contains(cloud)){
   cloud.classList.remove('menu-setting');cloud.classList.add('menu-tile','menu-cloud-tile');
   quick.appendChild(cloud);
  }
  const privacy=createSection('menuPrivacyAccordion','shield','Privacy e portafoglio','Privacy & wallet','Privacy · Valuta · Prezzo medio','Privacy · Currency · Cost basis');
  const feedback=createSection('menuFeedbackAccordion','bell','Notifiche e feedback','Notifications & feedback','Morning Brief · Suono · Vibrazione','Morning Brief · Sound · Haptics');
  pref.after(privacy,feedback);
  const prefHeader=pref.querySelector('.menu-accordion-copy');
  const advancedHeader=advanced.querySelector('.menu-accordion-copy');
  if(prefHeader){
   const title=prefHeader.querySelector('strong'),sub=prefHeader.querySelector('small');
   if(title)title.classList.add('menu-compact-heading');
   if(sub)sub.classList.add('menu-compact-subtitle');
  }
  if(advancedHeader){
   const title=advancedHeader.querySelector('strong'),sub=advancedHeader.querySelector('small');
   if(title)title.classList.add('menu-compact-heading');
   if(sub)sub.classList.add('menu-compact-subtitle');
  }
  const appearanceGrid=pref.querySelector('.menu-settings-grid');
  const privacyGrid=privacy.querySelector('.menu-settings-grid');
  const feedbackGrid=feedback.querySelector('.menu-settings-grid');
  const move=(id,el)=>{const item=$(id);if(item&&el)el.appendChild(item);};
  // These are the exact same nodes so the app retains its state and listeners.
  ['themeControl','languageControl','appIconControl'].forEach(id=>move(id,appearanceGrid));
  ['currencyButton','privacyButton','averagePriceControl'].forEach(id=>move(id,privacyGrid));
  ['morningBriefMenuButton','menuFeedbackSoundButton','menuFeedbackVolumeControl','menuFeedbackHapticButton'].forEach(id=>move(id,feedbackGrid));
  const migrateConsent=()=>{const c=$('injInsightsSettingsButton');if(c&&!privacyGrid.contains(c))privacyGrid.appendChild(c);};
  migrateConsent();
  const consentObserver=new MutationObserver(migrateConsent);
  consentObserver.observe(panel,{subtree:true,childList:true});
  const localize=()=>{
   const en=localStorage.getItem('inj_node_language_v1')==='en';
   const set=(el,title,subtitle)=>{
    const h=el?.querySelector('.menu-compact-heading'),s=el?.querySelector('.menu-compact-subtitle');
    if(h)h.textContent=title;
    if(s)s.textContent=subtitle;
   };
   set(pref,en?'Appearance & interface':'Aspetto e interfaccia',en?'Theme · Language · App icon':'Tema · Lingua · Icona app');
   set(privacy,en?privacy.dataset.en:privacy.dataset.it,en?privacy.dataset.subEn:privacy.dataset.subIt);
   set(feedback,en?feedback.dataset.en:feedback.dataset.it,en?feedback.dataset.subEn:feedback.dataset.subIt);
   set(advanced,en?'System & advanced':'Sistema e avanzate',en?'Network · History · Install':'Rete · Storico · Installazione');
  };
  localize();
  window.addEventListener('injnode:languagechange',localize);
  window.addEventListener('storage',e=>{if(!e.key||e.key==='inj_node_language_v1')localize();});
  panel.classList.add('menu-compact-pro');
 };
 const home=()=>{
  const events=$('entryMacroCalendarButton');
  if(events&&!events.querySelector('.inj-more-market-symbol')){
   const icon=document.createElement('span');
   icon.className='inj-more-market-symbol';icon.setAttribute('aria-hidden','true');
   icon.innerHTML='<svg viewBox="0 0 100 66" fill="none" xmlns="http://www.w3.org/2000/svg">'+
    '<rect x="9" y="11" width="82" height="45" rx="9" stroke="currentColor" stroke-opacity=".43" stroke-width="1.5"/>'+
    '<path d="M18 43h64M18 23h64M26 19v29M50 19v29M74 19v29" stroke="currentColor" stroke-opacity=".2"/>'+
    '<path d="m19 40 13-13 13 8 13-13 12 6 12-11" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle class="more-market-pulse" cx="82" cy="17" r="3.7" fill="currentColor"/>'+
    '<path d="M24 52h52" stroke="currentColor" stroke-opacity=".3" stroke-linecap="round"/>'+
    '</svg>';
   events.insertBefore(icon,events.firstChild);
  }
  const treasury=$('entryTreasuryButton');
  if(treasury&&!treasury.querySelector('.bcg-treasury-visual')){
   const visual=document.createElement('span');
   visual.className='bcg-treasury-visual';visual.setAttribute('aria-hidden','true');
   visual.innerHTML='<svg viewBox="0 0 104 72" fill="none" xmlns="http://www.w3.org/2000/svg">'+
    '<circle cx="52" cy="36" r="29" stroke="currentColor" stroke-opacity=".2" stroke-width="1.5"/>'+
    '<g class="bcg-orbit"><path d="M52 7a29 29 0 0 1 27 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
    '<path d="M52 65a29 29 0 0 1-27-19" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5" stroke-linecap="round"/>'+
    '<circle cx="52" cy="7" r="2.6" fill="currentColor"/></g>'+
    '<rect x="32" y="16" width="40" height="40" rx="8" stroke="currentColor" stroke-opacity=".65" stroke-width="1.5"/>'+
    '<path d="M44 26h11.5a5 5 0 0 1 0 10H44m0-10v20h12a5 5 0 0 0 0-10H44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<path class="bcg-signal" d="M20 36h7m50 0h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'+
    '</svg>';
   treasury.appendChild(visual);
  }
 };
 const run=()=>{settings();home();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
