import * as utils from './utils';
import {NewMap} from './Main_class';

Object.assign(NewMap.prototype, {
    panMouseDown,
    _panMouseDown,
    panMouseUp,
    _panMouseUp,
    panRemoveEventListeners,
    panInitialTasks,
    panDragOnly,
    panDragAndAnimation,
    panTo,
    panByPixels,
    panStartAnimation,
    panStopAnimation,
    enablePanning,
    disablePanning,
});

NewMap.onInitDone(function() {
    this.enablePanning();

    this.pan = {
        mainContainerXY: null,
        mouseDownX: null,
        mouseDownXOffset: null,
        mouseDownY: null,
        mouseDownYOffset: null,
        points: null,
        spCoords: null,
        transitionResetTimeout: null,
        panningFunction: this.panDragAndAnimation.bind(this),
        boundEventListeners: {
            panMouseUp: this.panMouseUp.bind(this),
            panInitialTasks: this.panInitialTasks.bind(this),
            panRemoveEventListeners: this.panRemoveEventListeners.bind(this),
        },
    };

    this.pan.boundEventListeners.panningFunction = this.pan.panningFunction.bind(this);
}, null);

function panMouseDown(e) {
    // Do something here?
    this._panMouseDown(e);
}

function _panMouseDown(e) {
    let evt = e.__event__;
    let pan = this.pan;
    let listeners = this.pan.boundEventListeners;

    evt.preventDefault();
    pan.mouseDownX = evt.clientX;
    pan.mouseDownY = evt.clientY;
    pan.mouseDownXOffset = evt.clientX - this.mainContainer.left;
    pan.mouseDownYOffset = evt.clientY - this.mainContainer.top;

    pan.points = []; // TODO: testing

    this.panStopAnimation();

    pan.mainContainerXY = {
        x: this.mainContainer.left,
        y: this.mainContainer.top,
    };

    pan.spCoords = {
        x: this.extent.visible.x,
        X: this.extent.visible.X,
        y: this.extent.visible.y,
        Y: this.extent.visible.Y,
    };

    // TODO: create add eventlistener function.
    document.addEventListener('mouseup', listeners.panMouseUp);
    document.addEventListener('mouseout', listeners.panRemoveEventListeners);
    document.addEventListener('mousemove', listeners.panInitialTasks);
    document.addEventListener('mousemove', listeners.panningFunction);
}

function panMouseUp(e) {
    // mouse up for the image
    if (e.relatedTarget) {
        return;
    }

    e.preventDefault();

    this.panRemoveEventListeners(e);

    this._panMouseUp(e);
    //this.event.fire("map mouse up", e);
}

function _panMouseUp(e) {
    let evt = e.__event__ || e;
    let pan = this.pan;

    if (evt.clientY - pan.mouseDownY !== 0 || evt.clientX - pan.mouseDownX !== 0) {
        this.panStartAnimation(evt);

        // prettier-ignore
        this.updateStatePlaneCoordsByDistance(
                this.mainContainer.left - pan.mainContainerXY.x,
                this.mainContainer.top - pan.mainContainerXY.y,
                pan.spCoords
            );

        this.event.fire('pan end');
    }

    this.state.panning = false;
}

function panRemoveEventListeners(e) {
    let listeners = this.pan.boundEventListeners;

    if (e.relatedTarget) {
        return;
    }

    e.preventDefault();

    document.removeEventListener('mouseup', listeners.panMouseUp);
    document.removeEventListener('mouseout', listeners.panRemoveEventListeners);
    document.removeEventListener('mousemove', listeners.panInitialTasks);
    document.removeEventListener('mousemove', listeners.panningFunction);
}

function panInitialTasks(e) {
    // This function is called once and immediately removed just to make the
    // panning feel smoother.
    if (e.clientY - this.pan.mouseDownY === 0 && e.clientX - this.pan.mouseDownX === 0) {
        // A bug in chrome will call this function if a mousedown event happens.
        // Bug hasn't been fixed in atleast chrome version 51.0.2704.103
        // and earlier.

        return;
    }

    this.mainContainer.element.style[utils.CSS_TRANSITION] = '';

    // End any zooming activity
    //this.Zoom_class.zoomStop();

    this.state.panning = true;

    document.removeEventListener('mousemove', panInitialTasks);
    this.event.fire('pan initial', e);
}

function panDragOnly(e) {
    let mainCont = this.mainContainer;
    let x = mainCont.left + (e.clientX - this.pan.mouseDownX);
    let y = mainCont.top + (e.clientY - this.pan.mouseDownY);

    // prettier-ignore
    mainCont.element.style[utils.CSS_TRANSFORM] = 
                               "translate("+ x +"px, "+ y +"px)";
}

function panDragAndAnimation(e) {
    let mainCont = this.mainContainer;
    let pan = this.pan;

    let distanceX = pan.mainContainerXY.x + e.clientX - pan.mouseDownX,
        distanceY = pan.mainContainerXY.y + e.clientY - pan.mouseDownY;

    mainCont.top = distanceY;
    mainCont.left = distanceX;

    this.pan.points.push({
        x: distanceX,
        y: distanceY,
        time: Date.now(),
    });

    // prettier-ignore
    mainCont.element.style[utils.CSS_TRANSFORM] =
            "translate3d("+ distanceX +"px, "+ distanceY +"px, 0px)";

    this.event.fire('pan', e);
}

function panTo(spPoint, panTime) {
    let pxlPoint = this.getPixelPointInMapContainer.bind(this);
    let convertSpToPxl = this.convertProjPointToPixelPoint.bind(this);

    let centerPxls = pxlPoint({
        x: this.mapContainer.left + this.mapContainer.width / 2,
        y: this.mapContainer.top + this.mapContainer.height / 2,
    });
    let pointOfInterestPxl = convertSpToPxl(spPoint);
    let distance = {
        x: centerPxls.x - pointOfInterestPxl.x,
        y: centerPxls.y - pointOfInterestPxl.y,
    };

    this.panByPixels(distance, panTime);

    return this;
}

function panByPixels(spPoint, panTime) {
    let mainCont = this.mainContainer;
    let vectorLen = Math.sqrt(spPoint.x * spPoint.x + spPoint.y * spPoint.y);

    // Played around with this on a graphing website, might want to revisit in the future.
    let max = Math.max(200, vectorLen * (500 * (0.45 / vectorLen ** 0.9) + 0.06));
    let time = panTime || Math.min(1000, max);

    mainCont.left += Math.round(spPoint.x);
    mainCont.top += Math.round(spPoint.y);

    this.updateStatePlaneCoordsByDistance(spPoint.x, spPoint.y);

    // prettier-ignore
    {
            // Block for prettier-ignore
            mainCont.element.style[utils.CSS_TRANSITION] =
                "all " + time + "ms cubic-bezier(0, 0, 0.25, 1)";

            mainCont.element.style[utils.CSS_TRANSFORM] =
                "translate3d(" + mainCont.left + "px," + mainCont.top + "px,0px)";
        }

    setTimeout(() => {
        mainCont.element.style[utils.CSS_TRANSITION] = null;
    }, time);

    this.event.fire('pan end', {panEndTime: time});
}

function panStartAnimation(e) {
    let transistionDurationMS = 2200;

    let points = this.pan.points;

    if (points.length < 3 || Date.now() - points[points.length - 1].time > 150) {
        return;
    }

    let startPoint = points[points.length - 1];
    let offsetPoint = points[points.length - 3];

    let deltaA = points[points.length - 2],
        deltaB = points[points.length - 3],
        deltaX = deltaA.x - deltaB.x,
        deltaY = deltaA.y - deltaB.y,
        angle = Math.atan2(deltaY, deltaX);

    let pLen = points.length;
    // prettier-ignore
    let time = (
                       (points[pLen-1].time - points[pLen-2].time) 
                     + (points[pLen-2].time - points[pLen-3].time)
                   ) / 2;

    let offsetX = startPoint.x - offsetPoint.x,
        offsetY = startPoint.y - offsetPoint.y;

    let dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    let speed = dist / time;

    if (dist <= 2 || time === 0) {
        clearTimeout(this.pan.transitionResetTimeout);
        return;
    }

    // Calculate distance needed to travel.
    // graph -> https://www.desmos.com/calculator/wopqdbru4y
    let dampen = Math.sqrt(Math.log10(Math.log10(speed ** 3 + 1) ** 15 + 1)) ** 0.07 / 4;

    let vectorLength = speed ** 1.09 * 400 * dampen;
    //speed**0.6 * (40 * Math.sqrt(speed**1.6));
    //speed * (20 * Math.sqrt(speed));
    //speed * 150 - 60; // Found this magic number through trial and error.

    transistionDurationMS *= dampen;

    // New vector.
    let vector = {
        rise: vectorLength * Math.sin(angle),
        run: vectorLength * Math.cos(angle),
    };

    // Calculate the final x and y positions for the animation.
    // Rounding the coordinates so that the text on the markers in chrome is not blurry.
    let finishPoint = {
        x: Math.round(vector.run + startPoint.x),
        y: Math.round(vector.rise + startPoint.y),
    };

    this.mainContainer.left = finishPoint.x;
    this.mainContainer.top = finishPoint.y;

    // prettier-ignore
    this.mainContainer.element
            .style[utils.CSS_TRANSITION] = "transform " + transistionDurationMS +
            "ms cubic-bezier(0, 0, 0.3, 1)";

    // prettier-ignore
    this.mainContainer.element
            .style[utils.CSS_TRANSFORM] = "translate3d(" + finishPoint.x + "px," +
            finishPoint.y + "px, 0px)";

    // Reset transition.
    clearTimeout(this.pan.transitionResetTimeout);

    this.pan.transitionResetTimeout = setTimeout(
        function() {
            this.mainContainer.element.style[utils.CSS_TRANSITION] = '';
        }.bind(this),
        transistionDurationMS,
    );
}

function panStopAnimation(e) {
    // prettier-ignore
    let posOnBezierCurve = document.defaultView
            .getComputedStyle(this.mainContainer.element)
            .transform.match(/(-?\d*.?\d*), (-?\d*.?\d*)\)$/);

    if (!posOnBezierCurve) {
        return;
    }

    let x = Math.round(posOnBezierCurve[1]), //Math.round(pan.anim.startPoint.x - ((pan.anim.startPoint.x - pan.anim.endPoint.x) * posOnBezierCurve)),
        y = Math.round(posOnBezierCurve[2]); //Math.round(pan.anim.startPoint.y - ((pan.anim.startPoint.y - pan.anim.endPoint.y) * posOnBezierCurve));

    this.updateStatePlaneCoordsByDistance(
        x - this.mainContainer.left,
        y - this.mainContainer.top,
    );

    this.mainContainer.element.style[utils.CSS_TRANSFORM] =
        'translate(' + x + 'px,' + y + 'px)';

    this.mainContainer.top = y;
    this.mainContainer.left = x;

    this.event.fire('stopPanAnimation');
}

function enablePanning() {
    this.event.on(utils.MOUSE_WHEEL_EVT, this.panStopAnimation, this);
    this.event.on('mousedown', this.panMouseDown, this);
    this.event.on('panTo', this.panTo, this);
}

function disablePanning() {
    this.event.off(utils.MOUSE_WHEEL_EVT, this.panStopAnimation, this);
    this.event.off('mousedown', this.panMouseDown, this);
    this.event.off('panTo', this.panTo, this);
}
