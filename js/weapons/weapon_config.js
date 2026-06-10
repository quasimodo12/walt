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

    function getWeaponRangeBand(weapon) {
        if (WeaponStorage.getWeaponRangeBand) {
            return WeaponStorage.getWeaponRangeBand(weapon);
        }
        if (typeof RangeUtils !== 'undefined' && RangeUtils.getWeaponRangeBand) {
            return RangeUtils.getWeaponRangeBand(weapon);
        }
        return {
            min: parseRangeInput(weapon && weapon.weapon_min_range) || 0,
            max: parseRangeInput(weapon && (weapon.weapon_max_range !== undefined ? weapon.weapon_max_range : weapon.weapon_range)) || 0
        };
    }

    function validateWeaponRangeBand(minRange, maxRange) {
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
    function createWeaponConfigDialog() {
        var weaponData = WeaponStorage.getWeaponData();

        // Create datatable structure
        var content = '<table id="weaponTable" class="display"><thead><tr>' +
            '<th>Name</th>' +
            '<th>Side</th>' +
            '<th>Minimum Range (m)</th>' +
            '<th>Maximum Range (m)</th>' +
            '<th>Actions</th>' +
            '</tr></thead><tbody>';

        // Populate the table with weapon data
        weaponData.forEach(function(weapon, index) {
            var sideOptions = buildSideOptions(weapon && weapon.side);
            var rangeBand = getWeaponRangeBand(weapon);
            content += '<tr>' +
                '<td><input type="text" value="' + weapon.weapon_name + '" class="weapon-name" data-index="' + index + '" maxlength="32" /></td>' +
                '<td><select class="weapon-side" data-index="' + index + '">' +
                sideOptions +
                '</select></td>' +
                '<td><input type="number" value="' + rangeBand.min + '" class="weapon-min-range" data-index="' + index + '" min="0" step="any" /></td>' +
                '<td><input type="number" value="' + rangeBand.max + '" class="weapon-max-range" data-index="' + index + '" min="0" step="any" /></td>' +
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
        var weaponData = [];
        var errors = [];

        // Use DataTables API to get all rows, regardless of pagination
        var table = $('#weaponTable').DataTable();
        var allRows = table.rows().nodes(); // Get all row nodes

        // Iterate over each row in the table
        $(allRows).each(function() {
            var index = $(this).find('.weapon-name').data('index');
            var name = $(this).find('.weapon-name').val().trim();
            var side = $(this).find('.weapon-side').val() || getDefaultSideId();
            var minRange = parseRangeInput($(this).find('.weapon-min-range').val());
            var maxRange = parseRangeInput($(this).find('.weapon-max-range').val());
            var existingWeapon = WeaponStorage.getWeaponData()[index] || {};
            var oldName = existingWeapon.weapon_name;
            var rangeErrors = validateWeaponRangeBand(minRange, maxRange);

            if (!name) {
                errors.push('Weapon name cannot be empty.');
            }

            rangeErrors.forEach(function(error) {
                errors.push((name || oldName || 'Unnamed weapon') + ': ' + error);
            });

            // Collect data for validation and storage update. Keep weapon_range
            // synchronized as a migration fallback for code that has not yet
            // moved to canonical min/max fields.
            weaponData.push({
                oldName: oldName,
                weapon_name: name,
                side: side,
                weapon_min_range: minRange,
                weapon_max_range: maxRange,
                weapon_range: maxRange
            });
        });

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        // Check for unique weapon names
        var names = weaponData.map(w => w.weapon_name.toLowerCase());
        var hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
        if (hasDuplicates) {
            alert('Weapon names must be unique. Please ensure all weapon names are unique.');
            return;
        }

        weaponData.forEach(function(weapon) {
            if (weapon.oldName !== weapon.weapon_name) {
                updatePlatformWeaponReferences(weapon.oldName, weapon.weapon_name);
            }
            delete weapon.oldName;
        });

        // Update WeaponStorage with the new data
        WeaponStorage.setWeaponData(weaponData);
        // Update range rings and redraw on the map
        RangeRingStorage.init();
        RangeRingLogic.drawRangeRings();
        View.updateAll();

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
    function addWeaponToStorage(name, side, minRange, maxRange) {
        if (name.trim() === '') {
            alert('Weapon name cannot be empty. Please enter a valid name.');
        } else if (isUniqueWeaponName(name)) {
            var weapon = {
                weapon_name: name,
                side: side || getDefaultSideId(),
                weapon_min_range: minRange,
                weapon_max_range: maxRange,
                weapon_range: maxRange
            };
            if (typeof RangeUtils !== 'undefined' && RangeUtils.normalizeWeaponRecord) {
                weapon = RangeUtils.normalizeWeaponRecord(weapon);
            }
            WeaponStorage.getWeaponData().push(weapon);
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
                <label for="newWeaponMinRange" style="display:block; margin-top: 10px;">Minimum Range (m):</label>
                <input type="number" id="newWeaponMinRange" class="ui-widget-content ui-corner-all" style="width: 100%;" value="0" min="0" step="any" />
                <label for="newWeaponMaxRange" style="display:block; margin-top: 10px;">Maximum Range (m):</label>
                <input type="number" id="newWeaponMaxRange" class="ui-widget-content ui-corner-all" style="width: 100%;" value="0" min="0" step="any" />
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
            width: 360,
            close: function() {
                $(this).dialog('destroy').remove();
            }
        });
    
        // Bind event for "Complete" button
        $('#completeAddWeapon').off('click').on('click', function() {
            const weaponName = $('#newWeaponName').val().trim();
            var minRange = parseRangeInput($('#newWeaponMinRange').val());
            var maxRange = parseRangeInput($('#newWeaponMaxRange').val());
            var rangeErrors = validateWeaponRangeBand(minRange, maxRange);
    
            // Validate weapon name
            if (!weaponName) {
                alert("Weapon name cannot be empty. Please enter a valid name.");
                return;
            }
    
            if (!isUniqueWeaponName(weaponName)) {
                alert("Weapon name must be unique. Please choose a different name.");
                return;
            }

            if (rangeErrors.length > 0) {
                alert(rangeErrors.join('\n'));
                return;
            }
    
            // Add weapon to storage with default values for side and range
            addWeaponToStorage(weaponName, getDefaultSideId(), minRange, maxRange);
    
            // Close dialog and refresh the main weapon config dialog
            $('#addWeaponDialogContent').dialog('close');
            createWeaponConfigDialog();
        });
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

