const CACHE_NAME = 'site-cache-v14-0';
const GOOGLE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@400;600;700&family=Geist:wght@400;700&family=Hanken+Grotesk:wght@400;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/privacy.html',
  '/terms.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/404.html',
  '/tools/number-generator.html',
  '/tools/name-picker.html',
  '/data/names-US.json',
  '/data/names-UK.json',
  '/data/names-AS.json',
  '/data/names-JP.json',
  ...GOOGLE_FONTS
];
const ASSETS_TO_CACHE = PRECACHE_ASSETS;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('googleads') || event.request.url.includes('adsense') || event.request.url.includes('doubleclick')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          try {
            const cachedResponse = await caches.match('/index.html');
            if (cachedResponse) {
              return cachedResponse;
            }
          } catch (cacheErr) {}
          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Offline</title></head><body><h1>App is offline. Please refresh.</h1></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      })()
    );
    return;
  }

  if (event.request.url.includes('names')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open('data-cache').then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
  
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(event.request);
        // Cache Google fonts dynamically
        if (event.request.url.startsWith('https://fonts.gstatic.com')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
