import "ace-builds";
import "ace-builds/webpack-resolver";
import "bootstrap";

import '../public/dist/js/jquery.layout-latest.js';

/* Project Title Editing */
$(document).on("dblclick", "#project_title", function () {
    let old_project_title = $("#project_title").text().trim();

    function updateTitle() {
        console.log("out");
        var new_project_name = $("#new_project_title").val().trim();
        if (new_project_name == "") {
            $("#project_title").text(old_project_title);
        } else {
            $.post('./settings/rename', { data: new_project_name }, (data) => {
                if (data == "M") {
                    $("#project_title").text(new_project_name);
                    $(document).prop('title', new_project_name + ' | ' + bname);
                } else {
                    $("#project_title").text(old_project_title);
                }
            });
        }
    }

    let current = $(this).text();
    $("#project_title").html(`<form class="form-inline" onsubmit="return false;">
        <input id="new_project_title" class="form-control mr-sm-2" type="search" placeholder="${current}" aria-label="Search">
    </form>`);
    $("#new_project_title").focus();

    $("#new_project_title").focus(function () {
        console.log('in');
    }).blur(() => {
        updateTitle();
    }).keypress((e) => {
        if (e.which == 13) {
            updateTitle();
        }
    });
});


// Enable Tooltips
$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});


// Menu Toggle Script
$("#menu-toggle").click((e) => {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

var aceEditorLeft = null;
$(document).ready(function () {
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

    ace.require("ace/ext/language_tools");
    aceEditorLeft = ace.edit("editor-left");
    aceEditorLeft.setTheme("ace/theme/textmate");
    aceEditorLeft.session.setMode("ace/mode/latex");
    aceEditorLeft.setShowPrintMargin(false);
    aceEditorLeft.setAutoScrollEditorIntoView(true);
    aceEditorLeft.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
    });
    /* if (pdata) {
        aceEditorLeft.setValue(pdata);
        compileLaTeX(true);
    } */
    aceEditorLeft.moveCursorTo(0, 0);
});

export function compileLaTeX(force_build = false) {
    if (aceEditorLeft != null) {
        $.post('./build', { data: aceEditorLeft.getValue(), build: force_build ? true : $('#buildProject').prop('checked') }, (data) => {
            if (data.charAt(0) == 'E' || data.charAt(0) == 'M') {
                if (data.charAt(0) == 'E' && !force_build) {
                    if (data == 'E0') {
                        alert('An error has occurred. The project was not saved.');
                    } else {
                        alert("Compilation timed out! " + data);
                    }
                } else if (data.charAt(0) == 'M') {
                    if (data == 'M0') {
                        console.log('Saved.');
                    }
                }
            } else {
                /* $("#pdf-viewer").attr("data", "data:application/pdf;base64," + data); */
                $("#pdf-viewer").attr("data", data)
                $("#pdf-viewer").hide();
                $("#pdf-viewer").show();
            }
        });
    }
}

$(document).keydown(function (event) {
    if (!(String.fromCharCode(event.which).toLowerCase() == 's' && event.ctrlKey) && !(event.which == 19)) return true;
    compileLaTeX();
    event.preventDefault();
    return false;
});

import sharedb from 'sharedb/lib/client';
import ReconnectingWebSocket from 'reconnecting-websocket';
import * as process from 'process';
window['process'] = process;
import * as json1 from 'ot-json1';

sharedb.types.register(json1.type);
var socket = new ReconnectingWebSocket('ws://' + window.location.hostname + ':3080');
var connection = new sharedb.Connection(socket);

socket.addEventListener('open', function () {
    console.log('Connected');
});

socket.addEventListener('close', function () {
    console.log('Closed');
});

socket.addEventListener('error', function () {
    console.log('Error');
});

export var doc = connection.get('project_data', pid);

var path = [];
var suppressed = false;
var my_id = "noah";

doc.subscribe(function (err) {
    if (err) throw err;
    aceEditorLeft.setValue(doc.data);
    aceEditorLeft.moveCursorTo(0, 0);
    compileLaTeX(true);
    aceEditorLeft.on('change', (delta) => {
        if (!suppressed) {
            const aceDoc = aceEditorLeft.getSession().getDocument();

            const op = {};

            const start = aceDoc.positionToIndex(delta.start);
            const end = aceDoc.positionToIndex(delta.end);

            op.p = path.concat(start);

            let action;
            if (delta.action === 'insert') {
                action = 'si';
            } else if (delta.action === 'remove') {
                action = 'sd';
            } else {
                throw new Error(`action ${action} not supported`);
            }
            const str = delta.lines.join('\n');
            op[action] = str;

            const docSubmitted = (err) => {
                if (err) throw err;
            };

            doc.submitOp(op, { source: my_id }, docSubmitted);
        }
    });
    doc.on('op', (ops, source) => {
        const opsPath = ops[0].p.slice(0, ops[0].p.length - 1).toString();

        if (source === my_id) {
            console.log('*remote*: op origin is self; _skipping_');
            return;
        } else if (opsPath !== path.toString()) {
            console.log('*remote*: not from my path; _skipping_');
            return;
        }

        const deltas = opTransform(ops);

        suppressed = true;
        aceEditorLeft.getSession().getDocument().applyDeltas(deltas);
        suppressed = false;
    });
});

function opTransform(ops) {
    function opToDelta(op) {
        const index = op.p[op.p.length - 1];
        const pos = aceEditorLeft.getSession().getDocument().indexToPosition(index, 0);
        const start = pos;
        let action;
        let lines;
        let end;
        if ('sd' in op) {
            action = 'remove';
            lines = op.sd.split('\n');
            const count = lines.reduce((total, line) => total + line.length, lines.length - 1);
            end = aceEditorLeft.getSession().getDocument().indexToPosition(index + count, 0);
        } else if ('si' in op) {
            action = 'insert';
            lines = op.si.split('\n');
            if (lines.length === 1) {
                end = {
                    row: start.row,
                    column: start.column + op.si.length,
                };
            } else {
                end = {
                    row: start.row + (lines.length - 1),
                    column: lines[lines.length - 1].length,
                };
            }
        } else {
            throw new Error(`Invalid Operation: ${JSON.stringify(op)}`);
        }
        const delta = {
            start,
            end,
            action,
            lines,
        };
        return delta;
    }
    const deltas = ops.map(opToDelta);
    return deltas;
}