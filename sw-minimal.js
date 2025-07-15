// Minimal Service Worker that works
const CACHE_NAME = 'valpadel-v1';

self.addEventListener('install', event => {
  console.log('SW: Install event');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('SW: Activate event');
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Just pass through to network - no caching for now
  event.respondWith(fetch(event.request));
});