/**
 * Travel Itinerary Data Manager - Complete Implementation
 * Modern, localStorage-free version with full functionality
 */

// Event constants
const EVENTS = {
    DATA_UPDATED: 'data_updated',
    ACTIVITY_ADDED: 'activity_added',
    ACTIVITY_UPDATED: 'activity_updated',
    ACTIVITY_DELETED: 'activity_deleted',
    FILTER_CHANGED: 'filter_changed',
    SORT_CHANGED: 'sort_changed'
};

// Default filter configuration
const DEFAULT_FILTERS = {
    dateRange: { start: null, end: null },
    costRange: { min: 0, max: null },
    transportModes: [],
    bookingStatus: [],
    categories: [],
    searchText: ''
};

// Utility functions
class Utils {
    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    static formatCurrency(amount, currency = 'AUD') {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>\"'&]/g, '');
    }
}

// Activity Model
class ActivityModel {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.activity = data.activity || '';
        this.date = data.date || '';
        this.time = data.time || '';
        this.reachTo = data.reachTo || '';
        this.transportMode = data.transportMode || 'walking';
        this.cost = parseFloat(data.cost) || 0;
        this.booking = data.booking || 'not_required';
        this.category = data.category || 'other';
        this.notes = data.notes || '';
        this.priority = data.priority || 'medium';
        this.duration = data.duration || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    validate() {
        const errors = [];

        if (!this.activity || this.activity.trim() === '') {
            errors.push('Activity name is required');
        }

        if (!this.date || isNaN(new Date(this.date).getTime())) {
            errors.push('Valid date is required');
        }

        if (this.cost < 0) {
            errors.push('Cost cannot be negative');
        }

        if (this.time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(this.time)) {
            errors.push('Time must be in HH:MM format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    matches(searchTerm) {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        const searchableFields = [
            this.activity,
            this.reachTo,
            this.transportMode,
            this.category,
            this.notes,
            this.booking
        ];

        return searchableFields.some(field =>
            field && field.toLowerCase().includes(term)
        );
    }

    clone() {
        return new ActivityModel(this.toJSON());
    }

    toJSON() {
        return {
            id: this.id,
            activity: this.activity,
            date: this.date,
            time: this.time,
            reachTo: this.reachTo,
            transportMode: this.transportMode,
            cost: this.cost,
            booking: this.booking,
            category: this.category,
            notes: this.notes,
            priority: this.priority,
            duration: this.duration,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    update(data) {
        Object.keys(data).forEach(key => {
            if (this.hasOwnProperty(key) && data[key] !== undefined) {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
        return this;
    }
}

// Simple Event Emitter
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    removeAllListeners() {
        this.events = {};
    }
}

// Main Data Manager Class
class TravelDataManager extends EventEmitter {
    constructor() {
        super();

        // Core data storage (in-memory only)
        this.activities = [];
        this.filteredActivities = [];
        this.deletedActivities = [];
        this.backupHistory = [];

        // Configuration
        this.filters = { ...DEFAULT_FILTERS };
        this.sortConfig = {
            field: 'date',
            order: 'asc'
        };

        // State management
        this.isDirty = false;
        this.isLoading = false;
        this.lastSaved = null;
        this.autoSaveTimer = null;

        // Performance tracking
        this.stats = {
            totalOperations: 0,
            lastFilterTime: 0,
            lastSortTime: 0
        };

        // Initialize
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing Travel Data Manager v2.0.0');

        try {
            this.isLoading = true;

            // Load any sample data or initialize empty state
            await this.loadInitialData();

            // Setup auto-save (using memory snapshots instead of localStorage)
            this.setupAutoSave();

            console.log('✅ Travel Data Manager initialized successfully');
            this.emit(EVENTS.DATA_UPDATED);

        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            throw new Error(`Initialization failed: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    async loadInitialData() {
        // In a real application, this would load from a database or API
        // For now, we'll start with empty data
        this.activities = [];
        this.filteredActivities = [];

        console.log('📂 Initial data loaded (empty state)');
    }

    setupAutoSave() {
        // Create memory snapshots every 30 seconds instead of localStorage
        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty) {
                this.createMemorySnapshot();
                this.isDirty = false;
                this.lastSaved = new Date().toISOString();
                console.log('💾 Auto-saved to memory snapshot');
            }
        }, 30000);
    }

    createMemorySnapshot() {
        const snapshot = {
            activities: this.activities.map(a => a.toJSON()),
            filters: Utils.deepClone(this.filters),
            sortConfig: Utils.deepClone(this.sortConfig),
            timestamp: new Date().toISOString()
        };

        // Keep only last 5 snapshots to manage memory
        this.backupHistory.push(snapshot);
        if (this.backupHistory.length > 5) {
            this.backupHistory.shift();
        }
    }

    markDirty() {
        this.isDirty = true;
        this.stats.totalOperations++;
    }

    // Activity CRUD operations
    addActivity(activityData) {
        try {
            const activity = new ActivityModel(activityData);
            const validation = activity.validate();

            if (!validation.isValid) {
                throw new Error(`Invalid activity data: ${validation.errors.join(', ')}`);
            }

            this.activities.push(activity);
            this.markDirty();
            this.sortActivities();
            this.applyFilters();

            console.log(`➕ Added activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_ADDED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return activity;
        } catch (error) {
            console.error('Failed to add activity:', error);
            throw error;
        }
    }

    updateActivity(id, updates) {
        try {
            const activity = this.getActivityById(id);
            if (!activity) {
                throw new Error(`Activity not found: ${id}`);
            }

            const originalData = activity.toJSON();
            activity.update(updates);

            const validation = activity.validate();
            if (!validation.isValid) {
                // Restore original data if validation fails
                Object.assign(activity, originalData);
                throw new Error(`Invalid update: ${validation.errors.join(', ')}`);
            }

            this.markDirty();
            this.sortActivities();
            this.applyFilters();

            console.log(`📝 Updated activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_UPDATED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return activity;
        } catch (error) {
            console.error('Failed to update activity:', error);
            throw error;
        }
    }

    deleteActivity(id) {
        try {
            const index = this.activities.findIndex(a => a.id === id);
            if (index === -1) {
                throw new Error(`Activity not found: ${id}`);
            }

            const activity = this.activities[index];
            this.activities.splice(index, 1);
            this.deletedActivities.push({
                ...activity.toJSON(),
                deletedAt: new Date().toISOString()
            });

            this.markDirty();
            this.applyFilters();

            console.log(`🗑️ Deleted activity: ${activity.activity}`);
            this.emit(EVENTS.ACTIVITY_DELETED, activity);
            this.emit(EVENTS.DATA_UPDATED);

            return true;
        } catch (error) {
            console.error('Failed to delete activity:', error);
            throw error;
        }
    }

    getActivityById(id) {
        return this.activities.find(activity => activity.id === id) || null;
    }

    // Bulk operations
    importActivities(activitiesData, options = {}) {
        const {
            skipDuplicates = true,
            validateAll = true
        } = options;

        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };

        activitiesData.forEach((data, index) => {
            try {
                const activity = new ActivityModel(data);

                if (validateAll) {
                    const validation = activity.validate();
                    if (!validation.isValid) {
                        results.errors.push({
                            index,
                            data,
                            errors: validation.errors
                        });
                        return;
                    }
                }

                if (skipDuplicates && this.isDuplicateActivity(activity)) {
                    results.skipped++;
                    return;
                }

                this.activities.push(activity);
                results.imported++;

            } catch (error) {
                results.errors.push({
                    index,
                    data,
                    errors: [error.message]
                });
            }
        });

        if (results.imported > 0) {
            this.markDirty();
            this.sortActivities();
            this.applyFilters();
            this.emit(EVENTS.DATA_UPDATED);
        }

        return results;
    }

    isDuplicateActivity(newActivity) {
        return this.activities.some(existing =>
            existing.activity === newActivity.activity &&
            existing.date === newActivity.date &&
            existing.time === newActivity.time
        );
    }

    // Filtering and sorting
    applyFilters() {
        const startTime = performance.now();

        let filtered = [...this.activities];

        // Text search
        if (this.filters.searchText) {
            filtered = filtered.filter(activity =>
                activity.matches(this.filters.searchText)
            );
        }

        // Date range
        if (this.filters.dateRange.start) {
            filtered = filtered.filter(a => a.date >= this.filters.dateRange.start);
        }
        if (this.filters.dateRange.end) {
            filtered = filtered.filter(a => a.date <= this.filters.dateRange.end);
        }

        // Cost range
        if (this.filters.costRange.min !== undefined) {
            filtered = filtered.filter(a => a.cost >= this.filters.costRange.min);
        }
        if (this.filters.costRange.max !== null && this.filters.costRange.max !== undefined) {
            filtered = filtered.filter(a => a.cost <= this.filters.costRange.max);
        }

        // Transport modes
        if (this.filters.transportModes.length > 0) {
            filtered = filtered.filter(a =>
                this.filters.transportModes.includes(a.transportMode)
            );
        }

        // Booking status
        if (this.filters.bookingStatus.length > 0) {
            filtered = filtered.filter(a =>
                this.filters.bookingStatus.includes(a.booking)
            );
        }

        // Categories
        if (this.filters.categories.length > 0) {
            filtered = filtered.filter(a =>
                this.filters.categories.includes(a.category)
            );
        }

        this.filteredActivities = filtered;
        this.stats.lastFilterTime = performance.now() - startTime;

        console.log(`🔍 Filtered ${filtered.length}/${this.activities.length} activities`);
        this.emit(EVENTS.FILTER_CHANGED, this.filters);
    }

    sortActivities() {
        const startTime = performance.now();

        this.activities.sort((a, b) => {
            let aValue = a[this.sortConfig.field];
            let bValue = b[this.sortConfig.field];

            if (this.sortConfig.field === 'date') {
                aValue = new Date(aValue || '1970-01-01');
                bValue = new Date(bValue || '1970-01-01');
            } else if (this.sortConfig.field === 'cost') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue || '').toLowerCase();
            }

            let result = 0;
            if (aValue < bValue) result = -1;
            else if (aValue > bValue) result = 1;

            return this.sortConfig.order === 'desc' ? -result : result;
        });

        this.stats.lastSortTime = performance.now() - startTime;
        console.log(`📊 Sorted ${this.activities.length} activities by ${this.sortConfig.field}`);
    }

    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.applyFilters();
        this.markDirty();
    }

    updateSort(field, order = 'asc') {
        this.sortConfig = { field, order };
        this.sortActivities();
        this.applyFilters();
        this.markDirty();
        this.emit(EVENTS.SORT_CHANGED, this.sortConfig);
    }

    // Statistics and analytics
    getStatistics() {
        const stats = {
            totalActivities: this.activities.length,
            filteredActivities: this.filteredActivities.length,
            totalCost: 0,
            averageCostPerActivity: 0,
            transportModes: {},
            categories: {},
            bookingStatus: {},
            dateRange: this.getDateRange(),
            costRange: { min: Infinity, max: -Infinity }
        };

        this.activities.forEach(activity => {
            // Cost calculations
            stats.totalCost += activity.cost;
            if (activity.cost < stats.costRange.min) stats.costRange.min = activity.cost;
            if (activity.cost > stats.costRange.max) stats.costRange.max = activity.cost;

            // Transport mode distribution
            stats.transportModes[activity.transportMode] =
                (stats.transportModes[activity.transportMode] || 0) + 1;

            // Category distribution
            stats.categories[activity.category] =
                (stats.categories[activity.category] || 0) + 1;

            // Booking status distribution
            stats.bookingStatus[activity.booking] =
                (stats.bookingStatus[activity.booking] || 0) + 1;
        });

        stats.averageCostPerActivity = stats.totalActivities > 0
            ? stats.totalCost / stats.totalActivities
            : 0;

        if (stats.costRange.min === Infinity) stats.costRange.min = 0;
        if (stats.costRange.max === -Infinity) stats.costRange.max = 0;

        return stats;
    }

    getMemoryUsage() {
        const activitiesSize = JSON.stringify(this.activities).length * 2; // UTF-16
        const backupsSize = JSON.stringify(this.backupHistory).length * 2;
        const filtersSize = JSON.stringify(this.filters).length * 2;

        return {
            activities: activitiesSize,
            backups: backupsSize,
            filters: filtersSize,
            total: activitiesSize + backupsSize + filtersSize
        };
    }

    // System health and maintenance
    getSystemHealth() {
        const health = {
            status: 'healthy',
            issues: [],
            score: 100
        };

        // Data integrity checks
        const invalidActivities = this.activities.filter(a => {
            const validation = a.validate();
            return !validation.isValid;
        });

        if (invalidActivities.length > 0) {
            health.issues.push({
                type: 'data_integrity',
                severity: 'warning',
                message: `${invalidActivities.length} activities have validation issues`,
                count: invalidActivities.length
            });
            health.score -= 10;
        }

        // Performance health
        if (this.stats.lastFilterTime > 200) {
            health.issues.push({
                type: 'performance',
                severity: 'warning',
                message: 'Slow filtering performance detected',
                value: `${this.stats.lastFilterTime}ms`
            });
            health.score -= 15;
        }

        // Memory health
        const memoryUsage = this.getMemoryUsage();
        if (memoryUsage.total > 5 * 1024 * 1024) { // 5MB
            health.issues.push({
                type: 'memory',
                severity: 'warning',
                message: 'High memory usage detected',
                value: Utils.formatFileSize(memoryUsage.total)
            });
            health.score -= 10;
        }

        // Set overall status based on score
        if (health.score < 70) {
            health.status = 'unhealthy';
        } else if (health.score < 90) {
            health.status = 'degraded';
        }

        return health;
    }

    async validateAndRepairData() {
        const results = {
            validated: 0,
            repaired: 0,
            removed: 0,
            errors: []
        };

        const validActivities = [];

        for (let i = 0; i < this.activities.length; i++) {
            const activity = this.activities[i];
            results.validated++;

            try {
                const validation = activity.validate();

                if (validation.isValid) {
                    validActivities.push(activity);
                } else {
                    const repaired = this.attemptActivityRepair(activity, validation.errors);

                    if (repaired) {
                        validActivities.push(repaired);
                        results.repaired++;
                        console.log(`✅ Repaired activity: ${activity.activity}`);
                    } else {
                        results.removed++;
                        results.errors.push({
                            activity: activity.activity,
                            id: activity.id,
                            errors: validation.errors
                        });
                        console.warn(`❌ Removed invalid activity: ${activity.activity}`);
                    }
                }
            } catch (error) {
                results.removed++;
                results.errors.push({
                    activity: activity.activity || 'Unknown',
                    id: activity.id || 'Unknown',
                    errors: [error.message]
                });
            }
        }

        // Update activities if repairs were made
        if (results.repaired > 0 || results.removed > 0) {
            this.activities = validActivities;
            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            console.log(`🔧 Data repair completed: ${results.repaired} repaired, ${results.removed} removed`);
            this.emit(EVENTS.DATA_UPDATED);
        }

        return results;
    }

    attemptActivityRepair(activity, errors) {
        const repaired = activity.clone();
        let wasRepaired = false;

        errors.forEach(error => {
            if (error.includes('Activity name is required')) {
                if (!repaired.activity || repaired.activity.trim() === '') {
                    repaired.activity = 'Untitled Activity';
                    wasRepaired = true;
                }
            }

            if (error.includes('date is required') || error.includes('Invalid date')) {
                if (!repaired.date || isNaN(new Date(repaired.date).getTime())) {
                    repaired.date = new Date().toISOString().split('T')[0];
                    wasRepaired = true;
                }
            }

            if (error.includes('Cost cannot be negative')) {
                if (repaired.cost < 0) {
                    repaired.cost = 0;
                    wasRepaired = true;
                }
            }
        });

        if (wasRepaired) {
            const validation = repaired.validate();
            return validation.isValid ? repaired : null;
        }

        return null;
    }

    // Export functionality
    async exportData(format = 'json', options = {}) {
        const {
            includeMetadata = true,
            includeBackups = false,
            compression = false
        } = options;

        const exportData = {
            activities: this.activities.map(a => a.toJSON()),
            filters: this.filters,
            sortConfig: this.sortConfig
        };

        if (includeMetadata) {
            exportData.metadata = {
                exportedAt: new Date().toISOString(),
                version: '2.0.0',
                totalActivities: this.activities.length,
                appInfo: {
                    name: 'Travel Itinerary Manager',
                    version: '2.0.0'
                }
            };
        }

        if (includeBackups) {
            exportData.backupHistory = this.backupHistory;
        }

        switch (format.toLowerCase()) {
            case 'json':
                return this.exportToJSON(exportData, options);
            case 'csv':
                return this.exportToCSV({ includeFiltered: false, ...options });
            case 'xlsx':
                return this.exportToExcel(options);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportToJSON(data, options = {}) {
        const jsonString = JSON.stringify(data, null, 2);

        return {
            content: jsonString,
            filename: `travel-itinerary-${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json',
            size: jsonString.length
        };
    }

    exportToCSV(options = {}) {
        const { includeFiltered = false } = options;
        const activities = includeFiltered ? this.filteredActivities : this.activities;

        if (activities.length === 0) {
            throw new Error('No activities to export');
        }

        const headers = [
            'ID', 'Activity', 'Date', 'Time', 'Destination',
            'Transport', 'Cost', 'Booking', 'Category', 'Notes', 'Priority', 'Duration'
        ];

        const csvRows = [headers.join(',')];

        activities.forEach(activity => {
            const row = [
                activity.id,
                `"${activity.activity.replace(/"/g, '""')}"`,
                activity.date,
                activity.time,
                `"${activity.reachTo.replace(/"/g, '""')}"`,
                activity.transportMode,
                activity.cost,
                activity.booking,
                activity.category,
                `"${activity.notes.replace(/"/g, '""')}"`,
                activity.priority,
                activity.duration
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        return {
            content: csvContent,
            filename: `travel-itinerary-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv',
            size: csvContent.length
        };
    }

    exportToExcel(options = {}) {
        // Simplified Excel export (would need actual XLSX library in real implementation)
        console.warn('Excel export requires XLSX library - falling back to CSV');
        return this.exportToCSV(options);
    }

    // Import functionality
    async importData(data, format = 'json', options = {}) {
        const {
            merge = true,
            validateData = true,
            createBackup = true
        } = options;

        if (createBackup) {
            this.createBackup();
        }

        let importedData;

        try {
            switch (format.toLowerCase()) {
                case 'json':
                    importedData = typeof data === 'string' ? JSON.parse(data) : data;
                    break;
                case 'csv':
                    importedData = this.parseCSVData(data);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            return this.processImportedData(importedData, { merge, validateData });

        } catch (error) {
            console.error('Import failed:', error);
            throw new Error(`Import failed: ${error.message}`);
        }
    }

    processImportedData(data, options = {}) {
        const { merge = true, validateData = true } = options;
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        if (!merge) {
            this.activities = [];
        }

        if (data.activities && Array.isArray(data.activities)) {
            const importResults = this.importActivities(data.activities, {
                skipDuplicates: true,
                validateAll: validateData
            });

            results.imported = importResults.imported;
            results.skipped = importResults.skipped;
            results.errors = importResults.errors;
        }

        if (data.filters && merge) {
            this.filters = { ...this.filters, ...data.filters };
        }

        if (data.sortConfig && merge) {
            this.sortConfig = { ...this.sortConfig, ...data.sortConfig };
        }

        console.log(`📥 Import completed: ${results.imported} imported, ${results.skipped} skipped`);

        if (results.imported > 0) {
            this.sortActivities();
            this.applyFilters();
            this.markDirty();
            this.emit(EVENTS.DATA_UPDATED);
        }

        return results;
    }

    parseCSVData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const activities = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const activity = {};

            headers.forEach((header, index) => {
                const value = values[index] || '';

                // Map CSV headers to activity properties
                switch (header.toLowerCase()) {
                    case 'id':
                        activity.id = value;
                        break;
                    case 'activity':
                    case 'name':
                    case 'title':
                        activity.activity = value;
                        break;
                    case 'date':
                        activity.date = value;
                        break;
                    case 'time':
                        activity.time = value;
                        break;
                    case 'destination':
                    case 'reachto':
                    case 'reach to':
                        activity.reachTo = value;
                        break;
                    case 'transport':
                    case 'transportmode':
                    case 'transport mode':
                        activity.transportMode = value;
                        break;
                    case 'cost':
                    case 'price':
                        activity.cost = parseFloat(value) || 0;
                        break;
                    case 'booking':
                    case 'booking status':
                        activity.booking = value;
                        break;
                    case 'category':
                        activity.category = value;
                        break;
                    case 'notes':
                    case 'description':
                        activity.notes = value;
                        break;
                    case 'priority':
                        activity.priority = value;
                        break;
                    case 'duration':
                        activity.duration = value;
                        break;
                    default:
                        activity[header] = value;
                }
            });

            activities.push(activity);
        }

        return { activities };
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    // Advanced search functionality
    advancedSearch(criteria) {
        const {
            text = '',
            dateRange = {},
            costRange = {},
            transportModes = [],
            bookingStatus = [],
            categories = [],
            sortBy = 'date',
            sortOrder = 'asc',
            limit = null
        } = criteria;

        let results = [...this.activities];

        // Text search across multiple fields
        if (text && text.trim()) {
            const searchTerm = text.toLowerCase().trim();
            results = results.filter(activity =>
                activity.matches(searchTerm)
            );
        }

        // Date range filter
        if (dateRange.start) {
            results = results.filter(a => a.date >= dateRange.start);
        }
        if (dateRange.end) {
            results = results.filter(a => a.date <= dateRange.end);
        }

        // Cost range filter
        if (costRange.min !== undefined) {
            results = results.filter(a => a.cost >= costRange.min);
        }
        if (costRange.max !== undefined) {
            results = results.filter(a => a.cost <= costRange.max);
        }

        // Transport mode filter
        if (transportModes.length > 0) {
            results = results.filter(a =>
                transportModes.includes(a.transportMode)
            );
        }

        // Booking status filter
        if (bookingStatus.length > 0) {
            results = results.filter(a =>
                bookingStatus.includes(a.booking)
            );
        }

        // Category filter
        if (categories.length > 0) {
            results = results.filter(a =>
                categories.includes(a.category)
            );
        }

        // Sorting
        results.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'date') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (sortBy === 'cost') {
                aValue = parseFloat(aValue) || 0;
                bValue = parseFloat(bValue) || 0;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue || '').toLowerCase();
            }

            let result = 0;
            if (aValue < bValue) result = -1;
            else if (aValue > bValue) result = 1;

            return sortOrder === 'desc' ? -result : result;
        });

        // Apply limit
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }

        return {
            results,
            total: results.length,
            criteria,
            executedAt: new Date().toISOString()
        };
    }

    // Recommendation system
    generateRecommendations() {
        const recommendations = [];
        const stats = this.getStatistics();

        // Location-based recommendations
        const locations = new Set();
        this.activities.forEach(a => {
            if (a.reachTo) locations.add(a.reachTo);
        });

        if (locations.size > 0) {
            recommendations.push({
                type: 'location',
                title: 'Explore More in Your Destinations',
                description: `You're visiting ${locations.size} locations. Consider adding cultural activities or local experiences.`,
                suggestions: Array.from(locations).map(loc => ({
                    location: loc,
                    suggestions: ['Museum visit', 'Local restaurant', 'Walking tour']
                }))
            });
        }

        // Budget optimization
        if (stats.totalCost > 0) {
            const highCostActivities = this.activities
                .filter(a => a.cost > stats.averageCostPerActivity * 1.5)
                .sort((a, b) => b.cost - a.cost);

            if (highCostActivities.length > 0) {
                recommendations.push({
                    type: 'budget',
                    title: 'Budget Optimization Opportunities',
                    description: `${highCostActivities.length} activities are significantly above average cost.`,
                    suggestions: highCostActivities.slice(0, 3).map(a => ({
                        activity: a.activity,
                        cost: a.cost,
                        suggestion: 'Consider alternatives or early booking discounts'
                    }))
                });
            }
        }

        // Time optimization
        const dailyGroups = Utils.groupBy(this.activities, 'date');
        Object.entries(dailyGroups).forEach(([date, dayActivities]) => {
            if (dayActivities.length > 5) {
                recommendations.push({
                    type: 'schedule',
                    title: `Busy Day Alert - ${Utils.formatDate(date)}`,
                    description: `${dayActivities.length} activities scheduled. Consider spreading across multiple days.`,
                    suggestions: [
                        'Move non-essential activities to less busy days',
                        'Group activities by location',
                        'Build in rest time between activities'
                    ]
                });
            }
        });

        // Transport efficiency
        const transportStats = stats.transportModes;
        const fragmentedTransport = Object.entries(transportStats)
            .filter(([mode, count]) => count === 1);

        if (fragmentedTransport.length > 2) {
            recommendations.push({
                type: 'transport',
                title: 'Transport Consolidation',
                description: 'Multiple single-use transport modes detected.',
                suggestions: [
                    'Consider daily/weekly transport passes',
                    'Group activities accessible by the same transport',
                    'Evaluate walking distances between activities'
                ]
            });
        }

        return {
            recommendations,
            generatedAt: new Date().toISOString(),
            basedOn: {
                totalActivities: stats.totalActivities,
                dateRange: this.getDateRange(),
                budgetTotal: stats.totalCost
            }
        };
    }

    // Get date range of activities
    getDateRange() {
        if (this.activities.length === 0) return null;

        const dates = this.activities.map(a => a.date).sort();
        return {
            start: dates[0],
            end: dates[dates.length - 1],
            totalDays: Math.ceil((new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)) + 1
        };
    }

    // Backup and recovery
    createBackup() {
        const backup = {
            activities: this.activities.map(a => a.toJSON()),
            filters: Utils.deepClone(this.filters),
            sortConfig: Utils.deepClone(this.sortConfig),
            createdAt: new Date().toISOString(),
            id: Utils.generateId()
        };

        this.backupHistory.push(backup);

        // Keep only last 10 backups
        if (this.backupHistory.length > 10) {
            this.backupHistory.shift();
        }

        console.log(`💾 Backup created: ${backup.id}`);
        return backup.id;
    }

    restoreFromBackup(backupId) {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }

        try {
            this.activities = backup.activities.map(data => new ActivityModel(data));
            this.filters = Utils.deepClone(backup.filters);
            this.sortConfig = Utils.deepClone(backup.sortConfig);

            this.sortActivities();
            this.applyFilters();
            this.markDirty();

            console.log(`🔄 Restored from backup: ${backupId}`);
            this.emit(EVENTS.DATA_UPDATED);

            return true;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw new Error(`Backup restoration failed: ${error.message}`);
        }
    }

    getBackupList() {
        return this.backupHistory.map(backup => ({
            id: backup.id,
            createdAt: backup.createdAt,
            activitiesCount: backup.activities.length,
            size: JSON.stringify(backup).length
        }));
    }

    // Data synchronization placeholder
    async syncData(remoteData) {
        console.log('Sync functionality not implemented yet');
        return {
            success: false,
            message: 'Cloud sync not available in this version'
        };
    }

    getDataFingerprint() {
        const data = {
            activitiesCount: this.activities.length,
            lastModified: this.lastSaved,
            totalCost: this.activities.reduce((sum, a) => sum + a.cost, 0),
            activityIds: this.activities.map(a => a.id).sort()
        };

        // Simple hash function for fingerprint
        return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }

    // Emergency recovery
    async emergencyRecover() {
        console.log('🚨 Starting emergency data recovery...');

        const recoveryResults = {
            recovered: 0,
            sources: []
        };

        try {
            // Try to recover from latest backup
            if (this.backupHistory.length > 0) {
                const latestBackup = this.backupHistory[this.backupHistory.length - 1];
                this.activities = latestBackup.activities.map(data => new ActivityModel(data));
                recoveryResults.recovered = this.activities.length;
                recoveryResults.sources.push('Latest backup');
                console.log(`✅ Recovered ${this.activities.length} activities from backup`);
            }

            if (recoveryResults.recovered > 0) {
                this.sortActivities();
                this.applyFilters();
                this.markDirty();
                this.emit(EVENTS.DATA_UPDATED);

                console.log('🎉 Emergency recovery completed successfully');
            } else {
                console.log('❌ No recoverable data found');
            }

        } catch (error) {
            console.error('Emergency recovery failed:', error);
            recoveryResults.error = error.message;
        }

        return recoveryResults;
    }

    // Utility methods for UI integration
    getFilteredActivities() {
        return this.filteredActivities;
    }

    getAllActivities() {
        return this.activities;
    }

    getActivityCount() {
        return this.activities.length;
    }

    getFilteredCount() {
        return this.filteredActivities.length;
    }

    getCurrentFilters() {
        return Utils.deepClone(this.filters);
    }

    getCurrentSort() {
        return Utils.deepClone(this.sortConfig);
    }

    clearAllFilters() {
        this.filters = Utils.deepClone(DEFAULT_FILTERS);
        this.applyFilters();
        this.markDirty();
        this.emit(EVENTS.FILTER_CHANGED, this.filters);
    }

    // Performance optimization
    batchUpdate(operations) {
        const results = [];
        let hasChanges = false;

        operations.forEach(operation => {
            try {
                switch (operation.type) {
                    case 'add':
                        const added = this.addActivity(operation.data);
                        results.push({ success: true, id: added.id, operation: 'add' });
                        hasChanges = true;
                        break;

                    case 'update':
                        const updated = this.updateActivity(operation.id, operation.data);
                        results.push({ success: true, id: updated.id, operation: 'update' });
                        hasChanges = true;
                        break;

                    case 'delete':
                        this.deleteActivity(operation.id);
                        results.push({ success: true, id: operation.id, operation: 'delete' });
                        hasChanges = true;
                        break;

                    default:
                        results.push({
                            success: false,
                            error: `Unknown operation: ${operation.type}`,
                            operation: operation.type
                        });
                }
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    operation: operation.type,
                    id: operation.id
                });
            }
        });

        // Only sort and filter once at the end
        if (hasChanges) {
            this.sortActivities();
            this.applyFilters();
            this.emit(EVENTS.DATA_UPDATED);
        }

        return results;
    }

    // Cleanup and disposal
    async dispose() {
        console.log('🧹 Starting DataManager disposal...');

        // Create final backup if dirty
        if (this.isDirty) {
            console.log('💾 Creating final backup...');
            this.createBackup();
        }

        // Clear all timers
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('⏰ Auto-save timer cleared');
        }

        // Remove all event listeners
        this.removeAllListeners();
        console.log('📢 Event listeners cleared');

        // Clear all data references
        this.activities = [];
        this.filteredActivities = [];
        this.deletedActivities = [];
        this.backupHistory = [];
        this.filters = Utils.deepClone(DEFAULT_FILTERS);

        // Reset state
        this.isDirty = false;
        this.isLoading = false;
        this.lastSaved = null;

        // Clear stats
        this.stats = {
            totalOperations: 0,
            lastFilterTime: 0,
            lastSortTime: 0
        };

        console.log('✅ DataManager disposal completed');
    }
}

// ES6 Module Exports
export {
    TravelDataManager as DataManager,  // Export as DataManager to match import
    TravelDataManager,                 // Also export original name
    ActivityModel,
    Utils,
    EVENTS,
    DEFAULT_FILTERS,
    EventEmitter
};

// Default export
export default TravelDataManager;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DataManager: TravelDataManager,     // Match the import name
        TravelDataManager,
        ActivityModel,
        Utils,
        EVENTS,
        DEFAULT_FILTERS,
        EventEmitter,
        default: TravelDataManager
    };
}

// Example usage and initialization
/*
// Create a new instance
const dataManager = new TravelDataManager();

// Add some sample activities
dataManager.addActivity({
    activity: 'Visit Sydney Opera House',
    date: '2025-08-15',
    time: '14:00',
    reachTo: 'Sydney Opera House',
    transportMode: 'train',
    cost: 45.00,
    booking: 'required',
    category: 'sightseeing',
    notes: 'Book tickets in advance'
});

// Listen for events
dataManager.on(EVENTS.DATA_UPDATED, () => {
    console.log('Data has been updated!');
});

// Filter activities
dataManager.updateFilters({
    searchText: 'sydney',
    costRange: { min: 0, max: 100 }
});

// Export data
const exportedData = await dataManager.exportData('json');
console.log('Exported:', exportedData);
*/