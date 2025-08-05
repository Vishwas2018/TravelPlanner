/**
 * Travel Itinerary Manager - Minimal Service Worker
 * Basic service worker to prevent 404 errors and provide minimal PWA functionality
 */

const CACHE_NAME = 'travel-manager-v2.0.0';
const APP_SHELL = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/main.js'
];

/**
 * Install event - cache essential files
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell...');
                return cache.addAll(APP_SHELL).catch(error => {
                    console.warn('Service Worker: Some files failed to cache:', error);
                    // Don't fail installation if some files can't be cached
                    return Promise.resolve();
                });
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Installation failed:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activation complete');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('Service Worker: Activation failed:', error);
            })
    );
});

/**
 * Fetch event - simple network-first strategy
 */
self.addEventListener('fetch', (event) => {
    // Only handle GET requests for same origin
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If network request is successful, return it
                if (response && response.status === 200) {
                    return response;
                }
                throw new Error('Network response not ok');
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        // If it's a navigation request and nothing in cache, return index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }

                        // For other requests, return a simple offline response
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
    const { type } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;

        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

console.log('Service Worker: Script loaded successfully');