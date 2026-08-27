// range_rings_storage.js
var RangeRingStorage = (function() {
    var rangeRings = [];

    function init() {
        var platformData = PlatformModel.getPlatformData();
        var weaponData = WeaponStorage.getWeaponData();
        var sensorData = SensorStorage.getSensorData();
        var toggleStates = rangeRings.reduce(function(states, ring) {
            states[createRangeRingKey(ring.platform_name, ring.system_name)] = ring.toggled === 1 ? 1 : 0;
            return states;
        }, {});

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
                    var weaponDetails = weaponDict[weapon.name];
                    if (weaponDetails) {
                        var weaponBand = getWeaponRangeBand(weaponDetails);
                        rangeRings.push(createRangeRingRecord({
                            platform: platform,
                            systemName: weapon.name,
                            systemType: "weapon",
                            rangeBand: weaponBand,
                            toggled: getSavedToggleState(toggleStates, platform.platform_name, weapon.name),
                            style: defaultStyle
                        }));
                    }
                });
            }

            if (platform.sensors) {
                platform.sensors.forEach(function(sensorName) {
                    var sensorDetails = sensorDict[sensorName];
                    if (sensorDetails) {
                        var sensorBand = getSensorRangeBand(sensorDetails);
                        rangeRings.push(createRangeRingRecord({
                            platform: platform,
                            systemName: sensorName,
                            systemType: "sensor",
                            rangeBand: sensorBand,
                            toggled: getSavedToggleState(toggleStates, platform.platform_name, sensorName),
                            style: defaultStyle
                        }));
                    }
                });
            }
        });
    }

    function getSavedToggleState(toggleStates, platformName, systemName) {
        var key = createRangeRingKey(platformName, systemName);
        return Object.prototype.hasOwnProperty.call(toggleStates, key) ? toggleStates[key] : 0;
    }

    function createRangeRingKey(platformName, systemName) {
        return String(platformName) + '|' + String(systemName);
    }

    function createRangeRingRecord(options) {
        var rangeBand = normalizeRangeBand(options.rangeBand);
        return {
            platform_name: options.platform.platform_name,
            system_name: options.systemName,
            system_type: options.systemType,
            range_min_val: rangeBand.min,
            range_max_val: rangeBand.max,
            latitude: parseFloat(options.platform.latitude),
            longitude: parseFloat(options.platform.longitude),
            toggled: options.toggled,
            style: Object.assign({}, options.style)
        };
    }

    function getWeaponRangeBand(weapon) {
        if (typeof WeaponStorage !== 'undefined' && typeof WeaponStorage.getWeaponRangeBand === 'function') {
            return WeaponStorage.getWeaponRangeBand(weapon);
        }
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getWeaponRangeBand === 'function') {
            return RangeUtils.getWeaponRangeBand(weapon);
        }
        return normalizeRangeBand({
            min: weapon && weapon.weapon_min_range,
            max: weapon && (weapon.weapon_max_range !== undefined ? weapon.weapon_max_range : weapon.weapon_range)
        });
    }

    function getSensorRangeBand(sensor) {
        if (typeof SensorStorage !== 'undefined' && typeof SensorStorage.getSensorRangeBand === 'function') {
            return SensorStorage.getSensorRangeBand(sensor);
        }
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.getSensorRangeBand === 'function') {
            return RangeUtils.getSensorRangeBand(sensor);
        }
        return normalizeRangeBand({
            min: sensor && sensor.sensor_min_range,
            max: sensor && (sensor.sensor_max_range !== undefined ? sensor.sensor_max_range : sensor.sensor_range)
        });
    }

    function normalizeRangeBand(rangeBand) {
        var minRange = parseRange(rangeBand && (rangeBand.min !== undefined ? rangeBand.min : rangeBand.range_min_val));
        var maxRange = parseRange(rangeBand && (rangeBand.max !== undefined ? rangeBand.max : rangeBand.range_max_val));

        if (minRange === null) { minRange = 0; }
        if (maxRange === null) { maxRange = minRange; }

        minRange = Math.max(0, minRange);
        maxRange = Math.max(0, maxRange);

        if (minRange > maxRange) {
            maxRange = minRange;
        }

        return { min: minRange, max: maxRange };
    }

    function parseRange(value) {
        if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.parseRange === 'function') {
            return RangeUtils.parseRange(value);
        }
        if (value === undefined || value === null || value === '') {
            return null;
        }
        var parsed = Number(value);
        return isFinite(parsed) ? parsed : null;
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
