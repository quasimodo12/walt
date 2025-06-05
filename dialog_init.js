$(function () {
    // Initialize Platform Info Dialog
    $("#platformInfoDialog").dialog({
      modal: true,
      autoOpen: false,
      draggable: true,
      resizable: true,
      width: 1000,
      position: { 
        my: "center",
        at: "center+0+150",
        of: window
      }
    });
  });

  $(function () {
    // Initialize Weapon Info Dialog
    $("#weaponInfoDialog").dialog({
      modal: true,
      autoOpen: false,
      draggable: true,
      resizable: true,
      width: 700,
      position: { 
        my: "center",
        at: "center+0+150",
        of: window
      }
    });
  });

  $(function () {
    // Initialize Sensor Info Dialog
    $("#sensorInfoDialog").dialog({
      modal: true,
      autoOpen: false,
      draggable: true,
      resizable: true,
      width: 700,
      position: { 
        my: "center",
        at: "center+0+150",
        of: window
      }
    });
  });

  $(function () {
    // Initialize Range Ring Info Dialog
    $("#rangeRingInfoDialog").dialog({
      modal: true,
      autoOpen: false,
      draggable: true,
      resizable: true,
      width: 770
    });
  });

  $(function () {
    // Initialize Create Platform Dialog
    $("#createPlatformDialog").dialog({
      modal: true,
      autoOpen: false,
      draggable: true,
      resizable: true,
      width: 400,
      position: { 
        my: "center",
        at: "center+0+150",
        of: window
      }
    });
  });