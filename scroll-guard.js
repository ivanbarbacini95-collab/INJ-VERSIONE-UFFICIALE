/* INJ Node v16.00.74 — scroll ownership after section exits.
   Reconcile on navigation/DOM changes, never while a touch/wheel is in progress. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (root.dataset.injPage !== 'index') return;
  const $ = id => document.getElementById(id);
  let scheduled = false;
  // Safari PWA may suspend a page during Home -> Dashboard's 380ms exit.
  // The normal timer can be deferred indefinitely; recover an orphaned Home
  // layer without intercepting wheel/touch events or changing scroll position.
  let gateFadeBeganAt = 0;
  let recoveryTimer = 0;
  const GATE_FADE_RECOVERY_MS = 650;
  function scheduleRecovery(ms) {
    if (recoveryTimer) return;
    recoveryTimer = window.setTimeout(() => {
      recoveryTimer = 0;
      refresh();
    }, Math.max(20, ms));
  }
  const has = (node, cls) => !!node?.classList.contains(cls);
  const immersiveActive = id => {
    const el = $(id);
    return !!el && !el.hidden && !has(el, 'mode-parked') &&
      (has(el, 'mode-active') || has(el, 'is-closing'));
  };
  function reconcile() {
    scheduled = false;
    const body = document.body;
    if (!body) return;
    const gate = $('entryGate');
    const menu = $('headerMenu');
    const menuOpen = has(menu, 'open');
    const sectionFrame = !!document.querySelector('.inj-content-frame');
    const marketOpen = !!$('injMarketPortal') && !$('injMarketPortal').hidden;
    const modalOpen = !!document.querySelector('dialog[open]');
    const converterOpen = has($('converterView'), 'open');
    const performanceOpen = has($('performanceTimelineView'), 'open');
    const focusOpen = immersiveActive('focusDisplayDialog');
    const chartsOpen = immersiveActive('liveChartsDialog');
    const pulseOpen = immersiveActive('pulseViewDialog');
    const overlayOpen = sectionFrame || marketOpen || modalOpen ||
      converterOpen || performanceOpen || focusOpen || chartsOpen || pulseOpen;

    // Dashboard was requested, but an interrupted transition left the fixed
    // Home element rendered over it. Respect the normal fade for 650ms.
    // When that time has passed, release ONLY this obsolete Home underlay.
    const dashboardRequested = has(body, 'dashboard-scroll-ready');
    const abandonedGateFade = dashboardRequested && has(gate, 'visible') &&
      gate?.getAttribute('aria-hidden') === 'false' && !menuOpen && !overlayOpen;
    if (abandonedGateFade) {
      if (!gateFadeBeganAt) gateFadeBeganAt = Date.now();
      const remaining = GATE_FADE_RECOVERY_MS - (Date.now() - gateFadeBeganAt);
      if (remaining > 0) {
        scheduleRecovery(remaining + 25);
      } else if (!menuOpen && !overlayOpen) {
        gate.classList.remove('visible', 'leaving');
        gate.setAttribute('aria-hidden', 'true');
        body.classList.remove('entry-gate-open', 'entry-live-launch',
          'mode-returning', 'dashboard-home-return',
          'dashboard-home-fade', 'dashboard-home-instant-return');
      }
    } else {
      gateFadeBeganAt = 0;
      if (recoveryTimer) window.clearTimeout(recoveryTimer);
      recoveryTimer = 0;
    }

    // An interrupted iOS fade can leave a transparent visible Home element
    // even though aria-hidden was already set. Retire only this stale layer.
    if (dashboardRequested && has(gate, 'visible') &&
        gate?.getAttribute('aria-hidden') === 'true' &&
        !menuOpen && !overlayOpen) {
      gate.classList.remove('visible', 'leaving', 'dashboard-underlay');
    }

    // Once Live View is parked, it must not remain a transparent fullscreen
    // hit-testing surface above Dashboard (Safari standalone PWA quirk).
    const parkedFocus = $('focusDisplayDialog');
    if (parkedFocus && has(parkedFocus, 'mode-parked') && !parkedFocus.hidden) {
      parkedFocus.hidden = true;
      parkedFocus.setAttribute('aria-hidden', 'true');
    }

    // Clear only obsolete locks after bfcache restore/interrupted transitions.
    if (!menuOpen && has(body, 'menu-overlay-open')) body.classList.remove('menu-overlay-open');
    if (!sectionFrame && has(body, 'inj-section-open')) body.classList.remove('inj-section-open');
    if (!focusOpen && has(body, 'focus-display-open')) body.classList.remove('focus-display-open');
    if (!chartsOpen && has(body, 'live-charts-open')) body.classList.remove('live-charts-open');
    if (!pulseOpen && has(body, 'pulse-view-open')) body.classList.remove('pulse-view-open');
    if (!modalOpen && has(body, 'chart-overlay-open')) body.classList.remove('chart-overlay-open');

    const gateVisible = has(gate, 'visible') && gate?.getAttribute('aria-hidden') === 'false';
    const dashboard = has(body, 'dashboard-scroll-ready');
    if (dashboard && !gateVisible && !menuOpen && !overlayOpen) {
      body.classList.remove('entry-gate-open', 'entry-live-launch',
        'mode-returning', 'dashboard-home-return', 'dashboard-home-fade',
        'dashboard-home-instant-return');
    }
    let next = '';
    if (!menuOpen && !overlayOpen) {
      // Do not hand scrolling from Home to Dashboard while the Home element
      // is still visible: switching CSS owners mid-fade can deadlock WebKit.
      if (dashboard && !gateVisible) next = 'dashboard';
      else if (gateVisible && has(body, 'entry-gate-open')) next = 'home';
    }
    if (root.dataset.injScroll !== next) {
      if (next) root.dataset.injScroll = next;
      else root.removeAttribute('data-inj-scroll');
    }
    if (next === 'dashboard') {
      // Only with every overlay closed may Dashboard reclaim scroll ownership.
      // Old inline iOS locks must not survive a PWA resume or a mode return.
      for (const node of [root, body, document.scrollingElement]) {
        if (!node?.style) continue;
        for (const prop of ['overflow', 'overflow-y', 'touch-action', 'position', 'top']) {
          if (node.style.getPropertyValue(prop)) node.style.removeProperty(prop);
        }
      }
    }
  }
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(reconcile);
  }
  function init() {
    if (!document.body) return;
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { attributes:true, attributeFilter:['class'], childList:true });
    for (const node of [
      $('entryGate'), $('headerMenu'), $('injMarketPortal'),
      $('focusDisplayDialog'), $('liveChartsDialog'), $('pulseViewDialog'),
      $('converterView'), $('performanceTimelineView')
    ]) {
      if (node) observer.observe(node, {
        attributes:true, attributeFilter:['class','hidden','aria-hidden']
      });
    }
    window.addEventListener('pageshow', refresh, { passive:true });
    window.addEventListener('popstate', refresh, { passive:true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    // WebKit may miss a transition repaint. Repair after a gesture only if
    // its scroll mode is demonstrably stale; never cancel native touch.
    document.addEventListener('touchend', () => {
      if (document.body?.classList.contains('dashboard-scroll-ready') &&
          root.dataset.injScroll !== 'dashboard') refresh();
    }, { passive:true });
    refresh();
  }
  window.INJ_SCROLL_GUARD = {
    refresh,
    status() {
      const body = document.body;
      const doc = document.scrollingElement || root;
      return {
        mode: root.dataset.injScroll || '',
        dashboardRequested: !!body?.classList.contains('dashboard-scroll-ready'),
        homeVisible: !!document.getElementById('entryGate')?.classList.contains('visible'),
        rootOverflowY: getComputedStyle(root).overflowY,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
        shellOverflowY: document.querySelector('.app-shell') ?
          getComputedStyle(document.querySelector('.app-shell')).overflowY : '',
        bodyClasses: body?.className || '',
        scrollTop: doc.scrollTop,
        scrollRange: Math.max(0, doc.scrollHeight - doc.clientHeight)
      };
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
