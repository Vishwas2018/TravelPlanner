/**
 * Travel Itinerary Manager - Event Management System
 * Provides pub/sub pattern for decoupled component communication
 */

import { Utils } from './utils.js';

export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.wildcardListeners = new Set();
        this.maxListeners = 100;
        this.debug = false;
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {object} options - Listener options
     * @returns {string} Listener ID for removal
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const listenerId = Utils.generateId();
        const listenerInfo = {
            id: listenerId,
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            once: false,
            addedAt: Date.now()
        };

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const eventListeners = this.listeners.get(event);

        // Check max listeners limit
        if (eventListeners.length >= this.maxListeners) {
            console.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${event}`);
        }

        eventListeners.push(listenerInfo);

        // Sort by priority (higher priority first)
        eventListeners.sort((a, b) => b.priority - a.priority);

        if (this.debug) {
            console.log(`Event listener added: ${event} (ID: ${listenerId})`);
        }

        return listenerId;
    }

    /**
     * Add one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {object} options - Listener options
     * @returns {string} Listener ID
     */
    once(event, callback, options = {}) {
        const listenerId = this.on(event, callback, options);

        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }

        this.onceListeners.get(event).add(listenerId);
        return listenerId;
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {string|Function} listenerOrCallback - Listener ID or callback function
     * @returns {boolean} Success status
     */
    off(event, listenerOrCallback) {
        if (!this.listeners.has(event)) return false;

        const eventListeners = this.listeners.get(event);
        let removed = false;

        if (typeof listenerOrCallback === 'string') {
            // Remove by listener ID
            const index = eventListeners.findIndex(l => l.id === listenerOrCallback);
            if (index !== -1) {
                eventListeners.splice(index, 1);
                removed = true;

                // Clean up once listeners
                if (this.onceListeners.has(event)) {
                    this.onceListeners.get(event).delete(listenerOrCallback);
                }
            }
        } else if (typeof listenerOrCallback === 'function') {
            // Remove by callback function
            const index = eventListeners.findIndex(l => l.callback === listenerOrCallback);
            if (index !== -1) {
                const listenerId = eventListeners[index].id;
                eventListeners.splice(index, 1);
                removed = true;

                // Clean up once listeners
                if (this.onceListeners.has(event)) {
                    this.onceListeners.get(event).delete(listenerId);
                }
            }
        }

        // Clean up empty arrays
        if (eventListeners.length === 0) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
        }

        if (this.debug && removed) {
            console.log(`Event listener removed: ${event}`);
        }

        return removed;
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @param {object} options - Emit options
     * @returns {Promise} Promise that resolves when all listeners complete
     */
    async emit(event, data = null, options = {}) {
        const eventInfo = {
            event,
            data,
            timestamp: Date.now(),
            preventDefault: false,
            stopPropagation: false
        };

        if (this.debug) {
            console.log(`Emitting event: ${event}`, data);
        }

        const promises = [];

        // Process exact event listeners
        if (this.listeners.has(event)) {
            const eventListeners = [...this.listeners.get(event)];

            for (const listenerInfo of eventListeners) {
                if (eventInfo.stopPropagation) break;

                try {
                    const result = this.executeListener(listenerInfo, eventInfo);

                    if (result instanceof Promise) {
                        promises.push(result);
                    }

                    // Handle once listeners
                    if (this.onceListeners.has(event) &&
                        this.onceListeners.get(event).has(listenerInfo.id)) {
                        this.off(event, listenerInfo.id);
                    }
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);

                    if (options.throwOnError) {
                        throw error;
                    }
                }
            }
        }

        // Process wildcard listeners
        for (const wildcardListener of this.wildcardListeners) {
            if (eventInfo.stopPropagation) break;

            try {
                const result = this.executeListener(wildcardListener, eventInfo);

                if (result instanceof Promise) {
                    promises.push(result);
                }
            } catch (error) {
                console.error(`Error in wildcard listener for ${event}:`, error);

                if (options.throwOnError) {
                    throw error;
                }
            }
        }

        // Wait for all async listeners
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }

        return eventInfo;
    }

    /**
     * Execute a single listener
     * @param {object} listenerInfo - Listener information
     * @param {object} eventInfo - Event information
     * @returns {any} Listener result
     */
    executeListener(listenerInfo, eventInfo) {
        const { callback, context } = listenerInfo;

        // Create event object
        const eventObj = {
            ...eventInfo,
            preventDefault: () => { eventInfo.preventDefault = true; },
            stopPropagation: () => { eventInfo.stopPropagation = true; }
        };

        // Execute with context if provided
        if (context) {
            return callback.call(context, eventObj);
        } else {
            return callback(eventObj);
        }
    }

    /**
     * Add wildcard listener (listens to all events)
     * @param {Function} callback - Callback function
     * @param {object} options - Listener options
     * @returns {string} Listener ID
     */
    onAny(callback, options = {}) {
        const listenerId = Utils.generateId();
        const listenerInfo = {
            id: listenerId,
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            addedAt: Date.now()
        };

        this.wildcardListeners.add(listenerInfo);

        if (this.debug) {
            console.log(`Wildcard listener added (ID: ${listenerId})`);
        }

        return listenerId;
    }

    /**
     * Remove wildcard listener
     * @param {string|Function} listenerOrCallback - Listener ID or callback
     * @returns {boolean} Success status
     */
    offAny(listenerOrCallback) {
        for (const listener of this.wildcardListeners) {
            if ((typeof listenerOrCallback === 'string' && listener.id === listenerOrCallback) ||
                (typeof listenerOrCallback === 'function' && listener.callback === listenerOrCallback)) {
                this.wildcardListeners.delete(listener);

                if (this.debug) {
                    console.log(`Wildcard listener removed (ID: ${listener.id})`);
                }

                return true;
            }
        }
        return false;
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name (optional)
     */
    removeAllListeners(event = null) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);

            if (this.debug) {
                console.log(`All listeners removed for event: ${event}`);
            }
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
            this.wildcardListeners.clear();

            if (this.debug) {
                console.log('All listeners removed');
            }
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }

    /**
     * Get all event names that have listeners
     * @returns {Array} Event names
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get listener information for debugging
     * @param {string} event - Event name (optional)
     * @returns {object} Listener information
     */
    getListenerInfo(event = null) {
        if (event) {
            return {
                event,
                listeners: this.listeners.has(event) ? this.listeners.get(event).length : 0,
                onceListeners: this.onceListeners.has(event) ? this.onceListeners.get(event).size : 0
            };
        }

        const info = {
            totalEvents: this.listeners.size,
            wildcardListeners: this.wildcardListeners.size,
            events: {}
        };

        for (const [eventName, listeners] of this.listeners.entries()) {
            info.events[eventName] = {
                listeners: listeners.length,
                onceListeners: this.onceListeners.has(eventName) ? this.onceListeners.get(eventName).size : 0
            };
        }

        return info;
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug enabled
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`Event manager debug mode: ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set maximum listeners per event
     * @param {number} max - Maximum listeners
     */
    setMaxListeners(max) {
        this.maxListeners = Math.max(1, max);

        if (this.debug) {
            console.log(`Max listeners per event set to: ${this.maxListeners}`);
        }
    }

    /**
     * Create a namespaced event manager
     * @param {string} namespace - Namespace prefix
     * @returns {EventManager} Namespaced event manager
     */
    namespace(namespace) {
        const namespacedManager = {
            on: (event, callback, options) => this.on(`${namespace}:${event}`, callback, options),
            once: (event, callback, options) => this.once(`${namespace}:${event}`, callback, options),
            off: (event, listenerOrCallback) => this.off(`${namespace}:${event}`, listenerOrCallback),
            emit: (event, data, options) => this.emit(`${namespace}:${event}`, data, options),
            removeAllListeners: () => {
                const events = this.eventNames().filter(e => e.startsWith(`${namespace}:`));
                events.forEach(event => this.removeAllListeners(event));
            }
        };

        return namespacedManager;
    }

    /**
     * Create event with timeout
     * @param {string} event - Event name
     * @param {any} data - Event data
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Promise that resolves/rejects based on timeout
     */
    emitWithTimeout(event, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Event ${event} timed out after ${timeout}ms`));
            }, timeout);

            this.emit(event, data).then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            }).catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    /**
     * Wait for specific event
     * @param {string} event - Event name to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Promise that resolves when event is emitted
     */
    waitFor(event, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(event, listener);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout);

            const listener = (eventData) => {
                clearTimeout(timeoutId);
                resolve(eventData);
            };

            this.once(event, listener);
        });
    }

    /**
     * Pipe events from one manager to another
     * @param {EventManager} sourceManager - Source event manager
     * @param {string|Array} events - Event name(s) to pipe
     * @param {object} options - Pipe options
     */
    pipe(sourceManager, events, options = {}) {
        const eventList = Array.isArray(events) ? events : [events];
        const { prefix = '', transform = null } = options;

        eventList.forEach(event => {
            sourceManager.on(event, (eventData) => {
                const targetEvent = prefix ? `${prefix}:${event}` : event;
                const data = transform ? transform(eventData) : eventData;
                this.emit(targetEvent, data);
            });
        });
    }

    /**
     * Create event buffer for batching
     * @param {number} bufferTime - Buffer time in milliseconds
     * @returns {object} Buffer manager
     */
    createBuffer(bufferTime = 100) {
        const buffer = new Map();

        return {
            emit: (event, data) => {
                if (!buffer.has(event)) {
                    buffer.set(event, []);

                    setTimeout(() => {
                        const bufferedData = buffer.get(event);
                        buffer.delete(event);

                        this.emit(`${event}:batch`, bufferedData);
                    }, bufferTime);
                }

                buffer.get(event).push({
                    data,
                    timestamp: Date.now()
                });
            }
        };
    }

    /**
     * Dispose of the event manager and clean up resources
     */
    dispose() {
        this.removeAllListeners();

        if (this.debug) {
            console.log('Event manager disposed');
        }
    }
}