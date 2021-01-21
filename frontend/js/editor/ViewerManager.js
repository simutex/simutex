const AceManager = require("./AceManager");

function compileLaTeX(force_build = false) {
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
            }
        });
    } else {
        console.log('Could not find ace editor.');
    }
}

function setViewer(data) {
    let viewer = document.getElementById("pdf-viewer");
    if (viewer.getAttribute("src") == data) {
        viewer.src += '';
    } else {
        viewer.setAttribute("src", data);
    }
    /* console.log('setting view: ' + data);
    $("#pdf-viewer").remove();
    let frame = document.createElement("iframe");
    frame.setAttribute("id", "pdf-viewer");
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.setAttribute("frameBorder", "0");
    let _pdfViewer = document.createElement("object");
    _pdfViewer.setAttribute("data", data);
    _pdfViewer.setAttribute("type", "application/pdf");
    _pdfViewer.style.height="100%";
    _pdfViewer.style.width="100%";
    let frameHTML = `<body style="margin:0;padding:0;">${_pdfViewer.outerHTML}</body>`;
    frame.setAttribute("src", data); //'data:text/html;charset=utf-8,' + encodeURI(frameHTML));
    frame.onload = function() {
        console.log('frame loaded');
    }
    $("#pdf-viewer-parent").append(frame);
    console.log('view should be set'); */
}

/**
 * Ctrl + S to save
 */
$(document).on('keydown', (e) => {
    if (!(e.key.toLowerCase() == 's' && e.ctrlKey)) {
        return true;
    }
    e.preventDefault();

    compileLaTeX();
    return false;
});

module.exports = {
    compileLaTeX: compileLaTeX,
    setViewer: setViewer
}