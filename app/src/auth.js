const db = require('./db');
const crypto = require('crypto');

/**
 * User credential authentication.
 * 
 * Executes pass() if the username and hashword are valid.
 * Executes fail() if they are not.
 */
function authCredentials(username, hashword, pass, fail) {
    db.get().collection('accounts').find({ username: username, password: hashword }).toArray((err, accounts) => {
        if (err || accounts.length != 1) {
            fail();
        }
        if (accounts.length == 1) {
            pass();
        }
    });
}

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
function authCredentialsMiddleware(req, res, next, fail = undefined) {
    if (req.body.username === undefined || req.body.password === undefined) {
        if (req.cookies.u !== undefined && req.cookies.h !== undefined) {
            authCredentials(req.cookies.u, req.cookies.h, next, () => { defaultLoginFail(req, res, fail) });
        } else {
            defaultLoginFail(req, res, fail);
        }
    } else {
        var hashpass = crypto.createHash("sha512").update(req.body.password, 'utf-8').digest('hex');
        authCredentials(req.cookies.u, req.cookies.h, () => {
            if (req.cookies.username === undefined) {
                res.cookie('u', req.body.username, { maxAge: 7 * 24 * 60 * 60 * 1000 })
                res.cookie('h', hashpass, { maxAge: 7 * 24 * 60 * 60 * 1000 })
            }
            next();
        }, () => { defaultLoginFail(req, res, fail) });
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
 * Project modification authentication.
 * 
 * Executes pass() if the user can modify the project.
 * Executes fail() if they cannot.
 */
function authProjectModify(id, username, pass, fail) {
    db.get().collection('projects').find({ id: id, $or: [{ owner: username }, { collaborators: { $in: [username] } }] }).toArray((err, project) => {
        if (err || project.length != 1) {
            fail();
        }
        if (project.length == 1) {
            pass();
        }
    });
}

/**
 * Project modification middleware authentication.
 * 
 * Users who can modify a project are the owner and collaborators.
 */
function authProjectModifyMiddleware(req, res, next, fail = undefined) {
    authProjectModify(req.params.id, req.cookies.u, next, () => { defaultProjectFail(req, res, fail) });
}

/**
 * Project owner authentication.
 * 
 * Executes pass() if the user owns the project.
 * Executes fail() if they do not.
 */
function authProjectOwner(id, username, pass, fail) {
    db.get().collection('projects').find({ id: id, owner: username }).toArray((err, project) => {
        if (err || project.length != 1) {
            fail();
        }
        if (project.length == 1) {
            pass();
        }
    });
}

/**
 * Attempts to authenticate if the user is the project owner.
 */
function authProjectOwnerMiddleware(req, res, next, fail = undefined) {
    authProjectOwner(req.params.id, req.cookies.u, next, () => { defaultProjectFail(req, res, fail) });
}

/**
 * Project access authentication.
 * 
 * Executes pass() if the user can access the project.
 * Executes fail() if they cannot.
 */
function authProjectAccess(id, username, pass, fail) {
    db.get().collection('projects').find({ id: id, $or: [{ owner: { $in: [username] } }, { collaborators: { $in: [username] } }, { viewers: { $in: [username] } }] }).toArray((err, project) => {
        if (err || project.length != 1) {
            fail();
        }
        if (project.length == 1) {
            pass();
        }
    });
}

/**
 * Attempts to authenticate if the user can access the specified project.
 * 
 * Users who can access the project are the owner, collaborators, and viewers.
 */
function authProjectAccessMiddleware(req, res, next, fail = undefined) {
    authProjectAccess(req.params.id, req.cookies.u, next, () => { defaultProjectFail(req, res, fail) });
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
function authAdministratorMiddleware(req, res, next, fail = undefined) {
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
    middleware: {
        credentials: authCredentialsMiddleware,
        admin: authAdministratorMiddleware,
        project: {
            modify: authProjectModifyMiddleware,
            owner: authProjectOwnerMiddleware,
            access: authProjectAccessMiddleware
        }
    }
}