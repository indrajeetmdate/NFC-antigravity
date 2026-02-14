// QR Widget Service Worker - Cache-first strategy for offline access
const CACHE_NAME = 'qr-widget-v1';
const ASSETS_TO_CACHE = [
    '/qr-widget.html',
    '/qr-manifest.json',
    'https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

// Install: Pre-cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Cache-first, then network fallback
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache successful responses for future offline use
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // If both cache and network fail, return a basic offline response
                if (event.request.destination === 'document') {
                    return new Response(
                        '<html><body style="background:#09090b;color:#d7ba52;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><h1>Offline - Please reconnect</h1></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }
            });
        })
    );
});
