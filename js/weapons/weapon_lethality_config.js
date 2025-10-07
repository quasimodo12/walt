// js/weapons/weapon_lethality_config.js
var WeaponLethalityConfig = (function() {
    function escapeHtml(value) {
        return String(value || '').replace(/["&'<>]/g, function(char) {
            switch (char) {
                case '"': return '&quot;';
                case "'": return '&#39;';
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                default: return char;
            }
        });
    }

    function buildOptions(options, selectedValue) {
        return options.map(function(option) {
            var value = option.value || option;
            var label = option.label || option;
            var isSelected = value === selectedValue;
            return '<option value="' + escapeHtml(value) + '"' + (isSelected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
        }).join('');
    }

    function createRowHtml(rowData, weapons, platforms) {
        var weaponOptions = buildOptions(weapons, rowData.weapon);
        var platformOptions = buildOptions(platforms, rowData.platform);
        var quantity = typeof rowData.quantity === 'number' ? rowData.quantity : 0;

        return [
            '<tr>',
            '  <td><select class="weapon-lethality-select weapon-select">' + weaponOptions + '</select></td>',
            '  <td><select class="weapon-lethality-select platform-select">' + platformOptions + '</select></td>',
            '  <td class="quantity-cell">',
            '    <input type="number" class="weapon-lethality-quantity" min="0" step="1" value="' + escapeHtml(quantity) + '">',
            '  </td>',
            '  <td class="actions-cell">',
            '    <button type="button" class="delete-lethality-row">Delete</button>',
            '  </td>',
            '</tr>'
        ].join('');
    }

    function renderTableRows(lethalityData, weapons, platforms) {
        if (!Array.isArray(lethalityData) || lethalityData.length === 0) {
            return createRowHtml({
                weapon: weapons.length > 0 ? weapons[0].value || weapons[0] : '',
                platform: platforms.length > 0 ? platforms[0].value || platforms[0] : '',
                quantity: 0
            }, weapons, platforms);
        }

        return lethalityData.map(function(entry) {
            return createRowHtml(entry, weapons, platforms);
        }).join('');
    }

    function getWeaponOptions() {
        var weaponData = WeaponStorage.getWeaponData() || [];
        return weaponData.map(function(weapon) {
            return weapon.weapon_name;
        });
    }

    function getPlatformOptions() {
        var platformNames = PlatformModel.getPlatformNames() || [];
        return platformNames;
    }

    function collectTableData(dialogRoot) {
        var rows = [];
        dialogRoot.find('#weaponLethalityTable tbody tr').each(function() {
            var row = $(this);
            var weapon = row.find('.weapon-select').val();
            var platform = row.find('.platform-select').val();
            var quantityValue = row.find('.weapon-lethality-quantity').val();
            var quantity = parseInt(quantityValue, 10);

            rows.push({
                weapon: weapon || '',
                platform: platform || '',
                quantity: isNaN(quantity) ? 0 : Math.max(quantity, 0)
            });
        });
        return rows;
    }

    function handleSave(dialogRoot) {
        var tableData = collectTableData(dialogRoot);
        var hasInvalid = tableData.some(function(entry) {
            return !entry.weapon || !entry.platform || typeof entry.quantity !== 'number' || entry.quantity < 0;
        });

        if (hasInvalid) {
            alert('Each row must include a weapon, a platform, and a non-negative quantity.');
            return;
        }

        WeaponLethalityStorage.setLethalityData(tableData);
        alert('Weapon lethality data has been updated successfully.');
    }

    function handleAddRow(dialogRoot, weapons, platforms) {
        if (weapons.length === 0 || platforms.length === 0) {
            return;
        }
        var newRowHtml = createRowHtml({
            weapon: weapons[0].value || weapons[0],
            platform: platforms[0].value || platforms[0],
            quantity: 0
        }, weapons, platforms);
        dialogRoot.find('#weaponLethalityTable tbody').append(newRowHtml);
    }

    function bindEvents(dialogRoot, weapons, platforms) {
        dialogRoot.off('click', '#addWeaponLethalityRow').on('click', '#addWeaponLethalityRow', function() {
            handleAddRow(dialogRoot, weapons, platforms);
        });

        dialogRoot.off('click', '#saveWeaponLethality').on('click', '#saveWeaponLethality', function() {
            handleSave(dialogRoot);
        });

        dialogRoot.off('click', '.delete-lethality-row').on('click', '.delete-lethality-row', function() {
            $(this).closest('tr').remove();
        });
    }

    function createWeaponLethalityConfigDialog() {
        var weapons = getWeaponOptions();
        var platforms = getPlatformOptions();

        if (weapons.length === 0 || platforms.length === 0) {
            var message = '<p class="weapon-lethality-empty">Weapon and platform data are required before configuring weapon lethality. Please ensure both datasets are loaded.</p>';
            $('#weaponLethalityDialog').html(message).dialog('open');
            return;
        }

        weapons = weapons.map(function(name) { return { value: name, label: name }; });
        platforms = platforms.map(function(name) { return { value: name, label: name }; });

        var lethalityData = WeaponLethalityStorage.getLethalityData() || [];
        var rowsHtml = renderTableRows(lethalityData, weapons, platforms);

        var layout = [
            '<div class="weapon-lethality-config">',
            '  <table id="weaponLethalityTable" class="weapon-lethality-table">',
            '    <thead>',
            '      <tr>',
            '        <th>Weapon</th>',
            '        <th>Platform</th>',
            '        <th>Quantity</th>',
            '        <th></th>',
            '      </tr>',
            '    </thead>',
            '    <tbody>',
            rowsHtml,
            '    </tbody>',
            '  </table>',
            '  <div class="weapon-lethality-actions">',
            '    <button type="button" id="addWeaponLethalityRow">Add Row</button>',
            '    <button type="button" id="saveWeaponLethality" class="primary">Save</button>',
            '  </div>',
            '</div>'
        ].join('');

        var dialogRoot = $('#weaponLethalityDialog');
        dialogRoot.html(layout);
        bindEvents(dialogRoot, weapons, platforms);
        dialogRoot.dialog('open');
    }

    return {
        createWeaponLethalityConfigDialog: createWeaponLethalityConfigDialog
    };
})();
