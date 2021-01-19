$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});


function changeUsername(oldUsername, newUsername) {
    // must be a different username
    if (oldUsername && newUsername && newUsername.toLowerCase() != oldUsername.toLowerCase()) {
        // send request
        $.post('/profile/changename', { newUsername: newUsername }, (response) => {
            if (response == "M") {
                location.reload();
            } else {
                console.log("Could not update account name.");
            }
        });
    } else {
        alert("You must enter a new name!");
    }
}

function changePassword(hashword, oldPassword, newPassword, confirmNewPassword) {
    
}