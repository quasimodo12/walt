
function createLegend(divId, legendType, side) {
    var container = document.getElementById(divId);

    // Clear the container in case it already has content
    container.innerHTML = '';

    var table = document.createElement('table');
    table.style.width = '100%'; // Set table width to 100%
    table.style.borderCollapse = 'collapse';

    // Create table header
    var header = table.createTHead();
    var headerRow = header.insertRow(0);
    var headerCell = document.createElement('th');
    headerCell.colSpan = 2; // Spans two columns
    headerCell.style.textAlign = 'center';
    headerCell.style.fontWeight = 'bold';
    headerCell.style.fontSize = '20px'; // Large font size
    headerCell.innerText = 'Legend';
    headerRow.appendChild(headerCell);

    // Create table body
    var tbody = document.createElement('tbody');

    // Side-color-choice
    var enemySideText = ''; 
    var enemySideColor = '';
    if (side === 'blue') {
        enemySideText = 'Red';
        enemySideColor = '#4d94ff';
    }
    else {
        enemySideText = 'Blue'
        enemySideColor = '#ff944d';
    }

    if (legendType === 'Pie') {
        // Row 1: 'Side' Circle | "Percent of Platforms in WEZ"
        var row1 = tbody.insertRow();

        var cell1 = row1.insertCell();
        var sideCircle = document.createElement('div');
        sideCircle.style.width = '20px';
        sideCircle.style.height = '20px';
        sideCircle.style.borderRadius = '50%';
        sideCircle.style.backgroundColor = enemySideColor;
        sideCircle.style.margin = '0 auto'; // Center in cell
        cell1.appendChild(sideCircle);

        var cell2 = row1.insertCell();
        cell2.innerText = ` Percent of ${enemySideText} Platforms in WEZ`;

        // Row 2: Grey Circle | "Percent of Platforms outside of WEZ"
        var row2 = tbody.insertRow();

        var cell3 = row2.insertCell();
        var greyCircle = document.createElement('div');
        greyCircle.style.width = '20px';
        greyCircle.style.height = '20px';
        greyCircle.style.borderRadius = '50%';
        greyCircle.style.backgroundColor = '#d9d9d9';
        greyCircle.style.margin = '0 auto';
        cell3.appendChild(greyCircle);

        var cell4 = row2.insertCell();

        row1.classList.add('legend-row');
        row2.classList.add('legend-row');

        cell4.innerText = ` Percent of ${enemySideText} Platforms outside of WEZ`;
    } else if (legendType === 'Loadout') {
        // Row 1: Grey Bar | "Number of Red Platforms in the Group"
        var row1 = tbody.insertRow();

        var cell1 = row1.insertCell();
        var greyBar = document.createElement('div');
        greyBar.style.width = '30px';
        greyBar.style.height = '10px';
        greyBar.style.backgroundColor = '#a6a6a6';
        greyBar.style.margin = '0 auto';
        cell1.appendChild(greyBar);

        var cell2 = row1.insertCell();
        cell2.innerText = `Number of ${enemySideText} Platforms in the Group`;

        // Row 2: 'enemySide' Bar | "Number of Red Platforms in the WEZ"
        var row2 = tbody.insertRow();

        var cell3 = row2.insertCell();
        var enemySide = document.createElement('div');
        enemySide.style.width = '30px';
        enemySide.style.height = '10px';
        enemySide.style.backgroundColor = enemySideColor;
        enemySide.style.margin = '0 auto';
        cell3.appendChild(enemySide);

        var cell4 = row2.insertCell();
        cell4.innerText = `Number of ${enemySideText} Platforms in the WEZ`;

        // Row 3: Yellow Bar | "Quantity of Available Weapons"
        var row3 = tbody.insertRow();

        var cell5 = row3.insertCell();
        var yellowBar = document.createElement('div');
        yellowBar.style.width = '30px';
        yellowBar.style.height = '10px';
        yellowBar.style.backgroundColor = '#ffff99';
        yellowBar.style.margin = '0 auto';
        cell5.appendChild(yellowBar);

        var cell6 = row3.insertCell();
        cell6.innerText = 'Quantity of Useable Weapons';
    } else {
        console.error('Invalid legend type:', legendType);
        return;
    }

    // Append tbody to table
    table.appendChild(tbody);

    // Append table to container
    container.appendChild(table);
}
