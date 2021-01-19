
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
    $("#new_project_title").trigger('focus');

    $("#new_project_title").on('focus', () => {
        console.log('in');
    }).on('blur', () => {
        updateTitle();
    }).on('keypress', (e) => {
        if (e.key == "Enter") {
            updateTitle();
        }
    });
});