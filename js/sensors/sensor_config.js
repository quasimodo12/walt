// Updated sensor_config.js
var SensorConfig = (function() {

    // Function to create platform info dialog with inputs
    function createSensorConfigDialog() {
        var sensorData = SensorStorage.getSensorData();

        // Create datatable structure
        var content = '<table id="sensorTable" class="display"><thead><tr>' +
            '<th>Name</th>' +
            '<th>Side</th>' +
            '<th>Max Range</th>' +
            '<th>Actions</th>' +
            '</tr></thead><tbody>';

        // Populate the table with sensor data
        sensorData.forEach(function(sensor, index) {
            content += '<tr>' +
                '<td><input type="text" value="' + sensor.sensor_name + '" class="sensor-name" data-index="' + index + '" /></td>' +
                '<td><select class="sensor-side" data-index="' + index + '">' +
                '<option value="blue" ' + (sensor.side === 'blue' ? 'selected' : '') + '>Blue</option>' +
                '<option value="red" ' + (sensor.side === 'red' ? 'selected' : '') + '>Red</option>' +
                '</select></td>' +
                '<td><input type="number" value="' + sensor.sensor_range + '" class="sensor-range" data-index="' + index + '" /></td>' +
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
        var isValid = true;
        var sensorData = [];

        // Use DataTables API to get all rows, regardless of pagination
        var table = $('#sensorTable').DataTable();
        var allRows = table.rows().nodes(); // Get all row nodes

        // Iterate over each row in the table
        $(allRows).each(function() {
            var index = $(this).find('.sensor-name').data('index');
            var name = $(this).find('.sensor-name').val().trim();
            var side = $(this).find('.sensor-side').val();
            var range = parseInt($(this).find('.sensor-range').val(), 10);
        
            // Save old name for updating platformData
            var oldName = SensorStorage.getSensorData()[index].sensor_name;
        
            // Update platformData if the name has changed
            if (oldName !== name) {
                updatePlatformSensorReferences(oldName, name);
            }
        
            // Collect data for validation
            sensorData.push({
                index: index,
                sensor_name: name,
                side: side,
                sensor_range: range
            });
        });
        
        if (!isValid) {
            return;
        }

        // Check for unique sensor names
        var names = sensorData.map(s => s.sensor_name.toLowerCase());
        var hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
        if (hasDuplicates) {
            alert('Sensor names must be unique. Please ensure all sensor names are unique.');
            return;
        }

        // Update SensorStorage with the new data
        SensorStorage.setSensorData(sensorData);

        // Update range rings and redraw on the map
        RangeRingStorage.init();

        // Optionally, close the dialog or provide a success message
        alert('Sensor data has been updated successfully.');
    }

    function bindSensorActions() {
        // Handle delete sensor
        $('.delete-sensor').off('click').on('click', function() {
            var index = $(this).data('index');
            deleteSensorFromStorage(index);
            createSensorConfigDialog();
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
                <input type="text" id="newSensorName" class="ui-widget-content ui-corner-all" style="width: 100%;" />
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
            width: 300,
            close: function() {
                $(this).dialog('destroy').remove();
            }
        });

        $('#completeAddSensor').off('click').on('click', function() {
            const sensorName = $('#newSensorName').val().trim();

            if (!sensorName) {
                alert("Sensor name cannot be empty. Please enter a valid name.");
                return;
            }

            if (!isUniqueSensorName(sensorName)) {
                alert("Sensor name must be unique. Please choose a different name.");
                return;
            }

            addSensorToStorage(sensorName, 'blue', 0);
            $('#addSensorDialogContent').dialog('close');
            createSensorConfigDialog();
        });
    }

    function addSensorToStorage(name, side, maxRange) {
        if (name.trim() === '') {
            alert('Sensor name cannot be empty. Please enter a valid name.');
        } else if (isUniqueSensorName(name)) {
            SensorStorage.getSensorData().push({
                sensor_name: name,
                side: side,
                sensor_range: maxRange
            });
        } else {
            alert('Sensor name must be unique. Please choose a different name.');
        }
    }

    function deleteSensorFromStorage(index) {
        var sensorData = SensorStorage.getSensorData();
        if (index >= 0 && index < sensorData.length) {
            sensorData.splice(index, 1);
        }
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
            // Find and replace old sensor name with the new one
            if (platform.sensors.includes(oldName)) {
                const index = platform.sensors.indexOf(oldName);
                platform.sensors[index] = newName;
            }
        });
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
