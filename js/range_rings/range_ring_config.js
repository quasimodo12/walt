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
                            <tr data-index="${index}">
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
        $('#rangeRingTable').DataTable({
            columnDefs: [
                { orderable: false, targets: 0 }, // Disable sorting for checkbox column
            ],
            pageLength: 10  // Set the default number of entries per page
        });

        // Event listener for toggling checkboxes
        $('#rangeRingTable').on('change', '.range-toggle', function() {
            var rowIndex = $(this).closest('tr').data('index');
            var isChecked = $(this).is(':checked');
            // toggle the range ring enabled on or off
            RangeRingStorage.setRangeRing(rangeRings[rowIndex].platform_name, rangeRings[rowIndex].system_name, { toggled: isChecked ? 1 : 0 });
            RangeRingLogic.drawRangeRings();
        });

        // Event listener for toggling all checkboxes
        $('#toggleAllCheckboxes').on('click', function() {
            var checkboxes = $('#rangeRingTable .range-toggle');
            var allChecked = checkboxes.length === checkboxes.filter(':checked').length;
            checkboxes.prop('checked', !allChecked).trigger('change');
            RangeRingLogic.drawRangeRings();
        });
    }

    return {
        createRangeRingConfigDialog: createRangeRingConfigDialog
    };

})();
