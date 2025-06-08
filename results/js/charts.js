/* Functions for managing and updating result charts */

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

function regeneratePieChartTable() {
    document.getElementById('table-container').innerHTML = '';
    pieChartTable = new PieChartTable(colNameList.concat(sensorList), rowNameList, 'table-container');
    updatePieCharts();
}

function updatePieCharts() {
    processItems(colNameList, 'weapon');
    processItems(sensorList, 'sensor');
    console.log('Finished updatePieCharts');
}

function updateLoadoutCharts() {
    processItems(colNameList, 'weapon');
    console.log('Finished updateLoadoutCharts');
}

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

                    var range;
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
                        console.log(`Weapon info found: Range = ${weaponInfo.weapon_range} meters`);

                        range = weaponInfo.weapon_range;
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
                        console.log(`Sensor info found: Range = ${sensorInfo.sensor_range} meters`);

                        range = sensorInfo.sensor_range;
                    } else {
                        console.log(`Unknown itemType "${itemType}". Skipping platform "${platform.platform_name}".`);
                        return;
                    }

                    var distanceKey1 = platform.platform_name + '---' + enemyPlatform.platform_name;
                    var distanceKey2 = enemyPlatform.platform_name + '---' + platform.platform_name;
                    var distance = distanceData[distanceKey1] || distanceData[distanceKey2];

                    if (distance === undefined) {
                        console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}" not found.`);
                        return;
                    }

                    console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}": ${distance} meters`);

                    if (distance <= range) {
                        console.log(`Enemy "${enemyPlatform.platform_name}" is within range (${distance} <= ${range}) of "${itemName}" from "${platform.platform_name}".`);

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

                        console.log(`Enemy "${enemyPlatform.platform_name}" is within range of "${itemName}" from "${platform.platform_name}" at: ${distance} meters`);
                    } else {
                        console.log(`Enemy "${enemyPlatform.platform_name}" is out of range (${distance} > ${range}) of "${itemName}" from "${platform.platform_name}".`);
                    }
                });
            });

            var percentageInRange = totalEnemies > 0 ? (inRangeCount / totalEnemies) * 100 : 0;
            var percentageOutOfRange = 100 - percentageInRange;

            console.log(`Percentage of enemies in range for ${itemType} ${itemName} in group ${group}: ${percentageInRange}%`);
            console.log(`Percentage of enemies out of range for ${itemType} ${itemName} in group ${group}: ${percentageOutOfRange}%`);

            const selectedColor = selectedSide === 'blue' ? '#36A2EB' : selectedSide === 'red' ? '#ff944d' : null;

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

                if (selectedSide === 'blue') {
                    wezBarColor = '#4d94ff';
                }
                else {
                    wezBarColor = '#ff944d';
                }

                const newBars = [
                    {
                        barLabel: `${capitalize(enemySide)} Platforms in Group`,
                        barValue: numPlats,
                        barColor: '#a6a6a6',
                        barPriority: numPlatsBarPriority
                    },
                    {
                        barLabel: `${capitalize(enemySide)} Platforms in WEZ`,
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

            console.log(`\nMap of shooter platforms to in-range enemies for ${itemType} "${itemName}" and group "${group}":`);
            platformToEnemiesMap.forEach(function(enemyList, shooterPlatform) {
                console.log(`Shooter Platform: ${shooterPlatform} -> In-range Enemies: ${enemyList.join(', ')}`);
            });

        });
    });
}
