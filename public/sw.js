const CACHE_NAME = 'tunisian-belote-v12';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/css/style.css?v=12',
  '/js/state-connection.js?v=12',
  '/js/audio.js?v=12',
  '/js/packets.js?v=12',
  '/js/lobby.js?v=12',
  '/js/table.js?v=12',
  '/js/actions.js?v=12',
  '/js/local-demo.js?v=12',
  '/js/app.js?v=12'
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});