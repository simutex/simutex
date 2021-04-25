const ShareDB = require('sharedb');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');

const config = require('../../config');
const auth = require('./auth');

// Create a second connnection to the MongoDB instance for ShareDB
const sdb = require('sharedb-mongo')(`mongodb://${config.database.hostname}:${config.database.port}/${config.database.name}`, { mongoOptions: { useUnifiedTopology: true } });
const backend = new ShareDB({ db: sdb });

// We want to hit the "projects" related mongo to propogate the last timestamp when each project was edited
const db = require('./db');

/** 
 * Pass custom metadata on to the request agent
 */
backend.use('connect', (request, callback) => {
    // Clone request to avoid mutation after connection
    const requestJson = JSON.stringify(request.req || {});
    const requestData = JSON.parse(requestJson);

    Object.assign(request.agent.custom, requestData);
    callback();
});

/**
 * Assign the operation user ID to the user account ID
 */
backend.use('submit', (request, callback) => {
    request.op.m.userid = request.agent.custom.userid;

    /**
     * ---------------------------------------------------------------
     * IMPORTANT: if a project was JUST created, "m.user" will be null
     * ---------------------------------------------------------------
     */
    db.get().collection('projects').update({ documents: request.id },
        {$set: {"m.ts": request.op.m.ts, "m.user": request.agent.custom.userid}});
    callback();
});

function getConnection() {
    return backend.connect();
}

function backendListen(stream, metadata) {
    backend.listen(stream, metadata);
}

/**
 * Store client WebSocket connections
 */
let live_projects = {};

function createWebSockets(app) {
    console.log('Creating WebSockets');
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
                backendListen(stream, metadata);
            }, () => { })
        }, () => { });
    });

    /**
     * Handle extra communication for projects, such as cursor position and selection.
     * 
     * liveProjectCleanup periodically checks all WebSocket connections for a specific project and discords project references for closed projects.
     */
    function liveProjectCleanup() {
        setTimeout(() => {
            for (let project in live_projects) {
                for (let wsi = 0; wsi < live_projects[project].length; wsi++) {
                    if (live_projects[project][wsi].readyState === 2 || live_projects[project][wsi].readyState === 3) {
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
                ws.project = req.params.id;
                ws.on('message', (data) => {
                    data = JSON.parse(data);
                    broadcastToProject(ws.project, req.cookies.u, data, ws);
                });
            }, () => { }); // don't register the websocket if they cannot modify the project
        }, () => { }); // don't check project access if their credentials are invalid
    });
};

function broadcastToProject(project, username, data, sender = undefined) {
    data.username = username;
    data = JSON.stringify(data);
    if (project in live_projects) {
        for (let clientIndex = 0; clientIndex < live_projects[project].length; clientIndex++) {
            let client = live_projects[project][clientIndex];
            if (client.readyState === 1) {
                if (sender === undefined) {
                    client.send(data);
                } else if (sender !== client) {
                    client.send(data);
                }
            }
        }
    }
}

module.exports = {
    createWebSockets: createWebSockets,
    broadcastToProject: broadcastToProject,
    getConnection: getConnection,
    backendListen: backendListen
}