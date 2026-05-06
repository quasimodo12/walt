// range_rings_storage.js
var RangeRingStorage = (function() {
    var rangeRings = [];

    function init() {
        var platformData = PlatformModel.getPlatformData();
        var weaponData = WeaponStorage.getWeaponData();
        var sensorData = SensorStorage.getSensorData();
        var setToggled = 0;

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
                        rangeRings.push({
                            platform_name: platform.platform_name,
                            system_name: weapon.name,
                            system_type: "weapon",
                            range_val: weaponDict[weapon.name].weapon_range,
                            latitude: parseFloat(platform.latitude),
                            longitude: parseFloat(platform.longitude),
                            toggled: setToggled,
                            style: Object.assign({}, defaultStyle)
                        });
                    }
                });
            }

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
                            toggled: setToggled,
                            style: Object.assign({}, defaultStyle)
                        });
                    }
                });
            }
        });
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
