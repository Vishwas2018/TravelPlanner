#!/bin/bash

echo "Setting up test structure..."

# Function to create directories
create_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "Created directory: $dir"
  fi
}

# Function to create test files
create_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    touch "$file"
    echo "Created file: $file"
  fi
}

# Create top-level test directory and config
setup_root() {
  create_dir "tests"
  create_file "tests/setup.js"
}

# Create core test files
setup_core_tests() {
  create_dir "tests/core"
  for file in constants.test.js utils.test.js storage.test.js events.test.js; do
    create_file "tests/core/$file"
  done
}

# Create data test files
setup_data_tests() {
  create_dir "tests/data"
  for file in ActivityModel.test.js DataManager.test.js FileHandler.test.js; do
    create_file "tests/data/$file"
  done
}

# Create service test files
setup_service_tests() {
  create_dir "tests/services"
  for file in NotificationService.test.js ExportService.test.js; do
    create_file "tests/services/$file"
  done
}

# Create component test files
setup_component_tests() {
  create_dir "tests/components"
  for file in ActivityCard.test.js Modal.test.js FilterPanel.test.js SearchComponent.test.js; do
    create_file "tests/components/$file"
  done
}

# Create view test files
setup_view_tests() {
  create_dir "tests/views"
  for file in DashboardView.test.js ItineraryView.test.js TimelineView.test.js ViewManager.test.js; do
    create_file "tests/views/$file"
  done
}

# Create other specialised test folders
setup_special_tests() {
  create_dir "tests/integration"
  create_file "tests/integration/TravelApp.test.js"

  create_dir "tests/performance"
  create_file "tests/performance/DataManager.performance.test.js"

  create_dir "tests/accessibility"
  create_file "tests/accessibility/components.accessibility.test.js"

  create_dir "tests/error-handling"
  create_file "tests/error-handling/error-scenarios.test.js"

  create_dir "tests/utils"
  create_file "tests/utils/test-helpers.js"
}

# Main controller
main() {
  setup_root
  setup_core_tests
  setup_data_tests
  setup_service_tests
  setup_component_tests
  setup_view_tests
  setup_special_tests
  echo "✅ Test structure created successfully."
}

main