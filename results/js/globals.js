/**
 * Global variables shared across the results view.
 *
 * This file simply declares variables that act as a central state store for
 * the results window.  They are populated by the message handlers in
 * `messages.js` and consumed by the configuration and chart modules.
 */

/** Currently selected friendly or enemy side (`"blue"` or `"red"`). */
let selectedSide = null;
/** Convenience references used when building legends/charts. */
let friendlySide = null;
let enemySide = null;
/** Platforms that can engage targets. */
var shooterPlatformList = [];
/** Column names used when rendering charts (weapons/sensors). */
var colNameList = [];
/** Row names used when rendering charts (enemy groups). */
var rowNameList = [];
/** Selected sensors to display in pie charts. */
var sensorList = [];
/** Specific enemy platforms selected by the user. */
var selectedEnemyPlatforms = [];

// Data passed from the main window.  Each message handler in `messages.js`
// updates these arrays/objects.
let platformData = [];
let weaponData = [];
let sensorData = [];
let distanceData = {};

// Chart table instances created by `charts.js`.
let pieChartTable;
let loadoutChartTable;

// Chart color settings for the results page. These values are used by both
// the chart-rendering code and the legends. A null value means "use the
// current side color" so the previous side-aware defaults still work until the
// user explicitly selects a color.
var RESULTS_CHART_COLOR_STORAGE_KEY = 'walt.resultsChartColors';
var DEFAULT_RESULTS_CHART_COLORS = {
    pie: {
        inRange: null,
        outOfRange: '#d9d9d9'
    },
    loadout: {
        platformCount: '#a6a6a6',
        wez: null,
        usableWeapons: '#ffff99'
    }
};

function isValidHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function getSideDefaultChartColor(fallbackColor) {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getColorForSide === 'function') {
        var sideColor = SideConfig.getColorForSide(selectedSide || friendlySide);
        if (isValidHexColor(sideColor)) {
            return sideColor;
        }
    }
    return fallbackColor;
}

function getDefaultResultChartColor(chartType, colorKey) {
    if ((chartType === 'pie' && colorKey === 'inRange') ||
        (chartType === 'loadout' && colorKey === 'wez')) {
        return getSideDefaultChartColor('#36A2EB');
    }

    var chartDefaults = DEFAULT_RESULTS_CHART_COLORS[chartType] || {};
    var defaultValue = chartDefaults[colorKey];
    return isValidHexColor(defaultValue) ? defaultValue : '#808080';
}

function loadResultChartColorSettings() {
    var colors = {
        pie: Object.assign({}, DEFAULT_RESULTS_CHART_COLORS.pie),
        loadout: Object.assign({}, DEFAULT_RESULTS_CHART_COLORS.loadout)
    };

    if (!window.localStorage) {
        return colors;
    }

    try {
        var rawValue = window.localStorage.getItem(RESULTS_CHART_COLOR_STORAGE_KEY);
        if (!rawValue) {
            return colors;
        }

        var stored = JSON.parse(rawValue);
        ['pie', 'loadout'].forEach(function(chartType) {
            Object.keys(colors[chartType]).forEach(function(colorKey) {
                if (stored && stored[chartType] && isValidHexColor(stored[chartType][colorKey])) {
                    colors[chartType][colorKey] = stored[chartType][colorKey];
                }
            });
        });
    } catch (error) {
        console.warn('globals.js: failed to load results chart color settings', error);
    }

    return colors;
}

function saveResultChartColorSettings() {
    if (!window.localStorage) {
        return;
    }

    try {
        window.localStorage.setItem(RESULTS_CHART_COLOR_STORAGE_KEY, JSON.stringify(resultChartColors));
    } catch (error) {
        console.warn('globals.js: failed to save results chart color settings', error);
    }
}

var resultChartColors = loadResultChartColorSettings();

function getChartColor(chartType, colorKey) {
    var chartColors = resultChartColors[chartType] || {};
    var selectedColor = chartColors[colorKey];
    return isValidHexColor(selectedColor)
        ? selectedColor
        : getDefaultResultChartColor(chartType, colorKey);
}

function setChartColor(chartType, colorKey, value) {
    if (!isValidHexColor(value)) {
        console.warn('Ignoring invalid chart color value:', value);
        return;
    }

    if (!resultChartColors[chartType]) {
        resultChartColors[chartType] = {};
    }

    resultChartColors[chartType][colorKey] = value;
    saveResultChartColorSettings();
}
