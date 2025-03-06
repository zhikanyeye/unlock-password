// 缓存名称和版本
const CACHE_NAME = 'jiapass-cache-v2';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/vite.svg',
  '/manifest.json',
  '/assets/vendor-*.js',
  '/assets/ui-*.js',
  '/assets/crypto-*.js',
  '/assets/index-*.js',
  '/assets/index-*.css'
];

// 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker 并清理旧缓存
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 删除旧版本缓存
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求 - 使用缓存优先策略
self.addEventListener('fetch', (event) => {
  // 对 API 请求使用网络优先策略
  if (event.request.url.includes('api.jiapass.workers.dev')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // 对静态资源使用缓存优先策略
  event.respondWith(cacheFirst(event.request));
});

// 缓存优先策略
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    // 只缓存成功的响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 如果网络请求失败，尝试返回任何可能的缓存
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // 只缓存成功的响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}