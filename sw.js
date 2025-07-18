// UPDATED: A new, more robust service worker implementation.
const CACHE_NAME = 'pixel-plan-v6'; // Changed version to force update
const FONT_CACHE_NAME = 'google-fonts-cache-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Note: CDN resources are now cached at runtime, not in the initial install.
  // This makes the installation faster and more reliable.
];

// Install event: caches the core app shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: clears old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any caches that are not our current app shell or font cache
          if (cacheName !== CACHE_NAME && cacheName !== FONT_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serves responses from cache or network.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Strategy 1: Stale-While-Revalidate for Google Fonts
  // This serves fonts from the cache immediately for speed and fetches updates in the background.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache First for all other requests (including CDN scripts)
  // This is the most reliable strategy for app resources.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's not in the cache, fetch it from the network.
        return fetch(event.request).then(networkResponse => {
            // IMPORTANT: This is the critical fix. We now cache responses from CDNs.
            // We clone the response because it's a stream that can only be consumed once.
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
            });
            return networkResponse;
        });
      })
  );
});
