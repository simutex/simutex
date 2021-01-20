const express = require('express');
const router = express.Router();
const fs = require('fs');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const cookierParser = require('cookie-parser');
const crypto = require('crypto');

const cmdRouter = express.Router({ mergeParams: true });
cmdRouter.use(bodyParser.urlencoded({ extended: true }));
cmdRouter.use(bodyParser.json());
cmdRouter.use(cookierParser());

const db = require('./db');
const auth = require('./auth');

router.use(auth.middleware.credentials);
router.use('/profile', auth.middleware.credentials); 

/**
 * Queries for any pre-existing display name. If not set, defaults to username.
 * 
 * @param {String} username 
 */
async function getDisplayNameOrDefault(username) {
    const accounts = await db.get().collection('accounts').find({ username: username }).toArray();
    return accounts.length > 0 && accounts[0].displayName ? accounts[0].displayName : username;
}

/**
 * Constructs EJS variables to be used while rendering the edit profile page.
 * 
 * @param {String} username 
 */
async function getProfilePageData(username) {
    const displayName = await getDisplayNameOrDefault(username);
    ejs_vars = {
        user: username,
        displayName: displayName,
        error: ""
    };
    return ejs_vars;
}

/**
 * Attempts to retrieve the display name for a given user. If attribute not present, simply
 * defaults to the actual username.
 */
router.get('/', auth.middleware.credentials, async (req, res) => {
    ejs_vars = await getProfilePageData(req.cookies.u);
    ejs.renderFile('app/views/profile.ejs', ejs_vars, {}, (err, str) => {
        res.send(str);
    });
});

/**
 * Modify user display name from profile page.
 */
router.post('/changename', auth.middleware.credentials, (req, res) => {
    const newDisplayName = req.body.newDisplayName;
    if (newDisplayName) {
        // handles response
        function handle(err, callback) {
            res.send(err ? 'E' : 'M');
        }
        // change display name
        db.get().collection('accounts')
            .updateOne({ username: req.cookies.u }, { $set: { displayName: newDisplayName } }, handle);
    }
});

/**
 * Change password from profile page and update user cookie.
 */
router.post('/changepassword', auth.middleware.credentials, async (req, res) => {
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword1;

    /*
     * inner function to populate ejs variables with error reason, which will
     * be noticed by the frontend and rendered accordingly
     */
    const ejs_vars = await getProfilePageData(req.cookies.u);
    function fail(ejs_vars, reason) {
        ejs_vars.error = reason;
        console.log(ejs_vars);
        ejs.renderFile('app/views/profile.ejs', ejs_vars, {}, (err, str) => {
            res.send(str);
        });
    }

    /*
     * inner function to handle clearing cookies upon successfully setting
     * new password
     */
    function handle(err, callback) {
        if (!err) {
            // clear session and redirect to login
            res.clearCookie('u');
            res.clearCookie('h');
            res.redirect('/login');
        } else {
            // something went wrong...
            console.log(err);
        }
    }

    // failed due to wrong password
    const hashword = crypto.createHash("sha512").update(oldPassword, 'utf-8').digest('hex');
    if (req.cookies.h != hashword) {
        fail(ejs_vars, "Your old password was wrong!");
        return;
    }

    // failed due to invalid new password
    if (!oldPassword || !newPassword || oldPassword == newPassword) {
        fail(ejs_vars, "Your new password cannot be the same as your old password!");
        return;
    }

    // set new password
    const newHashword = crypto.createHash("sha512").update(newPassword, 'utf-8').digest('hex');
    db.get().collection('accounts').updateOne({ username: req.cookies.u }, { $set: { password: newHashword } }, handle);
});

module.exports = {
    router
}