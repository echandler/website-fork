import { BasicInteractiveElement } from "./../BasicInteractiveElement_class";
import { toPoint, convertSPToWGS84 } from "./../coordinate_module";
import * as utils from "./../utils.js";

export class BaseMarkerClass extends BasicInteractiveElement {
    constructor(elem) {
        super(elem);

        elem.style.bottom = "0px";

        this.element = elem;

        this.offsetPos = { x: 0, y: 0 };

        this.on("click", function(e) {
            e.stopPropagation();
        });

        this.on("mousedown", function(e) {
            e.stopPropagation();
        });

        this.on("appendedToMap", e => {
            this.map.event.on("zoom end", this._zoomEndCallback, this);
            this.map.event.on("update everything", this._zoomEndCallback, this);

            this.appendedToMap = true;

            this.updatePos();
        });
    }

    setCoords(spPoint) {
        spPoint = toPoint(spPoint);

        this.statePlanePoint = spPoint;

        this.zIndex = 1e6 - this.statePlanePoint.y.toFixed(0);
        this.element.style.zIndex = this.zIndex;

        this.wgs84XPoint = convertSPToWGS84(spPoint.x, spPoint.y);

        if (this.appendedToMap) {
            this.updatePos();
        }

        return this;
    }

    setOffsetPos(point) {
        this.offsetPos = this.map.toPoint(point);

        return this;
    }

    addToMap(arg_map) {
        let thisMarker = this;
        let map = arg_map;

        if (!this.statePlanePoint.x) {
            throw Error("Set coordinates before appending marker.");
        }

        this.map = arg_map;

        map.addTo(this.element, map.markerContainer.element, function(e) {
            thisMarker.fire("appendedToMap", e);
        });

        return this;
    }

    show() {
        if (this.element.parentNode) {
            this.updatePos();
            return this;
        }

        this.addToMap(this.map);

        return this;
    }

    hide() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
            this.appendedToMap = false;
        }
        this.map.event.off("map load end", this.updatePos, this);
        this.map.event.off("zoom end", this._zoomEndCallback, this);

        return this;
    }

    _zoomEndCallback(e) {
        var className = (e.css && e.css.className) || "marker_zoom_transition";

        this.element.classList.add(className);

        this.updatePos();

        clearTimeout(this.zoomAnimTimer);
        this.zoomAnimTimer = setTimeout(this.element.classList.remove.bind(this.element.classList, className), 350);
    }

    delete() {
        this.hide();
        this.deleted = true;

        this.fire("delete", this);
        return this;
    }

    panIntoView() {
        if (!this.appendedToMap) {
            console.error(this, "<- That has to be added to a map before calling panIntoView().");
            return this;
        }
        var mapCont = this.map.mapContainer;
        var rect = this.element.getBoundingClientRect();
        var padding = 5;
        var point = { x: 0, y: 0 };

        if (rect.top < mapCont.top + 5) {
            point.y = mapCont.top - rect.top + 5;
        }

        if (rect.left < mapCont.left + padding) {
            point.x = mapCont.left - rect.left + padding;
        } else if (rect.left + rect.width > mapCont.left + mapCont.width - padding) {
            point.x = mapCont.left + mapCont.width - (rect.left + rect.width) - padding;
        }

        if (point.x || point.y) {
            this.map.panning_module.panByPixels(point);
        }
    }

    updatePos() {
        if (!this.appendedToMap) {
            return this;
        }

        this.fire("preUpdatePos", this);

        var point = this.map.convertProjPointToOffsetPixelPoint(this.statePlanePoint);

        point.x = ~~(point.x + this.offsetPos.x);
        point.y = ~~(point.y + this.offsetPos.y);

        this.element.style[utils.CSS_TRANSFORM] = "translate(" + point.x + "px, " + point.y + "px)";

        this.fire("postUpdatePos", this);

        return this;
    }
}
