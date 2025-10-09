// js/missions/mission_generator.js
var MissionGenerator = (function() {
  'use strict';

  var EPSILON = 1e-6;
  var engagementCounter = 0;
  var missionCounter = 0;
  var MAX_MISSIONS_PER_PAIR = 200;
  var MAX_ENGAGEMENT_OPTIONS_PER_TARGET = 20;

  function log(message) {
    MissionStorage.addLog(message);
  }

  function buildWeaponRangeMap() {
    var weaponRangeMap = {};
    var weaponData = WeaponStorage.getWeaponData();
    weaponData.forEach(function(entry) {
      if (!entry || !entry.weapon_name) {
        return;
      }
      weaponRangeMap[entry.weapon_name] = Number(entry.weapon_range) || 0;
    });
    return weaponRangeMap;
  }

  function buildLethalityMap() {
    var lethalityMap = {};
    WeaponLethalityStorage.getLethalityData().forEach(function(entry) {
      if (!entry || !entry.weapon || !entry.platformType) {
        return;
      }
      var platformType = entry.platformType.trim();
      if (!platformType) {
        platformType = 'Unspecified';
      }
      if (!lethalityMap[platformType]) {
        lethalityMap[platformType] = {};
      }
      lethalityMap[platformType][entry.weapon.trim()] = Number(entry.quantity) || 0;
    });
    return lethalityMap;
  }

  function buildInventoryForSide(side) {
    var inventory = {};
    PlatformModel.getPlatformData().forEach(function(platform) {
      if (!platform || platform.side !== side) {
        return;
      }
      var weaponMap = {};
      (platform.weapons || []).forEach(function(weapon) {
        if (!weapon || !weapon.name) {
          return;
        }
        var quantity = Number(weapon.quantity) || 0;
        if (quantity > 0) {
          weaponMap[weapon.name] = quantity;
        }
      });
      inventory[platform.platform_name] = {
        platform: platform,
        weapons: weaponMap
      };
    });
    return inventory;
  }

  function cloneAmmoState(inventory) {
    var state = {};
    Object.keys(inventory).forEach(function(platformName) {
      var weapons = {};
      Object.keys(inventory[platformName].weapons).forEach(function(weaponName) {
        weapons[weaponName] = inventory[platformName].weapons[weaponName];
      });
      state[platformName] = weapons;
    });
    return state;
  }

  function getContributorList(side, target, weaponRanges, lethalityMap) {
    var contributors = [];
    var targetType = (target.type && target.type.trim()) ? target.type.trim() : 'Unspecified';
    var lethalityForTarget = lethalityMap[targetType];

    if (!lethalityForTarget) {
      log('No lethality data for target type ' + targetType + ' when evaluating target ' + target.platform_name + '.');
      return contributors;
    }

    PlatformModel.getPlatformData().forEach(function(platform) {
      if (!platform || platform.side !== side) {
        return;
      }

      var distance = DistanceStorage.getDistanceBetweenPlatforms(platform.platform_name, target.platform_name);
      if (distance === null || typeof distance === 'undefined') {
        log('Missing distance data between ' + platform.platform_name + ' and ' + target.platform_name + '. Engagements skipped.');
        return;
      }

      (platform.weapons || []).forEach(function(weapon) {
        if (!weapon || !weapon.name) {
          return;
        }

        var weaponName = weapon.name;
        var lethalityRequirement = lethalityForTarget[weaponName];
        if (!lethalityRequirement || lethalityRequirement <= 0) {
          return;
        }

        var range = weaponRanges[weaponName];
        if (!range && range !== 0) {
          log('Weapon range missing for ' + weaponName + '. Skipping contributor from ' + platform.platform_name + '.');
          return;
        }

        if (range < distance) {
          return;
        }

        var quantity = Number(weapon.quantity) || 0;
        if (quantity <= 0) {
          return;
        }

        contributors.push({
          platformName: platform.platform_name,
          platformType: (platform.type && platform.type.trim()) ? platform.type.trim() : 'Unspecified',
          weaponName: weaponName,
          maxShots: quantity,
          lethalityRequirement: lethalityRequirement,
          contributionPerShot: 1 / lethalityRequirement,
          weaponRange: range,
          distance: distance
        });
      });
    });

    return contributors;
  }

  function exploreContributors(contributors, target, offensiveSide) {
    if (!contributors.length) {
      return [];
    }

    contributors = contributors.slice().sort(function(a, b) {
      if (b.contributionPerShot === a.contributionPerShot) {
        return a.lethalityRequirement - b.lethalityRequirement;
      }
      return b.contributionPerShot - a.contributionPerShot;
    });

    var maxContributionFromIndex = [];
    var runningTotal = 0;
    for (var idx = contributors.length - 1; idx >= 0; idx--) {
      runningTotal += contributors[idx].maxShots * contributors[idx].contributionPerShot;
      maxContributionFromIndex[idx] = runningTotal;
    }

    var assignments = [];
    var bestShotCount = null;
    var engagements = [];

    function recurse(index, totalContribution, totalShots) {
      if (index < contributors.length && totalContribution + maxContributionFromIndex[index] < 1 - EPSILON) {
        return;
      }

      if (bestShotCount !== null && totalShots > bestShotCount) {
        return;
      }

      if (totalContribution >= 1 - EPSILON) {
        var engagement = createEngagement(target, offensiveSide, assignments, totalContribution);
        if (!engagement) {
          return;
        }

        if (bestShotCount === null || totalShots < bestShotCount) {
          bestShotCount = totalShots;
          engagements = [engagement];
        } else if (totalShots === bestShotCount) {
          engagements.push(engagement);
        }
        return;
      }

      if (index >= contributors.length) {
        return;
      }

      var contributor = contributors[index];
      var maxShotsNeeded = Math.min(
        contributor.maxShots,
        Math.ceil((1 - totalContribution) / contributor.contributionPerShot)
      );

      for (var count = 0; count <= maxShotsNeeded; count++) {
        var nextShots = totalShots + count;
        if (bestShotCount !== null && nextShots > bestShotCount) {
          break;
        }
        if (count > 0) {
          assignments.push({ contributor: contributor, count: count });
        }
        recurse(index + 1, totalContribution + count * contributor.contributionPerShot, nextShots);
        if (count > 0) {
          assignments.pop();
        }
      }
    }

    recurse(0, 0, 0);
    return engagements;
  }

  function createEngagement(target, offensiveSide, assignments, totalContribution) {
    if (!assignments.length) {
      return null;
    }

    var allocationMap = {};
    var offensivePlatforms = {};

    assignments.forEach(function(entry) {
      var contributor = entry.contributor;
      var key = contributor.platformName + '||' + contributor.weaponName;
      if (!allocationMap[key]) {
        allocationMap[key] = {
          platform: contributor.platformName,
          platformType: contributor.platformType,
          weapon: contributor.weaponName,
          quantity: 0,
          weaponRange: contributor.weaponRange,
          distance: contributor.distance,
          lethalityRequirement: contributor.lethalityRequirement,
          contribution: 0
        };
      }
      allocationMap[key].quantity += entry.count;
      allocationMap[key].contribution += entry.count * contributor.contributionPerShot;
      offensivePlatforms[contributor.platformName] = contributor.platformType;
    });

    var allocations = Object.keys(allocationMap).map(function(key) {
      var allocation = allocationMap[key];
      allocation.contribution = Number(allocation.contribution.toFixed(6));
      return allocation;
    }).sort(function(a, b) {
      if (a.platform === b.platform) {
        return a.weapon.localeCompare(b.weapon);
      }
      return a.platform.localeCompare(b.platform);
    });

    var totalShots = allocations.reduce(function(sum, allocation) {
      return sum + allocation.quantity;
    }, 0);

    engagementCounter += 1;

    return {
      engagementId: 'engagement-' + engagementCounter,
      offensiveSide: offensiveSide,
      targetSide: target.side,
      targetPlatform: target.platform_name,
      targetPlatformType: (target.type && target.type.trim()) ? target.type.trim() : 'Unspecified',
      offensivePlatforms: Object.keys(offensivePlatforms).sort(),
      weaponAllocations: allocations,
      totalShots: totalShots,
      killContribution: Number(totalContribution.toFixed(6)),
      lethalityRequirementMet: totalContribution + EPSILON >= 1,
      summary: buildEngagementSummary(target, allocations)
    };
  }

  function buildEngagementSummary(target, allocations) {
    var parts = allocations.map(function(allocation) {
      return allocation.platform + ' fires ' + allocation.quantity + 'x ' + allocation.weapon;
    });
    return parts.join('; ') + ' to destroy ' + target.platform_name;
  }

  function canApplyEngagement(engagement, ammoState) {
    return engagement.weaponAllocations.every(function(allocation) {
      var platformAmmo = ammoState[allocation.platform];
      if (!platformAmmo) {
        return false;
      }
      var available = platformAmmo[allocation.weapon];
      return typeof available === 'number' && available >= allocation.quantity;
    });
  }

  function applyEngagement(engagement, ammoState) {
    engagement.weaponAllocations.forEach(function(allocation) {
      ammoState[allocation.platform][allocation.weapon] -= allocation.quantity;
    });
  }

  function revertEngagement(engagement, ammoState) {
    engagement.weaponAllocations.forEach(function(allocation) {
      ammoState[allocation.platform][allocation.weapon] += allocation.quantity;
    });
  }

  function computeAmmoUsage(engagements) {
    var usage = {};
    engagements.forEach(function(engagement) {
      engagement.weaponAllocations.forEach(function(allocation) {
        if (!usage[allocation.platform]) {
          usage[allocation.platform] = {};
        }
        if (!usage[allocation.platform][allocation.weapon]) {
          usage[allocation.platform][allocation.weapon] = 0;
        }
        usage[allocation.platform][allocation.weapon] += allocation.quantity;
      });
    });
    return usage;
  }

  function cloneEngagement(engagement) {
    return {
      engagementId: engagement.engagementId,
      offensiveSide: engagement.offensiveSide,
      targetSide: engagement.targetSide,
      targetPlatform: engagement.targetPlatform,
      targetPlatformType: engagement.targetPlatformType,
      offensivePlatforms: engagement.offensivePlatforms.slice(),
      weaponAllocations: engagement.weaponAllocations.map(function(allocation) {
        return {
          platform: allocation.platform,
          platformType: allocation.platformType,
          weapon: allocation.weapon,
          quantity: allocation.quantity,
          weaponRange: allocation.weaponRange,
          distance: allocation.distance,
          lethalityRequirement: allocation.lethalityRequirement,
          contribution: allocation.contribution
        };
      }),
      totalShots: engagement.totalShots,
      killContribution: engagement.killContribution,
      lethalityRequirementMet: engagement.lethalityRequirementMet,
      summary: engagement.summary
    };
  }

  function mapToPlatformWeaponArray(map) {
    return Object.keys(map).sort().map(function(platform) {
      var weapons = map[platform];
      return {
        platform: platform,
        weapons: Object.keys(weapons).sort().map(function(weapon) {
          return {
            weapon: weapon,
            quantity: weapons[weapon]
          };
        })
      };
    });
  }

  function computeRemainingAmmo(inventory, usage) {
    var remaining = {};
    Object.keys(inventory).forEach(function(platformName) {
      remaining[platformName] = {};
      Object.keys(inventory[platformName].weapons).forEach(function(weaponName) {
        var total = inventory[platformName].weapons[weaponName];
        var used = (usage[platformName] && usage[platformName][weaponName]) || 0;
        remaining[platformName][weaponName] = total - used;
      });
    });
    return remaining;
  }

  function buildMissionObject(side, enemySide, engagements, inventory) {
    missionCounter += 1;
    var missionId = 'mission-' + missionCounter;

    var targetsDestroyed = engagements.map(function(engagement) {
      return engagement.targetPlatform;
    });
    var targetTypes = {};
    var offensivePlatforms = {};
    var offensivePlatformTypes = {};
    var weaponSummary = {};

    engagements.forEach(function(engagement) {
      targetTypes[engagement.targetPlatformType] = true;
      engagement.offensivePlatforms.forEach(function(platformName) {
        offensivePlatforms[platformName] = true;
      });
      engagement.weaponAllocations.forEach(function(allocation) {
        offensivePlatformTypes[allocation.platformType || 'Unspecified'] = true;
        if (!weaponSummary[allocation.weapon]) {
          weaponSummary[allocation.weapon] = {
            weapon: allocation.weapon,
            quantity: 0,
            platforms: {}
          };
        }
        weaponSummary[allocation.weapon].quantity += allocation.quantity;
        weaponSummary[allocation.weapon].platforms[allocation.platform] = true;
      });
    });

    var weaponSummaryArray = Object.keys(weaponSummary).sort().map(function(weaponName) {
      var entry = weaponSummary[weaponName];
      return {
        weapon: entry.weapon,
        quantity: entry.quantity,
        platforms: Object.keys(entry.platforms).sort()
      };
    });

    var ammoUsage = computeAmmoUsage(engagements);
    var remainingAmmo = computeRemainingAmmo(inventory, ammoUsage);
    var totalAmmoExpended = weaponSummaryArray.reduce(function(sum, entry) {
      return sum + entry.quantity;
    }, 0);

    return {
      missionId: missionId,
      offensiveSide: side,
      enemySide: enemySide,
      destroyedPlatformCount: engagements.length,
      engagementCount: engagements.length,
      targetsDestroyed: targetsDestroyed,
      targetTypesDestroyed: Object.keys(targetTypes).sort(),
      offensivePlatforms: Object.keys(offensivePlatforms).sort(),
      offensivePlatformTypes: Object.keys(offensivePlatformTypes).sort(),
      weaponsUsed: weaponSummaryArray,
      totalAmmoExpended: totalAmmoExpended,
      ammoExpendedByPlatform: mapToPlatformWeaponArray(ammoUsage),
      remainingAmmoByPlatform: mapToPlatformWeaponArray(remainingAmmo),
      engagements: engagements.map(cloneEngagement)
    };
  }

  function generateMissionsForSides(side, enemySide, weaponRanges, lethalityMap) {
    var inventory = buildInventoryForSide(side);
    var ammoState = cloneAmmoState(inventory);
    var enemyPlatforms = PlatformModel.getPlatformData().filter(function(platform) {
      return platform.side === enemySide;
    }).sort(function(a, b) {
      return a.platform_name.localeCompare(b.platform_name);
    });

    var engagementOptionsByTarget = {};
    enemyPlatforms.forEach(function(target) {
      log('Evaluating target ' + target.platform_name + ' (' + enemySide + ') for offensive side ' + side + '.');
      var contributors = getContributorList(side, target, weaponRanges, lethalityMap);
      var engagements = exploreContributors(contributors, target, side);
      if (engagements.length > MAX_ENGAGEMENT_OPTIONS_PER_TARGET) {
        var originalCount = engagements.length;
        engagements = engagements.sort(function(a, b) {
          if (a.totalShots === b.totalShots) {
            return a.weaponAllocations.length - b.weaponAllocations.length;
          }
          return a.totalShots - b.totalShots;
        }).slice(0, MAX_ENGAGEMENT_OPTIONS_PER_TARGET);
        log('Engagement options for target ' + target.platform_name + ' limited to ' + MAX_ENGAGEMENT_OPTIONS_PER_TARGET + ' (from ' + originalCount + ' minimal combinations).');
      }
      if (!engagements.length) {
        log('No engagement options found for target ' + target.platform_name + ' by side ' + side + '.');
      } else {
        log('Generated ' + engagements.length + ' engagement option(s) for target ' + target.platform_name + ' by side ' + side + '.');
      }
      engagementOptionsByTarget[target.platform_name] = engagements;
    });

    var targets = enemyPlatforms.map(function(platform) {
      return platform.platform_name;
    });

    var engagementsBuffer = [];
    var missionCountForPair = 0;
    var missionLimitReached = false;

    function backtrack(targetIndex) {
      if (missionLimitReached) {
        return;
      }

      if (targetIndex >= targets.length) {
        if (engagementsBuffer.length > 0) {
          var mission = buildMissionObject(side, enemySide, engagementsBuffer, inventory);
          MissionStorage.addMission(mission);
          missionCountForPair += 1;
          if (missionCountForPair >= MAX_MISSIONS_PER_PAIR) {
            missionLimitReached = true;
          }
        }
        return;
      }

      var targetName = targets[targetIndex];
      var options = engagementOptionsByTarget[targetName] || [];

      // Option: skip this target entirely
      backtrack(targetIndex + 1);
      if (missionLimitReached) {
        return;
      }

      options.forEach(function(option) {
        if (!canApplyEngagement(option, ammoState)) {
          return;
        }
        applyEngagement(option, ammoState);
        engagementsBuffer.push(option);
        backtrack(targetIndex + 1);
        engagementsBuffer.pop();
        revertEngagement(option, ammoState);
        if (missionLimitReached) {
          return;
        }
      });
    }

    backtrack(0);

    if (missionLimitReached) {
      log('Mission generation limit of ' + MAX_MISSIONS_PER_PAIR + ' reached for side ' + side + ' vs ' + enemySide + '. Additional combinations were not recorded.');
    }

    log('Completed mission generation for side ' + side + ' vs ' + enemySide + '. Total missions: ' + MissionStorage.getMissions().length + '.');
  }

  function generateAllMissions() {
    MissionStorage.clearAll();
    engagementCounter = 0;
    missionCounter = 0;

    var weaponRanges = buildWeaponRangeMap();
    var lethalityMap = buildLethalityMap();
    var platformData = PlatformModel.getPlatformData();

    var sides = {};
    platformData.forEach(function(platform) {
      if (platform && platform.side) {
        sides[platform.side] = true;
      }
    });

    var sideList = Object.keys(sides);
    if (!sideList.length) {
      log('No sides available to generate missions.');
      return [];
    }

    sideList.forEach(function(offensiveSide) {
      var enemySides = sideList.filter(function(side) {
        return side !== offensiveSide;
      });
      if (!enemySides.length) {
        log('Side ' + offensiveSide + ' has no opposing sides. Skipping mission generation for this side.');
        return;
      }

      enemySides.forEach(function(enemySide) {
        generateMissionsForSides(offensiveSide, enemySide, weaponRanges, lethalityMap);
      });
    });

    return MissionStorage.getMissions();
  }

  return {
    generateAllMissions: generateAllMissions
  };
})();
