// js/menu/main_menu_button_layout.js
// Creates the dynamic main menu button container based on a configurable layout

var MainMenuButtons = (function(global) {
  /**
   * Default layout for the main menu buttons. Each array entry represents a row,
   * and every object inside the row describes an individual button. To change
   * which buttons appear next to one another, simply edit the rows below or
   * provide a new layout to `MainMenuButtons.applyLayout`.
   */
  const defaultLayout = [
    [
      { id: 'createPlatformButton', label: 'Add New Platform' }
    ],
    [
      { id: 'rangeRingsButton', label: 'Range Rings' },
      { id: 'weaponsButton', label: 'Weapons' },
      { id: 'weaponLethalityButton', label: 'Weapon Lethality' },
      { id: 'sensorsButton', label: 'Sensors' }
    ],
    [
      { id: 'openChartsButton', label: 'Display Results' },
      { id: 'refreshDataButton', label: 'Refresh Data' }
    ],
    [
      { id: 'exportLaydownButton', label: 'Export Laydown' }
    ]
  ];

  const DEFAULT_CONTAINER_ID = 'mainMenuButtonContainer';

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  const overrides = global.MainMenuSettings || {};
  const hasLayoutOverride = Array.isArray(overrides.layout);
  const containerOverrideProvided = isNonEmptyString(overrides.containerId);
  const containerId = containerOverrideProvided ? overrides.containerId : DEFAULT_CONTAINER_ID;
  const autoRender = overrides.autoRender !== false;

  let currentLayout = hasLayoutOverride ? overrides.layout : defaultLayout;

  function cloneLayout(layout) {
    return JSON.parse(JSON.stringify(layout));
  }

  /**
   * Builds a single button element based on the provided configuration.
   * @param {Object} config
   * @returns {HTMLButtonElement}
   */
  function createButton(config) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = config.id;
    button.classList.add('custom-button');
    button.textContent = config.label;

    if (Array.isArray(config.classes)) {
      config.classes.forEach(function(className) {
        button.classList.add(className);
      });
    }

    if (config.title) {
      button.title = config.title;
    }

    if (config.colSpan) {
      button.style.setProperty('--button-col-span', config.colSpan);
    }

    return button;
  }

  /**
   * Clears the existing container and renders the new layout.
   * @param {Array<Array<Object>>} layout
   */
  function render(layout) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    container.innerHTML = '';

    layout.forEach(function(rowConfig) {
      const row = document.createElement('div');
      row.classList.add('button-row');

      rowConfig.forEach(function(buttonConfig) {
        row.appendChild(createButton(buttonConfig));
      });

      container.appendChild(row);
    });
  }

  function resolveLayout(layout) {
    if (Array.isArray(layout)) {
      currentLayout = layout;
      return layout;
    }

    if (Array.isArray(currentLayout)) {
      return currentLayout;
    }

    currentLayout = defaultLayout;
    return currentLayout;
  }

  const shouldAutoRender = autoRender && (!global.MainMenuSettings || hasLayoutOverride || containerOverrideProvided);

  if (shouldAutoRender) {
    render(resolveLayout());
  }

  return {
    applyLayout: function(layout) {
      render(resolveLayout(layout));
    },
    getDefaultLayout: function() {
      return cloneLayout(defaultLayout);
    },
    getConfiguredLayout: function() {
      return cloneLayout(resolveLayout());
    }
  };
})(window);
