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
