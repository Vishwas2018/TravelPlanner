/**
 * Travel Itinerary Manager - Optimized Utilities
 */

import { TRANSPORT_ICONS } from './constants.js';

export class Utils {
    static formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num);
    }

    static formatTime(timeString) {
        if (!timeString) return '';
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch {
            return timeString;
        }
    }

    static formatDate(dateString, options = {}) {
        try {
            const date = new Date(dateString);
            const defaultOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
        } catch {
            return dateString;
        }
    }

    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    static getTransportIcon(transportMode) {
        return TRANSPORT_ICONS[transportMode] || '📍';
    }

    static getRelativeTime(date) {
        try {
            const now = new Date();
            const targetDate = new Date(date);
            const diffTime = targetDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays > 0) return `In ${diffDays} days`;
            if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
            return 'Unknown';
        } catch {
            return 'Unknown';
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    }

    static groupBy(array, property) {
        return array.reduce((groups, item) => {
            const key = item[property];
            groups[key] = groups[key] || [];
            groups[key].push(item);
            return groups;
        }, {});
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch {
            return fallback;
        }
    }

    static safeJsonStringify(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch {
            return fallback;
        }
    }
}