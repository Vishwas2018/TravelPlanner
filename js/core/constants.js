/**
 * Travel Itinerary Manager - Optimized Constants
 */

export const APP_CONFIG = Object.freeze({
    version: '2.0.0',
    name: 'Travel Itinerary Manager',
    storageKey: 'travelApp_v2',
    maxFileSize: 10 * 1024 * 1024,
    autoSaveInterval: 30000
});

export const VIEWS = Object.freeze({
    DASHBOARD: 'dashboard',
    ITINERARY: 'itinerary',
    TIMELINE: 'timeline'
});

export const EVENTS = Object.freeze({
    APP_READY: 'app:ready',
    VIEW_CHANGED: 'view:changed',
    DATA_UPDATED: 'data:updated',
    ACTIVITY_ADDED: 'activity:added',
    ACTIVITY_UPDATED: 'activity:updated',
    ACTIVITY_DELETED: 'activity:deleted'
});

export const TRANSPORT_MODES = Object.freeze({
    FLIGHT: 'Flight',
    TRAIN: 'Train',
    CAR: 'Car',
    BUS: 'Bus',
    UBER: 'Uber',
    WALKING: 'Walking'
});

export const TRANSPORT_ICONS = Object.freeze({
    Flight: '✈️',
    Train: '🚄',
    Car: '🚗',
    Bus: '🚌',
    Uber: '🚕',
    Walking: '🚶'
});

export const BOOKING_STATUS = Object.freeze({
    BOOKED: 'TRUE',
    NOT_BOOKED: 'FALSE'
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
    ACTIVITY_NOT_FOUND: 'Activity not found',
    UNSUPPORTED_FILE: 'Unsupported file format',
    FILE_READ_ERROR: 'Failed to read file'
});

export const SUCCESS_MESSAGES = Object.freeze({
    ACTIVITY_ADDED: 'Activity added successfully!',
    ACTIVITY_UPDATED: 'Activity updated successfully!',
    ACTIVITY_DELETED: 'Activity deleted successfully!',
    DATA_EXPORTED: 'Data exported successfully!',
    TEMPLATE_DOWNLOADED: 'Template downloaded successfully!'
});

export const DEFAULT_FILTERS = Object.freeze({
    search: '',
    startDate: '',
    endDate: '',
    transport: '',
    booking: ['TRUE', 'FALSE'],
    maxCost: 10000
});