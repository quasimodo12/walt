// label_controller.js
var LabelController = (function(LabelStorage) {
    var map; 
    var labelLayerGroup; 
    var addLabelMode = false; 

    function init() {
        map = View.getMap();

        // Create a custom pane for labels if desired (optional)
        map.createPane('labelPane');
        map.getPane('labelPane').style.zIndex = 800;

        labelLayerGroup = L.layerGroup().addTo(map);
        renderLabels();

        map.on('click', onMapClick);
    }

    function renderLabels() {
        labelLayerGroup.clearLayers(); // Remove existing labels

        var labels = LabelStorage.getLabelData();
        labels.forEach(function(label) {
            var marker = createLabelMarker(label);
            labelLayerGroup.addLayer(marker);
        });
    }

    function createLabelMarker(label) {
        var html = `<div class="custom-label" style="font-size: ${label.font_size}px; color: ${label.color};">
                        ${label.label_text}
                    </div>`;

        var marker = L.marker([label.latitude, label.longitude], {
            icon: L.divIcon({
                className: 'label-icon',
                html: html,
                iconAnchor: [0, 0]
            }),
            pane: 'labelPane',
            draggable: true // Make label draggable
        });

        // Store label_id on the marker so we know which label is dragged
        marker._label_id = label.label_id;

        // On marker click, prompt deletion
        marker.on('click', function(e) {
            // To avoid conflict with drag, only if user didn't move it
            if (!marker._justDragged) {
                showDeleteDialog(label.label_id);
            }
            marker._justDragged = false; // reset
        });

        // On drag end, update position in storage
        marker.on('dragend', function(e) {
            var newPos = e.target.getLatLng();
            var thisLabelId = marker._label_id;
            LabelStorage.updateLabelPosition(thisLabelId, newPos.lat, newPos.lng);

            // Re-render to ensure consistency
            renderLabels();
        });

        return marker;
    }

    function showDeleteDialog(label_id) {
        $("<div>Do you want to delete this label?</div>").dialog({
            title: "Delete Label",
            modal: true,
            buttons: {
                "Delete": function() {
                    LabelStorage.deleteLabel(label_id);
                    renderLabels();
                    $(this).dialog("close");
                },
                "Cancel": function() {
                    $(this).dialog("close");
                }
            },
            close: function() {
                $(this).remove();
            }
        });
    }

    // This function enables and disables whether the user
    // is in 'add label mode' --- the mode the user has to be in to add
    // new labels. 
    // It also changes the style of the cursor while the user is in addLabelMode
    function toggleAddLabelMode() {
        addLabelMode = !addLabelMode;
        if (addLabelMode) {
            map.getContainer().style.cursor = 'crosshair';
            document.getElementById('addTextLabelButton').classList.add('addTextLabelButton-clicked');
        } else {
            map.getContainer().style.cursor = '';
            document.getElementById('addTextLabelButton').classList.remove('addTextLabelButton-clicked');
        }
    }

    // Event handler for map clicks
    // If the user clicks the map with 'addLabelMode' set to true
    // Then a dialog menu will open which allows the user to create a new
    // label. Also, toggleAddLabelMode() will be called in order to set the
    // 'addLabelMode' variable to false, preventing further dialogs from
    // being opened
    function onMapClick(e) {
        if (!addLabelMode) return;

        // One-click: open dialog right away
        var latlng = e.latlng;
        // Exit add mode
        toggleAddLabelMode();
        openAddLabelDialog(latlng);
    }

    // This function creates a custom dialog
    function openAddLabelDialog(latlng) {

        // This 
        var dialogHtml = `
            <form id="addLabelForm">
                <label for="labelText">Label Text (max 24 chars):</label><br>
                <input type="text" id="labelText" name="labelText" maxlength="24" required><br><br>
                <label for="fontSize">Font Size (px):</label><br>
                <input type="number" id="fontSize" name="fontSize" min="10" max="32" value="12" required><br><br>
                <label for="color">Color:</label><br>
                <input type="color" id="color" name="color" value="#000000" required><br><br>
            </form>
        `;

        var $dialog = $("<div>").html(dialogHtml).dialog({
            title: "Add New Label",
            modal: true,
            buttons: {
                "Add Label": function() {
                    var labelText = $("#labelText").val().trim();
                    var fontSize = parseInt($("#fontSize").val());
                    var color = $("#color").val();

                    if (labelText.length === 0) {
                        alert("Label text cannot be empty.");
                        return;
                    }

                    var labelObject = {
                        label_text: labelText,
                        font_size: fontSize,
                        color: color,
                        latitude: latlng.lat,
                        longitude: latlng.lng
                    };

                    LabelStorage.addLabel(labelObject);
                    renderLabels();
                    $(this).dialog("close");
                },
                "Cancel": function() {
                    $(this).dialog("close");
                }
            },
            close: function() {
                $(this).remove();
            }
        });
    }

    function createLabel() {
        toggleAddLabelMode();
    }

    return {
        init: init,
        createLabel: createLabel,
        renderLabels: renderLabels
    };
})(LabelStorage);
