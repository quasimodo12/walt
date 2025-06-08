/* UI initialization and event bindings for results.html */

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

    $('#side').on('change', function() {
        populateConfigDropdowns();
        applyConfig();
    });
    $('#chart-type, #shooter-platforms, #weapons, #enemy-groups, #sensors, #friendly-groups, #friendly-platforms, #enemy-groups, #enemy-platforms').on('change', applyConfig);
});
