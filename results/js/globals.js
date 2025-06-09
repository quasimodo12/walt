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
