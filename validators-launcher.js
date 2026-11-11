/* INJ Node · Validators Tools entry. Runs before bottom-tab routing. */
(() => {
 'use strict';
 const gate=document.getElementById('entryGate');
 const actions=gate?.querySelector('.entry-actions.entry-flat-v44');
 if(!actions)return;
 let card=document.getElementById('entryValidatorsButton');
 if(!card){card=document.createElement('a');card.id='entryValidatorsButton'}
 if(card.parentElement!==actions){
  const previous=document.getElementById('entryNetworkStatusButton');
  if(previous&&previous.parentElement===actions)previous.after(card);
  else actions.append(card);
 }
 card.className='entry-action entry-action-validators';
 card.href='./validators.html?v=20261111b';
 card.setAttribute('aria-label','Apri Validators Injective');
 card.innerHTML='<span><strong class="inj-home-tile-title" data-it="Validators" data-en="Validators">Validators</strong><small class="inj-tile-description" data-it="APR netto, commissioni e delegatori" data-en="Net APR, fees and delegators">APR netto, commissioni e delegatori</small></span><span aria-hidden="true" data-premium-artwork="luxury-b" class="inj-tile-scene inj-precision-icon inj-luxury-icon inj-tools-art inj-validators-art"><svg viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><circle class="pi-panel" cx="60" cy="34" r="23"/><path class="pi-hair" d="M60 11v46M37 34h46M44 18l32 32M76 18 44 50"/><circle class="pi-led v-node v-a" cx="60" cy="11" r="4"/><circle class="pi-led v-node v-b" cx="82" cy="34" r="4"/><circle class="pi-led v-node v-c" cx="44" cy="50" r="4"/><circle class="pi-strong" cx="60" cy="34" r="8"/><circle class="pi-detail" cx="60" cy="34" r="3"/></svg></span><svg aria-hidden="true" class="entry-action-arrow" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';
 if(!document.getElementById('injValidatorsTileStyle')){
  const style=document.createElement('style');style.id='injValidatorsTileStyle';
  style.textContent=[
   '#entryValidatorsButton,#entryValidatorsButton:link,#entryValidatorsButton:visited,#entryValidatorsButton .inj-home-tile-title{text-decoration:none!important;text-decoration-line:none!important;border-bottom:0!important}',
   '#entryValidatorsButton .inj-home-tile-title::after{display:none!important;content:none!important}',
   'html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryValidatorsButton > .inj-validators-art{display:block!important;visibility:visible!important;opacity:.96!important;pointer-events:none!important;position:absolute!important;z-index:1!important;box-sizing:border-box!important;top:7px!important;left:50%!important;right:auto!important;width:80px!important;max-width:80px!important;height:43px!important;transform:translateX(-50%)!important;color:var(--tile-accent,var(--accent,#d7c6a9))!important}',
   'html[data-inj-page="index"] #entryValidatorsButton > .inj-validators-art svg{width:100%!important;height:100%!important;overflow:visible!important;display:block!important;fill:none!important;stroke:none!important}',
   '#entryValidatorsButton .v-node{animation:injValidatorsGlow 2.7s ease-in-out infinite;transform-box:fill-box;transform-origin:center}',
   '#entryValidatorsButton .v-b{animation-delay:.6s}#entryValidatorsButton .v-c{animation-delay:1.2s}',
   '@keyframes injValidatorsGlow{0%,100%{opacity:.4;transform:scale(.7)}50%{opacity:1;transform:scale(1.4)}}',
   '@media(min-width:800px){html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryValidatorsButton > .inj-validators-art{top:50%!important;left:auto!important;right:17px!important;width:77px!important;height:49px!important;transform:translateY(-50%)!important}}',
   '@media(prefers-reduced-motion:reduce){#entryValidatorsButton .v-node{animation:none!important}}'
  ].join('');
  document.head.appendChild(style);
 }
})();