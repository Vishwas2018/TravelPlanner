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
     * Initialize application
     */
    async init() {
        try {
            this.isLoading = true;
            this.showInitialLoading();

            // Initialize core services
            await this.initializeServices();

            // Setup UI
            this.setupUI();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();

            // Load theme preference
            this.loadThemePreference();

            // Initialize views
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
                { duration: 3000 }
            );

            console.log(`🌍 ${APP_CONFIG.name} v${APP_CONFIG.version} initialized successfully!`);

        } catch (error) {
            this.isLoading = false;
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize core services
     */
    async initializeServices() {
        // Storage manager
        this.storage = new StorageManager();

        // File handler
        this.fileHandler = new FileHandler();

        // Data manager
        this.dataManager = new DataManager();
        await this.dataManager.init();

        // View manager
        this.viewManager = new ViewManager({
            container: '#viewContainer',
            defaultView: VIEWS.DASHBOARD
        });

        // Connect services
        this.connectServices();
    }

    /**
     * Connect services with event handlers
     */
    connectServices() {
        // Data manager events
        this.dataManager.on(EVENTS.DATA_UPDATED, () => {
            this.viewManager.updateView();
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
        this.viewManager.on(EVENTS.VIEW_CHANGED, (event) => {
            this.updateNavigationState(event.to);
            this.updateLastActivity();
        });

        this.viewManager.on(EVENTS.VIEW_ERROR, (event) => {
            notificationService.error(`Failed to load ${event.view} view: ${event.error.message}`);
        });
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
            { view: VIEWS.DASHBOARD, icon: '📊', label: 'Dashboard' },
            { view: VIEWS.ITINERARY, icon: '📋', label: 'Itinerary' },
            { view: VIEWS.TIMELINE, icon: '🕒', label: 'Timeline' }
        ];

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
            }, { passive: true });
        });
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
     * Register application views
     */
    registerViews() {
        // Dashboard view
        this.viewManager.registerView(VIEWS.DASHBOARD, {
            title: 'Dashboard',
            description: 'Overview of your travel itinerary',
            render: async () => {
                return this.renderDashboardView();
            }
        });

        // Itinerary view
        this.viewManager.registerView(VIEWS.ITINERARY, {
            title: 'Itinerary',
            description: 'Detailed view of your activities',
            render: async () => {
                return this.renderItineraryView();
            }
        });

        // Timeline view
        this.viewManager.registerView(VIEWS.TIMELINE, {
            title: 'Timeline',
            description: 'Chronological view of your journey',
            render: async () => {
                return this.renderTimelineView();
            }
        });
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

        this.dataManager.updateFilters({ search: searchTerm });

        if (searchTerm) {
            const count = this.dataManager.filteredActivities.length;
            notificationService.info(
                `Found ${count} activities matching "${searchTerm}"`,
                { duration: 2000 }
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
                    step: 0.01
                },
                {
                    name: 'additionalDetails',
                    label: 'Additional Details',
                    type: 'textarea',
                    fullWidth: true,
                    rows: 3,
                    placeholder: 'Any additional information...'
                },
                {
                    name: 'accommodationDetails',
                    label: 'Accommodation',
                    type: 'text',
                    fullWidth: true,
                    placeholder: 'Hotel or accommodation details'
                }
            ],
            onSubmit: async (data) => {
                try {
                    await this.dataManager.addActivity(data);
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
                onClick: () => true // Close modal
            },
            {
                text: 'Save Activity',
                className: 'btn-primary',
                onClick: (e) => {
                    const form = modal.modal.querySelector('form');
                    if (form) {
                        form.dispatchEvent(new Event('submit'));
                    }
                    return false; // Let form handler control modal
                }
            }
        ]);

        modal.show();
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
     * Show import modal
     */
    showImportModal() {
        const modal = this.modals.get('activity');
        if (!modal) return;

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
                <h4 style="margin-bottom: 1rem; color: #2d3748;">Need a template?</h4>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button class="btn btn-secondary" id="downloadExcelTemplate">
                        📊 Excel Template
                    </button>
                    <button class="btn btn-secondary" id="downloadCSVTemplate">
                        📄 CSV Template
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

        modal.show().then(() => {
            // Template download handlers
            const excelTemplateBtn = modal.modal.querySelector('#downloadExcelTemplate');
            const csvTemplateBtn = modal.modal.querySelector('#downloadCSVTemplate');

            if (excelTemplateBtn) {
                excelTemplateBtn.addEventListener('click', () => {
                    this.fileHandler.downloadTemplate('excel');
                });
            }

            if (csvTemplateBtn) {
                csvTemplateBtn.addEventListener('click', () => {
                    this.fileHandler.downloadTemplate('csv');
                });
            }
        });
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        const modal = this.modals.get('settings');
        if (!modal) return;

        const content = `
            <div class="settings-content">
                <div class="setting-group">
                    <h3>Appearance</h3>
                    <div class="setting-item">
                        <label>Theme</label>
                        <select id="themeSelect">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>Data & Storage</h3>
                    <div class="setting-item">
                        <label>Auto-save</label>
                        <input type="checkbox" id="autoSaveToggle" ${this.options.autoSave ? 'checked' : ''}>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-secondary" id="clearDataBtn">
                            🗑️ Clear All Data
                        </button>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>Accessibility</h3>
                    <div class="setting-item">
                        <label>Keyboard Shortcuts</label>
                        <input type="checkbox" id="shortcutsToggle" ${this.options.keyboardShortcuts ? 'checked' : ''}>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>About</h3>
                    <div class="setting-item">
                        <p>Travel Itinerary Manager v${APP_CONFIG.version}</p>
                        <p>Built with modern web technologies</p>
                    </div>
                </div>
            </div>

            <style>
                .settings-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .setting-group h3 {
                    margin-bottom: 1rem;
                    color: #2d3748;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 0.5rem;
                }

                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .setting-item label {
                    font-weight: 500;
                    color: #4a5568;
                }

                .setting-item select,
                .setting-item input[type="checkbox"] {
                    margin-left: 1rem;
                }

                .setting-item p {
                    margin: 0;
                    color: #718096;
                    font-size: 0.875rem;
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
            // Settings event handlers
            const themeSelect = modal.modal.querySelector('#themeSelect');
            const autoSaveToggle = modal.modal.querySelector('#autoSaveToggle');
            const shortcutsToggle = modal.modal.querySelector('#shortcutsToggle');
            const clearDataBtn = modal.modal.querySelector('#clearDataBtn');

            if (themeSelect) {
                themeSelect.value = this.currentTheme;
                themeSelect.addEventListener('change', (e) => {
                    this.setTheme(e.target.value);
                });
            }

            if (autoSaveToggle) {
                autoSaveToggle.addEventListener('change', (e) => {
                    this.setAutoSave(e.target.checked);
                });
            }

            if (shortcutsToggle) {
                shortcutsToggle.addEventListener('change', (e) => {
                    this.options.keyboardShortcuts = e.target.checked;
                    this.saveSettings();
                });
            }

            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', () => {
                    this.confirmClearData();
                });
            }
        });
    }

    /**
     * Export data in specified format
     * @param {string} format - Export format
     */
    exportData(format) {
        try {
            const activities = this.dataManager.activities;
            const timestamp = new Date().toISOString().split('T')[0];

            switch (format) {
                case 'excel':
                    const excelBlob = this.fileHandler.exportToExcel(activities);
                    this.fileHandler.downloadFile(
                        excelBlob,
                        `travel_itinerary_${timestamp}.xlsx`,
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    );
                    break;

                case 'csv':
                    const csvContent = this.fileHandler.exportToCSV(activities);
                    this.fileHandler.downloadFile(
                        csvContent,
                        `travel_itinerary_${timestamp}.csv`,
                        'text/csv'
                    );
                    break;

                case 'json':
                    const jsonContent = this.fileHandler.exportToJSON(activities);
                    this.fileHandler.downloadFile(
                        jsonContent,
                        `travel_itinerary_${timestamp}.json`,
                        'application/json'
                    );
                    break;

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            notificationService.success(SUCCESS_MESSAGES.DATA_EXPORTED);

        } catch (error) {
            console.error('Export error:', error);
            notificationService.error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Handle imported data
     * @param {object} importResult - Import result
     */
    handleImportData(importResult) {
        try {
            const { activities, metadata } = importResult;

            if (!activities || activities.length === 0) {
                notificationService.warning('No valid activities found in the imported file');
                return;
            }

            // Show confirmation dialog
            const confirmMessage = `
                Import ${activities.length} activities from ${metadata.fileName}?
                This will add to your existing data.
            `;

            if (confirm(confirmMessage)) {
                // Import activities
                const results = this.dataManager.importActivities(
                    activities.map(activity => activity.toJSON())
                );

                if (results.imported > 0) {
                    notificationService.success(
                        `Successfully imported ${results.imported} activities!`
                    );

                    if (results.skipped > 0) {
                        notificationService.warning(
                            `${results.skipped} activities were skipped due to validation errors`
                        );
                    }
                } else {
                    notificationService.warning('No activities were imported');
                }
            }

        } catch (error) {
            console.error('Import error:', error);
            notificationService.error(`Import failed: ${error.message}`);
        }
    }

    /**
     * Render dashboard view
     * @returns {string} Dashboard HTML
     */
    renderDashboardView() {
        if (!this.dataManager) return '<div>Loading...</div>';

        const stats = this.dataManager.getStatistics();
        const costBreakdown = this.dataManager.getCostBreakdown();

        return `
            <div class="dashboard-content">
                <!-- Metrics Grid -->
                <div class="dashboard-grid">
                    <div class="metric-card">
                        <div class="metric-icon">🎯</div>
                        <div class="metric-value">${stats.totalActivities}</div>
                        <div class="metric-label">Total Activities</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">💰</div>
                        <div class="metric-value">${Utils.formatCurrency(stats.totalCost)}</div>
                        <div class="metric-label">Total Budget</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">📅</div>
                        <div class="metric-value">${stats.totalDays}</div>
                        <div class="metric-label">Trip Days</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">✅</div>
                        <div class="metric-value">${stats.bookingsCount}</div>
                        <div class="metric-label">Bookings Made</div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">Quick Actions</h2>
                    </div>
                    <div style="padding: 2rem;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <button class="quick-action-btn" onclick="app.navigateToView('${VIEWS.ITINERARY}')">
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
                            <button class="quick-action-btn" onclick="app.navigateToView('${VIEWS.TIMELINE}')">
                                <div class="action-icon">🕒</div>
                                <div class="action-text">View Timeline</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .quick-action-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.5rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 0.75rem;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                }

                .quick-action-btn:hover {
                    border-color: #667eea;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .action-icon {
                    font-size: 2rem;
                }

                .action-text {
                    font-weight: 500;
                    color: #2d3748;
                }
            </style>
        `;
    }

    /**
     * Render itinerary view
     * @returns {string} Itinerary HTML
     */
    renderItineraryView() {
        if (!this.dataManager) return '<div>Loading...</div>';

        const activities = this.dataManager.filteredActivities;

        if (activities.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🗺️</div>
                    <h3>No activities found</h3>
                    <p>Add some activities to get started with your travel planning.</p>
                    <button class="btn btn-primary" onclick="app.openAddActivityModal()">
                        ➕ Add First Activity
                    </button>
                </div>
            `;
        }

        const groupedActivities = this.dataManager.getActivitiesByDate();
        const sortedDates = Object.keys(groupedActivities).sort();

        return `
            <div class="itinerary-content">
                ${sortedDates.map(date => {
            const dayActivities = groupedActivities[date];
            return `
                        <div class="date-group">
                            <div class="date-header">
                                <div class="date-info">
                                    <div class="date-title">${Utils.formatDate(date)}</div>
                                    <div class="date-subtitle">${dayActivities.length} activities</div>
                                </div>
                            </div>
                            <div class="activity-list">
                                ${dayActivities.map(activity => this.renderActivityCard(activity)).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    /**
     * Render timeline view
     * @returns {string} Timeline HTML
     */
    renderTimelineView() {
        if (!this.dataManager) return '<div>Loading...</div>';

        const activities = this.dataManager.filteredActivities;

        if (activities.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⏰</div>
                    <h3>No activities in timeline</h3>
                    <p>Your timeline will appear here once you add some activities.</p>
                    <button class="btn btn-primary" onclick="app.openAddActivityModal()">
                        ➕ Add Activity
                    </button>
                </div>
            `;
        }

        return `
            <div class="timeline-content">
                <div class="timeline">
                    ${activities.map(activity => `
                        <div class="timeline-item">
                            <div class="activity-card">
                                <div class="activity-header">
                                    <div>
                                        <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                                        <div class="activity-time">
                                            ${Utils.formatDate(activity.date)}
                                            ${activity.startTime ? ` • ${Utils.formatTime(activity.startTime)}` : ''}
                                        </div>
                                    </div>
                                    <div class="activity-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="app.editActivity('${activity.id}')">
                                            ✏️ Edit
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="app.deleteActivity('${activity.id}')">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                                
                                ${activity.startFrom || activity.reachTo ? `
                                    <div class="activity-location">
                                        ${activity.startFrom ? `📍 From: ${Utils.escapeHtml(activity.startFrom)}` : ''}
                                        ${activity.reachTo ? `🎯 To: ${Utils.escapeHtml(activity.reachTo)}` : ''}
                                    </div>
                                ` : ''}
                                
                                <div class="activity-details">
                                    ${activity.transportMode ? `
                                        <div class="detail-item">
                                            <span class="detail-icon">${Utils.getTransportIcon(activity.transportMode)}</span>
                                            <span>${activity.transportMode}</span>
                                        </div>
                                    ` : ''}
                                    
                                    ${activity.cost > 0 ? `
                                        <div class="detail-item">
                                            <span class="detail-icon">💰</span>
                                            <span class="cost-display">${Utils.formatCurrency(activity.cost)}</span>
                                        </div>
                                    ` : ''}
                                    
                                    <div class="detail-item">
                                        <span class="detail-icon">${activity.isBooked() ? '✅' : '❌'}</span>
                                        <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                                            ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                                        </span>
                                    </div>
                                </div>
                                
                                ${activity.additionalDetails ? `
                                    <div class="activity-notes">
                                        <strong>Notes:</strong> ${Utils.escapeHtml(activity.additionalDetails)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render activity card
     * @param {ActivityModel} activity - Activity to render
     * @returns {string} Activity card HTML
     */
    renderActivityCard(activity) {
        return `
            <div class="activity-card" data-activity-id="${activity.id}">
                <div class="activity-header">
                    <div>
                        <div class="activity-title">${Utils.escapeHtml(activity.activity)}</div>
                        <div class="activity-time">
                            ${activity.startTime ? Utils.formatTime(activity.startTime) : 'No time set'}
                            ${activity.endTime ? ` - ${Utils.formatTime(activity.endTime)}` : ''}
                        </div>
                    </div>
                    <div class="activity-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editActivity('${activity.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteActivity('${activity.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                ${activity.startFrom || activity.reachTo ? `
                    <div class="activity-location">
                        ${activity.startFrom ? `📍 From: ${Utils.escapeHtml(activity.startFrom)}` : ''}
                        ${activity.reachTo ? `🎯 To: ${Utils.escapeHtml(activity.reachTo)}` : ''}
                    </div>
                ` : ''}
                
                <div class="activity-details">
                    ${activity.transportMode ? `
                        <div class="detail-item">
                            <span class="detail-icon">${Utils.getTransportIcon(activity.transportMode)}</span>
                            <span>${activity.transportMode}</span>
                        </div>
                    ` : ''}
                    
                    ${activity.cost > 0 ? `
                        <div class="detail-item">
                            <span class="detail-icon">💰</span>
                            <span class="cost-display">${Utils.formatCurrency(activity.cost)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="detail-item">
                        <span class="detail-icon">${activity.isBooked() ? '✅' : '❌'}</span>
                        <span class="badge ${activity.isBooked() ? 'badge-success' : 'badge-warning'}">
                            ${activity.isBooked() ? 'Booked' : 'Not Booked'}
                        </span>
                    </div>
                </div>
                
                ${activity.additionalDetails ? `
                    <div class="activity-notes">
                        <strong>Notes:</strong> ${Utils.escapeHtml(activity.additionalDetails)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Edit activity
     * @param {string} activityId - Activity ID
     */
    editActivity(activityId) {
        const activity = this.dataManager.getActivityById(activityId);
        if (!activity) return;

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
                        { value: '', label: 'Select transport mode' },
                        { value: 'Flight', label: '✈️ Flight' },
                        { value: 'Train', label: '🚄 Train' },
                        { value: 'Car', label: '🚗 Car' },
                        { value: 'Bus', label: '🚌 Bus' },
                        { value: 'Uber', label: '🚕 Uber/Taxi' },
                        { value: 'Walking', label: '🚶 Walking' }
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
                    return true;
                } catch (error) {
                    notificationService.error(error.message);
                    return false;
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
     * @param {string} activityId - Activity ID
     */
    deleteActivity(activityId) {
        const activity = this.dataManager.getActivityById(activityId);
        if (!activity) return;

        if (confirm(`Are you sure you want to delete "${activity.activity}"?`)) {
            try {
                this.dataManager.deleteActivity(activityId);
                notificationService.success('Activity deleted successfully');
            } catch (error) {
                notificationService.error(error.message);
            }
        }
    }

    /**
     * Theme management
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

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

    loadThemePreference() {
        const savedTheme = localStorage.getItem('travel-app-theme') || this.options.theme;
        this.setTheme(savedTheme);
    }

    /**
     * Auto-save management
     */
    setAutoSave(enabled) {
        this.options.autoSave = enabled;

        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        if (enabled) {
            this.setupAutoSave();
        }

        this.saveSettings();
        notificationService.info(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear all data
     */
    confirmClearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.dataManager.clearAll();
            notificationService.success('All data cleared');

            // Close settings modal
            this.modals.get('settings')?.hide();
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            theme: this.currentTheme,
            autoSave: this.options.autoSave,
            keyboardShortcuts: this.options.keyboardShortcuts
        };

        localStorage.setItem('travel-app-settings', JSON.stringify(settings));
    }

    /**
     * Handle escape key
     */
    handleEscapeKey() {
        // Close any open modals
        this.modals.forEach(modal => {
            if (modal.isVisible) {
                modal.hide();
            }
        });

        // Clear search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput && document.activeElement === searchInput) {
            searchInput.blur();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Handle mobile responsiveness
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            this.closeMobileSidebar();
        }
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
     * Update last activity timestamp
     */
    updateLastActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Show initial loading
     */
    showInitialLoading() {
        // Loading handled by index.html
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
                        <h1 style="margin-bottom: 1rem;">❌ Initialization Error</h1>
                        <p style="margin-bottom: 2rem; line-height: 1.6;">
                            ${Utils.escapeHtml(error.message)}
                        </p>
                        <button onclick="location.reload()" style="
                            background: white;
                            color: #667eea;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 0.5rem;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Reload Application
                        </button>
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
     * Get application instance (for global access)
     */
    static getInstance() {
        return window.TravelApp?.getApp();
    }

    /**
     * Dispose of application and clean up resources
     */
    dispose() {
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
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

        // Remove global reference
        if (window.app === this) {
            delete window.app;
        }

        // Remove event listeners
        this.removeAllListeners();

        console.log('Application disposed');
    }
}

// Make app globally accessible for onclick handlers
window.app = null;

// Export for module usage
export default Application;