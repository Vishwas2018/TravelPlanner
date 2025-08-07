/**
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
        const appContent = document.getElementById('appContent');
        if (appContent) {
            appContent.classList.add('loaded');
        }
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
                        ${escapeHtml(message)}
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

// Simple HTML escape function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make showErrorFallback globally available
window.showErrorFallback = showErrorFallback;

// Enhanced browser compatibility check
function checkBrowserCompatibility() {
    try {
        // Only check truly essential features
        if (!document.querySelector || !window.addEventListener) {
            return false;
        }

        // Basic storage (with error handling for privacy mode)
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            console.warn('localStorage may be restricted');
            // Don't fail compatibility for localStorage issues
        }

        // Modern browsers will pass this - remove strict ES6 check
        return true;
    } catch (error) {
        console.error('Browser compatibility error:', error);
        return false;
    }
}

// Add minimal polyfills only if needed
function addPolyfills() {
    // Promise polyfill for very old browsers
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
                        if (handler.onFulfilled) handler.onFulfilled(value);
                    });
                }
            }

            function reject(reason) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = reason;
                    self.handlers.forEach(function(handler) {
                        if (handler.onRejected) handler.onRejected(reason);
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
                            self.handlers.push({
                                onFulfilled: onFulfilled,
                                onRejected: onRejected
                            });
                        }
                    }
                    handle();
                });
            };

            this.catch = function(onRejected) {
                return this.then(null, onRejected);
            };

            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        };

        // Add static methods
        Promise.resolve = function(value) {
            return new Promise(function(resolve) { resolve(value); });
        };

        Promise.reject = function(reason) {
            return new Promise(function(resolve, reject) { reject(reason); });
        };
    }

    // Map polyfill for older browsers
    if (typeof Map === 'undefined') {
        window.Map = function() {
            this.keys = [];
            this.values = [];

            this.set = function(key, value) {
                var index = this.keys.indexOf(key);
                if (index === -1) {
                    this.keys.push(key);
                    this.values.push(value);
                } else {
                    this.values[index] = value;
                }
                return this;
            };

            this.get = function(key) {
                var index = this.keys.indexOf(key);
                return index === -1 ? undefined : this.values[index];
            };

            this.has = function(key) {
                return this.keys.indexOf(key) !== -1;
            };

            this.delete = function(key) {
                var index = this.keys.indexOf(key);
                if (index !== -1) {
                    this.keys.splice(index, 1);
                    this.values.splice(index, 1);
                    return true;
                }
                return false;
            };

            this.clear = function() {
                this.keys = [];
                this.values = [];
            };

            Object.defineProperty(this, 'size', {
                get: function() { return this.keys.length; }
            });
        };
    }

    // Set polyfill for older browsers
    if (typeof Set === 'undefined') {
        window.Set = function() {
            this.values = [];

            this.add = function(value) {
                if (this.values.indexOf(value) === -1) {
                    this.values.push(value);
                }
                return this;
            };

            this.has = function(value) {
                return this.values.indexOf(value) !== -1;
            };

            this.delete = function(value) {
                var index = this.values.indexOf(value);
                if (index !== -1) {
                    this.values.splice(index, 1);
                    return true;
                }
                return false;
            };

            this.clear = function() {
                this.values = [];
            };

            Object.defineProperty(this, 'size', {
                get: function() { return this.values.length; }
            });
        };
    }

    // Fetch polyfill for very old browsers
    if (typeof fetch === 'undefined') {
        window.fetch = function(url, options) {
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open((options && options.method) || 'GET', url);

                if (options && options.headers) {
                    for (var header in options.headers) {
                        xhr.setRequestHeader(header, options.headers[header]);
                    }
                }

                xhr.onload = function() {
                    resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        text: function() {
                            return Promise.resolve(xhr.responseText);
                        },
                        json: function() {
                            return Promise.resolve(JSON.parse(xhr.responseText));
                        }
                    });
                };

                xhr.onerror = function() {
                    reject(new Error('Network error'));
                };

                xhr.send((options && options.body) || null);
            });
        };
    }
}

// Show browser compatibility error
function showBrowserCompatibilityError() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 2rem;
        ">
            <div style="
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 1rem;
                padding: 3rem;
                max-width: 500px;
            ">
                <h1 style="margin-bottom: 1rem;">⚠️ Browser Not Supported</h1>
                <p style="margin-bottom: 2rem; line-height: 1.6;">
                    Your browser doesn't support all features required for this application.
                    Please update your browser or try Chrome, Firefox, or Safari.
                </p>
                <div style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Recommended Browsers:</h3>
                    <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                        <li>Chrome 80+</li>
                        <li>Firefox 75+</li>
                        <li>Safari 13+</li>
                        <li>Edge 80+</li>
                    </ul>
                </div>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Try Again
                </button>
            </div>
        </div>
    `;
}

// Run compatibility check and add polyfills
if (!checkBrowserCompatibility()) {
    addPolyfills();
    // Recheck after polyfills
    if (!checkBrowserCompatibility()) {
        showBrowserCompatibilityError();
    } else {
        console.log('✅ Browser compatibility restored with polyfills');
    }
} else {
    console.log('✅ Browser fully compatible');
}

console.log('🚀 Initialization script loaded successfully');