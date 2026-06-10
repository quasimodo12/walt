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

    function exportData() {
        return JSON.stringify(weaponData, null, 2);
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
        var maxRange = weapon && weapon.weapon_range !== undefined ? Number(weapon.weapon_range) : null;
        return { min: 0, max: maxRange, isValid: isFinite(maxRange) && maxRange >= 0 };
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
