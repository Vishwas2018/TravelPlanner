/**
 * Travel Itinerary Manager - Enhanced Data Manager
 * Production-ready data management with comprehensive functionality
 * Modern ES6+ implementation with full error handling and validation
 */

import { ActivityModel } from './ActivityModel.js';
import { Utils } from '../core/utils.js';
import { EVENTS, DEFAULT_FILTERS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../core/constants.js';

/**
 * Enhanced Event Emitter for robust data management events
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
        this.maxListeners = 50;
    }

    on(event, listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        if (listeners.length >= this.maxListeners) {
            console.warn(`Max listeners (${this.maxListeners}) exceeded for event '${event}'`);
        }

        listeners.push(listener);
        return this;
    }

    emit(event, ...args) {
        if (this.events.has(event)) {
            const listeners = [...this.events.get(event)]; // Clone to prevent modification during iteration
            listeners.forEach(listener => {
                try {
                    listener.apply(this, args);
                } catch (error) {
                    console.error(`Event listener error for '${event}':`, error);
                }
            });
        }
        return this;
    }

    off(event, listener) {
        if (this.events.has(event)) {
            const listeners = this.events.get(event);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.events.delete(event);
                }
            }
        }
        return this;
    }

    once(event, listener) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            listener.apply(this, args);
        };
        return this.on(event, onceWrapper);
    }

    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
}

/**
 * Production-ready Data Manager with comprehensive functionality
 */
export class DataManager extends EventEmitter {
    constructor(options = {}) {
        super();

        // Configuration
        this.config = {
            maxActivities: options.maxActivities || 10000,
            maxBackups: options.maxBackups || 10,
            maxDeletedItems: options.maxDeletedItems || 50,
            autoSaveInterval: options.autoSaveInterval || 30000,
            enableValidation: options.enableValidation !== false,
            enableBackups: options.enableBackups !== false,
            ...options
        };

        // Core data storage (in-memory)
        this.activities = [];
        this.filteredActivities = [];
        this.deletedActivities = [];
        this.backupHistory = [];

        // State management
        this.filters = this.createDefaultFilters();
        this.sortConfig = {
            field: 'date',
            order: 'asc'
        };

        // Runtime state
        this.isDirty = false;
        this.isLoading = false;
        this.isInitialized = false;
        this.lastSaved = null;
        this.autoSaveTimer = null;

        // Performance tracking
        this.stats = {
            totalOperations: 0,
            lastFilterTime: 0,
            lastSortTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Simple cache for expensive operations
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes

        // Bind methods to preserve context
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }

    /**
     * Create default filters object
     */
    createDefaultFilters() {
        return {
            search: '',
            startDate: '',
            endDate: '',
            transport: '',
            booking: ['TRUE', 'FALSE'],
            minCost: 0,
            maxCost: null,
            categories: [],
            tags: []
        };
    }

    /**
     * Initialize the data manager
     */
    async init() {
        try {
            console.log('🚀 Initializing Enhanced Data Manager v2.1.0');
            this.isLoading = true;

            // Setup browser event listeners for data safety
            this.setupBrowserEvents();

            // Load initial data
            await this.loadInitialData();

            // Setup auto-save functionality
            if (this.config.enableBackups) {
                this.setupAutoSave();
            }

            // Apply initial sorting and filtering
            await this.performInitialSetup();

            this.isInitialized = true;
            console.log('✅ Data Manager initialized successfully');

            this.emit(EVENTS.DATA_UPDATED);
            return this;

        } catch (error) {
            console.error('❌ Failed to initialize Data Manager:', error);
            throw new Error(`Data Manager initialization failed: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Setup browser event listeners for data safety
     */
    setupBrowserEvents() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        }
    }

    /**
     * Handle browser visibility change
     */
    handleVisibilityChange() {
        if (document.hidden && this.isDirty) {
            this.createMemorySnapshot();
        }
    }

    /**
     * Handle before page unload
     */
    handleBeforeUnload(event) {
        if (this.isDirty) {
            this.createMemorySnapshot();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        // Start with empty data - can be extended for persistence
        this.activities = [];
        this.filteredActivities = [];
        console.log('📂 Initial data loaded (empty state)');
    }

    /**
     * Perform initial setup
     */
    async performInitialSetup() {
        await Promise.all([
            this.sortActivities(),
            this.applyFilters()
        ]);
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
                try {
                    this.createMemorySnapshot();
                    this.isDirty = false;
                    this.lastSaved = new Date().toISOString();
                    console.log('💾 Auto-saved to memory snapshot');
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }, this.config.autoSaveInterval);
    }

    /**
     * Create memory snapshot for backup
     */
    createMemorySnapshot() {
        try {
            const snapshot = {
                activities: this.activities.map(a => a.toJSON()),
                filters: Utils.deepClone(this.filters),
                sortConfig: Utils.deepClone(this.sortConfig),
                timestamp: new Date().toISOString(),
                id: Utils.generateId(),
                version: '2.1.0'
            };

            this.backupHistory.push(snapshot);

            // Maintain backup limit
            if (this.backupHistory.length > this.config.maxBackups) {
                this.backupHistory.shift();
            }

            return snapshot.id;
        } catch (error) {
            console.error('Failed to create memory snapshot:', error);
            throw error;
        }
    }

    /**
     * Mark data as dirty and update statistics
     */
    markDirty() {
        this.isDirty = true;
        this.stats.totalOperations++;
        this.invalidateCache();
    }

    /**
     * Invalidate cache entries
     */
    invalidateCache() {
        this.cache.clear();
    }

    /**
     * Get cached value or compute and cache
     */
    getCached(key, computeFn) {
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                this.stats.cacheHits++;
                return cached.value;
            }
            this.cache.delete(key);
        }

        this.stats.cacheMisses++;
        const value = computeFn();
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
        return value;
    }

    // ==================== ACTIVITY CRUD OPERATIONS ====================

    /**
     * Add a new activity with comprehensive validation
     */
    async addActivity(activityData) {
        try {
            // Check activity limit
            if (this.activities.length >= this.config.maxActivities) {
                throw new Error(`Maximum number of activities (${this.config.maxActivities}) reached`);
            }

            const activity = new ActivityModel(activityData);

            if (this.config.enableValidation) {
                const validation = activity.validate();
                if (!validation.isValid) {
                    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                }
            }

            // Check for duplicates if configured
            if (this.isDuplicateActivity(activity)) {
                console.warn('Duplicate activity detected:', activity.activity);
            }

            this.activities.push(activity);
            this.markDirty();

            await Promise.all([
                this.sortActivities(),
                this.applyFilters()
            ]);

            console.log(`➕ Added activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_ADDED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return activity;

        } catch (error) {
            console.error('Failed to add activity:', error);
            throw error;
        }
    }

    /**
     * Update an existing activity with rollback capability
     */
    async updateActivity(id, updates) {
        try {
            const activity = this.getActivityById(id);
            if (!activity) {
                throw new Error(`Activity not found: ${id}`);
            }

            // Create backup for rollback
            const originalData = activity.toJSON();

            // Apply updates
            activity.update(updates);

            // Validate if enabled
            if (this.config.enableValidation) {
                const validation = activity.validate();
                if (!validation.isValid) {
                    // Rollback on validation failure
                    Object.assign(activity, new ActivityModel(originalData));
                    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                }
            }

            this.markDirty();

            await Promise.all([
                this.sortActivities(),
                this.applyFilters()
            ]);

            console.log(`📝 Updated activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_UPDATED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return activity;

        } catch (error) {
            console.error('Failed to update activity:', error);
            throw error;
        }
    }

    /**
     * Delete an activity with recovery option
     */
    async deleteActivity(id) {
        try {
            const index = this.activities.findIndex(a => a.id === id);
            if (index === -1) {
                throw new Error(`Activity not found: ${id}`);
            }

            const activity = this.activities[index];
            this.activities.splice(index, 1);

            // Store for potential recovery
            this.deletedActivities.push({
                ...activity.toJSON(),
                deletedAt: new Date().toISOString(),
                originalIndex: index
            });

            // Maintain deleted items limit
            if (this.deletedActivities.length > this.config.maxDeletedItems) {
                this.deletedActivities.shift();
            }

            this.markDirty();
            await this.applyFilters();

            console.log(`🗑️ Deleted activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_DELETED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return true;

        } catch (error) {
            console.error('Failed to delete activity:', error);
            throw error;
        }
    }

    /**
     * Duplicate an existing activity
     */
    async duplicateActivity(id) {
        try {
            const activity = this.getActivityById(id);
            if (!activity) {
                throw new Error(`Activity not found: ${id}`);
            }

            const duplicatedActivity = activity.clone();
            duplicatedActivity.activity = `${duplicatedActivity.activity} (Copy)`;

            this.activities.push(duplicatedActivity);
            this.markDirty();

            await Promise.all([
                this.sortActivities(),
                this.applyFilters()
            ]);

            console.log(`📋 Duplicated activity: ${duplicatedActivity.activity}`);
            this.emit(EVENTS.ACTIVITY_ADDED, duplicatedActivity);
            this.emit(EVENTS.DATA_UPDATED);

            return duplicatedActivity;

        } catch (error) {
            console.error('Failed to duplicate activity:', error);
            throw error;
        }
    }

    /**
     * Restore a deleted activity
     */
    async restoreActivity(deletedIndex) {
        try {
            if (deletedIndex < 0 || deletedIndex >= this.deletedActivities.length) {
                throw new Error('Invalid deleted activity index');
            }

            const deletedData = this.deletedActivities[deletedIndex];
            const activity = new ActivityModel(deletedData);

            // Remove from deleted list
            this.deletedActivities.splice(deletedIndex, 1);

            // Add back to activities
            this.activities.push(activity);
            this.markDirty();

            await Promise.all([
                this.sortActivities(),
                this.applyFilters()
            ]);

            console.log(`🔄 Restored activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_ADDED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return activity;

        } catch (error) {
            console.error('Failed to restore activity:', error);
            throw error;
        }
    }

    /**
     * Get activity by ID with caching
     */
    getActivityById(id) {
        return this.getCached(`activity_${id}`, () => {
            return this.activities.find(activity => activity.id === id) || null;
        });
    }

    // ==================== FILTERING AND SORTING ====================

    /**
     * Apply filters with performance optimization
     */
    async applyFilters() {
        const startTime = performance.now();

        try {
            let filtered = [...this.activities];

            // Text search with fuzzy matching
            if (this.filters.search?.trim()) {
                const searchTerm = this.filters.search.toLowerCase().trim();
                filtered = filtered.filter(activity =>
                    activity.matches ? activity.matches(searchTerm) :
                        this.basicTextMatch(activity, searchTerm)
                );
            }

            // Date range filtering
            if (this.filters.startDate) {
                filtered = filtered.filter(a => a.date >= this.filters.startDate);
            }
            if (this.filters.endDate) {
                filtered = filtered.filter(a => a.date <= this.filters.endDate);
            }

            // Transport mode filtering
            if (this.filters.transport && this.filters.transport !== '') {
                filtered = filtered.filter(a => a.transportMode === this.filters.transport);
            }

            // Booking status filtering with array support
            if (this.filters.booking && Array.isArray(this.filters.booking)) {
                if (this.filters.booking.length === 1) {
                    filtered = filtered.filter(a => this.filters.booking.includes(a.booking));
                }
                // If both TRUE and FALSE are selected, show all
            }

            // Cost range filtering
            if (this.filters.minCost > 0) {
                filtered = filtered.filter(a => a.cost >= this.filters.minCost);
            }
            if (this.filters.maxCost && this.filters.maxCost > 0) {
                filtered = filtered.filter(a => a.cost <= this.filters.maxCost);
            }

            // Category filtering
            if (this.filters.categories?.length > 0) {
                filtered = filtered.filter(a =>
                    this.filters.categories.includes(a.category || 'other')
                );
            }

            this.filteredActivities = filtered;
            this.stats.lastFilterTime = performance.now() - startTime;

            console.log(`🔍 Filtered ${filtered.length}/${this.activities.length} activities in ${this.stats.lastFilterTime.toFixed(2)}ms`);
            this.emit(EVENTS.FILTER_CHANGED, this.filters);

        } catch (error) {
            console.error('Filter application failed:', error);
            this.filteredActivities = [...this.activities]; // Fallback to unfiltered
        }
    }

    /**
     * Basic text matching fallback
     */
    basicTextMatch(activity, searchTerm) {
        const searchableFields = [
            activity.activity,
            activity.startFrom,
            activity.reachTo,
            activity.transportMode,
            activity.additionalDetails,
            activity.accommodationDetails
        ];

        return searchableFields.some(field =>
            field && field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Sort activities with performance optimization
     */
    async sortActivities() {
        const startTime = performance.now();

        try {
            this.activities.sort((a, b) => {
                let aValue = a[this.sortConfig.field];
                let bValue = b[this.sortConfig.field];

                // Handle different data types
                switch (this.sortConfig.field) {
                    case 'date':
                        aValue = new Date(aValue || '1970-01-01');
                        bValue = new Date(bValue || '1970-01-01');
                        break;
                    case 'cost':
                        aValue = parseFloat(aValue) || 0;
                        bValue = parseFloat(bValue) || 0;
                        break;
                    case 'createdAt':
                    case 'updatedAt':
                        aValue = new Date(aValue || 0);
                        bValue = new Date(bValue || 0);
                        break;
                    default:
                        if (typeof aValue === 'string') {
                            aValue = aValue.toLowerCase();
                            bValue = (bValue || '').toLowerCase();
                        }
                }

                let result = 0;
                if (aValue < bValue) result = -1;
                else if (aValue > bValue) result = 1;

                return this.sortConfig.order === 'desc' ? -result : result;
            });

            this.stats.lastSortTime = performance.now() - startTime;
            console.log(`📊 Sorted ${this.activities.length} activities by ${this.sortConfig.field} in ${this.stats.lastSortTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('Sort operation failed:', error);
        }
    }

    /**
     * Update filters with validation
     */
    updateFilters(newFilters) {
        try {
            // Validate filter values
            const validatedFilters = this.validateFilters(newFilters);

            this.filters = { ...this.filters, ...validatedFilters };
            this.applyFilters();
            this.markDirty();

        } catch (error) {
            console.error('Failed to update filters:', error);
            throw error;
        }
    }

    /**
     * Validate filter values
     */
    validateFilters(filters) {
        const validated = {};

        Object.keys(filters).forEach(key => {
            const value = filters[key];

            switch (key) {
                case 'search':
                    validated[key] = typeof value === 'string' ? value : '';
                    break;
                case 'startDate':
                case 'endDate':
                    validated[key] = value && !isNaN(new Date(value)) ? value : '';
                    break;
                case 'transport':
                    validated[key] = typeof value === 'string' ? value : '';
                    break;
                case 'booking':
                    validated[key] = Array.isArray(value) ? value : [value].filter(Boolean);
                    break;
                case 'minCost':
                case 'maxCost':
                    validated[key] = typeof value === 'number' && value >= 0 ? value : 0;
                    break;
                case 'categories':
                    validated[key] = Array.isArray(value) ? value : [];
                    break;
                default:
                    validated[key] = value;
            }
        });

        return validated;
    }

    /**
     * Reset filters to default
     */
    resetFilters() {
        this.filters = this.createDefaultFilters();
        this.applyFilters();
        this.markDirty();
        this.emit(EVENTS.FILTER_CHANGED, this.filters);
    }

    /**
     * Update sort configuration
     */
    updateSort(field, order = 'asc') {
        if (!['asc', 'desc'].includes(order)) {
            throw new Error('Sort order must be "asc" or "desc"');
        }

        this.sortConfig = { field, order };
        this.sortActivities().then(() => {
            this.applyFilters();
            this.markDirty();
            this.emit(EVENTS.SORT_CHANGED, this.sortConfig);
        });
    }

    // ==================== STATISTICS AND ANALYTICS ====================

    /**
     * Get comprehensive statistics with caching
     */
    getStatistics() {
        return this.getCached('statistics', () => {
            const stats = {
                totalActivities: this.activities.length,
                filteredActivities: this.filteredActivities.length,
                totalCost: 0,
                averageCostPerActivity: 0,
                transportModes: {},
                categories: {},
                bookingStatus: {},
                bookingsCount: 0,
                bookingPercentage: 0,
                upcomingActivities: 0,
                dateRange: this.getDateRange(),
                costRange: { min: Infinity, max: -Infinity },
                totalDays: 0,
                totalCountries: 0
            };

            // Calculate statistics from activities
            this.activities.forEach(activity => {
                // Cost calculations
                stats.totalCost += activity.cost || 0;
                if (activity.cost < stats.costRange.min) stats.costRange.min = activity.cost;
                if (activity.cost > stats.costRange.max) stats.costRange.max = activity.cost;

                // Transport mode distribution
                const transport = activity.transportMode || 'Unknown';
                stats.transportModes[transport] = (stats.transportModes[transport] || 0) + 1;

                // Category distribution
                const category = activity.category || 'other';
                stats.categories[category] = (stats.categories[category] || 0) + 1;

                // Booking status distribution
                const booking = activity.booking || 'FALSE';
                stats.bookingStatus[booking] = (stats.bookingStatus[booking] || 0) + 1;

                if (activity.isBooked && activity.isBooked()) {
                    stats.bookingsCount++;
                }

                // Check if upcoming (next 7 days)
                if (activity.isUpcoming && activity.isUpcoming(7)) {
                    stats.upcomingActivities++;
                }
            });

            // Calculate derived statistics
            stats.averageCostPerActivity = stats.totalActivities > 0
                ? stats.totalCost / stats.totalActivities
                : 0;

            stats.bookingPercentage = stats.totalActivities > 0
                ? Math.round((stats.bookingsCount / stats.totalActivities) * 100)
                : 0;

            // Fix cost range edge cases
            if (stats.costRange.min === Infinity) stats.costRange.min = 0;
            if (stats.costRange.max === -Infinity) stats.costRange.max = 0;

            // Calculate total days
            if (stats.dateRange) {
                stats.totalDays = stats.dateRange.totalDays;
            }

            // Extract unique destinations for country count
            const destinations = new Set();
            this.activities.forEach(activity => {
                if (activity.reachTo) destinations.add(activity.reachTo);
                if (activity.startFrom) destinations.add(activity.startFrom);
            });
            stats.totalCountries = destinations.size;

            return stats;
        });
    }

    /**
     * Get cost breakdown by category with caching
     */
    getCostBreakdown() {
        return this.getCached('costBreakdown', () => {
            const breakdown = {};

            this.activities.forEach(activity => {
                const category = activity.category || 'other';
                breakdown[category] = (breakdown[category] || 0) + (activity.cost || 0);
            });

            return breakdown;
        });
    }

    /**
     * Get upcoming activities with caching
     */
    getUpcomingActivities(daysAhead = 7) {
        return this.getCached(`upcoming_${daysAhead}`, () => {
            const today = new Date().toISOString().split('T')[0];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
            const cutoffString = cutoffDate.toISOString().split('T')[0];

            return this.activities
                .filter(activity => {
                    return activity.date >= today && activity.date <= cutoffString;
                })
                .sort((a, b) => new Date(a.date) - new Date(b.date));
        });
    }

    /**
     * Get date range of activities
     */
    getDateRange() {
        if (this.activities.length === 0) return null;

        const dates = this.activities
            .map(a => a.date)
            .filter(date => date)
            .sort();

        if (dates.length === 0) return null;

        const startDate = new Date(dates[0]);
        const endDate = new Date(dates[dates.length - 1]);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        return {
            start: dates[0],
            end: dates[dates.length - 1],
            totalDays: Math.max(1, totalDays)
        };
    }

    // ==================== IMPORT/EXPORT FUNCTIONALITY ====================

    /**
     * Import activities with comprehensive error handling
     */
    async importActivities(activitiesData, options = {}) {
        const {
            skipDuplicates = true,
            validateAll = true,
            batchSize = 100
        } = options;

        const results = {
            imported: 0,
            skipped: 0,
            errors: [],
            totalProcessed: 0
        };

        try {
            // Process in batches for better performance
            for (let i = 0; i < activitiesData.length; i += batchSize) {
                const batch = activitiesData.slice(i, i + batchSize);

                for (const [index, data] of batch.entries()) {
                    const globalIndex = i + index;
                    results.totalProcessed++;

                    try {
                        const activity = new ActivityModel(data);

                        if (validateAll && this.config.enableValidation) {
                            const validation = activity.validate();
                            if (!validation.isValid) {
                                results.errors.push({
                                    index: globalIndex + 1,
                                    data,
                                    errors: validation.errors
                                });
                                continue;
                            }
                        }

                        if (skipDuplicates && this.isDuplicateActivity(activity)) {
                            results.skipped++;
                            continue;
                        }

                        this.activities.push(activity);
                        results.imported++;

                    } catch (error) {
                        results.errors.push({
                            index: globalIndex + 1,
                            data,
                            errors: [error.message]
                        });
                    }
                }

                // Yield control periodically for large imports
                if (i % (batchSize * 10) === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            if (results.imported > 0) {
                this.markDirty();
                await Promise.all([
                    this.sortActivities(),
                    this.applyFilters()
                ]);
                this.emit(EVENTS.DATA_UPDATED);
            }

            console.log(`📥 Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);
            return results;

        } catch (error) {
            console.error('Import operation failed:', error);
            throw error;
        }
    }

    /**
     * Check if activity is duplicate
     */
    isDuplicateActivity(newActivity) {
        return this.activities.some(existing =>
            existing.activity === newActivity.activity &&
            existing.date === newActivity.date &&
            existing.startTime === newActivity.startTime
        );
    }

    /**
     * Export activities to CSV format
     */
    exportToCSV() {
        try {
            const headers = [
                'Activity', 'Date', 'Start Time', 'End Time', 'From', 'To',
                'Transport Mode', 'Booking', 'Cost', 'Additional Details', 'Accommodation Details'
            ];

            const rows = [headers.join(',')];

            this.activities.forEach(activity => {
                const csvRow = activity.toCSV ? activity.toCSV() : this.activityToCSV(activity);
                const values = headers.map(header => {
                    let value = csvRow[header] || '';

                    // Escape and quote values that contain commas, quotes, or newlines
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""'); // Escape quotes
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            value = `"${value}"`;
                        }
                    }

                    return value;
                });

                rows.push(values.join(','));
            });

            return rows.join('\n');

        } catch (error) {
            console.error('CSV export failed:', error);
            throw error;
        }
    }

    /**
     * Convert activity to CSV format (fallback)
     */
    activityToCSV(activity) {
        return {
            'Activity': activity.activity || '',
            'Date': activity.date || '',
            'Start Time': activity.startTime || '',
            'End Time': activity.endTime || '',
            'From': activity.startFrom || '',
            'To': activity.reachTo || '',
            'Transport Mode': activity.transportMode || '',
            'Booking': activity.booking || 'FALSE',
            'Cost': activity.cost || 0,
            'Additional Details': activity.additionalDetails || '',
            'Accommodation Details': activity.accommodationDetails || ''
        };
    }

    // ==================== BACKUP AND RECOVERY ====================

    /**
     * Create a backup with metadata
     */
    createBackup(description = '') {
        try {
            const backupId = this.createMemorySnapshot();

            if (backupId && description) {
                const backup = this.backupHistory.find(b => b.id === backupId);
                if (backup) {
                    backup.description = description;
                }
            }

            return backupId;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    /**
     * Restore from backup with validation
     */
    async restoreFromBackup(backupId) {
        try {
            const backup = this.backupHistory.find(b => b.id === backupId);
            if (!backup) {
                throw new Error(`Backup not found: ${backupId}`);
            }

            // Validate backup data
            if (!backup.activities || !Array.isArray(backup.activities)) {
                throw new Error('Invalid backup data format');
            }

            // Create restore point before restoring
            const restorePointId = this.createMemorySnapshot();
            console.log(`Created restore point: ${restorePointId}`);

            // Restore data
            this.activities = backup.activities.map(data => new ActivityModel(data));
            this.filters = Utils.deepClone(backup.filters) || this.createDefaultFilters();
            this.sortConfig = Utils.deepClone(backup.sortConfig) || { field: 'date', order: 'asc' };

            await Promise.all([
                this.sortActivities(),
                this.applyFilters()
            ]);

            this.markDirty();

            console.log(`🔄 Restored from backup: ${backupId}`);
            this.emit(EVENTS.DATA_UPDATED);

            return true;

        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw new Error(`Backup restoration failed: ${error.message}`);
        }
    }

    /**
     * Get list of available backups with metadata
     */
    getBackupList() {
        return this.backupHistory.map(backup => ({
            id: backup.id,
            description: backup.description || `Backup ${backup.timestamp}`,
            createdAt: backup.createdAt || backup.timestamp,
            activitiesCount: backup.activities ? backup.activities.length : 0,
            size: JSON.stringify(backup).length,
            version: backup.version || '1.0.0'
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Delete a specific backup
     */
    deleteBackup(backupId) {
        const index = this.backupHistory.findIndex(b => b.id === backupId);
        if (index === -1) {
            throw new Error(`Backup not found: ${backupId}`);
        }

        this.backupHistory.splice(index, 1);
        console.log(`🗑️ Deleted backup: ${backupId}`);
        return true;
    }

    // ==================== BATCH OPERATIONS ====================

    /**
     * Perform batch operations on multiple activities
     */
    async batchOperation(operation, activityIds, data = {}) {
        const results = {
            successful: [],
            failed: []
        };

        try {
            for (const id of activityIds) {
                try {
                    let result;
                    switch (operation) {
                        case 'delete':
                            result = await this.deleteActivity(id);
                            break;
                        case 'update':
                            result = await this.updateActivity(id, data);
                            break;
                        case 'duplicate':
                            result = await this.duplicateActivity(id);
                            break;
                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                    results.successful.push({ id, result });
                } catch (error) {
                    results.failed.push({ id, error: error.message });
                }
            }

            console.log(`📦 Batch ${operation}: ${results.successful.length} successful, ${results.failed.length} failed`);
            return results;

        } catch (error) {
            console.error('Batch operation failed:', error);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get filtered activities
     */
    getFilteredActivities() {
        return this.filteredActivities;
    }

    /**
     * Get all activities
     */
    getAllActivities() {
        return this.activities;
    }

    /**
     * Get activity count
     */
    getActivityCount() {
        return this.activities.length;
    }

    /**
     * Get filtered count
     */
    getFilteredCount() {
        return this.filteredActivities.length;
    }

    /**
     * Get current filters
     */
    getCurrentFilters() {
        return Utils.deepClone(this.filters);
    }

    /**
     * Get current sort configuration
     */
    getCurrentSort() {
        return Utils.deepClone(this.sortConfig);
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.resetFilters();
    }

    /**
     * Check if data manager is ready
     */
    isReady() {
        return this.isInitialized && !this.isLoading;
    }

    /**
     * Get deleted activities for recovery
     */
    getDeletedActivities() {
        return this.deletedActivities.map((item, index) => ({
            ...item,
            index,
            timeDeleted: item.deletedAt
        }));
    }

    /**
     * Get memory usage information
     */
    getMemoryUsage() {
        const activitiesSize = JSON.stringify(this.activities).length * 2; // UTF-16
        const backupsSize = JSON.stringify(this.backupHistory).length * 2;
        const filtersSize = JSON.stringify(this.filters).length * 2;
        const cacheSize = JSON.stringify([...this.cache.values()]).length * 2;

        return {
            activities: activitiesSize,
            backups: backupsSize,
            filters: filtersSize,
            cache: cacheSize,
            total: activitiesSize + backupsSize + filtersSize + cacheSize,
            formatted: {
                activities: Utils.formatFileSize ? Utils.formatFileSize(activitiesSize) : `${Math.round(activitiesSize / 1024)}KB`,
                backups: Utils.formatFileSize ? Utils.formatFileSize(backupsSize) : `${Math.round(backupsSize / 1024)}KB`,
                filters: Utils.formatFileSize ? Utils.formatFileSize(filtersSize) : `${Math.round(filtersSize / 1024)}KB`,
                cache: Utils.formatFileSize ? Utils.formatFileSize(cacheSize) : `${Math.round(cacheSize / 1024)}KB`,
                total: Utils.formatFileSize ? Utils.formatFileSize(activitiesSize + backupsSize + filtersSize + cacheSize) : `${Math.round((activitiesSize + backupsSize + filtersSize + cacheSize) / 1024)}KB`
            }
        };
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.stats,
            cacheHitRatio: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
            averageFilterTime: this.stats.lastFilterTime,
            averageSortTime: this.stats.lastSortTime,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Search activities with advanced options
     */
    searchActivities(query, options = {}) {
        const {
            fields = ['activity', 'startFrom', 'reachTo', 'additionalDetails'],
            fuzzy = false,
            limit = null
        } = options;

        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return [];

        let results = this.activities.filter(activity => {
            return fields.some(field => {
                const value = activity[field];
                if (!value) return false;

                if (fuzzy) {
                    // Simple fuzzy matching
                    return this.fuzzyMatch(value.toLowerCase(), searchTerm);
                } else {
                    return value.toLowerCase().includes(searchTerm);
                }
            });
        });

        if (limit && results.length > limit) {
            results = results.slice(0, limit);
        }

        return results;
    }

    /**
     * Simple fuzzy matching implementation
     */
    fuzzyMatch(text, pattern) {
        const textLength = text.length;
        const patternLength = pattern.length;

        if (patternLength > textLength) return false;
        if (patternLength === textLength) return text === pattern;

        let textIndex = 0;
        let patternIndex = 0;

        while (textIndex < textLength && patternIndex < patternLength) {
            if (text[textIndex] === pattern[patternIndex]) {
                patternIndex++;
            }
            textIndex++;
        }

        return patternIndex === patternLength;
    }

    /**
     * Validate data integrity
     */
    validateDataIntegrity() {
        const issues = [];

        this.activities.forEach((activity, index) => {
            try {
                if (this.config.enableValidation) {
                    const validation = activity.validate ? activity.validate() : { isValid: true, errors: [] };
                    if (!validation.isValid) {
                        issues.push({
                            type: 'validation',
                            index,
                            activityId: activity.id,
                            errors: validation.errors
                        });
                    }
                }

                // Check for duplicate IDs
                const duplicateIndex = this.activities.findIndex((other, otherIndex) =>
                    otherIndex !== index && other.id === activity.id
                );
                if (duplicateIndex !== -1) {
                    issues.push({
                        type: 'duplicate_id',
                        index,
                        duplicateIndex,
                        activityId: activity.id
                    });
                }

            } catch (error) {
                issues.push({
                    type: 'error',
                    index,
                    activityId: activity.id,
                    error: error.message
                });
            }
        });

        return {
            isValid: issues.length === 0,
            issues,
            totalActivities: this.activities.length
        };
    }

    // ==================== CLEANUP AND DISPOSAL ====================

    /**
     * Cleanup browser event listeners
     */
    cleanupBrowserEvents() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
        }
    }

    /**
     * Dispose of data manager and clean up resources
     */
    async dispose() {
        try {
            console.log('🧹 Starting Enhanced DataManager disposal...');

            // Create final backup if dirty
            if (this.isDirty) {
                console.log('💾 Creating final backup...');
                this.createBackup('Final backup before disposal');
            }

            // Clear auto-save timer
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
                this.autoSaveTimer = null;
                console.log('⏰ Auto-save timer cleared');
            }

            // Cleanup browser events
            this.cleanupBrowserEvents();

            // Remove all event listeners
            this.removeAllListeners();
            console.log('📢 Event listeners cleared');

            // Clear cache
            this.invalidateCache();
            console.log('🗄️ Cache cleared');

            // Clear all data references
            this.activities = [];
            this.filteredActivities = [];
            this.deletedActivities = [];
            this.backupHistory = [];
            this.filters = this.createDefaultFilters();

            // Reset state
            this.isDirty = false;
            this.isLoading = false;
            this.isInitialized = false;
            this.lastSaved = null;

            // Clear stats
            this.stats = {
                totalOperations: 0,
                lastFilterTime: 0,
                lastSortTime: 0,
                cacheHits: 0,
                cacheMisses: 0
            };

            console.log('✅ Enhanced DataManager disposal completed');

        } catch (error) {
            console.error('Error during disposal:', error);
        }
    }
}

// Export as both named and default for maximum compatibility
export default DataManager;