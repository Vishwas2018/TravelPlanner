/**
 * Travel Itinerary Manager - Notification Service
 * Centralized notification management with queuing and positioning
 */

import { Utils } from '../core/utils.js';
import { NOTIFICATION_TYPES, ANIMATION_DURATIONS } from '../core/constants.js';

export class NotificationService {
    constructor() {
        this.notifications = new Map();
        this.queue = [];
        this.maxVisible = 5;
        this.defaultDuration = 4000;
        this.container = null;
        this.isProcessingQueue = false;

        this.init();
    }

    /**
     * Initialize notification container
     */
    init() {
        this.createContainer();
        this.setupStyles();
    }

    /**
     * Create notification container if it doesn't exist
     */
    createContainer() {
        this.container = document.getElementById('notificationContainer');

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Setup notification styles
     */
    setupStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 2000;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                pointer-events: none;
            }

            .notification {
                background: white;
                border-radius: 0.75rem;
                padding: 1rem 1.5rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border-left: 4px solid var(--primary, #667eea);
                min-width: 300px;
                max-width: 500px;
                transition: all 200ms ease-in-out;
                pointer-events: auto;
                position: relative;
                overflow: hidden;
            }

            .notification::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, var(--primary, #667eea) 0%, var(--secondary, #764ba2) 100%);
                opacity: 0.03;
                pointer-events: none;
            }

            .notification.success { border-left-color: #48bb78; }
            .notification.error { border-left-color: #f56565; }
            .notification.warning { border-left-color: #ed8936; }
            .notification.info { border-left-color: #4299e1; }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                position: relative;
                z-index: 1;
            }

            .notification-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            .notification-message {
                flex: 1;
                font-size: 0.875rem;
                line-height: 1.5;
            }

            .notification-close {
                background: none;
                border: none;
                color: #718096;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 0.25rem;
                transition: color 200ms ease-in-out;
                margin-left: 0.5rem;
            }

            .notification-close:hover {
                color: #4a5568;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(0, 0, 0, 0.1);
                transition: width linear;
            }

            .notification.slide-in {
                animation: slideInRight 300ms ease-out;
            }

            .notification.slide-out {
                animation: slideOutRight 300ms ease-in;
            }

            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }

            @media (max-width: 640px) {
                .notification-container {
                    top: 0.5rem;
                    right: 0.5rem;
                    left: 0.5rem;
                }

                .notification {
                    min-width: unset;
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    show(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
        if (!message || typeof message !== 'string') {
            console.warn('Invalid notification message');
            return null;
        }

        const notification = {
            id: Utils.generateId(),
            message: Utils.escapeHtml(message),
            type,
            duration: options.duration || this.defaultDuration,
            persistent: options.persistent || false,
            actions: options.actions || [],
            onClose: options.onClose || null,
            createdAt: Date.now()
        };

        // Add to queue if too many visible
        if (this.notifications.size >= this.maxVisible) {
            this.queue.push(notification);
            return notification.id;
        }

        this.display(notification);
        return notification.id;
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    success(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.SUCCESS, options);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    error(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.ERROR, {
            duration: 6000, // Longer duration for errors
            ...options
        });
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    warning(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.WARNING, {
            duration: 5000,
            ...options
        });
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    info(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.INFO, options);
    }

    /**
     * Display notification in DOM
     * @param {object} notification - Notification data
     */
    display(notification) {
        const element = this.createNotificationElement(notification);

        // Add to tracking
        this.notifications.set(notification.id, {
            ...notification,
            element
        });

        // Add to container
        this.container.appendChild(element);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            element.classList.add('slide-in');
        });

        // Setup auto-removal if not persistent
        if (!notification.persistent && notification.duration > 0) {
            this.setupAutoRemoval(notification.id, notification.duration);
        }

        // Setup progress bar
        if (notification.duration > 0) {
            this.setupProgressBar(element, notification.duration);
        }
    }

    /**
     * Create notification DOM element
     * @param {object} notification - Notification data
     * @returns {HTMLElement} Notification element
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.dataset.notificationId = notification.id;

        const icons = {
            [NOTIFICATION_TYPES.SUCCESS]: '✅',
            [NOTIFICATION_TYPES.ERROR]: '❌',
            [NOTIFICATION_TYPES.WARNING]: '⚠️',
            [NOTIFICATION_TYPES.INFO]: 'ℹ️'
        };

        const icon = icons[notification.type] || icons[NOTIFICATION_TYPES.INFO];

        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <div class="notification-message">${notification.message}</div>
                ${!notification.persistent ? '<button class="notification-close">×</button>' : ''}
            </div>
            ${notification.duration > 0 ? '<div class="notification-progress"></div>' : ''}
        `;

        // Setup close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.remove(notification.id);
            });
        }

        // Setup action buttons
        if (notification.actions && notification.actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'notification-actions';
            actionsContainer.style.cssText = `
                margin-top: 0.75rem;
                display: flex;
                gap: 0.5rem;
            `;

            notification.actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.label;
                button.className = 'btn btn-sm';
                button.style.cssText = `
                    padding: 0.25rem 0.75rem;
                    font-size: 0.75rem;
                    border: 1px solid currentColor;
                    background: transparent;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    transition: all 200ms ease-in-out;
                `;

                button.addEventListener('click', () => {
                    if (action.handler) {
                        action.handler();
                    }
                    if (action.dismissOnClick !== false) {
                        this.remove(notification.id);
                    }
                });

                actionsContainer.appendChild(button);
            });

            element.querySelector('.notification-content').appendChild(actionsContainer);
        }

        return element;
    }

    /**
     * Setup auto-removal timer
     * @param {string} notificationId - Notification ID
     * @param {number} duration - Duration in milliseconds
     */
    setupAutoRemoval(notificationId, duration) {
        setTimeout(() => {
            this.remove(notificationId);
        }, duration);
    }

    /**
     * Setup progress bar animation
     * @param {HTMLElement} element - Notification element
     * @param {number} duration - Duration in milliseconds
     */
    setupProgressBar(element, duration) {
        const progressBar = element.querySelector('.notification-progress');
        if (!progressBar) return;

        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${duration}ms linear`;

        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }

    /**
     * Remove notification
     * @param {string} notificationId - Notification ID
     * @returns {boolean} Success status
     */
    remove(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return false;

        const { element, onClose } = notification;

        // Trigger exit animation
        element.classList.remove('slide-in');
        element.classList.add('slide-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }

            // Remove from tracking
            this.notifications.delete(notificationId);

            // Call onClose callback
            if (onClose && typeof onClose === 'function') {
                try {
                    onClose();
                } catch (error) {
                    console.error('Error in notification onClose callback:', error);
                }
            }

            // Process queue
            this.processQueue();
        }, ANIMATION_DURATIONS.NORMAL);

        return true;
    }

    /**
     * Remove all notifications
     */
    removeAll() {
        const notificationIds = Array.from(this.notifications.keys());
        notificationIds.forEach(id => this.remove(id));
        this.queue = [];
    }

    /**
     * Remove notifications by type
     * @param {string} type - Notification type to remove
     */
    removeByType(type) {
        const notificationIds = Array.from(this.notifications.values())
            .filter(notification => notification.type === type)
            .map(notification => notification.id);

        notificationIds.forEach(id => this.remove(id));
    }

    /**
     * Process notification queue
     */
    processQueue() {
        if (this.isProcessingQueue || this.queue.length === 0) return;
        if (this.notifications.size >= this.maxVisible) return;

        this.isProcessingQueue = true;

        const notification = this.queue.shift();
        this.display(notification);

        this.isProcessingQueue = false;

        // Continue processing if there are more in queue
        setTimeout(() => {
            this.processQueue();
        }, 100);
    }

    /**
     * Update existing notification
     * @param {string} notificationId - Notification ID
     * @param {object} updates - Updates to apply
     * @returns {boolean} Success status
     */
    update(notificationId, updates) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return false;

        const { element } = notification;

        // Update message
        if (updates.message) {
            const messageEl = element.querySelector('.notification-message');
            if (messageEl) {
                messageEl.textContent = Utils.escapeHtml(updates.message);
                notification.message = updates.message;
            }
        }

        // Update type
        if (updates.type && updates.type !== notification.type) {
            element.className = `notification ${updates.type}`;
            notification.type = updates.type;

            // Update icon
            const iconEl = element.querySelector('.notification-icon');
            if (iconEl) {
                const icons = {
                    [NOTIFICATION_TYPES.SUCCESS]: '✅',
                    [NOTIFICATION_TYPES.ERROR]: '❌',
                    [NOTIFICATION_TYPES.WARNING]: '⚠️',
                    [NOTIFICATION_TYPES.INFO]: 'ℹ️'
                };
                iconEl.textContent = icons[updates.type] || icons[NOTIFICATION_TYPES.INFO];
            }
        }

        return true;
    }

    /**
     * Show loading notification
     * @param {string} message - Loading message
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    loading(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.INFO, {
            persistent: true,
            duration: 0,
            ...options
        });
    }

    /**
     * Show confirmation notification with actions
     * @param {string} message - Confirmation message
     * @param {object} options - Options with confirm/cancel handlers
     * @returns {string} Notification ID
     */
    confirm(message, options = {}) {
        const { onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' } = options;

        return this.show(message, NOTIFICATION_TYPES.WARNING, {
            persistent: true,
            actions: [
                {
                    label: confirmText,
                    handler: () => {
                        if (onConfirm) onConfirm();
                    }
                },
                {
                    label: cancelText,
                    handler: () => {
                        if (onCancel) onCancel();
                    }
                }
            ]
        });
    }

    /**
     * Show progress notification
     * @param {string} message - Progress message
     * @param {number} progress - Progress percentage (0-100)
     * @param {object} options - Additional options
     * @returns {string} Notification ID
     */
    progress(message, progress = 0, options = {}) {
        const notificationId = this.show(message, NOTIFICATION_TYPES.INFO, {
            persistent: true,
            duration: 0,
            ...options
        });

        this.updateProgress(notificationId, progress);
        return notificationId;
    }

    /**
     * Update progress notification
     * @param {string} notificationId - Notification ID
     * @param {number} progress - Progress percentage
     * @param {string} message - Optional message update
     */
    updateProgress(notificationId, progress, message = null) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        const { element } = notification;

        // Update message if provided
        if (message) {
            this.update(notificationId, { message });
        }

        // Update or create progress bar
        let progressBar = element.querySelector('.notification-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'notification-progress';
            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: linear-gradient(135deg, var(--primary, #667eea) 0%, var(--secondary, #764ba2) 100%);
                transition: width 200ms ease-out;
                border-radius: 0 0 0.75rem 0.75rem;
            `;
            element.appendChild(progressBar);
        }

        progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;

        // Auto-remove when complete
        if (progress >= 100) {
            setTimeout(() => {
                this.remove(notificationId);
            }, 1000);
        }
    }

    /**
     * Show batch notifications for multiple operations
     * @param {Array} items - Array of items to process
     * @param {Function} processor - Function to process each item
     * @param {object} options - Batch options
     * @returns {Promise} Processing promise
     */
    async batch(items, processor, options = {}) {
        const {
            title = 'Processing items...',
            successMessage = 'All items processed successfully',
            errorMessage = 'Some items failed to process'
        } = options;

        const progressId = this.progress(title, 0);
        const results = { success: 0, failed: 0, errors: [] };

        try {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const progress = Math.round(((i + 1) / items.length) * 100);

                try {
                    await processor(item, i);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({ item, error: error.message });
                    console.error('Batch processing error:', error);
                }

                this.updateProgress(progressId, progress,
                    `${title} (${i + 1}/${items.length})`);

                // Small delay to prevent blocking
                if (i % 10 === 0) {
                    await Utils.delay(10);
                }
            }

            // Show final result
            setTimeout(() => {
                if (results.failed === 0) {
                    this.success(successMessage);
                } else {
                    this.warning(`${successMessage} (${results.failed} failed)`);
                }
            }, 1200);

            return results;
        } catch (error) {
            this.remove(progressId);
            this.error(errorMessage);
            throw error;
        }
    }

    /**
     * Get notification count by type
     * @param {string} type - Notification type
     * @returns {number} Count
     */
    getCount(type = null) {
        if (!type) return this.notifications.size;

        return Array.from(this.notifications.values())
            .filter(notification => notification.type === type)
            .length;
    }

    /**
     * Check if notification exists
     * @param {string} notificationId - Notification ID
     * @returns {boolean} Exists
     */
    exists(notificationId) {
        return this.notifications.has(notificationId);
    }

    /**
     * Set maximum visible notifications
     * @param {number} max - Maximum count
     */
    setMaxVisible(max) {
        this.maxVisible = Math.max(1, max);
    }

    /**
     * Set default duration
     * @param {number} duration - Duration in milliseconds
     */
    setDefaultDuration(duration) {
        this.defaultDuration = Math.max(0, duration);
    }

    /**
     * Get all active notifications
     * @returns {Array} Active notifications
     */
    getActive() {
        return Array.from(this.notifications.values());
    }

    /**
     * Clear expired notifications
     */
    clearExpired() {
        const now = Date.now();
        const toRemove = [];

        this.notifications.forEach((notification, id) => {
            if (!notification.persistent &&
                notification.duration > 0 &&
                (now - notification.createdAt) > notification.duration) {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.remove(id));
    }

    /**
     * Dispose of notification service
     */
    dispose() {
        this.removeAll();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        const styles = document.getElementById('notification-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }

        this.notifications.clear();
        this.queue = [];
    }
}

// Create global instance
export const notificationService = new NotificationService();