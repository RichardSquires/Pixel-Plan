const CACHE_NAME = "pixel-plan-v10"; // Updated version
const STATIC_CACHE_NAME = "pixel-plan-static-v10"; // Updated version
const RUNTIME_CACHE_NAME = "pixel-plan-runtime-v10"; // Updated version


// Core app resources that must be cached
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192x192.png",
  "./icon-512x512.png",
];

// External resources to cache with network-first strategy
const EXTERNAL_RESOURCES = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/react@18/umd/react.development.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.development.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://fonts.googleapis.com/css2?family=Pangolin&display=swap",
];

// Install event - cache core files
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching core app files");
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log("Service Worker: Skip waiting");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Failed to cache core files:", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== RUNTIME_CACHE_NAME
            ) {
              console.log("Service Worker: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("Service Worker: Claiming clients");
        return self.clients.claim();
      }),
  );
});

// Fetch event - implement cache strategies
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore IndexedDB requests
  if (request.url.includes("idb-get") || request.url.includes("idb-put")) {
    return;
  }

  // Handle core app files with cache-first strategy
  if (CORE_FILES.some((file) => request.url.includes(file.replace("./", "")))) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          return (
            response ||
            fetch(request).then((fetchResponse) => {
              const responseClone = fetchResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
              return fetchResponse;
            })
          );
        })
        .catch(() => {
          // Fallback for core files
          if (request.url.includes("index.html") || request.url.endsWith("/")) {
            return caches.match("./index.html");
          }
        }),
    );
    return;
  }

  // Handle external resources with network-first strategy
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for external resources
          return caches.match(request);
        }),
    );
    return;
  }

  // Default strategy for other requests
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    }),
  );
});


// Handle background sync for offline functionality
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered");
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Placeholder for background sync logic
  return Promise.resolve();
}

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push message received");

  const options = {
    body: event.data ? event.data.text() : "New notification from Pixel Plan",
    icon: "./icon-192x192.png",
    badge: "./icon-192x192.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "./icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "./icon-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Pixel Plan", options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification click received");

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("./"));
  }
});
