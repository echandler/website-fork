import * as utils from './utils';
import {NewMap} from './Main_class';

NewMap.prototype.calcZoomDelta = function(
    zoomLvl,
    zoomDelta,
    minZoom,
    maxZoom,
) {
    let zoomInLvl = zoomLvl + zoomDelta;
    let zoomOutLvl = zoomLvl - zoomDelta;

    return {
        maxDelta:
            zoomInLvl > maxZoom ? zoomDelta - (zoomInLvl - maxZoom) : zoomDelta,
        minDelta:
            zoomOutLvl < minZoom
                ? zoomDelta + (zoomOutLvl - minZoom)
                : zoomDelta,
    };
};

NewMap.prototype.zoomTo = function(projPoint, zoom, projOrigin) {
    let convertPoint = this.convertProjPointToPixelPoint.bind(this);
    let _point = convertPoint(projPoint);
    let zoomSign = zoom > this.zoom ? 1 : -1;
    let zoomDiff = zoom - this.zoom;
    let scale = 1 + 1 / (2 ** zoomDiff - 1);
    let center = {
        x: this.mapContainer.width / 2,
        y: this.mapContainer.height / 2,
    };

    let _origin = (projOrigin && convertPoint(projOrigin)) || center;

    let distanceX = _point.x - _origin.x;
    let distanceY = _point.y - _origin.y;
    let simMouseX = _origin.x + distanceX * scale;
    let simMouseY = _origin.y + distanceY * scale;

    if (zoom === this.zoom) {
        //this.map.panning_module.panTo(origin || projPoint, 500);
        return;
    }

    // Simulate a mouse wheel event.
    this.eventDelgationHandler(
        {
            containerX: simMouseX,
            containerY: simMouseY,
            ___delta: zoomSign * 120,
            css: {
                className: 'easeout',
            },
            zoomDelta: Math.abs(zoomDiff),
        },
        utils.MOUSE_WHEEL_EVT,
    );
};

NewMap.prototype.zoomInOut = function(p_evt) {
    if (p_evt.scale === 1) {
        return;
    }

    if (this.state.zooming === true) {
        this.event.fire('zoom end', p_evt);
        return;
    }

    this.state.zooming = true;

    this.event.fire('prezoom', p_evt);
    this.event.fire('zoom end', p_evt);
};
