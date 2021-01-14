const express = require('express');
const bodyParser = require("body-parser");
const cookierParser = require("cookie-parser");
const ejs = require('ejs');
const app = express();
app.use(express.static(__dirname + '/frontend/public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookierParser());

const auth = require('./app/src/auth');
const db = require('./app/src/db');
db.connect(() => { });

const config = require('./config');

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
    auth.credentials(req, res, () => {
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
app.post('/login', auth.credentials, (req, res) => {
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

/**
 * Start the application on the specified port.
 */
var server = app.listen(config.server.port, () => {
    console.log(`Server listening on the port::${config.server.port}`);

    // Create the ShareDB WebSocket 
    projectsRoute.createCollaborationServer(server);
});