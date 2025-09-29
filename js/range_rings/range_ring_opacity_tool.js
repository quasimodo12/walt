// range_ring_opacity_tool.js
var RangeRingOpacityTool = (function() {
  var TOOL_ID = 'range-ring-opacity';
  var dialogInstance = null;
  var inputElement = null;

  function registerTool() {
    MapToolsMenu.registerTool({
      id: TOOL_ID,
      label: 'Set range ring opacity',
      iconClass: 'map-tools__tool-icon--range-ring-opacity',
      content: '\u03B1',
      onClick: function() {
        openDialog();
      }
    });
  }

  function ensureDialog() {
    if (dialogInstance) {
      return;
    }

    var dialogContent = [
      '<div class="range-ring-opacity-dialog" title="Range Ring Opacity">',
      '  <form>',
      '    <label for="rangeRingOpacityInput">Opacity (0 - 1):</label>',
      '    <input type="number" id="rangeRingOpacityInput" name="rangeRingOpacityInput" min="0" max="1" step="0.05" class="range-ring-opacity-dialog__input" />',
      '    <p class="range-ring-opacity-dialog__hint">All current and future range rings will use this opacity.</p>',
      '  </form>',
      '</div>'
    ].join('');

    dialogInstance = $(dialogContent).dialog({
      autoOpen: false,
      modal: true,
      buttons: {
        'Save': function() {
          var value = parseFloat(inputElement.val());
          if (!isFinite(value)) {
            alert('Please enter a numeric opacity value between 0 and 1.');
            return;
          }

          if (value < 0 || value > 1) {
            alert('Opacity must be between 0 and 1.');
            return;
          }

          RangeRingLogic.setRangeRingOpacity(value);
          $(this).dialog('close');
        },
        'Cancel': function() {
          $(this).dialog('close');
        }
      },
      width: 360
    });

    inputElement = dialogInstance.find('#rangeRingOpacityInput');
  }

  function openDialog() {
    ensureDialog();
    var currentOpacity = RangeRingLogic.getRangeRingOpacity();
    inputElement.val(currentOpacity.toFixed(2));
    dialogInstance.dialog('open');
  }

  registerTool();

  return {
    openDialog: openDialog
  };
})();
