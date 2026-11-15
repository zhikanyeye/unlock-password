const CACHE_NAME = 'qingyun-static-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(STATIC_ASSETS))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_ASSETS' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.slice(0, 64).filter(path =>
    typeof path === 'string' && /^\/assets\/[A-Za-z0-9/_-]+\.(js|css)$/.test(path));
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    Promise.all(urls.map(path => cache.add(path).catch(() => undefined)))));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  // Ciphertext API responses must never be cached; cached responses would bypass expiry.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match('/index.html')) || Response.error()));
    return;
  }
  if (url.pathname.startsWith('/assets/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(async cached => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }));
  }
});
