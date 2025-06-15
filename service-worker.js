// service-worker.js
const CACHE_NAME = 'chatwm-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Tambahkan file CSS atau JS lain jika ada
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});