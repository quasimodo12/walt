// weapon_storage.js
var WeaponStorage = (function() {
    var weaponData = [];

    function loadInitialData(WEAPON_DATA) {
        weaponData = WEAPON_DATA.map(function(item) {
            return Object.assign({}, item);
        });
    }

    function getWeaponData() {
        return weaponData;
    }

    function exportData() {
        return JSON.stringify(weaponData, null, 2);
    }

    function setWeaponData(newWeaponData) {
        weaponData = newWeaponData;
    }

    var originalObject = {
        loadInitialData: loadInitialData,
        getWeaponData: getWeaponData,
        setWeaponData: setWeaponData,
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
