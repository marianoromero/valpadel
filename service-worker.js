const CACHE_NAME = 'valpadel-cache-v4';
const BASE_URL = '/valpadel/';
const urlsToCache = [
  BASE_URL,
  BASE_URL + 'index.html',
  BASE_URL + 'assets/index.css',
  BASE_URL + 'assets/index.js',
  BASE_URL + 'ValPadelLogo.png',
  BASE_URL + 'logo192.png',
  BASE_URL + 'logo512.png',
  BASE_URL + 'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        // For navigation requests, always return index.html
        if (event.request.mode === 'navigate' || 
            event.request.headers.get('accept').includes('text/html')) {
          return fetch(BASE_URL + 'index.html')
            .then(response => {
              return response;
            })
            .catch(() => {
              return caches.match(BASE_URL + 'index.html');
            });
        }

        // For other requests, try network first, then cache
        return fetch(event.request)
          .then(response => {
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
