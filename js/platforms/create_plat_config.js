// create_plat_config.js
var CreatePlatConfig = (function () {

    // Function to create the platform creation dialog
    function createPlatConfigDialog() {
        // HTML content for the dialog
        var content = `
            <div>
                <table>
                    <tr>
                        <td><label for="platformName">Platform Name:</label></td>
                        <td><input type="text" id="platformName" required></td>
                    </tr>
                    <tr>
                        <td><label for="side">Side:</label></td>
                        <td>
                            <select id="side">
                                <option value="blue">Blue</option>
                                <option value="red">Red</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td><label for="group">Group:</label></td>
                        <td><input type="text" id="group" required></td>
                    </tr>
                    <tr>
                        <td><label for="category">Category:</label></td>
                        <td><input type="text" id="category" required></td>
                    </tr>
                    <tr>
                        <td><label for="latitude">Latitude:</label></td>
                        <td><input type="number" id="latitude" step="0.00001" value="0"></td>
                    </tr>
                    <tr>
                        <td><label for="longitude">Longitude:</label></td>
                        <td><input type="number" id="longitude" step="0.00001" value="0"></td>
                    </tr>
                    <tr>
                        <td><label for="altitude">Altitude:</label></td>
                        <td><input type="number" id="altitude" step="1" value="0"></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align: center;">
                            <button id="createPlatformButton">Create Platform</button>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        console.log('Setting HTML content for platform creation dialog');
        // Display the platform creation dialog content
        if ($('#createPlatformContent').length === 0) {
            console.error('#createPlatformContent element not found');
            return;
        }

        $('#createPlatformContent').html(content);
        if ($('#createPlatformDialog').length === 0) {
            console.error('#createPlatformDialog element not found');
            return;
        }

        $('#createPlatformDialog').dialog('open');

        // Handle create platform button click using event delegation
        $('#createPlatformContent').off('click', '#createPlatformButton').on('click', '#createPlatformButton', function() {
            console.log('Create Platform button clicked');
            var platformName = $('#platformName').val();
            var side = $('#side').val();
            var group = $('#group').val();
            var category = $('#category').val();
            var latitude = $('#latitude').val() || "0";
            var longitude = $('#longitude').val() || "0";
            var altitude = $('#altitude').val() || "0";

            // Validate required fields
            if (!platformName || !side || !group || !category) {
                console.warn('Validation failed: Missing required fields');
                alert('Please fill in all required fields.');
                return;
            }

            // Validate the new platform name
            var newName = platformName;
            var platformData = PlatformModel.getPlatformData();

            // Check if the new name already exists (excluding the current platform's name)
            var nameExists = platformData.some(function(existingPlatform) {
                return existingPlatform.platform_name === newName && existingPlatform.platform_name !== platform.platform_name;
            });

            if (nameExists) {
                alert("The platform name already exists. Please choose a different name.");
                console.alert("The platform name already exists. Please choose a different name.");
                return; // Exit the function without updating
            }

            // Create the new platform
            var newPlatform = {
                platform_name: platformName,
                side: side,
                group: group,
                subgroups: [],
                latitude: latitude,
                longitude: longitude,
                altitude: altitude,
                category: category,
                weapons: [],
                sensors: []
            };
            
            // Add the platform to storage
            PlatformModel.pushPlatform(newPlatform);
            // Update platform in the table view
            TableController.redrawTable();
            // Update platform on the map view
            View.renderPlatforms();
            // Update the range rings
            RangeRingStorage.init();

            if ($('#createPlatformDialog').length) {
                $('#createPlatformDialog').dialog('close');
            } else {
                console.error('#createPlatformDialog element not found for closing');
            }
        });
    }

    return {
        createPlatConfigDialog: createPlatConfigDialog
    };

})();
