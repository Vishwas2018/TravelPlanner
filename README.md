# Travel Itinerary Manager

A modern, feature-rich web application for managing travel itineraries with Excel/CSV import/export capabilities, built with vanilla JavaScript and a modular architecture.

![Travel Itinerary Manager](https://img.shields.io/badge/Travel-Itinerary%20Manager-blue?style=for-the-badge&logo=airplane)

## ✨ Features

- **📊 Dashboard**: Comprehensive overview with statistics and quick actions
- **📋 Itinerary Management**: Detailed activity planning with date grouping
- **🕒 Timeline View**: Chronological visualization of your journey
- **📁 File Import/Export**: Support for Excel (.xlsx/.xls), CSV, and JSON formats
- **🔍 Smart Search & Filtering**: Find activities quickly with multiple filter options
- **💾 Auto-save**: Automatic data persistence with localStorage
- **🌙 Theme Support**: Light and dark theme options
- **⌨️ Keyboard Shortcuts**: Power user friendly shortcuts
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **🎯 Form Validation**: Real-time validation with helpful error messages
- **🔄 Data Backup**: Export/import for data backup and migration

## 🏗️ Architecture

This project follows a modular architecture with clean separation of concerns:

```
js/
├── core/           # Core utilities and services
│   ├── constants.js    # Application constants
│   ├── utils.js        # Utility functions
│   ├── events.js       # Event management system
│   └── storage.js      # localStorage wrapper
├── data/           # Data layer
│   ├── ActivityModel.js    # Activity data model
│   ├── DataManager.js      # Data operations & state
│   └── FileHandler.js      # File import/export logic
├── services/       # Business logic services  
│   ├── NotificationService.js  # Toast notifications
│   └── ValidationService.js    # Form validation
├── components/     # Reusable UI components
│   └── Modal.js        # Modal dialog component
├── views/         # View management
│   └── ViewManager.js  # SPA routing & view transitions
└── app/           # Application orchestration
    └── Application.js  # Main application class
```

## 🚀 Quick Start

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for file operations)

### Installation

1. **Clone or download the project:**
```bash
git clone <repository-url>
cd TravalPlanner
```

2. **Start a local web server:**

**Option A: Using Python (if installed):**
```bash
# Python 3
python -m http.server 8000

# Python 2  
python -m SimpleHTTPServer 8000
```

**Option B: Using Node.js (if installed):**
```bash
npx http-server -p 8000
```

**Option C: Using PHP (if installed):**
```bash
php -S localhost:8000
```

**Option D: Using a browser extension like "Live Server" in VS Code**

3. **Open your browser and navigate to:**
```
http://localhost:8000
```

### Using with Live Server (Recommended for development)

If you're using VS Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 📖 Usage Guide

### Getting Started

1. **First Time Setup**: The app loads with sample data to help you get started
2. **Add Activities**: Click the "➕ Add Activity" button or use Ctrl+N
3. **Import Data**: Use "📁 Import Data" to load your existing travel plans from Excel/CSV
4. **Organize**: Use filters and search to manage your activities
5. **Export**: Save your data using "📄 Export Data" in multiple formats

### Importing Data

The app supports importing from:
- **Excel files** (.xlsx, .xls)
- **CSV files** (.csv)
- **JSON files** (.json)

**Required columns for import:**
- `Activity` (required): Name of the activity
- `Date` (required): Date in YYYY-MM-DD format

**Optional columns:**
- `Start Time`, `End Time`: Times in HH:MM format
- `From`, `To`: Location information
- `Transport Mode`: Mode of transportation
- `Booking`: TRUE/FALSE for booking status
- `Cost`: Numeric cost value
- `Details`: Additional information
- `Accommodation`: Hotel/lodging details

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Add new activity |
| `Ctrl+E` | Export data |
| `Ctrl+O` | Import data |  
| `Ctrl+F` | Focus search |
| `Ctrl+,` | Open settings |
| `Alt+1` | Dashboard view |
| `Alt+2` | Itinerary view |
| `Alt+3` | Timeline view |
| `Esc` | Close modals/menus |

## 🛠️ Development

### Project Structure

```
TravalPlanner/
├── index.html              # Main HTML file
├── styles.css              # Application styles
├── js/                     # JavaScript modules
│   ├── core/              # Core functionality
│   ├── data/              # Data management
│   ├── services/          # Business services
│   ├── components/        # UI components
│   ├── views/             # View management
│   └── app/               # Application setup
├── tests/                 # Test files
└── README.md              # This file
```

### Adding New Features

1. **Create new modules** in appropriate directories
2. **Follow the established patterns** for events and data flow
3. **Add tests** in the `tests/` directory
4. **Update documentation** as needed

### Modular Design Benefits

- **Maintainable**: Each module has a single responsibility
- **Testable**: Isolated functions and classes are easy to test
- **Extensible**: Add new features without breaking existing code
- **Reusable**: Components can be reused across different parts of the app

## 🧪 Testing

The project includes a comprehensive test structure:

```bash
# Run tests (when test runner is set up)
npm test
```

Test files are organized to mirror the source structure:
- `tests/core/` - Core utility tests
- `tests/data/` - Data layer tests
- `tests/services/` - Service tests
- `tests/components/` - Component tests
- `tests/views/` - View tests
- `tests/integration/` - Integration tests

## 📋 API Reference

### Core Classes

#### `Application`
Main application orchestrator that coordinates all services and components.

```javascript
// Initialize application
const app = new Application({
    theme: 'light',
    autoSave: true,
    keyboardShortcuts: true
});
```

#### `DataManager`
Manages all travel activity data with filtering, validation, and persistence.

```javascript
// Add new activity
dataManager.addActivity({
    activity: 'Flight to Paris',
    date: '2025-09-19',
    cost: 800
});

// Get statistics
const stats = dataManager.getStatistics();
```

#### `ViewManager`
Handles SPA routing and view transitions.

```javascript
// Register a new view
viewManager.registerView('custom', {
    title: 'Custom View',
    render: () =>