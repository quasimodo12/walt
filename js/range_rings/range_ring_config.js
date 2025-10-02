// range_ring_config.js
var RangeRingConfig = (function() {

    // Function to create the range ring configuration dialog
    function createRangeRingConfigDialog() {
        // Grab all the range rings 
        var rangeRings = RangeRingStorage.getAllRangeRings();

        // HTML content for the dialog
        var content = `
            <div>
                <button id="toggleAllCheckboxes">Toggle All</button>
                <table id="rangeRingTable" class="display">
                    <thead>
                        <tr>
                            <th>Toggle</th>
                            <th>Platform Name</th>
                            <th>System Name</th>
                            <th>System Type</th>
                            <th>Range (m)</th>
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
                                <td>${ring.range_val}</td>
                                <td>${ring.latitude}</td>
                                <td>${ring.longitude}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Display the range ring configuration content
        $('#rangeRingInfoContent').html(content);
        $('#rangeRingInfoDialog').dialog('open');

        // Initialize DataTable with searchable, sortable, and filterable features
        var rangeRingDataTable = $('#rangeRingTable').DataTable({
            columnDefs: [
                { orderable: false, targets: 0 }, // Disable sorting for checkbox column
            ],
            pageLength: 10  // Set the default number of entries per page
        });

        // Event listener for toggling checkboxes
        $('#rangeRingTable').on('change', '.range-toggle', function() {
            var $row = $(this).closest('tr');
            var platformName = $row.attr('data-platform');
            var systemName = $row.attr('data-system');
            var isChecked = $(this).is(':checked');
            if (!platformName || !systemName) {
                return;
            }
            // toggle the range ring enabled on or off
            RangeRingStorage.setRangeRing(platformName, systemName, { toggled: isChecked ? 1 : 0 });
            RangeRingLogic.drawRangeRings();
        });

        // Event listener for toggling all checkboxes
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
    }

    return {
        createRangeRingConfigDialog: createRangeRingConfigDialog
    };

})();
