/**
 * Travel Itinerary Manager - Main Application
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

        // UI components
        this.modals = new Map();
        this.currentTheme = this.options.theme;

        // Application state
        this.isInitialized = false;
        this.isLoading = false;
        this.lastActivity = Date.now();

        // Auto-save timer
        this.autoSaveTimer = null;

        this.init();
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
     * Initialize application
     */
    async init() {
        try {
            this.isLoading = true;
            this.showInitialLoading();

            // Initialize core services (without ViewManager)
            await this.initializeServices();

            // Setup UI FIRST
            this.setupUI();

            // Create ViewManager AFTER UI exists
            this.viewManager = new ViewManager({
                container: '#viewContainer',
                defaultView: VIEWS.DASHBOARD
            });

            // Connect services AFTER ViewManager exists
            this.connectServices();

            this.setupEventListeners();
            this.setupKeyboardShortcuts();

            // Load theme preference
            this.loadThemePreference();

            // Initialize views BEFORE loading data
            this.registerViews();

            // Load initial data
            await this.loadInitialData();

            // Setup auto-save
            if (this.options.autoSave) {
                this.setupAutoSave();
            }

            // Initialize from URL if available
            this.viewManager.initFromURL();

            this.isInitialized = true;
            this.isLoading = false;

            this.hideInitialLoading();
            this.emit(EVENTS.APP_READY);

            // Show welcome notification
            notificationService.success(
                'Welcome to Travel Itinerary Manager! 🌍',
                {duration: 3000}
            );

            console.log(`🌍 ${APP_CONFIG.name} v${APP_CONFIG.version} initialized successfully!`);

        } catch (error) {
            this.isLoading = false;
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize core services (without ViewManager)
     */
    async initializeServices() {
        // Storage manager
        this.storage = new StorageManager();

        // File handler
        this.fileHandler = new FileHandler();

        // Data manager
        this.dataManager = new DataManager();
        await this.dataManager.init();

        // ViewManager will be created after UI setup
    }

    /**
     * Connect services with event handlers
     */
    connectServices() {
        // Data manager events
        this.dataManager.on(EVENTS.DATA_UPDATED, () => {
            if (this.viewManager) {
                this.viewManager.updateView();
            }
            this.updateLastActivity();
        });

        this.dataManager.on(EVENTS.ACTIVITY_ADDED, (event) => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_ADDED);
        });

        this.dataManager.on(EVENTS.ACTIVITY_UPDATED, (event) => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_UPDATED);
        });

        this.dataManager.on(EVENTS.ACTIVITY_DELETED, (event) => {
            notificationService.success(SUCCESS_MESSAGES.ACTIVITY_DELETED);
        });

        // View manager events
        if (this.viewManager) {
            this.viewManager.on(EVENTS.VIEW_CHANGED, (event) => {
                this.updateNavigationState(event.to);
                this.updateLastActivity();
            });

            this.viewManager.on(EVENTS.VIEW_ERROR, (event) => {
                notificationService.error(`Failed to load ${event.view} view: ${event.error.message}`);
            });
        }
    }

    /**
     * Setup UI components
     */
    setupUI() {
        this.createApplicationStructure();
        this.createModals();
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
     * Create application modals
     */
    createModals() {
        // Activity modal
        const activityModal = new Modal({
            id: 'activityModal',
            title: 'Add Activity',
            size: 'large'
        });

        this.modals.set('activity', activityModal);

        // Settings modal
        const settingsModal = new Modal({
            id: 'settingsModal',
            title: 'Settings',
            size: 'medium'
        });

        this.modals.set('settings', settingsModal);
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        const navigationItems = document.getElementById('navigationItems');
        if (!navigationItems) return;

        const navItems = [
            {view: VIEWS.DASHBOARD, icon: '📊', label: 'Dashboard'},
            {view: VIEWS.ITINERARY, icon: '📋', label: 'Itinerary'},
            {view: VIEWS.TIMELINE, icon: '🕒', label: 'Timeline'}
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

            navElement.addEventListener('click', () => {
                this.navigateToView(item.view);
            });

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

        // Add filter event listeners
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
            const filters = {
                transport: transportFilter?.value || '',
                booking: bookingFilter?.value ? [bookingFilter.value] : ['TRUE', 'FALSE'],
                startDate: startDateFilter?.value || '',
                endDate: endDateFilter?.value || ''
            };

            this.dataManager.updateFilters(filters);
        };

        transportFilter?.addEventListener('change', updateFilters);
        bookingFilter?.addEventListener('change', updateFilters);
        startDateFilter?.addEventListener('change', updateFilters);
        endDateFilter?.addEventListener('change', updateFilters);

        clearFiltersBtn?.addEventListener('click', () => {
            if (transportFilter) transportFilter.value = '';
            if (bookingFilter) bookingFilter.value = '';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';

            this.dataManager.resetFilters();
            notificationService.info('Filters cleared');
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((value) => {
                this.handleSearch(value);
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }

        // Action buttons
        const addActivityBtn = document.getElementById('addActivityBtn');
        if (addActivityBtn) {
            addActivityBtn.addEventListener('click', () => {
                this.openAddActivityModal();
            });
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        // Mobile overlay
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.dataManager && this.dataManager.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        window.addEventListener('resize', Utils.throttle(() => {
            this.handleResize();
        }, 250));

        // Track user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, {passive: true});
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

        document.addEventListener('keydown', (e) => {
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
        });
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
        const savedTheme = localStorage.getItem('travel-app-theme') || this.options.theme;
        this.setTheme(savedTheme);
    }

    /**
     * Set theme
     */
    setTheme(theme) {
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
     * Render dashboard view
     */
    renderDashboardView() {
        return this.dashboardView.render();
    }

    /**
     * Render itinerary view
     */
    renderItineraryView() {
        return this.itineraryView.render();
    }

    /**
     * Render timeline view
     */
    renderTimelineView() {
        return this.timelineView.render();
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Data manager handles its own initialization
            // Just ensure views are updated
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
            if (this.dataManager && this.dataManager.isDirty) {
                this.dataManager.saveToStorage().then(success => {
                    if (success) {
                        console.log('Auto-save completed');
                    }
                });
            }
        }, APP_CONFIG.autoSaveInterval);
    }

    /**
     * Handle search functionality
     * @param {string} searchTerm - Search term
     */
    handleSearch(searchTerm) {
        if (!this.dataManager) return;

        this.dataManager.updateFilters({search: searchTerm});

        if (searchTerm) {
            const count = this.dataManager.filteredActivities.length;
            notificationService.info(
                `Found ${count} activities matching "${searchTerm}"`,
                {duration: 2000}
            );
        }
    }

    /**
     * Navigate to view
     * @param {string} viewName - View name
     */
    navigateToView(viewName) {
        if (this.viewManager) {
            this.viewManager.navigateTo(viewName);
        }
    }

    /**
     * Update navigation state
     * @param {string} activeView - Active view name
     */
    updateNavigationState(activeView) {
        // Update navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === activeView);
        });

        // Update page title and subtitle
        const titles = {
            [VIEWS.DASHBOARD]: {title: 'Dashboard', subtitle: 'Overview of your travel itinerary'},
            [VIEWS.ITINERARY]: {title: 'Itinerary', subtitle: 'Detailed view of your activities'},
            [VIEWS.TIMELINE]: {title: 'Timeline', subtitle: 'Chronological view of your journey'}
        };

        const pageInfo = titles[activeView];
        if (pageInfo) {
            const titleEl = document.getElementById('pageTitle');
            const subtitleEl = document.getElementById('pageSubtitle');

            if (titleEl) titleEl.textContent = pageInfo.title;
            if (subtitleEl) subtitleEl.textContent = pageInfo.subtitle;
        }
    }

    /**
     * Open add activity modal
     */
    openAddActivityModal() {
        const modal = this.modals.get('activity');
        if (!modal) return;

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
                        {value: '', label: 'Select transport mode'},
                        {value: 'Flight', label: '✈️ Flight'},
                        {value: 'Train', label: '🚄 Train'},
                        {value: 'Car', label: '🚗 Car'},
                        {value: 'Bus', label: '🚌 Bus'},
                        {value: 'Uber', label: '🚕 Uber/Taxi'},
                        {value: 'Walking', label: '🚶 Walking'},
                        {value: 'Auto', label: '🛺 Auto Rickshaw'},
                        {value: 'Tube', label: '🚇 Tube/Metro'}
                    ]
                },
                {
                    name: 'booking',
                    label: 'Booking Status',
                    type: 'select',
                    value: activity.booking,
                    options: [
                        {value: 'FALSE', label: 'Not Booked'},
                        {value: 'TRUE', label: 'Booked'}
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
    }

    /**
     * Delete activity
     * @param {string} activityId - Activity ID to delete
     */
    deleteActivity(activityId) {
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
                        notificationService.error(error.message);
                    }
                },
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );
    }

    /**
     * Duplicate activity
     * @param {string} activityId - Activity ID to duplicate
     */
    duplicateActivity(activityId) {
        try {
            const duplicated = this.dataManager.duplicateActivity(activityId);
            notificationService.success('Activity duplicated successfully!');
            return duplicated;
        } catch (error) {
            notificationService.error(error.message);
            return null;
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        const modal = this.modals.get('activity');
        if (!modal) return;

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
                option.addEventListener('click', () => {
                    const format = option.dataset.format;
                    this.exportData(format);
                    modal.hide();
                });
            });
        });
    }

    /**
     * Export data
     * @param {string} format - Export format (excel, csv, json)
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
            console.error('Export error:', error);
            notificationService.error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Show import modal
     */
    showImportModal() {
        const modal = this.modals.get('activity');
        if (!modal) return;

        modal.setTitle('Import Data');

        const content = document.createElement('div');

        const {input, visual} = this.fileHandler.createFileInput(
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
                    <button class="btn btn-sm btn-secondary" onclick="app.downloadTemplate()">
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
    }

    /**
     * Handle imported data
     * @param {object} importResult - Import result with activities and metadata
     */
    handleImportData(importResult) {
        try {
            const {activities, metadata} = importResult;

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
            console.error('Import handling error:', error);
            notificationService.error(`Import failed: ${error.message}`);
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
            console.error('Template download error:', error);
            notificationService.error('Failed to download template');
        }
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        const modal = this.modals.get('settings');
        if (!modal) return;

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
                radio.addEventListener('change', (e) => {
                    this.setTheme(e.target.value);
                });
            });

            // Clear data handler
            const clearDataBtn = modal.modal.querySelector('#clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', () => {
                    this.clearAllData();
                });
            }

            // Export backup handler
            const exportBackupBtn = modal.modal.querySelector('#exportBackupBtn');
            if (exportBackupBtn) {
                exportBackupBtn.addEventListener('click', () => {
                    this.exportData('json');
                });
            }
        });
    }

    /**
     * Clear all application data
     */
    clearAllData() {
        notificationService.confirm(
            'Are you sure you want to clear all data? This action cannot be undone.',
            {
                onConfirm: () => {
                    try {
                        this.dataManager.clearAll();
                        localStorage.clear();
                        notificationService.success('All data cleared successfully');

                        // Close settings modal
                        this.modals.get('settings').hide();
                    } catch (error) {
                        notificationService.error(`Failed to clear data: ${error.message}`);
                    }
                },
                confirmText: 'Clear All Data',
                cancelText: 'Cancel'
            }
        );
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
     * @param {string} mode - View mode ('grouped' or 'list')
     */
    setItineraryViewMode(mode) {
        if (this.itineraryView) {
            this.itineraryView.setViewMode(mode);
            this.viewManager.refresh();
        }
    }

    /**
     * Handle initialization error
     * @param {Error} error - Initialization error
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
     * @returns {boolean} Is ready
     */
    isReady() {
        return this.isInitialized && !this.isLoading;
    }

    /**
     * Get application version
     * @returns {string} Application version
     */
    getVersion() {
        return APP_CONFIG.version;
    }

    /**
     * Dispose of the application and clean up resources
     */
    dispose() {
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // Dispose of services
        if (this.dataManager) {
            this.dataManager.dispose();
        }

        if (this.viewManager) {
            this.viewManager.dispose();
        }

        if (this.fileHandler) {
            this.fileHandler.dispose();
        }

        // Dispose of modals
        this.modals.forEach(modal => modal.destroy());
        this.modals.clear();

        // Remove all event listeners
        this.removeAllListeners();

        // Clear references
        this.dataManager = null;
        this.viewManager = null;
        this.fileHandler = null;
        this.storage = null;
        this.dashboardView = null;
        this.itineraryView = null;
        this.timelineView = null;

        console.log('Application disposed');
    }

    /**
     * Edit activity
     * @param {string} activityId - Activity ID to edit
     */
    editActivity(activityId) {
        const activity = this.dataManager.getActivityById(activityId);
        if (!activity) {
            notificationService.error('Activity not found');
            return;
        }

        const modal = this.modals.get('activity');
        if (!modal) return;

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
                        {value: '', label: 'Select transport mode'},
                        {value: 'Flight', label: '✈️ Flight'},
                        {value: 'Train', label: '🚄 Train'},
                        {value: 'Car', label: '🚗 Car'},
                        {value: 'Bus', label: '🚌 Bus'},
                        {value: 'Uber', label: '🚕 Uber/Taxi'},
                        {value: 'Walking', label: '🚶 Walking'},
                        {value: 'Auto', label: '🛺 Auto Rickshaw'},
                        {value: 'Tube', label: '🚇 Tube/Metro'}
                    ]
                },
                {
                    name: 'booking',
                    label: 'Booking Status',
                    type: 'select',
                    value: 'FALSE',
                    options: [
                        {value: 'FALSE', label: 'Not Booked'},
                        {value: 'TRUE', label: 'Booked'}
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
    }
}
