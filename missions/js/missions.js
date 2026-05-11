(function () {
  'use strict';

  const DEFAULT_ADVANCED_SETTINGS = {
    maxMissionsToReturn: 25,
    maxCandidateEngagementsToExplore: 500,
    maxSearchDepth: 8,
    maxKillsPerMission: 8,
    includeMixedWeaponEngagements: true,
    allowMultiPlatformEngagements: true,
    maxContributingPlatformsPerEngagement: 3,
    maxContributingWeaponsPerEngagement: 3,
    overkillTolerance: 0.35,
    debugLoggingVerbosity: 'normal'
  };

  function normalizeSide(side) { return String(side || '').trim().toLowerCase(); }

  function getDataContext() {
    const platforms = PlatformModel.getPlatformData();
    const weapons = WeaponStorage.getWeaponData();
    const lethality = WeaponLethalityStorage.getLethalityData();

    const weaponByName = {};
    weapons.forEach((w) => { weaponByName[w.weapon_name] = w; });

    const lethalityByWeaponAndType = {};
    lethality.forEach((l) => {
      lethalityByWeaponAndType[`${l.weapon}||${l.platformType}`] = Number(l.quantity);
    });

    return { platforms, weapons, lethality, weaponByName, lethalityByWeaponAndType };
  }

  function validateRequiredFilters(filters) {
    const errors = [];
    if (!filters.blueShooters.length) errors.push('Select at least one Blue shooter before generating missions.');
    if (!filters.redTargets.length) errors.push('Select at least one Red target before generating missions.');
    if (!filters.blueWeapons.length) errors.push('Select at least one Blue weapon before generating missions.');
    return { valid: errors.length === 0, errors };
  }

  function readOptionalFilters() {
    return {
      offensivePlatformTypes: getMultiValue('filter-offensive-types'),
      targetPlatformTypes: getMultiValue('filter-target-types'),
      minDestroyedPlatforms: toNumberOrNull(document.getElementById('filter-min-kills').value),
      maxDestroyedPlatforms: toNumberOrNull(document.getElementById('filter-max-kills').value),
      includeWeapon: document.getElementById('filter-include-weapon').value,
      excludeWeapon: document.getElementById('filter-exclude-weapon').value
    };
  }

  function readAdvancedGenerationSettings() {
    return {
      maxMissionsToReturn: toNumberOrDefault('advanced-max-missions', DEFAULT_ADVANCED_SETTINGS.maxMissionsToReturn),
      maxCandidateEngagementsToExplore: toNumberOrDefault('advanced-max-engagements', DEFAULT_ADVANCED_SETTINGS.maxCandidateEngagementsToExplore),
      maxSearchDepth: toNumberOrDefault('advanced-max-depth', DEFAULT_ADVANCED_SETTINGS.maxSearchDepth),
      maxKillsPerMission: toNumberOrDefault('advanced-max-kills', DEFAULT_ADVANCED_SETTINGS.maxKillsPerMission),
      includeMixedWeaponEngagements: document.getElementById('advanced-include-mixed').checked,
      allowMultiPlatformEngagements: document.getElementById('advanced-allow-multi-platform').checked,
      maxContributingPlatformsPerEngagement: toNumberOrDefault('advanced-max-contrib-platforms', DEFAULT_ADVANCED_SETTINGS.maxContributingPlatformsPerEngagement),
      maxContributingWeaponsPerEngagement: toNumberOrDefault('advanced-max-contrib-weapons', DEFAULT_ADVANCED_SETTINGS.maxContributingWeaponsPerEngagement),
      overkillTolerance: parseFloat(document.getElementById('advanced-overkill-tolerance').value) || DEFAULT_ADVANCED_SETTINGS.overkillTolerance,
      debugLoggingVerbosity: document.getElementById('advanced-log-verbosity').value || DEFAULT_ADVANCED_SETTINGS.debugLoggingVerbosity
    };
  }

  function isRangeValid(shooterName, targetName, weaponRange) {
    const distance = DistanceStorage.getDistanceBetweenPlatforms(shooterName, targetName);
    return distance !== null && distance <= weaponRange;
  }

  function getLethalityRequired(lethalityMap, weaponName, targetType) {
    return lethalityMap[`${weaponName}||${targetType}`] || null;
  }

  function calculateWeaponContribution(allocated, required) {
    if (!required || required <= 0) return 0;
    return allocated / required;
  }

  function buildCandidateEngagements(ctx, constrainedShooters, constrainedTargets, constrainedWeapons, settings, logLines) {
    const all = [];
    let pairCount = 0;

    constrainedTargets.forEach((target) => {
      const targetType = target.type || 'Unspecified';
      const perTargetContrib = [];

      constrainedShooters.forEach((shooter) => {
        if (normalizeSide(shooter.side) !== 'blue') return;
        (shooter.weapons || []).forEach((w) => {
          if (!constrainedWeapons.has(w.name)) return;
          pairCount += 1;

          const weaponConfig = ctx.weaponByName[w.name];
          const required = getLethalityRequired(ctx.lethalityByWeaponAndType, w.name, targetType);
          if (!required) { logLines.push(`Rejected ${shooter.platform_name}->${target.platform_name} ${w.name}: missing lethality.`); return; }
          if (!weaponConfig || !isRangeValid(shooter.platform_name, target.platform_name, weaponConfig.weapon_range)) { logLines.push(`Rejected ${shooter.platform_name}->${target.platform_name} ${w.name}: range failure.`); return; }
          if ((Number(w.quantity) || 0) <= 0) { logLines.push(`Rejected ${shooter.platform_name}->${target.platform_name} ${w.name}: insufficient ammo.`); return; }

          const qty = Math.min(Number(w.quantity), required);
          const contrib = calculateWeaponContribution(qty, required);
          perTargetContrib.push({ shooter, target, weaponName: w.name, allocated: qty, required, contribution: contrib });

          if (contrib >= 1) {
            all.push(createEngagementFromContributors(target, [perTargetContrib[perTargetContrib.length - 1]]));
          }
        });
      });

      if (settings.includeMixedWeaponEngagements) {
        const sorted = perTargetContrib.slice().sort((a, b) => b.contribution - a.contribution);
        let sum = 0;
        const mix = [];
        const usedPlatforms = new Set();
        const usedWeapons = new Set();
        for (const c of sorted) {
          if (mix.length >= settings.maxContributingWeaponsPerEngagement) break;
          if (!settings.allowMultiPlatformEngagements && usedPlatforms.size && !usedPlatforms.has(c.shooter.platform_name)) continue;
          if (!usedPlatforms.has(c.shooter.platform_name) && usedPlatforms.size >= settings.maxContributingPlatformsPerEngagement) continue;

          mix.push(c); usedPlatforms.add(c.shooter.platform_name); usedWeapons.add(c.weaponName); sum += c.contribution;
          if (sum >= 1) {
            all.push(createEngagementFromContributors(target, mix));
            logLines.push(`Accepted mixed-weapon engagement on ${target.platform_name} with ${mix.length} allocations.`);
            break;
          }
        }
      }
    });

    logLines.push(`Candidate weapon-target pairs explored: ${pairCount}`);
    return all.slice(0, settings.maxCandidateEngagementsToExplore);
  }

  function createEngagementFromContributors(target, contributors) {
    return {
      targetPlatformId: target.platform_name,
      targetPlatformType: target.type || 'Unspecified',
      targetPlatformSide: target.side,
      contributors: contributors.map((c) => ({ offensivePlatform: c.shooter.platform_name, offensivePlatformType: c.shooter.type || 'Unspecified', weapon: c.weaponName, allocatedQuantity: c.allocated, requiredQuantity: c.required, contribution: c.contribution })),
      totalAmmoExpended: contributors.reduce((sum, c) => sum + c.allocated, 0),
      satisfiesLethalityRequirement: contributors.reduce((sum, c) => sum + c.contribution, 0) >= 1
    };
  }

  function generateMissions(engagements, settings, logLines) {
    const missions = [];
    const byTarget = {};
    engagements.forEach((e) => { byTarget[e.targetPlatformId] = byTarget[e.targetPlatformId] || []; byTarget[e.targetPlatformId].push(e); });
    const targets = Object.keys(byTarget);

    function backtrack(idx, current, usedTargets, ammoUsed) {
      if (missions.length >= settings.maxMissionsToReturn) return;
      if (idx >= targets.length || current.length >= settings.maxSearchDepth) {
        if (current.length) missions.push(buildMission(current));
        return;
      }
      backtrack(idx + 1, current, usedTargets, ammoUsed);
      for (const e of byTarget[targets[idx]]) {
        if (usedTargets.has(e.targetPlatformId)) { logLines.push(`Duplicate-target rejection: ${e.targetPlatformId}`); continue; }
        if (!canAfford(e, ammoUsed)) { logLines.push(`Rejected by ammo limits for target ${e.targetPlatformId}`); continue; }
        const nextAmmo = cloneAmmo(ammoUsed); applyAmmo(e, nextAmmo);
        const nextCurrent = current.concat([e]);
        const nextUsedTargets = new Set(usedTargets); nextUsedTargets.add(e.targetPlatformId);
        if (nextCurrent.length >= settings.maxKillsPerMission) { missions.push(buildMission(nextCurrent)); continue; }
        backtrack(idx + 1, nextCurrent, nextUsedTargets, nextAmmo);
      }
    }

    backtrack(0, [], new Set(), {});
    return missions;
  }

  function canAfford(engagement, ammoUsed) { return engagement.contributors.every((c) => ((ammoUsed[c.offensivePlatform]?.[c.weapon] || 0) + c.allocatedQuantity) <= getPlatformWeaponQuantity(c.offensivePlatform, c.weapon)); }
  function getPlatformWeaponQuantity(platformName, weaponName) { const p = PlatformModel.getPlatformDataFromName(platformName); const w = (p?.weapons || []).find((item) => item.name === weaponName); return Number(w?.quantity || 0); }
  function cloneAmmo(ammo) { return JSON.parse(JSON.stringify(ammo)); }
  function applyAmmo(engagement, ammo) { engagement.contributors.forEach((c) => { ammo[c.offensivePlatform] = ammo[c.offensivePlatform] || {}; ammo[c.offensivePlatform][c.weapon] = (ammo[c.offensivePlatform][c.weapon] || 0) + c.allocatedQuantity; }); }

  function buildMission(engagements) {
    const mission = { missionId: `mission_${Math.random().toString(36).slice(2, 10)}`, offensiveSide: 'blue', targetSide: 'red', engagements: engagements };
    const offensivePlatforms = new Set(); const offensiveTypes = new Set(); const targets = new Set(); const targetTypes = new Set(); const weapons = new Set();
    const ammoByWeapon = {}; const killsByWeapon = {}; const killsByPlatform = {}; const killsByPlatformType = {};
    engagements.forEach((e) => {
      targets.add(e.targetPlatformId); targetTypes.add(e.targetPlatformType);
      e.contributors.forEach((c) => { offensivePlatforms.add(c.offensivePlatform); offensiveTypes.add(c.offensivePlatformType); weapons.add(c.weapon); ammoByWeapon[c.weapon] = (ammoByWeapon[c.weapon] || 0) + c.allocatedQuantity; killsByWeapon[c.weapon] = (killsByWeapon[c.weapon] || 0) + 1; killsByPlatform[c.offensivePlatform] = (killsByPlatform[c.offensivePlatform] || 0) + 1; killsByPlatformType[c.offensivePlatformType] = (killsByPlatformType[c.offensivePlatformType] || 0) + 1; });
    });
    mission.offensivePlatformsUsed = Array.from(offensivePlatforms);
    mission.offensivePlatformTypesUsed = Array.from(offensiveTypes);
    mission.targetPlatformsDestroyed = Array.from(targets);
    mission.targetPlatformTypesDestroyed = Array.from(targetTypes);
    mission.weaponsUsed = Array.from(weapons);
    mission.destroyedPlatformCount = targets.size;
    mission.totalAmmoExpended = Object.values(ammoByWeapon).reduce((a, b) => a + b, 0);
    mission.ammoExpendedByWeapon = ammoByWeapon;
    mission.killsByWeapon = killsByWeapon;
    mission.killsByOffensivePlatform = killsByPlatform;
    mission.killsByOffensivePlatformType = killsByPlatformType;
    return mission;
  }

  function rankMissionsByDestroyedCount(missions) {
    return missions.sort((a, b) => (b.destroyedPlatformCount - a.destroyedPlatformCount) || (a.totalAmmoExpended - b.totalAmmoExpended));
  }

  function applyOptionalFilters(missions, filters) {
    return missions.filter((m) => {
      if (filters.minDestroyedPlatforms !== null && m.destroyedPlatformCount < filters.minDestroyedPlatforms) return false;
      if (filters.maxDestroyedPlatforms !== null && m.destroyedPlatformCount > filters.maxDestroyedPlatforms) return false;
      if (filters.includeWeapon && !m.weaponsUsed.includes(filters.includeWeapon)) return false;
      if (filters.excludeWeapon && m.weaponsUsed.includes(filters.excludeWeapon)) return false;
      return true;
    });
  }

  function formatMissionJson(missions) { return JSON.stringify(missions, null, 2); }
  function writeGenerationLog(logLines) { document.getElementById('mission-log-output').value = logLines.join('\n'); }

  function getMultiValue(id) { return Array.from(document.getElementById(id).selectedOptions).map((o) => o.value).filter(Boolean); }
  function toNumberOrNull(v) { if (v === '' || v === null || typeof v === 'undefined') return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  function toNumberOrDefault(id, d) { const n = Number(document.getElementById(id).value); return Number.isFinite(n) ? n : d; }

  function initControls() {
    const ctx = getDataContext();
    const bluePlatforms = ctx.platforms.filter((p) => normalizeSide(p.side) === 'blue');
    const redPlatforms = ctx.platforms.filter((p) => normalizeSide(p.side) === 'red');
    const blueWeapons = ctx.weapons.filter((w) => normalizeSide(w.side) === 'blue');

    populateSelect('filter-blue-shooters', bluePlatforms.map((p) => p.platform_name));
    populateSelect('filter-red-targets', redPlatforms.map((p) => p.platform_name));
    populateSelect('filter-blue-weapons', blueWeapons.map((w) => w.weapon_name));
    populateSelect('filter-include-weapon', [''].concat(blueWeapons.map((w) => w.weapon_name)), true);
    populateSelect('filter-exclude-weapon', [''].concat(blueWeapons.map((w) => w.weapon_name)), true);

    const offensiveTypes = [...new Set(bluePlatforms.map((p) => p.type || 'Unspecified'))];
    const targetTypes = [...new Set(redPlatforms.map((p) => p.type || 'Unspecified'))];
    populateSelect('filter-offensive-types', offensiveTypes);
    populateSelect('filter-target-types', targetTypes);

    document.getElementById('advanced-toggle').addEventListener('click', () => document.getElementById('advanced-panel').classList.toggle('hidden'));
    ['filter-blue-shooters', 'filter-red-targets', 'filter-blue-weapons'].forEach((id) => document.getElementById(id).addEventListener('change', updateGenerateButtonState));
    updateGenerateButtonState();

    document.getElementById('generate-missions-btn').addEventListener('click', () => runGeneration(ctx));
  }

  function populateSelect(id, values, includeBlank) {
    const select = document.getElementById(id); select.innerHTML = '';
    values.forEach((v) => { if (!includeBlank && !v) return; const o = document.createElement('option'); o.value = v; o.textContent = v || '-- Any --'; select.appendChild(o); });
  }

  function readRequiredFilters() { return { blueShooters: getMultiValue('filter-blue-shooters'), redTargets: getMultiValue('filter-red-targets'), blueWeapons: getMultiValue('filter-blue-weapons') }; }

  function updateGenerateButtonState() {
    const validation = validateRequiredFilters(readRequiredFilters());
    document.getElementById('generate-missions-btn').disabled = !validation.valid;
    document.getElementById('validation-message').textContent = validation.errors.join(' ');
  }

  function runGeneration(ctx) {
    const logLines = [];
    const required = readRequiredFilters();
    const validation = validateRequiredFilters(required);
    if (!validation.valid) { writeGenerationLog(validation.errors); return; }

    const optional = readOptionalFilters();
    const advanced = readAdvancedGenerationSettings();
    logLines.push(`Required filters: ${JSON.stringify(required)}`);
    logLines.push(`Optional filters: ${JSON.stringify(optional)}`);
    logLines.push(`Advanced settings: ${JSON.stringify(advanced)}`);

    const constrainedShooters = ctx.platforms.filter((p) => required.blueShooters.includes(p.platform_name) && normalizeSide(p.side) === 'blue');
    const constrainedTargets = ctx.platforms.filter((p) => required.redTargets.includes(p.platform_name) && normalizeSide(p.side) === 'red');
    const constrainedWeapons = new Set(required.blueWeapons);

    logLines.push(`Candidate offensive platforms: ${constrainedShooters.length}`);
    logLines.push(`Candidate target platforms: ${constrainedTargets.length}`);
    logLines.push(`Candidate weapons: ${constrainedWeapons.size}`);

    const candidateEngagements = buildCandidateEngagements(ctx, constrainedShooters, constrainedTargets, constrainedWeapons, advanced, logLines);
    if (!candidateEngagements.length) logLines.push('No missions generated: no valid candidate engagements found.');
    const generatedMissions = generateMissions(candidateEngagements, advanced, logLines);
    const filtered = applyOptionalFilters(generatedMissions, optional);
    const ranked = rankMissionsByDestroyedCount(filtered).slice(0, advanced.maxMissionsToReturn);

    if (!ranked.length) { logLines.push('No missions generated after filtering/ranking constraints.'); }
    logLines.push(`Final number of generated missions: ${ranked.length}`);

    document.getElementById('missions-json-output').value = formatMissionJson(ranked);
    writeGenerationLog(logLines);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('missions-root')) return;
    DistanceStorage.refreshDistanceData();
    initControls();
  });
})();
