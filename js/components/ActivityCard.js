/**
 * Travel Itinerary Manager - Activity Card Component
 * Reusable component for displaying individual activities
 */

import { Utils } from '../core/utils.js';
import { EventManager } from '../core/events.js';
import { EVENTS, TRANSPORT_MODES } from '../core/constants.js';

export class ActivityCard extends EventManager {
    constructor(activity, options = {}) {
        super();

        this.activity = activity;
        this.options = {
            editable: options.editable !== false,
            compact: options.compact || false,
            showActions: options.showActions !== false,
            showDetails: options.showDetails !== false,
            showNotes: options.showNotes !== false,
            className: options.className || '',
            interactive: options.interactive !== false,
            ...options
        };

        this.element = null;
        this.isSelected = false;
        this.isExpanded = false;

        this.init();
    }

    /**
     * Initialize the activity card
     */
    init() {
        this.createElement();
        this.setupEventListeners();
        this.render();
    }

    /**
     * Create the card DOM element
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.className = this.getCardClasses();
        this.element.dataset.activityId = this.activity.id;
        this.element.setAttribute('role', 'article');
        this.element.setAttribute('aria-label', `Activity: ${this.activity.activity}`);
    }

    /**
     * Get card CSS classes
     * @returns {string} CSS classes
     */
    getCardClasses() {
        const classes = ['activity-card'];

        if (this.options.compact) classes.push('compact');
        if (this.options.interactive) classes.push('interactive');
        if (this.isSelected) classes.push('selected');
        if (this.isExpanded) classes.push('expanded');
        if (this.activity.isBooked()) classes.push('booked');
        if (this.activity.isHighCost()) classes.push('high-cost');
        if (this.activity.isToday()) classes.push('today');
        if (this.activity.isPast()) classes.push('past');
        if (this.activity.isUpcoming()) classes.push('upcoming');
        if (this.options.className) classes.push(this.options.className);

        return classes.join(' ');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.element) return;

        // Card interaction events
        if (this.options.interactive) {
            this.element.addEventListener('click', this.handleCardClick.bind(this));
            this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
            this.element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
            this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        }

        // Action button events
        const editBtn = this.element.querySelector('.action-edit');
        const deleteBtn = this.element.querySelector('.action-delete');
        const duplicateBtn = this.element.querySelector('.action-duplicate');
        const expandBtn = this.element.querySelector('.action-expand');

        if (editBtn) {
            editBtn.addEventListener('click', this.handleEdit.bind(this));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', this.handleDelete.bind(this));
        }

        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', this.handleDuplicate.bind(this));
        }

        if (expandBtn) {
            expandBtn.addEventListener('click', this.handleToggleExpand.bind(this));
        }

        // Booking status toggle
        const bookingToggle = this.element.querySelector('.booking-toggle');
        if (bookingToggle) {
            bookingToggle.addEventListener('click', this.handleBookingToggle.bind(this));
        }
    }

    /**
     * Render the card content
     */
    render() {
        if (!this.element) return;

        this.element.innerHTML = this.generateHTML();
        this.element.className = this.getCardClasses();

        // Re-setup event listeners after re-render
        this.setupEventListeners();

        this.emit(EVENTS.CARD_RENDERED, { card: this, activity: this.activity });
    }

    /**
     * Generate the card HTML
     * @returns {string} Card HTML
     */
    generateHTML() {
        return `
            ${this.renderHeader()}
            ${this.options.showDetails ? this.renderDetails() : ''}
            ${this.options.showNotes ? this.renderNotes() : ''}
            ${this.renderFooter()}
            ${this.renderProgressIndicator()}
        `;
    }

    /**
     * Render card header
     * @returns {string} Header HTML
     */
    renderHeader() {
        return `
            <div class="activity-header">
                <div class="activity-main">
                    <div class="activity-title-section">
                        <h3 class="activity-title">${Utils.escapeHtml(this.activity.activity)}</h3>
                        ${this.renderPriorityBadge()}
                        ${this.renderCategoryBadge()}
                    </div>
                    <div class="activity-meta">
                        ${this.renderTimeInfo()}
                        ${this.renderLocationInfo()}
                    </div>
                </div>
                ${this.options.showActions ? this.renderActions() : ''}
            </div>
        `;
    }

    /**
     * Render time information
     * @returns {string} Time HTML
     */
    renderTimeInfo() {
        const timeInfo = [];

        if (this.activity.date) {
            timeInfo.push(`
                <div class="time-item">
                    <span class="time-icon">📅</span>
                    <span class="time-text">${Utils.formatDate(this.activity.date, {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            })}</span>
                </div>
            `);
        }

        if (this.activity.startTime) {
            const duration = this.activity.getDuration();
            timeInfo.push(`
                <div class="time-item">
                    <span class="time-icon">🕐</span>
                    <span class="time-text">
                        ${Utils.formatTime(this.activity.startTime)}
                        ${this.activity.endTime ? ` - ${Utils.formatTime(this.activity.endTime)}` : ''}
                        ${duration ? ` (${this.activity.getFormattedDuration()})` : ''}
                    </span>
                </div>
            `);
        }

        return timeInfo.length > 0 ? `
            <div class="activity-time">
                ${timeInfo.join('')}
            </div>
        ` : '';
    }

    /**
     * Render location information
     * @returns {string} Location HTML
     */
    renderLocationInfo() {
        if (!this.activity.startFrom && !this.activity.reachTo) return '';

        return `
            <div class="activity-location">
                ${this.activity.startFrom ? `
                    <div class="location-item">
                        <span class="location-icon">📍</span>
                        <span class="location-text">From: ${Utils.escapeHtml(this.activity.startFrom)}</span>
                    </div>
                ` : ''}
                ${this.activity.reachTo ? `
                    <div class="location-item">
                        <span class="location-icon">🎯</span>
                        <span class="location-text">To: ${Utils.escapeHtml(this.activity.reachTo)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render priority badge
     * @returns {string} Priority badge HTML
     */
    renderPriorityBadge() {
        if (!this.activity.priority || this.activity.priority === 'normal') return '';

        return `
            <span class="priority-badge priority-${this.activity.priority}" title="Priority: ${Utils.capitalize(this.activity.priority)}">
                ${this.activity.getPriorityIcon()}
            </span>
        `;
    }

    /**
     * Render category badge
     * @returns {string} Category badge HTML
     */
    renderCategoryBadge() {
        if (!this.activity.category || this.activity.category === 'other') return '';

        return `
            <span class="category-badge category-${this.activity.category}" title="Category: ${Utils.capitalize(this.activity.category)}">
                ${this.getCategoryIcon(this.activity.category)}
            </span>
        `;
    }

    /**
     * Render action buttons
     * @returns {string} Actions HTML
     */
    renderActions() {
        const actions = [];

        if (this.options.editable) {
            actions.push(`
                <button class="action-btn action-edit" title="Edit activity" aria-label="Edit ${this.activity.activity}">
                    <span class="action-icon">✏️</span>
                </button>
            `);

            actions.push(`
                <button class="action-btn action-duplicate" title="Duplicate activity" aria-label="Duplicate ${this.activity.activity}">
                    <span class="action-icon">📋</span>
                </button>
            `);

            actions.push(`
                <button class="action-btn action-delete" title="Delete activity" aria-label="Delete ${this.activity.activity}">
                    <span class="action-icon">🗑️</span>
                </button>
            `);
        }

        if (this.options.showDetails) {
            actions.push(`
                <button class="action-btn action-expand" title="${this.isExpanded ? 'Collapse' : 'Expand'} details" aria-label="${this.isExpanded ? 'Collapse' : 'Expand'} details">
                    <span class="action-icon">${this.isExpanded ? '🔼' : '🔽'}</span>
                </button>
            `);
        }

        return actions.length > 0 ? `
            <div class="activity-actions">
                ${actions.join('')}
            </div>
        ` : '';
    }

    /**
     * Render activity details
     * @returns {string} Details HTML
     */
    renderDetails() {
        const details = [];

        // Transport information
        if (this.activity.transportMode) {
            details.push(`
                <div class="detail-item transport-detail">
                    <span class="detail-icon">${Utils.getTransportIcon(this.activity.transportMode)}</span>
                    <span class="detail-label">Transport:</span>
                    <span class="detail-value">${this.activity.transportMode}</span>
                </div>
            `);
        }

        // Cost information
        if (this.activity.cost > 0) {
            details.push(`
                <div class="detail-item cost-detail">
                    <span class="detail-icon">💰</span>
                    <span class="detail-label">Cost:</span>
                    <span class="detail-value cost-display">${Utils.formatCurrency(this.activity.cost)}</span>
                    ${this.activity.isHighCost() ? '<span class="high-cost-indicator">🔥</span>' : ''}
                </div>
            `);
        }

        // Booking status with toggle
        details.push(`
            <div class="detail-item booking-detail">
                <span class="detail-icon">${this.activity.isBooked() ? '✅' : '❌'}</span>
                <span class="detail-label">Booking:</span>
                <button class="booking-toggle ${this.activity.isBooked() ? 'booked' : 'not-booked'}" 
                        ${this.options.editable ? '' : 'disabled'}
                        title="Toggle booking status">
                    <span class="booking-status">${this.activity.isBooked() ? 'Booked' : 'Not Booked'}</span>
                </button>
            </div>
        `);

        // Status information
        if (this.activity.status && this.activity.status !== 'planned') {
            details.push(`
                <div class="detail-item status-detail">
                    <span class="detail-icon">${this.activity.getStatusIcon()}</span>
                    <span class="detail-label">Status:</span>
                    <span class="detail-value status-${this.activity.status}">${Utils.capitalize(this.activity.status)}</span>
                </div>
            `);
        }

        // Tags
        if (this.activity.tags && this.activity.tags.length > 0) {
            details.push(`
                <div class="detail-item tags-detail">
                    <span class="detail-icon">🏷️</span>
                    <span class="detail-label">Tags:</span>
                    <div class="tag-list">
                        ${this.activity.tags.map(tag => `
                            <span class="tag">${Utils.escapeHtml(tag)}</span>
                        `).join('')}
                    </div>
                </div>
            `);
        }

        return details.length > 0 ? `
            <div class="activity-details ${this.isExpanded ? 'expanded' : 'collapsed'}">
                ${details.join('')}
            </div>
        ` : '';
    }

    /**
     * Render notes section
     * @returns {string} Notes HTML
     */
    renderNotes() {
        const notes = [];

        if (this.activity.additionalDetails) {
            notes.push(`
                <div class="note-item additional-details">
                    <div class="note-header">
                        <span class="note-icon">📝</span>
                        <span class="note-label">Notes</span>
                    </div>
                    <div class="note-content">${Utils.escapeHtml(this.activity.additionalDetails)}</div>
                </div>
            `);
        }

        if (this.activity.accommodationDetails) {
            notes.push(`
                <div class="note-item accommodation-details">
                    <div class="note-header">
                        <span class="note-icon">🏨</span>
                        <span class="note-label">Accommodation</span>
                    </div>
                    <div class="note-content">${Utils.escapeHtml(this.activity.accommodationDetails)}</div>
                </div>
            `);
        }

        return notes.length > 0 ? `
            <div class="activity-notes ${this.isExpanded ? 'expanded' : 'collapsed'}">
                ${notes.join('')}
            </div>
        ` : '';
    }

    /**
     * Render card footer
     * @returns {string} Footer HTML
     */
    renderFooter() {
        const footerItems = [];

        // Relative time
        footerItems.push(`
            <div class="footer-item relative-time">
                <span class="relative-time-text">${this.activity.getRelativeTime()}</span>
            </div>
        `);

        // Last updated
        if (this.activity.updatedAt) {
            const updatedDate = new Date(this.activity.updatedAt);
            footerItems.push(`
                <div class="footer-item last-updated" title="Last updated: ${updatedDate.toLocaleString()}">
                    <span class="update-icon">🔄</span>
                    <span class="update-text">${Utils.getRelativeTime(updatedDate)}</span>
                </div>
            `);
        }

        return footerItems.length > 0 ? `
            <div class="activity-footer">
                ${footerItems.join('')}
            </div>
        ` : '';
    }

    /**
     * Render progress indicator
     * @returns {string} Progress indicator HTML
     */
    renderProgressIndicator() {
        if (this.options.compact) return '';

        let progress = 0;
        const factors = [];

        // Calculate completion based on various factors
        if (this.activity.isBooked()) {
            progress += 40;
            factors.push('Booked');
        }

        if (this.activity.accommodationDetails) {
            progress += 20;
            factors.push('Accommodation set');
        }

        if (this.activity.transportMode) {
            progress += 20;
            factors.push('Transport planned');
        }

        if (this.activity.startTime && this.activity.endTime) {
            progress += 10;
            factors.push('Time scheduled');
        }

        if (this.activity.additionalDetails) {
            progress += 10;
            factors.push('Details added');
        }

        return `
            <div class="activity-progress" title="Completion: ${progress}% (${factors.join(', ')})">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-text">${progress}%</div>
            </div>
        `;
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
     * Event Handlers
     */

    handleCardClick(e) {
        // Prevent action if clicking on interactive elements
        if (e.target.closest('.action-btn, .booking-toggle, a, button')) {
            return;
        }

        this.toggleSelection();
        this.emit(EVENTS.CARD_CLICKED, { card: this, activity: this.activity, event: e });
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.handleCardClick(e);
                break;
            case 'e':
            case 'E':
                if (this.options.editable) {
                    e.preventDefault();
                    this.handleEdit(e);
                }
                break;
            case 'Delete':
            case 'Backspace':
                if (this.options.editable && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.handleDelete(e);
                }
                break;
        }
    }

    handleMouseEnter(e) {
        this.element.classList.add('hovered');
        this.emit(EVENTS.CARD_HOVER_START, { card: this, activity: this.activity, event: e });
    }

    handleMouseLeave(e) {
        this.element.classList.remove('hovered');
        this.emit(EVENTS.CARD_HOVER_END, { card: this, activity: this.activity, event: e });
    }

    handleEdit(e) {
        e.stopPropagation();
        this.emit(EVENTS.CARD_EDIT_REQUESTED, { card: this, activity: this.activity, event: e });
    }

    handleDelete(e) {
        e.stopPropagation();
        this.emit(EVENTS.CARD_DELETE_REQUESTED, { card: this, activity: this.activity, event: e });
    }

    handleDuplicate(e) {
        e.stopPropagation();
        this.emit(EVENTS.CARD_DUPLICATE_REQUESTED, { card: this, activity: this.activity, event: e });
    }

    handleToggleExpand(e) {
        e.stopPropagation();
        this.toggleExpanded();
    }

    handleBookingToggle(e) {
        e.stopPropagation();

        if (!this.options.editable) return;

        const newBookingStatus = this.activity.isBooked() ? 'FALSE' : 'TRUE';

        this.emit(EVENTS.CARD_BOOKING_TOGGLE, {
            card: this,
            activity: this.activity,
            newStatus: newBookingStatus,
            event: e
        });
    }

    /**
     * Public Methods
     */

    /**
     * Update the activity data and re-render
     * @param {ActivityModel} newActivity - Updated activity
     */
    updateActivity(newActivity) {
        this.activity = newActivity;
        this.render();
        this.emit(EVENTS.CARD_UPDATED, { card: this, activity: this.activity });
    }

    /**
     * Toggle card selection
     */
    toggleSelection() {
        this.isSelected = !this.isSelected;
        this.element.classList.toggle('selected', this.isSelected);
        this.emit(EVENTS.CARD_SELECTION_CHANGED, {
            card: this,
            activity: this.activity,
            isSelected: this.isSelected
        });
    }

    /**
     * Set selection state
     * @param {boolean} selected - Selection state
     */
    setSelected(selected) {
        this.isSelected = selected;
        this.element.classList.toggle('selected', selected);
    }

    /**
     * Toggle expanded state
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.element.classList.toggle('expanded', this.isExpanded);

        // Update details and notes visibility
        const details = this.element.querySelector('.activity-details');
        const notes = this.element.querySelector('.activity-notes');

        if (details) {
            details.classList.toggle('expanded', this.isExpanded);
            details.classList.toggle('collapsed', !this.isExpanded);
        }

        if (notes) {
            notes.classList.toggle('expanded', this.isExpanded);
            notes.classList.toggle('collapsed', !this.isExpanded);
        }

        // Update expand button icon
        const expandBtn = this.element.querySelector('.action-expand .action-icon');
        if (expandBtn) {
            expandBtn.textContent = this.isExpanded ? '🔼' : '🔽';
        }

        this.emit(EVENTS.CARD_EXPAND_TOGGLE, {
            card: this,
            activity: this.activity,
            isExpanded: this.isExpanded
        });
    }

    /**
     * Set expanded state
     * @param {boolean} expanded - Expanded state
     */
    setExpanded(expanded) {
        if (this.isExpanded !== expanded) {
            this.toggleExpanded();
        }
    }

    /**
     * Highlight the card temporarily
     * @param {number} duration - Highlight duration in ms
     */
    highlight(duration = 2000) {
        this.element.classList.add('highlighted');

        setTimeout(() => {
            this.element.classList.remove('highlighted');
        }, duration);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.element.classList.add('loading');

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Updating...</span>
        `;

        this.element.appendChild(overlay);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.element.classList.remove('loading');

        const overlay = this.element.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Animate card entrance
     */
    animateIn() {
        this.element.style.opacity = '0';
        this.element.style.transform = 'translateY(20px)';

        requestAnimationFrame(() => {
            this.element.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
            this.element.style.opacity = '1';
            this.element.style.transform = 'translateY(0)';
        });
    }

    /**
     * Animate card exit
     * @returns {Promise} Animation promise
     */
    animateOut() {
        return new Promise(resolve => {
            this.element.style.transition = 'opacity 300ms ease-in, transform 300ms ease-in';
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(-20px)';

            setTimeout(resolve, 300);
        });
    }

    /**
     * Get card element
     * @returns {HTMLElement} Card element
     */
    getElement() {
        return this.element;
    }

    /**
     * Get activity data
     * @returns {ActivityModel} Activity data
     */
    getActivity() {
        return this.activity;
    }

    /**
     * Check if card is selected
     * @returns {boolean} Selection state
     */
    getSelected() {
        return this.isSelected;
    }

    /**
     * Check if card is expanded
     * @returns {boolean} Expanded state
     */
    getExpanded() {
        return this.isExpanded;
    }

    /**
     * Dispose of the card and clean up
     */
    dispose() {
        // Remove event listeners
        this.removeAllListeners();

        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // Clean up references
        this.element = null;
        this.activity = null;
    }
}

/**
 * Factory function for creating activity cards
 * @param {ActivityModel} activity - Activity data
 * @param {object} options - Card options
 * @returns {ActivityCard} Activity card instance
 */
export function createActivityCard(activity, options = {}) {
    return new ActivityCard(activity, options);
}

/**
 * Utility function to create multiple cards
 * @param {Array<ActivityModel>} activities - Array of activities
 * @param {object} options - Card options
 * @returns {Array<ActivityCard>} Array of activity cards
 */
export function createActivityCards(activities, options = {}) {
    return activities.map(activity => new ActivityCard(activity, options));
}