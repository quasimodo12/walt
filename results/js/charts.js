/**
 * Functions for managing and updating the various result charts.
 *
 * This module computes range relationships between friendly and enemy
 * platforms and then updates either pie charts or loadout bar charts based on
 * the user's selections.
 */

function getSideColor(sideId, fallbackColor) {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getColorForSide === 'function') {
        const color = SideConfig.getColorForSide(sideId);
        if (color) {
            return color;
        }
    }
    return fallbackColor;
}

function getSideLabelOrFallback(sideId, fallbackLabel) {
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getLabelForSide === 'function') {
        const label = SideConfig.getLabelForSide(sideId);
        if (label) {
            return label;
        }
    }
    if (sideId) {
        return capitalize(sideId);
    }
    return fallbackLabel || '';
}


function getFallbackRangeBand(record, minFieldNames, maxFieldNames) {
    function firstDefined(fieldNames) {
        for (var i = 0; i < fieldNames.length; i++) {
            if (record && record[fieldNames[i]] !== undefined && record[fieldNames[i]] !== null && record[fieldNames[i]] !== '') {
                return record[fieldNames[i]];
            }
        }
        return undefined;
    }

    var min = Number(firstDefined(minFieldNames));
    var max = Number(firstDefined(maxFieldNames));

    if (!isFinite(min)) {
        min = 0;
    }

    return {
        min: min,
        max: max,
        isValid: isFinite(min) && isFinite(max) && min >= 0 && max >= 0 && min <= max
    };
}

function getResultsWeaponRangeBand(weapon) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getWeaponRangeBand === 'function') {
        return RangeUtils.getWeaponRangeBand(weapon);
    }
    return getFallbackRangeBand(weapon, ['weapon_min_range', 'min_range'], ['weapon_max_range', 'max_range', 'weapon_range']);
}

function getResultsSensorRangeBand(sensor) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getSensorRangeBand === 'function') {
        return RangeUtils.getSensorRangeBand(sensor);
    }
    return getFallbackRangeBand(sensor, ['sensor_min_range', 'min_range'], ['sensor_max_range', 'max_range', 'sensor_range']);
}

function isResultsDistanceInRangeBand(distance, rangeBand) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.isDistanceInRangeBand === 'function') {
        return RangeUtils.isDistanceInRangeBand(distance, rangeBand);
    }

    var parsedDistance = Number(distance);
    return isFinite(parsedDistance) &&
        rangeBand &&
        rangeBand.isValid &&
        parsedDistance >= rangeBand.min &&
        parsedDistance <= rangeBand.max;
}

function formatResultsRange(value) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.formatRange === 'function') {
        return RangeUtils.formatRange(value);
    }
    var parsed = Number(value);
    return isFinite(parsed) ? parsed.toLocaleString() : 'Unknown';
}

function formatResultsRangeBand(rangeBand) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.formatRangeBand === 'function') {
        return RangeUtils.formatRangeBand(rangeBand);
    }
    if (!rangeBand || !rangeBand.isValid) {
        return 'Unknown';
    }
    return formatResultsRange(rangeBand.min) + ' - ' + formatResultsRange(rangeBand.max) + ' m';
}

function getDistanceBetweenPlatformsForResults(platformName, enemyPlatformName) {
    var distanceKey1 = platformName + '---' + enemyPlatformName;
    var distanceKey2 = enemyPlatformName + '---' + platformName;

    if (distanceData[distanceKey1] !== undefined) {
        return distanceData[distanceKey1];
    }
    return distanceData[distanceKey2];
}

function describeOutOfBandReason(distance, rangeBand) {
    var parsedDistance = Number(distance);
    if (!isFinite(parsedDistance) || !rangeBand || !rangeBand.isValid) {
        return 'invalid distance or range band';
    }
    if (parsedDistance < rangeBand.min) {
        return 'inside minimum range';
    }
    if (parsedDistance > rangeBand.max) {
        return 'beyond maximum range';
    }
    return 'outside range band';
}

/**
 * Sum the quantity of a particular weapon across a set of platforms.
 *
 * @param {Object[]} pData - list of platform objects
 * @param {string[]} pNames - platform names to search
 * @param {string} wName - weapon name to count
 * @returns {number}
 */
function getTotalWeaponQuantity(pData, pNames, wName) {
    console.log("results.js >>> getTotalWeaponQuantity() entered");
    let totalQuantity = 0;
    pData.forEach(platform => {
        if (pNames.includes(platform.platform_name)) {
            platform.weapons.forEach(weapon => {
                if (weapon.name === wName) {
                    totalQuantity += weapon.quantity;
                }
            });
        }
    });
    return totalQuantity;
}

/**
 * Create a new bar chart table for weapon loadouts and populate it with the
 * current selections.
 */
function regenerateLoadoutsChartTable() {
    console.log("results.js >>> regenerateLoadoutsChartTable() entered");
    document.getElementById('table-container').innerHTML = '';
    const chartOptions = {
        width: 250,
        height: 250,
        barWidth: 50,
        yAxisTicks: 5,
        yAxisMax: 100,
        showModalLegend: false,
        showBarLabels: false,
    };
    loadoutChartTable = new CustomBarChartTable(colNameList, rowNameList, 'table-container', chartOptions);
    updateLoadoutCharts();
}

/**
 * Build a new table of pie charts and populate with current data.
 */
function regeneratePieChartTable() {
    document.getElementById('table-container').innerHTML = '';
    pieChartTable = new PieChartTable(colNameList.concat(sensorList), rowNameList, 'table-container');
    updatePieCharts();
}

/** Refresh all pie charts with the current selection data. */
function updatePieCharts() {
    processItems(colNameList, 'weapon');
    processItems(sensorList, 'sensor');
    console.log('Finished updatePieCharts');
}

/** Refresh all loadout bar charts. */
function updateLoadoutCharts() {
    processItems(colNameList, 'weapon');
    console.log('Finished updateLoadoutCharts');
}

/**
 * Core routine that calculates range data for each weapon or sensor and
 * updates the appropriate chart for every enemy group.
 *
 * @param {string[]} itemList - list of weapons or sensors
 * @param {'weapon'|'sensor'} itemType
 */
function processItems(itemList, itemType) {
    itemList.forEach(function(itemName) {
        rowNameList.forEach(function(group) {
            var inRangeCount = 0;
            var totalEnemies = 0;
            var contributingPlatformsSet = new Set();
            var contributingPlatforms;
            console.log(`\nCalculating for ${itemType}: ${itemName}, enemy group: ${group}`);

            var platformToEnemiesMap = new Map();

            var enemyPlatforms = (group !== 'selected-enemy-platforms')
                ? platformData.filter(function(p) {
                    return p.group.trim().toLowerCase() === group.trim().toLowerCase() ||
                           (p.subgroups && p.subgroups.some(subgroup => subgroup.trim().toLowerCase() === group.trim().toLowerCase()));
                  })
                : platformData.filter(platform => selectedEnemyPlatforms.includes(platform.platform_name));

            totalEnemies = enemyPlatforms.length;
            console.log(`Total enemies in group or subgroup "${group}": ${totalEnemies}`);

            enemyPlatforms.forEach(function(enemyPlatform) {
                var isInRange = false;

                shooterPlatformList.forEach(function(platformName) {
                    console.log(`\nProcessing platform: ${platformName}`);

                    var platform = platformData.find(p => p.platform_name.trim().toLowerCase() === platformName.trim().toLowerCase());
                    if (!platform) {
                        console.log(`Platform "${platformName}" not found in platformData.`);
                        return;
                    }
                    console.log(`Found platform: ${platform.platform_name}`);

                    var rangeBand;
                    if (itemType === 'weapon') {
                        var weapon = platform.weapons.find(w => w.name.trim().toLowerCase() === itemName.trim().toLowerCase());
                        if (!weapon) {
                            console.log(`Weapon "${itemName}" not found on platform "${platform.platform_name}".`);
                            return;
                        }
                        console.log(`Found weapon: ${weapon.name} on platform "${platform.platform_name}"`);

                        var weaponInfo = weaponData.find(w => w.weapon_name.trim().toLowerCase() === weapon.name.trim().toLowerCase());
                        if (!weaponInfo) {
                            console.log(`Weapon info for "${weapon.name}" not found in weaponData.`);
                            return;
                        }
                        rangeBand = getResultsWeaponRangeBand(weaponInfo);
                        console.log(`Weapon info found: Range band = ${formatResultsRangeBand(rangeBand)}`);
                    } else if (itemType === 'sensor') {
                        var sensorEquipped = platform.sensors && platform.sensors.some(s => s.trim().toLowerCase() === itemName.trim().toLowerCase());
                        if (!sensorEquipped) {
                            console.log(`Sensor "${itemName}" is not equipped on platform "${platform.platform_name}".`);
                            return;
                        }
                        console.log(`Sensor "${itemName}" is equipped on platform "${platform.platform_name}".`);

                        var sensorInfo = sensorData.find(s => s.sensor_name.trim().toLowerCase() === itemName.trim().toLowerCase());
                        if (!sensorInfo) {
                            console.log(`Sensor info for "${itemName}" not found in sensorData.`);
                            return;
                        }
                        rangeBand = getResultsSensorRangeBand(sensorInfo);
                        console.log(`Sensor info found: Range band = ${formatResultsRangeBand(rangeBand)}`);
                    } else {
                        console.log(`Unknown itemType "${itemType}". Skipping platform "${platform.platform_name}".`);
                        return;
                    }

                    if (!rangeBand || !rangeBand.isValid) {
                        console.log(`Invalid range band for ${itemType} "${itemName}" (${formatResultsRangeBand(rangeBand)}). Skipping platform "${platform.platform_name}".`);
                        return;
                    }

                    var distance = getDistanceBetweenPlatformsForResults(platform.platform_name, enemyPlatform.platform_name);

                    if (distance === undefined) {
                        console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}" not found.`);
                        return;
                    }

                    console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}": ${distance} meters`);

                    if (isResultsDistanceInRangeBand(distance, rangeBand)) {
                        console.log(`Enemy "${enemyPlatform.platform_name}" is within range band (${formatResultsRange(rangeBand.min)} <= ${formatResultsRange(distance)} <= ${formatResultsRange(rangeBand.max)} meters) of "${itemName}" from "${platform.platform_name}".`);

                        contributingPlatformsSet.add(platform.platform_name);
                        contributingPlatforms = Array.from(contributingPlatformsSet);
                        console.log(`Current contributingPlatforms: ${contributingPlatforms.join(', ')}`);

                        if (!platformToEnemiesMap.has(platform.platform_name)) {
                            platformToEnemiesMap.set(platform.platform_name, []);
                        }
                        platformToEnemiesMap.get(platform.platform_name).push(enemyPlatform.platform_name);
                        console.log(`Updated platformToEnemiesMap for "${platform.platform_name}": ${platformToEnemiesMap.get(platform.platform_name).join(', ')}`);

                        if (isInRange) {
                            console.log(`Skipping ${platform.platform_name} because isInRange is already true for this enemy.`);
                            return;
                        }

                        isInRange = true;
                        inRangeCount++;

                        console.log(`Enemy "${enemyPlatform.platform_name}" is within range band of "${itemName}" from "${platform.platform_name}" at: ${formatResultsRange(distance)} meters`);
                    } else {
                        console.log(`Enemy "${enemyPlatform.platform_name}" is out of range band (${formatResultsRange(distance)} m is ${describeOutOfBandReason(distance, rangeBand)}; valid band ${formatResultsRangeBand(rangeBand)}) of "${itemName}" from "${platform.platform_name}".`);
                    }
                });
            });

            var percentageInRange = totalEnemies > 0 ? (inRangeCount / totalEnemies) * 100 : 0;
            var percentageOutOfRange = 100 - percentageInRange;

            console.log(`Percentage of enemies in range band for ${itemType} ${itemName} in group ${group}: ${percentageInRange}%`);
            console.log(`Percentage of enemies out of range band for ${itemType} ${itemName} in group ${group}: ${percentageOutOfRange}%`);

            const selectedColor = getSideColor(selectedSide, '#36A2EB');
            const enemySideLabel = getSideLabelOrFallback(enemySide, 'Enemy');
            const friendlyColor = getSideColor(selectedSide, '#4d94ff');

            const chartTypeDropdown = document.getElementById("chart-type");
            const selectedChartType = chartTypeDropdown.value;

            if (selectedChartType === 'Pie') {
                pieChartTable.updateChart(itemName, group, [percentageInRange, percentageOutOfRange], selectedColor, platformToEnemiesMap);
            }
            else if (selectedChartType === 'Loadouts') {
                var numPlats = totalEnemies;
                var wez = inRangeCount;
                var quantity = 0;

                console.log("====================================================");
                console.log("");

                if (isArrayValid(contributingPlatforms)) {
                    contributingPlatforms.forEach(element => {
                        console.log(element);
                    });
                    quantity = getTotalWeaponQuantity(platformData, contributingPlatforms, itemName);
                }

                console.log("");
                console.log("====================================================");

                var numPlatsBarPriority = 0;
                var wezBarPriority = 0;
                var quantityBarPriority = 0;
                var wezBarColor = '';

                var max = Math.max(numPlats, wez, quantity);
                var min = Math.min(numPlats, wez, quantity);

                if (numPlats === max) {
                    numPlatsBarPriority = 1;
                } else if (numPlats === min) {
                    numPlatsBarPriority = 3;
                } else {
                    numPlatsBarPriority = 2;
                }

                if (wez === max) {
                    wezBarPriority = 1;
                } else if (wez === min) {
                    wezBarPriority = 3;
                } else {
                    wezBarPriority = 2;
                }

                if (quantity === max) {
                    quantityBarPriority = 1;
                } else if (quantity === min) {
                    quantityBarPriority = 3;
                } else {
                    quantityBarPriority = 2;
                }

                wezBarColor = friendlyColor;

                const newBars = [
                    {
                        barLabel: `${enemySideLabel} Platforms in Group`,
                        barValue: numPlats,
                        barColor: '#a6a6a6',
                        barPriority: numPlatsBarPriority
                    },
                    {
                        barLabel: `${enemySideLabel} Platforms in WEZ / range band`,
                        barValue: wez,
                        barColor: wezBarColor,
                        barPriority: wezBarPriority
                    },
                    {
                        barLabel: 'Useable Ammo',
                        barValue: quantity,
                        barColor: '#ffff99',
                        barPriority: quantityBarPriority
                    }
                ];
                var yAxisMaxVal = getNearestMultipleOfTarget(max, 50);
                const modalChartTitle = `${itemName} vs. ${group}`;
                const newOptions = {
                    yAxisMax: yAxisMaxVal,
                    modalTitle: modalChartTitle,
                };
                loadoutChartTable.updateChart(itemName, group, newBars, newOptions);
            }
            else {
                console.log("results.js >>> processItems() >>> invalid chart-type");
            }

            console.log(`\nMap of shooter platforms to enemies within range band for ${itemType} "${itemName}" and group "${group}":`);
            platformToEnemiesMap.forEach(function(enemyList, shooterPlatform) {
                console.log(`Shooter Platform: ${shooterPlatform} -> In-range-band Enemies: ${enemyList.join(', ')}`);
            });

        });
    });
}
