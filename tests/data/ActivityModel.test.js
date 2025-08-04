/**
 * Travel Itinerary Manager - ActivityModel Tests
 * Comprehensive tests for the ActivityModel class
 */

import { ActivityModel } from '../../js/data/ActivityModel.js';
import { BOOKING_STATUS, TRANSPORT_MODES } from '../../js/core/constants.js';

describe('ActivityModel', () => {
    let sampleData;

    beforeEach(() => {
        sampleData = {
            activity: 'Visit Eiffel Tower',
            date: '2025-09-19',
            day: 'Friday',
            startTime: '09:00',
            endTime: '12:00',
            startFrom: 'Hotel Paris',
            reachTo: 'Eiffel Tower',
            transportMode: 'Uber',
            booking: 'TRUE',
            cost: 150,
            additionalDetails: 'Book tickets in advance',
            accommodationDetails: 'Hotel Luxe Paris'
        };
    });

    describe('Constructor', () => {
        test('should create activity with default values', () => {
            const activity = new ActivityModel();

            expect(activity.id).toMatch(/^id_[a-z0-9]+$/);
            expect(activity.activity).toBe('');
            expect(activity.cost).toBe(0);
            expect(activity.booking).toBe(BOOKING_STATUS.NOT_BOOKED);
            expect(activity.createdAt).toBeDefined();
            expect(activity.updatedAt).toBeDefined();
            expect(activity.version).toBe(1);
            expect(activity.tags).toEqual([]);
            expect(activity.category).toBe('other');
            expect(activity.priority).toBe('normal');
            expect(activity.status).toBe('planned');
        });

        test('should create activity with provided data', () => {
            const activity = new ActivityModel(sampleData);

            expect(activity.activity).toBe('Visit Eiffel Tower');
            expect(activity.date).toBe('2025-09-19');
            expect(activity.cost).toBe(150);
            expect(activity.booking).toBe('TRUE');
            expect(activity.transportMode).toBe('Uber');
            expect(activity.category).toBe('sightseeting');
        });

        test('should parse cost correctly', () => {
            const testCases = [
                { input: '100', expected: 100 },
                { input: 150.50, expected: 150.50 },
                { input: null, expected: 0 },
                { input: undefined, expected: 0 },
                { input: '', expected: 0 },
                { input: 'invalid', expected: 0 },
                { input: -50, expected: 0 } // Negative costs should be zero
            ];

            testCases.forEach(({ input, expected }) => {
                const activity = new ActivityModel({ cost: input });
                expect(activity.cost).toBe(expected);
            });
        });

        test('should determine category automatically', () => {
            const testCases = [
                { activity: 'Flight to Paris', expected: 'transport' },
                { activity: 'Check into hotel', expected: 'accommodation' },
                { activity: 'Visit Louvre Museum', expected: 'sightseeing' },
                { activity: 'Dinner at restaurant', expected: 'dining' },
                { activity: 'Business meeting', expected: 'business' },
                { activity: 'Shopping at mall', expected: 'shopping' },
                { activity: 'Concert at venue', expected: 'entertainment' },
                { activity: 'Random activity', expected: 'other' }
            ];

            testCases.forEach(({ activity, expected }) => {
                const model = new ActivityModel({ activity });
                expect(model.category).toBe(expected);
            });
        });
    });

    describe('Update Method', () => {
        test('should update activity properties', () => {
            const activity = new ActivityModel(sampleData);
            const originalCreatedAt = activity.createdAt;
            const originalId = activity.id;
            const originalVersion = activity.version;

            activity.update({
                activity: 'Updated Activity',
                cost: 200,
                tags: ['new', 'updated']
            });

            expect(activity.activity).toBe('Updated Activity');
            expect(activity.cost).toBe(200);
            expect(activity.tags).toEqual(['new', 'updated']);
            expect(activity.id).toBe(originalId); // Should not change
            expect(activity.createdAt).toBe(originalCreatedAt); // Should not change
            expect(activity.updatedAt).not.toBe(activity.createdAt); // Should be updated
            expect(activity.version).toBe(originalVersion + 1); // Should increment
        });

        test('should handle cost parsing in update', () => {
            const activity = new ActivityModel();

            activity.update({ cost: '250.75' });
            expect(activity.cost).toBe(250.75);

            activity.update({ cost: 'invalid' });
            expect(activity.cost).toBe(0);
        });

        test('should remove duplicate tags', () => {
            const activity = new ActivityModel();

            activity.update({ tags: ['tag1', 'tag2', 'tag1', 'tag3', 'tag2'] });
            expect(activity.tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        test('should update category when not explicitly set', () => {
            const activity = new ActivityModel({ activity: 'Random activity' });
            expect(activity.category).toBe('other');

            activity.update({ activity: 'Flight to London' });
            expect(activity.category).toBe('transport');
        });
    });

    describe('Validation', () => {
        test('should validate required fields', () => {
            const activity = new ActivityModel();
            const validation = activity.validate();

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Activity name is required');
            expect(validation.errors).toContain('Date is required');
        });

        test('should validate date format', () => {
            const activity = new ActivityModel({
                activity: 'Test',
                date: 'invalid-date'
            });

            const validation = activity.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Invalid date format');
        });

        test('should validate cost constraints', () => {
            const activity = new ActivityModel({
                activity: 'Test',
                date: '2025-09-19',
                cost: -10
            });

            const validation = activity.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Cost cannot be negative');
        });

        test('should validate activity name length', () => {
            const longName = 'a'.repeat(201); // Exceeds max length
            const activity = new ActivityModel({
                activity: longName,
                date: '2025-09-19'
            });

            const validation = activity.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error =>
                error.includes('cannot exceed 200 characters')
            )).toBe(true);
        });

        test('should pass validation for valid activity', () => {
            const activity = new ActivityModel(sampleData);
            const validation = activity.validate();

            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should provide warnings for potential issues', () => {
            const activity = new ActivityModel({
                activity: 'Test',
                date: '2025-09-19',
                startTime: '15:00',
                endTime: '14:00', // End before start
                startFrom: 'Paris',
                reachTo: 'paris' // Same location, different case
            });

            const validation = activity.validate();
            expect(validation.hasWarnings).toBe(true);
            expect(validation.warnings).toContain('End time should be after start time');
            expect(validation.warnings).toContain('Start and destination locations are the same');
        });

        test('should warn about old dates', () => {
            const oldDate = new Date();
            oldDate.setFullYear(oldDate.getFullYear() - 2);

            const activity = new ActivityModel({
                activity: 'Old Activity',
                date: oldDate.toISOString().split('T')[0]
            });

            const validation = activity.validate();
            expect(validation.warnings).toContain('Activity date is more than a year in the past');
        });
    });

    describe('Time Methods', () => {
        test('should convert time to minutes', () => {
            const activity = new ActivityModel();

            expect(activity.timeToMinutes('09:30')).toBe(570); // 9.5 hours = 570 minutes
            expect(activity.timeToMinutes('00:00')).toBe(0);
            expect(activity.timeToMinutes('23:59')).toBe(1439);
        });

        test('should calculate duration correctly', () => {
            const activity = new ActivityModel({
                startTime: '09:00',
                endTime: '12:30'
            });

            expect(activity.getDuration()).toBe(210); // 3.5 hours = 210 minutes
        });

        test('should return null for missing times', () => {
            const activity = new ActivityModel({ startTime: '09:00' });
            expect(activity.getDuration()).toBeNull();
        });

        test('should format duration correctly', () => {
            const testCases = [
                { start: '09:00', end: '09:30', expected: '30m' },
                { start: '09:00', end: '10:00', expected: '1h' },
                { start: '09:00', end: '11:15', expected: '2h 15m' },
                { start: '', end: '', expected: 'Duration not specified' }
            ];

            testCases.forEach(({ start, end, expected }) => {
                const activity = new ActivityModel({ startTime: start, endTime: end });
                expect(activity.getFormattedDuration()).toBe(expected);
            });
        });
    });

    describe('Date Methods', () => {
        beforeEach(() => {
            // Mock Date.now() to return a fixed date
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-09-19'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should check if activity is today', () => {
            const todayActivity = new ActivityModel({ date: '2025-09-19' });
            const tomorrowActivity = new ActivityModel({ date: '2025-09-20' });

            expect(todayActivity.isToday()).toBe(true);
            expect(tomorrowActivity.isToday()).toBe(false);
        });

        test('should check if activity is upcoming', () => {
            const upcomingActivity = new ActivityModel({ date: '2025-09-25' }); // 6 days ahead
            const farActivity = new ActivityModel({ date: '2025-10-01' }); // Too far
            const pastActivity = new ActivityModel({ date: '2025-09-18' }); // Yesterday

            expect(upcomingActivity.isUpcoming()).toBe(true);
            expect(farActivity.isUpcoming()).toBe(false);
            expect(pastActivity.isUpcoming()).toBe(false);
        });

        test('should check if activity is past', () => {
            const pastActivity = new ActivityModel({ date: '2025-09-18' });
            const todayActivity = new ActivityModel({ date: '2025-09-19' });
            const futureActivity = new ActivityModel({ date: '2025-09-20' });

            expect(pastActivity.isPast()).toBe(true);
            expect(todayActivity.isPast()).toBe(false);
            expect(futureActivity.isPast()).toBe(false);
        });
    });

    describe('Boolean Methods', () => {
        test('should check if activity is booked', () => {
            const bookedActivity = new ActivityModel({ booking: BOOKING_STATUS.BOOKED });
            const unbookedActivity = new ActivityModel({ booking: BOOKING_STATUS.NOT_BOOKED });

            expect(bookedActivity.isBooked()).toBe(true);
            expect(unbookedActivity.isBooked()).toBe(false);
        });

        test('should check if activity is high cost', () => {
            const expensiveActivity = new ActivityModel({ cost: 1500 });
            const cheapActivity = new ActivityModel({ cost: 50 });
            const customThresholdActivity = new ActivityModel({ cost: 500 });

            expect(expensiveActivity.isHighCost()).toBe(true);
            expect(cheapActivity.isHighCost()).toBe(false);
            expect(customThresholdActivity.isHighCost(400)).toBe(true);
            expect(customThresholdActivity.isHighCost(600)).toBe(false);
        });
    });

    describe('Tag Management', () => {
        test('should add tags to activity', () => {
            const activity = new ActivityModel();

            activity.addTag('important');
            activity.addTag('leisure');
            activity.addTag('important'); // Duplicate should be ignored

            expect(activity.tags).toEqual(['important', 'leisure']);
            expect(activity.hasTag('important')).toBe(true);
            expect(activity.hasTag('work')).toBe(false);
        });

        test('should remove tags from activity', () => {
            const activity = new ActivityModel();
            activity.tags = ['tag1', 'tag2', 'tag3'];

            activity.removeTag('tag2');
            expect(activity.tags).toEqual(['tag1', 'tag3']);

            activity.removeTag('nonexistent'); // Should not error
            expect(activity.tags).toEqual(['tag1', 'tag3']);
        });

        test('should update timestamp when managing tags', () => {
            const activity = new ActivityModel();
            const originalUpdatedAt = activity.updatedAt;

            // Small delay to ensure different timestamp
            setTimeout(() => {
                activity.addTag('test');
                expect(activity.updatedAt).not.toBe(originalUpdatedAt);
            }, 1);
        });
    });

    describe('Attachment Management', () => {
        test('should add attachments to activity', () => {
            const activity = new ActivityModel();
            const attachment = {
                name: 'Flight Ticket',
                url: 'https://example.com/ticket.pdf',
                type: 'pdf'
            };

            activity.addAttachment(attachment);

            expect(activity.attachments).toHaveLength(1);
            expect(activity.attachments[0]).toMatchObject(attachment);
            expect(activity.attachments[0].id).toBeDefined();
            expect(activity.attachments[0].addedAt).toBeDefined();
        });

        test('should remove attachments from activity', () => {
            const activity = new ActivityModel();
            const attachment = {
                name: 'Test File',
                url: 'https://example.com/test.pdf'
            };

            activity.addAttachment(attachment);
            const attachmentId = activity.attachments[0].id;

            activity.removeAttachment(attachmentId);
            expect(activity.attachments).toHaveLength(0);
        });

        test('should not add invalid attachments', () => {
            const activity = new ActivityModel();

            activity.addAttachment({}); // Missing required fields
            activity.addAttachment({ name: 'Test' }); // Missing URL
            activity.addAttachment({ url: 'test.com' }); // Missing name

            expect(activity.attachments).toHaveLength(0);
        });
    });

    describe('Reminder Management', () => {
        test('should add reminders to activity', () => {
            const activity = new ActivityModel();
            const reminder = {
                time: '2025-09-18T18:00:00Z',
                type: 'notification',
                message: 'Don\'t forget your flight tomorrow!'
            };

            activity.addReminder(reminder);

            expect(activity.reminders).toHaveLength(1);
            expect(activity.reminders[0]).toMatchObject(reminder);
            expect(activity.reminders[0].id).toBeDefined();
            expect(activity.reminders[0].createdAt).toBeDefined();
        });

        test('should not add invalid reminders', () => {
            const activity = new ActivityModel();

            activity.addReminder({}); // Missing required fields
            activity.addReminder({ time: '2025-09-18T18:00:00Z' }); // Missing type
            activity.addReminder({ type: 'notification' }); // Missing time

            expect(activity.reminders).toHaveLength(0);
        });
    });

    describe('Icon Methods', () => {
        test('should return correct transport icon', () => {
            const flightActivity = new ActivityModel({ transportMode: TRANSPORT_MODES.FLIGHT });
            const trainActivity = new ActivityModel({ transportMode: TRANSPORT_MODES.TRAIN });
            const unknownActivity = new ActivityModel({ transportMode: 'Unknown' });

            expect(flightActivity.getTransportIcon()).toBe('✈️');
            expect(trainActivity.getTransportIcon()).toBe('🚄');
            expect(unknownActivity.getTransportIcon()).toBe('📍');
        });

        test('should return correct priority icon', () => {
            const priorities = [
                { priority: 'low', expected: '🔵' },
                { priority: 'normal', expected: '⚪' },
                { priority: 'high', expected: '🟡' },
                { priority: 'urgent', expected: '🔴' },
                { priority: 'unknown', expected: '⚪' } // Default
            ];

            priorities.forEach(({ priority, expected }) => {
                const activity = new ActivityModel({ priority });
                expect(activity.getPriorityIcon()).toBe(expected);
            });
        });

        test('should return correct status icon', () => {
            const statuses = [
                { status: 'planned', expected: '📋' },
                { status: 'confirmed', expected: '✅' },
                { status: 'in-progress', expected: '⏳' },
                { status: 'completed', expected: '✔️' },
                { status: 'cancelled', expected: '❌' },
                { status: 'unknown', expected: '📋' } // Default
            ];

            statuses.forEach(({ status, expected }) => {
                const activity = new ActivityModel({ status });
                expect(activity.getStatusIcon()).toBe(expected);
            });
        });
    });

    describe('Clone Method', () => {
        test('should clone activity with new ID', () => {
            const originalActivity = new ActivityModel(sampleData);
            const clonedActivity = originalActivity.clone();

            expect(clonedActivity.id).not.toBe(originalActivity.id);
            expect(clonedActivity.activity).toBe(originalActivity.activity);
            expect(clonedActivity.cost).toBe(originalActivity.cost);
            expect(clonedActivity.version).toBe(1); // Reset to 1
            expect(clonedActivity.createdAt).not.toBe(originalActivity.createdAt);
        });

        test('should create independent clone', () => {
            const originalActivity = new ActivityModel(sampleData);
            originalActivity.tags = ['original', 'test'];

            const clonedActivity = originalActivity.clone();
            clonedActivity.addTag('cloned');

            expect(originalActivity.tags).toEqual(['original', 'test']);
            expect(clonedActivity.tags).toEqual(['original', 'test', 'cloned']);
        });
    });

    describe('Serialization Methods', () => {
        test('should convert to JSON correctly', () => {
            const activity = new ActivityModel(sampleData);
            activity.addTag('test');

            const json = activity.toJSON();

            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('activity', 'Visit Eiffel Tower');
            expect(json).toHaveProperty('cost', 150);
            expect(json).toHaveProperty('tags');
            expect(json.tags).toEqual(['test']);

            // Ensure it's a plain object (not ActivityModel instance)
            expect(json.constructor).toBe(Object);
        });

        test('should create from CSV data', () => {
            const csvData = {
                Activity: 'Paris Tour',
                Date: '2025-09-20',
                'Start Time': '10:00',
                Cost: '200',
                Booking: 'true'
            };

            const activity = ActivityModel.fromCSV(csvData);

            expect(activity.activity).toBe('Paris Tour');
            expect(activity.date).toBe('2025-09-20');
            expect(activity.startTime).toBe('10:00');
            expect(activity.cost).toBe(200);
            expect(activity.booking).toBe('TRUE');
        });

        test('should convert to CSV format', () => {
            const activity = new ActivityModel(sampleData);
            activity.addTag('tourism');
            activity.addTag('culture');

            const csv = activity.toCSV();

            expect(csv).toHaveProperty('Activity', 'Visit Eiffel Tower');
            expect(csv).toHaveProperty('Cost', 150);
            expect(csv).toHaveProperty('Tags', 'tourism; culture');
            expect(csv).toHaveProperty('Category');
            expect(csv).toHaveProperty('Priority');
            expect(csv).toHaveProperty('Status');
        });
    });

    describe('Summary Method', () => {
        test('should generate comprehensive summary', () => {
            const activity = new ActivityModel(sampleData);
            activity.addTag('important');

            const summary = activity.getSummary();

            expect(summary).toHaveProperty('id');
            expect(summary).toHaveProperty('title', 'Visit Eiffel Tower');
            expect(summary).toHaveProperty('time', '9:00 AM - 12:00 PM');
            expect(summary).toHaveProperty('location', 'Hotel Paris → Eiffel Tower');
            expect(summary).toHaveProperty('cost', '$150');
            expect(summary).toHaveProperty('transport', 'Uber');
            expect(summary).toHaveProperty('transportIcon', '🚕');
            expect(summary).toHaveProperty('booked', true);
            expect(summary).toHaveProperty('duration', '3h');
            expect(summary).toHaveProperty('tags', ['important']);
        });

        test('should handle missing time information in summary', () => {
            const activity = new ActivityModel({
                activity: 'Test Activity',
                startTime: '10:00' // No end time
            });

            const summary = activity.getSummary();
            expect(summary.time).toBe('10:00 AM');
        });

        test('should handle missing location information in summary', () => {
            const activity = new ActivityModel({
                activity: 'Test Activity',
                startFrom: 'Start Location' // No end location
            });

            const summary = activity.getSummary();
            expect(summary.location).toBe('Start Location');
        });
    });

    describe('Search Method', () => {
        test('should match search terms in various fields', () => {
            const activity = new ActivityModel({
                activity: 'Visit Eiffel Tower',
                startFrom: 'Hotel Paris',
                transportMode: 'Uber',
                additionalDetails: 'Bring camera for photos',
                category: 'sightseeing'
            });
            activity.addTag('tourism');

            expect(activity.matches('eiffel')).toBe(true);
            expect(activity.matches('paris')).toBe(true);
            expect(activity.matches('uber')).toBe(true);
            expect(activity.matches('camera')).toBe(true);
            expect(activity.matches('sightseeing')).toBe(true);
            expect(activity.matches('tourism')).toBe(true);
            expect(activity.matches('nonexistent')).toBe(false);
        });

        test('should be case insensitive', () => {
            const activity = new ActivityModel({ activity: 'Visit EIFFEL Tower' });

            expect(activity.matches('eiffel')).toBe(true);
            expect(activity.matches('EIFFEL')).toBe(true);
            expect(activity.matches('EiFfEl')).toBe(true);
        });

        test('should return true for empty search term', () => {
            const activity = new ActivityModel(sampleData);

            expect(activity.matches('')).toBe(true);
            expect(activity.matches(null)).toBe(true);
            expect(activity.matches(undefined)).toBe(true);
        });
    });

    describe('Category Determination', () => {
        test('should determine transport category', () => {
            const testCases = [
                'Flight to London',
                'Train journey',
                'Drive to Paris',
                'Travel by bus',
                'Journey begins'
            ];

            testCases.forEach(activityName => {
                const activity = new ActivityModel({ activity: activityName });
                expect(activity.category).toBe('transport');
            });
        });

        test('should determine accommodation category', () => {
            const testCases = [
                'Hotel check-in',
                'Stay at resort',
                'Lodge booking',
                'Accommodation arranged'
            ];

            testCases.forEach(activityName => {
                const activity = new ActivityModel({ activity: activityName });
                expect(activity.category).toBe('accommodation');
            });
        });

        test('should use accommodation details for categorization', () => {
            const activity = new ActivityModel({
                activity: 'Rest time',
                accommodationDetails: 'Hilton Hotel Paris'
            });

            expect(activity.category).toBe('accommodation');
        });

        test('should use transport mode for categorization', () => {
            const activity = new ActivityModel({
                activity: 'Travel time',
                transportMode: 'Flight'
            });

            expect(activity.category).toBe('transport');
        });

        test('should determine dining category', () => {
            const testCases = [
                'Dinner at restaurant',
                'Lunch break',
                'Breakfast meeting',
                'Dining experience',
                'Time to eat'
            ];

            testCases.forEach(activityName => {
                const activity = new ActivityModel({ activity: activityName });
                expect(activity.category).toBe('dining');
            });
        });

        test('should determine business category', () => {
            const testCases = [
                'Business meeting',
                'Conference call',
                'Work appointment',
                'Client meeting'
            ];

            testCases.forEach(activityName => {
                const activity = new ActivityModel({ activity: activityName });
                expect(activity.category).toBe('business');
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle null and undefined values gracefully', () => {
            const activity = new ActivityModel({
                activity: null,
                date: undefined,
                cost: null
            });

            expect(activity.activity).toBe('');
            expect(activity.date).toBe('');
            expect(activity.cost).toBe(0);
        });

        test('should handle invalid date objects', () => {
            const activity = new ActivityModel({ date: 'not-a-date' });
            const validation = activity.validate();

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Invalid date format');
        });

        test('should handle extreme cost values', () => {
            const activity = new ActivityModel({ cost: Number.MAX_SAFE_INTEGER });
            expect(activity.cost).toBe(Number.MAX_SAFE_INTEGER);

            const validation = activity.validate();
            expect(validation.isValid).toBe(false); // Should exceed max cost limit
        });

        test('should handle empty strings in time fields', () => {
            const activity = new ActivityModel({
                startTime: '',
                endTime: ''
            });

            expect(activity.getDuration()).toBeNull();
            expect(activity.getFormattedDuration()).toBe('Duration not specified');
        });

        test('should handle malformed time strings', () => {
            const activity = new ActivityModel();

            // These should not throw errors
            expect(() => activity.timeToMinutes('invalid')).not.toThrow();
            expect(() => activity.timeToMinutes('25:70')).not.toThrow();
        });
    });

    describe('Performance and Memory', () => {
        test('should handle large arrays efficiently', () => {
            const activity = new ActivityModel();

            // Add many tags
            const manyTags = Array.from({ length: 1000 }, (_, i) => `tag${i}`);
            activity.update({ tags: manyTags });

            expect(activity.tags).toHaveLength(1000);
            expect(activity.hasTag('tag500')).toBe(true);
        });

        test('should not leak memory when cloning', () => {
            const originalActivity = new ActivityModel(sampleData);
            originalActivity.attachments = Array.from({ length: 100 }, (_, i) => ({
                id: `attachment${i}`,
                name: `File ${i}`,
                url: `https://example.com/file${i}.pdf`
            }));

            const clonedActivity = originalActivity.clone();

            // Modify clone
            clonedActivity.attachments.push({
                id: 'new-attachment',
                name: 'New File',
                url: 'https://example.com/new.pdf'
            });

            // Original should not be affected
            expect(originalActivity.attachments).toHaveLength(100);
            expect(clonedActivity.attachments).toHaveLength(101);
        });
    });

    describe('Validation Edge Cases', () => {
        test('should handle validation with all warnings', () => {
            const activity = new ActivityModel({
                activity: 'Test Activity',
                date: '2020-01-01', // Very old date
                startTime: '15:00',
                endTime: '14:00', // End before start
                startFrom: 'Paris',
                reachTo: 'PARIS', // Same location
                transportMode: 'InvalidTransport',
                priority: 'invalid-priority',
                status: 'invalid-status'
            });

            const validation = activity.validate();

            expect(validation.isValid).toBe(true); // No errors, just warnings
            expect(validation.hasWarnings).toBe(true);
            expect(validation.warnings.length).toBeGreaterThan(3);
        });

        test('should validate extreme string lengths', () => {
            const activity = new ActivityModel({
                activity: 'A'.repeat(300), // Exceeds limit
                date: '2025-09-19'
            });

            const validation = activity.validate();
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(e => e.includes('200 characters'))).toBe(true);
        });
    });
});