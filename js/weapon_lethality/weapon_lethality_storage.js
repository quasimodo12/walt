// js/weapon_lethality/weapon_lethality_storage.js
var WeaponLethalityStorage = (function() {
    var lethalityData = [];
    var nextId = 1;

    function cloneEntry(entry) {
        return {
            id: entry.id || null,
            weapon: entry.weapon || '',
            platform: entry.platform || '',
            quantity: typeof entry.quantity === 'number' ? entry.quantity : parseInt(entry.quantity, 10) || 0
        };
    }

    function generateId() {
        return 'wl-' + (nextId++);
    }

    function loadInitialData(initialData) {
        nextId = 1;
        lethalityData = Array.isArray(initialData) ? initialData.map(function(item) {
            var cloned = cloneEntry(item);
            if (cloned.id && typeof cloned.id === 'string') {
                return cloned;
            }
            cloned.id = generateId();
            return cloned;
        }) : [];
        // Ensure the nextId counter stays ahead of any provided IDs that include an incrementing suffix
        lethalityData.forEach(function(entry) {
            var match = /wl-(\d+)/.exec(entry.id);
            if (match) {
                var numeric = parseInt(match[1], 10);
                if (!isNaN(numeric) && numeric >= nextId) {
                    nextId = numeric + 1;
                }
            }
        });
    }

    function getLethalityData() {
        return lethalityData;
    }

    function addEntry(entry) {
        var newEntry = cloneEntry(entry || {});
        if (!newEntry.id) {
            newEntry.id = generateId();
        }
        lethalityData.push(newEntry);
        return newEntry;
    }

    function updateEntry(index, updates) {
        if (!lethalityData[index]) {
            return;
        }
        var entry = lethalityData[index];
        if (updates.weapon !== undefined) {
            entry.weapon = updates.weapon;
        }
        if (updates.platform !== undefined) {
            entry.platform = updates.platform;
        }
        if (updates.quantity !== undefined) {
            var parsed = parseInt(updates.quantity, 10);
            entry.quantity = isNaN(parsed) ? 0 : parsed;
        }
    }

    function removeEntry(index) {
        if (index >= 0 && index < lethalityData.length) {
            lethalityData.splice(index, 1);
        }
    }

    function setLethalityData(newData) {
        if (Array.isArray(newData)) {
            loadInitialData(newData);
        }
    }

    function exportData() {
        var exportable = lethalityData.map(function(entry) {
            return {
                weapon: entry.weapon,
                platform: entry.platform,
                quantity: entry.quantity
            };
        });
        return JSON.stringify(exportable, null, 2);
    }

    return {
        loadInitialData: loadInitialData,
        getLethalityData: getLethalityData,
        addEntry: addEntry,
        updateEntry: updateEntry,
        removeEntry: removeEntry,
        setLethalityData: setLethalityData,
        exportData: exportData
    };
})();
