/**
 * Travel Itinerary Manager - Complete Data Manager
 * Comprehensive data management with filtering, validation, and persistence
 */

import { ActivityModel } from './ActivityModel.js';
import { Utils } from '../core/utils.js';
import { EVENTS, DEFAULT_FILTERS, BOOKING_STATUS, ERROR_MESSAGES } from '../core/constants.js';

/**
 * Event Manager base class for implementing observer pattern
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
    }

    off(event, listener) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(listener);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

/**
 * Data Manager Class
 * Handles all data operations, filtering, validation, and persistence
 */
export class DataManager extends EventManager {
    constructor(options = {}) {
        super();

        this.options = {
            storageKey: 'travelApp_v2',
            autoSaveInterval: 30000,
            maxActivities: 10000,
            enableValidation: true,
            enableBackup: true,
            ...options
        };

        // Core data
        this.activities = [];
        this.filteredActivities = [];
        this.deletedActivities = [];

        // State management
        this.filters = { ...DEFAULT_FILTERS };
        this.sortConfig = { field: 'date', direction: 'asc' };
        this.isDirty = false;
        this.isLoading = false;
        this.lastSaved = null;

        // Performance tracking
        this.stats = {
            totalOperations: 0,
            lastFilterTime: 0,
            lastSortTime: 0
        };

        // Auto-save timer
        this.autoSaveTimer = null;

        // Backup system
        this.backupHistory = [];
        this.maxBackups = 10;
    }

    /**
     * Initialize the data manager
     */
    async init() {
        try {
            console.log('📊 Initializing Data Manager...');

            await this.loadFromStorage();

            if (this.activities.length === 0) {
                this.loadSampleData();
            }

            this.applyFilters();
            this.setupAutoSave();

            console.log(`✅ Data Manager initialized with ${this.activities.length} activities`);
            this.emit(EVENTS.DATA_UPDATED);

        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            throw error;
        }
    }

    /**
     * Load sample data for demonstration
     */
    loadSampleData() {
        const sampleActivities = [
            {
                activity: "Depart from Home to Melbourne Airport",
                date: "2025-09-19",
                startTime: "17:00",
                endTime: "17:40",
                startFrom: "Home",
                reachTo: "Melbourne Airport",
                transportMode: "Uber",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 100.00,
                additionalDetails: "Book Uber in advance, allow extra time for traffic",
                accommodationDetails: ""
            },
            {
                activity: "International Flight to London",
                date: "2025-09-19",
                startTime: "19:35",
                endTime: "06:50",
                startFrom: "Melbourne Airport (MEL)",
                reachTo: "London Heathrow (LHR)",
                transportMode: "Flight",
                booking: BOOKING_STATUS.BOOKED,
                cost: 7800.00,
                additionalDetails: "AIR INDIA flight AI-309. Seats 14A-14B. Check-in opens 24h before departure. Bring passport and travel documents.",
                accommodationDetails: ""
            },
            {
                activity: "Airport Transfer to Hotel",
                date: "2025-09-20",
                startTime: "08:00",
                endTime: "09:30",
                startFrom: "London Heathrow Airport",
                reachTo: "The Strand Palace Hotel",
                transportMode: "Taxi",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 150.00,
                additionalDetails: "Pre-book airport transfer or use Heathrow Express + taxi",
                accommodationDetails: ""
            },
            {
                activity: "Hotel Check-in",
                date: "2025-09-20",
                startTime: "14:00",
                endTime: "15:00",
                startFrom: "Hotel Lobby",
                reachTo: "Hotel Room",
                transportMode: "",
                booking: BOOKING_STATUS.BOOKED,
                cost: 0,
                additionalDetails: "Early check-in requested. Confirmation number: HTL-2025-001",
                accommodationDetails: "The Strand Palace Hotel, 372 Strand, London WC2R 0JJ. Superior King Room. WiFi included."
            },
            {
                activity: "London Walking Tour",
                date: "2025-09-20",
                startTime: "16:00",
                endTime: "19:00",
                startFrom: "Hotel",
                reachTo: "Westminster Area",
                transportMode: "Walking",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 45.00,
                additionalDetails: "Self-guided tour: Big Ben, Westminster Abbey, Houses of Parliament, London Eye. Wear comfortable shoes.",
                accommodationDetails: ""
            },
            {
                activity: "Traditional British Dinner",
                date: "2025-09-20",
                startTime: "19:30",
                endTime: "21:30",
                startFrom: "Westminster",
                reachTo: "Rules Restaurant",
                transportMode: "Walking",
                booking: BOOKING_STATUS.BOOKED,
                cost: 120.00,
                additionalDetails: "Oldest restaurant in London. Reservation for 2 at 7:30 PM. Smart casual dress code.",
                accommodationDetails: ""
            },
            {
                activity: "British Museum Visit",
                date: "2025-09-21",
                startTime: "10:00",
                endTime: "14:00",
                startFrom: "Hotel",
                reachTo: "British Museum",
                transportMode: "Tube",
                booking: BOOKING_STATUS.BOOKED,
                cost: 25.00,
                additionalDetails: "Pre-booked entry tickets. Focus on Egyptian collection and Rosetta Stone. Audio guide recommended.",
                accommodationDetails: ""
            },
            {
                activity: "Covent Garden Shopping",
                date: "2025-09-21",
                startTime: "15:00",
                endTime: "18:00",
                startFrom: "British Museum",
                reachTo: "Covent Garden",
                transportMode: "Walking",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 200.00,
                additionalDetails: "Shopping budget for souvenirs and local crafts. Visit the market and street performers.",
                accommodationDetails: ""
            }
        ];

        this.activities = sampleActivities.map(data => new ActivityModel(data));
        this.sortActivities();
        this.markDirty();

        console.log(`📝 Loaded ${this.activities.length} sample activities`);
    }

    /**
     * Load data from localStorage
     */
    async loadFromStorage() {
        try {
            const data = localStorage.getItem(this.options.storageKey);
            if (!data) {
                console.log('📦 No saved data found');
                return;
            }

            const parsed = JSON.parse(data);

            // Validate data structure
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid data format');
            }

            // Load activities
            if (parsed.activities && Array.isArray(parsed.activities)) {
                this.activities = parsed.activities.map(data => new ActivityModel(data));
                console.log(`📥 Loaded ${this.activities.length} activities from storage`);
            }

            // Load filters
            if (parsed.filters) {
                this.filters = { ...DEFAULT_FILTERS, ...parsed.filters };
            }

            // Load sort configuration
            if (parsed.sortConfig) {
                this.sortConfig = { ...this.sortConfig, ...parsed.sortConfig };
            }

            // Load metadata
            if (parsed.metadata) {
                this.lastSaved = parsed.metadata.savedAt;
            }

            // Load backup history
            if (parsed.backupHistory && Array.isArray(parsed.backupHistory)) {
                this.backupHistory = parsed.backupHistory.slice(-this.maxBackups);
            }

            this.sortActivities();

        } catch (error) {
            console.error('Failed to load from storage:', error);
            // Don't throw - continue with empty data
            this.activities = [];
            this.filters = { ...DEFAULT_FILTERS };
        }
    }

    /**
     * Save data to localStorage
     */
    async saveToStorage() {
        if (!this.isDirty) {
            return true;
        }

        try {
            // Create backup before saving
            if (this.options.enableBackup) {
                this.createBackup();
            }

            const data = {
                activities: this.activities.map(activity => activity.toJSON()),
                filters: this.filters,
                sortConfig: this.sortConfig,
                metadata: {
                    version: '2.0.0',
                    savedAt: new Date().toISOString(),
                    totalActivities: this.activities.length,
                    lastModified: new Date().toISOString()
                },
                backupHistory: this.backupHistory
            };

            const jsonString = JSON.stringify(data);

            // Check storage size
            const sizeInBytes = new Blob([jsonString]).size;
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

            if (sizeInBytes > 5 * 1024 * 1024) { // 5MB limit
                console.warn(`⚠️ Large storage size: ${sizeInMB}MB`);
            }

            localStorage.setItem(this.options.storageKey, jsonString);

            this.isDirty = false;
            this.lastSaved = new Date().toISOString();

            console.log(`💾 Data saved successfully (${sizeInMB}MB)`);
            return true;

        } catch (error) {
            console.error('Failed to save to storage:', error);

            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }

            return false;
        }
    }

    /**
     * Handle storage quota exceeded
     */
    handleStorageQuotaExceeded() {
        console.warn('⚠️ Storage quota exceeded, attempting cleanup...');

        try {
            // Remove old backups
            this.backupHistory = this.backupHistory.slice(-5);

            // Try saving again
            this.saveToStorage();

        } catch (error) {
            console.error('Storage cleanup failed:', error);
            this.emit('storage:quota-exceeded', {
                error,
                dataSize: this.activities.length,
                suggestion: 'Consider exporting and removing old activities'
            });
        }
    }

    /**
     * Create backup
     */
    createBackup() {
        if (this.activities.length === 0) return;

        const backup = {
            timestamp: new Date().toISOString(),
            activitiesCount: this.activities.length,
            activities: this.activities.map(a => a.toJSON())
        };

        this.backupHistory.push(backup);

        // Keep only last N backups
        if (this.backupHistory.length > this.maxBackups) {
            this.backupHistory = this.backupHistory.slice(-this.maxBackups);
        }
    }

    /**
     * Restore from backup
     */
    restoreFromBackup(backupIndex = 0) {
        if (backupIndex >= this.backupHistory.length) {
            throw new Error('Backup index out of range');
        }

        const backup = this.backupHistory[this.backupHistory.length - 1 - backupIndex];

        try {
            this.activities = backup.activities.map(data => new ActivityModel(data));
            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            console.log(`🔄 Restored from backup: ${backup.activitiesCount} activities`);
            this.emit(EVENTS.DATA_UPDATED);

            return true;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty) {
                this.saveToStorage();
            }
        }, this.options.autoSaveInterval);
    }

    /**
     * Mark data as dirty (needs saving)
     */
    markDirty() {
        this.isDirty = true;
        this.stats.totalOperations++;
    }

    /**
     * Sort activities based on current configuration
     */
    sortActivities() {
        const startTime = performance.now();

        this.activities.sort((a, b) => {
            const { field, direction } = this.sortConfig;
            let aValue = a[field];
            let bValue = b[field];

            // Handle different data types
            if (field === 'date') {
                aValue = new Date(aValue || '1900-01-01');
                bValue = new Date(bValue || '1900-01-01');
            } else if (field === 'cost') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue || '').toLowerCase();
            }

            let result = 0;
            if (aValue < bValue) result = -1;
            else if (aValue > bValue) result = 1;

            // Secondary sort by time if dates are equal
            if (result === 0 && field === 'date') {
                const aTime = a.startTime || '00:00';
                const bTime = b.startTime || '00:00';
                result = aTime.localeCompare(bTime);
            }

            return direction === 'desc' ? -result : result;
        });

        this.stats.lastSortTime = performance.now() - startTime;
    }

    /**
     * Apply current filters to activities
     */
    applyFilters() {
        const startTime = performance.now();

        let filtered = [...this.activities];

        // Text search
        if (this.filters.search && this.filters.search.trim()) {
            const searchTerm = this.filters.search.toLowerCase().trim();
            filtered = filtered.filter(activity => activity.matches(searchTerm));
        }

        // Date range filter
        if (this.filters.startDate) {
            filtered = filtered.filter(activity =>
                activity.date >= this.filters.startDate
            );
        }
        if (this.filters.endDate) {
            filtered = filtered.filter(activity =>
                activity.date <= this.filters.endDate
            );
        }

        // Transport mode filter
        if (this.filters.transport) {
            filtered = filtered.filter(activity =>
                activity.transportMode === this.filters.transport
            );
        }

        // Booking status filter
        if (this.filters.booking && this.filters.booking.length < 2) {
            const bookingStatus = this.filters.booking[0];
            filtered = filtered.filter(activity =>
                activity.booking === bookingStatus
            );
        }

        // Cost filter
        if (this.filters.maxCost && this.filters.maxCost < 10000) {
            filtered = filtered.filter(activity =>
                activity.cost <= this.filters.maxCost
            );
        }

        // Category filter
        if (this.filters.category && this.filters.category !== 'all') {
            filtered = filtered.filter(activity =>
                activity.category === this.filters.category
            );
        }

        this.filteredActivities = filtered;
        this.stats.lastFilterTime = performance.now() - startTime;
    }

    /**
     * Add new activity
     */
    addActivity(activityData) {
        if (this.activities.length >= this.options.maxActivities) {
            throw new Error(`Maximum number of activities (${this.options.maxActivities}) reached`);
        }

        const activity = new ActivityModel(activityData);

        if (this.options.enableValidation) {
            const validation = activity.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
        }

        // Check for duplicates
        const duplicate = this.activities.find(a =>
            a.activity === activity.activity &&
            a.date === activity.date &&
            a.startTime === activity.startTime
        );

        if (duplicate) {
            console.warn('⚠️ Similar activity already exists:', duplicate.id);
        }

        this.activities.push(activity);
        this.sortActivities();
        this.applyFilters();
        this.markDirty();

        console.log(`➕ Added activity: ${activity.activity}`);
        this.emit(EVENTS.ACTIVITY_ADDED, activity);
        this.emit(EVENTS.DATA_UPDATED);

        return activity;
    }

    /**
     * Update existing activity
     */
    updateActivity(id, updateData) {
        const activity = this.getActivityById(id);
        if (!activity) {
            throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
        }

        const originalData = activity.toJSON();
        activity.update(updateData);

        if (this.options.enableValidation) {
            const validation = activity.validate();
            if (!validation.isValid) {
                // Restore original data
                activity.update(originalData);
                throw new Error(validation.errors.join(', '));
            }
        }

        this.sortActivities();
        this.applyFilters();
        this.markDirty();

        console.log(`✏️ Updated activity: ${activity.activity}`);
        this.emit(EVENTS.ACTIVITY_UPDATED, activity);
        this.emit(EVENTS.DATA_UPDATED);

        return activity;
    }

    /**
     * Delete activity
     */
    deleteActivity(id) {
        const index = this.activities.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
        }

        const deleted = this.activities.splice(index, 1)[0];

        // Keep in deleted activities for potential restore
        this.deletedActivities.push({
            activity: deleted,
            deletedAt: new Date().toISOString()
        });

        // Keep only last 50 deleted activities
        if (this.deletedActivities.length > 50) {
            this.deletedActivities = this.deletedActivities.slice(-50);
        }

        this.applyFilters();
        this.markDirty();

        console.log(`🗑️ Deleted activity: ${deleted.activity}`);
        this.emit(EVENTS.ACTIVITY_DELETED, deleted);
        this.emit(EVENTS.DATA_UPDATED);

        return deleted;
    }

    /**
     * Duplicate activity
     */
    duplicateActivity(id) {
        const original = this.getActivityById(id);
        if (!original) {
            throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
        }

        const duplicated = original.clone();

        // Modify title to indicate it's a copy
        if (!duplicated.activity.includes('(Copy)')) {
            duplicated.activity += ' (Copy)';
        }

        this.activities.push(duplicated);
        this.sortActivities();
        this.applyFilters();
        this.markDirty();

        console.log(`📋 Duplicated activity: ${duplicated.activity}`);
        this.emit(EVENTS.ACTIVITY_ADDED, duplicated);
        this.emit(EVENTS.DATA_UPDATED);

        return duplicated;
    }

    /**
     * Bulk operations
     */
    bulkDeleteActivities(ids) {
        const deleted = [];

        ids.forEach(id => {
            try {
                const activity = this.deleteActivity(id);
                deleted.push(activity);
            } catch (error) {
                console.warn(`Failed to delete activity ${id}:`, error);
            }
        });

        return deleted;
    }

    bulkUpdateActivities(updates) {
        const updated = [];

        updates.forEach(({ id, data }) => {
            try {
                const activity = this.updateActivity(id, data);
                updated.push(activity);
            } catch (error) {
                console.warn(`Failed to update activity ${id}:`, error);
            }
        });

        return updated;
    }

    /**
     * Import activities from external data
     */
    importActivities(activitiesData, options = {}) {
        const {
            replaceAll = false,
            skipDuplicates = true,
            validateAll = true
        } = options;

        if (replaceAll) {
            this.activities = [];
        }

        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        activitiesData.forEach((data, index) => {
            try {
                const activity = new ActivityModel(data);

                // Validate if enabled
                if (validateAll) {
                    const validation = activity.validate();
                    if (!validation.isValid) {
                        results.errors.push({
                            index,
                            errors: validation.errors
                        });
                        return;
                    }
                }

                // Check for duplicates
                if (skipDuplicates) {
                    const existing = this.activities.find(a =>
                        a.activity === activity.activity &&
                        a.date === activity.date &&
                        a.startTime === activity.startTime
                    );

                    if (existing) {
                        results.skipped++;
                        return;
                    }
                }

                this.activities.push(activity);
                results.imported++;

            } catch (error) {
                results.errors.push({
                    index,
                    error: error.message
                });
            }
        });

        if (results.imported > 0) {
            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            console.log(`📥 Imported ${results.imported} activities`);
            this.emit(EVENTS.DATA_UPDATED);
        }

        return results;
    }

    /**
     * Export activities to CSV format
     */
    exportToCSV(options = {}) {
        const {
            includeFiltered = false,
            includeHeaders = true,
            customFields = null
        } = options;

        const activities = includeFiltered ? this.filteredActivities : this.activities;

        if (activities.length === 0) {
            return 'No activities to export';
        }

        const headers = customFields || [
            'Activity', 'Date', 'Start Time', 'End Time',
            'From', 'To', 'Transport Mode', 'Booking Required',
            'Cost', 'Additional Details', 'Accommodation Details'
        ];

        const rows = [];

        if (includeHeaders) {
            rows.push(headers.join(','));
        }

        activities.forEach(activity => {
            const csvData = activity.toCSV();
            const values = headers.map(header => {
                let value = csvData[header] || '';

                // Escape CSV values
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""');
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        value = `"${value}"`;
                    }
                }

                return value;
            });

            rows.push(values.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Get activity by ID
     */
    getActivityById(id) {
        return this.activities.find(activity => activity.id === id);
    }

    /**
     * Get activities by date
     */
    getActivitiesByDate() {
        return Utils.groupBy(this.filteredActivities, 'date');
    }

    /**
     * Get upcoming activities
     */
    getUpcomingActivities(days = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        const todayStr = today.toISOString().split('T')[0];
        const futureDateStr = futureDate.toISOString().split('T')[0];

        return this.activities.filter(activity =>
            activity.date >= todayStr && activity.date <= futureDateStr
        );
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const total = this.activities.length;
        const booked = this.activities.filter(a => a.isBooked()).length;
        const totalCost = this.activities.reduce((sum, a) => sum + a.cost, 0);
        const dates = [...new Set(this.activities.map(a => a.date))];
        const upcoming = this.getUpcomingActivities().length;

        // Transport mode breakdown
        const transportModes = {};
        this.activities.forEach(a => {
            if (a.transportMode) {
                transportModes[a.transportMode] = (transportModes[a.transportMode] || 0) + 1;
            }
        });

        // Countries/locations
        const locations = new Set();
        this.activities.forEach(a => {
            if (a.startFrom) locations.add(a.startFrom);
            if (a.reachTo) locations.add(a.reachTo);
        });

        return {
            totalActivities: total,
            bookingsCount: booked,
            bookingPercentage: total > 0 ? Math.round((booked / total) * 100) : 0,
            totalCost,
            averageCostPerActivity: total > 0 ? totalCost / total : 0,
            totalDays: dates.length,
            upcomingActivities: upcoming,
            totalCountries: locations.size,
            transportModes,
            performance: this.stats
        };
    }

    /**
     * Get cost breakdown by category/transport
     */
    getCostBreakdown() {
        const breakdown = {};

        this.activities.forEach(activity => {
            const key = activity.category || 'other';
            breakdown[key] = (breakdown[key] || 0) + activity.cost;
        });

        return breakdown;
    }

    /**
     * Search activities
     */
    searchActivities(query, options = {}) {
        const {
            fields = ['activity', 'startFrom', 'reachTo', 'additionalDetails'],
            caseSensitive = false,
            exactMatch = false
        } = options;

        if (!query || !query.trim()) {
            return this.activities;
        }

        const searchTerm = caseSensitive ? query.trim() : query.trim().toLowerCase();

        return this.activities.filter(activity => {
            return fields.some(field => {
                let value = activity[field] || '';
                if (!caseSensitive) {
                    value = value.toLowerCase();
                }

                return exactMatch ? value === searchTerm : value.includes(searchTerm);
            });
        });
    }

    /**
     * Update filters
     */
    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.applyFilters();
        this.emit(EVENTS.DATA_UPDATED);
    }

    /**
     * Reset filters
     */
    resetFilters() {
        this.filters = { ...DEFAULT_FILTERS };
        this.applyFilters();
        this.emit(EVENTS.DATA_UPDATED);
    }

    /**
     * Update sort configuration
     */
    updateSort(field, direction) {
        this.sortConfig = { field, direction };
        this.sortActivities();
        this.applyFilters();
        this.emit(EVENTS.DATA_UPDATED);
    }

    /**
     * Get validation summary
     */
    getValidationSummary() {
        const summary = {
            valid: 0,
            invalid: 0,
            errors: []
        };

        this.activities.forEach((activity, index) => {
            const validation = activity.validate();
            if (validation.isValid) {
                summary.valid++;
            } else {
                summary.invalid++;
                summary.errors.push({
                    index,
                    id: activity.id,
                    activity: activity.activity,
                    errors: validation.errors
                });
            }
        });

        return summary;
    }

    /**
     * Clean up invalid activities
     */
    cleanupInvalidActivities() {
        const validActivities = [];
        const invalidActivities = [];

        this.activities.forEach(activity => {
            const validation = activity.validate();
            if (validation.isValid) {
                validActivities.push(activity);
            } else {
                invalidActivities.push({
                    activity,
                    errors: validation.errors
                });
            }
        });

        if (invalidActivities.length > 0) {
            this.activities = validActivities;
            this.applyFilters();
            this.markDirty();

            console.log(`🧹 Cleaned up ${invalidActivities.length} invalid activities`);
            this.emit(EVENTS.DATA_UPDATED);
        }

        return {
            removed: invalidActivities.length,
            remaining: validActivities.length,
            invalidActivities
        };
    }

    /**
     * Get deleted activities (for restore functionality)
     */
    getDeletedActivities() {
        return this.deletedActivities.slice().reverse(); // Most recent first
    }

    /**
     * Restore deleted activity
     */
    restoreDeletedActivity(deletedIndex) {
        if (deletedIndex >= this.deletedActivities.length) {
            throw new Error('Deleted activity not found');
        }

        const { activity } = this.deletedActivities[deletedIndex];
        this.deletedActivities.splice(deletedIndex, 1);

        // Generate new ID to avoid conflicts
        activity.id = Utils.generateId();
        activity.updatedAt = new Date().toISOString();

        this.activities.push(activity);
        this.sortActivities();
        this.applyFilters();
        this.markDirty();

        console.log(`♻️ Restored activity: ${activity.activity}`);
        this.emit(EVENTS.ACTIVITY_ADDED, activity);
        this.emit(EVENTS.DATA_UPDATED);

        return activity;
    }

    /**
     * Clear all data
     */
    clearAllData(options = {}) {
        const {
            keepBackups = true,
            keepDeleted = false
        } = options;

        if (!keepBackups) {
            this.backupHistory = [];
        }

        if (!keepDeleted) {
            this.deletedActivities = [];
        }

        this.activities = [];
        this.filteredActivities = [];
        this.filters = { ...DEFAULT_FILTERS };
        this.markDirty();

        console.log('🗑️ Cleared all data');
        this.emit(EVENTS.DATA_UPDATED);
    }

    /**
     * Get memory usage information
     */
    getMemoryUsage() {
        const calculateSize = (obj) => {
            return JSON.stringify(obj).length;
        };

        return {
            activities: calculateSize(this.activities),
            filteredActivities: calculateSize(this.filteredActivities),
            deletedActivities: calculateSize(this.deletedActivities),
            backupHistory: calculateSize(this.backupHistory),
            total: calculateSize({
                activities: this.activities,
                filteredActivities: this.filteredActivities,
                deletedActivities: this.deletedActivities,
                backupHistory: this.backupHistory
            })
        };
    }

    /**
     * Dispose of the data manager
     */
    dispose() {
        // Save final state
        if (this.isDirty) {
            this.saveToStorage();
        }

        // Clear timers
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // Clear all listeners
        this.removeAllListeners();

        // Clear references
        this.activities = [];
        this.filteredActivities = [];
        this.deletedActivities = [];
        this.backupHistory = [];

        console.log('🧹 Data Manager disposed');
    }
}