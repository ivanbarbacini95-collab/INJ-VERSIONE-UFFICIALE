'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('PWA still precaches the original app shell and offline destinations', () => {
  const listeners = {};
  const context = vm.createContext({
    self: { registration: { scope: 'https://example.test/' }, addEventListener: (type, fn) => { listeners[type] = fn; } },
    URL, Request: class { constructor(url) { this.url = url; } }, caches: {},
  });
  vm.runInContext(read('sw.js') + '\n;globalThis.bootAssetsForTest=BOOT_ASSETS;', context);
  assert.equal(context.bootAssetsForTest.length, 38, 'all 38 offline resources must remain');
  assert.equal(new Set(context.bootAssetsForTest).size, 38, 'no duplicate cache entries');
  for (const item of context.bootAssetsForTest) {
    const localPath = item.split('?')[0].replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(root, localPath)), 'Missing offline asset: ' + localPath);
  }
  assert.equal(typeof listeners.fetch, 'function');
  assert.equal(typeof listeners.install, 'function');
});

test('PWA only skips rewriting cached assets when validators match', async () => {
  const stored = new Map();
  let writes = 0;
  const cache = {
    match: async key => stored.get(key.url),
    put: async (key, value) => { writes++; stored.set(key.url, value); }
  };
  const context = vm.createContext({
    self: { registration: { scope: 'https://example.test/' }, addEventListener() {} },
    URL,
    Request: class { constructor(url) { this.url = url; } },
    caches: { open: async () => cache },
  });
  vm.runInContext(read('sw.js'), context);
  const makeResponse = values => {
    const headers = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
    return { ok: true, type: 'basic', headers: { get: key => headers.get(key.toLowerCase()) || null },
      clone() { return makeResponse(values); } };
  };
  async function store(file, values) {
    const promises = [];
    const event = { waitUntil(p) { promises.push(p); } };
    context.schedulePut(event, new URL(file, 'https://example.test/'), makeResponse(values));
    await Promise.all(promises);
  }
  await store('style.css?v=1', { ETag: 'v1' });
  await store('style.css?v=2', { ETag: 'v1' });
  assert.equal(writes, 1, 'unchanged asset should not be rewritten');
  await store('style.css?v=2', { ETag: 'v2' });
  assert.equal(writes, 2, 'changed ETag must refresh cached content');
  await store('app.js', { 'Last-Modified': 'Mon, 16 Nov 2026 09:00:00 GMT', 'Content-Length': '400000' });
  await store('app.js?v=2', { 'Last-Modified': 'Mon, 16 Nov 2026 09:00:00 GMT', 'Content-Length': '400000' });
  assert.equal(writes, 3, 'matching last-modified and size should skip write');
  await store('app.js?v=3', { 'Last-Modified': 'Mon, 16 Nov 2026 10:00:00 GMT', 'Content-Length': '400000' });
  assert.equal(writes, 4, 'changed modified date must refresh cache');
  await store('navigation.js', {});
  await store('navigation.js', {});
  assert.equal(writes, 6, 'without validators the cache must stay fresh');
});

test('Cloud Sync backup timer runs only when enabled and visible', () => {
  const intervals = new Map();
  const onDocument = {};
  const onWindow = {};
  let nextId = 0;
  const document = {
    hidden: false,
    addEventListener: (type, fn) => { onDocument[type] = fn; }
  };
  const window = {
    dispatchEvent() {},
    addEventListener: (type, fn) => { onWindow[type] = fn; }
  };
  const context = vm.createContext({
    document, window, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    setInterval: fn => { const id = ++nextId; intervals.set(id, fn); return id; },
    clearInterval: id => intervals.delete(id),
    localStorage: { length: 0, key() { return null; } },
    TextEncoder,
  });
  vm.runInContext(read('cloud-sync-agent.js'), context);
  const agent = window.INJCloudSyncAgent;
  assert.ok(agent);
  assert.equal(intervals.size, 0, 'disabled background sync must not poll');
  agent.attach({ base: 'https://sync.example.test', token: 'demo-session', version: 1, profile: {} });
  assert.equal(intervals.size, 0, 'attaching alone does not opt in');
  agent.enable(true);
  assert.equal(intervals.size, 1, 'enabled backup runs at 15-second cadence');
  document.hidden = true;
  onDocument.visibilitychange();
  assert.equal(intervals.size, 0, 'background page must not poll');
  document.hidden = false;
  onDocument.visibilitychange();
  assert.equal(intervals.size, 1, 'foreground page resumes an enabled backup');
  agent.enable(false);
  assert.equal(intervals.size, 0, 'disabling backup clears the timer');
  agent.enable(true);
  assert.equal(intervals.size, 1);
  agent.stop();
  assert.equal(intervals.size, 0, 'stop cancels polling');
  assert.equal(typeof onWindow.pagehide, 'function');
});
