// platform_copy_controller.js
var PlatformCopyController = (function(
    View,
    SelectionController,
    PlatformModel,
    RangeRingStorage,
    RangeRingLogic,
    DistanceStorage,
    TableController
) {
    var copyBuffer = [];
    var isCopyMode = false;
    var map;
    var previousCursor = '';

    var GRID_SPACING_PX = 60;

    function init() {
        map = View.getMap();
        if (!map) {
            console.error('PlatformCopyController: map instance unavailable during init.');
            return;
        }

        document.addEventListener('keydown', handleKeyDown);
        map.on('click', handleMapClick);
    }

    function handleKeyDown(event) {
        if (shouldIgnoreEventTarget()) {
            return;
        }

        var isCopyKey = (event.ctrlKey || event.metaKey) && event.key && event.key.toLowerCase() === 'c';
        if (isCopyKey) {
            prepareCopyBuffer();
            if (copyBuffer.length > 0) {
                event.preventDefault();
                enterCopyMode();
            }
            return;
        }

        if (event.key === 'Escape' && isCopyMode) {
            event.preventDefault();
            exitCopyMode();
        }
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

    function prepareCopyBuffer() {
        var selectedMarkers = Array.from(SelectionController.getSelectedMarkers() || []);
        copyBuffer = selectedMarkers
            .map(function(marker) {
                if (!marker || !marker._platformName) {
                    return null;
                }

                var platformData = PlatformModel.getPlatformDataFromName(marker._platformName);
                if (!platformData) {
                    return null;
                }

                return {
                    originalName: platformData.platform_name,
                    snapshot: JSON.parse(JSON.stringify(platformData))
                };
            })
            .filter(Boolean);
    }

    function enterCopyMode() {
        if (isCopyMode) {
            return;
        }

        isCopyMode = true;
        var container = map.getContainer();
        previousCursor = container.style.cursor;
        container.style.cursor = 'copy';
    }

    function exitCopyMode() {
        isCopyMode = false;
        copyBuffer = [];
        restoreCursor();
    }

    function restoreCursor() {
        if (!map) {
            return;
        }

        var container = map.getContainer();
        container.style.cursor = previousCursor;
        previousCursor = '';
    }

    function handleMapClick(event) {
        if (!isCopyMode || copyBuffer.length === 0) {
            return;
        }

        placeCopies(event.latlng);
        exitCopyMode();
    }

    function placeCopies(originLatLng) {
        if (!originLatLng) {
            return;
        }

        var existingNames = new Set(PlatformModel.getPlatformNames());
        var basePoint = map.latLngToLayerPoint(originLatLng);
        var gridSize = Math.ceil(Math.sqrt(copyBuffer.length));

        copyBuffer.forEach(function(item, index) {
            var row = Math.floor(index / gridSize);
            var col = index % gridSize;

            var offsetPoint = L.point(
                basePoint.x + col * GRID_SPACING_PX,
                basePoint.y + row * GRID_SPACING_PX
            );

            var targetLatLng = map.layerPointToLatLng(offsetPoint);
            var newPlatform = JSON.parse(JSON.stringify(item.snapshot));

            var newName = generateCopyName(item.originalName, existingNames);
            existingNames.add(newName);

            newPlatform.platform_name = newName;
            newPlatform.latitude = targetLatLng.lat.toFixed(6);
            newPlatform.longitude = targetLatLng.lng.toFixed(6);

            PlatformModel.pushPlatform(newPlatform);
        });

        synchronizeApplicationState();
    }

    function generateCopyName(baseName, existingNames) {
        var escapedBase = escapeRegExp(baseName);
        var regex = new RegExp('^' + escapedBase + '_copy_(\\d+)$');
        var maxIndex = 0;

        existingNames.forEach(function(name) {
            if (name === baseName) {
                return;
            }

            var match = name.match(regex);
            if (match) {
                var parsed = parseInt(match[1], 10);
                if (!isNaN(parsed)) {
                    maxIndex = Math.max(maxIndex, parsed);
                }
            }
        });

        return baseName + '_copy_' + (maxIndex + 1);
    }

    function escapeRegExp(string) {
        return string.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
    }

    function synchronizeApplicationState() {
        preserveRangeRingToggleState();
        RangeRingStorage.init();
        restoreRangeRingToggleState();
        RangeRingLogic.clearRangeRings();
        RangeRingLogic.drawRangeRings();

        DistanceStorage.refreshDistanceData();
        TableController.redrawTable();
        SelectionController.clearSelectedMarkers();
        View.renderPlatforms();
        View.updateAll();
    }

    var storedToggles = {};

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
    }

    function createRangeRingKey(platformName, systemName) {
        return platformName + '|' + systemName;
    }

    return {
        init: init
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
