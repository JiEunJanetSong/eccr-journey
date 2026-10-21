// Cache only this lab's known local files. No production-site or shared-origin cache is cleared.
const CACHE_PREFIX = "eccr-reading-lab:" + self.registration.scope + ":";
const CACHE_NAME = CACHE_PREFIX + "v1";
const CORE = ["./", "./index.html", "./style.css", "./app.js", "./model.mjs",
  "./book.json", "./source-manuscript.txt", "./readme.txt"];
const URLS = CORE.map(path => new URL(path, self.registration.scope).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(URLS))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  url.search = "";
  if (!URLS.includes(url.href)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache =>
    (await cache.match(url.href)) || fetch(event.request)));
});
self.addEventListener("message", event => {
  if (event.data?.type !== "CHECK_CORE" || !event.ports[0]) return;
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    const found = await Promise.all(URLS.map(url => cache.match(url)));
    event.ports[0].postMessage({ready: found.every(Boolean), count: found.filter(Boolean).length, total: URLS.length});
  }));
});
