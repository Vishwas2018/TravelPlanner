/**
 * Complete Views.js - All Views with Enhanced ItineraryView - FIXED
 */

import { Utils } from '../core/utils.js';

// Enhanced Dashboard View
export class DashboardView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.expandedCards = new Set();
    }

    render() {
        const stats = this.dataManager.getStatistics();
        const costBreakdown = this.dataManager.getCostBreakdown();
        const upcomingActivities = this.dataManager.getUpcomingActivities(7);

        console.log('Dashboard rendering with:', {
            totalActivities: stats.totalActivities,
            upcomingCount: upcomingActivities.length
        });

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
                    ${activities.slice(0, 5).map(activity => this.renderEnhancedActivityCard(activity)).join('')}
                </div>
            </div>
        `;
    }

    renderEnhancedActivityCard(activity) {
        const isExpanded = this.expandedCards.has(activity.id);

        return `
            <div class="activity-card ${isExpanded ? 'expanded' : ''}" 
                 data-activity-id="${activity.id}"
                 onclick="window.toggleActivityCard('${activity.id}', 'dashboard')">
                
                <div class="activity-priority-indicator ${this.getPriorityClass(activity)}"></div>
                
                <div class="activity-card-content">
                    <div class="activity-main-info">
                        <div class="activity-transport-icon">
                            ${Utils.getTransportIcon(activity.transportMode) || '📌'}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 class="activity-title-compact">${Utils.escapeHtml(activity.activity)}</h3>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                ${activity.startFrom && activity.reachTo ?
            `${activity.startFrom} → ${activity.reachTo}` :
            (activity.startFrom || activity.reachTo || 'No location')
        }
                            </div>
                        </div>
                        <div class="activity-time-badge">
                            ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time'}
                        </div>
                        <div class="activity-status-indicator ${activity.isBooked() ? 'booked' : 'not-booked'}"></div>
                    </div>
                    
                    <div class="activity-floating-actions" onclick="event.stopPropagation()">
                        <button class="floating-action-btn edit" onclick="handleEditActivity('${activity.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="floating-action-btn duplicate" onclick="handleDuplicateActivity('${activity.id}')" title="Duplicate">
                            📋
                        </button>
                        <button class="floating-action-btn delete" onclick="handleDeleteActivity('${activity.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                    
                    <div class="booking-status-chip ${activity.isBooked() ? 'booked' : 'not-booked'}">
                        ${activity.isBooked() ? 'Booked' : 'Pending'}
                    </div>
                    
                    <div class="activity-expanded-content ${isExpanded ? 'visible' : 'hidden'}">
                        ${this.renderCompleteDetails(activity)}
                    </div>
                </div>
            </div>
        `;
    }

    renderCompleteDetails(activity) {
        return `
            <div class="complete-details-grid">
                <div class="detail-row full-width">
                    <div class="detail-icon">🎯</div>
                    <div class="detail-label">Activity:</div>
                    <div class="detail-value activity-name-detail">${Utils.escapeHtml(activity.activity)}</div>
                </div>
                ${activity.startFrom ? `
                <div class="detail-row">
                    <div class="detail-icon">📍</div>
                    <div class="detail-label">From:</div>
                    <div class="detail-value">${Utils.escapeHtml(activity.startFrom)}</div>
                </div>
                ` : ''}
                ${activity.reachTo ? `
                <div class="detail-row">
                    <div class="detail-icon">🎯</div>
                    <div class="detail-label">To:</div>
                    <div class="detail-value">${Utils.escapeHtml(activity.reachTo)}</div>
                </div>
                ` : ''}
                ${activity.cost > 0 ? `
                <div class="detail-row">
                    <div class="detail-icon">💰</div>
                    <div class="detail-label">Cost:</div>
                    <div class="detail-value cost-highlight">${Utils.formatCurrency(activity.cost)}</div>
                </div>
                ` : ''}
                ${activity.additionalDetails ? `
                <div class="detail-row full-width notes-section">
                    <div class="detail-icon">📝</div>
                    <div class="detail-label">Notes:</div>
                    <div class="detail-value notes-content">${Utils.escapeHtml(activity.additionalDetails)}</div>
                </div>
                ` : ''}
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

    getPriorityClass(activity) {
        if (activity.cost > 1000) return 'high';
        if (activity.cost < 100) return 'low';
        return 'normal';
    }

    toggleCard(activityId) {
        if (this.expandedCards.has(activityId)) {
            this.expandedCards.delete(activityId);
        } else {
            this.expandedCards.add(activityId);
        }
    }
}

// Enhanced Itinerary View - FIXED
export class ItineraryView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.viewMode = 'grouped';
        this.expandedCards = new Set();
        this.persistentlyExpanded = new Set();
    }

    render() {
        // Always get the latest filtered activities
        const activities = this.dataManager.filteredActivities || [];

        console.log('ItineraryView rendering:', {
            totalActivities: this.dataManager.activities?.length || 0,
            filteredActivities: activities.length,
            viewMode: this.viewMode
        });

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
        const groupedActivities = Utils.groupBy(activities, 'date');
        const sortedDates = Object.keys(groupedActivities).sort();

        console.log('Grouped view:', { groupedActivities, sortedDates });

        if (sortedDates.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="grouped-view">
                ${sortedDates.map((date, index) => {
            const dayActivities = groupedActivities[date];
            const dayStats = this.calculateDayStats(dayActivities);
            const dayNumber = index + 1;

            return `
                        <div class="date-group">
                            ${this.renderDayGroupHeader(date, dayActivities, dayStats, dayNumber)}
                            <div class="activity-list">
                                ${dayActivities.map(activity => this.renderEnhancedActivityCard(activity)).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    renderDayGroupHeader(date, activities, stats, dayNumber) {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        return `
            <div class="date-group-header">
                <div>
                    <h3 class="date-group-title">Day ${dayNumber} - ${dayName}, ${formattedDate}</h3>
                    <p class="date-group-subtitle">${activities.length} activities planned</p>
                </div>
                <div class="date-group-stats">
                    <div class="date-stat-item">
                        <span>💰</span>
                        <span>${Utils.formatCurrency(stats.totalCost)}</span>
                    </div>
                    <div class="date-stat-item">
                        <span>✅</span>
                        <span>${stats.bookedCount}/${activities.length}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderEnhancedActivityCard(activity) {
        const isExpanded = this.expandedCards.has(activity.id) || this.persistentlyExpanded.has(activity.id);
        const isHovered = this.expandedCards.has(activity.id) && !this.persistentlyExpanded.has(activity.id);
        const isPersistent = this.persistentlyExpanded.has(activity.id);
        const cardId = `card-${activity.id}`;

        return `
            <div class="activity-card ${isExpanded ? 'expanded' : ''} ${isHovered ? 'hovered' : ''} ${isPersistent ? 'selected' : ''}" 
                 id="${cardId}"
                 data-activity-id="${activity.id}"
                 onmouseenter="window.itineraryView?.handleCardHover('${activity.id}', true)"
                 onmouseleave="window.itineraryView?.handleCardHover('${activity.id}', false)"
                 onclick="window.itineraryView?.handleCardClick('${activity.id}')">
                
                <div class="activity-priority-indicator ${this.getPriorityClass(activity)}"></div>
                
                <div class="activity-card-content">
                    <div class="activity-main-info">
                        <div class="activity-transport-icon">
                            ${Utils.getTransportIcon(activity.transportMode) || '📌'}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 class="activity-title-compact">${Utils.escapeHtml(activity.activity)}</h3>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                ${activity.startFrom && activity.reachTo ?
            `${activity.startFrom} → ${activity.reachTo}` :
            (activity.startFrom || activity.reachTo || 'No location')
        }
                            </div>
                        </div>
                        <div class="activity-time-badge">
                            ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time'}
                        </div>
                        <div class="activity-status-indicator ${activity.isBooked() ? 'booked' : 'not-booked'}"></div>
                    </div>
                    
                    <div class="activity-floating-actions" onclick="event.stopPropagation()">
                        <button class="floating-action-btn edit" onclick="handleEditActivity('${activity.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="floating-action-btn duplicate" onclick="window.itineraryView?.handleDuplicateActivity('${activity.id}')" title="Copy">
                            📋
                        </button>
                        <button class="floating-action-btn delete" onclick="window.itineraryView?.handleDeleteActivity('${activity.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                    
                    <div class="booking-status-chip ${activity.isBooked() ? 'booked' : 'not-booked'}">
                        ${activity.isBooked() ? 'Booked' : 'Pending'}
                    </div>
                    
                    <div class="activity-expanded-content ${isExpanded ? 'visible' : 'hidden'}">
                        ${this.renderCompleteDetails(activity)}
                    </div>
                </div>
            </div>
        `;
    }

    renderCompleteDetails(activity) {
        return `
            <div class="complete-details-grid">
                <!-- Activity Name -->
                <div class="detail-row full-width">
                    <div class="detail-icon">🎯</div>
                    <div class="detail-label">Activity:</div>
                    <div class="detail-value activity-name-detail">${Utils.escapeHtml(activity.activity)}</div>
                </div>

                <!-- Date & Time -->
                <div class="detail-row">
                    <div class="detail-icon">📅</div>
                    <div class="detail-label">Date:</div>
                    <div class="detail-value">${Utils.formatDate(activity.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-icon">🕐</div>
                    <div class="detail-label">Start Time:</div>
                    <div class="detail-value">${activity.startTime ? Utils.formatTime(activity.startTime) : 'Not specified'}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-icon">🕐</div>
                    <div class="detail-label">End Time:</div>
                    <div class="detail-value">${activity.endTime ? Utils.formatTime(activity.endTime) : 'Not specified'}</div>
                </div>

                <!-- Duration -->
                ${activity.getDuration() ? `
                <div class="detail-row">
                    <div class="detail-icon">⏱️</div>
                    <div class="detail-label">Duration:</div>
                    <div class="detail-value">${activity.getFormattedDuration()}</div>
                </div>
                ` : ''}

                <!-- Locations -->
                ${activity.startFrom ? `
                <div class="detail-row">
                    <div class="detail-icon">📍</div>
                    <div class="detail-label">From:</div>
                    <div class="detail-value">${Utils.escapeHtml(activity.startFrom)}</div>
                </div>
                ` : ''}

                ${activity.reachTo ? `
                <div class="detail-row">
                    <div class="detail-icon">🎯</div>
                    <div class="detail-label">To:</div>
                    <div class="detail-value">${Utils.escapeHtml(activity.reachTo)}</div>
                </div>
                ` : ''}

                <!-- Transport -->
                ${activity.transportMode ? `
                <div class="detail-row">
                    <div class="detail-icon">${Utils.getTransportIcon(activity.transportMode)}</div>
                    <div class="detail-label">Transport:</div>
                    <div class="detail-value">${activity.transportMode}</div>
                </div>
                ` : ''}

                <!-- Booking Status -->
                <div class="detail-row">
                    <div class="detail-icon">${activity.isBooked() ? '✅' : '❌'}</div>
                    <div class="detail-label">Booking Status:</div>
                    <div class="detail-value booking-status ${activity.isBooked() ? 'confirmed' : 'pending'}">
                        ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                    </div>
                </div>

                <!-- Cost -->
                ${activity.cost > 0 ? `
                <div class="detail-row">
                    <div class="detail-icon">💰</div>
                    <div class="detail-label">Cost:</div>
                    <div class="detail-value cost-highlight">${Utils.formatCurrency(activity.cost)}</div>
                </div>
                ` : ''}

                <!-- Accommodation Details -->
                ${activity.accommodationDetails ? `
                <div class="detail-row full-width">
                    <div class="detail-icon">🏨</div>
                    <div class="detail-label">Accommodation:</div>
                    <div class="detail-value booking-details">${Utils.escapeHtml(activity.accommodationDetails)}</div>
                </div>
                ` : ''}

                <!-- Additional Details -->
                ${activity.additionalDetails ? `
                <div class="detail-row full-width notes-section">
                    <div class="detail-icon">📝</div>
                    <div class="detail-label">Additional Details:</div>
                    <div class="detail-value notes-content">${Utils.escapeHtml(activity.additionalDetails)}</div>
                </div>
                ` : ''}

                <!-- Created/Updated -->
                <div class="detail-row">
                    <div class="detail-icon">📅</div>
                    <div class="detail-label">Created:</div>
                    <div class="detail-value">${Utils.formatDate(activity.createdAt?.split('T')[0] || activity.date)}</div>
                </div>

                ${activity.updatedAt && activity.updatedAt !== activity.createdAt ? `
                <div class="detail-row">
                    <div class="detail-icon">🔄</div>
                    <div class="detail-label">Last Updated:</div>
                    <div class="detail-value">${Utils.formatDate(activity.updatedAt.split('T')[0])}</div>
                </div>
                ` : ''}
            </div>
        `;
    }

    renderListView(activities) {
        return `
            <div class="list-view">
                <div class="content-section">
                    <div style="padding: 1rem;">
                        ${activities.map(activity => this.renderEnhancedActivityCard(activity)).join('')}
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

    getPriorityClass(activity) {
        if (activity.cost > 1000) return 'high';
        if (activity.cost < 100) return 'low';
        return 'normal';
    }

    // Enhanced interaction handlers
    handleCardHover(activityId, isEntering) {
        if (this.persistentlyExpanded.has(activityId)) return;

        if (isEntering) {
            this.expandedCards.add(activityId);
        } else {
            this.expandedCards.delete(activityId);
        }
        this.updateCardState(activityId);
    }

    handleCardClick(activityId) {
        if (this.persistentlyExpanded.has(activityId)) {
            this.persistentlyExpanded.delete(activityId);
        } else {
            this.persistentlyExpanded.add(activityId);
        }
        this.updateCardState(activityId);
    }

    handleDeleteActivity(activityId) {
        const activity = window.app.dataManager.getActivityById(activityId);
        if (!activity) {
            console.error('Activity not found');
            return;
        }

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-dialog" style="max-width: 400px;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Confirm Delete</h2>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete this activity?</p>
                        <div style="background: rgba(245, 101, 101, 0.1); border-left: 3px solid var(--danger); padding: 12px; margin: 16px 0; border-radius: 4px;">
                            <strong>"${Utils.escapeHtml(activity.activity)}"</strong><br>
                            <small>${Utils.formatDate(activity.date)} ${activity.startTime ? 'at ' + Utils.formatTime(activity.startTime) : ''}</small>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 14px;">This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary modal-cancel">Cancel</button>
                        <button class="btn btn-danger modal-confirm">Delete Activity</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Setup event listeners
        const closeModal = () => modalOverlay.remove();
        modalOverlay.querySelector('.modal-close').addEventListener('click', closeModal);
        modalOverlay.querySelector('.modal-cancel').addEventListener('click', closeModal);
        modalOverlay.querySelector('.modal-confirm').addEventListener('click', () => {
            this.confirmDelete(activityId);
            closeModal();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        setTimeout(() => modalOverlay.classList.add('active'), 10);
    }

    confirmDelete(activityId) {
        try {
            window.app.dataManager.deleteActivity(activityId);
            this.expandedCards.delete(activityId);
            this.persistentlyExpanded.delete(activityId);
        } catch (error) {
            console.error('Error deleting activity:', error);
        }
    }

    handleDuplicateActivity(activityId) {
        try {
            const newActivity = window.app.dataManager.duplicateActivity(activityId);

            // Refresh the entire view to show the new activity
            setTimeout(() => {
                window.app.updateCurrentView();
            }, 100);

        } catch (error) {
            console.error('Error duplicating activity:', error);
        }
    }

    updateCardState(activityId) {
        const card = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!card) return;

        const isExpanded = this.expandedCards.has(activityId) || this.persistentlyExpanded.has(activityId);
        const isHovered = this.expandedCards.has(activityId) && !this.persistentlyExpanded.has(activityId);
        const isPersistent = this.persistentlyExpanded.has(activityId);
        const expandedContent = card.querySelector('.activity-expanded-content');

        // Update classes
        card.classList.toggle('expanded', isExpanded);
        card.classList.toggle('hovered', isHovered);
        card.classList.toggle('selected', isPersistent);

        if (expandedContent) {
            expandedContent.classList.toggle('visible', isExpanded);
            expandedContent.classList.toggle('hidden', !isExpanded);
        }
    }

    toggleCard(activityId) {
        this.handleCardClick(activityId);
    }
}

// Timeline View
export class TimelineView {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.expandedCards = new Set();
    }

    render() {
        // Get the latest filtered activities
        const activities = this.dataManager.filteredActivities || [];

        console.log('TimelineView rendering:', {
            totalActivities: this.dataManager.activities?.length || 0,
            filteredActivities: activities.length
        });

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
            <div class="timeline timeline-view">
                <div class="timeline-line"></div>
                ${sortedDates.map((date, index) => {
            const dayActivities = groupedByDate[date];
            const isToday = date === new Date().toISOString().split('T')[0];
            const isPast = date < new Date().toISOString().split('T')[0];

            return `
                        <div class="timeline-date-group ${isToday ? 'today' : ''} ${isPast ? 'past' : 'future'}" 
                             style="animation-delay: ${index * 0.1}s">
                            ${this.renderTimelineDateMarker(date, dayActivities, isToday, isPast)}
                            <div class="timeline-activities">
                                ${dayActivities.map((activity, actIndex) =>
                this.renderTimelineActivityCard(activity, actIndex)
            ).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    renderTimelineDateMarker(date, activities, isToday, isPast) {
        const relativeTime = Utils.getRelativeTime(date);
        const dayName = Utils.formatDate(date, { weekday: 'short' });
        const formattedDate = Utils.formatDate(date, { month: 'short', day: 'numeric' });

        return `
            <div class="timeline-date-marker">
                <div class="date-marker-badge ${isToday ? 'today' : isPast ? 'past' : 'future'}">
                    <div class="date-marker-icon">
                        ${isToday ? '📍' : isPast ? '✅' : '📅'}
                    </div>
                    <div class="date-marker-content">
                        <div class="date-primary">${dayName} ${formattedDate}</div>
                        <div class="date-secondary">${relativeTime}</div>
                        <div class="date-count">${activities.length} activities</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTimelineActivityCard(activity, index) {
        const isExpanded = this.expandedCards.has(activity.id);

        return `
            <div class="activity-card timeline-card ${isExpanded ? 'expanded' : ''}" 
                 data-activity-id="${activity.id}" 
                 style="animation-delay: ${index * 0.05}s"
                 onclick="window.toggleActivityCard('${activity.id}', 'timeline')">
                
                <div class="activity-priority-indicator ${this.getPriorityClass(activity)}"></div>
                
                <div class="activity-card-content">
                    <div class="activity-main-info">
                        <div class="activity-transport-icon">
                            ${Utils.getTransportIcon(activity.transportMode) || '📌'}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 class="activity-title-compact">${Utils.escapeHtml(activity.activity)}</h3>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px; display: flex; gap: 8px;">
                                ${activity.startTime ? `
                                    <span>🕐 ${Utils.formatTime(activity.startTime)}</span>
                                ` : ''}
                                ${activity.endTime ? `
                                    <span>→ ${Utils.formatTime(activity.endTime)}</span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="activity-status-indicator ${activity.isBooked() ? 'booked' : 'not-booked'}"></div>
                    </div>
                    
                    <div class="activity-floating-actions" onclick="event.stopPropagation()">
                        <button class="floating-action-btn edit" onclick="handleEditActivity('${activity.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="floating-action-btn duplicate" onclick="handleDuplicateActivity('${activity.id}')" title="Duplicate">
                            📋
                        </button>
                        <button class="floating-action-btn delete" onclick="handleDeleteActivity('${activity.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                    
                    <div class="booking-status-chip ${activity.isBooked() ? 'booked' : 'not-booked'}">
                        ${activity.isBooked() ? 'Booked' : 'Pending'}
                    </div>
                    
                    <div class="activity-expanded-content ${isExpanded ? 'visible' : 'hidden'}">
                        ${this.renderCompleteDetails(activity)}
                    </div>
                </div>
            </div>
        `;
    }

    renderCompleteDetails(activity) {
        return `
            <div class="complete-details-grid">
                <div class="detail-row full-width">
                    <div class="detail-icon">🎯</div>
                    <div class="detail-label">Activity:</div>
                    <div class="detail-value activity-name-detail">${Utils.escapeHtml(activity.activity)}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-icon">📅</div>
                    <div class="detail-label">Date:</div>
                    <div class="detail-value">${Utils.formatDate(activity.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-icon">🕐</div>
                    <div class="detail-label">Start Time:</div>
                    <div class="detail-value">${activity.startTime ? Utils.formatTime(activity.startTime) : 'Not specified'}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-icon">🕐</div>
                    <div class="detail-label">Finish Time:</div>
                    <div class="detail-value">${activity.endTime ? Utils.formatTime(activity.endTime) : 'Not specified'}</div>
                </div>

                ${activity.startFrom || activity.reachTo ? `
                    <div class="timeline-location">
                        <div class="location-icon">🗺️</div>
                        <div class="location-details">
                            ${activity.startFrom ? `<div class="location-from">📍 From: ${Utils.escapeHtml(activity.startFrom)}</div>` : ''}
                            ${activity.reachTo ? `<div class="location-to">🎯 To: ${Utils.escapeHtml(activity.reachTo)}</div>` : ''}
                        </div>
                    </div>
                ` : ''}

                ${activity.transportMode ? `
                <div class="detail-row">
                    <div class="detail-icon">${Utils.getTransportIcon(activity.transportMode)}</div>
                    <div class="detail-label">Transport:</div>
                    <div class="detail-value">${activity.transportMode}</div>
                </div>
                ` : ''}

                <div class="detail-row">
                    <div class="detail-icon">${activity.isBooked() ? '✅' : '❌'}</div>
                    <div class="detail-label">Booking Required:</div>
                    <div class="detail-value booking-status ${activity.isBooked() ? 'confirmed' : 'pending'}">
                        ${activity.isBooked() ? 'Yes - Confirmed' : 'Yes - Pending'}
                    </div>
                </div>

                ${activity.isBooked() && activity.accommodationDetails ? `
                <div class="detail-row full-width">
                    <div class="detail-icon">📋</div>
                    <div class="detail-label">Booking Details:</div>
                    <div class="detail-value booking-details">${Utils.escapeHtml(activity.accommodationDetails)}</div>
                </div>
                ` : ''}

                ${activity.cost > 0 ? `
                <div class="detail-row">
                    <div class="detail-icon">💰</div>
                    <div class="detail-label">Cost:</div>
                    <div class="detail-value cost-highlight">${Utils.formatCurrency(activity.cost)}</div>
                </div>
                ` : ''}

                ${activity.getDuration() ? `
                <div class="detail-row">
                    <div class="detail-icon">⏱️</div>
                    <div class="detail-label">Duration:</div>
                    <div class="detail-value">${activity.getFormattedDuration()}</div>
                </div>
                ` : ''}

                ${activity.additionalDetails ? `
                <div class="detail-row full-width notes-section">
                    <div class="detail-icon">📝</div>
                    <div class="detail-label">Notes:</div>
                    <div class="detail-value notes-content">${Utils.escapeHtml(activity.additionalDetails)}</div>
                </div>
                ` : ''}
            </div>
        `;
    }

    getPriorityClass(activity) {
        if (activity.cost > 1000) return 'high';
        if (activity.cost < 100) return 'low';
        return 'normal';
    }

    calculateTimelineStats(activities) {
        const totalCost = activities.reduce((sum, activity) => sum + activity.cost, 0);
        const dates = [...new Set(activities.map(a => a.date))].sort();
        return { totalCost, totalDays: dates.length };
    }

    toggleCard(activityId) {
        if (this.expandedCards.has(activityId)) {
            this.expandedCards.delete(activityId);
        } else {
            this.expandedCards.add(activityId);
        }
    }
}

// Global handlers for card toggling
window.toggleActivityCard = function(activityId, viewType) {
    if (!window.app) return;

    const view = window.app.views.get(window.app.currentView);
    if (view && view.toggleCard) {
        view.toggleCard(activityId);
        window.app.navigateToView(window.app.currentView);
    }
};

// Initialize enhanced itinerary view
export function initializeItineraryView(view) {
    window.itineraryView = view;
}