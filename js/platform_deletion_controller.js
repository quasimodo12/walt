// platform_deletion_controller.js
var PlatformDeletionController = (function(
    View,
    SelectionController,
    PlatformModel,
    RangeRingStorage,
    RangeRingLogic,
    DistanceStorage,
    TableController
) {
    var storedToggles = {};

    function init() {
        document.addEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(event) {
        if (!event || event.key !== 'Delete') {
            return;
        }

        if (shouldIgnoreEventTarget()) {
            return;
        }

        var selectedMarkers = Array.from(SelectionController.getSelectedMarkers() || []);
        if (selectedMarkers.length === 0) {
            return;
        }

        var platformNames = extractPlatformNames(selectedMarkers);
        if (platformNames.length === 0) {
            return;
        }

        var confirmationMessage = buildConfirmationMessage(platformNames);
        if (!window.confirm(confirmationMessage)) {
            return;
        }

        event.preventDefault();
        deletePlatforms(platformNames);
    }

    function shouldIgnoreEventTarget() {
        var activeElement = document.activeElement;
        if (!activeElement) {
            return false;
        }

        var tagName = activeElement.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            return true;
        }

        if (activeElement.isContentEditable) {
            return true;
        }

        return false;
    }

    function extractPlatformNames(markers) {
        var names = markers
            .map(function(marker) {
                if (!marker || !marker._platformName) {
                    return null;
                }
                return marker._platformName;
            })
            .filter(Boolean);

        return Array.from(new Set(names));
    }

    function buildConfirmationMessage(platformNames) {
        if (platformNames.length === 1) {
            return 'Delete the selected platform "' + platformNames[0] + '"?\n\nThis action cannot be undone.';
        }

        var list = platformNames.map(function(name) {
            return '• ' + name;
        }).join('\n');

        return 'Delete the ' + platformNames.length + ' selected platforms?\n\n' + list + '\n\nThis action cannot be undone.';
    }

    function deletePlatforms(platformNames) {
        if (!Array.isArray(platformNames) || platformNames.length === 0) {
            return [];
        }

        var uniqueNames = Array.from(new Set(platformNames.filter(Boolean)));
        if (uniqueNames.length === 0) {
            return [];
        }

        preserveRangeRingToggleState();

        var deletedNames = uniqueNames.filter(function(name) {
            return PlatformModel.deletePlatform(name);
        });

        if (deletedNames.length === 0) {
            storedToggles = {};
            return [];
        }

        synchronizeApplicationState();

        return deletedNames;
    }

    function synchronizeApplicationState() {
        SelectionController.clearSelectedMarkers();

        RangeRingLogic.clearRangeRings();
        RangeRingStorage.init();
        restoreRangeRingToggleState();
        RangeRingLogic.drawRangeRings();

        DistanceStorage.refreshDistanceData();
        TableController.redrawTable();
        View.renderPlatforms();
        View.updateAll();
    }

    function preserveRangeRingToggleState() {
        storedToggles = {};
        var rings = RangeRingStorage.getAllRangeRings();
        if (!Array.isArray(rings)) {
            return;
        }

        rings.forEach(function(ring) {
            var key = createRangeRingKey(ring.platform_name, ring.system_name);
            storedToggles[key] = ring.toggled;
        });
    }

    function restoreRangeRingToggleState() {
        var rings = RangeRingStorage.getAllRangeRings();
        if (!Array.isArray(rings)) {
            return;
        }

        rings.forEach(function(ring) {
            var key = createRangeRingKey(ring.platform_name, ring.system_name);
            if (Object.prototype.hasOwnProperty.call(storedToggles, key)) {
                ring.toggled = storedToggles[key];
            }
        });

        storedToggles = {};
    }

    function createRangeRingKey(platformName, systemName) {
        return String(platformName) + '|' + String(systemName);
    }

    return {
        init: init,
        deletePlatforms: deletePlatforms
    };
})(
    View,
    SelectionController,
    PlatformModel,
    RangeRingStorage,
    RangeRingLogic,
    DistanceStorage,
    TableController
);
