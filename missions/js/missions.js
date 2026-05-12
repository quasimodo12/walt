(function () {
  'use strict';

  const MissionModule = {
    init,
    validateRequiredFilters,
    readOptionalFilters,
    readAdvancedGenerationSettings,
    isRangeValid,
    hasLethality,
    calculateContribution,
    buildCandidateSingleWeaponEngagements,
    buildCandidateMixedWeaponEngagements,
    validateMissionConstraints,
    rankMissions,
    applyOptionalFilters,
    formatMissionJson,
    writeLog
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindUi();
    populateFilterOptions();
    updateGenerateState();
    window.MissionModule = MissionModule;
  }

  function bindUi() {
    ['#filter-shooters', '#filter-targets', '#filter-weapons'].forEach((s) => $(s).on('change', updateGenerateState));
    $('#toggle-advanced').on('click', () => $('#advanced-panel').toggleClass('hidden'));
    $('#generate-missions').on('click', onGenerateMissions);
  }

  function populateFilterOptions() {
    const blues = PLATFORM_DATA.filter(p => p.side === 'blue');
    const reds = PLATFORM_DATA.filter(p => p.side === 'red');
    const blueWeapons = WEAPON_DATA.filter(w => w.side === 'blue');
    fillSelect('#filter-shooters', blues.map(p => ({ id: p.platform_name, text: `${p.platform_name} (${p.type})` })));
    fillSelect('#filter-targets', reds.map(p => ({ id: p.platform_name, text: `${p.platform_name} (${p.type})` })));
    fillSelect('#filter-weapons', blueWeapons.map(w => ({ id: w.weapon_name, text: w.weapon_name })));
    const weaponOpts = blueWeapons.map(w => `<option value="${w.weapon_name}">${w.weapon_name}</option>`).join('');
    $('#opt-must-weapon,#opt-exclude-weapon').append(weaponOpts);
    $('select[multiple]').select2({ width: '100%' });
  }

  function fillSelect(selector, options) {
    const html = options.map(o => `<option value="${o.id}">${o.text}</option>`).join('');
    $(selector).html(html);
  }

  function validateRequiredFilters(selected) {
    const errors = [];
    if (!selected.shooters.length) errors.push('Select at least one Blue shooter before generating missions.');
    if (!selected.targets.length) errors.push('Select at least one Red target before generating missions.');
    if (!selected.weapons.length) errors.push('Select at least one Blue weapon before generating missions.');
    return errors;
  }

  function readOptionalFilters() {
    return {
      minKills: Number($('#opt-min-kills').val() || 0),
      maxKills: Number($('#opt-max-kills').val() || Infinity),
      mustWeapon: $('#opt-must-weapon').val() || '',
      excludeWeapon: $('#opt-exclude-weapon').val() || ''
    };
  }

  function readAdvancedGenerationSettings() {
    return {
      maxMissions: Number($('#adv-max-missions').val() || 25),
      maxCandidateEngagements: Number($('#adv-max-candidates').val() || 400),
      maxSearchDepth: Number($('#adv-max-depth').val() || 8),
      maxKillsPerMission: Number($('#adv-max-kills').val() || 8),
      includeMixedWeapon: $('#adv-mixed').is(':checked'),
      allowMultiPlatform: $('#adv-multi').is(':checked'),
      maxContributingPlatforms: Number($('#adv-max-platforms').val() || 3),
      maxContributingWeapons: Number($('#adv-max-weapons').val() || 4),
      overkillTolerance: Number($('#adv-overkill').val() || 0.25)
    };
  }

  function isRangeValid(shooter, target, weaponName, weaponMap) {
    const weapon = weaponMap[weaponName];
    if (!weapon) return false;
    const d = geolib.getDistance({ latitude: Number(shooter.latitude), longitude: Number(shooter.longitude) }, { latitude: Number(target.latitude), longitude: Number(target.longitude) });
    return d <= Number(weapon.weapon_range);
  }

  function hasLethality(weaponName, targetType, lethalityMap) { return !!(lethalityMap[weaponName] && lethalityMap[weaponName][targetType]); }
  function calculateContribution(allocatedQty, requiredQty) { return allocatedQty / requiredQty; }

  function buildCandidateSingleWeaponEngagements(ctx) {
    const candidates = [];
    ctx.targets.forEach(target => {
      ctx.shooters.forEach(shooter => {
        shooter.weapons.forEach(loadout => {
          if (!ctx.selectedWeaponSet.has(loadout.name)) return;
          if (!hasLethality(loadout.name, target.type, ctx.lethalityMap)) { ctx.log.push(`reject missing lethality ${loadout.name}->${target.type}`); return; }
          if (!isRangeValid(shooter, target, loadout.name, ctx.weaponMap)) { ctx.log.push(`reject range ${shooter.platform_name}->${target.platform_name} ${loadout.name}`); return; }
          const req = ctx.lethalityMap[loadout.name][target.type];
          if (loadout.quantity < req) { ctx.log.push(`reject ammo ${shooter.platform_name} ${loadout.name}`); return; }
          candidates.push(makeEngagement(target, [{ platform: shooter, weapon: loadout.name, qty: req, requiredQty: req }]));
        });
      });
    });
    return candidates.slice(0, ctx.adv.maxCandidateEngagements);
  }

  function buildCandidateMixedWeaponEngagements(ctx) {
    if (!ctx.adv.includeMixedWeapon) return [];
    const mixed = [];
    ctx.targets.forEach(target => {
      const contribs = [];
      ctx.shooters.forEach(shooter => shooter.weapons.forEach(loadout => {
        if (!ctx.selectedWeaponSet.has(loadout.name)) return;
        if (!hasLethality(loadout.name, target.type, ctx.lethalityMap)) return;
        if (!isRangeValid(shooter, target, loadout.name, ctx.weaponMap)) return;
        contribs.push({ shooter, loadout, req: ctx.lethalityMap[loadout.name][target.type] });
      }));
      contribs.sort((a, b) => (1 / a.req) - (1 / b.req));
      let total = 0;
      const allocations = [];
      const usedWeapons = new Set();
      const usedPlatforms = new Set();
      for (const c of contribs) {
        if (usedWeapons.size >= ctx.adv.maxContributingWeapons && !usedWeapons.has(c.loadout.name)) continue;
        if (!ctx.adv.allowMultiPlatform && usedPlatforms.size && !usedPlatforms.has(c.shooter.platform_name)) continue;
        if (usedPlatforms.size >= ctx.adv.maxContributingPlatforms && !usedPlatforms.has(c.shooter.platform_name)) continue;
        const qty = Math.min(c.loadout.quantity, c.req);
        allocations.push({ platform: c.shooter, weapon: c.loadout.name, qty, requiredQty: c.req });
        total += calculateContribution(qty, c.req);
        usedWeapons.add(c.loadout.name);
        usedPlatforms.add(c.shooter.platform_name);
        if (total >= 1) break;
      }
      if (total >= 1) {
        mixed.push(makeEngagement(target, allocations));
        ctx.log.push(`mixed-engagement success target=${target.platform_name} contributors=${allocations.length}`);
      } else {
        ctx.log.push(`mixed-engagement fail target=${target.platform_name}`);
      }
    });
    return mixed.slice(0, ctx.adv.maxCandidateEngagements);
  }

  function makeEngagement(target, allocations) {
    const totalAmmo = allocations.reduce((s, a) => s + a.qty, 0);
    return {
      targetPlatformId: target.platform_name,
      targetPlatformType: target.type,
      targetPlatformSide: target.side,
      contributingOffensivePlatforms: [...new Set(allocations.map(a => a.platform.platform_name))],
      contributingOffensivePlatformTypes: [...new Set(allocations.map(a => a.platform.type))],
      weaponAllocations: allocations.map(a => ({ platform: a.platform.platform_name, weapon: a.weapon, quantity: a.qty })),
      totalAmmoExpended: totalAmmo,
      satisfiesLethalityRequirement: true
    };
  }

  function validateMissionConstraints(mission) {
    const set = new Set(mission.targetPlatformsDestroyed);
    return set.size === mission.targetPlatformsDestroyed.length;
  }

  function rankMissions(missions) {
    return missions.sort((a, b) => b.numberOfDestroyedPlatforms - a.numberOfDestroyedPlatforms || a.totalAmmoExpended - b.totalAmmoExpended);
  }

  function applyOptionalFilters(missions, opt) {
    return missions.filter(m => m.numberOfDestroyedPlatforms >= opt.minKills && m.numberOfDestroyedPlatforms <= opt.maxKills)
      .filter(m => !opt.mustWeapon || m.weaponsUsed.includes(opt.mustWeapon))
      .filter(m => !opt.excludeWeapon || !m.weaponsUsed.includes(opt.excludeWeapon));
  }

  function formatMissionJson(missions) { return JSON.stringify(missions, null, 2); }
  function writeLog(lines) { $('#missions-log').val(lines.join('\n')); }

  function onGenerateMissions() {
    const selected = {
      shooters: $('#filter-shooters').val() || [],
      targets: $('#filter-targets').val() || [],
      weapons: $('#filter-weapons').val() || []
    };
    const errors = validateRequiredFilters(selected);
    const log = [`requiredFilters=${JSON.stringify(selected)}`];
    if (errors.length) {
      $('#required-validation').text(errors.join(' '));
      log.push(...errors);
      writeLog(log);
      return;
    }

    const opt = readOptionalFilters();
    const adv = readAdvancedGenerationSettings();
    log.push(`optionalFilters=${JSON.stringify(opt)}`);
    log.push(`advancedSettings=${JSON.stringify(adv)}`);

    const platformMap = Object.fromEntries(PLATFORM_DATA.map(p => [p.platform_name, p]));
    const shooters = selected.shooters.map(id => platformMap[id]).filter(Boolean).filter(p => p.side === 'blue');
    const targets = selected.targets.map(id => platformMap[id]).filter(Boolean).filter(p => p.side === 'red');
    const weaponMap = Object.fromEntries(WEAPON_DATA.map(w => [w.weapon_name, w]));
    const lethalityMap = WEAPON_LETHALITY_DATA.reduce((acc, r) => ((acc[r.weapon] ||= {})[r.platformType] = r.quantity, acc), {});
    const ctx = { shooters, targets, weaponMap, lethalityMap, selectedWeaponSet: new Set(selected.weapons), adv, log };

    log.push(`candidate shooters=${shooters.length} targets=${targets.length} selectedWeapons=${selected.weapons.length}`);

    const singles = buildCandidateSingleWeaponEngagements(ctx);
    const mixed = buildCandidateMixedWeaponEngagements(ctx);
    const candidates = [...singles, ...mixed].slice(0, adv.maxCandidateEngagements);
    log.push(`candidate engagements=${candidates.length}`);

    const missions = [];
    const usedKey = new Set();
    for (let i = 0; i < candidates.length; i++) {
      const missionEngagements = [];
      const usedTargets = new Set();
      for (let j = i; j < candidates.length && missionEngagements.length < adv.maxSearchDepth; j++) {
        const e = candidates[j];
        if (usedTargets.has(e.targetPlatformId)) { log.push(`duplicate-target rejection ${e.targetPlatformId}`); continue; }
        missionEngagements.push(e);
        usedTargets.add(e.targetPlatformId);
        if (missionEngagements.length >= adv.maxKillsPerMission) break;
      }
      if (!missionEngagements.length) continue;
      const mission = buildMission(missionEngagements);
      if (!validateMissionConstraints(mission)) continue;
      const key = mission.targetPlatformsDestroyed.sort().join('|');
      if (usedKey.has(key)) continue;
      usedKey.add(key);
      missions.push(mission);
      if (missions.length >= adv.maxMissions * 4) break;
    }

    let filtered = applyOptionalFilters(missions, opt);
    filtered = rankMissions(filtered).slice(0, adv.maxMissions);
    if (!filtered.length) log.push('No missions generated after applying constraints and filters.');
    log.push(`final missions=${filtered.length}`);
    $('#missions-json').val(formatMissionJson(filtered));
    writeLog(log);
  }

  function buildMission(engagements) {
    const weaponsUsed = [...new Set(engagements.flatMap(e => e.weaponAllocations.map(w => w.weapon)))];
    const platformsUsed = [...new Set(engagements.flatMap(e => e.contributingOffensivePlatforms))];
    const platformTypesUsed = [...new Set(engagements.flatMap(e => e.contributingOffensivePlatformTypes))];
    const targetPlatformsDestroyed = engagements.map(e => e.targetPlatformId);
    const targetPlatformTypesDestroyed = [...new Set(engagements.map(e => e.targetPlatformType))];
    const ammoExpendedByWeapon = {};
    const killsByWeapon = {};
    const killsByOffensivePlatform = {};
    const killsByOffensivePlatformType = {};
    engagements.forEach(e => {
      e.weaponAllocations.forEach(a => ammoExpendedByWeapon[a.weapon] = (ammoExpendedByWeapon[a.weapon] || 0) + a.quantity);
      e.contributingOffensivePlatforms.forEach(p => killsByOffensivePlatform[p] = (killsByOffensivePlatform[p] || 0) + 1);
      e.contributingOffensivePlatformTypes.forEach(t => killsByOffensivePlatformType[t] = (killsByOffensivePlatformType[t] || 0) + 1);
      e.weaponAllocations.forEach(a => killsByWeapon[a.weapon] = (killsByWeapon[a.weapon] || 0) + 1);
    });
    return {
      missionId: `mission_${Math.random().toString(36).slice(2, 10)}`,
      offensiveSide: 'blue', targetSide: 'red', engagements,
      offensivePlatformsUsed: platformsUsed,
      offensivePlatformTypesUsed: platformTypesUsed,
      targetPlatformsDestroyed,
      targetPlatformTypesDestroyed,
      weaponsUsed,
      numberOfDestroyedPlatforms: targetPlatformsDestroyed.length,
      totalAmmoExpended: engagements.reduce((s, e) => s + e.totalAmmoExpended, 0),
      ammoExpendedByWeapon,
      killsByWeapon,
      killsByOffensivePlatform,
      killsByOffensivePlatformType
    };
  }

  function updateGenerateState() {
    const selected = { shooters: $('#filter-shooters').val() || [], targets: $('#filter-targets').val() || [], weapons: $('#filter-weapons').val() || [] };
    const errors = validateRequiredFilters(selected);
    $('#required-validation').text(errors.join(' '));
    $('#generate-missions').prop('disabled', errors.length > 0);
  }
})();
