// js/config/main_menu_layout_config.js
// Centralized configuration for main menu layout spacing and sizing.
// Update the values in `window.MainMenuLayoutConfig` to quickly adjust the
// presentation of the platform table and button container without editing CSS.
// Example override (before this file loads):
//   window.MainMenuLayoutConfig = { menuWidth: '28%', buttonGap: '12px' };

(function(window, document) {
  const defaults = {
    menuWidth: '30%',
    menuPadding: '16px',
    menuContentGap: '12px',
    menuHeaderGap: '6px',
    menuToolbarGap: '8px',
    buttonSectionPadding: '8px',
    buttonRowGap: '12px',
    buttonGap: '10px',
    buttonMinWidth: 'clamp(100px, 22%, 240px)',
    buttonMinHeight: 'clamp(34px, 3.1vw, 64px)',
    buttonFontSize: 'clamp(0.78rem, 0.68vw + 0.55rem, 1.15rem)'
  };

  const settings = Object.assign({}, defaults, window.MainMenuLayoutConfig || {});

  window.MainMenuLayoutConfig = settings;

  const variableMap = {
    menuWidth: '--main-menu-width',
    menuPadding: '--main-menu-padding',
    menuContentGap: '--main-menu-content-gap',
    menuHeaderGap: '--main-menu-header-gap',
    menuToolbarGap: '--main-menu-toolbar-gap',
    buttonSectionPadding: '--main-menu-button-section-padding',
    buttonRowGap: '--main-menu-button-row-gap',
    buttonGap: '--main-menu-button-gap',
    buttonMinWidth: '--main-menu-button-min-width',
    buttonMinHeight: '--main-menu-button-min-height',
    buttonFontSize: '--main-menu-button-font-size'
  };

  Object.keys(variableMap).forEach(function(key) {
    const cssVariable = variableMap[key];
    const value = settings[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      document.documentElement.style.setProperty(cssVariable, value);
    }
  });
})(window, document);
