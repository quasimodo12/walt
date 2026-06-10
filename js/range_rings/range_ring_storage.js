// range_rings_storage.js
var RangeRingStorage = (function() {
    var rangeRings = [];

    function init() {
        var platformData = PlatformModel.getPlatformData();
        var weaponData = WeaponStorage.getWeaponData();
        var sensorData = SensorStorage.getSensorData();
        var setToggled = 0;
        var existingRangeRingState = createExistingRangeRingStateLookup(rangeRings);

        rangeRings = [];

        var weaponDict = weaponData.reduce(function(dict, weapon) {
            dict[weapon.weapon_name] = weapon;
            return dict;
        }, {});

        var sensorDict = sensorData.reduce(function(dict, sensor) {
            dict[sensor.sensor_name] = sensor;
            return dict;
        }, {});

        platformData.forEach(function(platform) {
            var defaultStyle = getDefaultStyleForSide(platform.side);

            if (platform.weapons) {
                platform.weapons.forEach(function(weapon) {
                    if (weaponDict[weapon.name]) {
                        var weaponBand = getWeaponRangeBand(weaponDict[weapon.name]);
                        var weaponState = getExistingRangeRingState(
                            existingRangeRingState,
                            platform.platform_name,
                            weapon.name
                        );

                        rangeRings.push({
                            platform_name: platform.platform_name,
                            system_name: weapon.name,
                            system_type: "weapon",
                            range_min_val: weaponBand.min,
                            range_max_val: weaponBand.max,
                            latitude: parseFloat(platform.latitude),
                            longitude: parseFloat(platform.longitude),
                            toggled: weaponState && weaponState.toggled !== undefined ? weaponState.toggled : setToggled,
                            style: weaponState && weaponState.style ? Object.assign({}, weaponState.style) : Object.assign({}, defaultStyle)
                        });
                    }
                });
            }

            if (platform.sensors) {
                platform.sensors.forEach(function(sensorName) {
                    if (sensorDict[sensorName]) {
                        var sensorBand = getSensorRangeBand(sensorDict[sensorName]);
                        var sensorState = getExistingRangeRingState(
                            existingRangeRingState,
                            platform.platform_name,
                            sensorName
                        );

                        rangeRings.push({
                            platform_name: platform.platform_name,
                            system_name: sensorName,
                            system_type: "sensor",
                            range_min_val: sensorBand.min,
                            range_max_val: sensorBand.max,
                            latitude: parseFloat(platform.latitude),
                            longitude: parseFloat(platform.longitude),
                            toggled: sensorState && sensorState.toggled !== undefined ? sensorState.toggled : setToggled,
                            style: sensorState && sensorState.style ? Object.assign({}, sensorState.style) : Object.assign({}, defaultStyle)
                        });
                    }
                });
            }
        });
    }

    function getWeaponRangeBand(weapon) {
        if (typeof WeaponStorage !== 'undefined' && typeof WeaponStorage.getWeaponRangeBand === 'function') {
            return WeaponStorage.getWeaponRangeBand(weapon);
        }
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getWeaponRangeBand === 'function') {
            return RangeUtils.getWeaponRangeBand(weapon);
        }
        return {
            min: weapon && isFinite(weapon.weapon_min_range) ? Number(weapon.weapon_min_range) : 0,
            max: weapon && isFinite(weapon.weapon_max_range) ? Number(weapon.weapon_max_range) : Number(weapon && weapon.weapon_range),
            isValid: true
        };
    }

    function getSensorRangeBand(sensor) {
        if (typeof SensorStorage !== 'undefined' && typeof SensorStorage.getSensorRangeBand === 'function') {
            return SensorStorage.getSensorRangeBand(sensor);
        }
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getSensorRangeBand === 'function') {
            return RangeUtils.getSensorRangeBand(sensor);
        }
        return {
            min: sensor && isFinite(sensor.sensor_min_range) ? Number(sensor.sensor_min_range) : 0,
            max: sensor && isFinite(sensor.sensor_max_range) ? Number(sensor.sensor_max_range) : Number(sensor && sensor.sensor_range),
            isValid: true
        };
    }

    function createExistingRangeRingStateLookup(existingRangeRings) {
        if (!Array.isArray(existingRangeRings)) { return {}; }

        return existingRangeRings.reduce(function(lookup, rangeRing) {
            lookup[createRangeRingKey(rangeRing.platform_name, rangeRing.system_name)] = {
                toggled: rangeRing.toggled,
                style: rangeRing.style ? Object.assign({}, rangeRing.style) : undefined
            };
            return lookup;
        }, {});
    }

    function getExistingRangeRingState(existingRangeRingState, platformName, systemName) {
        return existingRangeRingState[createRangeRingKey(platformName, systemName)];
    }

    function createRangeRingKey(platformName, systemName) {
        return String(platformName) + '|' + String(systemName);
    }

    function getDefaultStyleForSide(side) {
        var templates = Array.isArray(window.range_ring_style_templates) ? window.range_ring_style_templates : [];
        var desiredName = side === 'red' ? 'red default' : (side === 'blue' ? 'blue default' : '');
        var match = templates.find(function(template) {
            return String(template.name || '').toLowerCase() === desiredName;
        });

        if (!match) {
            return { color: '#808080', lineWidth: 2, opacity: 0.35 };
        }

        return {
            color: match.color || '#808080',
            lineWidth: isFinite(match.lineWidth) ? match.lineWidth : 2,
            opacity: isFinite(match.opacity) ? match.opacity : 0.35
        };
    }

    function getAllRangeRings() { return rangeRings; }
    function getRangeRing(platformName, systemName) {
        return rangeRings.find(function(item) {
            return item.platform_name === platformName && item.system_name === systemName;
        });
    }
    function setRangeRing(platformName, systemName, newValues) {
        var rangeRing = getRangeRing(platformName, systemName);
        if (rangeRing) { Object.assign(rangeRing, newValues); }
        else { console.warn("Range ring not found for specified platform and system names."); }
    }
    function createRangeRing(newRangeRing) {
        if (!getRangeRing(newRangeRing.platform_name, newRangeRing.system_name)) { rangeRings.push(newRangeRing); }
        else { console.warn("Range ring with specified platform and system names already exists."); }
    }
    function setAllRangeRingToggleStates(toggled) {
        var normalized = toggled ? 1 : 0;
        rangeRings.forEach(function(ring) { ring.toggled = normalized; });
    }
    function exportData() { return JSON.stringify(rangeRings, null, 2); }

    return {
        init: init,
        getAllRangeRings: getAllRangeRings,
        getRangeRing: getRangeRing,
        setRangeRing: setRangeRing,
        createRangeRing: createRangeRing,
        setAllRangeRingToggleStates: setAllRangeRingToggleStates,
        exportData: exportData
    };
})();
