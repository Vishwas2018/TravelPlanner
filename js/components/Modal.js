/**
 * Travel Itinerary Manager - Modal Component
 * Reusable modal dialog with form handling and validation
 */

import { Utils } from '../core/utils.js';
import { validationService } from '../services/ValidationService.js';
import { ANIMATION_DURATIONS } from '../core/constants.js';

export class Modal {
    constructor(options = {}) {
        this.options = {
            id: options.id || Utils.generateId(),
            title: options.title || 'Modal',
            size: options.size || 'medium', // small, medium, large, fullscreen
            closable: options.closable !== false,
            backdrop: options.backdrop !== false,
            keyboard: options.keyboard !== false,
            animation: options.animation !== false,
            persistent: options.persistent || false,
            className: options.className || '',
            ...options
        };

        this.isOpen = false;
        this.element = null;
        this.backdrop = null;
        this.content = null;
        this.focusableElements = [];
        this.previousFocus = null;

        // Event handlers
        this.onShow = options.onShow || null;
        this.onShown = options.onShown || null;
        this.onHide = options.onHide || null;
        this.onHidden = options.onHidden || null;

        this.init();
    }

    /**
     * Initialize modal
     */
    init() {
        this.createElement();
        this.setupEventListeners();
        this.setupStyles();
    }

    /**
     * Create modal DOM structure
     */
    createElement() {
        // Modal overlay
        this.element = document.createElement('div');
        this.element.className = `modal-overlay ${this.options.className}`;
        this.element.id = this.options.id;
        this.element.setAttribute('tabindex', '-1');
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('aria-hidden', 'true');

        // Modal dialog
        const dialog = document.createElement('div');
        dialog.className = `modal-dialog modal-${this.options.size}`;
        dialog.setAttribute('role', 'document');

        // Modal content
        this.content = document.createElement('div');
        this.content.className = 'modal-content';

        // Modal header
        const header = document.createElement('div');
        header.className = 'modal-header';

        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = this.options.title;
        title.id = `${this.options.id}-title`;

        header.appendChild(title);

        // Close button
        if (this.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.addEventListener('click', () => this.hide());
            header.appendChild(closeBtn);
        }

        // Modal body
        const body = document.createElement('div');
        body.className = 'modal-body';

        // Modal footer (initially empty)
        const footer = document.createElement('div');
        footer.className = 'modal-footer';

        this.content.appendChild(header);
        this.content.appendChild(body);
        this.content.appendChild(footer);

        dialog.appendChild(this.content);
        this.element.appendChild(dialog);

        // Set ARIA attributes
        this.element.setAttribute('aria-labelledby', `${this.options.id}-title`);

        // Append to body
        document.body.appendChild(this.element);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Backdrop click
        if (this.options.backdrop) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element && !this.options.persistent) {
                    this.hide();
                }
            });
        }

        // Keyboard events
        if (this.options.keyboard) {
            document.addEventListener('keydown', this.handleKeydown.bind(this));
        }

        // Prevent focus from leaving modal when open
        document.addEventListener('focusin', this.handleFocusIn.bind(this));
    }

    /**
     * Setup modal styles
     */
    setupStyles() {
        if (document.getElementById('modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 1000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                opacity: 0;
                transition: opacity ${ANIMATION_DURATIONS.NORMAL}ms ease-in-out;
            }

            .modal-overlay.active {
                display: flex;
                opacity: 1;
            }

            .modal-dialog {
                width: 100%;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                transform: scale(0.9) translateY(-20px);
                transition: transform ${ANIMATION_DURATIONS.NORMAL}ms ease-out;
            }

            .modal-overlay.active .modal-dialog {
                transform: scale(1) translateY(0);
            }

            .modal-small { max-width: 400px; }
            .modal-medium { max-width: 600px; }
            .modal-large { max-width: 800px; }
            .modal-fullscreen { 
                max-width: 95vw; 
                max-height: 95vh; 
                width: 95vw;
                height: 95vh;
            }

            .modal-content {
                background: white;
                border-radius: 1rem;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                display: flex;
                flex-direction: column;
                max-height: 100%;
                ;
            }

            .modal-header {
                padding: 1.5rem 2rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #f7fafc 0%, white 100%);
                flex-shrink: 0;
            }

            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: #2d3748;
                margin: 0;
            }

            .modal-close {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 50%;
                background: #edf2f7;
                color: #718096;
                cursor: pointer;
                font-size: 1.25rem;
                display: flex;
                align-items: center;
               justify-content: center;
                transition: all 200ms ease-in-out;
            }

            .modal-close:hover {
                background: #e2e8f0;
                color: #4a5568;
                transform: rotate(90deg);
            }

            .modal-body {
                padding: 2rem;
                overflow-y: auto;
                flex: 1;
            }

            .modal-footer {
                padding: 1.5rem 2rem;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                background: #f7fafc;
                flex-shrink: 0;
            }

            .modal-footer:empty {
                display: none;
            }

            /* Form styles within modal */
            .modal-form {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
            }

            .form-group.full-width {
                grid-column: 1 / -1;
            }

            .form-label {
                font-size: 0.875rem;
                font-weight: 500;
                color: #4a5568;
                margin-bottom: 0.5rem;
            }

            .form-label.required::after {
                content: ' *';
                color: #f56565;
            }

            .form-input,
            .form-select,
            .form-textarea {
                padding: 0.75rem 1rem;
                border: 1px solid #e2e8f0;
                border-radius: 0.75rem;
                font-size: 0.875rem;
                background: white;
                transition: all 200ms ease-in-out;
                font-family: inherit;
            }

            .form-input:focus,
            .form-select:focus,
            .form-textarea:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .form-input.error,
            .form-select.error,
            .form-textarea.error {
                border-color: #f56565;
                box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.1);
            }

            .form-textarea {
                resize: vertical;
                min-height: 80px;
            }

            .form-error {
                font-size: 0.75rem;
                color: #f56565;
                margin-top: 0.25rem;
            }

            .form-help {
                font-size: 0.75rem;
                color: #718096;
                margin-top: 0.25rem;
            }

            /* Button styles */
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 0.75rem;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 200ms ease-in-out;
                text-decoration: none;
                font-family: inherit;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }

            .btn-secondary {
                background: #edf2f7;
                color: #4a5568;
                border: 1px solid #e2e8f0;
            }

            .btn-secondary:hover {
                background: #e2e8f0;
                transform: translateY(-1px);
            }

            .btn-danger {
                background: #f56565;
                color: white;
            }

            .btn-danger:hover {
                background: #e53e3e;
                transform: translateY(-1px);
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
            }

            /* Loading state */
            .modal-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3rem;
            }

            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #e2e8f0;
                border-radius: 50%;
                border-top-color: #667eea;
                animation: spin 1s linear infinite;
                margin-right: 0.75rem;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Responsive design */
            @media (max-width: 640px) {
                .modal-overlay {
                    padding: 0.5rem;
                }

                .modal-dialog {
                    max-height: 95vh;
                }

                .modal-header,
                .modal-body,
                .modal-footer {
                    padding: 1rem;
                }

                .form-grid {
                    grid-template-columns: 1fr;
                }

                .modal-footer {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeydown(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'Escape':
                if (this.options.keyboard && !this.options.persistent) {
                    e.preventDefault();
                    this.hide();
                }
                break;

            case 'Tab':
                this.handleTabKey(e);
                break;
        }
    }

    /**
     * Handle tab key for focus management
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleTabKey(e) {
        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Handle focus in events to trap focus
     * @param {FocusEvent} e - Focus event
     */
    handleFocusIn(e) {
        if (!this.isOpen) return;

        if (!this.element.contains(e.target)) {
            e.preventDefault();
            const focusableElements = this.getFocusableElements();
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    /**
     * Get focusable elements within modal
     * @returns {Array} Focusable elements
     */
    getFocusableElements() {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        return Array.from(this.element.querySelectorAll(focusableSelectors.join(',')))
            .filter(el => el.offsetParent !== null); // Only visible elements
    }

    /**
     * Show modal
     * @param {object} options - Show options
     * @returns {Promise} Show promise
     */
    show(options = {}) {
        return new Promise((resolve) => {
            if (this.isOpen) {
                resolve(this);
                return;
            }

            // Store previous focus
            this.previousFocus = document.activeElement;

            // Call onShow callback
            if (this.onShow) {
                const result = this.onShow(this);
                if (result === false) {
                    resolve(this);
                    return;
                }
            }

            this.isOpen = true;
            this.element.setAttribute('aria-hidden', 'false');

            // Show modal
            this.element.style.display = 'flex';

            // Add body class to prevent scrolling
            document.body.classList.add('modal-open');

            // Trigger reflow for animation
            this.element.offsetHeight;

            // Activate modal
            this.element.classList.add('active');

            // Focus first focusable element
            setTimeout(() => {
                const focusableElements = this.getFocusableElements();
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }

                // Call onShown callback
                if (this.onShown) {
                    this.onShown(this);
                }

                resolve(this);
            }, this.options.animation ? ANIMATION_DURATIONS.NORMAL : 0);
        });
    }

    /**
     * Hide modal
     * @param {object} options - Hide options
     * @returns {Promise} Hide promise
     */
    hide(options = {}) {
        return new Promise((resolve) => {
            if (!this.isOpen) {
                resolve(this);
                return;
            }

            // Call onHide callback
            if (this.onHide) {
                const result = this.onHide(this);
                if (result === false) {
                    resolve(this);
                    return;
                }
            }

            this.isOpen = false;
            this.element.setAttribute('aria-hidden', 'true');

            // Deactivate modal
            this.element.classList.remove('active');

            setTimeout(() => {
                this.element.style.display = 'none';

                // Remove body class
                document.body.classList.remove('modal-open');

                // Restore previous focus
                if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
                    this.previousFocus.focus();
                }
                this.previousFocus = null;

                // Call onHidden callback
                if (this.onHidden) {
                    this.onHidden(this);
                }

                resolve(this);
            }, this.options.animation ? ANIMATION_DURATIONS.NORMAL : 0);
        });
    }

    /**
     * Toggle modal visibility
     * @returns {Promise} Toggle promise
     */
    toggle() {
        return this.isOpen ? this.hide() : this.show();
    }

    /**
     * Set modal title
     * @param {string} title - New title
     */
    setTitle(title) {
        const titleElement = this.element.querySelector('.modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        this.options.title = title;
    }

    /**
     * Set modal content
     * @param {string|HTMLElement} content - Modal content
     */
    setContent(content) {
        const bodyElement = this.element.querySelector('.modal-body');
        if (!bodyElement) return;

        if (typeof content === 'string') {
            bodyElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            bodyElement.innerHTML = '';
            bodyElement.appendChild(content);
        }
    }

    /**
     * Set modal footer
     * @param {string|HTMLElement|Array} footer - Footer content or buttons
     */
    setFooter(footer) {
        const footerElement = this.element.querySelector('.modal-footer');
        if (!footerElement) return;

        footerElement.innerHTML = '';

        if (typeof footer === 'string') {
            footerElement.innerHTML = footer;
        } else if (footer instanceof HTMLElement) {
            footerElement.appendChild(footer);
        } else if (Array.isArray(footer)) {
            // Array of button configurations
            footer.forEach(btnConfig => {
                const button = this.createButton(btnConfig);
                footerElement.appendChild(button);
            });
        }
    }

    /**
     * Create button element
     * @param {object} config - Button configuration
     * @returns {HTMLElement} Button element
     */
    createButton(config) {
        const button = document.createElement('button');
        button.className = `btn ${config.className || 'btn-secondary'}`;
        button.textContent = config.text || 'Button';

        if (config.disabled) {
            button.disabled = true;
        }

        if (config.onClick) {
            button.addEventListener('click', (e) => {
                const result = config.onClick(e, this);
                if (config.dismiss !== false && result !== false) {
                    this.hide();
                }
            });
        }

        return button;
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const loadingHtml = `
            <div class="modal-loading">
                <div class="loading-spinner"></div>
                <span>${Utils.escapeHtml(message)}</span>
            </div>
        `;

        this.setContent(loadingHtml);
        this.setFooter('');
    }

    /**
     * Create form within modal
     * @param {object} formConfig - Form configuration
     * @returns {HTMLFormElement} Form element
     */
    createForm(formConfig) {
        const form = document.createElement('form');
        form.className = 'modal-form';
        form.noValidate = true;

        if (formConfig.onSubmit) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e, formConfig.onSubmit);
            });
        }

        // Create form fields
        if (formConfig.fields) {
            const grid = document.createElement('div');
            grid.className = 'form-grid';

            formConfig.fields.forEach(fieldConfig => {
                const fieldElement = this.createFormField(fieldConfig);
                grid.appendChild(fieldElement);
            });

            form.appendChild(grid);
        }

        return form;
    }

    /**
     * Create form field
     * @param {object} fieldConfig - Field configuration
     * @returns {HTMLElement} Field element
     */
    createFormField(fieldConfig) {
        const group = document.createElement('div');
        group.className = `form-group ${fieldConfig.fullWidth ? 'full-width' : ''}`;

        // Label
        if (fieldConfig.label) {
            const label = document.createElement('label');
            label.className = `form-label ${fieldConfig.required ? 'required' : ''}`;
            label.textContent = fieldConfig.label;
            label.setAttribute('for', fieldConfig.name);
            group.appendChild(label);
        }

        // Input element
        let input;
        switch (fieldConfig.type) {
            case 'textarea':
                input = document.createElement('textarea');
                input.className = 'form-textarea';
                if (fieldConfig.rows) input.rows = fieldConfig.rows;
                break;

            case 'select':
                input = document.createElement('select');
                input.className = 'form-select';

                if (fieldConfig.options) {
                    fieldConfig.options.forEach(option => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option.value || option;
                        optionEl.textContent = option.label || option;
                        input.appendChild(optionEl);
                    });
                }
                break;

            default:
                input = document.createElement('input');
                input.className = 'form-input';
                input.type = fieldConfig.type || 'text';
        }

        // Common attributes
        input.name = fieldConfig.name;
        input.id = fieldConfig.name;

        if (fieldConfig.placeholder) input.placeholder = fieldConfig.placeholder;
        if (fieldConfig.required) input.required = true;
        if (fieldConfig.disabled) input.disabled = true;
        if (fieldConfig.value !== undefined) input.value = fieldConfig.value;

        // Validation attributes
        if (fieldConfig.minLength) input.minLength = fieldConfig.minLength;
        if (fieldConfig.maxLength) input.maxLength = fieldConfig.maxLength;
        if (fieldConfig.min) input.min = fieldConfig.min;
        if (fieldConfig.max) input.max = fieldConfig.max;
        if (fieldConfig.pattern) input.pattern = fieldConfig.pattern;

        group.appendChild(input);

        // Help text
        if (fieldConfig.help) {
            const help = document.createElement('div');
            help.className = 'form-help';
            help.textContent = fieldConfig.help;
            group.appendChild(help);
        }

        // Error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'form-error';
        errorContainer.style.display = 'none';
        group.appendChild(errorContainer);

        return group;
    }

    /**
     * Handle form submission
     * @param {Event} e - Submit event
     * @param {Function} onSubmit - Submit handler
     */
    async handleFormSubmit(e, onSubmit) {
        const form = e.target;
        const formData = new FormData(form);

        // Clear previous errors
        this.clearFormErrors();

        try {
            // Validate form
            const validation = validationService.validateFormData(formData);

            if (!validation.isValid) {
                this.showFormErrors(validation.fieldResults);
                return;
            }

            // Show loading
            const submitBtn = form.querySelector('[type="submit"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner"></div> Saving...';
            }

            // Call submit handler
            const result = await onSubmit(validation.sanitizedData, this);

            // Restore button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }

            // Hide modal if submission was successful and not explicitly prevented
            if (result !== false) {
                this.hide();
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormErrors({ _form: { errors: [error.message] } });

            // Restore button
            const submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText || 'Save';
            }
        }
    }

    /**
     * Show form validation errors
     * @param {object} fieldResults - Validation results by field
     */
    showFormErrors(fieldResults) {
        Object.entries(fieldResults).forEach(([fieldName, result]) => {
            if (!result.isValid && result.errors.length > 0) {
                const field = this.element.querySelector(`[name="${fieldName}"]`);
                const errorContainer = field?.parentNode.querySelector('.form-error');

                if (field && errorContainer) {
                    field.classList.add('error');
                    errorContainer.textContent = result.errors[0];
                    errorContainer.style.display = 'block';
                }
            }
        });
    }

    /**
     * Clear form validation errors
     */
    clearFormErrors() {
        const errorFields = this.element.querySelectorAll('.form-input.error, .form-select.error, .form-textarea.error');
        const errorContainers = this.element.querySelectorAll('.form-error');

        errorFields.forEach(field => field.classList.remove('error'));
        errorContainers.forEach(container => {
            container.style.display = 'none';
            container.textContent = '';
        });
    }

    /**
     * Get form data
     * @returns {object} Form data as object
     */
    getFormData() {
        const form = this.element.querySelector('form');
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    /**
     * Set form data
     * @param {object} data - Data to populate form with
     */
    setFormData(data) {
        const form = this.element.querySelector('form');
        if (!form) return;

        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) radio.checked = true;
                } else {
                    field.value = value || '';
                }
            }
        });
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        switch (event) {
            case 'show':
                this.onShow = handler;
                break;
            case 'shown':
                this.onShown = handler;
                break;
            case 'hide':
                this.onHide = handler;
                break;
            case 'hidden':
                this.onHidden = handler;
                break;
            default:
                this.element.addEventListener(event, handler);
        }
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        switch (event) {
            case 'show':
                this.onShow = null;
                break;
            case 'shown':
                this.onShown = null;
                break;
            case 'hide':
                this.onHide = null;
                break;
            case 'hidden':
                this.onHidden = null;
                break;
            default:
                this.element.removeEventListener(event, handler);
        }
    }

    /**
     * Destroy modal
     */
    destroy() {
        if (this.isOpen) {
            this.hide();
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        document.removeEventListener('focusin', this.handleFocusIn.bind(this));

        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // Clean up references
        this.element = null;
        this.content = null;
        this.previousFocus = null;
    }

    /**
     * Check if modal is open
     * @returns {boolean} Is open
     */
    get isVisible() {
        return this.isOpen;
    }

    /**
     * Get modal element
     * @returns {HTMLElement} Modal element
     */
    get modal() {
        return this.element;
    }

    /**
     * Get modal body element
     * @returns {HTMLElement} Modal body element
     */
    get body() {
        return this.element?.querySelector('.modal-body');
    }

    /**
     * Get modal footer element
     * @returns {HTMLElement} Modal footer element
     */
    get footer() {
        return this.element?.querySelector('.modal-footer');
    }
}

// Export Modal class
export default Modal;