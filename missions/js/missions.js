(function () {
  'use strict';

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function toOption(name) {
    return '<option value="' + name + '">' + name + '</option>';
  }

  function getWeaponRangeMap() {
    var map = {};
    (WeaponStorage.getWeaponData() || []).forEach(function (w) {
      map[w.weapon] = Number(w.max_range) || 0;
    });
    return map;
  }

  function getLethalityMap() {
    var map = {};
    (WeaponLethalityStorage.getLethalityData() || []).forEach(function (l) {
      map[l.weapon + '||' + l.platformType] = Number(l.quantity) || 0;
    });
    return map;
  }

  function multiValues(id) {
    return Array.from(document.getElementById(id).selectedOptions).map(function (o) { return o.value; });
  }

  function buildUi(root, platforms, weapons) {
    var sides = unique(platforms.map(function (p) { return p.side; }));
    var types = unique(platforms.map(function (p) { return p.type || 'Unspecified'; }));
    var names = unique(platforms.map(function (p) { return p.platform_name; }));
    var weaponNames = unique(weapons.map(function (w) { return w.weapon; }));

    root.innerHTML = '' +
      '<section class="missions-controls">' +
      '<div class="grid">' +
      '<label>Offensive Side<select id="offSide" multiple>' + sides.map(toOption).join('') + '</select></label>' +
      '<label>Target Side<select id="targetSide" multiple>' + sides.map(toOption).join('') + '</select></label>' +
      '<label>Offensive Platforms<select id="offPlatforms" multiple>' + names.map(toOption).join('') + '</select></label>' +
      '<label>Target Platforms<select id="targetPlatforms" multiple>' + names.map(toOption).join('') + '</select></label>' +
      '<label>Offensive Types<select id="offTypes" multiple>' + types.map(toOption).join('') + '</select></label>' +
      '<label>Target Types<select id="targetTypes" multiple>' + types.map(toOption).join('') + '</select></label>' +
      '<label>Weapons<select id="weapons" multiple>' + weaponNames.map(toOption).join('') + '</select></label>' +
      '<label>Require Weapon<select id="requireWeapon"><option value="">(none)</option>' + weaponNames.map(toOption).join('') + '</select></label>' +
      '<label>Exclude Weapon<select id="excludeWeapon"><option value="">(none)</option>' + weaponNames.map(toOption).join('') + '</select></label>' +
      '<label>Min Kills<input id="minKills" type="number" min="1" value="1"></label>' +
      '<label>Max Kills<input id="maxKills" type="number" min="1" value="4"></label>' +
      '<label>Max Missions<input id="maxMissions" type="number" min="1" value="100"></label>' +
      '<label>Max Candidate Engagements<input id="maxEng" type="number" min="10" value="400"></label>' +
      '<label>Max Search Depth<input id="maxDepth" type="number" min="1" value="4"></label>' +
      '</div><button id="generateMissionsButton" class="generate">Generate Missions</button></section>' +
      '<section><h3>Generated Missions JSON</h3><textarea id="missionJson" rows="16"></textarea></section>' +
      '<section><h3>Mission Generation Log</h3><textarea id="missionLog" rows="16"></textarea></section>';
  }

  function runGeneration(platforms) {
    var logs = [];
    var f = {
      offSide: multiValues('offSide'),
      targetSide: multiValues('targetSide'),
      offPlatforms: multiValues('offPlatforms'),
      targetPlatforms: multiValues('targetPlatforms'),
      offTypes: multiValues('offTypes'),
      targetTypes: multiValues('targetTypes'),
      weapons: multiValues('weapons'),
      requireWeapon: document.getElementById('requireWeapon').value,
      excludeWeapon: document.getElementById('excludeWeapon').value,
      minKills: Number(document.getElementById('minKills').value) || 1,
      maxKills: Number(document.getElementById('maxKills').value) || 99,
      maxMissions: Number(document.getElementById('maxMissions').value) || 100,
      maxEng: Number(document.getElementById('maxEng').value) || 400,
      maxDepth: Number(document.getElementById('maxDepth').value) || 4
    };

    logs.push('Selected filters: ' + JSON.stringify(f));

    var off = platforms.filter(function (p) {
      return (!f.offSide.length || f.offSide.indexOf(p.side) >= 0) && (!f.offPlatforms.length || f.offPlatforms.indexOf(p.platform_name) >= 0) && (!f.offTypes.length || f.offTypes.indexOf(p.type || 'Unspecified') >= 0);
    });
    var tgt = platforms.filter(function (p) {
      return (!f.targetSide.length || f.targetSide.indexOf(p.side) >= 0) && (!f.targetPlatforms.length || f.targetPlatforms.indexOf(p.platform_name) >= 0) && (!f.targetTypes.length || f.targetTypes.indexOf(p.type || 'Unspecified') >= 0);
    });

    logs.push('Candidate offensive platforms: ' + off.length);
    logs.push('Candidate target platforms: ' + tgt.length);

    var rangeMap = getWeaponRangeMap();
    var lethalityMap = getLethalityMap();
    var engagements = [];

    tgt.forEach(function (target) {
      var contributors = [];
      off.forEach(function (o) {
        if (o.side === target.side) { return; }
        (o.weapons || []).forEach(function (ow) {
          var weapon = ow.weapon;
          var qty = Number(ow.quantity) || 0;
          if (qty <= 0) { logs.push('Insufficient ammo: ' + o.platform_name + '/' + weapon); return; }
          if (f.weapons.length && f.weapons.indexOf(weapon) < 0) { return; }
          if (f.excludeWeapon && weapon === f.excludeWeapon) { return; }
          var req = lethalityMap[weapon + '||' + (target.type || 'Unspecified')];
          if (!req) { logs.push('Missing lethality: ' + weapon + ' vs ' + target.type); return; }
          var d = DistanceStorage.getDistanceBetweenPlatforms(o.platform_name, target.platform_name) || Number.POSITIVE_INFINITY;
          if (d > (rangeMap[weapon] || 0)) { logs.push('Range failure: ' + o.platform_name + ' -> ' + target.platform_name + ' with ' + weapon); return; }
          contributors.push({ offensivePlatform: o.platform_name, offensiveType: o.type || 'Unspecified', weapon: weapon, maxAlloc: qty, req: req, contributionPerShot: 1 / req });
        });
      });

      if (!contributors.length) { logs.push('No valid contributors for target ' + target.platform_name); return; }
      contributors.sort(function (a, b) { return b.contributionPerShot - a.contributionPerShot; });
      var contrib = 0;
      var allocs = [];
      for (var i = 0; i < contributors.length && contrib < 1; i += 1) {
        var c = contributors[i];
        var need = Math.ceil((1 - contrib) * c.req);
        var alloc = Math.min(c.maxAlloc, Math.max(1, need));
        contrib += alloc / c.req;
        allocs.push({ offensivePlatform: c.offensivePlatform, offensiveType: c.offensiveType, weapon: c.weapon, quantity: alloc, requiredQuantity: c.req, contribution: alloc / c.req });
      }

      logs.push('Mixed-weapon attempt for ' + target.platform_name + ': contribution=' + contrib.toFixed(3));
      if (contrib >= 1) {
        engagements.push({
          targetPlatform: target.platform_name,
          targetPlatformType: target.type || 'Unspecified',
          targetPlatformSide: target.side,
          allocations: allocs,
          totalAmmoExpended: allocs.reduce(function (s, a) { return s + a.quantity; }, 0),
          lethalitySatisfied: true
        });
      }
    });

    logs.push('Candidate engagements accepted: ' + engagements.length);
    engagements = engagements.slice(0, f.maxEng);

    var missions = [];
    function dfs(idx, mission, ammoState) {
      if (missions.length >= f.maxMissions) { return; }
      if (mission.engagements.length >= f.maxDepth || idx >= engagements.length) {
        if (mission.engagements.length >= f.minKills && mission.engagements.length <= f.maxKills) {
          missions.push(finalizeMission(mission, f));
        }
        return;
      }
      dfs(idx + 1, mission, ammoState);
      var e = engagements[idx];
      if (mission.destroyedTargets[e.targetPlatform]) { logs.push('Duplicate-target rejection: ' + e.targetPlatform); return; }
      var nextAmmo = JSON.parse(JSON.stringify(ammoState));
      for (var i = 0; i < e.allocations.length; i += 1) {
        var a = e.allocations[i];
        nextAmmo[a.offensivePlatform] = nextAmmo[a.offensivePlatform] || {};
        var have = nextAmmo[a.offensivePlatform][a.weapon];
        if (have == null) {
          var plat = platforms.find(function (p) { return p.platform_name === a.offensivePlatform; });
          var ww = (plat.weapons || []).find(function (x) { return x.weapon === a.weapon; });
          have = ww ? Number(ww.quantity) || 0 : 0;
          nextAmmo[a.offensivePlatform][a.weapon] = have;
        }
        if (nextAmmo[a.offensivePlatform][a.weapon] < a.quantity) { logs.push('Insufficient ammo case during mission build'); return; }
        nextAmmo[a.offensivePlatform][a.weapon] -= a.quantity;
      }
      var nextMission = JSON.parse(JSON.stringify(mission));
      nextMission.engagements.push(e);
      nextMission.destroyedTargets[e.targetPlatform] = true;
      dfs(idx + 1, nextMission, nextAmmo);
    }

    dfs(0, { engagements: [], destroyedTargets: {} }, {});
    missions = missions.filter(function (m) {
      if (f.requireWeapon && !m.weaponsUsed.includes(f.requireWeapon)) { return false; }
      if (f.excludeWeapon && m.weaponsUsed.includes(f.excludeWeapon)) { return false; }
      return true;
    });
    missions.sort(rankMissions);
    logs.push('Final missions: ' + missions.length);
    if (!missions.length) { logs.push('No missions generated. Filters may be too restrictive, no ranged/lethal pairs, or ammo insufficient.'); }

    return { missions: missions, logs: logs };
  }

  function finalizeMission(base, filters) {
    var m = { missionId: 'mission_' + Math.random().toString(36).slice(2, 10), offensiveSide: filters.offSide.join(',') || 'Any', targetSide: filters.targetSide.join(',') || 'Any', engagements: base.engagements };
    var ops = {}, opTypes = {}, tgt = {}, tgtTypes = {}, weaps = {}, ammoByWeapon = {}, killsByWeapon = {}, killsByPlatform = {}, killsByOffType = {};
    m.engagements.forEach(function (e) {
      tgt[e.targetPlatform] = true; tgtTypes[e.targetPlatformType] = true;
      e.allocations.forEach(function (a) {
        ops[a.offensivePlatform] = true; opTypes[a.offensiveType] = true; weaps[a.weapon] = true;
        ammoByWeapon[a.weapon] = (ammoByWeapon[a.weapon] || 0) + a.quantity;
      });
      var primary = e.allocations[0];
      if (primary) {
        killsByWeapon[primary.weapon] = (killsByWeapon[primary.weapon] || 0) + 1;
        killsByPlatform[primary.offensivePlatform] = (killsByPlatform[primary.offensivePlatform] || 0) + 1;
        killsByOffType[primary.offensiveType] = (killsByOffType[primary.offensiveType] || 0) + 1;
      }
    });
    m.offensivePlatformsUsed = Object.keys(ops);
    m.offensivePlatformTypesUsed = Object.keys(opTypes);
    m.targetPlatformsDestroyed = Object.keys(tgt);
    m.targetPlatformTypesDestroyed = Object.keys(tgtTypes);
    m.weaponsUsed = Object.keys(weaps);
    m.destroyedPlatformCount = m.engagements.length;
    m.totalAmmoExpended = m.engagements.reduce(function (s, e) { return s + e.totalAmmoExpended; }, 0);
    m.ammoExpendedByWeapon = ammoByWeapon;
    m.killsByWeapon = killsByWeapon;
    m.killsByOffensivePlatform = killsByPlatform;
    m.killsByOffensivePlatformType = killsByOffType;
    return m;
  }

  function rankMissions(a, b) {
    if (b.destroyedPlatformCount !== a.destroyedPlatformCount) return b.destroyedPlatformCount - a.destroyedPlatformCount;
    return a.totalAmmoExpended - b.totalAmmoExpended;
  }

  document.addEventListener('DOMContentLoaded', function () {
    PlatformModel.loadInitialData(PLATFORM_DATA || []);
    WeaponStorage.loadInitialData(WEAPON_DATA || []);
    WeaponLethalityStorage.loadInitialData(WEAPON_LETHALITY_DATA || []);
    DistanceStorage.initializeDistanceData();

    var root = document.getElementById('missions-root');
    var platforms = PlatformModel.getPlatformData() || [];
    var weapons = WeaponStorage.getWeaponData() || [];
    buildUi(root, platforms, weapons);

    document.getElementById('generateMissionsButton').addEventListener('click', function () {
      var out = runGeneration(platforms);
      document.getElementById('missionJson').value = JSON.stringify(out.missions, null, 2);
      document.getElementById('missionLog').value = out.logs.join('\n');
    });
  });
})();
