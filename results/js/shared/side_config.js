(function(global) {
    'use strict';

    var FALLBACK_SIDES = [
        {
            id: 'blue',
            label: 'Blue',
            defaultOpponent: 'red',
            color: '#36A2EB'
        },
        {
            id: 'red',
            label: 'Red',
            defaultOpponent: 'blue',
            color: '#FF944D'
        }
    ];

    var FALLBACK_DEFAULT_SIDE_ID = 'blue';
    var FALLBACK_COLOR = '#808080';

    function normalizeSide(rawSide) {
        if (!rawSide || typeof rawSide !== 'object') {
            return null;
        }

        var id = typeof rawSide.id === 'string' ? rawSide.id.trim() : '';
        if (!id) {
            return null;
        }

        return {
            id: id,
            label: typeof rawSide.label === 'string' && rawSide.label.trim().length > 0
                ? rawSide.label.trim()
                : capitalize(id),
            defaultOpponent: typeof rawSide.defaultOpponent === 'string' && rawSide.defaultOpponent.trim().length > 0
                ? rawSide.defaultOpponent.trim()
                : null,
            color: typeof rawSide.color === 'string' && rawSide.color.trim().length > 0
                ? rawSide.color.trim()
                : null
        };
    }

    function capitalize(value) {
        if (typeof value !== 'string' || value.length === 0) {
            return '';
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function mapById(list) {
        return list.reduce(function(acc, side) {
            acc[side.id] = side;
            return acc;
        }, {});
    }

    var overrides = global.SideSettings || {};
    var overrideSides = Array.isArray(overrides.sides)
        ? overrides.sides.map(normalizeSide).filter(Boolean)
        : [];
    var sides = overrideSides.length > 0 ? overrideSides : FALLBACK_SIDES.map(normalizeSide).filter(Boolean);

    var defaultSideId = typeof overrides.defaultSideId === 'string' && overrides.defaultSideId.trim().length > 0
        ? overrides.defaultSideId.trim()
        : FALLBACK_DEFAULT_SIDE_ID;

    var fallbackColor = typeof overrides.fallbackColor === 'string' && overrides.fallbackColor.trim().length > 0
        ? overrides.fallbackColor.trim()
        : FALLBACK_COLOR;

    var sideMap = mapById(sides);
    function getSides() {
        return sides.map(function(side) {
            return Object.assign({}, side);
        });
    }

    function getSideById(id) {
        if (typeof id !== 'string') {
            return null;
        }
        return sideMap[id] || null;
    }

    function getDefaultSide() {
        if (sideMap[defaultSideId]) {
            return defaultSideId;
        }
        return sides.length > 0 ? sides[0].id : null;
    }

    function getDefaultOpponent(sideId) {
        var side = getSideById(sideId);
        if (side && side.defaultOpponent && sideMap[side.defaultOpponent]) {
            return side.defaultOpponent;
        }
        var fallback = sides.find(function(candidate) {
            return candidate.id !== sideId;
        });
        return fallback ? fallback.id : getDefaultSide();
    }

    function getLabelForSide(id) {
        if (typeof id !== 'string') {
            return '';
        }
        var side = getSideById(id);
        if (side && side.label) {
            return side.label;
        }
        return capitalize(id);
    }

    function getColorForSide(id) {
        var side = getSideById(id);
        if (side && side.color) {
            return side.color;
        }
        return fallbackColor;
    }

    function getAllSideIds() {
        return sides.map(function(side) {
            return side.id;
        });
    }

    global.SideConfig = {
        getSides: getSides,
        getSideById: getSideById,
        getDefaultSide: getDefaultSide,
        getDefaultOpponent: getDefaultOpponent,
        getLabelForSide: getLabelForSide,
        getColorForSide: getColorForSide,
        getAllSideIds: getAllSideIds
    };

})(window);
