$(() => {
    $('[data-toggle="tooltip"]').tooltip()
});

// alphanumeric with _, 3 to 16 characters long
const validDisplayName = /^[a-zA-Z0-9_]{2,15}$/;

// placeholder password requirements
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

// /**
//  * After input validation sends post request to backend to further process request.
//  * No request is made if confirmation does not match or if 
//  * 
//  * @param {String} oldPassword 
//  * @param {String} newPassword 
//  * @param {String} confirmNewPassword 
//  */
// function changePassword(oldPassword, newPassword, confirmNewPassword) {
//     if (oldPassword && newPassword && confirmNewPassword && newPassword == confirmNewPassword) {
//         // validate password requirements
//         if (!validPassword.test(newPassword)) {
//             alert("Your password is not strong enough!");
//         } else {
//             // send request
//             $.post('/profile/changepassword', { oldPassword: oldPassword, newPassword: newPassword }, (response) => {
//                 if (response == 'M') {
//                     location.reload();
//                 } else {
//                     console.log("Could not update password.");
//                 }
//             });
//         }
//     }
// }