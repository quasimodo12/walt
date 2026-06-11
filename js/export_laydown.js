// export_laydown.js
var LaydownExporter = (function() {
    var ZIP_FOLDER_PREFIX = 'walt-laydown';

    function formatData(variableName, dataString) {
        return 'var ' + variableName + ' = ' + dataString + ';\n';
    }

    function getTimestamp() {
        var now = new Date();
        return [
            now.getFullYear(),
            pad(now.getMonth() + 1),
            pad(now.getDate()),
            '-',
            pad(now.getHours()),
            pad(now.getMinutes()),
            pad(now.getSeconds())
        ].join('');
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function buildLaydownFiles() {
        var platformDataStr = PlatformModel.exportData();
        var weaponDataStr = WeaponStorage.exportData();
        var weaponLethalityDataStr = WeaponLethalityStorage.exportData();
        var sensorDataStr = SensorStorage.exportData();
        var labelDataStr = JSON.stringify(LabelStorage.getLabelData(), null, 2);
        var rangeRingTemplateDataStr = JSON.stringify(getRangeRingStyleTemplates(), null, 2);

        return [
            {
                fileName: 'platform_details.js',
                variableName: 'PLATFORM_DATA',
                content: formatData('PLATFORM_DATA', platformDataStr),
                storageKey: 'platformLaydownData'
            },
            {
                fileName: 'weapon_details.js',
                variableName: 'WEAPON_DATA',
                content: formatData('WEAPON_DATA', weaponDataStr),
                storageKey: 'weaponLaydownData'
            },
            {
                fileName: 'weapon_lethality_details.js',
                variableName: 'WEAPON_LETHALITY_DATA',
                content: formatData('WEAPON_LETHALITY_DATA', weaponLethalityDataStr),
                storageKey: 'weaponLethalityLaydownData'
            },
            {
                fileName: 'sensor_details.js',
                variableName: 'SENSOR_DATA',
                content: formatData('SENSOR_DATA', sensorDataStr),
                storageKey: 'sensorLaydownData'
            },
            {
                fileName: 'labels.js',
                variableName: 'LABEL_DATA',
                content: formatData('LABEL_DATA', labelDataStr),
                storageKey: 'labelLaydownData'
            },
            {
                fileName: 'range_ring_style_templates.js',
                variableName: 'range_ring_style_templates',
                content: formatData('range_ring_style_templates', rangeRingTemplateDataStr),
                storageKey: 'rangeRingStyleTemplateLaydownData'
            }
        ];
    }

    function getRangeRingStyleTemplates() {
        return Array.isArray(window.range_ring_style_templates) ? window.range_ring_style_templates : [];
    }

    function exportLaydown() {
        var folderName = ZIP_FOLDER_PREFIX + '-' + getTimestamp();
        var fileEntries = buildLaydownFiles().map(function(fileDefinition) {
            return {
                path: folderName + '/' + fileDefinition.fileName,
                content: fileDefinition.content
            };
        });

        try {
            downloadBlob(createZipBlob(fileEntries), folderName + '.zip');
        } catch (error) {
            console.error('export_laydown.js: failed to export laydown', error);
            alert(error.message || 'Unable to export the laydown.');
        }
    }

    function openClipboardExport() {
        buildLaydownFiles().forEach(function(fileDefinition) {
            sessionStorage.setItem(fileDefinition.storageKey, fileDefinition.content);
        });

        window.open('export_laydown.html', '_blank');
    }

    function downloadBlob(blob, fileName) {
        var downloadUrl = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function() {
            URL.revokeObjectURL(downloadUrl);
        }, 1000);
    }

    function createZipBlob(files) {
        var zipParts = [];
        var centralDirectoryParts = [];
        var offset = 0;
        var dateParts = getDosDateTime(new Date());

        files.forEach(function(file) {
            var fileNameBytes = encodeText(file.path);
            var contentBytes = encodeText(file.content);
            var crc = calculateCrc32(contentBytes);
            var localHeader = createLocalFileHeader(fileNameBytes, contentBytes.length, crc, dateParts);
            var centralDirectoryHeader = createCentralDirectoryHeader(fileNameBytes, contentBytes.length, crc, offset, dateParts);

            zipParts.push(localHeader, fileNameBytes, contentBytes);
            centralDirectoryParts.push(centralDirectoryHeader, fileNameBytes);
            offset += localHeader.length + fileNameBytes.length + contentBytes.length;
        });

        var centralDirectoryOffset = offset;
        var centralDirectorySize = centralDirectoryParts.reduce(function(total, part) {
            return total + part.length;
        }, 0);
        var endOfCentralDirectory = createEndOfCentralDirectory(files.length, centralDirectorySize, centralDirectoryOffset);

        return new Blob(zipParts.concat(centralDirectoryParts, [endOfCentralDirectory]), { type: 'application/zip' });
    }

    function encodeText(value) {
        return new TextEncoder().encode(value);
    }

    function getDosDateTime(date) {
        var dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
        var dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
        return { time: dosTime, date: dosDate };
    }

    function createLocalFileHeader(fileNameBytes, contentLength, crc, dateParts) {
        var header = new Uint8Array(30);
        var view = new DataView(header.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0x0800, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, dateParts.time, true);
        view.setUint16(12, dateParts.date, true);
        view.setUint32(14, crc, true);
        view.setUint32(18, contentLength, true);
        view.setUint32(22, contentLength, true);
        view.setUint16(26, fileNameBytes.length, true);
        view.setUint16(28, 0, true);
        return header;
    }

    function createCentralDirectoryHeader(fileNameBytes, contentLength, crc, offset, dateParts) {
        var header = new Uint8Array(46);
        var view = new DataView(header.buffer);
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(8, 0x0800, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, dateParts.time, true);
        view.setUint16(14, dateParts.date, true);
        view.setUint32(16, crc, true);
        view.setUint32(20, contentLength, true);
        view.setUint32(24, contentLength, true);
        view.setUint16(28, fileNameBytes.length, true);
        view.setUint16(30, 0, true);
        view.setUint16(32, 0, true);
        view.setUint16(34, 0, true);
        view.setUint16(36, 0, true);
        view.setUint32(38, 0, true);
        view.setUint32(42, offset, true);
        return header;
    }

    function createEndOfCentralDirectory(fileCount, centralDirectorySize, centralDirectoryOffset) {
        var header = new Uint8Array(22);
        var view = new DataView(header.buffer);
        view.setUint32(0, 0x06054b50, true);
        view.setUint16(4, 0, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, fileCount, true);
        view.setUint16(10, fileCount, true);
        view.setUint32(12, centralDirectorySize, true);
        view.setUint32(16, centralDirectoryOffset, true);
        view.setUint16(20, 0, true);
        return header;
    }

    function calculateCrc32(bytes) {
        var crc = 0xffffffff;
        var table = getCrc32Table();
        for (var index = 0; index < bytes.length; index++) {
            crc = (crc >>> 8) ^ table[(crc ^ bytes[index]) & 0xff];
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    var crc32Table;
    function getCrc32Table() {
        if (crc32Table) {
            return crc32Table;
        }

        crc32Table = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
            crc32Table[n] = c >>> 0;
        }
        return crc32Table;
    }

    function init() {
        bindExportButton('toolbarExportLaydownButton');
    }

    function bindExportButton(buttonId) {
        var button = document.getElementById(buttonId);
        if (!button) {
            return;
        }

        button.addEventListener('click', exportLaydown);
    }

    return {
        init: init,
        exportLaydown: exportLaydown,
        openClipboardExport: openClipboardExport,
        buildLaydownFiles: buildLaydownFiles,
        createZipBlob: createZipBlob
    };
})();
