(function () {
  'use strict';

  function normalizeSide(side) { return String(side || '').trim().toLowerCase(); }
  function num(v, d) { var n = Number(v); return Number.isFinite(n) ? n : d; }
  function pretty(obj) { return JSON.stringify(obj, null, 2); }
  function selectedValues(el) { return Array.from(el.selectedOptions).map(function (o) { return o.value; }); }

  function getAppContext() {
    try { if (window.opener && !window.opener.closed) return window.opener; } catch (_) {}
    return window;
  }

  function collectData(app) {
    var platforms = app.PlatformModel && app.PlatformModel.getPlatformData ? (app.PlatformModel.getPlatformData() || []) : [];
    var weapons = app.WeaponStorage && app.WeaponStorage.getWeaponData ? (app.WeaponStorage.getWeaponData() || []) : [];
    var lethality = app.WeaponLethalityStorage && app.WeaponLethalityStorage.getLethalityData ? (app.WeaponLethalityStorage.getLethalityData() || []) : [];
    var distances = app.DistanceStorage && app.DistanceStorage.getAllDistanceData ? (app.DistanceStorage.getAllDistanceData() || {}) : {};
    return { platforms: platforms, weapons: weapons, lethality: lethality, distances: distances };
  }

  function loadoutMap(platform) {
    var out = {};
    if (!platform || !platform.weapons) return out;
    if (Array.isArray(platform.weapons)) platform.weapons.forEach(function (w) { if (w && w.name) out[w.name] = num(w.quantity, 0); });
    else Object.keys(platform.weapons).forEach(function (k) { out[k] = num(platform.weapons[k], 0); });
    return out;
  }

  function getDistance(data, shooterName, targetName) {
    return data.distances[shooterName + '---' + targetName] || data.distances[targetName + '---' + shooterName] || null;
  }

  function getWeaponRange(weapon) { return num(weapon && (weapon.weapon_range ?? weapon.max_range), NaN); }

  function lethalityRequired(lethalityData, weaponName, targetType) {
    var row = lethalityData.find(function (x) { return x.weapon === weaponName && x.platformType === targetType; });
    if (!row) return null;
    return num(row.quantity, null);
  }

  function buildCandidates(data, state, log) {
    var byName = {}; data.platforms.forEach(function (p) { byName[p.platform_name] = p; });
    var weaponByName = {}; data.weapons.forEach(function (w) { weaponByName[w.weapon_name] = w; });
    var shooters = state.filters.blueShooters.map(function (n) { return byName[n]; }).filter(Boolean).filter(function (p) { return normalizeSide(p.side) === 'blue'; });
    var targets = state.filters.redTargets.map(function (n) { return byName[n]; }).filter(Boolean).filter(function (p) { return normalizeSide(p.side) === 'red'; });
    var selectedWeapons = state.filters.blueWeapons;
    var single = [];

    targets.forEach(function (t) {
      shooters.forEach(function (s) {
        var dist = getDistance(data, s.platform_name, t.platform_name);
        selectedWeapons.forEach(function (wName) {
          var loadout = loadoutMap(s);
          var ammo = num(loadout[wName], 0);
          if (ammo <= 0) { log.push('reject no ammo/loadout: ' + s.platform_name + ' ' + wName); return; }
          var req = lethalityRequired(data.lethality, wName, t.type || 'Unspecified');
          if (!req || req <= 0) { log.push('reject missing lethality: ' + wName + ' -> ' + (t.type || 'Unspecified')); return; }
          var wr = getWeaponRange(weaponByName[wName]);
          if (!Number.isFinite(wr) || !dist || dist > wr) { log.push('reject range: ' + s.platform_name + ' to ' + t.platform_name + ' with ' + wName); return; }
          if (ammo < 1) return;
          var alloc = Math.min(ammo, req + state.filters.advanced.overkillTolerance);
          if (alloc < req) { log.push('reject insufficient ammo: ' + s.platform_name + ' ' + wName + ' need ' + req + ' have ' + ammo); return; }
          single.push({
            id: 'S-' + single.length,
            target: t.platform_name,
            targetType: t.type || 'Unspecified',
            targetSide: t.side,
            allocations: [{ shooter: s.platform_name, shooterType: s.type || 'Unspecified', weapon: wName, qty: req, required: req }],
            contribution: 1,
            totalAmmo: req,
            valid: true
          });
        });
      });
    });

    var mixed = [];
    if (state.filters.advanced.includeMixedWeaponEngagements) {
      targets.forEach(function (t) {
        var contributors = [];
        shooters.forEach(function (s) {
          var dist = getDistance(data, s.platform_name, t.platform_name);
          selectedWeapons.forEach(function (wName) {
            var req = lethalityRequired(data.lethality, wName, t.type || 'Unspecified');
            var ammo = num(loadoutMap(s)[wName], 0);
            var wr = getWeaponRange(weaponByName[wName]);
            if (req > 0 && ammo > 0 && dist && Number.isFinite(wr) && dist <= wr) contributors.push({ s: s, w: wName, ammo: ammo, req: req });
          });
        });
        contributors.sort(function (a, b) { return (b.ammo / b.req) - (a.ammo / a.req); });
        var use = contributors.slice(0, state.filters.advanced.maxContributingWeaponsPerEngagement);
        var contribution = 0; var allocations = [];
        use.forEach(function (c) {
          if (contribution >= 1) return;
          var needed = Math.ceil((1 - contribution) * c.req);
          var qty = Math.min(needed, c.ammo);
          if (qty <= 0) return;
          var cval = qty / c.req;
          contribution += cval;
          allocations.push({ shooter: c.s.platform_name, shooterType: c.s.type || 'Unspecified', weapon: c.w, qty: qty, required: c.req });
        });
        if (contribution >= 1 && allocations.length > 1) {
          mixed.push({ id: 'M-' + mixed.length, target: t.platform_name, targetType: t.type || 'Unspecified', targetSide: t.side, allocations: allocations, contribution: contribution, totalAmmo: allocations.reduce(function (a, x) { return a + x.qty; }, 0), valid: true });
        }
      });
    }

    return { shooters: shooters, targets: targets, single: single, mixed: mixed };
  }

  function canApplyEngagement(mission, e, ammoRemaining) {
    if (mission.destroyedSet[e.target]) return false;
    for (var i = 0; i < e.allocations.length; i++) {
      var a = e.allocations[i];
      var key = a.shooter + '|' + a.weapon;
      if (num(ammoRemaining[key], 0) < a.qty) return false;
    }
    return true;
  }

  function applyEngagement(mission, e, ammoRemaining) {
    mission.engagements.push(e); mission.destroyedSet[e.target] = true;
    e.allocations.forEach(function (a) {
      var key = a.shooter + '|' + a.weapon;
      ammoRemaining[key] = num(ammoRemaining[key], 0) - a.qty;
      mission.totalAmmo += a.qty;
      mission.ammoByWeapon[a.weapon] = num(mission.ammoByWeapon[a.weapon], 0) + a.qty;
      mission.weaponsUsed[a.weapon] = true;
      mission.offensivePlatforms[a.shooter] = true;
      mission.offensiveTypes[a.shooterType] = true;
    });
    mission.targetsDestroyed[e.target] = true;
    mission.targetTypesDestroyed[e.targetType] = true;
  }

  function materializeMission(m, id) {
    return {
      missionId: 'mission-' + id,
      offensiveSide: 'Blue',
      targetSide: 'Red',
      engagements: m.engagements.map(function (e, idx) { return { engagementId: e.id || ('E-' + idx), targetPlatform: e.target, targetPlatformType: e.targetType, targetPlatformSide: e.targetSide, contributingOffensivePlatforms: Array.from(new Set(e.allocations.map(function (a) { return a.shooter; }))), contributingOffensivePlatformTypes: Array.from(new Set(e.allocations.map(function (a) { return a.shooterType; }))), weaponAllocations: e.allocations, totalAmmoExpended: e.totalAmmo, contributionValue: e.contribution, lethalitySatisfied: e.contribution >= 1 }; }),
      offensivePlatformsUsed: Object.keys(m.offensivePlatforms), offensivePlatformTypesUsed: Object.keys(m.offensiveTypes), targetPlatformsDestroyed: Object.keys(m.targetsDestroyed), targetPlatformTypesDestroyed: Object.keys(m.targetTypesDestroyed), weaponsUsed: Object.keys(m.weaponsUsed), destroyedPlatformCount: Object.keys(m.targetsDestroyed).length, totalAmmoExpended: m.totalAmmo, ammoExpendedByWeapon: m.ammoByWeapon
    };
  }

  function generateMissions(data, state) {
    var log = [];
    var reqErr = [];
    if (!state.filters.blueShooters.length) reqErr.push('no Blue shooters were selected');
    if (!state.filters.redTargets.length) reqErr.push('no Red targets were selected');
    if (!state.filters.blueWeapons.length) reqErr.push('no Blue weapons were selected');
    if (reqErr.length) return { missions: [], log: reqErr };

    log.push('selected required filters: ' + pretty({ blueShooters: state.filters.blueShooters, redTargets: state.filters.redTargets, blueWeapons: state.filters.blueWeapons }));
    var c = buildCandidates(data, state, log);
    log.push('candidate Blue shooters: ' + c.shooters.length);
    log.push('candidate Red targets: ' + c.targets.length);
    log.push('candidate Blue weapons: ' + state.filters.blueWeapons.length);
    log.push('single-weapon candidates: ' + c.single.length);
    log.push('mixed-weapon candidates: ' + c.mixed.length);

    var all = c.single.concat(c.mixed).slice(0, state.filters.advanced.maxCandidateEngagements);
    var ammoStart = {};
    c.shooters.forEach(function (s) { var lm = loadoutMap(s); Object.keys(lm).forEach(function (w) { ammoStart[s.platform_name + '|' + w] = num(lm[w], 0); }); });
    var missions = [];
    var maxDepth = Math.min(state.filters.advanced.maxSearchDepth, state.filters.advanced.maxKillsPerMission, c.targets.length);

    function dfs(idx, mission, ammoRemaining) {
      if (missions.length >= state.filters.advanced.maxMissions) return;
      if (idx >= all.length || mission.engagements.length >= maxDepth) { if (mission.engagements.length) missions.push(materializeMission(mission, missions.length + 1)); return; }
      dfs(idx + 1, mission, ammoRemaining);
      var e = all[idx];
      if (canApplyEngagement(mission, e, ammoRemaining)) {
        var m2 = JSON.parse(JSON.stringify(mission));
        var a2 = JSON.parse(JSON.stringify(ammoRemaining));
        applyEngagement(m2, e, a2);
        dfs(idx + 1, m2, a2);
      } else log.push('duplicate-target or ammo rejection for ' + e.id + ' target ' + e.target);
    }
    dfs(0, { engagements: [], destroyedSet: {}, totalAmmo: 0, ammoByWeapon: {}, weaponsUsed: {}, offensivePlatforms: {}, offensiveTypes: {}, targetsDestroyed: {}, targetTypesDestroyed: {} }, ammoStart);

    missions.sort(function (a, b) { if (b.destroyedPlatformCount !== a.destroyedPlatformCount) return b.destroyedPlatformCount - a.destroyedPlatformCount; if (a.totalAmmoExpended !== b.totalAmmoExpended) return a.totalAmmoExpended - b.totalAmmoExpended; return a.missionId.localeCompare(b.missionId); });
    if (!missions.length) log.push('reason if no missions were generated: no valid mission combinations met constraints.');
    log.push('final number of generated missions: ' + missions.length);
    return { missions: missions, log: log };
  }

  function init() {
    var data = collectData(getAppContext());
    var root = document.getElementById('missions-root');
    var state = { filters: { blueShooters: [], redTargets: [], blueWeapons: [], advanced: { maxMissions: 250, maxCandidateEngagements: 500, maxSearchDepth: 5, maxKillsPerMission: 10, includeMixedWeaponEngagements: true, maxContributingWeaponsPerEngagement: 4, overkillTolerance: 0 } } };
    var blues = data.platforms.filter(function (p) { return normalizeSide(p.side) === 'blue'; });
    var reds = data.platforms.filter(function (p) { return normalizeSide(p.side) === 'red'; });
    var blueWeaponSet = {};
    blues.forEach(function (p) { var lm = loadoutMap(p); Object.keys(lm).forEach(function (w) { if (lm[w] > 0) blueWeaponSet[w] = true; }); });
    document.getElementById('blueShooters').innerHTML = blues.map(function (p) { return '<option value="' + p.platform_name + '">' + p.platform_name + '</option>'; }).join('');
    document.getElementById('redTargets').innerHTML = reds.map(function (p) { return '<option value="' + p.platform_name + '">' + p.platform_name + '</option>'; }).join('');
    document.getElementById('blueWeapons').innerHTML = Object.keys(blueWeaponSet).sort().map(function (w) { return '<option value="' + w + '">' + w + '</option>'; }).join('');

    function refreshInput() { document.getElementById('inputJson').textContent = pretty({ selectedFilters: state.filters }); }
    ['blueShooters', 'redTargets', 'blueWeapons'].forEach(function (id) { document.getElementById(id).addEventListener('change', function (e) { state.filters[id] = selectedValues(e.target); refreshInput(); }); });
    document.getElementById('generateMissionsButton').addEventListener('click', function () {
      var res = generateMissions(data, state);
      document.getElementById('inputJson').textContent = pretty(res.missions);
      document.getElementById('diagnosticLog').textContent = res.log.join('\n');
      document.getElementById('validationErrors').textContent = res.missions.length ? '' : 'No missions generated. See Mission Generation Log.';
    });

    document.getElementById('diagnosticLog').textContent = ['Total platforms found: ' + data.platforms.length, 'Blue platforms found: ' + blues.length, 'Red platforms found: ' + reds.length, 'Total weapons found: ' + data.weapons.length, 'Lethality records found: ' + data.lethality.length, 'Distance records found: ' + Object.keys(data.distances).length].join('\n');
    refreshInput();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
