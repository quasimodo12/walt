/* table_controller.js */

/* This file contains the TableController module, which controls
   the initialization and management the platform table 
   on the main WALT page. 

   The module contains two funcitons:
   init():
      > Creates the platform table using the JQuery DataTables
      library
      > Sets the column headers and fills the cells with 
      platform data from the PlatformModel module
      > Sets up event handlers for click-actions for rows
        (e.g. shift-click to select platforms from the table)

   redrawTable():
      > Updates the platform table with platform data from
      the PlatformModel module 

*/
var TableController = (function() {
    function init() {
        var tableData = PlatformModel.getPlatformData();

        // Initialize table with DataTables library
        var table = $('#platformTable').DataTable({
            data: tableData,
            columns: [
                { title: "Name", data: "platform_name" },
                { title: "Side", data: "side" },
                { title: "Group", data: "group" },
                { title: "Subgroup", data: function(row) { 
                    return row.subgroups && row.subgroups.length > 0 ? row.subgroups[0] : "";
                }},
                { 
                    title: "Lat", 
                    data: function(row) {
                        return parseFloat(row.latitude).toFixed(3);
                    } 
                },
                { 
                    title: "Lon", 
                    data: function(row) {
                        return parseFloat(row.longitude).toFixed(3);
                    } 
                },
                { title: "Alt", data: "altitude" }
            ]
        });

        // Handle double-click on table rows
        $('#platformTable tbody').on('dblclick', 'tr', function() {
            var rowData = table.row(this).data();
            var platform = PlatformModel.getPlatformData().find(function(p) {
                return p.platform_name === rowData.platform_name;
            });
            if (platform) {
                View.showPlatformInfo(platform); // Open the dialog
            }
        });

        // Handle shift-click on table rows
        $('#platformTable tbody').on('click', 'tr', function(event) {
            if (event.shiftKey) {
                var rowData = table.row(this).data();
                var platform = PlatformModel.getPlatformData().find(function(p) {
                    return p.platform_name === rowData.platform_name;
                });  
                if (platform) {
                    View.addPlatformToSelected(platform.platform_name);
                }          
            }
        });

        // Handle ctrl-click on table rows
        $('#platformTable tbody').on('click', 'tr', function(event) {
            if (event.ctrlKey) {
                var rowData = table.row(this).data();
                var platform = PlatformModel.getPlatformData().find(function(p) {
                    return p.platform_name === rowData.platform_name;
                });  
                if (platform) {
                    var platformName = platform.platform_name;
                    var rangeRings = RangeRingStorage.getAllRangeRings();
                    var map = View.getMap();
                    RangeRingLogic.drawRangeRingForPlatform(platformName, rangeRings, map);
                }
            }
        });
    }

    // Function to redraw the table with the latest platform data
    function redrawTable() {
        var table = $('#platformTable').DataTable();          // platform table
        var platModel = PlatformModel.getPlatformData();      // platform data    
        table.clear();                                        // Clear existing data
        table.rows.add(platModel);                            // Add new data
        table.draw();                                         // Redraw the table
    }
    
    return {
        init: init,
        redrawTable: redrawTable
    };
})();
