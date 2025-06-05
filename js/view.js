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
            exportLaydown();
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
    function convertPlatformData(platformDataArr) {
        const newArray = [];
    
        platformDataArr.forEach(platform => {
        let platformStr = `platform ${platform.platform_name} WSF_PLATFORM\n`;
        platformStr += `\tside ${platform.side}\n`;
        platformStr += `\taux_data\n`;
        platformStr += `\t\tstring GROUP = "${platform.group}"\n`;
    
        // Requirement 1: Use only the first subgroup
        // Requirement 1: Use only the first subgroup if available
        if (Array.isArray(platform.subgroups) && platform.subgroups.length > 0) {
            const subgroup = platform.subgroups[0];
            platformStr += `\t\tstring SUBGROUP = "${subgroup}"\n`;
        }
        platformStr += `\tend_aux_data\n`;
    
        // Requirement 2: Format position with latitude and longitude suffixes
        let lat = parseFloat(platform.latitude);
        let lon = parseFloat(platform.longitude);
    
        const latSuffix = lat < 0 ? 's' : 'n';
        const lonSuffix = lon < 0 ? 'w' : 'e';
    
        // Format latitude to 6 decimal places and longitude to 5 decimal places
        const formattedLat = Math.abs(lat).toFixed(6);
        const formattedLon = Math.abs(lon).toFixed(5);
    
        platformStr += `\tposition ${formattedLat}${latSuffix} ${formattedLon}${lonSuffix}\n`;
    
        // Requirement 3: Add altitude
        const altitude = parseFloat(platform.altitude);
        platformStr += `\taltitude ${altitude} m\n`;
    
        // Requirement 4: If altitude is 0, add category and icon
        if (altitude === 0) {
            platformStr += `\tcategory surface\n`;
            platformStr += `\ticon ship\n`;
        }
    
        // Add Weapons if any
        if (Array.isArray(platform.weapons) && platform.weapons.length > 0) {
            platformStr += `\t// WEAPONS\n`;
            platform.weapons.forEach(weapon => {
            platformStr += `\tadd weapon ${weapon.name} WSF_EXPLICIT_WEAPON launched_platform_type NULL_WEAP quantity ${weapon.quantity} end_weapon\n`;
            });
        }
    
        // Add Sensors if any
        if (Array.isArray(platform.sensors) && platform.sensors.length > 0) {
            platformStr += `\t// SENSORS\n`;
            platform.sensors.forEach(sensor => {
            platformStr += `\tadd sensor ${sensor} NULL_SENSOR end_sensor\n`;
            });
        }
    
        platformStr += `end_platform`;
    
        // Push the formatted string to the new array
        newArray.push(platformStr);
        });
    
        return newArray;
    }
  
  
    // ----- OTHER FUNCTIONS ----- //
    function exportLaydown() {
        var platformDataStr = PlatformModel.exportData(); // Get the platform data as a JSON string
        var finalPlatDataStr = 'var PLATFORM_DATA = ' + platformDataStr + ';'; // Prepend "var PLATFORM_DATA = " to make it a valid JS file
        
        var afsimPlatformData = convertPlatformData(PlatformModel.getPlatformData()); // This is an array of strings
        var afsimPlatformDataStr = JSON.stringify(afsimPlatformData); // Serialize the array
        
        // Create the HTML content
        var htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Platform Laydown Editor</title>
            <!-- Link to CodeMirror CSS -->
            <link rel="stylesheet" href="libs/codemirror/lib/codemirror.css">
            <!-- Optional: Theme CSS -->
            <link rel="stylesheet" href="libs/codemirror/theme/moxer.css">
            <style>
                /* Reset default margins and paddings */
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                /* Set the height of the HTML and body to 100% to allow full-height flex container */
                html, body {
                    height: 100%;
                    width: 100%;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; /* Sans-serif font */
                    background-color: #f8f9fa; /* Light grey background color */
                    color: #333; /* Dark text color for readability */
                }
                /* Container for the entire page */
                body {
                    display: flex;
                    flex-direction: column;
                }
                /* Header styling */
                h1 {
                    text-align: center;
                    padding: 20px 0;
                    background-color: #6c757d; /* Light grey color */
                    color: #fff; /* White text */
                    font-size: 2em; /* Increased font size */
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Subtle shadow */
                    margin-bottom: 10px;
                }
                /* Editor container takes the remaining space */
                .editor-container {
                    flex: 1;
                    display: flex;
                    flex-direction: row;
                    padding: 10px 20px;
                    gap: 20px; /* Space between editors */
                }
                /* Each editor wrapper */
                .editor-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background-color: #fff; /* White background for editors */
                    border-radius: 8px; /* Rounded corners */
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* Subtle shadow */
                    padding: 15px;
                    position: relative; /* To position the copy button */
                }
                /* Editor labels */
                .editor-label {
                    font-weight: 600; /* Semi-bold */
                    margin-bottom: 10px;
                    color: #0d0d0d; /* Keeping labels in blue */
                    font-size: 1.1em; /* Slightly larger font */
                }
                /* Copy button styling */
                .copy-button {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    padding: 6px 12px;
                    background-color: #6c757d; /* Light grey matching the header */
                    color: #fff;
                    border: none;
                    border-radius: 20px; /* Pillbox shape */
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: background-color 0.3s, transform 0.2s;
                }
                .copy-button:hover {
                    background-color: #5a6268; /* Darker grey on hover */
                }
                .copy-button:active {
                    transform: scale(0.98); /* Slightly shrink on click */
                }
                /* Set the height of the CodeMirror editors to fill their containers */
                .CodeMirror {
                    flex: 1;
                    border: 1px solid #ccc;
                    border-radius: 4px; /* Rounded corners */
                    height: auto; /* Allow height to be controlled by flex */
                    font-size: 0.9em; /* Slightly smaller font inside editors */
                }
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .editor-container {
                        flex-direction: column;
                    }
                    .copy-button {
                        top: 10px;
                        right: 10px;
                        padding: 5px 10px;
                        font-size: 0.8em;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Platform Laydown Editor</h1>
            <div class="editor-container">
                <div class="editor-wrapper">
                    <label class="editor-label">WALT</label>
                    <button class="copy-button" data-editor="left">Copy</button>
                    <textarea id="editor-left"></textarea>
                </div>
                <div class="editor-wrapper">
                    <label class="editor-label">AFSIM</label>
                    <button class="copy-button" data-editor="right">Copy</button>
                    <textarea id="editor-right"></textarea>
                </div>
            </div>
            <!-- Include CodeMirror JS -->
            <script src="libs/codemirror/lib/codemirror.min.js"></script>
            <!-- Include CodeMirror JavaScript mode -->
            <script src="libs/codemirror/mode/javascript/javascript.js"></script>
            <!-- Include any addons you need -->
            <script src="libs/codemirror/addon/edit/closebrackets.js"></script>
            <script>
                // Initialize CodeMirror instances
                var finalPlatDataStr = ${JSON.stringify(finalPlatDataStr)};
                var afsimPlatformData = ${afsimPlatformDataStr}; // This is an array of strings
    
                // Left editor (WALT)
                var editorLeft = CodeMirror.fromTextArea(document.getElementById("editor-left"), {
                    mode: "javascript",
                    theme: "moxer",
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    lineWrapping: true
                });
                editorLeft.setValue(finalPlatDataStr);
                editorLeft.setSize("100%", "100%");
    
                // Right editor (AFSIM)
                var editorRight = CodeMirror.fromTextArea(document.getElementById("editor-right"), {
                    mode: "javascript", // Adjust mode if AFSIM data uses a different syntax
                    theme: "moxer",
                    lineNumbers: true,
                    autoCloseBrackets: true,
                    lineWrapping: true
                });
                // Join the array of strings into a single string with line breaks
                var afsimContent = afsimPlatformData.join('\\n');
                editorRight.setValue(afsimContent);
                editorRight.setSize("100%", "100%");
    
                // Handle window resizing to refresh CodeMirror instances
                window.addEventListener('resize', function() {
                    editorLeft.refresh();
                    editorRight.refresh();
                });
    
                // Function to copy text to clipboard
                function copyToClipboard(text) {
                    if (navigator.clipboard && window.isSecureContext) {
                        // Navigator clipboard api method'
                        return navigator.clipboard.writeText(text);
                    } else {
                        // Textarea method
                        let textArea = document.createElement("textarea");
                        textArea.value = text;
                        // Make the textarea out of viewport
                        textArea.style.position = "absolute";
                        textArea.style.left = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        return new Promise((res, rej) => {
                            // Here the magic happens
                            document.execCommand('copy') ? res() : rej();
                            textArea.remove();
                        });
                    }
                }
    
                // Event listeners for copy buttons
                document.querySelectorAll('.copy-button').forEach(function(button) {
                    button.addEventListener('click', function() {
                        var editorId = this.getAttribute('data-editor');
                        var editorContent = '';
                        if (editorId === 'left') {
                            editorContent = editorLeft.getValue();
                        } else if (editorId === 'right') {
                            editorContent = editorRight.getValue();
                        }
    
                        copyToClipboard(editorContent).then(() => {
                            // Provide feedback to the user
                            var originalText = this.textContent;
                            this.textContent = 'Copied!';
                            this.disabled = true;
                            setTimeout(() => {
                                this.textContent = originalText;
                                this.disabled = false;
                            }, 2000);
                        }).catch(() => {
                            alert('Failed to copy text. Please try manually.');
                        });
                    });
                });
            </script>
        </body>
        </html>
        `;
    
        // Open a new window and write the HTML content
        var win = window.open("", "_blank");
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
    }
                
    // Function to create a custom icon based on the side (blue or red)
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
        exportLaydown: exportLaydown, // Expose export function
        showPlatformInfo: showPlatformInfo, // Expose the showPlatformInfo function
        sendDataToNewWindow: sendDataToNewWindow,
        updateAll: updateAll, // Update platformData, weaponData, sensorData, and distanceData in the new window
        addPlatformToSelected: addPlatformToSelected
    };
})();
