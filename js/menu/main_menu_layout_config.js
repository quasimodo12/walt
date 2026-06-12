// js/menu/main_menu_layout_config.js
// Applies configurable spacing and sizing rules to the main menu container so layouts can
// be tuned from a single place (or overridden by scenarios).

(function(global) {
  var DEFAULT_CONTAINER_SELECTOR = '#platformTableContainer';

  var DEFAULT_CONFIG = {
    container: {
      padding: '16px',
      margin: '8px',
      gap: '12px'
    },
    header: {
      gap: '6px'
    },
    toolbar: {
      gap: '10px'
    },
    table: {
      minHeight: '280px',
      flex: '1 1 auto'
    },
    buttons: {
      padding: '8px',
      maxHeight: '24vh',
      gap: '8px',
      rowGap: '10px',
      minWidth: 'clamp(108px, 21%, 220px)',
      minHeight: 'clamp(34px, 2.4vw, 48px)',
      fontSize: 'clamp(0.76rem, 0.42vw + 0.62rem, 0.98rem)',
      paddingBlock: 'clamp(0.35rem, 0.2vw + 0.3rem, 0.52rem)',
      paddingInline: 'clamp(0.62rem, 0.5vw + 0.42rem, 1.05rem)'
    }
  };

  var PROPERTY_MAP = {
    container: {
      padding: '--menu-padding',
      margin: '--menu-margin',
      gap: '--menu-gap'
    },
    header: {
      gap: '--menu-header-gap'
    },
    toolbar: {
      gap: '--menu-toolbar-gap'
    },
    table: {
      minHeight: '--table-min-height',
      flex: '--table-flex'
    },
    buttons: {
      padding: '--button-container-padding',
      maxHeight: '--button-container-max-height',
      gap: '--button-gap',
      rowGap: '--button-row-gap',
      minWidth: '--button-min-width',
      minHeight: '--button-min-height',
      fontSize: '--button-font-size',
      paddingBlock: '--button-padding-block',
      paddingInline: '--button-padding-inline'
    }
  };

  function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  function deepMerge(target, source) {
    var output = {};
    var keys = Object.keys(target || {});
    keys.forEach(function(key) {
      if (isPlainObject(target[key])) {
        output[key] = deepMerge(target[key], (source || {})[key]);
      } else {
        output[key] = target[key];
      }
    });

    Object.keys(source || {}).forEach(function(key) {
      if (!isPlainObject(source[key])) {
        output[key] = source[key];
        return;
      }

      output[key] = deepMerge(target && target[key], source[key]);
    });

    return output;
  }

  function applyConfig(config, containerSelector) {
    var selector = containerSelector || DEFAULT_CONTAINER_SELECTOR;
    var container = document.querySelector(selector);

    if (!container) {
      return;
    }

    Object.keys(PROPERTY_MAP).forEach(function(section) {
      var sectionConfig = (config || {})[section] || {};
      var propertyMap = PROPERTY_MAP[section];

      Object.keys(propertyMap).forEach(function(key) {
        var cssVariable = propertyMap[key];
        var value = sectionConfig[key];

        if (typeof value === 'string' && value.trim() !== '') {
          container.style.setProperty(cssVariable, value);
        }
      });
    });
  }

  var layoutSettings = global.MainMenuLayoutSettings || {};
  var menuSettings = global.MainMenuSettings || {};

  var configOverrides = layoutSettings.config || menuSettings.layoutConfig;
  var containerSelector = layoutSettings.containerSelector || menuSettings.layoutContainerSelector;
  var autoApply = layoutSettings.autoApply !== false;
  var baseConfig = deepMerge(DEFAULT_CONFIG, configOverrides || {});

  if (autoApply) {
    applyConfig(baseConfig, containerSelector);
  }

  global.MainMenuLayout = {
    apply: function(customConfig, customSelector) {
      var resolved = deepMerge(baseConfig, customConfig || {});
      applyConfig(resolved, customSelector || containerSelector);
    },
    getDefaultConfig: function() {
      return deepMerge(DEFAULT_CONFIG, {});
    },
    getBaseConfig: function() {
      return deepMerge(baseConfig, {});
    }
  };
})(window);
