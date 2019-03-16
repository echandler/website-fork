import * as utils from "./utils";

export function Zoom_class(thisMap) {
    this.map = thisMap;
    this.zoom_init();
}

Zoom_class.prototype.zoom_init = function() {
    this._zoomLevel = 0;
    this._ZOOM_POWER = [];
    this.originalTransform = { IMG: "", SVG: "" };
    this.getPanOffsetPoint = this.map.getPanOffsetPoint;

    this.map.zoomTo = this.zoomTo.bind(this);

    // Set zoom property on map obj.
    Object.defineProperty(this.map, "zoom", {
        get: () => {
            return this._zoomLevel;
        },
        set: () => {
            /*Don't set zoom this way yet*/
        }
    });

    // Add map event listeners*****************************************************

    this.map.event.on(utils.MOUSE_WHEEL_EVT, p_evt => this.zoomInOut(p_evt), this);

    // this.map.event.on( "zoom end", () => {
    //         if (!this.map.zoomSliderStyle) {
    //             return;
    //         }
    //         let v = 200 - this._zoomLevel / this.map.maxZoom * 200;
    //         this.map.sliderPosition = v;
    //         this.map.zoomSliderStyle.top = v + "px";
    //     },this );
};

Zoom_class.prototype.calcZoomDelta = function(zoomLvl, zoomDelta, minZoom, maxZoom) {
    let zoomInLvl = zoomLvl + zoomDelta;
    let zoomOutLvl = zoomLvl - zoomDelta;

    return {
        maxDelta: zoomInLvl > maxZoom ? zoomDelta - (zoomInLvl - maxZoom) : zoomDelta,
        minDelta: zoomOutLvl < minZoom ? zoomDelta + (zoomOutLvl - minZoom) : zoomDelta
    };
};

Zoom_class.prototype.zoomTo = function(projPoint, zoom, projOrigin) {
    let convertPoint = this.map.convertProjPointToPixelPoint.bind(this.map);
    let _point = convertPoint(projPoint);
    let zoomSign = zoom > this.map.zoom ? 1 : -1;
    let zoomDiff = zoom - this.map.zoom;
    let scale = 1 + 1 / (2 ** zoomDiff - 1);
    let center = {
        x: this.map.mapContainer.width / 2,
        y: this.map.mapContainer.height / 2
    };

    let _origin = (projOrigin && convertPoint(projOrigin)) || center;

    let distanceX = _point.x - _origin.x;
    let distanceY = _point.y - _origin.y;
    let simMouseX = _origin.x + distanceX * scale;
    let simMouseY = _origin.y + distanceY * scale;

    if (zoom === this.map.zoom) {
        //this.map.panning_module.panTo(origin || projPoint, 500);
        return;
    }

    // Simulate a mouse wheel event.
    this.map.eventDelgationHandler(
        {
            containerX: simMouseX,
            containerY: simMouseY,
            ___delta: zoomSign * 120,
            css: {
                className: "easeout"
            },
            zoomDelta: Math.abs(zoomDiff)
        },
        utils.MOUSE_WHEEL_EVT
    );
};

Zoom_class.prototype.setZoomLvl = function(p_zoomLevel) {
    this._zoomLevel = p_zoomLevel;

    return this._zoomLevel;
};

Zoom_class.prototype.getZoomLvl = function() {
    return this._zoomLevel;
};

Zoom_class.prototype.zoomInOut = function(p_evt) {
    if (p_evt.scale === 1) {
        return;
    }

    if (this.map.state.zooming === true) {
        //this._zoom(point, zoomDirection, scale);
        this.map.event.fire("zoom end", p_evt);
        return;
    }

    this.map.state.zooming = true;

    this.map.event.fire("prezoom", p_evt);
    this.map.event.fire("zoom end", p_evt);
};
