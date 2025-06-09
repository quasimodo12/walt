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
        var finalPlatDataStr = 'var PLATFORM_DATA = ' + platformDataStr + ';';

        var afsimPlatformData = convertPlatformData(PlatformModel.getPlatformData());
        var afsimPlatformDataStr = JSON.stringify(afsimPlatformData);

        // Determine a base href so relative paths work in the new window
        var baseHref = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

        // Construct HTML containing CodeMirror editors
        var htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <base href="${baseHref}">
            <meta charset="UTF-8">
            <title>Platform Laydown Editor</title>
            <link rel="stylesheet" href="libs/codemirror/lib/codemirror.css">
            <link rel="stylesheet" href="libs/codemirror/theme/moxer.css">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { height: 100%; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; color: #333; }
                body { display: flex; flex-direction: column; }
                h1 { text-align: center; padding: 20px 0; background-color: #6c757d; color: #fff; font-size: 2em; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 10px; }
                .editor-container { flex: 1; display: flex; flex-direction: row; padding: 10px 20px; gap: 20px; }
                .editor-wrapper { flex: 1; display: flex; flex-direction: column; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 15px; position: relative; }
                .editor-label { font-weight: 600; margin-bottom: 10px; color: #0d0d0d; font-size: 1.1em; }
                .copy-button { position: absolute; top: 15px; right: 15px; padding: 6px 12px; background-color: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
                .copy-button:hover { background-color: #5a6268; }
                .CodeMirror { height: 100%; border: 1px solid #ddd; border-radius: 4px; }
            </style>
        </head>
        <body>
            <h1>Platform Laydown Editor</h1>
            <div class="editor-container">
                <div class="editor-wrapper">
                    <div class="editor-label">Platform Data</div>
                    <button class="copy-button" data-editor="left">Copy</button>
                    <textarea id="editorLeft"></textarea>
                </div>
                <div class="editor-wrapper">
                    <div class="editor-label">AFSIM Platform Data</div>
                    <button class="copy-button" data-editor="right">Copy</button>
                    <textarea id="editorRight"></textarea>
                </div>
            </div>
            <script src="libs/codemirror/lib/codemirror.js"></script>
            <script src="libs/codemirror/mode/javascript/javascript.js"></script>
            <script>
                var editorLeft = CodeMirror.fromTextArea(document.getElementById('editorLeft'), { lineNumbers: true, mode: 'javascript', theme: 'moxer' });
                var editorRight = CodeMirror.fromTextArea(document.getElementById('editorRight'), { lineNumbers: true, mode: 'javascript', theme: 'moxer' });
                editorLeft.setValue(`"use strict";\n${finalPlatDataStr}`);
                editorRight.setValue(afsimPlatformDataStr);
                function copyToClipboard(text) {
                    if (navigator.clipboard && window.isSecureContext) {
                        return navigator.clipboard.writeText(text);
                    } else {
                        let textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "absolute";
                        textArea.style.left = "-999999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        return new Promise((res, rej) => {
                            document.execCommand('copy') ? res() : rej();
                            textArea.remove();
                        });
                    }
                }
                document.querySelectorAll('.copy-button').forEach(function(button) {
                    button.addEventListener('click', function() {
                        var editorId = this.getAttribute('data-editor');
                        var editorContent = editorId === 'left' ? editorLeft.getValue() : editorRight.getValue();
                        copyToClipboard(editorContent).then(() => {
                            var originalText = this.textContent;
                            this.textContent = 'Copied!';
                            this.disabled = true;
                            setTimeout(() => { this.textContent = originalText; this.disabled = false; }, 2000);
                        }).catch(() => { alert('Failed to copy text. Please try manually.'); });
                    });
                });
            </script>
        </body>
        </html>
        `;

        var win = window.open("", "_blank");
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
    }

    return {
        exportLaydown: exportLaydown
    };
})();
