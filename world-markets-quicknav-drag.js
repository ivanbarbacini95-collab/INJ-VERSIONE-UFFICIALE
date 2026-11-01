/* INJ Node · 2026-10-29
 * Desktop click-and-drag for the native Global Markets category rail.
 * Touch remains native/inertial; genuine taps still jump to the sector.
 */
(() => {
  'use strict';
  function init() {
    const rail = document.getElementById('injWorldQuickNav');
    if (!rail) return;
    let pointerId = null;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let suppressClick = false;
    let suppressTimer = 0;

    rail.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 ||
          rail.scrollWidth <= rail.clientWidth) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = rail.scrollLeft;
      moved = false;
    });

    window.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      rail.classList.add('is-dragging');
      rail.scrollLeft = startScroll - dx;
      event.preventDefault();
    }, { passive: false });

    const release = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      pointerId = null;
      rail.classList.remove('is-dragging');
      if (moved) {
        suppressClick = true;
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => { suppressClick = false; }, 120);
      }
      moved = false;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    // A drag must not accidentally open the destination under the mouse.
    rail.addEventListener('click', (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    }, true);
    rail.addEventListener('dragstart', (event) => event.preventDefault());
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
