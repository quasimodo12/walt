// Initialize empty lists for shooter platforms, weapons, enemy groups, and sensors
let selectedSide = null; // Holds the selected side value
let friendlySide = null;
let enemySide = null;
var shooterPlatformList = [];
var colNameList = [];
var rowNameList = [];
var sensorList = [];
var selectedEnemyPlatforms = [];

// Global variables received from another application
let platformData = [];
let weaponData = [];
let sensorData = [];
let distanceData = {};
let pieChartTable;
let loadoutChartTable;

// Define handler functions for each message type
const messageHandlers = {
    platformData: (data) => {
        platformData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated platformData:', platformData);
    },
    weaponData: (data) => {
        weaponData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated weaponData:', weaponData);
    },
    sensorData: (data) => {
        sensorData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated sensorData:', sensorData);
    },
    distanceData: (data) => {
        distanceData = data;
        console.log('results.html: Received distanceData:', distanceData);
    }
};

// Add a message event listener
window.addEventListener('message', function(event) {
    const { type, data } = event.data;
    console.log('Received message:', event.data); // Debugging statement

    const handler = messageHandlers[type];

    if (handler) {
        handler(data);
    } else {
        console.error('results.html: Received message of unknown type.');
    }

    // Apply the current configuration to refresh the table with new data
    applyConfig();
}, false);

// Helper function to check if two arrays are equal
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Helper function to populate a dropdown if data has changed
function populateDropdown(selectElement, newOptions) {
    const currentOptions = Array.from(selectElement.options).map(opt => opt.value);
    if (!arraysEqual(currentOptions, newOptions)) {
        selectElement.innerHTML = ''; // Clear existing options
        newOptions.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = value;
            selectElement.add(option);
        });
    }
}

// Helper function to extract unique values from a dataset based on a key
function getUniqueValues(data, key) {
    return Array.from(new Set(data.map(item => item[key])));
}

// Get all the divisors for a number
function getNearestMultipleOfTarget(numValue, target) {
    if (typeof numValue !== 'number' || isNaN(numValue)) {
        throw new TypeError('Input must be a valid number');
    }
    return Math.ceil(numValue / target) * target;
}

// Capitalize the first letter in a string
function capitalize(str) {
    if (!str) return ''; // Handle empty strings
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to extract groups and subgroups
function getGroups(data, side) {
    const groupsSet = new Set();
    data
        .filter(item => item.side === side)
        .forEach(item => {
            groupsSet.add(item.group);
            if (item.subgroups) {
                item.subgroups.forEach(subgroup => groupsSet.add(subgroup));
            }
        });
    return Array.from(groupsSet);
}

// Main function to populate all dropdowns
function populateConfigDropdowns() {
    // Retrieve all necessary select elements
    const elements = {
        side: document.getElementById('side'),
        friendlyPlatforms: document.getElementById('friendly-platforms'),
        friendlyGroups: document.getElementById('friendly-groups'),
        enemyPlatforms: document.getElementById('enemy-platforms'),
        enemyGroups: document.getElementById('enemy-groups'),
        weapons: document.getElementById('weapons'),
        sensors: document.getElementById('sensors'),
    };

    // Populate weapons
    const weaponOptions = weaponData.map(w => w.weapon_name);
    populateDropdown(elements.weapons, weaponOptions);

    // Populate sensors
    const sensorOptions = sensorData.map(s => s.sensor_name);
    populateDropdown(elements.sensors, sensorOptions);

    // Populate "Side" dropdown
    const sideOptions = getUniqueValues(platformData, 'side');
    populateDropdown(elements.side, sideOptions);

    // Get the currently selected side
    selectedSide = elements.side.value;

    // Populate friendly platforms based on selected side
    const friendlyPlatforms = platformData
        .filter(p => p.side === selectedSide)
        .map(p => p.platform_name);
    populateDropdown(elements.friendlyPlatforms, friendlyPlatforms);

    // Populate friendly groups and subgroups based on selected side
    const friendlyGroups = getGroups(platformData, selectedSide);
    populateDropdown(elements.friendlyGroups, friendlyGroups);

    // Populate enemy platforms (not the selected side)
    const enemyPlatforms = platformData
        .filter(p => p.side !== selectedSide)
        .map(p => p.platform_name);
    populateDropdown(elements.enemyPlatforms, enemyPlatforms);

    // Determine the enemy side based on the selected side
    enemySide = selectedSide === 'blue' ? 'red' : 'blue';
    
    // Populate enemy groups and subgroups (the enemy side)
    const enemyGroups = getGroups(
        platformData.filter(p => p.side === enemySide),
        enemySide
    );
    populateDropdown(elements.enemyGroups, enemyGroups);

}

// Returns a combined list of all unique strings in the arrays 
function combineStringLists(list1, list2) {
    // Combine the two lists
    const combinedList = [...list1, ...list2];

    // Create a Set to remove duplicates and ensure unique values
    const uniqueSet = new Set(combinedList);

    // Convert the Set back to an array and return
    return Array.from(uniqueSet);
}

// Returns true if the array is valid and not empty
function isArrayValid(arr) {
    return Array.isArray(arr) && arr.length > 0;
}

// Returns the total quantity of the weapon contained on the platforms
function getTotalWeaponQuantity(pData, pNames, wName) {
    console.log("results.js >>> getTotalWeaponQuantity() entered");
    console.log("===================================================");
    console.log("");
    console.log("weaponName: ", wName);
    console.log('platformData: ', pData);
    console.log('platformNames: ', pNames);
    console.log("");
    console.log("===================================================");

    let totalQuantity = 0;
    // Loop through each platform in platformData
    pData.forEach(platform => {
        // Check if the platform's name is in the platformNames list
        if (pNames.includes(platform.platform_name)) {
            // Loop through the weapons of the platform
            platform.weapons.forEach(weapon => {
                // Check if the weapon's name matches the weaponName
                if (weapon.name === wName) {
                    // Add its quantity to totalQuantity
                    totalQuantity += weapon.quantity;
                }
            });
        }
    });
    return totalQuantity;
}

// Apply the settings from the configuration menu
function applyConfig() {
    // Helper function to get selected values from a select element
    const getSelectedValues = (selectId) => {
        const selectElement = document.getElementById(selectId);
        return Array.from(selectElement.selectedOptions).map(option => option.value);
    };

    // Capture selected side
    const selectedSide = document.getElementById('side').value;

    // Get selected friendly groups and platforms
    const selectedFriendlyGroups = getSelectedValues('friendly-groups');
    const selectedFriendlyPlatforms = getSelectedValues('friendly-platforms');

    // Populate shooterPlatformList based on selected friendly groups
    shooterPlatformList = platformData
        .filter(platform =>
            selectedFriendlyGroups.includes(platform.group) ||
            (platform.subgroups && platform.subgroups.some(subgroup => selectedFriendlyGroups.includes(subgroup)))
        )
        .map(platform => platform.platform_name);

    // Combine with selected friendly platforms if any
    if (selectedFriendlyPlatforms.length > 0) {
        shooterPlatformList = combineStringLists(shooterPlatformList, selectedFriendlyPlatforms);
    }

    console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
    console.log("applyConfig() >>> ");
    console.log("shooterPlatformList: ", shooterPlatformList);
    console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");

    // Get selected enemy groups and platforms
    const selectedEnemyGroups = getSelectedValues('enemy-groups');
    selectedEnemyPlatforms = getSelectedValues('enemy-platforms');

    // Populate rowNameList based on selected enemy platforms and groups
    rowNameList = selectedEnemyPlatforms.length > 0
        ? ["selected-enemy-platforms", ...selectedEnemyGroups]
        : [...selectedEnemyGroups];

    // Get weapons and sensors from the dropdown menus
    colNameList = getSelectedValues('weapons');
    sensorList = getSelectedValues('sensors');


    // Get the dropdown menu element
    const chartTypeDropdown = document.getElementById("chart-type");

    // Extract the selected value
    const selectedChartType = chartTypeDropdown.value;

    // Regenerate the pieChartTable if 'pie' is selected
    if (selectedChartType === 'Pie') {
        console.log("results.js >>> applyConfig() >>> chart-type === Pie");
        createLegend('legend-container', 'Pie', selectedSide); // Create the pie chart legend
        regeneratePieChartTable(); // Regenerate the pie chart table
    }
    // Regenerate the loadoutChartTable if 'loadouts' is selected
    else if (selectedChartType === 'Loadouts') {
        console.log("results.js >>> applyConfig() >>> chart-type === Loadouts");
        createLegend('legend-container', 'Loadout', selectedSide) // Create the loadout chart legend
        regenerateLoadoutsChartTable(); // Regenerate the loadout chart table
    }
    else {
        console.log("results.js >>> invalid chartType selected");
    }
}

// Function to reset configuration to blank
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
    
    document.getElementById('table-container').innerHTML = ''; // Clear table
}

// Function to clear and regenerate the loadouts chart table
function regenerateLoadoutsChartTable() {
    console.log("results.js >>> regenerateLoadoutsChartTable() entered");
    document.getElementById('table-container').innerHTML = ''; // Clear existing table content

    // Define default chart options
    const chartOptions = {
        width: 250,
        height: 250,
        barWidth: 50,
        yAxisTicks: 5,
        yAxisMax: 100,
        showModalLegend: false,
        showBarLabels: false,
    };
    loadoutChartTable = new CustomBarChartTable(colNameList, rowNameList, 'table-container', chartOptions); // Do not include sensors
    updateLoadoutCharts(); // Populate the table with the new configuration
}

// Function to clear and regenerate the pie chart table
function regeneratePieChartTable() {
    document.getElementById('table-container').innerHTML = ''; // Clear existing table content
    pieChartTable = new PieChartTable(colNameList.concat(sensorList), rowNameList, 'table-container'); // Include sensors
    updatePieCharts(); // Populate the table with new configuration
}

// Function to update pie charts based on platform, weapon, sensor, and distance data
function updatePieCharts() {
    // Process Weapons
    processItems(colNameList, 'weapon');

    // Process Sensors
    processItems(sensorList, 'sensor');

    console.log('Finished updatePieCharts'); // Debugging statement for function end
}

// Function to update loadout charts based on platform, weapon, and distance data
function updateLoadoutCharts() {
    // Process weapons
    processItems(colNameList, 'weapon');
    console.log('Finished updateLoadoutCharts');
}

// Helper function to process items (weapons or sensors)
function processItems(itemList, itemType) {
    itemList.forEach(function(itemName) {
        rowNameList.forEach(function(group) {
            var inRangeCount = 0; // count of enemy ships in range of friendly weapons 
            var totalEnemies = 0; // total number of enemy ships in the currently evaluated group
            var contributingPlatformsSet = new Set(); // the list of friendly platforms that can range enemy ships
            var contributingPlatforms;
            console.log(`\nCalculating for ${itemType}: ${itemName}, enemy group: ${group}`);

            // Initialize the Map to store shooter platforms and their in-range enemies
            var platformToEnemiesMap = new Map();

            // Filter enemy platforms based on group or selectedEnemyPlatforms
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
                
                    // Find the platform data
                    var platform = platformData.find(p => p.platform_name.trim().toLowerCase() === platformName.trim().toLowerCase());
                    if (!platform) {
                        console.log(`Platform "${platformName}" not found in platformData.`);
                        return;
                    }
                    console.log(`Found platform: ${platform.platform_name}`);
                
                    var range; // Declare range variable to use later
                
                    if (itemType === 'weapon') {
                        // Find the weapon on the platform
                        var weapon = platform.weapons.find(w => w.name.trim().toLowerCase() === itemName.trim().toLowerCase());
                        if (!weapon) {
                            console.log(`Weapon "${itemName}" not found on platform "${platform.platform_name}".`);
                            return;
                        }
                        console.log(`Found weapon: ${weapon.name} on platform "${platform.platform_name}"`);
                
                        // Get weapon information
                        var weaponInfo = weaponData.find(w => w.weapon_name.trim().toLowerCase() === weapon.name.trim().toLowerCase());
                        if (!weaponInfo) {
                            console.log(`Weapon info for "${weapon.name}" not found in weaponData.`);
                            return;
                        }
                        console.log(`Weapon info found: Range = ${weaponInfo.weapon_range} meters`);
                
                        range = weaponInfo.weapon_range;
                    } else if (itemType === 'sensor') {
                        // Check if the sensor is equipped on the platform
                        var sensorEquipped = platform.sensors && platform.sensors.some(s => s.trim().toLowerCase() === itemName.trim().toLowerCase());
                        if (!sensorEquipped) {
                            console.log(`Sensor "${itemName}" is not equipped on platform "${platform.platform_name}".`);
                            return;
                        }
                        console.log(`Sensor "${itemName}" is equipped on platform "${platform.platform_name}".`);
                
                        // Get sensor information
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
                
                    // Calculate distance between shooter and enemy platforms
                    var distanceKey1 = platform.platform_name + '---' + enemyPlatform.platform_name;
                    var distanceKey2 = enemyPlatform.platform_name + '---' + platform.platform_name;
                    var distance = distanceData[distanceKey1] || distanceData[distanceKey2];
                
                    if (distance === undefined) {
                        console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}" not found.`);
                        return;
                    }
                
                    console.log(`Distance between "${platform.platform_name}" and "${enemyPlatform.platform_name}": ${distance} meters`);

                    // Check if the enemy is within range
                    if (distance <= range) {
                        console.log(`Enemy "${enemyPlatform.platform_name}" is within range (${distance} <= ${range}) of "${itemName}" from "${platform.platform_name}".`);
                
                        // Add the contributing shooter platform to the Set
                        contributingPlatformsSet.add(platform.platform_name);
                        console.log(`Added "${platform.platform_name}" to contributingPlatformsSet.`);
                
                        // Convert Set to Array (optional: if you need to use the array elsewhere)
                        contributingPlatforms = Array.from(contributingPlatformsSet);
                        console.log(`Current contributingPlatforms: ${contributingPlatforms.join(', ')}`);

                        // ------------------ UPDATED CODE STARTS HERE ------------------

                        // Update platformToEnemiesMap
                        if (!platformToEnemiesMap.has(platform.platform_name)) {
                            platformToEnemiesMap.set(platform.platform_name, []);
                        }
                        platformToEnemiesMap.get(platform.platform_name).push(enemyPlatform.platform_name);
                        console.log(`Updated platformToEnemiesMap for "${platform.platform_name}": ${platformToEnemiesMap.get(platform.platform_name).join(', ')}`);

                        // ------------------ UPDATED CODE ENDS HERE ------------------

                        // Check if already in range to skip further processing
                        // This check prevents counting the same enemy multiple times per shooter platform
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

            // Determine color based on selectedSide
            const selectedColor = selectedSide === 'blue' ? '#36A2EB' : selectedSide === 'red' ? '#ff944d' : null;
            
            // ------------------ CHART UPDATES ---------------------
            // Get the dropdown menu element
            const chartTypeDropdown = document.getElementById("chart-type");

            // Extract the selected value
            const selectedChartType = chartTypeDropdown.value;

            if (selectedChartType === 'Pie') {
                // Update the chart with the appropriate color
                pieChartTable.updateChart(itemName, group, [percentageInRange, percentageOutOfRange], selectedColor, platformToEnemiesMap);
            }
            else if (selectedChartType === 'Loadouts') {
                // Build and then update the chart
                // 1. NUMBER OF ENEMY PLATFORMS
                // 2. NUMBER OF ENEMY PLATFORMS IN WEZ
                // 3. NUMBER OF AVAILABLE WEAPONS
                var numPlats = totalEnemies;
                var wez = inRangeCount;
                var quantity = 0;
                // Calcualte the total ammo quantity of weapons on platforms that are capable of ranging enemy platforms
                console.log("=====================================================");
                console.log("");
                if (isArrayValid(contributingPlatforms)) {
                    contributingPlatforms.forEach(element => {
                        console.log(element);
                    });
                    quantity = getTotalWeaponQuantity(platformData, contributingPlatforms, itemName);
                }
                console.log("");
                console.log("=====================================================");

                //quantity = getTotalWeaponQuantity(platformData, contributingPlatforms, itemName);
                var numPlatsBarPriority = 0; 
                var wezBarPriority = 0;  
                var quantityBarPriority = 0;  
                var wezBarColor = '';
                
                // Determine the maximum and minimum values
                var max = Math.max(numPlats, wez, quantity);
                var min = Math.min(numPlats, wez, quantity);
                // Assign priority for numPlats
                if (numPlats === max) {
                    numPlatsBarPriority = 1;
                } else if (numPlats === min) {
                    numPlatsBarPriority = 3;
                } else {
                    numPlatsBarPriority = 2;
                }
                // Assign priority for wez
                if (wez === max) {
                    wezBarPriority = 1;
                } else if (wez === min) {
                    wezBarPriority = 3;
                } else {
                    wezBarPriority = 2;
                }
                // Assign priority for quantity
                if (quantity === max) {
                    quantityBarPriority = 1;
                } else if (quantity === min) {
                    quantityBarPriority = 3;
                } else {
                    quantityBarPriority = 2;
                }

                // If the selected side is blue, the WEZ bars should be blue
                // Otherwise, they should be red
                if (selectedSide === 'blue') {
                    wezBarColor = '#4d94ff'; // Blue
                }
                else {
                    wezBarColor = '#ff944d'; // Red
                }

                // Define the bars to update
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
                // Define the chart options to update
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


            // ------------------ ADDITIONAL CODE TO USE THE MAP ------------------
            // After processing, you can use platformToEnemiesMap as needed
            // For example, logging the Map
            console.log(`\nMap of shooter platforms to in-range enemies for ${itemType} "${itemName}" and group "${group}":`);
            platformToEnemiesMap.forEach(function(enemyList, shooterPlatform) {
                console.log(`Shooter Platform: ${shooterPlatform} -> In-range Enemies: ${enemyList.join(', ')}`);
            });
            // --------------------------------------------------------------------

        });
    });
}

// Initialize jQuery UI dialog and event listeners on DOM load
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

    // Attach change event listeners to apply changes dynamically
    $('#side').on('change', function() {
        populateConfigDropdowns(); // Update dropdowns when the side changes
        applyConfig(); // Apply any other changes
    });
    $('#chart-type, #shooter-platforms, #weapons, #enemy-groups, #sensors, #friendly-groups, #friendly-platforms, #enemy-groups, #enemy-platforms').on('change', applyConfig);

});