#!/bin/bash

# Create main entry point if it doesn't exist
touch index.html

# JavaScript structure
mkdir -p js/{core,data,services,components,views,app}

touch js/core/{constants.js,utils.js,storage.js,events.js}
touch js/data/{ActivityModel.js,DataManager.js,FileHandler.js}
touch js/services/{NotificationService.js,ValidationService.js,ExportService.js,FilterService.js}
touch js/components/{Modal.js,ActivityCard.js,FilterPanel.js,SearchComponent.js}
touch js/views/{DashboardView.js,ItineraryView.js,TimelineView.js,ViewManager.js}
touch js/app/{Router.js,Application.js}
touch js/main.js

# Styles
mkdir -p styles
touch styles/{main.css,components.css,responsive.css}

# Assets
mkdir -p assets/icons

echo "Project structure updated in current 'TravalPlanner' directory."
