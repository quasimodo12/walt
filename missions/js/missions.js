(function () {
  'use strict';

  function n(v) { return (v || '').toString().trim().toLowerCase(); }
  function p(v) { return JSON.stringify(v, null, 2); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function toNum(v, d) { var x = parseFloat(v); return isNaN(x) ? d : x; }

  function getApp() {
    try { if (window.opener && !window.opener.closed) return window.opener; } catch (_e) {}
    return window;
  }

  function getData(app) {
    return {
      platforms: arr(app.PlatformModel && app.PlatformModel.getPlatformData ? app.PlatformModel.getPlatformData() : []),
      weapons: arr(app.WeaponStorage && app.WeaponStorage.getWeaponData ? app.WeaponStorage.getWeaponData() : []),
      lethality: arr(app.WeaponLethalityStorage && app.WeaponLethalityStorage.getLethalityData ? app.WeaponLethalityStorage.getLethalityData() : []),
      distances: (app.DistanceStorage && app.DistanceStorage.getAllDistanceData ? app.DistanceStorage.getAllDistanceData() : {}) || {}
    };
  }

  function loadout(platform) {
    var out = {};
    if (!platform || !platform.weapons) return out;
    if (Array.isArray(platform.weapons)) {
      platform.weapons.forEach(function (w) { if (w && w.name) out[w.name] = parseInt(w.quantity, 10) || 0; });
    } else {
      Object.keys(platform.weapons).forEach(function (k) { out[k] = parseInt(platform.weapons[k], 10) || 0; });
    }
    return out;
  }

  function dist(data, a, b) {
    return toNum(data.distances[a + '---' + b], toNum(data.distances[b + '---' + a], NaN));
  }

  function lethalityReq(data, weapon, targetType) {
    var rec = data.lethality.find(function (l) { return l.weapon === weapon && l.platformType === targetType; });
    if (!rec) return null;
    return toNum(rec.quantity, NaN);
  }

  function weaponRange(data, weaponName) {
    var w = data.weapons.find(function (x) { return x.weapon_name === weaponName; });
    return w ? toNum(w.weapon_range !== undefined ? w.weapon_range : w.max_range, NaN) : NaN;
  }

  function selectedValues(el) { return Array.from(el.selectedOptions).map(function (o) { return o.value; }); }

  function buildOptions(data, shooterSel) {
    var blue = data.platforms.filter(function (x) { return n(x.side) === 'blue'; });
    var red = data.platforms.filter(function (x) { return n(x.side) === 'red'; });
    var shooterSet = {};
    (shooterSel.length ? shooterSel : blue.map(function (b) { return b.platform_name; })).forEach(function (s) { shooterSet[s] = true; });
    var blueWeaponSet = {};
    blue.forEach(function (b) {
      if (!shooterSet[b.platform_name]) return;
      var l = loadout(b);
      Object.keys(l).forEach(function (w) { if (l[w] > 0) blueWeaponSet[w] = true; });
    });
    return {
      blueShooters: blue.map(function (x) { return x.platform_name; }).sort(),
      redTargets: red.map(function (x) { return x.platform_name; }).sort(),
      blueWeapons: Object.keys(blueWeaponSet).sort(),
      blueTypes: Array.from(new Set(blue.map(function (b) { return b.type || 'Unspecified'; }))).sort(),
      redTypes: Array.from(new Set(red.map(function (r) { return r.type || 'Unspecified'; }))).sort()
    };
  }

  function validateRequired(f) {
    var e = [];
    if (!f.blueShooters.length) e.push('No Blue shooters selected.');
    if (!f.redTargets.length) e.push('No Red targets selected.');
    if (!f.blueWeapons.length) e.push('No Blue weapons selected.');
    return e;
  }

  function buildSingleCandidates(data, f, log) {
    var out = [];
    var shooters = data.platforms.filter(function (p) { return f.blueShooters.indexOf(p.platform_name) >= 0 && n(p.side) === 'blue'; });
    var targets = data.platforms.filter(function (p) { return f.redTargets.indexOf(p.platform_name) >= 0 && n(p.side) === 'red'; });
    shooters.forEach(function (s) {
      var l = loadout(s);
      targets.forEach(function (t) {
        f.blueWeapons.forEach(function (w) {
          if (!l[w] || l[w] <= 0) return log.push('reject loadout: ' + s.platform_name + ' missing ' + w);
          var req = lethalityReq(data, w, t.type || 'Unspecified');
          if (!req || req <= 0) return log.push('reject lethality: ' + w + ' vs ' + (t.type || 'Unspecified'));
          var d = dist(data, s.platform_name, t.platform_name);
          var r = weaponRange(data, w);
          if (!(d >= 0) || !(r >= 0) || d > r) return log.push('reject range: ' + s.platform_name + '->' + t.platform_name + ' with ' + w);
          if (l[w] < req) return log.push('reject ammo: ' + s.platform_name + ' ' + w + ' has ' + l[w] + ' need ' + req);
          out.push({ target: t, allocations: [{ shooter: s, weapon: w, qty: req, req: req }], contribution: 1, overkill: 0 });
        });
      });
    });
    return out;
  }

  function buildMixedCandidates(data, f, log, cap) {
    var out = [];
    var shooters = data.platforms.filter(function (p) { return f.blueShooters.indexOf(p.platform_name) >= 0 && n(p.side) === 'blue'; });
    var targets = data.platforms.filter(function (p) { return f.redTargets.indexOf(p.platform_name) >= 0 && n(p.side) === 'red'; });
    targets.forEach(function (t) {
      var contribs = [];
      shooters.forEach(function (s) {
        var l = loadout(s);
        f.blueWeapons.forEach(function (w) {
          var req = lethalityReq(data, w, t.type || 'Unspecified');
          if (!req || !l[w] || l[w] <= 0) return;
          var d = dist(data, s.platform_name, t.platform_name);
          var r = weaponRange(data, w);
          if (!(d >= 0) || !(r >= 0) || d > r) return;
          contribs.push({ shooter: s, weapon: w, req: req, maxQty: l[w], ratio: 1 / req });
        });
      });
      contribs.sort(function (a, b) { return b.ratio - a.ratio; });
      var needed = 1;
      var alloc = [];
      for (var i = 0; i < contribs.length && needed > 0 && alloc.length < f.advanced.maxContributingWeaponsPerEngagement; i++) {
        var c = contribs[i];
        var qty = Math.min(c.maxQty, Math.ceil(needed * c.req));
        if (qty <= 0) continue;
        alloc.push({ shooter: c.shooter, weapon: c.weapon, qty: qty, req: c.req });
        needed -= qty / c.req;
      }
      if (needed <= f.advanced.overkillTolerance) {
        out.push({ target: t, allocations: alloc, contribution: 1 - needed, overkill: Math.max(0, -needed) });
      } else {
        log.push('mixed attempt failed for target ' + t.platform_name);
      }
      if (out.length >= cap) return;
    });
    return out;
  }

  function missionFromEngagements(engagements, idx) {
    var ammoByWeapon = {}, killsByWeapon = {}, killsByShooter = {}, killsByShooterType = {};
    var shooters = {}, shooterTypes = {}, targets = {}, targetTypes = {}, weapons = {};
    var totalAmmo = 0;
    engagements.forEach(function (e) {
      targets[e.target.platform_name] = true;
      targetTypes[e.target.type || 'Unspecified'] = true;
      var used = {};
      e.allocations.forEach(function (a) {
        shooters[a.shooter.platform_name] = true;
        shooterTypes[a.shooter.type || 'Unspecified'] = true;
        weapons[a.weapon] = true;
        ammoByWeapon[a.weapon] = (ammoByWeapon[a.weapon] || 0) + a.qty;
        totalAmmo += a.qty;
        used[a.weapon] = true;
      });
      Object.keys(used).forEach(function (w) { killsByWeapon[w] = (killsByWeapon[w] || 0) + 1; });
      killsByShooter[e.allocations[0].shooter.platform_name] = (killsByShooter[e.allocations[0].shooter.platform_name] || 0) + 1;
      killsByShooterType[e.allocations[0].shooter.type || 'Unspecified'] = (killsByShooterType[e.allocations[0].shooter.type || 'Unspecified'] || 0) + 1;
    });
    return {
      missionId: 'mission-' + idx,
      offensiveSide: 'Blue',
      targetSide: 'Red',
      engagements: engagements.map(function (e, i) { return { engagementId: 'eng-' + idx + '-' + (i + 1), targetPlatformId: e.target.platform_name, targetPlatformType: e.target.type || 'Unspecified', targetPlatformSide: e.target.side, contributingOffensivePlatforms: Array.from(new Set(e.allocations.map(function (a) { return a.shooter.platform_name; }))), contributingOffensivePlatformTypes: Array.from(new Set(e.allocations.map(function (a) { return a.shooter.type || 'Unspecified'; }))), weaponAllocations: e.allocations.map(function (a) { return { offensivePlatformId: a.shooter.platform_name, weapon: a.weapon, allocatedQuantity: a.qty, requiredQuantity: a.req }; }), totalAmmoExpended: e.allocations.reduce(function (s, a) { return s + a.qty; }, 0), contributionValue: e.allocations.reduce(function (s, a) { return s + (a.qty / a.req); }, 0), lethalitySatisfied: true }; }),
      offensivePlatformsUsed: Object.keys(shooters), offensivePlatformTypesUsed: Object.keys(shooterTypes), targetPlatformsDestroyed: Object.keys(targets), targetPlatformTypesDestroyed: Object.keys(targetTypes), weaponsUsed: Object.keys(weapons), destroyedPlatformCount: Object.keys(targets).length, totalAmmoExpended: totalAmmo, ammoExpendedByWeapon: ammoByWeapon, killsByWeapon: killsByWeapon, killsByOffensivePlatform: killsByShooter, killsByOffensivePlatformType: killsByShooterType
    };
  }

  function init() {
    var root = document.getElementById('missions-root'); if (!root) return;
    var app = getApp(), data = getData(app);
    var state = { filters: { blueShooters: [], redTargets: [], blueWeapons: [], optional: { offensivePlatformTypes: [], targetPlatformTypes: [], minDestroyedPlatforms: 0, maxDestroyedPlatforms: 999 }, advanced: { maxMissions: 100, maxCandidateEngagements: 2000, maxSearchDepth: 4, includeMixedWeaponEngagements: true, maxContributingWeaponsPerEngagement: 6, overkillTolerance: 0.01 } } };

    function render(missions, logLines) {
      var o = buildOptions(data, state.filters.blueShooters);
      root.innerHTML = '<section class="missions-card"><h2>Mission Filters</h2><div class="filters-grid"><label>Blue shooters*<select id="blueShooters" multiple size="8"></select></label><label>Red targets*<select id="redTargets" multiple size="8"></select></label><label>Blue weapons*<select id="blueWeapons" multiple size="8"></select></label><label>Offensive platform types<select id="offTypes" multiple size="6"></select></label><label>Target platform types<select id="tarTypes" multiple size="6"></select></label></div><details><summary>Advanced Generation Settings</summary><div class="advanced-grid"><label>Max missions<input id="maxMissions" type="number" min="1" value="'+state.filters.advanced.maxMissions+'"></label><label>Max candidate engagements<input id="maxCandidate" type="number" min="1" value="'+state.filters.advanced.maxCandidateEngagements+'"></label><label>Max search depth<input id="maxDepth" type="number" min="1" value="'+state.filters.advanced.maxSearchDepth+'"></label><label>Include mixed weapon engagements<input id="allowMixed" type="checkbox" '+(state.filters.advanced.includeMixedWeaponEngagements?'checked':'')+'></label></div></details><div id="validationErrors" class="validation"></div><button id="generateMissionsButton">Generate Missions</button></section><section class="missions-card"><h2>Generated Missions JSON</h2><pre id="missionsJson"></pre></section><section class="missions-card"><h2>Mission Generation Log</h2><pre id="missionLog"></pre></section>';
      function fill(id, vals, sel) { var el = document.getElementById(id); el.innerHTML = vals.map(function (v) { return '<option value="'+v+'">'+v+'</option>'; }).join(''); sel.forEach(function (s) { var op = Array.from(el.options).find(function (x) { return x.value===s; }); if (op) op.selected = true; }); }
      fill('blueShooters', o.blueShooters, state.filters.blueShooters); fill('redTargets', o.redTargets, state.filters.redTargets); fill('blueWeapons', o.blueWeapons, state.filters.blueWeapons.filter(function (w) { return o.blueWeapons.indexOf(w)>=0; })); fill('offTypes', o.blueTypes, state.filters.optional.offensivePlatformTypes); fill('tarTypes', o.redTypes, state.filters.optional.targetPlatformTypes);
      var errs = validateRequired(state.filters); document.getElementById('validationErrors').innerHTML = errs.join('<br>'); document.getElementById('generateMissionsButton').disabled = errs.length>0;
      document.getElementById('missionsJson').textContent = p(missions || []);
      document.getElementById('missionLog').textContent = (logLines || ['Ready.']).join('\n');

      document.getElementById('blueShooters').onchange = function (e) { state.filters.blueShooters = selectedValues(e.target); state.filters.blueWeapons = []; render(missions, logLines); };
      document.getElementById('redTargets').onchange = function (e) { state.filters.redTargets = selectedValues(e.target); render(missions, logLines); };
      document.getElementById('blueWeapons').onchange = function (e) { state.filters.blueWeapons = selectedValues(e.target); render(missions, logLines); };
      document.getElementById('offTypes').onchange = function (e) { state.filters.optional.offensivePlatformTypes = selectedValues(e.target); };
      document.getElementById('tarTypes').onchange = function (e) { state.filters.optional.targetPlatformTypes = selectedValues(e.target); };
      document.getElementById('maxMissions').onchange = function (e) { state.filters.advanced.maxMissions = parseInt(e.target.value, 10) || 100; };
      document.getElementById('maxCandidate').onchange = function (e) { state.filters.advanced.maxCandidateEngagements = parseInt(e.target.value, 10) || 2000; };
      document.getElementById('maxDepth').onchange = function (e) { state.filters.advanced.maxSearchDepth = parseInt(e.target.value, 10) || 4; };
      document.getElementById('allowMixed').onchange = function (e) { state.filters.advanced.includeMixedWeaponEngagements = e.target.checked; };
      document.getElementById('generateMissionsButton').onclick = function () {
        var log = ['Selected required filters: ' + p({ blueShooters: state.filters.blueShooters, redTargets: state.filters.redTargets, blueWeapons: state.filters.blueWeapons }), 'Selected optional filters: ' + p(state.filters.optional), 'Selected advanced settings: ' + p(state.filters.advanced)];
        var errs2 = validateRequired(state.filters); if (errs2.length) { log.push('No missions generated: ' + errs2.join('; ')); return render([], log); }
        var single = buildSingleCandidates(data, state.filters, log);
        var mixed = state.filters.advanced.includeMixedWeaponEngagements ? buildMixedCandidates(data, state.filters, log, state.filters.advanced.maxCandidateEngagements) : [];
        var cands = single.concat(mixed).slice(0, state.filters.advanced.maxCandidateEngagements);
        log.push('candidate single-weapon options: ' + single.length);
        log.push('candidate mixed-weapon options: ' + mixed.length);
        var byTarget = {};
        cands.forEach(function (c) { (byTarget[c.target.platform_name] = byTarget[c.target.platform_name] || []).push(c); });
        var tgtNames = Object.keys(byTarget);
        var missions = [];
        function dfs(i, chosen) {
          if (missions.length >= state.filters.advanced.maxMissions) return;
          if (i >= tgtNames.length || chosen.length >= state.filters.advanced.maxSearchDepth) {
            if (chosen.length) missions.push(missionFromEngagements(chosen, missions.length + 1));
            return;
          }
          dfs(i + 1, chosen);
          (byTarget[tgtNames[i]] || []).forEach(function (e) { dfs(i + 1, chosen.concat([e])); });
        }
        dfs(0, []);
        missions = missions.filter(function (m) { return m.destroyedPlatformCount >= state.filters.optional.minDestroyedPlatforms && m.destroyedPlatformCount <= state.filters.optional.maxDestroyedPlatforms; });
        missions.sort(function (a, b) { if (b.destroyedPlatformCount !== a.destroyedPlatformCount) return b.destroyedPlatformCount - a.destroyedPlatformCount; if (a.totalAmmoExpended !== b.totalAmmoExpended) return a.totalAmmoExpended - b.totalAmmoExpended; return a.missionId.localeCompare(b.missionId); });
        if (!missions.length) log.push('No missions generated. Reasons may include range failures, missing lethality, insufficient ammo, restrictive optional filters, or generation limits.');
        log.push('final generated missions: ' + missions.length);
        render(missions.slice(0, state.filters.advanced.maxMissions), log);
      };
    }
    render([], ['Loaded mission data: platforms=' + data.platforms.length + ', weapons=' + data.weapons.length + ', lethality=' + data.lethality.length + ', distances=' + Object.keys(data.distances || {}).length]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
