const ace = require("ace-builds");
const resolver = require("ace-builds/webpack-resolver");
const process = require('process');
window['process'] = process;

var aceEditorLeft = undefined;

$(() => {
    aceEditorLeft = ace.edit("editor-left");
    ace.require("ace/ext/language_tools");
    aceEditorLeft = ace.edit("editor-left");
    aceEditorLeft.setTheme("ace/theme/textmate");
    aceEditorLeft.session.setMode("ace/mode/latex");
    aceEditorLeft.setShowPrintMargin(false);
    aceEditorLeft.setAutoScrollEditorIntoView(true);
});

function get() {
    return aceEditorLeft;
}

module.exports = {
    get
}