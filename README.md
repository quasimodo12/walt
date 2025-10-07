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

### Adjusting menu spacing from a single configuration file

The overall spacing between the platform table, its header, and the main menu button container is
driven by CSS custom properties managed through `js/config/main_menu_layout.js`.

Edit `window.MainMenuLayoutSettings` to change padding, flex sizing, and vertical limits without
digging through stylesheets:

```html
<script>
  window.MainMenuLayoutSettings = {
    container: { padding: '16px', gap: '12px' },
    table: { minHeight: '60vh' },
    buttons: { maxHeight: '22vh', padding: '4px 12px' }
  };
</script>
<script src="js/config/main_menu_layout.js"></script>
<script src="js/menu/main_menu_layout_manager.js"></script>
```

The `MainMenuLayout` helper (exposed globally) also provides runtime methods for more advanced
scenarios:

```javascript
MainMenuLayout.update({ buttons: { maxHeight: '30vh' } });
console.log(MainMenuLayout.getSettings());
```

Any properties omitted from the configuration fall back to the defaults baked into
`main_menu_layout_manager.js`.

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
