// platform_model.js
var PlatformModel = (function() {
    var platformData = [];

    function normalizeRotation(rotation) {
        var numericRotation = Number(rotation);
        return isFinite(numericRotation) ? numericRotation : 0;
    }

    function normalizePlatform(platform) {
        if (!platform.type || (typeof platform.type === 'string' && platform.type.trim() === '')) {
            platform.type = 'Unspecified';
        } else if (typeof platform.type === 'string') {
            platform.type = platform.type.trim();
        }
        platform.rotation = normalizeRotation(platform.rotation);
        return platform;
    }

    // Pulls data from the global PLATFORM_DATA variable
    // defined in platform_details.js and inserts it into 
    // platformData
    function loadInitialData(PLATFORM_DATA) {
        platformData = PLATFORM_DATA.map(function(item) {
            var copy = Object.assign({}, item);
            return normalizePlatform(copy);
        });
    }

    // Returns the platformData array
    function getPlatformData() {        
        return platformData;
    }

    // Returns a platformData object entry by referencing the platformName
    function getPlatformDataFromName(platformName) {
        for (let i = 0; i < platformData.length; i++) {
            if (platformData[i].platform_name === platformName) {
                return platformData[i];
            }
        }
        return null; // Return null if the platform name is not found
    }

    // Returns a list of the names of all the platforms in platformData
    function getPlatformNames() {
        return platformData.map(platform => platform.platform_name);
    }

    // Updates one specific platforms latitude and longitude using the platformName
    function updatePlatformPosition(platformName, lat, lon) {
        platformData.forEach(function(platform) {
            if (platform.platform_name === platformName) {
                platform.latitude = lat;
                platform.longitude = lon;
            }
        });
    }

    // Function to create and add a platform to platformData
    function createPlatform(platformName, side, group, subgroups, latitude, longitude, altitude, category, type, weapons, sensors, rotation) {
        var newPlatform = {
            platform_name: platformName,
            side: side,
            group: group,
            subgroups: subgroups,
            latitude: latitude,
            longitude: longitude,
            altitude: altitude,
            rotation: normalizeRotation(rotation),
            category: category,
            type: (typeof type === 'string' && type.trim() !== '') ? type.trim() : 'Unspecified',
            weapons: weapons,
            sensors: sensors
        };
        platformData.push(newPlatform);
    }

    // Function to add an already defined platform object to platformData
    function pushPlatform(newPlatform) {
        platformData.push(normalizePlatform(newPlatform));
    }

    // Deletes a platform from platformData using the name of the platform
    function deletePlatform(platformName) {
        const initialLength = platformData.length;
        platformData = platformData.filter(function(platform) {
            return platform.platform_name !== platformName;
        });
        return platformData.length < initialLength;
    }

    // Export the platformData object array to a json format
    function exportData() {
        return JSON.stringify(platformData, null, 2);
    }

    return {
        loadInitialData: loadInitialData,
        getPlatformData: getPlatformData,
        getPlatformNames: getPlatformNames,
        updatePlatformPosition: updatePlatformPosition,
        exportData: exportData,
        normalizeRotation: normalizeRotation,
        createPlatform: createPlatform,
        pushPlatform: pushPlatform,
        getPlatformDataFromName: getPlatformDataFromName,
        deletePlatform: deletePlatform 
    };
})();
