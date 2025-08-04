/**
 * Travel Itinerary Manager - Validation Service
 * Centralized validation logic with extensible rule system
 */

import {
    FORM_VALIDATION_RULES,
    ERROR_MESSAGES,
    BOOKING_STATUS,
    TRANSPORT_MODES
} from '../core/constants.js';

export class ValidationService {
    constructor() {
        this.rules = new Map();
        this.customValidators = new Map();

        this.initializeDefaultRules();
    }

    /**
     * Initialize default validation rules
     */
    initializeDefaultRules() {
        // Activity name validation
        this.addRule('activity', {
            required: true,
            minLength: 1,
            maxLength: 200,
            pattern: /^[\w\s\-.,!?()]+$/,
            sanitize: (value) => value?.trim()
        });

        // Date validation
        this.addRule('date', {
            required: true,
            type: 'date',
            validate: (value) => {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return 'Invalid date format';
                }

                // Check if date is too far in the past
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                if (date < oneYearAgo) {
                    return { warning: 'Date is more than a year in the past' };
                }

                return true;
            }
        });

        // Time validation
        this.addRule('startTime', {
            type: 'time',
            pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
            sanitize: (value) => value?.trim()
        });

        this.addRule('endTime', {
            type: 'time',
            pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
            sanitize: (value) => value?.trim(),
            validate: (value, allData) => {
                if (!value || !allData.startTime) return true;

                const startMinutes = this.timeToMinutes(allData.startTime);
                const endMinutes = this.timeToMinutes(value);

                if (startMinutes >= endMinutes) {
                    return { warning: 'End time should be after start time' };
                }

                return true;
            }
        });

        // Cost validation
        this.addRule('cost', {
            type: 'number',
            min: 0,
            max: 999999,
            sanitize: (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : Math.max(0, num);
            }
        });

        // Location validation
        this.addRule('startFrom', {
            maxLength: 500,
            sanitize: (value) => value?.trim()
        });

        this.addRule('reachTo', {
            maxLength: 500,
            sanitize: (value) => value?.trim(),
            validate: (value, allData) => {
                if (!value || !allData.startFrom) return true;

                if (value.toLowerCase() === allData.startFrom.toLowerCase()) {
                    return { warning: 'Start and destination locations are the same' };
                }

                return true;
            }
        });

        // Transport mode validation
        this.addRule('transportMode', {
            enum: Object.values(TRANSPORT_MODES),
            allowEmpty: true,
            validate: (value) => {
                if (!value) return true;

                if (!Object.values(TRANSPORT_MODES).includes(value)) {
                    return { warning: `Unknown transport mode: ${value}` };
                }

                return true;
            }
        });

        // Booking status validation
        this.addRule('booking', {
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.NOT_BOOKED,
            sanitize: (value) => String(value).toUpperCase()
        });

        // Text field validation
        this.addRule('additionalDetails', {
            maxLength: 1000,
            sanitize: (value) => value?.trim()
        });

        this.addRule('accommodationDetails', {
            maxLength: 500,
            sanitize: (value) => value?.trim()
        });

        // Priority validation
        this.addRule('priority', {
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal'
        });

        // Status validation
        this.addRule('status', {
            enum: ['planned', 'confirmed', 'in-progress', 'completed', 'cancelled'],
            default: 'planned'
        });

        // Tags validation
        this.addRule('tags', {
            type: 'array',
            validate: (value) => {
                if (!Array.isArray(value)) return true;

                if (value.length > 20) {
                    return 'Too many tags (maximum 20)';
                }

                const invalidTags = value.filter(tag =>
                    typeof tag !== 'string' || tag.length > 50
                );

                if (invalidTags.length > 0) {
                    return 'Invalid tag format (must be strings under 50 characters)';
                }

                return true;
            },
            sanitize: (value) => {
                if (!Array.isArray(value)) return [];
                return [...new Set(value.map(tag => String(tag).trim()).filter(Boolean))];
            }
        });
    }

    /**
     * Add validation rule for a field
     * @param {string} field - Field name
     * @param {object} rule - Validation rule configuration
     */
    addRule(field, rule) {
        this.rules.set(field, {
            required: false,
            allowEmpty: true,
            ...rule
        });
    }

    /**
     * Remove validation rule
     * @param {string} field - Field name
     */
    removeRule(field) {
        this.rules.delete(field);
    }

    /**
     * Add custom validator function
     * @param {string} name - Validator name
     * @param {Function} validator - Validator function
     */
    addCustomValidator(name, validator) {
        if (typeof validator !== 'function') {
            throw new Error('Validator must be a function');
        }

        this.customValidators.set(name, validator);
    }

    /**
     * Validate single field
     * @param {string} field - Field name
     * @param {any} value - Field value
     * @param {object} allData - All data for cross-field validation
     * @returns {object} Validation result
     */
    validateField(field, value, allData = {}) {
        const rule = this.rules.get(field);
        if (!rule) return { isValid: true, errors: [], warnings: [] };

        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitizedValue: value
        };

        try {
            // Sanitize value first
            if (rule.sanitize && typeof rule.sanitize === 'function') {
                result.sanitizedValue = rule.sanitize(value);
                value = result.sanitizedValue;
            }

            // Apply default if empty and has default
            if ((value === null || value === undefined || value === '') && rule.default !== undefined) {
                result.sanitizedValue = rule.default;
                value = rule.default;
            }

            // Required field validation
            if (rule.required && (value === null || value === undefined || value === '')) {
                result.errors.push(`${field} is required`);
                result.isValid = false;
                return result;
            }

            // Skip further validation if empty and allowed
            if (rule.allowEmpty && (value === null || value === undefined || value === '')) {
                return result;
            }

            // Type validation
            if (rule.type && value !== null && value !== undefined && value !== '') {
                const typeError = this.validateType(value, rule.type, field);
                if (typeError) {
                    result.errors.push(typeError);
                    result.isValid = false;
                }
            }

            // String length validation
            if (typeof value === 'string') {
                if (rule.minLength !== undefined && value.length < rule.minLength) {
                    result.errors.push(`${field} must be at least ${rule.minLength} characters`);
                    result.isValid = false;
                }

                if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                    result.errors.push(`${field} cannot exceed ${rule.maxLength} characters`);
                    result.isValid = false;
                }
            }

            // Number range validation
            if (typeof value === 'number') {
                if (rule.min !== undefined && value < rule.min) {
                    result.errors.push(`${field} cannot be less than ${rule.min}`);
                    result.isValid = false;
                }

                if (rule.max !== undefined && value > rule.max) {
                    result.errors.push(`${field} cannot exceed ${rule.max}`);
                    result.isValid = false;
                }
            }

            // Pattern validation
            if (rule.pattern && typeof value === 'string' && value) {
                if (!rule.pattern.test(value)) {
                    result.errors.push(`${field} format is invalid`);
                    result.isValid = false;
                }
            }

            // Enum validation
            if (rule.enum && value !== null && value !== undefined && value !== '') {
                if (!rule.enum.includes(value)) {
                    result.errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
                    result.isValid = false;
                }
            }

            // Custom validation function
            if (rule.validate && typeof rule.validate === 'function') {
                const customResult = rule.validate(value, allData);

                if (customResult !== true) {
                    if (typeof customResult === 'string') {
                        result.errors.push(customResult);
                        result.isValid = false;
                    } else if (customResult && typeof customResult === 'object') {
                        if (customResult.error) {
                            result.errors.push(customResult.error);
                            result.isValid = false;
                        }
                        if (customResult.warning) {
                            result.warnings.push(customResult.warning);
                        }
                    }
                }
            }

        } catch (error) {
            console.error(`Validation error for field ${field}:`, error);
            result.errors.push(`Validation error: ${error.message}`);
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate entire object
     * @param {object} data - Data to validate
     * @param {Array} fields - Fields to validate (optional, validates all rules if not provided)
     * @returns {object} Validation result
     */
    validate(data, fields = null) {
        const fieldsToValidate = fields || Array.from(this.rules.keys());

        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            fieldResults: {},
            sanitizedData: { ...data }
        };

        // Validate each field
        fieldsToValidate.forEach(field => {
            const fieldResult = this.validateField(field, data[field], data);

            result.fieldResults[field] = fieldResult;
            result.sanitizedData[field] = fieldResult.sanitizedValue;

            if (!fieldResult.isValid) {
                result.isValid = false;
                result.errors.push(...fieldResult.errors);
            }

            result.warnings.push(...fieldResult.warnings);
        });

        // Cross-field validation
        const crossValidationResult = this.validateCrossFields(result.sanitizedData);
        if (!crossValidationResult.isValid) {
            result.isValid = false;
            result.errors.push(...crossValidationResult.errors);
        }
        result.warnings.push(...crossValidationResult.warnings);

        return result;
    }

    /**
     * Validate data type
     * @param {any} value - Value to validate
     * @param {string} type - Expected type
     * @param {string} field - Field name for error messages
     * @returns {string|null} Error message or null if valid
     */
    validateType(value, type, field) {
        switch (type) {
            case 'string':
                if (typeof value !== 'string') {
                    return `${field} must be a string`;
                }
                break;

            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    return `${field} must be a valid number`;
                }
                break;

            case 'integer':
                const int = parseInt(value, 10);
                if (isNaN(int) || int !== Number(value)) {
                    return `${field} must be an integer`;
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                    return `${field} must be a boolean value`;
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    return `${field} must be an array`;
                }
                break;

            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return `${field} must be a valid date`;
                }
                break;

            case 'time':
                if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                    return `${field} must be in HH:MM format`;
                }
                break;

            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return `${field} must be a valid email address`;
                }
                break;

            case 'url':
                try {
                    new URL(value);
                } catch {
                    return `${field} must be a valid URL`;
                }
                break;

            default:
                console.warn(`Unknown validation type: ${type}`);
        }

        return null;
    }

    /**
     * Cross-field validation
     * @param {object} data - Sanitized data
     * @returns {object} Validation result
     */
    validateCrossFields(data) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Time range validation
        if (data.startTime && data.endTime) {
            const startMinutes = this.timeToMinutes(data.startTime);
            const endMinutes = this.timeToMinutes(data.endTime);

            if (startMinutes >= endMinutes) {
                result.warnings.push('End time should be after start time');
            }

            // Check for unreasonably long activities
            const durationHours = (endMinutes - startMinutes) / 60;
            if (durationHours > 24) {
                result.warnings.push('Activity duration exceeds 24 hours');
            }
        }

        // Location validation
        if (data.startFrom && data.reachTo) {
            if (data.startFrom.toLowerCase().trim() === data.reachTo.toLowerCase().trim()) {
                result.warnings.push('Start and destination locations are the same');
            }
        }

        // Cost vs Transport validation
        if (data.cost > 0 && !data.transportMode && !data.accommodationDetails) {
            result.warnings.push('Cost specified but no transport or accommodation details provided');
        }

        // High cost validation
        if (data.cost > 5000) {
            result.warnings.push('High cost activity - please verify amount');
        }

        // Booking vs cost validation
        if (data.booking === 'TRUE' && data.cost === 0) {
            result.warnings.push('Activity is marked as booked but has no cost');
        }

        // Date vs current date validation
        if (data.date) {
            const activityDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const daysDiff = Math.ceil((activityDate - today) / (1000 * 60 * 60 * 24));

            if (daysDiff < -365) {
                result.warnings.push('Activity is more than a year in the past');
            } else if (daysDiff > 365) {
                result.warnings.push('Activity is more than a year in the future');
            }
        }

        return result;
    }

    /**
     * Convert time string to minutes
     * @param {string} timeString - Time in HH:MM format
     * @returns {number} Minutes since midnight
     */
    timeToMinutes(timeString) {
        if (!timeString || typeof timeString !== 'string') return 0;

        const [hours, minutes] = timeString.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    /**
     * Validate form data from FormData object
     * @param {FormData} formData - Form data
     * @returns {object} Validation result with converted data
     */
    validateFormData(formData) {
        const data = {};

        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, etc.)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        // Convert string values to appropriate types
        Object.keys(data).forEach(key => {
            const rule = this.rules.get(key);
            if (rule && rule.type) {
                data[key] = this.convertType(data[key], rule.type);
            }
        });

        return this.validate(data);
    }

    /**
     * Convert value to specified type
     * @param {any} value - Value to convert
     * @param {string} type - Target type
     * @returns {any} Converted value
     */
    convertType(value, type) {
        if (value === null || value === undefined || value === '') {
            return value;
        }

        try {
            switch (type) {
                case 'number':
                    return parseFloat(value);

                case 'integer':
                    return parseInt(value, 10);

                case 'boolean':
                    if (typeof value === 'boolean') return value;
                    return value === 'true' || value === '1' || value === 'on';

                case 'array':
                    if (Array.isArray(value)) return value;
                    return String(value).split(',').map(v => v.trim()).filter(Boolean);

                case 'date':
                    return new Date(value).toISOString().split('T')[0];

                default:
                    return String(value);
            }
        } catch (error) {
            console.warn(`Type conversion error for ${type}:`, error);
            return value;
        }
    }

    /**
     * Create validation schema from object
     * @param {object} schema - Validation schema
     */
    loadSchema(schema) {
        Object.entries(schema).forEach(([field, rule]) => {
            this.addRule(field, rule);
        });
    }

    /**
     * Get validation rule for field
     * @param {string} field - Field name
     * @returns {object|null} Validation rule
     */
    getRule(field) {
        return this.rules.get(field) || null;
    }

    /**
     * Get all validation rules
     * @returns {object} All rules
     */
    getAllRules() {
        return Object.fromEntries(this.rules);
    }

    /**
     * Quick validation methods for common cases
     */

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} Is valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate date string
     * @param {string} dateString - Date to validate
     * @returns {boolean} Is valid
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    /**
     * Validate time string
     * @param {string} timeString - Time to validate
     * @returns {boolean} Is valid
     */
    isValidTime(timeString) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeString);
    }

    /**
     * Sanitize HTML content
     * @param {string} html - HTML to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html) {
        if (!html) return '';

        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Validate and sanitize user input
     * @param {string} input - User input
     * @param {object} options - Validation options
     * @returns {object} Validation result
     */
    sanitizeInput(input, options = {}) {
        const {
            maxLength = 1000,
            allowHtml = false,
            trimWhitespace = true,
            removeExtraSpaces = true
        } = options;

        let sanitized = input;

        if (typeof sanitized !== 'string') {
            sanitized = String(sanitized || '');
        }

        // Trim whitespace
        if (trimWhitespace) {
            sanitized = sanitized.trim();
        }

        // Remove extra spaces
        if (removeExtraSpaces) {
            sanitized = sanitized.replace(/\s+/g, ' ');
        }

        // Sanitize HTML
        if (!allowHtml) {
            sanitized = this.sanitizeHtml(sanitized);
        }

        // Truncate if too long
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength).trim();
        }

        return {
            value: sanitized,
            isValid: sanitized.length > 0,
            wasModified: sanitized !== input
        };
    }

    /**
     * Batch validate multiple objects
     * @param {Array} objects - Objects to validate
     * @param {Array} fields - Fields to validate
     * @returns {object} Batch validation result
     */
    validateBatch(objects, fields = null) {
        const results = {
            isValid: true,
            totalCount: objects.length,
            validCount: 0,
            invalidCount: 0,
            results: [],
            errors: [],
            warnings: []
        };

        objects.forEach((obj, index) => {
            const result = this.validate(obj, fields);
            result.index = index;

            results.results.push(result);

            if (result.isValid) {
                results.validCount++;
            } else {
                results.invalidCount++;
                results.isValid = false;
                results.errors.push({
                    index,
                    errors: result.errors
                });
            }

            if (result.warnings.length > 0) {
                results.warnings.push({
                    index,
                    warnings: result.warnings
                });
            }
        });

        return results;
    }

    /**
     * Create validation summary
     * @param {object} validationResult - Validation result
     * @returns {string} Human-readable summary
     */
    createSummary(validationResult) {
        const { isValid, errors, warnings } = validationResult;

        if (isValid && warnings.length === 0) {
            return 'All data is valid ✅';
        }

        const parts = [];

        if (!isValid) {
            parts.push(`❌ ${errors.length} error${errors.length !== 1 ? 's' : ''} found`);
        } else {
            parts.push('✅ Data is valid');
        }

        if (warnings.length > 0) {
            parts.push(`⚠️ ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`);
        }

        return parts.join(' • ');
    }

    /**
     * Reset to default rules
     */
    reset() {
        this.rules.clear();
        this.customValidators.clear();
        this.initializeDefaultRules();
    }

    /**
     * Dispose of validation service
     */
    dispose() {
        this.rules.clear();
        this.customValidators.clear();
    }
}

// Create global instance
export const validationService = new ValidationService();