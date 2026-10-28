/* INJ VERSIONE UFFICIALE · Control Center Pro
 * Presentation-only enhancements: existing wallet, refresh, settings, theme,
 * language and Cloud Sync handlers remain attached to their original nodes. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const run=()=>{
  const panel=$('headerMenuPanel'),wrapper=$('headerMenu'),quick=panel?.querySelector('.menu-quick-grid');
  const cloud=$('injCloudSyncMenuButton');
  if(!panel||!quick)return;
  if(cloud&&!quick.contains(cloud)){
   cloud.classList.remove('menu-setting');
   cloud.classList.add('menu-tile','menu-cloud-tile');
   quick.appendChild(cloud);
  }
  const prefs=$('menuPreferencesAccordion');
  const privacy=$('injInsightsSettingsButton');
  const group=prefs?.querySelector('.menu-settings-grid');
  if(group&&privacy&&!group.contains(privacy)){
   privacy.classList.add('menu-action','menu-setting','menu-privacy-consent');
   privacy.removeAttribute('style');
   group.appendChild(privacy);
  }
  if(!wrapper||wrapper.dataset.proMenuBound==='1')return;
  wrapper.dataset.proMenuBound='1';
  wrapper.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&wrapper.classList.contains('open')){
    event.preventDefault();
    $('menuCloseButton')?.click();
    $('entryMenuButton')?.focus({preventScroll:true});
   }
  });
  // Each new opening starts at the top. The menu itself still owns scrolling,
  // and the native disclosure / slider controls keep their original behavior.
  const observer=new MutationObserver(()=>{
    if(wrapper.classList.contains('open'))panel.scrollTop=0;
  });
  observer.observe(wrapper,{attributes:true,attributeFilter:['class']});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
 else run();
})();
