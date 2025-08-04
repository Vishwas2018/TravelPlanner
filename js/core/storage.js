/**
 * Travel Itinerary Manager - Storage Management
 * Handles localStorage operations with error handling and data versioning
 */

import { APP_CONFIG } from './constants.js';
import { Utils } from './utils.js';

export class StorageManager {
    constructor(key = APP_CONFIG.storageKey) {
        this.key = key;
        this.isAvailable = this.checkStorageAvailability();
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} Storage availability
     */
    checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage is not available:', error);
            return false;
        }
    }

    /**
     * Save data to localStorage with versioning and timestamp
     * @param {any} data - Data to save
     * @returns {boolean} Success status
     */
    save(data) {
        if (!this.isAvailable) {
            console.warn('Storage not available, skipping save');
            return false;
        }

        try {
            const serializedData = Utils.safeJsonStringify({
                data,
                timestamp: Date.now(),
                version: APP_CONFIG.version,
                checksum: this.generateChecksum(data)
            });

            localStorage.setItem(this.key, serializedData);
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);

            // Try to clear some space if quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.clearOldEntries();
                // Retry once
                try {
                    const serializedData = Utils.safeJsonStringify({
                        data,
                        timestamp: Date.now(),
                        version: APP_CONFIG.version
                    });
                    localStorage.setItem(this.key, serializedData);
                    return true;
                } catch (retryError) {
                    console.error('Retry save failed:', retryError);
                }
            }
            return false;
        }
    }

    /**
     * Load data from localStorage with validation
     * @returns {any|null} Loaded data or null
     */
    load() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const item = localStorage.getItem(this.key);
            if (!item) return null;

            const parsed = Utils.safeJsonParse(item);
            if (!parsed) return null;

            // Validate data structure
            if (!this.validateStoredData(parsed)) {
                console.warn('Invalid stored data structure, clearing...');
                this.clear();
                return null;
            }

            // Check version compatibility
            if (parsed.version && !this.isVersionCompatible(parsed.version)) {
                console.warn(`Version mismatch: stored ${parsed.version}, current ${APP_CONFIG.version}`);
                return this.migrateData(parsed);
            }

            // Verify data integrity if checksum exists
            if (parsed.checksum && !this.verifyChecksum(parsed.data, parsed.checksum)) {
                console.warn('Data integrity check failed');
                return null;
            }

            return parsed.data;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    }

    /**
     * Clear data from localStorage
     * @returns {boolean} Success status
     */
    clear() {
        if (!this.isAvailable) {
            return false;
        }

        try {
            localStorage.removeItem(this.key);
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     * @returns {object} Storage usage stats
     */
    getStorageInfo() {
        if (!this.isAvailable) {
            return { available: false };
        }

        try {
            const data = localStorage.getItem(this.key);
            const size = data ? new Blob([data]).size : 0;

            // Estimate total localStorage usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }

            return {
                available: true,
                keySize: size,
                totalSize,
                keyCount: localStorage.length,
                formattedSize: Utils.formatFileSize(size),
                formattedTotal: Utils.formatFileSize(totalSize)
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { available: false, error: error.message };
        }
    }

    /**
     * Export all storage data
     * @returns {object} Exported data
     */
    export() {
        const data = this.load();
        return {
            exportedAt: new Date().toISOString(),
            version: APP_CONFIG.version,
            data
        };
    }

    /**
     * Import data to storage
     * @param {object} importData - Data to import
     * @returns {boolean} Success status
     */
    import(importData) {
        try {
            if (!importData || !importData.data) {
                throw new Error('Invalid import data format');
            }

            // Validate import data version
            if (importData.version && !this.isVersionCompatible(importData.version)) {
                console.warn('Import version mismatch, attempting migration...');
                importData = this.migrateData(importData);
            }

            return this.save(importData.data);
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Backup current data with timestamp
     * @returns {boolean} Success status
     */
    backup() {
        const currentData = this.load();
        if (!currentData) return false;

        const backupKey = `${this.key}_backup_${Date.now()}`;
        const backupStorage = new StorageManager(backupKey);

        return backupStorage.save({
            original: currentData,
            backedUpAt: new Date().toISOString(),
            version: APP_CONFIG.version
        });
    }

    /**
     * List all backup keys
     * @returns {Array} Backup keys with metadata
     */
    listBackups() {
        if (!this.isAvailable) return [];

        const backups = [];
        const prefix = `${this.key}_backup_`;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const timestamp = key.replace(prefix, '');
                    const data = Utils.safeJsonParse(localStorage.getItem(key));

                    backups.push({
                        key,
                        timestamp: parseInt(timestamp),
                        date: new Date(parseInt(timestamp)),
                        version: data?.version,
                        size: localStorage.getItem(key)?.length || 0
                    });
                }
            }

            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error listing backups:', error);
            return [];
        }
    }

    /**
     * Restore from backup
     * @param {string} backupKey - Backup key to restore from
     * @returns {boolean} Success status
     */
    restoreFromBackup(backupKey) {
        try {
            const backupData = Utils.safeJsonParse(localStorage.getItem(backupKey));
            if (!backupData || !backupData.original) {
                throw new Error('Invalid backup data');
            }

            return this.save(backupData.original);
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Clean up old backup entries
     * @param {number} maxBackups - Maximum number of backups to keep
     */
    cleanupBackups(maxBackups = 5) {
        const backups = this.listBackups();
        if (backups.length <= maxBackups) return;

        const toDelete = backups.slice(maxBackups);
        toDelete.forEach(backup => {
            try {
                localStorage.removeItem(backup.key);
            } catch (error) {
                console.error('Error deleting backup:', error);
            }
        });
    }

    /**
     * Generate checksum for data integrity
     * @param {any} data - Data to checksum
     * @returns {string} Checksum hash
     */
    generateChecksum(data) {
        const str = Utils.safeJsonStringify(data);
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return hash.toString(16);
    }

    /**
     * Verify data checksum
     * @param {any} data - Data to verify
     * @param {string} expectedChecksum - Expected checksum
     * @returns {boolean} Checksum validity
     */
    verifyChecksum(data, expectedChecksum) {
        const actualChecksum = this.generateChecksum(data);
        return actualChecksum === expectedChecksum;
    }

    /**
     * Validate stored data structure
     * @param {object} parsed - Parsed storage data
     * @returns {boolean} Data validity
     */
    validateStoredData(parsed) {
        return parsed &&
            typeof parsed === 'object' &&
            parsed.hasOwnProperty('data') &&
            parsed.hasOwnProperty('timestamp') &&
            typeof parsed.timestamp === 'number';
    }

    /**
     * Check version compatibility
     * @param {string} storedVersion - Stored data version
     * @returns {boolean} Version compatibility
     */
    isVersionCompatible(storedVersion) {
        const current = APP_CONFIG.version.split('.').map(Number);
        const stored = storedVersion.split('.').map(Number);

        // Major version must match
        if (current[0] !== stored[0]) return false;

        // Minor version backwards compatibility
        if (current[1] < stored[1]) return false;

        return true;
    }

    /**
     * Migrate data between versions
     * @param {object} oldData - Old version data
     * @returns {any} Migrated data
     */
    migrateData(oldData) {
        console.log('Migrating data from version', oldData.version, 'to', APP_CONFIG.version);

        try {
            // Add migration logic here based on version differences
            let migratedData = oldData.data;

            // Example migration for version 1.x to 2.x
            if (oldData.version?.startsWith('1.')) {
                migratedData = this.migrateFromV1(migratedData);
            }

            return migratedData;
        } catch (error) {
            console.error('Data migration failed:', error);
            return null;
        }
    }

    /**
     * Migrate data from version 1.x
     * @param {any} v1Data - Version 1 data
     * @returns {any} Migrated data
     */
    migrateFromV1(v1Data) {
        // Example migration logic
        if (Array.isArray(v1Data)) {
            return {
                activities: v1Data.map(activity => ({
                    ...activity,
                    id: activity.id || Utils.generateId(),
                    createdAt: activity.createdAt || new Date().toISOString(),
                    updatedAt: activity.updatedAt || new Date().toISOString()
                })),
                filters: {
                    search: '',
                    startDate: '',
                    endDate: '',
                    transport: '',
                    booking: ['TRUE', 'FALSE'],
                    maxCost: 10000
                }
            };
        }

        return v1Data;
    }

    /**
     * Clear old entries to free up space
     */
    clearOldEntries() {
        if (!this.isAvailable) return;

        try {
            const keysToCheck = [];

            // Collect keys that might be old
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('backup') || key.includes('temp'))) {
                    keysToCheck.push(key);
                }
            }

            // Remove oldest entries first
            keysToCheck.forEach(key => {
                try {
                    const data = Utils.safeJsonParse(localStorage.getItem(key));
                    const age = Date.now() - (data?.timestamp || 0);

                    // Remove entries older than 30 days
                    if (age > 30 * 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    // If we can't parse it, it's probably corrupted, remove it
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing old entries:', error);
        }
    }

    /**
     * Get storage quota information (Chrome only)
     * @returns {Promise<object>} Storage quota info
     */
    async getStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage,
                    usagePercentage: Math.round((estimate.usage / estimate.quota) * 100),
                    formattedQuota: Utils.formatFileSize(estimate.quota),
                    formattedUsage: Utils.formatFileSize(estimate.usage),
                    formattedAvailable: Utils.formatFileSize(estimate.quota - estimate.usage)
                };
            }
        } catch (error) {
            console.warn('Storage quota estimation not available:', error);
        }

        return { available: false };
    }

    /**
     * Watch for storage changes
     * @param {Function} callback - Callback for storage events
     * @returns {Function} Cleanup function
     */
    watchStorage(callback) {
        const handler = (event) => {
            if (event.key === this.key && event.storageArea === localStorage) {
                callback({
                    key: event.key,
                    oldValue: event.oldValue,
                    newValue: event.newValue,
                    timestamp: Date.now()
                });
            }
        };

        window.addEventListener('storage', handler);

        // Return cleanup function
        return () => window.removeEventListener('storage', handler);
    }

    /**
     * Create a scoped storage manager for specific data types
     * @param {string} scope - Scope identifier
     * @returns {StorageManager} Scoped storage manager
     */
    createScope(scope) {
        return new StorageManager(`${this.key}_${scope}`);
    }

    /**
     * Compress data before storage (simple compression)
     * @param {string} data - Data to compress
     * @returns {string} Compressed data
     */
    compress(data) {
        try {
            // Simple run-length encoding for repeated characters
            return data.replace(/(.)\1{2,}/g, (match, char) => {
                return `${char}${match.length}${char}`;
            });
        } catch (error) {
            console.warn('Compression failed:', error);
            return data;
        }
    }

    /**
     * Decompress data after loading
     * @param {string} compressedData - Compressed data
     * @returns {string} Decompressed data
     */
    decompress(compressedData) {
        try {
            return compressedData.replace(/(.)\d+\1/g, (match, char) => {
                const count = parseInt(match.slice(1, -1));
                return char.repeat(count);
            });
        } catch (error) {
            console.warn('Decompression failed:', error);
            return compressedData;
        }
    }

    /**
     * Batch operations for multiple keys
     * @param {Array} operations - Array of {action, key, data} objects
     * @returns {Array} Results of operations
     */
    batch(operations) {
        const results = [];

        operations.forEach(op => {
            try {
                switch (op.action) {
                    case 'set':
                        results.push({
                            key: op.key,
                            success: this.save(op.data),
                            action: 'set'
                        });
                        break;
                    case 'get':
                        results.push({
                            key: op.key,
                            data: this.load(),
                            action: 'get'
                        });
                        break;
                    case 'delete':
                        results.push({
                            key: op.key,
                            success: this.clear(),
                            action: 'delete'
                        });
                        break;
                }
            } catch (error) {
                results.push({
                    key: op.key,
                    error: error.message,
                    action: op.action
                });
            }
        });

        return results;
    }
}