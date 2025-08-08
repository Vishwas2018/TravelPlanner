/**
 * Travel Itinerary Manager - Enhanced Constants and Configuration
 * Comprehensive configuration with validation and type definitions
 */

// Note: Environment helper will be imported when available
// import { getEnvironment, getApiBaseUrl } from './environment.js';

// Fallback environment detection for browser safety
function getBrowserSafeEnvironment() {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isDevelopment = isBrowser && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '' ||
        window.location.protocol === 'file:'
    );

    return {
        isDevelopment,
        isProduction: !isDevelopment,
        isBrowser
    };
}

function getBrowserSafeApiUrl() {
    const env = getBrowserSafeEnvironment();

    if (env.isProduction) {
        return 'https://api.travelmanager.com/v2';
    }

    if (env.isBrowser) {
        const port = window.location.port || '3000';
        return `${window.location.protocol}//${window.location.hostname}:${port}/api/v2`;
    }

    return 'http://localhost:3000/api/v2';
}

export const APP_CONFIG = Object.freeze({
    version: '2.0.0',
    name: 'Travel Itinerary Manager',
    storageKey: 'travelApp_v2',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    autoSaveInterval: 30000, // 30 seconds
    maxActivities: 10000,
    maxBackups: 10,
    maxDeletedItems: 50,
    apiTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    cacheTTL: 300000 // 5 minutes
});

export const VIEWS = Object.freeze({
    DASHBOARD: 'dashboard',
    ITINERARY: 'itinerary',
    TIMELINE: 'timeline',
    ANALYTICS: 'analytics',
    SETTINGS: 'settings'
});

export const EVENTS = Object.freeze({
    // Application events
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    APP_THEME_CHANGED: 'app:theme-changed',

    // View events
    VIEW_CHANGED: 'view:changed',
    VIEW_LOADING: 'view:loading',

    // Data events
    DATA_UPDATED: 'data:updated',
    DATA_LOADING: 'data:loading',
    DATA_SAVED: 'data:saved',
    DATA_ERROR: 'data:error',

    // Activity events
    ACTIVITY_ADDED: 'activity:added',
    ACTIVITY_UPDATED: 'activity:updated',
    ACTIVITY_DELETED: 'activity:deleted',
    ACTIVITY_DUPLICATED: 'activity:duplicated',
    ACTIVITY_RESTORED: 'activity:restored',

    // Filter events
    FILTERS_UPDATED: 'filters:updated',
    FILTERS_RESET: 'filters:reset',

    // Import/Export events
    IMPORT_STARTED: 'import:started',
    IMPORT_COMPLETED: 'import:completed',
    IMPORT_ERROR: 'import:error',
    EXPORT_STARTED: 'export:started',
    EXPORT_COMPLETED: 'export:completed',

    // Card events
    CARD_RENDERED: 'card:rendered',
    CARD_CLICKED: 'card:clicked',
    CARD_UPDATED: 'card:updated',
    CARD_HOVER_START: 'card:hover-start',
    CARD_HOVER_END: 'card:hover-end',
    CARD_SELECTION_CHANGED: 'card:selection-changed',
    CARD_EXPAND_TOGGLE: 'card:expand-toggle',
    CARD_EDIT_REQUESTED: 'card:edit-requested',
    CARD_DELETE_REQUESTED: 'card:delete-requested',
    CARD_DUPLICATE_REQUESTED: 'card:duplicate-requested',
    CARD_BOOKING_TOGGLE: 'card:booking-toggle'
});

export const TRANSPORT_MODES = Object.freeze({
    FLIGHT: 'Flight',
    TRAIN: 'Train',
    CAR: 'Car',
    BUS: 'Bus',
    UBER: 'Uber',
    TAXI: 'Taxi',
    WALKING: 'Walking',
    BICYCLE: 'Bicycle',
    BOAT: 'Boat',
    METRO: 'Metro'
});

export const TRANSPORT_ICONS = Object.freeze({
    Flight: '✈️',
    Train: '🚄',
    Car: '🚗',
    Bus: '🚌',
    Uber: '🚕',
    Taxi: '🚖',
    Walking: '🚶',
    Bicycle: '🚴',
    Boat: '⛵',
    Metro: '🚇'
});

export const ACTIVITY_CATEGORIES = Object.freeze({
    TRANSPORT: 'transport',
    ACCOMMODATION: 'accommodation',
    SIGHTSEEING: 'sightseeing',
    DINING: 'dining',
    ENTERTAINMENT: 'entertainment',
    BUSINESS: 'business',
    SHOPPING: 'shopping',
    HEALTH: 'health',
    EDUCATION: 'education',
    OTHER: 'other'
});

export const CATEGORY_ICONS = Object.freeze({
    transport: '🚗',
    accommodation: '🏨',
    sightseeing: '👁️',
    dining: '🍽️',
    entertainment: '🎭',
    business: '💼',
    shopping: '🛍️',
    health: '🏥',
    education: '📚',
    other: '📌'
});

export const BOOKING_STATUS = Object.freeze({
    BOOKED: 'TRUE',
    NOT_BOOKED: 'FALSE',
    PENDING: 'PENDING',
    CANCELLED: 'CANCELLED'
});

export const ACTIVITY_PRIORITY = Object.freeze({
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical'
});

export const ACTIVITY_STATUS = Object.freeze({
    PLANNED: 'planned',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DELAYED: 'delayed'
});

export const NOTIFICATION_TYPES = Object.freeze({
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
});

export const ERROR_MESSAGES = Object.freeze({
    ACTIVITY_NAME_REQUIRED: 'Activity name is required',
    DATE_REQUIRED: 'Date is required',
    INVALID_DATE: 'Invalid date format',
    INVALID_TIME: 'Invalid time format',
    END_TIME_BEFORE_START: 'End time must be after start time',
    ACTIVITY_NOT_FOUND: 'Activity not found',
    DUPLICATE_ACTIVITY: 'Similar activity already exists',
    UNSUPPORTED_FILE: 'Unsupported file format',
    FILE_READ_ERROR: 'Failed to read file',
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded',
    NETWORK_ERROR: 'Network connection error',
    VALIDATION_ERROR: 'Data validation failed',
    PERMISSION_DENIED: 'Permission denied',
    TIMEOUT_ERROR: 'Operation timed out'
});

export const SUCCESS_MESSAGES = Object.freeze({
    ACTIVITY_ADDED: 'Activity added successfully!',
    ACTIVITY_UPDATED: 'Activity updated successfully!',
    ACTIVITY_DELETED: 'Activity deleted successfully!',
    ACTIVITY_DUPLICATED: 'Activity duplicated successfully!',
    ACTIVITY_RESTORED: 'Activity restored successfully!',
    DATA_EXPORTED: 'Data exported successfully!',
    DATA_IMPORTED: 'Data imported successfully!',
    DATA_SAVED: 'Data saved successfully!',
    TEMPLATE_DOWNLOADED: 'Template downloaded successfully!',
    BACKUP_CREATED: 'Backup created successfully!',
    BACKUP_RESTORED: 'Backup restored successfully!',
    FILTERS_APPLIED: 'Filters applied successfully!',
    SETTINGS_SAVED: 'Settings saved successfully!'
});

export const WARNING_MESSAGES = Object.freeze({
    UNSAVED_CHANGES: 'You have unsaved changes',
    LARGE_IMPORT: 'Large import detected, this may take a while',
    STORAGE_ALMOST_FULL: 'Storage is almost full',
    OLD_BROWSER: 'Your browser may not support all features',
    OFFLINE_MODE: 'You are currently offline',
    AUTO_SAVE_FAILED: 'Auto-save failed, please save manually'
});

export const INFO_MESSAGES = Object.freeze({
    LOADING_DATA: 'Loading your travel data...',
    PROCESSING_FILE: 'Processing uploaded file...',
    GENERATING_EXPORT: 'Generating export file...',
    CREATING_BACKUP: 'Creating backup...',
    SYNCING_DATA: 'Syncing data...',
    FILTERS_CLEARED: 'All filters have been cleared',
    WELCOME: 'Welcome to Travel Itinerary Manager!'
});

export const DEFAULT_FILTERS = Object.freeze({
    search: '',
    startDate: '',
    endDate: '',
    transport: '',
    category: 'all',
    priority: 'all',
    status: 'all',
    booking: ['TRUE', 'FALSE', 'PENDING'],
    minCost: 0,
    maxCost: 10000,
    tags: [],
    sortBy: 'date',
    sortOrder: 'asc'
});

export const SORT_OPTIONS = Object.freeze({
    DATE_ASC: { field: 'date', direction: 'asc', label: 'Date (Earliest First)' },
    DATE_DESC: { field: 'date', direction: 'desc', label: 'Date (Latest First)' },
    COST_ASC: { field: 'cost', direction: 'asc', label: 'Cost (Low to High)' },
    COST_DESC: { field: 'cost', direction: 'desc', label: 'Cost (High to Low)' },
    NAME_ASC: { field: 'activity', direction: 'asc', label: 'Name (A-Z)' },
    NAME_DESC: { field: 'activity', direction: 'desc', label: 'Name (Z-A)' },
    PRIORITY_ASC: { field: 'priority', direction: 'asc', label: 'Priority (Low to High)' },
    PRIORITY_DESC: { field: 'priority', direction: 'desc', label: 'Priority (High to Low)' },
    CREATED_ASC: { field: 'createdAt', direction: 'asc', label: 'Created (Oldest First)' },
    CREATED_DESC: { field: 'createdAt', direction: 'desc', label: 'Created (Newest First)' }
});

export const FILE_EXTENSIONS = Object.freeze({
    CSV: '.csv',
    EXCEL: '.xlsx',
    EXCEL_OLD: '.xls',
    JSON: '.json',
    PDF: '.pdf'
});

export const MIME_TYPES = Object.freeze({
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    JSON: 'application/json',
    PDF: 'application/pdf'
});

export const VALIDATION_RULES = Object.freeze({
    ACTIVITY_NAME: {
        required: true,
        minLength: 1,
        maxLength: 255,
        pattern: /^[a-zA-Z0-9\s\-_.,!?()[\]{}:;'"]+$/
    },
    DATE: {
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        minDate: '1900-01-01',
        maxDate: '2100-12-31'
    },
    TIME: {
        required: false,
        pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    COST: {
        required: false,
        min: 0,
        max: 999999.99,
        decimals: 2
    },
    LOCATION: {
        required: false,
        minLength: 0,
        maxLength: 255
    },
    DETAILS: {
        required: false,
        maxLength: 2000
    }
});

export const ANIMATION_DURATIONS = Object.freeze({
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
    PAGE_TRANSITION: 400,
    MODAL_TRANSITION: 250,
    NOTIFICATION: 200,
    HOVER: 150
});

export const BREAKPOINTS = Object.freeze({
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE_DESKTOP: 1440,
    EXTRA_LARGE: 1920
});

export const THEME_COLORS = Object.freeze({
    LIGHT: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#48bb78',
        warning: '#ed8936',
        danger: '#f56565',
        info: '#4299e1',
        background: '#ffffff',
        surface: '#f7fafc',
        text: '#2d3748',
        textSecondary: '#718096'
    },
    DARK: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#48bb78',
        warning: '#ed8936',
        danger: '#f56565',
        info: '#4299e1',
        background: '#1a202c',
        surface: '#2d3748',
        text: '#ffffff',
        textSecondary: '#e2e8f0'
    }
});

export const CURRENCY_CODES = Object.freeze({
    USD: { symbol: '$', name: 'US Dollar', code: 'USD' },
        EUR: { symbol: '€', name: 'Euro', code: 'EUR' },
        GBP: { symbol: '£', name: 'British Pound', code: 'GBP' },
        JPY: { symbol: '¥', name: 'Japanese Yen', code: 'JPY' },
        AUD: { symbol: 'AUD', name: 'Australian Dollar', code: 'AUD' },
            CAD: { symbol: 'CAD', name: 'Canadian Dollar', code: 'CAD' },
                CHF: { symbol: 'CHF', name: 'Swiss Franc', code: 'CHF' },
                CNY: { symbol: '¥', name: 'Chinese Yuan', code: 'CNY' },
                INR: { symbol: '₹', name: 'Indian Rupee', code: 'INR' }
            });

export const DATE_FORMATS = Object.freeze({
    ISO: 'YYYY-MM-DD',
    US: 'MM/DD/YYYY',
    EU: 'DD/MM/YYYY',
    LONG: 'MMMM Do, YYYY',
    SHORT: 'MMM D, YYYY',
    RELATIVE: 'relative'
});

export const TIME_FORMATS = Object.freeze({
    HOUR_12: '12h',
    HOUR_24: '24h'
});

export const LOCALES = Object.freeze({
    EN_US: { code: 'en-US', name: 'English (US)', dateFormat: DATE_FORMATS.US },
    EN_GB: { code: 'en-GB', name: 'English (UK)', dateFormat: DATE_FORMATS.EU },
    DE_DE: { code: 'de-DE', name: 'German', dateFormat: DATE_FORMATS.EU },
    FR_FR: { code: 'fr-FR', name: 'French', dateFormat: DATE_FORMATS.EU },
    ES_ES: { code: 'es-ES', name: 'Spanish', dateFormat: DATE_FORMATS.EU },
    IT_IT: { code: 'it-IT', name: 'Italian', dateFormat: DATE_FORMATS.EU },
    JA_JP: { code: 'ja-JP', name: 'Japanese', dateFormat: DATE_FORMATS.ISO },
    ZH_CN: { code: 'zh-CN', name: 'Chinese (Simplified)', dateFormat: DATE_FORMATS.ISO }
});

export const KEYBOARD_SHORTCUTS = Object.freeze({
    ADD_ACTIVITY: { key: 'n', ctrlKey: true, description: 'Add new activity' },
    SAVE: { key: 's', ctrlKey: true, description: 'Save data' },
    EXPORT: { key: 'e', ctrlKey: true, description: 'Export data' },
    IMPORT: { key: 'i', ctrlKey: true, description: 'Import data' },
    SEARCH: { key: 'f', ctrlKey: true, description: 'Search activities' },
    TOGGLE_THEME: { key: 't', ctrlKey: true, description: 'Toggle theme' },
    HELP: { key: '?', description: 'Show help' },
    ESCAPE: { key: 'Escape', description: 'Close modal/cancel' }
});

export const API_ENDPOINTS = Object.freeze({
    // For future API integration
    BASE_URL: getBrowserSafeApiUrl(),
    ACTIVITIES: '/activities',
    EXPORT: '/export',
    IMPORT: '/import',
    BACKUP: '/backup',
    USER: '/user',
    SETTINGS: '/settings'
});

export const STORAGE_KEYS = Object.freeze({
    ACTIVITIES: 'travelApp_v2',
    THEME: 'travel-app-theme',
    SETTINGS: 'travel-app-settings',
    FILTERS: 'travel-app-filters',
    VIEW_STATE: 'travel-app-view-state',
    BACKUP_HISTORY: 'travel-app-backups',
    USER_PREFERENCES: 'travel-app-preferences'
});

export const DEFAULT_SETTINGS = Object.freeze({
    theme: 'light',
    currency: 'USD',
    dateFormat: DATE_FORMATS.US,
    timeFormat: TIME_FORMATS.HOUR_12,
    locale: 'en-US',
    autoSave: true,
    autoSaveInterval: 30000,
    notifications: true,
    soundEnabled: false,
    compactView: false,
    showWelcome: true,
    defaultView: VIEWS.DASHBOARD,
    itemsPerPage: 25,
    confirmDelete: true,
    backupEnabled: true,
    maxBackups: 10
});

export const FEATURE_FLAGS = Object.freeze({
    ENABLE_ANALYTICS: true,
    ENABLE_EXPORT_PDF: false,
    ENABLE_COLLABORATION: false,
    ENABLE_OFFLINE_SYNC: true,
    ENABLE_DRAG_DROP: true,
    ENABLE_BULK_OPERATIONS: true,
    ENABLE_ADVANCED_FILTERS: true,
    ENABLE_CALENDAR_VIEW: false,
    ENABLE_MAP_INTEGRATION: false,
    ENABLE_AI_SUGGESTIONS: false
});

export const PERFORMANCE_THRESHOLDS = Object.freeze({
    SLOW_OPERATION_MS: 1000,
    LARGE_DATASET_SIZE: 1000,
    MEMORY_WARNING_MB: 50,
    STORAGE_WARNING_MB: 8,
    RENDER_WARNING_MS: 16
});

export const SECURITY_CONFIG = Object.freeze({
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['.csv', '.xlsx', '.xls', '.json'],
    MAX_ACTIVITIES_IMPORT: 10000,
    RATE_LIMIT_REQUESTS: 100,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    SANITIZE_HTML: true,
    VALIDATE_INPUTS: true
});

export const ACCESSIBILITY_CONFIG = Object.freeze({
    MIN_CONTRAST_RATIO: 4.5,
    FOCUS_VISIBLE: true,
    KEYBOARD_NAVIGATION: true,
    SCREEN_READER_SUPPORT: true,
    HIGH_CONTRAST_MODE: false,
    REDUCED_MOTION: false,
    FONT_SIZE_SCALE: 1.0
});

export const ANALYTICS_EVENTS = Object.freeze({
    APP_LAUNCHED: 'app_launched',
    ACTIVITY_CREATED: 'activity_created',
    ACTIVITY_UPDATED: 'activity_updated',
    ACTIVITY_DELETED: 'activity_deleted',
    DATA_EXPORTED: 'data_exported',
    DATA_IMPORTED: 'data_imported',
    FILTER_APPLIED: 'filter_applied',
    VIEW_CHANGED: 'view_changed',
    ERROR_OCCURRED: 'error_occurred',
    FEATURE_USED: 'feature_used'
});

/**
 * Utility function to validate configuration
 */
export function validateConfig() {
    const errors = [];

    // Validate file size limits
    if (APP_CONFIG.maxFileSize > SECURITY_CONFIG.MAX_FILE_SIZE) {
        errors.push('APP_CONFIG.maxFileSize exceeds security limit');
    }

    // Validate auto-save interval
    if (APP_CONFIG.autoSaveInterval < 5000) {
        errors.push('Auto-save interval too short (minimum 5 seconds)');
    }

    // Validate currency codes
    const defaultCurrency = DEFAULT_SETTINGS.currency;
    if (!CURRENCY_CODES[defaultCurrency]) {
        errors.push(`Invalid default currency: ${defaultCurrency}`);
    }

    // Validate theme colors
    Object.entries(THEME_COLORS).forEach(([theme, colors]) => {
        Object.entries(colors).forEach(([color, value]) => {
            if (typeof value !== 'string' || !value.startsWith('#')) {
                errors.push(`Invalid color value for ${theme}.${color}: ${value}`);
            }
        });
    });

    if (errors.length > 0) {
        console.error('Configuration validation errors:', errors);
        return { valid: false, errors };
    }

    return { valid: true, errors: [] };
}

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig() {
    const env = getBrowserSafeEnvironment();

    return {
        isDevelopment: env.isDevelopment,
        isProduction: env.isProduction,
        enableDebug: env.isDevelopment,
        enableAnalytics: env.isProduction,
        enableServiceWorker: env.isProduction,
        apiUrl: API_ENDPOINTS.BASE_URL,
        logLevel: env.isDevelopment ? 'debug' : 'error',
        features: {
            ...FEATURE_FLAGS,
            // Override features based on environment
            ENABLE_ANALYTICS: env.isProduction,
            ENABLE_COLLABORATION: false, // Not ready yet
        }
    };
}

/**
 * Deep freeze utility for nested objects
 */
function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(name => {
        const value = obj[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    });
    return Object.freeze(obj);
}

// Export deep frozen version for extra security
export const CONSTANTS = deepFreeze({
    APP_CONFIG,
    VIEWS,
    EVENTS,
    TRANSPORT_MODES,
    TRANSPORT_ICONS,
    ACTIVITY_CATEGORIES,
    CATEGORY_ICONS,
    BOOKING_STATUS,
    ACTIVITY_PRIORITY,
    ACTIVITY_STATUS,
    NOTIFICATION_TYPES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    WARNING_MESSAGES,
    INFO_MESSAGES,
    DEFAULT_FILTERS,
    SORT_OPTIONS,
    FILE_EXTENSIONS,
    MIME_TYPES,
    VALIDATION_RULES,
    ANIMATION_DURATIONS,
    BREAKPOINTS,
    THEME_COLORS,
    CURRENCY_CODES,
    DATE_FORMATS,
    TIME_FORMATS,
    LOCALES,
    KEYBOARD_SHORTCUTS,
    API_ENDPOINTS,
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    FEATURE_FLAGS,
    PERFORMANCE_THRESHOLDS,
    SECURITY_CONFIG,
    ACCESSIBILITY_CONFIG,
    ANALYTICS_EVENTS
});