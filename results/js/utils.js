/* Utility helper functions used across results scripts */
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

function populateDropdown(selectElement, newOptions) {
    const currentOptions = Array.from(selectElement.options).map(opt => opt.value);
    if (!arraysEqual(currentOptions, newOptions)) {
        selectElement.innerHTML = '';
        newOptions.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = value;
            selectElement.add(option);
        });
    }
}

function getUniqueValues(data, key) {
    return Array.from(new Set(data.map(item => item[key])));
}

function getNearestMultipleOfTarget(numValue, target) {
    if (typeof numValue !== 'number' || isNaN(numValue)) {
        throw new TypeError('Input must be a valid number');
    }
    return Math.ceil(numValue / target) * target;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

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

function combineStringLists(list1, list2) {
    return Array.from(new Set([...list1, ...list2]));
}

function isArrayValid(arr) {
    return Array.isArray(arr) && arr.length > 0;
}
