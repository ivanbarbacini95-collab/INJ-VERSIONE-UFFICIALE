/* INJ Node PWA | Cross-platform lean cache (2026-11-06)
   One cache entry per asset path: query-string build aliases no longer
   occupy multiple CacheStorage slots. Auth/API requests are never cached. */
const CACHE_NAME = 'inj-node-v20261112-treasury-phone-density2';
const BOOT_ASSETS = [
  './index.html',
  './inj-responsive-typography-20261112.css?v=20261112-adaptive1',
  './inj-rubik-unified-20261110.css?v=optical-responsive2',
  './page-zoom-lock-20261110.js?v=1',
  './manifest.webmanifest?v=20261102litepro1',
  './style.css?v=16.01.44',
  './inj-home-overrides-20261106.css?v=perf1',
  './home-dock-clearance-20261110.js?v=ios-dock-clearance1',
  './home-dock-clearance-20261110.css?v=ios-dock-clearance1',
  './my-reward-portrait-20261110.js?v=portrait-desktop1',
  './my-reward-portrait-20261110.css?v=portrait-desktop1',
  './staking-apr-source.js?v=20261109-shared2',
  './app.js?v=20261111-digits-only1',
  './navigation.js?v=20261109-tools-return-motion1',
  './home-bottom-tabs-20261030.js?v=20261110-liveview-one-layout3',
  './validators-launcher.js?v=20261111e',
  './validators.html?v=20261111e',
  './validators.css?v=20261111e',
  './validators.js?v=20261111e',
  './network-status.html?v=20261110-uptime-history1',
  './network-history.js?v=20261110-uptime-history1',
  './network-live-ws.js?v=20261109-uptime-ws1',
  './network-history.css?v=20261110-uptime-history1',
  './all-transactions.html?v=20261109-tools-return-motion1',
  './night-view.html?v=20261112-totem-pro1',
  './night-view.js?v=20261112-totem-pro1',
  './live-view-totem-pro-20261112.css?v=totem-pro1',
  './treasury.html?v=20261112-worth-tooltip-only1',
  './treasury-mobile-density-20261112.css?v=20261112-phone-density2',
  './treasury.js?v=20261112-worth-tooltip-only1',
  './injc-etf.html?v=20261112-all-history1'
];
const BOOT_FALLBACK = new URL('./index.html', self.registration.scope).href;

function cacheKey(url) {
  // Same deployed file with ?v=old and ?v=new must be cached only once.
  const scopePath = new URL(self.registration.scope).pathname;
  const path = url.pathname === scopePath ? scopePath + 'index.html' : url.pathname;
  return new Request(url.origin + path);
}
function neverStore(pathname) {
  return pathname.startsWith('/api/') ||
    /\/(?:inj-node-insights-config|inj-node-telemetry|cloud-sync-config)\.js$/i.test(pathname);
}
async function offlineMatch(url, allowHomeFallback) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(cacheKey(url));
  if (hit) return hit;
  return allowHomeFallback ? (await cache.match(BOOT_FALLBACK)) || Response.error() : Response.error();
}
function schedulePut(event, url, response) {
  if (!response.ok || response.type !== 'basic') return;
  const clone = response.clone();
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.put(cacheKey(url), clone))
    .catch(() => {})); // Storage quota must not break the live application.
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Only the real Home boot path, not every old theme, widget and page.
    // Concurrency is capped to avoid spiking bandwidth/memory on mobile.
    let cursor = 0;
    async function prefetch() {
      while (cursor < BOOT_ASSETS.length) {
        const path = BOOT_ASSETS[cursor++];
        try {
          const url = new URL(path, self.registration.scope);
          const response = await fetch(url.href, { cache: 'reload' });
          if (response.ok && response.type === 'basic')
            await cache.put(cacheKey(url), response);
        } catch (_) { /* Offline install can recover on next foreground visit. */ }
      }
    }
    await Promise.all([prefetch(), prefetch()]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('inj-node-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  const marketData = /\/market-data\/[^/]+\.json$/i.test(url.pathname);
  // An offline snapshot must never masquerade as an ONLINE/live quote.
  if (neverStore(url.pathname) || marketData) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  const navigation = request.mode === 'navigate';
  // Documents must be revalidated; regular static files use
  // HTTP caching and a single offline fallback, without duplicated variants.
  event.respondWith((async () => {
    try {
      const response = await fetch(request, navigation ? { cache: 'no-store' } : undefined);
      schedulePut(event, url, response);
      return response;
    } catch (_) {
      const isHome = navigation && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
      return offlineMatch(url, isHome);
    }
  })());
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
