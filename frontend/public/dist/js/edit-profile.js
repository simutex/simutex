$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});

// display name requirements: alphanumeric with _, 3 to 16 characters long
const validDisplayName = /^[a-zA-Z0-9_]{2,15}$/;

// password requirements: placeholder
const validPassword = /^.*/;
const validPasswordRequirements = "TODO";

/**
 * After performing simple validation checks sends a post request for display name
 * changing in backend.
 * 
 * @param {String} oldDisplayName 
 * @param {String} newDisplayName 
 */
function changeDisplayName(oldDisplayName, newDisplayName) {
    // must use valid format
    if (!oldDisplayName || !newDisplayName || !validDisplayName.test(newDisplayName)) {
        alert("Your display name must be alphanumeric and between 3 and 16 characters long.");
    } else {
        // must be a different username
        if (newDisplayName.toLowerCase() != oldDisplayName.toLowerCase()) {
            // send request
            $.post('/profile/changename', { newDisplayName: newDisplayName }, (response) => {
                if (response == "M") {
                    location.reload();
                } else {
                    console.log("Could not update account display name.");
                }
            });
        } else {
            alert("You must enter a new name!");
        }
    }
}

/**
 * Simple validation check for the input new password. Must pass regex check and
 * the new password must match the confirmation.
 * 
 * @param {String} newPassword 
 * @param {String} confirmNewPassword 
 */
function isValidPassword(newPassword, confirmNewPassword) {
    if (newPassword && confirmNewPassword && newPassword == confirmNewPassword) {
        if (validPassword.test(newPassword)) {
            return true;
        }
        alert("Your new password must meet the following requirements: " + validPasswordRequirements);
    } else {
        alert("New and confirmation password don't match!");
    }
    return false;
}