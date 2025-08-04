/**
 * Travel Itinerary Manager - Application Constants
 * Centralized configuration and constant values
 */

export const APP_CONFIG = {
    version: '2.0.0',
    name: 'Travel Itinerary Manager',
    storageKey: 'travelApp_v2',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['.xlsx', '.xls', '.csv'],
    autoSaveInterval: 30000, // 30 seconds
    animationDuration: 300,
    debounceDelay: 300,
    notificationDuration: 4000
};

export const VIEWS = {
    DASHBOARD: 'dashboard',
    ITINERARY: 'itinerary',
    TIMELINE: 'timeline'
};

export const EVENTS = {
    VIEW_CHANGED: 'view:changed',
    DATA_UPDATED: 'data:updated',
    FILTER_APPLIED: 'filter:applied',
    ACTIVITY_ADDED: 'activity:added',
    ACTIVITY_UPDATED: 'activity:updated',
    ACTIVITY_DELETED: 'activity:deleted',
    FILE_LOADED: 'file:loaded',
    THEME_CHANGED: 'theme:changed',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    SEARCH_PERFORMED: 'search:performed'
};

export const TRANSPORT_MODES = {
    FLIGHT: 'Flight',
    TRAIN: 'Train',
    CAR: 'Car',
    BUS: 'Bus',
    TUBE: 'Tube',
    UBER: 'Uber',
    WALKING: 'Walking',
    AUTO: 'Auto'
};

export const TRANSPORT_ICONS = {
    [TRANSPORT_MODES.FLIGHT]: '✈️',
    [TRANSPORT_MODES.TRAIN]: '🚄',
    [TRANSPORT_MODES.CAR]: '🚗',
    [TRANSPORT_MODES.BUS]: '🚌',
    [TRANSPORT_MODES.TUBE]: '🚇',
    [TRANSPORT_MODES.UBER]: '🚕',
    [TRANSPORT_MODES.WALKING]: '🚶',
    [TRANSPORT_MODES.AUTO]: '🛺'
};

export const BOOKING_STATUS = {
    BOOKED: 'TRUE',
    NOT_BOOKED: 'FALSE'
};

export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

export const COST_CATEGORIES = {
    TRANSPORT: 'transport',
    ACCOMMODATION: 'accommodation',
    ACTIVITIES: 'activities',
    OTHER: 'other'
};

export const VIEW_MODES = {
    GROUPED: 'grouped',
    LIST: 'list'
};

export const KEYBOARD_SHORTCUTS = {
    ADD_ACTIVITY: { key: 'n', modifiers: ['ctrl'] },
    EXPORT: { key: 'e', modifiers: ['ctrl'] },
    SEARCH: { key: 'f', modifiers: ['ctrl'] },
    OPEN_FILE: { key: 'o', modifiers: ['ctrl'] },
    DASHBOARD: { key: '1', modifiers: ['alt'] },
    ITINERARY: { key: '2', modifiers: ['alt'] },
    TIMELINE: { key: '3', modifiers: ['alt'] },
    ESCAPE: { key: 'Escape', modifiers: [] }
};

export const ERROR_MESSAGES = {
    ACTIVITY_NAME_REQUIRED: 'Activity name is required',
    DATE_REQUIRED: 'Date is required',
    INVALID_DATE: 'Invalid date format',
    NEGATIVE_COST: 'Cost cannot be negative',
    ACTIVITY_NOT_FOUND: 'Activity not found',
    UNSUPPORTED_FILE: 'Unsupported file format. Please use CSV, XLS, or XLSX files.',
    FILE_READ_ERROR: 'Failed to read file',
    PARSE_ERROR: 'Failed to parse file data',
    STORAGE_ERROR: 'Failed to save data',
    EXPORT_ERROR: 'Export failed. Please try again.',
    NETWORK_ERROR: 'Network error occurred'
};

export const SUCCESS_MESSAGES = {
    ACTIVITY_ADDED: 'Activity added successfully!',
    ACTIVITY_UPDATED: 'Activity updated successfully!',
    ACTIVITY_DELETED: 'Activity deleted successfully!',
    FILE_LOADED: 'File loaded successfully!',
    DATA_EXPORTED: 'Data exported successfully!',
    TEMPLATE_DOWNLOADED: 'Template downloaded successfully!',
    FILTERS_CLEARED: 'All filters cleared',
    DATA_CLEARED: 'All data cleared',
    THEME_CHANGED: 'Theme changed successfully'
};

export const DEFAULT_FILTERS = {
    search: '',
    startDate: '',
    endDate: '',
    transport: '',
    booking: [BOOKING_STATUS.BOOKED, BOOKING_STATUS.NOT_BOOKED],
    maxCost: 10000
};

export const FORM_VALIDATION_RULES = {
    activity: {
        required: true,
        minLength: 1,
        maxLength: 200
    },
    date: {
        required: true,
        type: 'date'
    },
    cost: {
        type: 'number',
        min: 0,
        max: 999999
    },
    startTime: {
        type: 'time',
        format: 'HH:mm'
    },
    endTime: {
        type: 'time',
        format: 'HH:mm'
    }
};

export const CSS_CLASSES = {
    MODAL_ACTIVE: 'active',
    MOBILE_OPEN: 'mobile-open',
    LOADING: 'loading',
    FADE_IN: 'fade-in',
    SLIDE_UP: 'slide-up',
    SCALE_IN: 'scale-in',
    HIDDEN: 'hidden'
};

export const DOM_SELECTORS = {
    APP_CONTAINER: '#app',
    SIDEBAR: '#sidebar',
    VIEW_CONTAINER: '#viewContainer',
    MODAL: '#activityModal',
    NOTIFICATION_CONTAINER: '#notificationContainer',
    GLOBAL_SEARCH: '#globalSearch',
    FILE_INPUT: '#fileInput',
    FILE_STATUS: '#fileStatus',
    MOBILE_OVERLAY: '#mobileOverlay'
};

export const MIME_TYPES = {
    CSV: 'text/csv',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel'
};

export const FILE_EXTENSIONS = {
    CSV: '.csv',
    XLSX: '.xlsx',
    XLS: '.xls'
};

export const CHART_COLORS = {
    PRIMARY: '#667eea',
    SECONDARY: '#764ba2',
    SUCCESS: '#48bb78',
    WARNING: '#ed8936',
    DANGER: '#f56565',
    INFO: '#4299e1'
};

export const ANIMATION_DURATIONS = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
};

export const BREAKPOINTS = {
    MOBILE: 640,
    TABLET: 1024,
    DESKTOP: 1200
};

export const Z_INDEX = {
    MODAL: 1000,
    NOTIFICATION: 2000,
    TOOLTIP: 3000
};