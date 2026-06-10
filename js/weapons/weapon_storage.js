// weapon_storage.js
var WeaponStorage = (function() {
    var weaponData = [];

    function normalizeWeaponRecord(item) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.normalizeWeaponRecord) {
            return RangeUtils.normalizeWeaponRecord(item);
        }
        return Object.assign({}, item);
    }

    function loadInitialData(WEAPON_DATA) {
        weaponData = WEAPON_DATA.map(function(item) {
            return normalizeWeaponRecord(item);
        });
    }

    function getWeaponData() {
        return weaponData;
    }

    function toCanonicalWeaponRecord(item) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.toCanonicalWeaponRecord) {
            return RangeUtils.toCanonicalWeaponRecord(item);
        }

        var normalized = normalizeWeaponRecord(item);
        delete normalized.weapon_range;
        delete normalized.min_range;
        delete normalized.max_range;
        delete normalized.index;
        return normalized;
    }

    function exportData() {
        return JSON.stringify(weaponData.map(function(item) {
            return toCanonicalWeaponRecord(item);
        }), null, 2);
    }

    function setWeaponData(newWeaponData) {
        weaponData = (Array.isArray(newWeaponData) ? newWeaponData : []).map(function(item) {
            return normalizeWeaponRecord(item);
        });
    }

    function getWeaponRangeBand(weapon) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.getWeaponRangeBand) {
            return RangeUtils.getWeaponRangeBand(weapon);
        }
        var minRange = weapon && weapon.weapon_min_range !== undefined ? Number(weapon.weapon_min_range) : 0;
        var maxRange = weapon && weapon.weapon_max_range !== undefined ? Number(weapon.weapon_max_range) :
            (weapon && weapon.weapon_range !== undefined ? Number(weapon.weapon_range) : null);
        return {
            min: minRange,
            max: maxRange,
            isValid: isFinite(minRange) && isFinite(maxRange) && minRange >= 0 && maxRange >= 0 && minRange <= maxRange
        };
    }

    var originalObject = {
        loadInitialData: loadInitialData,
        getWeaponData: getWeaponData,
        setWeaponData: setWeaponData,
        getWeaponRangeBand: getWeaponRangeBand,
        exportData: exportData
    };



    // Create a proxy to intercept access to the IIFE
    return new Proxy(originalObject, {
        get(target, prop) {
            // console.log(`WeaponStorage IIFE accessed: ${prop}`);
            // console.log("weapon_storage.js >>> sending weaponData to new window");
            // View.sendDataToNewWindow({type: 'weaponData', data: weaponData});
            //View.updateAll();
            return target[prop];
        }
    });
})();
