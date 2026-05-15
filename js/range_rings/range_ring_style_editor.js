var RangeRingStyleEditor = (function() {
  var MAX_TEMPLATE_NAME_LENGTH = 40;
  var MIN_LINE_WIDTH = 1;
  var MAX_LINE_WIDTH = 30;
  var MIN_OPACITY_PERCENT = 0;
  var MAX_OPACITY_PERCENT = 100;

  var templates = [];
  var selectedTemplateIndex = 0;
  var TEMPLATE_STORAGE_KEY = 'walt.rangeRingStyleTemplates';

  function initTemplates() {
    var incoming = loadStoredTemplates();

    if (!incoming.length) {
      incoming = Array.isArray(window.range_ring_style_templates)
        ? window.range_ring_style_templates
        : [];
    }

    templates = incoming.map(function(template) {
      return normalizeTemplate(template);
    }).filter(Boolean);

    if (!templates.length) {
      templates = [
        { name: 'Default', color: '#808080', lineWidth: 2, opacity: 0.3 }
      ];
    }
  }

  function normalizeTemplate(template) {
    if (!template || !template.name) {
      return null;
    }

    var lineWidth = parseFloat(template.lineWidth);
    var opacity = parseFloat(template.opacity);

    return {
      name: String(template.name).trim().slice(0, MAX_TEMPLATE_NAME_LENGTH),
      color: normalizeColor(template.color),
      lineWidth: isFinite(lineWidth) ? clamp(lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH) : 2,
      opacity: isFinite(opacity) ? clamp(opacity, 0, 1) : 0.3
    };
  }

  function normalizeColor(color) {
    return (typeof color === 'string' && color.trim()) ? color.trim() : '#808080';
  }

  function createEditStyleDialog() {
    initTemplates();

    var content = `
      <div class="range-ring-style-editor">
        <h3 class="rr-style-title">Edit Range Ring Style</h3>
        <div class="rr-style-body">
          <div class="rr-style-left">
            <label for="rrTemplateSelect">Select a template:</label>
            <div class="rr-template-select-row">
              <select id="rrTemplateSelect"></select>
              <button id="rrCopyTemplatesButton" title="Copy templates" aria-label="Copy templates">📋</button>
            </div>

            <div class="rr-style-field-row">
              <label for="rrTemplateName">Template Name:</label>
              <input id="rrTemplateName" type="text" maxlength="${MAX_TEMPLATE_NAME_LENGTH}" placeholder="Template name">
            </div>
            <div class="rr-style-field-row">
              <label for="rrTemplateColor">Color:</label>
              <input id="rrTemplateColor" type="color" value="#808080">
            </div>
            <div class="rr-style-field-row">
              <label for="rrTemplateLineWidth">Line Width:</label>
              <input id="rrTemplateLineWidth" type="number" min="${MIN_LINE_WIDTH}" max="${MAX_LINE_WIDTH}" step="0.5">
            </div>
            <div class="rr-style-field-row">
              <label for="rrTemplateOpacity">Opacity (%):</label>
              <input id="rrTemplateOpacity" type="number" min="${MIN_OPACITY_PERCENT}" max="${MAX_OPACITY_PERCENT}" step="1">
            </div>
            <button id="rrAddTemplateButton" class="rr-add-template-button">Add Template</button>
          </div>
          <div class="rr-style-right">
            <div class="rr-preview-box">
              <canvas id="rrPreviewCanvas" width="240" height="240"></canvas>
            </div>
          </div>
        </div>
        <div class="rr-style-footer">
          <button id="rrApplyTemplateButton">Apply Current Template</button>
        </div>
      </div>
    `;

    $('#rangeRingStyleContent').html(content);
    $('#rangeRingStyleDialog').dialog('open');

    bindEvents();
    renderTemplateSelect();
    loadTemplateIntoInputs(selectedTemplateIndex);
  }

  function bindEvents() {
    $('#rrTemplateSelect').on('change', function() {
      selectedTemplateIndex = parseInt($(this).val(), 10) || 0;
      loadTemplateIntoInputs(selectedTemplateIndex);
    });

    $('#rrAddTemplateButton').on('click', function() {
      var template = readTemplateFromInputs();
      if (!template) {
        return;
      }
      if (hasDuplicateTemplateName(template.name)) {
        alert('A template with this name already exists. Please choose a unique name.');
        return;
      }

      templates.push(template);
      selectedTemplateIndex = templates.length - 1;
      persistTemplates();
      renderTemplateSelect();
      loadTemplateIntoInputs(selectedTemplateIndex);
    });

    $('#rrTemplateColor, #rrTemplateLineWidth, #rrTemplateOpacity').on('input change', function() {
      renderPreview(readTemplateFromInputs(true));
    });

    $('#rrCopyTemplatesButton').on('click', copyTemplatesToClipboard);

    $('#rrApplyTemplateButton').on('click', function() {
      var template = readTemplateFromInputs() || templates[selectedTemplateIndex];
      if (!template) {
        return;
      }
      if (hasDuplicateTemplateName(template.name, selectedTemplateIndex)) {
        alert('A template with this name already exists. Please choose a unique name.');
        return;
      }

      templates[selectedTemplateIndex] = template;
      persistTemplates();
      RangeRingLogic.applyStyleToToggledRangeRings(template);
      $('#rangeRingStyleDialog').dialog('close');
      $('#rangeRingInfoDialog').dialog('close');
    });
  }

  function readTemplateFromInputs(allowPartial) {
    var name = String($('#rrTemplateName').val() || '').trim();
    var color = normalizeColor($('#rrTemplateColor').val());
    var lineWidth = parseFloat($('#rrTemplateLineWidth').val());
    var opacityPercent = parseFloat($('#rrTemplateOpacity').val());

    if (!allowPartial && !name) {
      alert('Template name is required.');
      return null;
    }

    lineWidth = isFinite(lineWidth) ? clamp(lineWidth, MIN_LINE_WIDTH, MAX_LINE_WIDTH) : 2;
    opacityPercent = isFinite(opacityPercent) ? clamp(opacityPercent, MIN_OPACITY_PERCENT, MAX_OPACITY_PERCENT) : 30;

    return {
      name: name || 'Unsaved Template',
      color: color,
      lineWidth: lineWidth,
      opacity: opacityPercent / 100
    };
  }

  function renderTemplateSelect() {
    var select = $('#rrTemplateSelect');
    select.empty();

    templates.forEach(function(template, index) {
      select.append(`<option value="${index}">${template.name}</option>`);
    });
    select.val(String(selectedTemplateIndex));
  }

  function loadTemplateIntoInputs(index) {
    var template = templates[index] || templates[0];
    if (!template) { return; }

    $('#rrTemplateName').val(template.name);
    $('#rrTemplateColor').val(template.color);
    $('#rrTemplateLineWidth').val(template.lineWidth);
    $('#rrTemplateOpacity').val(Math.round(template.opacity * 100));

    renderPreview(template);
  }

  function renderPreview(template) {
    if (!template) { return; }
    var canvas = document.getElementById('rrPreviewCanvas');
    if (!canvas) { return; }

    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    var radius = Math.min(width, height) * 0.32;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = template.color;
    ctx.lineWidth = template.lineWidth;
    ctx.globalAlpha = clamp(template.opacity, 0, 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }


  function loadStoredTemplates() {
    if (!window.localStorage) {
      return [];
    }

    try {
      var rawValue = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (!rawValue) {
        return [];
      }

      var parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('range_ring_style_editor.js: failed to load stored templates', error);
      return [];
    }
  }

  function persistTemplates() {
    window.range_ring_style_templates = templates.map(function(template) {
      return Object.assign({}, template);
    });

    if (!window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(window.range_ring_style_templates));
    } catch (error) {
      console.warn('range_ring_style_editor.js: failed to persist templates', error);
    }
  }

  function hasDuplicateTemplateName(name, ignoreIndex) {
    var normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) {
      return false;
    }

    return templates.some(function(template, index) {
      if (index === ignoreIndex) {
        return false;
      }
      return String(template.name || '').trim().toLowerCase() === normalizedName;
    });
  }

  function copyTemplatesToClipboard() {
    var structure = 'var range_ring_style_templates = ' + JSON.stringify(templates, null, 2) + ';\n';
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      alert('Clipboard API is not available in this browser.');
      return;
    }

    navigator.clipboard.writeText(structure)
      .then(function() {
        alert('Templates copied to clipboard.');
      })
      .catch(function() {
        alert('Unable to copy templates.');
      });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return {
    createEditStyleDialog: createEditStyleDialog
  };
})();
