/**
 * Functions responsible for populating and applying the configuration dialog
 * in the results page.
 *
 * These helpers read the global data arrays defined in `globals.js` and
 * populate the UI dropdowns.  User selections are then translated into the
 * various lists consumed by the chart module.
 */

/**
 * Populate all dropdowns in the configuration dialog based on the currently
 * loaded platform, weapon and sensor data.
 */
function getConfiguredSides() {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getSides === 'function') {
        const configuredSides = SideConfig.getSides();
        if (Array.isArray(configuredSides) && configuredSides.length > 0) {
            return configuredSides;
        }
    }
    return [];
}

function getDefaultSideId() {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getDefaultSide === 'function') {
        const defaultSide = SideConfig.getDefaultSide();
        if (defaultSide) {
            return defaultSide;
        }
    }
    return null;
}

function getSideLabel(sideId) {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getLabelForSide === 'function') {
        const label = SideConfig.getLabelForSide(sideId);
        if (label) {
            return label;
        }
    }
    return sideId || '';
}

function determineEnemySide(selectedSide, platformSides) {
    if (!selectedSide) {
        return null;
    }

    let opponent = null;
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getDefaultOpponent === 'function') {
        opponent = SideConfig.getDefaultOpponent(selectedSide);
        if (opponent === selectedSide) {
            opponent = null;
        }
    }

    const sideSet = platformSides instanceof Set ? platformSides : new Set();
    if (sideSet.size > 0 && opponent && !sideSet.has(opponent)) {
        opponent = null;
    }

    if (!opponent) {
        for (const candidate of sideSet) {
            if (candidate && candidate !== selectedSide) {
                opponent = candidate;
                break;
            }
        }
    }

    return opponent;
}

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

    const platformSides = new Set(getUniqueValues(platformData, 'side').filter(Boolean));
    const configuredSides = getConfiguredSides();
    let availableSides = configuredSides.filter(side => platformSides.has(side.id));

    if (availableSides.length === 0) {
        availableSides = configuredSides.length > 0
            ? configuredSides
            : Array.from(platformSides).map(id => ({ id, label: getSideLabel(id) }));
    }

    populateDropdown(elements.side, availableSides.map(side => ({ value: side.id, label: side.label })));

    const defaultSideId = getDefaultSideId();
    const optionValues = Array.from(elements.side.options).map(opt => opt.value);
    if (!elements.side.value) {
        if (defaultSideId && optionValues.includes(defaultSideId)) {
            elements.side.value = defaultSideId;
        } else if (optionValues.length > 0) {
            elements.side.value = optionValues[0];
        }
    }

    selectedSide = elements.side.value || defaultSideId;
    friendlySide = selectedSide;

    const friendlyPlatforms = platformData
        .filter(p => !selectedSide || p.side === selectedSide)
        .map(p => p.platform_name);
    populateDropdown(elements.friendlyPlatforms, friendlyPlatforms);

    const friendlyGroups = selectedSide ? getGroups(platformData, selectedSide) : [];
    populateDropdown(elements.friendlyGroups, friendlyGroups);

    const enemySideId = determineEnemySide(selectedSide, platformSides);
    enemySide = enemySideId;

    const enemyCandidates = platformData.filter(p => {
        if (!selectedSide) {
            return true;
        }
        if (enemySideId) {
            return p.side === enemySideId;
        }
        return p.side !== selectedSide;
    });

    const enemyPlatforms = enemyCandidates.map(p => p.platform_name);
    populateDropdown(elements.enemyPlatforms, enemyPlatforms);

    const enemyGroupsSet = new Set();
    enemyCandidates.forEach(candidate => {
        if (candidate.group) {
            enemyGroupsSet.add(candidate.group);
        }
        if (Array.isArray(candidate.subgroups)) {
            candidate.subgroups.forEach(subgroup => enemyGroupsSet.add(subgroup));
        }
    });
    populateDropdown(elements.enemyGroups, Array.from(enemyGroupsSet));
}

/**
 * Read the user's selections from the configuration form and regenerate the
 * appropriate charts.
 */
function applyConfig() {
    const getSelectedValues = (selectId) => {
        const selectElement = document.getElementById(selectId);
        return Array.from(selectElement.selectedOptions).map(option => option.value);
    };

    const selectedSideDropdown = document.getElementById('side');
    const selectedSide = (selectedSideDropdown && selectedSideDropdown.value) || getDefaultSideId();
    if (selectedSideDropdown && selectedSide) {
        selectedSideDropdown.value = selectedSide;
    }

    const platformSides = new Set(getUniqueValues(platformData, 'side').filter(Boolean));
    friendlySide = selectedSide;
    enemySide = determineEnemySide(selectedSide, platformSides);

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

/**
 * Clear the form selections and reset all state variables.
 */
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
