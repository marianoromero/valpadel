// Progressive Web App Service Worker with auto-update
const CACHE_NAME = 'valpadel-v1.2.0';
const VERSION = '1.2.0';

self.addEventListener('install', event => {
  console.log('SW: Install event - Version:', VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  console.log('SW: Activate event - Version:', VERSION);
  event.waitUntil(
    // Clear all caches to force fresh content
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          console.log('SW: Deleting cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Force reload all clients
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          console.log('SW: Reloading client');
          client.navigate(client.url);
        });
      });
    })
  );
});

self.addEventListener('fetch', event => {
  // Network first strategy for HTML pages to always get latest
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // For other assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});