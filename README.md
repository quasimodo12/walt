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
