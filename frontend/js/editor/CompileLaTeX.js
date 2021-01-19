
const AceManager = require("./AceManager");

function CompileLaTeX(force_build = false) {
    let aceEditorLeft = AceManager.get();
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
    } else {
        console.log('null');
    }
}

/**
 * Ctrl + S to save
 */
$(document).on('keydown', (e) => {
    if (!(e.key.toLowerCase() == 's' && e.ctrlKey)) {
        return true;
    }
    e.preventDefault();

    CompileLaTeX();
    return false;
});

module.exports = {
    CompileLaTeX: CompileLaTeX
}