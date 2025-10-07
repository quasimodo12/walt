// js/menu/main_menu_layout_manager.js
// Applies configurable spacing and sizing options for the main menu layout.

(function(global) {
  const DEFAULTS = {
    container: {
      padding: '20px',
      gap: '16px'
    },
    table: {
      flex: '1 1 auto',
      minHeight: '52vh'
    },
    buttons: {
      flex: '0 0 auto',
      maxHeight: '26vh',
      padding: '8px 12px',
      gap: '10px',
      rowGap: '12px'
    }
  };

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function deepMerge(target, source) {
    const output = isPlainObject(target) ? { ...target } : {};

    if (!isPlainObject(source)) {
      return output;
    }

    Object.keys(source).forEach(function(key) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (isPlainObject(sourceValue)) {
        output[key] = deepMerge(isPlainObject(targetValue) ? targetValue : {}, sourceValue);
      } else if (sourceValue !== undefined && sourceValue !== null) {
        output[key] = String(sourceValue);
      }
    });

    return output;
  }

  function buildSettings(overrides) {
    return deepMerge(DEFAULTS, overrides);
  }

  function toVariableMap(settings) {
    return {
      '--main-menu-container-padding': settings.container.padding,
      '--main-menu-container-gap': settings.container.gap,
      '--main-menu-table-flex': settings.table.flex,
      '--main-menu-table-min-height': settings.table.minHeight,
      '--main-menu-button-flex': settings.buttons.flex,
      '--main-menu-button-max-height': settings.buttons.maxHeight,
      '--main-menu-button-padding': settings.buttons.padding,
      '--main-menu-button-gap': settings.buttons.gap,
      '--main-menu-button-row-gap': settings.buttons.rowGap
    };
  }

  const overrides = isPlainObject(global.MainMenuLayoutSettings) ? global.MainMenuLayoutSettings : {};
  let currentSettings = buildSettings(overrides);
  global.MainMenuLayoutSettings = JSON.parse(JSON.stringify(currentSettings));

  function applyVariables(settings) {
    const root = document.documentElement;
    const map = toVariableMap(settings);

    Object.keys(map).forEach(function(variable) {
      const value = map[variable];
      if (typeof value === 'string') {
        root.style.setProperty(variable, value);
      }
    });

    global.MainMenuLayoutSettings = JSON.parse(JSON.stringify(settings));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      applyVariables(currentSettings);
    });
  } else {
    applyVariables(currentSettings);
  }

  global.MainMenuLayout = {
    apply: function(newSettings) {
      if (newSettings && isPlainObject(newSettings)) {
        currentSettings = buildSettings(newSettings);
      }

      applyVariables(currentSettings);
      return this;
    },
    update: function(partialSettings) {
      if (!isPlainObject(partialSettings)) {
        return this;
      }

      currentSettings = deepMerge(currentSettings, partialSettings);
      applyVariables(currentSettings);
      return this;
    },
    getSettings: function() {
      return JSON.parse(JSON.stringify(currentSettings));
    }
  };
})(window);

