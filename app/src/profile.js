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

router.get('/', auth.middleware.credentials, (req, res) => {
    ejs_vars = {
        user: req.cookies.u,
    };
    ejs.renderFile('app/views/profile.ejs', ejs_vars, {}, (err, str) => {
        res.send(str);
    });
});

/**
 * Modify user display name from profile page.
 */
router.post('/changename', auth.middleware.credentials, (req, res) => {
    const newUsername = req.body.newUsername;
    if (newUsername && newUsername != req.cookies.u) {
        // handles response
        function handle(err, callback) {
            res.send(err ? 'E' : 'M');
        }
        
        // check if username is available
        db.get().collection('accounts').find({ username: newUsername }).toArray((err, accounts) => {
            if (accounts.length > 0) {
                res.send('D');
            }
        });

        // change username
        db.get().collection('accounts').updateOne({ username: req.cookies.u }, { $set: { username: newUsername } }, (err, res) => {
            if (err) {
                res.send('M');
            }
        });

        // change matching names
        db.get().collection('projects').updateOne({ owner: })
    }
});

/**
 * Change password from profile page and update user cookie.
 */
router.post('/changepassword', auth.middleware.credentials, (req, res) => {

});

module.exports = {
    router
}