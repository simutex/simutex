const db = require('./db');
const crypto = require('crypto');

/**
 * Credential authentication middleware.
 * 
 * Attempts to authenticate the user credentials.
 * If a username and password are found, the password will be hashed and tried.
 * If a username and hashword are found, the credentials will be tried as is.
 * 
 * Calls "next()" if successful, otherwise "fail()"
 * 
 * @param {function} fail Optional function fired when authentication is unscuccessful.
 */
function authCredentials(req, res, next, fail = undefined) {
    if (req.body.username === undefined || req.body.password === undefined) {
        if (req.cookies.u !== undefined && req.cookies.h !== undefined) {
            db.get().collection('accounts').find({ username: req.cookies.u, password: req.cookies.h }).toArray((err, accounts) => {
                if (err || accounts.length != 1) {
                    defaultLoginFail(req, res, fail);
                }
                if (accounts.length == 1) {
                    next();
                }
            });
        } else {
            defaultLoginFail(req, res, fail);
        }
    } else {
        var hashpass = crypto.createHash("sha512").update(req.body.password, 'utf-8').digest('hex');
        db.get().collection('accounts').find({ username: req.body.username, password: hashpass }).toArray((err, accounts) => {
            if (err || accounts.length != 1) {
                defaultLoginFail(req, res, fail);
            }
            if (accounts.length == 1) {
                if (req.cookies.username === undefined) {
                    res.cookie('u', req.body.username, { maxAge: 7 * 24 * 60 * 60 * 1000 })
                    res.cookie('h', hashpass, { maxAge: 7 * 24 * 60 * 60 * 1000 })
                }
                next();
            }
        });
    }
}

/**
 * The default login failure action.
 * 
 * Executes "fail()" if provided, otherwise clears cookies and routes the user to the login page.
 */
function defaultLoginFail(req, res, fail) {
    if (fail === undefined) {
        res.clearCookie('u');
        res.clearCookie('h');
        res.redirect('/login');
    } else {
        fail();
    }
}

/**
 * Attempts to authenticate if a user can modify the specified project.
 * 
 * Users who can modify a project are the owner and collaborators.
 */
function authProjectModify(req, res, next, fail = undefined) {
    db.get().collection('projects').find({ id: req.params.id, $or: [{ owner: req.cookies.u }, { collaborators: { $in: [req.cookies.u] } }] }).toArray((err, project) => {
        if (err || project.length != 1) {
            defaultProjectFail(req, res, fail);
        }
        if (project.length == 1) {
            next();
        }
    });
}

/**
 * Attempts to authenticate if the user is the project owner.
 */
function authProjectOwner(req, res, next, fail = undefined) {
    db.get().collection('projects').find({ id: req.params.id, owner: req.cookies.u }).toArray((err, project) => {
        if (err || project.length != 1) {
            defaultProjectFail(req, res, fail);
        }
        if (project.length == 1) {
            next();
        }
    });
}

/**
 * Attempts to authenticate if the user can access the specified project.
 * 
 * Users who can access the project are the owner, collaborators, and viewers.
 */
function authProjectAccess(req, res, next, fail = undefined) {
    db.get().collection('projects').find({ id: req.params.id, $or: [{ owner: { $in: [req.cookies.u] } }, { collaborators: { $in: [req.cookies.u] } }, { viewers: { $in: [req.cookies.u] } }] }).toArray((err, project) => {
        if (err || project.length != 1) {
            defaultProjectFail(req, res, fail);
        }
        if (project.length == 1) {
            next();
        }
    });
}

/**
 * Default project authentication failure.
 */
function defaultProjectFail(req, res, fail) {
    if (fail === undefined) {
        res.redirect('/projects');
    } else {
        fail();
    }
}

/**
 * Permits access if the account is an administrator.
 * 
 * Redirects the user to their previous back if a failure callback is not provided.
 */
function authAdministrator(req, res, next, fail = undefined) {
    db.get().collection('accounts').find({ username: req.cookies.u, admin: true }).toArray((err, account) => {
        if (err || account.length != 1) {
            if (fail === undefined) {
                res.redirect('/');
            } else {
                fail();
            }
        } else {
            next();
        }
    });
}

module.exports = {
    credentials: authCredentials,
    project: {
        modify: authProjectModify,
        owner: authProjectOwner,
        access: authProjectAccess
    },
    admin: authAdministrator 
}