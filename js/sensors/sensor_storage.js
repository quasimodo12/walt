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

    function toCanonicalSensorRecord(item) {
        if (typeof RangeUtils !== 'undefined' && RangeUtils.toCanonicalSensorRecord) {
            return RangeUtils.toCanonicalSensorRecord(item);
        }

        var normalized = normalizeSensorRecord(item);
        delete normalized.sensor_range;
        delete normalized.min_range;
        delete normalized.max_range;
        delete normalized.index;
        return normalized;
    }

    function exportData() {
        return JSON.stringify(sensorData.map(function(item) {
            return toCanonicalSensorRecord(item);
        }), null, 2);
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
        var minRange = sensor && sensor.sensor_min_range !== undefined ? Number(sensor.sensor_min_range) : 0;
        var maxRange = sensor && sensor.sensor_max_range !== undefined ? Number(sensor.sensor_max_range) :
            (sensor && sensor.sensor_range !== undefined ? Number(sensor.sensor_range) : null);
        return {
            min: minRange,
            max: maxRange,
            isValid: isFinite(minRange) && isFinite(maxRange) && minRange >= 0 && maxRange >= 0 && minRange <= maxRange
        };
    }

    return {
        loadInitialData: loadInitialData,
        getSensorData: getSensorData,
        setSensorData: setSensorData,
        getSensorRangeBand: getSensorRangeBand,
        exportData: exportData
    };
})();
