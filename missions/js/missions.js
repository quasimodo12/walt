(function () {
  'use strict';

  const MissionModule = {
    logs: [],
    log(msg) { this.logs.push(`[${new Date().toISOString()}] ${msg}`); },
    getWeaponMap(weapons) { const m={}; weapons.forEach(w=>m[w.weapon_name]=w); return m; },
    getLethalityMap(lethality) { const m={}; lethality.forEach(l=>m[`${l.weapon}||${l.platformType}`]=l.quantity); return m; },
    getAmmoMap(platforms) {
      const ammo = {}; platforms.forEach(p=>{ ammo[p.platform_name]={}; (p.weapons||[]).forEach(w=>ammo[p.platform_name][w.name]=parseInt(w.quantity,10)||0); }); return ammo;
    },
    canRange(offPlat, target, weapon, distanceLookup){
      const d = distanceLookup(`${offPlat.platform_name}---${target.platform_name}`) || distanceLookup(`${target.platform_name}---${offPlat.platform_name}`);
      return typeof d === 'number' && d <= weapon.weapon_range;
    },
    buildCandidates(ctx){
      const cands = []; let pairCount=0;
      for (const target of ctx.targets) {
        const validAllocs = [];
        for (const off of ctx.offensives) {
          for (const loadout of (off.weapons||[])) {
            const weapon = ctx.weaponMap[loadout.name];
            if (!weapon) { this.log(`reject ${off.platform_name}/${loadout.name}: missing weapon def`); continue; }
            if (!this.canRange(off,target,weapon,ctx.distanceLookup)) { this.log(`range failure ${off.platform_name} -> ${target.platform_name} with ${loadout.name}`); continue; }
            const req = ctx.lethalityMap[`${loadout.name}||${target.type}`];
            if (!req) { this.log(`missing lethality ${loadout.name} vs ${target.type}`); continue; }
            const qty = parseInt(loadout.quantity,10)||0;
            if (qty<=0) { this.log(`insufficient ammo ${off.platform_name}/${loadout.name}`); continue; }
            pairCount += 1;
            validAllocs.push({offensivePlatform:off.platform_name, offensiveType:off.type, weapon:loadout.name, maxQty:qty, reqQty:req, contributionPerShot:1/req});
          }
        }
        if (validAllocs.length===0) continue;
        // single-weapon engagements
        validAllocs.forEach(a=>{
          if (a.maxQty>=a.reqQty) cands.push(this.buildEngagement(target,[{...a, qty:a.reqQty}]));
        });
        // mixed engagements (greedy)
        const sorted=[...validAllocs].sort((a,b)=>b.contributionPerShot-a.contributionPerShot);
        const allocs=[]; let sum=0;
        for (const a of sorted){ if (sum>=1) break; const need=Math.ceil((1-sum)*a.reqQty); const qty=Math.min(need,a.maxQty); if (qty<=0) continue; allocs.push({...a, qty}); sum += qty/a.reqQty; }
        if (sum>=1 && allocs.length>1) { this.log(`mixed-weapon engagement for ${target.platform_name} built with ${allocs.length} allocations`); cands.push(this.buildEngagement(target, allocs)); }
      }
      this.log(`candidate weapon-target pairs: ${pairCount}`);
      return cands;
    },
    buildEngagement(target, allocs){
      const offensivePlatforms=[...new Set(allocs.map(a=>a.offensivePlatform))];
      const offensiveTypes=[...new Set(allocs.map(a=>a.offensiveType))];
      const totalAmmo=allocs.reduce((s,a)=>s+a.qty,0);
      const contribution=allocs.reduce((s,a)=>s+(a.qty/a.reqQty),0);
      return { targetPlatform: target.platform_name, targetPlatformType: target.type, targetPlatformSide: target.side, offensivePlatforms, offensivePlatformTypes: offensiveTypes, weaponAllocations: allocs.map(a=>({platform:a.offensivePlatform, weapon:a.weapon, quantity:a.qty, requiredQuantity:a.reqQty, contribution:a.qty/a.reqQty})), totalAmmoExpended: totalAmmo, satisfiesLethalityRequirement: contribution>=1 };
    },
    generateMissions(ctx,cands){
      const missions=[]; const limits=ctx.filters;
      const backtrack=(idx,state)=>{
        if (missions.length>=limits.maxMissions) return;
        if (state.engagements.length>=limits.maxKillsPerMission || idx>=cands.length) {
          if (state.engagements.length>0 && this.validateMissionConstraints(state,ctx.filters)) missions.push(this.finalizeMission(state,ctx));
          return;
        }
        backtrack(idx+1,state);
        const e=cands[idx];
        if (state.destroyedTargets.has(e.targetPlatform)) { this.log(`duplicate-target rejection ${e.targetPlatform}`); return; }
        if (!this.canSpend(state.ammoRemaining,e.weaponAllocations)) return;
        const next=this.cloneState(state); next.engagements.push(e); next.destroyedTargets.add(e.targetPlatform); this.spendAmmo(next.ammoRemaining,e.weaponAllocations);
        if (this.prune(next,ctx.filters)) { this.log('pruned partial mission'); return; }
        backtrack(idx+1,next);
      };
      backtrack(0,{engagements:[],destroyedTargets:new Set(),ammoRemaining:JSON.parse(JSON.stringify(ctx.ammoMap))});
      return this.rankMissions(missions,ctx.filters).slice(0,ctx.filters.maxResults);
    },
    canSpend(ammo,allocs){ return allocs.every(a=>(ammo[a.platform]&&ammo[a.platform][a.weapon]||0)>=a.quantity); },
    spendAmmo(ammo,allocs){ allocs.forEach(a=>{ ammo[a.platform][a.weapon]-=a.quantity; }); },
    cloneState(s){ return {engagements:[...s.engagements],destroyedTargets:new Set(s.destroyedTargets),ammoRemaining:JSON.parse(JSON.stringify(s.ammoRemaining))}; },
    prune(state,filters){ return filters.maxKillsPerMission && state.engagements.length>filters.maxKillsPerMission; },
    validateMissionConstraints(state,filters){ const kills=state.engagements.length; if (kills<filters.minKills) return false; if (kills>filters.maxKills) return false; return true; },
    finalizeMission(state,ctx){
      const id=`mission_${Math.random().toString(36).slice(2,10)}`; const engagements=state.engagements;
      const counts={}; const killsByWeapon={}; const killsByPlatform={}; const killsByPlatformType={}; const killsAgainstTargetType={}; let totalAmmo=0;
      engagements.forEach(e=>{ totalAmmo+=e.totalAmmoExpended; killsAgainstTargetType[e.targetPlatformType]=(killsAgainstTargetType[e.targetPlatformType]||0)+1; e.weaponAllocations.forEach(a=>{ counts[a.weapon]=(counts[a.weapon]||0)+a.quantity; }); const ws=[...new Set(e.weaponAllocations.map(a=>a.weapon))]; ws.forEach(w=>killsByWeapon[w]=(killsByWeapon[w]||0)+1); e.offensivePlatforms.forEach(p=>killsByPlatform[p]=(killsByPlatform[p]||0)+1); e.offensivePlatformTypes.forEach(t=>killsByPlatformType[t]=(killsByPlatformType[t]||0)+1); });
      return {missionId:id, offensiveSide:ctx.filters.offensiveSide, targetSide:ctx.filters.targetSide, engagements, offensivePlatformsUsed:Object.keys(killsByPlatform), offensivePlatformTypesUsed:Object.keys(killsByPlatformType), targetPlatformsDestroyed:engagements.map(e=>e.targetPlatform), targetPlatformTypesDestroyed:[...new Set(engagements.map(e=>e.targetPlatformType))], weaponsUsed:Object.keys(counts), destroyedPlatformCount:engagements.length, totalAmmoExpended:totalAmmo, ammoExpendedByWeapon:counts, killsByWeapon, killsByOffensivePlatform:killsByPlatform, killsByOffensivePlatformType:killsByPlatformType, killsAgainstTargetPlatformType:killsAgainstTargetType};
    },
    rankMissions(missions){ return missions.sort((a,b)=> b.destroyedPlatformCount-a.destroyedPlatformCount || a.totalAmmoExpended-b.totalAmmoExpended); }
  };

  function buildUI(root){ root.innerHTML=`<section class="panel"><div class="filters" id="filters"></div><div class="actions"><button id="generateMissionsButton">Generate Missions</button></div></section><section class="panel"><h3>Generated Missions JSON</h3><textarea id="missionsJson" readonly></textarea></section><section class="panel"><h3>Mission Generation Log</h3><textarea id="missionLog" readonly></textarea></section>`; }
  function mkField(id,label,multi){ return `<div class="field"><label for="${id}">${label}</label><select id="${id}" ${multi?'multiple':''}></select></div>`; }

  document.addEventListener('DOMContentLoaded', function () {
    PlatformModel.loadInitialData(PLATFORM_DATA); WeaponStorage.loadInitialData(WEAPON_DATA); WeaponLethalityStorage.loadInitialData(WEAPON_LETHALITY_DATA); DistanceStorage.refreshDistanceData();
    const root=document.getElementById('missions-root'); buildUI(root);
    document.getElementById('backToMainButton').onclick=()=>window.location.href='index.html';

    const platforms=PlatformModel.getPlatformData(); const weapons=WeaponStorage.getWeaponData(); const types=[...new Set(platforms.map(p=>p.type))]; const sides=[...new Set(platforms.map(p=>p.side))];
    const filtersDiv=document.getElementById('filters');
    filtersDiv.innerHTML = mkField('offensiveSide','Offensive Side',false)+mkField('targetSide','Target Side',false)+mkField('offensivePlatforms','Offensive Platforms',true)+mkField('targetPlatforms','Target Platforms',true)+mkField('offensiveTypes','Offensive Platform Types',true)+mkField('targetTypes','Target Platform Types',true)+mkField('weapons','Weapons',true)+`<div class='field'><label>Min Kills</label><input id='minKills' type='number' value='1'></div><div class='field'><label>Max Kills</label><input id='maxKills' type='number' value='5'></div><div class='field'><label>Max Missions</label><input id='maxMissions' type='number' value='50'></div><div class='field'><label>Max Results</label><input id='maxResults' type='number' value='20'></div><div class='field'><label>Max Kills/Depth</label><input id='maxKillsPerMission' type='number' value='5'></div>`;
    function fill(sel,vals){ const el=$(sel); vals.forEach(v=>el.append(new Option(v,v))); }
    fill('#offensiveSide',sides); fill('#targetSide',sides); fill('#offensivePlatforms',platforms.map(p=>p.platform_name)); fill('#targetPlatforms',platforms.map(p=>p.platform_name)); fill('#offensiveTypes',types); fill('#targetTypes',types); fill('#weapons',weapons.map(w=>w.weapon_name));
    $('#offensivePlatforms,#targetPlatforms,#offensiveTypes,#targetTypes,#weapons').select2({width:'100%'});

    document.getElementById('generateMissionsButton').addEventListener('click', function(){
      MissionModule.logs=[];
      const filters={ offensiveSide:$('#offensiveSide').val(), targetSide:$('#targetSide').val(), offensivePlatforms:$('#offensivePlatforms').val()||[], targetPlatforms:$('#targetPlatforms').val()||[], offensiveTypes:$('#offensiveTypes').val()||[], targetTypes:$('#targetTypes').val()||[], weapons:$('#weapons').val()||[], minKills:parseInt($('#minKills').val(),10)||1, maxKills:parseInt($('#maxKills').val(),10)||999, maxMissions:parseInt($('#maxMissions').val(),10)||50, maxResults:parseInt($('#maxResults').val(),10)||20, maxKillsPerMission:parseInt($('#maxKillsPerMission').val(),10)||5 };
      MissionModule.log(`selected filters: ${JSON.stringify(filters)}`);
      let offensives=platforms.filter(p=>!filters.offensiveSide||p.side===filters.offensiveSide);
      let targets=platforms.filter(p=>!filters.targetSide||p.side===filters.targetSide);
      if (filters.offensivePlatforms.length) offensives=offensives.filter(p=>filters.offensivePlatforms.includes(p.platform_name));
      if (filters.targetPlatforms.length) targets=targets.filter(p=>filters.targetPlatforms.includes(p.platform_name));
      if (filters.offensiveTypes.length) offensives=offensives.filter(p=>filters.offensiveTypes.includes(p.type));
      if (filters.targetTypes.length) targets=targets.filter(p=>filters.targetTypes.includes(p.type));
      MissionModule.log(`candidate offensive platforms: ${offensives.length}`); MissionModule.log(`candidate target platforms: ${targets.length}`);
      const ctx={filters,offensives,targets,weaponMap:MissionModule.getWeaponMap(weapons),lethalityMap:MissionModule.getLethalityMap(WeaponLethalityStorage.getLethalityData()),distanceLookup:(k)=>DistanceStorage.getAllDistanceData()[k],ammoMap:MissionModule.getAmmoMap(offensives)};
      const allCandidates=MissionModule.buildCandidates(ctx); const limited=allCandidates.slice(0,200); MissionModule.log(`candidate engagements accepted: ${limited.length}`);
      const missions=MissionModule.generateMissions(ctx,limited);
      if (!missions.length) MissionModule.log('no missions generated (filters too restrictive, no range/lethality/ammo, or search limits hit)');
      document.getElementById('missionsJson').value=JSON.stringify(missions,null,2);
      document.getElementById('missionLog').value=MissionModule.logs.join('\n');
    });
  });
})();
