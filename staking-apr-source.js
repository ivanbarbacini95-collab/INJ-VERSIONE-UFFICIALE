/* INJ Node — verified staking APR source (2026-11-09)
 * Only protocol data, measured block cadence and validator commissions.
 * No hard-coded APR floor, smoothing or fabricated "live" precision.
 */
(function (global) {
  'use strict';
  const STORE = 'inj_node_verified_staking_apr_v1';
  const OFFICIAL = 'https://api.ui.injective.network/api/v1/cache/stats/apr';
  const LCDS = ['https://sentry.lcd.injective.network:443', 'https://lcd.injective.network', 'https://1rpc.io/inj-lcd'];
  const REFRESH_MS = 5 * 60_000;
  const MAX_CACHE_MS = 30 * 60_000;
  const ASSUMED_MINT_BLOCK_SECONDS = 0.5;
  let pending = null;
  let current = null;
  const positive = (value) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : NaN; };
  const percent = (value) => { const n = positive(value); return Number.isFinite(n) ? (n <= 1 ? n * 100 : n) : NaN; };
  const bounded = (value) => Number.isFinite(value) && value > 0 && value < 80;
  const close = (a, b, tolerance) => Math.abs(a - b) / Math.max(a, b) <= tolerance;

  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && bounded(Number(saved.apr)) && Number.isFinite(Number(saved.at)) &&
        Date.now() - Number(saved.at) >= 0 && Date.now() - Number(saved.at) < MAX_CACHE_MS) {
      current = saved;
    }
  } catch (_) {}

  async function json(url, timeoutMs = 4800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function lcd(path) {
    let error;
    for (const base of LCDS) {
      try { return await json(base + path, 3600); }
      catch (e) { error = e; }
    }
    throw error || new Error('Injective LCD unavailable');
  }
  function header(data) {
    return data?.block?.header || data?.sdk_block?.header || null;
  }
  async function measuredBlockSeconds() {
    const latest = header(await lcd('/cosmos/base/tendermint/v1beta1/blocks/latest'));
    const height = Number(latest?.height);
    const newest = Date.parse(latest?.time);
    if (!(height > 600) || !Number.isFinite(newest)) throw new Error('Latest block unavailable');
    const old = header(await lcd('/cosmos/base/tendermint/v1beta1/blocks/' + (height - 480)));
    const oldest = Date.parse(old?.time);
    const deltaHeight = height - Number(old?.height);
    const seconds = (newest - oldest) / 1000 / deltaHeight;
    if (!(deltaHeight > 0 && seconds > 0.35 && seconds < 3)) throw new Error('Block cadence not verified');
    return seconds;
  }
  async function retrieve() {
    const [mint, pool, distribution, official, cadence] = await Promise.allSettled([
      lcd('/cosmos/mint/v1beta1/annual_provisions'),
      lcd('/cosmos/staking/v1beta1/pool'),
      lcd('/cosmos/distribution/v1beta1/params'),
      json(OFFICIAL, 5000),
      measuredBlockSeconds()
    ]);
    const annual = positive(mint.status === 'fulfilled' ? mint.value?.annual_provisions : null);
    const bonded = positive(pool.status === 'fulfilled' ? pool.value?.pool?.bonded_tokens : null);
    const taxRaw = distribution.status === 'fulfilled' ? distribution.value?.params?.community_tax : null;
    const tax = taxRaw === null || taxRaw === undefined ? NaN : Number(taxRaw);
    const gross = Number.isFinite(annual) && Number.isFinite(bonded) &&
      Number.isFinite(tax) && tax >= 0 && tax < 1 ? annual / bonded * 100 * (1 - tax) : NaN;
    const seconds = cadence.status === 'fulfilled' ? cadence.value : NaN;
    const derived = bounded(gross) && Number.isFinite(seconds)
      ? gross * ASSUMED_MINT_BLOCK_SECONDS / seconds : NaN;
    const quoted = official.status === 'fulfilled' ? percent(official.value?.apr) : NaN;
    let apr = NaN;
    let source = '';
    let conflict = false;
    if (bounded(derived)) {
      // The official UI quote is used only if consistent with independently
      // measured mint emissions, community tax, bonded stake and block cadence.
      conflict = bounded(quoted) && !close(quoted, derived, 0.30);
      apr = bounded(quoted) && !conflict ? quoted : derived;
      source = bounded(quoted) && !conflict ? 'Injective UI + on-chain' : 'On-chain · blocchi misurati';
    } else if (bounded(quoted) && bounded(gross) && close(quoted, gross, 0.36)) {
      // If block sampling is temporarily unavailable, a nominal mint cross-check
      // is sufficient only to accept a consistent official quote (not a 1.34% spike).
      apr = quoted;
      source = 'Injective UI · verifica emissioni';
    }
    if (!bounded(apr)) throw new Error('APR cannot be independently verified');
    const result = {
      apr, at: Date.now(), source, conflict,
      derivedApr: bounded(derived) ? derived : null,
      quotedApr: bounded(quoted) ? quoted : null,
      blockSeconds: Number.isFinite(seconds) ? seconds : null
    };
    current = result;
    try { localStorage.setItem(STORE, JSON.stringify(result)); } catch (_) {}
    return result;
  }
  async function load(force = false) {
    const now = Date.now();
    if (!force && current && now - current.at < REFRESH_MS) return { ...current, stale: false };
    if (!pending) pending = retrieve().finally(() => { pending = null; });
    try { return { ...(await pending), stale: false }; }
    catch (_) {
      if (current && now - current.at < MAX_CACHE_MS) return { ...current, stale: true };
      return null;
    }
  }
  function snapshot() {
    return current && Date.now() - current.at < MAX_CACHE_MS
      ? { ...current, stale: Date.now() - current.at >= REFRESH_MS } : null;
  }
  function validatorNetApr(baseApr, commission, status, jailed) {
    const fee = Number(commission);
    const validStatus = status === 'BOND_STATUS_BONDED' || status === '3';
    if (!bounded(Number(baseApr)) || !Number.isFinite(fee) || fee < 0 || fee > 1 ||
        typeof status !== 'string' || !status) return NaN;
    return jailed || !validStatus ? 0 : Number(baseApr) * (1 - fee);
  }
  // The same wallet-level computation is reused by every INJ Node page.
  // A wallet APR is a weighted net APR, NEVER an unrelated network quote.
  const WALLET_STORE = 'inj_node_verified_wallet_apr_v1';
  const WALLET_REFRESH_MS = 2 * 60_000;
  let walletRows = {};
  const walletPending = new Map();
  try { walletRows = JSON.parse(localStorage.getItem(WALLET_STORE) || '{}') || {}; } catch (_) {}
  function storedWallet(address, base) {
    const row = walletRows[address];
    const age = Date.now() - Number(row?.updatedAt);
    if (!row || !Number.isFinite(age) || age < 0 || age >= MAX_CACHE_MS ||
        !Number.isFinite(Number(row.networkApr)) || !close(row.networkApr, base.apr, .000001) ||
        !Array.isArray(row.validators) || !Number.isFinite(Number(row.staked))) return null;
    return row;
  }
  async function readWallet(address, base) {
    const delegation = await lcd('/cosmos/staking/v1beta1/delegations/' + address + '?pagination.limit=1000');
    if (!Array.isArray(delegation?.delegation_responses) || delegation?.pagination?.next_key)
      throw new Error('Delegations not complete');
    const delegated = delegation.delegation_responses.map(row => ({
      operator: String(row?.delegation?.validator_address || ''),
      amount: Number(row?.balance?.amount) / 1e18
    })).filter(row => row.operator && Number.isFinite(row.amount) && row.amount > 0);
    const rows = await Promise.all(delegated.map(async row => {
      const response = await lcd('/cosmos/staking/v1beta1/validators/' + row.operator);
      const v = response?.validator;
      const commission = Number(v?.commission?.commission_rates?.rate);
      const status = String(v?.status || '');
      if (!v || !Number.isFinite(commission) || commission < 0 ||
          commission > 1 || !status) throw new Error('Validator metadata missing');
      const netApr = validatorNetApr(base.apr, commission, status, Boolean(v.jailed));
      if (!Number.isFinite(netApr)) throw new Error('Validator net APR missing');
      return {
        ...row, moniker: String(v?.description?.moniker || row.operator),
        commission, status, jailed: Boolean(v.jailed), netApr,
        updated: Date.now()
      };
    }));
    const staked = rows.reduce((sum, row) => sum + row.amount, 0);
    const result = {
      address, apr: staked > 0 ? rows.reduce((sum, row) => sum + row.amount * row.netApr, 0) / staked : null,
      staked, validators: rows,
      weightedCommission: staked > 0 ? rows.reduce((sum, row) => sum + row.amount * row.commission, 0) / staked : null,
      networkApr: base.apr, aprUpdated: base.at, updatedAt: Date.now(),
      source: base.source, stale: Boolean(base.stale)
    };
    walletRows[address] = result;
    try { localStorage.setItem(WALLET_STORE, JSON.stringify(walletRows)); } catch (_) {}
    return result;
  }
  async function wallet(address, force = false) {
    const id = String(address || '').trim().toLowerCase();
    if (!/^inj1[0-9a-z]{38,60}$/.test(id)) return null;
    const base = await load(force);
    if (!base) return null;
    const cached = storedWallet(id, base);
    if (!force && cached && Date.now() - cached.updatedAt < WALLET_REFRESH_MS)
      return { ...cached, stale: Boolean(base.stale) };
    if (!walletPending.has(id)) {
      walletPending.set(id, readWallet(id, base).finally(() => walletPending.delete(id)));
    }
    try { return await walletPending.get(id); }
    catch (_) { return cached ? { ...cached, stale: true } : null; }
  }
  function walletSnapshot(address) {
    const base = snapshot();
    const id = String(address || '').trim().toLowerCase();
    const cached = base ? storedWallet(id, base) : null;
    return cached ? { ...cached, stale: Date.now() - cached.updatedAt >= WALLET_REFRESH_MS || base.stale } : null;
  }
  // Keep independently open pages / embedded Workspace in sync. Storage
  // broadcasts never manufacture new APR; they only relay verified snapshots.
  global.addEventListener?.('storage', (event) => {
    if (event.key === STORE && event.newValue) {
      try {
        const received = JSON.parse(event.newValue);
        if (bounded(Number(received?.apr)) && Number(received?.at) > Number(current?.at || 0) &&
            Date.now() - received.at >= 0 && Date.now() - received.at < MAX_CACHE_MS)
          current = received;
      } catch (_) {}
    }
    if (event.key === WALLET_STORE && event.newValue) {
      try {
        const received = JSON.parse(event.newValue);
        if (!received || typeof received !== 'object') return;
        for (const [address, row] of Object.entries(received)) {
          if (Number(row?.updatedAt) > Number(walletRows[address]?.updatedAt || 0))
            walletRows[address] = row;
        }
      } catch (_) {}
    }
  });
  global.INJ_STAKING_APR = Object.freeze({
    load, snapshot, wallet, walletSnapshot, validatorNetApr, maxCacheMs: MAX_CACHE_MS
  });
})(window);
