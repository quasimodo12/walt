// map_controller.js
var MapController = (function() {
    function init() {


        // Initialize the platform, weapon, and sensor data based on input files
        PlatformModel.loadInitialData(PLATFORM_DATA);
        DistanceStorage.initializeDistanceData(); // calculate distances
        WeaponStorage.loadInitialData(WEAPON_DATA);
        SensorStorage.loadInitialData(SENSOR_DATA);
        LabelStorage.loadInitialData(LABEL_DATA);


        
        // Define the leaflet map variable and place platform markers
        View.initializeMap();
        View.renderPlatforms(); // Render platforms on the map

        // Initialize the range rings 
        RangeRingStorage.init();

        // Initialize label data
        LabelController.init();

        // Initialize the selection controller (allows for platforms to be selected and dragged around)
        SelectionController.init();


    }

    return {
        init: init,
    };
})();
