const CACHE_NAME = 'inj-node-v20261103-six-curated-themes-motion-official1';
const APP_SHELL = [
  './inj-six-themes-20261103.css?v=official-6themes1',
  './inj-six-themes-20261103.js?v=official-6themes1',
  './inj-view-mode-20261102.css?v=20261102-litepro-ohlc-official1',
  './inj-view-mode-20261102.js?v=20261102-litepro-ohlc-official1',
  './inj-light-home-20261102.css?v=20261102-litepro-ohlc-official1',
  './inj-light-home-20261102.js?v=20261102-lite-week-candles1',
  './inj-home-candles-20261102.css?v=20261102-lite-week-candles1',
  './inj-home-candles-20261102.js?v=20261102-lite-week-candles1',
  './inj-ios-statusbar-palette-20261102.css?v=20261102-litepro-ohlc-official1',
  './market-refinement-20261029.css?v=crypto-fullbleed1',
  './live-view-clock-below-title-20261101.css?v=1',
  './home-theme-continuity-20261101.css?v=20261102-toptone1',
  './nav-premium-loop-20261101.css?v=11',
  './nav-premium-loop-20261101.js?v=12',
  './my-reward-immersive-20261101.css?v=4',
  './my-reward-immersive-20261101.js?v=2',

  './my-reward-20261101.css?v=1',
  './my-reward-20261101.js?v=4',
  './inj-ux-refinement-20261101.css?v=1',
  './inj-ux-refinement-20261101.js?v=5',
  './inj-local-access-lock-20261101.css?v=1',
  './inj-local-access-lock-20261101.js?v=1',
  './cloud-sync-qr-20261101.css?v=1',
  './cloud-sync-qr-20261101.js?v=1',
  './vendor/qrcode.min.js?v=1',
  './market-embedded-compact-20261031.css?v=marketcompact3',
  './world-market-ticker-center-20261101.css?v=20261101bold2',
  './assets/fonts/inj-geist.woff2',
  './assets/fonts/inj-rubik.woff2',
  './inj-rubik-global-20261102.css?v=rubikbold1',
  './market-crypto-scope-20261030.css?v=scope3',
  './market-favorites-latched-20261030.css?v=latch4',
  './market-crypto-one-day-20261030.css?v=dropdown6',
  './market-crypto-one-day-20261030.js?v=instant7',
  './market.js?v=20261030precision5',
  './market-views.js?v=20261101tileflash1',
  './market-heatmap-signals-20261101.css?v=vivid2',
  './home-market-launcher-uniform-20261030.css?v=marketpolish2',
  './navigation.js?v=20261030marketlabel1',
  './market-entry-direct-20261030.css?v=direct6',
  './market-entry-direct-20261030.js?v=frames2',
  './market-portal.js?v=20261102-routefix1',
  './home-ticker-tight-20261030.css?v=ticker1',
  './android-native-scroll-20261101.css?v=android-scroll1',
  './android-section-scroll-20261101.css?v=android-section-scroll1',
  './home-bottom-tabs-20261030.css?v=20261101-home-fixed5',
  './home-card-reorder-20261030.css?v=order1',
  './home-card-reorder-20261030.js?v=order4',
  './home-bottom-tabs-20261030.js?v=20261102-litepro-nav1',
  './market-tab-navigation-20261031.css?v=marketrail11',
  './market-tab-navigation-20261031.js?v=marketrail14',
  './app.js?v=20261102-home-lcd-resilience2',
  './inj-font-switcher-20261029.css?v=geistbold8',
  './inj-font-platform-unified-20261103.css?v=sf-dual-20261103a',
  './inj-font-switcher-20261029.js?v=sf-dual-20261103a',
  './assets/fonts/inj-space-grotesk.woff2',
  './assets/fonts/inj-oxanium.woff2',
  './assets/fonts/inj-ibm-plex-mono-regular.woff2',
  './assets/fonts/inj-ibm-plex-mono-medium.woff2',
  './inj-font-switcher-20261029.js?v=sf-dual-20261103a',
  './inj-fluid-screen-fit.css?v=20261028fullmonitor1',
  './inj-monitor-readability.css?v=20261028readable3',
  './home-desktop-native-scroll.css?v=20261028home-scroll1',
  './home-more-section.css?v=20261028more3',
  './home-tile-descriptions.css?v=20261028freedom2',
  './financial-freedom.html?v=20261028freedom8',
  './financial-freedom.js?v=20261028freedom8',
  './financial-freedom.css?v=20261028freedom8',
  './financial-freedom-overlay.js?v=20261028freedom8',
  './financial-freedom-home.css?v=20261028freedom8',
  './ambient-wallet-reward-glow.css?v=20261028ambient1',
  './market-events-layout-pro.css?v=20261028risk1',
  './home-focused-cards.css?v=20261028micro2',
  './home-settings-scroll-lock.css?v=20261028menu-lock1',
  './app.js?v=20261028freedom8',
  './market-events-footer-seamless.css?v=20261028foot1',
  './home-launcher-typography-final.css?v=20261028labels1',
  './home-final-four-titles.css?v=20261028four1',
  './home-terminal-header-20261027.css?v=h2',
  './home-premium-titles.css?v=20261028freedom2',
  './home-treasury-brand-layout.css?v=20261028bcg1',
  './home-overview-price-first.css?v=20261028compact2',
  './home-compact-value-bars.css?v=20261028compactbars2',
  './home-market-events.css?v=20261028prefs1',
  './home-market-events.js?v=20261028prefs1',
  './inj-top-seamless.css?v=20261028fullbleed4',
  './inj-top-seamless.js?v=20261102-toptone1',
  './home-statusbar-continuity.css?v=20261028seam1',
  './menu-control-pro.css?v=20261028pro1',
  './menu-control-pro.js?v=20261028pro1',
  './inj-node-telemetry.js?v=20261028officialpro2',
  './i18n.js?v=20261028allsections1',
  './home-terminal-header-20261027.js?v=h2',
  './workspace-sections.js?v=20261027-live2',
  './navigation.js?v=20261028allsections1',
  './cloud-sync-agent.js?v=20261027sync1',
  './cloud-sync-config.js?v=20261027sync1',
  './cloud-sync.html?v=20261027sync2',
  './cloud-sync.css?v=20261027sync1',
  './cloud-sync.js?v=20261027origin2',
  './admin-insights.html?v=20261028officialpro1',
  './leaflet-1.9.4.css?v=20261027mapfix1',
  './admin-insights.css?v=20261027mapfix1',
  './admin-insights-auth.js?v=20261027cf1',
  './admin-insights-pro.css?v=20261027pro3',
  './admin-insights-pro.js?v=20261027pro3',
  './admin-insights-dashboard.js?v=20261028officialpro1',
  './market-portal.js?v=20261027-g1',
  './first-access-unified.css?v=20261027-official-fix1',
  './wallet-manager-reliable.css?v=20261027a',
  './i18n.js?v=20261028allsections1',
  './app.js?v=20261028freedom8',
  './performance-timeline-fit.css?v=20261028pnlaxis1',
  './home-premium-iconography.js?v=20261030favorites1',
  './home-premium-iconography.css?v=20261028freedom2',
  './home-micro-terminal.css?v=20261027h1',
  './home-micro-terminal.js?v=20261026a',
  './privacy-shield.css?v=20261026',
  './injc-etf.html?v=20261101-etf-isolation1',
  './injc-home-tile.css?v=20261026b',
  './home-launcher-grid.css?v=20261028freedom2',
  './workspace-fullscreen-lock.css?v=16102413',
  './workspace.js?v=16102413',
  './workspace-pro.js?v=20261028screenfit1',
  './workspace-model.js?v=16102412',
  './workspace-favorites-controls.css?v=16102411',
  './workspace-sections.js?v=16102411',
  './card-titles-uppercase.css?v=20261024',
  './market.js?v=16102450',
  './market-portal.js?v=16102450',
  './supply-mono.css?v=20261024',
  './home-font-unified.css?v=20261029homefont1',
  './workspace.html',
  './workspace-layout.css?v=160749',
  './workspace-premium.css?v=160747','./workspace-widgets.css?v=1610245',
  './workspace-orderbook-adaptive.css?v=1610247',
  './workspace-live.js?v=160746',
  './workspace-charts.js?v=160746',
  './workspace-catalog.js?v=1610247',
  './workspace-sections.js?v=1610248',
  './workspace-values.js?v=160744',
  './workspace-home.css?v=20261027-left2',
  './workspace.css?v=160746',
  './workspace-model.js?v=1610247',
  './workspace.js?v=1610249',
  './workspace-pro.js?v=160801',
  './workspace-pro.css?v=20261028screenfit1',
  './navigation.js?v=160743',
  './reward-ladder-home.css?v=160739',
  './reward-ladder.html',
  './reward-ladder.css?v=160739',
  './reward-ladder.js?v=160739',
  './morning-brief.css?v=160736',
  './morning-brief.js?v=160737',
  './dashboard-ipad-layout.css?v=160722',
  './home-wide-menu-fix.css?v=20261102-settings-fullscreen1',
  './market-favorites.css?v=160735',
  './market-heatmap-arctic.css?v=160725',
  './market-heatmap-live.css?v=160726',
  './market-heatmap-aggressive.css?v=20261028gradient1',
  './market-heatmap-density.css?v=20261028density1',
  './chart-haptics.js?v=160720',
  './chart-haptics.css?v=160720',
  './home-scroll-memory.js?v=160719',
  './home-entry-feedback.js?v=160720',
  './home-entry-feedback.css?v=160719',
  './inj-uhd.css?v=160710',
  './navigation.css?v=160090',
  './navigation.css?v=160080',
  './navigation.js?v=160719',
  // Standalone sections still request these legacy cache keys.
  './navigation.css?v=160074',
  './',
  './index.html',
  './adaptive-layout.css?v=160600',
  './validator-transparent.css?v=160627',
  './adaptive-layout.js?v=160600',
  './navigation.js?v=160114',
  './i18n.js?v=160124',
  './i18n.js?v=160114',
  './viewport.js?v=20261102litepro-native1',
  './treasury.css?v=16.00.37',
  './scroll-edges.css?v=160129',
  './scroll-edges.js?v=160143',
  './wallet-edge-scroll-stability.css?v=160143',
  './dashboard-native-scroll.css?v=160525',
  './menu-accordion.css?v=160626',
  './home-mobile-launcher-fix.css?v=160204',
  './section-heading-harmony.css?v=160131',
  './unified-navigation.css?v=160138',
  './menu-header-clear.css?v=160139',
  './intro-node-ambient.css?v=160421',
  './intro-node-ambient.js?v=160421',
  './live-charts-open-history.css?v=160140',
  './b-capital-group-brand.png',
  './section-heading-harmony.js?v=160131',
  './home-vitality.css?v=1.0.1',
  './home-vitality.js?v=160739',
  './home-vitality-v2.css?v=160096',
  './home-layout-polish.css?v=20261026center',
  './home-pnl-focus.css?v=20261026f',
  './node-pulse.css?v=160103',
  './jn-branding.css?v=160106',
  './ocean-aurora.css?v=160109',
  './ocean-aurora.js?v=160109',
  './chromatic-mist.css?v=160110',
  './chromatic-mist.js?v=160110',
  './theme-harmony.css?v=160114',
  './ocean-x-series.css?v=160114',
  './ocean-x-series.js?v=160114',
  './theme-catalog.css?v=160114',
  './home-desktop-tiles.css?v=160115',
  './wallet-dock-transparent.css?v=160116',
  './wallet-selection-glow.css?v=160701',
  './wallet-rail-seamless.css?v=160701',
  './visualize-wealth.html',
  './visualize-wealth.css?v=160502',
  './visualize-wealth.js?v=160318',
  './visualize-wealth-extras.css?v=160319',
  './visualize-wealth-extras.js?v=160319',
  './visualize-wealth-growth.css?v=160321',
  './visualize-wealth-growth.js?v=160321',
  './visualize-wealth-home.css?v=160127',
  './aqua-mirage.css?v=160113',
  './aqua-mirage.js?v=160113',
  './velvet-nebula.css?v=160112',
  './velvet-nebula.js?v=160112',
  './ios-screen-fixes.css?v=160095',
  './ios-converter-keyboard.js?v=160095',
  './treasury-ownership.css?v=16102501',
  './treasury-ownership-theme.css?v=160702',
  './market.html',
  './world-markets-heatmap.js?v=20261031quotefix2',
  './market-data/global-markets.json',
  './world-markets-heatmap.css?v=20261031quotefix2',
  './market-intelligence-summary.js?v=20261029world1',
  './market-intelligence.css?v=160421',
  './market-intelligence-summary.js?v=160708',
  './market-intelligence-summary.css?v=160625',
  './inj-ownership.js?v=160625',
  './comparison.html',
  './comparison.css?v=160095',
  './comparison-ab.css?v=20261028logos1',
  './comparison.js?v=20261028logos1',
  './market-portal.js?v=160719',
  './market-lang.js?v=160082',
  './market.css?v=160082',
  './market.js?v=160733',
  './market-pro.css?v=160108',
  './market-pro.js?v=20261030instant7',
  './market-views.css?v=160716',
  './market-views.js?v=20261101tileflash1',
  './market-heatmap-density.js?v=20261030instant7',
  './market-intelligence-summary.js?v=160724',
  './market-views.js?v=160716',
  './manifest.webmanifest?v=20261102litepro1',
  './app-icon-picker.css?v=160704',
  './app-icon-picker.js?v=160704',
  './install-icon-minimal.html',
  './manifest-icon-minimal.webmanifest?v=160704',
  './install-icon-classic.html',
  './manifest-icon-classic.webmanifest?v=160704',
  './install-icon-aurora.html',
  './manifest-icon-aurora.webmanifest?v=160704',
  './install-icon-pulse.html',
  './manifest-icon-pulse.webmanifest?v=160704',
  './icons/inj-node-180-v16.06.28.png',
  './icons/inj-node-192-v16.06.28.png',
  './icons/inj-node-512-v16.06.28.png',
  './icons/inj-node-icon-v16.06.28.svg',
  './icons/inj-node-aurora-180-v16.07.03.png',
  './icons/inj-node-aurora-192-v16.07.03.png',
  './icons/inj-node-aurora-512-v16.07.03.png',
  './icons/inj-node-pulse-180-v16.07.03.png',
  './icons/inj-node-pulse-192-v16.07.03.png',
  './icons/inj-node-pulse-512-v16.07.03.png',
  './icons/inj-node-minimal-180-v16.06.29.png',
  './icons/inj-node-minimal-192-v16.06.29.png',
  './icons/inj-node-minimal-512-v16.06.29.png',
  './icons/inj-node-minimal-v16.06.29.svg',
  './viewport.css?v=16.00.74',
  './top-clarity.css?v=16.00.88',
  './style.css?v=16.01.44',
  './app.js?v=20261028freedom8',
  './i18n.js?v=160145',
  './scroll-guard.js?v=160525',
  './live-charts.html',
  './live-charts.css?v=16.00.39',
  './live-charts.js?v=20261031priceinrail3',
  './live-charts-timeframe-rail.css?v=20261026tf1',
  './live-rewards.html',
  './live-rewards.css?v=16.05.02',
  './reward-velocity.css?v=160122',
  './live-rewards.js?v=20261102-chainfix1',
  './order-book.html',
  './order-book.css?v=20261027-live2',
  './order-book.js?v=20261027-live2',
  './command-center.html',
  './command-center-flash.css?v=160307',
  './command-center-flash.js?v=160502',
  './command-center.css?v=16.00.39',
  './command-center.js?v=20261026tf1',
  './treasury.html',
  './treasury-production-center.css?v=160525',
  './treasury.css?v=20261102-resume-growth2',
  './treasury.js?v=20261102-chainfix1'
];

self.addEventListener('install', (event) => {
  // An unavailable optional resource must not block activation of the entire PWA.
  event.waitUntil((async () => {
    const cache=await caches.open(CACHE_NAME);
    // Installing an Android PWA must not start hundreds of simultaneous
    // legacy CSS/JS downloads before the worker can activate. Cache the
    // actual boot path first; runtime requests populate the rest on demand.
    const essential=new Set([
      './inj-view-mode-20261102.css?v=20261102-litepro-ohlc-official1',
      './inj-view-mode-20261102.js?v=20261102-litepro-ohlc-official1',
      './inj-light-home-20261102.css?v=20261102-litepro-ohlc-official1',
      './inj-light-home-20261102.js?v=20261102-lite-week-candles1',
      './inj-rubik-global-20261102.css?v=rubikbold1',
      './assets/fonts/inj-rubik.woff2',
      './inj-home-candles-20261102.css?v=20261102-lite-week-candles1',
      './inj-home-candles-20261102.js?v=20261102-lite-week-candles1',
      './inj-ios-statusbar-palette-20261102.css?v=20261102-litepro-ohlc-official1',
  './market-refinement-20261029.css?v=crypto-fullbleed1',
  './live-view-clock-below-title-20261101.css?v=1',
  './home-theme-continuity-20261101.css?v=20261102-toptone1',
  './nav-premium-loop-20261101.css?v=11',
  './nav-premium-loop-20261101.js?v=12',
  './my-reward-immersive-20261101.css?v=4',
  './my-reward-immersive-20261101.js?v=2',

      './my-reward-20261101.css?v=1',
      './my-reward-20261101.js?v=4',
  './inj-ux-refinement-20261101.css?v=1',
  './inj-ux-refinement-20261101.js?v=5',
  './inj-local-access-lock-20261101.css?v=1',
  './inj-local-access-lock-20261101.js?v=1',
  './cloud-sync-qr-20261101.css?v=1',
  './cloud-sync-qr-20261101.js?v=1',
  './vendor/qrcode.min.js?v=1',
      './','./index.html','./manifest.webmanifest?v=20261102litepro1',
      './app.js?v=20261102-home-lcd-resilience2',
      './style.css?v=16.01.44','./viewport.css?v=16.00.74',
      './viewport.js?v=20261102litepro-native1',
      './navigation.css?v=160090',
      './navigation.js?v=20261030marketlabel1',
      './android-native-scroll-20261101.css?v=android-scroll1',
  './android-section-scroll-20261101.css?v=android-section-scroll1',
  './home-bottom-tabs-20261030.css?v=20261101-home-fixed5',
      './home-bottom-tabs-20261030.js?v=20261102-litepro-nav1',
      './market-tab-navigation-20261031.js?v=marketrail14',
      './market-tab-navigation-20261031.css?v=marketrail11',
      './install-icon-minimal.html','./install-icon-classic.html',
      './install-icon-aurora.html','./install-icon-pulse.html'
    ]);
    const bootAssets=Array.from(essential);
    let next=0;
    async function worker(){
      while(next<bootAssets.length){
        const asset=bootAssets[next++];
        try{await cache.add(asset)}catch{
          // Other pages/assets stay available; network-first handles later recovery.
        }
      }
    }
    await Promise.all(Array.from({length:3},()=>worker()));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key.startsWith('inj-node-')).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache any server-authenticated response or admin credential action.
  if (url.pathname.startsWith('/api/')) {event.respondWith(fetch(request));return;}
  // Always prefer the current Market Events assets after a Git deploy. Keep an
  // offline copy, but never trap users on a stale pre-update CSS/JS pair.
  if (url.pathname.endsWith('/live-rewards.js') || url.pathname.endsWith('/treasury.js') || url.pathname.endsWith('/inj-view-mode-20261102.css') || url.pathname.endsWith('/inj-view-mode-20261102.js') || url.pathname.endsWith('/inj-light-home-20261102.css') || url.pathname.endsWith('/inj-light-home-20261102.js') || url.pathname.endsWith('/inj-home-candles-20261102.css') || url.pathname.endsWith('/inj-home-candles-20261102.js') || url.pathname.endsWith('/inj-ios-statusbar-palette-20261102.css') || url.pathname.endsWith('/home-wide-menu-fix.css') || url.pathname.endsWith('/treasury.js') || url.pathname.endsWith('/treasury.css') || url.pathname.endsWith('/market-refinement-20261029.css') || url.pathname.endsWith('/live-view-clock-below-title-20261101.css') || url.pathname.endsWith('/home-theme-continuity-20261101.css') || url.pathname.endsWith('/nav-premium-loop-20261101.js') || url.pathname.endsWith('/nav-premium-loop-20261101.css') || url.pathname.endsWith('/my-reward-immersive-20261101.js') || url.pathname.endsWith('/my-reward-immersive-20261101.css') || url.pathname.endsWith('/my-reward-20261101.js') || url.pathname.endsWith('/my-reward-20261101.css') || url.pathname.endsWith('/inj-ux-refinement-20261101.js') || url.pathname.endsWith('/inj-ux-refinement-20261101.css') || url.pathname.endsWith('/inj-local-access-lock-20261101.js') || url.pathname.endsWith('/inj-local-access-lock-20261101.css') || url.pathname.endsWith('/cloud-sync-qr-20261101.js') || url.pathname.endsWith('/cloud-sync-qr-20261101.css') || url.pathname.endsWith('/vendor/qrcode.min.js') || url.pathname.endsWith('/world-markets-heatmap.js') || url.pathname.endsWith('/world-markets-heatmap.css') || url.pathname.endsWith('/market-views.js') || url.pathname.endsWith('/market-heatmap-signals-20261101.css') || url.pathname.endsWith('/android-section-scroll-20261101.css') || url.pathname.endsWith('/android-native-scroll-20261101.css') || url.pathname.endsWith('/app.js') || url.pathname.endsWith('/market-portal.js') || url.pathname.endsWith('/home-bottom-tabs-20261030.js') || url.pathname.endsWith('/home-bottom-tabs-20261030.css') || url.pathname.endsWith('/market-tab-navigation-20261031.js') || url.pathname.endsWith('/market-tab-navigation-20261031.css') || url.pathname.endsWith('/market-embedded-compact-20261031.css') || url.pathname.endsWith('/live-charts.js') || url.pathname.endsWith('/live-charts.css') || url.pathname.endsWith('/live-charts-timeframe-rail.css') || url.pathname.endsWith('/world-market-ticker-center-20261101.css') || url.pathname.endsWith('/inj-font-platform-unified-20261103.css') || url.pathname.endsWith('/inj-font-switcher-20261029.css') || url.pathname.endsWith('/inj-font-switcher-20261029.js') || url.pathname.endsWith('/i18n.js') || url.pathname.endsWith('/navigation.js') || url.pathname.endsWith('/inj-fluid-screen-fit.css') || url.pathname.endsWith('/inj-monitor-readability.css') || url.pathname.endsWith('/home-desktop-native-scroll.css') || url.pathname.endsWith('/home-more-section.css') || url.pathname.endsWith('/workspace-pro.js') || url.pathname.endsWith('/workspace-pro.css') || url.pathname.endsWith('/home-market-events.css') || url.pathname.endsWith('/home-market-events.js') || url.pathname.endsWith('/inj-top-seamless.css') || url.pathname.endsWith('/financial-freedom.html') || url.pathname.endsWith('/financial-freedom.css') || url.pathname.endsWith('/financial-freedom.js') || url.pathname.endsWith('/financial-freedom-home.css') || url.pathname.endsWith('/financial-freedom-overlay.js') || url.pathname.endsWith('/market-events-layout-pro.css') || url.pathname.endsWith('/home-focused-cards.css') || url.pathname.endsWith('/ambient-wallet-reward-glow.css') || url.pathname.endsWith('/world-markets-heatmap.js') || url.pathname.endsWith('/world-markets-heatmap.css') || url.pathname.endsWith('/market-data/global-markets.json')) {
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(response=>{
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)));
        }
        return response;
      }).catch(()=>caches.match(request))
    );
    return;
  }

  // Analytics config must never be locked behind the PWA's cache-first policy:
  // publishing the Insights URL must take effect without reinstalling the app.
  if (url.pathname.endsWith('/inj-node-insights-config.js') || url.pathname.endsWith('/inj-node-telemetry.js') || url.pathname.endsWith('/cloud-sync-config.js') || url.pathname.endsWith('/inj-top-seamless.js') || url.pathname.endsWith('/viewport.js')) {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    const isolatedPath = ['cloud-sync.html', 'admin-insights.html', 'workspace.html', 'live-charts.html', 'live-rewards.html', 'command-center.html', 'order-book.html', 'treasury.html', 'market.html', 'comparison.html', 'visualize-wealth.html', 'reward-ladder.html', 'injc-etf.html', 'financial-freedom.html', 'install-icon-minimal.html', 'install-icon-classic.html', 'install-icon-aurora.html', 'install-icon-pulse.html'].find((name) => url.pathname.endsWith('/' + name));
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(isolatedPath ? request : './index.html', copy));
          }
          return response;
        })
        .catch(() => isolatedPath ? caches.match(request).then((hit) => hit || caches.match('./' + isolatedPath)) : caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

/* Foreground-generated event alerts: tapping one reopens the actual/forecast
   detail on Home. This does not enable background push subscriptions. */
self.addEventListener('notificationclick', (event) => {
  const note=event.notification;
  const detail=note?.data;
  if(detail?.source!=='inj-market-events')return;
  note.close();
  const id=String(detail.eventId||'').slice(0,170);
  event.waitUntil((async()=>{
    const opened=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const home=opened.find(c=>{
      try{const path=new URL(c.url).pathname;return path==='/'||path.endsWith('/index.html')||/\/install-icon-[^/]+\.html$/.test(path)}
      catch{return false}
    });
    if(home){
      await home.focus();
      home.postMessage({type:'inj-market-events-open',eventId:id});
    }else if(self.clients.openWindow){
      await self.clients.openWindow('/#inj-market-event='+encodeURIComponent(id));
    }
  })());
});
