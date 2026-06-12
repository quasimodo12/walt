class CustomBarChart {
    constructor(options) {
        this.container = options.container; // DOM element to render the chart
        this.width = options.width || 400;
        this.height = options.height || 300;
        this.barWidth = options.barWidth || 50;
        this.bars = options.bars || [];
        this.yAxisTicks = options.yAxisTicks || 5;
        this.yAxisMax = options.yAxisMax || null; // If not provided, calculate from bar values
        this.yAxisLabel = options.yAxisLabel || '';
        this.showBarLabels = options.showBarLabels !== false; // Default is true, user can set to false
        this.showBorder = options.showBorder || false; // Existing option for showing border
        this.showModalLegend = options.showModalLegend !== false; // New option for showing modal legend (default true)
        this.modalTitle = options.modalTitle || 'Bar Chart'; // New option for modal title (default 'Bar Chart')
        this.svg = null;
        this.initChart();
    }

    initChart() {
        // Clear existing content
        this.container.innerHTML = '';

        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', this.width);
        this.svg.setAttribute('height', this.height);
        this.container.appendChild(this.svg);

        // Draw border if option is set
        if (this.showBorder) {
            this.drawBorder();
        }

        // Calculate max value for y-axis if not provided
        if (this.yAxisMax === null) {
            this.yAxisMax = Math.max(...this.bars.map(bar => bar.barValue)) * 1.1; // 10% padding
        }

        // Draw y-axis and bars
        this.drawYAxis();
        this.drawBars();

        // Add click event listener to open modal with Chart.js chart
        this.svg.addEventListener('click', () => this.openChartModal());
    }

    drawBorder() {
        const axisPadding = 40;
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', axisPadding);
        borderRect.setAttribute('y', axisPadding);
        borderRect.setAttribute('width', this.width - axisPadding * 2);
        borderRect.setAttribute('height', this.height - axisPadding * 2);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', 'black');
        this.svg.appendChild(borderRect);
    }

    drawYAxis() {
        const axisPadding = 40;
        const yAxisHeight = this.height - axisPadding * 2;
        const tickSpacing = yAxisHeight / this.yAxisTicks;

        // Y-axis line
        const yAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxisLine.setAttribute('x1', axisPadding);
        yAxisLine.setAttribute('y1', axisPadding);
        yAxisLine.setAttribute('x2', axisPadding);
        yAxisLine.setAttribute('y2', this.height - axisPadding);
        yAxisLine.setAttribute('stroke', 'black');
        this.svg.appendChild(yAxisLine);

        // Y-axis ticks and labels
        for (let i = 0; i <= this.yAxisTicks; i++) {
            const y = this.height - axisPadding - i * tickSpacing;
            const value = (this.yAxisMax / this.yAxisTicks) * i;

            // Tick
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', axisPadding - 5);
            tick.setAttribute('y1', y);
            tick.setAttribute('x2', axisPadding);
            tick.setAttribute('y2', y);
            tick.setAttribute('stroke', 'black');
            this.svg.appendChild(tick);

            // Label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', axisPadding - 10);
            label.setAttribute('y', y + 4); // Adjust for text height
            label.setAttribute('text-anchor', 'end');
            label.textContent = Math.round(value);
            this.svg.appendChild(label);
        }

        // Y-axis label (optional)
        if (this.yAxisLabel) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('transform', `translate(${axisPadding - 30}, ${this.height / 2}) rotate(-90)`);
            label.setAttribute('text-anchor', 'middle');
            label.textContent = this.yAxisLabel;
            this.svg.appendChild(label);
        }
    }

    drawBars() {
        const axisPadding = 40;
        const yAxisHeight = this.height - axisPadding * 2;
        const barX = axisPadding + 20; // Position the bar slightly to the right of the y-axis

        // Sort bars by priority (ascending order)
        const sortedBars = [...this.bars].sort((a, b) => a.barPriority - b.barPriority);

        // Array to track drawn bar values for overlap detection
        const drawnBarValues = [];

        // Draw each bar
        for (let bar of sortedBars) {
            const barHeight = (bar.barValue / this.yAxisMax) * yAxisHeight;
            const y = this.height - axisPadding - barHeight;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', barX);
            rect.setAttribute('y', y);
            rect.setAttribute('width', this.barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', bar.barColor);
            rect.setAttribute('stroke', 'black');
            this.svg.appendChild(rect);

            // Bar label (optional, only if showBarLabels is true)
            if (this.showBarLabels) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', barX + this.barWidth / 2);
                label.setAttribute('y', y - 5); // Above the bar
                label.setAttribute('text-anchor', 'middle');
                label.textContent = bar.barLabel;
                this.svg.appendChild(label);
            }

            // Check overlap condition (±5 but not exactly equal)
            const isOverlapping = drawnBarValues.some(value => Math.abs(value - bar.barValue) <= 5 && value !== bar.barValue);

            if (isOverlapping) {
                // Horizontal line and label
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const valueX = barX + this.barWidth + 10; // Horizontal line end point
                const valueY = y; // Same y position as bar top
                line.setAttribute('x1', barX + this.barWidth); // Start at the right edge of the bar
                line.setAttribute('y1', y);
                line.setAttribute('x2', valueX); // Horizontal to the right
                line.setAttribute('y2', valueY);
                line.setAttribute('stroke', 'black');
                this.svg.appendChild(line);

                const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueLabel.setAttribute('x', valueX + 5); // Slightly to the right of the line's endpoint
                valueLabel.setAttribute('y', valueY + 4); // Align with the line's endpoint
                valueLabel.setAttribute('text-anchor', 'start');
                valueLabel.textContent = bar.barValue;
                this.svg.appendChild(valueLabel);
            } else {
                // Diagonal line and label
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const valueX = barX + this.barWidth + 20; // To the right of the bar
                const valueY = y - 15; // Above the bar's top
                line.setAttribute('x1', barX + this.barWidth); // Start at the right edge of the bar
                line.setAttribute('y1', y);
                line.setAttribute('x2', valueX); // To the right and above
                line.setAttribute('y2', valueY);
                line.setAttribute('stroke', 'black');
                this.svg.appendChild(line);

                const valueLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueLabel.setAttribute('x', valueX + 5); // Slightly to the right of the line's endpoint
                valueLabel.setAttribute('y', valueY + 4); // Align with the line's endpoint
                valueLabel.setAttribute('text-anchor', 'start');
                valueLabel.textContent = bar.barValue;
                this.svg.appendChild(valueLabel);
            }

            // Add current bar value to the list of drawn values
            drawnBarValues.push(bar.barValue);
        }
    }

    // Get the nearest multiple of target for a given number
    getNearestMultipleOfTarget(numValue, target) {
        if (typeof numValue !== 'number' || isNaN(numValue)) {
            throw new TypeError('Input must be a valid number');
        }
        return Math.ceil(numValue / target) * target;
    }

    openChartModal() {
        // Create modal container
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000'; // Ensure the modal is on top

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.style.backgroundColor = '#fff';
        chartContainer.style.padding = '20px';
        chartContainer.style.borderRadius = '10px';
        chartContainer.style.width = '600px';
        chartContainer.style.height = '450'; // Increased height to accommodate legend and input box
        chartContainer.style.position = 'relative'; // Ensure positioning context for the close button
        chartContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#f44336';
        closeButton.style.color = '#fff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => modal.remove());
        chartContainer.appendChild(closeButton);

        // Add canvas for Chart.js
        const canvas = document.createElement('canvas');
        canvas.width = 450; // Adjust as needed
        canvas.height = 400; // Adjust as needed
        chartContainer.appendChild(canvas);

        // Prepare data for the chart
        const barData = this.bars.map(bar => bar.barValue);
        const barColors = this.bars.map(bar => bar.barColor);
        const barLabels = this.bars.map(bar => bar.barLabel);

        // Calculate the maximum value in the data
        const maxDataValue = Math.max(...barData);

        // Use the provided function to set the y-axis maximum value
        var yAxisMaxVal = this.getNearestMultipleOfTarget(maxDataValue, 50);

        // Render Chart.js chart
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: 'Bar Values',
                    data: barData,
                    backgroundColor: barColors,
                    barThickness: 70, // Make bars thinner
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false, // Toggle legend display based on the new option
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    title: {
                        display: true, // Display title
                        text: this.modalTitle,
                        font: {
                            size: 24 // Set font size for the title
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yAxisMaxVal, // Set the maximum y-axis value
                        ticks: {
                            font: {
                                size: 14 // Set font size for y-axis labels
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 16 // Set font size for x-axis labels
                            }
                        }
                    }
                }
            }
        });

        // Conditionally create and append the custom legend if showModalLegend is false
        if (this.showModalLegend) {
            // Create custom legend container
            const legendContainer = document.createElement('div');
            legendContainer.style.display = 'flex';
            legendContainer.style.flexWrap = 'wrap';
            legendContainer.style.marginTop = '20px';
            legendContainer.style.justifyContent = 'center';

            // Iterate through bar labels and colors to create legend items
            barLabels.forEach((label, index) => {
                const legendItem = document.createElement('div');
                legendItem.style.display = 'flex';
                legendItem.style.alignItems = 'center';
                legendItem.style.marginRight = '15px';
                legendItem.style.marginBottom = '10px';

                // Create color box
                const colorBox = document.createElement('span');
                colorBox.style.display = 'inline-block';
                colorBox.style.width = '12px';
                colorBox.style.height = '12px';
                colorBox.style.backgroundColor = barColors[index];
                colorBox.style.marginRight = '5px';
                colorBox.style.border = '1px solid #000';

                // Create label text
                const labelText = document.createElement('span');
                labelText.textContent = label;
                labelText.style.fontSize = '14px';
                labelText.style.color = '#333';

                // Append color box and label to legend item
                legendItem.appendChild(colorBox);
                legendItem.appendChild(labelText);

                // Append legend item to legend container
                legendContainer.appendChild(legendItem);
            });

            // Append the custom legend to the chart container
            chartContainer.appendChild(legendContainer);
        }

        // Append chart container to modal and modal to body
        modal.appendChild(chartContainer);
        document.body.appendChild(modal);
    }

    // Method to update the chart with new options
    updateOptions(newOptions) {
        // Update the options provided by the user
        if (newOptions.width !== undefined) this.width = newOptions.width;
        if (newOptions.height !== undefined) this.height = newOptions.height;
        if (newOptions.barWidth !== undefined) this.barWidth = newOptions.barWidth;
        if (newOptions.yAxisTicks !== undefined) this.yAxisTicks = newOptions.yAxisTicks;
        if (newOptions.yAxisMax !== undefined) this.yAxisMax = newOptions.yAxisMax;
        if (newOptions.yAxisLabel !== undefined) this.yAxisLabel = newOptions.yAxisLabel;
        if (newOptions.showBarLabels !== undefined) this.showBarLabels = newOptions.showBarLabels;
        if (newOptions.showBorder !== undefined) this.showBorder = newOptions.showBorder;
        if (newOptions.showModalLegend !== undefined) this.showModalLegend = newOptions.showModalLegend;
        if (newOptions.modalTitle !== undefined) this.modalTitle = newOptions.modalTitle; // Update modalTitle

        // Reinitialize the chart
        this.initChart();
    }

    // Method to update the chart with new bars
    updateBars(newBars) {
        this.bars = newBars;
        this.initChart();
    }
}
