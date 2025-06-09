// export_laydown.js
var LaydownExporter = (function() {
    /**
     * Converts platform data objects to formatted platform strings for AFSIM.
     * @param {Array} platformDataArr Array of platform objects.
     * @returns {Array} Array of formatted platform strings.
     */
    function convertPlatformData(platformDataArr) {
        const newArray = [];
        platformDataArr.forEach(platform => {
            let platformStr = `platform ${platform.platform_name} WSF_PLATFORM\n`;
            platformStr += `\tside ${platform.side}\n`;
            platformStr += `\taux_data\n`;
            platformStr += `\t\tstring GROUP = "${platform.group}"\n`;

            // Use only the first subgroup if available
            if (Array.isArray(platform.subgroups) && platform.subgroups.length > 0) {
                const subgroup = platform.subgroups[0];
                platformStr += `\t\tstring SUBGROUP = "${subgroup}"\n`;
            }
            platformStr += `\tend_aux_data\n`;

            // Format position with latitude and longitude suffixes
            let lat = parseFloat(platform.latitude);
            let lon = parseFloat(platform.longitude);
            const latSuffix = lat < 0 ? 's' : 'n';
            const lonSuffix = lon < 0 ? 'w' : 'e';
            const formattedLat = Math.abs(lat).toFixed(6);
            const formattedLon = Math.abs(lon).toFixed(5);
            platformStr += `\tposition ${formattedLat}${latSuffix} ${formattedLon}${lonSuffix}\n`;

            // Add altitude
            const altitude = parseFloat(platform.altitude);
            platformStr += `\taltitude ${altitude} m\n`;

            // If altitude is 0, add category and icon
            if (altitude === 0) {
                platformStr += `\tcategory surface\n`;
                platformStr += `\ticon ship\n`;
            }

            // Add Weapons if any
            if (Array.isArray(platform.weapons) && platform.weapons.length > 0) {
                platformStr += `\t// WEAPONS\n`;
                platform.weapons.forEach(weapon => {
                    platformStr += `\tadd weapon ${weapon.name} WSF_EXPLICIT_WEAPON launched_platform_type NULL_WEAP quantity ${weapon.quantity} end_weapon\n`;
                });
            }

            // Add Sensors if any
            if (Array.isArray(platform.sensors) && platform.sensors.length > 0) {
                platformStr += `\t// SENSORS\n`;
                platform.sensors.forEach(sensor => {
                    platformStr += `\tadd sensor ${sensor} NULL_SENSOR end_sensor\n`;
                });
            }

            platformStr += `end_platform`;
            newArray.push(platformStr);
        });
        return newArray;
    }

    // Export platform laydown to a CodeMirror editor window
    function exportLaydown() {
        var platformDataStr = PlatformModel.exportData();
        var afsimPlatformData = convertPlatformData(PlatformModel.getPlatformData());

        // Store data in sessionStorage for the export page
        sessionStorage.setItem('laydownData', platformDataStr);
        sessionStorage.setItem('afsimLaydownData', JSON.stringify(afsimPlatformData));

        // Open the static export page
        window.open('export_laydown.html', '_blank');
    }

    return {
        exportLaydown: exportLaydown
    };
})();
