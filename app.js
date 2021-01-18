const express = require('express');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require('ejs');
const app = express();
app.use(express.static(__dirname + '/frontend/public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
const ews = require('express-ws')(app);
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

const config = require('./config');
const auth = require('./app/src/auth');
const db = require('./app/src/db');

db.connect(() => {
    /**
     * Determines if the first-time setup page should be accessible.
     */
    const welcome = require('./app/src/welcome');
    welcome.check(() => {
        app.use('/welcome', welcome.router);
    });

});

/** 
 * Sanitize all cookies and body parameters sent by the user.
 */
app.use((req, res, next) => {
    for (var param in req.params) {
        req.params[param] = sanitize(req.params[param]);
    }
    for (var cookie in req.cookies) {
        req.cookies[cookie] = sanitize(req.cookies[cookie]);
    }
    next();
});

/**
 * Route to show projects.
 */
var projectsRoute = require('./app/src/projects.js');
const sanitize = require('mongo-sanitize');
app.use('/projects', projectsRoute.router);

/**
 * Main page.
 * 
 * Redirects to /login if not logged-in.
 * Redirects to /projects if logged in.
 */
app.get('/', (req, res) => {
    auth.middleware.credentials(req, res, () => {
        res.redirect('/projects');
    }, () => {
        res.redirect('/login');
    });
});

/**
 * Route the user to the login page.
 */
app.get('/login', (req, res) => {
    ejs.renderFile('./app/views/login.ejs', {}, {}, (err, str) => {
        res.send(str);
    });
});

/**
 * Post request for login page.
 * 
 * Redirects to /projects if authentication is successful.
 */
app.post('/login', auth.middleware.credentials, (req, res) => {
    res.redirect('/projects');
});

/**
 * Clears the username and hashword cookies.
 * 
 * Redirects to site home.
 */
app.get('/logout', (req, res) => {
    res.clearCookie('u');
    res.clearCookie('h');
    res.redirect('/');
});

/**
 * Testing purposes.
 */
app.get('/test', (req, res) => {
    ejs.renderFile('./app/views/test.ejs', {}, {}, (err, str) => {
        res.send(str);
    });
});

app.get('/admin', auth.middleware.credentials, auth.middleware.admin, (req, res) => {
    ejs.renderFile('./app/views/admin.ejs', {}, {}, (err, str) => {
        res.send(str);
    });
});

/**
 * Start the application on the specified port.
 */
app.listen(config.server.port, () => {
    console.log(`Server listening on the port::${config.server.port}`);
});

/**
 * Provide the backend WebSocket hook to ShareDB for collaborative editing.
 */
app.ws('/api/:id', (ws, req) => {
    auth.credentials(req.cookies.u, req.cookies.h, () => {
        auth.project.modify(req.params.id, req.cookies.u, () => {
            let metadata = {
                userid: req.cookies.u
            }
            let stream = new WebSocketJSONStream(ws);
            projectsRoute.backendListen(stream, metadata);
        }, () => { })
    }, () => { });
});

/**
 * Handle extra communication for projects, such as cursor position and selection.
 * 
 * liveProjectCleanup periodically checks all WebSocket connections for a specific project and discords project references for closed projects.
 */
let live_projects = {};

function liveProjectCleanup() {
    setTimeout(() => {
        for (let project in live_projects) {
            for (let wsi = 0; wsi < live_projects[project].length; wsi++) {
                if (live_projects[project][wsi].readyState === 2 || live_projects[project][wsi].readyState === 3) {  // 2 === ws.CLOSING, 3 === ws.CLOSED
                    live_projects[project].splice(wsi, 1);
                }
            }
            if (live_projects[project].length == 0) {
                delete live_projects[project];
            }
        }
        liveProjectCleanup();
    }, 2500);
}
liveProjectCleanup();

app.ws('/api/extras/:id', (ws, req) => {
    auth.credentials(req.cookies.u, req.cookies.h, () => {
        auth.project.modify(req.params.id, req.cookies.u, () => {
            if (!(req.params.id in live_projects)) {
                live_projects[req.params.id] = [ws];
            } else {
                live_projects[req.params.id].push(ws);
            }
            ws.project = req.params.id
            ws.on('message', (msg) => {
                for (let clientIndex = 0; clientIndex < live_projects[ws.project].length; clientIndex++) {
                    let client = live_projects[ws.project][clientIndex];
                    if (client !== ws && client.readyState == ws.OPEN) {
                        let data = JSON.parse(msg);
                        data.username = req.cookies.u;
                        client.send(JSON.stringify(data));
                    }
                }
            });
        }, () => { }); // don't register the websocket if they cannot modify the project
    }, () => { }); // don't check project access if their credentials are invalid
})