/* INJ Node PWA | Cross-platform lean cache (2026-11-06)
   One cache entry per asset path: query-string build aliases no longer
   occupy multiple CacheStorage slots. Auth/API requests are never cached. */
const CACHE_NAME = 'inj-node-v20261106-cross-platform-lean1';
const BOOT_ASSETS = [
  './index.html',
  './manifest.webmanifest?v=20261102litepro1',
  './style.css?v=16.01.44',
  './inj-home-overrides-20261106.css?v=perf1',
  './app.js?v=wallet-single-card-20261105c'
];
const BOOT_FALLBACK = new URL('./index.html', self.registration.scope).href;

function cacheKey(url) {
  // Same deployed file with ?v=old and ?v=new must be cached only once.
  return new Request(url.origin + url.pathname);
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
  if (neverStore(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  const navigation = request.mode === 'navigate';
  const marketData = /\/market-data\/[^/]+\.json$/i.test(url.pathname);
  // Documents and quotes must be revalidated; regular static files use
  // HTTP caching and a single offline fallback, without duplicated variants.
  event.respondWith((async () => {
    try {
      const response = await fetch(request, (navigation || marketData) ? { cache: 'no-store' } : undefined);
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
