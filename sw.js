/**
 * Travel Itinerary Manager - Service Worker
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'travel-manager-v2.0.0';
const STATIC_CACHE = 'travel-manager-static-v2.0.0';
const DYNAMIC_CACHE = 'travel-manager-dynamic-v2.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/manifest.json',
    '/js/main.js',
    '/js/app/Application.js',
    '/js/core/constants.js',
    '/js/core/events.js',
    '/js/core/storage.js',
    '/js/core/utils.js',
    '/js/data/ActivityModel.js',
    '/js/data/DataManager.js',
    '/js/data/FileHandler.js',
    '/js/components/Modal.js',
    '/js/services/NotificationService.js',
    '/js/services/ValidationService.js',
    '/js/views/ViewManager.js',
    '/js/views/DashboardView.js',
    '/js/views/ItineraryView.js',
    '/js/views/TimelineView.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

/**
 * Install event - cache static resources
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('Service Worker: Caching static files...');
                return cache.addAll(STATIC_FILES);
            }),
            // Cache external resources
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('Service Worker: Caching external resources...');
                return Promise.allSettled(
                    EXTERNAL_RESOURCES.map(url =>
                        cache.add(url).catch(err =>
                            console.warn(`Failed to cache ${url}:`, err)
                        )
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            return self.skipWaiting();
        })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

/**
 * Fetch event - serve cached content and implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!request.url.startsWith('http')) {
        return;
    }

    // Handle different types of requests
    if (STATIC_FILES.includes(url.pathname) || EXTERNAL_RESOURCES.includes(request.url)) {
        // Static files - Cache First strategy
        event.respondWith(cacheFirstStrategy(request));
    } else if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) {
        // API calls and external resources - Network First strategy
        event.respondWith(networkFirstStrategy(request));
    } else {
        // Other requests - Stale While Revalidate strategy
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

/**
 * Cache First Strategy - Serve from cache, fallback to network
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('Cache First failed:', error);

        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            const cachedResponse = await caches.match('/index.html');
            return cachedResponse || createOfflineFallback();
        }

        throw error;
    }
}

/**
 * Network First Strategy - Try network first, fallback to cache
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('Network First failed, trying cache:', error);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

/**
 * Stale While Revalidate Strategy - Serve from cache and update in background
 */
async function staleWhileRevalidateStrategy(request) {
    const cachedResponse = await caches.match(request);

    const networkResponsePromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn('Stale While Revalidate network failed:', error);
        return null;
    });

    // Return cached version immediately if available
    if (cachedResponse) {
        return cachedResponse;
    }

    // Otherwise wait for network response
    return networkResponsePromise || createOfflineFallback();
}

/**
 * Create offline fallback response
 */
function createOfflineFallback() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Travel Manager - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    text-align: center;
                    padding: 2rem;
                }
                .offline-content {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 1rem;
                    padding: 3rem;
                    max-width: 500px;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    margin-bottom: 1rem;
                    font-size: 1.5rem;
                }
                p {
                    margin-bottom: 2rem;
                    line-height: 1.6;
                    opacity: 0.9;
                }
                button {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                }
                button:hover {
                    background: #f0f0f0;
                }
            </style>
        </head>
        <body>
            <div class="offline-content">
                <div class="offline-icon">📡</div>
                <h1>You're Offline</h1>
                <p>
                    Travel Manager is currently offline. Your data is safely stored locally 
                    and will sync when you're back online.
                </p>
                <button onclick="location.reload()">
                    Try Again
                </button>
            </div>
        </body>
        </html>
    `;

    return new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
    });
}

/**
 * Background sync for data synchronization
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

/**
 * Handle background sync
 */
async function handleBackgroundSync() {
    try {
        console.log('Service Worker: Background sync triggered');

        // Here you could sync data with a server
        // For now, we'll just log that sync was attempted

        // Notify the app that sync completed
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC_COMPLETE',
                timestamp: Date.now()
            });
        });

    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

/**
 * Push notifications (if needed in future)
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'You have a new travel notification',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        tag: 'travel-notification',
        renotify: true,
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View Details'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Travel Manager', options)
    );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                // If app is already open, focus it
                for (const client of clients) {
                    if (client.url.includes('/') && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Otherwise open new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME
            });
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({
                    success: true
                });
            });
            break;

        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'travel-data-sync') {
        event.waitUntil(handlePeriodicSync());
    }
});

/**
 * Handle periodic sync
 */
async function handlePeriodicSync() {
    try {
        console.log('Service Worker: Periodic sync triggered');

        // Here you could perform regular data sync operations
        // For example, checking for travel updates, weather, etc.

    } catch (error) {
        console.error('Periodic sync failed:', error);
    }
}

console.log('Service Worker: Script loaded');