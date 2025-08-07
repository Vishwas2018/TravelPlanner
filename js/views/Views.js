/**
 * Travel Itinerary Manager - Optimized Views
 */

import { Utils } from '../core/utils.js';

// Dashboard View
export class DashboardView {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    render() {
        const stats = this.dataManager.getStatistics();
        const costBreakdown = this.dataManager.getCostBreakdown();
        const upcomingActivities = this.dataManager.getUpcomingActivities(7);

        return `
            <div class="dashboard-content">
                <div class="dashboard-grid">
                    ${this.renderMetricCard('🎯', stats.totalActivities, 'Total Activities', `+${stats.upcomingActivities} upcoming`)}
                    ${this.renderMetricCard('💰', Utils.formatCurrency(stats.totalCost), 'Total Budget', Utils.formatCurrency(stats.averageCostPerActivity) + ' avg')}
                    ${this.renderMetricCard('📅', stats.totalDays, 'Trip Days', stats.totalCountries + ' countries')}
                    ${this.renderMetricCard('✅', stats.bookingsCount, 'Bookings Made', stats.bookingPercentage + '% complete')}
                </div>

                ${this.renderQuickActions()}
                ${this.renderUpcomingActivities(upcomingActivities)}
                ${this.renderCostBreakdown(costBreakdown)}
            </div>
        `;
    }

    renderMetricCard(icon, value, label, change) {
        return `
            <div class="metric-card">
                <div class="metric-icon">${icon}</div>
                <div class="metric-value">${value}</div>
                <div class="metric-label">${label}</div>
                <div class="metric-change">${change}</div>
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Quick Actions</h2>
                </div>
                <div style="padding: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <button class="quick-action-btn" onclick="app.navigateToView('itinerary')">
                        <div class="action-icon">📋</div>
                        <div class="action-text">View Itinerary</div>
                    </button>
                    <button class="quick-action-btn" onclick="app.openAddActivityModal()">
                        <div class="action-icon">➕</div>
                        <div class="action-text">Add Activity</div>
                    </button>
                    <button class="quick-action-btn" onclick="app.showExportModal()">
                        <div class="action-icon">📄</div>
                        <div class="action-text">Export Data</div>
                    </button>
                    <button class="quick-action-btn" onclick="app.navigateToView('timeline')">
                        <div class="action-icon">🕒</div>
                        <div class="action-text">View Timeline</div>
                    </button>
                </div>
            </div>
        `;
    }

    renderUpcomingActivities(activities) {
        if (activities.length === 0) {
            return `
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">Upcoming Activities</h2>
                    </div>
                    <div class="empty-state">
                        <p>No upcoming activities in the next 7 days</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Upcoming Activities (Next 7 Days)</h2>
                </div>
                <div style="padding: 1rem;">
                    ${activities.slice(0, 5).map(activity => `
                        <div class="upcoming-activity">
                            <div class="activity-date">
                                <div class="date-day">${new Date(activity.date).getDate()}</div>
                                <div class="date-month">${new Date(activity.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                            </div>
                            <div class="activity-info">
                                <div class="activity-name">${Utils.escapeHtml(activity.activity)}</div>
                                <div class="activity-details">
                                    ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time set'}
                                    ${activity.transportMode ? ` • ${activity.transportMode}` : ''}
                                    ${activity.cost > 0 ? ` • ${Utils.formatCurrency(activity.cost)}` : ''}
                                </div>
                            </div>
                            <div class="activity-status">
                                <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                                    ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderCostBreakdown(breakdown) {
        const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
        if (total === 0) {
            return `
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">Cost Breakdown</h2>
                    </div>
                    <div class="empty-state">
                        <p>No cost data available</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Cost Breakdown</h2>
                </div>
                <div style="padding: 2rem;">
                    <div class="cost-breakdown">
                        ${Object.entries(breakdown).map(([category, amount]) => {
            const percentage = (amount / total) * 100;
            return `
                                <div class="cost-category">
                                    <div class="category-header">
                                        <span class="category-name">${Utils.capitalize(category)}</span>
                                        <span class="category-amount">${Utils.formatCurrency(amount)}</span>
                                    </div>
                                    <div class="progress-container">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${percentage}%"></div>
                                        </div>
                                        <div class="progress-percentage">${percentage.toFixed(1)}%</div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Itinerary View
export class ItineraryView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.viewMode = 'grouped';
    }

    render() {
        const activities = this.dataManager.filteredActivities || [];
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

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🗺️</div>
                <h3>No activities found</h3>
                <p>Add some activities to get started with your travel planning.</p>
                <button class="btn btn-primary" onclick="window.app?.openAddActivityModal()">
                    ➕ Add First Activity
                </button>
            </div>
        `;
    }

    renderViewControls() {
        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Travel Itinerary</h2>
                    <div class="view-toggles">
                        <button class="view-toggle ${this.viewMode === 'grouped' ? 'active' : ''}" 
                                onclick="window.app?.setItineraryViewMode?.('grouped')">
                            📅 By Date
                        </button>
                        <button class="view-toggle ${this.viewMode === 'list' ? 'active' : ''}" 
                                onclick="window.app?.setItineraryViewMode?.('list')">
                            📋 List View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

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

    renderActivityCard(activity) {
        return `
            <div class="activity-card" data-activity-id="${activity.id}">
                <div class="activity-header">
                    <div class="activity-main">
                        <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                        <div class="activity-time">
                            ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time set'}
                            ${activity.endTime ? ` - ${Utils.formatTime(activity.endTime)}` : ''}
                        </div>
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.handleEditActivity('${activity.id}')" title="Edit">✏️</button>
                        <button class="btn btn-sm btn-secondary" onclick="window.handleDuplicateActivity('${activity.id}')" title="Duplicate">📋</button>
                        <button class="btn btn-sm btn-danger" onclick="window.handleDeleteActivity('${activity.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                ${this.renderActivityDetails(activity)}
                ${activity.additionalDetails ? `
                    <div class="activity-notes">
                        <div class="notes-label">📝 Notes:</div>
                        <div class="notes-content">${Utils.escapeHtml(activity.additionalDetails)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderActivityDetails(activity) {
        const details = [];

        if (activity.startFrom || activity.reachTo) {
            const location = [];
            if (activity.startFrom) location.push(`From: ${activity.startFrom}`);
            if (activity.reachTo) location.push(`To: ${activity.reachTo}`);
            details.push({ icon: '📍', label: 'Location', value: location.join(' → ') });
        }

        if (activity.transportMode) {
            details.push({ icon: Utils.getTransportIcon(activity.transportMode), label: 'Transport', value: activity.transportMode });
        }

        if (activity.cost > 0) {
            details.push({ icon: '💰', label: 'Cost', value: Utils.formatCurrency(activity.cost) });
        }

        details.push({
            icon: activity.isBooked() ? '✅' : '❌',
            label: 'Booking',
            value: `<span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                ${activity.isBooked() ? 'Booked' : 'Not Booked'}
            </span>`
        });

        return details.length > 0 ? `
            <div class="activity-details">
                ${details.map(detail => `
                    <div class="detail-item">
                        <span class="detail-icon">${detail.icon}</span>
                        <span class="detail-label">${detail.label}:</span>
                        <span class="detail-value">${detail.value}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';
    }

    renderActivityRow(activity) {
        return `
            <div class="table-row" data-activity-id="${activity.id}">
                <div class="col-activity">
                    <div class="activity-name">${Utils.escapeHtml(activity.activity)}</div>
                    <div class="activity-category">${Utils.capitalize(activity.category || 'other')}</div>
                </div>
                <div class="col-date">
                    <div class="date">${Utils.formatDate(activity.date, { month: 'short', day: 'numeric' })}</div>
                    <div class="time">${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time'}</div>
                </div>
                <div class="col-location">
                    ${activity.startFrom || activity.reachTo ?
            `${activity.startFrom || ''} ${activity.startFrom && activity.reachTo ? '→' : ''} ${activity.reachTo || ''}`.trim() :
            '<span class="text-muted">No location</span>'
        }
                </div>
                <div class="col-transport">
                    ${activity.transportMode ?
            `${Utils.getTransportIcon(activity.transportMode)} ${activity.transportMode}` :
            '<span class="text-muted">No transport</span>'
        }
                </div>
                <div class="col-cost">
                    ${activity.cost > 0 ? Utils.formatCurrency(activity.cost) : '<span class="text-muted">Free</span>'}
                </div>
                <div class="col-status">
                    <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                        ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                    </span>
                </div>
                <div class="col-actions">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="window.handleEditActivity('${activity.id}')" title="Edit">✏️</button>
                        <button class="btn btn-sm btn-secondary" onclick="window.handleDuplicateActivity('${activity.id}')" title="Duplicate">📋</button>
                        <button class="btn btn-sm btn-danger" onclick="window.handleDeleteActivity('${activity.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    calculateDayStats(activities) {
        return {
            totalCost: activities.reduce((sum, activity) => sum + activity.cost, 0),
            bookedCount: activities.filter(activity => activity.isBooked()).length
        };
    }

    setViewMode(mode) {
        if (mode === 'grouped' || mode === 'list') {
            this.viewMode = mode;
        }
    }
}

// Timeline View
export class TimelineView {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    render() {
        const activities = this.dataManager.filteredActivities;
        if (activities.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⏰</div>
                    <h3>No activities in timeline</h3>
                    <p>Your timeline will appear here once you add some activities.</p>
                    <button class="btn btn-primary" onclick="app.openAddActivityModal()">➕ Add Activity</button>
                </div>
            `;
        }

        return `
            <div class="timeline-content">
                ${this.renderTimelineHeader(activities)}
                ${this.renderTimeline(activities)}
            </div>
        `;
    }

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

    renderTimeline(activities) {
        const groupedByDate = Utils.groupBy(activities, 'date');
        const sortedDates = Object.keys(groupedByDate).sort();

        return `
            <div class="timeline">
                ${sortedDates.map(date => {
            const dayActivities = groupedByDate[date];
            const isToday = date === new Date().toISOString().split('T')[0];
            const isPast = date < new Date().toISOString().split('T')[0];

            return `
                        <div class="timeline-date-group ${isToday ? 'today' : ''} ${isPast ? 'past' : 'future'}">
                            ${this.renderDateMarker(date, dayActivities, isToday, isPast)}
                            <div class="timeline-activities">
                                ${dayActivities.map(activity => this.renderTimelineItem(activity)).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    renderDateMarker(date, activities, isToday, isPast) {
        const relativeTime = Utils.getRelativeTime(date);
        return `
            <div class="timeline-date-marker">
                <div class="date-marker-content">
                    <div class="date-text">
                        <div class="date-primary">${Utils.formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                        <div class="date-secondary">${relativeTime}</div>
                    </div>
                    <div class="date-badge ${isToday ? 'today' : isPast ? 'past' : 'future'}">
                        ${isToday ? '📍 Today' : isPast ? '✅ Past' : '📅 Upcoming'}
                    </div>
                </div>
            </div>
        `;
    }

    renderTimelineItem(activity) {
        return `
            <div class="timeline-item">
                <div class="timeline-marker">
                    <div class="marker-dot ${activity.isBooked() ? 'booked' : 'unbooked'}">
                        ${Utils.getTransportIcon(activity.transportMode) || '📌'}
                    </div>
                </div>
                <div class="timeline-card">
                    <div class="card-header">
                        <div class="card-main">
                            <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                            <div class="activity-meta">
                                ${activity.startTime ? `<span class="time">${Utils.formatTime(activity.startTime)}</span>` : ''}
                                ${activity.endTime ? `<span class="duration">→ ${Utils.formatTime(activity.endTime)}</span>` : ''}
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-secondary" onclick="window.handleEditActivity('${activity.id}')" title="Edit">✏️</button>
                            <button class="btn btn-sm btn-danger" onclick="window.handleDeleteActivity('${activity.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                    ${this.renderTimelineCardContent(activity)}
                </div>
            </div>
        `;
    }

    renderTimelineCardContent(activity) {
        const sections = [];

        if (activity.startFrom || activity.reachTo) {
            sections.push(`
                <div class="card-section location-section">
                    <div class="section-icon">📍</div>
                                            <div class="section-content">
                            ${activity.startFrom ? `<div class="location-from">From: ${Utils.escapeHtml(activity.startFrom)}</div>` : ''}
                            ${activity.reachTo ? `<div class="location-to">To: ${Utils.escapeHtml(activity.reachTo)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `);
        }

        if (activity.transportMode || activity.cost > 0 || activity.isBooked()) {
            const items = [];
            if (activity.transportMode) {
                items.push(`<div class="info-item"><span class="info-icon">${Utils.getTransportIcon(activity.transportMode)}</span><span class="info-text">${activity.transportMode}</span></div>`);
            }
            if (activity.cost > 0) {
                items.push(`<div class="info-item"><span class="info-icon">💰</span><span class="info-text">${Utils.formatCurrency(activity.cost)}</span></div>`);
            }
            items.push(`<div class="info-item"><span class="info-icon">${activity.isBooked() ? '✅' : '❌'}</span><span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">${activity.isBooked() ? 'Booked' : 'Not Booked'}</span></div>`);

            sections.push(`
                <div class="card-section info-section">
                    <div class="info-grid">${items.join('')}</div>
                </div>
            `);
        }

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

        return sections.length > 0 ? `<div class="card-content">${sections.join('')}</div>` : '';
    }

    calculateTimelineStats(activities) {
        const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);
        const dates = [...new Set(activities.map(a => a.date))].sort();
        return { totalCost, totalDays: dates.length };
    }
}