var RangeRingLogic = (function() {
  var rangeRingLayers = [];

  function drawRangeRings() {
    var map = View.getMap();
    var rangeRings = RangeRingStorage.getAllRangeRings();

    rangeRingLayers.forEach(function(layer) { map.removeLayer(layer); });
    rangeRingLayers = [];

    var platformData = PlatformModel.getPlatformData();
    var platformSideLookup = platformData.reduce(function(acc, platform) {
      acc[platform.platform_name] = platform.side;
      return acc;
    }, {});

    rangeRings
      .filter(function(rangeRing) { return rangeRing.toggled === 1; })
      .sort(function(a, b) { return b.range_val - a.range_val; })
      .forEach(function(rangeRing) {
        var style = getRangeRingStyle(rangeRing, platformSideLookup[rangeRing.platform_name]);
        var circle = L.circle([rangeRing.latitude, rangeRing.longitude], {
          radius: rangeRing.range_val,
          color: style.color,
          weight: style.lineWidth,
          opacity: style.opacity,
          fillOpacity: 0.01
        });

        var rangeValue = typeof rangeRing.range_val === 'number' ? rangeRing.range_val : parseFloat(rangeRing.range_val);
        var formattedRange = isFinite(rangeValue) ? rangeValue.toLocaleString() : 'Unknown';
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

        circle.addTo(map);
        rangeRingLayers.push(circle);
      });

    updateRangeRingConfigCheckboxes();
  }

  function drawRangeRingForPlatform(platformName) {
    if (!platformName) { return; }
    var rangeRings = RangeRingStorage.getAllRangeRings();
    if (!Array.isArray(rangeRings)) { return; }

    var matchingRangeRings = rangeRings.filter(function(rangeRing) {
      return rangeRing.platform_name === platformName;
    });
    if (!matchingRangeRings.length) { return; }

    var enableRings = matchingRangeRings.some(function(rangeRing) { return rangeRing.toggled !== 1; });
    var newToggleValue = enableRings ? 1 : 0;
    matchingRangeRings.forEach(function(rangeRing) { rangeRing.toggled = newToggleValue; });

    drawRangeRings();
  }

  function clearRangeRings() {
    var map = View.getMap();
    rangeRingLayers.forEach(function(layer) { map.removeLayer(layer); });
    rangeRingLayers = [];
  }

  function clearAllRangeRings() {
    RangeRingStorage.setAllRangeRingToggleStates(0);
    clearRangeRings();
    updateRangeRingConfigCheckboxes();
  }

  function updateRangeRingConfigCheckboxes() {
    var tableBody = document.querySelector('#rangeRingTable tbody');
    if (!tableBody) { return; }

    var rangeRings = RangeRingStorage.getAllRangeRings();
    if (!Array.isArray(rangeRings) || !rangeRings.length) { return; }

    var toggleLookup = rangeRings.reduce(function(accumulator, rangeRing) {
      accumulator[createRangeRingKey(rangeRing.platform_name, rangeRing.system_name)] = rangeRing.toggled === 1;
      return accumulator;
    }, {});

    var rows = tableBody.querySelectorAll('tr[data-platform][data-system]');
    rows.forEach(function(row) {
      var checkbox = row.querySelector('.range-toggle');
      if (!checkbox) { return; }
      var key = createRangeRingKey(row.getAttribute('data-platform'), row.getAttribute('data-system'));
      if (Object.prototype.hasOwnProperty.call(toggleLookup, key)) {
        checkbox.checked = toggleLookup[key];
      }
    });
  }

  function createRangeRingKey(platformName, systemName) {
    return String(platformName) + '|' + String(systemName);
  }

  function getRangeRingStyle(rangeRing, side) {
    var fallbackColor = '#808080';
    if (typeof SideConfig !== 'undefined' && typeof SideConfig.getColorForSide === 'function') {
      fallbackColor = SideConfig.getColorForSide(side) || fallbackColor;
    } else if (side === 'blue') {
      fallbackColor = 'blue';
    } else if (side === 'red') {
      fallbackColor = 'red';
    }

    var style = rangeRing.style || {};
    return {
      color: style.color || fallbackColor,
      lineWidth: isFinite(style.lineWidth) ? style.lineWidth : 2,
      opacity: isFinite(style.opacity) ? style.opacity : 0.35
    };
  }

  function applyStyleToToggledRangeRings(template) {
    var rangeRings = RangeRingStorage.getAllRangeRings();
    if (!Array.isArray(rangeRings)) { return; }

    rangeRings.forEach(function(ring) {
      if (ring.toggled === 1) {
        ring.style = { color: template.color, lineWidth: template.lineWidth, opacity: template.opacity };
      }
    });

    drawRangeRings();
  }

  function setRangeRingOpacity(opacity) {
    var parsed = parseFloat(opacity);
    if (!isFinite(parsed)) { return; }
    parsed = Math.max(0, Math.min(1, parsed));

    RangeRingStorage.getAllRangeRings().forEach(function(ring) {
      ring.style = ring.style || {};
      ring.style.opacity = parsed;
    });

    drawRangeRings();
  }

  function getRangeRingOpacity() {
    var first = RangeRingStorage.getAllRangeRings()[0];
    var style = first && first.style ? first.style : {};
    return isFinite(style.opacity) ? style.opacity : 0.35;
  }

  return {
    drawRangeRings: drawRangeRings,
    drawRangeRingForPlatform: drawRangeRingForPlatform,
    clearRangeRings: clearRangeRings,
    clearAllRangeRings: clearAllRangeRings,
    applyStyleToToggledRangeRings: applyStyleToToggledRangeRings,
    setRangeRingOpacity: setRangeRingOpacity,
    getRangeRingOpacity: getRangeRingOpacity
  };
})();
