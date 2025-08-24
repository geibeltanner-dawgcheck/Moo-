# /service-worker.js
const CACHE="dawgtrainer-v9";
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll([
    "./","./index.html","./styles.css","./app.js","./manifest.json",
    "./assets/icons/icon-192.png","./assets/icons/icon-512.png","./assets/city.jpg"
  ])));
  self.skipWaiting();
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const url = new URL(e.request.url);
  const noQuery = new Request(url.origin+url.pathname, {method:"GET",headers:e.request.headers,mode:e.request.mode,credentials:e.request.credentials,cache:"reload"});
  e.respondWith(
    caches.match(e.request).then(r=>r||
      caches.match(noQuery).then(r2=>r2||
        fetch(e.request).then(net=>{
          caches.open(CACHE).then(cc=>cc.put(noQuery, net.clone()));
          return net;
        })
      )
    )
  );
});