(function (global) {
  'use strict';

  var DEFAULT_LIMITS = {
    maxEngagementCandidates: 5000,
    maxMissionCandidates: 1000,
    maxTargetsPerMission: 10,
    maxContributorsPerEngagement: 4,
    maxRuntimeMs: 2000
  };

  function toSide(v) { return (v || '').toString().trim().toLowerCase(); }
  function toNum(v) { var n = parseFloat(v); return isNaN(n) ? NaN : n; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function ceilToSalvo(qty, salvo) { return Math.ceil(qty / salvo) * salvo; }

  function generateMissions(input) {
    var startedAt = Date.now();
    var log = [];
    var limits = Object.assign({}, DEFAULT_LIMITS, (input && input.limits) || {});
    var data = (input && input.data) || {};
    var filters = (input && input.filters) || {};
    var salvoSize = parseInt(input && input.salvoSize, 10);

    if (!salvoSize || salvoSize < 1) {
      return { missions: [], log: ['Salvo size is required and must be >= 1.'], limitsReached: false };
    }

    var platforms = Array.isArray(data.platforms) ? data.platforms : [];
    var weapons = Array.isArray(data.weapons) ? data.weapons : [];
    var lethality = Array.isArray(data.lethality) ? data.lethality : [];
    var distances = (data.distances && typeof data.distances === 'object') ? data.distances : {};

    if (!platforms.length) return { missions: [], log: ['No platforms found.'], limitsReached: false };
    if (!weapons.length) return { missions: [], log: ['No weapon records found.'], limitsReached: false };
    if (!lethality.length) return { missions: [], log: ['No lethality records found.'], limitsReached: false };

    var selectedBlueSet = new Set((filters.blueShooters || []).slice().sort());
    var selectedRedSet = new Set((filters.redTargets || []).slice().sort());
    var selectedWeaponSet = new Set((filters.blueWeapons || []).slice().sort());

    var blue = platforms.filter(function (p) { return toSide(p.side) === 'blue' && selectedBlueSet.has(p.platform_name); }).sort(function (a, b) { return a.platform_name.localeCompare(b.platform_name); });
    var red = platforms.filter(function (p) { return toSide(p.side) === 'red' && selectedRedSet.has(p.platform_name); }).sort(function (a, b) { return a.platform_name.localeCompare(b.platform_name); });
    if (!blue.length) return { missions: [], log: ['No offensive platforms found.'], limitsReached: false };
    if (!red.length) return { missions: [], log: ['No target platforms found.'], limitsReached: false };

    var weaponRangeByName = {};
    weapons.forEach(function (w) {
      var r = toNum(w.weapon_range !== undefined ? w.weapon_range : w.max_range);
      weaponRangeByName[w.weapon_name] = isNaN(r) ? null : r;
    });

    var lethalityMap = {};
    lethality.forEach(function (l) {
      var q = parseInt(l.quantity, 10);
      if (selectedWeaponSet.has(l.weapon) && l.platformType && q > 0) lethalityMap[l.weapon + '||' + l.platformType] = q;
    });

    var ammo0 = {};
    blue.forEach(function (s) {
      ammo0[s.platform_name] = {};
      var ws = Array.isArray(s.weapons) ? s.weapons : [];
      ws.forEach(function (w) {
        var q = parseInt(w.quantity, 10) || 0;
        if (q > 0 && selectedWeaponSet.has(w.name)) ammo0[s.platform_name][w.name] = q;
      });
    });

    var candidateByTarget = {};
    var engagementCandidates = 0;
    red.forEach(function (t) {
      candidateByTarget[t.platform_name] = [];
      var contributions = [];
      blue.forEach(function (s) {
        Object.keys(ammo0[s.platform_name] || {}).sort().forEach(function (weaponName) {
          var dist = distances[s.platform_name + '---' + t.platform_name] || distances[t.platform_name + '---' + s.platform_name];
          var wr = weaponRangeByName[weaponName];
          var lethQ = lethalityMap[weaponName + '||' + (t.type || 'Unspecified')];
          if (!dist || !wr || !lethQ || dist > wr) return;
          contributions.push({ shooter: s.platform_name, weapon: weaponName, lethalityQty: lethQ });
        });
      });
      contributions.sort(function (a, b) {
        return (a.shooter + '|' + a.weapon).localeCompare(b.shooter + '|' + b.weapon);
      });

      function buildCombos(idx, used, partial, frac, contributors) {
        if (Date.now() - startedAt > limits.maxRuntimeMs) return;
        if (engagementCandidates >= limits.maxEngagementCandidates) return;
        if (frac >= 1) {
          engagementCandidates += 1;
          candidateByTarget[t.platform_name].push({ target: t.platform_name, targetType: t.type || 'Unspecified', contributors: clone(partial), totalFractionalLethality: frac, overkill: frac - 1 });
          return;
        }
        if (idx >= contributions.length || contributors >= limits.maxContributorsPerEngagement) return;

        var c = contributions[idx];
        var maxAmmo = (ammo0[c.shooter] && ammo0[c.shooter][c.weapon]) || 0;
        var minAlloc = ceilToSalvo(1, salvoSize);
        for (var alloc = minAlloc; alloc <= maxAmmo; alloc += salvoSize) {
          var f = alloc / c.lethalityQty;
          if (f <= 0) continue;
          partial.push({ shooter: c.shooter, weapon: c.weapon, quantity: alloc, lethalityQtyRequired: c.lethalityQty, contribution: f });
          buildCombos(idx + 1, used, partial, frac + f, contributors + 1);
          partial.pop();
          if (engagementCandidates >= limits.maxEngagementCandidates) return;
        }
        buildCombos(idx + 1, used, partial, frac, contributors);
      }
      buildCombos(0, {}, [], 0, 0);
      candidateByTarget[t.platform_name].sort(function (a, b) {
        if (a.overkill !== b.overkill) return a.overkill - b.overkill;
        var ak = a.contributors.map(function (x) { return x.shooter + ':' + x.weapon + ':' + x.quantity; }).join('|');
        var bk = b.contributors.map(function (x) { return x.shooter + ':' + x.weapon + ':' + x.quantity; }).join('|');
        return ak.localeCompare(bk);
      });
    });

    var targetOrder = red.map(function (r) { return r.platform_name; }).slice(0, limits.maxTargetsPerMission);
    var missions = [];
    var limitReached = false;

    function recurseTarget(tIdx, ammo, engagements) {
      if (Date.now() - startedAt > limits.maxRuntimeMs) { limitReached = true; return; }
      if (missions.length >= limits.maxMissionCandidates) { limitReached = true; return; }
      if (tIdx >= targetOrder.length) {
        if (engagements.length) missions.push(summarizeMission(engagements));
        return;
      }
      var target = targetOrder[tIdx];
      recurseTarget(tIdx + 1, ammo, engagements);
      var candidates = candidateByTarget[target] || [];
      for (var i = 0; i < candidates.length; i++) {
        var e = candidates[i];
        var ok = true;
        for (var j = 0; j < e.contributors.length; j++) {
          var c = e.contributors[j];
          if (((ammo[c.shooter] || {})[c.weapon] || 0) < c.quantity) { ok = false; break; }
        }
        if (!ok) continue;
        var nextAmmo = clone(ammo);
        e.contributors.forEach(function (c) { nextAmmo[c.shooter][c.weapon] -= c.quantity; });
        engagements.push(e);
        recurseTarget(tIdx + 1, nextAmmo, engagements);
        engagements.pop();
        if (limitReached) return;
      }
    }

    function summarizeMission(engagements) {
      var ammoByWeapon = {};
      var ammoByShooter = {};
      var shooterSet = {}; var weaponSet = {}; var targetSet = {}; var targetTypeSet = {};
      var totalAmmo = 0; var totalOverkill = 0;
      engagements.forEach(function (e) {
        targetSet[e.target] = true; targetTypeSet[e.targetType] = true; totalOverkill += e.overkill;
        e.contributors.forEach(function (c) {
          shooterSet[c.shooter] = true; weaponSet[c.weapon] = true;
          ammoByWeapon[c.weapon] = (ammoByWeapon[c.weapon] || 0) + c.quantity;
          ammoByShooter[c.shooter] = (ammoByShooter[c.shooter] || 0) + c.quantity;
          totalAmmo += c.quantity;
        });
      });
      return {
        side: 'blue',
        engagements: clone(engagements),
        weaponsUsed: Object.keys(weaponSet).sort(),
        targetsDestroyed: Object.keys(targetSet).sort(),
        targetTypesDestroyed: Object.keys(targetTypeSet).sort(),
        offensivePlatforms: Object.keys(shooterSet).sort(),
        destroyedPlatformCount: Object.keys(targetSet).length,
        totalAmmoExpended: totalAmmo,
        ammoExpendedByWeapon: ammoByWeapon,
        ammoExpendedByShooter: ammoByShooter,
        totalOverkill: totalOverkill,
        generationLimitsReached: limitReached
      };
    }

    recurseTarget(0, clone(ammo0), []);

    missions.sort(function (a, b) {
      if (b.destroyedPlatformCount !== a.destroyedPlatformCount) return b.destroyedPlatformCount - a.destroyedPlatformCount;
      if (b.totalAmmoExpended !== a.totalAmmoExpended) return b.totalAmmoExpended - a.totalAmmoExpended;
      if (a.totalOverkill !== b.totalOverkill) return a.totalOverkill - b.totalOverkill;
      var ak = a.targetsDestroyed.join('|') + '|' + a.offensivePlatforms.join('|') + '|' + a.weaponsUsed.join('|');
      var bk = b.targetsDestroyed.join('|') + '|' + b.offensivePlatforms.join('|') + '|' + b.weaponsUsed.join('|');
      return ak.localeCompare(bk);
    });

    if (!missions.length) log.push('No missions generated. Possible reasons: no targets within weapon range, no matching lethality records, salvo size prevents valid allocations, or insufficient ammo.');
    if (limitReached) log.push('Generation limit reached. Returning best missions found so far.');
    log.push('Engagement candidates considered: ' + engagementCandidates);
    log.push('Mission candidates generated: ' + missions.length);

    return { missions: missions, log: log, limitsReached: limitReached };
  }

  global.MissionGenerator = { generateMissions: generateMissions, DEFAULT_LIMITS: DEFAULT_LIMITS };
})(window);
