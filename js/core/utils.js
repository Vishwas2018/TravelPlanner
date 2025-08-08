/**
 * Travel Itinerary Manager - Complete Enhanced Utilities
 * Comprehensive utility functions with validation, formatting, and performance optimization
 * Production-ready with zero dependencies and full cross-browser compatibility
 */

import {
    TRANSPORT_ICONS,
    CURRENCY_CODES,
    DATE_FORMATS,
    TIME_FORMATS,
    VALIDATION_RULES,
    PERFORMANCE_THRESHOLDS
} from './constants.js';

/**
 * Utility class with static methods for common operations
 * All methods are optimized for performance and include comprehensive error handling
 */
export class Utils {
    // Cache for expensive operations with TTL support
    static _cache = new Map();
    static _cacheTimeout = 300000; // 5 minutes
    static _rateLimitStore = new Map();
    static _isInitialized = false;

    /**
     * Currency formatting with comprehensive locale support
     * @param {number|string} amount - Amount to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount, options = {}) {
        const {
            currency = 'USD',
            locale = 'en-US',
            showSymbol = true,
            minimumFractionDigits = 0,
            maximumFractionDigits = 2
        } = options;

        const numericAmount = this.parseNumber(amount);
        if (numericAmount === null) return '$0';

        try {
            if (showSymbol) {
                return new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency,
                    minimumFractionDigits,
                    maximumFractionDigits
                }).format(numericAmount);
            } else {
                return new Intl.NumberFormat(locale, {
                    minimumFractionDigits,
                    maximumFractionDigits
                }).format(numericAmount);
            }
        } catch (error) {
            console.warn('Currency formatting failed:', error);
            const symbol = CURRENCY_CODES[currency]?.symbol || '$';
            return `${symbol}${numericAmount.toFixed(maximumFractionDigits)}`;
        }
    }

    /**
     * Enhanced time formatting with timezone support
     * @param {string} timeString - Time string (HH:MM or HH:MM:SS)
     * @param {Object} options - Formatting options
     * @returns {string} Formatted time string
     */
    static formatTime(timeString, options = {}) {
        const {
            format = TIME_FORMATS.HOUR_12,
            timezone = null,
            showSeconds = false,
            locale = 'en-US'
        } = options;

        if (!timeString) return '';

        try {
            const timeParts = timeString.split(':');
            if (timeParts.length < 2) return timeString;

            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

            // Validate time values
            if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
                return timeString;
            }

            const date = new Date();
            date.setHours(hours, minutes, seconds, 0);

            const formatOptions = {
                hour: 'numeric',
                minute: '2-digit',
                hour12: format === TIME_FORMATS.HOUR_12
            };

            if (showSeconds) formatOptions.second = '2-digit';
            if (timezone) formatOptions.timeZone = timezone;

            return new Intl.DateTimeFormat(locale, formatOptions).format(date);

        } catch (error) {
            console.warn('Time formatting failed:', error);
            return timeString;
        }
    }

    /**
     * Enhanced date formatting with relative dates
     * @param {string|Date} dateString - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    static formatDate(dateString, options = {}) {
        const {
            format = DATE_FORMATS.LONG,
            locale = 'en-US',
            timezone = null,
            relative = false,
            includeYear = true
        } = options;

        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;

            if (relative || format === DATE_FORMATS.RELATIVE) {
                return this.getRelativeTime(date);
            }

            const formatOptions = {
                weekday: format === DATE_FORMATS.LONG ? 'long' : undefined,
                year: includeYear ? 'numeric' : undefined,
                month: format === DATE_FORMATS.LONG ? 'long' : 'short',
                day: 'numeric'
            };

            if (typeof options.weekday !== 'undefined') formatOptions.weekday = options.weekday;
            if (typeof options.year !== 'undefined') formatOptions.year = options.year;
            if (typeof options.month !== 'undefined') formatOptions.month = options.month;
            if (typeof options.day !== 'undefined') formatOptions.day = options.day;
            if (timezone) formatOptions.timeZone = timezone;

            return new Intl.DateTimeFormat(locale, formatOptions).format(date);

        } catch (error) {
            console.warn('Date formatting failed:', error);
            return dateString;
        }
    }

    /**
     * Enhanced relative time formatting
     * @param {string|Date} date - Date to format
     * @param {Object} options - Formatting options
     * @returns {string} Relative time string
     */
    static getRelativeTime(date, options = {}) {
        const { locale = 'en-US', numeric = 'auto', style = 'long' } = options;

        try {
            const targetDate = new Date(date);
            const now = new Date();

            if (isNaN(targetDate.getTime())) return 'Invalid date';

            const diffTime = targetDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if ('RelativeTimeFormat' in Intl) {
                const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });

                if (Math.abs(diffDays) < 1) {
                    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                    if (Math.abs(diffHours) < 1) {
                        const diffMinutes = Math.ceil(diffTime / (1000 * 60));
                        return rtf.format(diffMinutes, 'minute');
                    }
                    return rtf.format(diffHours, 'hour');
                }

                if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');
                if (Math.abs(diffDays) < 30) return rtf.format(Math.ceil(diffDays / 7), 'week');
                if (Math.abs(diffDays) < 365) return rtf.format(Math.ceil(diffDays / 30), 'month');

                return rtf.format(Math.ceil(diffDays / 365), 'year');
            }

            return this._fallbackRelativeTime(diffDays, diffTime);

        } catch (error) {
            console.warn('Relative time formatting failed:', error);
            return 'Unknown';
        }
    }

    /**
     * Fallback relative time formatting for browsers without RelativeTimeFormat
     * @private
     */
    static _fallbackRelativeTime(diffDays, diffTime) {
        const absDays = Math.abs(diffDays);
        const isPast = diffTime < 0;

        if (absDays === 0) return 'Today';
        if (absDays === 1) return isPast ? 'Yesterday' : 'Tomorrow';
        if (absDays < 7) return isPast ? `${absDays} days ago` : `In ${absDays} days`;

        if (absDays < 30) {
            const weeks = Math.ceil(absDays / 7);
            return isPast ? `${weeks} week${weeks > 1 ? 's' : ''} ago` : `In ${weeks} week${weeks > 1 ? 's' : ''}`;
        }

        if (absDays < 365) {
            const months = Math.ceil(absDays / 30);
            return isPast ? `${months} month${months > 1 ? 's' : ''} ago` : `In ${months} month${months > 1 ? 's' : ''}`;
        }

        const years = Math.ceil(absDays / 365);
        return isPast ? `${years} year${years > 1 ? 's' : ''} ago` : `In ${years} year${years > 1 ? 's' : ''}`;
    }

    /**
     * Safe HTML escaping with XSS prevention
     * @param {string} text - Text to escape
     * @param {Object} options - Escaping options
     * @returns {string} Escaped HTML string
     */
    static escapeHtml(text, options = {}) {
        const { preserveWhitespace = false, maxLength = null } = options;

        if (typeof text !== 'string') {
            text = String(text || '');
        }

        if (maxLength && text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }

        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        const escaped = text.replace(/[&<>"'/]/g, (match) => escapeMap[match]);

        if (preserveWhitespace) {
            return escaped.replace(/\n/g, '<br>').replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length));
        }

        return escaped;
    }

    /**
     * Enhanced debounce with immediate execution option
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {Object} options - Debounce options
     * @returns {Function} Debounced function
     */
    static debounce(func, wait, options = {}) {
        const { immediate = false, maxWait = null } = options;

        let timeout;
        let maxTimeout;
        let lastCallTime;

        return function executedFunction(...args) {
            const context = this;
            const callNow = immediate && !timeout;

            const later = () => {
                timeout = null;
                maxTimeout = null;
                if (!immediate) func.apply(context, args);
            };

            clearTimeout(timeout);
            clearTimeout(maxTimeout);

            timeout = setTimeout(later, wait);

            if (maxWait) {
                if (!lastCallTime) lastCallTime = Date.now();

                const timeSinceLastCall = Date.now() - lastCallTime;
                if (timeSinceLastCall >= maxWait) {
                    func.apply(context, args);
                    lastCallTime = Date.now();
                } else {
                    maxTimeout = setTimeout(() => {
                        func.apply(context, args);
                        lastCallTime = Date.now();
                    }, maxWait - timeSinceLastCall);
                }
            }

            if (callNow) {
                func.apply(context, args);
                lastCallTime = Date.now();
            }
        };
    }

    /**
     * Enhanced throttle with trailing execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @param {Object} options - Throttle options
     * @returns {Function} Throttled function
     */
    static throttle(func, limit, options = {}) {
        const { leading = true, trailing = true } = options;

        let inThrottle;
        let lastFunc;
        let lastRan;

        return function(...args) {
            const context = this;

            if (!inThrottle) {
                if (leading) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
                inThrottle = true;
            } else if (trailing) {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        };
    }

    /**
     * Cryptographically secure ID generation
     * @param {Object} options - Generation options
     * @returns {string} Generated ID
     */
    static generateId(options = {}) {
        const { length = 12, prefix = '', includeTimestamp = false } = options;

        let id = prefix;

        if (includeTimestamp) {
            id += Date.now().toString(36);
        }

        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            id += Array.from(array, byte => byte.toString(36)).join('').substring(0, length);
        } else {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < length; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        return id;
    }

    /**
     * Enhanced transport icon getter with fallbacks
     * @param {string} transportMode - Transport mode
     * @param {Object} options - Icon options
     * @returns {string} Transport icon
     */
    static getTransportIcon(transportMode, options = {}) {
        const { fallback = '📍', size = 'normal' } = options;
        if (!transportMode) return fallback;
        return TRANSPORT_ICONS[transportMode] || fallback;
    }

    /**
     * File size formatting with binary/decimal options
     * @param {number} bytes - Size in bytes
     * @param {Object} options - Formatting options
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes, options = {}) {
        const { binary = true, precision = 1, locale = 'en-US' } = options;

        if (!bytes || bytes === 0) return '0 Bytes';

        const base = binary ? 1024 : 1000;
        const units = binary
            ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
            : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const index = Math.floor(Math.log(bytes) / Math.log(base));
        const size = bytes / Math.pow(base, index);

        if (index === 0) return `${bytes} ${units[index]}`;

        return `${size.toLocaleString(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: precision
        })} ${units[index]}`;
    }

    /**
     * String capitalization with comprehensive options
     * @param {string} str - String to capitalize
     * @param {Object} options - Capitalization options
     * @returns {string} Capitalized string
     */
    static capitalize(str, options = {}) {
        const { allWords = false, preserveCase = false } = options;

        if (typeof str !== 'string' || !str) return '';

        if (allWords) {
            return str.split(' ').map(word =>
                this.capitalize(word, { preserveCase })
            ).join(' ');
        }

        const firstChar = str.charAt(0).toUpperCase();
        const rest = preserveCase ? str.slice(1) : str.slice(1).toLowerCase();

        return firstChar + rest;
    }

    /**
     * Enhanced groupBy with multiple keys and custom reducers
     * @param {Array} array - Array to group
     * @param {string|Function|Array} keyOrFunction - Grouping key or function
     * @param {Object} options - Grouping options
     * @returns {Object} Grouped object
     */
    static groupBy(array, keyOrFunction, options = {}) {
        const { multipleKeys = false, reducer = null } = options;

        if (!Array.isArray(array)) return {};

        return array.reduce((groups, item) => {
            let key;

            if (typeof keyOrFunction === 'function') {
                key = keyOrFunction(item);
            } else if (multipleKeys && Array.isArray(keyOrFunction)) {
                key = keyOrFunction.map(k => item[k]).join('|');
            } else {
                key = item[keyOrFunction];
            }

            if (!groups[key]) {
                groups[key] = [];
            }

            if (reducer) {
                groups[key] = reducer(groups[key], item);
            } else {
                groups[key].push(item);
            }

            return groups;
        }, {});
    }

    /**
     * Async delay utility with abort support
     * @param {number} ms - Delay in milliseconds
     * @param {Object} options - Delay options
     * @returns {Promise} Delay promise
     */
    static delay(ms, options = {}) {
        const { signal = null } = options;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, ms);

            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new Error('Delay aborted'));
                });
            }
        });
    }

    /**
     * Safe JSON parsing with detailed error information
     * @param {string} jsonString - JSON string to parse
     * @param {Object} options - Parsing options
     * @returns {Object} Parse result with success flag and data/error
     */
    static safeJsonParse(jsonString, options = {}) {
        const { fallback = null, throwOnError = false, reviver = null } = options;

        if (typeof jsonString !== 'string') {
            const error = new Error('Input is not a string');
            if (throwOnError) throw error;
            return { success: false, data: fallback, error };
        }

        try {
            const data = JSON.parse(jsonString, reviver);
            return { success: true, data, error: null };
        } catch (error) {
            const parseError = {
                message: error.message,
                position: this._findJsonErrorPosition(jsonString, error.message),
                input: jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : '')
            };

            if (throwOnError) throw parseError;
            return { success: false, data: fallback, error: parseError };
        }
    }

    /**
     * Safe JSON stringification with circular reference handling
     * @param {*} obj - Object to stringify
     * @param {Object} options - Stringification options
     * @returns {Object} Stringify result with success flag and data/error
     */
    static safeJsonStringify(obj, options = {}) {
        const {
            fallback = '{}',
            space = null,
            throwOnError = false,
            maxDepth = 10,
            replacer = null
        } = options;

        try {
            const seen = new WeakSet();
            let depth = 0;

            const circularReplacer = (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular Reference]';
                    }
                    seen.add(value);

                    if (depth++ > maxDepth) {
                        return '[Max Depth Exceeded]';
                    }
                }

                if (replacer) {
                    return replacer(key, value);
                }

                return value;
            };

            const result = JSON.stringify(obj, circularReplacer, space);
            return { success: true, data: result, error: null };

        } catch (error) {
            if (throwOnError) throw error;
            return { success: false, data: fallback, error };
        }
    }

    /**
     * Find JSON parsing error position
     * @private
     */
    static _findJsonErrorPosition(jsonString, errorMessage) {
        const match = errorMessage.match(/position (\d+)/i);
        if (match) {
            const position = parseInt(match[1], 10);
            const lines = jsonString.substring(0, position).split('\n');
            return {
                line: lines.length,
                column: lines[lines.length - 1].length + 1,
                position
            };
        }
        return null;
    }

    /**
     * Number parsing with comprehensive validation
     * @param {*} value - Value to parse
     * @param {Object} options - Parsing options
     * @returns {number|null} Parsed number or null if invalid
     */
    static parseNumber(value, options = {}) {
        const {
            min = null,
            max = null,
            decimals = null,
            allowNaN = false
        } = options;

        if (value === null || value === undefined || value === '') {
            return null;
        }

        let num;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            const cleaned = value.replace(/[^\d.-]/g, '');
            num = parseFloat(cleaned);
        } else {
            num = Number(value);
        }

        if (isNaN(num) && !allowNaN) return null;
        if (min !== null && num < min) return null;
        if (max !== null && num > max) return null;

        if (decimals !== null && !isNaN(num)) {
            num = Number(num.toFixed(decimals));
        }

        return num;
    }

    /**
     * Deep clone with performance optimization
     * @param {*} obj - Object to clone
     * @param {Object} options - Cloning options
     * @returns {*} Cloned object
     */
    static deepClone(obj, options = {}) {
        const { maxDepth = 50, preserveFunctions = false } = options;

        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (typeof structuredClone === 'function' && !preserveFunctions) {
            try {
                return structuredClone(obj);
            } catch (error) {
                // Fallback to manual cloning
            }
        }

        return this._deepCloneRecursive(obj, new WeakMap(), 0, maxDepth, preserveFunctions);
    }

    /**
     * Recursive deep clone implementation
     * @private
     */
    static _deepCloneRecursive(obj, seen, depth, maxDepth, preserveFunctions) {
        if (depth > maxDepth) {
            throw new Error('Maximum cloning depth exceeded');
        }

        if (seen.has(obj)) {
            return seen.get(obj);
        }

        let clone;

        if (obj instanceof Date) {
            clone = new Date(obj.getTime());
        } else if (obj instanceof RegExp) {
            clone = new RegExp(obj.source, obj.flags);
        } else if (obj instanceof Array) {
            clone = [];
            seen.set(obj, clone);
            for (let i = 0; i < obj.length; i++) {
                clone[i] = this._deepCloneRecursive(obj[i], seen, depth + 1, maxDepth, preserveFunctions);
            }
        } else if (typeof obj === 'function') {
            clone = preserveFunctions ? obj : undefined;
        } else {
            clone = {};
            seen.set(obj, clone);
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clone[key] = this._deepCloneRecursive(obj[key], seen, depth + 1, maxDepth, preserveFunctions);
                }
            }
        }

        return clone;
    }

    /**
     * Validation utilities collection
     */
    static validate = {
        email: (email) => {
            const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return pattern.test(email);
        },

        date: (dateString) => {
            if (!dateString) return false;
            const date = new Date(dateString);
            return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
        },

        time: (timeString) => {
            if (!timeString) return false;
            return VALIDATION_RULES.TIME.pattern.test(timeString);
        },

        cost: (cost) => {
            const num = Utils.parseNumber(cost);
            return num !== null && num >= VALIDATION_RULES.COST.min && num <= VALIDATION_RULES.COST.max;
        },

        activityName: (name) => {
            if (!name || typeof name !== 'string') return false;
            return name.length >= VALIDATION_RULES.ACTIVITY_NAME.minLength &&
                name.length <= VALIDATION_RULES.ACTIVITY_NAME.maxLength &&
                VALIDATION_RULES.ACTIVITY_NAME.pattern.test(name);
        },

        url: (url) => {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }
    };

    /**
     * Performance monitoring utilities
     */
    static performance = {
        mark: (name) => {
            if (typeof performance !== 'undefined' && performance.mark) {
                performance.mark(name);
            }
        },

        measure: (name, startMark, endMark) => {
            if (typeof performance !== 'undefined' && performance.measure) {
                try {
                    performance.measure(name, startMark, endMark);
                    const entries = performance.getEntriesByName(name);
                    return entries[entries.length - 1]?.duration || 0;
                } catch (error) {
                    console.warn('Performance measurement failed:', error);
                    return 0;
                }
            }
            return 0;
        },

        time: (label, fn) => {
            const start = performance.now();
            const result = fn();
            const duration = performance.now() - start;

            if (duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS) {
                console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
            }

            return { result, duration };
        },

        timeAsync: async (label, fn) => {
            const start = performance.now();
            const result = await fn();
            const duration = performance.now() - start;

            if (duration > PERFORMANCE_THRESHOLDS.SLOW_OPERATION_MS) {
                console.warn(`Slow async operation detected: ${label} took ${duration.toFixed(2)}ms`);
            }

            return { result, duration };
        }
    };

    /**
     * Cache utilities with TTL support
     */
    static cache = {
        set: (key, value, ttl = Utils._cacheTimeout) => {
            Utils._cache.set(key, {
                value,
                expires: Date.now() + ttl
            });
        },

        get: (key) => {
            const item = Utils._cache.get(key);
            if (!item) return null;

            if (Date.now() > item.expires) {
                Utils._cache.delete(key);
                return null;
            }

            return item.value;
        },

        has: (key) => {
            const item = Utils._cache.get(key);
            if (!item) return false;

            if (Date.now() > item.expires) {
                Utils._cache.delete(key);
                return false;
            }

            return true;
        },

        delete: (key) => {
            return Utils._cache.delete(key);
        },

        clear: () => {
            Utils._cache.clear();
        },

        size: () => {
            return Utils._cache.size;
        },

        cleanup: () => {
            const now = Date.now();
            for (const [key, item] of Utils._cache.entries()) {
                if (now > item.expires) {
                    Utils._cache.delete(key);
                }
            }
        }
    };

    /**
     * Initialize utilities with proper setup
     */
    static init() {
        if (Utils._isInitialized) return;

        // Add global styles for accessibility
        if (typeof document !== 'undefined' && !document.getElementById('utils-styles')) {
            const style = document.createElement('style');
            style.id = 'utils-styles';
            style.textContent = `
                .sr-only {
                    position: absolute !important;
                    width: 1px !important;
                    height: 1px !important;
                    padding: 0 !important;
                    margin: -1px !important;
                    overflow: hidden !important;
                    clip: rect(0, 0, 0, 0) !important;
                    white-space: nowrap !important;
                    border: 0 !important;
                }
                
                @media (prefers-reduced-motion: reduce) {
                    * {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `;
            if (document.head) {
                document.head.appendChild(style);
            }
        }

        // Setup periodic cleanup
        setInterval(() => {
            Utils.cache.cleanup();

            // Clean rate limit store
            if (Utils._rateLimitStore) {
                const now = Date.now();
                const maxAge = 300000; // 5 minutes

                for (const [key, requests] of Utils._rateLimitStore.entries()) {
                    const filtered = requests.filter(time => now - time < maxAge);
                    if (filtered.length === 0) {
                        Utils._rateLimitStore.delete(key);
                    } else {
                        Utils._rateLimitStore.set(key, filtered);
                    }
                }
            }
        }, 300000); // Clean every 5 minutes

        Utils._isInitialized = true;

        if (typeof console !== 'undefined' && console.log) {
            console.log('✅ Utils initialized successfully');
        }
    }

    /**
     * Get initialization status
     * @returns {boolean} Whether utils are initialized
     */
    static isInitialized() {
        return Utils._isInitialized;
    }

    /**
     * Dispose of utilities and clean up resources
     */
    static dispose() {
        Utils.cache.clear();
        Utils._rateLimitStore.clear();
        Utils._isInitialized = false;

        // Remove styles if they exist
        const styles = document.getElementById('utils-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }

        console.log('🧹 Utils disposed');
    }
}

// Auto-initialize when the module loads
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Utils.init());
    } else {
        Utils.init();
    }
} else {
    // For non-browser environments (Node.js, workers, etc.)
    Utils.init();
}