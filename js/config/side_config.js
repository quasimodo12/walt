(function(global) {
    'use strict';

    var FALLBACK_SIDES = [
        {
            id: 'blue',
            label: 'Blue',
            defaultOpponent: 'red',
            iconUrl: 'images/blue-plat.png',
            color: '#36A2EB'
        },
        {
            id: 'red',
            label: 'Red',
            defaultOpponent: 'blue',
            iconUrl: 'images/red-plat.png',
            color: '#FF944D'
        }
    ];

    var FALLBACK_DEFAULT_SIDE_ID = 'blue';
    var FALLBACK_ICON_URL = 'images/blue-plat.png';
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
            iconUrl: typeof rawSide.iconUrl === 'string' && rawSide.iconUrl.trim().length > 0
                ? rawSide.iconUrl.trim()
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

    var fallbackIconUrl = typeof overrides.fallbackIconUrl === 'string' && overrides.fallbackIconUrl.trim().length > 0
        ? overrides.fallbackIconUrl.trim()
        : FALLBACK_ICON_URL;

    var fallbackColor = typeof overrides.fallbackColor === 'string' && overrides.fallbackColor.trim().length > 0
        ? overrides.fallbackColor.trim()
        : FALLBACK_COLOR;

    var sideMap = mapById(sides);
    var STORAGE_KEY = 'walt.sideIconOverrides';

    function loadIconOverrides() {
        if (!global.localStorage) {
            return;
        }

        try {
            var rawValue = global.localStorage.getItem(STORAGE_KEY);
            if (!rawValue) {
                return;
            }

            var parsed = JSON.parse(rawValue);
            if (!parsed || typeof parsed !== 'object') {
                return;
            }

            Object.keys(parsed).forEach(function(sideId) {
                var iconUrl = parsed[sideId];
                if (!sideMap[sideId] || typeof iconUrl !== 'string' || !iconUrl.trim()) {
                    return;
                }
                sideMap[sideId].iconUrl = iconUrl.trim();
            });
        } catch (error) {
            console.warn('side_config.js: failed to load icon overrides', error);
        }
    }

    function saveIconOverrides() {
        if (!global.localStorage) {
            return;
        }

        try {
            var overridesToStore = {};
            sides.forEach(function(side) {
                if (side && side.id && side.iconUrl) {
                    overridesToStore[side.id] = side.iconUrl;
                }
            });
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(overridesToStore));
        } catch (error) {
            console.warn('side_config.js: failed to save icon overrides', error);
        }
    }

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

    function getIconForSide(id) {
        var side = getSideById(id);
        if (side && side.iconUrl) {
            return side.iconUrl;
        }
        return fallbackIconUrl;
    }

    function getColorForSide(id) {
        var side = getSideById(id);
        if (side && side.color) {
            return side.color;
        }
        return fallbackColor;
    }

    function setIconForSide(id, iconUrl) {
        if (typeof id !== 'string' || !sideMap[id] || typeof iconUrl !== 'string' || iconUrl.trim().length === 0) {
            return false;
        }

        sideMap[id].iconUrl = iconUrl.trim();
        saveIconOverrides();
        return true;
    }

    function getAllSideIds() {
        return sides.map(function(side) {
            return side.id;
        });
    }

    loadIconOverrides();

    global.SideConfig = {
        getSides: getSides,
        getSideById: getSideById,
        getDefaultSide: getDefaultSide,
        getDefaultOpponent: getDefaultOpponent,
        getLabelForSide: getLabelForSide,
        getIconForSide: getIconForSide,
        setIconForSide: setIconForSide,
        getColorForSide: getColorForSide,
        getAllSideIds: getAllSideIds
    };

})(window);
