const CACHE_NAME = 'eokul-vbs-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});


self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;


  const url = new URL(req.url);


  // Never intercept cross-origin requests (api.github.com, raw.githubusercontent.com)
  if (url.origin !== self.location.origin) return;


  // Never cache live data.json or panel.html
  if (url.pathname.endsWith('data.json') || url.pathname.endsWith('panel.html')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }


  // Network-first for HTML/manifest so OTA updates apply immediately
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }


  // Cache-first for static assets (icons)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});