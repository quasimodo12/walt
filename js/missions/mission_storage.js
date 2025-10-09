// js/missions/mission_storage.js
var MissionStorage = (function() {
  var missions = [];
  var logs = [];

  function addMission(mission) {
    missions.push(mission);
  }

  function getMissions() {
    return missions.slice();
  }

  function clearMissions() {
    missions = [];
  }

  function addLog(entry) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      logs.push(entry);
    }
  }

  function getLogs() {
    return logs.slice();
  }

  function clearLogs() {
    logs = [];
  }

  function clearAll() {
    clearMissions();
    clearLogs();
  }

  function exportData() {
    return JSON.stringify(missions, null, 2);
  }

  return {
    addMission: addMission,
    getMissions: getMissions,
    clearMissions: clearMissions,
    addLog: addLog,
    getLogs: getLogs,
    clearLogs: clearLogs,
    clearAll: clearAll,
    exportData: exportData
  };
})();
