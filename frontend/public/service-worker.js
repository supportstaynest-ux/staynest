const CACHE_NAME = 'staynest-cache-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/style.css',
    '/src/style.css',
    '/src/main.js',
    '/src/js/state.js',
    '/src/js/router.js',
    '/src/js/supabase.js'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting()) // Force new service worker to activate
    );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
    const cacheWhiteList = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhiteList.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Network First for HTML and Supabase, Cache First for Static Assets
self.addEventListener('fetch', (event) => {
    // 1. Skip caching for Supabase API requests (live DB data & Auth)
    if (event.request.url.includes('.supabase.co')) {
        return;
    }

    // 2. Skip non-GET requests (e.g., POST, DELETE)
    if (event.request.method !== 'GET') {
        return;
    }

    const isHtmlRequest = event.request.headers.get('accept').includes('text/html');
    const isNavigation = event.request.mode === 'navigate';

    // 3. Handle HTML/Navigation requests - Cache First for instant PWA local loads, then update in background
    if (isHtmlRequest || isNavigation) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Background network fetch to keep cache fresh
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
                    return networkResponse;
                }).catch(() => {
                    console.log('Network failed for HTML request');
                });

                // Return instantly from cache if available, otherwise wait for network
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetchPromise.catch(() => caches.match('/offline.html'));
            })
        );
        return;
    }

    // 4. Handle Static Assets (CSS, JS, Images) - Cache First, Network Fallback
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If it's in the cache, serve it instantly
                if (response) {
                    return response;
                }
                
                // Otherwise fetch it from the network
                return fetch(event.request).then((networkResponse) => {
                    // Don't cache bad responses directly
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Dynamically cache this new asset for future speed
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch((error) => {
                    console.log('Fetch failed for asset.', error);
                });
            })
    );
});
