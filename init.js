// init.js 

// This file is responsible for initializing the modules that provide the
// essential functionality for the application:
// - global settings
// - data storage modules
// - logic/script modules 

// ###########################################
// Global Document Settings
// ###########################################
document.addEventListener('contextmenu', function(event) { // Disable right clicks on the page
    event.preventDefault();
});

// ###########################################
// Load Data into Storage Modules
// ###########################################
PlatformModel.loadInitialData(PLATFORM_DATA); // Store platform data from platform_details.js
DistanceStorage.initializeDistanceData(); // Catalogue the distances between every platform in the scenario using PlatformModel
WeaponStorage.loadInitialData(WEAPON_DATA); // Store weapon data from weapon_details.js
SensorStorage.loadInitialData(SENSOR_DATA); // Store sensor data from sensor_details.js
LabelStorage.loadInitialData(LABEL_DATA); // Store label data from labels.js
RangeRingStorage.init(); // Use platform data and weapon range data to catalogue all of the range rings that exist

// ###########################################
// Initialize Visual Elements
// ###########################################
TableController.init(); // Initialzie the platform table with platforms from PlatformModel
View.initializeMap(); // Define the Leaflet map object and add event listeners for user input
LabelController.init(); // Add labels from LabelStorage to the map
View.renderPlatforms(); // Add platforms to the map from PlatformModel and add event listeners to each added platform
SelectionController.init(); // Initialize the selection controller (allows for platforms to be selected and dragged around)


