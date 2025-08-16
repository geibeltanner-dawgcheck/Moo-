const CACHE = 'life-eapp-v1';
const ASSETS = [
  './life_eapp_trainer_pwa.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE && caches.delete(k)))).then(self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(resp => {
      // Cache new GET requests
      if (e.request.method === 'GET') {
        const respClone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, respClone));
      }
      return resp;
    }).catch(() => caches.match('./life_eapp_trainer_pwa.html')))
  );
});
