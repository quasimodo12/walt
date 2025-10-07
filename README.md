# walt

https://quasimodo12.github.io/walt/

## Configuring map behavior

The application exposes a global `MapSettings` object (defined in `js/config/map_settings.js`)
that captures the initial Leaflet map options, base tile layer configuration, and ruler units.
Scenario owners can override any of these values without touching the shared application logic.

To override settings, define `window.MapSettings` **before** `js/config/map_settings.js` is
loaded. Only the properties you provide will replace the defaults. For example:

```html
<script>
  window.MapSettings = {
    map: {
      center: [35.0, -120.0],
      zoom: 6,
      maxBounds: null
    },
    tileLayer: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19
      }
    },
    ruler: {
      lengthUnit: {
        display: 'Kilometers',
        factor: 1
      }
    }
  };
</script>
<script src="js/config/map_settings.js"></script>
```

This pattern keeps scenario-specific map behavior in configuration while preserving the shared
application logic in `js/view.js` and related modules.

## Configuring the main menu layout

The main menu buttons are rendered by `js/menu/main_menu_button_layout.js`. Scenarios can adjust
the arrangement or target container by defining `window.MainMenuSettings` before that script is
loaded. Only the supplied properties replace the defaults:

```html
<script>
  window.MainMenuSettings = {
    containerId: 'scenarioMenuContainer',
    layout: [
      [
        { id: 'createPlatformButton', label: 'Add New Platform' },
        { id: 'refreshDataButton', label: 'Refresh Data' }
      ],
      [
        { id: 'openChartsButton', label: 'Display Results' }
      ]
    ]
  };
</script>
<script src="js/menu/main_menu_button_layout.js"></script>
```

By default the module renders immediately using either the overridden layout or the built-in
structure. To supply a layout later (for example, after fetching scenario data), set
`autoRender: false` and invoke `MainMenuButtons.applyLayout(customLayout)` when ready:

```html
<script>
  window.MainMenuSettings = {
    autoRender: false
  };
</script>
<script src="js/menu/main_menu_button_layout.js"></script>
<script>
  fetch('/scenario/menu-layout.json')
    .then(function(response) { return response.json(); })
    .then(function(customLayout) {
      MainMenuButtons.applyLayout(customLayout);
    });
</script>
```

### Adjusting main menu spacing

Spacing, padding, and sizing rules for the main menu live in
`js/menu/main_menu_layout_config.js`. The module exposes a set of CSS custom properties on the menu
container so that developers can quickly tweak the table-to-button ratio without editing the
stylesheet. Define `window.MainMenuLayoutSettings` (or provide `layoutConfig` inside
`window.MainMenuSettings`) before the script is loaded to override the defaults:

```html
<script>
  window.MainMenuLayoutSettings = {
    config: {
      container: {
        padding: '18px',
        margin: '8px'
      },
      table: {
        minHeight: '300px'
      },
      buttons: {
        maxHeight: '24vh',
        fontSize: 'clamp(0.72rem, 0.5vw + 0.55rem, 0.98rem)'
      }
    }
  };
</script>
<script src="js/menu/main_menu_layout_config.js"></script>
```

Call `MainMenuLayout.apply(customConfig)` at runtime to adjust the spacing after the page has
loaded. Only the properties you specify are changed, so it is easy to keep scenario-specific
spacing overrides small.

## Configuring side definitions

Global side metadata is defined in `js/config/side_config.js`. The file exposes a `SideConfig`
helper that lists every supported side, its human-readable label, icon, display color, and the
default opposing side. By default the tool ships with Blue and Red entries, but scenarios can
override or extend this list without modifying the shared source.

To customize the available sides, define `window.SideSettings` before the script is loaded. Each
entry in `SideSettings.sides` must include an `id`, optional `label`, optional `defaultOpponent`,
and any icon/color overrides you need:

```html
<script>
  window.SideSettings = {
    defaultSideId: 'coalition',
    fallbackIconUrl: 'images/coalition-plat.png',
    fallbackColor: '#999999',
    sides: [
      {
        id: 'coalition',
        label: 'Coalition',
        defaultOpponent: 'adversary',
        iconUrl: 'images/coalition-plat.png',
        color: '#1F77B4'
      },
      {
        id: 'adversary',
        label: 'Adversary',
        defaultOpponent: 'coalition',
        iconUrl: 'images/adversary-plat.png',
        color: '#D62728'
      }
    ]
  };
</script>
<script src="js/config/side_config.js"></script>
```

Scripts that render dropdowns, map icons, range rings, or results views consume this shared
configuration. If a platform, weapon, or sensor references a side that is not defined, the UI falls
back to the configured default icon and a neutral color so undefined sides are still displayed.
