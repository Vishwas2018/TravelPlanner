/**
 * Travel Itinerary Manager - Itinerary View
 * Displays activities grouped by date with detailed information
 */

import { Utils } from '../core/utils.js';

export class ItineraryView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.viewMode = 'grouped'; // 'grouped' or 'list'
    }

    /**
     * Render itinerary view
     * @returns {string} Itinerary HTML
     */
    render() {
        const activities = this.dataManager.filteredActivities;

        if (activities.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="itinerary-content">
                ${this.renderViewControls()}
                ${this.viewMode === 'grouped' ? this.renderGroupedView(activities) : this.renderListView(activities)}
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
                <div style="font-size: 4rem; margin-bottom: 1rem;">🗺️</div>
                <h3>No activities found</h3>
                <p>Add some activities to get started with your travel planning.</p>
                <button class="btn btn-primary" onclick="app.openAddActivityModal()">
                    ➕ Add First Activity
                </button>
            </div>
        `;
    }

    /**
     * Render view controls
     * @returns {string} View controls HTML
     */
    renderViewControls() {
        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Travel Itinerary</h2>
                    <div class="view-toggles">
                        <button class="view-toggle ${this.viewMode === 'grouped' ? 'active' : ''}" 
                                onclick="app.setItineraryViewMode('grouped')">
                            📅 By Date
                        </button>
                        <button class="view-toggle ${this.viewMode === 'list' ? 'active' : ''}" 
                                onclick="app.setItineraryViewMode('list')">
                            📋 List View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render grouped view (by date)
     * @param {Array} activities - Activities to display
     * @returns {string} Grouped view HTML
     */
    renderGroupedView(activities) {
        const groupedActivities = this.dataManager.getActivitiesByDate();
        const sortedDates = Object.keys(groupedActivities).sort();

        return `
            <div class="grouped-view">
                ${sortedDates.map(date => {
            const dayActivities = groupedActivities[date];
            const dayStats = this.calculateDayStats(dayActivities);

            return `
                        <div class="date-group">
                            <div class="date-header">
                                <div class="date-info">
                                    <div class="date-title">${Utils.formatDate(date)}</div>
                                    <div class="date-subtitle">${dayActivities.length} activities</div>
                                </div>
                                <div class="date-stats">
                                    <span class="stat-item">💰 ${Utils.formatCurrency(dayStats.totalCost)}</span>
                                    <span class="stat-item">✅ ${dayStats.bookedCount}/${dayActivities.length} booked</span>
                                    ${dayStats.duration ? `<span class="stat-item">⏱️ ${dayStats.duration}</span>` : ''}
                                </div>
                            </div>
                            <div class="activity-list">
                                ${dayActivities.map(activity => this.renderActivityCard(activity)).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    /**
     * Render list view
     * @param {Array} activities - Activities to display
     * @returns {string} List view HTML
     */
    renderListView(activities) {
        return `
            <div class="list-view">
                <div class="content-section">
                    <div class="activity-table">
                        <div class="table-header">
                            <div class="col-activity">Activity</div>
                            <div class="col-date">Date & Time</div>
                            <div class="col-location">Location</div>
                            <div class="col-transport">Transport</div>
                            <div class="col-cost">Cost</div>
                            <div class="col-status">Status</div>
                            <div class="col-actions">Actions</div>
                        </div>
                        <div class="table-body">
                            ${activities.map(activity => this.renderActivityRow(activity)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render activity card
     * @param {ActivityModel} activity - Activity to render
     * @returns {string} Activity card HTML
     */
    renderActivityCard(activity) {
        return `
            <div class="activity-card" data-activity-id="${activity.id}">
                <div class="activity-header">
                    <div class="activity-main">
                        <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                        <div class="activity-time">
                            ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time set'}
                            ${activity.endTime ? ` - ${Utils.formatTime(activity.endTime)}` : ''}
                            ${activity.getDuration() ? ` (${activity.getFormattedDuration()})` : ''}
                        </div>
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editActivity('${activity.id}')" title="Edit activity">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="app.duplicateActivity('${activity.id}')" title="Duplicate activity">
                            📋
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteActivity('${activity.id}')" title="Delete activity">
                            🗑️
                        </button>
                    </div>
                </div>
                
                ${this.renderActivityDetails(activity)}
                
                ${activity.additionalDetails ? `
                    <div class="activity-notes">
                        <div class="notes-label">📝 Notes:</div>
                        <div class="notes-content">${Utils.escapeHtml(activity.additionalDetails)}</div>
                    </div>
                ` : ''}
                
                ${activity.accommodationDetails ? `
                    <div class="activity-accommodation">
                        <div class="accommodation-label">🏨 Accommodation:</div>
                        <div class="accommodation-content">${Utils.escapeHtml(activity.accommodationDetails)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render activity details section
     * @param {ActivityModel} activity - Activity
     * @returns {string} Details HTML
     */
    renderActivityDetails(activity) {
        const details = [];

        // Location
        if (activity.startFrom || activity.reachTo) {
            const location = [];
            if (activity.startFrom) location.push(`From: ${activity.startFrom}`);
            if (activity.reachTo) location.push(`To: ${activity.reachTo}`);

            details.push({
                icon: '📍',
                label: 'Location',
                value: location.join(' → ')
            });
        }

        // Transport
        if (activity.transportMode) {
            details.push({
                icon: Utils.getTransportIcon(activity.transportMode),
                label: 'Transport',
                value: activity.transportMode
            });
        }

        // Cost
        if (activity.cost > 0) {
            details.push({
                icon: '💰',
                label: 'Cost',
                value: Utils.formatCurrency(activity.cost),
                className: 'cost-display'
            });
        }

        // Booking status
        details.push({
            icon: activity.isBooked() ? '✅' : '❌',
            label: 'Booking',
            value: `<span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                ${activity.isBooked() ? 'Booked' : 'Not Booked'}
            </span>`
        });

        // Category
        if (activity.category && activity.category !== 'other') {
            details.push({
                icon: this.getCategoryIcon(activity.category),
                label: 'Category',
                value: Utils.capitalize(activity.category)
            });
        }

        if (details.length === 0) return '';

        return `
            <div class="activity-details">
                ${details.map(detail => `
                    <div class="detail-item">
                        <span class="detail-icon">${detail.icon}</span>
                        <span class="detail-label">${detail.label}:</span>
                        <span class="detail-value ${detail.className || ''}">${detail.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render activity table row
     * @param {ActivityModel} activity - Activity
     * @returns {string} Table row HTML
     */
    renderActivityRow(activity) {
        return `
            <div class="table-row" data-activity-id="${activity.id}">
                <div class="col-activity">
                    <div class="activity-name">${Utils.escapeHtml(activity.activity)}</div>
                    ${activity.category !== 'other' ? `<div class="activity-category">${Utils.capitalize(activity.category)}</div>` : ''}
                </div>
                <div class="col-date">
                    <div class="date">${Utils.formatDate(activity.date, { month: 'short', day: 'numeric' })}</div>
                    <div class="time">${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time'}</div>
                </div>
                <div class="col-location">
                    ${activity.startFrom || activity.reachTo ? `
                        <div class="location">
                            ${activity.startFrom ? `From: ${Utils.escapeHtml(activity.startFrom)}` : ''}
                            ${activity.startFrom && activity.reachTo ? '<br>' : ''}
                            ${activity.reachTo ? `To: ${Utils.escapeHtml(activity.reachTo)}` : ''}
                        </div>
                    ` : '<span class="text-muted">No location</span>'}
                </div>
                <div class="col-transport">
                    ${activity.transportMode ? `
                        <span class="transport">
                            ${Utils.getTransportIcon(activity.transportMode)} ${activity.transportMode}
                        </span>
                    ` : '<span class="text-muted">No transport</span>'}
                </div>
                <div class="col-cost">
                    ${activity.cost > 0 ? `
                        <span class="cost-display">${Utils.formatCurrency(activity.cost)}</span>
                    ` : '<span class="text-muted">$0</span>'}
                </div>
                <div class="col-status">
                    <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                        ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                    </span>
                </div>
                <div class="col-actions">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="app.editActivity('${activity.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="app.duplicateActivity('${activity.id}')" title="Duplicate">
                            📋
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteActivity('${activity.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Calculate statistics for a day
     * @param {Array} activities - Day's activities
     * @returns {object} Day statistics
     */
    calculateDayStats(activities) {
        const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);
        const bookedCount = activities.filter(activity => activity.isBooked()).length;

        // Calculate total duration
        let totalMinutes = 0;
        activities.forEach(activity => {
            const duration = activity.getDuration();
            if (duration) totalMinutes += duration;
        });

        const duration = totalMinutes > 0 ? this.formatDuration(totalMinutes) : null;

        return {
            totalCost,
            bookedCount,
            duration
        };
    }

    /**
     * Format duration in minutes to readable string
     * @param {number} minutes - Duration in minutes
     * @returns {string} Formatted duration
     */
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    }

    /**
     * Get category icon
     * @param {string} category - Category name
     * @returns {string} Category icon
     */
    getCategoryIcon(category) {
        const icons = {
            transport: '🚗',
            accommodation: '🏨',
            sightseeing: '👁️',
            dining: '🍽️',
            entertainment: '🎭',
            business: '💼',
            shopping: '🛍️',
            other: '📌'
        };
        return icons[category] || icons.other;
    }

    /**
     * Set view mode
     * @param {string} mode - View mode ('grouped' or 'list')
     */
    setViewMode(mode) {
        this.viewMode = mode;
    }
}