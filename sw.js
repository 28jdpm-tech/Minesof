// Service Worker disabled per user request
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    return caches.delete(cache);
                })
            );
        }).then(() => {
            return self.registration.unregister();
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Do nothing, let browser handle normally
});

