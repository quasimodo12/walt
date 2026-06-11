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
        var maxRange = getRangeMaxValue(rangeRing);
        var minRange = getRangeMinValue(rangeRing);
        if (!isFinite(maxRange)) { return; }

        var style = getRangeRingStyle(rangeRing, platformSideLookup[rangeRing.platform_name]);
        var outerCircle = L.circle([rangeRing.latitude, rangeRing.longitude], {
          radius: maxRange,
          color: style.color,
          weight: style.lineWidth,
          opacity: style.opacity,
          fillOpacity: 0.01
        });

        var tooltipContent = [
          rangeRing.system_name || 'Unknown System',
          rangeRing.platform_name || 'Unknown Platform',
          'Min: ' + formatRangeValue(minRange) + ' m',
          'Max: ' + formatRangeValue(maxRange) + ' m'
        ].join('<br>');

        outerCircle.bindTooltip(tooltipContent, {
          direction: 'top',
          sticky: true,
          className: 'range-ring-tooltip'
        });

        outerCircle.addTo(map);
        rangeRingLayers.push(outerCircle);

        if (isFinite(minRange) && minRange > 0) {
          var innerCircle = L.circle([rangeRing.latitude, rangeRing.longitude], {
            radius: minRange,
            color: style.color,
            weight: Math.max(1, style.lineWidth - 1),
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


  function getRangeMinValue(rangeRing) {
    var value = rangeRing && rangeRing.range_min_val;
    if (value === undefined && rangeRing) {
      value = rangeRing.min_range_val;
    }
    if (value === undefined) {
      value = 0;
    }
    var parsed = parseRangeValue(value);
    return parsed === null ? 0 : parsed;
  }

  function getRangeMaxValue(rangeRing) {
    var value = rangeRing && rangeRing.range_max_val;
    if (value === undefined && rangeRing) {
      value = rangeRing.max_range_val;
    }
    if (value === undefined && rangeRing) {
      value = rangeRing.range_val;
    }
    var parsed = parseRangeValue(value);
    return parsed === null ? NaN : parsed;
  }

  function parseRangeValue(value) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.parseRange === 'function') {
      return RangeUtils.parseRange(value);
    }
    if (value === undefined || value === null || value === '') {
      return null;
    }
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : null;
  }

  function formatRangeValue(value) {
    if (typeof RangeUtils !== 'undefined' && typeof RangeUtils.formatRange === 'function') {
      return RangeUtils.formatRange(value);
    }
    var parsed = parseRangeValue(value);
    return parsed === null ? 'Unknown' : parsed.toLocaleString();
  }

  function clearRangeRings() {
    var map = View.getMap();
    rangeRingLayers.forEach(function(layer) { map.removeLayer(layer); });
    rangeRingLayers = [];
  }

  function clearAllRangeRings() {
    RangeRingStorage.setAllRangeRingToggleStates(0);
    drawRangeRings();
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
    clearRangeRings: clearRangeRings,
    clearAllRangeRings: clearAllRangeRings,
    applyStyleToToggledRangeRings: applyStyleToToggledRangeRings,
    setRangeRingOpacity: setRangeRingOpacity,
    getRangeRingOpacity: getRangeRingOpacity
  };
})();
