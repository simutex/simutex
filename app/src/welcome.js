const express = require('express');
const router = express.Router();
const ejs = require('ejs');
const bodyParser = require('body-parser');
const cookierParser = require('cookie-parser');
const crypto = require('crypto');

const cmdRouter = express.Router({ mergeParams: true });
cmdRouter.use(bodyParser.urlencoded({ extended: true }));
cmdRouter.use(bodyParser.json());
cmdRouter.use(cookierParser());

const db = require('./db');

/**
 * Provide the root configuration page if the root account does not exist.
 *
 * Routes to / if the root account exists.
 */
router.get('/', (req, res) => {
    check(() => {
        ejs.renderFile('app/views/welcome.ejs', {}, {}, (err, str) => {
            if (err) throw err;
            res.send(str);
        });
    }, () => {
        res.redirect('/');
    });
});

/**
 * Handle root account creation.
 */
router.post('/', (req, res) => {
    if (req.body.passwordA == req.body.passwordB) {
        var hashpass = crypto.createHash("sha512").update(req.body.passwordA, 'utf-8').digest('hex');
        new_user = {
            username: 'root',
            password: hashpass,
            admin: true
        }
        db.get().collection('accounts').insertOne(new_user, (err, r) => {
            res.redirect('/');
        });
    } else {
        res.redirect('/welcome');
    }
});

/**
 * Check if the root account exists.
 *
 * Executes pass() if true, else fail()
 */
function check(pass, fail = () => {}) {
    db.get().collection('accounts').find({ username: 'root' }).toArray((err, accounts) => {
        if (accounts.length == 0) {
            pass();
        } else {
            fail();
        }
    });
}

//export this router to use in our server.js
module.exports = {
    router,
    check
};
