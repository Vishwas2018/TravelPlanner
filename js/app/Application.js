/**
 * Travel Itinerary Manager - Optimized Main Application
 */

import { DataManager } from '../data/DataManager.js';
import { DashboardView, ItineraryView, TimelineView } from '../views/Views.js';
import { notificationService } from '../services/NotificationService.js';
import { VIEWS, EVENTS, SUCCESS_MESSAGES } from '../core/constants.js';
import { Utils } from '../core/utils.js';

export class Application {
    constructor(options = {}) {
        this.options = { container: options.container || document.body, ...options };
        this.dataManager = null;
        this.views = new Map();
        this.currentView = null;
        this.isInitialized = false;

        this.registerGlobalHandlers();
        this.init();
    }

    registerGlobalHandlers() {
        const createHandler = (method) => (...args) => {
            if (this.isInitialized) {
                this[method](...args);
            } else {
                setTimeout(() => this[method](...args), 100);
            }
        };

        window.handleEditActivity = createHandler('editActivity');
        window.handleDeleteActivity = createHandler('deleteActivity');
        window.handleDuplicateActivity = createHandler('duplicateActivity');
        window.downloadTemplate = createHandler('downloadTemplate');
        window.app = this;
    }

    async init() {
        try {
            this.showInitialLoading();

            // Initialize services
            this.dataManager = new DataManager();
            await this.dataManager.init();

            // Setup UI
            this.setupUI();
            this.registerViews();
            this.setupEventListeners();

            // Navigate to default view
            await this.navigateToView(VIEWS.DASHBOARD);

            this.isInitialized = true;
            this.hideInitialLoading();

            notificationService.success('Welcome to Travel Itinerary Manager! 🌍');
        } catch (error) {
            this.handleError(error, 'initialization');
        }
    }

    showInitialLoading() {
        const loader = document.getElementById('initialLoader');
        if (loader) loader.classList.remove('hidden');
    }

    hideInitialLoading() {
        const loader = document.getElementById('initialLoader');
        if (loader) loader.classList.add('hidden');

        const appContent = document.getElementById('appContent');
        if (appContent) appContent.classList.add('loaded');
    }

    setupUI() {
        const container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!container) throw new Error('Application container not found');

        container.innerHTML = `
            <div id="app" class="app-container">
                <aside id="sidebar" class="sidebar">
                    <div class="sidebar-header">
                        <div class="logo">
                            <div class="logo-icon">🌍</div>
                            <div class="logo-text">
                                <h1>Travel Manager</h1>
                                <span>v2.0.0</span>
                            </div>
                        </div>
                    </div>
                    <nav class="nav-sections">
                        <div class="nav-section">
                            <h3 class="nav-title">Navigation</h3>
                            <div class="nav-items" id="navigationItems"></div>
                        </div>
                        <div class="nav-section">
                            <h3 class="nav-title">Actions</h3>
                            <div class="action-buttons">
                                <button class="action-btn primary" id="addActivityBtn">➕ Add Activity</button>
                                <button class="action-btn secondary" id="exportBtn">📄 Export Data</button>
                                <button class="action-btn secondary" id="importBtn">📁 Import Data</button>
                            </div>
                        </div>
                        <div class="nav-section filters-section">
                            <h3 class="nav-title">Filters</h3>
                            <div id="filterControls"></div>
                        </div>
                    </nav>
                </aside>
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
                                    <input type="text" class="search-input" id="globalSearch" placeholder="Search activities..." />
                                </div>
                                <button class="header-btn" id="themeToggle" title="Toggle theme">🌙</button>
                            </div>
                        </div>
                    </header>
                    <div id="viewContainer" class="view-container"></div>
                </main>
            </div>
        `;

        this.setupNavigation();
        this.setupFilterControls();
    }

    setupNavigation() {
        const items = [
            { view: VIEWS.DASHBOARD, icon: '📊', label: 'Dashboard' },
            { view: VIEWS.ITINERARY, icon: '📋', label: 'Itinerary' },
            { view: VIEWS.TIMELINE, icon: '🕒', label: 'Timeline' }
        ];

        const container = document.getElementById('navigationItems');
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="nav-item" data-view="${item.view}" onclick="app.navigateToView('${item.view}')">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
                <div class="nav-indicator"></div>
            </div>
        `).join('');
    }

    setupFilterControls() {
        const container = document.getElementById('filterControls');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-group">
                <label class="filter-label">Transport Mode</label>
                <select class="filter-select" id="transportFilter">
                    <option value="">All Transport</option>
                    <option value="Flight">✈️ Flight</option>
                    <option value="Train">🚄 Train</option>
                    <option value="Car">🚗 Car</option>
                    <option value="Bus">🚌 Bus</option>
                    <option value="Uber">🚕 Uber</option>
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
                <button class="btn secondary" id="clearFiltersBtn" style="width: 100%;">Clear Filters</button>
            </div>
        `;

        this.setupFilterEventListeners();
    }

    setupFilterEventListeners() {
        const updateFilters = () => {
            const filters = {
                transport: document.getElementById('transportFilter')?.value || '',
                booking: document.getElementById('bookingFilter')?.value ? [document.getElementById('bookingFilter').value] : ['TRUE', 'FALSE'],
                startDate: document.getElementById('startDateFilter')?.value || '',
                endDate: document.getElementById('endDateFilter')?.value || ''
            };
            this.dataManager.updateFilters(filters);
        };

        ['transportFilter', 'bookingFilter', 'startDateFilter', 'endDateFilter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateFilters);
        });

        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            ['transportFilter', 'bookingFilter', 'startDateFilter', 'endDateFilter'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            this.dataManager.resetFilters();
            notificationService.info('Filters cleared');
        });
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((value) => {
                this.dataManager.updateFilters({ search: value });
            }, 300);
            searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
        }

        // Action buttons
        document.getElementById('addActivityBtn')?.addEventListener('click', () => this.openAddActivityModal());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('importBtn')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Data manager events
        this.dataManager.on(EVENTS.DATA_UPDATED, () => this.updateCurrentView());
        this.dataManager.on(EVENTS.ACTIVITY_ADDED, () => notificationService.success(SUCCESS_MESSAGES.ACTIVITY_ADDED));
        this.dataManager.on(EVENTS.ACTIVITY_UPDATED, () => notificationService.success(SUCCESS_MESSAGES.ACTIVITY_UPDATED));
        this.dataManager.on(EVENTS.ACTIVITY_DELETED, () => notificationService.success(SUCCESS_MESSAGES.ACTIVITY_DELETED));
    }

    registerViews() {
        this.views.set(VIEWS.DASHBOARD, new DashboardView(this.dataManager));
        this.views.set(VIEWS.ITINERARY, new ItineraryView(this.dataManager));
        this.views.set(VIEWS.TIMELINE, new TimelineView(this.dataManager));
    }

    async navigateToView(viewName) {
        if (this.currentView === viewName) return;

        const view = this.views.get(viewName);
        if (!view) return;

        try {
            const container = document.getElementById('viewContainer');
            if (!container) return;

            container.innerHTML = view.render();
            this.currentView = viewName;
            this.updateNavigationState(viewName);
        } catch (error) {
            this.handleError(error, `navigation to ${viewName}`);
        }
    }

    updateCurrentView() {
        if (this.currentView) {
            this.navigateToView(this.currentView);
        }
    }

    updateNavigationState(activeView) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === activeView);
        });

        const titles = {
            [VIEWS.DASHBOARD]: { title: 'Dashboard', subtitle: 'Overview of your travel itinerary' },
            [VIEWS.ITINERARY]: { title: 'Itinerary', subtitle: 'Detailed view of your activities' },
            [VIEWS.TIMELINE]: { title: 'Timeline', subtitle: 'Chronological view of your journey' }
        };

        const pageInfo = titles[activeView];
        if (pageInfo) {
            document.getElementById('pageTitle').textContent = pageInfo.title;
            document.getElementById('pageSubtitle').textContent = pageInfo.subtitle;
        }
    }

    openAddActivityModal() {
        this.showActivityModal();
    }

    editActivity(activityId) {
        const activity = this.dataManager.getActivityById(activityId);
        if (!activity) {
            notificationService.error('Activity not found');
            return;
        }
        this.showActivityModal(activity);
    }

    deleteActivity(activityId) {
        const activity = this.dataManager.getActivityById(activityId);
        if (!activity) {
            notificationService.error('Activity not found');
            return;
        }

        if (confirm(`Are you sure you want to delete "${activity.activity}"?`)) {
            this.dataManager.deleteActivity(activityId);
        }
    }

    duplicateActivity(activityId) {
        try {
            this.dataManager.duplicateActivity(activityId);
        } catch (error) {
            notificationService.error(error.message);
        }
    }

    showActivityModal(activity = null) {
        const isEdit = !!activity;
        const modal = this.createModal();

        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Edit' : 'Add'} Activity</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <form id="activityForm" class="modal-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label required">Activity Name</label>
                            <input type="text" class="form-input" name="activity" required 
                                   value="${activity?.activity || ''}" placeholder="e.g., Flight to Paris">
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Date</label>
                            <input type="date" class="form-input" name="date" required 
                                   value="${activity?.date || new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Start Time</label>
                            <input type="time" class="form-input" name="startTime" 
                                   value="${activity?.startTime || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">End Time</label>
                            <input type="time" class="form-input" name="endTime" 
                                   value="${activity?.endTime || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">From</label>
                            <input type="text" class="form-input" name="startFrom" 
                                   value="${activity?.startFrom || ''}" placeholder="Starting location">
                        </div>
                        <div class="form-group">
                            <label class="form-label">To</label>
                            <input type="text" class="form-input" name="reachTo" 
                                   value="${activity?.reachTo || ''}" placeholder="Destination">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Transport</label>
                            <select class="form-select" name="transportMode">
                                <option value="">Select transport mode</option>
                                <option value="Flight" ${activity?.transportMode === 'Flight' ? 'selected' : ''}>✈️ Flight</option>
                                <option value="Train" ${activity?.transportMode === 'Train' ? 'selected' : ''}>🚄 Train</option>
                                <option value="Car" ${activity?.transportMode === 'Car' ? 'selected' : ''}>🚗 Car</option>
                                <option value="Bus" ${activity?.transportMode === 'Bus' ? 'selected' : ''}>🚌 Bus</option>
                                <option value="Uber" ${activity?.transportMode === 'Uber' ? 'selected' : ''}>🚕 Uber</option>
                                <option value="Walking" ${activity?.transportMode === 'Walking' ? 'selected' : ''}>🚶 Walking</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Booking Status</label>
                            <select class="form-select" name="booking">
                                <option value="FALSE" ${activity?.booking === 'FALSE' ? 'selected' : ''}>Not Booked</option>
                                <option value="TRUE" ${activity?.booking === 'TRUE' ? 'selected' : ''}>Booked</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cost ($)</label>
                            <input type="number" class="form-input" name="cost" min="0" step="0.01" 
                                   value="${activity?.cost || 0}">
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label">Additional Details</label>
                            <textarea class="form-textarea" name="additionalDetails" rows="3" 
                                      placeholder="Any additional notes or details">${activity?.additionalDetails || ''}</textarea>
                        </div>
                        <div class="form-group full-width">
                            <label class="form-label">Accommodation</label>
                            <input type="text" class="form-input" name="accommodationDetails" 
                                   value="${activity?.accommodationDetails || ''}" placeholder="Hotel, booking details, etc.">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="app.saveActivity('${activity?.id || ''}')">
                    ${isEdit ? 'Update' : 'Add'} Activity
                </button>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    saveActivity(activityId = '') {
        const form = document.getElementById('activityForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            if (activityId) {
                this.dataManager.updateActivity(activityId, data);
            } else {
                this.dataManager.addActivity(data);
            }
            document.querySelector('.modal-overlay').remove();
        } catch (error) {
            notificationService.error(error.message);
        }
    }

    showExportModal() {
        const modal = this.createModal();
        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Export Data</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <button class="export-option" onclick="app.exportData('excel')">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                        <strong>Excel (.xlsx)</strong>
                        <p>Best for spreadsheet applications</p>
                    </button>
                    <button class="export-option" onclick="app.exportData('csv')">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                        <strong>CSV</strong>
                        <p>Universal format for data exchange</p>
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    exportData(format) {
        try {
            const csvContent = this.dataManager.exportToCSV();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `travel_itinerary_${timestamp}.csv`;

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            notificationService.success(SUCCESS_MESSAGES.DATA_EXPORTED);
            document.querySelector('.modal-overlay').remove();
        } catch (error) {
            notificationService.error('Export failed');
        }
    }

    showImportModal() {
        const modal = this.createModal();
        modal.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">Import Data</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="file-drop-zone" onclick="document.getElementById('fileInput').click()">
                    <div class="drop-zone-content">
                        <div class="drop-icon">📁</div>
                        <div class="drop-text">
                            <strong>Click to browse files</strong>
                            <p>Supported formats: CSV, Excel</p>
                        </div>
                    </div>
                </div>
                <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;" 
                       onchange="app.handleFileImport(event)">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-secondary" onclick="app.downloadTemplate()">📥 Download Template</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    downloadTemplate() {
        const template = `Activity,Date,Start Time,End Time,From,To,Transport Mode,Booking Required,Cost,Additional Details,Accommodation Details
Sample Flight,2025-09-19,09:00,17:00,Melbourne Airport,London Heathrow,Flight,TRUE,800,Bring passport,
Hotel Check-in,2025-09-19,19:00,20:00,London Heathrow,Hotel London,Taxi,TRUE,150,Booking: ABC123,Hotel London Room 401`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'travel_template.csv';
        a.click();
        URL.revokeObjectURL(url);

        notificationService.success(SUCCESS_MESSAGES.TEMPLATE_DOWNLOADED);
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());

                const activities = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    const values = lines[i].split(',').map(v => v.trim());
                    const activity = {};
                    headers.forEach((header, index) => {
                        activity[header] = values[index] || '';
                    });
                    activities.push(activity);
                }

                const result = this.dataManager.importActivities(activities);
                notificationService.success(`Imported ${result.imported} activities`);
                document.querySelector('.modal-overlay').remove();
            } catch (error) {
                notificationService.error('Import failed: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-dialog"><div class="modal-content"></div></div>';
        return modal.querySelector('.modal-content');
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('travel-app-theme', newTheme);
        document.querySelector('.theme-icon').textContent = newTheme === 'light' ? '🌙' : '☀️';
    }

    setItineraryViewMode(mode) {
        const view = this.views.get(VIEWS.ITINERARY);
        if (view) {
            view.setViewMode(mode);
            if (this.currentView === VIEWS.ITINERARY) {
                this.navigateToView(VIEWS.ITINERARY);
            }
        }
    }

    handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        notificationService.error(`Error: ${error.message}`);
    }

    isReady() {
        return this.isInitialized;
    }

    dispose() {
        if (this.dataManager) {
            this.dataManager.dispose();
        }
        notificationService.dispose();
    }
}