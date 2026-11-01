/* INJ NODE Market: isolated live iframe over the retained Home, no index reload. */
(() => {
  'use strict';
  const launcher = document.getElementById('entryMarketButton');
  const marketLaunchers = [launcher,
    document.getElementById('entryGlobalMarketsButton'),
    document.getElementById('entryGlobalCryptoButton'),
    document.getElementById('entryMarketFavoritesButton')].filter(Boolean);
  const portal = document.getElementById('injMarketPortal');
  const frame = document.getElementById('injMarketFrame');
  if (!launcher || !portal || !frame) return;
  frame.addEventListener('load', () => {
    if (!open || !portal || !frame.contentWindow) return;
    try {
      if (!frame.contentWindow.location.pathname.endsWith('/market.html')) return;
    } catch (_) { return; }
    frame.contentWindow.postMessage({
      type:'injnode:market:language',
      language:window.INJ_I18N?.getLanguage?.() || localStorage.getItem('inj_node_language_v1') || 'it'
    },insideOrigin);
    requestAnimationFrame(() => {
      if (open) portal.classList.add('is-ready');
    });
  });
  let open = false;
  let entryScroll = 0;
  const originalTitle = document.title;
  const titleFor = () => { try { return localStorage.getItem('inj_node_language_v1') === 'en' ? 'Market' : 'Mercato'; } catch (_) { return 'Mercato'; } };
  const insideOrigin = (location.origin && location.origin !== 'null') ? location.origin : '*';
  function reveal(requestedView = 'intel') {
    if (open) return;
    window.INJ_HOME_SCROLL?.save();
    open = true;
    entryScroll = window.scrollY;
    portal.classList.remove('is-ready');
    portal.hidden = false;
    portal.setAttribute('aria-label', titleFor());
    frame.title = titleFor();
    // The primary app, wallet selection and Home are untouched underneath.
    const target=['intel','world','crypto','favorites'].includes(requestedView)?requestedView:'intel';
    frame.src = './market.html?v=20261030favorites1&entry=' + target +
      '&lang=' + (window.INJ_I18N?.getLanguage?.() || localStorage.getItem('inj_node_language_v1') || 'it');
    document.title = 'INJ NODE | ' + titleFor();
    // Keep the parent URL/history stationary: an edge swipe must not close Market.
  }
  function conceal(fromBrowserBack = false) {
    if (!open) return;
    open = false;
    portal.classList.remove('is-ready');
    portal.hidden = true;
    frame.src = 'about:blank'; // shuts down the old iframe streams/timers
    document.title = originalTitle;
    // Market only closes via its Home control or Escape, not browser swipe history.
    try { launcher.focus({ preventScroll: true }); } catch (_) {}
    // Unlock the document first; then restore the exact Home offset.
    window.INJ_SCROLL_GUARD?.refresh();
    window.INJ_HOME_SCROLL?.restore();
    requestAnimationFrame(() => {
      if (!open) window.INJ_HOME_SCROLL?.restore();
    });
  }
  for (const card of marketLaunchers) card.addEventListener('click', (event) => {
    // All three cards reuse the single market iframe and its live data source.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    reveal(card.dataset.injMarketView || 'intel');
  });
  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return;
    if (insideOrigin !== '*' && event.origin !== location.origin) return;
    if (event.data?.type === 'injnode:market:home') conceal();
  });
  window.addEventListener('popstate', () => {
    // Swiping Safari's history guard is never a request to leave Market.
    if (history.state?.injGestureShield) return;
    if (open && !history.state?.injMarketPortal) conceal(true);
  });
  window.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') conceal();
  });
  window.addEventListener('injnode:languagechange', () => {
    if (open && frame.contentWindow) {
      frame.contentWindow.postMessage({type:'injnode:market:language', language:window.INJ_I18N?.getLanguage?.() || 'it'}, insideOrigin);
      portal.setAttribute('aria-label', titleFor());
      document.title = 'INJ NODE | ' + titleFor();
    }
  });
})();
