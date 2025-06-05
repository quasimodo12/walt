// label_storage.js
var LabelStorage = (function() {
    var labelData = [];
    var currentId = 0; // To generate unique IDs

    function loadInitialData(initialLabelData) {
        labelData = initialLabelData.map(function(item) {
            if (item.label_id >= currentId) {
                currentId = item.label_id + 1;
            }
            return Object.assign({}, item);
        });
    }

    function getLabelData() {
        return labelData;
    }

    function setLabelData(newLabelData) {
        labelData = newLabelData;
    }

    function addLabel(labelObject) {
        var newLabel = Object.assign({}, labelObject);
        newLabel.label_id = currentId++;
        labelData.push(newLabel);
    }

    function deleteLabel(label_id) {
        labelData = labelData.filter(function(label) {
            return label.label_id !== label_id;
        });
    }

    function updateLabelPosition(label_id, newLat, newLng) {
        var label = labelData.find(function(l) { return l.label_id === label_id; });
        if (label) {
            label.latitude = newLat;
            label.longitude = newLng;
        }
    }

    var originalObject = {
        loadInitialData: loadInitialData,
        getLabelData: getLabelData,
        setLabelData: setLabelData,
        addLabel: addLabel,
        deleteLabel: deleteLabel,
        updateLabelPosition: updateLabelPosition
    };

    return originalObject;
})();
