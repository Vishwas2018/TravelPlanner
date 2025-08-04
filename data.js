/**
 * Travel Itinerary Manager - Data Management
 * Handles all data operations, storage, and initial dataset
 */

class TravelDataManager {
    constructor() {
        this.activities = [];
        this.filteredActivities = [];
        this.filters = this.createDefaultFilters();
        this.init();
    }

    init() {
        this.loadInitialData();
        this.applyFilters();
    }

    createDefaultFilters() {
        return {
            search: '',
            startDate: '',
            endDate: '',
            transport: '',
            booking: ['TRUE', 'FALSE'],
            maxCost: 10000
        };
    }

    /**
     * Load the complete travel itinerary dataset
     */
    loadInitialData() {
        const initialData = [
            {
                activity: "Head to Melbourne Airport",
                date: "2025-09-19",
                day: "Friday",
                startTime: "17:00",
                endTime: "17:40",
                startFrom: "Home",
                reachTo: "Melbourne Airport",
                transportMode: "Uber",
                booking: "FALSE",
                cost: 100.00,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Fly to London",
                date: "2025-09-19",
                day: "Friday",
                startTime: "19:35",
                endTime: "03:50",
                startFrom: "Melbourne",
                reachTo: "New Delhi Airport",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 7800.00,
                additionalDetails: "Melbourne - Tullamarine, Terminal 2 AIR INDIA flight AI - 309",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel to London",
                date: "2025-09-20",
                day: "Saturday",
                startTime: "06:45",
                endTime: "11:30",
                startFrom: "New Delhi Airport",
                reachTo: "London Heathrow Airport",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 0.00,
                additionalDetails: "Delhi - Indira Gandhi International Airport, Terminal 3 AIR INDIA flight AI - 111",
                accommodationDetails: "N/A"
            },
            {
                activity: "Head to Sambhavna Home",
                date: "2025-09-20",
                day: "Saturday",
                startTime: "12:30",
                endTime: "13:30",
                startFrom: "London Heathrow Airport",
                reachTo: "19 Surrey Quays Rd, London SE16 2XU, UK",
                transportMode: "Tube",
                booking: "FALSE",
                cost: 50.00,
                additionalDetails: "Taxi or train",
                accommodationDetails: "N/A"
            },
            {
                activity: "Rest at Sambhavna Home",
                date: "2025-09-20",
                day: "Saturday",
                startTime: "13:30",
                endTime: "17:00",
                startFrom: "N/A",
                reachTo: "N/A",
                transportMode: "N/A",
                booking: "FALSE",
                cost: 0.00,
                additionalDetails: "",
                accommodationDetails: "19 Surrey Quays Rd, London SE16 2XU, UK"
            },
            {
                activity: "London Sightseeing",
                date: "2025-09-21",
                day: "Sunday",
                startTime: "08:00",
                endTime: "21:00",
                startFrom: "London City Centre",
                reachTo: "London City Centre",
                transportMode: "Walking",
                booking: "FALSE",
                cost: 400.00,
                additionalDetails: "Buckingham Palace, change of guard, Westminster Abbey, Madam Tussauds, London eye",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel To Edinburgh (Scotland)",
                date: "2025-09-24",
                day: "Wednesday",
                startTime: "08:00",
                endTime: "12:24",
                startFrom: "London Kings Cross (London North)",
                reachTo: "Waverley Train Station (Edinburgh)",
                transportMode: "Train",
                booking: "TRUE",
                cost: 219.44,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel to Paris",
                date: "2025-09-28",
                day: "Sunday",
                startTime: "06:00",
                endTime: "09:00",
                startFrom: "Edinburgh",
                reachTo: "Paris Roissy-CDG 2 Airport",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 549.99,
                additionalDetails: "Edinburgh (EDI) to Paris (CDG) Air France · AF1887",
                accommodationDetails: "N/A"
            },
            {
                activity: "Spend the day at Disneyland",
                date: "2025-09-28",
                day: "Sunday",
                startTime: "11:30",
                endTime: "21:30",
                startFrom: "Disneyland",
                reachTo: "N/A",
                transportMode: "N/A",
                booking: "TRUE",
                cost: 240.60,
                additionalDetails: "Spend the day at Disneyland",
                accommodationDetails: "N/A"
            },
            {
                activity: "Paris Sightseeing",
                date: "2025-09-29",
                day: "Monday",
                startTime: "11:00",
                endTime: "17:30",
                startFrom: "Eiffel Tower",
                reachTo: "N/A",
                transportMode: "N/A",
                booking: "FALSE",
                cost: 200.00,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Eurostar to London",
                date: "2025-09-29",
                day: "Monday",
                startTime: "21:00",
                endTime: "22:30",
                startFrom: "Paris Gare du Nord",
                reachTo: "London St Pancras Int'l",
                transportMode: "Train",
                booking: "TRUE",
                cost: 387.46,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel to Doha",
                date: "2025-10-01",
                day: "Wednesday",
                startTime: "15:35",
                endTime: "00:25",
                startFrom: "London - Heathrow, Terminal 4",
                reachTo: "Doha - Doha International Airport, Terminal",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 0,
                additionalDetails: "QATAR AIRWAYS CO WLL flight QR - 110",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel to Delhi",
                date: "2025-10-02",
                day: "Thursday",
                startTime: "02:25",
                endTime: "08:45",
                startFrom: "Doha - Doha International Airport, Terminal",
                reachTo: "Delhi - Indira Gandhi International Airport, Terminal 3",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 0.00,
                additionalDetails: "QATAR AIRWAYS CO WLL flight QR - 570",
                accommodationDetails: "N/A"
            },
            {
                activity: "Train to Sultanpur",
                date: "2025-10-02",
                day: "Thursday",
                startTime: "13:00",
                endTime: "00:00",
                startFrom: "Delhi",
                reachTo: "Sultanpur",
                transportMode: "Train",
                booking: "TRUE",
                cost: 200.00,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Ram Mandir Darshan",
                date: "2025-10-06",
                day: "Monday",
                startTime: "10:00",
                endTime: "12:00",
                startFrom: "Ayodhya",
                reachTo: "N/A",
                transportMode: "Car",
                booking: "FALSE",
                cost: 100.00,
                additionalDetails: "",
                accommodationDetails: "N/A"
            },
            {
                activity: "Travel to Melbourne",
                date: "2025-10-19",
                day: "Sunday",
                startTime: "01:15",
                endTime: "18:55",
                startFrom: "New Delhi (DEL)",
                reachTo: "Melbourne - Tullamarine, Terminal 2",
                transportMode: "Flight",
                booking: "TRUE",
                cost: 0.00,
                additionalDetails: "AIR INDIA flight AI - 308",
                accommodationDetails: "N/A"
            }
        ];

        this.activities = [...initialData];
        this.sortActivities();
    }

    /**
     * Sort activities by date and time
     */
    sortActivities() {
        this.activities.sort((a, b) => {
            const dateCompare = new Date(a.date) - new Date(b.date);
            if (dateCompare !== 0) return dateCompare;

            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
    }

    /**
     * Apply current filters to activities
     */
    applyFilters() {
        const { search, startDate, endDate, transport, booking, maxCost } = this.filters;

        this.filteredActivities = this.activities.filter(activity => {
            // Search filter
            if (search && !this.matchesSearch(activity, search.toLowerCase())) {
                return false;
            }

            // Date range filter
            if (startDate || endDate) {
                const activityDate = new Date(activity.date);
                if (startDate && activityDate < new Date(startDate)) return false;
                if (endDate && activityDate > new Date(endDate)) return false;
            }

            // Transport filter
            if (transport && activity.transportMode !== transport) return false;

            // Booking filter
            if (!booking.includes(activity.booking)) return false;

            // Cost filter
            const cost = parseFloat(activity.cost) || 0;
            if (cost > maxCost) return false;

            return true;
        });
    }

    /**
     * Check if activity matches search term
     */
    matchesSearch(activity, searchTerm) {
        if (!searchTerm) return true;

        const searchFields = [
            activity.activity,
            activity.startFrom,
            activity.reachTo,
            activity.transportMode,
            activity.additionalDetails,
            activity.accommodationDetails,
            activity.date,
            activity.day
        ];

        return searchFields.some(field =>
            field && field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Add new activity
     */
    addActivity(activityData) {
        if (!activityData) {
            throw new Error('Activity data is required');
        }

        this.activities.push(activityData);
        this.sortActivities();
        this.applyFilters();
    }

    /**
     * Update existing activity
     */
    updateActivity(index, activityData) {
        if (index < 0 || index >= this.activities.length) {
            throw new Error('Invalid activity index');
        }

        if (!activityData) {
            throw new Error('Activity data is required');
        }

        this.activities[index] = activityData;
        this.sortActivities();
        this.applyFilters();
    }

    /**
     * Delete activity
     */
    deleteActivity(index) {
        if (index < 0 || index >= this.activities.length) {
            throw new Error('Invalid activity index');
        }

        this.activities.splice(index, 1);
        this.applyFilters();
    }

    /**
     * Update filters
     */
    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.applyFilters();
    }

    /**
     * Reset filters to default
     */
    resetFilters() {
        this.filters = this.createDefaultFilters();
        this.applyFilters();
    }

    /**
     * Get dashboard statistics
     */
    getStatistics() {
        const totalActivities = this.activities.length;
        const totalCost = this.activities.reduce((sum, activity) => {
            const cost = parseFloat(activity.cost) || 0;
            return sum + cost;
        }, 0);
        const bookingsCount = this.activities.filter(activity => activity.booking === "TRUE").length;

        // Calculate trip duration
        const dates = this.activities
            .map(a => new Date(a.date))
            .filter(d => !isNaN(d.getTime()));

        const minDate = dates.length ? Math.min(...dates) : 0;
        const maxDate = dates.length ? Math.max(...dates) : 0;
        const totalDays = dates.length ? Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1 : 0;

        // Count unique countries based on locations
        const countries = this.getUniqueCountries();

        // Count accommodations
        const accommodations = this.activities.filter(activity =>
            activity.accommodationDetails &&
            activity.accommodationDetails !== 'N/A' &&
            activity.accommodationDetails !== '' &&
            !activity.accommodationDetails.includes('TBC')
        ).length;

        return {
            totalActivities,
            totalCost,
            totalDays,
            bookingsCount,
            totalCountries: countries.size,
            totalAccommodations: accommodations,
            countries: Array.from(countries)
        };
    }

    /**
     * Get unique countries from activities
     */
    getUniqueCountries() {
        const countries = new Set();

        this.activities.forEach(activity => {
            const locations = [activity.startFrom, activity.reachTo].join(' ').toLowerCase();

            if (locations.includes('melbourne') || locations.includes('australia')) {
                countries.add('Australia');
            }
            if (locations.includes('london') || locations.includes('edinburgh') ||
                locations.includes('cambridge') || locations.includes('uk') ||
                locations.includes('scotland') || locations.includes('fort william') ||
                locations.includes('dundee') || locations.includes('heathrow')) {
                countries.add('United Kingdom');
            }
            if (locations.includes('paris') || locations.includes('disneyland') ||
                locations.includes('france') || locations.includes('cdg')) {
                countries.add('France');
            }
            if (locations.includes('delhi') || locations.includes('ayodhya') ||
                locations.includes('goa') || locations.includes('pune') ||
                locations.includes('sultanpur') || locations.includes('shirdi') ||
                locations.includes('nashik') || locations.includes('madhavnagar') ||
                locations.includes('india') || locations.includes('sawantwadi')) {
                countries.add('India');
            }
            if (locations.includes('doha') || locations.includes('qatar')) {
                countries.add('Qatar');
            }
        });

        return countries;
    }

    /**
     * Group activities by date
     */
    getActivitiesByDate() {
        const grouped = {};
        this.filteredActivities.forEach(activity => {
            const date = activity.date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(activity);
        });
        return grouped;
    }

    /**
     * Export data to CSV format
     */
    exportToCSV() {
        const headers = [
            'Activity', 'Date', 'Day', 'Start Time', 'End Time',
            'From', 'To', 'Transport Mode', 'Booking Required',
            'Cost', 'Additional Details', 'Accommodation Details'
        ];

        const csvContent = [
            headers.join(','),
            ...this.activities.map(activity => [
                `"${(activity.activity || '').replace(/"/g, '""')}"`,
                activity.date || '',
                activity.day || '',
                activity.startTime || '',
                activity.endTime || '',
                `"${(activity.startFrom || '').replace(/"/g, '""')}"`,
                `"${(activity.reachTo || '').replace(/"/g, '""')}"`,
                activity.transportMode || '',
                activity.booking || 'FALSE',
                activity.cost || 0,
                `"${(activity.additionalDetails || '').replace(/"/g, '""')}"`,
                `"${(activity.accommodationDetails || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Get transport mode statistics
     */
    getTransportStats() {
        const transportCounts = {};
        this.activities.forEach(activity => {
            const transport = activity.transportMode || 'N/A';
            transportCounts[transport] = (transportCounts[transport] || 0) + 1;
        });
        return transportCounts;
    }

    /**
     * Get cost breakdown by category
     */
    getCostBreakdown() {
        const breakdown = {
            transport: 0,
            accommodation: 0,
            activities: 0,
            other: 0
        };

        this.activities.forEach(activity => {
            const cost = parseFloat(activity.cost) || 0;
            const isAccommodation = activity.accommodationDetails &&
                activity.accommodationDetails !== 'N/A' &&
                !activity.accommodationDetails.includes('TBC') &&
                activity.accommodationDetails.trim() !== '';

            const isTransport = activity.transportMode &&
                activity.transportMode !== 'N/A' &&
                activity.transportMode.trim() !== '';

            const activityName = (activity.activity || '').toLowerCase();
            const isActivityCost = activityName.includes('sightseeing') ||
                activityName.includes('disneyland') ||
                activityName.includes('darshan') ||
                activityName.includes('university');

            if (isAccommodation) {
                breakdown.accommodation += cost;
            } else if (isTransport && !isActivityCost) {
                breakdown.transport += cost;
            } else if (isActivityCost) {
                breakdown.activities += cost;
            } else {
                breakdown.other += cost;
            }
        });

        return breakdown;
    }

    /**
     * Get activities by date range
     */
    getActivitiesByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return this.activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate >= start && activityDate <= end;
        });
    }

    /**
     * Search activities
     */
    searchActivities(searchTerm) {
        if (!searchTerm) return this.activities;

        return this.activities.filter(activity =>
            this.matchesSearch(activity, searchTerm.toLowerCase())
        );
    }

    /**
     * Get activities by transport mode
     */
    getActivitiesByTransport(transportMode) {
        return this.activities.filter(activity =>
            activity.transportMode === transportMode
        );
    }

    /**
     * Get booking statistics
     */
    getBookingStats() {
        const booked = this.activities.filter(a => a.booking === 'TRUE').length;
        const notBooked = this.activities.filter(a => a.booking === 'FALSE').length;

        return {
            booked,
            notBooked,
            total: this.activities.length,
            bookedPercentage: this.activities.length > 0 ? Math.round((booked / this.activities.length) * 100) : 0
        };
    }

    /**
     * Validate activity data
     */
    validateActivity(activityData) {
        const errors = [];

        if (!activityData.activity || !activityData.activity.trim()) {
            errors.push('Activity name is required');
        }

        if (!activityData.date) {
            errors.push('Date is required');
        } else {
            const date = new Date(activityData.date);
            if (isNaN(date.getTime())) {
                errors.push('Invalid date format');
            }
        }

        if (activityData.cost && isNaN(parseFloat(activityData.cost))) {
            errors.push('Cost must be a valid number');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for global use
window.TravelDataManager = TravelDataManager;