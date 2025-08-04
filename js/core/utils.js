/**
 * Travel Itinerary Manager - Utility Functions
 * Common utility functions used throughout the application
 */

import { TRANSPORT_ICONS, TRANSPORT_MODES } from './constants.js';

export class Utils {
    /**
     * Format currency with proper error handling
     * @param {number|string} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount) {
        try {
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(numAmount)) return '$0';

            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(numAmount);
        } catch (error) {
            console.warn('Error formatting currency:', amount, error);
            return `$${amount || 0}`;
        }
    }

    /**
     * Format time string to 12-hour display format
     * @param {string} timeString - Time in HH:mm format
     * @returns {string} Formatted time string
     */
    static formatTime(timeString) {
        if (!timeString) return '';

        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch (error) {
            console.warn('Invalid time format:', timeString);
            return timeString;
        }
    }

    /**
     * Format date to display format
     * @param {string|Date} dateString - Date to format
     * @param {object} options - Intl.DateTimeFormat options
     * @returns {string} Formatted date string
     */
    static formatDate(dateString, options = {}) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }

            const defaultOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
        } catch (error) {
            console.warn('Invalid date format:', dateString);
            return dateString;
        }
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    static escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Debounce function for performance optimization
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function for scroll events
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get transport mode icon
     * @param {string} transportMode - Transport mode
     * @returns {string} Icon emoji
     */
    static getTransportIcon(transportMode) {
        return TRANSPORT_ICONS[transportMode] || '📍';
    }

    /**
     * Get relative time string
     * @param {string|Date} date - Date to compare
     * @returns {string} Relative time description
     */
    static getRelativeTime(date) {
        try {
            const now = new Date();
            const targetDate = new Date(date);

            if (isNaN(targetDate.getTime())) {
                return 'Invalid date';
            }

            const diffTime = targetDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays > 0) return `In ${diffDays} days`;
            if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

            return 'Unknown';
        } catch (error) {
            console.warn('Error calculating relative time:', error);
            return 'Unknown';
        }
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Format file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Deep clone an object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        return obj;
    }

    /**
     * Check if object is empty
     * @param {object} obj - Object to check
     * @returns {boolean} Is empty object
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        if (typeof obj === 'string') return obj.trim().length === 0;
        return false;
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Convert string to kebab-case
     * @param {string} str - String to convert
     * @returns {string} Kebab-case string
     */
    static toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * Convert string to camelCase
     * @param {string} str - String to convert
     * @returns {string} CamelCase string
     */
    static toCamelCase(str) {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            })
            .replace(/\s+/g, '');
    }

    /**
     * Truncate string to specified length
     * @param {string} str - String to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add when truncated
     * @returns {string} Truncated string
     */
    static truncate(str, length = 100, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    }

    /**
     * Sort array of objects by property
     * @param {Array} array - Array to sort
     * @param {string} property - Property to sort by
     * @param {string} direction - Sort direction ('asc' or 'desc')
     * @returns {Array} Sorted array
     */
    static sortBy(array, property, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Group array of objects by property
     * @param {Array} array - Array to group
     * @param {string} property - Property to group by
     * @returns {Object} Grouped object
     */
    static groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
            return groups;
        }, {});
    }

    /**
     * Create delay promise
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if device is mobile
     * @returns {boolean} Is mobile device
     */
    static isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * Check if device is tablet
     * @returns {boolean} Is tablet device
     */
    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    /**
     * Check if device is desktop
     * @returns {boolean} Is desktop device
     */
    static isDesktop() {
        return window.innerWidth > 1024;
    }

    /**
     * Smooth scroll to element
     * @param {string|Element} target - Target element or selector
     * @param {number} offset - Offset from top
     */
    static scrollTo(target, offset = 0) {
        const element = typeof target === 'string'
            ? document.querySelector(target)
            : target;

        if (element) {
            const top = element.offsetTop - offset;
            window.scrollTo({
                top,
                behavior: 'smooth'
            });
        }
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const result = document.execCommand('copy');
                textArea.remove();
                return result;
            }
        } catch (error) {
            console.error('Failed to copy text to clipboard:', error);
            return false;
        }
    }

    /**
     * Generate color from string (for consistent colors)
     * @param {string} str - String to hash
     * @returns {string} Hex color
     */
    static stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = Math.abs(hash).toString(16).substring(0, 6);
        return '#' + '000000'.substring(0, 6 - color.length) + color;
    }

    /**
     * Check if color is light or dark
     * @param {string} color - Hex color
     * @returns {boolean} Is light color
     */
    static isLightColor(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness > 155;
    }

    /**
     * Format number with thousands separator
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    static formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    /**
     * Calculate percentage
     * @param {number} value - Value
     * @param {number} total - Total
     * @param {number} decimals - Decimal places
     * @returns {number} Percentage
     */
    static calculatePercentage(value, total, decimals = 0) {
        if (total === 0) return 0;
        return parseFloat(((value / total) * 100).toFixed(decimals));
    }

    /**
     * Safe JSON parse with fallback
     * @param {string} jsonString - JSON string to parse
     * @param {any} fallback - Fallback value
     * @returns {any} Parsed object or fallback
     */
    static safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return fallback;
        }
    }

    /**
     * Safe JSON stringify
     * @param {any} obj - Object to stringify
     * @param {string} fallback - Fallback string
     * @returns {string} JSON string or fallback
     */
    static safeJsonStringify(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            console.warn('Failed to stringify object:', error);
            return fallback;
        }
    }
}