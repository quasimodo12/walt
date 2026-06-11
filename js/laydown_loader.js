// laydown_loader.js
var LaydownLoader = (function() {
    var REQUIRED_FILES = [
        {
            fileName: 'platform_details.js',
            variableName: 'PLATFORM_DATA',
            globalName: 'PLATFORM_DATA'
        },
        {
            fileName: 'weapon_details.js',
            variableName: 'WEAPON_DATA',
            globalName: 'WEAPON_DATA'
        },
        {
            fileName: 'weapon_lethality_details.js',
            variableName: 'WEAPON_LETHALITY_DATA',
            globalName: 'WEAPON_LETHALITY_DATA'
        },
        {
            fileName: 'sensor_details.js',
            variableName: 'SENSOR_DATA',
            globalName: 'SENSOR_DATA'
        },
        {
            fileName: 'labels.js',
            variableName: 'LABEL_DATA',
            globalName: 'LABEL_DATA'
        },
        {
            fileName: 'range_ring_style_templates.js',
            variableName: 'range_ring_style_templates',
            globalName: 'range_ring_style_templates'
        }
    ];

    function init() {
        var button = document.getElementById('loadLaydownButton');
        var input = document.getElementById('loadLaydownInput');

        if (!button || !input) {
            return;
        }

        button.addEventListener('click', function() {
            input.value = '';
            input.click();
        });

        input.addEventListener('change', function(event) {
            var files = Array.prototype.slice.call(event.target.files || []);
            if (!files.length) {
                return;
            }

            loadFromFileList(files)
                .then(function(summary) {
                    alert('Loaded laydown from "' + summary.folderName + '".');
                })
                .catch(function(error) {
                    console.error('laydown_loader.js: failed to load laydown', error);
                    alert(error.message || 'Unable to load the selected laydown folder.');
                });
        });
    }

    function loadFromFileList(files) {
        return new Promise(function(resolve, reject) {
            var selectedFiles;

            try {
                selectedFiles = selectRequiredFiles(files);
            } catch (error) {
                reject(error);
                return;
            }

            Promise.all(REQUIRED_FILES.map(function(requirement) {
                return readScenarioFile(selectedFiles[requirement.fileName], requirement);
            })).then(function(results) {
                var laydownData = {};
                results.forEach(function(result) {
                    laydownData[result.requirement.globalName] = result.value;
                });

                applyLaydownData(laydownData);
                resolve({ folderName: getFolderName(selectedFiles) });
            }).catch(reject);
        });
    }

    function selectRequiredFiles(files) {
        var filesByName = {};
        files.forEach(function(file) {
            if (!file || !file.name) {
                return;
            }

            if (!filesByName[file.name] || getPathDepth(file) < getPathDepth(filesByName[file.name])) {
                filesByName[file.name] = file;
            }
        });

        var missingFiles = REQUIRED_FILES.filter(function(requirement) {
            return !filesByName[requirement.fileName];
        }).map(function(requirement) {
            return requirement.fileName;
        });

        if (missingFiles.length) {
            throw new Error('The selected folder is missing required laydown file(s): ' + missingFiles.join(', '));
        }

        return filesByName;
    }

    function getPathDepth(file) {
        var relativePath = file.webkitRelativePath || file.name || '';
        return relativePath.split('/').filter(Boolean).length;
    }

    function getFolderName(selectedFiles) {
        var firstRequirement = REQUIRED_FILES[0];
        var firstFile = selectedFiles[firstRequirement.fileName];
        var relativePath = firstFile && firstFile.webkitRelativePath ? firstFile.webkitRelativePath : '';
        var parts = relativePath.split('/').filter(Boolean);
        return parts.length > 1 ? parts[0] : 'selected folder';
    }

    function readScenarioFile(file, requirement) {
        return file.text().then(function(source) {
            return {
                requirement: requirement,
                value: extractVariable(source, requirement)
            };
        });
    }

    function extractVariable(source, requirement) {
        var extractor;
        var value;

        try {
            extractor = new Function(
                source + '\nreturn (typeof ' + requirement.variableName + ' !== "undefined") ? ' + requirement.variableName + ' : undefined;'
            );
            value = extractor();
        } catch (error) {
            throw new Error('Unable to evaluate ' + requirement.fileName + ': ' + error.message);
        }

        if (!Array.isArray(value)) {
            throw new Error(requirement.fileName + ' must define an array named ' + requirement.variableName + '.');
        }

        return cloneArray(value);
    }

    function cloneArray(value) {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        return JSON.parse(JSON.stringify(value));
    }

    function applyLaydownData(laydownData) {
        window.PLATFORM_DATA = laydownData.PLATFORM_DATA;
        window.WEAPON_DATA = laydownData.WEAPON_DATA;
        window.WEAPON_LETHALITY_DATA = laydownData.WEAPON_LETHALITY_DATA;
        window.SENSOR_DATA = laydownData.SENSOR_DATA;
        window.LABEL_DATA = laydownData.LABEL_DATA;
        window.range_ring_style_templates = laydownData.range_ring_style_templates;

        closeOpenDialogs();

        PlatformModel.loadInitialData(window.PLATFORM_DATA);
        WeaponStorage.loadInitialData(window.WEAPON_DATA);
        WeaponLethalityStorage.loadInitialData(window.WEAPON_LETHALITY_DATA);
        SensorStorage.loadInitialData(window.SENSOR_DATA);
        LabelStorage.loadInitialData(window.LABEL_DATA);
        DistanceStorage.refreshDistanceData();
        RangeRingStorage.init();

        if (typeof SelectionController !== 'undefined') {
            SelectionController.clearSelectedMarkers();
        }
        if (typeof TableController !== 'undefined') {
            TableController.redrawTable();
        }
        if (typeof View !== 'undefined') {
            View.renderPlatforms();
        }
        if (typeof LabelController !== 'undefined') {
            LabelController.renderLabels();
        }
        if (typeof View !== 'undefined' && typeof View.updateAll === 'function') {
            View.updateAll();
        }
    }

    function closeOpenDialogs() {
        if (typeof $ === 'undefined' || !$.fn || !$.fn.dialog) {
            return;
        }

        $('.ui-dialog-content').each(function() {
            var $dialog = $(this);
            if ($dialog.hasClass('ui-dialog-content')) {
                try {
                    $dialog.dialog('close');
                } catch (error) {
                    console.warn('laydown_loader.js: unable to close dialog', error);
                }
            }
        });
    }

    return {
        init: init,
        loadFromFileList: loadFromFileList
    };
})();
