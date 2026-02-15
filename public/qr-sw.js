// QR Widget Service Worker - Cache-first strategy for offline access
const CACHE_NAME = 'qr-widget-v6';

// Critical assets cached during install (keep minimal for fast install)
const CRITICAL_ASSETS = [
    '/qr-widget.html',
    '/qr-manifest.json',
    '/CC_blackbg.png'
];

// Non-critical assets cached lazily after install
const LAZY_ASSETS = [
    'https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

// Install: Pre-cache only critical assets for fast install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CRITICAL_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: Clean up old caches, then lazy-cache remaining assets
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            // Lazy-cache non-critical assets in the background
            return caches.open(CACHE_NAME).then((cache) => {
                LAZY_ASSETS.forEach(url => {
                    cache.match(url).then(resp => {
                        if (!resp) fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => { });
                    });
                });
            });
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
