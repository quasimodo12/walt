const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadScript(context, filePath) {
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: filePath });
}

function createLayer(kind, latlngs, options, layers, map) {
    return {
        kind: kind,
        latlngs: latlngs,
        options: options,
        bindTooltip: function(content, config) {
            this.tooltip = { content: content, config: config };
            return this;
        },
        addTo: function(targetMap) {
            assert.strictEqual(targetMap, map);
            layers.push(this);
            return this;
        }
    };
}

function bearingFromOrigin(point) {
    var latitude = point[0] * Math.PI / 180;
    var longitude = point[1] * Math.PI / 180;
    var bearing = Math.atan2(
        Math.sin(longitude) * Math.cos(latitude),
        Math.sin(latitude)
    ) * 180 / Math.PI;
    return (bearing + 360) % 360;
}

var platform = {
    platform_name: 'Ship',
    side: 'blue',
    latitude: 0,
    longitude: 0,
    rotation: 180,
    weapons: [{ name: 'Gun' }],
    sensors: ['Radar', 'OmniRadar']
};
var layers = [];
var map = { removeLayer: function() {} };
var context = {
    console: console,
    window: { range_ring_style_templates: [] },
    document: { querySelector: function() { return null; } },
    PlatformModel: { getPlatformData: function() { return [platform]; } },
    WeaponStorage: {
        getWeaponData: function() {
            return [{
                weapon_name: 'Gun',
                weapon_min_range: 100,
                weapon_max_range: 1000,
                cutout_angle_size: 15,
                cutout_angle_origin: 60
            }];
        }
    },
    SensorStorage: {
        getSensorData: function() {
            return [
                {
                    sensor_name: 'Radar',
                    sensor_min_range: 50,
                    sensor_max_range: 500,
                    cutout_angle_size: 30,
                    cutout_angle_origin: 45
                },
                {
                    sensor_name: 'OmniRadar',
                    sensor_min_range: 0,
                    sensor_max_range: 500,
                    cutout_angle_size: 0,
                    cutout_angle_origin: 0
                }
            ];
        }
    },
    View: { getMap: function() { return map; } },
    L: {
        CRS: { Earth: { R: 6371008.8 } },
        circle: function(center, options) {
            return createLayer('circle', center, options, layers, map);
        },
        polyline: function(points, options) {
            return createLayer('polyline', points, options, layers, map);
        }
    }
};

vm.createContext(context);
loadScript(context, 'js/range_utils.js');
loadScript(context, 'js/range_rings/range_ring_storage.js');
loadScript(context, 'js/range_rings/range_ring_logic.js');

var legacyWeapon = context.RangeUtils.normalizeWeaponRecord({
    weapon_name: 'Legacy',
    weapon_min_range: 0,
    weapon_max_range: 100
});
var legacySensor = context.RangeUtils.normalizeSensorRecord({
    sensor_name: 'Legacy',
    sensor_min_range: 0,
    sensor_max_range: 100
});
assert.strictEqual(legacyWeapon.cutout_angle_size, 0);
assert.strictEqual(legacyWeapon.cutout_angle_origin, 0);
assert.strictEqual(legacySensor.cutout_angle_size, 0);
assert.strictEqual(legacySensor.cutout_angle_origin, 0);
assert.strictEqual(context.RangeUtils.normalizeCutoutAngleOrigin(420), 60);
assert.strictEqual(
    context.RangeUtils.isDistanceInRangeBand(500, context.RangeUtils.getWeaponRangeBand({
        weapon_min_range: 100,
        weapon_max_range: 1000,
        cutout_angle_size: 360,
        cutout_angle_origin: 180
    })),
    true
);

context.RangeRingStorage.init();
var gun = context.RangeRingStorage.getRangeRing('Ship', 'Gun');
var radar = context.RangeRingStorage.getRangeRing('Ship', 'Radar');
var omniRadar = context.RangeRingStorage.getRangeRing('Ship', 'OmniRadar');
assert.strictEqual(gun.rotation, 180);
assert.strictEqual(gun.cutout_angle_size, 15);
assert.strictEqual(gun.cutout_angle_origin, 60);
assert.strictEqual(radar.cutout_angle_size, 30);
assert.strictEqual(radar.cutout_angle_origin, 45);
assert.strictEqual(omniRadar.cutout_angle_size, 0);

gun.toggled = 1;
gun.style = { color: '#123456', lineWidth: 4, opacity: 0.6 };
radar.toggled = 1;
radar.style = { color: '#abcdef', lineWidth: 3, opacity: 0.5 };
omniRadar.toggled = 1;
context.RangeRingStorage.init();
gun = context.RangeRingStorage.getRangeRing('Ship', 'Gun');
radar = context.RangeRingStorage.getRangeRing('Ship', 'Radar');
assert.strictEqual(gun.style.color, '#123456');
assert.strictEqual(gun.style.lineWidth, 4);
assert.strictEqual(gun.style.opacity, 0.6);
assert.strictEqual(radar.style.color, '#abcdef');

context.RangeRingLogic.drawRangeRings();
var gunLayers = layers.filter(function(layer) {
    return layer.tooltip && layer.tooltip.content.indexOf('Gun') !== -1 ||
        layer.options.color === '#123456';
});
var gunArcs = gunLayers.filter(function(layer) { return layer.kind === 'polyline'; });
var radarArcs = layers.filter(function(layer) {
    return layer.kind === 'polyline' && layer.options.color === '#abcdef';
});
var omniRadarCircles = layers.filter(function(layer) {
    return layer.kind === 'circle' && layer.options.color !== '#123456' && layer.options.color !== '#abcdef';
});

assert.strictEqual(gunArcs.length, 2);
assert.strictEqual(radarArcs.length, 2);
assert.strictEqual(omniRadarCircles.length, 1);
assert.strictEqual(gunArcs[0].options.color, '#123456');
assert.strictEqual(gunArcs[1].options.dashArray, '6 6');
assert.ok(Math.abs(bearingFromOrigin(gunArcs[0].latlngs[0]) - 255) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(gunArcs[0].latlngs[gunArcs[0].latlngs.length - 1]) - 240) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(gunArcs[1].latlngs[0]) - 255) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(gunArcs[1].latlngs[gunArcs[1].latlngs.length - 1]) - 240) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(radarArcs[0].latlngs[0]) - 255) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(radarArcs[0].latlngs[radarArcs[0].latlngs.length - 1]) - 225) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(radarArcs[1].latlngs[0]) - 255) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(radarArcs[1].latlngs[radarArcs[1].latlngs.length - 1]) - 225) < 0.01);

layers.length = 0;
platform.rotation = 270;
context.RangeRingStorage.init();
context.RangeRingLogic.drawRangeRings();
var rotatedGunArcs = layers.filter(function(layer) {
    return layer.kind === 'polyline' && layer.options.color === '#123456';
});

assert.strictEqual(rotatedGunArcs.length, 2);
assert.ok(Math.abs(bearingFromOrigin(rotatedGunArcs[0].latlngs[0]) - 345) < 0.01);
assert.ok(Math.abs(bearingFromOrigin(rotatedGunArcs[0].latlngs[rotatedGunArcs[0].latlngs.length - 1]) - 330) < 0.01);

layers.length = 0;
gun = context.RangeRingStorage.getRangeRing('Ship', 'Gun');
gun.cutout_angle_size = 360;
context.RangeRingLogic.drawRangeRings();
assert.strictEqual(layers.filter(function(layer) {
    return layer.options.color === '#123456';
}).length, 0);

console.log('Range ring cutout tests passed.');