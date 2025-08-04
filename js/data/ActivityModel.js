/**
 * Travel Itinerary Manager - Activity Data Model
 * Represents individual travel activities with validation and business logic
 */

import { Utils } from '../core/utils.js';
import {
    BOOKING_STATUS,
    TRANSPORT_MODES,
    ERROR_MESSAGES,
    FORM_VALIDATION_RULES
} from '../core/constants.js';

export class ActivityModel {
    constructor(data = {}) {
        // Core properties
        this.id = data.id || Utils.generateId();
        this.activity = data.activity || '';
        this.date = data.date || '';
        this.day = data.day || '';
        this.startTime = data.startTime || '';
        this.endTime = data.endTime || '';

        // Location properties
        this.startFrom = data.startFrom || '';
        this.reachTo = data.reachTo || '';
        this.transportMode = data.transportMode || '';

        // Booking and cost properties
        this.booking = data.booking || BOOKING_STATUS.NOT_BOOKED;
        this.cost = this.parseCost(data.cost);

        // Additional information
        this.additionalDetails = data.additionalDetails || '';
        this.accommodationDetails = data.accommodationDetails || '';

        // Metadata
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.version = data.version || 1;

        // Tags and categories
        this.tags = data.tags || [];
        this.category = data.category || this.determineCategory();
        this.priority = data.priority || 'normal';
        this.status = data.status || 'planned';

        // Location coordinates (for future map integration)
        this.startCoordinates = data.startCoordinates || null;
        this.endCoordinates = data.endCoordinates || null;

        // Attachments and links
        this.attachments = data.attachments || [];
        this.links = data.links || [];

        // Reminder and notification settings
        this.reminders = data.reminders || [];
        this.notifications = data.notifications || [];
    }

    /**
     * Parse and validate cost value
     * @param {any} cost - Cost value to parse
     * @returns {number} Parsed cost
     */
    parseCost(cost) {
        if (cost === null || cost === undefined || cost === '') return 0;

        const numericCost = typeof cost === 'string' ? parseFloat(cost) : cost;
        return isNaN(numericCost) ? 0 : Math.max(0, numericCost);
    }

    /**
     * Update activity properties
     * @param {object} data - Data to update
     * @returns {ActivityModel} Updated activity instance
     */
    update(data) {
        const updatableFields = [
            'activity', 'date', 'day', 'startTime', 'endTime',
            'startFrom', 'reachTo', 'transportMode', 'booking',
            'cost', 'additionalDetails', 'accommodationDetails',
            'tags', 'category', 'priority', 'status',
            'startCoordinates', 'endCoordinates',
            'attachments', 'links', 'reminders', 'notifications'
        ];

        updatableFields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                if (field === 'cost') {
                    this[field] = this.parseCost(data[field]);
                } else if (field === 'tags' && Array.isArray(data[field])) {
                    this[field] = [...new Set(data[field])]; // Remove duplicates
                } else {
                    this[field] = data[field];
                }
            }
        });

        this.updatedAt = new Date().toISOString();
        this.version += 1;

        // Update category if not explicitly set
        if (!data.hasOwnProperty('category')) {
            this.category = this.determineCategory();
        }

        return this;
    }

    /**
     * Validate activity data
     * @returns {object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];
        const warnings = [];

        // Required field validation
        if (!this.activity || !this.activity.trim()) {
            errors.push(ERROR_MESSAGES.ACTIVITY_NAME_REQUIRED);
        }

        if (!this.date) {
            errors.push(ERROR_MESSAGES.DATE_REQUIRED);
        } else {
            const date = new Date(this.date);
            if (isNaN(date.getTime())) {
                errors.push(ERROR_MESSAGES.INVALID_DATE);
            } else {
                // Check if date is too far in the past
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                if (date < oneYearAgo) {
                    warnings.push('Activity date is more than a year in the past');
                }
            }
        }

        // Cost validation
        if (this.cost < 0) {
            errors.push(ERROR_MESSAGES.NEGATIVE_COST);
        }

        if (this.cost > FORM_VALIDATION_RULES.cost.max) {
            errors.push(`Cost cannot exceed ${FORM_VALIDATION_RULES.cost.max.toLocaleString()}`);
        }

        // Activity name length validation
        if (this.activity && this.activity.length > FORM_VALIDATION_RULES.activity.maxLength) {
            errors.push(`Activity name cannot exceed ${FORM_VALIDATION_RULES.activity.maxLength} characters`);
        }

        // Time validation
        if (this.startTime && this.endTime) {
            const startMinutes = this.timeToMinutes(this.startTime);
            const endMinutes = this.timeToMinutes(this.endTime);

            if (startMinutes >= endMinutes) {
                warnings.push('End time should be after start time');
            }
        }

        // Transport mode validation
        if (this.transportMode && !Object.values(TRANSPORT_MODES).includes(this.transportMode)) {
            warnings.push(`Unknown transport mode: ${this.transportMode}`);
        }

        // Booking status validation
        if (this.booking && !Object.values(BOOKING_STATUS).includes(this.booking)) {
            errors.push('Invalid booking status');
        }

        // Location validation
        if (this.startFrom && this.reachTo && this.startFrom.toLowerCase() === this.reachTo.toLowerCase()) {
            warnings.push('Start and destination locations are the same');
        }

        // Priority validation
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (this.priority && !validPriorities.includes(this.priority)) {
            warnings.push('Invalid priority level');
        }

        // Status validation
        const validStatuses = ['planned', 'confirmed', 'in-progress', 'completed', 'cancelled'];
        if (this.status && !validStatuses.includes(this.status)) {
            warnings.push('Invalid status');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            hasWarnings: warnings.length > 0
        };
    }

    /**
     * Convert time string to minutes for comparison
     * @param {string} timeString - Time in HH:mm format
     * @returns {number} Minutes since midnight
     */
    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Get activity duration in minutes
     * @returns {number|null} Duration in minutes or null if times not set
     */
    getDuration() {
        if (!this.startTime || !this.endTime) return null;

        const startMinutes = this.timeToMinutes(this.startTime);
        const endMinutes = this.timeToMinutes(this.endTime);

        return endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    }

    /**
     * Get formatted duration string
     * @returns {string} Formatted duration
     */
    getFormattedDuration() {
        const duration = this.getDuration();
        if (duration === null) return 'Duration not specified';

        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;

        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    /**
     * Determine activity category based on content
     * @returns {string} Activity category
     */
    determineCategory() {
        const activityLower = this.activity.toLowerCase();
        const detailsLower = this.additionalDetails.toLowerCase();
        const combined = `${activityLower} ${detailsLower}`;

        // Transportation activities
        if (this.transportMode ||
            combined.includes('flight') ||
            combined.includes('train') ||
            combined.includes('drive') ||
            activityLower.includes('travel') ||
            activityLower.includes('journey')) {
            return 'transport';
        }

        // Accommodation activities
        if (this.accommodationDetails ||
            combined.includes('hotel') ||
            combined.includes('check-in') ||
            combined.includes('accommodation') ||
            activityLower.includes('stay') ||
            activityLower.includes('lodge')) {
            return 'accommodation';
        }

        // Sightseeing and tours
        if (combined.includes('sightseeing') ||
            combined.includes('tour') ||
            combined.includes('visit') ||
            combined.includes('museum') ||
            combined.includes('attraction') ||
            activityLower.includes('explore')) {
            return 'sightseeing';
        }

        // Food and dining
        if (combined.includes('restaurant') ||
            combined.includes('dinner') ||
            combined.includes('lunch') ||
            combined.includes('breakfast') ||
            combined.includes('dining') ||
            activityLower.includes('eat')) {
            return 'dining';
        }

        // Entertainment and activities
        if (combined.includes('show') ||
            combined.includes('concert') ||
            combined.includes('theater') ||
            combined.includes('entertainment') ||
            combined.includes('activity') ||
            activityLower.includes('fun')) {
            return 'entertainment';
        }

        // Business and meetings
        if (combined.includes('meeting') ||
            combined.includes('conference') ||
            combined.includes('business') ||
            combined.includes('work') ||
            activityLower.includes('appointment')) {
            return 'business';
        }

        // Shopping
        if (combined.includes('shopping') ||
            combined.includes('market') ||
            combined.includes('store') ||
            activityLower.includes('buy') ||
            activityLower.includes('purchase')) {
            return 'shopping';
        }

        return 'other';
    }

    /**
     * Check if activity is booked
     * @returns {boolean} Is booked
     */
    isBooked() {
        return this.booking === BOOKING_STATUS.BOOKED;
    }

    /**
     * Check if activity is high cost
     * @param {number} threshold - Cost threshold (default: 1000)
     * @returns {boolean} Is high cost
     */
    isHighCost(threshold = 1000) {
        return this.cost > threshold;
    }

    /**
     * Check if activity is today
     * @returns {boolean} Is today
     */
    isToday() {
        if (!this.date) return false;
        const today = new Date().toISOString().split('T')[0];
        return this.date === today;
    }

    /**
     * Check if activity is upcoming
     * @param {number} daysAhead - Days ahead to consider (default: 7)
     * @returns {boolean} Is upcoming
     */
    isUpcoming(daysAhead = 7) {
        if (!this.date) return false;

        const activityDate = new Date(this.date);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return activityDate >= new Date() && activityDate <= futureDate;
    }

    /**
     * Check if activity is past
     * @returns {boolean} Is past
     */
    isPast() {
        if (!this.date) return false;
        const today = new Date().toISOString().split('T')[0];
        return this.date < today;
    }

    /**
     * Get relative time description
     * @returns {string} Relative time
     */
    getRelativeTime() {
        return Utils.getRelativeTime(this.date);
    }

    /**
     * Add tag to activity
     * @param {string} tag - Tag to add
     * @returns {ActivityModel} Activity instance
     */
    addTag(tag) {
        if (tag && !this.tags.includes(tag)) {
            this.tags.push(tag);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Remove tag from activity
     * @param {string} tag - Tag to remove
     * @returns {ActivityModel} Activity instance
     */
    removeTag(tag) {
        const index = this.tags.indexOf(tag);
        if (index > -1) {
            this.tags.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Check if activity has tag
     * @param {string} tag - Tag to check
     * @returns {boolean} Has tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Add attachment to activity
     * @param {object} attachment - Attachment object
     * @returns {ActivityModel} Activity instance
     */
    addAttachment(attachment) {
        if (attachment && attachment.name && attachment.url) {
            this.attachments.push({
                id: Utils.generateId(),
                ...attachment,
                addedAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Remove attachment from activity
     * @param {string} attachmentId - Attachment ID to remove
     * @returns {ActivityModel} Activity instance
     */
    removeAttachment(attachmentId) {
        const index = this.attachments.findIndex(a => a.id === attachmentId);
        if (index > -1) {
            this.attachments.splice(index, 1);
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Add reminder to activity
     * @param {object} reminder - Reminder object
     * @returns {ActivityModel} Activity instance
     */
    addReminder(reminder) {
        if (reminder && reminder.time && reminder.type) {
            this.reminders.push({
                id: Utils.generateId(),
                ...reminder,
                createdAt: new Date().toISOString()
            });
            this.updatedAt = new Date().toISOString();
        }
        return this;
    }

    /**
     * Get transport icon
     * @returns {string} Transport icon emoji
     */
    getTransportIcon() {
        return Utils.getTransportIcon(this.transportMode);
    }

    /**
     * Get priority icon
     * @returns {string} Priority icon
     */
    getPriorityIcon() {
        const icons = {
            low: '🔵',
            normal: '⚪',
            high: '🟡',
            urgent: '🔴'
        };
        return icons[this.priority] || icons.normal;
    }

    /**
     * Get status icon
     * @returns {string} Status icon
     */
    getStatusIcon() {
        const icons = {
            planned: '📋',
            confirmed: '✅',
            'in-progress': '⏳',
            completed: '✔️',
            cancelled: '❌'
        };
        return icons[this.status] || icons.planned;
    }

    /**
     * Clone activity with new ID
     * @returns {ActivityModel} Cloned activity
     */
    clone() {
        const data = this.toJSON();
        data.id = Utils.generateId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        data.version = 1;

        return new ActivityModel(data);
    }

    /**
     * Convert to plain object for serialization
     * @returns {object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            activity: this.activity,
            date: this.date,
            day: this.day,
            startTime: this.startTime,
            endTime: this.endTime,
            startFrom: this.startFrom,
            reachTo: this.reachTo,
            transportMode: this.transportMode,
            booking: this.booking,
            cost: this.cost,
            additionalDetails: this.additionalDetails,
            accommodationDetails: this.accommodationDetails,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            version: this.version,
            tags: [...this.tags],
            category: this.category,
            priority: this.priority,
            status: this.status,
            startCoordinates: this.startCoordinates,
            endCoordinates: this.endCoordinates,
            attachments: [...this.attachments],
            links: [...this.links],
            reminders: [...this.reminders],
            notifications: [...this.notifications]
        };
    }

    /**
     * Create activity from CSV row
     * @param {object} csvRow - CSV row data
     * @returns {ActivityModel} Activity instance
     */
    static fromCSV(csvRow) {
        return new ActivityModel({
            activity: csvRow.Activity || csvRow.activity || '',
            date: csvRow.Date || csvRow.date || '',
            day: csvRow.Day || csvRow.day || '',
            startTime: csvRow['Start Time'] || csvRow.startTime || '',
            endTime: csvRow['End Time'] || csvRow.endTime || '',
            startFrom: csvRow.From || csvRow.startFrom || '',
            reachTo: csvRow.To || csvRow.reachTo || '',
            transportMode: csvRow.Transport || csvRow.transportMode || '',
            booking: (csvRow.Booking || csvRow.booking || 'FALSE').toUpperCase(),
            cost: parseFloat(csvRow.Cost || csvRow.cost || 0),
            additionalDetails: csvRow.Details || csvRow.additionalDetails || '',
            accommodationDetails: csvRow.Accommodation || csvRow.accommodationDetails || ''
        });
    }

    /**
     * Convert to CSV format
     * @returns {object} CSV row object
     */
    toCSV() {
        return {
            Activity: this.activity,
            Date: this.date,
            Day: this.day,
            'Start Time': this.startTime,
            'End Time': this.endTime,
            From: this.startFrom,
            To: this.reachTo,
            Transport: this.transportMode,
            Booking: this.booking,
            Cost: this.cost,
            Details: this.additionalDetails,
            Accommodation: this.accommodationDetails,
            Category: this.category,
            Priority: this.priority,
            Status: this.status,
            Tags: this.tags.join('; ')
        };
    }

    /**
     * Get activity summary for display
     * @returns {object} Activity summary
     */
    getSummary() {
        return {
            id: this.id,
            title: this.activity,
            date: this.date,
            time: this.startTime && this.endTime
                ? `${Utils.formatTime(this.startTime)} - ${Utils.formatTime(this.endTime)}`
                : this.startTime ? Utils.formatTime(this.startTime) : 'Time not set',
            location: this.startFrom && this.reachTo
                ? `${this.startFrom} → ${this.reachTo}`
                : this.startFrom || this.reachTo || 'Location not set',
            cost: Utils.formatCurrency(this.cost),
            transport: this.transportMode,
            transportIcon: this.getTransportIcon(),
            booked: this.isBooked(),
            category: this.category,
            priority: this.priority,
            priorityIcon: this.getPriorityIcon(),
            status: this.status,
            statusIcon: this.getStatusIcon(),
            duration: this.getFormattedDuration(),
            relativeTime: this.getRelativeTime(),
            isToday: this.isToday(),
            isUpcoming: this.isUpcoming(),
            isPast: this.isPast(),
            isHighCost: this.isHighCost(),
            tags: [...this.tags]
        };
    }

    /**
     * Search within activity content
     * @param {string} searchTerm - Search term
     * @returns {boolean} Matches search term
     */
    matches(searchTerm) {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        const searchableFields = [
            this.activity,
            this.startFrom,
            this.reachTo,
            this.transportMode,
            this.additionalDetails,
            this.accommodationDetails,
            this.category,
            this.tags.join(' ')
        ];

        return searchableFields.some(field =>
            field && field.toLowerCase().includes(term)
        );
    }
}