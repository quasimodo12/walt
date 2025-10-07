// js/weapons/weapon_lethality_storage.js
var WeaponLethalityStorage = (function() {
    var lethalityData = [];

    function normalizeEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return { weapon: '', platform: '', quantity: 0 };
        }

        var quantity = parseInt(entry.quantity, 10);
        return {
            weapon: entry.weapon || '',
            platform: entry.platform || '',
            quantity: isNaN(quantity) ? 0 : quantity
        };
    }

    function loadInitialData(initialData) {
        lethalityData = Array.isArray(initialData) ? initialData.map(normalizeEntry) : [];
    }

    function getLethalityData() {
        return lethalityData;
    }

    function setLethalityData(newData) {
        lethalityData = Array.isArray(newData) ? newData.map(normalizeEntry) : [];
    }

    function exportData() {
        return JSON.stringify(lethalityData, null, 2);
    }

    var originalObject = {
        loadInitialData: loadInitialData,
        getLethalityData: getLethalityData,
        setLethalityData: setLethalityData,
        exportData: exportData
    };

    return new Proxy(originalObject, {
        get: function(target, prop) {
            return target[prop];
        }
    });
})();
