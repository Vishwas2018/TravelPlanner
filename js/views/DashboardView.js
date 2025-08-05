/**
 * Travel Itinerary Manager - Dashboard View
 * Provides overview statistics and quick actions
 */

import { Utils } from '../core/utils.js';

export class DashboardView {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * Render dashboard view
     * @returns {string} Dashboard HTML
     */
    render() {
        const stats = this.dataManager.getStatistics();
        const costBreakdown = this.dataManager.getCostBreakdown();
        const upcomingActivities = this.dataManager.getUpcomingActivities(7);

        return `
            <div class="dashboard-content">
                ${this.renderMetrics(stats)}
                ${this.renderQuickActions()}
                ${this.renderUpcomingActivities(upcomingActivities)}
                ${this.renderCostBreakdown(costBreakdown)}
            </div>
        `;
    }

    /**
     * Render metrics grid
     * @param {object} stats - Statistics data
     * @returns {string} Metrics HTML
     */
    renderMetrics(stats) {
        return `
            <div class="dashboard-grid">
                <div class="metric-card">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-value">${stats.totalActivities}</div>
                    <div class="metric-label">Total Activities</div>
                    <div class="metric-change positive">+${stats.upcomingActivities} upcoming</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">💰</div>
                    <div class="metric-value">${Utils.formatCurrency(stats.totalCost)}</div>
                    <div class="metric-label">Total Budget</div>
                    <div class="metric-change">${Utils.formatCurrency(stats.averageCostPerActivity)} avg per activity</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📅</div>
                    <div class="metric-value">${stats.totalDays}</div>
                    <div class="metric-label">Trip Days</div>
                    <div class="metric-change">${stats.totalCountries} countries</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">✅</div>
                    <div class="metric-value">${stats.bookingsCount}</div>
                    <div class="metric-label">Bookings Made</div>
                    <div class="metric-change ${stats.bookingPercentage >= 80 ? 'positive' : 'negative'}">${stats.bookingPercentage}% complete</div>
                </div>
            </div>
        `;
    }

    /**
     * Render quick actions section
     * @returns {string} Quick actions HTML
     */
    renderQuickActions() {
        return `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Quick Actions</h2>
                </div>
                <div style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
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
            </div>
        `;
    }

    /**
     * Render upcoming activities
     * @param {Array} activities - Upcoming activities
     * @returns {string} Upcoming activities HTML
     */
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
                    
                    ${activities.length > 5 ? `
                        <div style="text-align: center; margin-top: 1rem;">
                            <button class="btn btn-secondary" onclick="app.navigateToView('itinerary')">
                                View All ${activities.length} Activities
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render cost breakdown
     * @param {object} breakdown - Cost breakdown data
     * @returns {string} Cost breakdown HTML
     */
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
            const percentage = total > 0 ? (amount / total) * 100 : 0;
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