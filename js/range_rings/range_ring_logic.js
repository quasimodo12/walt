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
        var color = side === 'blue' ? 'blue' : (side === 'red' ? 'red' : 'gray');

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
  }

  // New function to draw a range ring around a specific platform by name
  function drawRangeRingForPlatform(platformName, rangeRings, map) {  
    // Get platform data from PlatformModel
    var platformData = PlatformModel.getPlatformData();
    var platformSideLookup = platformData.reduce(function(acc, platform) {
      acc[platform.platform_name] = platform.side;
      return acc;
    }, {});
  
    // Filter range rings for the specified platform that are toggled
    var matchingRangeRings = rangeRings
      .filter(function(ring) {
        return ring.platform_name === platformName;
      })
      .sort(function(a, b) {
        return b.range_val - a.range_val;
      });
  
    // Draw each matching range ring
    matchingRangeRings.forEach(function(rangeRing) {
      var side = platformSideLookup[rangeRing.platform_name];
      var color = side === 'blue' ? 'blue' : (side === 'red' ? 'red' : 'gray');
  
      // Use L.circle (leaflet) to define the range ring circle
      var circle = L.circle([rangeRing.latitude, rangeRing.longitude], {
        radius: rangeRing.range_val,
        color: color,
        weight: 0.5,
        opacity: rangeRingOpacity,
        fillOpacity: 0.01
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
    setRangeRingOpacity: setRangeRingOpacity,
    getRangeRingOpacity: getRangeRingOpacity
  };

})();
