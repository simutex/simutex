class AceCursorMarker {
    constructor(session,
        cursorId,
        label,
        color,
        position) {

        this._session = session;
        this._label = label;
        this._color = color;
        this._position = position;
        this._cursorId = cursorId;
        this._id = null;
        this._visible = false;
        this._tooltipTimeout = null;

        // Create the HTML elements
        this._markerElement = document.createElement("div");
        this._markerElement.style.zIndex = "2";

        this._cursorElement = document.createElement("div");
        this._cursorElement.className = "ace-multi-cursor";
        this._cursorElement.style.background = this._color;
        this._markerElement.append(this._cursorElement);

        this._cursorHat = document.createElement("div");
        this._cursorHat.className = "ace-multi-cursor-hat";
        this._cursorHat.style.background = this._color;
        this._markerElement.append(this._cursorHat);

        this._tooltipElement = document.createElement("div");
        this._tooltipElement.className = "ace-multi-cursor-tooltip";
        this._tooltipElement.style.background = this._color;
        this._tooltipElement.style.opacity = "1";
        this._tooltipElement.innerHTML = label;
        this._markerElement.append(this._tooltipElement);

        this._forceSessionUpdate();
        this._scheduleTooltipHide();
    }

    update(html, markerLayer, session, layerConfig) {
        if (this._position === null) {
            return;
        }

        this._markerElement.querySelectorAll('.ace-multi-highlight').forEach(e => e.remove());

        function addHighlight(width, left, top, color, markerElement) {
            let highlight = document.createElement("div");
            highlight.className = "ace-multi-highlight";
            highlight.style.background = color;
            highlight.style.opacity = "0.125";
            highlight.style.height = `${layerConfig.lineHeight}px`;
            highlight.style.width = width;
            highlight.style.left = `${markerLayer.$padding + left}px`;
            highlight.style.top = `${top}px`;
            highlight.style.position = 'absolute';

            markerElement.append(highlight);
        }

        let screenStart = session.documentToScreenPosition(this._position.start.row, this._position.start.column);
        let screenEnd = session.documentToScreenPosition(this._position.end.row, this._position.end.column);
        if (screenStart.row == screenEnd.row) {
            // single line
            let width = ((screenEnd.column - screenStart.column) * layerConfig.characterWidth) + 'px';
            let left = screenStart.column * layerConfig.characterWidth;
            let top = screenStart.row * layerConfig.lineHeight;

            addHighlight(width, left, top, this._color, this._markerElement);
        } else {
            // multiline
            for (let row = screenStart.row; row <= screenEnd.row; row++) {
                let width = "100%";
                let left = 0;
                let top = row * layerConfig.lineHeight;

                if (row == screenStart.row) {
                    left = screenStart.column * layerConfig.characterWidth;
                } else if (row == screenEnd.row) {
                    width = (screenEnd.column * layerConfig.characterWidth) + 'px';
                }
                addHighlight(width, left, top, this._color, this._markerElement);
            }
        }

        const screenPosition = session.documentToScreenPosition(this._position.end.row, this._position.end.column);
        const top = markerLayer.$getTop(screenPosition.row, layerConfig);
        const left = markerLayer.$padding + screenPosition.column * layerConfig.characterWidth;
        const height = layerConfig.lineHeight;

        const cursorTop = top + 2;
        const cursorHeight = height;
        const cursorLeft = left;
        const cursorWidth = 2;

        this._cursorElement.style.height = `${cursorHeight}px`;
        this._cursorElement.style.width = `${cursorWidth}px`;
        this._cursorElement.style.top = `${cursorTop - 2}px`;
        this._cursorElement.style.left = `${cursorLeft}px`;
        this._cursorElement.style.position = "absolute";
        this._cursorElement.style.boxShadow = "0px 0px 5px #fff";

        let toolTipTop = cursorTop - height;
        let cursorHatTop = cursorTop - 8;
        if (toolTipTop < 5) {
            toolTipTop = cursorTop + height - 1;
            cursorHatTop = cursorTop + height - 2;
        }

        this._cursorHat.style.height = '6px';
        this._cursorHat.style.width = '6px';
        this._cursorHat.style.top = `${cursorHatTop}px`;
        this._cursorHat.style.left = `${cursorLeft - 2}px`;
        this._cursorHat.style.position = "absolute";
        this._cursorHat.style.boxShadow = "0px 0px 5px #fff";

        const toolTipLeft = cursorLeft;
        this._tooltipElement.style.top = `${toolTipTop - 2}px`;
        this._tooltipElement.style.left = `${toolTipLeft - 2}px`;
        this._tooltipElement.style.height = `${height + 2}px`;
        this._tooltipElement.style.lineHeight = `${height + 2}px`;
        this._tooltipElement.style.width = `${(this._label.length * layerConfig.characterWidth) + 5}px`
        this._tooltipElement.style.paddingLeft = "2px";
        this._tooltipElement.style.borderRadius = "2px";
        this._tooltipElement.style.color = "white";
        this._tooltipElement.style.position = "absolute";
        this._tooltipElement.style.boxShadow = "0px 0px 5px #fff";

        this._markerElement.remove();
        markerLayer.elt("remote-cursor", "");
        const parentNode = markerLayer.element.childNodes[markerLayer.i - 1] || markerLayer.element.lastChild;
        parentNode.appendChild(this._markerElement);
    }

    setPosition(position, tooltip) {
        this._position = this._convertPosition(position);
        this._forceSessionUpdate();
        if (tooltip) {
            this._tooltipElement.style.opacity = "1";
            this._scheduleTooltipHide();
        }
    }

    setVisible(visible) {
        const old = this._visible;

        this._visible = visible;
        if (old !== this._visible) {
            this._markerElement.style.visibility = visible ? "visible" : "hidden";
            this._forceSessionUpdate();
        }
    }

    isVisible() {
        return this._visible;
    }

    cursorId() {
        return this._cursorId;
    }

    markerId() {
        return this._id;
    }

    getLabel() {
        return this._label;
    }

    _forceSessionUpdate() {
        this._session._signal("changeFrontMarker");
    }

    _convertPosition(position) {
        if (position === null) {
            console.log('null');
            return null;
        } else if (typeof position === "number") {
            return this._session.getDocument().indexToPosition(position, 0);
        } else if (typeof position.end.row === "number" && typeof position.end.column === "number") {
            return position;
        }

        throw new Error(`Invalid position: ${position}`);
    }

    _scheduleTooltipHide() {
        if (this._tooltipTimeout !== null) {
            clearTimeout(this._tooltipTimeout);
        }

        this._blink = false;
        this._tooltipTimeout = setTimeout(() => {
            this._tooltipElement.style.opacity = "0";
            this._tooltipTimeout = null;
            this._blink = true;
        }, 2000);
    }
}

module.exports = {
    AceCursorMarker: AceCursorMarker
}