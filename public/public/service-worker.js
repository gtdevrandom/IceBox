const CACHE_NAME = "icebox-v1";
const ASSETS = [
  "/IceBox/",
  "/IceBox/index.html",
  "/IceBox/style.css",
  "/IceBox/src/app.js",
  "/IceBox/src/firebase.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});
