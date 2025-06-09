/**
 * UI initialization and event bindings for results.html.
 *
 * This module sets up the jQuery UI dialog used to configure which charts are
 * displayed and wires change events so that modifications take effect
 * immediately.
 */

// Run once the DOM is ready
$(function() {
    $('#config-dialog').dialog({
        autoOpen: true,
        modal: true,
        width: 500,
        title: 'Configure Display',
        buttons: {
            "Reset": resetConfig,
            "Close": function() {
                $(this).dialog("close");
            }
        }
    });

    $('#open-config-button').click(function() {
        $('#config-dialog').dialog("open");
    });

    // Changing the selected side reloads the related dropdowns
    $('#side').on('change', function() {
        populateConfigDropdowns();
        applyConfig();
    });

    // Any other option change just reapplies the configuration
    $('#chart-type, #shooter-platforms, #weapons, #enemy-groups, #sensors, #friendly-groups, #friendly-platforms, #enemy-groups, #enemy-platforms').on('change', applyConfig);
});
