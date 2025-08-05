/**
 * Travel Itinerary Manager - Application Constants (Singleton)
 * Centralized configuration and constant values with duplicate prevention
 */

// Singleton pattern to prevent duplicate declarations
class Constants {
    constructor() {
        if (Constants.instance) {
            return Constants.instance;
        }

        this.initializeConstants();
        Constants.instance = this;

        // Freeze the instance to prevent modifications
        Object.freeze(this);
    }

    initializeConstants() {
        this.APP_CONFIG = Object.freeze({
            version: '2.0.0',
            name: 'Travel Itinerary Manager',
            storageKey: 'travelApp_v2',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            supportedFormats: ['.xlsx', '.xls', '.csv'],
            autoSaveInterval: 30000, // 30 seconds
            animationDuration: 300,
            debounceDelay: 300,
            notificationDuration: 4000
        });

        this.VIEWS = Object.freeze({
            DASHBOARD: 'dashboard',
            ITINERARY: 'itinerary',
            TIMELINE: 'timeline'
        });

        this.EVENTS = Object.freeze({
            // Application Events
            APP_READY: 'app:ready',
            VIEW_CHANGED: 'view:changed',
            VIEW_REGISTERED: 'view:registered',
            VIEW_UNREGISTERED: 'view:unregistered',
            VIEW_ERROR: 'view:error',
            VIEW_UPDATED: 'view:updated',

            // Data Events
            DATA_UPDATED: 'data:updated',
            FILTER_APPLIED: 'filter:applied',
            ACTIVITY_ADDED: 'activity:added',
            ACTIVITY_UPDATED: 'activity:updated',
            ACTIVITY_DELETED: 'activity:deleted',

            // File Events
            FILE_LOADED: 'file:loaded',

            // UI Events
            THEME_CHANGED: 'theme:changed',
            MODAL_OPENED: 'modal:opened',
            MODAL_CLOSED: 'modal:closed',
            SEARCH_PERFORMED: 'search:performed',

            // Activity Card Events
            CARD_RENDERED: 'card:rendered',
            CARD_CLICKED: 'card:clicked',
            CARD_UPDATED: 'card:updated',
            CARD_SELECTION_CHANGED: 'card:selection_changed',
            CARD_EXPAND_TOGGLE: 'card:expand_toggle',
            CARD_HOVER_START: 'card:hover_start',
            CARD_HOVER_END: 'card:hover_end',
            CARD_EDIT_REQUESTED: 'card:edit_requested',
            CARD_DELETE_REQUESTED: 'card:delete_requested',
            CARD_DUPLICATE_REQUESTED: 'card:duplicate_requested',
            CARD_BOOKING_TOGGLE: 'card:booking_toggle'
        });

        this.TRANSPORT_MODES = Object.freeze({
            FLIGHT: 'Flight',
            TRAIN: 'Train',
            CAR: 'Car',
            BUS: 'Bus',
            TUBE: 'Tube',
            UBER: 'Uber',
            WALKING: 'Walking',
            AUTO: 'Auto'
        });

        this.TRANSPORT_ICONS = Object.freeze({
            [this.TRANSPORT_MODES.FLIGHT]: '✈️',
            [this.TRANSPORT_MODES.TRAIN]: '🚄',
            [this.TRANSPORT_MODES.CAR]: '🚗',
            [this.TRANSPORT_MODES.BUS]: '🚌',
            [this.TRANSPORT_MODES.TUBE]: '🚇',
            [this.TRANSPORT_MODES.UBER]: '🚕',
            [this.TRANSPORT_MODES.WALKING]: '🚶',
            [this.TRANSPORT_MODES.AUTO]: '🛺'
        });

        this.BOOKING_STATUS = Object.freeze({
            BOOKED: 'TRUE',
            NOT_BOOKED: 'FALSE'
        });

        this.NOTIFICATION_TYPES = Object.freeze({
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info'
        });

        this.THEMES = Object.freeze({
            LIGHT: 'light',
            DARK: 'dark'
        });

        this.COST_CATEGORIES = Object.freeze({
            TRANSPORT: 'transport',
            ACCOMMODATION: 'accommodation',
            ACTIVITIES: 'activities',
            OTHER: 'other'
        });

        this.VIEW_MODES = Object.freeze({
            GROUPED: 'grouped',
            LIST: 'list'
        });

        this.KEYBOARD_SHORTCUTS = Object.freeze({
            ADD_ACTIVITY: { key: 'n', modifiers: ['ctrl'] },
            EXPORT: { key: 'e', modifiers: ['ctrl'] },
            SEARCH: { key: 'f', modifiers: ['ctrl'] },
            OPEN_FILE: { key: 'o', modifiers: ['ctrl'] },
            DASHBOARD: { key: '1', modifiers: ['alt'] },
            ITINERARY: { key: '2', modifiers: ['alt'] },
            TIMELINE: { key: '3', modifiers: ['alt'] },
            ESCAPE: { key: 'Escape', modifiers: [] }
        });

        this.ERROR_MESSAGES = Object.freeze({
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
        });

        this.SUCCESS_MESSAGES = Object.freeze({
            ACTIVITY_ADDED: 'Activity added successfully!',
            ACTIVITY_UPDATED: 'Activity updated successfully!',
            ACTIVITY_DELETED: 'Activity deleted successfully!',
            FILE_LOADED: 'File loaded successfully!',
            DATA_EXPORTED: 'Data exported successfully!',
            TEMPLATE_DOWNLOADED: 'Template downloaded successfully!',
            FILTERS_CLEARED: 'All filters cleared',
            DATA_CLEARED: 'All data cleared',
            THEME_CHANGED: 'Theme changed successfully'
        });

        this.DEFAULT_FILTERS = Object.freeze({
            search: '',
            startDate: '',
            endDate: '',
            transport: '',
            booking: [this.BOOKING_STATUS.BOOKED, this.BOOKING_STATUS.NOT_BOOKED],
            maxCost: 10000
        });

        this.FORM_VALIDATION_RULES = Object.freeze({
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
        });

        this.CSS_CLASSES = Object.freeze({
            MODAL_ACTIVE: 'active',
            MOBILE_OPEN: 'mobile-open',
            LOADING: 'loading',
            FADE_IN: 'fade-in',
            SLIDE_UP: 'slide-up',
            SCALE_IN: 'scale-in',
            HIDDEN: 'hidden'
        });

        this.DOM_SELECTORS = Object.freeze({
            APP_CONTAINER: '#app',
            SIDEBAR: '#sidebar',
            VIEW_CONTAINER: '#viewContainer',
            MODAL: '#activityModal',
            NOTIFICATION_CONTAINER: '#notificationContainer',
            GLOBAL_SEARCH: '#globalSearch',
            FILE_INPUT: '#fileInput',
            FILE_STATUS: '#fileStatus',
            MOBILE_OVERLAY: '#mobileOverlay'
        });

        this.MIME_TYPES = Object.freeze({
            CSV: 'text/csv',
            XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            XLS: 'application/vnd.ms-excel'
        });

        this.FILE_EXTENSIONS = Object.freeze({
            CSV: '.csv',
            XLSX: '.xlsx',
            XLS: '.xls'
        });

        this.CHART_COLORS = Object.freeze({
            PRIMARY: '#667eea',
            SECONDARY: '#764ba2',
            SUCCESS: '#48bb78',
            WARNING: '#ed8936',
            DANGER: '#f56565',
            INFO: '#4299e1'
        });

        this.ANIMATION_DURATIONS = Object.freeze({
            FAST: 150,
            NORMAL: 300,
            SLOW: 500
        });

        this.BREAKPOINTS = Object.freeze({
            MOBILE: 640,
            TABLET: 1024,
            DESKTOP: 1200
        });

        this.Z_INDEX = Object.freeze({
            MODAL: 1000,
            NOTIFICATION: 2000,
            TOOLTIP: 3000
        });
    }

    static getInstance() {
        if (!Constants.instance) {
            new Constants();
        }
        return Constants.instance;
    }
}

// Create singleton instance
const constants = Constants.getInstance();

// Export individual constants for compatibility
export const APP_CONFIG = constants.APP_CONFIG;
export const VIEWS = constants.VIEWS;
export const EVENTS = constants.EVENTS;
export const TRANSPORT_MODES = constants.TRANSPORT_MODES;
export const TRANSPORT_ICONS = constants.TRANSPORT_ICONS;
export const BOOKING_STATUS = constants.BOOKING_STATUS;
export const NOTIFICATION_TYPES = constants.NOTIFICATION_TYPES;
export const THEMES = constants.THEMES;
export const COST_CATEGORIES = constants.COST_CATEGORIES;
export const VIEW_MODES = constants.VIEW_MODES;
export const KEYBOARD_SHORTCUTS = constants.KEYBOARD_SHORTCUTS;
export const ERROR_MESSAGES = constants.ERROR_MESSAGES;
export const SUCCESS_MESSAGES = constants.SUCCESS_MESSAGES;
export const DEFAULT_FILTERS = constants.DEFAULT_FILTERS;
export const FORM_VALIDATION_RULES = constants.FORM_VALIDATION_RULES;
export const CSS_CLASSES = constants.CSS_CLASSES;
export const DOM_SELECTORS = constants.DOM_SELECTORS;
export const MIME_TYPES = constants.MIME_TYPES;
export const FILE_EXTENSIONS = constants.FILE_EXTENSIONS;
export const CHART_COLORS = constants.CHART_COLORS;
export const ANIMATION_DURATIONS = constants.ANIMATION_DURATIONS;
export const BREAKPOINTS = constants.BREAKPOINTS;
export const Z_INDEX = constants.Z_INDEX;

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.TravelConstants = constants;
}

// Default export
export default constants;