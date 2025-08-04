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

            // Initialize application
            this.app = new Application({
                container: document.body,
                theme: this.getPreferredTheme(),
                autoSave: true,
                keyboardShortcuts: true
            });

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

            // Setup global error handlers
            this.setupGlobalErrorHandlers();

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
            'addEventListener'
        ];

        return requiredFeatures.every(feature => {
            const hasFeature = feature in window || feature in window.prototype;
            if (!hasFeature) {
                console.error(`Missing required feature: ${feature}`);
            }
            return hasFeature;
        });
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
        window.addEventListener('unhandledrejection', event => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.app && this.app.notificationService) {
                this.app.notificationService.error('An unexpected error occurred');
            }
            event.preventDefault();
        });

        // Global JavaScript errors
        window.addEventListener('error', event => {
            console.error('Global error:', event.error);
            if (this.app && this.app.notificationService) {
                this.app.notificationService.error('A system error occurred');
            }
        });

        // Resource loading errors
        window.addEventListener('error', event => {
            if (event.target !== window) {
                console.error('Resource loading error:', event.target.src || event.target.href);
            }
        }, true);
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
                        The application failed to start properly.
                    </p>
                    <details style="margin-bottom: 2rem; text-align: left;">
                        <summary style="cursor: pointer; margin-bottom: 0.5rem;">Technical Details</summary>
                        <pre style="
                            background: rgba(0, 0, 0, 0.2);
                            padding: 1rem;
                            border-radius: 0.5rem;
                            overflow: auto;
                            font-size: 0.75rem;
                        ">${error.message}</pre>
                    </details>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 0.5rem;
                        font-weight: 600;
                        cursor: pointer;
                        margin-right: 1rem;
                    ">
                        Reload Page
                    </button>
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
        return this.isInitialized;
    }
}

// Create global bootstrap instance
const bootstrap = new AppBootstrap();

// Initialize on page load
bootstrap.init();

// Export for debugging and testing
window.TravelApp = {
    bootstrap,
    getApp: () => bootstrap.getApp(),
    isReady: () => bootstrap.isReady(),
    version: APP_CONFIG.version
};

export default bootstrap;