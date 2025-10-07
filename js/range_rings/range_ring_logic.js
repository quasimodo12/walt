var RangeRingLogic = (function() {

  // Array to keep track of range ring layers added to the map
  var rangeRingLayers = [];

  var DEFAULT_RING_OPACITY = 0.2;
  var rangeRingOpacity = DEFAULT_RING_OPACITY;

  // Function to draw range rings on the map
  function drawRangeRings() {

    var map = View.getMap();
    var rangeRings = RangeRingStorage.getAllRangeRings();

    // Remove any existing range rings from the map
    rangeRingLayers.forEach(function(layer) {
      map.removeLayer(layer);
    });
    rangeRingLayers = []; // Clear the array of layers

    // Get platform data from PlatformModel
    var platformData = PlatformModel.getPlatformData();

    // Create a lookup for platform side by platform name
    var platformSideLookup = platformData.reduce(function(acc, platform) {
      acc[platform.platform_name] = platform.side;
      return acc;
    }, {});

    // Iterate through each range ring in the array
    rangeRings
      .filter(function(rangeRing) {
        return rangeRing.toggled === 1;
      })
      .sort(function(a, b) {
        return b.range_val - a.range_val;
      })
      .forEach(function(rangeRing) {
        // Determine the side and corresponding color
        var side = platformSideLookup[rangeRing.platform_name];
        var color = '#808080';
        if (typeof SideConfig !== 'undefined' && typeof SideConfig.getColorForSide === 'function') {
          color = SideConfig.getColorForSide(side);
        } else if (side === 'blue') {
          color = 'blue';
        } else if (side === 'red') {
          color = 'red';
        }

        // Define the circle using Leaflet's L.circle function
        var circle = L.circle([rangeRing.latitude, rangeRing.longitude], {
          radius: rangeRing.range_val, // radius in meters
          color: color,
          weight: 0.5,
          opacity: rangeRingOpacity, // Set the line opacity here
          fillOpacity: 0.01 // Inner fill opacity
        });

        var rangeValue = typeof rangeRing.range_val === 'number'
          ? rangeRing.range_val
          : parseFloat(rangeRing.range_val);
        var formattedRange = isFinite(rangeValue)
          ? rangeValue.toLocaleString()
          : 'Unknown';

        var tooltipContent = [
          rangeRing.system_name || 'Unknown System',
          rangeRing.platform_name || 'Unknown Platform',
          formattedRange + ' m'
        ].join('<br>');

        circle.bindTooltip(tooltipContent, {
          direction: 'top',
          sticky: true,
          className: 'range-ring-tooltip'
        });

        // Add the circle to the map and keep track of it
        circle.addTo(map);
        rangeRingLayers.push(circle);
      });
    updateRangeRingConfigCheckboxes();
  }

  // New function to draw a range ring around a specific platform by name
  function drawRangeRingForPlatform(platformName) {
    if (!platformName) {
      return;
    }

    var rangeRings = RangeRingStorage.getAllRangeRings();
    if (!Array.isArray(rangeRings)) {
      return;
    }

    var matchingRangeRings = rangeRings.filter(function(rangeRing) {
      return rangeRing.platform_name === platformName;
    });

    if (matchingRangeRings.length === 0) {
      return;
    }

    var enableRings = matchingRangeRings.some(function(rangeRing) {
      return rangeRing.toggled !== 1;
    });
    var newToggleValue = enableRings ? 1 : 0;

    matchingRangeRings.forEach(function(rangeRing) {
      rangeRing.toggled = newToggleValue;
    });

    drawRangeRings();
  }
  

  // Clear the range rings from the map
  function clearRangeRings() {
    var map = View.getMap();
    // Clear existing range rings
    rangeRingLayers.forEach(function(layer) {
      map.removeLayer(layer);
    });
    rangeRingLayers = [];
  }

  function clearAllRangeRings() {
    RangeRingStorage.setAllRangeRingToggleStates(0);
    clearRangeRings();
    updateRangeRingConfigCheckboxes();
  }

  function updateRangeRingConfigCheckboxes() {
    var tableBody = document.querySelector('#rangeRingTable tbody');
    if (!tableBody) {
      return;
    }

    var rangeRings = RangeRingStorage.getAllRangeRings();
    if (!Array.isArray(rangeRings) || rangeRings.length === 0) {
      return;
    }

    var toggleLookup = rangeRings.reduce(function(accumulator, rangeRing) {
      var key = createRangeRingKey(rangeRing.platform_name, rangeRing.system_name);
      accumulator[key] = rangeRing.toggled === 1;
      return accumulator;
    }, {});

    var rows = tableBody.querySelectorAll('tr[data-platform][data-system]');
    rows.forEach(function(row) {
      var platformName = row.getAttribute('data-platform');
      var systemName = row.getAttribute('data-system');
      var checkbox = row.querySelector('.range-toggle');

      if (!checkbox) {
        return;
      }

      var key = createRangeRingKey(platformName, systemName);
      if (Object.prototype.hasOwnProperty.call(toggleLookup, key)) {
        checkbox.checked = toggleLookup[key];
      }
    });
  }

  function createRangeRingKey(platformName, systemName) {
    return String(platformName) + '|' + String(systemName);
  }

  function setRangeRingOpacity(opacity) {
    var parsed = parseFloat(opacity);
    if (!isFinite(parsed)) {
      return;
    }

    // Clamp value between 0 and 1
    parsed = Math.max(0, Math.min(1, parsed));
    rangeRingOpacity = parsed;

    rangeRingLayers.forEach(function(layer) {
      layer.setStyle({ opacity: rangeRingOpacity });
    });
  }

  function getRangeRingOpacity() {
    return rangeRingOpacity;
  }

  // Return public functions
  return {
    drawRangeRings: drawRangeRings,
    drawRangeRingForPlatform: drawRangeRingForPlatform,
    clearRangeRings: clearRangeRings,
    clearAllRangeRings: clearAllRangeRings,
    setRangeRingOpacity: setRangeRingOpacity,
    getRangeRingOpacity: getRangeRingOpacity
  };

})();
