/* INJ Node · Home terminal header structure, 2026-10-27.
 * Reuse the existing live metrics and Control Center menu, with no duplicate
 * button or listener. A common grid keeps the hamburger aligned to the brand.
 */
(() => {
  'use strict';
  function arrange() {
    const gate = document.getElementById('entryGate');
    const heading = gate?.querySelector('.entry-wallet-section > .home-safe-heading');
    const button = document.getElementById('entryMenuButton');
    if (!gate || !heading || !button || button.parentElement === heading) return;
    // Move ONLY the pre-existing interactive trigger. Its existing event
    // listener stays attached, while the Control Center overlay/backdrop
    // remains at the shell root to avoid iOS fixed-position clipping.
    heading.insertBefore(button, heading.firstChild);
    heading.classList.add('inj-terminal-hero-arranged');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrange, {once:true});
  } else arrange();
})();
