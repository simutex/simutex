const express = require('express');
const router = express.Router();
const fs = require('fs');
const ejs = require('ejs');
const mkdirp = require('mkdirp');
const bodyParser = require('body-parser');
const cookierParser = require('cookie-parser');
const spawn = require('child_process').spawn;
const uuid = require('uuid');
const ShareDB = require('sharedb');

const cmdRouter = express.Router({ mergeParams: true });
cmdRouter.use(bodyParser.urlencoded({ extended: true }));
cmdRouter.use(bodyParser.json());
cmdRouter.use(cookierParser());

const db = require('./db');
const auth = require('./auth');
const config = require('../../config');

// Create a second connnection to the MongoDB instance for ShareDB
const sdb = require('sharedb-mongo')(`mongodb://${config.database.hostname}:${config.database.port}/${config.database.name}`, { mongoOptions: { useUnifiedTopology: true } });
const backend = new ShareDB({ db: sdb });

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
    callback();
});

function backendListen(stream, metadata) {
    backend.listen(stream, metadata);
}

/**
 * Require credential authentication for all requests.
 */
router.use(auth.middleware.credentials);

/**
 * Show a list of all the users projects.
 */
router.get('/', async (req, res) => {

    // Create array of last modified timeStamps for each project

    let timeStamps = [];
    let timeMap = {};
    findMTime = db.get().collection('project_data').find({});
    await findMTime.forEach(
        doc => {
            timeStamps.push(doc._m.mtime);
            let forConversion = new Date(doc._m.mtime).toString();
            let splitter = forConversion.split("T");
            // console.log("Last edited on: " + splitter[0]);
            timeMap[doc._id] = splitter[0];
        }
    );
    // console.log(timeStamps)

    // Create a map for {project UID : last modification timeStamp} , filtering on previously
    // created array
    let editMap = {};
    lastEdits = db.get().collection('o_project_data').find({ "m.ts": { $in: timeStamps } });
    await lastEdits.forEach(
        doc => {
            // console.log(doc);
            editMap[doc.d] = doc.m.userid;
        }
    );
    // await console.log(editMap);
    // console.log("AWAITED PROPERLY")
    db.get().collection('projects').find({ "owner": req.cookies.u, $or: [{ hidden: { $exists: false } }, { hidden: false }] })
        .project({ title: true, id: true , owner: true, collaborators: true, viewers: true})
        .toArray((err, projects) => {
        // console.log("SHOULD BE AFTER AWAIT");
        // console.log(timeMap)
        ejs.renderFile(`app/views/projects.ejs`, { projects_data: projects, edit_map: editMap, time_map: timeMap }, {}, (err, str) => {
            res.send(str);
        });
    });
});

/**
 * Create a new project and redirect them to the editor.
 */
router.get('/new', (req, res) => {
    var doc_id = uuid.v4();
    db.get().collection('projects').find({ id: doc_id }).toArray((err, projects) => {
        if (projects.length == 0) {
            var new_project = {
                title: "New Project",
                id: doc_id,
                owner: req.cookies.u,
                collaborators: [],
                viewers: []
            }
            let new_project_data = `\\documentclass{article}\n\n\\begin{document}\n\tMy New Project\n\\end{document}`;
            let build_dir = `projects/${doc_id}`;
            mkdirp(build_dir).then(made => {
                let in_file = build_dir + '/in.tex'
                fs.writeFile(in_file, new_project_data, 'utf8', (e) => {
                    db.get().collection('projects').insertOne(new_project, (err, r) => {
                        res.redirect(`/projects/${doc_id}/edit`);
                    });
                });
            });
        } else {
            res.redirect('/projects/new');
        }
    });
});

/**
 * Create a new router that accepts a UUIDv4 parameters called "id" which represents the document unique ID.
 */
router.use('/:id([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})', auth.middleware.project.access, cmdRouter);  // uuidv4 regex (8-4-4-4-12)

/**
 * Determine whether they route to /edit or /view based on their project permissions
 * Uses callback functions for failure
 */
cmdRouter.get('/', (req, res) => {
    auth.middleware.project.modify(req, res, () => {
        res.redirect(`/projects/${req.params.id}/edit`);
    }, () => {
        auth.middleware.project.access(req, res, () => {
            res.redirect(`/projects/${req.params.id}/view`);
        }, () => {
            res.redirect('/projects');
        });
    });
});

/**
 * Provide the document editor for the requested project.
 *
 * If the user does not have modify permissions, then they will be routed to view the document.
 * If the user does not have access permissions, then they will be routed to their projects.
 */
cmdRouter.get('/edit', (req, res) => {
    auth.middleware.project.modify(req, res, () => {
        // Get project data
        db.get().collection('projects').findOne({ id: req.params.id }, { projection: { title: true, owner: true, collaborators: true, viewers: true } }, (err, project) => {
            if (err) throw err;

            fs.readFile(`./projects/${req.params.id}/in.tex`, (err, data) => {
                if (err) throw err;
                pdata = ((data === undefined) ? "" : data).toString();
                ejs_vars = {
                    brand: config.brand,
                    pid: escape(req.params.id),
                    ptitle: escape(project.title),
                    pdata: escape(pdata),
                    pisowner: (project.owner == req.cookies.u),
                    piscollab: project.collaborators.includes(req.cookies.u),
                    pisviewer: project.viewers.includes(req.cookies.u)
                }

                var connection = backend.connect();
                var doc = connection.get('project_data', req.params.id);
                doc.fetch((err) => {
                    if (err) throw err;
                    if (doc.type == null) {
                        doc.create(pdata);
                        return;
                    }
                });

                ejs.renderFile('app/views/editor.ejs', ejs_vars, {}, (err, str) => {
                    res.send(str);
                });
            });
        });
    }, () => {
        auth.middleware.project.access(req, res, () => {
            res.redirect(`/projects/${req.params.id}/view`);
        }, () => {
            res.redirect('/projects');
        });
    });
});

/**
 * Send the PDF document to the browser for rendering.
 */
cmdRouter.get('/view', auth.middleware.project.access, (req, res) => {
    res.sendFile(req.params.id + '/out.pdf', { root: 'projects' });
});

/**
 * Alias for /view
 */
cmdRouter.get('/pdf', auth.middleware.project.access, (req, res) => {
    res.redirect(`/projects/${req.params.id}/view`);
});

/**
 * Provide the raw text of the specified document.
 *
 * Returned page body does not contain any text/data other than the document.
 * Formatting may not appear as shown in the editor.
 */
cmdRouter.get('/raw', auth.middleware.project.access, (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(fs.readFileSync(`./projects/${req.params.id}/in.tex`).toString());
});

/**
 * Return a raw text view of the document.
 *
 * Formatting should be identical, with the exception of tab length, to the editor.
 */
cmdRouter.get('/text', auth.middleware.project.access, (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send('<html><body><pre>' + fs.readFileSync(`./projects/${req.params.id}/in.tex`).toString() + '</pre></body></html>');
});

/**
 * Downloads the output PDF document, if it exists.
 *
 * Sends a basic messages if the output PDF does not exist.
 */
cmdRouter.get('/download', auth.middleware.project.access, (req, res) => {
    var file = `./projects/${req.params.id}/out.pdf`;
    if (fs.existsSync(file)) {
        res.download(file);
    } else {
        res.send('No PDF could be found for the requested project. Please compile the project and try again.')
    }
});

/**
 * Deletes a project.
 *
 * Requires owner permissions.
 */
cmdRouter.get('/delete', auth.middleware.project.owner, (req, res) => {
    switch (config.database.project.delete) {
        case 'all':
            // Delete all data from `projects`, `project_data`, and `o_project_data` and on-disk
            db.get().collection('projects').deleteOne({ id: req.params.id }, (err, result_one_a) => {
                db.get().collection('project_data').deleteOne({ _id: req.params.id }, (err, result_one_b) => {
                    db.get().collection('o_project_data').deleteMany({ d: req.params.id }, (err, result_many) => {
                        fs.rm(`projects/${req.params.id}`, { recursive: true }, (e) => {
                            res.redirect('/projects');
                        });
                    });
                });
            });
            break;
        case 'hidden':
            // Hide the project by adding "hidden: true" to project in `projects`
            db.get().collection('projects').updateOne({ id: req.params.id }, { $set: { hidden: true } }, (e) => {
                res.redirect('/projects');
            });
            break;
        case 'archive':
            // Hides the project and deletes all relevant information in `o_project_data`
            db.get().collection('projects').updateOne({ id: req.params.id }, { $set: { hidden: true } }, (e) => {
                db.get().collection('o_project_data').deleteMany({ d: req.params.id }, (err, result_many) => {
                    res.redirect('/projects');
                });
            });
            break;
        default:
            throw new Error("Invalid configuration value: config.data.project.data");
    }
});

/**
 * Shows project settings.
 */
cmdRouter.get('/settings', auth.middleware.project.modify, (req, res) => {
    db.get().collection('projects').findOne({ id: req.params.id }, { projection: { title: true, owner: true, collaborators: true, viewers: true } }, (err, project) => {
        fs.readFile(`./projects/${req.params.id}/in.tex`, (err, data) => {
            ejs_vars = {
                brand: config.brand,
                puser: req.cookies.u,
                pid: escape(req.params.id),
                ptitle: escape(project.title),
                pdata: escape(((data === undefined) ? "" : data).toString()),
                powner: project.owner,
                pcollaborators: project.collaborators,
                pviewers: project.viewers,
                pisowner: (project.owner == req.cookies.u),
                piscollab: project.collaborators.includes(req.cookies.u),
                paction: null,
                uuid: require('uuid')
            }
            ejs.renderFile('app/views/project_settings.ejs', ejs_vars, {}, (err, str) => {
                res.send(str);
            });
        });
    });
});

/**
 * Shows project settings, passing an action as a JavaScript variable for local use.
 */
/* cmdRouter.get('/settings/:action', auth.middleware.project.modify, (req, res) => {
    db.get().collection('projects').findOne({ id: req.params.id }, { projection: { title: true, owner: true, collaborators: true } }, (err, project) => {
        fs.readFile(`./projects/${req.params.id}/in.tex`, (err, data) => {
            ejs_vars = {
                pid: escape(req.params.id),
                ptitle: escape(project.title),
                pdata: escape(((data === undefined) ? "" : data).toString()),
                pisowner: (project.owner == req.cookies.u),
                piscollab: project.collaborators.includes(req.cookies.u),
                paction: req.params.action
            }
            console.log(req.cookkies.u);
            ejs.renderFile('./views/project_settings.ejs', ejs_vars, {}, (err, str) => {
                res.send(str);
            });
        });
    });
}); */

/**
 * Attempts to rename the project.
 */
cmdRouter.post('/settings/rename', auth.middleware.project.modify, (req, res) => {
    if (req.body.data) {
        db.get().collection('projects').updateOne({ id: req.params.id }, { $set: { title: req.body.data } }, (err, project) => {
            if (err) {
                res.send('E');
            } else {
                res.send('M');
            }
        });
    }
});

/**
 * Removes a collaborator or viewer from the project.
 */
cmdRouter.post('/settings/removeuser', auth.middleware.project.modify, (req, res) => {
    function handle(err, project) {
        if (err) {
            res.send('E');
        } else {
            res.send('M');
        }
    }
    if (req.body.data && req.body.type) {
        if (req.body.type == "collaborator") {
            db.get().collection('projects').updateOne({ id: req.params.id }, { $pull: { collaborators: req.body.data } }, handle);
        } else if (req.body.type == "viewer") {
            db.get().collection('projects').updateOne({ id: req.params.id }, { $pull: { viewers: req.body.data } }, handle);
        }
    }
});

/**
 * Adds a collaborator or viewer from the project.
 */
cmdRouter.post('/settings/adduser', auth.middleware.project.modify, (req, res) => {
    function handle(err, project) {
        if (err) {
            res.send('E');
        } else {
            res.send('M');
        }
    }
    if (req.body.data && req.body.type) {
        if (req.body.type == "collaborator") {
            db.get().collection('projects').updateOne({ id: req.params.id }, { $push: { collaborators: req.body.data } }, handle);
        } else if (req.body.type == "viewer") {
            db.get().collection('projects').updateOne({ id: req.params.id }, { $push: { viewers: req.body.data } }, handle);
        }
    }
});

/**
 * API to handle saving and building the document.
 * Checks user has modification permissions.
 * Will save the posted data to disk, overwriting the current file.
 * Returns base64 encoded PDF data.
 * Builds the document and returns it if specified in the post data. (build = true)
 */
cmdRouter.post('/build', auth.middleware.project.modify, (req, res) => {
    let build_dir = 'projects/' + req.params.id;
    mkdirp(build_dir).then(made => {
        let in_file = build_dir + '/in.tex'
        fs.writeFile(in_file, req.body.data, 'utf8', (e) => {
            if (req.body.build == 'true') {
                let latexmk = spawn("perl", ["-S", `${config.latexmk.path}/latexmk.pl`, "-jobname=" + build_dir + "/out", "-pdf", in_file]);
                latexmk.stdout.on("data", data => {
                    //console.log("stdout: " + data);
                });

                latexmk.stderr.on("data", data => {
                    //console.log("stderr: " + data);
                });

                latexmk.on("error", (error) => {
                    //console.log("err: " + error.message);
                });

                latexmk.on("close", code => {
                    console.log("code: " + code);
                    if (code == 0) {
                        res.send(`http://${config.server.hostname}:${config.server.port}/projects/${req.params.id}/view`);
                        /* res.send(fs.readFileSync(build_dir + '/out.pdf', { encoding: 'base64' })); */

                        //ws.send(build_dir + "/out.pdf");
                    } else {
                        res.send("E2");
                    }
                });

                // Timeout for compilations taking too long
                setTimeout(() => {
                    try {
                        latexmk.kill();
                    } catch (e) {
                        console.log("COULD NOT KILL PROCESS.");
                        res.send("E1");
                    }
                }, 10 * 1000); // 10 second timeout
            } else {
                if (e == null) {
                    res.send("M0");
                } else {
                    res.send('E0');
                }
            }
        });
    });
});

//export this router to use in our server.js
module.exports = {
    router,
    backendListen
};
