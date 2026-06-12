/**
 * UI initialization and event bindings for results/index.html.
 *
 * This module sets up the jQuery UI dialogs used to configure which charts are
 * displayed and which colors are used by those charts.
 */

function updateColorPreview(inputId, colorValue) {
    const preview = document.querySelector(`[data-preview-for="${inputId}"]`);
    const hexValue = document.querySelector(`[data-hex-for="${inputId}"]`);

    if (preview) {
        preview.style.backgroundColor = colorValue;
    }
    if (hexValue) {
        hexValue.textContent = colorValue;
    }
}

function setColorInputValue(inputId, chartType, colorKey) {
    const input = document.getElementById(inputId);
    if (!input || typeof getChartColor !== 'function') {
        return;
    }

    const colorValue = getChartColor(chartType, colorKey);
    input.value = colorValue;
    updateColorPreview(inputId, colorValue);
}

function refreshVisibleColorInputs() {
    setColorInputValue('pie-in-range-color', 'pie', 'inRange');
    setColorInputValue('pie-out-of-range-color', 'pie', 'outOfRange');
    setColorInputValue('loadout-platform-count-color', 'loadout', 'platformCount');
    setColorInputValue('loadout-wez-color', 'loadout', 'wez');
    setColorInputValue('loadout-usable-weapons-color', 'loadout', 'usableWeapons');
}

function refreshChartsAfterColorChange() {
    const chartTypeDropdown = document.getElementById('chart-type');
    if (!chartTypeDropdown || !chartTypeDropdown.value) {
        return;
    }
    applyConfig();
}

function bindColorInput(inputId, chartType, colorKey) {
    $('#' + inputId).on('input change', function() {
        const selectedColor = this.value;
        setChartColor(chartType, colorKey, selectedColor);
        updateColorPreview(inputId, selectedColor);
        refreshChartsAfterColorChange();
    });
}

function updateColorConfigDialogForCurrentChartType() {
    const selectedChartType = $('#chart-type').val();
    const isLoadoutChart = selectedChartType === 'Loadouts';

    $('#pie-color-options').toggle(!isLoadoutChart);
    $('#loadout-color-options').toggle(isLoadoutChart);

    if (isLoadoutChart) {
        $('#color-config-dialog').dialog('option', 'title', 'Configure Loadout Chart Colors');
        $('#color-config-description').text('Choose colors for the three loadout chart bars.');
    } else {
        $('#color-config-dialog').dialog('option', 'title', 'Configure Pie Chart Colors');
        $('#color-config-description').text('Choose colors for the colored and uncolored pie chart portions.');
    }

    refreshVisibleColorInputs();
}

function openColorConfigDialog() {
    updateColorConfigDialogForCurrentChartType();
    $('#color-config-dialog').dialog('open');
}

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

    $('#color-config-dialog').dialog({
        autoOpen: false,
        modal: true,
        width: 500,
        title: 'Configure Chart Colors',
        buttons: {
            "Close": function() {
                $(this).dialog("close");
            }
        },
        open: updateColorConfigDialogForCurrentChartType
    });

    $('#open-config-button').click(function() {
        $('#config-dialog').dialog("open");
    });

    $('#open-colors-button').click(openColorConfigDialog);

    bindColorInput('pie-in-range-color', 'pie', 'inRange');
    bindColorInput('pie-out-of-range-color', 'pie', 'outOfRange');
    bindColorInput('loadout-platform-count-color', 'loadout', 'platformCount');
    bindColorInput('loadout-wez-color', 'loadout', 'wez');
    bindColorInput('loadout-usable-weapons-color', 'loadout', 'usableWeapons');
    refreshVisibleColorInputs();

    // Changing the selected side reloads the related dropdowns
    $('#side').on('change', function() {
        populateConfigDropdowns();
        applyConfig();
        refreshVisibleColorInputs();
    });

    // Any other option change just reapplies the configuration
    $('#chart-type, #shooter-platforms, #weapons, #enemy-groups, #sensors, #friendly-groups, #friendly-platforms, #enemy-groups, #enemy-platforms').on('change', function() {
        applyConfig();
        if ($('#color-config-dialog').dialog('isOpen')) {
            updateColorConfigDialogForCurrentChartType();
        }
    });
});
