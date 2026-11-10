/* INJ Node · Native-style five-destination Home navigation, 30 Oct 2026.
   Existing launchers, IDs, listeners and wallet/chart DOM remain untouched.
   Switch only their presentation; never clone wallet/trading components. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const gate=document.getElementById('entryGate');
 const actions=gate?.querySelector('.entry-actions.entry-flat-v44');
 if(!gate||!actions||document.getElementById('injPrimaryBottomNav'))return;
 // A stale Home shell can survive a PWA update. Repair a missing launcher
 // without duplicating cards or depending on the cached index.html template.
 function ensureMultiChartLauncher(){
   let card=document.getElementById('entryMultiChartButton');
   if(!card){card=document.createElement('a');card.id='entryMultiChartButton';}
   if(card.parentElement!==actions)actions.insertBefore(card,document.getElementById('entryComparisonButton')||actions.firstChild);
   card.className='entry-action entry-action-multi-chart';
   card.href='./multi-chart.html?v=20261106-vertical4-price1';
   card.setAttribute('aria-label','Apri INJ Multi Chart');
   card.innerHTML='<span><strong class="inj-home-tile-title" data-it="INJ Multi Chart" data-en="INJ Multi Chart">INJ Multi Chart</strong></span><span aria-hidden="true" data-premium-artwork="luxury-b" class="inj-tile-scene inj-precision-icon inj-luxury-icon inj-multichart-art"><svg viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect class="pi-panel" x="11" y="8" width="44" height="23" rx="4"/><rect class="pi-panel" x="65" y="8" width="44" height="23" rx="4"/><rect class="pi-panel" x="11" y="37" width="44" height="23" rx="4"/><rect class="pi-panel" x="65" y="37" width="44" height="23" rx="4"/><path class="pi-strong" d="m16 24 8-6 7 4 8-9 10 3M70 24l7-7 7 4 8-8 11 4M16 52l7-8 8 3 8-6 10 4M70 53l7-5 7 2 9-9 10 3"/><path class="pi-hair" d="M16 27h34M70 27h34M16 56h34M70 56h34"/><circle class="pi-led" cx="49" cy="16" r="2"/><circle class="pi-led" cx="103" cy="44" r="2"/></svg></span><svg aria-hidden="true" class="entry-action-arrow" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';
   return card;
 }
 ensureMultiChartLauncher();

 function ensureAllTransactionsLauncher(){
   let card=document.getElementById('entryAllTransactionsButton');
   if(!card){card=document.createElement('a');card.id='entryAllTransactionsButton';}
   if(card.parentElement!==actions){
     const after=document.getElementById('entryMultiChartButton');
     if(after&&after.parentElement===actions)after.after(card);else actions.prepend(card);
   }
   card.className='entry-action entry-action-all-transactions';
   card.href='./all-transactions.html?v=20261109-tools-return-motion1';
   card.setAttribute('aria-label','Apri All Transaction');
   card.innerHTML="<span><strong class=\"inj-home-tile-title\" data-it=\"All Transaction\" data-en=\"All Transaction\">All Transaction</strong><small class=\"inj-tile-description\" data-it=\"Storico e riepilogo on-chain\" data-en=\"On-chain history and totals\">Storico e riepilogo on-chain</small></span><span aria-hidden=\"true\" data-premium-artwork=\"luxury-b\" class=\"inj-tile-scene inj-precision-icon inj-luxury-icon inj-tools-art inj-transaction-art\"><svg viewBox=\"0 0 120 68\" xmlns=\"http://www.w3.org/2000/svg\" focusable=\"false\" aria-hidden=\"true\"><rect class=\"pi-panel\" x=\"31\" y=\"7\" width=\"58\" height=\"53\" rx=\"8\"/><path class=\"pi-hair\" d=\"M42 19h37M42 27h21M42 35h16M42 53h35\"/><path class=\"pi-detail inj-txn-row-a\" d=\"M42 20h27\"/><path class=\"pi-detail inj-txn-row-b\" d=\"M42 28h19\"/><path class=\"pi-strong inj-txn-check\" d=\"m65 39 6 6 12-14\"/><circle class=\"pi-led inj-txn-led\" cx=\"81\" cy=\"16\" r=\"2.7\"/></svg></span><svg aria-hidden=\"true\" class=\"entry-action-arrow\" viewBox=\"0 0 24 24\"><path d=\"m9 6 6 6-6 6\"/></svg>";
   return card;
 }
 ensureAllTransactionsLauncher();

 function ensureNetworkStatusLauncher(){
  let card=document.getElementById('entryNetworkStatusButton');
  if(!card){card=document.createElement('a');card.id='entryNetworkStatusButton';}
  if(card.parentElement!==actions){
   const after=document.getElementById('entryAllTransactionsButton');
   if(after&&after.parentElement===actions)after.after(card);else actions.prepend(card);
  }
  card.className='entry-action entry-action-network-status';
  card.href='./network-status.html?v=20261109-tools-return-motion1';
  card.setAttribute('aria-label','Apri Status Network');
  card.innerHTML="<span><strong class=\"inj-home-tile-title\" data-it=\"Status Network\" data-en=\"Status Network\">Status Network</strong><small class=\"inj-tile-description\" data-it=\"Blocchi, rete e segnalazioni\" data-en=\"Blocks, network and incidents\">Blocchi, rete e segnalazioni</small></span><span aria-hidden=\"true\" data-premium-artwork=\"luxury-b\" class=\"inj-tile-scene inj-precision-icon inj-luxury-icon inj-tools-art inj-network-art\"><svg viewBox=\"0 0 120 68\" xmlns=\"http://www.w3.org/2000/svg\" focusable=\"false\" aria-hidden=\"true\"><rect class=\"pi-panel\" x=\"13\" y=\"14\" width=\"94\" height=\"40\" rx=\"8\"/><path class=\"pi-hair\" d=\"M23 43h74M25 25h12M85 25h10\"/><path class=\"pi-strong inj-net-wave\" d=\"M22 36h15l9-13 13 27 14-23 8 9h17\"/><circle class=\"pi-led inj-net-led\" cx=\"94\" cy=\"22\" r=\"3\"/><path class=\"pi-detail\" d=\"M45 59h30\"/></svg></span><svg aria-hidden=\"true\" class=\"entry-action-arrow\" viewBox=\"0 0 24 24\"><path d=\"m9 6 6 6-6 6\"/></svg>";
  return card;
 }
 ensureNetworkStatusLauncher();

 function ensureMarketReactorLauncher(){
  let card=document.getElementById('entryMarketReactorButton');
  if(!card){card=document.createElement('a');card.id='entryMarketReactorButton';}
  if(card.parentElement!==actions){
   const first=document.getElementById('entryMultiChartButton');
   if(first&&first.parentElement===actions)first.after(card);else actions.prepend(card);
  }
  card.className='entry-action entry-action-market-reactor';
  card.href='./market-reactor.html?v=20261110-core1';
  card.setAttribute('aria-label','Apri Market Reactor');
  card.innerHTML="<span><strong class=\"inj-home-tile-title\" data-it=\"Market Reactor\" data-en=\"Market Reactor\">Market Reactor</strong><small class=\"inj-tile-description\" data-it=\"Forza e momentum live\" data-en=\"Live market strength and momentum\">Forza e momentum live</small></span><span class=\"inj-tile-scene inj-tools-art inj-reactor-art\" aria-hidden=\"true\"><svg viewBox=\"0 0 120 68\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\" focusable=\"false\"><circle class=\"inj-reactor-ring outer\" cx=\"60\" cy=\"34\" r=\"25\"/><circle class=\"inj-reactor-ring middle\" cx=\"60\" cy=\"34\" r=\"18\"/><circle class=\"inj-reactor-core\" cx=\"60\" cy=\"34\" r=\"11\"/><path class=\"inj-reactor-glint\" d=\"M57 30Q60 27 64 30\"/><circle class=\"inj-reactor-dot\" cx=\"60\" cy=\"9\" r=\"2.6\"/></svg></span><svg aria-hidden=\"true\" class=\"entry-action-arrow\" viewBox=\"0 0 24 24\"><path d=\"m9 6 6 6-6 6\"/></svg>";
  return card;
 }
 ensureMarketReactorLauncher();
 if(!document.getElementById('injMarketReactorToolsTileStyle')){
  const style=document.createElement('style');
  style.id='injMarketReactorToolsTileStyle';
  style.textContent="\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton,\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton:link,\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton:visited{\n text-decoration:none!important;text-decoration-line:none!important;\n}\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton .inj-home-tile-title{\n text-decoration:none!important;border-bottom:0!important;box-shadow:none!important;\n}\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton .inj-home-tile-title::after{\n display:none!important;content:none!important;\n}\nhtml[data-inj-page=\"index\"][data-inj-home-tab=\"altro\"] body #entryGate#entryGate#entryGate\n .entry-actions.entry-flat-v44 > #entryMarketReactorButton > .inj-reactor-art{\n display:block!important;position:absolute!important;z-index:1!important;\n visibility:visible!important;opacity:1!important;pointer-events:none!important;\n box-sizing:border-box!important;top:7px!important;left:50%!important;right:auto!important;bottom:auto!important;\n width:80px!important;height:43px!important;max-width:80px!important;min-width:0!important;\n margin:0!important;padding:0!important;transform:translateX(-50%)!important;\n color:var(--accent,#94dacf)!important;overflow:visible!important;\n}\nhtml[data-inj-page=\"index\"] body #entryGate #entryMarketReactorButton .inj-reactor-art svg{\n display:block!important;width:100%!important;height:100%!important;overflow:visible!important;\n fill:none!important;visibility:visible!important;opacity:1!important;stroke:currentColor!important;\n}\n#entryMarketReactorButton .inj-reactor-ring{fill:none;stroke:currentColor;stroke-width:1.3;opacity:.7;transform-box:fill-box;transform-origin:center;animation:injReactorTileSpin 7s linear infinite}\n#entryMarketReactorButton .inj-reactor-ring.outer{stroke-dasharray:29 10;animation-duration:8s}\n#entryMarketReactorButton .inj-reactor-ring.middle{stroke-dasharray:19 8;animation-direction:reverse;animation-duration:6s;opacity:.48}\n#entryMarketReactorButton .inj-reactor-core{fill:color-mix(in srgb,currentColor 24%,transparent);stroke:currentColor;stroke-width:1.1;animation:injReactorTilePulse 3s ease-in-out infinite}\n#entryMarketReactorButton .inj-reactor-glint{stroke:#fff;stroke-width:1.3;stroke-linecap:round;opacity:.7}\n#entryMarketReactorButton .inj-reactor-dot{fill:currentColor;stroke:none;animation:injReactorTilePulse 2.8s ease-in-out infinite}\n@keyframes injReactorTileSpin{to{transform:rotate(360deg)}}\n@keyframes injReactorTilePulse{0%,100%{opacity:.45;transform:scale(.87)}50%{opacity:1;transform:scale(1.16)}}\n@media(min-width:800px){\n html[data-inj-page=\"index\"][data-inj-home-tab=\"altro\"] body #entryGate#entryGate#entryGate\n .entry-actions.entry-flat-v44 > #entryMarketReactorButton > .inj-reactor-art{\n  top:50%!important;bottom:auto!important;left:auto!important;right:17px!important;\n  width:77px!important;max-width:77px!important;height:49px!important;\n  transform:translateY(-50%)!important;\n }\n}\n@media(prefers-reduced-motion:reduce){\n #entryMarketReactorButton .inj-reactor-ring,#entryMarketReactorButton .inj-reactor-core,#entryMarketReactorButton .inj-reactor-dot{\n animation:none!important;transform:none!important}\n}\n";
  document.head.appendChild(style);
 }

 // Night View has moved into Live View; remove any pre-existing Tools tile.
 document.getElementById('entryNightViewButton')?.remove();
 if(!document.getElementById('injNetworkStatusToolsTileStyle')){
  const style=document.createElement('style');
  style.id='injNetworkStatusToolsTileStyle';
  style.textContent='#entryNetworkStatusButton,#entryNetworkStatusButton:link,#entryNetworkStatusButton:visited{text-decoration:none!important}#entryNetworkStatusButton .inj-home-tile-title{text-decoration:none!important;border-bottom:0!important}#entryNetworkStatusButton .inj-home-tile-title::after{content:none!important;display:none!important}#entryNetworkStatusButton > .entry-action-icon{display:grid!important;place-items:center!important;flex:none!important;width:42px!important;height:42px!important;border:1px solid color-mix(in srgb,var(--accent) 28%,transparent)!important;border-radius:13px!important;background:color-mix(in srgb,var(--accent) 10%,var(--surface-strong))!important;color:var(--accent)!important}#entryNetworkStatusButton .entry-action-icon svg{display:block!important;width:30px!important;height:30px!important;visibility:visible!important;opacity:1!important;fill:none!important;stroke:currentColor!important}';
  document.head.appendChild(style);
 }

 // Ensure premium icon/title remain visible without browser link underlines.
 if(!document.getElementById('injAllTransactionsToolsTilePolish')){
   const style=document.createElement('style');
   style.id='injAllTransactionsToolsTilePolish';
   style.textContent=[
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton:link,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton:visited',
     '{text-decoration:none!important;text-decoration-line:none!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton .inj-home-tile-title',
     '{text-decoration:none!important;text-decoration-line:none!important;border-bottom:0!important;box-shadow:none!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton .inj-home-tile-title::after',
     '{display:none!important;content:none!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton > .inj-transaction-icon',
     '{display:grid!important;place-items:center!important;visibility:visible!important;opacity:1!important;flex:none!important;width:42px!important;height:42px!important;border:1px solid color-mix(in srgb,var(--accent) 28%,transparent)!important;border-radius:13px!important;background:color-mix(in srgb,var(--accent) 10%,var(--surface-strong))!important;color:var(--accent)!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryAllTransactionsButton .entry-action-icon svg',
     '{display:block!important;width:30px!important;height:30px!important;fill:none!important;stroke:currentColor!important;opacity:1!important;visibility:visible!important;}'
   ].join('');
   document.head.appendChild(style);
 }

 
 // Tools tile polish: preserve a compact 4-chart logo and remove every
 // anchor/title underline, including theme pseudo-elements and link states.
 // Works even if iOS PWA kept the previous Home markup in memory.
 if(!document.getElementById('injMultiChartToolsTilePolish')){
   const tileStyle=document.createElement('style');
   tileStyle.id='injMultiChartToolsTilePolish';
   tileStyle.textContent=[
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryMultiChartButton.entry-action,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryMultiChartButton.entry-action:link,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryMultiChartButton.entry-action:visited,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryMultiChartButton.entry-action:hover,',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate .entry-actions.entry-flat-v44 > #entryMultiChartButton.entry-action:focus-visible',
     '{text-decoration:none!important;text-decoration-line:none!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryMultiChartButton .inj-home-tile-title',
     '{text-decoration:none!important;text-decoration-line:none!important;border-bottom:none!important;box-shadow:none!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryMultiChartButton .inj-home-tile-title::after',
     '{display:none!important;content:none!important;border:0!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryMultiChartButton .entry-action-icon',
     '{display:grid!important;place-items:center!important;flex-shrink:0!important;}',
     'html[data-inj-page="index"] body #entryGate#entryGate#entryGate #entryMultiChartButton .entry-action-icon svg',
     '{display:block!important;visibility:visible!important;width:27px!important;height:27px!important;fill:none!important;stroke:currentColor;stroke-width:1.7;opacity:1!important;}'
     ,
     'html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate #entryMultiChartButton > .inj-multichart-art',
     '{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;position:absolute!important;z-index:1!important;box-sizing:border-box!important;top:7px!important;bottom:auto!important;left:50%!important;right:auto!important;width:80px!important;max-width:80px!important;height:43px!important;min-height:0!important;transform:translateX(-50%)!important;}',
     'html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate #entryMultiChartButton > .inj-multichart-art svg',
     '{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;height:100%!important;overflow:visible!important;}',
     '@media (min-width:800px){',
     'html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate #entryMultiChartButton > .inj-multichart-art',
     '{top:50%!important;left:auto!important;right:17px!important;width:77px!important;max-width:77px!important;height:49px!important;transform:translateY(-50%)!important;}',
     '}'
   ].join('');
   document.head.appendChild(tileStyle);
 }
 // Two animated, accessible Tools icons; keep SVG motion decorative only.
 if(!document.getElementById('injToolsStatusTransactionMotion')){
  const style=document.createElement('style');
  style.id='injToolsStatusTransactionMotion';
  style.textContent="\n/* Tools · restrained, theme-colored micro-motion inside the two section icons. */\n#entryAllTransactionsButton .inj-txn-row-a{animation:injToolsTransactionRow 2.8s ease-in-out infinite}\n#entryAllTransactionsButton .inj-txn-row-b{animation:injToolsTransactionRow 2.8s ease-in-out .4s infinite}\n#entryAllTransactionsButton .inj-txn-check{stroke-dasharray:14;animation:injToolsTransactionCheck 3.2s ease-in-out infinite}\n#entryAllTransactionsButton .inj-txn-led{transform-box:fill-box;transform-origin:center;animation:injToolsStatusLed 2.8s ease-in-out infinite}\n#entryNetworkStatusButton .inj-net-wave{stroke-dasharray:24 12;animation:injToolsNetworkTrace 2.6s linear infinite}\n#entryNetworkStatusButton .inj-net-led{transform-box:fill-box;transform-origin:center;animation:injToolsStatusLed 2.6s ease-in-out infinite}\n@keyframes injToolsTransactionRow{0%,100%{opacity:.48;transform:translateX(0)}45%,65%{opacity:1;transform:translateX(1px)}}\n@keyframes injToolsTransactionCheck{0%,18%{stroke-dashoffset:14;opacity:.35}42%,82%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:-14;opacity:.35}}\n@keyframes injToolsStatusLed{0%,100%{opacity:.4;transform:scale(.7)}40%,60%{opacity:1;transform:scale(1.2)}}\n@keyframes injToolsNetworkTrace{from{stroke-dashoffset:0}to{stroke-dashoffset:-72}}\n@media (prefers-reduced-motion:reduce){\n #entryAllTransactionsButton .inj-txn-row-a,\n #entryAllTransactionsButton .inj-txn-row-b,\n #entryAllTransactionsButton .inj-txn-check,\n #entryAllTransactionsButton .inj-txn-led,\n #entryNetworkStatusButton .inj-net-wave,\n #entryNetworkStatusButton .inj-net-led{animation:none!important;stroke-dashoffset:0!important;opacity:1!important;transform:none!important}\n}\n";
  document.head.appendChild(style);
 }

 // These launchers must use the same illustrated scene as the other Tools cards.
 // The compact .entry-action-icon variant is hidden by the premium tile layout.
 if(!document.getElementById('injToolsPremiumArtLayout2')){
  const style=document.createElement('style');
  style.id='injToolsPremiumArtLayout2';
  style.textContent=`
html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate
.entry-actions.entry-flat-v44 > :is(#entryAllTransactionsButton,#entryNetworkStatusButton) > .inj-tools-art{
 display:block!important;visibility:visible!important;opacity:.96!important;
 position:absolute!important;z-index:1!important;pointer-events:none!important;
 box-sizing:border-box!important;overflow:visible!important;
 top:7px!important;bottom:auto!important;left:50%!important;right:auto!important;
 width:80px!important;min-width:0!important;max-width:80px!important;
 height:43px!important;min-height:0!important;
 margin:0!important;padding:0!important;
 transform:translateX(-50%)!important;
 color:color-mix(in srgb,var(--tile-accent,var(--accent,#d7c6a9)) 25%,var(--accent,#d7c6a9))!important;
}
html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate
.entry-actions.entry-flat-v44 > :is(#entryAllTransactionsButton,#entryNetworkStatusButton) > .inj-tools-art > svg{
 display:block!important;visibility:visible!important;opacity:1!important;
 width:100%!important;height:100%!important;
 fill:none!important;stroke:none!important;overflow:visible!important;
}
html[data-inj-page="index"] body #entryGate
 :is(#entryAllTransactionsButton,#entryNetworkStatusButton) > .inj-tools-art :is(.pi-panel,.pi-hair,.pi-detail,.pi-strong,.pi-led){
 vector-effect:non-scaling-stroke;
}
@media (min-width:800px){
 html[data-inj-page="index"][data-inj-home-tab="altro"] body #entryGate#entryGate#entryGate
 .entry-actions.entry-flat-v44 > :is(#entryAllTransactionsButton,#entryNetworkStatusButton) > .inj-tools-art{
  top:50%!important;bottom:auto!important;left:auto!important;right:17px!important;
  width:77px!important;max-width:77px!important;height:49px!important;
  transform:translateY(-50%)!important;
 }
}
`;
  document.head.appendChild(style);
 }
 const sections=[
  {id:'mercato',it:'Mercato',en:'Market',titleIt:'MERCATO',titleEn:'MARKET',subIt:'Prezzi, analisi e calendario macro',subEn:'Prices, research and macro calendar',ids:['entryGlobalMarketsButton','entryGlobalCryptoButton','entryLiveChartsButton','entryOrderBookButton','entryPerformanceButton','entryMacroCalendarButton'],icon:'<path d="M3.5 19.5h17M5 18V5.5M7.8 15l4-4 3 2 4.3-6M15.6 7h3.5v3.5"/>'},
  {id:'etf',it:'ETF',en:'ETF',titleIt:'',titleEn:'',subIt:'',subEn:'',ids:[],icon:'<rect x="5" y="3.5" width="14" height="17" rx="2.7"/><path d="M9 8h6M9 11.5h4m-4 5.9 2.2-2.4 2 1.5 2.8-3.1"/>'},
  {id:'home',it:'Home',en:'Home',titleIt:'',titleEn:'',subIt:'',subEn:'',ids:['entryDashboardButton','entryLiveButton','entryTreasuryButton'],icon:'<path d="m3.5 10 8.5-6.6 8.5 6.6v9.3a1.2 1.2 0 0 1-1.2 1.2h-4.9v-6.1H9.6v6.1H4.7a1.2 1.2 0 0 1-1.2-1.2z"/>'},
  {id:'reward',it:'My Reward',en:'My Reward',titleIt:'MY REWARD',titleEn:'MY REWARD',subIt:'Staking e ricompense del wallet selezionato',subEn:'Selected wallet staking and rewards',ids:[],icon:'<circle cx="12" cy="12" r="8.5"/><path d="M15.1 9.3c-.6-.9-1.6-1.4-3-1.4-1.8 0-3 .8-3 2.1 0 2.8 6 1 6 3.7 0 1.3-1.2 2.2-3 2.2-1.5 0-2.6-.6-3.2-1.6M12 5.8v2M12 16.2v2"/>'},
  {id:'altro',it:'Tools',en:'Tools',titleIt:'TOOLS',titleEn:'TOOLS',subIt:'Simulazioni, libertà finanziaria e altri strumenti',subEn:'Simulations, financial freedom and other tools',ids:['entryMultiChartButton','entryMarketReactorButton','entryAllTransactionsButton','entryNetworkStatusButton','entryComparisonButton','entryVisualizeWealthButton','entryFreedomButton','entryWorkspaceButton','entryConverterButton','entryCommandCenterButton'],icon:'<path d="M4 6h8m4 0h4M4 12h3m4 0h9M4 18h11m4 0h1"/><circle cx="14" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'}
 ];
 const originalDisplay=new WeakMap();
 const heading=document.createElement('header');
 heading.id='injTabHeading';heading.className='inj-tab-heading';heading.hidden=true;
 heading.innerHTML='<div><span class="inj-tab-eyebrow">INJ NODE / EXPLORE</span><h2 id="injTabHeadingTitle"></h2><p id="injTabHeadingSubtitle"></p></div>';
 actions.before(heading);
 // ETF is a direct, dedicated tab — no intermediate INJC ETF launcher.
 // Embed the existing stand-alone INJC page to preserve its live data and code.
 const etfPanel=document.createElement('section');
 etfPanel.id='injEtfTabPanel';
 etfPanel.className='inj-etf-tab-panel';
 etfPanel.hidden=true;
 etfPanel.setAttribute('aria-label','INJC ETF');
 const etfFrame=document.createElement('iframe');
 etfFrame.className='inj-etf-tab-frame';
 etfFrame.title='INJC ETF';
 etfFrame.setAttribute('loading','eager');
 etfFrame.setAttribute('referrerpolicy','same-origin');
 etfPanel.appendChild(etfFrame);
 document.body.appendChild(etfPanel);
 let etfLoaded=false;
 function loadEtfTab(){
  if(etfLoaded)return;
  etfLoaded=true;
  const source=document.getElementById('entryInjcEtfButton')?.getAttribute('href')||'./injc-etf.html';
  etfFrame.src=new URL(source,document.baseURI).href;
 }
 etfFrame.addEventListener('load',()=>{
  try{
   const language=localStorage.getItem('inj_node_language_v1')==='en'?'en':'it';
   etfFrame.contentWindow?.postMessage({type:'injnode:languagechange',language},location.origin);
  }catch(_){}
 });
 // Existing INJC back-home button posts this message from navigation.js.
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==etfFrame.contentWindow)return;
  if(event.data?.type==='injnode:section:home')activate('home',true);
 });

 const nav=document.createElement('nav');
 nav.id='injPrimaryBottomNav';
 nav.className='inj-primary-bottom-nav';
 nav.setAttribute('aria-label','Navigazione principale');
 const buttons=new Map();
 // Require a gesture that started on this tab; reject ghost/retargeted clicks.
 const tabIntent=new WeakMap();
 function rememberTabGesture(event){
  const target=event.target?.closest?.('.inj-bottom-tab');
  if(target&&nav.contains(target))tabIntent.set(target,performance.now());
 }
 for(const type of ['pointerdown','touchstart','mousedown'])
  nav.addEventListener(type,rememberTabGesture,{capture:true,passive:true});
 nav.addEventListener('click',event=>{
  const target=event.target?.closest?.('.inj-bottom-tab');
  if(!target||!nav.contains(target))return;
  const began=tabIntent.get(target)||0;
  tabIntent.delete(target);
  const fromGesture=began>0&&performance.now()-began<1600;
  const fromKeyboard=event.isTrusted&&event.detail===0;
  if(fromGesture||fromKeyboard)return;
  event.preventDefault();
  event.stopImmediatePropagation();
 },true);
 sections.forEach(section=>{
  const button=document.createElement('button');
  button.type='button';button.className='inj-bottom-tab';button.dataset.injTab=section.id;
  button.innerHTML='<span class="inj-bottom-tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+section.icon+'</svg></span><span class="inj-bottom-tab-label"></span>';
  nav.append(button);buttons.set(section.id,button);
  button.addEventListener('click',()=>{
   if(root.dataset.injHomeTab!==section.id){activate(section.id,true);}
   else if(section.id==='home')scrollHomeTop();
  });
 });
 document.body.append(nav);
 /* Promote the five-tab dock to the browser top layer. Fixed elements inside
    a transformed/scroll-locked PWA body can otherwise move with its content
    or sit below the Home overlay on iOS. Manual popovers are non-modal, so
    wallet swipes and vertical page scrolling remain fully interactive. */
 const supportsTopLayer=typeof nav.showPopover==='function' && typeof nav.hidePopover==='function';
 let syncTopLayer=()=>{};
 if(supportsTopLayer){
  nav.setAttribute('popover','manual');
  syncTopLayer=()=>{
   const shell=gate.querySelector('.entry-gate-shell');
   const performanceView=document.getElementById('performanceTimelineView');
   const marketPerformance=root.dataset.injHomeTab==='mercato' &&
     performanceView && !performanceView.hidden;
   const visible=root.dataset.injViewMode!=='light' && root.dataset.injModeTransition!=='leaving' && gate.classList.contains('visible') &&
     (gate.getAttribute('aria-hidden')==='false'||marketPerformance) &&
     document.body.classList.contains('entry-gate-open') &&
     root.dataset.injHomeTab!=='mercato' &&
     root.dataset.injHomeTab!=='reward' &&
     !document.body.classList.contains('boot-loading') &&
     !document.body.classList.contains('inj-section-open') &&
     !document.body.classList.contains('menu-overlay-open') &&
     !document.body.classList.contains('drawer-open') &&
     (!document.body.classList.contains('entry-live-launch')||marketPerformance) &&
     !shell?.classList.contains('first-access');
   if(visible&&!nav.matches(':popover-open')){
    try{nav.showPopover()}catch(_){/* Retry after the Home becomes renderable. */}
   }else if(!visible&&nav.matches(':popover-open')){
    try{nav.hidePopover()}catch(_){}
   }
  };
  const visibilityObserver=new MutationObserver(syncTopLayer);
  visibilityObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  visibilityObserver.observe(gate,{attributes:true,attributeFilter:['class','aria-hidden']});
  visibilityObserver.observe(gate.querySelector('.entry-gate-shell'),{attributes:true,attributeFilter:['class']});
  visibilityObserver.observe(root,{attributes:true,attributeFilter:['data-inj-home-tab','data-inj-view-mode','data-inj-mode-transition']});
  const performanceView=document.getElementById('performanceTimelineView');
  if(performanceView)visibilityObserver.observe(performanceView,{attributes:true,attributeFilter:['hidden','class']});
  window.addEventListener('pageshow',syncTopLayer);
  requestAnimationFrame(syncTopLayer);
 }else{
  /* Older browsers still use the high-z-index fixed CSS fallback. */
  nav.removeAttribute('popover');
 }
 const getEnglish=()=>{
  try{return localStorage.getItem('inj_node_language_v1')==='en'||root.lang==='en';}
  catch(_){return root.lang==='en';}
 };
 function refreshLanguage(){
  const en=getEnglish();
  for(const section of sections){
   const button=buttons.get(section.id);
   button.querySelector('.inj-bottom-tab-label').textContent=en?section.en:section.it;
   button.setAttribute('aria-label',en?section.en:section.it);
  }
  nav.setAttribute('aria-label',en?'Main navigation':'Navigazione principale');
  const section=sections.find(item=>item.id===root.dataset.injHomeTab)||sections[0];
  document.getElementById('injTabHeadingTitle').textContent=en?section.titleEn:section.titleIt;
  document.getElementById('injTabHeadingSubtitle').textContent=en?section.subEn:section.subIt;
 }
 let tabScrollRevision=0;
 function resetTabScroll(){
  const s=document.scrollingElement||document.documentElement;
  for(const el of [s,document.documentElement,document.body,gate]){
   if(el && el.scrollTop>0)el.scrollTop=0;
  }
  if(window.scrollY>0)window.scrollTo(0,0);
 }
 function scrollHomeTop(){
  const current=++tabScrollRevision;
  resetTabScroll();
  requestAnimationFrame(()=>{
   if(current!==tabScrollRevision)return;
   resetTabScroll();
   requestAnimationFrame(()=>{
    if(current===tabScrollRevision)resetTabScroll();
   });
  });
 }

 /* Native Home scroll: no scrollTop clamp, no wheel/touch preventDefault.
    The document's real height and small padding below Treasury determine its
    natural endpoint. The scroll observer changes only the dock's CSS state. */
 let revealFrame=0;
 const primaryScroller=()=>document.scrollingElement||document.documentElement;
 const isHomeForeground=()=>root.dataset.injHomeTab==='home' &&
  gate.classList.contains('visible') &&
  gate.getAttribute('aria-hidden')==='false' &&
  document.body.classList.contains('entry-gate-open') &&
  !document.body.classList.contains('boot-loading') &&
  !document.body.classList.contains('menu-overlay-open') &&
  !document.body.classList.contains('drawer-open') &&
  !document.body.classList.contains('inj-section-open') &&
  !document.body.classList.contains('entry-live-launch') &&
  !document.body.classList.contains('chart-overlay-open') &&
  !document.body.classList.contains('focus-display-open') &&
  !document.body.classList.contains('pulse-view-open') &&
  !document.body.classList.contains('live-charts-open') &&
  !document.querySelector('#injMarketEventsOverlay:not([hidden]),#injMarketPortal:not([hidden]),#injFreedomOverlay:not([hidden]),#converterView.open,#performanceTimelineView.open,dialog[open],.inj-content-frame');
 // The Home dock must remain present from the first visible Home screen,
 // independent of vertical scrolling; fullscreen overlays still hide it.
 function updateDockReveal(){
  const show=root.dataset.injViewMode!=='light' && root.dataset.injModeTransition!=='leaving' && (root.dataset.injHomeTab==='home'?isHomeForeground():true);
  const value=String(show);
  if(root.dataset.injHomeNavVisible!==value)root.dataset.injHomeNavVisible=value;
 }
 function scheduleDockRefresh(){
  if(revealFrame)return;
  revealFrame=requestAnimationFrame(()=>{
   revealFrame=0;
   updateDockReveal();
  });
 }
 window.addEventListener('scroll',scheduleDockRefresh,{passive:true});
 gate.addEventListener('scroll',scheduleDockRefresh,{passive:true});
 window.addEventListener('resize',scheduleDockRefresh,{passive:true});
 window.visualViewport?.addEventListener('resize',scheduleDockRefresh,{passive:true});
 window.addEventListener('pageshow',scheduleDockRefresh,{passive:true});
 const modeDockObserver=new MutationObserver(scheduleDockRefresh);
 modeDockObserver.observe(root,{attributes:true,attributeFilter:['data-inj-view-mode','data-inj-mode-transition']});

 function applyVisibility(section){
  const shown=new Set(section.ids);
  for(const element of actions.querySelectorAll(':scope > .entry-action')){
   if(!originalDisplay.has(element))originalDisplay.set(element,{
    value:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')
   });
   if(shown.has(element.id)){
    const old=originalDisplay.get(element);
    if(old.value)element.style.setProperty('display',old.value,old.priority);
    else element.style.removeProperty('display');
   }else element.style.setProperty('display','none','important');
  }
 }
 function activate(id,scroll){
  const section=sections.find(item=>item.id===id)||sections[0];
  root.dataset.injHomeTab=section.id;
  if(section.id==='home')root.dataset.injHomeNavVisible='true';
  else root.dataset.injHomeNavVisible='true';
  // The original launcher elements remain direct children in their original order.
  applyVisibility(section);
  heading.hidden=section.id==='home'||section.id==='etf';
  etfPanel.hidden=section.id!=='etf';
  etfPanel.setAttribute('aria-hidden',section.id==='etf'?'false':'true');
  etfFrame.tabIndex=section.id==='etf'?0:-1;
  if(section.id==='etf')loadEtfTab();
  for(const [key,button] of buttons){
   const selected=key===section.id;
   button.classList.toggle('is-active',selected);
   if(selected)button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  }
  refreshLanguage();
  if(scroll)scrollHomeTop();
  scheduleDockRefresh();
 }
 // Only re-check direct launchers if other startup scripts append one.
 // Child text mutations from streaming prices do not trigger this observer.
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;
  pending=true;
  requestAnimationFrame(()=>{
   pending=false;
   const selected=sections.find(x=>x.id===root.dataset.injHomeTab)||sections[0];
   applyVisibility(selected);
  });
 });
 observer.observe(actions,{childList:true});
 function consumeToolsReturn(){
  try{
   if(sessionStorage.getItem('inj_node_return_tools')!=='1')return false;
   sessionStorage.removeItem('inj_node_return_tools');return true;
  }catch(_){return false;}
 }
 const returnToTools=new URLSearchParams(location.search).get('tab')==='tools'||consumeToolsReturn();
 activate(returnToTools?'altro':'home',false);
 requestAnimationFrame(()=>scheduleDockRefresh());
 window.addEventListener('injnode:languagechange',refreshLanguage);
 window.addEventListener('storage',event=>{if(event.key==='inj_node_language_v1')refreshLanguage();});
 window.addEventListener('pageshow',()=>{refreshLanguage();if(consumeToolsReturn())activate('altro',false);});
 window.INJ_BOTTOM_NAV={select:id=>activate(id,true),active:()=>root.dataset.injHomeTab};
})();
