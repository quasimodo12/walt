// weapon_config.js
var WeaponConfig = (function() {

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

    // Function to create platform info dialog with inputs
    function createWeaponConfigDialog() {
        var weaponData = WeaponStorage.getWeaponData();

        // Create datatable structure
        var content = '<table id="weaponTable" class="display"><thead><tr>' +
            '<th>Name</th>' +
            '<th>Side</th>' +
            '<th>Max Range</th>' +
            '<th>Actions</th>' +
            '</tr></thead><tbody>';

        // Populate the table with weapon data
        weaponData.forEach(function(weapon, index) {
            var sideOptions = buildSideOptions(weapon && weapon.side);
            content += '<tr>' +
                '<td><input type="text" value="' + weapon.weapon_name + '" class="weapon-name" data-index="' + index + '" maxlength="32" /></td>' +
                '<td><select class="weapon-side" data-index="' + index + '">' +
                sideOptions +
                '</select></td>' +
                '<td><input type="number" value="' + weapon.weapon_range + '" class="weapon-range" data-index="' + index + '" /></td>' +
                '<td><button class="delete-weapon" data-index="' + index + '">Delete</button></td>' +
                '</tr>';
        });

        content += '</tbody></table>';

        // Add the "Add Weapon" and "Update" buttons
        content += `
            <div style="margin-top: 10px;">
                <button id="addWeapon">Add Weapon</button>
                <button id="updateWeapons" style="float: right;">Update</button>
            </div>
        `;
        // Open the weapon dialog box
        $('#weaponInfoContent').html(content);
        $('#weaponInfoDialog').dialog('open');

        // Initialize DataTable
        $('#weaponTable').DataTable();

        // Bind event listeners for inputs and actions
        bindWeaponActions();

    }

    function updateAllWeaponsInStorage() {
        var isValid = true;
        var weaponData = [];
    
        // Use DataTables API to get all rows, regardless of pagination
        var table = $('#weaponTable').DataTable();
        var allRows = table.rows().nodes(); // Get all row nodes
    
        // Iterate over each row in the table
        $(allRows).each(function() {
            var index = $(this).find('.weapon-name').data('index');
            var name = $(this).find('.weapon-name').val().trim();
            var side = $(this).find('.weapon-side').val() || getDefaultSideId();
            var range = parseInt($(this).find('.weapon-range').val(), 10);
        
            // Save old name for updating platformData
            var oldName = WeaponStorage.getWeaponData()[index].weapon_name;
        
            // Update platformData if the name has changed
            if (oldName !== name) {
                updatePlatformWeaponReferences(oldName, name);
            }
        
            // Collect data for validation
            weaponData.push({
                index: index,
                weapon_name: name,
                side: side,
                weapon_range: range
            });
        });
        
    
        if (!isValid) {
            return;
        }
    
        // Check for unique weapon names
        var names = weaponData.map(w => w.weapon_name.toLowerCase());
        var hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
        if (hasDuplicates) {
            alert('Weapon names must be unique. Please ensure all weapon names are unique.');
            return;
        }
    
        // Update WeaponStorage with the new data
        WeaponStorage.setWeaponData(weaponData);
        // Update range rings and redraw on the map
        RangeRingStorage.init();
    
        // Optionally, close the dialog or provide a success message
        alert('Weapon data has been updated successfully.');
    }
        
    function bindWeaponActions() {
        // Handle delete weapon
        $('#weaponTable').off('click', '.delete-weapon').on('click', '.delete-weapon', function() {
            var index = parseInt($(this).data('index'), 10);
            handleWeaponDeletion(index);
        });

        // Handle add weapon
        $('#addWeapon').off('click').on('click', function() {
            openAddWeaponDialog();
        });

        // Handle "Update" button click
        $('#updateWeapons').off('click').on('click', function() {
            updateAllWeaponsInStorage();
        });
    }

    // Function to add a new weapon into weapon storage
    function addWeaponToStorage(name, side, maxRange) {
        if (name.trim() === '') {
            alert('Weapon name cannot be empty. Please enter a valid name.');
        } else if (isUniqueWeaponName(name)) {
            WeaponStorage.getWeaponData().push({
                weapon_name: name,
                side: side || getDefaultSideId(),
                weapon_range: maxRange
            });
        } else {
            alert('Weapon name must be unique. Please choose a different name.');
        }
    }

    function openAddWeaponDialog() {
        // Create dialog content
        const dialogContent = `
            <div id="addWeaponDialogContent">
                <label for="newWeaponName">Weapon Name:</label>
                <input type="text" id="newWeaponName" class="ui-widget-content ui-corner-all" style="width: 100%;" maxlength="32" />
                <div style="margin-top: 10px; text-align: right;">
                    <button id="completeAddWeapon">Complete</button>
                </div>
            </div>
        `;
    
        // Append to body (if not already added)
        if (!$('#addWeaponDialogContent').length) {
            $('body').append(dialogContent);
        }
    
        // Open dialog
        $('#addWeaponDialogContent').dialog({
            title: "Add New Weapon",
            modal: true,
            resizable: false,
            width: 300,
            close: function() {
                $(this).dialog('destroy').remove();
            }
        });
    
        // Bind event for "Complete" button
        $('#completeAddWeapon').off('click').on('click', function() {
            const weaponName = $('#newWeaponName').val().trim();
    
            // Validate weapon name
            if (!weaponName) {
                alert("Weapon name cannot be empty. Please enter a valid name.");
                return;
            }
    
            if (!isUniqueWeaponName(weaponName)) {
                alert("Weapon name must be unique. Please choose a different name.");
                return;
            }
    
            // Add weapon to storage with default values for side and range
            addWeaponToStorage(weaponName, getDefaultSideId(), 0);
    
            // Close dialog and refresh the main weapon config dialog
            $('#addWeaponDialogContent').dialog('close');
            createWeaponConfigDialog();
        });
    }

    // Function to update weapon data in weapon storage
    function updateWeaponInStorage(index, name, side, maxRange) {
        var weaponData = WeaponStorage.getWeaponData();
        if (index >= 0 && index < weaponData.length) {
            weaponData[index].weapon_name = name;
            weaponData[index].side = side;
            weaponData[index].weapon_range = maxRange;
        }
    }

    function handleWeaponDeletion(index) {
        var weaponData = WeaponStorage.getWeaponData();

        if (!Array.isArray(weaponData) || index < 0 || index >= weaponData.length) {
            return;
        }

        var weaponEntry = weaponData[index];
        var weaponName = weaponEntry.weapon_name;

        if (!weaponName) {
            return;
        }

        var confirmed = confirm('Are you sure you want to delete the weapon "' + weaponName + '"?');
        if (!confirmed) {
            return;
        }

        removeWeaponFromPlatforms(weaponName);
        deleteWeaponFromStorage(index);

        RangeRingStorage.init();
        RangeRingLogic.drawRangeRings();
        View.updateAll();

        createWeaponConfigDialog();
    }

    // Function to delete weapon from storage
    function deleteWeaponFromStorage(index) {
        var weaponData = WeaponStorage.getWeaponData();
        if (index >= 0 && index < weaponData.length) {
            return weaponData.splice(index, 1)[0];
        }
        return null;
    }

    // Function to check if weapon name is unique
    function isUniqueWeaponName(name, indexToIgnore = -1) {
        var weaponData = WeaponStorage.getWeaponData();
        for (var i = 0; i < weaponData.length; i++) {
            if (i !== indexToIgnore && weaponData[i].weapon_name.toLowerCase() === name.toLowerCase()) {
                return false;
            }
        }
        return true;
    }

    // Helper function to change weapon names in platformData after they have been modified
    function updatePlatformWeaponReferences(oldName, newName) {
        var platformData = PlatformModel.getPlatformData();

        platformData.forEach(platform => {
            // Find and replace old weapon name with the new one
            platform.weapons.forEach(weapon => {
                if (weapon.name === oldName) {
                    weapon.name = newName;
                }
            });
        });
    }

    function removeWeaponFromPlatforms(weaponName) {
        var platformData = PlatformModel.getPlatformData();

        platformData.forEach(platform => {
            if (!Array.isArray(platform.weapons)) {
                return;
            }

            for (var i = platform.weapons.length - 1; i >= 0; i--) {
                if (platform.weapons[i].name === weaponName) {
                    platform.weapons.splice(i, 1);
                }
            }
        });
    }

    return {
        createWeaponConfigDialog: createWeaponConfigDialog
    };
})();

// Usage example
$(function() {
    $('#openWeaponConfig').on('click', function() {
        WeaponConfig.createWeaponConfigDialog();
    });
});

