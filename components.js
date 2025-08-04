/**
 * Travel Itinerary Manager - Reusable UI Components
 * Contains all reusable UI components and utilities
 */

class TravelComponents {
    /**
     * Format time string to display format
     */
    static formatTime(timeString) {
        if (!timeString) return '';

        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch (error) {
            console.warn('Invalid time format:', timeString);
            return timeString;
        }
    }

    /**
     * Format date to display format
     */
    static formatDate(dateString, options = {}) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }

            const defaultOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
        } catch (error) {
            console.warn('Invalid date format:', dateString);
            return dateString;
        }
    }

    /**
     * Format currency with proper error handling
     */
    static formatCurrency(amount) {
        try {
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(numAmount)) return '$0';

            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(numAmount);
        } catch (error) {
            console.warn('Error formatting currency:', amount);
            return `$${amount || 0}`;
        }
    }

    /**
     * Create metric card component
     */
    static createMetricCard(icon, value, label, change = null) {
        const changeHtml = change ? `
            <div class="metric-change ${change.type || 'positive'}">
                ${change.text}
            </div>
        ` : '';

        return `
            <div class="metric-card fade-in">
                <div class="metric-icon">${icon}</div>
                <div class="metric-value">${value}</div>
                <div class="metric-label">${label}</div>
                ${changeHtml}
            </div>
        `;
    }

    /**
     * Create activity card component with proper error handling
     */
    static createActivityCard(activity, index, showDate = false) {
        if (!activity) {
            console.warn('Activity is null or undefined');
            return '';
        }

        const timeDisplay = activity.startTime && activity.endTime
            ? `${this.formatTime(activity.startTime)} - ${this.formatTime(activity.endTime)}`
            : 'Time not specified';

        const dateDisplay = showDate ? `
            <div class="activity-date" style="color: var(--gray-500); font-size: var(--font-size-sm); margin-top: var(--space-1);">
                📅 ${this.formatDate(activity.date, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
        ` : '';

        return `
            <div class="activity-card slide-up" style="animation-delay: ${(index * 0.1)}s">
                <div class="activity-header">
                    <div>
                        <div class="activity-title">${this.escapeHtml(activity.activity || 'Untitled Activity')}</div>
                        <div class="activity-time">🕒 ${timeDisplay}</div>
                        ${dateDisplay}
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm primary" onclick="app.editActivity(${index})">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm danger" onclick="app.deleteActivity(${index})">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                ${this.createActivityDetails(activity)}
                ${this.createActivityBadges(activity)}
                ${this.createActivityExtras(activity)}
            </div>
        `;
    }

    /**
     * Create activity details section with validation
     */
    static createActivityDetails(activity) {
        const details = [];

        if (activity.startFrom && activity.startFrom !== 'N/A' && activity.startFrom.trim()) {
            details.push(`
                <div class="detail-item">
                    <span class="detail-icon">📍</span>
                    <span><strong>From:</strong> ${this.escapeHtml(activity.startFrom)}</span>
                </div>
            `);
        }

        if (activity.reachTo && activity.reachTo !== 'N/A' && activity.reachTo.trim()) {
            details.push(`
                <div class="detail-item">
                    <span class="detail-icon">🎯</span>
                    <span><strong>To:</strong> ${this.escapeHtml(activity.reachTo)}</span>
                </div>
            `);
        }

        if (activity.transportMode && activity.transportMode !== 'N/A' && activity.transportMode.trim()) {
            const transportIcon = this.getTransportIcon(activity.transportMode);
            details.push(`
                <div class="detail-item">
                    <span class="detail-icon">${transportIcon}</span>
                    <span><strong>Transport:</strong> ${this.escapeHtml(activity.transportMode)}</span>
                </div>
            `);
        }

        details.push(`
            <div class="detail-item">
                <span class="detail-icon">💰</span>
                <span class="cost-display">${this.formatCurrency(activity.cost)}</span>
            </div>
        `);

        return details.length > 0 ? `
            <div class="activity-details">${details.join('')}</div>
        ` : '';
    }

    /**
     * Create activity badges with proper validation
     */
    static createActivityBadges(activity) {
        const badges = [];

        const bookingBadge = activity.booking === 'TRUE'
            ? '<span class="badge badge-success">✅ Booked</span>'
            : '<span class="badge badge-warning">⏳ Not Booked</span>';
        badges.push(bookingBadge);

        if (activity.transportMode && activity.transportMode !== 'N/A' && activity.transportMode.trim()) {
            const transportIcon = this.getTransportIcon(activity.transportMode);
            badges.push(`<span class="badge badge-primary">${transportIcon} ${this.escapeHtml(activity.transportMode)}</span>`);
        }

        const cost = parseFloat(activity.cost) || 0;
        if (cost > 1000) {
            badges.push('<span class="badge badge-info">💎 High Value</span>');
        }

        return `
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4);">
                ${badges.join('')}
            </div>
        `;
    }

    /**
     * Create activity extras with XSS protection
     */
    static createActivityExtras(activity) {
        const extras = [];

        if (activity.additionalDetails && activity.additionalDetails.trim()) {
            extras.push(`
                <div class="info-box">
                    <strong>📝 Details:</strong> ${this.escapeHtml(activity.additionalDetails)}
                </div>
            `);
        }

        if (activity.accommodationDetails &&
            activity.accommodationDetails !== 'N/A' &&
            activity.accommodationDetails.trim()) {
            extras.push(`
                <div class="info-box">
                    <strong>🏨 Accommodation:</strong> ${this.escapeHtml(activity.accommodationDetails)}
                </div>
            `);
        }

        return extras.join('');
    }

    /**
     * Get transport mode icon with fallback
     */
    static getTransportIcon(transportMode) {
        const icons = {
            'Flight': '✈️',
            'Train': '🚄',
            'Car': '🚗',
            'Bus': '🚌',
            'Tube': '🚇',
            'Uber': '🚕',
            'Walking': '🚶',
            'Auto': '🛺',
            'N/A': '📍'
        };
        return icons[transportMode] || '🚗';
    }

    /**
     * Create date group header with statistics
     */
    static createDateGroupHeader(date, activities) {
        if (!activities || activities.length === 0) {
            return '';
        }

        const formattedDate = this.formatDate(date);
        const dayStats = {
            totalCost: activities.reduce((sum, activity) => {
                const cost = parseFloat(activity.cost) || 0;
                return sum + cost;
            }, 0),
            totalActivities: activities.length,
            bookings: activities.filter(activity => activity.booking === 'TRUE').length
        };

        return `
            <div class="date-header fade-in">
                <div class="date-info">
                    <div class="date-title">${formattedDate}</div>
                    <div class="date-subtitle">${activities.length} activities planned</div>
                </div>
                <div class="date-stats">
                    <div>💰 ${this.formatCurrency(dayStats.totalCost)}</div>
                    <div>✅ ${dayStats.bookings} bookings</div>
                    <div>🎯 ${dayStats.totalActivities} activities</div>
                </div>
            </div>
        `;
    }

    /**
     * Create timeline item with proper formatting
     */
    static createTimelineItem(activity, index) {
        if (!activity) return '';

        const formattedDate = this.formatDate(activity.date, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeDisplay = activity.startTime ? this.formatTime(activity.startTime) : '';

        return `
            <div class="timeline-item slide-up" style="animation-delay: ${(index * 0.1)}s">
                <div class="activity-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4);">
                        <div>
                            <div class="activity-title">${this.escapeHtml(activity.activity)}</div>
                            <div style="color: var(--gray-500); font-size: var(--font-size-sm);">
                                📅 ${formattedDate} ${timeDisplay ? `• 🕒 ${timeDisplay}` : ''}
                            </div>
                        </div>
                        <div class="cost-display">${this.formatCurrency(activity.cost)}</div>
                    </div>
                    
                    ${this.createLocationInfo(activity)}
                    ${this.createTimelineBadges(activity)}
                    ${this.createTimelineDetails(activity)}
                </div>
            </div>
        `;
    }

    /**
     * Create location information for timeline
     */
    static createLocationInfo(activity) {
        const locations = [];

        if (activity.startFrom && activity.startFrom !== 'N/A' && activity.startFrom.trim()) {
            locations.push(`📍 <strong>From:</strong> ${this.escapeHtml(activity.startFrom)}`);
        }

        if (activity.reachTo && activity.reachTo !== 'N/A' && activity.reachTo.trim()) {
            locations.push(`🎯 <strong>To:</strong> ${this.escapeHtml(activity.reachTo)}`);
        }

        return locations.length > 0 ? `
            <div style="margin-bottom: var(--space-4); font-size: var(--font-size-sm);">
                ${locations.join('<br>')}
            </div>
        ` : '';
    }

    /**
     * Create badges for timeline view
     */
    static createTimelineBadges(activity) {
        const badges = [];

        badges.push(`
            <span class="badge ${activity.booking === 'TRUE' ? 'badge-success' : 'badge-warning'}">
                ${activity.booking === 'TRUE' ? '✅ Booked' : '⏳ Not Booked'}
            </span>
        `);

        if (activity.transportMode && activity.transportMode !== 'N/A' && activity.transportMode.trim()) {
            badges.push(`
                <span class="badge badge-primary">
                    ${this.getTransportIcon(activity.transportMode)} ${this.escapeHtml(activity.transportMode)}
                </span>
            `);
        }

        return `
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3);">
                ${badges.join('')}
            </div>
        `;
    }

    /**
     * Create timeline details section
     */
    static createTimelineDetails(activity) {
        return activity.additionalDetails && activity.additionalDetails.trim() ? `
            <div class="info-box">
                <strong>📝 Details:</strong> ${this.escapeHtml(activity.additionalDetails)}
            </div>
        ` : '';
    }

    /**
     * Create notification with proper error handling
     */
    static createNotification(message, type = 'info', duration = 4000) {
        if (!message) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type} animate__animated animate__slideInRight`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: var(--space-2); position: relative; z-index: 1;">
                <span style="font-size: var(--font-size-lg);">${icons[type] || icons.info}</span>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        const container = document.getElementById('notificationContainer');
        if (!container) {
            console.warn('Notification container not found');
            return;
        }

        container.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('animate__slideOutRight');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, duration);
    }

    /**
     * Create loading spinner with text
     */
    static createLoadingSpinner(text = 'Loading...') {
        return `
            <div class="loading" style="display: flex; align-items: center; justify-content: center; padding: var(--space-8); color: var(--gray-500);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                    <div class="loading-spinner"></div>
                    <span>${this.escapeHtml(text)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Create empty state component
     */
    static createEmptyState(icon, title, description, actionButton = null) {
        const buttonHtml = actionButton ? `
            <button class="btn primary" onclick="${actionButton.onClick}">
                ${this.escapeHtml(actionButton.text)}
            </button>
        ` : '';

        return `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: var(--space-4);">${icon}</div>
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(description)}</p>
                ${buttonHtml}
            </div>
        `;
    }

    /**
     * Create filter controls with proper structure
     */
    static createFilterControls() {
        return `
            <div class="filter-group">
                <label class="filter-label">Date Range</label>
                <input type="date" class="filter-input" id="startDateFilter" placeholder="Start date">
                <input type="date" class="filter-input" id="endDateFilter" placeholder="End date" style="margin-top: var(--space-2);">
            </div>

            <div class="filter-group">
                <label class="filter-label">Transport Mode</label>
                <select class="filter-select" id="transportFilter">
                    <option value="">All Transport</option>
                    <option value="Flight">✈️ Flight</option>
                    <option value="Train">🚄 Train</option>
                    <option value="Car">🚗 Car</option>
                    <option value="Bus">🚌 Bus</option>
                    <option value="Tube">🚇 Tube/Metro</option>
                    <option value="Uber">🚕 Uber/Taxi</option>
                    <option value="Walking">🚶 Walking</option>
                    <option value="Auto">🛺 Auto Rickshaw</option>
                </select>
            </div>

            <div class="filter-group">
                <label class="filter-label">Booking Status</label>
                <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                    <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm);">
                        <input type="checkbox" checked data-booking="TRUE">
                        <span>✅ Booked</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm);">
                        <input type="checkbox" checked data-booking="FALSE">
                        <span>⏳ Not Booked</span>
                    </label>
                </div>
            </div>

            <div class="filter-group">
                <label class="filter-label">Max Cost</label>
                <input type="range" id="costFilter" min="0" max="10000" value="10000" class="filter-input">
                <div style="text-align: center; margin-top: var(--space-1);">
                    <span id="costFilterValue" style="font-size: var(--font-size-sm); color: var(--gray-600);">$10,000</span>
                </div>
            </div>

            <div class="filter-group">
                <button class="btn secondary" onclick="app.clearFilters()" style="width: 100%;">
                    🗑️ Clear Filters
                </button>
            </div>
        `;
    }

    /**
     * Create progress bar with proper validation
     */
    static createProgressBar(percentage, label = '') {
        const safePercentage = Math.max(0, Math.min(100, percentage || 0));

        return `
            <div class="progress-container">
                ${label ? `<div class="progress-label">${this.escapeHtml(label)}</div>` : ''}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${safePercentage}%;"></div>
                </div>
                <div class="progress-percentage">${safePercentage}%</div>
            </div>
        `;
    }

    /**
     * Create chart placeholder
     */
    static createChartPlaceholder(title, description) {
        return `
            <div class="chart-placeholder">
                <div style="font-size: 3rem; margin-bottom: var(--space-4); opacity: 0.5;">📊</div>
                <h4>${this.escapeHtml(title)}</h4>
                <p>${this.escapeHtml(description)}</p>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS attacks
     */
    static escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Debounce function for search inputs
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function for scroll events
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Get relative time string
     */
    static getRelativeTime(date) {
        try {
            const now = new Date();
            const targetDate = new Date(date);

            if (isNaN(targetDate.getTime())) {
                return 'Invalid date';
            }

            const diffTime = targetDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays > 0) return `In ${diffDays} days`;
            if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

            return 'Unknown';
        } catch (error) {
            console.warn('Error calculating relative time:', error);
            return 'Unknown';
        }
    }

    /**
     * Setup modal backdrop click handler
     */
    static setupModalBackdropClose(modalId, closeCallback) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id '${modalId}' not found`);
            return;
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCallback();
            }
        });
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate random ID
     */
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Create image with fallback
     */
    static createImageWithFallback(src, alt, fallbackIcon = '🖼️') {
        return `
            <img src="${src}" 
                 alt="${this.escapeHtml(alt)}" 
                 loading="lazy"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                 style="width: 100%; height: 100%; object-fit: cover;">
            <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--gray-100); color: var(--gray-400); font-size: 2rem;">
                ${fallbackIcon}
            </div>
        `;
    }

    /**
     * Animate element entrance
     */
    static animateIn(element, animation = 'fadeIn', delay = 0) {
        if (!element) return;

        setTimeout(() => {
            element.classList.add('animate__animated', `animate__${animation}`);
        }, delay);
    }

    /**
     * Animate element exit
     */
    static animateOut(element, animation = 'fadeOut', callback = null) {
        if (!element) return;

        element.classList.add('animate__animated', `animate__${animation}`);
        element.addEventListener('animationend', () => {
            if (callback) callback();
        }, { once: true });
    }
}

// Export for global use
window.TravelComponents = TravelComponents;