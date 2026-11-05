/* INJ Node Official · locked manual 180° content mode · 2026-11-04.
   Completely independent of physical motion, OS orientation and sensors.
   One user choice persists across the entire installed PWA.
   The outer document rotates exactly once; embedded pages inherit it. */
(() => {
  'use strict';
  if (window.__injReversePortraitInstalled) return;
  window.__injReversePortraitInstalled = true;

  const isPhoneOrTablet = /iPhone|iPod|iPad|Android/i.test(navigator.userAgent || '');
  if (!isPhoneOrTablet) return;
  const root = document.documentElement;
  const embedded = window !== window.top;
  const key = 'inj-node-fixed-180-enabled';
  let enabled = false;
  try { enabled = localStorage.getItem(key) === 'on'; } catch (_) {}
  let painted = false;
  let settingsButton = null;
  let exitButton = null;

  // Only one viewport is ever transformed; all child frames, settings and
  // Workspace remain part of this same rotated browsing surface.
  const style = document.createElement('style');
  style.id = 'inj-fixed-180-css';
  style.textContent = [
    'html[data-inj-reverse-portrait="1"]{height:100%!important;overflow:hidden!important;}',
    'html[data-inj-reverse-portrait="1"] body{',
      'position:fixed!important;inset:0!important;margin:0!important;',
      'box-sizing:border-box!important;width:100%!important;',
      'height:100dvh!important;min-height:0!important;max-height:none!important;',
      'overflow-x:hidden!important;overflow-y:auto!important;',
      'transform:rotate(180deg)!important;-webkit-transform:rotate(180deg)!important;',
      'transform-origin:50% 50%!important;-webkit-transform-origin:50% 50%!important;',
      '-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;}',
    '@supports not (height:100dvh){',
      'html[data-inj-reverse-portrait="1"] body{height:100vh!important;}}',
    'html[data-inj-reverse-portrait="1"] body.inj-section-open{overflow:hidden!important;}',
    // HTML top-layer dialogs and native fullscreen do not inherit the body
    // transform. Rotate those only once when presented outside that layer.
    'html[data-inj-reverse-portrait="1"] dialog:modal,',
    'html[data-inj-reverse-portrait="1"] [popover]:popover-open,',
    'html[data-inj-reverse-portrait="1"] :fullscreen:not(html):not(body):not(iframe){',
      'transform:rotate(180deg)!important;-webkit-transform:rotate(180deg)!important;',
      'transform-origin:center center!important;}',
    'html[data-inj-reverse-portrait="1"] #injFixed180Exit{',
      'position:fixed!important;right:max(12px,env(safe-area-inset-right))!important;',
      'bottom:max(14px,env(safe-area-inset-bottom))!important;',
      'z-index:2147483647!important;display:flex!important;align-items:center!important;',
      'gap:6px!important;min-width:48px!important;min-height:44px!important;',
      'padding:10px 12px!important;border-radius:999px!important;',
      'border:1px solid var(--line,rgba(255,255,255,.2))!important;',
      'background:var(--surface-strong,#172635)!important;',
      'color:var(--text,#fff)!important;',
      'font:600 13px/1.1 system-ui,-apple-system,sans-serif!important;',
      'box-shadow:0 3px 12px rgba(0,0,0,.24)!important;',
      'opacity:.9!important;touch-action:manipulation!important;',
      'cursor:pointer!important;pointer-events:auto!important;}',
    'html:not([data-inj-reverse-portrait="1"]) #injFixed180Exit{display:none!important;}',
    '#injReverseAutoButton[aria-pressed="true"] .menu-action-value{color:var(--up,#32bd83);}',
    // The Home dock is a native manual popover (browser TOP layer), not
    // a child of the rotated body for rendering. Position and rotate it in
    // viewport space so its controls appear at the physical BOTTOM when
    // the handset is held charging-port-up. Buttons keep normal hit boxes.
    'html[data-inj-reverse-portrait="1"][data-inj-page="index"]',
    ' body > #injPrimaryBottomNav:popover-open{',
    'position:fixed!important;',
    'inset:max(10px,env(safe-area-inset-top,0px)) auto auto 50%!important;',
    'top:max(10px,env(safe-area-inset-top,0px))!important;',
    'bottom:auto!important;left:50%!important;right:auto!important;',
    'margin:0!important;',
    'transform:translate(-50%,0) rotate(180deg)!important;',
    '-webkit-transform:translate(-50%,0) rotate(180deg)!important;',
    'transform-origin:center center!important;',
    '}',
    // For older Safari without the top-layer popover, the dock remains
    // inside the rotated BODY and must NOT be rotated twice. Move its
    // logical bottom edge to the opposite end of that body instead.
    'html[data-inj-reverse-portrait="1"][data-inj-page="index"]',
    ' body > #injPrimaryBottomNav:not(:popover-open){',
    'position:fixed!important;',
    'inset:max(10px,env(safe-area-inset-top,0px)) auto auto 50%!important;',
    'top:max(10px,env(safe-area-inset-top,0px))!important;',
    'bottom:auto!important;left:50%!important;right:auto!important;',
    'transform:translate(-50%,0)!important;',
    '-webkit-transform:translate(-50%,0)!important;',
    '}',
    // Home-only appearance rules can have extremely specific selectors.
    // Match those exact selectors while in locked mode; visibility and
    // pointer behavior are still controlled by the Home tab itself.
    'html[data-inj-reverse-portrait="1"][data-inj-page="index"]',
    '[data-inj-home-tab="home"][data-inj-home-nav-visible="true"]',
    ' body.entry-gate-open > #injPrimaryBottomNav#injPrimaryBottomNav:popover-open{',
    'inset:max(10px,env(safe-area-inset-top,0px)) auto auto 50%!important;',
    'top:max(10px,env(safe-area-inset-top,0px))!important;',
    'bottom:auto!important;',
    'transform:translate(-50%,0) rotate(180deg)!important;',
    '-webkit-transform:translate(-50%,0) rotate(180deg)!important;',
    '}'

  ].join('');
  document.head.appendChild(style);

  // Same-origin frames must not rotate independently (double rotation).
  if (embedded) {
    window.addEventListener('message', event => {
      if (event.origin !== location.origin ||
          event.source !== window.parent ||
          event.data?.type !== 'injnode:reverse-portrait') return;
      root.dataset.injReverseChild = event.data.active ? '1' : '0';
    });
    try { window.parent.postMessage({type:'injnode:reverse:ready'}, location.origin); }
    catch (_) {}
    return;
  }

  function broadcast() {
    const message = {type:'injnode:reverse-portrait', active:painted};
    document.querySelectorAll('iframe').forEach(frame => {
      try { frame.contentWindow?.postMessage(message, location.origin); }
      catch (_) {}
    });
  }

  function localeEN() {
    try { return localStorage.getItem('inj_node_language_v1') === 'en' || root.lang === 'en'; }
    catch (_) { return root.lang === 'en'; }
  }

  function renderLabels() {
    const en = localeEN();
    if (settingsButton) {
      const title = settingsButton.querySelector('strong');
      const subtitle = settingsButton.querySelector('small');
      const value = settingsButton.querySelector('.menu-action-value');
      if (title) title.textContent = en ? 'Fixed 180° content' : 'Contenuto fisso a 180°';
      if (subtitle) subtitle.textContent = en ?
        'Stays inverted until you turn it off' : 'Resta capovolto finché non lo disattivi';
      if (value) value.textContent = enabled ? '180°' : '0°';
      settingsButton.setAttribute('aria-pressed', String(enabled));
    }
    if (exitButton) {
      exitButton.title = en ? 'Back to 0°' : 'Torna a 0°';
      exitButton.setAttribute('aria-label', exitButton.title);
    }
  }

  function setEnabled(next) {
    enabled = !!next;
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch (_) {}
    apply();
  }

  function apply() {
    if (!document.body) return;
    if (painted !== enabled) {
      // Preserve the actual scroll surface when turning the entire document.
      const scroll = painted ? document.body.scrollTop : window.scrollY;
      painted = enabled;
      if (enabled) root.setAttribute('data-inj-reverse-portrait', '1');
      else root.removeAttribute('data-inj-reverse-portrait');
      if (enabled) {
        document.body.scrollTop = Math.max(0, scroll);
      } else if (scroll > 0) {
        requestAnimationFrame(() => window.scrollTo(0, scroll));
      }
      broadcast();
      window.dispatchEvent(new Event('resize'));
    }
    if (exitButton) exitButton.hidden = !enabled;
    renderLabels();
  }

  function installControls() {
    if (!document.body) return;
    if (!exitButton) {
      // Universal escape hatch, including fullscreen Workspace and Market.
      // It belongs to the rotated document, so its touch target follows it.
      exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.id = 'injFixed180Exit';
      exitButton.textContent = '↶ 0°';
      exitButton.addEventListener('click', () => setEnabled(false));
      document.body.appendChild(exitButton);
    }
    if (!settingsButton) {
      const grid = document.querySelector('#menuPreferencesAccordion .menu-settings-grid');
      if (grid) {
        const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' +
          '<rect x="8" y="2" width="8" height="20" rx="2"/>' +
          '<path d="M4 8l2-2 2 2M6 6v6m14 4-2 2-2-2m2 2v-6"/></svg>';
        settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.id = 'injReverseAutoButton';
        settingsButton.className = 'menu-action menu-setting';
        settingsButton.innerHTML = '<span class="menu-action-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="menu-action-copy"><strong></strong><small></small></span>' +
          '<span class="menu-action-value"></span>';
        const anchor = grid.querySelector('#themeControl') || grid.querySelector('#languageControl');
        if (anchor) grid.insertBefore(settingsButton, anchor);
        else grid.appendChild(settingsButton);
        settingsButton.addEventListener('click', () => setEnabled(!enabled));
      }
    }
    apply();
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin ||
        event.data?.type !== 'injnode:reverse:ready') return;
    try {
      event.source?.postMessage({type:'injnode:reverse-portrait', active:painted}, location.origin);
    } catch (_) {}
  });
  document.addEventListener('load', event => {
    if (event.target?.tagName === 'IFRAME') broadcast();
  }, true);
  window.addEventListener('storage', event => {
    if (event.key === key) {
      enabled = event.newValue === 'on';
      apply();
    }
  });
  window.addEventListener('pageshow', () => {
    try { enabled = localStorage.getItem(key) === 'on'; } catch (_) {}
    installControls();
    broadcast();
  });
  window.addEventListener('injnode:languagechange', renderLabels);
  // No accelerometer, motion, tilt or screen orientation listeners by design.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installControls, {once:true});
  } else installControls();
})();
