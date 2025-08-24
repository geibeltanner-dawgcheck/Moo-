const CACHE="dawgtrainer-v5";
const ASSETS=[
  "./","./index.html","./styles.css","./app.js","./manifest.json",
  "./assets/icons/icon-192.png","./assets/icons/icon-512.png","./assets/city.jpg"
];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  if(e.request.destination==="document"){
    e.respondWith(fetch(e.request).then(r=>{
      caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{
      caches.open(CACHE).then(cc=>cc.put(e.request,r.clone()));return r;
    })));
  }
});
