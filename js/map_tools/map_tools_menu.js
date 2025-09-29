// map_tools_menu.js
var MapToolsMenu = (function() {
    var state = {
        root: null,
        tray: null,
        toggleButton: null,
        toggleIcon: null,
        mapContainer: null,
        isOpen: false,
        tools: new Map(),
        itemHeight: 44,
        itemGap: 8
    };

    function init(options) {
        options = options || {};

        if (state.root) {
            return state.root;
        }

        state.mapContainer = resolveContainer(options);
        if (!state.mapContainer) {
            throw new Error('MapToolsMenu: unable to locate map container.');
        }

        state.itemHeight = options.itemHeight || state.itemHeight;
        state.itemGap = options.itemGap || state.itemGap;

        createMenu(options);
        return state.root;
    }

    function resolveContainer(options) {
        if (options.container) {
            return options.container;
        }
        if (options.map && options.map.getContainer) {
            return options.map.getContainer();
        }
        var containerId = options.containerId || 'map';
        return document.getElementById(containerId);
    }

    function createMenu(options) {
        state.root = document.createElement('div');
        state.root.className = 'map-tools';

        state.toggleButton = document.createElement('button');
        state.toggleButton.type = 'button';
        state.toggleButton.className = 'map-tools__toggle';
        state.toggleButton.setAttribute('aria-expanded', 'false');
        state.toggleButton.setAttribute('aria-label', options.toggleLabel || 'Toggle map tools');

        state.toggleIcon = document.createElement('span');
        state.toggleIcon.className = 'map-tools__toggle-icon';
        state.toggleIcon.setAttribute('aria-hidden', 'true');
        state.toggleIcon.textContent = '\u25BC';

        state.toggleButton.appendChild(state.toggleIcon);
        state.toggleButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            toggle();
        });

        state.tray = document.createElement('div');
        state.tray.className = 'map-tools__tray';
        state.tray.style.setProperty('--map-tools-gap', state.itemGap + 'px');

        state.root.appendChild(state.toggleButton);
        state.root.appendChild(state.tray);

        state.mapContainer.appendChild(state.root);

        if (options.tools && Array.isArray(options.tools)) {
            options.tools.forEach(registerTool);
        }
    }

    function toggle(forceState) {
        if (typeof forceState === 'boolean') {
            state.isOpen = forceState;
        } else {
            state.isOpen = !state.isOpen;
        }

        if (!state.root) {
            return;
        }

        if (state.isOpen) {
            state.root.classList.add('map-tools--open');
            state.toggleButton.setAttribute('aria-expanded', 'true');
            state.toggleIcon.textContent = '\u25B2';
        } else {
            state.root.classList.remove('map-tools--open');
            state.toggleButton.setAttribute('aria-expanded', 'false');
            state.toggleIcon.textContent = '\u25BC';
        }
    }

    function ensureInitialized() {
        if (!state.root) {
            init({});
        }
    }

    function registerTool(toolConfig) {
        ensureInitialized();

        if (!toolConfig || !toolConfig.id) {
            throw new Error('MapToolsMenu.registerTool requires a unique id.');
        }

        if (state.tools.has(toolConfig.id)) {
            throw new Error('MapToolsMenu: tool with id "' + toolConfig.id + '" already exists.');
        }

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'map-tools__tool';
        button.setAttribute('data-tool-id', toolConfig.id);
        button.setAttribute('aria-pressed', 'false');

        if (toolConfig.label) {
            button.setAttribute('aria-label', toolConfig.label);
            button.title = toolConfig.label;
        }

        var icon = document.createElement('span');
        icon.className = 'map-tools__tool-icon';
        if (toolConfig.iconClass) {
            icon.classList.add(toolConfig.iconClass);
        }
        if (toolConfig.iconUrl) {
            icon.style.backgroundImage = 'url(' + toolConfig.iconUrl + ')';
        }
        if (toolConfig.content) {
            icon.textContent = toolConfig.content;
        }
        button.appendChild(icon);

        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof toolConfig.onClick === 'function') {
                toolConfig.onClick(event, button);
            }
        });

        state.tray.appendChild(button);
        state.tools.set(toolConfig.id, {
            config: toolConfig,
            element: button
        });

        updateTraySize();
        return button;
    }

    function updateTraySize() {
        var count = state.tray.children.length;
        if (!count) {
            toggle(false);
        }
        var totalHeight = 0;
        if (count > 0) {
            totalHeight = (count * state.itemHeight) + ((count - 1) * state.itemGap);
        }
        state.tray.style.setProperty('--map-tools-tray-size', totalHeight + 'px');
    }

    function setToolActive(id, isActive) {
        var entry = state.tools.get(id);
        if (!entry) {
            return;
        }
        var active = !!isActive;
        entry.element.classList.toggle('map-tools__tool--active', active);
        entry.element.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    function getToolElement(id) {
        var entry = state.tools.get(id);
        return entry ? entry.element : null;
    }

    return {
        init: init,
        toggle: toggle,
        registerTool: registerTool,
        setToolActive: setToolActive,
        getToolElement: getToolElement
    };
})();
