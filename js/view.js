// view.js
var View = (function() {

    var map, platformMarkers = {};

    // Global variable to hold the reference to the new window
    let newWindow = null;

    // Initialize the map with boxZoom disabled
    function initializeMap() {
        map = L.map('map', {
            center: [0, 0], // Set the initial center of the map
            zoom: 2,        // Set the initial zoom level
            minZoom: 2,     // Set the minimum zoom level
            maxZoom: 10,    // Set the maximum zoom level
            maxBounds: [
                [-90, -180],
                [90, 180]
            ],
            maxBoundsViscosity: 1.0,
            boxZoom: false // Disable the shift-click drag-to-zoom feature
        }).setView([0, 0], 2);

        L.tileLayer('tiles/{z}/{x}/{y}.png', {
            maxNativeZoom: 8,
            minZoom: 2,
            noWrap: true, // Disable wrapping of tiles horizontally
        }).addTo(map);

        // Add the ruler to the map
        var options = {
            position: 'topleft',
            lengthUnit: {
                label: 'Distance:',
                factor: 0.539956803, // Convert from kilometers to nautical miles
                display: 'Nautical Miles',
                decimal: 2,
            },
        };
        L.control.ruler(options).addTo(map);

        // Create gridlines overlay
        var gridlines = new GridlinesOverlay(map);
        // var gridlines = new GridlinesOverlay(map, {
        //     minInterval: 0.1,
        //     maxInterval: 45,
        //     color: 'blue',
        //     weight: 1,
        //     opacity: 0.7,
        //     labelClassName: 'my-grid-label',
        //     intervals: [45, 30, 15, 10, 5, 2, 1, 0.5, 0.1],
        // });

        // Initialize a variable to track dragging
        let isDragging = false;

        // Get the Leaflet map instance (replace `map` with your actual map variable)
        const mapDiv = document.getElementById('map');

        // Add event listeners for detecting drag
        mapDiv.addEventListener('mousedown', function (event) {
            if (event.button === 0) { // Ensure it's the left mouse button
                isDragging = false; // Reset dragging flag
            }
        });

        mapDiv.addEventListener('mousemove', function () {
            isDragging = true; // Set dragging flag if the mouse moves
        });
        
        mapDiv.addEventListener('mouseup', function (event) {
            if (event.button === 0) { // Ensure it's the left mouse button
                // If dragging didn't occur and the click was directly on the map, clear markers
                if (!isDragging && event.target === this && !event.shiftKey) {
                    SelectionController.clearSelectedMarkers();
                }
            }
        });

        // Add Clear Range Rings button functionality
        document.getElementById('clearRangeRingsButton').addEventListener('click', function() {
            RangeRingLogic.clearRangeRings();
        });

        // Add Export Laydown button functionality
        document.getElementById('exportLaydownButton').addEventListener('click', function() {
            LaydownExporter.exportLaydown();
        });

        // Add Weapon Configuration button functionality
        document.getElementById('weaponsButton').addEventListener('click', function() {
            WeaponConfig.createWeaponConfigDialog();
        });

        // Add Sensor Configuration button functionality
        document.getElementById('sensorsButton').addEventListener('click', function() {
            SensorConfig.createSensorConfigDialog();
        });

        // Add Range Ring Configuration button functionality
        document.getElementById('rangeRingsButton').addEventListener('click', function() {
            RangeRingConfig.createRangeRingConfigDialog();
        });

        // Event handler for the 'Clear Markers' button
        document.getElementById('clearSelectedButton').addEventListener('click', function() {
            SelectionController.clearSelectedMarkers();
        }) 

        // Add Create Platform button functionality
        document.getElementById('createPlatformButton').addEventListener('click', function() {
            CreatePlatConfig.createPlatConfigDialog();
        });

        // Add an event listener to the 'Display Results' button
        document.getElementById('openChartsButton').addEventListener('click', openResultsWindow);

        // Add an event listener to the 'Display Results' button
        document.getElementById('refreshDataButton').addEventListener('click', updateAll);

        // Add an event listener to the 'Add Text Label' button
        document.getElementById('addTextLabelButton').addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default button behavior if any
            event.stopPropagation(); // Stop the event from bubbling up to the map
            LabelController.createLabel();
        });
    }

    // Render platforms from platform details
    function renderPlatforms() {
        var platformData = PlatformModel.getPlatformData();

        // Unselect markers
        SelectionController.clearSelectedMarkers();

        // Clear existing platform markers
        clearPlatformMarkers();

        // Iterate through the platform data and create markers
        platformData.forEach(function(platform) {
            // Determine the icon based on the side of the platform
            var icon = createCustomIcon(platform.side);

            // Create the marker with the custom icon and dragging disabled initially
            var marker = L.marker([platform.latitude, platform.longitude], {
                icon: icon,
                draggable: false
            }).addTo(map);

            // Add tooltip to display the platform name on hover
            marker.bindTooltip(platform.platform_name, 
                { 
                    permanent: false, 
                    direction: "top" 
                });
            platformMarkers[platform.platform_name] = marker;

            // Handle double-click event for showing platform info
            marker.on('dblclick', function(event) {
                if (event.shiftKey) {
                    return;
                }
                showPlatformInfo(platform); // Show platform info in dialog
            });

            // Handle shift-click event for selecting platforms
            marker.on('mousedown', function(event) {
                if (event.originalEvent.shiftKey) { // Access the native event for shiftKey
                    if (platform) {
                        var platformName = platform.platform_name;
                        addPlatformToSelected(platformName);
                    }
                }
            });

            // Handle ctrl-click event for seeing range rings
            marker.on('mousedown', function(event) {
                if (event.originalEvent.ctrlKey) { // Access the native event for ctrlKey
                    if (platform) {
                        var platformName = platform.platform_name;
                        var rangeRings = RangeRingStorage.getAllRangeRings();
                        RangeRingLogic.drawRangeRingForPlatform(platformName, rangeRings, map);
                    }
                }
            });

            // Handle marker drag event
            var originalLatLng;
            marker.on('dragstart', function() {
                if (SelectionController.getSelectedMarkers().has(marker)) { // Ensure only selected markers can be dragged
                    originalLatLng = marker.getLatLng(); // Store original position for reference
                } else {
                    marker.dragging.disable(); // If not selected, disable dragging immediately
                }
            });
            marker.on('drag', function() {
                var newLatLng = marker.getLatLng();
                if (SelectionController.getSelectedMarkers().has(marker)) { // Ensure only selected markers can be moved
                    var latDiff = newLatLng.lat - originalLatLng.lat;
                    var lngDiff = newLatLng.lng - originalLatLng.lng;
                    SelectionController.moveSelectedMarkers(marker, latDiff, lngDiff); // Move selected markers in sync
                    originalLatLng = newLatLng; // Update reference point for next drag event
                }
            });
            marker.on('dragend', function() {
                if (SelectionController.getSelectedMarkers().has(marker)) {
                    
                    // Update lat lon positions in platformData
                    updatePlatformDataFromPlatformMarkers(platformMarkers);
                    
                    // Redraw the table after updating the model
                    TableController.redrawTable();

                    // Update the range rings array
                    RangeRingStorage.init();

                    // Update the distances between platforms
                    DistanceStorage.refreshDistanceData();
                }
            });
        });
    }
    


    // ----- RESULTS WINDOW FUNCTIONS ----- //

    // Function to open the results.html window
    function openResultsWindow() {
        console.log("view.js: Opening results.html");
        newWindow = window.open('results.html', '_blank');

        // Optionally, check if the window was opened successfully
        if (!newWindow) {
            console.error('view.js: Failed to open new window.');
        }

        // Wait for the new window to load before updating
        newWindow.onload = function() {
            console.log("view.js: New window loaded, updating data.");
            updateAll(); // Update the new window with the data
        };
    }

    // Add a marker to the list of selected markers
    function addPlatformToSelected(platformName) {
        var marker = getMarkerByPlatformName(platformName);
        SelectionController.selectMarker(marker);
    }

    // Returns the marker object with the given platform name
    function getMarkerByPlatformName(platformName) {
        return platformMarkers[platformName] || null;
    }

    // Function to send data to the new window
    function sendDataToNewWindow(message) {
        if (newWindow && !newWindow.closed) {
            // Replace '*' with the specific origin if possible
            newWindow.postMessage(message, '*');
        } else {
            console.error('New window is not available.');
        }
    }

    // Function to update all data containers in the new window
    function updateAll() {
        console.log("view.js >>> updating the new window with all containers");
        // Grab all four data containers
        var platformData = PlatformModel.getPlatformData();
        var weaponData = WeaponStorage.getWeaponData();
        var sensorData = SensorStorage.getSensorData();
        var distanceData = DistanceStorage.getAllDistanceData();
        // Send them to the new window
        sendDataToNewWindow({type: 'platformData', data: platformData});
        sendDataToNewWindow({type: 'weaponData', data: weaponData});
        sendDataToNewWindow({type: 'sensorData', data: sensorData});
        sendDataToNewWindow({type: 'distanceData', data: distanceData});
    }

    /**
     * Converts an array of platform data objects to a new formatted array of strings.
     *
     * @param {Array} platformDataArr - The original array of platform objects.
     * @returns {Array} - A new array where each element is a formatted string representing a platform.
     */
    function createCustomIcon(side) {
        var iconUrl = (side === "blue") ? 'images/blue-plat.png' : 'images/red-plat.png';
        return L.icon({
            iconUrl: iconUrl,
            iconSize: [24, 24], // Customize the size of the icon
            iconAnchor: [16, 16] // Anchor the icon at its center
        });
    }

    // Function to clear existing platform markers from the map with enhanced debugging and error handling
    function clearPlatformMarkers() {
        console.log("clearPlatformMarkers() called"); // Log the function call
        // Check if platformMarkers is defined and an object
        if (typeof platformMarkers !== "object" || platformMarkers === null) {
            console.error("Error: platformMarkers is not a valid object.", platformMarkers);
            return;
        }
        try {
            for (var key in platformMarkers) {
                if (platformMarkers.hasOwnProperty(key)) {
                    console.log("Attempting to remove marker with key:", key); // Log each key being processed
                    if (platformMarkers[key]) {
                        map.removeLayer(platformMarkers[key]); // Attempt to remove marker from the map
                        console.log("Marker with key:", key, "removed successfully");
                    } else {
                        console.warn("Warning: Marker with key", key, "is undefined or null", platformMarkers[key]);
                    }
                } else {
                    console.warn("Warning: Key", key, "not found in platformMarkers");
                }
            }
            platformMarkers = {}; // Reset the platformMarkers object after removing all layers
            console.log("All platform markers have been cleared and platformMarkers reset");
        } catch (error) {
            console.error("An error occurred while clearing platform markers:", error); // Catch any unexpected errors
        }
    }


    // Use platformMarkers to update platformData
    function updatePlatformDataFromPlatformMarkers(platformMarkers) {
        // Update lat lon positions in platformData
        for (const platformName in platformMarkers) {
            if (platformMarkers.hasOwnProperty(platformName)) {
                const temp_marker = platformMarkers[platformName];
                const lat = temp_marker.getLatLng().lat;
                const lon = temp_marker.getLatLng().lng;
                PlatformModel.updatePlatformPosition(platformName, lat.toFixed(3), lon.toFixed(3));
            }
        }
    }

    // Get all markers
    function getMarkers() {
        return Object.values(platformMarkers); // Return markers as an array
    }

    // Highlight selected marker
    function highlightMarker(marker) {
        let element = marker.getElement();
        if (element) {
            element.classList.add('selected-marker');
        } else {
            console.log('Marker element is not available yet.');
        }
    }

    // Remove highlight from marker
    function unhighlightMarker(marker) {
        marker.getElement().classList.remove('selected-marker'); // Remove highlight style
    }

    // Get the map instance
    function getMap() {
        return map; // Return the map instance for external access
    }

    //===== DIALOG WINDOWS =====//

    // Creates and opens the platform configuration window
    function showPlatformInfo(platform) {
        PlatformConfig.createPlatformDialog(platform)
    }

    return {
        initializeMap: initializeMap,
        renderPlatforms: renderPlatforms,
        getMarkers: getMarkers,
        highlightMarker: highlightMarker,
        unhighlightMarker: unhighlightMarker,
        getMap: getMap, // Expose the getMap function
        showPlatformInfo: showPlatformInfo, // Expose the showPlatformInfo function
        sendDataToNewWindow: sendDataToNewWindow,
        updateAll: updateAll, // Update platformData, weaponData, sensorData, and distanceData in the new window
        addPlatformToSelected: addPlatformToSelected
    };
})();
