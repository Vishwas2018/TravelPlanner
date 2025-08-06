/**
 * Travel Itinerary Manager - View Manager
 * Manages view routing, transitions, and state
 */

import { EventManager } from '../core/events.js';
import { Utils } from '../core/utils.js';
import { VIEWS, EVENTS, ANIMATION_DURATIONS } from '../core/constants.js';

export class ViewManager extends EventManager {
    constructor(options = {}) {
        super();

        this.options = {
            container: options.container || '#viewContainer',
            defaultView: options.defaultView || VIEWS.DASHBOARD,
            animation: options.animation !== false,
            historyEnabled: options.historyEnabled !== false,
            autoNavigate: options.autoNavigate !== false, // Add this option
            ...options
        };

        this.views = new Map();
        this.currentView = null;
        this.previousView = null;
        this.isTransitioning = false;
        this.viewHistory = [];
        this.maxHistorySize = 50;

        this.container = null;
        this.activeElements = new Set(); // Track active view elements
        this.animationQueue = []; // Queue for sequential animations

        this.init();
    }

    /**
     * Initialize view manager
     */
    init() {
        this.container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!this.container) {
            throw new Error('View container not found');
        }

        this.setupContainer();
        this.setupEventListeners();

        // Only load default view if autoNavigate is enabled
        if (this.options.autoNavigate && this.options.defaultView) {
            this.navigateTo(this.options.defaultView);
        }
    }

    /**
     * Setup view container
     */
    setupContainer() {
        this.container.classList.add('view-container');

        // Add container styles if not present
        if (!document.getElementById('view-manager-styles')) {
            this.addStyles();
        }
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.id = 'view-manager-styles';
        style.textContent = `
            .view-container {
                position: relative;
                width: 100%;
                height: 100%;
                ;
            }

            .view {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                transform: translateX(100%);
                transition: all ${ANIMATION_DURATIONS.NORMAL}ms ease-in-out;
                overflow-y: auto;
            }

            .view.active {
                opacity: 1;
                transform: translateX(0);
                position: relative;
            }

            .view.entering {
                opacity: 0;
                transform: translateX(100%);
            }

            .view.entering.active {
                opacity: 1;
                transform: translateX(0);
            }

            .view.exiting {
                opacity: 1;
                transform: translateX(0);
            }

            .view.exiting.inactive {
                opacity: 0;
                transform: translateX(-100%);
            }

            /* Animation variants */
            .view-container.slide-left .view.entering {
                transform: translateX(100%);
            }

            .view-container.slide-left .view.exiting.inactive {
                transform: translateX(-100%);
            }

            .view-container.slide-right .view.entering {
                transform: translateX(-100%);
            }

            .view-container.slide-right .view.exiting.inactive {
                transform: translateX(100%);
            }

            .view-container.fade .view {
                transform: none;
            }

            .view-container.fade .view.entering {
                opacity: 0;
            }

            .view-container.fade .view.exiting.inactive {
                opacity: 0;
            }

            .view-container.scale .view.entering {
                transform: scale(0.9);
                opacity: 0;
            }

            .view-container.scale .view.exiting.inactive {
                transform: scale(1.1);
                opacity: 0;
            }

            .view-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #718096;
            }

            .view-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: #f56565;
            }

            .view-error h3 {
                margin-bottom: 1rem;
                color: #2d3748;
            }

            .breadcrumb {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: #f7fafc;
                border-bottom: 1px solid #e2e8f0;
                font-size: 0.875rem;
            }

            .breadcrumb-item {
                color: #718096;
                text-decoration: none;
                cursor: pointer;
                transition: color 200ms ease-in-out;
            }

            .breadcrumb-item:hover {
                color: #4a5568;
            }

            .breadcrumb-item.active {
                color: #2d3748;
                font-weight: 500;
            }

            .breadcrumb-separator {
                color: #cbd5e0;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Browser back/forward buttons
        if (this.options.historyEnabled) {
            window.addEventListener('popstate', (e) => {
                // Validate state to prevent infinite loops
                if (e.state && e.state.view && typeof e.state.view === 'string' && this.hasView(e.state.view)) {
                    this.navigateTo(e.state.view, { replaceHistory: true });
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 9) {
                    const viewNames = Object.values(VIEWS);
                    if (viewNames[num - 1]) {
                        e.preventDefault();
                        this.navigateTo(viewNames[num - 1]);
                    }
                }
            }
        });
    }

    /**
     * Register a view
     * @param {string} name - View name
     * @param {object} view - View configuration
     */
    registerView(name, view) {
        if (typeof view.render !== 'function') {
            throw new Error('View must have a render method');
        }

        this.views.set(name, {
            name,
            title: view.title || Utils.capitalize(name),
            render: view.render,
            onEnter: view.onEnter || null,
            onLeave: view.onLeave || null,
            onUpdate: view.onUpdate || null,
            cache: view.cache !== false,
            requiredData: view.requiredData || [],
            breadcrumbs: view.breadcrumbs || null,
            element: null,
            lastRendered: null,
            eventListeners: new Map(),
            ...view
        });

        this.emit(EVENTS.VIEW_REGISTERED, { name, view });
    }

    /**
     * Unregister a view
     * @param {string} name - View name
     */
    unregisterView(name) {
        const view = this.views.get(name);
        if (view && view.element) {
            this.cleanupView(view);
        }

        this.views.delete(name);
        this.emit(EVENTS.VIEW_UNREGISTERED, { name });
    }

    /**
     * Navigate to a view
     * @param {string} viewName - View name
     * @param {object} options - Navigation options
     * @returns {Promise} Navigation promise
     */
    async navigateTo(viewName, options = {}) {
        if (this.isTransitioning) {
            console.warn('Navigation in progress, ignoring request');
            return;
        }

        const view = this.views.get(viewName);
        if (!view) {
            throw new Error(`View '${viewName}' not found`);
        }

        // Check if already on this view
        if (this.currentView === viewName && !options.force) {
            return;
        }

        try {
            this.isTransitioning = true;

            // Validate required data
            if (view.requiredData.length > 0 && !this.validateRequiredData(view, options.data)) {
                throw new Error(`Missing required data for view '${viewName}'`);
            }

            // Call onLeave for current view
            if (this.currentView) {
                const currentViewConfig = this.views.get(this.currentView);
                if (currentViewConfig?.onLeave) {
                    const canLeave = await currentViewConfig.onLeave(options);
                    if (canLeave === false) {
                        this.isTransitioning = false;
                        return;
                    }
                }
            }

            // Update history
            if (this.options.historyEnabled && !options.replaceHistory) {
                this.updateHistory(viewName, options);
            }

            // Add to view history
            this.addToViewHistory(viewName);

            // Show view with proper sequencing
            await this.showViewSequenced(viewName, options);

            // Update current view
            this.previousView = this.currentView;
            this.currentView = viewName;

            // Update page title and meta
            this.updatePageMeta(view);

            // Call onEnter for new view
            if (view.onEnter) {
                await view.onEnter(options);
            }

            // Emit navigation event
            this.emit(EVENTS.VIEW_CHANGED, {
                from: this.previousView,
                to: viewName,
                options
            });

        } catch (error) {
            console.error('Navigation error:', error);
            this.emit(EVENTS.VIEW_ERROR, { view: viewName, error });
            throw error;
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Validate required data for view
     * @param {object} view - View configuration
     * @param {object} data - Provided data
     * @returns {boolean} Data is valid
     */
    validateRequiredData(view, data = {}) {
        return view.requiredData.every(key =>
            data.hasOwnProperty(key) && data[key] != null
        );
    }

    /**
     * Show view with proper animation sequencing
     * @param {string} viewName - View name
     * @param {object} options - Show options
     * @returns {Promise} Show promise
     */
    async showViewSequenced(viewName, options = {}) {
        const view = this.views.get(viewName);
        const animationType = options.animation || 'slide-left';

        // Get or create view element
        let viewElement = view.element;
        if (!viewElement || !view.cache || options.force) {
            viewElement = await this.renderView(view, options);
        }

        // Set up animation classes
        if (this.options.animation) {
            this.container.className = `view-container ${animationType}`;
        }

        // Get current view element
        const currentElement = this.container.querySelector('.view.active');

        // Step 1: Start hiding current view
        if (currentElement && this.options.animation) {
            currentElement.classList.add('exiting');
            await Utils.delay(50); // Allow animation to start
        }

        // Step 2: Prepare new view
        viewElement.style.display = 'block';
        viewElement.classList.add('view', 'entering');
        viewElement.dataset.viewName = viewName;

        if (!viewElement.parentNode) {
            this.container.appendChild(viewElement);
        }

        this.activeElements.add(viewElement);

        // Step 3: Start showing new view
        if (this.options.animation) {
            await Utils.delay(50); // Ensure DOM update
            viewElement.classList.add('active');
        } else {
            viewElement.classList.add('active');
        }

        // Step 4: Complete hiding current view
        if (currentElement) {
            if (this.options.animation) {
                currentElement.classList.add('inactive');

                // Wait for animation to complete before cleanup
                setTimeout(() => {
                    this.cleanupViewElement(currentElement);
                }, ANIMATION_DURATIONS.NORMAL);
            } else {
                this.cleanupViewElement(currentElement);
            }
        }

        // Step 5: Clean up animation classes
        if (this.options.animation) {
            setTimeout(() => {
                viewElement.classList.remove('entering');
            }, ANIMATION_DURATIONS.NORMAL);
        }

        // Update view reference
        view.element = viewElement;
        view.lastRendered = Date.now();
    }

    /**
     * Clean up view element properly
     * @param {HTMLElement} element - Element to clean up
     */
    cleanupViewElement(element) {
        if (!element) return;

        try {
            // Remove from active elements tracking
            this.activeElements.delete(element);

            // Clean up event listeners
            const viewName = element.dataset.viewName;
            if (viewName) {
                const view = this.views.get(viewName);
                if (view && view.eventListeners) {
                    view.eventListeners.forEach((handler, event) => {
                        element.removeEventListener(event, handler);
                    });
                    view.eventListeners.clear();
                }
            }

            // Remove CSS classes
            element.classList.remove('active', 'exiting', 'inactive', 'entering');

            // Hide or remove from DOM
            const view = this.views.get(element.dataset.viewName);
            if (view && view.cache) {
                element.style.display = 'none';
            } else {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        } catch (error) {
            console.error('Error cleaning up view element:', error);
        }
    }

    /**
     * Render a view
     * @param {object} view - View configuration
     * @param {object} options - Render options
     * @returns {Promise<HTMLElement>} View element
     */
    async renderView(view, options = {}) {
        try {
            // Show loading state
            if (view.element) {
                const loadingElement = this.createLoadingElement();
                view.element.innerHTML = '';
                view.element.appendChild(loadingElement);
            }

            // Call render method
            const content = await view.render(options);

            // Create view element if needed
            if (!view.element) {
                view.element = document.createElement('div');
            }

            // Set content
            view.element.innerHTML = '';

            if (typeof content === 'string') {
                view.element.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                view.element.appendChild(content);
            } else if (content instanceof DocumentFragment) {
                view.element.appendChild(content);
            }

            // Add breadcrumbs if configured
            if (view.breadcrumbs) {
                const breadcrumbElement = this.createBreadcrumbs(view.breadcrumbs);
                view.element.insertBefore(breadcrumbElement, view.element.firstChild);
            }

            return view.element;

        } catch (error) {
            console.error(`Error rendering view '${view.name}':`, error);

            // Show error state
            const errorElement = this.createErrorElement(error);

            if (!view.element) {
                view.element = document.createElement('div');
            }

            view.element.innerHTML = '';
            view.element.appendChild(errorElement);

            return view.element;
        }
    }

    /**
     * Create loading element
     * @returns {HTMLElement} Loading element
     */
    createLoadingElement() {
        const element = document.createElement('div');
        element.className = 'view-loading';
        element.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 20px; height: 20px; border: 2px solid #e2e8f0; border-radius: 50%; border-top-color: #667eea; animation: spin 1s linear infinite;"></div>
                <span>Loading view...</span>
            </div>
        `;
        return element;
    }

    /**
     * Create error element
     * @param {Error} error - Error object
     * @returns {HTMLElement} Error element
     */
    createErrorElement(error) {
        const element = document.createElement('div');
        element.className = 'view-error';
        element.innerHTML = `
            <h3>⚠️ View Error</h3>
            <p>${Utils.escapeHtml(error.message)}</p>
            <button class="btn btn-secondary" onclick="location.reload()">
                🔄 Reload Page
            </button>
        `;
        return element;
    }

    /**
     * Create breadcrumbs element
     * @param {Array} breadcrumbs - Breadcrumb configuration
     * @returns {HTMLElement} Breadcrumbs element
     */
    createBreadcrumbs(breadcrumbs) {
        const element = document.createElement('nav');
        element.className = 'breadcrumb';
        element.setAttribute('aria-label', 'Breadcrumb');

        breadcrumbs.forEach((crumb, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.innerHTML = '›';
                element.appendChild(separator);
            }

            const link = document.createElement('a');
            link.className = `breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`;
            link.textContent = crumb.title;

            if (crumb.view && index < breadcrumbs.length - 1) {
                link.href = '#';
                const handler = (e) => {
                    e.preventDefault();
                    this.navigateTo(crumb.view);
                };
                link.addEventListener('click', handler);

                // Track event listener for cleanup
                const view = this.views.get(crumb.view);
                if (view && view.eventListeners) {
                    view.eventListeners.set('click', handler);
                }
            }

            element.appendChild(link);
        });

        return element;
    }

    /**
     * Update browser history
     * @param {string} viewName - View name
     * @param {object} options - Navigation options
     */
    updateHistory(viewName, options) {
        try {
            const state = { view: viewName, options };
            const url = `#${viewName}`;

            if (options.replaceHistory) {
                history.replaceState(state, '', url);
            } else {
                history.pushState(state, '', url);
            }
        } catch (error) {
            console.error('Error updating browser history:', error);
        }
    }

    /**
     * Add to view history
     * @param {string} viewName - View name
     */
    addToViewHistory(viewName) {
        // Remove if already exists to avoid duplicates
        this.viewHistory = this.viewHistory.filter(v => v !== viewName);

        // Add to beginning
        this.viewHistory.unshift(viewName);

        // Limit history size
        if (this.viewHistory.length > this.maxHistorySize) {
            this.viewHistory = this.viewHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * Update page meta information
     * @param {object} view - View configuration
     */
    updatePageMeta(view) {
        try {
            // Update page title
            if (view.title) {
                document.title = `${view.title} - Travel Itinerary Manager`;
            }

            // Update meta description
            if (view.description) {
                let metaDescription = document.querySelector('meta[name="description"]');
                if (!metaDescription) {
                    metaDescription = document.createElement('meta');
                    metaDescription.name = 'description';
                    document.head.appendChild(metaDescription);
                }
                metaDescription.content = view.description;
            }
        } catch (error) {
            console.error('Error updating page meta:', error);
        }
    }

    /**
     * Go back to previous view
     * @param {object} options - Navigation options
     * @returns {Promise} Navigation promise
     */
    goBack(options = {}) {
        if (this.viewHistory.length > 1) {
            const previousView = this.viewHistory[1];
            return this.navigateTo(previousView, {
                ...options,
                animation: 'slide-right'
            });
        } else if (this.previousView) {
            return this.navigateTo(this.previousView, {
                ...options,
                animation: 'slide-right'
            });
        } else {
            return this.navigateTo(this.options.defaultView, options);
        }
    }

    /**
     * Refresh current view
     * @param {object} options - Refresh options
     * @returns {Promise} Navigation promise
     */
    refresh(options = {}) {
        if (this.currentView) {
            return this.navigateTo(this.currentView, {
                ...options,
                force: true,
                animation: 'fade'
            });
        }
    }

    /**
     * Update current view
     * @param {object} data - Update data
     * @returns {Promise} Update promise
     */
    async updateView(data = {}) {
        if (!this.currentView) return;

        const view = this.views.get(this.currentView);
        if (view?.onUpdate) {
            try {
                await view.onUpdate(data);
                this.emit(EVENTS.VIEW_UPDATED, {
                    view: this.currentView,
                    data
                });
            } catch (error) {
                console.error('View update error:', error);
                this.emit(EVENTS.VIEW_ERROR, {
                    view: this.currentView,
                    error
                });
            }
        }
    }

    /**
     * Get current view name
     * @returns {string|null} Current view name
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Get current view configuration
     * @returns {object|null} Current view configuration
     */
    getCurrentViewConfig() {
        return this.currentView ? this.views.get(this.currentView) : null;
    }

    /**
     * Get view by name
     * @param {string} name - View name
     * @returns {object|null} View configuration
     */
    getView(name) {
        return this.views.get(name) || null;
    }

    /**
     * Get all registered views
     * @returns {Array} Array of view names
     */
    getViews() {
        return Array.from(this.views.keys());
    }

    /**
     * Check if view exists
     * @param {string} name - View name
     * @returns {boolean} View exists
     */
    hasView(name) {
        return this.views.has(name);
    }

    /**
     * Get view history
     * @returns {Array} View history
     */
    getHistory() {
        return [...this.viewHistory];
    }

    /**
     * Clear view history
     */
    clearHistory() {
        this.viewHistory = [];
        if (this.currentView) {
            this.viewHistory.push(this.currentView);
        }
    }

    /**
     * Check if transitioning
     * @returns {boolean} Is transitioning
     */
    isNavigating() {
        return this.isTransitioning;
    }

    /**
     * Preload a view
     * @param {string} viewName - View name
     * @param {object} options - Preload options
     * @returns {Promise} Preload promise
     */
    async preloadView(viewName, options = {}) {
        const view = this.views.get(viewName);
        if (!view) return;

        if (!view.element || !view.cache) {
            try {
                await this.renderView(view, options);
                if (view.element) {
                    view.element.style.display = 'none';
                }
            } catch (error) {
                console.error(`Error preloading view '${viewName}':`, error);
            }
        }
    }

    /**
     * Cleanup view resources
     * @param {object} view - View configuration
     */
    cleanupView(view) {
        try {
            // Clean up event listeners
            if (view.eventListeners) {
                view.eventListeners.clear();
            }

            // Remove from active elements
            if (view.element) {
                this.activeElements.delete(view.element);
            }

            // Remove from DOM
            if (view.element && view.element.parentNode) {
                view.element.parentNode.removeChild(view.element);
            }

            view.element = null;
            view.lastRendered = null;
        } catch (error) {
            console.error('Error cleaning up view:', error);
        }
    }

    /**
     * Clear all cached views
     */
    clearCache() {
        this.views.forEach((view, name) => {
            if (name !== this.currentView) {
                this.cleanupView(view);
            }
        });
    }

    /**
     * Set animation type
     * @param {boolean|string} animation - Animation type or boolean
     */
    setAnimation(animation) {
        this.options.animation = animation;
    }

    /**
     * Set default view
     * @param {string} viewName - Default view name
     */
    setDefaultView(viewName) {
        this.options.defaultView = viewName;
    }

    /**
     * Handle browser navigation
     * @param {string} hash - URL hash
     */
    handleHashChange(hash = location.hash) {
        const viewName = hash.replace('#', '') || this.options.defaultView;

        if (this.hasView(viewName) && viewName !== this.currentView) {
            this.navigateTo(viewName, { replaceHistory: true });
        }
    }

    /**
     * Initialize from current URL
     */
    initFromURL() {
        this.handleHashChange();
    }

    /**
     * Dispose of view manager
     */
    dispose() {
        try {
            // Clean up all views
            this.views.forEach(view => this.cleanupView(view));
            this.views.clear();

            // Clean up active elements
            this.activeElements.clear();

            // Clear animation queue
            this.animationQueue = [];

            // Remove event listeners
            this.removeAllListeners();

            // Clear history
            this.viewHistory = [];

            // Reset state
            this.currentView = null;
            this.previousView = null;
            this.isTransitioning = false;

            console.log('ViewManager disposed');
        } catch (error) {
            console.error('Error disposing ViewManager:', error);
        }
    }
}