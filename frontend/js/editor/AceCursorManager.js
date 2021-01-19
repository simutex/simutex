const { AceCursorMarker } = require("./AceCursorMarker");

class AceCursorManager {
    constructor(session) {
        this._session = session;
        this._cursors = {};
    }

    addCursor(id, label, color, position) {
        if (this._cursors[id] !== undefined) {
            throw new Error(`Cursor with id already defined: ${id}`);
        }

        const marker = new AceCursorMarker(this._session, id, label, color, position);

        this._cursors[id] = marker;
        this._session.addDynamicMarker(marker, true);
    }

    setCursor(id, position, tooltip = false) {
        const cursor = this._getCursor(id);

        cursor.setPosition(position, tooltip);
    }

    clearCursor(id) {
        const cursor = this._getCursor(id);

        cursor.setPosition(null);
    }

    removeCursor(id) {
        const cursor = this._cursors[id];

        if (cursor === undefined) {
            throw new Error(`Cursor not found: ${id}`);
        }

        this._session.removeMarker(cursor.id);
        delete this._cursors[id]
    }

    removeAll() {
        Object.getOwnPropertyNames(this._cursors).forEach((key) => {
            this.removeCursor(this._cursors[key].cursorId());
        });
    }

    _getCursor(id) {
        const cursor = this._cursors[id];

        if (cursor === undefined) {
            throw new Error(`Cursor not found: ${id}`);
        }

        return cursor;
    }
}

module.exports = {
    AceCursorManager: AceCursorManager
}