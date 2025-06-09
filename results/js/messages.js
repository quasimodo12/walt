/**
 * Message handling for the results window.
 *
 * The main application posts JSON data to the results iframe.  This module
 * listens for those messages and updates the global data structures before
 * triggering a refresh of the charts.
 */

/** Mapping of message types to handler functions. */
const messageHandlers = {
    platformData: (data) => {
        platformData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated platformData:', platformData);
    },
    weaponData: (data) => {
        weaponData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated weaponData:', weaponData);
    },
    sensorData: (data) => {
        sensorData = data;
        populateConfigDropdowns();
        console.log('results.html: Updated sensorData:', sensorData);
    },
    distanceData: (data) => {
        distanceData = data;
        console.log('results.html: Received distanceData:', distanceData);
    }
};

// Listen for data sent from the main window via postMessage.
window.addEventListener('message', function(event) {
    const { type, data } = event.data;
    console.log('Received message:', event.data);

    const handler = messageHandlers[type];

    if (handler) {
        handler(data);
    } else {
        console.error('results.html: Received message of unknown type.');
    }

    applyConfig();
}, false);
