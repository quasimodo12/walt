// plat_config.js
var PlatformConfig = (function() {

    // Function to create platform info dialog with inputs
    function createPlatformDialog(platform) {
        // Create the HTML content for the platform dialog
        var content = `
        <style>
            /* Main Table Styling */
            .main-table {
                width: 100%;
                border-spacing: 10px;
                table-layout: fixed;
            }
            .section-cell {
                border: 1px solid #ddd;
                padding: 10px;
                vertical-align: top;
            }
            .basic-info-table {
                width: 100%;
                border-spacing: 5px;
                table-layout: fixed;
            }
            .basic-info-table td {
                padding: 5px;
                width: 50%; /* Ensures equal sizing for label and input cells */
            }
            .full-width {
                width: 100%;
                box-sizing: border-box; /* Ensures padding and borders are included in the width */
            }
            .center-text {
                text-align: center;
            }
            .section-container {
                margin-top: 10px;
            }
            .action-buttons {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            button {
                padding: 8px 16px;
                font-size: 14px;
                cursor: pointer;
            }
            .delete-button {
                background-color: red;
                color: white;
                border: none;
            }
    
            /* Optional: Responsive Adjustments */
            @media (max-width: 768px) {
                .main-table, .basic-info-table {
                    table-layout: auto;
                }
                .action-buttons {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        </style>
    
        <!-- Main Configuration Table -->
        <table class="main-table">
            <tr>
                <!-- Basic Info Editing Section -->
                <td class="section-cell">
                    <strong>Basic Info</strong>
                    <table class="basic-info-table">
                        <!-- Row 1: Name -->
                        <tr>
                            <td><label for="platformNameInput"><strong>Name:</strong></label></td>
                            <td><input type="text" id="platformNameInput" value="${platform.platform_name}" class="full-width"></td>
                        </tr>
                        
                        <!-- Row 2: Group -->
                        <tr>
                            <td><label for="platformGroupInput"><strong>Group:</strong></label></td>
                            <td><input type="text" id="platformGroupInput" value="${platform.group}" class="full-width"></td>
                        </tr>
                        
                        <!-- Row 3: Side -->
                        <tr>
                            <td><label for="platformSideInput"><strong>Side:</strong></label></td>
                            <td>
                                <select id="platformSideInput" class="full-width">
                                    <option value="blue" ${platform.side === 'blue' ? 'selected' : ''}>Blue</option>
                                    <option value="red" ${platform.side === 'red' ? 'selected' : ''}>Red</option>
                                </select>
                            </td>
                        </tr>
                        
                        <!-- Row 4: Latitude -->
                        <tr>
                            <td><label for="platformLatitudeInput"><strong>Latitude:</strong></label></td>
                            <td><input type="text" id="platformLatitudeInput" value="${platform.latitude}" class="full-width"></td>
                        </tr>
                        
                        <!-- Row 5: Longitude -->
                        <tr>
                            <td><label for="platformLongitudeInput"><strong>Longitude:</strong></label></td>
                            <td><input type="text" id="platformLongitudeInput" value="${platform.longitude}" class="full-width"></td>
                        </tr>
                        
                        <!-- Row 6: Altitude -->
                        <tr>
                            <td><label for="platformAltitudeInput"><strong>Altitude:</strong></label></td>
                            <td><input type="text" id="platformAltitudeInput" value="${platform.altitude}" class="full-width"></td>
                        </tr>
                    </table>
                </td>
                
                <!-- Weapon Management Section -->
                <td class="section-cell">
                    <strong>Weapon Management</strong>
                    <div id="platformWeaponsContainer" class="section-container">
                        <table id="platformWeaponsTable" class="display" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Weapon Name</th>
                                    <th>Range</th>
                                    <th>Quantity</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Weapon rows will be dynamically added here -->
                            </tbody>
                        </table>
                    </div>
                    <div class="center-text section-container">
                        <button id="addWeaponButton">Add Weapon</button>
                    </div>
                </td>
            </tr>
            <tr>
                <!-- Subgroup Management Section -->
                <td class="section-cell">
                    <strong>Subgroup Management</strong>
                    <div id="platformSubgroupsContainer" class="section-container">
                        <table id="platformSubgroupsTable" class="display" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Subgroup Name</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${platform.subgroups.map(subgroup => `
                                    <tr>
                                        <td>${subgroup}</td>
                                        <td><button class="removeSubgroupButton">Remove</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="center-text section-container">
                        <button id="addSubgroupButton">Add Subgroup</button>
                    </div>
                </td>
                
                <!-- Sensor Management Section -->
                <td class="section-cell">
                    <strong>Sensor Management</strong>
                    <div id="platformSensorsContainer" class="section-container">
                        <table id="platformSensorsTable" class="display" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Sensor Name</th>
                                    <th>Range</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Sensor rows will be dynamically added here -->
                            </tbody>
                        </table>
                    </div>
                    <div class="center-text section-container">
                        <button id="addSensorButton">Add Sensor</button>
                    </div>
                </td>
            </tr>
        </table>
    
        <!-- Action Buttons -->
        <div class="action-buttons">
            <button id="updatePlatformButton">Update</button>
            <button id="deletePlatformButton" class="delete-button">Delete</button>
        </div>
    `;
    
        // Display the platform dialog content
        $('#platformInfoContent').html(content);
        $('#platformInfoDialog').dialog('open');

        // ########################################################################
        // PLATFORM WEAPON CONFIGURATION SETUP
        // ########################################################################
        
        // Initialize DataTable for weapons currently equipped on the platform
        var weaponsData = platform.weapons || [];
        var weaponDataArray = WeaponStorage.getWeaponData();

        var weaponsTable = $('#platformWeaponsTable').DataTable({
            data: weaponsData.map(function(weapon) {
                // Find the weapon details (such as range) in the weaponDataArray
                var weaponDetails = weaponDataArray.find(function(w) {
                    return w.weapon_name === weapon.name;
                });
                // If weapon details are found, get the range, otherwise show 'N/A'
                var weaponRange = weaponDetails ? weaponDetails.weapon_range : 'N/A';
                return [
                    weapon.name,
                    weaponRange,
                    weapon.quantity,
                    '<button class="removeWeaponButton">Remove</button>'
                ];
            }),
            columns: [
                { title: "Weapon Name" },
                { title: "Range" },
                { title: "Quantity" },
                { title: "Action" }
            ],
            searching: false,
            paging: false,
            info: false
        });

        // Handle weapon removal from the DataTable
        $('#platformWeaponsTable tbody').on('click', '.removeWeaponButton', function() {
            var row = weaponsTable.row($(this).parents('tr'));
            row.remove().draw(); // Remove the row from the DataTable and redraw the table
        });

        // Handle adding a new weapon using a jQuery dialog
        $('#addWeaponButton').on('click', function() {
            // Get the names of weapons already equipped to prevent adding duplicates
            var existingWeapons = weaponsData.map(function(weapon) { return weapon.name; });
            // Filter available weapons to only those that are not currently equipped
            var availableWeapons = weaponDataArray.filter(function(weapon) {
                return !existingWeapons.includes(weapon.weapon_name);
            });

            // Create the content for the add weapon dialog
            var addWeaponContent = `
                <div>
                    <label for="weaponSelect">Select Weapon:</label>
                    <select id="weaponSelect">
                        ${availableWeapons.map(weapon => `<option value="${weapon.weapon_name}">${weapon.weapon_name} (Range: ${weapon.weapon_range})</option>`).join('')}
                    </select>
                    <br><br>
                    <label for="weaponQuantityInput">Quantity:</label>
                    <input type="number" id="weaponQuantityInput" value="1" min="1">
                </div>
            `;

            // Create and display the add weapon dialog
            $('<div id="addWeaponDialog"></div>').html(addWeaponContent).dialog({
                title: 'Add Weapon',
                modal: true, // Make the dialog modal to focus the user on this task
                width: 400,
                buttons: {
                    "Add Weapon": function() {
                        // Get the selected weapon details
                        var selectedWeaponName = $('#weaponSelect').val();
                        var selectedWeaponQuantity = parseInt($('#weaponQuantityInput').val());

                        // Check if the weapon is already in the DataTable to prevent duplicates
                        var alreadyExists = weaponsTable.data().toArray().some(function(row) {
                            return row[0] === selectedWeaponName;
                        });

                        if (!alreadyExists) {
                            // Find the weapon details in weaponDataArray
                            var weaponDetails = weaponDataArray.find(function(w) {
                                return w.weapon_name === selectedWeaponName;
                            });

                            // If weapon details are found, add the new weapon to the DataTable
                            if (weaponDetails) {
                                weaponsTable.row.add([
                                    weaponDetails.weapon_name,
                                    weaponDetails.weapon_range,
                                    selectedWeaponQuantity,
                                    '<button class="removeWeaponButton">Remove</button>'
                                ]).draw();
                            }
                        }

                        // Close the dialog after adding the weapon
                        $(this).dialog('close');
                    },
                    "Cancel": function() {
                        // Close the dialog without adding a weapon
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    // Remove the dialog element from the DOM after closing
                    $(this).remove();
                }
            });
        });

        // ########################################################################
        // PLATFORM SENSOR CONFIGURATION SETUP
        // ########################################################################
        
        // Initialize DataTable for sensors currently equipped on the platform
        var sensorsData = platform.sensors || [];
        var sensorDataArray = SensorStorage.getSensorData();

        var sensorsTable = $('#platformSensorsTable').DataTable({
            data: sensorsData.map(function(sensor) {
                // Find the sensor details (such as range) in the sensorDataArray
                var sensorDetails = sensorDataArray.find(function(s) {
                    return s.sensor_name === sensor;
                });
                // If sensor details are found, get the range, otherwise show 'N/A'
                var sensorRange = sensorDetails ? sensorDetails.sensor_range : 'N/A';
                return [
                    sensor,
                    sensorRange,
                    '<button class="removeSensorButton">Remove</button>'
                ];
            }),
            columns: [
                { title: "Sensor Name" },
                { title: "Range" },
                { title: "Action" }
            ],
            searching: false,
            paging: false,
            info: false
        });

        // Handle sensor removal from the DataTable
        $('#platformSensorsTable tbody').on('click', '.removeSensorButton', function() {
            var row = sensorsTable.row($(this).parents('tr'));
            row.remove().draw(); // Remove the row from the DataTable and redraw the table
        });

        // Handle adding a new sensor using a jQuery dialog
        $('#addSensorButton').on('click', function() {
            // Get the names of sensors already equipped to prevent adding duplicates
            var existingSensors = sensorsData;
            // Filter available sensors to only those that are not currently equipped
            var availableSensors = sensorDataArray.filter(function(sensor) {
                return !existingSensors.includes(sensor.sensor_name);
            });

            // Create the content for the add sensor dialog
            var addSensorContent = `
                <div>
                    <label for="sensorSelect">Select Sensor:</label>
                    <select id="sensorSelect">
                        ${availableSensors.map(sensor => `<option value="${sensor.sensor_name}">${sensor.sensor_name} (Range: ${sensor.sensor_range})</option>`).join('')}
                    </select>
                    <br><br>
                </div>
            `;

            // Create and display the add sensor dialog
            $('<div id="addSensorDialog"></div>').html(addSensorContent).dialog({
                title: 'Add Sensor',
                modal: true, // Make the dialog modal to focus the user on this task
                width: 400,
                buttons: {
                    "Add Sensor": function() {
                        // Get the selected sensor details
                        var selectedSensorName = $('#sensorSelect').val();

                        // Check if the sensor is already in the DataTable to prevent duplicates
                        var alreadyExists = sensorsTable.data().toArray().some(function(row) {
                            return row[0] === selectedSensorName;
                        });

                        if (!alreadyExists) {
                            // Find the sensor details in sensorDataArray
                            var sensorDetails = sensorDataArray.find(function(s) {
                                return s.sensor_name === selectedSensorName;
                            });

                            // If sensor details are found, add the new sensor to the DataTable
                            if (sensorDetails) {
                                sensorsTable.row.add([
                                    sensorDetails.sensor_name,
                                    sensorDetails.sensor_range,
                                    '<button class="removeSensorButton">Remove</button>'
                                ]).draw();
                            }
                        }

                        // Close the dialog after adding the sensor
                        $(this).dialog('close');
                    },
                    "Cancel": function() {
                        // Close the dialog without adding a sensor
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    // Remove the dialog element from the DOM after closing
                    $(this).remove();
                }
            });
        });


        // ########################################################################
        // PLATFORM SUBGROUP CONFIGURATION SETUP
        // ########################################################################

        // Initialize DataTable for subgroups
        var subgroupsTable = $('#platformSubgroupsTable').DataTable({
            searching: false,
            paging: false,
            info: false
        });

        // Handle subgroup removal
        $('#platformSubgroupsTable tbody').on('click', '.removeSubgroupButton', function() {
            var row = subgroupsTable.row($(this).parents('tr'));
            row.remove().draw(); // Remove the subgroup from the DataTable and redraw
        });

        // Handle adding a new subgroup
        $('#addSubgroupButton').on('click', function() {
            $('<div id="addSubgroupDialog"></div>').html(`
                <div>
                    <label for="subgroupInput">Subgroup Name:</label>
                    <input type="text" id="subgroupInput" value="">
                </div>
            `).dialog({
                title: 'Add Subgroup',
                modal: true,
                width: 400,
                buttons: {
                    "Add Subgroup": function() {
                        var subgroupName = $('#subgroupInput').val().trim();

                        // Check if the subgroup already exists in the DataTable
                        var alreadyExists = subgroupsTable.data().toArray().some(function(row) {
                            return row[0] === subgroupName;
                        });

                        if (subgroupName && !alreadyExists) {
                            // Add the new subgroup to the DataTable
                            subgroupsTable.row.add([
                                subgroupName,
                                '<button class="removeSubgroupButton">Remove</button>'
                            ]).draw();
                        }

                        // Close the dialog after adding the subgroup
                        $(this).dialog('close');
                    },
                    "Cancel": function() {
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    $(this).remove();
                }
            });
        });

        // ########################################################################
        // PLATFORM CHANGES UPDATE/SAVE HANDLER
        // ########################################################################

        // Handle the update button click to save changes to the platform
        $('#updatePlatformButton').on('click', function() {
            // Validate the new platform name
            var newName = $('#platformNameInput').val();
            var platformData = PlatformModel.getPlatformData();
            var nameExists = platformData.some(function(existingPlatform) {
                return existingPlatform.platform_name === newName && existingPlatform.platform_name !== platform.platform_name;
            });

            if (nameExists) {
                alert("The platform name already exists. Please choose a different name.");
                return;
            }

            // If the platform name is unique, update the database of platforms
            // and refresh all the elements of the model (storage, map view, and table view)
            updatePlatformInModel(platform.platform_name);
            // Update platforms in the table view
            TableController.redrawTable();
            // Update platforms on the map view
            View.renderPlatforms();
            // Update the range rings
            RangeRingStorage.init();
            // Update the distances between platforms
            DistanceStorage.refreshDistanceData();

            $('#platformInfoDialog').dialog('close'); // Close the dialog after updating
        });

        // ########################################################################
        // DELETE PLATFORM HANDLER
        // ########################################################################
        $('#deletePlatformButton').on('click', function() {
            // Confirm deletion with the user
            if (!confirm(`Are you sure you want to delete the platform "${platform.platform_name}"? This action cannot be undone.`)) {
                return;
            }

            // Proceed with deletion
            var deletionSuccess = PlatformModel.deletePlatform(platform.platform_name);

            // Close the dialog after deletion
            $('#platformInfoDialog').dialog('close');

            if (deletionSuccess) {
                // Update platforms in the table view
                TableController.redrawTable();
                // Update platforms on the map view
                View.renderPlatforms();
                // Update the range rings
                RangeRingStorage.init();

            } else {
                alert(`Failed to delete platform "${platform.platform_name}". It may not exist.`);
            }
        });
    }

    // Function to update platform info in the platform model
    function updatePlatformInModel(originalPlatformName) {

        // Get the modified values from the 'Basic Info' input boxes
        var newName = $('#platformNameInput').val();
        var newSide = $('#platformSideInput').val();
        var newGroup = $('#platformGroupInput').val();
        var newLat = $('#platformLatitudeInput').val();
        var newLon = $('#platformLongitudeInput').val();
        var newAlt = $('#platformAltitudeInput').val();

        var updatedWeaponsData = [];
        $('#platformWeaponsTable').DataTable().rows().data().each(function(value) {
            updatedWeaponsData.push({
                name: value[0],
                quantity: value[2]
            });
        });

        var updatedSensorsData = [];
        $('#platformSensorsTable').DataTable().rows().data().each(function(value) {
            updatedSensorsData.push(value[0]);
        });

        var updatedSubgroupsData = [];
        $('#platformSubgroupsTable').DataTable().rows().data().each(function(value) {
            updatedSubgroupsData.push(value[0]);
        });

        // Update the actual data in the PlatformModel
        var platformData = PlatformModel.getPlatformData();
        var platformToUpdate = platformData.find(function(platform) {
            return platform.platform_name === originalPlatformName;
        });

        if (platformToUpdate) {
            platformToUpdate.platform_name = newName;
            platformToUpdate.side = newSide;
            platformToUpdate.group = newGroup;
            platformToUpdate.latitude = newLat;
            platformToUpdate.longitude = newLon;
            platformToUpdate.altitude = newAlt;
            platformToUpdate.weapons = updatedWeaponsData;
            platformToUpdate.sensors = updatedSensorsData;
            platformToUpdate.subgroups = updatedSubgroupsData;
        }
    }
    
    return {
        createPlatformDialog: createPlatformDialog
    }

})();
