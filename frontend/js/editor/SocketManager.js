const AceManager = require("./AceManager");
const md5 = require("md5");
const uuid = require("uuid");
const { AceCursorManager } = require("./AceCursorManager");
const sharedb = require("sharedb/lib/client");
const json1 = require('ot-json1');
const { CompileLaTeX } = require("./CompileLaTeX");
const ReconnectingWebSocket = require("reconnecting-websocket").default;

sharedb.types.register(json1.type);
var socket = new ReconnectingWebSocket('ws://' + window.location.hostname + ':3080/api/' + pid, [], {});
var connection = new sharedb.Connection(socket);

socket.addEventListener('open', function () {
    console.log('Connected');
});

socket.addEventListener('close', function () {
    console.log('Closed');
});

socket.addEventListener('error', function () {
    console.log('Error');
});

var doc = connection.get('project_data', pid);

var path = [];
var suppressed = false;
var my_id = uuid.v4();

doc.subscribe(function (err) {
    if (err) throw err;
    let aceEditorLeft = AceManager.get();
    aceEditorLeft.setValue(doc.data);
    aceEditorLeft.moveCursorTo(0, 0);

    var manager = new AceCursorManager(aceEditorLeft.getSession());
    var sock2 = new ReconnectingWebSocket('ws://' + window.location.hostname + ':3080/api/extras/' + pid);

    let colors = ["#f44336", "#e91e63", "#9c27b0", "#3f51b5", "#673ab7", "#009688", "#ff5722", "#4caf50", "#9a0036"];

    let last_user_ping = {}

    function removeOffline(offline = 5000) {
        setTimeout(() => {
            let now = Date.now();
            for (let username in last_user_ping) {
                if (now - last_user_ping[username].last > offline) {
                    $(`#usericon${last_user_ping[username].md5}`).remove();
                    delete last_user_ping[username];
                    try {
                        manager.removeCursor(username);
                    } catch (e) {
                        console.log(`User cursor now found: ${username}`);
                    }
                }
            }
            removeOffline();
        }, offline);
    }
    removeOffline();

    sock2.onmessage = (e) => {
        let data = JSON.parse(e.data);
        if (data.isPing) {
            let usermd5 = undefined;
            if (data.username in last_user_ping) {
                usermd5 = last_user_ping[data.username].md5;
            } else {
                usermd5 = md5(data.username);
                last_user_ping[data.username] = { md5: usermd5 };
            }
            last_user_ping[data.username].last = Date.now();
            if (!$(`#usericon${usermd5}`).length) {
                $('#user-presence').append(`<img id='usericon${usermd5}' title='${data.username}' src="https://www.gravatar.com/avatar/${usermd5}?d=identicon" class="rounded-lg border-light" style="margin-left:2px;" width="26" height="26">`);
            }
        }
        data.actions.forEach(element => {
            if (element.action == 'cursorUpdate') {
                let position = {
                    start: element.start,
                    end: element.end
                }
                try {
                    manager.setCursor(data.username, position, !data.isPing);
                } catch (err) {
                    let user_color = colors[Math.floor(Math.random() * colors.length)];
                    manager.addCursor(data.username, data.username, user_color, position);
                }
            }
        });
    };

    let last_pos = null;
    function sendPing(isPing = false, override = false) {
        if (sock2.readyState === 1) {
            const selectionRange = aceEditorLeft.getSelectionRange();
            var data = {
                isPing: isPing,
                actions: [
                    {
                        action: 'cursorUpdate',
                        start: selectionRange.start,
                        end: selectionRange.end
                    }
                ]
            }
            if (override || (last_pos !== null &&
                !(last_pos.start.row == data.actions[0].start.row &&
                    last_pos.start.column == data.actions[0].start.column &&
                    last_pos.end.row == data.actions[0].end.row &&
                    last_pos.end.column == data.actions[0].end.column))) {
                sock2.send(JSON.stringify(data));
            }
            last_pos = data.actions[0];
        }
    }
    aceEditorLeft.on('changeSelection', () => {
        sendPing(false);
    });

    function ping() {
        setTimeout(() => {
            sendPing(true, true);
            ping();
        }, 2500);
    }
    ping();

    CompileLaTeX(true);
    aceEditorLeft.on('change', (delta) => {
        if (!suppressed) {
            const aceDoc = aceEditorLeft.getSession().getDocument();

            const op = {};

            const start = aceDoc.positionToIndex(delta.start);
            const end = aceDoc.positionToIndex(delta.end);

            op.p = path.concat(start);

            let action;
            if (delta.action === 'insert') {
                action = 'si';
            } else if (delta.action === 'remove') {
                action = 'sd';
            } else {
                throw new Error(`action ${action} not supported`);
            }
            const str = delta.lines.join('\n');
            op[action] = str;

            const docSubmitted = (err) => {
                if (err) throw err;
            };

            doc.submitOp(op, { source: my_id }, docSubmitted);
        }
    });
    doc.on('op', (ops, source) => {
        const opsPath = ops[0].p.slice(0, ops[0].p.length - 1).toString();

        if (source === my_id) {
            console.log('*remote*: op origin is self; _skipping_');
            return;
        } else if (opsPath !== path.toString()) {
            console.log('*remote*: not from my path; _skipping_');
            return;
        }

        const deltas = opTransform(ops);

        suppressed = true;
        aceEditorLeft.getSession().getDocument().applyDeltas(deltas);
        suppressed = false;
    });
});

function opTransform(ops) {
    function opToDelta(op) {
        let aceEditorLeft = AceManager.get();
        const index = op.p[op.p.length - 1];
        const pos = aceEditorLeft.getSession().getDocument().indexToPosition(index, 0);
        const start = pos;
        let action;
        let lines;
        let end;
        if ('sd' in op) {
            action = 'remove';
            lines = op.sd.split('\n');
            const count = lines.reduce((total, line) => total + line.length, lines.length - 1);
            end = aceEditorLeft.getSession().getDocument().indexToPosition(index + count, 0);
        } else if ('si' in op) {
            action = 'insert';
            lines = op.si.split('\n');
            if (lines.length === 1) {
                end = {
                    row: start.row,
                    column: start.column + op.si.length,
                };
            } else {
                end = {
                    row: start.row + (lines.length - 1),
                    column: lines[lines.length - 1].length,
                };
            }
        } else {
            throw new Error(`Invalid Operation: ${JSON.stringify(op)}`);
        }
        const delta = {
            start,
            end,
            action,
            lines,
        };
        return delta;
    }
    const deltas = ops.map(opToDelta);
    return deltas;
}