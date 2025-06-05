// selection_controller.js
var SelectionController = (function(View) {
    var selectedMarkers = new Set(); // Track selected markers
    var selectionBox, startPoint, endPoint;

    // This function applies event handlers to the map object, that allow the user
    // to click and drag to select platforms on the map
    function init() {

        // Grab the Leaflet map object
        var map = View.getMap();

        // Start drawing selection box on mousedown
        map.on('mousedown', function(e) {
            if (e.originalEvent.shiftKey) { // Only activate selection if Shift is pressed
                startPoint = map.latLngToLayerPoint(e.latlng);
                selectionBox = L.rectangle(L.latLngBounds(e.latlng, e.latlng), { color: '#ff7800', weight: 1 }).addTo(map);
            }
        });

        // Update the selection box dimensions on mousemove
        map.on('mousemove', function(e) {
            if (startPoint && selectionBox) {
                endPoint = map.latLngToLayerPoint(e.latlng);
                var bounds = L.latLngBounds(map.layerPointToLatLng(startPoint), map.layerPointToLatLng(endPoint));
                selectionBox.setBounds(bounds); // Adjust the size of the selection box
            }
        });

        // Finalize selection on mouseup
        map.on('mouseup', function() {
            if (selectionBox) {
                var bounds = selectionBox.getBounds(); // Get the bounds of the selection box
                View.getMarkers().forEach(function(marker) {
                    if (isMarkerInSelection(marker, bounds)) {
                        selectMarker(marker);
                    }
                });
                map.removeLayer(selectionBox); // Remove selection box from map
                selectionBox = null; // Reset selection box
                startPoint = null;
            }
        });
    }

    // Select marker
    function selectMarker(marker) {
        selectedMarkers.add(marker); // Add marker to selection if it falls within the box
        highlightMarker(marker); // Highlight selected markers
        marker.dragging.enable(); // Enable dragging for selected markers
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

    // Function to clear all selected markers with enhanced debugging and error handling
    function clearSelectedMarkers() {

        // Check if selectedMarkers is a valid Set
        if (!(selectedMarkers instanceof Set)) {
            console.error("Error: selectedMarkers is not a Set or is undefined.", selectedMarkers);
            return;
        }

        try {
            selectedMarkers.forEach(function(marker) {
                // Check if marker is defined
                if (!marker) {
                    console.warn("Warning: Encountered an undefined or null marker in selectedMarkers.", marker);
                    return;
                }

                // Attempt to unhighlight marker
                if (typeof unhighlightMarker === "function") {
                    console.log("Unhighlighting marker:", marker);
                    unhighlightMarker(marker); // Remove highlight from marker
                } else {
                    console.error("Error: unhighlightMarker is not a function or is undefined.", unhighlightMarker(marker));
                }

                // Attempt to disable dragging
                if (marker.dragging && typeof marker.dragging.disable === "function") {
                    console.log("Disabling dragging for marker:", marker);
                    marker.dragging.disable(); // Disable dragging
                } else {
                    console.warn("Warning: Dragging functionality not found for marker or disable method is undefined.", marker);
                }
            });

            selectedMarkers.clear(); // Clear the selection set
            console.log("All selected markers have been cleared");
        } catch (error) {
            console.error("An error occurred while clearing selected markers:", error); // Catch any unexpected errors
        }
    }

    // Move all selected markers based on the lat/lng difference from the reference marker
    function moveSelectedMarkers(referenceMarker, latDiff, lngDiff) {
        selectedMarkers.forEach(function(marker) {
            if (marker !== referenceMarker) { // Ensure the reference marker doesn't move itself
                var latlng = marker.getLatLng();
                marker.setLatLng([latlng.lat + latDiff, latlng.lng + lngDiff]); // Apply lat/lng difference to move marker
            }
        });
    }

    // Check if marker is within the selection box
    function isMarkerInSelection(marker, bounds) {
        return bounds.contains(marker.getLatLng()); // Check if marker falls within the bounds of the selection box
    }

    // Getter for selectedMarkers set
    function getSelectedMarkers() {
        return selectedMarkers;
    }

    return {
        init: init,
        moveSelectedMarkers: moveSelectedMarkers,
        clearSelectedMarkers: clearSelectedMarkers,
        getSelectedMarkers: getSelectedMarkers,
        selectMarker: selectMarker
    };
})(View, PlatformModel);
