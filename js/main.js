/**
 * Travel Itinerary Manager - Complete Main Entry Point
 * Bootstrap module with comprehensive initialization and error handling
 */

import { Application } from './app/Application.js';
import { notificationService } from './services/NotificationService.js';

/**
 * Application Bootstrap Class
 * Handles application initialization, dependency management, and lifecycle
 */
class AppBootstrap {
    constructor() {
        this.app = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.dependencies = {
            xlsx: false,
            papa: false,
            dom: false
        };
        this.startTime = performance.now();
    }

    /**
     * Initialize the application
     * @returns {Promise<Application>} Initialized application instance
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInit();
        return this.initPromise;
    }

    /**
     * Internal initialization method
     * @private
     */
    async _performInit() {
        try {
            console.log('🌍 Starting Travel Itinerary Manager...');

            // Step 1: Check browser compatibility
            this._checkBrowserCompatibility();

            // Step 2: Wait for all dependencies
            await this._waitForDependencies();

            // Step 3: Initialize theme
            this._initializeTheme();

            // Step 4: Initialize application
            await this._initializeApplication();

            // Step 5: Setup global error handlers
            this._setupGlobalErrorHandlers();

            // Step 6: Setup auto-save
            this._setupAutoSave();

            // Step 7: Register service worker (optional)
            try {
                await this._registerServiceWorker();
            } catch (error) {
                console.warn('Service worker registration failed:', error);
            }

            // Mark as initialized
            this.isInitialized = true;

            const loadTime = (performance.now() - this.startTime).toFixed(2);
            console.log(`✅ Application initialized successfully in ${loadTime}ms`);

            // Show welcome notification
            setTimeout(() => {
                if (typeof notificationService !== 'undefined') {
                    notificationService.success('Welcome to Travel Itinerary Manager! 🌍');
                }
            }, 500);

            return this.app;

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this._handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Check browser compatibility
     * @private
     */
    _checkBrowserCompatibility() {
        const requiredFeatures = [
            'localStorage',
            'Promise',
            'fetch',
            'Map',
            'Set'
        ];

        const missing = requiredFeatures.filter(feature => {
            try {
                return !window[feature];
            } catch {
                return true;
            }
        });

        if (missing.length > 0) {
            throw new Error(`Browser missing required features: ${missing.join(', ')}`);
        }

        // Check ES6 module support
        if (!('noModule' in HTMLScriptElement.prototype)) {
            throw new Error('Browser does not support ES6 modules');
        }

        console.log('✅ Browser compatibility check passed');
    }

    /**
     * Wait for all required dependencies
     * @private
     */
    async _waitForDependencies() {
        const timeout = 15000; // 15 seconds
        const startTime = Date.now();

        console.log('⏳ Waiting for dependencies...');

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                const handler = () => {
                    document.removeEventListener('DOMContentLoaded', handler);
                    resolve();
                };
                document.addEventListener('DOMContentLoaded', handler);
            });
        }
        this.dependencies.dom = true;
        console.log('✅ DOM ready');

        // Wait for external libraries with timeout
        await Promise.race([
            this._waitForLibraries(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Library loading timeout')), timeout)
            )
        ]);

        const loadTime = Date.now() - startTime;
        console.log(`✅ All dependencies loaded in ${loadTime}ms`);
    }

    /**
     * Wait for external libraries to load
     * @private
     */
    async _waitForLibraries() {
        const checkInterval = 100;

        while (!this.dependencies.xlsx || !this.dependencies.papa) {
            // Check XLSX library
            if (!this.dependencies.xlsx && typeof XLSX !== 'undefined') {
                this.dependencies.xlsx = true;
                console.log('✅ XLSX library loaded');
            }

            // Check Papa Parse library
            if (!this.dependencies.papa && typeof Papa !== 'undefined') {
                this.dependencies.papa = true;
                console.log('✅ Papa Parse library loaded');
            }

            if (!this.dependencies.xlsx || !this.dependencies.papa) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
        }
    }

    /**
     * Initialize theme system
     * @private
     */
    _initializeTheme() {
        try {
            // Load saved theme or detect system preference
            const savedTheme = localStorage.getItem('travel-app-theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

            document.documentElement.setAttribute('data-theme', theme);

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('travel-app-theme')) {
                    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
                }
            });

            console.log(`✅ Theme initialized: ${theme}`);
        } catch (error) {
            console.warn('⚠️ Theme initialization failed:', error);
        }
    }

    /**
     * Initialize the main application
     * @private
     */
    async _initializeApplication() {
        console.log('🚀 Initializing main application...');

        // Create application instance
        this.app = new Application({
            container: '#appContent',
            autoSave: true,
            saveInterval: 30000,
            version: '2.0.0'
        });

        // Wait for application to be ready
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Application initialization timeout'));
            }, 10000);

            const checkReady = () => {
                if (this.app.isReady()) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });

        // Make globally available
        this._exposeGlobalAPI();

        console.log('✅ Application instance created and ready');
    }

    /**
     * Expose global API
     * @private
     */
    _exposeGlobalAPI() {
        // Main app instance
        window.app = this.app;

        // Bootstrap utilities
        window.TravelApp = {
            getApp: () => this.app,
            version: '2.0.0',
            isReady: () => this.isInitialized,
            restart: () => this.restart(),
            exportDebugInfo: () => this.exportDebugInfo()
        };

        // Development utilities (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.TravelAppDev = {
                bootstrap: this,
                clearData: () => {
                    localStorage.clear();
                    location.reload();
                },
                performance: () => ({
                    initTime: performance.now() - this.startTime,
                    dependencies: this.dependencies
                })
            };
        }
    }

    /**
     * Setup global error handlers
     * @private
     */
    _setupGlobalErrorHandlers() {
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);

            // Prevent default browser behavior
            event.preventDefault();

            // Show user-friendly error
            const message = event.reason?.message || 'An unexpected error occurred';
            notificationService.error(`Application Error: ${message}`);

            // Report to error tracking service (if available)
            this._reportError(event.reason, 'unhandledrejection');
        });

        // JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('🚨 JavaScript error:', event.error);

            const message = event.error?.message || event.message || 'An unexpected error occurred';
            notificationService.error(`Script Error: ${message}`);

            this._reportError(event.error, 'javascript');
        });

        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                console.warn('⚠️ Resource loading error:', event.target.src || event.target.href);
            }
        }, true);

        console.log('✅ Global error handlers setup');
    }

    /**
     * Setup auto-save functionality
     * @private
     */
    _setupAutoSave() {
        if (!this.app) return;

        // Save before page unload
        window.addEventListener('beforeunload', (event) => {
            try {
                this.app.dataManager?.saveToStorage();
            } catch (error) {
                console.error('Failed to save data on unload:', error);
                // Set return value to show browser warning
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Periodic auto-save
        setInterval(() => {
            try {
                this.app.dataManager?.saveToStorage();
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 30000); // Every 30 seconds

        // Save on visibility change (tab switch, minimize)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                try {
                    this.app.dataManager?.saveToStorage();
                } catch (error) {
                    console.error('Failed to save on visibility change:', error);
                }
            }
        });

        console.log('✅ Auto-save functionality setup');
    }

    /**
     * Register service worker
     * @private
     */
    async _registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('ℹ️ Service Worker not supported');
            return;
        }

        try {
            // Check if service worker file exists
            const swResponse = await fetch('./sw.js', { method: 'HEAD' });
            if (!swResponse.ok) {
                console.log('ℹ️ Service Worker file not found, skipping registration');
                return;
            }

            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ Service Worker registered:', registration.scope);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this._notifyServiceWorkerUpdate();
                        }
                    });
                }
            });

        } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error.message);
        }
    }

    /**
     * Notify user of service worker update
     * @private
     */
    _notifyServiceWorkerUpdate() {
        notificationService.info('App update available! Refresh to get the latest version.', {
            persistent: true,
            onClose: () => {
                if (confirm('Update available! Refresh now to get the latest version?')) {
                    window.location.reload();
                }
            }
        });
    }

    /**
     * Handle initialization errors
     * @private
     */
    _handleInitializationError(error) {
        // Hide loader
        const loader = document.getElementById('initialLoader');
        if (loader) loader.classList.add('hidden');

        // Show error screen
        this._showErrorScreen(error.message);
    }

    /**
     * Show error screen
     * @private
     */
    _showErrorScreen(message) {
        const appContent = document.getElementById('appContent');
        if (!appContent) return;

        appContent.innerHTML = `
            <div class="error-container">
                <div class="error-content">
                    <h1>❌ Application Error</h1>
                    <p>${this._escapeHtml(message)}</p>
                    <div class="error-actions">
                        <button class="error-button" onclick="location.reload()">
                            🔄 Reload Application
                        </button>
                        <button class="error-button" onclick="localStorage.clear(); location.reload()">
                            🗑️ Clear Data & Reload
                        </button>
                        <button class="error-button" onclick="window.TravelApp?.exportDebugInfo?.()">
                            📋 Export Debug Info
                        </button>
                    </div>
                </div>
            </div>
        `;
        appContent.classList.add('loaded');
    }

    /**
     * Report error to tracking service
     * @private
     */
    _reportError(error, type) {
        // This would integrate with error tracking services like Sentry, LogRocket, etc.
        const errorInfo = {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            type,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            dependencies: this.dependencies
        };

        // For now, just log to console
        console.log('Error report:', errorInfo);

        // In production, send to error tracking service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    /**
     * Escape HTML for safe rendering
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Restart the application
     */
    async restart() {
        try {
            console.log('🔄 Restarting application...');

            // Dispose current app
            if (this.app) {
                this.app.dispose();
                this.app = null;
            }

            // Reset state
            this.isInitialized = false;
            this.initPromise = null;
            this.startTime = performance.now();

            // Reinitialize
            await this.init();

            notificationService.success('Application restarted successfully!');
        } catch (error) {
            console.error('Failed to restart application:', error);
            notificationService.error('Failed to restart application');
        }
    }

    /**
     * Export debug information
     */
    exportDebugInfo() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            isInitialized: this.isInitialized,
            dependencies: this.dependencies,
            performance: {
                initTime: performance.now() - this.startTime,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            },
            userAgent: navigator.userAgent,
            url: window.location.href,
            localStorage: (() => {
                try {
                    const data = localStorage.getItem('travelApp_v2');
                    return data ? { size: data.length, hasData: true } : { hasData: false };
                } catch {
                    return { error: 'Cannot access localStorage' };
                }
            })(),
            errors: this._getStoredErrors()
        };

        // Create and download debug file
        const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `travel-app-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('Debug info exported:', debugInfo);
    }

    /**
     * Get stored error information
     * @private
     */
    _getStoredErrors() {
        try {
            return JSON.parse(sessionStorage.getItem('travel-app-errors') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get application instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Check if application is ready
     */
    isReady() {
        return this.isInitialized && this.app?.isReady();
    }

    /**
     * Dispose of bootstrap instance
     */
    dispose() {
        if (this.app) {
            this.app.dispose();
            this.app = null;
        }
        this.isInitialized = false;
        this.initPromise = null;
    }
}

// Create and initialize bootstrap instance
const bootstrap = new AppBootstrap();

// Auto-initialize when module loads
bootstrap.init().catch(error => {
    console.error('Failed to initialize application:', error);
});

// Export for manual initialization if needed
export default bootstrap;