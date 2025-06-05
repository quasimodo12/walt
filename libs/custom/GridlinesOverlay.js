// GridlinesOverlay.js

class GridlinesOverlay {
    constructor(map, options = {}) {
        this.map = map;
        this.options = Object.assign({
            minInterval: 0.25, // Minimum interval for gridlines
            maxInterval: 90,   // Maximum interval for gridlines
            intervals: [90, 45, 30, 20, 10, 5, 2, 1, 0.5, 0.25],
            color: 'gray',
            weight: 1,
            opacity: 0.5,
            labelClassName: 'grid-label',
            labelStyle: {
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '2px',
                borderRadius: '3px',
                fontSize: '10px',
            },
        }, options);

        // Create a layer group to hold gridlines and labels
        this.gridLayer = L.layerGroup().addTo(this.map);

        // Bind the addGridlines function to this instance
        this.addGridlines = this.addGridlines.bind(this);

        // Initially add gridlines
        this.addGridlines();

        // Update gridlines when the map view changes (zoom or pan)
        this.map.on('moveend', this.addGridlines);
    }

    addGridlines() {
        // Clear existing gridlines and labels
        this.gridLayer.clearLayers();

        const bounds = this.map.getBounds();
        let south = bounds.getSouth();
        let north = bounds.getNorth();
        let west = bounds.getWest();
        let east = bounds.getEast();

        const zoom = this.map.getZoom();
        const intervals = this.options.intervals;
        let latInterval, lngInterval;

        // Determine interval based on zoom level
        if (zoom <= 2) {
            latInterval = lngInterval = intervals[0];
        } else if (zoom <= 3) {
            latInterval = lngInterval = intervals[1];
        } else if (zoom <= 4) {
            latInterval = lngInterval = intervals[2];
        } else if (zoom <= 5) {
            latInterval = lngInterval = intervals[3];
        } else if (zoom <= 6) {
            latInterval = lngInterval = intervals[4];
        } else if (zoom <= 7) {
            latInterval = lngInterval = intervals[5];
        } else if (zoom <= 8) {
            latInterval = lngInterval = intervals[6];
        } else if (zoom <= 10) {
            latInterval = lngInterval = intervals[7];
        } else if (zoom <= 12) {
            latInterval = lngInterval = intervals[8];
        } else {
            latInterval = lngInterval = intervals[9];
        }

        // Enforce min and max intervals
        latInterval = Math.max(this.options.minInterval, Math.min(latInterval, this.options.maxInterval));
        lngInterval = Math.max(this.options.minInterval, Math.min(lngInterval, this.options.maxInterval));

        // Round the bounds to the nearest multiple of the interval
        south = Math.floor(south / latInterval) * latInterval;
        north = Math.ceil(north / latInterval) * latInterval;
        west = Math.floor(west / lngInterval) * lngInterval;
        east = Math.ceil(east / lngInterval) * lngInterval;

        // Draw latitude lines and labels
        for (let lat = south; lat <= north; lat += latInterval) {
            // Draw the latitude line
            L.polyline([
                [lat, west],
                [lat, east]
            ], {
                color: this.options.color,
                weight: this.options.weight,
                opacity: this.options.opacity,
            }).addTo(this.gridLayer);

            // Add a label at the center of the line
            L.marker([lat, (west + east)/2], {
                icon: L.divIcon({
                    className: this.options.labelClassName,
                    html: lat.toFixed(2) + '°',
                    iconSize: [50, 14],
                    iconAnchor: [25, -5],
                })
            }).addTo(this.gridLayer);
        }

        // Draw longitude lines and labels
        for (let lng = west; lng <= east; lng += lngInterval) {
            // Draw the longitude line
            L.polyline([
                [south, lng],
                [north, lng]
            ], {
                color: this.options.color,
                weight: this.options.weight,
                opacity: this.options.opacity,
            }).addTo(this.gridLayer);

            // Add a label at the center of the line
            L.marker([(south + north)/2, lng], {
                icon: L.divIcon({
                    className: this.options.labelClassName,
                    html: lng.toFixed(2) + '°',
                    iconSize: [50, 14],
                    iconAnchor: [25, -5],
                })
            }).addTo(this.gridLayer);
        }
    }

    // Method to remove gridlines
    remove() {
        // Remove gridlines and labels
        this.gridLayer.clearLayers();
        // Remove event listener
        this.map.off('moveend', this.addGridlines);
    }
}
