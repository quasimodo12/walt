// js/weapon_lethality/weapon_lethality_config.js
var WeaponLethalityConfig = (function() {
    var tableInstance = null;
    var dialogSelector = '#weaponLethalityDialog';
    var contentSelector = '#weaponLethalityContent';

    function getWeaponNames() {
        var weapons = [];
        if (typeof WeaponStorage !== 'undefined' && typeof WeaponStorage.getWeaponData === 'function') {
            weapons = WeaponStorage.getWeaponData().map(function(item) {
                return item && item.weapon_name ? item.weapon_name : '';
            });
        }
        var unique = {};
        weapons.forEach(function(name) {
            if (typeof name === 'string' && name.trim() !== '') {
                unique[name.trim()] = true;
            }
        });
        return Object.keys(unique).sort();
    }

    function getPlatformTypes() {
        var types = [];
        if (typeof PlatformModel !== 'undefined' && typeof PlatformModel.getPlatformData === 'function') {
            PlatformModel.getPlatformData().forEach(function(platform) {
                var type = platform && typeof platform.type === 'string' ? platform.type.trim() : '';
                if (type === '') {
                    type = 'Unspecified';
                }
                types.push(type);
            });
        }

        if (types.length === 0) {
            types.push('Unspecified');
        }

        var unique = {};
        types.forEach(function(type) {
            if (typeof type === 'string' && type.trim() !== '') {
                unique[type.trim()] = true;
            }
        });
        return Object.keys(unique).sort();
    }

    function buildOptions(list, selected) {
        var hasSelected = false;
        var sanitizedSelected = typeof selected === 'string' ? selected : '';
        var optionsHtml = list.map(function(item) {
            var isSelected = item === sanitizedSelected;
            if (isSelected) {
                hasSelected = true;
            }
            return '<option value="' + item + '"' + (isSelected ? ' selected' : '') + '>' + item + '</option>';
        }).join('');

        if (!hasSelected && sanitizedSelected) {
            optionsHtml += '<option value="' + sanitizedSelected + '" selected>' + sanitizedSelected + '</option>';
        }

        return optionsHtml;
    }

    function renderAddControls() {
        var weapons = getWeaponNames();
        var platformTypes = getPlatformTypes();
        var $dialog = $(dialogSelector);

        $dialog.find('#newLethalityWeapon').html(buildOptions(weapons, weapons[0] || ''));
        $dialog.find('#newLethalityPlatformType').html(buildOptions(platformTypes, platformTypes[0] || ''));
        $dialog.find('#newLethalityQuantity').val(1);

        var disableAdd = weapons.length === 0 || platformTypes.length === 0;
        $dialog.find('#addWeaponLethalityPairing').prop('disabled', disableAdd);
    }

    function renderTable() {
        var $dialog = $(dialogSelector);
        var $table = $dialog.find('#weaponLethalityTable');
        if ($table.length === 0) {
            return;
        }

        if (tableInstance) {
            tableInstance.destroy();
            tableInstance = null;
        }

        var lethalityData = WeaponLethalityStorage.getLethalityData();
        var weapons = getWeaponNames();
        var platformTypes = getPlatformTypes();
        var $tbody = $table.find('tbody');
        if ($tbody.length === 0) {
            $tbody = $('<tbody></tbody>').appendTo($table);
        }
        $tbody.empty();

        lethalityData.forEach(function(entry, index) {
            var weaponOptions = buildOptions(weapons, entry.weapon);
            var platformOptions = buildOptions(platformTypes, entry.platformType);
            var quantityValue = typeof entry.quantity === 'number' ? entry.quantity : parseInt(entry.quantity, 10) || 0;

            var rowHtml = [
                '<tr data-index="' + index + '">',
                '<td class="weapon-cell"><select class="lethality-weapon-select">', weaponOptions, '</select></td>',
                '<td class="platform-cell"><select class="lethality-platform-type-select">', platformOptions, '</select></td>',
                '<td class="quantity-cell"><input type="number" min="0" class="lethality-quantity-input" value="', quantityValue, '"></td>',
                '<td class="actions-cell"><button type="button" class="lethality-delete-button">Delete</button></td>',
                '</tr>'
            ].join('');

            $tbody.append(rowHtml);
        });

        tableInstance = $table.DataTable({
            paging: true,
            searching: true,
            lengthChange: false,
            pageLength: 8,
            ordering: false,
            info: false,
            autoWidth: false,
            language: {
                emptyTable: 'No lethality pairings available',
                search: 'Search:'
            }
        });
    }

    function buildDialogContent() {
        var dialogHtml = [
            '<div class="weapon-lethality-dialog">',
            '  <div class="weapon-lethality-controls">',
            '    <div class="weapon-lethality-control">',
            '      <label for="newLethalityWeapon">Weapon</label>',
            '      <select id="newLethalityWeapon"></select>',
            '    </div>',
            '    <div class="weapon-lethality-control">',
            '      <label for="newLethalityPlatformType">Platform Type</label>',
            '      <select id="newLethalityPlatformType"></select>',
            '    </div>',
            '    <div class="weapon-lethality-control">',
            '      <label for="newLethalityQuantity">Quantity</label>',
            '      <input type="number" id="newLethalityQuantity" min="0" value="1" />',
            '    </div>',
            '    <div class="weapon-lethality-control weapon-lethality-control--button">',
            '      <button type="button" id="addWeaponLethalityPairing">Add Pairing</button>',
            '    </div>',
            '  </div>',
            '  <table id="weaponLethalityTable" class="display weapon-lethality-table">',
            '    <thead>',
            '      <tr>',
            '        <th>Weapon</th>',
            '        <th>Platform Type</th>',
            '        <th>Quantity</th>',
            '        <th>Actions</th>',
            '      </tr>',
            '    </thead>',
            '    <tbody></tbody>',
            '  </table>',
            '</div>'
        ].join('');

        $(contentSelector).html(dialogHtml);
    }

    function bindEvents() {
        var $dialog = $(dialogSelector);

        $dialog.off('click', '#addWeaponLethalityPairing').on('click', '#addWeaponLethalityPairing', function() {
            var weapon = $dialog.find('#newLethalityWeapon').val();
            var platformType = $dialog.find('#newLethalityPlatformType').val();
            var quantityValue = parseInt($dialog.find('#newLethalityQuantity').val(), 10);

            if (!weapon) {
                alert('Please select a weapon before adding a pairing.');
                return;
            }

            if (!platformType) {
                alert('Please select a platform type before adding a pairing.');
                return;
            }

            if (isNaN(quantityValue) || quantityValue < 0) {
                alert('Quantity must be zero or greater.');
                return;
            }

            var lethalityData = WeaponLethalityStorage.getLethalityData();
            var exists = lethalityData.some(function(entry) {
                return entry.weapon === weapon && entry.platformType === platformType;
            });

            if (exists) {
                alert('This weapon and platform type pairing already exists.');
                return;
            }

            WeaponLethalityStorage.addPairing({
                weapon: weapon,
                platformType: platformType,
                quantity: quantityValue
            });

            renderTable();
            renderAddControls();
        });

        $dialog.off('change', '.lethality-weapon-select').on('change', '.lethality-weapon-select', function() {
            var $row = $(this).closest('tr');
            var index = parseInt($row.data('index'), 10);
            WeaponLethalityStorage.updatePairing(index, { weapon: $(this).val() });
        });

        $dialog.off('change', '.lethality-platform-type-select').on('change', '.lethality-platform-type-select', function() {
            var $row = $(this).closest('tr');
            var index = parseInt($row.data('index'), 10);
            WeaponLethalityStorage.updatePairing(index, { platformType: $(this).val() });
        });

        $dialog.off('input change', '.lethality-quantity-input').on('input change', '.lethality-quantity-input', function() {
            var $row = $(this).closest('tr');
            var index = parseInt($row.data('index'), 10);
            var value = parseInt($(this).val(), 10);

            if (isNaN(value) || value < 0) {
                value = 0;
                $(this).val(value);
            }

            WeaponLethalityStorage.updatePairing(index, { quantity: value });
        });

        $dialog.off('click', '.lethality-delete-button').on('click', '.lethality-delete-button', function() {
            var $row = $(this).closest('tr');
            var index = parseInt($row.data('index'), 10);
            WeaponLethalityStorage.removePairing(index);
            renderTable();
            renderAddControls();
        });
    }

    function openDialog() {
        if (tableInstance) {
            tableInstance.destroy();
            tableInstance = null;
        }
        buildDialogContent();
        renderAddControls();
        renderTable();
        bindEvents();
        $(dialogSelector).dialog('open');
    }

    return {
        openDialog: openDialog,
        renderTable: renderTable
    };
})();
