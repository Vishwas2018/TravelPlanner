/**
 * Travel Itinerary Manager - DataManager Tests
 * Comprehensive tests for the DataManager class
 */

import { DataManager } from '../../js/data/DataManager.js';
import { ActivityModel } from '../../js/data/ActivityModel.js';
import { EVENTS, BOOKING_STATUS, COST_CATEGORIES } from '../../js/core/constants.js';

describe('DataManager', () => {
    let dataManager;
    let mockStorage;

    beforeEach(() => {
        // Mock storage manager
        mockStorage = {
            load: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(true),
            backup: jest.fn().mockReturnValue(true),
            listBackups: jest.fn().mockReturnValue([]),
            restoreFromBackup: jest.fn().mockReturnValue(true)
        };

        dataManager = new DataManager();
        dataManager.storage = mockStorage;

        // Clear sample data for clean testing
        dataManager.activities = [];
        dataManager.filteredActivities = [];

        jest.clearAllMocks();
    });

    afterEach(() => {
        dataManager.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(dataManager.activities).toEqual([]);
            expect(dataManager.filteredActivities).toEqual([]);
            expect(dataManager.filters).toBeDefined();
            expect(dataManager.isLoading).toBe(false);
            expect(dataManager.isDirty).toBe(false);
        });

        test('should load sample data when no stored data exists', async () => {
            mockStorage.load.mockResolvedValue(null);

            await dataManager.init();

            expect(dataManager.activities.length).toBeGreaterThan(0);
            expect(dataManager.filteredActivities.length).toBeGreaterThan(0);
        });

        test('should load data from storage when available', async () => {
            const mockData = {
                activities: [{
                    id: 'test-id',
                    activity: 'Test Activity',
                    date: '2025-09-19',
                    cost: 100
                }],
                filters: { search: 'test' }
            };

            mockStorage.load.mockResolvedValue(mockData);

            await dataManager.init();

            expect(dataManager.activities).toHaveLength(1);
            expect(dataManager.activities[0]).toBeInstanceOf(ActivityModel);
            expect(dataManager.activities[0].activity).toBe('Test Activity');
            expect(dataManager.filters.search).toBe('test');
        });
    });

    describe('Activity Management', () => {
        describe('addActivity', () => {
            test('should add valid activity', () => {
                const activityData = {
                    activity: 'Test Activity',
                    date: '2025-09-19',
                    cost: 100
                };

                const addedActivity = dataManager.addActivity(activityData);

                expect(addedActivity).toBeInstanceOf(ActivityModel);
                expect(dataManager.activities).toHaveLength(1);
                expect(dataManager.activities[0]).toBe(addedActivity);
                expect(dataManager.isDirty).toBe(true);
            });

            test('should emit events when activity is added', () => {
                const eventSpy = jest.fn();
                dataManager.on(EVENTS.ACTIVITY_ADDED, eventSpy);
                dataManager.on(EVENTS.DATA_UPDATED, eventSpy);

                const activityData = {
                    activity: 'Test Activity',
                    date: '2025-09-19',
                    cost: 100
                };

                dataManager.addActivity(activityData);

                expect(eventSpy).toHaveBeenCalledTimes(2);
            });

            test('should throw error for invalid activity', () => {
                const invalidData = {
                    // Missing required fields
                    cost: -100
                };

                expect(() => {
                    dataManager.addActivity(invalidData);
                }).toThrow();

                expect(dataManager.activities).toHaveLength(0);
            });

            test('should sort activities after adding', () => {
                const activity1 = { activity: 'Activity 1', date: '2025-09-20', cost: 100 };
                const activity2 = { activity: 'Activity 2', date: '2025-09-19', cost: 200 };

                dataManager.addActivity(activity1);
                dataManager.addActivity(activity2);

                expect(dataManager.activities[0].date).toBe('2025-09-19');
                expect(dataManager.activities[1].date).toBe('2025-09-20');
            });
        });

        describe('updateActivity', () => {
            test('should update existing activity', () => {
                const activity = dataManager.addActivity({
                    activity: 'Original',
                    date: '2025-09-19',
                    cost: 100
                });

                const updated = dataManager.updateActivity(activity.id, {
                    activity: 'Updated',
                    cost: 200
                });

                expect(updated.activity).toBe('Updated');
                expect(updated.cost).toBe(200);
                expect(updated.version).toBe(2); // Version should increment
            });

            test('should emit events when activity is updated', () => {
                const eventSpy = jest.fn();
                dataManager.on(EVENTS.ACTIVITY_UPDATED, eventSpy);
                dataManager.on(EVENTS.DATA_UPDATED, eventSpy);

                const activity = dataManager.addActivity({
                    activity: 'Test',
                    date: '2025-09-19',
                    cost: 100
                });

                dataManager.updateActivity(activity.id, { cost: 200 });

                expect(eventSpy).toHaveBeenCalledTimes(2);
            });

            test('should throw error for non-existent activity', () => {
                expect(() => {
                    dataManager.updateActivity('non-existent-id', {});
                }).toThrow('Activity not found');
            });

            test('should throw error for invalid update data', () => {
                const activity = dataManager.addActivity({
                    activity: 'Test',
                    date: '2025-09-19',
                    cost: 100
                });

                expect(() => {
                    dataManager.updateActivity(activity.id, {
                        activity: '', // Invalid: empty activity name
                        cost: -100 // Invalid: negative cost
                    });
                }).toThrow();
            });
        });

        describe('deleteActivity', () => {
            test('should delete existing activity', () => {
                const activity = dataManager.addActivity({
                    activity: 'To Delete',
                    date: '2025-09-19',
                    cost: 100
                });

                const deleted = dataManager.deleteActivity(activity.id);

                expect(deleted).toBe(activity);
                expect(dataManager.activities).toHaveLength(0);
                expect(dataManager.isDirty).toBe(true);
            });

            test('should emit events when activity is deleted', () => {
                const eventSpy = jest.fn();
                dataManager.on(EVENTS.ACTIVITY_DELETED, eventSpy);
                dataManager.on(EVENTS.DATA_UPDATED, eventSpy);

                const activity = dataManager.addActivity({
                    activity: 'Test',
                    date: '2025-09-19',
                    cost: 100
                });

                dataManager.deleteActivity(activity.id);

                expect(eventSpy).toHaveBeenCalledTimes(2);
            });

            test('should throw error for non-existent activity', () => {
                expect(() => {
                    dataManager.deleteActivity('non-existent-id');
                }).toThrow('Activity not found');
            });
        });

        describe('bulkDeleteActivities', () => {
            test('should delete multiple activities', () => {
                const activity1 = dataManager.addActivity({
                    activity: 'Activity 1',
                    date: '2025-09-19',
                    cost: 100
                });
                const activity2 = dataManager.addActivity({
                    activity: 'Activity 2',
                    date: '2025-09-20',
                    cost: 200
                });
                const activity3 = dataManager.addActivity({
                    activity: 'Activity 3',
                    date: '2025-09-21',
                    cost: 300
                });

                const deleted = dataManager.bulkDeleteActivities([activity1.id, activity3.id]);

                expect(deleted).toHaveLength(2);
                expect(dataManager.activities).toHaveLength(1);
                expect(dataManager.activities[0]).toBe(activity2);
            });

            test('should handle non-existent IDs gracefully', () => {
                const activity = dataManager.addActivity({
                    activity: 'Test Activity',
                    date: '2025-09-19',
                    cost: 100
                });

                const deleted = dataManager.bulkDeleteActivities([
                    activity.id,
                    'non-existent-1',
                    'non-existent-2'
                ]);

                expect(deleted).toHaveLength(1);
                expect(deleted[0]).toBe(activity);
                expect(dataManager.activities).toHaveLength(0);
            });
        });

        describe('duplicateActivity', () => {
            test('should duplicate existing activity', () => {
                const original = dataManager.addActivity({
                    activity: 'Original Activity',
                    date: '2025-09-19',
                    cost: 100
                });

                const duplicated = dataManager.duplicateActivity(original.id);

                expect(duplicated.id).not.toBe(original.id);
                expect(duplicated.activity).toBe('Original Activity (Copy)');
                expect(duplicated.cost).toBe(100);
                expect(dataManager.activities).toHaveLength(2);
            });

            test('should throw error for non-existent activity', () => {
                expect(() => {
                    dataManager.duplicateActivity('non-existent-id');
                }).toThrow('Activity not found');
            });
        });
    });

    describe('Filtering', () => {
        beforeEach(() => {
            // Add test activities
            dataManager.addActivity({
                activity: 'Flight to London',
                date: '2025-09-19',
                transportMode: 'Flight',
                cost: 800,
                booking: BOOKING_STATUS.BOOKED
            });

            dataManager.addActivity({
                activity: 'Train to Paris',
                date: '2025-09-20',
                transportMode: 'Train',
                cost: 200,
                booking: BOOKING_STATUS.NOT_BOOKED
            });

            dataManager.addActivity({
                activity: 'Hotel Check-in',
                date: '2025-09-21',
                cost: 150,
                booking: BOOKING_STATUS.BOOKED,
                accommodationDetails: 'Hotel Paris'
            });
        });

        test('should filter by search term', () => {
            dataManager.updateFilters({ search: 'london' });

            expect(dataManager.filteredActivities).toHaveLength(1);
            expect(dataManager.filteredActivities[0].activity).toContain('London');
        });

        test('should filter by date range', () => {
            dataManager.updateFilters({
                startDate: '2025-09-19',
                endDate: '2025-09-19'
            });

            expect(dataManager.filteredActivities).toHaveLength(1);
            expect(dataManager.filteredActivities[0].date).toBe('2025-09-19');
        });

        test('should filter by transport mode', () => {
            dataManager.updateFilters({ transport: 'Flight' });

            expect(dataManager.filteredActivities).toHaveLength(1);
            expect(dataManager.filteredActivities[0].transportMode).toBe('Flight');
        });

        test('should filter by booking status', () => {
            dataManager.updateFilters({ booking: [BOOKING_STATUS.BOOKED] });

            expect(dataManager.filteredActivities).toHaveLength(2);
            dataManager.filteredActivities.forEach(activity => {
                expect(activity.booking).toBe(BOOKING_STATUS.BOOKED);
            });
        });

        test('should filter by max cost', () => {
            dataManager.updateFilters({ maxCost: 300 });

            expect(dataManager.filteredActivities).toHaveLength(2);
            dataManager.filteredActivities.forEach(activity => {
                expect(activity.cost).toBeLessThanOrEqual(300);
            });
        });

        test('should apply multiple filters simultaneously', () => {
            dataManager.updateFilters({
                booking: [BOOKING_STATUS.BOOKED],
                maxCost: 500
            });

            expect(dataManager.filteredActivities).toHaveLength(1);
            expect(dataManager.filteredActivities[0].accommodationDetails).toBe('Hotel Paris');
        });

        test('should emit filter applied event', () => {
            const eventSpy = jest.fn();
            dataManager.on(EVENTS.FILTER_APPLIED, eventSpy);

            dataManager.updateFilters({ search: 'test' });

            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'test' })
            );
        });

        test('should reset filters to defaults', () => {
            dataManager.updateFilters({ search: 'test', maxCost: 100 });
            dataManager.resetFilters();

            expect(dataManager.filters.search).toBe('');
            expect(dataManager.filters.maxCost).toBe(10000);
            expect(dataManager.filteredActivities).toHaveLength(3);
        });
    });

    describe('Data Retrieval Methods', () => {
        beforeEach(() => {
            dataManager.addActivity({
                activity: 'Flight to London',
                date: '2025-09-19',
                transportMode: 'Flight',
                cost: 800,
                category: 'transport'
            });

            dataManager.addActivity({
                activity: 'London Sightseeing',
                date: '2025-09-20',
                cost: 200,
                category: 'sightseeing'
            });

            dataManager.addActivity({
                activity: 'Paris Visit',
                date: '2025-09-25',
                cost: 150,
                category: 'sightseeing'
            });
        });

        test('should get activity by ID', () => {
            const activity = dataManager.activities[0];
            const found = dataManager.getActivityById(activity.id);

            expect(found).toBe(activity);
        });

        test('should return null for non-existent ID', () => {
            const found = dataManager.getActivityById('non-existent');
            expect(found).toBeNull();
        });

        test('should get activities by date range', () => {
            const activities = dataManager.getActivitiesByDateRange('2025-09-19', '2025-09-20');

            expect(activities).toHaveLength(2);
            expect(activities[0].date).toBe('2025-09-19');
            expect(activities[1].date).toBe('2025-09-20');
        });

        test('should get activities grouped by date', () => {
            const grouped = dataManager.getActivitiesByDate();

            expect(grouped['2025-09-19']).toHaveLength(1);
            expect(grouped['2025-09-20']).toHaveLength(1);
            expect(grouped['2025-09-25']).toHaveLength(1);
        });

        test('should get activities by category', () => {
            const sightseeingActivities = dataManager.getActivitiesByCategory('sightseeing');

            expect(sightseeingActivities).toHaveLength(2);
            sightseeingActivities.forEach(activity => {
                expect(activity.category).toBe('sightseeing');
            });
        });

        test('should get activities by transport mode', () => {
            const flightActivities = dataManager.getActivitiesByTransport('Flight');

            expect(flightActivities).toHaveLength(1);
            expect(flightActivities[0].transportMode).toBe('Flight');
        });

        test('should search activities', () => {
            const results = dataManager.searchActivities('london');

            expect(results).toHaveLength(2);
            results.forEach(activity => {
                expect(activity.matches('london')).toBe(true);
            });
        });
    });

    describe('Statistics', () => {
        beforeEach(() => {
            dataManager.addActivity({
                activity: 'Flight to London',
                date: '2025-09-19',
                cost: 800,
                booking: BOOKING_STATUS.BOOKED,
                startFrom: 'Melbourne',
                reachTo: 'London'
            });

            dataManager.addActivity({
                activity: 'Train to Paris',
                date: '2025-09-21',
                cost: 200,
                booking: BOOKING_STATUS.NOT_BOOKED,
                startFrom: 'London',
                reachTo: 'Paris'
            });

            dataManager.addActivity({
                activity: 'Hotel Stay',
                date: '2025-09-22',
                cost: 300,
                booking: BOOKING_STATUS.BOOKED,
                accommodationDetails: 'Hotel Paris'
            });
        });

        test('should calculate basic statistics', () => {
            const stats = dataManager.getStatistics();

            expect(stats.totalActivities).toBe(3);
            expect(stats.totalCost).toBe(1300);
            expect(stats.bookingsCount).toBe(2);
            expect(stats.totalDays).toBe(4); // Sep 19, 20, 21, 22
            expect(stats.bookingPercentage).toBe(67); // 2/3 * 100 rounded
            expect(stats.averageCostPerActivity).toBe(1300 / 3);
        });

        test('should identify unique countries', () => {
            const stats = dataManager.getStatistics();

            expect(stats.countries).toContain('Australia');
            expect(stats.countries).toContain('United Kingdom');
            expect(stats.countries).toContain('France');
            expect(stats.totalCountries).toBe(3);
        });

        test('should calculate cost breakdown', () => {
            const breakdown = dataManager.getCostBreakdown();

            expect(breakdown[COST_CATEGORIES.TRANSPORT]).toBe(800);
            expect(breakdown[COST_CATEGORIES.ACCOMMODATION]).toBe(300);
            expect(breakdown[COST_CATEGORIES.OTHER]).toBe(200);
        });

        test('should get transport statistics', () => {
            const stats = dataManager.getTransportStats();

            expect(stats['Flight']).toBe(1);
            expect(stats['Train']).toBe(1);
            expect(stats['Not specified']).toBe(1);
        });

        test('should get booking statistics', () => {
            const stats = dataManager.getBookingStats();

            expect(stats.booked).toBe(2);
            expect(stats.notBooked).toBe(1);
            expect(stats.total).toBe(3);
            expect(stats.bookedPercentage).toBe(67);
        });

        test('should get monthly costs', () => {
            const monthlyCosts = dataManager.getMonthlyCosts();

            expect(monthlyCosts['2025-09']).toBe(1300);
        });
    });

    describe('Data Import/Export', () => {
        test('should export to CSV format', () => {
            dataManager.addActivity({
                activity: 'Test Activity',
                date: '2025-09-19',
                cost: 100,
                tags: ['test', 'export']
            });

            const csv = dataManager.exportToCSV();

            expect(csv).toContain('Activity,Date,Day');
            expect(csv).toContain('Test Activity');
            expect(csv).toContain('2025-09-19');
            expect(csv).toContain('100');
            expect(csv).toContain('test; export');
        });

        test('should handle CSV export with special characters', () => {
            dataManager.addActivity({
                activity: 'Activity with "quotes" and, commas',
                date: '2025-09-19',
                cost: 100
            });

            const csv = dataManager.exportToCSV();

            expect(csv).toContain('"Activity with ""quotes"" and, commas"');
        });

        test('should import activities from array', () => {
            const importData = [
                {
                    activity: 'Imported Activity 1',
                    date: '2025-09-19',
                    cost: 100
                },
                {
                    activity: 'Imported Activity 2',
                    date: '2025-09-20',
                    cost: 200
                },
                {
                    // Invalid activity (missing required fields)
                    cost: 50
                }
            ];

            const result = dataManager.importActivities(importData);

            expect(result.imported).toBe(2);
            expect(result.skipped).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(dataManager.activities).toHaveLength(2);
        });
    });

    describe('Conditional Queries', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-09-19'));

            dataManager.addActivity({
                activity: 'Today Activity',
                date: '2025-09-19',
                cost: 100
            });

            dataManager.addActivity({
                activity: 'Tomorrow Activity',
                date: '2025-09-20',
                cost: 200
            });

            dataManager.addActivity({
                activity: 'Next Week Activity',
                date: '2025-09-25',
                cost: 300
            });

            dataManager.addActivity({
                activity: 'Expensive Activity',
                date: '2025-09-26',
                cost: 1500
            });

            dataManager.addActivity({
                activity: 'Unbooked Activity',
                date: '2025-09-27',
                cost: 400,
                booking: BOOKING_STATUS.NOT_BOOKED
            });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should get upcoming activities', () => {
            const upcoming = dataManager.getUpcomingActivities();

            expect(upcoming).toHaveLength(3); // Tomorrow, next week, and within 7 days
            expect(upcoming.every(activity => activity.isUpcoming())).toBe(true);
        });

        test('should get today\'s activities', () => {
            const today = dataManager.getTodaysActivities();

            expect(today).toHaveLength(1);
            expect(today[0].activity).toBe('Today Activity');
        });

        test('should get high-cost activities', () => {
            const highCost = dataManager.getHighCostActivities();

            expect(highCost).toHaveLength(1);
            expect(highCost[0].activity).toBe('Expensive Activity');
        });

        test('should get high-cost activities with custom threshold', () => {
            const highCost = dataManager.getHighCostActivities(250);

            expect(highCost).toHaveLength(3); // Activities with cost > 250
        });

        test('should get unbooked activities', () => {
            const unbooked = dataManager.getUnbookedActivities();

            expect(unbooked).toHaveLength(1);
            expect(unbooked[0].activity).toBe('Unbooked Activity');
        });
    });

    describe('Validation', () => {
        test('should validate all activities', () => {
            // Add valid activities
            dataManager.addActivity({
                activity: 'Valid Activity 1',
                date: '2025-09-19',
                cost: 100
            });

            dataManager.addActivity({
                activity: 'Valid Activity 2',
                date: '2025-09-20',
                cost: 200
            });

            // Directly add invalid activity (bypassing validation)
            const invalidActivity = new ActivityModel({
                activity: '', // Invalid
                date: 'invalid-date', // Invalid
                cost: -100 // Invalid
            });
            dataManager.activities.push(invalidActivity);

            const validation = dataManager.validateAllActivities();

            expect(validation.valid).toBe(2);
            expect(validation.invalid).toBe(1);
            expect(validation.errors).toHaveLength(1);
            expect(validation.errors[0]).toHaveProperty('errors');
        });
    });

    describe('Performance Tracking', () => {
        test('should track operation statistics', () => {
            // Perform some operations
            dataManager.addActivity({
                activity: 'Test 1',
                date: '2025-09-19',
                cost: 100
            });

            dataManager.addActivity({
                activity: 'Test 2',
                date: '2025-09-20',
                cost: 200
            });

            dataManager.updateFilters({ search: 'test' });

            const stats = dataManager.getPerformanceStats();

            expect(stats.totalOperations).toBeGreaterThan(0);
            expect(stats.lastOperationTime).toBeGreaterThan(0);
            expect(stats.averageOperationTime).toBeGreaterThan(0);
            expect(stats.totalActivities).toBe(2);
            expect(stats.filteredActivities).toBe(2);
        });

        test('should estimate memory usage', () => {
            dataManager.addActivity({
                activity: 'Memory Test',
                date: '2025-09-19',
                cost: 100
            });

            const memoryUsage = dataManager.getMemoryUsage();

            expect(memoryUsage).toHaveProperty('activities');
            expect(memoryUsage).toHaveProperty('filters');
            expect(memoryUsage).toHaveProperty('total');
        });
    });

    describe('Backup and Restore', () => {
        test('should create backup', () => {
            const success = dataManager.createBackup();
            expect(success).toBe(true);
            expect(mockStorage.backup).toHaveBeenCalled();
        });

        test('should list available backups', () => {
            const mockBackups = [
                { key: 'backup_1', timestamp: Date.now() - 86400000 },
                { key: 'backup_2', timestamp: Date.now() - 172800000 }
            ];
            mockStorage.listBackups.mockReturnValue(mockBackups);

            const backups = dataManager.getAvailableBackups();

            expect(backups).toEqual(mockBackups);
            expect(mockStorage.listBackups).toHaveBeenCalled();
        });

        test('should restore from backup', () => {
            mockStorage.restoreFromBackup.mockReturnValue(true);
            mockStorage.load.mockResolvedValue({
                activities: [{
                    activity: 'Restored Activity',
                    date: '2025-09-19',
                    cost: 100
                }]
            });

            const success = dataManager.restoreFromBackup('backup_key');

            expect(success).toBe(true);
            expect(mockStorage.restoreFromBackup).toHaveBeenCalledWith('backup_key');
        });
    });

    describe('Data Summary', () => {
        beforeEach(() => {
            dataManager.addActivity({
                activity: 'Flight',
                date: '2025-09-19',
                cost: 800,
                transportMode: 'Flight',
                category: 'transport'
            });

            dataManager.addActivity({
                activity: 'Hotel',
                date: '2025-09-20',
                cost: 300,
                accommodationDetails: 'Hotel Paris',
                category: 'accommodation'
            });
        });

        test('should generate comprehensive data summary', () => {
            const summary = dataManager.getDataSummary();

            expect(summary).toHaveProperty('overview');
            expect(summary).toHaveProperty('costs');
            expect(summary).toHaveProperty('transport');
            expect(summary).toHaveProperty('categories');
            expect(summary).toHaveProperty('bookings');
            expect(summary).toHaveProperty('generatedAt');

            expect(summary.overview.totalActivities).toBe(2);
            expect(summary.overview.totalCost).toBe(1100);
            expect(summary.overview.averageCostPerDay).toBe(550); // 1100 / 2 days
        });
    });

    describe('Storage Integration', () => {
        test('should mark data as dirty when modified', () => {
            expect(dataManager.isDirty).toBe(false);

            dataManager.addActivity({
                activity: 'Test',
                date: '2025-09-19',
                cost: 100
            });

            expect(dataManager.isDirty).toBe(true);
        });

        test('should auto-save after modifications', (done) => {
            jest.useFakeTimers();

            dataManager.addActivity({
                activity: 'Test',
                date: '2025-09-19',
                cost: 100
            });

            expect(mockStorage.save).not.toHaveBeenCalled();

            // Fast-forward time to trigger auto-save
            jest.advanceTimersByTime(2000);

            setTimeout(() => {
                expect(mockStorage.save).toHaveBeenCalled();
                jest.useRealTimers();
                done();
            }, 0);
        });

        test('should save data with metadata', async () => {
            dataManager.addActivity({
                activity: 'Test',
                date: '2025-09-19',
                cost: 100
            });

            await dataManager.saveToStorage();

            expect(mockStorage.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    activities: expect.any(Array),
                    filters: expect.any(Object),
                    metadata: expect.objectContaining({
                        totalActivities: 1,
                        lastModified: expect.any(String),
                        version: '2.0.0'
                    })
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle storage errors gracefully', async () => {
            mockStorage.load.mockRejectedValue(new Error('Storage error'));

            // Should not throw, should fall back to sample data
            await expect(dataManager.init()).resolves.not.toThrow();
            expect(dataManager.activities.length).toBeGreaterThan(0);
        });

        test('should handle save errors gracefully', async () => {
            mockStorage.save.mockResolvedValue(false);

            const result = await dataManager.saveToStorage();
            expect(result).toBe(false);
            expect(dataManager.isDirty).toBe(true); // Should remain dirty on failed save
        });

        test('should handle backup errors gracefully', () => {
            mockStorage.backup.mockImplementation(() => {
                throw new Error('Backup failed');
            });

            const result = dataManager.createBackup();
            expect(result).toBe(false);
        });
    });

    describe('Memory Management', () => {
        test('should handle large datasets efficiently', () => {
            const startTime = performance.now();

            // Add 1000 activities
            for (let i = 0; i < 1000; i++) {
                dataManager.addActivity({
                    activity: `Activity ${i}`,
                    date: '2025-09-19',
                    cost: Math.random() * 1000
                });
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            expect(dataManager.activities).toHaveLength(1000);
            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should dispose properly', () => {
            const eventSpy = jest.fn();
            dataManager.on(EVENTS.DATA_UPDATED, eventSpy);

            dataManager.addActivity({
                activity: 'Test',
                date: '2025-09-19',
                cost: 100
            });

            dataManager.dispose();

            // Should save dirty data
            expect(mockStorage.save).toHaveBeenCalled();

            // Should clear all data
            expect(dataManager.activities).toEqual([]);
            expect(dataManager.filteredActivities).toEqual([]);

            // Should remove event listeners
            dataManager.emit(EVENTS.DATA_UPDATED);
            expect(eventSpy).toHaveBeenCalledTimes(1); // Only the initial call, not the post-disposal emit
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty activity list', () => {
            const stats = dataManager.getStatistics();
            const breakdown = dataManager.getCostBreakdown();

            expect(stats.totalActivities).toBe(0);
            expect(stats.totalCost).toBe(0);
            expect(stats.averageCostPerActivity).toBe(0);
            expect(stats.bookingPercentage).toBe(0);

            expect(breakdown[COST_CATEGORIES.TRANSPORT]).toBe(0);
            expect(breakdown[COST_CATEGORIES.ACCOMMODATION]).toBe(0);
        });

        test('should handle invalid filter values', () => {
            expect(() => {
                dataManager.updateFilters({
                    startDate: 'invalid-date',
                    maxCost: 'not-a-number'
                });
            }).not.toThrow();

            // Should still apply other valid filters
            expect(dataManager.filters.startDate).toBe('invalid-date');
            expect(dataManager.filters.maxCost).toBe('not-a-number');
        });

        test('should handle activities with missing dates', () => {
            // Create activity with missing date (bypassing validation for testing)
            const activity = new ActivityModel({
                activity: 'No Date Activity',
                date: '', // Empty date
                cost: 100
            });
            dataManager.activities.push(activity);

            const stats = dataManager.getStatistics();
            expect(stats.totalDays).toBe(0); // Should handle missing dates gracefully
        });
    });
});