/**
 * Travel Itinerary Manager - Timeline View
 * Displays activities in chronological timeline format
 */

import { Utils } from '../core/utils.js';

export class TimelineView {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * Render timeline view
     * @returns {string} Timeline HTML
     */
    render() {
        const activities = this.dataManager.filteredActivities;

        if (activities.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="timeline-content">
                ${this.renderTimelineHeader(activities)}
                ${this.renderTimeline(activities)}
            </div>
        `;
    }

    /**
     * Render empty state
     * @returns {string} Empty state HTML
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⏰</div>
                <h3>No activities in timeline</h3>
                <p>Your timeline will appear here once you add some activities.</p>
                <button class="btn btn-primary" onclick="app.openAddActivityModal()">
                    ➕ Add Activity
                </button>
            </div>
        `;
    }

    /**
     * Render timeline header with statistics
     * @param {Array} activities - Activities array
     * @returns {string} Header HTML
     */
    renderTimelineHeader(activities) {
        const stats = this.calculateTimelineStats(activities);

        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Travel Timeline</h2>
                    <div class="timeline-stats">
                        <span class="stat-item">📅 ${stats.totalDays} days</span>
                        <span class="stat-item">🎯 ${activities.length} activities</span>
                        <span class="stat-item">💰 ${Utils.formatCurrency(stats.totalCost)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render timeline
     * @param {Array} activities - Activities to display
     * @returns {string} Timeline HTML
     */
    renderTimeline(activities) {
        const groupedByDate = this.groupActivitiesByDate(activities);
        const sortedDates = Object.keys(groupedByDate).sort();

        return `
            <div class="timeline">
                ${sortedDates.map((date, dateIndex) => {
            const dayActivities = groupedByDate[date];
            const isToday = this.isToday(date);
            const isPast = this.isPast(date);
            const isFuture = this.isFuture(date);

            return `
                        <div class="timeline-date-group ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}">
                            ${this.renderDateMarker(date, dayActivities, isToday, isPast)}
                            <div class="timeline-activities">
                                ${dayActivities.map((activity, activityIndex) =>
                this.renderTimelineItem(activity, activityIndex, dayActivities.length)
            ).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    /**
     * Render date marker
     * @param {string} date - Date string
     * @param {Array} activities - Activities for this date
     * @param {boolean} isToday - Is today
     * @param {boolean} isPast - Is in the past
     * @returns {string} Date marker HTML
     */
    renderDateMarker(date, activities, isToday, isPast) {
        const dayStats = this.calculateDayStats(activities);
        const relativeTime = this.getRelativeTime(date);

        return `
            <div class="timeline-date-marker">
                <div class="date-marker-line"></div>
                <div class="date-marker-content">
                    <div class="date-marker-main">
                        <div class="date-text">
                            <div class="date-primary">${Utils.formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                            <div class="date-secondary">${relativeTime}</div>
                        </div>
                        <div class="date-badge ${isToday ? 'today' : isPast ? 'past' : 'future'}">
                            ${isToday ? '📍 Today' : isPast ? '✅ Past' : '📅 Upcoming'}
                        </div>
                    </div>
                    <div class="date-stats">
                        <span class="stat">🎯 ${activities.length}</span>
                        <span class="stat">💰 ${Utils.formatCurrency(dayStats.totalCost)}</span>
                        <span class="stat">✅ ${dayStats.bookedCount}/${activities.length}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render timeline item
     * @param {ActivityModel} activity - Activity
     * @param {number} index - Activity index in day
     * @param {number} total - Total activities in day
     * @returns {string} Timeline item HTML
     */
    renderTimelineItem(activity, index, total) {
        const isFirst = index === 0;
        const isLast = index === total - 1;

        return `
            <div class="timeline-item ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}">
                <div class="timeline-marker">
                    <div class="marker-dot ${activity.isBooked() ? 'booked' : 'unbooked'}">
                        ${this.getActivityIcon(activity)}
                    </div>
                    ${!isLast ? '<div class="marker-line"></div>' : ''}
                </div>
                
                <div class="timeline-card">
                    <div class="card-header">
                        <div class="card-main">
                            <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                            <div class="activity-meta">
                                ${activity.startTime ? `
                                    <span class="time">${Utils.formatTime(activity.startTime)}</span>
                                    ${activity.endTime ? `<span class="duration">→ ${Utils.formatTime(activity.endTime)}</span>` : ''}
                                ` : '<span class="time">No time set</span>'}
                                ${activity.getDuration() ? `<span class="duration-total">(${activity.getFormattedDuration()})</span>` : ''}
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-secondary" onclick="app.editActivity('${activity.id}')" title="Edit activity">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteActivity('${activity.id}')" title="Delete activity">
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    ${this.renderTimelineCardContent(activity)}
                </div>
            </div>
        `;
    }

    /**
     * Render timeline card content
     * @param {ActivityModel} activity - Activity
     * @returns {string} Card content HTML
     */
    renderTimelineCardContent(activity) {
        const sections = [];

        // Location section
        if (activity.startFrom || activity.reachTo) {
            sections.push(`
                <div class="card-section location-section">
                    <div class="section-icon">📍</div>
                    <div class="section-content">
                        ${activity.startFrom ? `<div class="location-from">From: ${Utils.escapeHtml(activity.startFrom)}</div>` : ''}
                        ${activity.reachTo ? `<div class="location-to">To: ${Utils.escapeHtml(activity.reachTo)}</div>` : ''}
                    </div>
                </div>
            `);
        }

        // Transport & Cost section
        const transportCostItems = [];
        if (activity.transportMode) {
            transportCostItems.push(`
                <div class="info-item">
                    <span class="info-icon">${Utils.getTransportIcon(activity.transportMode)}</span>
                    <span class="info-text">${activity.transportMode}</span>
                </div>
            `);
        }

        if (activity.cost > 0) {
            transportCostItems.push(`
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <span class="info-text cost-display">${Utils.formatCurrency(activity.cost)}</span>
                </div>
            `);
        }

        transportCostItems.push(`
            <div class="info-item">
                <span class="info-icon">${activity.isBooked() ? '✅' : '❌'}</span>
                <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                    ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                </span>
            </div>
        `);

        if (transportCostItems.length > 0) {
            sections.push(`
                <div class="card-section info-section">
                    <div class="info-grid">
                        ${transportCostItems.join('')}
                    </div>
                </div>
            `);
        }

        // Notes section
        if (activity.additionalDetails) {
            sections.push(`
                <div class="card-section notes-section">
                    <div class="section-icon">📝</div>
                    <div class="section-content">
                        <div class="notes-text">${Utils.escapeHtml(activity.additionalDetails)}</div>
                    </div>
                </div>
            `);
        }

        // Accommodation section
        if (activity.accommodationDetails) {
            sections.push(`
                <div class="card-section accommodation-section">
                    <div class="section-icon">🏨</div>
                    <div class="section-content">
                        <div class="accommodation-text">${Utils.escapeHtml(activity.accommodationDetails)}</div>
                    </div>
                </div>
            `);
        }

        return sections.length > 0 ? `
            <div class="card-content">
                ${sections.join('')}
            </div>
        ` : '';
    }

    /**
     * Get activity icon based on category or transport
     * @param {ActivityModel} activity - Activity
     * @returns {string} Activity icon
     */
    getActivityIcon(activity) {
        if (activity.transportMode) {
            return Utils.getTransportIcon(activity.transportMode);
        }

        const categoryIcons = {
            transport: '🚗',
            accommodation: '🏨',
            sightseeing: '👁️',
            dining: '🍽️',
            entertainment: '🎭',
            business: '💼',
            shopping: '🛍️',
            other: '📌'
        };

        return categoryIcons[activity.category] || categoryIcons.other;
    }

    /**
     * Group activities by date
     * @param {Array} activities - Activities array
     * @returns {object} Grouped activities
     */
    groupActivitiesByDate(activities) {
        return activities.reduce((groups, activity) => {
            const date = activity.date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(activity);
            return groups;
        }, {});
    }

    /**
     * Calculate timeline statistics
     * @param {Array} activities - Activities array
     * @returns {object} Timeline statistics
     */
    calculateTimelineStats(activities) {
        const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);

        // Calculate total days
        const dates = [...new Set(activities.map(a => a.date))].sort();
        const totalDays = dates.length;

        return {
            totalCost,
            totalDays
        };
    }

    /**
     * Calculate day statistics
     * @param {Array} activities - Day's activities
     * @returns {object} Day statistics
     */
    calculateDayStats(activities) {
        const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);
        const bookedCount = activities.filter(activity => activity.isBooked()).length;

        return {
            totalCost,
            bookedCount
        };
    }

    /**
     * Check if date is today
     * @param {string} date - Date string
     * @returns {boolean} Is today
     */
    isToday(date) {
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    }

    /**
     * Check if date is in the past
     * @param {string} date - Date string
     * @returns {boolean} Is past
     */
    isPast(date) {
        const today = new Date().toISOString().split('T')[0];
        return date < today;
    }

    /**
     * Check if date is in the future
     * @param {string} date - Date string
     * @returns {boolean} Is future
     */
    isFuture(date) {
        const today = new Date().toISOString().split('T')[0];
        return date > today;
    }

    /**
     * Get relative time description
     * @param {string} date - Date string
     * @returns {string} Relative time
     */
    getRelativeTime(date) {
        const targetDate = new Date(date);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 0) return `In ${diffDays} days`;
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

        return 'Unknown';
    }
}