/**
 * Travel Itinerary Manager - Optimized Main Entry Point
 */

import { Application } from './app/Application.js';

class AppBootstrap {
    constructor() {
        this.app = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🌍 Starting Travel Itinerary Manager...');

            // Wait for DOM and libraries
            await this.waitForDependencies();

            // Initialize application
            this.app = new Application({
                container: '#appContent',
                autoSave: true
            });

            // Make globally available
            window.app = this.app;
            window.TravelApp = {
                getApp: () => this.app,
                version: '2.0.0',
                isReady: () => this.isInitialized
            };

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showError(error.message);
        }
    }

    async waitForDependencies() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Wait for external libraries
        const timeout = 10000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (typeof XLSX !== 'undefined' && typeof Papa !== 'undefined') {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn('⚠️ Some libraries may not have loaded completely');
    }