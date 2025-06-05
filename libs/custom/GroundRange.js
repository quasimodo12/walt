// Earth radius 
const EARTH_RADIUS = 6366707.0194937074958;

/**
 * Convert from ellipsoidal (lat, lon, alt) to spherical (x, y, z).
 * Assuming lat, lon in radians. Alt in meters above reference ellipsoid.
 * If lat/lon are in degrees, convert them:
 *   latRadians = latDegrees * Math.PI/180
 *   lonRadians = lonDegrees * Math.PI/180
 */
function convertEllipsoidalToSpherical(point) {
    const lat = point[0]; // in radians
    const lon = point[1]; // in radians
    const alt = point[2]; // in meters

    // Radius from center of Earth
    const radius = EARTH_RADIUS + alt;

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.cos(lat) * Math.sin(lon);
    const z = radius * Math.sin(lat);

    return [x, y, z];
}

/**
 * Compute the dot product of two 3D vectors
 */
function dotProduct(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

/**
 * Compute the magnitude of a 3D vector
 */
function magnitude(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

/**
 * Compute the approximate ground range between two locations.
 * @param {number[]} point1 [lat (radians), lon (radians), alt (m)]
 * @param {number[]} point2 [lat (radians), lon (radians), alt (m)]
 */
function GRLIB_calculateAFSIMGroundRange(point1, point2) {
    // Convert points to spherical (3D Cartesian)
    const sphericalPoint1 = convertEllipsoidalToSpherical(point1);
    const sphericalPoint2 = convertEllipsoidalToSpherical(point2);

    // Compute the cosine of the angle between the two vectors
    const dp = dotProduct(sphericalPoint1, sphericalPoint2);
    const mag1 = magnitude(sphericalPoint1);
    const mag2 = magnitude(sphericalPoint2);
    let cosTheta = dp / (mag1 * mag2);

    // Clamp cosTheta between -1 and 1 to avoid numerical issues
    cosTheta = Math.max(-1.0, Math.min(cosTheta, 1.0));

    // Get the angle in radians
    const theta = Math.acos(cosTheta);

    // Ground range = Earth radius * angle
    return EARTH_RADIUS * theta;
}

