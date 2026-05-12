(function () {
  'use strict';

  function n(v) { return (v || '').toString().trim(); }
  function side(v) { return n(v).toLowerCase(); }
  function pretty(v) { return JSON.stringify(v, null, 2); }
  function uniq(a) { return Array.from(new Set(a)); }
  function byName(arr, key) { var m = {}; arr.forEach(function (x) { m[n(x[key])] = x; }); return m; }

  function getApp() {
    try { if (window.opener && !window.opener.closed) return window.opener; } catch (e) {}
    return window;
  }

  function collectData(app) {
    return {
      platforms: app.PlatformModel && app.PlatformModel.getPlatformData ? (app.PlatformModel.getPlatformData() || []) : [],
      weapons: app.WeaponStorage && app.WeaponStorage.getWeaponData ? (app.WeaponStorage.getWeaponData() || []) : [],
      lethality: app.WeaponLethalityStorage && app.WeaponLethalityStorage.getLethalityData ? (app.WeaponLethalityStorage.getLethalityData() || []) : [],
      distances: app.DistanceStorage && app.DistanceStorage.getAllDistanceData ? (app.DistanceStorage.getAllDistanceData() || {}) : {}
    };
  }

  function loadoutMap(platform) {
    var out = {};
    var w = platform && platform.weapons;
    if (Array.isArray(w)) w.forEach(function (x) { if (x && x.name) out[n(x.name)] = parseInt(x.quantity, 10) || 0; });
    else if (w && typeof w === 'object') Object.keys(w).forEach(function (k) { out[n(k)] = parseInt(w[k], 10) || 0; });
    return out;
  }

  function rangeOfWeapon(weapon) { return parseFloat(weapon.weapon_range || weapon.max_range || 0) || 0; }
  function distanceBetween(dist, a, b) { return parseFloat(dist[n(a) + '---' + n(b)] || dist[n(b) + '---' + n(a)] || Infinity); }
  function lethalityKey(w, t) { return n(w) + '||' + n(t); }

  function parseLethality(lethalityRows) {
    var map = {};
    lethalityRows.forEach(function (r) {
      var key = lethalityKey(r.weapon || r.weapon_name, r.platformType || r.platform_type || r.targetType);
      var qty = parseFloat(r.quantity || r.required || r.shots || r.lethality);
      if (key && qty > 0) map[key] = qty;
    });
    return map;
  }

  function missionSummary(mission) {
    mission.destroyedPlatformCount = mission.targetPlatformsDestroyed.length;
    mission.totalAmmoExpended = Object.values(mission.ammoExpendedByWeapon).reduce(function (a, b) { return a + b; }, 0);
    mission.offensivePlatformsUsed = Object.keys(mission.killsByOffensivePlatform);
    mission.offensivePlatformTypesUsed = Object.keys(mission.killsByOffensivePlatformType);
    mission.weaponsUsed = Object.keys(mission.killsByWeapon);
    mission.targetPlatformTypesDestroyed = Object.keys(mission.killsAgainstTargetPlatformType || {});
  }

  function generate(data, filters, adv, optional) {
    var logs = [];
    var blue = data.platforms.filter(function (p) { return side(p.side) === 'blue' && filters.blueShooters.indexOf(p.platform_name) >= 0; });
    var red = data.platforms.filter(function (p) { return side(p.side) === 'red' && filters.redTargets.indexOf(p.platform_name) >= 0; });
    var weaponByName = byName(data.weapons, 'weapon_name');
    var leth = parseLethality(data.lethality);
    var candidates = [];
    var reject = { range: 0, lethality: 0, ammo: 0, loadout: 0, weaponMissing: 0 };

    logs.push('selected required filters=' + pretty(filters));
    logs.push('selected optional filters=' + pretty(optional));
    logs.push('selected advanced settings=' + pretty(adv));

    red.forEach(function (target) {
      var tType = target.type || 'Unspecified';
      var contributors = [];
      blue.forEach(function (shooter) {
        var loadout = loadoutMap(shooter);
        filters.blueWeapons.forEach(function (weaponName) {
          var ammo = loadout[weaponName] || 0;
          if (ammo <= 0) { reject.loadout += 1; return; }
          var w = weaponByName[weaponName];
          if (!w) { reject.weaponMissing += 1; return; }
          var req = leth[lethalityKey(weaponName, tType)];
          if (!req) { reject.lethality += 1; return; }
          var d = distanceBetween(data.distances, shooter.platform_name, target.platform_name);
          if (d > rangeOfWeapon(w)) { reject.range += 1; return; }
          contributors.push({ shooter: shooter, weapon: weaponName, req: req, ammo: ammo, contributionPerRound: 1 / req });
        });
      });

      // single weapon candidates
      contributors.forEach(function (c) {
        var need = Math.ceil(c.req);
        if (c.ammo < need) { reject.ammo += 1; return; }
        candidates.push({
          target: target,
          allocations: [{ shooter: c.shooter.platform_name, shooterType: c.shooter.type || 'Unspecified', weapon: c.weapon, qty: need, contribution: need / c.req }],
          contribution: need / c.req,
          ammo: need
        });
      });

      // mixed candidates
      if (adv.includeMixedWeaponEngagements) {
        contributors.sort(function (a, b) { return b.contributionPerRound - a.contributionPerRound; });
        var chosen = [];
        var sum = 0;
        for (var i = 0; i < contributors.length && chosen.length < adv.maxContributingWeaponsPerEngagement; i++) {
          var c2 = contributors[i];
          var canUse = Math.min(c2.ammo, Math.ceil((1 - sum) * c2.req));
          if (canUse <= 0) continue;
          chosen.push({ shooter: c2.shooter.platform_name, shooterType: c2.shooter.type || 'Unspecified', weapon: c2.weapon, qty: canUse, contribution: canUse / c2.req });
          sum += canUse / c2.req;
          if (sum >= 1) break;
        }
        if (sum >= 1 && chosen.length > 1) {
          candidates.push({ target: target, allocations: chosen, contribution: sum, ammo: chosen.reduce(function (s, x) { return s + x.qty; }, 0) });
        }
      }
    });

    logs.push('candidate single+mixed engagement options=' + candidates.length);
    logs.push('rejections=' + pretty(reject));

    var byTarget = {};
    candidates.forEach(function (c) { var t = c.target.platform_name; (byTarget[t] = byTarget[t] || []).push(c); });

    var missions = [];
    var targetList = Object.keys(byTarget).slice(0, adv.maxSearchDepth);

    function dfs(ti, usedAmmo, engagements) {
      if (missions.length >= adv.maxMissions) return;
      if (ti >= targetList.length) {
        if (!engagements.length) return;
        var mission = {
          missionId: 'mission-' + (missions.length + 1), offensiveSide: 'Blue', targetSide: 'Red', engagements: engagements.slice(),
          targetPlatformsDestroyed: engagements.map(function (e) { return e.targetPlatform; }),
          ammoExpendedByWeapon: {}, killsByWeapon: {}, killsByOffensivePlatform: {}, killsByOffensivePlatformType: {}, killsAgainstTargetPlatformType: {}
        };
        engagements.forEach(function (e) {
          mission.killsAgainstTargetPlatformType[e.targetPlatformType] = (mission.killsAgainstTargetPlatformType[e.targetPlatformType] || 0) + 1;
          var credited = {};
          e.weaponAllocations.forEach(function (a) {
            mission.ammoExpendedByWeapon[a.weapon] = (mission.ammoExpendedByWeapon[a.weapon] || 0) + a.quantity;
            if (!credited[a.weapon]) { mission.killsByWeapon[a.weapon] = (mission.killsByWeapon[a.weapon] || 0) + 1; credited[a.weapon] = true; }
            mission.killsByOffensivePlatform[a.offensivePlatform] = (mission.killsByOffensivePlatform[a.offensivePlatform] || 0) + 1;
            mission.killsByOffensivePlatformType[a.offensivePlatformType] = (mission.killsByOffensivePlatformType[a.offensivePlatformType] || 0) + 1;
          });
        });
        missionSummary(mission);
        if (mission.destroyedPlatformCount >= optional.minDestroyedPlatforms && mission.destroyedPlatformCount <= optional.maxDestroyedPlatforms) missions.push(mission);
        return;
      }

      dfs(ti + 1, usedAmmo, engagements);
      var targetName = targetList[ti];
      (byTarget[targetName] || []).slice(0, adv.maxCandidateEngagements).forEach(function (cand) {
        var local = JSON.parse(JSON.stringify(usedAmmo));
        var valid = true;
        cand.allocations.forEach(function (a) {
          var key = a.shooter + '||' + a.weapon;
          local[key] = (local[key] || 0) + a.qty;
          var shooter = blue.find(function (b) { return b.platform_name === a.shooter; });
          if (local[key] > (loadoutMap(shooter)[a.weapon] || 0)) valid = false;
        });
        if (!valid) return;
        var e = {
          engagementId: 'eng-' + (engagements.length + 1) + '-' + targetName,
          targetPlatform: targetName,
          targetPlatformType: cand.target.type || 'Unspecified',
          targetPlatformSide: cand.target.side,
          contributingOffensivePlatforms: uniq(cand.allocations.map(function (a) { return a.shooter; })),
          contributingOffensivePlatformTypes: uniq(cand.allocations.map(function (a) { return a.shooterType; })),
          weaponAllocations: cand.allocations.map(function (a) { return { offensivePlatform: a.shooter, offensivePlatformType: a.shooterType, weapon: a.weapon, quantity: a.qty, contribution: a.contribution }; }),
          totalAmmoExpended: cand.ammo,
          contributionValue: cand.contribution,
          lethalitySatisfied: cand.contribution >= 1
        };
        dfs(ti + 1, local, engagements.concat([e]));
      });
    }
    dfs(0, {}, []);

    missions.sort(function (a, b) {
      if (b.destroyedPlatformCount !== a.destroyedPlatformCount) return b.destroyedPlatformCount - a.destroyedPlatformCount;
      if (a.totalAmmoExpended !== b.totalAmmoExpended) return a.totalAmmoExpended - b.totalAmmoExpended;
      return a.engagements.length - b.engagements.length;
    });

    logs.push('final generated missions=' + missions.length);
    if (!missions.length) logs.push('reason: no valid missions under selected constraints / data / limits');
    return { missions: missions.slice(0, adv.maxMissions), logs: logs };
  }

  function init() {
    var app = getApp();
    var data = collectData(app);
    var root = document.getElementById('missions-root');
    var state = { filters: { blueShooters: [], redTargets: [], blueWeapons: [] }, optional: { minDestroyedPlatforms: 0, maxDestroyedPlatforms: 999 }, advanced: { maxMissions: 100, maxCandidateEngagements: 30, maxSearchDepth: 8, includeMixedWeaponEngagements: true, maxContributingWeaponsPerEngagement: 4 } };

    function render() {
      var blue = data.platforms.filter(function (p) { return side(p.side) === 'blue'; });
      var red = data.platforms.filter(function (p) { return side(p.side) === 'red'; });
      var blueNames = blue.map(function (p) { return p.platform_name; }).sort();
      var redNames = red.map(function (p) { return p.platform_name; }).sort();
      var weaponNames = uniq(blue.flatMap(function (p) { var m = loadoutMap(p); return Object.keys(m).filter(function (w) { return m[w] > 0; }); })).sort();

      root.innerHTML = '<section class="missions-card"><h2>Mission Filters</h2><div class="filters-grid">' +
      '<label>Blue shooters*<select id="blueShooters" multiple size="8"></select></label>' +
      '<label>Red targets*<select id="redTargets" multiple size="8"></select></label>' +
      '<label>Blue weapons*<select id="blueWeapons" multiple size="8"></select></label>' +
      '</div><details><summary>Advanced Generation Settings</summary><div class="advanced-grid">' +
      '<label>Max missions<input id="maxMissions" type="number" min="1" value="'+state.advanced.maxMissions+'"></label>' +
      '<label>Max candidate engagements<input id="maxCandidateEngagements" type="number" min="1" value="'+state.advanced.maxCandidateEngagements+'"></label>' +
      '<label>Max search depth<input id="maxSearchDepth" type="number" min="1" value="'+state.advanced.maxSearchDepth+'"></label>' +
      '<label>Include mixed weapon engagements<input id="includeMixedWeaponEngagements" type="checkbox" '+(state.advanced.includeMixedWeaponEngagements?'checked':'')+'></label>' +
      '</div></details><div id="validationErrors" class="validation"></div><button id="generateMissionsButton">Generate Missions</button></section>' +
      '<section class="missions-card"><h2>Generated Missions JSON</h2><pre id="missionsJson"></pre></section>' +
      '<section class="missions-card"><h2>Mission Generation Log</h2><pre id="generationLog"></pre></section>';

      function fill(id, vals, sel) { var el = document.getElementById(id); el.innerHTML = vals.map(function (v) { return '<option value="'+v+'">'+v+'</option>'; }).join(''); Array.from(el.options).forEach(function (o) { o.selected = sel.indexOf(o.value) >= 0; }); }
      fill('blueShooters', blueNames, state.filters.blueShooters); fill('redTargets', redNames, state.filters.redTargets); fill('blueWeapons', weaponNames, state.filters.blueWeapons);

      var errors = [];
      if (!state.filters.blueShooters.length) errors.push('Select at least one Blue shooter before generating missions.');
      if (!state.filters.redTargets.length) errors.push('Select at least one Red target before generating missions.');
      if (!state.filters.blueWeapons.length) errors.push('Select at least one Blue weapon before generating missions.');
      document.getElementById('validationErrors').innerHTML = errors.join('<br>');
      document.getElementById('generateMissionsButton').disabled = errors.length > 0;

      document.getElementById('generationLog').textContent = [
        'platforms=' + data.platforms.length,
        'blue platforms=' + blue.length,
        'red platforms=' + red.length,
        'weapons=' + data.weapons.length,
        'lethality rows=' + data.lethality.length,
        'distance rows=' + Object.keys(data.distances || {}).length
      ].join('\n');

      var sv = function (id) { return Array.from(document.getElementById(id).selectedOptions).map(function (x) { return x.value; }); };
      document.getElementById('blueShooters').onchange = function () { state.filters.blueShooters = sv('blueShooters'); render(); };
      document.getElementById('redTargets').onchange = function () { state.filters.redTargets = sv('redTargets'); render(); };
      document.getElementById('blueWeapons').onchange = function () { state.filters.blueWeapons = sv('blueWeapons'); render(); };
      document.getElementById('maxMissions').onchange = function (e) { state.advanced.maxMissions = parseInt(e.target.value, 10) || 100; };
      document.getElementById('maxCandidateEngagements').onchange = function (e) { state.advanced.maxCandidateEngagements = parseInt(e.target.value, 10) || 30; };
      document.getElementById('maxSearchDepth').onchange = function (e) { state.advanced.maxSearchDepth = parseInt(e.target.value, 10) || 8; };
      document.getElementById('includeMixedWeaponEngagements').onchange = function (e) { state.advanced.includeMixedWeaponEngagements = !!e.target.checked; };

      document.getElementById('generateMissionsButton').onclick = function () {
        var out = generate(data, state.filters, state.advanced, state.optional);
        document.getElementById('missionsJson').textContent = pretty(out.missions);
        document.getElementById('generationLog').textContent = out.logs.join('\n');
      };
    }

    window.addEventListener('message', function (event) {
      var p = event && event.data;
      if (!p || p.type !== 'missionsData' || !p.data) return;
      data = { platforms: p.data.platformData || [], weapons: p.data.weaponData || [], lethality: p.data.lethalityData || [], distances: p.data.distanceData || {} };
      render();
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
