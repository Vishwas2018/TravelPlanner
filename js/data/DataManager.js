/**
 * Travel Itinerary Manager - Optimized Data Manager
 */

import { ActivityModel } from './ActivityModel.js';
import { Utils } from '../core/utils.js';
import { EVENTS, DEFAULT_FILTERS, BOOKING_STATUS, ERROR_MESSAGES } from '../core/constants.js';

export class DataManager {
    constructor() {
        this.activities = [];
        this.filteredActivities = [];
        this.filters = { ...DEFAULT_FILTERS };
        this.listeners = new Map();
        this.isDirty = false;
        this.init();
    }

    async init() {
        await this.loadFromStorage();
        if (this.activities.length === 0) {
            this.loadSampleData();
        }
        this.applyFilters();
        this.emit(EVENTS.DATA_UPDATED);
    }

    loadSampleData() {
        const samples = [
            {
                activity: "Head to Melbourne Airport",
                date: "2025-09-19",
                startTime: "17:00",
                endTime: "17:40",
                startFrom: "Home",
                reachTo: "Melbourne Airport",
                transportMode: "Uber",
                booking: BOOKING_STATUS.NOT_BOOKED,
                cost: 100.00,
                additionalDetails: "Book Uber in advance"
            },
            {
                activity: "Fly to London",
                date: "2025-09-19",
                startTime: "19:35",
                endTime: "03:50",
                startFrom: "Melbourne",
                reachTo: "London Heathrow",
                transportMode: "Flight",
                booking: BOOKING_STATUS.BOOKED,
                cost: 7800.00,
                additionalDetails: "AIR INDIA flight AI-309"
            }
        ];

        this.activities = samples.map(data => new ActivityModel(data));
        this.sortActivities();
        this.markDirty();
    }

    async loadFromStorage() {
        try {
            const data = localStorage.getItem('travelApp_v2');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.activities) {
                    this.activities = parsed.activities.map(data => new ActivityModel(data));
                    this.filters = { ...DEFAULT_FILTERS, ...parsed.filters };
                    this.sortActivities();
                }
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
        }
    }

    async saveToStorage() {
        if (!this.isDirty) return true;

        try {
            const data = {
                activities: this.activities.map(a => a.toJSON()),
                filters: this.filters,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('travelApp_v2', JSON.stringify(data));
            this.isDirty = false;
            return true;
        } catch (error) {
            console.error('Failed to save to storage:', error);
            return false;
        }
    }

    markDirty() {
        this.isDirty = true;
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => this.saveToStorage(), 2000);
    }

    sortActivities() {
        this.activities.sort((a, b) => {
            const dateCompare = new Date(a.date) - new Date(b.date);
            if (dateCompare !== 0) return dateCompare;
            return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
        });
    }

    addActivity(activityData) {
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
        return activity;
    }

    updateActivity(id, updateData) {
        const activity = this.getActivityById(id);
        if (!activity) {
            throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
        }

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
        return activity;
    }

    deleteActivity(id) {
        const index = this.activities.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error(ERROR_MESSAGES.ACTIVITY_NOT_FOUND);
        }

        const deleted = this.activities.splice(index, 1)[0];
        this.applyFilters();
        this.markDirty();