// js/weapon_lethality/weapon_lethality_storage.js
var WeaponLethalityStorage = (function() {
    var lethalityData = [];

    function cloneEntry(entry) {
        return {
            weapon: (entry.weapon || '').trim(),
            platformType: (entry.platformType || '').trim(),
            quantity: parseInt(entry.quantity, 10) || 0
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

    function getLethalityData() {
        return lethalityData;
    }

    function setLethalityData(newData) {
        if (!Array.isArray(newData)) {
            return;
        }

        lethalityData = newData.map(function(entry) {
            return cloneEntry(entry);
        });
    }

    function addPairing(entry) {
        lethalityData.push(cloneEntry(entry));
    }

    function updatePairing(index, updates) {
        if (index < 0 || index >= lethalityData.length) {
            return;
        }

        var current = lethalityData[index];
        if (typeof updates.weapon === 'string') {
            current.weapon = updates.weapon.trim();
        }
        if (typeof updates.platformType === 'string') {
            current.platformType = updates.platformType.trim();
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'quantity')) {
            var parsed = parseInt(updates.quantity, 10);
            current.quantity = isNaN(parsed) ? 0 : Math.max(parsed, 0);
        }
    }

    function removePairing(index) {
        if (index < 0 || index >= lethalityData.length) {
            return;
        }
        lethalityData.splice(index, 1);
    }

    function exportData() {
        return JSON.stringify(lethalityData, null, 2);
    }

    var api = {
        loadInitialData: loadInitialData,
        getLethalityData: getLethalityData,
        setLethalityData: setLethalityData,
        addPairing: addPairing,
        updatePairing: updatePairing,
        removePairing: removePairing,
        exportData: exportData
    };

    return new Proxy(api, {
        get: function(target, prop) {
            return target[prop];
        }
    });
})();
