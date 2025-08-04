/**
 * Travel Itinerary Manager - Main Application Logic
 * Coordinates all components and handles user interactions
 */

class TravelItineraryApp {
    constructor() {
        this.dataManager = new TravelDataManager();
        this.currentView = 'dashboard';
        this.currentViewMode = 'grouped';
        this.editingIndex = -1;
        this.theme = 'light';

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.loadThemePreference();
        this.setupEventListeners();
        this.setupFilterControls();
        this.renderCurrentView();
        this.updateDashboard();

        TravelComponents.createNotification('Welcome to your Travel Dashboard! 🌍', 'success');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Navigation events
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // Action button events
        document.getElementById('addActivityBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Search functionality
        const searchInput = document.getElementById('globalSearch');
        const debouncedSearch = TravelComponents.debounce((value) => {
            this.handleSearch(value);
        }, 300);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal events
        this.setupModalEvents();

        // Form events
        this.setupFormEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Setup modal event listeners
     */
    setupModalEvents() {
        const modal = document.getElementById('activityModal');
        const closeBtn = document.getElementById('modalClose');

        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        TravelComponents.setupModalBackdropClose('activityModal', () => {
            this.closeModal();
        });
    }

    /**
     * Setup form event listeners
     */
    setupFormEvents() {
        const form = document.getElementById('activityForm');

        // Auto-populate day when date is selected
        const dateInput = form.querySelector('input[name="date"]');
        dateInput.addEventListener('change', (e) => {
            const date = new Date(e.target.value);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            form.querySelector('select[name="day"]').value = days[date.getDay()];
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveActivity(new FormData(e.target));
        });

        // Cancel button
        form.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            this.closeModal();
        });
    }

    /**
     * Setup filter controls
     */
    setupFilterControls() {
        const filterContainer = document.getElementById('filterControls');
        filterContainer.innerHTML = TravelComponents.createFilterControls();

        // Setup filter event listeners
        const startDateFilter = document.getElementById('startDateFilter');
        const endDateFilter = document.getElementById('endDateFilter');
        const transportFilter = document.getElementById('transportFilter');
        const costFilter = document.getElementById('costFilter');
        const bookingCheckboxes = document.querySelectorAll('input[data-booking]');

        startDateFilter.addEventListener('change', () => this.applyFilters());
        endDateFilter.addEventListener('change', () => this.applyFilters());
        transportFilter.addEventListener('change', () => this.applyFilters());
        costFilter.addEventListener('input', () => this.applyFilters());

        bookingCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Cost filter display update
        costFilter.addEventListener('input', (e) => {
            document.getElementById('costFilterValue').textContent =
                TravelComponents.formatCurrency(e.target.value);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.key === 'Escape') {
            this.closeModal();
        }

        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    this.openAddModal();
                    break;
                case 'e':
                    e.preventDefault();
                    this.exportData();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('globalSearch').focus();
                    break;
            }
        }

        // Number keys for quick navigation
        if (e.altKey) {
            const views = ['dashboard', 'itinerary', 'timeline', 'map'];
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= views.length) {
                e.preventDefault();
                this.switchView(views[keyNum - 1]);
            }
        }
    }

    /**
     * Switch between different views
     */
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        this.currentView = viewName;
        this.renderCurrentView();
        this.updatePageTitle(viewName);
    }

    /**
     * Update page title based on current view
     */
    updatePageTitle(viewName) {
        const titles = {
            dashboard: 'Travel Dashboard',
            itinerary: 'Travel Itinerary',
            timeline: 'Journey Timeline',
            map: 'Route Map'
        };

        const pageTitle = document.querySelector('.page-title');
        const pageSubtitle = document.querySelector('.page-subtitle');

        pageTitle.textContent = titles[viewName] || 'Travel Manager';

        const subtitles = {
            dashboard: 'Overview of your complete journey',
            itinerary: 'Detailed activity planning',
            timeline: 'Chronological view of your trip',
            map: 'Geographic route visualization'
        };

        pageSubtitle.textContent = subtitles[viewName] || 'Manage your travel plans';
    }

    /**
     * Render the current view
     */
    renderCurrentView() {
        const viewContainer = document.getElementById('viewContainer');

        // Add loading state
        viewContainer.innerHTML = TravelComponents.createLoadingSpinner('Loading view...');

        // Simulate loading delay for smooth transitions
        setTimeout(() => {
            switch(this.currentView) {
                case 'dashboard':
                    this.renderDashboard();
                    break;
                case 'itinerary':
                    this.renderItinerary();
                    break;
                case 'timeline':
                    this.renderTimeline();
                    break;
                case 'map':
                    this.renderMapView();
                    break;
            }
        }, 300);
    }

    /**
     * Render dashboard view
     */
    renderDashboard() {
        const viewContainer = document.getElementById('viewContainer');
        const stats = this.dataManager.getStatistics();
        const costBreakdown = this.dataManager.getCostBreakdown();

        const dashboardHTML = `
            <div class="dashboard-grid">
                ${TravelComponents.createMetricCard('🎯', stats.totalActivities, 'Total Activities', { type: 'positive', text: 'All planned' })}
                ${TravelComponents.createMetricCard('💰', TravelComponents.formatCurrency(stats.totalCost), 'Total Budget', { type: 'positive', text: 'Within range' })}
                ${TravelComponents.createMetricCard('📅', `${stats.totalDays} days`, 'Trip Duration', { type: 'positive', text: 'Perfect timing' })}
                ${TravelComponents.createMetricCard('✅', stats.bookingsCount, 'Bookings Made', { type: 'positive', text: 'On track' })}
                ${TravelComponents.createMetricCard('🗺️', stats.totalCountries, 'Countries', { type: 'positive', text: 'Amazing journey' })}
                ${TravelComponents.createMetricCard('🏨', stats.totalAccommodations, 'Accommodations', { type: 'positive', text: 'All set' })}
            </div>

            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Trip Overview</h2>
                </div>
                <div style="padding: var(--space-8);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); margin-bottom: var(--space-8);">
                        <div>
                            <h3 style="margin-bottom: var(--space-4); color: var(--gray-700);">📊 Cost Breakdown</h3>
                            <div style="background: var(--gray-50); padding: var(--space-4); border-radius: var(--radius-lg);">
                                <div style="margin-bottom: var(--space-3);">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
                                        <span>🚗 Transport</span>
                                        <span class="cost-display">${TravelComponents.formatCurrency(costBreakdown.transport)}</span>
                                    </div>
                                    ${TravelComponents.createProgressBar(Math.round((costBreakdown.transport / stats.totalCost) * 100))}
                                </div>
                                <div style="margin-bottom: var(--space-3);">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
                                        <span>🏨 Accommodation</span>
                                        <span class="cost-display">${TravelComponents.formatCurrency(costBreakdown.accommodation)}</span>
                                    </div>
                                    ${TravelComponents.createProgressBar(Math.round((costBreakdown.accommodation / stats.totalCost) * 100))}
                                </div>
                                <div style="margin-bottom: var(--space-3);">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
                                        <span>🎯 Activities</span>
                                        <span class="cost-display">${TravelComponents.formatCurrency(costBreakdown.activities)}</span>
                                    </div>
                                    ${TravelComponents.createProgressBar(Math.round((costBreakdown.activities / stats.totalCost) * 100))}
                                </div>
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-1);">
                                        <span>📋 Other</span>
                                        <span class="cost-display">${TravelComponents.formatCurrency(costBreakdown.other)}</span>
                                    </div>
                                    ${TravelComponents.createProgressBar(Math.round((costBreakdown.other / stats.totalCost) * 100))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 style="margin-bottom: var(--space-4); color: var(--gray-700);">🌍 Countries Visiting</h3>
                            <div style="background: var(--gray-50); padding: var(--space-4); border-radius: var(--radius-lg);">
                                ${stats.countries.map(country => {
            const flags = {
                'Australia': '🇦🇺',
                'United Kingdom': '🇬🇧',
                'France': '🇫🇷',
                'India': '🇮🇳',
                'Qatar': '🇶🇦'
            };
            return `
                                        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); padding: var(--space-3); background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow-sm);">
                                            <span style="font-size: var(--font-size-2xl);">${flags[country] || '🌍'}</span>
                                            <span style="font-weight: 500;">${country}</span>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="margin-bottom: var(--space-4); color: var(--gray-700);">🚀 Quick Actions</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);">
                            <button class="btn primary" onclick="app.switchView('itinerary')" style="padding: var(--space-4); height: auto;">
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2);">📋</div>
                                    <div>View Itinerary</div>
                                </div>
                            </button>
                            <button class="btn secondary" onclick="app.openAddModal()" style="padding: var(--space-4); height: auto;">
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2);">➕</div>
                                    <div>Add Activity</div>
                                </div>
                            </button>
                            <button class="btn secondary" onclick="app.exportData()" style="padding: var(--space-4); height: auto;">
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2);">📄</div>
                                    <div>Export Data</div>
                                </div>
                            </button>
                            <button class="btn secondary" onclick="app.switchView('timeline')" style="padding: var(--space-4); height: auto;">
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-size-2xl); margin-bottom: var(--space-2);">🕒</div>
                                    <div>View Timeline</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        viewContainer.innerHTML = dashboardHTML;
    }

    /**
     * Render itinerary view
     */
    renderItinerary() {
        const viewContainer = document.getElementById('viewContainer');

        const itineraryHTML = `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Travel Itinerary</h2>
                    <div class="view-toggles">
                        <button class="view-toggle ${this.currentViewMode === 'grouped' ? 'active' : ''}" onclick="app.toggleViewMode('grouped')">
                            📋 Grouped
                        </button>
                        <button class="view-toggle ${this.currentViewMode === 'list' ? 'active' : ''}" onclick="app.toggleViewMode('list')">
                            📝 List
                        </button>
                    </div>
                </div>
                <div style="padding: var(--space-8);" id="itineraryContent">
                    ${this.renderItineraryContent()}
                </div>
            </div>
        `;

        viewContainer.innerHTML = itineraryHTML;
    }

    /**
     * Render itinerary content based on view mode
     */
    renderItineraryContent() {
        if (this.dataManager.filteredActivities.length === 0) {
            return TravelComponents.createEmptyState(
                '🗺️',
                'No activities found',
                'Try adjusting your filters or add some activities to get started.',
                { text: 'Add Activity', onClick: 'app.openAddModal()' }
            );
        }

        if (this.currentViewMode === 'grouped') {
            return this.renderGroupedActivities();
        } else {
            return this.renderListActivities();
        }
    }

    /**
     * Render activities grouped by date
     */
    renderGroupedActivities() {
        const groupedActivities = this.dataManager.getActivitiesByDate();
        const sortedDates = Object.keys(groupedActivities).sort();

        return sortedDates.map(date => {
            const activities = groupedActivities[date];
            return `
                <div class="date-group" style="margin-bottom: var(--space-8);">
                    ${TravelComponents.createDateGroupHeader(date, activities)}
                    <div class="activity-list">
                        ${activities.map((activity, index) =>
                TravelComponents.createActivityCard(activity, this.dataManager.activities.indexOf(activity))
            ).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render activities as a simple list
     */
    renderListActivities() {
        return `
            <div class="activity-list">
                ${this.dataManager.filteredActivities.map((activity, index) =>
            TravelComponents.createActivityCard(activity, this.dataManager.activities.indexOf(activity), true)
        ).join('')}
            </div>
        `;
    }

    /**
     * Render timeline view
     */
    renderTimeline() {
        const viewContainer = document.getElementById('viewContainer');

        if (this.dataManager.filteredActivities.length === 0) {
            viewContainer.innerHTML = `
                <div class="content-section">
                    <div class="section-header">
                        <h2 class="section-title">Journey Timeline</h2>
                    </div>
                    <div style="padding: var(--space-8);">
                        ${TravelComponents.createEmptyState('🕒', 'No timeline to display', 'Add some activities to see your journey timeline.')}
                    </div>
                </div>
            `;
            return;
        }

        const timelineHTML = `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Journey Timeline</h2>
                </div>
                <div style="padding: var(--space-8);">
                    <div class="timeline">
                        ${this.dataManager.filteredActivities.map((activity, index) =>
            TravelComponents.createTimelineItem(activity, index)
        ).join('')}
                    </div>
                </div>
            </div>
        `;

        viewContainer.innerHTML = timelineHTML;
    }

    /**
     * Render map view (placeholder)
     */
    renderMapView() {
        const viewContainer = document.getElementById('viewContainer');

        const mapHTML = `
            <div class="content-section">
                <div class="section-header">
                    <h2 class="section-title">Route Map</h2>
                </div>
                <div style="padding: var(--space-8);">
                    ${TravelComponents.createChartPlaceholder(
            'Interactive Route Map',
            'This feature will show your complete travel route on an interactive map with markers for each destination, flight paths, and travel connections.'
        )}
                    <div style="margin-top: var(--space-6);">
                        <h3 style="margin-bottom: var(--space-4);">🗺️ Route Overview</h3>
                        <div style="background: var(--gray-50); padding: var(--space-6); border-radius: var(--radius-lg);">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-4);">
                                <div style="text-align: center; padding: var(--space-4);">
                                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">🇦🇺</div>
                                    <div style="font-weight: 600;">Melbourne</div>
                                    <div style="color: var(--gray-500); font-size: var(--font-size-sm);">Starting Point</div>
                                </div>
                                <div style="text-align: center; padding: var(--space-4);">
                                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">🇬🇧</div>
                                    <div style="font-weight: 600;">London & Scotland</div>
                                    <div style="color: var(--gray-500); font-size: var(--font-size-sm);">European Adventure</div>
                                </div>
                                <div style="text-align: center; padding: var(--space-4);">
                                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">🇫🇷</div>
                                    <div style="font-weight: 600;">Paris</div>
                                    <div style="color: var(--gray-500); font-size: var(--font-size-sm);">City of Light</div>
                                </div>
                                <div style="text-align: center; padding: var(--space-4);">
                                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">🇮🇳</div>
                                    <div style="font-weight: 600;">India</div>
                                    <div style="color: var(--gray-500); font-size: var(--font-size-sm);">Cultural Journey</div>
                                </div>
                                <div style="text-align: center; padding: var(--space-4);">
                                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">🇦🇺</div>
                                    <div style="font-weight: 600;">Melbourne</div>
                                    <div style="color: var(--gray-500); font-size: var(--font-size-sm);">Return Home</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        viewContainer.innerHTML = mapHTML;
    }

    /**
     * Toggle between view modes
     */
    toggleViewMode(mode) {
        this.currentViewMode = mode;
        const itineraryContent = document.getElementById('itineraryContent');
        if (itineraryContent) {
            itineraryContent.innerHTML = TravelComponents.createLoadingSpinner('Switching view...');
            setTimeout(() => {
                itineraryContent.innerHTML = this.renderItineraryContent();
            }, 200);
        }
    }

    /**
     * Update dashboard statistics
     */
    updateDashboard() {
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        }
    }

    /**
     * Handle search functionality
     */
    handleSearch(searchTerm) {
        this.dataManager.updateFilters({ search: searchTerm });
        this.renderCurrentView();

        if (searchTerm) {
            TravelComponents.createNotification(
                `Found ${this.dataManager.filteredActivities.length} activities matching "${searchTerm}"`,
                'info'
            );
        }
    }

    /**
     * Apply filters with error handling
     */
    applyFilters() {
        try {
            const startDate = document.getElementById('startDateFilter')?.value || '';
            const endDate = document.getElementById('endDateFilter')?.value || '';
            const transport = document.getElementById('transportFilter')?.value || '';
            const maxCost = parseInt(document.getElementById('costFilter')?.value || '10000', 10);

            const bookingCheckboxes = document.querySelectorAll('input[data-booking]');
            const bookingFilters = Array.from(bookingCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.booking);

            this.dataManager.updateFilters({
                startDate,
                endDate,
                transport,
                booking: bookingFilters,
                maxCost
            });

            this.renderCurrentView();
        } catch (error) {
            console.error('Error applying filters:', error);
            TravelComponents.createNotification('Error applying filters', 'error');
        }
    }

    /**
     * Clear all filters with proper reset
     */
    clearFilters() {
        try {
            // Reset form elements
            const startDateFilter = document.getElementById('startDateFilter');
            const endDateFilter = document.getElementById('endDateFilter');
            const transportFilter = document.getElementById('transportFilter');
            const costFilter = document.getElementById('costFilter');
            const costFilterValue = document.getElementById('costFilterValue');
            const globalSearch = document.getElementById('globalSearch');

            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (transportFilter) transportFilter.value = '';
            if (costFilter) costFilter.value = '10000';
            if (costFilterValue) costFilterValue.textContent = TravelComponents.formatCurrency(10000);
            if (globalSearch) globalSearch.value = '';

            document.querySelectorAll('input[data-booking]').forEach(cb => {
                cb.checked = true;
            });

            // Reset data manager filters
            this.dataManager.updateFilters({
                search: '',
                startDate: '',
                endDate: '',
                transport: '',
                booking: ['TRUE', 'FALSE'],
                maxCost: 10000
            });

            this.renderCurrentView();
            TravelComponents.createNotification('All filters cleared', 'info');
        } catch (error) {
            console.error('Error clearing filters:', error);
            TravelComponents.createNotification('Error clearing filters', 'error');
        }
    }

    /**
     * Open add activity modal with proper setup
     */
    openAddModal() {
        try {
            this.editingIndex = -1;
            const modalTitle = document.getElementById('modalTitle');
            const activityForm = document.getElementById('activityForm');
            const modal = document.getElementById('activityModal');

            if (modalTitle) modalTitle.textContent = 'Add New Activity';
            if (activityForm) activityForm.reset();
            if (modal) modal.classList.add('active');

            // Focus on first input with delay
            setTimeout(() => {
                const firstInput = document.querySelector('input[name="activity"]');
                if (firstInput) firstInput.focus();
            }, 100);
        } catch (error) {
            console.error('Error opening modal:', error);
            TravelComponents.createNotification('Error opening form', 'error');
        }
    }

    /**
     * Edit existing activity with validation
     */
    editActivity(index) {
        try {
            const activity = this.dataManager.activities[index];

            if (!activity) {
                TravelComponents.createNotification('Activity not found', 'error');
                return;
            }

            this.editingIndex = index;
            const modalTitle = document.getElementById('modalTitle');
            const modal = document.getElementById('activityModal');

            if (modalTitle) modalTitle.textContent = 'Edit Activity';

            const form = document.getElementById('activityForm');
            if (form) {
                // Safely populate form fields
                const fields = [
                    'activity', 'date', 'day', 'startTime', 'endTime',
                    'startFrom', 'reachTo', 'transportMode', 'booking',
                    'cost', 'additionalDetails', 'accommodationDetails'
                ];

                fields.forEach(fieldName => {
                    const field = form.querySelector(`[name="${fieldName}"]`);
                    if (field) {
                        field.value = activity[fieldName] || '';
                    }
                });
            }

            if (modal) modal.classList.add('active');
        } catch (error) {
            console.error('Error editing activity:', error);
            TravelComponents.createNotification('Error loading activity for editing', 'error');
        }
    }

    /**
     * Delete activity with confirmation
     */
    deleteActivity(index) {
        try {
            const activity = this.dataManager.activities[index];
            if (!activity) {
                TravelComponents.createNotification('Activity not found', 'error');
                return;
            }

            const activityName = activity.activity || 'this activity';
            if (confirm(`Are you sure you want to delete "${activityName}"?`)) {
                this.dataManager.deleteActivity(index);
                this.renderCurrentView();
                this.updateDashboard();
                TravelComponents.createNotification('Activity deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            TravelComponents.createNotification('Error deleting activity', 'error');
        }
    }

    /**
     * Close modal with cleanup
     */
    closeModal() {
        try {
            const modal = document.getElementById('activityModal');
            if (modal) {
                modal.classList.remove('active');
            }
            this.editingIndex = -1;
        } catch (error) {
            console.error('Error closing modal:', error);
        }
    }

    /**
     * Save activity with validation
     */
    saveActivity(formData) {
        try {
            // Validate required fields
            const activityName = formData.get('activity');
            const activityDate = formData.get('date');

            if (!activityName || !activityName.trim()) {
                TravelComponents.createNotification('Activity name is required', 'error');
                return;
            }

            if (!activityDate) {
                TravelComponents.createNotification('Date is required', 'error');
                return;
            }

            const activityData = {
                activity: activityName.trim(),
                date: activityDate,
                day: formData.get('day') || '',
                startTime: formData.get('startTime') || '',
                endTime: formData.get('endTime') || '',
                startFrom: formData.get('startFrom') || '',
                reachTo: formData.get('reachTo') || '',
                transportMode: formData.get('transportMode') || '',
                booking: formData.get('booking') || 'FALSE',
                cost: parseFloat(formData.get('cost')) || 0,
                additionalDetails: formData.get('additionalDetails') || '',
                accommodationDetails: formData.get('accommodationDetails') || ''
            };

            if (this.editingIndex >= 0) {
                this.dataManager.updateActivity(this.editingIndex, activityData);
                TravelComponents.createNotification('Activity updated successfully', 'success');
            } else {
                this.dataManager.addActivity(activityData);
                TravelComponents.createNotification('Activity added successfully', 'success');
            }

            this.closeModal();
            this.renderCurrentView();
            this.updateDashboard();
        } catch (error) {
            console.error('Error saving activity:', error);
            TravelComponents.createNotification('Error saving activity', 'error');
        }
    }

    /**
     * Export data with error handling
     */
    exportData() {
        try {
            const csvContent = this.dataManager.exportToCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = `travel-itinerary-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            TravelComponents.createNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            TravelComponents.createNotification('Export failed. Please try again.', 'error');
        }
    }

    /**
     * Toggle theme with proper storage
     */
    toggleTheme() {
        try {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.theme);

            // Store theme preference
            try {
                localStorage.setItem('travel-app-theme', this.theme);
            } catch (e) {
                // Ignore storage errors
            }

            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
            }

            TravelComponents.createNotification(
                `Switched to ${this.theme} theme`,
                'info'
            );
        } catch (error) {
            console.error('Error toggling theme:', error);
        }
    }

    /**
     * Load saved theme preference
     */
    loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem('travel-app-theme');
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                this.theme = savedTheme;
                document.documentElement.setAttribute('data-theme', this.theme);

                const themeIcon = document.querySelector('.theme-icon');
                if (themeIcon) {
                    themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️';
                }
            }
        } catch (error) {
            // Ignore storage errors, use default theme
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create global app instance
        window.app = new TravelItineraryApp();

        console.log('🌍 Travel Itinerary Manager loaded successfully!');
        console.log('📋 Keyboard shortcuts:');
        console.log('  Ctrl+N: Add new activity');
        console.log('  Ctrl+E: Export data');
        console.log('  Ctrl+F: Focus search');
        console.log('  Alt+1-4: Switch views');
        console.log('  Esc: Close modal');
    } catch (error) {
        console.error('Failed to initialize application:', error);

        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; z-index: 10000;">
                <h2>⚠️ Application Error</h2>
                <p>Failed to load the travel itinerary manager.</p>
                <p>Please refresh the page to try again.</p>
                <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                    Reload Page
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
});