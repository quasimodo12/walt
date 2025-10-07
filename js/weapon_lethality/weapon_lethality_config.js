// js/weapon_lethality/weapon_lethality_config.js
var WeaponLethalityConfig = (function() {
    var TABLE_SELECTOR = '#weaponLethalityTable';

    function getWeapons() {
        if (typeof WeaponStorage !== 'undefined' && typeof WeaponStorage.getWeaponData === 'function') {
            return WeaponStorage.getWeaponData();
        }
        return [];
    }

    function getPlatforms() {
        if (typeof PlatformModel !== 'undefined' && typeof PlatformModel.getPlatformData === 'function') {
            return PlatformModel.getPlatformData();
        }
        return [];
    }

    function buildWeaponOptions(selectedWeapon) {
        var weapons = getWeapons();
        if (!weapons.length && selectedWeapon) {
            weapons = [{ weapon_name: selectedWeapon }];
        }
        return weapons.map(function(weapon) {
            var value = weapon.weapon_name || '';
            var isSelected = value === selectedWeapon;
            return '<option value="' + value + '"' + (isSelected ? ' selected' : '') + '>' + value + '</option>';
        }).join('');
    }

    function buildPlatformOptions(selectedPlatform) {
        var platforms = getPlatforms();
        if (!platforms.length && selectedPlatform) {
            platforms = [{ platform_name: selectedPlatform }];
        }
        return platforms.map(function(platform) {
            var value = platform.platform_name || '';
            var isSelected = value === selectedPlatform;
            return '<option value="' + value + '"' + (isSelected ? ' selected' : '') + '>' + value + '</option>';
        }).join('');
    }

    function buildRow(entry, index) {
        return [
            '<select class="weapon-lethality-weapon" data-row-index="' + index + '">' + buildWeaponOptions(entry.weapon) + '</select>',
            '<select class="weapon-lethality-platform" data-row-index="' + index + '">' + buildPlatformOptions(entry.platform) + '</select>',
            '<div class="weapon-lethality-quantity-cell" style="display: flex; align-items: center; gap: 8px;">' +
                '<input type="number" min="0" step="1" class="weapon-lethality-quantity" data-row-index="' + index + '" value="' + entry.quantity + '">' +
                '<button type="button" class="weapon-lethality-delete" data-row-index="' + index + '">Delete</button>' +
            '</div>'
        ];
    }

    function renderTableBody() {
        var lethalityData = WeaponLethalityStorage.getLethalityData();
        var tbody = document.querySelector(TABLE_SELECTOR + ' tbody');
        if (!tbody) {
            return;
        }
        var rowsHtml = lethalityData.map(function(entry, index) {
            var rowPieces = buildRow(entry, index);
            return '<tr data-row-index="' + index + '">' +
                '<td>' + rowPieces[0] + '</td>' +
                '<td>' + rowPieces[1] + '</td>' +
                '<td>' + rowPieces[2] + '</td>' +
                '</tr>';
        }).join('');

        tbody.innerHTML = rowsHtml;
    }

    function initDataTable() {
        $(TABLE_SELECTOR).DataTable({
            paging: false,
            searching: false,
            info: false,
            ordering: false,
            autoWidth: false,
            columnDefs: [
                { targets: [2], orderable: false }
            ]
        });
    }

    function refreshTable() {
        if ($.fn.DataTable.isDataTable(TABLE_SELECTOR)) {
            $(TABLE_SELECTOR).DataTable().destroy();
        }
        renderTableBody();
        initDataTable();
        bindRowEvents();
    }

    function bindRowEvents() {
        var table = $(TABLE_SELECTOR);
        table.off('change', '.weapon-lethality-weapon').on('change', '.weapon-lethality-weapon', function() {
            var index = parseInt($(this).data('row-index'), 10);
            WeaponLethalityStorage.updateEntry(index, { weapon: $(this).val() });
        });

        table.off('change', '.weapon-lethality-platform').on('change', '.weapon-lethality-platform', function() {
            var index = parseInt($(this).data('row-index'), 10);
            WeaponLethalityStorage.updateEntry(index, { platform: $(this).val() });
        });

        table.off('input', '.weapon-lethality-quantity').on('input', '.weapon-lethality-quantity', function() {
            var index = parseInt($(this).data('row-index'), 10);
            WeaponLethalityStorage.updateEntry(index, { quantity: $(this).val() });
        });

        table.off('click', '.weapon-lethality-delete').on('click', '.weapon-lethality-delete', function() {
            var index = parseInt($(this).data('row-index'), 10);
            WeaponLethalityStorage.removeEntry(index);
            refreshTable();
        });
    }

    function createWeaponLethalityDialog() {
        var dialogContent = '' +
            '<table id="weaponLethalityTable" class="display">' +
            '<thead>' +
            '<tr>' +
            '<th>Weapon</th>' +
            '<th>Platform</th>' +
            '<th>Quantity</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody></tbody>' +
            '</table>' +
            '<div class="weapon-lethality-toolbar" style="margin-top: 10px; display: flex; justify-content: flex-start; gap: 8px;">' +
            '<button id="addWeaponLethalityRow" type="button">Add Pairing</button>' +
            '</div>';

        $('#weaponLethalityContent').html(dialogContent);
        refreshTable();

        $('#weaponLethalityDialog').dialog('open');

        $('#addWeaponLethalityRow').off('click').on('click', function() {
            var weapons = getWeapons();
            var platforms = getPlatforms();

            if (!weapons.length || !platforms.length) {
                alert('At least one weapon and one platform are required before creating lethality pairings.');
                return;
            }

            WeaponLethalityStorage.addEntry({
                weapon: weapons[0].weapon_name || '',
                platform: platforms[0].platform_name || '',
                quantity: 1
            });

            refreshTable();
        });
    }

    return {
        createWeaponLethalityDialog: createWeaponLethalityDialog,
        refreshTable: refreshTable
    };
})();
