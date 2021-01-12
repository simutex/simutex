$("#delete_project_title").keypress((e) => {
    if (e.which == 13) {
        attemptDelete();
    }
});

$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});

function attemptDelete() {
    if ($("#delete_project_title").val().trim().toLowerCase() == "<%= unescape(ptitle).trim().toLowerCase() %>") {
        window.location.href = './delete';
    }
}

function removeUser(uuid, user, type) {
    $.post('./settings/removeuser', { data: user, type: type }, (data) => {
        if (data == "M") {
            $("#" + uuid).remove();
        } else {
            console.log("The account could not be removed.");
        }
    });
}

function addUser() {
    var role = $('#addUserRoleSelect').val();
    var username = $('#addUserUsername').val();
    if (role == "collaborator" || role == "viewer") {
        if (username != "") {
            $.post('./settings/adduser', { data: username, type: role }, (data) => {
                if (data == "M") {
                    location.reload();
                } else {
                    console.log("The account could not be added.");
                }
            });
        } else {
            alert("The username cannot be blank.");
        }
    } else {
        alert("Please select a role.");
    }
}