// CustomBarChartTable.js

/**
 * CustomBarChartTable Class
 * This class creates a dynamic table with bar charts in each cell based on the provided column and row names.
 * It uses the CustomBarChart library to create bar charts and provides methods to update and access the chart data.
 */
class CustomBarChartTable {
    /**
     * Constructs a CustomBarChartTable.
     * @param {Array} colNameList - Array of column names.
     * @param {Array} rowNameList - Array of row names.
     * @param {String} containerId - The id of the container where the table will be appended.
     * @param {Object} chartOptions - Default options for the CustomBarChart instances.
     */
    constructor(colNameList, rowNameList, containerId, chartOptions) {
        this.colNameList = colNameList;
        this.rowNameList = rowNameList;
        this.containerId = containerId;
        this.chartOptions = chartOptions;
        this.charts = {}; // Stores references to the CustomBarChart instances
        this.generateTable();
    }

    /**
     * Generates the table and initializes bar charts in each cell.
     */
    generateTable() {
        const container = document.getElementById(this.containerId);
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Create the header row
        const emptyHeaderCell = document.createElement('th');
        headerRow.appendChild(emptyHeaderCell);

        for (const colName of this.colNameList) {
            const th = document.createElement('th');
            th.textContent = colName;
            headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Create the rows with bar charts in each cell
        for (const rowName of this.rowNameList) {
            const row = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = rowName;
            row.appendChild(th);

            for (const colName of this.colNameList) {
                const td = document.createElement('td');
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';

                const chartContainer = document.createElement('div');
                chartContainer.style.width = `${this.chartOptions.width}px`;
                chartContainer.style.height = `${this.chartOptions.height}px`;

                td.appendChild(chartContainer);
                row.appendChild(td);

                // Initialize a CustomBarChart in each cell
                const chart = new CustomBarChart({
                    container: chartContainer,
                    ...this.chartOptions,
                    bars: this.chartOptions.bars || [] // Default bars if not provided
                });

                // Store the chart instance
                if (!this.charts[rowName]) this.charts[rowName] = {};
                this.charts[rowName][colName] = chart;
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        container.appendChild(table);
    }

    /**
     * Updates the data of a specific bar chart in the table.
     * @param {String} colName - The column name associated with the chart.
     * @param {String} rowName - The row name associated with the chart.
     * @param {Array} newBars - The new array of bars to update the chart with.
     * @param {Array} newOptions - The new array of options to update the chart with.
     */
    updateChart(colName, rowName, newBars, newOptions) {
        if (this.charts[rowName] && this.charts[rowName][colName]) {
            const chart = this.charts[rowName][colName];
            chart.updateBars(newBars);
            chart.updateOptions(newOptions);
        } else {
            console.error(`Chart with column ${colName} and row ${rowName} not found.`);
        }
    }

    /**
     * Retrieves the data of a specific bar chart in the table.
     * @param {String} colName - The column name associated with the chart.
     * @param {String} rowName - The row name associated with the chart.
     * @returns {Array|null} - The data array of the chart, or null if not found.
     */
    getChartData(colName, rowName) {
        if (this.charts[rowName] && this.charts[rowName][colName]) {
            return this.charts[rowName][colName].bars;
        } else {
            console.error(`Chart with column ${colName} and row ${rowName} not found.`);
            return null;
        }
    }
}

// Attach the CustomBarChartTable class to the window object to make it globally accessible
window.CustomBarChartTable = CustomBarChartTable;
