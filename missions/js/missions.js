(function () {
  'use strict';

  function initializeData() {
    if (typeof PLATFORM_DATA === 'undefined' || typeof WEAPON_DATA === 'undefined' || typeof WEAPON_LETHALITY_DATA === 'undefined') {
      MissionStorage.addLog('Scenario data not found. Ensure input data files are loaded.');
      return false;
    }

    PlatformModel.loadInitialData(PLATFORM_DATA);
    WeaponStorage.loadInitialData(WEAPON_DATA);
    WeaponLethalityStorage.loadInitialData(WEAPON_LETHALITY_DATA);
    DistanceStorage.initializeDistanceData();
    return true;
  }

  function renderResults(root, missions, logs) {
    var missionCount = missions.length;

    root.innerHTML = '';

    var summarySection = document.createElement('section');
    summarySection.className = 'missions-summary';
    summarySection.innerHTML = `
      <h2>Mission Generation Summary</h2>
      <p><strong>Total missions:</strong> <span>${missionCount}</span></p>
    `;
    root.appendChild(summarySection);

    var missionsSection = document.createElement('section');
    missionsSection.className = 'missions-section';
    missionsSection.innerHTML = '<h2>Generated Missions</h2>';
    var missionsTextarea = document.createElement('textarea');
    missionsTextarea.className = 'missions-textarea';
    missionsTextarea.readOnly = true;
    missionsTextarea.value = missionCount ? JSON.stringify(missions, null, 2) : 'No missions generated.';
    missionsSection.appendChild(missionsTextarea);
    root.appendChild(missionsSection);

    var logSection = document.createElement('section');
    logSection.className = 'missions-section';
    logSection.innerHTML = '<h2>Generation Log</h2>';
    var logTextarea = document.createElement('textarea');
    logTextarea.className = 'missions-textarea missions-log';
    logTextarea.readOnly = true;
    logTextarea.value = logs.length ? logs.join('\n') : 'No log messages.';
    logSection.appendChild(logTextarea);
    root.appendChild(logSection);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('missions-root');
    if (!root) {
      return;
    }

    MissionStorage.clearAll();

    var initialized = false;
    try {
      initialized = initializeData();
    } catch (error) {
      MissionStorage.addLog('Initialization error: ' + (error && error.message ? error.message : error));
    }

    var missions = [];
    if (initialized) {
      try {
        missions = MissionGenerator.generateAllMissions();
      } catch (error) {
        MissionStorage.addLog('Mission generation error: ' + (error && error.message ? error.message : error));
      }
    }

    var logs = MissionStorage.getLogs();
    renderResults(root, missions, logs);

    root.dataset.ready = 'true';
  });
})();
