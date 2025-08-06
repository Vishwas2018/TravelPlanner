/**
 * Check if browser supports required features with more lenient requirements
 */
checkBrowserCompatibility() {
    // Relaxed feature requirements for better compatibility
    const coreFeatures = [
        'addEventListener',
        'querySelector',
        'localStorage'
    ];

    const missingFeatures = coreFeatures.filter(feature => {
        switch (feature) {
            case 'addEventListener': return !window.addEventListener;
            case 'querySelector': return !document.querySelector;
            case 'localStorage':
                try {
                    return !window.localStorage;
                } catch (e) {
                    return true;
                }
            default: return false;
        }
    });

    if (missingFeatures.length > 0) {
        console.error('Missing critical features:', missingFeatures);
        return false;
    }

    // Add polyfills for missing features
    this.addPolyfills();

    return true;
}

/**
 * Add polyfills for older browsers
 */
addPolyfills() {
    // Promise polyfill (very basic)
    if (typeof Promise === 'undefined') {
        window.Promise = function(executor) {
            var self = this;
            this.state = 'pending';
            this.value = undefined;
            this.handlers = [];

            function resolve(value) {
                if (self.state === 'pending') {
                    self.state = 'fulfilled';
                    self.value = value;
                    self.handlers.forEach(function(handler) {
                        handler.onFulfilled(value);
                    });
                }
            }

            function reject(reason) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = reason;
                    self.handlers.forEach(function(handler) {
                        handler.onRejected(reason);
                    });
                }
            }

            this.then = function(onFulfilled, onRejected) {
                return new Promise(function(resolve, reject) {
                    function handle() {
                        if (self.state === 'fulfilled') {
                            if (onFulfilled) {
                                try { resolve(onFulfilled(self.value)); }
                                catch (e) { reject(e); }
                            } else resolve(self.value);
                        } else if (self.state === 'rejected') {
                            if (onRejected) {
                                try { resolve(onRejected(self.value)); }
                                catch (e) { reject(e); }
                            } else reject(self.value);
                        } else {
                            self.handlers.push({ onFulfilled: onFulfilled, onRejected: onRejected });
                        }
                    }
                    handle();
                });
            };

            try { executor(resolve, reject); }
            catch (e) { reject(e); }
        };
    }

    // Map polyfill
    if (typeof Map === 'undefined') {
        window.Map = function() {
            this.keys = [];
            this.values = [];

            this.set = function(key, value/**
             * Travel Itinerary Manager - Initialization Script
             * CSP-compliant external script for initialization functions
             */

// Service Worker Registration with Error Handling
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                    try {
                        // Check if sw.js exists before attempting to register
                        const swResponse = await fetch('./sw.js', { method: 'HEAD' });
                        if (swResponse && swResponse.ok) {
                            const registration = await navigator.serviceWorker.register('./sw.js');
                            console.log('✅ Service Worker registered successfully:', registration);

                            // Listen for updates
                            registration.addEventListener('updatefound', () => {
                                const newWorker = registration.installing;
                                if (newWorker) {
                                    newWorker.addEventListener('statechange', () => {
                                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                            console.log('🔄 New version available');
                                            // Could show update notification here
                                        }
                                    });
                                }
                            });
                        } else {
                            console.log('ℹ️ Service Worker not available (sw.js not found)');
                        }
                    } catch (error) {
                        console.warn('⚠️ Service Worker registration failed:', error.message);
                    }
                });
            } else {
                console.log('ℹ️ Service Worker not supported in this browser');
            }

// Remove loader after maximum timeout
            setTimeout(() => {
                const loader = document.getElementById('initialLoader');
                if (loader && !loader.classList.contains('hidden')) {
                    loader.classList.add('hidden');
                    document.getElementById('appContent').classList.add('loaded');
                    console.warn('⚠️ Application took longer than expected to load');
                }
            }, 15000);

// Global error handler
            window.addEventListener('error', (event) => {
                console.error('🚨 Global error:', event.error);
                showErrorFallback(event.error?.message || 'An unexpected error occurred');
            });

            window.addEventListener('unhandledrejection', (event) => {
                console.error('🚨 Unhandled promise rejection:', event.reason);
                showErrorFallback(event.reason?.message || 'An unexpected error occurred');
            });

// Error fallback function
            function showErrorFallback(message) {
                const appContent = document.getElementById('appContent');
                const loader = document.getElementById('initialLoader');

                if (loader) loader.classList.add('hidden');

                if (appContent && !appContent.innerHTML.trim()) {
                    appContent.innerHTML = `
            <div class="error-container">
                <div class="error-content">
                    <h1 style="margin-bottom: 1rem;">❌ Application Error</h1>
                    <p style="margin-bottom: 2rem; line-height: 1.6;">
                        ${message}
                    </p>
                    <div>
                        <button class="error-button" onclick="location.reload()">
                            🔄 Reload Application
                        </button>
                        <button class="error-button" onclick="localStorage.clear(); location.reload()">
                            🗑️ Clear Data & Reload
                        </button>
                    </div>
                </div>
            </div>
        `;
                    appContent.classList.add('loaded');
                }
            }

// Make showErrorFallback globally available
            window.showErrorFallback = showErrorFallback;

// Enhanced browser compatibility check - Fixed for modern browsers
            function checkBrowserCompatibility() {
                // Only check truly essential features
                try {
                    // Basic DOM support
                    if (!document.querySelector || !window.addEventListener) {
                        return false;
                    }

                    // Basic storage (with error handling for privacy mode)
                    try {
                        localStorage.setItem('test', 'test');
                        localStorage.removeItem('test');
                    } catch (e) {
                        console.warn('localStorage may be restricted');
                    }

                    // Modern browsers (including Chrome 130) will pass this
                    return true;
                } catch (error) {
                    console.error('Browser compatibility error:', error);
                    return false;
                }
            }

// Add minimal polyfills only if needed
            if (typeof fetch === 'undefined') {
                // Simple fetch polyfill for very old browsers
                window.fetch = function(url, options) {
                    return new Promise(function(resolve, reject) {
                        var xhr = new XMLHttpRequest();
                        xhr.open((options && options.method) || 'GET', url);
                        xhr.onload = function() {
                            resolve({
                                ok: xhr.status >= 200 && xhr.status < 300,
                                status: xhr.status,
                                text: function() { return Promise.resolve(xhr.responseText); }
                            });
                        };
                        xhr.onerror = reject;
                        xhr.send((options && options.body) || null);
                    });
                };
            }

// Run compatibility check
            if (!checkBrowserCompatibility()) {
                console.warn('Some browser features may be limited');
            }