// range_utils.js
// Shared helpers for normalizing, validating, formatting, and evaluating
// minimum/maximum range bands for weapons, sensors, and range-aware features.
var RangeUtils = (function() {
    var DEFAULT_MIN_RANGE = 0;

    function firstDefined(values) {
        for (var i = 0; i < values.length; i++) {
            if (values[i] !== undefined && values[i] !== null && values[i] !== '') {
                return values[i];
            }
        }
        return undefined;
    }

    function parseRange(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        var parsed = Number(value);
        return isFinite(parsed) ? parsed : null;
    }

    function clampMinimum(value, minimum) {
        return value < minimum ? minimum : value;
    }

    function getRawRangeValue(record, fieldNames) {
        if (!record) {
            return undefined;
        }
        return firstDefined(fieldNames.map(function(fieldName) {
            return record[fieldName];
        }));
    }

    function getRangeBand(record, options) {
        options = options || {};
        var minFieldNames = options.minFieldNames || ['min_range'];
        var maxFieldNames = options.maxFieldNames || ['max_range', 'range'];
        var defaultMinRange = options.defaultMinRange !== undefined ? options.defaultMinRange : DEFAULT_MIN_RANGE;

        var minRange = parseRange(getRawRangeValue(record, minFieldNames));
        var maxRange = parseRange(getRawRangeValue(record, maxFieldNames));

        if (minRange === null) {
            minRange = defaultMinRange;
        }

        return {
            min: minRange,
            max: maxRange,
            isValid: isValidRangeBand(minRange, maxRange)
        };
    }

    function getWeaponRangeBand(weapon) {
        return getRangeBand(weapon, {
            minFieldNames: ['weapon_min_range', 'min_range'],
            maxFieldNames: ['weapon_max_range', 'max_range', 'weapon_range']
        });
    }

    function getSensorRangeBand(sensor) {
        return getRangeBand(sensor, {
            minFieldNames: ['sensor_min_range', 'min_range'],
            maxFieldNames: ['sensor_max_range', 'max_range', 'sensor_range']
        });
    }

    function isValidRangeBand(minRange, maxRange) {
        return isFinite(minRange) &&
            isFinite(maxRange) &&
            minRange >= 0 &&
            maxRange >= 0 &&
            minRange <= maxRange;
    }

    function validateRangeBand(minRange, maxRange) {
        var errors = [];

        if (!isFinite(minRange)) {
            errors.push('Minimum range must be a numeric value.');
        }
        if (!isFinite(maxRange)) {
            errors.push('Maximum range must be a numeric value.');
        }
        if (isFinite(minRange) && minRange < 0) {
            errors.push('Minimum range cannot be negative.');
        }
        if (isFinite(maxRange) && maxRange < 0) {
            errors.push('Maximum range cannot be negative.');
        }
        if (isFinite(minRange) && isFinite(maxRange) && minRange > maxRange) {
            errors.push('Minimum range cannot be greater than maximum range.');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    function normalizeRangeBand(record, options) {
        options = options || {};
        var band = getRangeBand(record, options);
        var minRange = parseRange(band.min);
        var maxRange = parseRange(band.max);

        if (minRange === null) {
            minRange = options.defaultMinRange !== undefined ? options.defaultMinRange : DEFAULT_MIN_RANGE;
        }

        if (options.clampToZero !== false) {
            minRange = clampMinimum(minRange, 0);
            if (maxRange !== null) {
                maxRange = clampMinimum(maxRange, 0);
            }
        }

        if (maxRange === null) {
            maxRange = minRange;
        }

        return {
            min: minRange,
            max: maxRange,
            isValid: isValidRangeBand(minRange, maxRange),
            validation: validateRangeBand(minRange, maxRange)
        };
    }

    function normalizeWeaponRecord(weapon) {
        var normalized = Object.assign({}, weapon || {});
        var band = normalizeRangeBand(normalized, {
            minFieldNames: ['weapon_min_range', 'min_range'],
            maxFieldNames: ['weapon_max_range', 'max_range', 'weapon_range']
        });

        normalized.weapon_min_range = band.min;
        normalized.weapon_max_range = band.max;

        // Keep the legacy scalar field synchronized with the canonical maximum
        // range during the migration period so existing range-ring,
        // configuration, and results code continues to operate until later
        // phases switch to the canonical min/max fields.
        normalized.weapon_range = band.max;

        return normalized;
    }

    function normalizeSensorRecord(sensor) {
        var normalized = Object.assign({}, sensor || {});
        var band = normalizeRangeBand(normalized, {
            minFieldNames: ['sensor_min_range', 'min_range'],
            maxFieldNames: ['sensor_max_range', 'max_range', 'sensor_range']
        });

        normalized.sensor_min_range = band.min;
        normalized.sensor_max_range = band.max;

        // Keep the legacy scalar field synchronized with the canonical maximum
        // range during the migration period so existing range-ring,
        // configuration, and results code continues to operate until later
        // phases switch to the canonical min/max fields.
        normalized.sensor_range = band.max;

        return normalized;
    }


    function removeFields(record, fieldNames) {
        var output = Object.assign({}, record || {});
        fieldNames.forEach(function(fieldName) {
            delete output[fieldName];
        });
        return output;
    }

    function getCanonicalWeaponRecord(weapon) {
        var normalized = normalizeWeaponRecord(weapon);
        var canonical = removeFields(normalized, ['weapon_range', 'min_range', 'max_range', 'index']);
        canonical.weapon_min_range = normalized.weapon_min_range;
        canonical.weapon_max_range = normalized.weapon_max_range;
        return canonical;
    }

    function getCanonicalSensorRecord(sensor) {
        var normalized = normalizeSensorRecord(sensor);
        var canonical = removeFields(normalized, ['sensor_range', 'min_range', 'max_range', 'index']);
        canonical.sensor_min_range = normalized.sensor_min_range;
        canonical.sensor_max_range = normalized.sensor_max_range;
        return canonical;
    }

    function isDistanceInRangeBand(distance, rangeBand) {
        var parsedDistance = parseRange(distance);
        if (parsedDistance === null || !rangeBand || !isValidRangeBand(rangeBand.min, rangeBand.max)) {
            return false;
        }
        return parsedDistance >= rangeBand.min && parsedDistance <= rangeBand.max;
    }

    function formatRange(value) {
        var parsed = parseRange(value);
        return parsed === null ? 'Unknown' : parsed.toLocaleString();
    }

    function formatRangeBand(rangeBand) {
        if (!rangeBand || !isValidRangeBand(rangeBand.min, rangeBand.max)) {
            return 'Unknown';
        }
        return formatRange(rangeBand.min) + ' - ' + formatRange(rangeBand.max) + ' m';
    }

    return {
        DEFAULT_MIN_RANGE: DEFAULT_MIN_RANGE,
        parseRange: parseRange,
        getRangeBand: getRangeBand,
        getWeaponRangeBand: getWeaponRangeBand,
        getSensorRangeBand: getSensorRangeBand,
        isValidRangeBand: isValidRangeBand,
        validateRangeBand: validateRangeBand,
        normalizeRangeBand: normalizeRangeBand,
        normalizeWeaponRecord: normalizeWeaponRecord,
        normalizeSensorRecord: normalizeSensorRecord,
        getCanonicalWeaponRecord: getCanonicalWeaponRecord,
        getCanonicalSensorRecord: getCanonicalSensorRecord,
        isDistanceInRangeBand: isDistanceInRangeBand,
        formatRange: formatRange,
        formatRangeBand: formatRangeBand
    };
})();
