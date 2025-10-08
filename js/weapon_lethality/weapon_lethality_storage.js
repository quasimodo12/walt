// js/weapon_lethality/weapon_lethality_storage.js
var WeaponLethalityStorage = (function() {
    var lethalityData = [];

    function cloneEntry(entry) {
        return {
            weapon: entry && entry.weapon ? entry.weapon : '',
            platform: entry && entry.platform ? entry.platform : '',
            quantity: typeof entry.quantity === 'number' ? entry.quantity : parseInt(entry.quantity, 10) || 0
        };
    }

    function loadInitialData(initialData) {
        if (!Array.isArray(initialData)) {
            lethalityData = [];
            return;
        }

        lethalityData = initialData.map(function(entry) {
            return cloneEntry(entry);
        });
    }

    function getWeaponLethalityData() {
        return lethalityData;
    }

    function setWeaponLethalityData(newData) {
        if (!Array.isArray(newData)) {
            return;
        }

        lethalityData = newData.map(function(entry) {
            return cloneEntry(entry);
        });
    }

    function addPairing(pairing) {
        lethalityData.push(cloneEntry(pairing));
    }

    function removePairing(index) {
        if (index >= 0 && index < lethalityData.length) {
            lethalityData.splice(index, 1);
        }
    }

    function updatePairing(index, updates) {
        if (index >= 0 && index < lethalityData.length) {
            lethalityData[index] = Object.assign({}, lethalityData[index], cloneEntry(updates));
        }
    }

    function exportData() {
        return JSON.stringify(lethalityData, null, 2);
    }

    return {
        loadInitialData: loadInitialData,
        getWeaponLethalityData: getWeaponLethalityData,
        setWeaponLethalityData: setWeaponLethalityData,
        addPairing: addPairing,
        removePairing: removePairing,
        updatePairing: updatePairing,
        exportData: exportData
    };
})();
