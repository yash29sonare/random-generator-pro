const CACHE_NAME = 'rg-pro-v13';
const GOOGLE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@400;600;700&family=Geist:wght@400;700&family=Hanken+Grotesk:wght@400;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/404.html',
  '/privacy.html',
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
      
      // Cache basic assets
      await cache.addAll(ASSETS_TO_CACHE);

      // Check minified vs non-minified
      try {
        const engMinRes = await fetch('./engine.min.js');
        if (engMinRes.ok) {
          await cache.put('./engine.min.js', engMinRes);
        } else {
          await cache.add('./engine.js');
        }
      } catch (e) {
        await cache.add('./engine.js');
      }

      // Critical CSS is now inlined, no need to cache style.min.css separately
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
      await clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('googleads') || event.request.url.includes('adsense') || event.request.url.includes('doubleclick')) return;

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
