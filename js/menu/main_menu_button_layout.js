// js/menu/main_menu_button_layout.js
// Creates the dynamic main menu button container based on a configurable layout

var MainMenuButtons = (function() {
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

  const CONTAINER_ID = 'mainMenuButtonContainer';

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
    const container = document.getElementById(CONTAINER_ID);
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

  return {
    applyLayout: function(layout) {
      render(Array.isArray(layout) ? layout : defaultLayout);
    },
    getDefaultLayout: function() {
      return JSON.parse(JSON.stringify(defaultLayout));
    }
  };
})();

// Render the default layout immediately so that other scripts can attach
// event listeners to the generated buttons.
MainMenuButtons.applyLayout();
