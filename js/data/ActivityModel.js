/**
 * Travel Itinerary Manager - Optimized Activity Model
 */

import { Utils } from '../core/utils.js';
import { BOOKING_STATUS, ERROR_MESSAGES } from '../core/constants.js';

export class ActivityModel {
    constructor(data = {}) {
        this.id = data.id || Utils.generateId();
        this.activity = data.activity || '';
        this.date = data.date || '';
        this.startTime = data.startTime || '';
        this.endTime = data.endTime || '';
        this.startFrom = data.startFrom || '';
        this.reachTo = data.reachTo || '';
        this.transportMode = data.transportMode || '';
        this.booking = data.booking || BOOKING_STATUS.NOT_BOOKED;
        this.cost = this.parseCost(data.cost);
        this.additionalDetails = data.additionalDetails || '';
        this.accommodationDetails = data.accommodationDetails || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.category = data.category || this.determineCategory();
    }

    parseCost(cost) {
        const numericCost = typeof cost === 'string' ? parseFloat(cost) : cost;
        return isNaN(numericCost) ? 0 : Math.max(0, numericCost);
    }

    update(data) {
        const updatableFields = [
            'activity', 'date', 'startTime', 'endTime', 'startFrom', 'reachTo',
            'transportMode', 'booking', 'cost', 'additionalDetails', 'accommodationDetails'
        ];

        updatableFields.forEach(field => {
            if (data.hasOwnProperty(field)) {
                this[field] = field === 'cost' ? this.parseCost(data[field]) : data[field];
            }
        });

        this.updatedAt = new Date().toISOString();
        if (!data.hasOwnProperty('category')) {
            this.category = this.determineCategory();
        }
        return this;
    }

    validate() {
        const errors = [];

        if (!this.activity?.trim()) {
            errors.push(ERROR_MESSAGES.ACTIVITY_NAME_REQUIRED);
        }
        if (!this.date) {
            errors.push(ERROR_MESSAGES.DATE_REQUIRED);
        } else if (isNaN(new Date(this.date).getTime())) {
            errors.push(ERROR_MESSAGES.INVALID_DATE);
        }
        if (this.cost < 0) {
            errors.push('Cost cannot be negative');
        }

        return { isValid: errors.length === 0, errors };
    }

    getDuration() {
        if (!this.startTime || !this.endTime) return null;
        const startMinutes = this.timeToMinutes(this.startTime);
        const endMinutes = this.timeToMinutes(this.endTime);
        return endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    }

    getFormattedDuration() {
        const duration = this.getDuration();
        if (duration === null) return 'Duration not specified';
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    determineCategory() {
        const content = `${this.activity} ${this.additionalDetails}`.toLowerCase();

        if (this.transportMode || content.includes('flight') || content.includes('train')) {
            return 'transport';
        }
        if (this.accommodationDetails || content.includes('hotel') || content.includes('check-in')) {
            return 'accommodation';
        }
        if (content.includes('sightseeing') || content.includes('tour') || content.includes('visit')) {
            return 'sightseeing';
        }
        if (content.includes('restaurant') || content.includes('dinner') || content.includes('lunch')) {
            return 'dining';
        }
        return 'other';
    }

    isBooked() {
        return this.booking === BOOKING_STATUS.BOOKED;
    }

    isHighCost(threshold = 1000) {
        return this.cost > threshold;
    }

    isToday() {
        return this.date === new Date().toISOString().split('T')[0];
    }

    isUpcoming(daysAhead = 7) {
        if (!this.date) return false;
        const activityDate = new Date(this.date);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        return activityDate >= new Date() && activityDate <= futureDate;
    }

    isPast() {
        return this.date < new Date().toISOString().split('T')[0];
    }

    getRelativeTime() {
        return Utils.getRelativeTime(this.date);
    }

    clone() {
        const data = this.toJSON();
        data.id = Utils.generateId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        return new ActivityModel(data);
    }

    toJSON() {
        return {
            id: this.id,
            activity: this.activity,
            date: this.date,
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
            category: this.category
        };
    }

    toCSV() {
        return {
            Activity: this.activity,
            Date: this.date,
            'Start Time': this.startTime,
            'End Time': this.endTime,
            From: this.startFrom,
            To: this.reachTo,
            Transport: this.transportMode,
            Booking: this.booking,
            Cost: this.cost,
            Details: this.additionalDetails,
            Accommodation: this.accommodationDetails,
            Category: this.category
        };
    }

    static fromCSV(csvRow) {
        return new ActivityModel({
            activity: csvRow.Activity || csvRow.activity || '',
            date: csvRow.Date || csvRow.date || '',
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

    matches(searchTerm) {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return [
            this.activity,
            this.startFrom,
            this.reachTo,
            this.transportMode,
            this.additionalDetails,
            this.accommodationDetails,
            this.category
        ].some(field => field && field.toLowerCase().includes(term));
    }
}