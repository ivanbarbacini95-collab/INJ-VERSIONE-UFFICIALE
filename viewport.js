/* INJ Node v15.99.78 — one viewport measurement for every full-page surface. */
(() => {
  'use strict';
  const root = document.documentElement;
  let frame = 0;
  let probe;
  let lastHeight = 0;
  let lastScroll = -1;
  const editable = () => document.activeElement?.matches('input,textarea,[contenteditable="true"]');

  function measure() {
    frame = 0;
    const scroll = Math.max(0, window.scrollY || 0);
    if (scroll !== lastScroll) { root.style.setProperty('--inj-document-top', scroll + 'px'); lastScroll = scroll; }
    if (!probe && document.body) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none;contain:strict;';
      document.body.appendChild(probe);
    }
    const visual = window.visualViewport;
    // A software keyboard reduces the usable area; pinch zoom must remain native.
    if (visual && Math.abs(visual.scale - 1) > 0.02) return;
    const keyboard = editable() && visual && visual.height < window.innerHeight * 0.8;
    const cssHeight = probe?.getBoundingClientRect().height || 0;
    const height = Math.ceil(keyboard ? visual.height : Math.max(window.innerHeight || 0, cssHeight, visual?.height || 0));
    if (height > 0 && height !== lastHeight) {
      root.style.setProperty('--inj-viewport-height', height + 'px');
      lastHeight = height;
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure);
  }
  function syncTheme() {
    const css = getComputedStyle(root);
    const color = (css.getPropertyValue('--canvas') || css.getPropertyValue('--theme-canvas') || css.getPropertyValue('--bg')).trim();
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }
  root.dataset.injViewport = '78';
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', () => { schedule(); syncTheme(); });
  window.addEventListener('orientationchange', () => { schedule(); setTimeout(schedule, 250); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  document.addEventListener('focusout', () => setTimeout(schedule, 250));
  new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { measure(); syncTheme(); }, { once: true });
  else { measure(); syncTheme(); }
})();
