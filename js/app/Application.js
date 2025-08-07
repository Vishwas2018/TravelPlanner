/**
 * Travel Itinerary Manager - Main Application (Fixed & Refined)
 * Orchestrates all components and manages application lifecycle
 */

import { EventManager } from '../core/events.js';
import { StorageManager } from '../core/storage.js';
import { DataManager } from '../data/DataManager.js';
import { ViewManager } from '../views/ViewManager.js';
import { Modal } from '../components/Modal.js';
import { FileHandler } from '../data/FileHandler.js';
import { notificationService } from '../services/NotificationService.js';
import { validationService } from '../services/ValidationService.js';
import { Utils } from '../core/utils.js';
import { DashboardView } from '../views/DashboardView.js';
import { ItineraryView } from '../views/ItineraryView.js';
import { TimelineView } from '../views/TimelineView.js';
import {
    APP_CONFIG,
    VIEWS,
    EVENTS,
    KEYBOARD_SHORTCUTS,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES
} from '../core/constants.js';

export class Application extends EventManager {
    constructor(options = {}) {
        super();

        this.options = {
            container: options.container || document.body,
            theme: options.theme || 'light',
            autoSave: options.autoSave !== false,
            keyboardShortcuts: options.keyboardShortcuts !== false,
            ...options
        };

        // Core services
        this.dataManager = null;
        this.viewManager = null;
        this.fileHandler = null;
        this.storage = null;

        // View instances
        this.dashboardView = null;
        this.itineraryView = null;
        this.timelineView = null;

        // UI components - lazy-loaded modals
        this.modals = new Map();
        this.currentTheme = this.options.theme;

        // Application state
        this.isInitialized = false;
        this.isLoading = false;
        this.lastActivity = Date.now();

        // Timers and cleanup
        this.autoSaveTimer = null;
        this.cleanupTasks = new Set();

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            this.isLoading = true;
            this.showInitialLoading();

            // Initialize core services first
            await this.initializeServices();

            // Setup UI structure
            this.setupUI();

            // Initialize ViewManager AFTER UI is ready
            this.viewManager = new ViewManager({
                container: '#viewContainer',
                defaultView: VIEWS.DASHBOARD,
                autoNavigate: false
            });

            // Connect services with error boundaries
            this.connectServices();
            this.setupGlobalErrorHandling();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();

            // Load theme and register views
            this.loadThemePreference();
            this.registerViews();

            // Load data and setup auto-save
            await this.loadInitialData();

            if (this.options.autoSave) {
                this.setupAutoSave();
            }

            // Navigate to default view
            await this.viewManager.navigateTo(VIEWS.DASHBOARD);

            this.isInitialized = true;
            this.isLoading = false;

            this.hideInitialLoading();
            this.emit(EVENTS.APP_READY);

            notificationService.success(
                'Welcome to Travel Itinerary Manager! 🌍',
                { duration: 3000 }
            );

            console.log(`🌍 ${APP_CONFIG.name} v${APP_CONFIG.version} initialized successfully!`);

        } catch (error) {
            this.isLoading = false;
            this.handleInitializationError(error);
        }
    }

    /**
     * Show initial loading
     */
    showInitialLoading() {
        console.log('Application loading...');
    }

    /**
     * Hide initial loading
     */
    hideInitialLoading() {
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.classList.add('hidden');
            const appContent = document.getElementById('appContent');
            if (appContent) {
                appContent.classList.add('loaded');
            }
        }
    }

    /**
     * Initialize core services
     */
    async initializeServices() {
        this.storage = new StorageManager();
        this.fileHandler = new FileHandler();
        this.dataManager = new DataManager();
        await this.dataManager.init();
    }

    /**
     * Connect services with error boundaries
     */
    connectServices() {
        // Data manager events with error boundaries
        this.dataManager.on(EVENTS.DATA_UPDATED, () => {
            try {
                if (this.viewManager) {
                    this.viewManager.updateView();
                }
                this.updateLastActivity();
            } catch (error) {
                this.handleGlobalError(error, 'ViewManager update');
            }
        });

        this.dataManager.on(EVENTS.ACTIVITY_ADDED, () => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_ADDED);
        });

        this.dataManager.on(EVENTS.ACTIVITY_UPDATED, () => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_UPDATED);
        });

        this.dataManager.on(EVENTS.ACTIVITY_DELETED, () => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_DELETED);
        });

        // ViewManager events with error boundaries
        if (this.viewManager) {
            this.viewManager.on(EVENTS.VIEW_CHANGED, (event) => {
                try {
                    this.updateNavigationState(event.to);
                    this.updateLastActivity();
                } catch (error) {
                    this.handleGlobalError(error, 'Navigation update');
                }
            });

            this.viewManager.on(EVENTS.VIEW_ERROR, (event) => {
                this.handleGlobalError(event.error, `${event.view} view`);
            });
        }
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Data error boundary
        this.dataManager.on('error', (error) => {
            this.handleGlobalError(error, 'DataManager');
        });

        // Global error handler for uncaught errors in app context
        this.on('error', (error) => {
            this.handleGlobalError(error.error || error, 'Application');
        });
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error, context = 'Unknown') {
        console.error(`Global error in ${context}:`, error);

        if (this.isInitialized) {
            notificationService.error(
                `Error in ${context}. Please try refreshing if issues persist.`,
                { duration: 5000 }
            );
        }
    }

    /**
     * Setup UI components
     */
    setupUI() {
        this.createApplicationStructure();
        this.setupNavigation();
        this.setupFilterControls();
    }

    /**
     * Create main application structure
     */
    createApplicationStructure() {
        const container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!container) {
            throw new Error('Application container not found');
        }

        container.innerHTML = `
            <div id="app" class="app-container">
                <!-- Sidebar -->
                <aside id="sidebar" class="sidebar">
                    <div class="sidebar-header">
                        <div class="logo">
                            <div class="logo-icon">🌍</div>
                            <div class="logo-text">
                                <h1>Travel Manager</h1>
                                <span>v${APP_CONFIG.version}</span>
                            </div>
                        </div>
                    </div>

                    <nav class="nav-sections">
                        <div class="nav-section">
                            <h3 class="nav-title">Navigation</h3>
                            <div class="nav-items" id="navigationItems">
                                <!-- Navigation items will be added here -->
                            </div>
                        </div>

                        <div class="nav-section">
                            <h3 class="nav-title">Actions</h3>
                            <div class="action-buttons">
                                <button class="action-btn primary" id="addActivityBtn">
                                    ➕ Add Activity
                                </button>
                                <button class="action-btn secondary" id="exportBtn">
                                    📄 Export Data
                                </button>
                                <button class="action-btn secondary" id="importBtn">
                                    📁 Import Data
                                </button>
                            </div>
                        </div>

                        <div class="nav-section filters-section">
                            <h3 class="nav-title">Filters</h3>
                            <div id="filterControls">
                                <!-- Filter controls will be added here -->
                            </div>
                        </div>
                    </nav>
                </aside>

                <!-- Main Content -->
                <main class="main-content">
                    <header class="page-header">
                        <div class="header-content">
                            <div>
                                <h1 class="page-title" id="pageTitle">Dashboard</h1>
                                <p class="page-subtitle" id="pageSubtitle">Manage your travel itinerary</p>
                            </div>
                            <div class="header-actions">
                                <div class="search-container">
                                    <span class="search-icon">🔍</span>
                                    <input 
                                        type="text" 
                                        class="search-input" 
                                        id="globalSearch" 
                                        placeholder="Search activities..."
                                        autocomplete="off"
                                    />
                                </div>
                                <button class="header-btn" id="themeToggle" title="Toggle theme">
                                    <span class="theme-icon">🌙</span>
                                </button>
                                <button class="header-btn" id="settingsBtn" title="Settings">
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    </header>

                    <div id="viewContainer" class="view-container">
                        <!-- Views will be rendered here -->
                    </div>
                </main>

                <!-- Mobile overlay for sidebar -->
                <div id="mobileOverlay" class="mobile-overlay"></div>
            </div>
        `;
    }

    /**
     * Get or create modal (lazy loading)
     */
    getModal(type) {
        if (!this.modals.has(type)) {
            let modal;
            switch (type) {
                case 'activity':
                    modal = new Modal({
                        id: 'activityModal',
                        title: 'Activity',
                        size: 'large'
                    });
                    break;
                case 'settings':
                    modal = new Modal({
                        id: 'settingsModal',
                        title: 'Settings',
                        size: 'medium'
                    });
                    break;
                default:
                    throw new Error(`Unknown modal type: ${type}`);
            }
            this.modals.set(type, modal);
        }
        return this.modals.get(type);
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        const navigationItems = document.getElementById('navigationItems');
        if (!navigationItems) return;

        const navItems = [
            { view: VIEWS.DASHBOARD, icon: '📊', label: 'Dashboard' },
            { view: VIEWS.ITINERARY, icon: '📋', label: 'Itinerary' },
            { view: VIEWS.TIMELINE, icon: '🕒', label: 'Timeline' }
        ];

        navigationItems.innerHTML = '';
        navItems.forEach(item => {
            const navElement = document.createElement('div');
            navElement.className = 'nav-item';
            navElement.dataset.view = item.view;
            navElement.innerHTML = `
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                <div class="nav-indicator"></div>
            `;

            const handler = () => this.navigateToView(item.view);
            navElement.addEventListener('click', handler);
            this.cleanupTasks.add(() => navElement.removeEventListener('click', handler));

            navigationItems.appendChild(navElement);
        });
    }

    /**
     * Setup filter controls
     */
    setupFilterControls() {
        const filterControls = document.getElementById('filterControls');
        if (!filterControls) return;

        filterControls.innerHTML = `
            <div class="filter-group">
                <label class="filter-label">Transport Mode</label>
                <select class="filter-select" id="transportFilter">
                    <option value="">All Transport</option>
                    <option value="Flight">✈️ Flight</option>
                    <option value="Train">🚄 Train</option>
                    <option value="Car">🚗 Car</option>
                    <option value="Bus">🚌 Bus</option>
                    <option value="Uber">🚕 Uber/Taxi</option>
                    <option value="Walking">🚶 Walking</option>
                </select>
            </div>

            <div class="filter-group">
                <label class="filter-label">Booking Status</label>
                <select class="filter-select" id="bookingFilter">
                    <option value="">All Bookings</option>
                    <option value="TRUE">Booked</option>
                    <option value="FALSE">Not Booked</option>
                </select>
            </div>

            <div class="filter-group">
                <label class="filter-label">Date Range</label>
                <input type="date" class="filter-input" id="startDateFilter" placeholder="Start Date">
                <input type="date" class="filter-input" id="endDateFilter" placeholder="End Date" style="margin-top: 0.5rem;">
            </div>

            <div class="filter-group">
                <button class="btn secondary" id="clearFiltersBtn" style="width: 100%;">
                    Clear Filters
                </button>
            </div>
        `;

        this.setupFilterEventListeners();
    }

    /**
     * Setup filter event listeners
     */
    setupFilterEventListeners() {
        const transportFilter = document.getElementById('transportFilter');
        const bookingFilter = document.getElementById('bookingFilter');
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        const updateFilters = () => {
            try {
                const filters = {
                    transport: transportFilter?.value || '',
                    booking: bookingFilter?.value ? [bookingFilter.value] : ['TRUE', 'FALSE'],
                    startDate: startDateFilter?.value || '',
                    endDate: endDateFilter?.value || ''
                };
                this.dataManager.updateFilters(filters);
            } catch (error) {
                this.handleGlobalError(error, 'Filter update');
            }
        };

        // Add event listeners with cleanup tracking
        const addListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
                this.cleanupTasks.add(() => element.removeEventListener(event, handler));
            }
        };

        addListener(transportFilter, 'change', updateFilters);
        addListener(bookingFilter, 'change', updateFilters);
        addListener(startDateFilter, 'change', updateFilters);
        addListener(endDateFilter, 'change', updateFilters);

        addListener(clearFiltersBtn, 'click', () => {
            try {
                if (transportFilter) transportFilter.value = '';
                if (bookingFilter) bookingFilter.value = '';
                if (startDateFilter) startDateFilter.value = '';
                if (endDateFilter) endDateFilter.value = '';

                this.dataManager.resetFilters();
                notificationService.info('Filters cleared');
            } catch (error) {
                this.handleGlobalError(error, 'Clear filters');
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global search with error boundary
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((value) => {
                try {
                    this.handleSearch(value);
                } catch (error) {
                    this.handleGlobalError(error, 'Search');
                }
            }, 300);

            const searchHandler = (e) => debouncedSearch(e.target.value);
            searchInput.addEventListener('input', searchHandler);
            this.cleanupTasks.add(() => searchInput.removeEventListener('input', searchHandler));
        }

        // Action buttons with safe references
        const addSafeListener = (id, handler, context = 'Button action') => {
            const element = document.getElementById(id);
            if (element) {
                const safeHandler = () => {
                    try {
                        handler();
                    } catch (error) {
                        this.handleGlobalError(error, context);
                    }
                };
                element.addEventListener('click', safeHandler);
                this.cleanupTasks.add(() => element.removeEventListener('click', safeHandler));
            }
        };

        addSafeListener('addActivityBtn', () => this.openAddActivityModal(), 'Add activity');
        addSafeListener('exportBtn', () => this.showExportModal(), 'Export data');
        addSafeListener('importBtn', () => this.showImportModal(), 'Import data');
        addSafeListener('themeToggle', () => this.toggleTheme(), 'Theme toggle');
        addSafeListener('settingsBtn', () => this.openSettingsModal(), 'Settings');

        // Mobile overlay
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) {
            const overlayHandler = () => this.closeMobileSidebar();
            mobileOverlay.addEventListener('click', overlayHandler);
            this.cleanupTasks.add(() => mobileOverlay.removeEventListener('click', overlayHandler));
        }

        // Window events
        const beforeUnloadHandler = (e) => {
            if (this.dataManager && this.dataManager.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);
        this.cleanupTasks.add(() => window.removeEventListener('beforeunload', beforeUnloadHandler));

        const resizeHandler = Utils.throttle(() => this.handleResize(), 250);
        window.addEventListener('resize', resizeHandler);
        this.cleanupTasks.add(() => window.removeEventListener('resize', resizeHandler));

        // Track user activity
        const activityHandler = () => this.updateLastActivity();
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, activityHandler, { passive: true });
            this.cleanupTasks.add(() => document.removeEventListener(event, activityHandler));
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.closeMobileSidebar();
        }
    }

    /**
     * Update last activity timestamp
     */
    updateLastActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Mobile sidebar management
     */
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        if (!this.options.keyboardShortcuts) return;

        const keydownHandler = (e) => {
            try {
                // Skip if typing in input fields
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                    return;
                }

                const isCtrl = e.ctrlKey || e.metaKey;
                const isAlt = e.altKey;
                const key = e.key.toLowerCase();

                // Global shortcuts
                if (isCtrl && !isAlt && !e.shiftKey) {
                    switch (key) {
                        case 'n':
                            e.preventDefault();
                            this.openAddActivityModal();
                            break;
                        case 'e':
                            e.preventDefault();
                            this.showExportModal();
                            break;
                        case 'o':
                            e.preventDefault();
                            this.showImportModal();
                            break;
                        case 'f':
                            e.preventDefault();
                            document.getElementById('globalSearch')?.focus();
                            break;
                        case ',':
                            e.preventDefault();
                            this.openSettingsModal();
                            break;
                    }
                }

                // View shortcuts (Alt + number)
                if (isAlt && !isCtrl && !e.shiftKey) {
                    const viewMap = {
                        '1': VIEWS.DASHBOARD,
                        '2': VIEWS.ITINERARY,
                        '3': VIEWS.TIMELINE
                    };

                    if (viewMap[key]) {
                        e.preventDefault();
                        this.navigateToView(viewMap[key]);
                    }
                }

                // Escape key
                if (key === 'escape') {
                    this.handleEscapeKey();
                }
            } catch (error) {
                this.handleGlobalError(error, 'Keyboard shortcut');
            }
        };

        document.addEventListener('keydown', keydownHandler);
        this.cleanupTasks.add(() => document.removeEventListener('keydown', keydownHandler));
    }

    /**
     * Handle escape key press
     */
    handleEscapeKey() {
        // Close any open modals
        this.modals.forEach(modal => {
            if (modal.isVisible) {
                modal.hide();
            }
        });

        // Close mobile sidebar
        this.closeMobileSidebar();

        // Clear search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            this.handleSearch('');
        }
    }

    /**
     * Load theme preference
     */
    loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem('travel-app-theme') || this.options.theme;
            this.setTheme(savedTheme);
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            this.setTheme(this.options.theme);
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        try {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);

            // Update theme icon
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
            }

            // Save theme preference
            localStorage.setItem('travel-app-theme', theme);
            notificationService.info(`Switched to ${theme} theme`);
        } catch (error) {
            this.handleGlobalError(error, 'Theme change');
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Register application views
     */
    registerViews() {
        // Create view instances
        this.dashboardView = new DashboardView(this.dataManager);
        this.itineraryView = new ItineraryView(this.dataManager);
        this.timelineView = new TimelineView(this.dataManager);

        // Dashboard view
        this.viewManager.registerView(VIEWS.DASHBOARD, {
            title: 'Dashboard',
            description: 'Overview of your travel itinerary',
            render: async () => this.renderDashboardView()
        });

        // Itinerary view
        this.viewManager.registerView(VIEWS.ITINERARY, {
            title: 'Itinerary',
            description: 'Detailed view of your activities',
            render: async () => this.renderItineraryView()
        });

        // Timeline view
        this.viewManager.registerView(VIEWS.TIMELINE, {
            title: 'Timeline',
            description: 'Chronological view of your journey',
            render: async () => this.renderTimelineView()
        });
    }

    /**
     * Render views with error boundaries
     */
    renderDashboardView() {
        try {
            return this.dashboardView.render();
        } catch (error) {
            this.handleGlobalError(error, 'Dashboard render');
            return '<div class="error-state">Failed to load dashboard</div>';
        }
    }

    renderItineraryView() {
        try {
            return this.itineraryView.render();
        } catch (error) {
            this.handleGlobalError(error, 'Itinerary render');
            return '<div class="error-state">Failed to load itinerary</div>';
        }
    }

    renderTimelineView() {
        try {
            return this.timelineView.render();
        } catch (error) {
            this.handleGlobalError(error, 'Timeline render');
            return '<div class="error-state">Failed to load timeline</div>';
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this.updateNavigationState(VIEWS.DASHBOARD);
        } catch (error) {
            console.error('Error loading initial data:', error);
            notificationService.error('Failed to load initial data');
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            try {
                if (this.dataManager && this.dataManager.isDirty) {
                    this.dataManager.saveToStorage().then(success => {
                        if (success) {
                            console.log('Auto-save completed');
                        }
                    }).catch(error => {
                        console.error('Auto-save failed:', error);
                    });
                }
            } catch (error) {
                console.error('Auto-save error:', error);
            }
        }, APP_CONFIG.autoSaveInterval);
    }

    /**
     * Handle search functionality
     */
    handleSearch(searchTerm) {
        if (!this.dataManager) return;

        this.dataManager.updateFilters({ search: searchTerm });

        // Fix: Ensure view updates after search
        if (this.viewManager) {
            this.viewManager.updateView();
        }

        if (searchTerm) {
            const count = this.dataManager.filteredActivities.length;
            notificationService.info(
                `Found ${count} activities matching "${searchTerm}"`,
                { duration: 2000 }
            );
        }
    }

    /**
     * Navigate to view with error handling
     */
    navigateToView(viewName) {
        try {
            if (this.viewManager) {
                this.viewManager.navigateTo(viewName);
            }
        } catch (error) {
            this.handleGlobalError(error, `Navigation to ${viewName}`);
        }
    }

    /**
     * Update navigation state
     */
    updateNavigationState(activeView) {
        try {
            // Update navigation items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.view === activeView);
            });

            // Update page title and subtitle
            const titles = {
                [VIEWS.DASHBOARD]: { title: 'Dashboard', subtitle: 'Overview of your travel itinerary' },
                [VIEWS.ITINERARY]: { title: 'Itinerary', subtitle: 'Detailed view of your activities' },
                [VIEWS.TIMELINE]: { title: 'Timeline', subtitle: 'Chronological view of your journey' }
            };

            const pageInfo = titles[activeView];
            if (pageInfo) {
                const titleEl = document.getElementById('pageTitle');
                const subtitleEl = document.getElementById('pageSubtitle');

                if (titleEl) titleEl.textContent = pageInfo.title;
                if (subtitleEl) subtitleEl.textContent = pageInfo.subtitle;
            }
        } catch (error) {
            console.error('Navigation state update error:', error);
        }
    }

    /**
     * Open add activity modal
     */
    openAddActivityModal() {
        try {
            const modal = this.getModal('activity');

            modal.setTitle('Add New Activity');

            const form = modal.createForm({
                fields: [
                    {
                        name: 'activity',
                        label: 'Activity Name',
                        type: 'text',
                        required: true,
                        placeholder: 'e.g., Flight to Paris'
                    },
                    {
                        name: 'date',
                        label: 'Date',
                        type: 'date',
                        required: true
                    },
                    {
                        name: 'startTime',
                        label: 'Start Time',
                        type: 'time'
                    },
                    {
                        name: 'endTime',
                        label: 'End Time',
                        type: 'time'
                    },
                    {
                        name: 'startFrom',
                        label: 'From',
                        type: 'text',
                        placeholder: 'Starting location'
                    },
                    {
                        name: 'reachTo',
                        label: 'To',
                        type: 'text',
                        placeholder: 'Destination'
                    },
                    {
                        name: 'transportMode',
                        label: 'Transport',
                        type: 'select',
                        options: [
                            { value: '', label: 'Select transport mode' },
                            { value: 'Flight', label: '✈️ Flight' },
                            { value: 'Train', label: '🚄 Train' },
                            { value: 'Car', label: '🚗 Car' },
                            { value: 'Bus', label: '🚌 Bus' },
                            { value: 'Uber', label: '🚕 Uber/Taxi' },
                            { value: 'Walking', label: '🚶 Walking' },
                            { value: 'Auto', label: '🛺 Auto Rickshaw' },
                            { value: 'Tube', label: '🚇 Tube/Metro' }
                        ]
                    },
                    {
                        name: 'booking',
                        label: 'Booking Status',
                        type: 'select',
                        value: 'FALSE',
                        options: [
                            { value: 'FALSE', label: 'Not Booked' },
                            { value: 'TRUE', label: 'Booked' }
                        ]
                    },
                    {
                        name: 'cost',
                        label: 'Cost ($)',
                        type: 'number',
                        min: 0,
                        step: 0.01,
                        value: 0
                    },
                    {
                        name: 'additionalDetails',
                        label: 'Additional Details',
                        type: 'textarea',
                        fullWidth: true,
                        rows: 3,
                        value: ''
                    },
                    {
                        name: 'accommodationDetails',
                        label: 'Accommodation',
                        type: 'text',
                        fullWidth: true,
                        value: ''
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        await this.dataManager.addActivity(data);
                        notificationService.success('Activity added successfully!');
                        return true; // Close modal
                    } catch (error) {
                        notificationService.error(error.message);
                        return false; // Keep modal open
                    }
                }
            });

            modal.setContent(form);
            modal.setFooter([
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    onClick: () => true
                },
                {
                    text: 'Add Activity',
                    className: 'btn-primary',
                    onClick: (e) => {
                        const form = modal.modal.querySelector('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit'));
                        }
                        return false;
                    }
                }
            ]);

            modal.show();
        } catch (error) {
            this.handleGlobalError(error, 'Add activity modal');
        }
    }

    /**
     * Edit activity
     */
    editActivity(activityId) {
        try {
            const activity = this.dataManager.getActivityById(activityId);
            if (!activity) {
                notificationService.error('Activity not found');
                return;
            }

            const modal = this.getModal('activity');
            modal.setTitle('Edit Activity');

            const form = modal.createForm({
                fields: [
                    {
                        name: 'activity',
                        label: 'Activity Name',
                        type: 'text',
                        required: true,
                        value: activity.activity
                    },
                    {
                        name: 'date',
                        label: 'Date',
                        type: 'date',
                        required: true,
                        value: activity.date
                    },
                    {
                        name: 'startTime',
                        label: 'Start Time',
                        type: 'time',
                        value: activity.startTime
                    },
                    {
                        name: 'endTime',
                        label: 'End Time',
                        type: 'time',
                        value: activity.endTime
                    },
                    {
                        name: 'startFrom',
                        label: 'From',
                        type: 'text',
                        value: activity.startFrom
                    },
                    {
                        name: 'reachTo',
                        label: 'To',
                        type: 'text',
                        value: activity.reachTo
                    },
                    {
                        name: 'transportMode',
                        label: 'Transport',
                        type: 'select',
                        value: activity.transportMode,
                        options: [
                            { value: '', label: 'Select transport mode' },
                            { value: 'Flight', label: '✈️ Flight' },
                            { value: 'Train', label: '🚄 Train' },
                            { value: 'Car', label: '🚗 Car' },
                            { value: 'Bus', label: '🚌 Bus' },
                            { value: 'Uber', label: '🚕 Uber/Taxi' },
                            { value: 'Walking', label: '🚶 Walking' },
                            { value: 'Auto', label: '🛺 Auto Rickshaw' },
                            { value: 'Tube', label: '🚇 Tube/Metro' }
                        ]
                    },
                    {
                        name: 'booking',
                        label: 'Booking Status',
                        type: 'select',
                        value: activity.booking,
                        options: [
                            { value: 'FALSE', label: 'Not Booked' },
                            { value: 'TRUE', label: 'Booked' }
                        ]
                    },
                    {
                        name: 'cost',
                        label: 'Cost ($)',
                        type: 'number',
                        min: 0,
                        step: 0.01,
                        value: activity.cost
                    },
                    {
                        name: 'additionalDetails',
                        label: 'Additional Details',
                        type: 'textarea',
                        fullWidth: true,
                        rows: 3,
                        value: activity.additionalDetails
                    },
                    {
                        name: 'accommodationDetails',
                        label: 'Accommodation',
                        type: 'text',
                        fullWidth: true,
                        value: activity.accommodationDetails
                    }
                ],
                onSubmit: async (data) => {
                    try {
                        await this.dataManager.updateActivity(activityId, data);
                        notificationService.success('Activity updated successfully!');
                        return true; // Close modal
                    } catch (error) {
                        notificationService.error(error.message);
                        return false; // Keep modal open
                    }
                }
            });

            modal.setContent(form);
            modal.setFooter([
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    onClick: () => true
                },
                {
                    text: 'Update Activity',
                    className: 'btn-primary',
                    onClick: (e) => {
                        const form = modal.modal.querySelector('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit'));
                        }
                        return false;
                    }
                }
            ]);

            modal.show();
        } catch (error) {
            this.handleGlobalError(error, 'Edit activity modal');
        }
    }

    /**
     * Delete activity
     */
    deleteActivity(activityId) {
        try {
            const activity = this.dataManager.getActivityById(activityId);
            if (!activity) {
                notificationService.error('Activity not found');
                return;
            }

            notificationService.confirm(
                `Are you sure you want to delete "${activity.activity}"?`,
                {
                    onConfirm: () => {
                        try {
                            this.dataManager.deleteActivity(activityId);
                            notificationService.success('Activity deleted successfully!');
                        } catch (error) {
                            this.handleGlobalError(error, 'Delete activity');
                        }
                    },
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                }
            );
        } catch (error) {
            this.handleGlobalError(error, 'Delete activity');
        }
    }

    /**
     * Duplicate activity
     */
    duplicateActivity(activityId) {
        try {
            const duplicated = this.dataManager.duplicateActivity(activityId);
            if (duplicated) {
                notificationService.success('Activity duplicated successfully!');
            }
            return duplicated;
        } catch (error) {
            this.handleGlobalError(error, 'Duplicate activity');
            return null;
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        try {
            const modal = this.getModal('activity');

            modal.setTitle('Export Data');

            const content = `
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <p>Choose your preferred export format:</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <button class="export-option" data-format="excel">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                            <strong>Excel (.xlsx)</strong>
                            <p>Best for spreadsheet applications</p>
                        </button>
                        
                        <button class="export-option" data-format="csv">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                            <strong>CSV</strong>
                            <p>Universal format for data exchange</p>
                        </button>
                        
                        <button class="export-option" data-format="json">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">💾</div>
                            <strong>JSON</strong>
                            <p>For backup and data preservation</p>
                        </button>
                    </div>
                </div>
                
                <style>
                    .export-option {
                        padding: 1.5rem;
                        border: 2px solid #e2e8f0;
                        border-radius: 0.75rem;
                        background: white;
                        cursor: pointer;
                        transition: all 0.2s ease-in-out;
                        text-align: center;
                    }
                    
                    .export-option:hover {
                        border-color: #667eea;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    
                    .export-option strong {
                        display: block;
                        margin-bottom: 0.5rem;
                        color: #2d3748;
                    }
                    
                    .export-option p {
                        margin: 0;
                        font-size: 0.875rem;
                        color: #718096;
                    }
                </style>
            `;

            modal.setContent(content);
            modal.setFooter([
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    onClick: () => true
                }
            ]);

            // Add click handlers for export options
            modal.show().then(() => {
                const exportOptions = modal.modal.querySelectorAll('.export-option');
                exportOptions.forEach(option => {
                    const handler = () => {
                        const format = option.dataset.format;
                        this.exportData(format);
                        modal.hide();
                    };
                    option.addEventListener('click', handler);
                });
            });
        } catch (error) {
            this.handleGlobalError(error, 'Export modal');
        }
    }

    /**
     * Export data
     */
    async exportData(format) {
        try {
            const activities = this.dataManager.activities;
            const timestamp = new Date().toISOString().split('T')[0];
            let filename, content, mimeType;

            switch (format) {
                case 'excel':
                    content = this.fileHandler.exportToExcel(activities);
                    filename = `travel_itinerary_${timestamp}.xlsx`;
                    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    break;

                case 'csv':
                    content = this.fileHandler.exportToCSV(activities);
                    filename = `travel_itinerary_${timestamp}.csv`;
                    mimeType = 'text/csv';
                    break;

                case 'json':
                    content = this.fileHandler.exportToJSON(activities);
                    filename = `travel_itinerary_${timestamp}.json`;
                    mimeType = 'application/json';
                    break;

                default:
                    throw new Error('Invalid export format');
            }

            this.fileHandler.downloadFile(content, filename, mimeType);
            notificationService.success(SUCCESS_MESSAGES.DATA_EXPORTED);

        } catch (error) {
            this.handleGlobalError(error, 'Export data');
        }
    }

    /**
     * Show import modal
     */
    showImportModal() {
        try {
            const modal = this.getModal('activity');

            modal.setTitle('Import Data');

            const content = document.createElement('div');

            const { input, visual } = this.fileHandler.createFileInput(
                content,
                (result, error) => {
                    if (error) {
                        notificationService.error(`Import failed: ${error.message}`);
                        return;
                    }

                    if (result && result.activities) {
                        this.handleImportData(result);
                        modal.hide();
                    }
                },
                {
                    acceptedFormats: '.xlsx,.xls,.csv,.json',
                    dragAndDrop: true
                }
            );

            const instructions = document.createElement('div');
            instructions.innerHTML = `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0;">
                    <h4 style="margin-bottom: 1rem; color: #2d3748;">Import Instructions</h4>
                    <ul style="color: #718096; font-size: 0.875rem; line-height: 1.6;">
                        <li>Supported formats: Excel (.xlsx, .xls), CSV, and JSON</li>
                        <li>Excel/CSV files should have headers: Activity, Date, Start Time, End Time, From, To, Transport Mode, Booking Required, Cost</li>
                        <li>Dates should be in YYYY-MM-DD format</li>
                        <li>Times should be in HH:MM format</li>
                        <li>Booking status should be TRUE or FALSE</li>
                    </ul>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-sm btn-secondary" onclick="window.app?.downloadTemplate?.()">
                            📥 Download Template
                        </button>
                    </div>
                </div>
            `;

            content.appendChild(instructions);
            modal.setContent(content);
            modal.setFooter([
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    onClick: () => true
                }
            ]);

            modal.show();
        } catch (error) {
            this.handleGlobalError(error, 'Import modal');
        }
    }

    /**
     * Handle imported data
     */
    handleImportData(importResult) {
        try {
            const { activities, metadata } = importResult;

            if (!activities || activities.length === 0) {
                notificationService.warning('No activities found in the imported file');
                return;
            }

            // Import activities
            const result = this.dataManager.importActivities(activities.map(a => a.toJSON()));

            // Show import summary
            let message = `Import complete: ${result.imported} activities imported`;
            if (result.skipped > 0) {
                message += `, ${result.skipped} skipped`;
            }

            if (result.errors.length > 0) {
                console.warn('Import errors:', result.errors);
                notificationService.warning(message + '. Check console for details.');
            } else {
                notificationService.success(message);
            }

        } catch (error) {
            this.handleGlobalError(error, 'Import data');
        }
    }

    /**
     * Download template file
     */
    downloadTemplate() {
        try {
            this.fileHandler.downloadTemplate('excel');
            notificationService.success(SUCCESS_MESSAGES.TEMPLATE_DOWNLOADED);
        } catch (error) {
            this.handleGlobalError(error, 'Download template');
        }
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        try {
            const modal = this.getModal('settings');

            const content = document.createElement('div');
            content.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 2rem;">
                    <div class="settings-section">
                        <h3>Appearance</h3>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="theme" value="light" ${this.currentTheme === 'light' ? 'checked' : ''}>
                                Light Theme
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="theme" value="dark" ${this.currentTheme === 'dark' ? 'checked' : ''}>
                                Dark Theme
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Data Management</h3>
                        <div class="setting-item">
                            <button class="btn btn-secondary" id="clearDataBtn">
                                🗑️ Clear All Data
                            </button>
                            <p style="font-size: 0.875rem; color: #718096; margin-top: 0.5rem;">
                                This will permanently delete all your activities
                            </p>
                        </div>
                        <div class="setting-item">
                            <button class="btn btn-secondary" id="exportBackupBtn">
                                💾 Create Backup
                            </button>
                            <p style="font-size: 0.875rem; color: #718096; margin-top: 0.5rem;">
                                Download a complete backup of your data
                            </p>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Application Info</h3>
                        <div class="setting-item">
                            <p><strong>Version:</strong> ${APP_CONFIG.version}</p>
                            <p><strong>Total Activities:</strong> ${this.dataManager.activities.length}</p>
                            <p><strong>Storage Used:</strong> ${this.getStorageUsage()}</p>
                        </div>
                    </div>
                </div>

                <style>
                    .settings-section {
                        padding-bottom: 1.5rem;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .settings-section:last-child {
                        border-bottom: none;
                        padding-bottom: 0;
                    }
                    .settings-section h3 {
                        margin-bottom: 1rem;
                        color: #2d3748;
                        font-size: 1.125rem;
                    }
                    .setting-item {
                        margin-bottom: 1rem;
                    }
                    .setting-item:last-child {
                        margin-bottom: 0;
                    }
                    .setting-item label {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        cursor: pointer;
                    }
                </style>
            `;

            modal.setContent(content);
            modal.setFooter([
                {
                    text: 'Close',
                    className: 'btn-primary',
                    onClick: () => true
                }
            ]);

            modal.show().then(() => {
                // Theme change handlers
                const themeRadios = modal.modal.querySelectorAll('input[name="theme"]');
                themeRadios.forEach(radio => {
                    const handler = (e) => this.setTheme(e.target.value);
                    radio.addEventListener('change', handler);
                });

                // Clear data handler
                const clearDataBtn = modal.modal.querySelector('#clearDataBtn');
                if (clearDataBtn) {
                    const handler = () => this.clearAllData();
                    clearDataBtn.addEventListener('click', handler);
                }

                // Export backup handler
                const exportBackupBtn = modal.modal.querySelector('#exportBackupBtn');
                if (exportBackupBtn) {
                    const handler = () => this.exportData('json');
                    exportBackupBtn.addEventListener('click', handler);
                }
            });
        } catch (error) {
            this.handleGlobalError(error, 'Settings modal');
        }
    }

    /**
     * Clear all application data
     */
    clearAllData() {
        try {
            notificationService.confirm(
                'Are you sure you want to clear all data? This action cannot be undone.',
                {
                    onConfirm: () => {
                        try {
                            this.dataManager.clearAll();
                            localStorage.clear();
                            notificationService.success('All data cleared successfully');

                            // Close settings modal
                            const settingsModal = this.modals.get('settings');
                            if (settingsModal) {
                                settingsModal.hide();
                            }
                        } catch (error) {
                            this.handleGlobalError(error, 'Clear data');
                        }
                    },
                    confirmText: 'Clear All Data',
                    cancelText: 'Cancel'
                }
            );
        } catch (error) {
            this.handleGlobalError(error, 'Clear data confirmation');
        }
    }

    /**
     * Get storage usage information
     */
    getStorageUsage() {
        try {
            const data = localStorage.getItem(APP_CONFIG.storageKey);
            if (data) {
                return Utils.formatFileSize(new Blob([data]).size);
            }
            return '0 KB';
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Set itinerary view mode
     */
    setItineraryViewMode(mode) {
        try {
            if (this.itineraryView) {
                this.itineraryView.setViewMode(mode);
                this.viewManager.refresh();
            }
        } catch (error) {
            this.handleGlobalError(error, 'Set view mode');
        }
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        console.error('Application initialization failed:', error);

        const container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (container) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        border-radius: 1rem;
                        padding: 3rem;
                        max-width: 500px;
                    ">
                        <h1 style="margin-bottom: 1rem;">⚠️ Application Error</h1>
                        <p style="margin-bottom: 2rem; line-height: 1.6;">
                            The application failed to initialize properly. Please try refreshing the page.
                        </p>
                        <details style="margin-bottom: 2rem; text-align: left;">
                            <summary style="cursor: pointer; margin-bottom: 0.5rem;">Technical Details</summary>
                            <pre style="
                                background: rgba(0, 0, 0, 0.2);
                                padding: 1rem;
                                border-radius: 0.5rem;
                                overflow: auto;
                                font-size: 0.75rem;
                                white-space: pre-wrap;
                            ">${error.message}</pre>
                        </details>
                        <div>
                            <button onclick="location.reload()" style="
                                background: white;
                                color: #667eea;
                                border: none;
                                padding: 0.75rem 2rem;
                                border-radius: 0.5rem;
                                font-weight: 600;
                                cursor: pointer;
                                margin-right: 1rem;
                            ">
                                🔄 Reload Application
                            </button>
                            <button onclick="localStorage.clear(); location.reload()" style="
                                background: transparent;
                                color: white;
                                border: 1px solid white;
                                padding: 0.75rem 2rem;
                                border-radius: 0.5rem;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                🗑️ Clear Data & Reload
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Check if application is ready
     */
    isReady() {
        return this.isInitialized && !this.isLoading;
    }

    /**
     * Get application version
     */
    getVersion() {
        return APP_CONFIG.version;
    }

    /**
     * Dispose of the application and clean up resources
     */
    dispose() {
        try {
            // Clear auto-save timer
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }

            // Execute all cleanup tasks
            this.cleanupTasks.forEach(cleanup => {
                try {
                    cleanup();
                } catch (error) {
                    console.warn('Cleanup task failed:', error);
                }
            });
            this.cleanupTasks.clear();

            // Save any pending changes
            if (this.dataManager && this.dataManager.isDirty) {
                this.dataManager.saveToStorage().catch(error => {
                    console.warn('Failed to save during disposal:', error);
                });
            }

            // Dispose of services
            if (this.dataManager) {
                this.dataManager.dispose();
                this.dataManager = null;
            }

            if (this.viewManager) {
                this.viewManager.dispose();
                this.viewManager = null;
            }

            if (this.fileHandler) {
                this.fileHandler.dispose();
                this.fileHandler = null;
            }

            // Dispose of modals
            this.modals.forEach(modal => {
                try {
                    modal.destroy();
                } catch (error) {
                    console.warn('Modal disposal failed:', error);
                }
            });
            this.modals.clear();

            // Remove all event listeners
            this.removeAllListeners();

            // Clear references
            this.storage = null;
            this.dashboardView = null;
            this.itineraryView = null;
            this.timelineView = null;

            console.log('Application disposed successfully');
        } catch (error) {
            console.error('Error during application disposal:', error);
        }
    }
}