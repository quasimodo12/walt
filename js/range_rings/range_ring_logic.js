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
      .sort(function(a, b) { return getRangeMaxValue(b) - getRangeMaxValue(a); })
      .forEach(function(rangeRing) {
        var rangeBand = getRangeRingBand(rangeRing);
        if (!isValidRangeBand(rangeBand)) {
          return;
        }

        var style = getRangeRingStyle(rangeRing, platformSideLookup[rangeRing.platform_name]);
        var tooltipContent = createRangeBandTooltip(rangeRing, rangeBand);
        var outerCircle = L.circle([rangeRing.latitude, rangeRing.longitude], {
          radius: rangeBand.max,
          color: style.color,
          weight: style.lineWidth,
          opacity: style.opacity,
          fillOpacity: 0.01
        });

        outerCircle.bindTooltip(tooltipContent, {
          direction: 'top',
          sticky: true,
          className: 'range-ring-tooltip'
        });

        outerCircle.addTo(map);
        rangeRingLayers.push(outerCircle);

        if (rangeBand.min > 0) {
          var innerCircle = L.circle([rangeRing.latitude, rangeRing.longitude], {
            radius: rangeBand.min,
            color: style.color,
            weight: Math.max(1, Math.round(style.lineWidth * 0.75)),
            opacity: style.opacity,
            fillOpacity: 0,
            dashArray: '6 6'
          });

          innerCircle.addTo(map);
          rangeRingLayers.push(innerCircle);
        }
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

  function getRangeRingBand(rangeRing) {
    var min = parseRangeValue(rangeRing.range_min_val);
    var max = parseRangeValue(rangeRing.range_max_val);

    if (min === null) {
      min = 0;
    }
    if (max === null) {
      max = parseRangeValue(rangeRing.range_val);
    }

    return {
      min: min,
      max: max
    };
  }

  function getRangeMaxValue(rangeRing) {
    var rangeBand = getRangeRingBand(rangeRing);
    return rangeBand.max === null ? -Infinity : rangeBand.max;
  }

  function parseRangeValue(value) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.parseRange === 'function') {
      return RangeUtils.parseRange(value);
    }

    var parsed = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(parsed) ? parsed : null;
  }

  function isValidRangeBand(rangeBand) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.isValidRangeBand === 'function') {
      return RangeUtils.isValidRangeBand(rangeBand.min, rangeBand.max);
    }

    return isFinite(rangeBand.min) &&
      isFinite(rangeBand.max) &&
      rangeBand.min >= 0 &&
      rangeBand.max >= 0 &&
      rangeBand.min <= rangeBand.max;
  }

  function formatRangeValue(value) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.formatRange === 'function') {
      return RangeUtils.formatRange(value);
    }

    var parsed = parseRangeValue(value);
    return parsed === null ? 'Unknown' : parsed.toLocaleString();
  }

  function createRangeBandTooltip(rangeRing, rangeBand) {
    return [
      rangeRing.system_name || 'Unknown System',
      rangeRing.platform_name || 'Unknown Platform',
      'Min: ' + formatRangeValue(rangeBand.min) + ' m',
      'Max: ' + formatRangeValue(rangeBand.max) + ' m'
    ].join('<br>');
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
