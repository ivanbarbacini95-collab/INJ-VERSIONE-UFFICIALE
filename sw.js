const CACHE_NAME = 'inj-node-v16.10.27-wallet-add-no-restart1';
const APP_SHELL = [
  './home-terminal-header-20261027.css?v=h2',
  './home-terminal-header-20261027.js?v=h2',
  './workspace-sections.js?v=20261027-live2',
  './navigation.js?v=20261027-sync1',
  './cloud-sync-agent.js?v=20261027sync1',
  './cloud-sync-config.js?v=20261027sync1',
  './cloud-sync.html?v=20261027sync2',
  './cloud-sync.css?v=20261027sync1',
  './cloud-sync.js?v=20261027origin2',
  './admin-insights.html?v=20261027mapfix1',
  './leaflet-1.9.4.css?v=20261027mapfix1',
  './admin-insights.css?v=20261027mapfix1',
  './admin-insights-auth.js?v=20261027cf1',
  './admin-insights-dashboard.js?v=20261027mapfix1',
  './market-portal.js?v=20261027-g1',
  './first-access-unified.css?v=20261027-official-fix1',
  './wallet-manager-reliable.css?v=20261027a',
  './i18n.js?v=20261026b',
  './app.js?v=20261027-wallet-fix1',
  './performance-timeline-fit.css?v=20261026-fit1',
  './home-premium-iconography.js?v=20261027luxb1',
  './home-premium-iconography.css?v=20261027luxb1',
  './home-micro-terminal.css?v=20261027h1',
  './home-micro-terminal.js?v=20261026a',
  './privacy-shield.css?v=20261026',
  './injc-etf.html?v=20261026',
  './injc-home-tile.css?v=20261026b',
  './home-launcher-grid.css?v=20261026-fullwidth',
  './workspace-fullscreen-lock.css?v=16102413',
  './workspace.js?v=16102413',
  './workspace-pro.js?v=16102413',
  './workspace-model.js?v=16102412',
  './workspace-favorites-controls.css?v=16102411',
  './workspace-sections.js?v=16102411',
  './card-titles-uppercase.css?v=20261024',
  './market.js?v=16102450',
  './market-portal.js?v=16102450',
  './supply-mono.css?v=20261024',
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
  './workspace-pro.css?v=1610249',
  './navigation.js?v=160743',
  './reward-ladder-home.css?v=160739',
  './reward-ladder.html',
  './reward-ladder.css?v=160739',
  './reward-ladder.js?v=160739',
  './morning-brief.css?v=160736',
  './morning-brief.js?v=160737',
  './dashboard-ipad-layout.css?v=160722',
  './home-wide-menu-fix.css?v=160734',
  './market-favorites.css?v=160735',
  './market-heatmap-arctic.css?v=160725',
  './market-heatmap-live.css?v=160726',
  './market-heatmap-aggressive.css?v=160741',
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
  './viewport.js?v=16.06.00',
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
  './market-intelligence.css?v=160421',
  './market-intelligence-summary.js?v=160708',
  './market-intelligence-summary.css?v=160625',
  './inj-ownership.js?v=160625',
  './comparison.html',
  './comparison.css?v=160095',
  './comparison-ab.css?v=160095',
  './comparison.js?v=160095',
  './market-portal.js?v=160719',
  './market-lang.js?v=160082',
  './market.css?v=160082',
  './market.js?v=160733',
  './market-pro.css?v=160108',
  './market-pro.js?v=160720',
  './market-views.css?v=160716',
  './market-views.js?v=160742',
  './market-intelligence-summary.js?v=160724',
  './market-views.js?v=160716',
  './manifest.webmanifest?v=16.06.29',
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
  './app.js?v=16.06.33',
  './i18n.js?v=160145',
  './scroll-guard.js?v=160525',
  './live-charts.html',
  './live-charts.css?v=16.00.39',
  './live-charts.js?v=20261026tf1',
  './live-charts-timeframe-rail.css?v=20261026tf1',
  './live-rewards.html',
  './live-rewards.css?v=16.05.02',
  './reward-velocity.css?v=160122',
  './live-rewards.js?v=160502',
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
  './treasury.css?v=16.00.39',
  './treasury.js?v=16.10.25.01'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
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

  // Analytics config must never be locked behind the PWA's cache-first policy:
  // publishing the Insights URL must take effect without reinstalling the app.
  if (url.pathname.endsWith('/inj-node-insights-config.js') || url.pathname.endsWith('/inj-node-telemetry.js') || url.pathname.endsWith('/cloud-sync-config.js')) {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    const isolatedPath = ['cloud-sync.html', 'admin-insights.html', 'workspace.html', 'live-charts.html', 'live-rewards.html', 'command-center.html', 'order-book.html', 'treasury.html', 'market.html', 'comparison.html', 'visualize-wealth.html', 'reward-ladder.html', 'injc-etf.html', 'install-icon-minimal.html', 'install-icon-classic.html', 'install-icon-aurora.html', 'install-icon-pulse.html'].find((name) => url.pathname.endsWith('/' + name));
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
