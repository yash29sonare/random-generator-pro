const CACHE_NAME = 'rg-pro-v2';
const GOOGLE_FONTS = [
  'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow:wght@400;600;700&family=Geist:wght@400;700&family=Hanken+Grotesk:wght@400;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

const ASSETS_TO_CACHE = [
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
  ...GOOGLE_FONTS
];

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

      try {
        const styleMinRes = await fetch('./style.min.css');
        if (styleMinRes.ok) {
          await cache.put('./style.min.css', styleMinRes);
        } else {
          await cache.add('./style.css');
        }
      } catch (e) {
        await cache.add('./style.css');
      }
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
  if (event.request.url.includes('data/names-')) {
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
        console.error("Fetch failed; returning offline page instead.", error);
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
