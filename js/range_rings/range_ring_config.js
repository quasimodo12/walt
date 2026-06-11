// range_ring_config.js
var RangeRingConfig = (function() {

    function createRangeRingConfigDialog() {
        var rangeRings = RangeRingStorage.getAllRangeRings();

        var content = `
            <div>
                <button id="toggleAllCheckboxes">Toggle All</button>
                <button id="untoggleAllRangeRingsButton">Untoggle All</button>
                <button id="editRangeRingStyleButton">Edit Style</button>
                <table id="rangeRingTable" class="display">
                    <thead>
                        <tr>
                            <th>Toggle</th>
                            <th>Platform Name</th>
                            <th>System Name</th>
                            <th>System Type</th>
                            <th>Min Range (m)</th>
                            <th>Max Range (m)</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rangeRings.map((ring, index) => `
                            <tr data-index="${index}" data-platform="${ring.platform_name}" data-system="${ring.system_name}">
                                <td><input type="checkbox" class="range-toggle" ${ring.toggled ? 'checked' : ''}></td>
                                <td>${ring.platform_name}</td>
                                <td>${ring.system_name}</td>
                                <td>${ring.system_type}</td>
                                <td data-order="${getRangeMinValue(ring)}">${formatRangeValue(getRangeMinValue(ring))}</td>
                                <td data-order="${getRangeMaxValue(ring)}">${formatRangeValue(getRangeMaxValue(ring))}</td>
                                <td>${ring.latitude}</td>
                                <td>${ring.longitude}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        $('#rangeRingInfoContent').html(content);
        $('#rangeRingInfoDialog').dialog('open');

        var rangeRingDataTable = $('#rangeRingTable').DataTable({
            columnDefs: [
                { orderable: false, targets: 0 },
            ],
            pageLength: 10
        });

        $('#rangeRingTable').on('change', '.range-toggle', function() {
            var $row = $(this).closest('tr');
            var platformName = $row.attr('data-platform');
            var systemName = $row.attr('data-system');
            var isChecked = $(this).is(':checked');
            if (!platformName || !systemName) {
                return;
            }
            RangeRingStorage.setRangeRing(platformName, systemName, { toggled: isChecked ? 1 : 0 });
            RangeRingLogic.drawRangeRings();
        });

        $('#toggleAllCheckboxes').on('click', function() {
            var rowsOnPage = rangeRingDataTable.rows({ page: 'current' }).nodes().to$();
            var checkboxes = rowsOnPage.find('.range-toggle');

            if (!checkboxes.length) {
                return;
            }

            var allChecked = checkboxes.length === checkboxes.filter(':checked').length;
            var targetState = !allChecked;

            checkboxes.each(function() {
                var $checkbox = $(this);
                var $row = $checkbox.closest('tr');
                var platformName = $row.attr('data-platform');
                var systemName = $row.attr('data-system');

                if (!platformName || !systemName) {
                    return;
                }

                $checkbox.prop('checked', targetState);
                RangeRingStorage.setRangeRing(platformName, systemName, { toggled: targetState ? 1 : 0 });
            });

            RangeRingLogic.drawRangeRings();
        });

        $('#untoggleAllRangeRingsButton').on('click', function() {
            rangeRingDataTable.rows().nodes().to$().find('.range-toggle').prop('checked', false);
            RangeRingLogic.clearAllRangeRings();
        });

        $('#editRangeRingStyleButton').on('click', function() {
            RangeRingStyleEditor.createEditStyleDialog();
        });
    }

    function getRangeMinValue(ring) {
        var value = ring && ring.range_min_val;
        if (value === undefined && ring) {
            value = ring.min_range_val;
        }
        if (value === undefined) {
            value = 0;
        }
        var parsed = parseRangeValue(value);
        return parsed === null ? 0 : parsed;
    }

    function getRangeMaxValue(ring) {
        var value = ring && ring.range_max_val;
        if (value === undefined && ring) {
            value = ring.max_range_val;
        }
        if (value === undefined && ring) {
            value = ring.range_val;
        }
        var parsed = parseRangeValue(value);
        return parsed === null ? NaN : parsed;
    }

    function parseRangeValue(value) {
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.parseRange === 'function') {
            return RangeUtils.parseRange(value);
        }
        if (value === undefined || value === null || value === '') {
            return null;
        }
        var parsed = Number(value);
        return isFinite(parsed) ? parsed : null;
    }

    function formatRangeValue(value) {
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.formatRange === 'function') {
            return RangeUtils.formatRange(value);
        }
        var parsed = parseRangeValue(value);
        return parsed === null ? 'Unknown' : parsed.toLocaleString();
    }

    return {
        createRangeRingConfigDialog: createRangeRingConfigDialog
    };

})();
