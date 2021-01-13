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

var editorLeft = $("#editor-left");
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
    if (pdata) {
        aceEditorLeft.setValue(pdata);
        compileLaTeX(true);
    }
    aceEditorLeft.moveCursorTo(0, 0);
});

function compileLaTeX(force_build = false) {
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

function promptDelete() {
    if (confirm("Are you sure you want to permanently delete this project?\n\nThis cannot be undone.")) {
        window.location.href = './delete';
    }
}

$(document).keydown(function (event) {
    if (!(String.fromCharCode(event.which).toLowerCase() == 's' && event.ctrlKey) && !(event.which == 19)) return true;
    compileLaTeX();
    event.preventDefault();
    return false;
});
