/**
 * Travel Itinerary Manager - Environment Helper
 * Browser-safe environment detection and configuration
 */

/**
 * Detect current environment safely in both browser and Node.js
 * @returns {Object} Environment information
 */
export function getEnvironment() {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

    // Check if we're in Node.js environment
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

    // Check if we're in a web worker
    const isWebWorker = typeof importScripts === 'function' && typeof navigator !== 'undefined';

    // Development detection for browser environment
    const isDevelopmentBrowser = isBrowser && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '' ||
        window.location.protocol === 'file:' ||
        window.location.port === '3000' ||
        window.location.port === '8080' ||
        window.location.search.includes('debug=true')
    );

    // Development detection for Node.js environment
    const isDevelopmentNode = isNode && (
        process.env?.NODE_ENV === 'development' ||
        process.env?.NODE_ENV === 'dev' ||
        !process.env?.NODE_ENV // Default to development if not set
    );

    const isDevelopment = isDevelopmentBrowser || isDevelopmentNode;
    const isProduction = !isDevelopment;

    return {
        isBrowser,
        isNode,
        isWebWorker,
        isDevelopment,
        isProduction,
        hostname: isBrowser ? window.location.hostname : 'unknown',
        protocol: isBrowser ? window.location.protocol : 'unknown',
        port: isBrowser ? window.location.port : 'unknown',
        userAgent: isBrowser ? navigator.userAgent : 'unknown'
    };
}

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
    const env = getEnvironment();

    if (env.isProduction) {
        return 'https://api.travelmanager.com/v2';
    }

    // Development URLs
    if (env.isBrowser) {
        const port = window.location.port || '3000';
        return `${window.location.protocol}//${window.location.hostname}:${port}/api/v2`;
    }

    return 'http://localhost:3000/api/v2';
}

/**
 * Check if debugging should be enabled
 * @returns {boolean} Whether debugging is enabled
 */
export function isDebugEnabled() {
    const env = getEnvironment();

    if (env.isDevelopment) return true;

    // Allow enabling debug in production via URL parameter
    if (env.isBrowser && window.location.search.includes('debug=true')) {
        return true;
    }

    return false;
}

/**
 * Get log level based on environment
 * @returns {string} Log level (debug, info, warn, error)
 */
export function getLogLevel() {
    const env = getEnvironment();

    if (env.isDevelopment) return 'debug';
    if (env.isProduction) return 'error';

    return 'info';
}

/**
 * Check if analytics should be enabled
 * @returns {boolean} Whether analytics is enabled
 */
export function isAnalyticsEnabled() {
    const env = getEnvironment();

    // Only enable analytics in production
    if (!env.isProduction) return false;

    // Allow disabling analytics via URL parameter
    if (env.isBrowser && window.location.search.includes('analytics=false')) {
        return false;
    }

    return true;
}

/**
 * Check if service worker should be enabled
 * @returns {boolean} Whether service worker should be enabled
 */
export function isServiceWorkerEnabled() {
    const env = getEnvironment();

    // Only enable service worker in production and if supported
    return env.isProduction && env.isBrowser && 'serviceWorker' in navigator;
}

/**
 * Get cache configuration based on environment
 * @returns {Object} Cache configuration
 */
export function getCacheConfig() {
    const env = getEnvironment();

    return {
        defaultTTL: env.isDevelopment ? 60000 : 300000, // 1min dev, 5min prod
        maxSize: env.isDevelopment ? 50 : 100,
        enablePersistent: env.isProduction,
        enableCompression: env.isProduction
    };
}

/**
 * Get performance thresholds based on environment
 * @returns {Object} Performance thresholds
 */
export function getPerformanceThresholds() {
    const env = getEnvironment();

    return {
        slowOperation: env.isDevelopment ? 500 : 1000, // ms
        largeDataset: env.isDevelopment ? 500 : 1000, // items
        memoryWarning: env.isDevelopment ? 25 : 50, // MB
        renderWarning: env.isDevelopment ? 8 : 16 // ms
    };
}

/**
 * Create environment-aware logger
 * @returns {Object} Logger object
 */
export function createLogger() {
    const logLevel = getLogLevel();
    const debugEnabled = isDebugEnabled();

    const logLevels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    const currentLevel = logLevels[logLevel] || logLevels.info;

    return {
        debug: (...args) => {
            if (debugEnabled && currentLevel <= logLevels.debug) {
                console.log('[DEBUG]', ...args);
            }
        },

        info: (...args) => {
            if (currentLevel <= logLevels.info) {
                console.info('[INFO]', ...args);
            }
        },

        warn: (...args) => {
            if (currentLevel <= logLevels.warn) {
                console.warn('[WARN]', ...args);
            }
        },

        error: (...args) => {
            if (currentLevel <= logLevels.error) {
                console.error('[ERROR]', ...args);
            }
        },

        group: (label) => {
            if (debugEnabled) {
                console.group(label);
            }
        },

        groupEnd: () => {
            if (debugEnabled) {
                console.groupEnd();
            }
        },

        time: (label) => {
            if (debugEnabled) {
                console.time(label);
            }
        },

        timeEnd: (label) => {
            if (debugEnabled) {
                console.timeEnd(label);
            }
        }
    };
}

/**
 * Export environment object for convenience
 */
export const ENV = getEnvironment();

/**
 * Export logger instance for convenience
 */
export const logger = createLogger();

// Log environment information on load (development only)
if (ENV.isDevelopment) {
    logger.debug('Environment detected:', ENV);
}