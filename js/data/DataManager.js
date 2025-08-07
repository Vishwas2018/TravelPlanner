/**
 * Travel Itinerary Manager - Data Management (FIXED)
 * Handles all data operations, storage, filtering, and business logic
 */

import { EventManager } from '../core/events.js';
import { StorageManager } from '../core/storage.js';
import { ActivityModel } from './ActivityModel.js';
import { Utils } from '../core/utils.js';
import {
    EVENTS,
    DEFAULT_FILTERS,
    BOOKING_STATUS,
    COST_CATEGORIES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
} from '../core/constants.js';

export class DataManager extends EventManager {
    constructor() {
        super();
        this.activities = [];
        this.filteredActivities = [];
        this.filters = { ...DEFAULT_FILTERS };
        this.storage = new StorageManager();
        this.isLoading = false;
        this.lastSaved = null;
        this.isDirty = false;

        // Performance tracking
        this.stats = {
            totalOperations: 0,
            lastOperationTime: 0,
            averageOperationTime: 0
        };

        this.init();
    }

    /**
     * Initialize the data manager
     */
    async init() {
        try {
            this.isLoading = true;
            await this.loadFromStorage();

            if (this.activities.length === 0) {
                this.loadSampleData();
            }

            this.applyFilters();
            this.emit(EVENTS.DATA_UPDATED);
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            this.loadSampleData();
            this.applyFilters();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load sample data for demonstration
     */
    loadSampleData() {
        const sampleActivities = [
            {
                activity: "Head to Melbourne Airport",
                date: "2025-09-19",
                day: "Friday",
                startTime: "17:00",
                endTime: "17:40",
                startFrom: "Home",
                reachTo: "Melbourne Airport",
                transportMode: "Uber",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 100.00,
                additionalDetails: "Book Uber in advance",
                accommodationDetails: ""
            },
            {
                activity: "Fly to London",
                date: "2025-09-19",
                day: "Friday",
                startTime: "19:35",
                endTime: "03:50",
                startFrom: "Melbourne",
                reachTo: "London Heathrow",
                transportMode: "Flight",
                booking: BOOKING_STATUS.BOOKED,
                cost: 7800.00,
                additionalDetails: "AIR INDIA flight AI-309",
                accommodationDetails: ""
            },
            {
                activity: "London Sightseeing",
                date: "2025-09-21",
                day: "Sunday",
                startTime: "08:00",
                endTime: "21:00",
                startFrom: "London City Centre",
                reachTo: "London City Centre",
                transportMode: "Walking",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 400.00,
                additionalDetails: "Buckingham Palace, Westminster Abbey, London Eye",
                accommodationDetails: ""
            },
            {
                activity: "Travel to Paris",
                date: "2025-09-28",
                day: "Sunday",
                startTime: "06:00",
                endTime: "09:00",
                startFrom: "London",
                reachTo: "Paris",
                transportMode: "Train",
                booking: BOOKING_STATUS.BOOKED,
                cost: 387.46,
                additionalDetails: "Eurostar high-speed train",
                accommodationDetails: ""
            }
        ];

        this.activities = sampleActivities.map(data => new ActivityModel(data));
        this.sortActivities();
        this.markDirty();
    }

    /**
     * Load data from storage
     */
    async loadFromStorage() {
        try {
            const saved = await this.storage.load();
            if (saved && saved.activities && Array.isArray(saved.activities)) {
                this.activities = saved.activities.map(data => new ActivityModel(data));
                this.filters = { ...DEFAULT_FILTERS, ...saved.filters };
                this.sortActivities();
                this.lastSaved = Date.now();
                console.log(`Loaded ${this.activities.length} activities from storage`);
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
            throw new Error(ERROR_MESSAGES.STORAGE_ERROR);
        }
    }

    /**
     * Save data to storage
     */
    async saveToStorage() {
        if (!this.isDirty) return true;

        try {
            const success = await this.storage.save({
                activities: this.activities.map(activity => activity.toJSON()),
                filters: this.filters,
                metadata: {
                    totalActivities: this.activities.length,
                    lastModified: new Date().toISOString(),
                    version: '2.0.0'
                }
            });

            if (success) {
                this.lastSaved = Date.now();
                this.isDirty = false;
                console.log('Data saved to storage successfully');
            }

            return success;
        } catch (error) {
            console.error('Failed to save to storage:', error);
            return false;
        }
    }

    /**
     * Mark data as dirty (needs saving)
     */
    markDirty() {
        this.isDirty = true;

        // Auto-save after a delay
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(() => {
            this.saveToStorage();
        }, 2000); // Save after 2 seconds of inactivity
    }

    /**
     * Sort activities by date and time
     */
    sortActivities() {
        const startTime = performance.now();

        this.activities.sort((a, b) => {
            // Primary sort: date
            const dateCompare = new Date(a.date) - new Date(b.date);
            if (dateCompare !== 0) return dateCompare;

            // Secondary sort: start time
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            const timeCompare = timeA.localeCompare(timeB);
            if (timeCompare !== 0) return timeCompare;

            // Tertiary sort: priority
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            const priorityA = priorityOrder[a.priority] || 2;
            const priorityB = priorityOrder[b.priority] || 2;
            return priorityA - priorityB;
        });

        this.updateStats('sort', performance.now() - startTime);
    }

    /**
     * Add new activity
     * @param {object} activityData - Activity data
     * @returns {ActivityModel} Created activity
     */
    addActivity(activityData) {
        const startTime = performance.now();

        try {
            const activity = new ActivityModel(activityData);
            const validation = activity.validate();

            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            this.activities.push(activity);
            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            this.emit(EVENTS.ACTIVITY_ADDED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            this.updateStats('add', performance.now() - startTime);
            return activity;
        } catch (error) {
            console.error('Failed to add activity:', error);
            throw error;
        }
    }

    /**
     * Update existing activity
     * @param {string} id - Activity ID
     * @param {object} updateData - Data to update
     * @returns {ActivityModel} Updated activity
     */
    updateActivity(id, updateData) {
        const startTime = performance.now();

        try {
            const index = this.activities.findIndex(a => a.id === id);
            if (index === -1) {
                throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
            }

            const activity = this.activities[index];
            activity.update(updateData);

            const validation = activity.validate();
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            this.emit(EVENTS.ACTIVITY_UPDATED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            this.updateStats('update', performance.now() - startTime);
            return activity;
        } catch (error) {
            console.error('Failed to update activity:', error);
            throw error;
        }
    }

    /**
     * Delete activity
     * @param {string} id - Activity ID
     * @returns {ActivityModel} Deleted activity
     */
    deleteActivity(id) {
        const startTime = performance.now();

        try {
            const index = this.activities.findIndex(a => a.id === id);
            if (index === -1) {
                throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
            }

            const deleted = this.activities.splice(index, 1)[0];
            this.applyFilters();
            this.markDirty();

            this.emit(EVENTS.ACTIVITY_DELETED, deleted);
            this.emit(EVENTS.DATA_UPDATED);

            this.updateStats('delete', performance.now() - startTime);
            return deleted;
        } catch (error) {
            console.error('Failed to delete activity:', error);
            throw error;
        }
    }

    /**
     * Bulk delete activities
     * @param {Array<string>} ids - Array of activity IDs to delete
     * @returns {Array<ActivityModel>} Array of deleted activities
     */
    bulkDeleteActivities(ids) {
        const startTime = performance.now();
        const deleted = [];

        try {
            // Sort indices in descending order to avoid index shifting issues
            const indices = ids
                .map(id => this.activities.findIndex(a => a.id === id))
                .filter(index => index !== -1)
                .sort((a, b) => b - a);

            indices.forEach(index => {
                deleted.push(this.activities.splice(index, 1)[0]);
            });

            if (deleted.length > 0) {
                this.applyFilters();
                this.markDirty();
                this.emit(EVENTS.DATA_UPDATED);
            }

            this.updateStats('bulkDelete', performance.now() - startTime);
            return deleted;
        } catch (error) {
            console.error('Failed to bulk delete activities:', error);
            throw error;
        }
    }

    /**
     * Get activity by ID - FIXED: Added missing method
     * @param {string} id - Activity ID
     * @returns {ActivityModel|null} Activity or null if not found
     */
    getActivityById(id) {
        return this.activities.find(a => a.id === id) || null;
    }

    /**
     * Duplicate activity - FIXED: Now uses proper getActivityById method
     * @param {string} id - Activity ID to duplicate
     * @returns {ActivityModel} Duplicated activity
     */
    duplicateActivity(id) {
        const startTime = performance.now();

        try {
            const activity = this.getActivityById(id);
            if (!activity) {
                throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
            }

            const duplicated = activity.clone();
            duplicated.activity = `${duplicated.activity} (Copy)`;

            this.activities.push(duplicated);
            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            this.emit(EVENTS.ACTIVITY_ADDED, duplicated);
            this.emit(EVENTS.DATA_UPDATED);

            this.updateStats('duplicate', performance.now() - startTime);
            return duplicated;
        } catch (error) {
            console.error('Failed to duplicate activity:', error);
            throw error;
        }
    }

    /**
     * Update filters and apply them
     * @param {object} newFilters - New filter values
     */
    updateFilters(newFilters) {
        const startTime = performance.now();

        try {
            this.filters = { ...this.filters, ...newFilters };
            this.applyFilters();
            this.emit(EVENTS.FILTER_APPLIED, this.filters);

            this.updateStats('filter', performance.now() - startTime);
        } catch (error) {
            console.error('Failed to update filters:', error);
        }
    }

    /**
     * Apply current filters to activities
     */
    applyFilters() {
        const { search, startDate, endDate, transport, booking, maxCost } = this.filters;

        this.filteredActivities = this.activities.filter(activity => {
            // Search filter
            if (search && !activity.matches(search)) {
                return false;
            }

            // Date range filter
            if (startDate && activity.date < startDate) return false;
            if (endDate && activity.date > endDate) return false;

            // Transport filter
            if (transport && activity.transportMode !== transport) return false;

            // Booking filter
            if (booking && booking.length > 0 && !booking.includes(activity.booking)) return false;

            // Cost filter
            if (maxCost !== undefined && activity.cost > maxCost) return false;

            return true;
        });
    }

    /**
     * Reset filters to default values
     */
    resetFilters() {
        this.filters = { ...DEFAULT_FILTERS };
        this.applyFilters();
        this.emit(EVENTS.FILTER_APPLIED, this.filters);
    }

    /**
     * Get activities by date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Array<ActivityModel>} Activities in date range
     */
    getActivitiesByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return this.activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate >= start && activityDate <= end;
        });
    }

    /**
     * Get activities grouped by date
     * @returns {object} Activities grouped by date
     */
    getActivitiesByDate() {
        return Utils.groupBy(this.filteredActivities, 'date');
    }

    /**
     * Get activities by category
     * @param {string} category - Category name
     * @returns {Array<ActivityModel>} Activities in category
     */
    getActivitiesByCategory(category) {
        return this.activities.filter(activity => activity.category === category);
    }

    /**
     * Get activities by transport mode
     * @param {string} transportMode - Transport mode
     * @returns {Array<ActivityModel>} Activities using transport mode
     */
    getActivitiesByTransport(transportMode) {
        return this.activities.filter(activity => activity.transportMode === transportMode);
    }

    /**
     * Get upcoming activities
     * @param {number} daysAhead - Days ahead to look (default: 7)
     * @returns {Array<ActivityModel>} Upcoming activities
     */
    getUpcomingActivities(daysAhead = 7) {
        return this.activities.filter(activity => activity.isUpcoming(daysAhead));
    }

    /**
     * Get today's activities
     * @returns {Array<ActivityModel>} Today's activities
     */
    getTodaysActivities() {
        return this.activities.filter(activity => activity.isToday());
    }

    /**
     * Get high-cost activities
     * @param {number} threshold - Cost threshold (default: 1000)
     * @returns {Array<ActivityModel>} High-cost activities
     */
    getHighCostActivities(threshold = 1000) {
        return this.activities.filter(activity => activity.isHighCost(threshold));
    }

    /**
     * Get unbooked activities
     * @returns {Array<ActivityModel>} Unbooked activities
     */
    getUnbookedActivities() {
        return this.activities.filter(activity => !activity.isBooked());
    }

    /**
     * Search activities
     * @param {string} searchTerm - Search term
     * @returns {Array<ActivityModel>} Matching activities
     */
    searchActivities(searchTerm) {
        if (!searchTerm) return this.activities;
        return this.activities.filter(activity => activity.matches(searchTerm));
    }

    /**
     * Get dashboard statistics
     * @returns {object} Dashboard statistics
     */
    getStatistics() {
        const totalActivities = this.activities.length;
        const totalCost = this.activities.reduce((sum, activity) => sum + activity.cost, 0);
        const bookingsCount = this.activities.filter(activity => activity.isBooked()).length;

        // Calculate trip duration
        const dates = this.activities
            .map(a => new Date(a.date))
            .filter(d => !isNaN(d.getTime()));

        const minDate = dates.length ? Math.min(...dates) : 0;
        const maxDate = dates.length ? Math.max(...dates) : 0;
        const totalDays = dates.length ? Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1 : 0;

        // Count unique countries
        const countries = this.getUniqueCountries();

        // Count accommodations
        const accommodations = this.activities.filter(activity =>
            activity.accommodationDetails &&
            activity.accommodationDetails !== 'N/A' &&
            activity.accommodationDetails.trim() !== ''
        ).length;

        // Additional statistics
        const upcomingActivities = this.getUpcomingActivities().length;
        const todaysActivities = this.getTodaysActivities().length;
        const unbookedActivities = this.getUnbookedActivities().length;
        const highCostActivities = this.getHighCostActivities().length;

        return {
            totalActivities,
            totalCost,
            totalDays,
            bookingsCount,
            totalCountries: countries.size,
            totalAccommodations: accommodations,
            countries: Array.from(countries),
            upcomingActivities,
            todaysActivities,
            unbookedActivities,
            highCostActivities,
            averageCostPerActivity: totalActivities > 0 ? totalCost / totalActivities : 0,
            bookingPercentage: totalActivities > 0 ? Math.round((bookingsCount / totalActivities) * 100) : 0
        };
    }

    /**
     * Get cost breakdown by categories
     * @returns {object} Cost breakdown
     */
    getCostBreakdown() {
        const breakdown = {
            [COST_CATEGORIES.TRANSPORT]: 0,
            [COST_CATEGORIES.ACCOMMODATION]: 0,
            [COST_CATEGORIES.ACTIVITIES]: 0,
            [COST_CATEGORIES.OTHER]: 0
        };

        this.activities.forEach(activity => {
            const cost = activity.cost;
            const category = this.categorizeActivityCost(activity);
            breakdown[category] += cost;
        });

        return breakdown;
    }

    /**
     * Categorize activity cost
     * @param {ActivityModel} activity - Activity to categorize
     * @returns {string} Cost category
     */
    categorizeActivityCost(activity) {
        // Check accommodation
        if (activity.accommodationDetails &&
            activity.accommodationDetails !== 'N/A' &&
            activity.accommodationDetails.trim() !== '') {
            return COST_CATEGORIES.ACCOMMODATION;
        }

        // Check transport
        if (activity.transportMode &&
            activity.transportMode !== 'N/A' &&
            activity.transportMode.trim() !== '') {

            const activityName = activity.activity.toLowerCase();
            const isActivityCost = activityName.includes('sightseeing') ||
                activityName.includes('visit') ||
                activityName.includes('tour') ||
                activityName.includes('museum');

            if (!isActivityCost) {
                return COST_CATEGORIES.TRANSPORT;
            }
        }

        // Check if it's an activity/entertainment cost
        const activityName = activity.activity.toLowerCase();
        if (activityName.includes('sightseeing') ||
            activityName.includes('visit') ||
            activityName.includes('tour') ||
            activityName.includes('museum') ||
            activityName.includes('show') ||
            activityName.includes('entertainment')) {
            return COST_CATEGORIES.ACTIVITIES;
        }

        return COST_CATEGORIES.OTHER;
    }

    /**
     * Get unique countries from activities
     * @returns {Set} Set of unique countries
     */
    getUniqueCountries() {
        const countries = new Set();

        this.activities.forEach(activity => {
            const locations = [activity.startFrom, activity.reachTo].join(' ').toLowerCase();

            // Country detection logic (can be enhanced with a proper geocoding service)
            if (locations.includes('melbourne') || locations.includes('australia')) {
                countries.add('Australia');
            }
            if (locations.includes('london') || locations.includes('edinburgh') ||
                locations.includes('uk') || locations.includes('scotland') ||
                locations.includes('heathrow') || locations.includes('cambridge')) {
                countries.add('United Kingdom');
            }
            if (locations.includes('paris') || locations.includes('france') ||
                locations.includes('cdg') || locations.includes('disneyland')) {
                countries.add('France');
            }
            if (locations.includes('delhi') || locations.includes('india') ||
                locations.includes('mumbai') || locations.includes('bangalore')) {
                countries.add('India');
            }
            if (locations.includes('doha') || locations.includes('qatar')) {
                countries.add('Qatar');
            }
            // Add more countries as needed
        });

        return countries;
    }

    /**
     * Get transport mode statistics
     * @returns {object} Transport mode usage statistics
     */
    getTransportStats() {
        const stats = {};

        this.activities.forEach(activity => {
            const transport = activity.transportMode || 'Not specified';
            stats[transport] = (stats[transport] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get category statistics
     * @returns {object} Category distribution
     */
    getCategoryStats() {
        const stats = {};

        this.activities.forEach(activity => {
            const category = activity.category || 'other';
            stats[category] = (stats[category] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get booking statistics
     * @returns {object} Booking status statistics
     */
    getBookingStats() {
        const booked = this.activities.filter(a => a.isBooked()).length;
        const notBooked = this.activities.length - booked;

        return {
            booked,
            notBooked,
            total: this.activities.length,
            bookedPercentage: this.activities.length > 0 ? Math.round((booked / this.activities.length) * 100) : 0
        };
    }

    /**
     * Get monthly cost breakdown
     * @returns {object} Costs by month
     */
    getMonthlyCosts() {
        const monthlyCosts = {};

        this.activities.forEach(activity => {
            if (activity.date) {
                const month = activity.date.substring(0, 7); // YYYY-MM
                monthlyCosts[month] = (monthlyCosts[month] || 0) + activity.cost;
            }
        });

        return monthlyCosts;
    }

    /**
     * Export data to CSV format
     * @returns {string} CSV content
     */
    exportToCSV() {
        const headers = [
            'Activity', 'Date', 'Day', 'Start Time', 'End Time',
            'From', 'To', 'Transport Mode', 'Booking Required',
            'Cost', 'Additional Details', 'Accommodation Details',
            'Category', 'Priority', 'Status', 'Tags'
        ];

        const csvContent = [
            headers.join(','),
            ...this.activities.map(activity => {
                const row = activity.toCSV();
                return headers.map(header => {
                    let value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""');
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            value = `"${value}"`;
                        }
                    }
                    return value;
                }).join(',');
            })
        ].join('\n');

        return csvContent;
    }

    /**
     * Import activities from array
     * @param {Array} activitiesData - Array of activity data
     * @returns {object} Import result
     */
    importActivities(activitiesData) {
        const startTime = performance.now();
        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        try {
            activitiesData.forEach((data, index) => {
                try {
                    const activity = new ActivityModel(data);
                    const validation = activity.validate();

                    if (validation.isValid) {
                        this.activities.push(activity);
                        results.imported++;
                    } else {
                        results.skipped++;
                        results.errors.push(`Row ${index + 1}: ${validation.errors.join(', ')}`);
                    }
                } catch (error) {
                    results.skipped++;
                    results.errors.push(`Row ${index + 1}: ${error.message}`);
                }
            });

            if (results.imported > 0) {
                this.sortActivities();
                this.applyFilters();
                this.markDirty();
                this.emit(EVENTS.DATA_UPDATED);
            }

            this.updateStats('import', performance.now() - startTime);
            return results;
        } catch (error) {
            console.error('Failed to import activities:', error);
            throw error;
        }
    }

    /**
     * Clear all activities
     */
    clearAll() {
        this.activities = [];
        this.filteredActivities = [];
        this.filters = { ...DEFAULT_FILTERS };
        this.markDirty();
        this.emit(EVENTS.DATA_UPDATED);
    }

    /**
     * Validate all activities
     * @returns {object} Validation summary
     */
    validateAllActivities() {
        const results = {
            valid: 0,
            invalid: 0,
            warnings: 0,
            errors: []
        };

        this.activities.forEach((activity, index) => {
            const validation = activity.validate();
            if (validation.isValid) {
                results.valid++;
            } else {
                results.invalid++;
                results.errors.push({
                    index,
                    id: activity.id,
                    activity: activity.activity,
                    errors: validation.errors
                });
            }

            if (validation.hasWarnings) {
                results.warnings++;
            }
        });

        return results;
    }

    /**
     * Get performance statistics
     * @returns {object} Performance stats
     */
    getPerformanceStats() {
        return {
            ...this.stats,
            totalActivities: this.activities.length,
            filteredActivities: this.filteredActivities.length,
            memoryUsage: this.getMemoryUsage(),
            lastSaved: this.lastSaved ? new Date(this.lastSaved).toISOString() : null,
            isDirty: this.isDirty
        };
    }

    /**
     * Get estimated memory usage
     * @returns {object} Memory usage estimate
     */
    getMemoryUsage() {
        try {
            const dataString = JSON.stringify(this.activities);
            const sizeInBytes = new Blob([dataString]).size;

            return {
                activities: Utils.formatFileSize(sizeInBytes),
                filters: Utils.formatFileSize(new Blob([JSON.stringify(this.filters)]).size),
                total: Utils.formatFileSize(sizeInBytes + new Blob([JSON.stringify(this.filters)]).size)
            };
        } catch (error) {
            return { error: 'Unable to calculate memory usage' };
        }
    }

    /**
     * Update performance statistics
     * @param {string} operation - Operation name
     * @param {number} duration - Operation duration in ms
     */
    updateStats(operation, duration) {
        this.stats.totalOperations++;
        this.stats.lastOperationTime = duration;
        this.stats.averageOperationTime =
            (this.stats.averageOperationTime + duration) / 2;
    }

    /**
     * Create a backup of current data
     * @returns {boolean} Backup success
     */
    createBackup() {
        try {
            return this.storage.backup();
        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Get available backups
     * @returns {Array} List of backups
     */
    getAvailableBackups() {
        try {
            return this.storage.listBackups();
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Restore from backup
     * @param {string} backupKey - Backup key to restore from
     * @returns {boolean} Restore success
     */
    restoreFromBackup(backupKey) {
        try {
            const success = this.storage.restoreFromBackup(backupKey);
            if (success) {
                this.loadFromStorage();
                this.emit(EVENTS.DATA_UPDATED);
            }
            return success;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Get data summary for export
     * @returns {object} Data summary
     */
    getDataSummary() {
        const stats = this.getStatistics();
        const costBreakdown = this.getCostBreakdown();
        const transportStats = this.getTransportStats();
        const categoryStats = this.getCategoryStats();

        return {
            overview: {
                totalActivities: stats.totalActivities,
                totalCost: stats.totalCost,
                totalDays: stats.totalDays,
                countries: stats.countries,
                averageCostPerDay: stats.totalDays > 0 ? stats.totalCost / stats.totalDays : 0
            },
            costs: costBreakdown,
            transport: transportStats,
            categories: categoryStats,
            bookings: this.getBookingStats(),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Dispose of the data manager and clean up resources
     */
    dispose() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Save any pending changes
        if (this.isDirty) {
            this.saveToStorage();
        }

        // Clear all data
        this.activities = [];
        this.filteredActivities = [];

        // Remove all event listeners
        this.removeAllListeners();

        console.log('DataManager disposed');
    }
}