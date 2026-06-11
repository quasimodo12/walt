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
    var ICON_COLOR_OPTIONS = {
        red_light: [255, 180, 180],
        red_soft: [255, 120, 120],
        red: [255, 0, 0],
        red_deep: [200, 0, 0],
        red_dark: [139, 0, 0],
        red_crimson: [220, 20, 60],
        red_burgundy: [128, 0, 32],
        red_maroon: [128, 0, 0],
        green_light: [170, 255, 170],
        green_soft: [100, 220, 100],
        green: [0, 170, 0],
        green_bright: [0, 255, 0],
        green_deep: [0, 120, 0],
        green_dark: [0, 100, 0],
        green_forest: [34, 139, 34],
        green_emerald: [0, 128, 96],
        green_mint: [152, 255, 152],
        green_olive: [107, 142, 35],
        blue_light: [180, 220, 255],
        blue_soft: [100, 170, 255],
        blue: [0, 102, 255],
        blue_bright: [0, 170, 255],
        blue_deep: [0, 70, 180],
        blue_dark: [0, 0, 139],
        blue_navy: [0, 0, 128],
        blue_royal: [65, 105, 225],
        blue_sky: [135, 206, 235],
        blue_cyan: [0, 255, 255],
        yellow_light: [255, 255, 200],
        yellow_soft: [255, 245, 120],
        yellow: [255, 204, 0],
        yellow_bright: [255, 255, 0],
        yellow_gold: [255, 180, 0],
        yellow_dark: [200, 160, 0],
        yellow_mustard: [204, 170, 0],
        yellow_amber: [255, 191, 0],
        orange_light: [255, 220, 180],
        orange_soft: [255, 180, 100],
        orange: [255, 128, 0],
        orange_bright: [255, 165, 0],
        orange_deep: [255, 90, 0],
        orange_dark: [204, 85, 0],
        orange_burnt: [191, 87, 0],
        orange_peach: [255, 200, 150],
        purple_light: [230, 200, 255],
        purple_soft: [190, 130, 255],
        purple: [153, 51, 255],
        purple_bright: [180, 0, 255],
        purple_deep: [110, 0, 180],
        purple_dark: [75, 0, 130],
        purple_violet: [138, 43, 226],
        purple_lavender: [230, 230, 250],
        purple_magenta: [255, 0, 255],
        pink_light: [255, 210, 230],
        pink_soft: [255, 150, 200],
        pink: [255, 105, 180],
        pink_bright: [255, 0, 170],
        pink_deep: [220, 20, 140],
        pink_dark: [180, 0, 100],
        teal_light: [160, 255, 240],
        teal_soft: [80, 220, 200],
        teal: [0, 128, 128],
        teal_deep: [0, 100, 100],
        teal_dark: [0, 70, 70],
        cyan_light: [180, 255, 255],
        cyan: [0, 255, 255],
        cyan_dark: [0, 160, 180],
        tan_light: [230, 210, 170],
        tan: [210, 180, 140],
        brown_light: [180, 120, 70],
        brown: [139, 69, 19],
        brown_dark: [90, 45, 10],
        white: [255, 255, 255],
        gray_very_light: [230, 230, 230],
        gray_light: [200, 200, 200],
        gray: [128, 128, 128],
        gray_dark: [80, 80, 80],
        gray_very_dark: [40, 40, 40],
        black: [0, 0, 0]
    };
    var dataTableInstance = null;
    var resizeTimer = null;
    var BASE_FONT_SIZE = 13;
    var BASE_HEADER_FONT_SIZE = 14;
    var BASE_PADDING = 10;
    var MIN_SCALE = 0.3;
    var SCALE_EPSILON = 0.005;
    var SCALE_ITERATIONS = 14;
    var columnDefinitions = [
        { title: "Name", data: "platform_name" },
        { title: "Side", data: "side" },
        { title: "Group", data: "group" },
        { title: "Category", data: "category" },
        { title: "Type", data: "type" },
        {
            title: "Subgroup",
            data: function(row) {
                return row.subgroups && row.subgroups.length > 0 ? row.subgroups[0] : "";
            }
        },
        {
            title: "Lat",
            data: function(row) {
                var latitude = parseFloat(row.latitude);
                return isNaN(latitude) ? "" : latitude.toFixed(3);
            }
        },
        {
            title: "Lon",
            data: function(row) {
                var longitude = parseFloat(row.longitude);
                return isNaN(longitude) ? "" : longitude.toFixed(3);
            }
        },
        { title: "Alt", data: "altitude" }
    ];

    function setColumnToggleMenuOpen(isOpen) {
        var $button = $('#columnToggleButton');
        var $menu = $('#columnToggleMenu');

        if (!$button.length || !$menu.length) {
            return;
        }

        if (isOpen) {
            $menu.addClass('is-open').attr('aria-hidden', 'false');
            $button.attr('aria-expanded', 'true');
        } else {
            $menu.removeClass('is-open').attr('aria-hidden', 'true');
            $button.attr('aria-expanded', 'false');
        }
    }

    function refreshColumnToggleMenuState() {
        if (!dataTableInstance) {
            return;
        }

        var $menu = $('#columnToggleMenu');
        if (!$menu.length) {
            return;
        }

        $menu.find('input[type="checkbox"]').each(function() {
            var $checkbox = $(this);
            var columnIndex = parseInt($checkbox.attr('data-column-index'), 10);

            if (isNaN(columnIndex)) {
                return;
            }

            var column = dataTableInstance.column(columnIndex);
            $checkbox.prop('checked', column.visible());
        });
    }

    function initializeColumnToggleMenu() {
        if (!dataTableInstance) {
            return;
        }

        var $button = $('#columnToggleButton');
        var $menu = $('#columnToggleMenu');

        if (!$button.length || !$menu.length) {
            return;
        }

        $menu.empty();

        columnDefinitions.forEach(function(columnDef, index) {
            if (index === 0) {
                return;
            }

            var columnId = 'column-toggle-' + index;
            var column = dataTableInstance.column(index);
            var $option = $('<label></label>', {
                'class': 'column-toggle-option',
                'for': columnId
            });

            var $checkbox = $('<input>', {
                type: 'checkbox',
                id: columnId,
                'data-column-index': index
            });

            $checkbox.prop('checked', column.visible());

            var $labelText = $('<span></span>').text(columnDef.title);

            $option.append($checkbox, $labelText);
            $menu.append($option);
        });

        $menu
            .off('change.columnToggle')
            .on('change.columnToggle', 'input[type="checkbox"]', function(event) {
                event.stopPropagation();

                var $checkbox = $(this);
                var columnIndex = parseInt($checkbox.attr('data-column-index'), 10);
                if (isNaN(columnIndex)) {
                    return;
                }

                var column = dataTableInstance.column(columnIndex);
                var shouldShow = $checkbox.is(':checked');
                column.visible(shouldShow);
                scheduleTableSizing();
                refreshColumnToggleMenuState();
            })
            .off('click.columnToggle')
            .on('click.columnToggle', function(event) {
                event.stopPropagation();
            });

        $button
            .off('click.columnToggle')
            .on('click.columnToggle', function(event) {
                event.preventDefault();
                event.stopPropagation();

                var isOpen = $('#columnToggleMenu').hasClass('is-open');
                setColumnToggleMenuOpen(!isOpen);
            });

        $(document)
            .off('click.columnToggle')
            .on('click.columnToggle', function(event) {
                if ($(event.target).closest('#columnToggleButton, #columnToggleMenu').length === 0) {
                    setColumnToggleMenuOpen(false);
                }
            })
            .off('keydown.columnToggle')
            .on('keydown.columnToggle', function(event) {
                if (event.key === 'Escape') {
                    setColumnToggleMenuOpen(false);
                }
            });

        refreshColumnToggleMenuState();
        setColumnToggleMenuOpen(false);
    }

    function setIconsMenuOpen(isOpen) {
        var $button = $('#iconsButton');
        var $menu = $('#iconsMenu');
        if (!$button.length || !$menu.length) {
            return;
        }

        if (isOpen) {
            $menu.addClass('is-open').attr('aria-hidden', 'false');
            $button.attr('aria-expanded', 'true');
        } else {
            $menu.removeClass('is-open').attr('aria-hidden', 'true');
            $button.attr('aria-expanded', 'false');
        }
    }

    function initializeIconsMenu() {
        var $button = $('#iconsButton');
        var $menu = $('#iconsMenu');
        if (!$button.length || !$menu.length || typeof SideConfig === 'undefined') {
            return;
        }

        $menu.empty();

        ['blue', 'red'].forEach(function(sideId) {
            var $section = $('<div></div>', { 'class': 'icon-color-section' });
            var $title = $('<div></div>', { 'class': 'icon-color-section-title' }).text(SideConfig.getLabelForSide(sideId));
            var $grid = $('<div></div>', { 'class': 'icon-color-grid', 'data-side-id': sideId });

            Object.keys(ICON_COLOR_OPTIONS).forEach(function(colorName) {
                var rgb = ICON_COLOR_OPTIONS[colorName];
                var iconFilenamePrefix = sideId === 'red' ? 'DMD_plat_' : 'plat_';
                var iconPath = 'images/colored-icons/surface-icons/' + iconFilenamePrefix + colorName + '.png';
                var $swatch = $('<button></button>', {
                    type: 'button',
                    'class': 'icon-color-swatch',
                    'data-side-id': sideId,
                    'data-color-name': colorName,
                    'data-icon-path': iconPath,
                    'aria-label': SideConfig.getLabelForSide(sideId) + ' icon color ' + colorName.replace(/_/g, ' ')
                });
                $swatch.css('background-color', 'rgb(' + rgb.join(',') + ')');

                if (SideConfig.getIconForSide(sideId) === iconPath) {
                    $swatch.addClass('is-selected');
                }
                $grid.append($swatch);
            });

            $section.append($title, $grid);
            $menu.append($section);
        });

        $menu
            .off('click.iconsMenu')
            .on('click.iconsMenu', function(event) {
                event.stopPropagation();
            })
            .off('click.iconChoice')
            .on('click.iconChoice', '.icon-color-swatch', function(event) {
                event.preventDefault();
                event.stopPropagation();

                var $swatch = $(this);
                var sideId = $swatch.attr('data-side-id');
                var iconPath = $swatch.attr('data-icon-path');
                if (!SideConfig.setIconForSide(sideId, iconPath)) {
                    return;
                }

                $menu.find('.icon-color-grid[data-side-id="' + sideId + '"] .icon-color-swatch').removeClass('is-selected');
                $swatch.addClass('is-selected');

                if (typeof View !== 'undefined' && typeof View.refreshPlatformIcons === 'function') {
                    View.refreshPlatformIcons();
                }
            });

        $button
            .off('click.iconsMenu')
            .on('click.iconsMenu', function(event) {
                event.preventDefault();
                event.stopPropagation();
                var isOpen = $menu.hasClass('is-open');
                setColumnToggleMenuOpen(false);
                setIconsMenuOpen(!isOpen);
            });

        $(document)
            .off('click.iconsMenu')
            .on('click.iconsMenu', function(event) {
                if ($(event.target).closest('#iconsButton, #iconsMenu').length === 0) {
                    setIconsMenuOpen(false);
                }
            })
            .off('keydown.iconsMenu')
            .on('keydown.iconsMenu', function(event) {
                if (event.key === 'Escape') {
                    setIconsMenuOpen(false);
                }
            });

        setIconsMenuOpen(false);
    }

    function calculateTableHeight() {
        var $container = $('#platformTableContainer');
        if ($container.length === 0) {
            return 300;
        }

        var containerHeight = $container.height();
        var headerHeight = $container.find('.platform-table-header').outerHeight(true) || 0;
        var buttonHeight = $('#mainMenuButtonContainer').outerHeight(true) || 0;
        var controlsHeight = 0;

        var $wrapper = $container.find('.dataTables_wrapper');
        if ($wrapper.length) {
            $wrapper.children('.dataTables_filter, .dataTables_length, .dataTables_info, .dataTables_paginate').each(function() {
                controlsHeight += $(this).outerHeight(true) || 0;
            });
        }

        var availableHeight = containerHeight - headerHeight - buttonHeight - controlsHeight - 16;
        return Math.max(availableHeight, 200);
    }

    function setTableScale(scale) {
        var $container = $('#platformTableContainer');
        if (!$container.length) {
            return;
        }

        var fontSize = Math.max(8, Math.round(BASE_FONT_SIZE * scale * 10) / 10);
        var headerFontSize = Math.max(fontSize + 1, Math.round(BASE_HEADER_FONT_SIZE * scale * 10) / 10);
        var padding = Math.max(4, Math.round(BASE_PADDING * scale));
        var lineHeight = Math.max(1.1, (1.2 + (scale * 0.4)).toFixed(2));

        $container.css({
            '--table-font-size': fontSize + 'px',
            '--table-header-font-size': headerFontSize + 'px',
            '--table-cell-padding': padding + 'px',
            '--table-line-height': lineHeight
        });
    }

    function detectWrapping($tables) {
        if (typeof window === 'undefined') {
            return false;
        }

        var hasWrapping = false;

        $tables.each(function() {
            if (hasWrapping) {
                return false;
            }

            var cells = this.querySelectorAll('thead th, tbody td, tbody th');
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if (!cell) {
                    continue;
                }

                var scrollWidth = cell.scrollWidth;
                var clientWidth = cell.clientWidth;
                if (scrollWidth - clientWidth > 1) {
                    hasWrapping = true;
                    break;
                }

                var computed = window.getComputedStyle(cell);
                if (!computed) {
                    continue;
                }

                var lineHeight = parseFloat(computed.lineHeight);
                if (isNaN(lineHeight)) {
                    lineHeight = parseFloat(computed.fontSize) * 1.2;
                }

                var paddingTop = parseFloat(computed.paddingTop) || 0;
                var paddingBottom = parseFloat(computed.paddingBottom) || 0;
                var expectedHeight = lineHeight + paddingTop + paddingBottom;
                if (cell.scrollHeight - expectedHeight > 1.5) {
                    hasWrapping = true;
                    break;
                }
            }
        });

        return hasWrapping;
    }

    function measureTableWidths() {
        var $container = $('#platformTableContainer');
        var $scrollBody = $container.find('.dataTables_scrollBody');
        var $tables = $container.find('.dataTables_scrollBody table.dataTable, .dataTables_scrollHead table.dataTable');
        var $table = $scrollBody.find('table.dataTable').first();

        if (!$scrollBody.length || !$table.length) {
            return null;
        }

        var containerWidth = $scrollBody.innerWidth();
        var tableWidth = Math.max(
            $table[0].scrollWidth,
            $scrollBody.length ? $scrollBody[0].scrollWidth : 0
        );

        return {
            containerWidth: containerWidth,
            tableWidth: tableWidth,
            hasWrapping: detectWrapping($tables)
        };
    }

    function applyTableScale() {
        if (!dataTableInstance) {
            return;
        }

        setTableScale(1);
        dataTableInstance.columns.adjust();

        var measurements = measureTableWidths();
        if (!measurements || !measurements.containerWidth) {
            return;
        }

        if (measurements.tableWidth <= measurements.containerWidth && !measurements.hasWrapping) {
            dataTableInstance.columns.adjust();
            return;
        }

        var lower = MIN_SCALE;
        var upper = 1;
        var bestScale = null;
        var iterations = 0;

        while (upper - lower > SCALE_EPSILON && iterations < SCALE_ITERATIONS) {
            var mid = (lower + upper) / 2;
            setTableScale(mid);
            dataTableInstance.columns.adjust();
            measurements = measureTableWidths();

            if (!measurements) {
                break;
            }

            if ((measurements.tableWidth > measurements.containerWidth || measurements.hasWrapping) && mid > MIN_SCALE) {
                upper = mid;
            } else {
                bestScale = mid;
                lower = mid;
            }

            iterations++;
        }

        if (bestScale === null) {
            bestScale = MIN_SCALE;
        }

        setTableScale(Math.max(MIN_SCALE, Math.min(1, bestScale)));
        dataTableInstance.columns.adjust();

        measurements = measureTableWidths();
        if (measurements && (measurements.tableWidth > measurements.containerWidth || measurements.hasWrapping)) {
            setTableScale(MIN_SCALE);
            dataTableInstance.columns.adjust();
        }
    }

    function applyTableSizing() {
        if (!dataTableInstance) {
            return;
        }

        var newHeight = calculateTableHeight();
        var heightValue = newHeight + 'px';
        var settings = dataTableInstance.settings()[0];

        if (settings.oScroll) {
            settings.oScroll.sY = heightValue;
        }

        var $scrollBody = $(dataTableInstance.table().container()).find('.dataTables_scrollBody');
        if ($scrollBody.length) {
            $scrollBody.css({
                'max-height': heightValue,
                'height': heightValue
            });
        }

        dataTableInstance.columns.adjust();
        applyTableScale();
    }

    function scheduleTableSizing() {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            window.requestAnimationFrame(applyTableSizing);
        } else {
            setTimeout(applyTableSizing, 0);
        }
    }

    function registerResizeHandler() {
        $(window).off('resize.tableController').on('resize.tableController', function() {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }

            resizeTimer = setTimeout(function() {
                scheduleTableSizing();
            }, 100);
        });
    }

    function init() {
        var tableData = PlatformModel.getPlatformData();

        // Initialize table with DataTables library
        dataTableInstance = $('#platformTable').DataTable({
            data: tableData,
            columns: columnDefinitions,
            scrollY: calculateTableHeight(),
            scrollCollapse: true,
            paging: false,
            deferRender: true
        });

        initializeColumnToggleMenu();
        initializeIconsMenu();

        registerResizeHandler();

        dataTableInstance.on('draw', function() {
            scheduleTableSizing();
        });

        scheduleTableSizing();

        // Handle double-click on table rows
        $('#platformTable tbody').on('dblclick', 'tr', function() {
            var rowData = dataTableInstance.row(this).data();
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
                var rowData = dataTableInstance.row(this).data();
                var platform = PlatformModel.getPlatformData().find(function(p) {
                    return p.platform_name === rowData.platform_name;
                });
                if (platform) {
                    View.addPlatformToSelected(platform.platform_name);
                }
            }
        });
    }

    // Function to redraw the table with the latest platform data
    function redrawTable() {
        if (!dataTableInstance) {
            return;
        }

        var platModel = PlatformModel.getPlatformData();      // platform data
        dataTableInstance.clear();                             // Clear existing data
        dataTableInstance.rows.add(platModel);                 // Add new data
        dataTableInstance.draw();                              // Redraw the table
        scheduleTableSizing();
        refreshColumnToggleMenuState();
    }

    return {
        init: init,
        redrawTable: redrawTable
    };
})();
