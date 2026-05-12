(function () {
  'use strict';

  function normalizeSide(side) {
    return (typeof side === 'string' ? side.trim().toLowerCase() : '');
  }

  function pretty(obj) {
    return JSON.stringify(obj, null, 2);
  }

  function getAppContext() {
    if (window.opener && !window.opener.closed) {
      return window.opener;
    }
    return window;
  }

  function collectDataSources(app) {
    var platformData = [];
    var weaponData = [];
    var lethalityData = [];
    var distanceData = {};

    try {
      if (app.PlatformModel && typeof app.PlatformModel.getPlatformData === 'function') {
        platformData = app.PlatformModel.getPlatformData() || [];
      }
      if (app.WeaponStorage && typeof app.WeaponStorage.getWeaponData === 'function') {
        weaponData = app.WeaponStorage.getWeaponData() || [];
      }
      if (app.WeaponLethalityStorage && typeof app.WeaponLethalityStorage.getLethalityData === 'function') {
        lethalityData = app.WeaponLethalityStorage.getLethalityData() || [];
      }
      if (app.DistanceStorage && typeof app.DistanceStorage.getAllDistanceData === 'function') {
        distanceData = app.DistanceStorage.getAllDistanceData() || {};
      }
    } catch (err) {
      console.error('Missions data collection error:', err);
    }

    return {
      platforms: Array.isArray(platformData) ? platformData : [],
      weapons: Array.isArray(weaponData) ? weaponData : [],
      lethality: Array.isArray(lethalityData) ? lethalityData : [],
      distances: (distanceData && typeof distanceData === 'object') ? distanceData : {}
    };
  }

  function getAllPlatforms(data) { return data.platforms; }
  function getPlatformsBySide(data, side) {
    var sideNorm = normalizeSide(side);
    return data.platforms.filter(function (p) { return normalizeSide(p && p.side) === sideNorm; });
  }
  function getBluePlatforms(data) { return getPlatformsBySide(data, 'blue'); }
  function getRedPlatforms(data) { return getPlatformsBySide(data, 'red'); }
  function getAllWeapons(data) { return data.weapons; }
  function getLoadoutQuantitiesForPlatform(platform) {
    return (platform && platform.weapons && typeof platform.weapons === 'object') ? platform.weapons : {};
  }
  function getWeaponsAvailableToSelectedBlueShooters(selectedShooterNames, bluePlatforms, allWeapons) {
    var selectedSet = new Set(selectedShooterNames);
    var weaponNameSet = new Set();

    bluePlatforms.forEach(function (platform) {
      if (!selectedSet.has(platform.platform_name)) {
        return;
      }
      var loadout = getLoadoutQuantitiesForPlatform(platform);
      Object.keys(loadout).forEach(function (weaponName) {
        var qty = parseInt(loadout[weaponName], 10);
        if (!isNaN(qty) && qty > 0) {
          weaponNameSet.add(weaponName);
        }
      });
    });

    return allWeapons.filter(function (w) {
      return weaponNameSet.has(w.weapon_name);
    });
  }
  function getWeaponRangeData(weapon) {
    return weapon && weapon.max_range !== undefined ? weapon.max_range : null;
  }
  function getWeaponLethalityData(data) { return data.lethality; }
  function getPlatformToPlatformDistanceData(data) { return data.distances; }

  function buildFilterOptionLists(data, selectedShooters) {
    var bluePlatforms = getBluePlatforms(data);
    var redPlatforms = getRedPlatforms(data);
    var allWeapons = getAllWeapons(data);
    var availableWeapons = selectedShooters.length > 0
      ? getWeaponsAvailableToSelectedBlueShooters(selectedShooters, bluePlatforms, allWeapons)
      : getWeaponsAvailableToSelectedBlueShooters(bluePlatforms.map(function (p) { return p.platform_name; }), bluePlatforms, allWeapons);

    return {
      blueShooters: bluePlatforms.map(function (p) { return p.platform_name; }).sort(),
      redTargets: redPlatforms.map(function (p) { return p.platform_name; }).sort(),
      blueWeapons: availableWeapons.map(function (w) { return w.weapon_name; }).sort(),
      offensivePlatformTypes: Array.from(new Set(bluePlatforms.map(function (p) { return p.type || 'Unspecified'; }))).sort(),
      targetPlatformTypes: Array.from(new Set(redPlatforms.map(function (p) { return p.type || 'Unspecified'; }))).sort()
    };
  }

  function validateSelectedFilters(filters) {
    var errors = [];
    if (!filters.blueShooters.length) errors.push('Select at least one Blue shooter before generating missions.');
    if (!filters.redTargets.length) errors.push('Select at least one Red target before generating missions.');
    if (!filters.blueWeapons.length) errors.push('Select at least one Blue weapon before generating missions.');
    return errors;
  }

  function validateRequiredMissionData(data, options) {
    var messages = [];
    if (!data.platforms.length) messages.push('No platforms found in application data.');
    if (!options.blueShooters.length) messages.push('No Blue platforms found because no platform side field matched "Blue".');
    if (!options.redTargets.length) messages.push('No Red platforms found because platform side data is missing or no side matched "Red".');
    if (!data.weapons.length) messages.push('No weapon records found in application data.');
    if (!options.blueWeapons.length) messages.push('No Blue weapons found because selected/all Blue platforms have no valid loadout data.');
    return messages;
  }

  function createReadiness(data, filters) {
    var bluePlatforms = getBluePlatforms(data);
    var redPlatforms = getRedPlatforms(data);
    var selectedBlue = bluePlatforms.filter(function (p) { return filters.blueShooters.indexOf(p.platform_name) >= 0; });
    var selectedRed = redPlatforms.filter(function (p) { return filters.redTargets.indexOf(p.platform_name) >= 0; });
    var distanceMap = getPlatformToPlatformDistanceData(data);

    var hasLoadouts = selectedBlue.every(function (p) { return Object.keys(getLoadoutQuantitiesForPlatform(p)).length > 0; });
    var targetTypes = new Set(selectedRed.map(function (p) { return p.type || 'Unspecified'; }));
    var lethalityMatches = data.lethality.filter(function (entry) {
      return filters.blueWeapons.indexOf(entry.weapon) >= 0 && targetTypes.has(entry.platformType);
    });

    var distanceHits = 0;
    selectedBlue.forEach(function (s) {
      selectedRed.forEach(function (t) {
        if (distanceMap[s.platform_name + '---' + t.platform_name] || distanceMap[t.platform_name + '---' + s.platform_name]) {
          distanceHits += 1;
        }
      });
    });

    var blockingProblems = validateSelectedFilters(filters).slice();
    if (!hasLoadouts) blockingProblems.push('One or more selected Blue shooters do not have weapon loadout data.');
    if (!lethalityMatches.length) blockingProblems.push('No lethality data found for selected Blue weapons against selected Red target platform types.');
    if (!distanceHits) blockingProblems.push('No distance data found between selected Blue shooters and selected Red targets.');

    return {
      requiredFiltersValid: blockingProblems.length === 0 || blockingProblems.every(function (m) { return m.indexOf('Select at least one') !== -1 ? false : true; }) === false ? validateSelectedFilters(filters).length === 0 : false,
      selectedBlueShooters: filters.blueShooters,
      selectedRedTargets: filters.redTargets,
      selectedBlueWeapons: filters.blueWeapons,
      candidateShooterCount: selectedBlue.length,
      candidateTargetCount: selectedRed.length,
      candidateWeaponCount: filters.blueWeapons.length,
      loadoutDataExistsForSelectedShooters: hasLoadouts,
      lethalityDataExistsForSelectedWeaponsAgainstSelectedTargetTypes: lethalityMatches.length > 0,
      distanceDataExistsBetweenSelectedShootersAndTargets: distanceHits > 0,
      roughCandidatePairCount: selectedBlue.length * selectedRed.length,
      blockingProblems: blockingProblems
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('missions-root');
    var app = getAppContext();
    var data = collectDataSources(app);

    var state = {
      filters: {
        blueShooters: [],
        redTargets: [],
        blueWeapons: [],
        optional: {
          offensivePlatformTypes: [],
          targetPlatformTypes: [],
          minDestroyedPlatforms: 0,
          maxDestroyedPlatforms: 999
        },
        advanced: {
          maxMissions: 250,
          maxCandidateEngagements: 20000,
          maxSearchDepth: 6,
          maxKillsPerMission: 20,
          includeMixedWeaponEngagements: true,
          allowMultiPlatformEngagements: true,
          maxContributingPlatformsPerEngagement: 4,
          maxContributingWeaponsPerEngagement: 6,
          overkillTolerance: 0,
          debugLoggingVerbosity: 'normal'
        }
      }
    };

    function selectedValues(selectEl) {
      return Array.from(selectEl.selectedOptions).map(function (o) { return o.value; });
    }

    function render() {
      var options = buildFilterOptionLists(data, state.filters.blueShooters);
      var diagnostics = [];
      diagnostics.push('Total platforms found: ' + getAllPlatforms(data).length);
      diagnostics.push('Blue platforms found: ' + getBluePlatforms(data).length);
      diagnostics.push('Red platforms found: ' + getRedPlatforms(data).length);
      diagnostics.push('Total weapons found: ' + getAllWeapons(data).length);
      diagnostics.push('Blue weapons/loadout weapons found: ' + options.blueWeapons.length);
      diagnostics.push('Lethality records found: ' + getWeaponLethalityData(data).length);
      diagnostics.push('Distance records found: ' + Object.keys(getPlatformToPlatformDistanceData(data)).length);
      diagnostics.push('Platform sides recognized: ' + (getBluePlatforms(data).length + getRedPlatforms(data).length > 0));
      diagnostics.push('Platform types recognized: ' + data.platforms.every(function (p) { return !!p.type; }));

      var requiredDataWarnings = validateRequiredMissionData(data, options);
      Array.prototype.push.apply(diagnostics, requiredDataWarnings);

      root.innerHTML = `
        <section class="missions-card">
          <h2>Mission Filters</h2>
          <div class="filters-grid">
            <label>Blue shooters*<select id="blueShooters" multiple size="8"></select></label>
            <label>Red targets*<select id="redTargets" multiple size="8"></select></label>
            <label>Blue weapons*<select id="blueWeapons" multiple size="8"></select></label>
            <label>Offensive platform types<select id="offensiveTypes" multiple size="6"></select></label>
            <label>Target platform types<select id="targetTypes" multiple size="6"></select></label>
          </div>
          <details><summary>Advanced Generation Settings</summary>
            <div class="advanced-grid">
              <label>Max missions<input id="maxMissions" type="number" min="1" value="${state.filters.advanced.maxMissions}"></label>
              <label>Max candidate engagements<input id="maxCandidateEngagements" type="number" min="1" value="${state.filters.advanced.maxCandidateEngagements}"></label>
              <label>Max search depth<input id="maxSearchDepth" type="number" min="1" value="${state.filters.advanced.maxSearchDepth}"></label>
              <label>Include mixed weapon engagements<input id="includeMixedWeaponEngagements" type="checkbox" ${state.filters.advanced.includeMixedWeaponEngagements ? 'checked' : ''}></label>
            </div>
          </details>
          <div id="validationErrors" class="validation"></div>
          <button id="generateMissionsButton" type="button">Generate Missions</button>
        </section>
        <section class="missions-card"><h2>Mission Input / Filter JSON</h2><pre id="inputJson"></pre></section>
        <section class="missions-card"><h2>Mission Data Diagnostic Log</h2><pre id="diagnosticLog"></pre></section>
      `;

      function fillSelect(id, values, selected) {
        var el = document.getElementById(id);
        el.innerHTML = values.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        selected.forEach(function (s) {
          var opt = Array.from(el.options).find(function (o) { return o.value === s; });
          if (opt) opt.selected = true;
        });
      }

      fillSelect('blueShooters', options.blueShooters, state.filters.blueShooters);
      fillSelect('redTargets', options.redTargets, state.filters.redTargets);
      fillSelect('blueWeapons', options.blueWeapons, state.filters.blueWeapons.filter(function (w) { return options.blueWeapons.indexOf(w) >= 0; }));
      fillSelect('offensiveTypes', options.offensivePlatformTypes, state.filters.optional.offensivePlatformTypes);
      fillSelect('targetTypes', options.targetPlatformTypes, state.filters.optional.targetPlatformTypes);

      var validationErrors = validateSelectedFilters(state.filters);
      document.getElementById('validationErrors').innerHTML = validationErrors.map(function (e) { return '<div>' + e + '</div>'; }).join('');
      document.getElementById('generateMissionsButton').disabled = validationErrors.length > 0;

      document.getElementById('inputJson').textContent = pretty({
        selectedBlueShooters: state.filters.blueShooters,
        selectedRedTargets: state.filters.redTargets,
        selectedBlueWeapons: state.filters.blueWeapons,
        selectedOptionalFilters: state.filters.optional,
        selectedAdvancedGenerationSettings: state.filters.advanced
      });
      document.getElementById('diagnosticLog').textContent = diagnostics.join('\n');

      document.getElementById('blueShooters').addEventListener('change', function (e) {
        state.filters.blueShooters = selectedValues(e.target);
        state.filters.blueWeapons = [];
        render();
      });
      document.getElementById('redTargets').addEventListener('change', function (e) {
        state.filters.redTargets = selectedValues(e.target);
        render();
      });
      document.getElementById('blueWeapons').addEventListener('change', function (e) {
        state.filters.blueWeapons = selectedValues(e.target);
        render();
      });
      document.getElementById('offensiveTypes').addEventListener('change', function (e) {
        state.filters.optional.offensivePlatformTypes = selectedValues(e.target);
        render();
      });
      document.getElementById('targetTypes').addEventListener('change', function (e) {
        state.filters.optional.targetPlatformTypes = selectedValues(e.target);
        render();
      });
      document.getElementById('maxMissions').addEventListener('change', function (e) { state.filters.advanced.maxMissions = parseInt(e.target.value, 10) || 250; render(); });
      document.getElementById('maxCandidateEngagements').addEventListener('change', function (e) { state.filters.advanced.maxCandidateEngagements = parseInt(e.target.value, 10) || 20000; render(); });
      document.getElementById('maxSearchDepth').addEventListener('change', function (e) { state.filters.advanced.maxSearchDepth = parseInt(e.target.value, 10) || 6; render(); });
      document.getElementById('includeMixedWeaponEngagements').addEventListener('change', function (e) { state.filters.advanced.includeMixedWeaponEngagements = e.target.checked; render(); });

      document.getElementById('generateMissionsButton').addEventListener('click', function () {
        var readiness = createReadiness(data, state.filters);
        document.getElementById('inputJson').textContent = pretty({
          selectedBlueShooters: state.filters.blueShooters,
          selectedRedTargets: state.filters.redTargets,
          selectedBlueWeapons: state.filters.blueWeapons,
          selectedOptionalFilters: state.filters.optional,
          selectedAdvancedGenerationSettings: state.filters.advanced,
          missionGenerationReadiness: readiness
        });
      });
    }

    render();
  });
})();
