// js/menu/main_menu_layout_config.js
// Applies configurable spacing and sizing rules to the main menu container so layouts can
// be tuned from a single place (or overridden by scenarios).

(function(global) {
  var DEFAULT_CONTAINER_SELECTOR = '#platformTableContainer';

  var DEFAULT_CONFIG = {
    container: {
      padding: '24px',
      margin: '12px',
      gap: '20px'
    },
    header: {
      gap: '10px'
    },
    toolbar: {
      gap: '14px'
    },
    table: {
      minHeight: '340px',
      flex: '1 1 auto'
    },
    buttons: {
      padding: '12px',
      maxHeight: '28vh',
      gap: '10px',
      rowGap: '14px',
      minWidth: 'clamp(120px, 22%, 240px)',
      minHeight: 'clamp(36px, 2.8vw, 58px)',
      fontSize: 'clamp(0.78rem, 0.55vw + 0.6rem, 1.05rem)',
      paddingBlock: 'clamp(0.45rem, 0.28vw + 0.35rem, 0.65rem)',
      paddingInline: 'clamp(0.75rem, 0.65vw + 0.5rem, 1.35rem)'
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
