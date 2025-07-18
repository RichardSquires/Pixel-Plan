// A new, more reliable service worker.
const CACHE_NAME = 'pixel-plan-v7'; // Changed version to force update.
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event: Pre-caches the core application shell.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(APP_SHELL_URLS);
            })
    );
});

// Activate event: Cleans up old caches.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: Applies a cache-first strategy.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // If the resource is in the cache, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If it's not in the cache, fetch it from the network.
                return fetch(event.request).then(networkResponse => {
                    // Clone the response because it's a one-time-use stream.
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            // Cache the new resource for future offline use.
                            cache.put(event.request, responseToCache);
                        });

                    return networkResponse;
                });
            })
    );
});
