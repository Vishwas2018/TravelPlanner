/**
 * Travel Itinerary Manager - Main Entry Point
 * Initializes and bootstraps the application
 */

import { Application } from './app/Application.js';
import { APP_CONFIG } from './core/constants.js';

/**
 * Application bootstrap and initialization
 */
class AppBootstrap {
    constructor() {
        this.app = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log(`🌍 Initializing ${APP_CONFIG.name} v${APP_CONFIG.version}`);

            // Check browser compatibility
            if (!this.checkBrowserCompatibility()) {
                this.showBrowserCompatibilityError();
                return;
            }

            // Wait for DOM to be ready
            await this.waitForDOM();

            // Wait for external libraries to load
            await this.waitForLibraries();

            // Initialize application
            this.app = new Application({
                container: '#appContent',
                theme: this.getPreferredTheme(),
                autoSave: true,
                keyboardShortcuts: true
            });

            // Make app globally accessible
            window.app = this.app;

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

            // Setup global error handlers
            this.setupGlobalErrorHandlers();

            // Setup service worker
            this.setupServiceWorker();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Check if browser supports required features
     */
    checkBrowserCompatibility() {
        const requiredFeatures = [
            'fetch',
            'Promise',
            'Map',
            'Set',
            'localStorage',
            'addEventListener',
            'querySelector',
            'classList'
        ];

        const missingFeatures = requiredFeatures.filter(feature => {
            if (feature === 'fetch') return !window.fetch;
            if (feature === 'Promise') return !window.Promise;
            if (feature === 'Map') return !window.Map;
            if (feature === 'Set') return !window.Set;
            if (feature === 'localStorage') return !window.localStorage;
            if (feature === 'addEventListener') return !window.addEventListener;
            if (feature === 'querySelector') return !document.querySelector;
            if (feature === 'classList') return !document.documentElement.classList;
            return false;
        });

        if (missingFeatures.length > 0) {
            console.error('Missing required features:', missingFeatures);
            return false;
        }

        return true;
    }

    /**
     * Wait for DOM to be ready
     */
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Wait for external libraries to load
     */
    async waitForLibraries() {
        const libraries = [
            { name: 'XLSX', global: 'XLSX' },
            { name: 'Papa Parse', global: 'Papa' }
        ];

        const checkLibrary = (globalName) => {
            return window[globalName] !== undefined;
        };

        // Wait for libraries with timeout
        const timeout = 10000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const allLoaded = libraries.every(lib => checkLibrary(lib.global));

            if (allLoaded) {
                console.log('✅ All external libraries loaded');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Check which libraries failed to load
        const missingLibraries = libraries.filter(lib => !checkLibrary(lib.global));

        if (missingLibraries.length > 0) {
            console.warn('⚠️ Some libraries failed to load:', missingLibraries.map(lib => lib.name));
            // Continue anyway - the app can work without some libraries
        }
    }

    /**
     * Get user's preferred theme
     */
    getPreferredTheme() {
        // Check localStorage first
        const stored = localStorage.getItem('travel-app-theme');
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', async event => {
            console.error('Unhandled promise rejection:', event.reason);

            // Show user-friendly error message
            if (this.app && this.app.isReady()) {
                try {
                    const {notificationService} = await import('./services/NotificationService.js');
                    notificationService.error('An unexpected error occurred. Please try refreshing the page.');
                } catch (e) {
                    console.error('Failed to show error notification:', e);
                }
            }

            event.preventDefault();
        });

        // Global JavaScript errors
        window.addEventListener('error', async event => {
            console.error('Global error:', event.error || event.message);

            // Show user-friendly error message
            if (this.app && this.app.isReady()) {
                try {
                    const {notificationService} = await import('./services/NotificationService.js');
                    notificationService.error('A system error occurred. Some features may not work properly.');
                } catch (e) {
                    console.error('Failed to show error notification:', e);
                }
            }
        });

        // Resource loading errors
        window.addEventListener('error', event => {
            if (event.target !== window && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
                console.error('Resource loading error:', event.target.src || event.target.href);
            }
        }, true);
    }

    /**
     * Setup service worker
     */
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                this.showUpdateAvailable();
                            }
                        });
                    }
                });

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    const { type, data } = event.data;

                    switch (type) {
                        case 'BACKGROUND_SYNC_COMPLETE':
                            console.log('Background sync completed');
                            break;
                        default:
                            console.log('Service Worker message:', type, data);
                    }
                });

            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        } else {
            console.warn('Service Worker not supported');
        }
    }

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        if (this.app && this.app.isReady()) {
            import('./services/NotificationService.js').then(({ notificationService }) => {
                notificationService.info('A new version is available!', {
                    persistent: true,
                    actions: [
                        {
                            label: 'Update Now',
                            handler: () => {
                                window.location.reload();
                            }
                        },
                        {
                            label: 'Later',
                            handler: () => {}
                        }
                    ]
                });
            });
        }
    }

    /**
     * Show browser compatibility error
     */
    showBrowserCompatibilityError() {
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
                        Your browser doesn't support all the features required for this application.
                        Please update your browser or try a modern browser like Chrome, Firefox, or Safari.
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

    /**
     * Show initialization error
     */
    showInitializationError(error) {
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
                    <h1 style="margin-bottom: 1rem;">❌ Initialization Error</h1>
                    <p style="margin-bottom: 1rem; line-height: 1.6;">
                        The application failed to start properly. This might be due to:
                    </p>
                    <ul style="text-align: left; margin-bottom: 2rem; line-height: 1.6;">
                        <li>Network connectivity issues</li>
                        <li>Browser compatibility problems</li>
                        <li>Corrupted local data</li>
                    </ul>
                    <details style="margin-bottom: 2rem; text-align: left;">
                        <summary style="cursor: pointer; margin-bottom: 0.5rem;">Technical Details</summary>
                        <pre style="
                            background: rgba(0, 0, 0, 0.2);
                            padding: 1rem;
                            border-radius: 0.5rem;
                            overflow: auto;
                            font-size: 0.75rem;
                            white-space: pre-wrap;
                        ">${error.message || 'Unknown error'}</pre>
                    </details>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 0.5rem;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Reload Page
                        </button>
                        <button onclick="localStorage.clear(); location.reload()" style="
                            background: transparent;
                            color: white;
                            border: 1px solid white;
                            padding: 0.75rem 2rem;
                            border-radius: 0.5rem;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Clear Data & Reload
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get application instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Check if application is initialized
     */
    isReady() {
        return this.isInitialized && this.app && this.app.isReady();
    }

    /**
     * Get application version
     */
    getVersion() {
        return APP_CONFIG.version;
    }

    /**
     * Restart application
     */
    async restart() {
        if (this.app) {
            this.app.dispose();
            this.app = null;
        }

        this.isInitialized = false;
        await this.init();
    }

    /**
     * Handle application errors gracefully
     */
    handleError(error, context = 'Unknown') {
        console.error(`Application error in ${context}:`, error);

        // Try to show user-friendly error
        if (this.app && this.app.isReady()) {
            try {
                import('./services/NotificationService.js').then(({ notificationService }) => {
                    notificationService.error(`Error in ${context}. Please try again or reload the page.`);
                });
            } catch (e) {
                console.error('Failed to show error notification:', e);
            }
        }
    }
}

// Create global bootstrap instance
const bootstrap = new AppBootstrap();

// Initialize on page load
bootstrap.init().catch(error => {
    console.error('Bootstrap initialization failed:', error);
});

// Export for debugging and testing
window.TravelApp = {
    bootstrap,
    getApp: () => bootstrap.getApp(),
    isReady: () => bootstrap.isReady(),
    version: APP_CONFIG.version,
    restart: () => bootstrap.restart(),
    handleError: (error, context) => bootstrap.handleError(error, context)
};

// Handle app visibility changes
document.addEventListener('visibilitychange', () => {
    if (bootstrap.isReady()) {
        const app = bootstrap.getApp();
        if (document.hidden) {
            // App is hidden - could pause some operations
            console.log('App hidden');
        } else {
            // App is visible - could resume operations or check for updates
            console.log('App visible');
            app.updateLastActivity();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('App online');
    if (bootstrap.isReady()) {
        import('./services/NotificationService.js').then(({ notificationService }) => {
            notificationService.success('Back online! 🌐');
        });
    }
});

window.addEventListener('offline', () => {
    console.log('App offline');
    if (bootstrap.isReady()) {
        import('./services/NotificationService.js').then(({ notificationService }) => {
            notificationService.warning('You are offline. Changes will be saved locally. 📱');
        });
    }
});

export default bootstrap;