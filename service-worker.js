// service-worker.js - stable cache-first PWA worker with network fallback
const CACHE = "dawgtrainer-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/city.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(networkResponse => {
        // Only cache same-origin GET responses
        try {
          const cloned = networkResponse.clone();
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE).then(cache => cache.put(event.request, cloned));
          }
        } catch (err) { /* ignore caching errors */ }
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});