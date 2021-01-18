const jquery_ui = require('../../public/dist/js/jquery-ui-latest')
const jquery_ui_layout = require('../../public/dist/js/jquery.layout-latest');

$(() => {
    $('#editor-container').layout({
        closable: false,

        // Center Options
        size: 0.5,
        minSize: 0.25,
        maxSize: 0.75,
        livePaneResizing: true,
        liveContentResizing: true,

        // East Options
        east__size: 0.5,
        east__minSize: 0.25,
        east__maxSize: 0.75
    });

    $(".ui-layout-resizer-east").bind("mousedown", (e) => {
        $("#editor-left").hide();
        $("#pdf-viewer").hide();
    });

    $(".ui-layout-resizer-east").bind("mouseup dragstop", () => {
        $("#editor-left").show();
        $("#pdf-viewer").show();
    });
});