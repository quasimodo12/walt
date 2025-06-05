// range_rings_storage.js
var RangeRingStorage = (function() {
    var rangeRings = [];

    // Load initial data from separate data models
    function init() {
        var platformData = PlatformModel.getPlatformData();
        var weaponData = WeaponStorage.getWeaponData();
        var sensorData = SensorStorage.getSensorData();
        var setToggled = 0;
        
        rangeRings = [];  // Clear any existing data

        // Create a dictionary of weapons for easy lookup by name
        var weaponDict = weaponData.reduce(function(dict, weapon) {
            dict[weapon.weapon_name] = weapon;
            return dict;
        }, {});

        // Create a dictionary of sensors for easy lookup by name
        var sensorDict = sensorData.reduce(function(dict, sensor) {
            dict[sensor.sensor_name] = sensor;
            return dict;
        }, {});

        // Iterate through the platform data to generate range rings
        platformData.forEach(function(platform) {
            // Add range rings for each weapon attached to the platform
            if (platform.weapons) {
                platform.weapons.forEach(function(weapon) {
                    if (weaponDict[weapon.name]) {
                        rangeRings.push({
                            platform_name: platform.platform_name,
                            system_name: weapon.name,
                            system_type: "weapon",
                            range_val: weaponDict[weapon.name].weapon_range,
                            latitude: parseFloat(platform.latitude),
                            longitude: parseFloat(platform.longitude),
                            toggled: setToggled
                        });
                    }
                });
            }

            // Add range rings for each sensor attached to the platform
            if (platform.sensors) {
                platform.sensors.forEach(function(sensorName) {
                    if (sensorDict[sensorName]) {
                        rangeRings.push({
                            platform_name: platform.platform_name,
                            system_name: sensorName,
                            system_type: "sensor",
                            range_val: sensorDict[sensorName].sensor_range,
                            latitude: parseFloat(platform.latitude),
                            longitude: parseFloat(platform.longitude),
                            toggled: setToggled
                        });
                    }
                });
            }
        });
    }

    function getAllRangeRings() {
        return rangeRings;
    }

    function getRangeRing(platformName, systemName) {
        return rangeRings.find(function(item) {
            return item.platform_name === platformName && item.system_name === systemName;
        });
    }
    
    function setRangeRing(platformName, systemName, newValues) {
        var rangeRing = getRangeRing(platformName, systemName);
        if (rangeRing) {
            Object.assign(rangeRing, newValues);
        } else {
            console.warn("Range ring not found for specified platform and system names.");
        }
    }

    function createRangeRing(newRangeRing) {
        if (!getRangeRing(newRangeRing.platform_name, newRangeRing.system_name)) {
            rangeRings.push(newRangeRing);
        } else {
            console.warn("Range ring with specified platform and system names already exists.");
        }
    }

    function exportData() {
        return JSON.stringify(rangeRings, null, 2);
    }

    return {
        init: init,
        getAllRangeRings: getAllRangeRings,
        getRangeRing: getRangeRing,
        setRangeRing: setRangeRing,
        createRangeRing: createRangeRing,
        exportData: exportData
    };
})();