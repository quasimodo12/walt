// sensor_storage.js
var SensorStorage = (function() {
    var sensorData = [];

    function loadInitialData(SENSOR_DATA) {
        sensorData = SENSOR_DATA.map(function(item) {
            return Object.assign({}, item);
        });
    }

    function getSensorData() {
        return sensorData;
    }

    function exportData() {
        return JSON.stringify(sensorData, null, 2);
    }

    function setSensorData(newSensorData) {
        sensorData = newSensorData;
    }

    return {
        loadInitialData: loadInitialData,
        getSensorData: getSensorData,
        setSensorData: setSensorData,
        exportData: exportData
    };
})();
