/* Message handling for results window */

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
