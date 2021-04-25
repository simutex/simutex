const express = require('express');
const router = express.Router();
const fs = require('fs');
const ejs = require('ejs');
const mkdirp = require('mkdirp');
const bodyParser = require('body-parser');
const cookierParser = require('cookie-parser');
const spawn = require('child_process').spawn;
const path = require('path');
const uuid = require('uuid');

const cmdRouter = express.Router({ mergeParams: true });
cmdRouter.use(bodyParser.urlencoded({ extended: true }));
cmdRouter.use(bodyParser.json());
cmdRouter.use(cookierParser());

const db = require('./db');
const auth = require('./auth');
const config = require('../../config');
const sockets = require('./sockets');

/**
 * Require credential authentication for all requests.
 */
router.use(auth.middleware.credentials);


/**
 * A quick function to convert a unix timestamp to localized time string... 
 */
function getConvertedTimeString(timestamp) {
    var d = new Date(0);
    d.setUTCMilliseconds(timestamp);
    // console.log(d.toString());

    let hrMinSec = d.toString().split(" GMT");
    // console.log(hrMinSec);
    let timeZone = hrMinSec[1].split(" (");
    let tzString = timeZone[1].slice(0, timeZone[1].length - 1)
    let outputString = hrMinSec[0] + " (" + tzString + ")";
    return outputString;
}

/**
 * Show a list of all the users projects.
 */
router.get('/', async (req, res) => {

    db.get().collection('projects').find({ "owner": req.cookies.u, $or: [{ hidden: { $exists: false } }, { hidden: false }] })
        .project({ title: true, id: true, owner: true, collaborators: true, viewers: true, documents: true, m: true, creationTime: true })
        .toArray(async (err, projects) => {

            // create map of {projectID: [documentIDs]} for use later...
            let projIDMap = {};
            for (element of projects) {
                projIDMap[element.id] = []
                for (docID of element.documents) {
                    projIDMap[element.id].push(docID);
                }
            }
            
            /**
             * STRUCTURE OF time_map : [userID, converted timestamp, createdFlag] 
             * createdFlag indicates if project was only just created
             */

            let timeMap = {};
            for (element of projects){
                // Determine if the project was created, and has no edits to it...
                const creationCheck = element.m.user;

                if (creationCheck == null) {
                    // Format timeMap such that "created" instead of "edited" is displayed via the projects.ejs file...
                    const outputString = getConvertedTimeString(element.creationTime)
                    timeMap[element.id] = [element.owner, outputString, "Created"];
                    continue                
                }

                const outputString = getConvertedTimeString(element.m.ts)
                timeMap[element.id] = [element.m.user, outputString, null];                
            }


            ejs.renderFile(`app/views/projects.ejs`, { projects_data: projects, time_map: timeMap }, {}, (err, str) => {
                res.send(str);
            });
        });
});

/**
 * Create a new project and redirect them to the editor.
 */
router.get('/new', (req, res) => {
    let project_id = uuid.v4();
    db.get().collection('projects').find({ id: project_id }).toArray((err, projects) => {
        if (projects.length == 0) {
            let document_id = uuid.v4();
            let new_project = {
                title: "New Project",
                id: project_id,
                owner: req.cookies.u,
                collaborators: [],
                viewers: [],
                main: document_id,
                documents: [document_id],
                creationTime: Date.now()
            }
            let new_project_data = `\\documentclass{article}\n\n\\begin{document}\n\tMy New Project\n\\end{document}`;
            let build_dir = `projects/${project_id}`;
            mkdirp(build_dir).then(made => {
                let in_file = build_dir + '/main.tex'
                fs.writeFile(in_file, new_project_data, 'utf8', (e) => {
                    db.get().collection('projects').insertOne(new_project, (err, r) => {
                        res.redirect(`/projects/${project_id}/edit`);
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
        db.get().collection('projects').findOne({ id: req.params.id }, { projection: { title: true, owner: true, collaborators: true, viewers: true, main: true, documents: true } }, (err, project) => {
            if (err) throw err;

            fs.readFile(`./projects/${req.params.id}/main.tex`, (err, data) => {
                if (err) throw err;
                pdata = ((data === undefined) ? "" : data).toString();
                ejs_vars = {
                    brand: config.brand,
                    pid: escape(req.params.id),
                    documents: escape(project.documents),
                    ptitle: escape(project.title),
                    pisviewer: project.viewers.includes(req.cookies.u),
                    puser: req.cookies.u,
                    pdata: escape(((data === undefined) ? "" : data).toString()),
                    powner: project.owner,
                    pcollaborators: project.collaborators,
                    pviewers: project.viewers,
                    pisowner: (project.owner == req.cookies.u),
                    piscollab: project.collaborators.includes(req.cookies.u),
                    paction: null,
                    uuid: require('uuid')
                }

                var connection = sockets.getConnection();
                var doc = connection.get('project_data', project.main);
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
    res.sendFile(req.params.id + '/main.pdf', { root: 'projects' }, (err) => {
        if (err) throw err;
    });
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
    res.send(fs.readFileSync(`./projects/${req.params.id}/main.tex`).toString());
});

/**
 * Return a raw text view of the document.
 *
 * Formatting should be identical, with the exception of tab length, to the editor.
 */
cmdRouter.get('/text', auth.middleware.project.access, (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send('<html><body><pre>' + fs.readFileSync(`./projects/${req.params.id}/main.tex`).toString() + '</pre></body></html>');
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
            db.get().collection('projects').findOneAndDelete({ id: req.params.id }, { projection: { documents: true } }, (err, ret) => {
                db.get().collection('o_project_data').deleteMany({ d: { $in: ret.value.documents } }, (err2, ret2) => {
                    db.get().collection('project_data').deleteOne({ _id: { $in: ret.value.documents } }, (err3, ret3) => {
                        res.redirect('/projects');
                    });
                })
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
        fs.readFile(`./projects/${req.params.id}/main.tex`, (err, data) => {
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
        fs.readFile(`./projects/${req.params.id}/main.tex`, (err, data) => {
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
 * Builds the document using a Docker container and returns it if specified in the post data. (build = true)
 */
cmdRouter.post('/build', auth.middleware.project.modify, (req, res) => {
    function runLBS(project, res) {
        let dir = path.resolve('./projects', project);
        let lbs = spawn('docker', ['run', '--rm', '-i', '--net=none', '-v', `${dir}:/data`, '--name', `lbs-${project}-${uuid.v4()}`, 'latex-full', 'latexmk', '-cd', '-f', '-interaction=batchmode', '-pdf', 'main.tex']);
        lbs.stdout.on("data", data => {
            console.log("stdout: " + data);
        });

        lbs.stderr.on("data", data => {
            console.log("stderr: " + data);
        });

        lbs.on("error", (error) => {
            console.log("err: " + error.message);
        });

        lbs.on("close", code => {
            console.log("code: " + code);
            if (code == 0) {
                let output_url = `http://${config.server.hostname}:${config.server.port}/projects/${req.params.id}/view`;
                let broadcast_data = {
                    actions: [
                        {
                            action: 'viewUpdate',
                            data: output_url
                        }
                    ]
                }
                sockets.broadcastToProject(req.params.id, req.cookies.u, broadcast_data);
                res.send('B0');
            } else {
                res.send("E2");
            }
        });

        // Timeout for compilations taking too long
        setTimeout(() => {
            try {
                lbs.kill();
            } catch (e) {
                console.log("COULD NOT KILL PROCESS.");
                res.send("E1");
            }
        }, 10 * 1000); // 10 second timeout
    }

    let build_dir = 'projects/' + req.params.id;
    mkdirp(build_dir).then(made => {
        let in_file = build_dir + '/main.tex'
        fs.writeFile(in_file, req.body.data, 'utf8', (e) => {
            if (req.body.build == 'true') {
                runLBS(req.params.id, res);
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
    router
};
