// Updated sensor_config.js
var SensorConfig = (function() {

    function getConfiguredSides() {
        if (typeof SideConfig !== 'undefined' && typeof SideConfig.getSides === 'function') {
            var configuredSides = SideConfig.getSides();
            if (Array.isArray(configuredSides) && configuredSides.length > 0) {
                return configuredSides;
            }
        }
        return [
            { id: 'blue', label: 'Blue' },
            { id: 'red', label: 'Red' }
        ];
    }

    function getDefaultSideId() {
        if (typeof SideConfig !== 'undefined' && typeof SideConfig.getDefaultSide === 'function') {
            var defaultId = SideConfig.getDefaultSide();
            if (defaultId) {
                return defaultId;
            }
        }
        var sides = getConfiguredSides();
        return sides.length > 0 ? sides[0].id : '';
    }

    function getLabelForSide(sideId) {
        if (typeof SideConfig !== 'undefined' && typeof SideConfig.getLabelForSide === 'function') {
            var label = SideConfig.getLabelForSide(sideId);
            if (label) {
                return label;
            }
        }
        return sideId || '';
    }

    function buildSideOptions(selectedSideId) {
        var sides = getConfiguredSides();
        var selectedId = selectedSideId || getDefaultSideId();
        var hasSelected = false;

        var optionsHtml = sides.map(function(side) {
            var isSelected = side.id === selectedId;
            if (isSelected) {
                hasSelected = true;
            }
            return '<option value="' + side.id + '" ' + (isSelected ? 'selected' : '') + '>' + side.label + '</option>';
        }).join('');

        if (!hasSelected && selectedId) {
            optionsHtml += '<option value="' + selectedId + '" selected>' + getLabelForSide(selectedId) + '</option>';
        }

        return optionsHtml;
    }

    function parseRangeInput(value) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.parseRange) {
            return RangeUtils.parseRange(value);
        }
        if (value === undefined || value === null || value === '') {
            return null;
        }
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getSensorRangeBand(sensor) {
        if (SensorStorage.getSensorRangeBand) {
            return SensorStorage.getSensorRangeBand(sensor);
        }
        if (typeof RangeUtils !== 'undefined' && RangeUtils.getSensorRangeBand) {
            return RangeUtils.getSensorRangeBand(sensor);
        }
        return {
            min: parseRangeInput(sensor && sensor.sensor_min_range) || 0,
            max: parseRangeInput(sensor && (sensor.sensor_max_range !== undefined ? sensor.sensor_max_range : sensor.sensor_range)) || 0
        };
    }

    function validateSensorRangeBand(minRange, maxRange) {
        var errors = [];
        if (minRange === null) {
            errors.push('Minimum range must be a numeric value.');
        }
        if (maxRange === null) {
            errors.push('Maximum range must be a numeric value.');
        }
        if (minRange !== null && minRange < 0) {
            errors.push('Minimum range cannot be negative.');
        }
        if (maxRange !== null && maxRange < 0) {
            errors.push('Maximum range cannot be negative.');
        }
        if (minRange !== null && maxRange !== null && minRange > maxRange) {
            errors.push('Minimum range cannot be greater than maximum range.');
        }
        return errors;
    }

    // Function to create platform info dialog with inputs
    function createSensorConfigDialog() {
        var sensorData = SensorStorage.getSensorData();

        // Create datatable structure
        var content = '<table id="sensorTable" class="display"><thead><tr>' +
            '<th>Name</th>' +
            '<th>Side</th>' +
            '<th>Minimum Range (m)</th>' +
            '<th>Maximum Range (m)</th>' +
            '<th>Actions</th>' +
            '</tr></thead><tbody>';

        // Populate the table with sensor data
        sensorData.forEach(function(sensor, index) {
            var sideOptions = buildSideOptions(sensor && sensor.side);
            var rangeBand = getSensorRangeBand(sensor);
            content += '<tr>' +
                '<td><input type="text" value="' + sensor.sensor_name + '" class="sensor-name" data-index="' + index + '" maxlength="32" /></td>' +
                '<td><select class="sensor-side" data-index="' + index + '">' +
                sideOptions +
                '</select></td>' +
                '<td><input type="number" value="' + rangeBand.min + '" class="sensor-min-range" data-index="' + index + '" min="0" step="any" /></td>' +
                '<td><input type="number" value="' + rangeBand.max + '" class="sensor-max-range" data-index="' + index + '" min="0" step="any" /></td>' +
                '<td><button class="delete-sensor" data-index="' + index + '">Delete</button></td>' +
                '</tr>';
        });

        content += '</tbody></table>';

        // Add "Add Sensor" and "Update" buttons
        content += `
            <div style="margin-top: 10px;">
                <button id="addSensor">Add Sensor</button>
                <button id="updateSensors" style="float: right;">Update</button>
            </div>
        `;

        // Open the sensor dialog box
        $('#sensorInfoContent').html(content);
        $('#sensorInfoDialog').dialog('open');

        // Initialize DataTable
        $('#sensorTable').DataTable();

        // Bind event listeners for inputs and actions
        bindSensorActions();
    }

    function updateAllSensorsInStorage() {
        var sensorData = [];
        var errors = [];

        // Use DataTables API to get all rows, regardless of pagination
        var table = $('#sensorTable').DataTable();
        var allRows = table.rows().nodes(); // Get all row nodes

        // Iterate over each row in the table
        $(allRows).each(function() {
            var index = $(this).find('.sensor-name').data('index');
            var name = $(this).find('.sensor-name').val().trim();
            var side = $(this).find('.sensor-side').val() || getDefaultSideId();
            var minRange = parseRangeInput($(this).find('.sensor-min-range').val());
            var maxRange = parseRangeInput($(this).find('.sensor-max-range').val());
            var existingSensor = SensorStorage.getSensorData()[index] || {};
            var oldName = existingSensor.sensor_name;
            var rangeErrors = validateSensorRangeBand(minRange, maxRange);

            if (!name) {
                errors.push('Sensor name cannot be empty.');
            }

            rangeErrors.forEach(function(error) {
                errors.push((name || oldName || 'Unnamed sensor') + ': ' + error);
            });

            // Collect data for validation and storage update. Keep sensor_range
            // synchronized as a migration fallback for code that has not yet
            // moved to canonical min/max fields.
            sensorData.push({
                oldName: oldName,
                sensor_name: name,
                side: side,
                sensor_min_range: minRange,
                sensor_max_range: maxRange,
                sensor_range: maxRange
            });
        });

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        // Check for unique sensor names
        var names = sensorData.map(s => s.sensor_name.toLowerCase());
        var hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
        if (hasDuplicates) {
            alert('Sensor names must be unique. Please ensure all sensor names are unique.');
            return;
        }

        sensorData.forEach(function(sensor) {
            if (sensor.oldName !== sensor.sensor_name) {
                updatePlatformSensorReferences(sensor.oldName, sensor.sensor_name);
            }
            delete sensor.oldName;
        });

        // Update SensorStorage with the new data
        SensorStorage.setSensorData(sensorData);

        // Update range rings and redraw on the map
        RangeRingStorage.init();
        RangeRingLogic.drawRangeRings();
        View.updateAll();

        // Optionally, close the dialog or provide a success message
        alert('Sensor data has been updated successfully.');
    }

    function bindSensorActions() {
        // Handle delete sensor
        $('#sensorTable').off('click', '.delete-sensor').on('click', '.delete-sensor', function() {
            var index = parseInt($(this).data('index'), 10);
            handleSensorDeletion(index);
        });

        // Handle add sensor
        $('#addSensor').off('click').on('click', function() {
            openAddSensorDialog();
        });

        // Handle "Update" button click
        $('#updateSensors').off('click').on('click', function() {
            updateAllSensorsInStorage();
        });
    }

    function openAddSensorDialog() {
        const dialogContent = `
            <div id="addSensorDialogContent">
                <label for="newSensorName">Sensor Name:</label>
                <input type="text" id="newSensorName" class="ui-widget-content ui-corner-all" style="width: 100%;" maxlength="32" />
                <label for="newSensorMinRange" style="display:block; margin-top: 10px;">Minimum Range (m):</label>
                <input type="number" id="newSensorMinRange" class="ui-widget-content ui-corner-all" style="width: 100%;" value="0" min="0" step="any" />
                <label for="newSensorMaxRange" style="display:block; margin-top: 10px;">Maximum Range (m):</label>
                <input type="number" id="newSensorMaxRange" class="ui-widget-content ui-corner-all" style="width: 100%;" value="0" min="0" step="any" />
                <div style="margin-top: 10px; text-align: right;">
                    <button id="completeAddSensor">Complete</button>
                </div>
            </div>
        `;

        if (!$('#addSensorDialogContent').length) {
            $('body').append(dialogContent);
        }

        $('#addSensorDialogContent').dialog({
            title: "Add New Sensor",
            modal: true,
            resizable: false,
            width: 360,
            close: function() {
                $(this).dialog('destroy').remove();
            }
        });

        $('#completeAddSensor').off('click').on('click', function() {
            const sensorName = $('#newSensorName').val().trim();
            var minRange = parseRangeInput($('#newSensorMinRange').val());
            var maxRange = parseRangeInput($('#newSensorMaxRange').val());
            var rangeErrors = validateSensorRangeBand(minRange, maxRange);

            if (!sensorName) {
                alert("Sensor name cannot be empty. Please enter a valid name.");
                return;
            }

            if (!isUniqueSensorName(sensorName)) {
                alert("Sensor name must be unique. Please choose a different name.");
                return;
            }

            if (rangeErrors.length > 0) {
                alert(rangeErrors.join('\n'));
                return;
            }

            addSensorToStorage(sensorName, getDefaultSideId(), minRange, maxRange);
            $('#addSensorDialogContent').dialog('close');
            createSensorConfigDialog();
        });
    }

    function addSensorToStorage(name, side, minRange, maxRange) {
        if (name.trim() === '') {
            alert('Sensor name cannot be empty. Please enter a valid name.');
        } else if (isUniqueSensorName(name)) {
            var sensor = {
                sensor_name: name,
                side: side || getDefaultSideId(),
                sensor_min_range: minRange,
                sensor_max_range: maxRange,
                sensor_range: maxRange
            };
            if (typeof RangeUtils !== 'undefined' && RangeUtils.normalizeSensorRecord) {
                sensor = RangeUtils.normalizeSensorRecord(sensor);
            }
            SensorStorage.getSensorData().push(sensor);
        } else {
            alert('Sensor name must be unique. Please choose a different name.');
        }
    }

    function deleteSensorFromStorage(index) {
        var sensorData = SensorStorage.getSensorData();
        if (index >= 0 && index < sensorData.length) {
            return sensorData.splice(index, 1)[0];
        }
        return null;
    }

    function isUniqueSensorName(name, indexToIgnore = -1) {
        var sensorData = SensorStorage.getSensorData();
        for (var i = 0; i < sensorData.length; i++) {
            if (i !== indexToIgnore && sensorData[i].sensor_name.toLowerCase() === name.toLowerCase()) {
                return false;
            }
        }
        return true;
    }


    // Helper function to update sensor names after they have been changed
    function updatePlatformSensorReferences(oldName, newName) {
        var platformData = PlatformModel.getPlatformData();

        platformData.forEach(platform => {
            if (!Array.isArray(platform.sensors)) {
                return;
            }

            // Find and replace old sensor name with the new one
            if (platform.sensors.includes(oldName)) {
                const index = platform.sensors.indexOf(oldName);
                platform.sensors[index] = newName;
            }
        });
    }

    function removeSensorFromPlatforms(sensorName) {
        var platformData = PlatformModel.getPlatformData();

        platformData.forEach(platform => {
            if (!Array.isArray(platform.sensors)) {
                return;
            }

            for (var i = platform.sensors.length - 1; i >= 0; i--) {
                if (platform.sensors[i] === sensorName) {
                    platform.sensors.splice(i, 1);
                }
            }
        });
    }

    function handleSensorDeletion(index) {
        var sensorData = SensorStorage.getSensorData();

        if (!Array.isArray(sensorData) || index < 0 || index >= sensorData.length) {
            return;
        }

        var sensorEntry = sensorData[index];
        var sensorName = sensorEntry.sensor_name;

        if (!sensorName) {
            return;
        }

        var confirmed = confirm('Are you sure you want to delete the sensor "' + sensorName + '"?');
        if (!confirmed) {
            return;
        }

        removeSensorFromPlatforms(sensorName);
        deleteSensorFromStorage(index);

        RangeRingStorage.init();
        RangeRingLogic.drawRangeRings();
        View.updateAll();

        createSensorConfigDialog();
    }

    return {
        createSensorConfigDialog: createSensorConfigDialog
    };
})();

$(function() {
    $('#openSensorConfig').on('click', function() {
        SensorConfig.createSensorConfigDialog();
    });
});
