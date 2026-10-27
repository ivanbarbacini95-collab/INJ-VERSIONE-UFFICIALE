/* INJ Node · Home Micro Terminal
 * Shows a live Injective mainnet block height and a UTC clock.
 * Read-only; independent of wallet requests. API errors never claim chain outage.
 */
(function () {
  'use strict';

  const API_BASES = [
    'https://sentry.lcd.injective.network:443',
    'https://lcd.injective.network',
    'https://1rpc.io/inj-lcd'
  ];
  const LATEST_PATH = '/cosmos/base/tendermint/v1beta1/blocks/latest';
  const POLL_MS = 15000;
  const FETCH_TIMEOUT_MS = 4500;
  const MAX_BLOCK_AGE_MS = 120000;
  const numberFormatter = new Intl.NumberFormat('en-US');
  const utcFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hour12: false
  });

  function start() {
    const bar = document.getElementById('injHomeMicroTerminal');
    const network = document.getElementById('injMicroNetwork');
    const label = document.getElementById('injMicroNetworkLabel');
    const height = document.getElementById('injMicroHeight');
    const clock = document.getElementById('injMicroUtc');
    if (!bar || !network || !label || !height || !clock) return;

    let pending = false;
    let lastHeight = 0;
    let lastProgressAt = 0;
    let lastFetchAt = 0;
    let lastBlockAt = 0;
    let networkMode = 'checking';
    let currentEndpoint = '';

    function isHomeVisible() {
      const gate = document.getElementById('entryGate');
      const shell = bar.closest('.entry-gate-shell');
      return !document.hidden && !!gate && !!shell &&
        !shell.classList.contains('first-access') &&
        gate.getAttribute('aria-hidden') !== 'true';
    }

    function language() {
      return document.documentElement.lang === 'en' ? 'en' : 'it';
    }

    function translate() {
      const en = language() === 'en';
      const captions = {
        injMicroNetworkCaption: en ? 'NETWORK' : 'RETE',
        injMicroBlockCaption: en ? 'LATEST BLOCK' : 'ULTIMO BLOCCO',
        injMicroClockCaption: en ? 'TIME / UTC' : 'ORA / UTC'
      };
      Object.keys(captions).forEach(function (id) {
        const el = document.getElementById(id);
        if (el && el.textContent !== captions[id]) el.textContent = captions[id];
      });
      const txt = networkMode === 'online' ? 'MAINNET' :
        networkMode === 'warning' ? (en ? 'DELAY' : 'RITARDO') :
        networkMode === 'unavailable' ? (en ? 'NO DATA' : 'DATI N/D') :
        (en ? 'CHECKING' : 'VERIFICA');
      if (label.textContent !== txt) label.textContent = txt;
      const details = networkMode === 'online'
        ? (en ? 'Mainnet reachable; latest block received' : 'Mainnet raggiungibile; ultimo blocco ricevuto')
        : networkMode === 'warning'
          ? (en ? 'Block data is delayed or cached' : 'Dati del blocco in ritardo o in cache')
          : networkMode === 'unavailable'
            ? (en ? 'Blockchain data not available from the current APIs' : 'Dati blockchain non disponibili dalle API attuali')
            : (en ? 'Checking the latest Injective block' : 'Controllo ultimo blocco Injective');
      bar.title = details + (currentEndpoint ? ' · ' + currentEndpoint : '');
      network.setAttribute('aria-label', details);
    }

    function setStatus(mode) {
      if (networkMode !== mode || bar.dataset.state !== mode) {
        networkMode = mode;
        bar.dataset.state = mode;
        network.dataset.state = mode;
      }
      translate();
    }

    function renderClock() {
      if (document.hidden) return;
      try {
        const utc = utcFormatter.format(new Date());
        if (clock.textContent !== utc) clock.textContent = utc;
      } catch (_) {
        clock.textContent = '--:--:--';
      }
    }

    async function requestBlock(base) {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(base + LATEST_PATH, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('LCD ' + response.status);
        const data = await response.json();
        const header = data && (data.block?.header || data.result?.block?.header);
        const rawHeight = header && header.height;
        const parsedHeight = Number(rawHeight);
        const chainId = String((header && (header.chain_id || header.chainId)) || '');
        if (!Number.isSafeInteger(parsedHeight) || parsedHeight < 1) {
          throw new Error('Invalid height');
        }
        if (chainId && chainId !== 'injective-1') {
          throw new Error('Unexpected chain');
        }
        const blockTime = Date.parse((header && header.time) || '');
        return { value: parsedHeight, at: Number.isFinite(blockTime) ? blockTime : 0 };
      } finally {
        clearTimeout(timer);
      }
    }

    async function loadBlock() {
      if (pending || !isHomeVisible()) return;
      pending = true;
      try {
        let latest = null;
        for (const base of API_BASES) {
          try {
            latest = await requestBlock(base);
            currentEndpoint = new URL(base).hostname;
            break;
          } catch (_) {
            /* Fall back to the next existing Injective LCD endpoint. */
          }
        }
        if (!latest) {
          setStatus('unavailable');
          return;
        }

        const now = Date.now();
        if (latest.value !== lastHeight) {
          if (latest.value > lastHeight) lastProgressAt = now;
          lastHeight = latest.value;
        }
        if (!lastProgressAt) lastProgressAt = now;
        lastFetchAt = now;
        lastBlockAt = latest.at;
        height.textContent = '#' + numberFormatter.format(lastHeight);
        const staleBlock = latest.at > 0 && (now - latest.at) > MAX_BLOCK_AGE_MS;
        const halted = now - lastProgressAt > MAX_BLOCK_AGE_MS;
        setStatus(staleBlock || halted ? 'warning' : 'online');
      } finally {
        pending = false;
      }
    }

    function onVisible() {
      renderClock();
      if (document.hidden) return;
      if (lastFetchAt && Date.now() - lastFetchAt > MAX_BLOCK_AGE_MS) {
        setStatus('warning');
      }
      loadBlock();
    }

    translate();
    renderClock();
    window.addEventListener('injnode:languagechange', translate);
    window.addEventListener('pageshow', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    window.setInterval(renderClock, 1000);
    window.setInterval(loadBlock, POLL_MS);
    window.setTimeout(loadBlock, 1300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
