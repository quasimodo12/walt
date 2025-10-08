// js/weapon_lethality/weapon_lethality_config.js
var WeaponLethalityConfig = (function($) {
    var tableInstance = null;

    function getWeaponOptions() {
        var weapons = [];
        if (typeof WeaponStorage !== 'undefined' && typeof WeaponStorage.getWeaponData === 'function') {
            weapons = WeaponStorage.getWeaponData().map(function(weapon) {
                return weapon.weapon_name;
            });
        }
        return weapons.filter(Boolean).sort(function(a, b) {
            return a.localeCompare(b);
        });
    }

    function getPlatformOptions() {
        var platforms = [];
        if (typeof PlatformModel !== 'undefined' && typeof PlatformModel.getPlatformData === 'function') {
            platforms = PlatformModel.getPlatformData().map(function(platform) {
                return platform.platform_name;
            });
        }
        return platforms.filter(Boolean).sort(function(a, b) {
            return a.localeCompare(b);
        });
    }

    function escapeHtml(value) {
        if (typeof value !== 'string') {
            return '';
        }

        var entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return value.replace(/[&<>"']/g, function(character) {
            return entityMap[character] || character;
        });
    }

    function buildOptions(options, selectedValue) {
        if (!options.length) {
            if (selectedValue) {
                var safeSelectedOnly = escapeHtml(selectedValue);
                return '<option value="' + safeSelectedOnly + '" selected>' + safeSelectedOnly + '</option>';
            }
            return '<option value="">Not Available</option>';
        }

        var optionsMap = {};

        var optionsHtml = options.map(function(option) {
            var selected = option === selectedValue ? ' selected' : '';
            optionsMap[option] = true;
            var safeOption = escapeHtml(option);
            return '<option value="' + safeOption + '"' + selected + '>' + safeOption + '</option>';
        }).join('');

        if (selectedValue && !optionsMap[selectedValue]) {
            var safeSelected = escapeHtml(selectedValue);
            optionsHtml += '<option value="' + safeSelected + '" selected>' + safeSelected + '</option>';
        }

        return optionsHtml;
    }

    function createWeaponSelect(selectedValue) {
        var options = buildOptions(getWeaponOptions(), selectedValue);
        return '<select class="lethality-weapon">' + options + '</select>';
    }

    function createPlatformSelect(selectedValue) {
        var options = buildOptions(getPlatformOptions(), selectedValue);
        return '<select class="lethality-platform">' + options + '</select>';
    }

    function createQuantityInput(value) {
        var safeValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;
        return '<input type="number" class="lethality-quantity" min="0" value="' + safeValue + '">';
    }

    function createDeleteButton() {
        return '<button type="button" class="delete-lethality">Delete</button>';
    }

    function destroyExistingTable() {
        if (tableInstance) {
            tableInstance.destroy();
            tableInstance = null;
        }
    }

    function renderTableBody(data) {
        var rowsHtml = data.map(function(entry) {
            return '<tr>' +
                '<td>' + createWeaponSelect(entry.weapon) + '</td>' +
                '<td>' + createPlatformSelect(entry.platform) + '</td>' +
                '<td>' + createQuantityInput(entry.quantity) + '</td>' +
                '<td>' + createDeleteButton() + '</td>' +
            '</tr>';
        }).join('');

        return rowsHtml;
    }

    function buildDialogContent(pairings) {
        var content = '';
        content += '<table id="weaponLethalityTable" class="display" style="width: 100%">';
        content += '<thead><tr>' +
            '<th>Weapon</th>' +
            '<th>Platform</th>' +
            '<th>Quantity</th>' +
            '<th>Actions</th>' +
            '</tr></thead>';
        content += '<tbody>' + renderTableBody(pairings) + '</tbody>';
        content += '</table>';
        content += '<div class="weapon-lethality-actions" style="margin-top: 10px; display: flex; justify-content: space-between;">';
        content += '<button type="button" id="addLethalityPairing">Add Pairing</button>';
        content += '<button type="button" id="saveWeaponLethality">Save Changes</button>';
        content += '</div>';
        return content;
    }

    function initialiseDataTable() {
        var hasWeaponOptions = getWeaponOptions().length > 0;
        var hasPlatformOptions = getPlatformOptions().length > 0;

        tableInstance = $('#weaponLethalityTable').DataTable({
            paging: true,
            searching: true,
            info: true,
            ordering: false,
            autoWidth: false,
            lengthChange: false,
            pageLength: 10,
            language: {
                emptyTable: hasWeaponOptions && hasPlatformOptions ? 'No weapon lethality pairings available.' : 'Weapon and platform data are required to configure lethality pairings.'
            }
        });
    }

    function addPairingRow() {
        if (!tableInstance) {
            return;
        }

        var weaponOptions = getWeaponOptions();
        var platformOptions = getPlatformOptions();

        if (!weaponOptions.length || !platformOptions.length) {
            alert('Weapons and platforms must be available to create lethality pairings.');
            return;
        }

        var defaultWeapon = weaponOptions[0];
        var defaultPlatform = platformOptions[0];

        tableInstance.row.add([
            createWeaponSelect(defaultWeapon),
            createPlatformSelect(defaultPlatform),
            createQuantityInput(0),
            createDeleteButton()
        ]).draw(false);
    }

    function bindEvents() {
        $('#addLethalityPairing').off('click').on('click', function() {
            addPairingRow();
        });

        $('#saveWeaponLethality').off('click').on('click', function() {
            saveChanges();
        });

        $('#weaponLethalityTable').off('click', '.delete-lethality').on('click', '.delete-lethality', function() {
            if (!tableInstance) {
                return;
            }
            tableInstance.row($(this).closest('tr')).remove().draw(false);
        });
    }

    function gatherTableData() {
        if (!tableInstance) {
            return [];
        }

        var nodes = tableInstance.rows().nodes();
        var updatedData = [];
        var hasError = false;

        $(nodes).each(function() {
            if (hasError) {
                return;
            }

            var weapon = $(this).find('.lethality-weapon').val();
            var platform = $(this).find('.lethality-platform').val();
            var quantityValue = $(this).find('.lethality-quantity').val();
            var quantity = parseInt(quantityValue, 10);

            if (!weapon || !platform) {
                alert('Each pairing must have both a weapon and a platform selected.');
                hasError = true;
                return;
            }

            if (isNaN(quantity) || quantity < 0) {
                alert('Quantities must be zero or greater.');
                hasError = true;
                return;
            }

            updatedData.push({
                weapon: weapon,
                platform: platform,
                quantity: quantity
            });
        });

        if (hasError) {
            return null;
        }

        return updatedData;
    }

    function saveChanges() {
        var updatedData = gatherTableData();
        if (!updatedData) {
            return;
        }

        WeaponLethalityStorage.setWeaponLethalityData(updatedData);
        alert('Weapon lethality data updated successfully.');
    }

    function createWeaponLethalityDialog() {
        if (typeof WeaponLethalityStorage === 'undefined') {
            console.warn('WeaponLethalityStorage is not available.');
            return;
        }

        var pairings = WeaponLethalityStorage.getWeaponLethalityData();
        destroyExistingTable();

        $('#weaponLethalityContent').html(buildDialogContent(pairings));
        $('#weaponLethalityDialog').dialog('open');

        initialiseDataTable();
        bindEvents();
    }

    return {
        createWeaponLethalityDialog: createWeaponLethalityDialog
    };
})(jQuery);
