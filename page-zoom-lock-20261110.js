/* INJ Node Official - prevent browser/page zoom on every route.
   Keep ordinary scrolling, clicks, dragging and chart navigation intact. */
(() => {
  'use strict';
  if (window.__injPageZoomLock) return;
  window.__injPageZoomLock = true;

  const preventZoom = (event) => {
    if (event.cancelable) event.preventDefault();
  };

  // iOS Safari and standalone PWAs can ignore viewport user-scalable=no.
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(name, preventZoom, { capture: true, passive: false });
  }
  document.addEventListener('touchmove', (event) => {
    if (event.touches && event.touches.length > 1) preventZoom(event);
  }, { capture: true, passive: false });

  // Desktop trackpad pinch is delivered as a Ctrl-wheel gesture on Chromium.
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.metaKey) preventZoom(event);
  }, { capture: true, passive: false });

  // Do not override unmodified wheel, touch panning or normal typing.
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (['+', '=', '-', '_', '0'].includes(event.key) ||
        ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code)) {
      preventZoom(event);
    }
  }, { capture: true });
})();
