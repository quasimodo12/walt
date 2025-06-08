/* Configuration and dropdown handling */

function populateConfigDropdowns() {
    const elements = {
        side: document.getElementById('side'),
        friendlyPlatforms: document.getElementById('friendly-platforms'),
        friendlyGroups: document.getElementById('friendly-groups'),
        enemyPlatforms: document.getElementById('enemy-platforms'),
        enemyGroups: document.getElementById('enemy-groups'),
        weapons: document.getElementById('weapons'),
        sensors: document.getElementById('sensors'),
    };

    const weaponOptions = weaponData.map(w => w.weapon_name);
    populateDropdown(elements.weapons, weaponOptions);

    const sensorOptions = sensorData.map(s => s.sensor_name);
    populateDropdown(elements.sensors, sensorOptions);

    const sideOptions = getUniqueValues(platformData, 'side');
    populateDropdown(elements.side, sideOptions);

    selectedSide = elements.side.value;

    const friendlyPlatforms = platformData
        .filter(p => p.side === selectedSide)
        .map(p => p.platform_name);
    populateDropdown(elements.friendlyPlatforms, friendlyPlatforms);

    const friendlyGroups = getGroups(platformData, selectedSide);
    populateDropdown(elements.friendlyGroups, friendlyGroups);

    const enemyPlatforms = platformData
        .filter(p => p.side !== selectedSide)
        .map(p => p.platform_name);
    populateDropdown(elements.enemyPlatforms, enemyPlatforms);

    enemySide = selectedSide === 'blue' ? 'red' : 'blue';

    const enemyGroups = getGroups(
        platformData.filter(p => p.side === enemySide),
        enemySide
    );
    populateDropdown(elements.enemyGroups, enemyGroups);
}

function applyConfig() {
    const getSelectedValues = (selectId) => {
        const selectElement = document.getElementById(selectId);
        return Array.from(selectElement.selectedOptions).map(option => option.value);
    };

    const selectedSide = document.getElementById('side').value;

    const selectedFriendlyGroups = getSelectedValues('friendly-groups');
    const selectedFriendlyPlatforms = getSelectedValues('friendly-platforms');

    shooterPlatformList = platformData
        .filter(platform =>
            selectedFriendlyGroups.includes(platform.group) ||
            (platform.subgroups && platform.subgroups.some(subgroup => selectedFriendlyGroups.includes(subgroup)))
        )
        .map(platform => platform.platform_name);

    if (selectedFriendlyPlatforms.length > 0) {
        shooterPlatformList = combineStringLists(shooterPlatformList, selectedFriendlyPlatforms);
    }

    const selectedEnemyGroups = getSelectedValues('enemy-groups');
    selectedEnemyPlatforms = getSelectedValues('enemy-platforms');

    rowNameList = selectedEnemyPlatforms.length > 0
        ? ['selected-enemy-platforms', ...selectedEnemyGroups]
        : [...selectedEnemyGroups];

    colNameList = getSelectedValues('weapons');
    sensorList = getSelectedValues('sensors');

    const chartTypeDropdown = document.getElementById('chart-type');
    const selectedChartType = chartTypeDropdown.value;

    if (selectedChartType === 'Pie') {
        console.log("results.js >>> applyConfig() >>> chart-type === Pie");
        createLegend('legend-container', 'Pie', selectedSide);
        regeneratePieChartTable();
    }
    else if (selectedChartType === 'Loadouts') {
        console.log("results.js >>> applyConfig() >>> chart-type === Loadouts");
        createLegend('legend-container', 'Loadout', selectedSide);
        regenerateLoadoutsChartTable();
    }
    else {
        console.log("results.js >>> invalid chartType selected");
    }
}

function resetConfig() {
    document.getElementById('chart-type').selectedIndex = -1;
    document.getElementById('side').selectedIndex = -1;
    document.getElementById('friendly-platforms').selectedIndex = -1;
    document.getElementById('friendly-groups').selectedIndex = -1;
    document.getElementById('enemy-platforms').selectedIndex = -1;
    document.getElementById('enemy-groups').selectedIndex = -1;
    document.getElementById('weapons').selectedIndex = -1;
    document.getElementById('sensors').selectedIndex = -1;

    shooterPlatformList = [];
    selectedEnemyPlatforms = [];
    colNameList = [];
    rowNameList = [];
    sensorList = [];
    selectedSide = null;

    document.getElementById('table-container').innerHTML = '';
}
