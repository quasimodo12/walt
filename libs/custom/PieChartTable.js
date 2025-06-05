// Modified PieChartTable Class with Tabulator Integration
class PieChartTable {
    constructor(colNameList, rowNameList, containerId) {
        console.log('Initializing PieChartTable');
        this.colNameList = colNameList;
        this.rowNameList = rowNameList;
        this.containerId = containerId;
        this.charts = {};
        this.generateTable();
    }

    generateTable() {
        console.log('Generating table');
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with ID ${this.containerId} not found.`);
            return;
        }
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const emptyHeaderCell = document.createElement('th');
        headerRow.appendChild(emptyHeaderCell);

        for (const colName of this.colNameList) {
            console.log(`Adding column header: ${colName}`);
            const th = document.createElement('th');
            th.textContent = colName;
            headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        for (const rowName of this.rowNameList) {
            console.log(`Adding row: ${rowName}`);
            const row = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = rowName;
            row.appendChild(th);

            for (const colName of this.colNameList) {
                console.log(`Creating cell for row ${rowName}, column ${colName}`);
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';

                const canvas = document.createElement('canvas');
                canvas.className = 'pie-chart-canvas';
                canvas.id = 'chart-' + colName + '-' + rowName;
                canvas.style.display = 'block';
                canvas.style.margin = 'auto';

                td.appendChild(canvas);
                row.appendChild(td);

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error(`Failed to get 2D context for canvas with ID ${canvas.id}`);
                    continue;
                }

                const data = {
                    labels: ['Data1', 'Data2'],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#36A2EB', '#d9d9d9'],
                    }]
                };

                console.log(`Initializing chart for canvas ID ${canvas.id}`);
                const chart = new Chart(ctx, {
                    type: 'pie',
                    data: data,
                    options: {
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false },
                            centerText: {
                                display: true,
                                text: '',
                            }
                        },
                        elements: { arc: { borderWidth: 0 } }
                    },
                    plugins: [this.centerTextPlugin]
                });

                // Add click event listener to the canvas
                canvas.addEventListener('click', (event) => {
                    console.log(`Pie chart clicked: ${canvas.id}`);
                    const mapData = chart.mapData;
                    if (mapData) {
                        console.log('mapData found, preparing dialog');
                        // Create a unique ID for the dialog
                        const dialogId = 'dialog-' + colName + '-' + rowName;
                        const tableDivId = 'tabulator-table-' + colName + '-' + rowName;

                        // Check if the dialog already exists
                        let $dialog = $('#' + dialogId);
                        if ($dialog.length === 0) {
                            console.log(`Creating new dialog with ID ${dialogId}`);
                            // Create the dialog div
                            $dialog = $('<div id="' + dialogId + '"></div>').appendTo('body');
                        } else {
                            console.log(`Dialog with ID ${dialogId} already exists, reusing`);
                            $dialog.empty(); // Clear previous content
                        }

                        // Create the search container div
                        const $searchDiv = $('<div style="margin-bottom: 10px; text-align: center;"></div>');
                        $dialog.append($searchDiv);

                        // Create the search input field
                        const $searchInput = $('<input type="text" placeholder="Search..." style="width: 50%;">');
                        $searchDiv.append($searchInput);

                        // Create the table container div
                        const $tableDiv = $('<div id="' + tableDivId + '" style="margin: 0 auto;"></div>');
                        $dialog.append($tableDiv);

                        // Prepare the data for Tabulator
                        const keys = Array.from(mapData.keys());
                        console.log('Map keys:', keys);
                        const columns = keys.map(key => ({ title: key, field: key })); // Removed headerFilter: true
                        const data = [];

                        // Determine the maximum length of the arrays
                        let maxLength = 0;
                        for (const key of keys) {
                            const arr = mapData.get(key);
                            if (arr.length > maxLength) {
                                maxLength = arr.length;
                            }
                        }
                        console.log('Maximum data length:', maxLength);

                        // Build data rows
                        for (let i = 0; i < maxLength; i++) {
                            const rowData = {};
                            for (const key of keys) {
                                const arr = mapData.get(key);
                                rowData[key] = arr[i] !== undefined ? arr[i] : '';
                            }
                            data.push(rowData);
                        }
                        console.log('Data prepared for Tabulator:', data);
                        
                        // Initialize Tabulator
                        let table; // Declare table variable to hold Tabulator instance

                        try {
                            console.log('Initializing Tabulator');
                            table = new Tabulator('#' + tableDivId, {
                                data: data,
                                columns: columns,
                                layout: 'fitDataTable', // Adjust to content width, allowing horizontal scrolling
                                height: "500px", // Optional: Set height to enable vertical scrolling if needed
                                virtualDomHoz: true, // Optimize rendering for wide tables
                                autoResize: true, // Automatically resize the table on window resize
                            });
                        } catch (e) {
                            console.error('Error initializing Tabulator:', e);
                        }

                        // Bind the search input to the Tabulator's filter
                        $searchInput.on('keyup', function() {
                            const filterValue = $(this).val();
                            if (filterValue) {
                                table.setFilter(function(data, filterParams) {
                                    for (const key in data) {
                                        if (String(data[key]).toLowerCase().includes(filterValue.toLowerCase())) {
                                            return true;
                                        }
                                    }
                                    return false;
                                });
                            } else {
                                table.clearFilter();
                            }
                        });

                        // Initialize jQuery dialog
                        try {
                            console.log('Opening dialog');
                            $dialog.dialog({
                                title: 'Details',
                                height: 600,
                                width: 1200,
                                modal: true,
                                open: function() {
                                    // Center the dialog content
                                    $(this).css('text-align', 'center');
                                },
                                close: function() {
                                    // Destroy the Tabulator when the dialog is closed
                                    if (table) {
                                        //downloadCSV(columns, data);
                                        table.destroy();
                                        console.log('Tabulator table destroyed');
                                    }
                                    $dialog.remove();
                                    console.log('Dialog closed and cleaned up');
                                }
                            });
                        } catch (e) {
                            console.error('Error opening dialog:', e);
                        }
                    } else {
                        console.error('No mapData associated with this chart.');
                    }
                });

                if (!this.charts[rowName]) this.charts[rowName] = {};
                this.charts[rowName][colName] = chart;

            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        container.appendChild(table);
        console.log('Table generation complete');
    }

    centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart) {
            // Debug statement for centerTextPlugin
            // console.log('centerTextPlugin afterDraw called');
            const { width, height, ctx } = chart;
            const centerText = Math.round(chart.config.options.plugins.centerText.text) + '%';
            ctx.save();
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(centerText, width / 2, height / 2);
            ctx.restore();
        }
    };

    /**
     * Updates the data of a specific pie chart, changes its color, and adds center overlay text.
     * @param {String} colName - The column name associated with the chart.
     * @param {String} rowName - The row name associated with the chart.
     * @param {Array} newData - The new data array to update the chart with.
     * @param {String} newColor - (Optional) The new hex color code to update the chart with.
     * @param {Map} mapData - (Optional) A Map with keys as column headers and arrays as row data.
     */
    updateChart(colName, rowName, newData, newColor = null, mapData = null) {
        console.log(`Updating chart for row ${rowName}, column ${colName}`);
        if (this.charts[rowName] && this.charts[rowName][colName]) {
            const chart = this.charts[rowName][colName];
            chart.data.datasets[0].data = newData;

            // If a new color is provided, update the chart's color
            if (newColor) {
                console.log(`Updating chart color to ${newColor}`);
                chart.data.datasets[0].backgroundColor = [newColor, '#d9d9d9'];
            }

            // Store mapData in chart instance
            if (mapData) {
                console.log('Storing mapData in chart instance');
                chart.mapData = mapData; // Store the mapData
            }

            chart.config.options.plugins.centerText.text = newData[0].toString();
            chart.update();
            console.log('Chart updated');
        } else {
            console.error(`Chart with column ${colName} and row ${rowName} not found.`);
        }
    }

    getChartData(colName, rowName) {
        console.log(`Retrieving chart data for row ${rowName}, column ${colName}`);
        if (this.charts[rowName] && this.charts[rowName][colName]) {
            return this.charts[rowName][colName].data.datasets[0].data;
        } else {
            console.error(`Chart with column ${colName} and row ${rowName} not found.`);
            return null;
        }
    }
}

function downloadCSV(columns, data) {
    // Create CSV header
    const header = columns.map(col => `"${col.title}"`).join(',');

    // Create CSV rows
    const rows = data.map(row => 
        columns.map(col => `"${row[col.field] || ''}"`).join(',')
    );

    // Combine header and rows
    const csvContent = [header, ...rows].join('\n');

    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Attach the PieChartTable class to the window object to make it globally accessible
window.PieChartTable = PieChartTable;
