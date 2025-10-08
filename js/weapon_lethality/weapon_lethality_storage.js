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

    function buildUniqueList(data) {
        var unique = [];
        var seen = {};

        data.forEach(function(entry) {
            var cloned = cloneEntry(entry);
            var key = cloned.weapon + '||' + cloned.platformType;
            if (!seen[key]) {
                seen[key] = true;
                unique.push(cloned);
            }
        });

        return unique;
    }

    function loadInitialData(initialData) {
        if (!Array.isArray(initialData)) {
            lethalityData = [];
            return;
        }

        lethalityData = buildUniqueList(initialData);
    }

    function getLethalityData() {
        return lethalityData;
    }

    function setLethalityData(newData) {
        if (!Array.isArray(newData)) {
            return;
        }

        lethalityData = buildUniqueList(newData);
    }

    function pairingExists(weapon, platformType, ignoreIndex) {
        var normalizedWeapon = typeof weapon === 'string' ? weapon.trim() : '';
        var normalizedPlatform = typeof platformType === 'string' ? platformType.trim() : '';

        return lethalityData.some(function(existing, idx) {
            if (typeof ignoreIndex === 'number' && idx === ignoreIndex) {
                return false;
            }
            return existing.weapon === normalizedWeapon && existing.platformType === normalizedPlatform;
        });
    }

    function addPairing(entry) {
        var cloned = cloneEntry(entry);
        if (pairingExists(cloned.weapon, cloned.platformType)) {
            return false;
        }

        lethalityData.push(cloned);
        return true;
    }

    function updatePairing(index, updates) {
        if (index < 0 || index >= lethalityData.length) {
            return false;
        }

        var current = lethalityData[index];
        var nextWeapon = typeof updates.weapon === 'string' ? updates.weapon.trim() : current.weapon;
        var nextPlatformType = typeof updates.platformType === 'string' ? updates.platformType.trim() : current.platformType;

        if (pairingExists(nextWeapon, nextPlatformType, index)) {
            return false;
        }

        current.weapon = nextWeapon;
        current.platformType = nextPlatformType;
        if (Object.prototype.hasOwnProperty.call(updates, 'quantity')) {
            var parsed = parseInt(updates.quantity, 10);
            current.quantity = isNaN(parsed) ? 0 : Math.max(parsed, 0);
        }

        return true;
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
        exportData: exportData,
        pairingExists: pairingExists
    };

    return new Proxy(api, {
        get: function(target, prop) {
            return target[prop];
        }
    });
})();
