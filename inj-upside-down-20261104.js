/* INJ Node Official — reverse portrait (180°), 2026-11-04.
   Keep native screen rotation when the OS supports it. Only emulate the
   unsupported reverse-portrait position on a top-level mobile viewport.
   Motion permission on iOS must be requested from a real user gesture. */
(() => {
  'use strict';
  if (window !== window.top || window.__injReversePortraitInstalled) return;
  window.__injReversePortraitInstalled = true;

  const ua = navigator.userAgent || '';
  const isPhone = /iPhone|iPod|Android.*Mobile/i.test(ua);
  if (!isPhone) return; // Desktop and tablets keep their existing layouts.

  const root = document.documentElement;
  const key = 'inj-node-reverse-portrait-enabled';
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch (_) {}
  const needsPermission = typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function';
  let motionAvailable = false;
  let permissionRejected = false;
  let upsideDown = false;
  let manual = false;
  let rendered = false;
  let lastCandidate = null;
  let candidates = 0;
  let lastSample = 0;
  let lastMotionSample = 0;
  let autoButton = null;
  let manualButton = null;

  const style = document.createElement('style');
  style.id = 'inj-reverse-portrait-css';
  style.textContent = [
    'html[data-inj-reverse-portrait="1"]{height:100%!important;overflow:hidden!important;}',
    'html[data-inj-reverse-portrait="1"] body{position:fixed!important;inset:0!important;',
    'width:100%!important;height:100dvh!important;min-height:0!important;max-height:none!important;',
    'margin:0!important;overflow-x:hidden!important;overflow-y:auto!important;',
    'transform:rotate(180deg)!important;-webkit-transform:rotate(180deg)!important;',
    'transform-origin:50% 50%!important;-webkit-transform-origin:50% 50%!important;',
    '-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;}',
    '@supports not (height:100dvh){html[data-inj-reverse-portrait="1"] body{height:100vh!important;}}',
    '#injReverseAutoButton[aria-pressed="true"] .menu-action-value{color:var(--up,#32bd83);}',
    '#injReverseManualButton[aria-pressed="true"] .menu-action-value{color:var(--up,#32bd83);}'
  ].join('');
  document.head.appendChild(style);

  function portrait() {
    return window.matchMedia('(orientation: portrait)').matches &&
      window.innerHeight > window.innerWidth * 1.05;
  }
  function browserAlreadyReversed() {
    const angle = Number(screen.orientation?.angle ?? window.orientation ?? 0);
    return Math.abs(angle) === 180;
  }
  function updateLayout() {
    const shouldRotate = portrait() && !browserAlreadyReversed() &&
      (manual || (enabled && upsideDown));
    if (shouldRotate === rendered) return;
    const previousScroll = rendered ? document.body.scrollTop : window.scrollY;
    rendered = shouldRotate;
    if (shouldRotate) {
      root.setAttribute('data-inj-reverse-portrait', '1');
      document.body.scrollTop = Math.max(0, previousScroll);
    } else {
      root.removeAttribute('data-inj-reverse-portrait');
      if (previousScroll > 0) requestAnimationFrame(() => window.scrollTo(0, previousScroll));
    }
    window.dispatchEvent(new Event('resize'));
    updateControls();
  }
  function sample(candidate) {
    if (!enabled || document.hidden) return;
    const now = performance.now();
    if (now - lastSample < 100) return;
    lastSample = now;
    if (candidate === lastCandidate) candidates++;
    else { lastCandidate = candidate; candidates = 1; }
    // Three consistent readings prevent jitter while the handset is moving.
    if (candidates >= 3 && upsideDown !== candidate) {
      upsideDown = candidate;
      updateLayout();
    }
  }
  window.addEventListener('devicemotion', event => {
    const g = event.accelerationIncludingGravity;
    if (!g || !Number.isFinite(g.y)) return;
    const firstReading = !motionAvailable;
    motionAvailable = true;
    lastMotionSample = performance.now();
    if (firstReading) updateControls();
    // W3C device axes: +Y is towards the TOP of the phone; a phone held
    // upright reads about +9.8 m/s², inverted about -9.8 m/s².
    if (g.y < -5.8) sample(true);
    else if (g.y > 5.8) sample(false);
  }, { passive: true });

  window.addEventListener('deviceorientation', event => {
    // Fallback only when acceleration data are unavailable.
    if (performance.now() - lastMotionSample < 1200 ||
      !Number.isFinite(event.beta) || !Number.isFinite(event.gamma) ||
      Math.abs(event.gamma) > 40) return;
    const firstReading = !motionAvailable;
    motionAvailable = true;
    if (firstReading) updateControls();
    if (event.beta < -48) sample(true);
    else if (event.beta > 48) sample(false);
  }, { passive: true });

  function localeEN() {
    try { return localStorage.getItem('inj_node_language_v1') === 'en' || root.lang === 'en'; }
    catch (_) { return root.lang === 'en'; }
  }
  function updateControls() {
    if (!autoButton) return;
    const en = localeEN();
    const autoValue = autoButton.querySelector('.menu-action-value');
    const autoTitle = autoButton.querySelector('strong');
    const autoSub = autoButton.querySelector('small');
    const manualTitle = manualButton.querySelector('strong');
    const manualSub = manualButton.querySelector('small');
    autoTitle.textContent = en ? 'Upside-down rotation' : 'Rotazione capovolta';
    autoSub.textContent = en ? 'Rotate 180° automatically' : 'Ruota automaticamente di 180°';
    autoButton.setAttribute('aria-pressed', String(enabled));
    autoValue.textContent = permissionRejected ? (en ? 'BLOCKED' : 'BLOCCATO') :
      !enabled ? 'OFF' : needsPermission && !motionAvailable ? (en ? 'ENABLE' : 'ATTIVA') : 'ON';
    manualTitle.textContent = en ? 'Rotate manually' : 'Ruota manualmente';
    manualSub.textContent = en ? 'Fallback if motion is unavailable' : 'Se il sensore non è disponibile';
    manualButton.setAttribute('aria-pressed', String(manual));
    manualButton.querySelector('.menu-action-value').textContent = manual ? '180°' : '0°';
  }
  function makeButton(id, icon, value) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'menu-action menu-setting';
    button.innerHTML = '<span class="menu-action-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="menu-action-copy"><strong></strong><small></small></span>' +
      '<span class="menu-action-value">' + value + '</span>';
    return button;
  }
  async function toggleAutomatic() {
    if (enabled && (!needsPermission || motionAvailable)) {
      enabled = false;
      upsideDown = false;
    } else {
      enabled = true;
      permissionRejected = false;
      if (needsPermission && !motionAvailable) {
        // Call every permission API synchronously during this click gesture.
        const requests = [];
        try { requests.push(DeviceMotionEvent.requestPermission()); } catch (_) {}
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          try { requests.push(DeviceOrientationEvent.requestPermission()); } catch (_) {}
        }
        const answers = await Promise.allSettled(requests);
        if (answers.length && answers.every(x => x.status !== 'fulfilled' || x.value !== 'granted')) {
          enabled = false;
          permissionRejected = true;
        }
      }
    }
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch (_) {}
    updateLayout();
    updateControls();
  }
  function installControls() {
    if (autoButton) return;
    const grid = document.querySelector('#menuPreferencesAccordion .menu-settings-grid');
    if (!grid) return;
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' +
      '<rect x="8" y="2" width="8" height="20" rx="2"/><path d="m4 8 2-2 2 2M6 6v6m14 4-2 2-2-2m2 2v-6"/></svg>';
    autoButton = makeButton('injReverseAutoButton', icon, '');
    manualButton = makeButton('injReverseManualButton', icon, '');
    const anchor = grid.querySelector('#themeControl') || grid.querySelector('#languageControl');
    if (anchor) {
      grid.insertBefore(autoButton, anchor);
      grid.insertBefore(manualButton, anchor);
    } else grid.append(autoButton, manualButton);
    autoButton.addEventListener('click', toggleAutomatic);
    manualButton.addEventListener('click', () => {
      manual = !manual;
      updateLayout();
      updateControls();
    });
    updateControls();
  }

  window.addEventListener('orientationchange', () => {
    updateLayout();
    setTimeout(updateLayout, 300);
  }, { passive: true });
  window.addEventListener('resize', updateLayout, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateLayout(); });
  window.addEventListener('pageshow', updateLayout);
  window.addEventListener('injnode:languagechange', updateControls);
  window.addEventListener('storage', updateControls);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { installControls(); updateLayout(); }, { once: true });
  } else { installControls(); updateLayout(); }
})();