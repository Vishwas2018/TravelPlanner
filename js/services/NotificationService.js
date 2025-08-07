/**
 * Travel Itinerary Manager - Optimized Notification Service
 */

import { Utils } from '../core/utils.js';
import { NOTIFICATION_TYPES } from '../core/constants.js';

export class NotificationService {
    constructor() {
        this.notifications = new Map();
        this.queue = [];
        this.maxVisible = 5;
        this.defaultDuration = 4000;
        this.container = null;
        this.init();
    }

    init() {
        this.createContainer();
        this.addStyles();
    }

    createContainer() {
        this.container = document.getElementById('notificationContainer') ||
            this.createContainerElement();
    }

    createContainerElement() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    addStyles() {
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
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                border-left: 4px solid var(--primary, #667eea);
                min-width: 300px;
                max-width: 500px;
                transition: all 200ms ease-in-out;
                pointer-events: auto;
                animation: slideInRight 300ms ease-out;
            }
            
            .notification.success { border-left-color: #48bb78; }
            .notification.error { border-left-color: #f56565; }
            .notification.warning { border-left-color: #ed8936; }
            .notification.info { border-left-color: #4299e1; }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
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
            }
            
            .notification-close:hover { color: #4a5568; }
            
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
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

    show(message, type = NOTIFICATION_TYPES.INFO, options = {}) {
        if (!message) return null;

        const notification = {
            id: Utils.generateId(),
            message: Utils.escapeHtml(message),
            type,
            duration: options.duration || this.defaultDuration,
            persistent: options.persistent || false,
            onClose: options.onClose || null,
            createdAt: Date.now()
        };

        if (this.notifications.size >= this.maxVisible) {
            this.queue.push(notification);
            return notification.id;
        }

        this.display(notification);
        return notification.id;
    }

    success(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.SUCCESS, options);
    }

    error(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.ERROR, {
            duration: 6000, ...options
        });
    }

    warning(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.WARNING, {
            duration: 5000, ...options
        });
    }

    info(message, options = {}) {
        return this.show(message, NOTIFICATION_TYPES.INFO, options);
    }

    display(notification) {
        const element = this.createNotificationElement(notification);

        this.notifications.set(notification.id, { ...notification, element });
        this.container.appendChild(element);

        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => this.remove(notification.id), notification.duration);
        }
    }

    createNotificationElement(notification) {
        const icons = {
            [NOTIFICATION_TYPES.SUCCESS]: '✅',
            [NOTIFICATION_TYPES.ERROR]: '❌',
            [NOTIFICATION_TYPES.WARNING]: '⚠️',
            [NOTIFICATION_TYPES.INFO]: 'ℹ️'
        };

        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[notification.type]}</span>
                <div class="notification-message">${notification.message}</div>
                ${!notification.persistent ? '<button class="notification-close">×</button>' : ''}
            </div>
        `;

        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(notification.id));
        }

        return element;
    }

    remove(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return false;

        const { element, onClose } = notification;

        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }

        this.notifications.delete(notificationId);

        if (onClose) {
            try {
                onClose();
            } catch (error) {
                console.error('Error in notification onClose callback:', error);
            }
        }

        this.processQueue();
        return true;
    }

    processQueue() {
        if (this.queue.length === 0 || this.notifications.size >= this.maxVisible) return;

        const notification = this.queue.shift();
        this.display(notification);

        setTimeout(() => this.processQueue(), 100);
    }

    confirm(message, options = {}) {
        const { onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' } = options;

        return this.show(message, NOTIFICATION_TYPES.WARNING, {
            persistent: true,
            duration: 0
        });
    }

    removeAll() {
        Array.from(this.notifications.keys()).forEach(id => this.remove(id));
        this.queue = [];
    }

    dispose() {
        this.removeAll();
        if (this.container?.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

export const notificationService = new NotificationService();