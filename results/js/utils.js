/**
 * Utility helper functions used across the result scripts.
 *
 * The functions in this module handle common operations such as comparing
 * arrays, updating `<select>` elements, and simple string/number helpers.
 */

/**
 * Determine whether two arrays contain the same values in the same order.
 *
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {boolean}
 */
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

/**
 * Populate a HTML `<select>` element with new option values if those values
 * differ from the currently displayed ones.
 *
 * @param {HTMLSelectElement} selectElement
 * @param {string[]} newOptions
 */
function populateDropdown(selectElement, newOptions) {
    const normalized = (Array.isArray(newOptions) ? newOptions : []).map(option => {
        if (typeof option === 'string') {
            return { value: option, label: option };
        }
        if (option && typeof option === 'object') {
            const value = typeof option.value === 'string' && option.value
                ? option.value
                : (typeof option.id === 'string' ? option.id : '');
            if (!value) {
                return null;
            }
            const label = typeof option.label === 'string' && option.label
                ? option.label
                : (typeof option.text === 'string' && option.text ? option.text : value);
            return { value, label };
        }
        return null;
    }).filter(Boolean);

    const desiredValues = normalized.map(opt => opt.value);
    const currentOptions = Array.from(selectElement.options).map(opt => opt.value);

    if (!arraysEqual(currentOptions, desiredValues)) {
        selectElement.innerHTML = '';
        normalized.forEach(opt => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.text = opt.label;
            selectElement.add(optionElement);
        });
    } else {
        normalized.forEach((opt, index) => {
            const existingOption = selectElement.options[index];
            if (existingOption && existingOption.text !== opt.label) {
                existingOption.text = opt.label;
            }
        });
    }
}

/**
 * Return all unique values for a property from an array of objects.
 *
 * @param {Object[]} data
 * @param {string} key
 * @returns {Array}
 */
function getUniqueValues(data, key) {
    return Array.from(new Set(data.map(item => item[key])));
}

/**
 * Round `numValue` up to the nearest multiple of `target`.
 *
 * @param {number} numValue
 * @param {number} target
 * @returns {number}
 */
function getNearestMultipleOfTarget(numValue, target) {
    if (typeof numValue !== 'number' || isNaN(numValue)) {
        throw new TypeError('Input must be a valid number');
    }
    return Math.ceil(numValue / target) * target;
}

/**
 * Capitalize the first character of a string.
 *
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Gather all group and subgroup names for platforms belonging to a side.
 *
 * @param {Object[]} data - platform definitions
 * @param {string} side - side to filter on
 * @returns {string[]} unique list of groups/subgroups
 */
function getGroups(data, side) {
    const groupsSet = new Set();
    data
        .filter(item => item.side === side)
        .forEach(item => {
            groupsSet.add(item.group);
            if (item.subgroups) {
                item.subgroups.forEach(subgroup => groupsSet.add(subgroup));
            }
        });
    return Array.from(groupsSet);
}

/**
 * Merge two arrays of strings and remove duplicates.
 */
function combineStringLists(list1, list2) {
    return Array.from(new Set([...list1, ...list2]));
}

/**
 * Simple helper to test if an array exists and has length.
 */
function isArrayValid(arr) {
    return Array.isArray(arr) && arr.length > 0;
}
