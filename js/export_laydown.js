// export_laydown.js
var LaydownExporter = (function() {
    function formatData(variableName, dataString) {
        return `var ${variableName} = ${dataString};`;
    }

    function exportLaydown() {
        var platformDataStr = PlatformModel.exportData();
        var weaponDataStr = WeaponStorage.exportData();
        var sensorDataStr = SensorStorage.exportData();
        var weaponLethalityDataStr = WeaponLethalityStorage.exportData();
        var labelDataStr = JSON.stringify(LabelStorage.getLabelData(), null, 2);

        sessionStorage.setItem('platformLaydownData', formatData('PLATFORM_DATA', platformDataStr));
        sessionStorage.setItem('weaponLaydownData', formatData('WEAPON_DATA', weaponDataStr));
        sessionStorage.setItem('sensorLaydownData', formatData('SENSOR_DATA', sensorDataStr));
        sessionStorage.setItem('weaponLethalityLaydownData', formatData('WEAPON_LETHALITY_DATA', weaponLethalityDataStr));
        sessionStorage.setItem('labelLaydownData', formatData('LABEL_DATA', labelDataStr));

        window.open('export_laydown.html', '_blank');
    }

    return {
        exportLaydown: exportLaydown
    };
})();
