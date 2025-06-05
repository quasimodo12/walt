// distance_storage.js

// Uses the custom GroundRange module from GroundRange.js to calculate the distance
// between two points. 

var DistanceStorage = (function() {

    // Distance data container
    var distanceData = {};

    // Helper function to calculate the distance between two lat lon points
    // using the geolib library's calculation formulas
    function calculateDistance(lat1, lon1, lat2, lon2) {
        return geolib.getDistance(
            { latitude: lat1, longitude: lon1 },
            { latitude: lat2, longitude: lon2 }
        );
    }

    // Helper function to calculate the distance between two lat lon points 
    // using AFSIM's ground range calculation formulas
    function calculateGroundRangeAFSIM(lat1, lon1, lat2, lon2) {
        let pointA = [lat1 * Math.PI/180, lon1 * Math.PI/180, 0];
        let pointB = [lat2 * Math.PI/180, lon2 * Math.PI/180, 0];
        // Custom ground range calculation function
        let distance = GRLIB_calculateAFSIMGroundRange(pointA, pointB);
        return distance;
    }

    // Function to initialize the distance data based on platform coordinates
    function initializeDistanceData() {
        var platformData = PlatformModel.getPlatformData();
        for (let i = 0; i < platformData.length; i++) {
            for (let j = i + 1; j < platformData.length; j++) {
                const platform1 = platformData[i];
                const platform2 = platformData[j];

                const distance = calculateGroundRangeAFSIM(
                    parseFloat(platform1.latitude),
                    parseFloat(platform1.longitude),
                    parseFloat(platform2.latitude),
                    parseFloat(platform2.longitude)
                );

                const key = `${platform1.platform_name}---${platform2.platform_name}`;
                distanceData[key] = distance;
            }
        }
    }

    // Function to refresh and update the distance data container
    function refreshDistanceData() {
        distanceData = {}; // Clear existing distance data
        initializeDistanceData(); // Recalculate distances
    }

    // Function to get the distance between two platforms by name
    function getDistanceBetweenPlatforms(platform1Name, platform2Name) {
        const key1 = `${platform1Name}---${platform2Name}`;
        const key2 = `${platform2Name}---${platform1Name}`;

        return distanceData[key1] || distanceData[key2] || null;
    }

    // Function to get all distance data
    function getAllDistanceData() {
        return distanceData;
    }

    // Exported functions
    var originalObject = {
        initializeDistanceData: initializeDistanceData,
        refreshDistanceData: refreshDistanceData,
        getDistanceBetweenPlatforms: getDistanceBetweenPlatforms,
        getAllDistanceData: getAllDistanceData
    };

    // Create a proxy to intercept access to the IIFE
    return new Proxy(originalObject, {
        get(target, prop) {
            console.log(`DistanceStorage IIFE accessed: ${prop}`);
            // // Send data to new window
            // console.log("distance_storage.js >>> sending distanceData to new window");
            // View.sendDataToNewWindow({type: 'distanceData', data: distanceData});
            //;
            return target[prop];
        }
    });
})();