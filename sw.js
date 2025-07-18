const CACHE_NAME = 'pixel-plan-v8'; // Incremented version to ensure an update.

// This list now includes ALL critical resources, including third-party scripts and fonts.
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.development.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://fonts.googleapis.com/css2?family=Pangolin&family=Roboto:wght@400;500;700&display=swap'
];

// Install event: Caches all the critical resources listed above.
// If any of these fail to download, the installation will fail, which is important for debugging.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching all critical app resources.');
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch(error => {
                console.error('Failed to cache critical resources during install:', error);
            })
    );
});

// Activate event: Cleans up old caches to prevent conflicts.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event: A simple and reliable "Cache First" strategy.
// It checks the cache for a resource. If it's not there, it fetches from the network.
// This works because the install step has already cached everything the app needs to run offline.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
