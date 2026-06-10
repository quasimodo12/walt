// sensor_storage.js
var SensorStorage = (function() {
    var sensorData = [];

    function normalizeSensorRecord(item) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.normalizeSensorRecord) {
            return RangeUtils.normalizeSensorRecord(item);
        }
        return Object.assign({}, item);
    }

    function loadInitialData(SENSOR_DATA) {
        sensorData = SENSOR_DATA.map(function(item) {
            return normalizeSensorRecord(item);
        });
    }

    function getSensorData() {
        return sensorData;
    }

    function getCanonicalSensorRecord(item) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.getCanonicalSensorRecord) {
            return RangeUtils.getCanonicalSensorRecord(item);
        }
        var normalized = normalizeSensorRecord(item);
        var canonical = Object.assign({}, normalized);
        delete canonical.sensor_range;
        delete canonical.min_range;
        delete canonical.max_range;
        delete canonical.index;
        return canonical;
    }

    function exportData() {
        var canonicalSensorData = sensorData.map(function(item) {
            return getCanonicalSensorRecord(item);
        });
        return JSON.stringify(canonicalSensorData, null, 2);
    }

    function setSensorData(newSensorData) {
        sensorData = (Array.isArray(newSensorData) ? newSensorData : []).map(function(item) {
            return normalizeSensorRecord(item);
        });
    }

    function getSensorRangeBand(sensor) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.getSensorRangeBand) {
            return RangeUtils.getSensorRangeBand(sensor);
        }
        var maxRange = sensor && sensor.sensor_range !== undefined ? Number(sensor.sensor_range) : null;
        return { min: 0, max: maxRange, isValid: isFinite(maxRange) && maxRange >= 0 };
    }

    return {
        loadInitialData: loadInitialData,
        getSensorData: getSensorData,
        setSensorData: setSensorData,
        getSensorRangeBand: getSensorRangeBand,
        exportData: exportData
    };
})();
