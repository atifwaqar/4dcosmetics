const CACHE_NAME = 'image-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(resp => {
          if (resp) return resp;
          return fetch(request).then(networkResp => {
            cache.put(request, networkResp.clone());
            return networkResp;
          });
        })
      )
    );
  }
});
