// js/config/map_settings.js
// Provides a global MapSettings object with default configuration values
// for the map, tile layers, and measurement ruler.
(function (global) {
    function isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function mergeDeep(target, source) {
        var output = Object.assign({}, target);

        if (!isPlainObject(source)) {
            return output;
        }

        Object.keys(source).forEach(function (key) {
            var sourceValue = source[key];

            if (isPlainObject(sourceValue)) {
                var targetValue = output[key];
                output[key] = mergeDeep(isPlainObject(targetValue) ? targetValue : {}, sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });

        return output;
    }

    var defaults = {
        map: {
            center: [0, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 22,
            maxBounds: [
                [-90, -180],
                [90, 180]
            ],
            maxBoundsViscosity: 1.0,
            boxZoom: false,
            doubleClickZoom: false,
            zoomAnimation: true,
            fadeAnimation: true
        },
        tileLayer: {
            url: 'tiles/{z}/{x}/{y}.png',
            options: {
                maxNativeZoom: 2,
                minZoom: 2,
                maxZoom: 22,
                noWrap: true,
                updateWhenZooming: true,
                keepBuffer: 8,
                detectRetina: false
            }
        },
        ruler: {
            position: 'topleft',
            lengthUnit: {
                label: 'Distance:',
                factor: 0.539956803,
                display: 'Nautical Miles',
                decimal: 2
            }
        }
    };

    global.MapSettings = mergeDeep(defaults, global.MapSettings || {});
})(window);
