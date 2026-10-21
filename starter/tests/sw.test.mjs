import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const scope = "https://example.test/eccr-journey/starter/";

function worker() {
  const listeners = {};
  const stores = new Map([
    ["unrelated-production-cache", new Map()],
    ["eccr-reading-lab:https://example.test/other/:v1", new Map()],
    ["eccr-reading-lab:" + scope + ":v0", new Map()]
  ]);
  const context = {
    URL,
    self: {
      registration: {scope},
      addEventListener: (type, listener) => { listeners[type] = listener; },
      skipWaiting: async () => {},
      clients: {claim: async () => {}}
    },
    caches: {
      keys: async () => [...stores.keys()],
      delete: async key => stores.delete(key),
      open: async key => {
        if (!stores.has(key)) stores.set(key, new Map());
        const store = stores.get(key);
        return {
          addAll: async urls => { urls.forEach(url => store.set(url, {cached: url})); },
          match: async url => store.get(url)
        };
      }
    },
    fetch: async request => ({network: request.url})
  };
  vm.runInNewContext(source, context);
  return {listeners, stores};
}

test("install caches only eight local app files, including subpath navigation", async () => {
  const {listeners, stores} = worker();
  let completed;
  listeners.install({waitUntil: promise => { completed = promise; }});
  await completed;
  const current = stores.get("eccr-reading-lab:" + scope + ":v1");
  assert.equal(current.size, 8);
  assert.ok(current.has(scope));
  assert.ok(current.has(scope + "model.mjs"));
  assert.ok([...current.keys()].every(url => url.startsWith(scope)));
});

test("activation removes only older caches within this exact app scope", async () => {
  const {listeners, stores} = worker();
  let completed;
  listeners.activate({waitUntil: promise => { completed = promise; }});
  await completed;
  assert.ok(stores.has("unrelated-production-cache"));
  assert.ok(stores.has("eccr-reading-lab:https://example.test/other/:v1"));
  assert.ok(!stores.has("eccr-reading-lab:" + scope + ":v0"));
});

test("offline response handles known paths and leaves other apps untouched", async () => {
  const {listeners} = worker();
  let installed;
  listeners.install({waitUntil: promise => { installed = promise; }});
  await installed;
  let response;
  listeners.fetch({
    request: {method: "GET", url: scope + "book.json?v=demo"},
    respondWith: promise => { response = promise; }
  });
  assert.deepEqual(await response, {cached: scope + "book.json"});
  let intercepted = false;
  listeners.fetch({
    request: {method: "GET", url: "https://example.test/production/index.html"},
    respondWith: () => { intercepted = true; }
  });
  assert.equal(intercepted, false);
});

test("cache check reports completeness, not an invented offline playback success", async () => {
  const {listeners} = worker();
  let installed;
  listeners.install({waitUntil: promise => { installed = promise; }});
  await installed;
  let result;
  let completed;
  listeners.message({
    data: {type: "CHECK_CORE"},
    ports: [{postMessage: value => { result = value; }}],
    waitUntil: promise => { completed = promise; }
  });
  await completed;
  assert.equal(result.ready, true);
  assert.equal(result.count, 8);
  assert.equal(result.total, 8);
  assert.equal("playbackTested" in result, false);
});
