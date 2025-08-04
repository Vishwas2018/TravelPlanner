/**
 * Travel Itinerary Manager - File Handler
 * Handles file operations, import/export, and format conversion
 */

import { Utils } from '../core/utils.js';
import { ActivityModel } from './ActivityModel.js';
import {
    APP_CONFIG,
    FILE_EXTENSIONS,
    MIME_TYPES,
    ERROR_MESSAGES
} from '../core/constants.js';

export class FileHandler {
    constructor() {
        this.supportedFormats = ['.xlsx', '.xls', '.csv', '.json'];
        this.maxFileSize = APP_CONFIG.maxFileSize;
        this.isProcessing = false;
    }

    /**
     * Load file and return parsed data
     * @param {File} file - File to load
     * @param {object} options - Loading options
     * @returns {Promise<object>} Parsed data with metadata
     */
    async loadFile(file, options = {}) {
        if (this.isProcessing) {
            throw new Error('Another file is currently being processed');
        }

        try {
            this.isProcessing = true;

            // Validate file
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            // Determine file type
            const fileType = this.getFileType(file);

            // Parse based on file type
            let data;
            switch (fileType) {
                case 'csv':
                    data = await this.parseCSV(file, options);
                    break;
                case 'xlsx':
                case 'xls':
                    data = await this.parseExcel(file, options);
                    break;
                case 'json':
                    data = await this.parseJSON(file, options);
                    break;
                default:
                    throw new Error(`Unsupported file format: ${fileType}`);
            }

            // Validate and convert to ActivityModel instances
            const activities = this.convertToActivities(data.rows);

            return {
                activities,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType,
                    totalRows: data.rows.length,
                    validActivities: activities.length,
                    headers: data.headers,
                    importedAt: new Date().toISOString()
                }
            };

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Validate file before processing
     * @param {File} file - File to validate
     * @returns {object} Validation result
     */
    validateFile(file) {
        const result = { isValid: true, error: null, warnings: [] };

        // Check if file exists
        if (!file) {
            result.isValid = false;
            result.error = 'No file provided';
            return result;
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            result.isValid = false;
            result.error = `File size exceeds maximum limit of ${Utils.formatFileSize(this.maxFileSize)}`;
            return result;
        }

        if (file.size === 0) {
            result.isValid = false;
            result.error = 'File is empty';
            return result;
        }

        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.supportedFormats.includes(extension)) {
            result.isValid = false;
            result.error = `Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`;
            return result;
        }

        // Check MIME type if available
        if (file.type) {
            const expectedMimeTypes = this.getExpectedMimeTypes(extension);
            if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
                result.warnings.push('File MIME type does not match extension');
            }
        }

        // File size warnings
        if (file.size > 5 * 1024 * 1024) { // 5MB
            result.warnings.push('Large file detected, processing may take longer');
        }

        return result;
    }

    /**
     * Get file extension
     * @param {string} filename - File name
     * @returns {string} File extension with dot
     */
    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    /**
     * Get file type from file
     * @param {File} file - File object
     * @returns {string} File type
     */
    getFileType(file) {
        const extension = this.getFileExtension(file.name);

        switch (extension) {
            case '.csv':
                return 'csv';
            case '.xlsx':
                return 'xlsx';
            case '.xls':
                return 'xls';
            case '.json':
                return 'json';
            default:
                return 'unknown';
        }
    }

    /**
     * Get expected MIME types for extension
     * @param {string} extension - File extension
     * @returns {Array} Expected MIME types
     */
    getExpectedMimeTypes(extension) {
        switch (extension) {
            case '.csv':
                return [MIME_TYPES.CSV, 'application/csv'];
            case '.xlsx':
                return [MIME_TYPES.XLSX];
            case '.xls':
                return [MIME_TYPES.XLS];
            case '.json':
                return ['application/json'];
            default:
                return [];
        }
    }

    /**
     * Parse CSV file
     * @param {File} file - CSV file
     * @param {object} options - Parsing options
     * @returns {Promise<object>} Parsed data
     */
    async parseCSV(file, options = {}) {
        return new Promise((resolve, reject) => {
            const defaultOptions = {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                trimHeaders: true,
                transformHeader: (header) => header.trim(),
                delimitersToGuess: [',', '\t', '|', ';'],
                ...options
            };

            if (typeof Papa === 'undefined') {
                reject(new Error('Papa Parse library not loaded'));
                return;
            }

            Papa.parse(file, {
                ...defaultOptions,
                complete: (results) => {
                    try {
                        if (results.errors.length > 0) {
                            const criticalErrors = results.errors.filter(error =>
                                error.type === 'Delimiter' || error.type === 'Quotes'
                            );

                            if (criticalErrors.length > 0) {
                                reject(new Error(`CSV parsing errors: ${criticalErrors.map(e => e.message).join(', ')}`));
                                return;
                            }

                            console.warn('CSV parsing warnings:', results.errors);
                        }

                        const headers = results.meta.fields || [];
                        const rows = results.data || [];

                        // Clean and normalize data
                        const cleanedRows = this.cleanCSVData(rows, headers);

                        resolve({
                            headers,
                            rows: cleanedRows,
                            metadata: {
                                delimiter: results.meta.delimiter,
                                linebreak: results.meta.linebreak,
                                aborted: results.meta.aborted,
                                truncated: results.meta.truncated,
                                cursor: results.meta.cursor
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                }
            });
        });
    }

    /**
     * Clean CSV data
     * @param {Array} rows - Raw CSV rows
     * @param {Array} headers - CSV headers
     * @returns {Array} Cleaned rows
     */
    cleanCSVData(rows, headers) {
        return rows.map(row => {
            const cleaned = {};

            headers.forEach(header => {
                let value = row[header];

                // Handle null/undefined values
                if (value === null || value === undefined) {
                    value = '';
                }

                // Convert to string and trim
                if (typeof value !== 'string') {
                    value = String(value);
                }
                value = value.trim();

                // Handle special values
                if (value.toLowerCase() === 'null' || value.toLowerCase() === 'n/a') {
                    value = '';
                }

                cleaned[header] = value;
            });

            return cleaned;
        }).filter(row => {
            // Remove completely empty rows
            return Object.values(row).some(value => value && value.trim() !== '');
        });
    }

    /**
     * Parse Excel file
     * @param {File} file - Excel file
     * @param {object} options - Parsing options
     * @returns {Promise<object>} Parsed data
     */
    async parseExcel(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (typeof XLSX === 'undefined') {
                reject(new Error('SheetJS library not loaded'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target.result, {
                        type: 'array',
                        cellStyles: true,
                        cellFormulas: false,
                        cellDates: true,
                        cellNF: false,
                        sheetStubs: false,
                        ...options
                    });

                    // Get the first worksheet or specified sheet
                    const sheetName = options.sheetName || workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    if (!worksheet) {
                        reject(new Error(`Worksheet "${sheetName}" not found`));
                        return;
                    }

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: '',
                        blankrows: false,
                        header: 1 // Get as array of arrays first
                    });

                    if (jsonData.length === 0) {
                        reject(new Error('No data found in Excel file'));
                        return;
                    }

                    // First row as headers
                    const headers = jsonData[0].map(header => String(header || '').trim());
                    const rows = jsonData.slice(1);

                    // Convert rows to objects
                    const objectRows = rows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            let value = row[index];

                            // Handle Excel date values
                            if (value instanceof Date) {
                                value = value.toISOString().split('T')[0];
                            } else if (typeof value === 'number' && header.toLowerCase().includes('date')) {
                                // Excel date serial number
                                const date = new Date((value - 25569) * 86400 * 1000);
                                if (!isNaN(date.getTime())) {
                                    value = date.toISOString().split('T')[0];
                                }
                            }

                            obj[header] = value || '';
                        });
                        return obj;
                    }).filter(row => {
                        // Remove empty rows
                        return Object.values(row).some(value => value && String(value).trim() !== '');
                    });

                    resolve({
                        headers,
                        rows: objectRows,
                        metadata: {
                            sheetName,
                            availableSheets: workbook.SheetNames,
                            workbookProps: workbook.Props
                        }
                    });

                } catch (error) {
                    reject(new Error(`Failed to parse Excel file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read Excel file'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse JSON file
     * @param {File} file - JSON file
     * @param {object} options - Parsing options
     * @returns {Promise<object>} Parsed data
     */
    async parseJSON(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);

                    let rows;
                    let headers = [];

                    // Handle different JSON structures
                    if (Array.isArray(jsonData)) {
                        rows = jsonData;
                        if (rows.length > 0 && typeof rows[0] === 'object') {
                            headers = Object.keys(rows[0]);
                        }
                    } else if (jsonData.activities && Array.isArray(jsonData.activities)) {
                        rows = jsonData.activities;
                        headers = Object.keys(rows[0] || {});
                    } else if (typeof jsonData === 'object') {
                        // Single object - convert to array
                        rows = [jsonData];
                        headers = Object.keys(jsonData);
                    } else {
                        throw new Error('Invalid JSON structure');
                    }

                    resolve({
                        headers,
                        rows,
                        metadata: {
                            originalStructure: Array.isArray(jsonData) ? 'array' : 'object',
                            hasMetadata: jsonData.metadata ? true : false
                        }
                    });

                } catch (error) {
                    reject(new Error(`Failed to parse JSON file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read JSON file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Convert raw data to ActivityModel instances
     * @param {Array} rows - Raw data rows
     * @returns {Array} Array of ActivityModel instances
     */
    convertToActivities(rows) {
        const activities = [];
        const errors = [];

        rows.forEach((row, index) => {
            try {
                const activity = ActivityModel.fromCSV(row);
                const validation = activity.validate();

                if (validation.isValid) {
                    activities.push(activity);
                } else {
                    console.warn(`Row ${index + 1} validation errors:`, validation.errors);
                    // Still add the activity but log the issues
                    activities.push(activity);
                }
            } catch (error) {
                errors.push({ row: index + 1, error: error.message });
                console.error(`Error converting row ${index + 1}:`, error);
            }
        });

        if (errors.length > 0) {
            console.warn(`${errors.length} rows had conversion errors:`, errors);
        }

        return activities;
    }

    /**
     * Export activities to CSV format
     * @param {Array} activities - Array of ActivityModel instances
     * @param {object} options - Export options
     * @returns {string} CSV content
     */
    exportToCSV(activities, options = {}) {
        const {
            includeHeaders = true,
            delimiter = ',',
            includeMetadata = false,
            customFields = null
        } = options;

        if (!activities || activities.length === 0) {
            return includeHeaders ? 'No data to export\n' : '';
        }

        // Get headers
        const headers = customFields || [
            'Activity', 'Date', 'Day', 'Start Time', 'End Time',
            'From', 'To', 'Transport Mode', 'Booking Required',
            'Cost', 'Additional Details', 'Accommodation Details',
            'Category', 'Priority', 'Status', 'Tags'
        ];

        const rows = [];

        // Add headers
        if (includeHeaders) {
            rows.push(headers.join(delimiter));
        }

        // Add data rows
        activities.forEach(activity => {
            const csvRow = activity.toCSV();
            const values = headers.map(header => {
                let value = csvRow[header] || '';

                // Escape and quote values that contain delimiter, quotes, or newlines
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""'); // Escape quotes
                    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
                        value = `"${value}"`;
                    }
                }

                return value;
            });

            rows.push(values.join(delimiter));
        });

        // Add metadata if requested
        if (includeMetadata) {
            rows.push('');
            rows.push('# Export Metadata');
            rows.push(`# Exported at: ${new Date().toISOString()}`);
            rows.push(`# Total activities: ${activities.length}`);
            rows.push(`# Export version: ${APP_CONFIG.version}`);
        }

        return rows.join('\n');
    }

    /**
     * Export activities to Excel format
     * @param {Array} activities - Array of ActivityModel instances
     * @param {object} options - Export options
     * @returns {Blob} Excel file blob
     */
    exportToExcel(activities, options = {}) {
        if (typeof XLSX === 'undefined') {
            throw new Error('SheetJS library not loaded');
        }

        const {
            sheetName = 'Travel Itinerary',
            includeMetadata = true,
            customFields = null
        } = options;

        // Convert activities to plain objects
        const data = activities.map(activity => {
            const csvData = activity.toCSV();

            if (customFields) {
                const filtered = {};
                customFields.forEach(field => {
                    filtered[field] = csvData[field] || '';
                });
                return filtered;
            }

            return csvData;
        });

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Create main data worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-size columns
        const colWidths = [];
        if (data.length > 0) {
            Object.keys(data[0]).forEach((key, index) => {
                const maxLength = Math.max(
                    key.length,
                    ...data.map(row => String(row[key] || '').length)
                );
                colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
            });
        }
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Add metadata sheet if requested
        if (includeMetadata) {
            const metadata = [
                { Property: 'Export Date', Value: new Date().toISOString() },
                { Property: 'Total Activities', Value: activities.length },
                { Property: 'Export Version', Value: APP_CONFIG.version },
                { Property: 'File Format', Value: 'Excel (.xlsx)' }
            ];

            const metaWs = XLSX.utils.json_to_sheet(metadata);
            XLSX.utils.book_append_sheet(wb, metaWs, 'Export Info');
        }

        // Convert to binary
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([wbout], { type: MIME_TYPES.XLSX });
    }

    /**
     * Export activities to JSON format
     * @param {Array} activities - Array of ActivityModel instances
     * @param {object} options - Export options
     * @returns {string} JSON content
     */
    exportToJSON(activities, options = {}) {
        const {
            includeMetadata = true,
            prettyPrint = true,
            format = 'array' // 'array' or 'object'
        } = options;

        const data = activities.map(activity => activity.toJSON());

        let exportData;
        if (format === 'object') {
            exportData = {
                activities: data
            };

            if (includeMetadata) {
                exportData.metadata = {
                    exportedAt: new Date().toISOString(),
                    totalActivities: activities.length,
                    version: APP_CONFIG.version,
                    format: 'Travel Itinerary JSON'
                };
            }
        } else {
            exportData = data;
        }

        return JSON.stringify(exportData, null, prettyPrint ? 2 : 0);
    }

    /**
     * Download file with specified content
     * @param {string|Blob} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        try {
            let blob;

            if (content instanceof Blob) {
                blob = content;
            } else {
                blob = new Blob([content], { type: mimeType });
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);

        } catch (error) {
            console.error('Download failed:', error);
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    /**
     * Generate template file
     * @param {string} format - Template format ('csv', 'excel', 'json')
     * @param {object} options - Template options
     * @returns {string|Blob} Template content
     */
    generateTemplate(format = 'excel', options = {}) {
        const sampleData = [
            {
                Activity: 'Sample Flight',
                Date: '2025-09-19',
                Day: 'Friday',
                'Start Time': '09:00',
                'End Time': '17:00',
                From: 'Melbourne Airport',
                To: 'London Heathrow',
                'Transport Mode': 'Flight',
                'Booking Required': 'TRUE',
                Cost: 800,
                'Additional Details': 'Bring passport and check-in 2 hours early',
                'Accommodation Details': '',
                Category: 'transport',
                Priority: 'high',
                Status: 'confirmed',
                Tags: 'international; flight; important'
            },
            {
                Activity: 'Hotel Check-in',
                Date: '2025-09-19',
                Day: 'Friday',
                'Start Time': '19:00',
                'End Time': '20:00',
                From: 'London Heathrow',
                To: 'Hotel London',
                'Transport Mode': 'Taxi',
                'Booking Required': 'TRUE',
                Cost: 150,
                'Additional Details': 'Booking confirmation: ABC123',
                'Accommodation Details': 'Hotel London, Room 401',
                Category: 'accommodation',
                Priority: 'normal',
                Status: 'confirmed',
                Tags: 'hotel; accommodation'
            },
            {
                Activity: 'London Sightseeing',
                Date: '2025-09-20',
                Day: 'Saturday',
                'Start Time': '10:00',
                'End Time': '18:00',
                From: 'Hotel London',
                To: 'London City Centre',
                'Transport Mode': 'Walking',
                'Booking Required': 'FALSE',
                Cost: 50,
                'Additional Details': 'Visit Big Ben, Westminster Abbey, London Eye',
                'Accommodation Details': '',
                Category: 'sightseeing',
                Priority: 'normal',
                Status: 'planned',
                Tags: 'sightseeing; walking; tourist'
            }
        ];

        switch (format.toLowerCase()) {
            case 'csv':
                return this.exportToCSV(sampleData.map(data => ActivityModel.fromCSV(data)), {
                    includeMetadata: true,
                    ...options
                });

            case 'excel':
            case 'xlsx':
                return this.exportToExcel(sampleData.map(data => ActivityModel.fromCSV(data)), {
                    sheetName: 'Travel Template',
                    includeMetadata: true,
                    ...options
                });

            case 'json':
                return this.exportToJSON(sampleData.map(data => ActivityModel.fromCSV(data)), {
                    includeMetadata: true,
                    format: 'object',
                    ...options
                });

            default:
                throw new Error(`Unsupported template format: ${format}`);
        }
    }

    /**
     * Download template file
     * @param {string} format - Template format
     * @param {object} options - Template options
     */
    downloadTemplate(format = 'excel', options = {}) {
        const template = this.generateTemplate(format, options);
        const timestamp = new Date().toISOString().split('T')[0];

        let filename, mimeType;

        switch (format.toLowerCase()) {
            case 'csv':
                filename = `travel_template_${timestamp}.csv`;
                mimeType = MIME_TYPES.CSV;
                break;
            case 'excel':
            case 'xlsx':
                filename = `travel_template_${timestamp}.xlsx`;
                mimeType = MIME_TYPES.XLSX;
                break;
            case 'json':
                filename = `travel_template_${timestamp}.json`;
                mimeType = 'application/json';
                break;
            default:
                throw new Error(`Unsupported template format: ${format}`);
        }

        this.downloadFile(template, filename, mimeType);
    }

    /**
     * Validate imported data structure
     * @param {Array} rows - Data rows
     * @returns {object} Validation result
     */
    validateDataStructure(rows) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        if (!Array.isArray(rows) || rows.length === 0) {
            result.isValid = false;
            result.errors.push('No data rows found');
            return result;
        }

        // Check for required columns
        const requiredColumns = ['Activity', 'Date'];
        const firstRow = rows[0];
        const availableColumns = Object.keys(firstRow);

        requiredColumns.forEach(required => {
            const found = availableColumns.find(col =>
                col.toLowerCase().includes(required.toLowerCase())
            );

            if (!found) {
                result.errors.push(`Missing required column: ${required}`);
                result.isValid = false;
            }
        });

        // Check for recommended columns
        const recommendedColumns = ['Cost', 'Transport Mode', 'Booking'];
        recommendedColumns.forEach(recommended => {
            const found = availableColumns.find(col =>
                col.toLowerCase().includes(recommended.toLowerCase())
            );

            if (!found) {
                result.warnings.push(`Missing recommended column: ${recommended}`);
                result.suggestions.push(`Consider adding a "${recommended}" column for better tracking`);
            }
        });

        // Check data quality
        let emptyActivityCount = 0;
        let invalidDateCount = 0;

        rows.forEach((row, index) => {
            const activity = row.Activity || row.activity || '';
            const date = row.Date || row.date || '';

            if (!activity || activity.trim() === '') {
                emptyActivityCount++;
            }

            if (date && isNaN(new Date(date).getTime())) {
                invalidDateCount++;
            }
        });

        if (emptyActivityCount > 0) {
            result.warnings.push(`${emptyActivityCount} rows have empty activity names`);
        }

        if (invalidDateCount > 0) {
            result.warnings.push(`${invalidDateCount} rows have invalid dates`);
        }

        // Data quality percentage
        const qualityScore = ((rows.length - emptyActivityCount - invalidDateCount) / rows.length) * 100;
        if (qualityScore < 80) {
            result.warnings.push(`Data quality score: ${qualityScore.toFixed(1)}% (recommended: >80%)`);
        }

        return result;
    }

    /**
     * Get file processing progress
     * @returns {object} Processing status
     */
    getProcessingStatus() {
        return {
            isProcessing: this.isProcessing,
            supportedFormats: this.supportedFormats,
            maxFileSize: this.maxFileSize,
            maxFileSizeFormatted: Utils.formatFileSize(this.maxFileSize)
        };
    }

    /**
     * Set maximum file size
     * @param {number} sizeInBytes - Maximum file size in bytes
     */
    setMaxFileSize(sizeInBytes) {
        this.maxFileSize = Math.max(1024, sizeInBytes); // Minimum 1KB
    }

    /**
     * Add supported format
     * @param {string} extension - File extension (with dot)
     */
    addSupportedFormat(extension) {
        if (!extension.startsWith('.')) {
            extension = '.' + extension;
        }

        if (!this.supportedFormats.includes(extension.toLowerCase())) {
            this.supportedFormats.push(extension.toLowerCase());
        }
    }

    /**
     * Remove supported format
     * @param {string} extension - File extension (with dot)
     */
    removeSupportedFormat(extension) {
        if (!extension.startsWith('.')) {
            extension = '.' + extension;
        }

        const index = this.supportedFormats.indexOf(extension.toLowerCase());
        if (index > -1) {
            this.supportedFormats.splice(index, 1);
        }
    }

    /**
     * Get file information without parsing
     * @param {File} file - File to analyze
     * @returns {object} File information
     */
    getFileInfo(file) {
        const extension = this.getFileExtension(file.name);
        const type = this.getFileType(file);

        return {
            name: file.name,
            size: file.size,
            sizeFormatted: Utils.formatFileSize(file.size),
            type,
            extension,
            mimeType: file.type,
            lastModified: file.lastModified ? new Date(file.lastModified) : null,
            isSupported: this.supportedFormats.includes(extension),
            expectedMimeTypes: this.getExpectedMimeTypes(extension)
        };
    }

    /**
     * Batch process multiple files
     * @param {FileList} files - Files to process
     * @param {object} options - Processing options
     * @returns {Promise<Array>} Processing results
     */
    async processMultipleFiles(files, options = {}) {
        const results = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const result = await this.loadFile(file, options);
                results.push({
                    file: file.name,
                    success: true,
                    data: result
                });
            } catch (error) {
                errors.push({
                    file: file.name,
                    error: error.message
                });
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            results,
            successful: results.filter(r => r.success).length,
            failed: errors.length,
            errors
        };
    }

    /**
     * Create file input element with drag and drop
     * @param {HTMLElement} container - Container element
     * @param {Function} onFileLoad - Callback when file is loaded
     * @param {object} options - Options
     */
    createFileInput(container, onFileLoad, options = {}) {
        const {
            multiple = false,
            dragAndDrop = true,
            acceptedFormats = this.supportedFormats.join(',')
        } = options;

        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptedFormats;
        input.multiple = multiple;
        input.style.display = 'none';

        // Create visual element
        const visual = document.createElement('div');
        visual.className = 'file-drop-zone';
        visual.innerHTML = `
            <div class="drop-zone-content">
                <div class="drop-icon">📁</div>
                <div class="drop-text">
                    <strong>Drop files here or click to browse</strong>
                    <p>Supported formats: ${this.supportedFormats.join(', ')}</p>
                    <p>Maximum size: ${Utils.formatFileSize(this.maxFileSize)}</p>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .file-drop-zone {
                border: 2px dashed #cbd5e0;
                border-radius: 0.75rem;
                padding: 2rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                background: #f7fafc;
            }
            .file-drop-zone:hover,
            .file-drop-zone.dragover {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.05);
            }
            .drop-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                opacity: 0.5;
            }
            .drop-text strong {
                display: block;
                margin-bottom: 0.5rem;
                color: #2d3748;
            }
            .drop-text p {
                margin: 0.25rem 0;
                font-size: 0.875rem;
                color: #718096;
            }
        `;
        document.head.appendChild(style);

        // Event handlers
        visual.addEventListener('click', () => input.click());

        input.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                try {
                    const results = multiple ?
                        await this.processMultipleFiles(files) :
                        await this.loadFile(files[0]);

                    onFileLoad(results, null);
                } catch (error) {
                    onFileLoad(null, error);
                }
            }
        });

        // Drag and drop
        if (dragAndDrop) {
            visual.addEventListener('dragover', (e) => {
                e.preventDefault();
                visual.classList.add('dragover');
            });

            visual.addEventListener('dragleave', () => {
                visual.classList.remove('dragover');
            });

            visual.addEventListener('drop', async (e) => {
                e.preventDefault();
                visual.classList.remove('dragover');

                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    try {
                        const results = multiple ?
                            await this.processMultipleFiles(files) :
                            await this.loadFile(files[0]);

                        onFileLoad(results, null);
                    } catch (error) {
                        onFileLoad(null, error);
                    }
                }
            });
        }

        container.appendChild(input);
        container.appendChild(visual);

        return { input, visual };
    }

    /**
     * Dispose of file handler
     */
    dispose() {
        this.isProcessing = false;
    }
}

// Create global instance
export const fileHandler = new FileHandler();