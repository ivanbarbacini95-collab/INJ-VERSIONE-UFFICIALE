/* INJ Node Official — reverse portrait (180°), 2026-11-04.
   Keep native screen rotation when the OS supports it. Only emulate the
   unsupported reverse-portrait position on a top-level mobile viewport.
   Motion permission on iOS must be requested from a real user gesture. */
(() => {
  'use strict';
  if (window.__injReversePortraitInstalled) return;
  window.__injReversePortraitInstalled = true;
  const isEmbedded = window !== window.top;

  const ua = navigator.userAgent || '';
  const isPhone = /iPhone|iPod|Android.*Mobile/i.test(ua);
  if (!isPhone) return; // Desktop and tablets keep their existing layouts.

  const root = document.documentElement;
  const key = 'inj-node-reverse-portrait-enabled';
  let enabled = false;
  try { enabled = localStorage.getItem(key) === 'on'; } catch (_) {}
  // The user choice is shared across all INJ Node routes. Do not treat a
  // persisted choice as permission to prompt again on every page load.
  const needsPermission = typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function';
  let motionAvailable = false;
  let permissionRejected = false;
  let upsideDown = false;
  let rendered = false;
  let lastCandidate = null;
  let candidates = 0;
  let lastSample = 0;
  let autoButton = null;

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
    'html[data-inj-reverse-portrait="1"] body.inj-section-open{overflow:hidden!important;}',
    'html[data-inj-reverse-portrait="1"] dialog:modal,',
    'html[data-inj-reverse-portrait="1"] [popover]:popover-open,',
    'html[data-inj-reverse-portrait="1"] :fullscreen:not(html):not(iframe){',
    'transform:rotate(180deg)!important;-webkit-transform:rotate(180deg)!important;',
    'transform-origin:center center!important;}',
  ].join('');
  document.head.appendChild(style);

  // Pages shown inside Home are separate documents. Inherit the rotation
  // decision from the one top-level sensor owner; never ask for sensor
  // permissions inside Workspace or other embedded pages.
  if (isEmbedded) {
    window.addEventListener('message', event => {
      if (event.origin !== location.origin ||
          event.source !== window.parent ||
          event.data?.type !== 'injnode:reverse-portrait') return;
      root.dataset.injReverseChild = event.data.active ? '1' : '0';
    });
    try {
      window.parent.postMessage({type:'injnode:reverse:ready'}, location.origin);
    } catch (_) {}
    return;
  }

  function informEmbedded(active) {
    const message = {type:'injnode:reverse-portrait', active};
    document.querySelectorAll('iframe').forEach(frame => {
      try { frame.contentWindow?.postMessage(message, location.origin); }
      catch (_) {}
    });
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin ||
        event.data?.type !== 'injnode:reverse:ready') return;
    try { event.source?.postMessage({type:'injnode:reverse-portrait', active:rendered}, location.origin); }
    catch (_) {}
  });
  document.addEventListener('load', event => {
    if (event.target?.tagName === 'IFRAME') informEmbedded(rendered);
  }, true);

  function portrait() {
    return window.matchMedia('(orientation: portrait)').matches &&
      window.innerHeight > window.innerWidth * 1.05;
  }
  function browserAlreadyReversed() {
    // If the OS already rotated the viewport, do not rotate CSS a second time.
    const orientation = screen.orientation;
    const nativeAngle = Number.isFinite(orientation?.angle) ? orientation.angle : null;
    const legacyAngle = Number.isFinite(window.orientation) ? window.orientation : null;
    return Math.abs(nativeAngle ?? legacyAngle ?? 0) === 180;
  }
  function updateLayout() {
    const shouldRotate = portrait() && !browserAlreadyReversed() &&
      enabled && upsideDown;
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
    informEmbedded(shouldRotate);
    window.dispatchEvent(new Event('resize'));
    updateControls();
  }
  function resetDetection() {
    upsideDown = false;
    lastCandidate = null;
    candidates = 0;
    lastSample = 0;
    updateLayout();
  }
  function sampleAbsolute(chargingPortUp) {
    if (!enabled || document.hidden || !portrait()) return;
    const now = performance.now();
    if (now - lastSample < 105) return;
    lastSample = now;
    if (chargingPortUp === lastCandidate) ++candidates;
    else { lastCandidate = chargingPortUp; candidates = 1; }
    if (candidates >= 4 && upsideDown !== chargingPortUp) {
      upsideDown = chargingPortUp;
      updateLayout();
    }
  }
  window.addEventListener('devicemotion', event => {
    const g = event.accelerationIncludingGravity;
    if (!g || !Number.isFinite(g.y)) return;
    const first = !motionAvailable;
    motionAvailable = true;
    if (first) updateControls();
    // W3C device-gravity axis: +Y = top of handset UP (port DOWN).
    // -Y = top of handset DOWN (charging port UP).
    // Ignore sideways, flat, or transitional positions.
    if (Math.abs(g.y) >= 6.5 &&
        Math.abs(g.y) >= Math.abs(g.x || 0) * 1.25 &&
        Math.abs(g.y) >= Math.abs(g.z || 0) * 1.15) sampleAbsolute(g.y < 0);
  }, { passive: true });
  // Do not interpret deviceorientation.beta as absolute portrait direction:
  // WebKit's orientation origin can vary by session, producing an inverted
  // image when the phone is physically turned. Gravity is authoritative.

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
    autoTitle.textContent = en ? 'Upside-down rotation' : 'Rotazione capovolta';
    autoSub.textContent = en ? 'Rotate 180° automatically' : 'Ruota automaticamente di 180°';
    autoButton.setAttribute('aria-pressed', String(enabled));
    autoValue.textContent = permissionRejected ? (en ? 'BLOCKED' : 'BLOCCATO') :
      !enabled ? 'OFF' : needsPermission && !motionAvailable ? (en ? 'ENABLE' : 'ATTIVA') : 'ON';
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
    const recoverPermission = enabled && needsPermission && !motionAvailable;
    if (enabled && !recoverPermission) {
      enabled = false;
      permissionRejected = false;
      resetDetection();
    } else {
      if (!enabled) {
        enabled = true;
        resetDetection();
      }
      permissionRejected = false;
      if (needsPermission && !motionAvailable) {
        // A native iOS permission is only requested on this explicit tap.
        // A stored preference never invokes the OS permission prompt on
        // navigation, Workspace launch, fullscreen or PWA reopening.
        const requests = [];
        try { requests.push(DeviceMotionEvent.requestPermission()); }
        catch (err) { requests.push(Promise.reject(err)); }
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          try { requests.push(DeviceOrientationEvent.requestPermission()); }
          catch (err) { requests.push(Promise.reject(err)); }
        }
        const answers = await Promise.allSettled(requests);
        if (answers.length && answers.every(x => x.status !== 'fulfilled' || x.value !== 'granted')) {
          permissionRejected = true;
          // Keep the user's ON choice even when iOS revokes motion access.
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
    const anchor = grid.querySelector('#themeControl') || grid.querySelector('#languageControl');
    if (anchor) {
      grid.insertBefore(autoButton, anchor);
    } else grid.append(autoButton);
    autoButton.addEventListener('click', toggleAutomatic);
    updateControls();
  }

  window.addEventListener('orientationchange', () => {
    updateLayout();
    setTimeout(updateLayout, 300);
  }, { passive: true });
  window.addEventListener('resize', updateLayout, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateLayout(); });
  window.addEventListener('pageshow', () => { updateLayout(); informEmbedded(rendered); });
  window.addEventListener('injnode:languagechange', updateControls);
  window.addEventListener('storage', updateControls);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installControls(); updateLayout(); informEmbedded(rendered);
    }, { once: true });
  } else { installControls(); updateLayout(); informEmbedded(rendered); }
})();