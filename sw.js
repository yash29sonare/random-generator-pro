const CACHE_NAME = 'rg-pro-v22';

const PRECACHE_ASSETS = [
  './index.html',
  './rgp-app.js',
  './about.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './favicon.svg',
  './icon-192x192.png',
  './icon-512x512.png',
  './404.html',
  './tools/number-generator.html',
  './tools/name-picker.html',
  './data/names-US.json',
  './data/names-UK.json',
  './data/names-AS.json',
  './data/names-JP.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (!(event.request.url.indexOf('http') === 0)) return;

  if (
    event.request.url.includes('googleads') ||
    event.request.url.includes('adsense') ||
    event.request.url.includes('doubleclick')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse =
            await caches.match(event.request, { ignoreSearch: true }) ||
            await caches.match('./index.html', { ignoreSearch: true }) ||
            await caches.match('/index.html', { ignoreSearch: true });

          if (cachedResponse) return cachedResponse;

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Offline</title></head><body><h1>Random Generator Pro is offline</h1><p>Please reconnect and reload.</p></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=UTF-8' }
            }
          );
        }
      })()
    );
    return;
  }

  if (event.request.url.includes('/data/names-')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return new Response('[]', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' }
          });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return new Response('Network error', {
          status: 408,
          statusText: 'Request Timeout',
          headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
        });
      }
    })()
  );
});
