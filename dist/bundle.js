/* Fancy new Rollup.js banner! */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.NewMap = {}));
}(this, function (exports) { 'use strict';

    class BasicEventSystem {
        constructor() {
            this.eventsObj = {};
        }

        on(p_type, p_func, opt_this) {
            if (!this.eventsObj.hasOwnProperty(p_type)) {
                this.eventsObj[p_type] = [];
            }

            this.eventsObj[p_type].push({ fn: p_func, _this: opt_this });

            return true;
        }

        off(p_type, p_func, opt_this) {

            if (!this.eventsObj.hasOwnProperty(p_type)) {
                return false;
            }
            let evtArray = this.eventsObj[p_type];

            for (var n = 0; n < evtArray.length; n++) {
                if (evtArray[n].fn === p_func && evtArray[n]._this === opt_this) {
                    evtArray[n].fn = this._zombieFn;
                }
            }

            this.clean(p_type);
        }

        _zombieFn() {
            return "Zombie callback works real hard.";
        }

        clean(p_type) {
            if (this._delZombies) {
                this._delZombies(p_type);
            } else {
                setTimeout(this.clean.bind(this, p_type), 1000);
            }
        }

        _delZombies(p_type) {
            if (!this.eventsObj.hasOwnProperty(p_type)) {
                return false;
            }

            for (var n = 0; n < this.eventsObj[p_type].length; n++) {
                if (this.eventsObj[p_type][n].fn === this._zombieFn) {
                    this.eventsObj[p_type].splice(n, 1);
                    --n;
                }
            }
        }

        allOff(p_this) {
            var evtObj = this.eventsObj;
            var types = Object.keys(evtObj);

            for (var m = 0; m < types.length; m++) {
                for (var n = evtObj[types[m]].length - 1; n >= 0; n--) {
                    if (evtObj[types[m]][n]._this === p_this) {
                        evtObj[types[m]][n].fn = this._zombieFn;
                    }

                    this.clean(types[m]);
                }
            }
        }

        fire(p_type, opt_evt) {
            if (!this.eventsObj.hasOwnProperty(p_type)) {
                return false;
            }

            let evtArray = this.eventsObj[p_type];
            let pointerTo_delZombies = this._delZombies;
            this._delZombies = false;

            for (let n = 0; n < evtArray.length; n++) {
                evtArray[n].fn.call(evtArray[n]._this, opt_evt);
            }

            this._delZombies = pointerTo_delZombies;
        }
    }

    function testProp(props) {
        // Got this from leaflet
        var style = document.documentElement.style;

        for (var i = 0; i < props.length; i++) {
            if (props[i] in style) {
                return props[i];
            }
        }

        return false;
    }

    let CSS_TRANSFORM = testProp([
        'transform',
        'WebkitTransform',
        'OTransform',
        'MozTransform',
        'msTransform',
    ]);
    let CSS_TRANSITION = testProp([
        'transition',
        'WebkitTransition',
        'OTransition',
        'MozTransition',
        'msTransition',
    ]);

    //https://developer.mozilla.org/en-US/docs/Web/Events/wheel#Browser_compatibility
    let MOUSE_WHEEL_EVT =
        'onwheel' in document.createElement('div')
        ? 'wheel' // Modern browsers support "wheel"
        : document.onmousewheel !== undefined
        ? 'mousewheel' // Webkit and IE support at least "mousewheel"
        : 'DOMMouseScroll'; // let's assume that remaining browsers are older Firefox

    function panning_module(thisMap) {
        let transitionResetTimeout = undefined;

        thisMap.pan = {
            mainContainerXY: null,
            mouseDownX: null,
            mouseDownXOffset: null,
            mouseDownY: null,
            mouseDownYOffset: null,
            panningFunction: mapDragAndAnimation,
            points: null,
            spCoords: null,
        };

        function mouseDown(e) {
            // Do something here?
            private_panningMouseDown(e);
        }

        function private_panningMouseDown(e) {
            let evt = e.__event__;
            let pan = thisMap.pan;

            evt.preventDefault();
            pan.mouseDownX = evt.clientX;
            pan.mouseDownY = evt.clientY;
            pan.mouseDownXOffset = evt.clientX - thisMap.mainContainer.left;
            pan.mouseDownYOffset = evt.clientY - thisMap.mainContainer.top;

            pan.points = []; // TODO: testing

            stopPanAnimation();

            pan.mainContainerXY = {
                x: thisMap.mainContainer.left,
                y: thisMap.mainContainer.top,
            };

            pan.spCoords = {
                x: thisMap.extent.visible.x,
                X: thisMap.extent.visible.X,
                y: thisMap.extent.visible.y,
                Y: thisMap.extent.visible.Y,
            };

            document.addEventListener(
                'mouseout',
                private_removePanningEventListeners,
            );
            document.addEventListener('mouseup', private_mapMouseUp);
            document.addEventListener('mousemove', mapInitialDragTasks);
            document.addEventListener('mousemove', thisMap.pan.panningFunction);
        }

        function private_mapMouseUp(e) {
            // mouse up for the image
            if (e.relatedTarget) {
                return;
            }

            e.preventDefault();

            private_removePanningEventListeners(e);

            private_panningMouseUp(e);
            //thisMap.event.fire("map mouse up", e);
        }

        function private_panningMouseUp(e) {
            let evt = e.__event__ || e;
            let pan = thisMap.pan;

            if (
                evt.clientY - pan.mouseDownY !== 0 ||
                evt.clientX - pan.mouseDownX !== 0
            ) {
                thisMap.panning_module.panningFinishedAnimation(evt);

                // prettier-ignore
                thisMap.updateStatePlaneCoordsByDistance(
                    thisMap.mainContainer.left - pan.mainContainerXY.x,
                    thisMap.mainContainer.top - pan.mainContainerXY.y,
                    pan.spCoords
                );

                thisMap.event.fire('pan end');
            }

            thisMap.state.panning = false;
        }

        function private_removePanningEventListeners(e) {
            if (e.relatedTarget) {
                return;
            }

            e.preventDefault();

            document.removeEventListener('mouseup', private_mapMouseUp);
            document.removeEventListener('mouseout', private_mapMouseUp);

            document.removeEventListener('mousemove', mapInitialDragTasks);
            document.removeEventListener('mousemove', thisMap.pan.panningFunction);
        }

        function mapInitialDragTasks(e) {
            // This function is called once and immediately removed just to make the
            // panning feel smoother.
            if (
                e.clientY - thisMap.pan.mouseDownY === 0 &&
                e.clientX - thisMap.pan.mouseDownX === 0
            ) {
                // A bug in chrome will call this function if a mousedown event happens.
                // Bug hasn't been fixed in atleast chrome version 51.0.2704.103
                // and earlier.

                return;
            }

            thisMap.mainContainer.element.style[CSS_TRANSITION] = '';

            // End any zooming activity
            //thisMap.Zoom_class.zoomStop();

            thisMap.state.panning = true;

            document.removeEventListener('mousemove', mapInitialDragTasks);
            thisMap.event.fire('pan initial', e);
        }

        function mapDragOnly(e) {
            let mainCont = thisMap.mainContainer;
            let x = mainCont.left + (e.clientX - thisMap.pan.mouseDownX);
            let y = mainCont.top + (e.clientY - thisMap.pan.mouseDownY);

            // prettier-ignore
            mainCont.element.style[CSS_TRANSFORM] = 
                                   "translate("+ x +"px, "+ y +"px)";
        }

        function mapDragAndAnimation(e) {
            let mainCont = thisMap.mainContainer;
            let pan = thisMap.pan;

            let distanceX = pan.mainContainerXY.x + e.clientX - pan.mouseDownX,
                distanceY = pan.mainContainerXY.y + e.clientY - pan.mouseDownY;

            mainCont.top = distanceY;
            mainCont.left = distanceX;

            thisMap.pan.points.push({
                x: distanceX,
                y: distanceY,
                time: Date.now(),
            });

            // prettier-ignore
            mainCont.element.style[CSS_TRANSFORM] =
                "translate3d("+ distanceX +"px, "+ distanceY +"px, 0px)";

            thisMap.event.fire('pan', e);
        }

        function panTo(spPoint, panTime) {
            let pxlPoint = thisMap.getPixelPointInMapContainer.bind(thisMap);
            let convertSpToPxl = thisMap.convertProjPointToPixelPoint.bind(thisMap);

            let centerPxls = pxlPoint({
                x: thisMap.mapContainer.left + thisMap.mapContainer.width / 2,
                y: thisMap.mapContainer.top + thisMap.mapContainer.height / 2,
            });
            let pointOfInterestPxl = convertSpToPxl(spPoint);
            let distance = {
                x: centerPxls.x - pointOfInterestPxl.x,
                y: centerPxls.y - pointOfInterestPxl.y,
            };

            panByPixels(distance, panTime);

            return thisMap;
        }

        function panByPixels(spPoint, panTime) {
            let mainCont = thisMap.mainContainer;
            let vectorLen = Math.sqrt(
                spPoint.x * spPoint.x + spPoint.y * spPoint.y,
            );

            // Played around with this on a graphing website, might want to revisit in the future.
            let max = Math.max(
                200,
                vectorLen * (500 * (0.45 / vectorLen ** 0.9) + 0.06),
            );
            let time = panTime || Math.min(1000, max);

            mainCont.left += Math.round(spPoint.x);
            mainCont.top += Math.round(spPoint.y);

            thisMap.updateStatePlaneCoordsByDistance(spPoint.x, spPoint.y);

            // prettier-ignore
            {
                // Block for prettier-ignore
                mainCont.element.style[CSS_TRANSITION] =
                    "all " + time + "ms cubic-bezier(0, 0, 0.25, 1)";

                mainCont.element.style[CSS_TRANSFORM] =
                    "translate3d(" + mainCont.left + "px," + mainCont.top + "px,0px)";
            }

            setTimeout(() => {
                mainCont.element.style[CSS_TRANSITION] = null;
            }, time);

            thisMap.event.fire('pan end', {panEndTime: time});
        }

        function panningFinishedAnimation(e) {
            let transistionDurationMS = 2200;

            let points = thisMap.pan.points;

            if (
                points.length < 3 ||
                Date.now() - points[points.length - 1].time > 150
            ) {
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
                clearTimeout(transitionResetTimeout);
                return;
            }

            // Calculate distance needed to travel.
            // graph -> https://www.desmos.com/calculator/wopqdbru4y
            let dampen =
                Math.sqrt(Math.log10(Math.log10(speed ** 3 + 1) ** 15 + 1)) **
                    0.07 /
                4;

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

            thisMap.mainContainer.left = finishPoint.x;
            thisMap.mainContainer.top = finishPoint.y;

            // prettier-ignore
            thisMap.mainContainer.element
                .style[CSS_TRANSITION] = "transform " + transistionDurationMS +
                "ms cubic-bezier(0, 0, 0.3, 1)";

            // prettier-ignore
            thisMap.mainContainer.element
                .style[CSS_TRANSFORM] = "translate3d(" + finishPoint.x + "px," +
                finishPoint.y + "px, 0px)";

            // Reset transition.
            clearTimeout(transitionResetTimeout);

            transitionResetTimeout = setTimeout(
                function() {
                    this.mainContainer.element.style[CSS_TRANSITION] = '';
                }.bind(thisMap),
                transistionDurationMS,
            );
        }

        function stopPanAnimation(e) {
            // prettier-ignore
            let posOnBezierCurve = document.defaultView
                .getComputedStyle(thisMap.mainContainer.element)
                .transform.match(/(-?\d*.?\d*), (-?\d*.?\d*)\)$/);

            if (!posOnBezierCurve) {
                return;
            }

            let x = Math.round(posOnBezierCurve[1]), //Math.round(pan.anim.startPoint.x - ((pan.anim.startPoint.x - pan.anim.endPoint.x) * posOnBezierCurve)),
                y = Math.round(posOnBezierCurve[2]); //Math.round(pan.anim.startPoint.y - ((pan.anim.startPoint.y - pan.anim.endPoint.y) * posOnBezierCurve));

            thisMap.updateStatePlaneCoordsByDistance(
                x - thisMap.mainContainer.left,
                y - thisMap.mainContainer.top,
            );

            thisMap.mainContainer.element.style[CSS_TRANSFORM] =
                'translate(' + x + 'px,' + y + 'px)';

            thisMap.mainContainer.top = y;
            thisMap.mainContainer.left = x;

            thisMap.event.fire('stopPanAnimation');
        }

        function enablePanning() {
            thisMap.event.on('mousedown', mouseDown);
        }

        function disablePanning() {
            thisMap.event.off('mousedown', mouseDown);
        }

        return {
            panTo: panTo,
            panByPixels: panByPixels,
            enablePanning: enablePanning,
            disablePanning: disablePanning,
            stopPanAnimation: stopPanAnimation,
            mapDragOnly: mapDragOnly,
            mapDragAndAnimation: mapDragAndAnimation,
            panningFinishedAnimation: panningFinishedAnimation,
        };
    }

    class NewMap extends BasicEventSystem {
        constructor(spPoint, p_zoom, parameters) {
            super();
            this.parameters = parameters;
            this.init(spPoint, p_zoom);
        }

        init(spPoint, p_zoom) {
            this.zoom = 0;

            let params = this.parameters;

            this.zoomIndex = params.zoomIndex;
            this.maxZoom =
                params.maxZoom || (this.zoomIndex && this.zoomIndex.length) || 24;
            this.minZoom = params.minZoom || 0;
            this.zoomDelta = params.zoomDelta || 1;

            this.MOUSE_WHEEL_EVT = MOUSE_WHEEL_EVT;
            this.CSS_TRANSFORM = CSS_TRANSFORM;
            this.CSS_TRANSITION = CSS_TRANSITION;

            this.makeContainers();
            this.loadModules();
            this.createEventListeners();

            this.extent = {
                visible: {},
                full: {}, // TODO: Currently not used by anything.
            };

            this.state = {zooming: false}; // Todo: Delete eventually.

            this.updateContainerSize(); // Todo: Is this the best way?

            if (spPoint) {
                this.setView(spPoint, p_zoom);
            }
        }

        setView(spPoint, zoom) {
            spPoint = this.toPoint(spPoint);

            this.zoom = zoom;

            let heightRatio = this.mapContainer.height / this.mapContainer.width;
            let resolution =
                this.mapContainer.width /*window.innerWidth*/ *
                this.getResolution(zoom); /*17.36111111111111;*/
            this.extent.visible = {
                x: spPoint.x - resolution / 2,
                X: spPoint.x + resolution / 2,
                y: spPoint.y - (resolution / 2) * heightRatio,
                Y: spPoint.y + (resolution / 2) * heightRatio,
            };

            if (!this.state.loaded) {
                this.state.loaded = true;
                this.event.fire('loaded');
            } else {
                this.event.fire('update everything'); // Todo: Maybe the event should be "setview"?
            }
        }

        updateContainerSize(panToMid) {
            let containerRect = this.mapContainer.element.getBoundingClientRect();
            this.mapContainer.width = this.parameters.container.clientWidth;
            this.mapContainer.height = this.parameters.container.clientHeight;
            this.mapContainer.left = containerRect.left;
            this.mapContainer.top = containerRect.top;

            //this.mapContainer.element.style.top = this.mapContainer.top + "px";
            //this.mapContainer.element.style.left = this.mapContainer.left + "px";
            this.mapContainer.element.style.height =
                this.mapContainer.height + 'px';
            this.mapContainer.element.style.width = this.mapContainer.width + 'px';

            let midPoint = {
                x:
                    this.extent.visible.x +
                    (this.extent.visible.X - this.extent.visible.x) / 2,
                y:
                    this.extent.visible.y +
                    (this.extent.visible.Y - this.extent.visible.y) / 2,
            };

            let heightRatio = this.mapContainer.height / this.mapContainer.width;
            let resolution =
                this.mapContainer.width /*window.innerWidth*/ *
                this.getResolution(this.zoom); /*17.36111111111111;*/
            this.extent.visible = {
                x: this.extent.visible.x,
                X: this.extent.visible.x + resolution,
                y: this.extent.visible.Y - resolution * heightRatio,
                Y: this.extent.visible.Y,
            };

            this.event.fire('updateContainerSize', this);

            if (panToMid) {
                this.panning_module.panTo(midPoint);
            }
        }

        makeContainers() {
            this.mapContainer = this.makeContainer(document.createElement('div'));
            this.mapContainer.element.className = '_theMapContainer_';

            this.mainContainer = this.makeContainer(document.createElement('div'));
            this.mainContainer.element.style.cssText =
                'position: absolute; width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px) scale3d(1,1,1);';

            this.svgContainer = this.makeContainer(
                document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
            );
            this.svgContainer.element.setAttribute(
                'xmlns:xlink',
                'http://www.w3.org/1999/xlink',
            );
            this.svgContainer.element.style.cssText =
                'position: absolute; top: 0px; left: 0px; width: 10000000px; height: 100000px; overflow: hidden;';

            this.markerContainer = this.makeContainer(
                document.createElement('div'),
            );
            this.markerContainer.element.style.cssText =
                'position: relative; z-index: 1000;';
            this.markerContainer.element.className = '_markerContainer_';

            this.mainContainer.element.appendChild(this.svgContainer.element);
            this.mainContainer.element.appendChild(this.markerContainer.element);

            this.mapContainer.element.appendChild(this.mainContainer.element);

            this.parameters.container.appendChild(this.mapContainer.element);
            // Make a zoom slider here?
        }

        makeContainer(el) {
            return {
                // Todo finish this task.
                element: el,
                left: null,
                top: null,
                width: null,
                height: null,
            };
        }

        loadModules() {
            this.event = new BasicEventSystem(); // TODO: Change this in future;

            this.panning_module = panning_module(this);
            // this.boxZoom_module = boxZoom_module(this);
            // this.Zoom_class = new Zoom_class(this);
        }

        createEventListeners() {
            let mapContEl = this.mapContainer.element;

            this.panning_module.enablePanning();

            mapContEl.addEventListener(
                this.MOUSE_WHEEL_EVT,
                evt => {
                    evt.preventDefault();
                    evt.stopPropagation();

                    let _evt_ = undefined; // This is needed for the delta.

                    // prettier-ignore
                    evt.___delta = evt.wheelDelta
                        ? evt.wheelDelta
                        : evt.deltaY // Newish firefox?
                                ? evt.deltaY * -120
                                : ((_evt_ = window.event || evt), _evt_.detail * -120);

                    evt.___delta = evt.___delta > 0 ? 120 : -120; // Normalize delta.

                    evt.zoomDelta = evt.zoomDelta || this.zoomDelta;

                    this.eventDelgationHandler(evt, this.MOUSE_WHEEL_EVT);
                },
                false,
            );

            mapContEl.addEventListener(
                'mousedown',
                evt => {
                    //let evt = e.__event__;

                    if (evt.which !== 1 || evt.which === 0 /*touch*/) {
                        return;
                    }

                    if (evt.shiftKey) {
                        this.boxZoom_mouseDown(evt);
                        return false;
                    }

                    this.pan.mouseDownX = evt.clientX; // Checked in the mouse click listener, obvious hack is obvious.
                    this.pan.mouseDownY = evt.clientY; // Checked in the mouse click listener, obvious hack is obvious.
                    this.eventDelgationHandler(evt);
                },
                false,
            );

            mapContEl.addEventListener(
                'mouseup',
                e => this.eventDelgationHandler,
                false,
            );
            mapContEl.addEventListener(
                'mouseover',
                e => this.eventDelgationHandler,
                false,
            );
            mapContEl.addEventListener(
                'mouseout',
                e => this.eventDelgationHandler,
                false,
            );
            mapContEl.addEventListener(
                'mousemove',
                e => {
                    this.eventDelgationHandler(e);
                },
                false,
            );

            mapContEl.addEventListener(
                'click',
                e => {
                    // todo: Find better way to check if it is "safe" to click.
                    if (
                        e.clientY === this.pan.mouseDownY &&
                        e.clientX === this.pan.mouseDownX
                    ) {
                        this.eventDelgationHandler(e);
                    }
                },
                false,
            );

            this.event.on(
                MOUSE_WHEEL_EVT,
                p_evt => this.zoomInOut(p_evt),
                this,
            );
        }

        eventDelgationHandler(e, type) {
            type = type || e.type;

            let parentElement = e.target;
            let stopPropagatting = false;
            // prettier-ignore
            let pointInContainer = e.containerX && e.containerY
                                    ? { x: e.containerX, y: e.containerY }
                                    : this.getPixelPointInMapContainer({ x: e.clientX, y: e.clientY });
            let new_evt = {
                __event__: e,
                x: pointInContainer.x,
                y: pointInContainer.y,
                css: e.css,
                type: type,
                zoomDelta: e.zoomDelta || this.zoomDelta,
                //preventDefault: e.preventDefault.bind(e),
                spPoint: null,
                stopPropagation: function() {
                    stopPropagatting = true;
                },
            };

            while (parentElement && parentElement !== this.mapContainer.element) {
                if (
                    !(parentElement._marker_obj && parentElement._marker_obj.fire)
                ) {
                    parentElement = parentElement.parentElement;
                    continue;
                }

                if (parentElement._marker_obj.statePlanePoint) {
                    new_evt.spPoint = parentElement._marker_obj.statePlanePoint;
                }

                parentElement._marker_obj.fire(type, new_evt);

                if (stopPropagatting) {
                    return;
                }

                parentElement = parentElement.parentElement;
            }

            if (e.___delta) {
                // Map is zooming.
                this.panning_module.stopPanAnimation(new_evt);

                new_evt.spPoint = this.screenPointToProjection(pointInContainer); // Halting panning animation changes extent..

                let _zoomDelta = this.calcZoomDelta(
                    this.zoom,
                    new_evt.zoomDelta,
                    this.minZoom,
                    this.maxZoom,
                );

                let _zoomAdder =
                    e.___delta >= 120 ? _zoomDelta.maxDelta : -_zoomDelta.minDelta;

                this.zoom += _zoomAdder;

                let _resolution = this.getResolution(this.zoom);

                new_evt.scale =
                    this.getResolution(this.zoom - _zoomAdder) / _resolution;

                this.updateVisExtentByOriginAndResolution(
                    new_evt.spPoint,
                    new_evt.scale,
                    _resolution,
                );
            } else {
                new_evt.spPoint = this.screenPointToProjection(pointInContainer);
            }

            this.event.fire(type, new_evt);
        }

        addTo(element, parent, callBack) {
            let args = arguments;

            if (this.state.loaded) {
                parent.appendChild(element);
                callBack();
            } else {
                this.event.on(
                    'loaded',
                    function _fn_(e) {
                        this.addTo.apply(this, args);
                        this.event.off('loaded', _fn_);
                    },
                    this,
                );
            }

            return this;
        }
    }

    class BasicInteractiveElement extends BasicEventSystem {
        constructor(elem) {
            super();
            this.element = elem;
            this.deleted = false;

            elem._marker_obj = this;
        }
    }

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
            MOUSE_WHEEL_EVT,
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

    class BasicLayer extends BasicEventSystem {
        constructor(hideDuringZoom) {
            super();
            this.map = null;
            this.container = null;
            this.hideDuringZoom = hideDuringZoom;
            this.zoomObj = { xOffset: 0, yOffset: 0 };
            this.zoomLvl = null;
            this.zoomTimer = null;
            this.zoomIndex = null;
            this.zoomEndms = 200;
            this.fractionOffset = { x: 0, y: 0 };
            this.viewPortTopLeftWorldPxls = { x: 0, y: 0 };
        }

        setZoomIndex(index) {
            this.zoomIndex = index;
        }

        setZindex(zIndex) {
            this.zIndex = zIndex;
        }

        addEventListeners() {
            if (this.hideDuringZoom) {
                this.map.event.on(MOUSE_WHEEL_EVT, this._hideContainerDuringMouseWheelEvt, this);
            } else {
                this.map.event.on(MOUSE_WHEEL_EVT, this._mouseWheelEvt, this);
            }

            this.map.event.on("updateContainerSize", this.updateContainer, this);
            this.map.event.on("update everything", this.fire.bind(this, "update everything"), this);

            this.on("zoom end", this._zoomEndEvt, this);

            this.fire("add event listeners");
        }

        _zoomEndEvt(p_evt) {
            clearTimeout(this.zoomTimer);

            this.zoomTimer = setTimeout(() => this.fire("zoom delay end", p_evt), this.zoomEndms);
        }

        _hideContainerDuringMouseWheelEvt() {
            this.container.element.style.display = "none";
            this.fire("zoom end");
        }

        _mouseWheelEvt(p_evt) {
            // let point = { x: p_evt.x, y: p_evt.y };

            if (p_evt.scale === 1) {
                p_evt.noZoom = true;
                this.fire("zoom end", p_evt);
                return;
            }

            if (p_evt.__event__.___delta >= 120) {
                this.zoomInOut(p_evt, "zoom in");
            } else if (p_evt.__event__.___delta <= -120) {
                this.zoomInOut(p_evt, "zoom out");
            }
        }

        addTo(map) {
            if (this.map === map) {
                console.error("Layer already added to map", this);
                return this;
            }

            this.map = map;
            this.container = this.createContainer();
            this.setZoomIndex(this.zoomIndex || this.map.zoomIndex);

            map.addTo(this.container.element, map.mainContainer.element, () => {
                this.addEventListeners();
                this.fire("appended to map");
            });

            return this;
        }

        remove() {
            this.container.element.parentElement.removeChild(this.container.element);
            this.map.event.allOff(this);
            this.fire("remove", this);
            this.map = null;
        }

        update() {
            // To be implimented by classes that extend this class.
        }

        updateContainer() {
            // To be implimented by classes that extend this class.
            console.log("The method 'updateContainer' in " + this.constructor.name + " wasn't implimented", this);
            this.fire("update everything");
        }

        createContainer() {
            let cont = {
                element: document.createElement("div"),
                left: 0 - this.map.mainContainer.left,
                top: 0 - this.map.mainContainer.top,
                updateTransform: undefined
            };

            cont.updateTransform = this.updateContainerTransform.bind({ container: cont });

            cont.element.className = "_tileContainer_";
            cont.element.style.position = "absolute";
            cont.element.style.left = "0px";
            cont.element.style.top = "0px";
            cont.element.style.height = "100%";
            cont.element.style.width = "100%";
            cont.element.style.zIndex = this.zIndex;
            cont.element.style.backfaceVisibility = "hidden";
            cont.element.style.transformOrigin = "top left";

            return cont;
        }

        updateContainerTransform(left, top, scale) {
            this.container.left = left;
            this.container.top = top;

            scale = scale || 1;

            // prettier-ignore
            this.container.element.style[CSS_TRANSFORM] =
                            `translate3d(${left}px, ${top}px, 0px)
                         scale3d(${scale}, ${scale}, 1)`;
        }

        swapContainer(childElement, delay) {
            clearTimeout(this.zoomTimer);

            let contNew = this.createContainer();
            let contOld = this.container;

            contNew.updateTransform(contNew.left, contNew.top, 1);

            this.container = contNew;

            if (childElement) {
                this.container.element.appendChild(childElement);
            }

            this.map.mainContainer.element.insertBefore(contNew.element, contOld.element);

            // setInterval(function(){
            // Todo: Just for testing purposes.
            // if (contOld.element.style.display === 'none'){
            // contOld.element.style.display = '';
            // }else{
            // contOld.element.style.display = 'none';
            // }
            // }, 500);

            let doSwap = e => {
                clearTimeout(swapTimer);
                this.doSwap = null;
                this.map.event.off(MOUSE_WHEEL_EVT, tileLoadListener, this);
                this.map.event.off("tile loaded", doSwap, this);

                if (contOld.element.parentElement) {
                    contOld.element.parentElement.removeChild(contOld.element);
                }
            };

            let swapTimer = setTimeout(() => {
                doSwap();
            }, delay || 450);

            /*
                Immidiatly swap the containers if there is a mousewheel
                event before the swapTimer fires off.
            */
            this.map.event.on(MOUSE_WHEEL_EVT, doSwap, this);

            let ___that = this;
            function tileLoadListener(e) {
                // TODO: testing
                ___that.map.event.off(MOUSE_WHEEL_EVT, tileLoadListener, ___that);
                setTimeout(___that.map.event.on.bind(___that.map.event, "tile loaded", doSwap, ___that), 100);
            }

            return this;
        }

        zoomEnd(evt) {
            if (evt && evt.noZoom && this.__zoom === this.map.zoom) {
                // Hack to stop layer from zooming past it's limits.
                //this.fire("update everything");
                return;
            }

            if (this.zoomObj.isZooming) {
                // First time calling zoomEnd since starting zooming.
                this.fire("pre zoom end", this);
            }

            this.__zoom = this.map.zoom;

            this.zoomObj = {};

            this.fire("post zoom end");

            return this;
        }

        resetZoomObj() {
            this.zoomObj = {
                scale: 1,
                isZooming: false,
                x: this.container.left,
                y: this.container.top
            };

            return this;
        }

        zoomInOut(evt, zoomDirection) {
            if (this.zoomObj.isZooming) {
                requestAnimationFrame(this._zoomInOut.bind(this,evt, zoomDirection));
                return this;
            }

            this.container.element.className = (evt.css && evt.css.className) || "smoothTransition";

            this.resetZoomObj();

            this.zoomObj.isZooming = true;

            requestAnimationFrame(this._zoomInOut.bind(this,evt, zoomDirection));

            return this;
        }

        _zoomInOut(evt, zoomDirection) {
            let zObj = this.zoomObj;
            let scale = this.getScale(zoomDirection, evt.zoomDelta);

            zObj.scale *= scale;

            let _old = this.viewPortTopLeftWorldPxls;
            let _new = this.topLeftOfVisibleExtentToPxls();
            _new.x = Math.floor(_new.x);
            _new.y = Math.floor(_new.y);

            let x = _old.x * zObj.scale - _new.x - this.map.mainContainer.left;
            let y = _old.y * zObj.scale - _new.y - this.map.mainContainer.top;

            // prettier-ignore
            this.container.element.style[CSS_TRANSFORM] =
                       `translate3d(${ x }px,
                                ${ y }px, 0px)
                    scale3d(${ zObj.scale }, ${ zObj.scale }, 1)`;

            this.fire("zoom end", evt);

            return this;
        }

        getScale(zoomDirection, zoomDelta){
            let getRes = this.map.getResolution.bind(this.map);
            let scale = 1;
            // prettier-ignore
            let zoomLvl = this.map.zoom + (zoomDirection === "zoom in"
                                           ? -zoomDelta
                                           : zoomDelta);

            scale = getRes(zoomLvl) / getRes(this.map.zoom);

            return scale;
        }
    }

    class ArcRenderLayer extends BasicLayer {
        constructor(imgUrl, reqTemplate, zIndex, hideDuringZoom) {
            super(hideDuringZoom);
            this.ajaxRequest = null;
            this.setImgReqUrl(imgUrl);
            this.setReqTemplate(reqTemplate);
            this.reqId = 0;
            this.updateTimer = null;

            this.setZindex(zIndex);

            this.on("add event listeners", () => {
                this.on("appended to map", this.update, this);
                this.on("zoom delay end", this.startUpdateTimer.bind(this, 1000), this);
                // prettier-ignore
                this.on( "update everything", () => {
                        this.container.element.style.display = "none";
                        this.update();
                    }, this);
                this.map.event.on(MOUSE_WHEEL_EVT, this.cancelRequest, this);
                this.map.event.on("pan initial", this.cancelRequest, this);
                this.map.event.on("pan end", this.startUpdateTimer.bind(this, 1000), this);
                this.map.event.on("stopPanAnimation", this.cancelRequest, this);
            });
        }

        cancelRequest() {
            if (this.ajaxRequest) {
                this.ajaxRequest.abort();
            }
            this.ajaxRequest = null;
        }

        isCurrentReq(httpReqObj) {
            return this.ajaxRequest === httpReqObj ? true : false;
        }

        startUpdateTimer(milliseconds) {
            clearTimeout(this.updateTimer);
            this.cancelRequest();
            this.updateTimer = setTimeout(this.update.bind(this), milliseconds || 1000);
        }

        setImgReqUrl(imgUrl) {
            this.imgReqUrl = imgUrl;
        }

        setReqTemplate(template) {
            this.reqTemplate = template;
        }

        sendHttpReq(req) {
            var that = this;

            this.cancelRequest();

            this.ajaxRequest = new XMLHttpRequest();
            this.ajaxRequest.onreadystatechange = function() {
                try {
                    if (this.status === 200 && this.readyState === 4) {
                        that.httpReqOnload(this);
                    }
                } catch (e) {
                    console.error(e);
                }
            };

            this.ajaxRequest.open("POST", this.imgReqUrl, true);
            this.ajaxRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

            this.ajaxRequest.send(req);
        }

        httpReqOnload(httpReqObj) {
            if (!this.isCurrentReq(httpReqObj)) {
                return;
            }

            this.fire("ajax load", httpReqObj);

            var parsedRes = JSON.parse(httpReqObj.responseText);

            this.createTheImage(parsedRes.href, httpReqObj);
        }

        createTheImage(imgSrc, httpReqObj) {
            var newMapImg = document.createElement("img");
            newMapImg.addEventListener("load", this.mapLoadHandler.bind(this, newMapImg, httpReqObj));
            newMapImg.addEventListener("error", this.mapErrorHandler.bind(this, newMapImg, httpReqObj));
            newMapImg.src = imgSrc;
            newMapImg.style.zIndex = "1";
            newMapImg.style.position = "absolute";
            newMapImg.style.imageRendering = "pixelated"; // TODO: Test of new css feature in chrome.

            return this;
        }

        update() {
            var obj = {
                ...this.map.extent.visible,
                width: this.map.mapContainer.width,
                height: this.map.mapContainer.height
            };

            var req = encodeURI(
                this.reqTemplate.replace(/\${(.+?)}/g, function(a, match) {
                    return obj[match];
                })
            );
            //`bbox=${spCoords.x},${spCoords.y},${spCoords.X},${spCoords.Y}&bboxSR=102748&layers=show:4&layerDefs=&size=${zeeMap.mapContainer.width},${zeeMap.mapContainer
            //    .height}&imageSR=102748&format=png8&transparent=true&dpi=&time=&layerTimeOptions=&dynamicLayers=&gdbVersion=&mapScale=&f=pjson`
            this.sendHttpReq(req);
        }

        updateContainer() {
            this.update();
        }

        mapLoadHandler(mapImg, httpReqObj) {
            if (!this.isCurrentReq(httpReqObj)) {
                return;
            }

            this.__zoom = this.map.zoom;
            this.zoomObj = {};

            this.swapContainer(mapImg, 0 /*milliseconds*/);

            this.fire("map img load", httpReqObj);
        }

        mapErrorHandler(mapImg, httpReqObj) {
            console.error(this, mapImg, httpReqObj);
            this.fire("map img error", httpReqObj);
        }

        _zoomInOut(evt, zoomDirection) {
            let zObj = this.zoomObj;
            let scale = this.getScale(zoomDirection, evt.zoomDelta);
            zObj.scale *= scale;

            let newPoint = {
                x: evt.x - this.map.mainContainer.left + zObj.x, // This will set the origin to 1/2 the center: - this.map.mapContainer.width / 2;
                y: evt.y - this.map.mainContainer.top + zObj.y
            };

            zObj.x = zObj.x + (zObj.x - (newPoint.x - zObj.x)) * (scale - 1);
            zObj.y = zObj.y + (zObj.y - (newPoint.y - zObj.y)) * (scale - 1);

            // prettier-ignore
            this.container.element.style[CSS_TRANSFORM] =
                        `translate3d(${ zObj.x }px,
                                 ${ zObj.y }px, 0px)
                        scale3d(${ zObj.scale }, ${ zObj.scale }, 1)
                    `;

            this.fire("zoom end", evt);

            return this;
        }
    }

    class ArcXMLLayer extends ArcRenderLayer {
        constructor(imgUrl, zIndex, ArcXML_module, hideDuringZoom) {
            super(imgUrl, null, zIndex, hideDuringZoom);

            this.on("appended to map", () => {
                this.makeArcXML = ArcXML_module(this.map);
            });
        }

        update() {
            let extent = this.map.extent.visible;
            let xml = this.makeArcXML.makeArcXMLRequest(extent.x, extent.X, extent.y, extent.Y);
            let req = window.encodeURIComponent("ArcXMLRequest") + "=" + window.encodeURIComponent(xml);
            this.sendHttpReq(req);
        }

        httpReqOnload(httpReqObj) {
            if (!this.isCurrentReq(httpReqObj)) {
                return;
            }

            let xml = /<\?xml.*>/.exec(httpReqObj.responseText)[0];
            let parsedRes = new DOMParser().parseFromString(xml , "application/xml");
            let output = parsedRes.getElementsByTagName("OUTPUT");
            let href = output[0].getAttribute("url");

            this.createTheImage(href, httpReqObj);
        }
    }

    function googleToState ( lat, lon ) {// this converts google's x,y coordinates to state plane coordinates used by the government.
              // For snohomish county only.
                    let math = Math,
                        t = undefined,
                        rho = undefined,
                        theta = undefined,
                        x = undefined,
                        y = undefined;

                    lat = lat * .01745329252 ;
                    lon = lon * .01745329252 ;
                    t = math.sin( 0.7853981633974483 - ( lat / 2 )) / math.cos( 0.7853981633974483 - ( lat / 2 )) ;
                    t = t / ( math.pow((( 1 - ( 0.082271854 * ( math.sin( lat )))) / ( 1 + ( 0.082271854 * ( math.sin( lat ))))),( 0.041135927 ))) ;
                    rho = 6378206.4 * 1.8297143852061755 * math.pow( t, 0.7445203284529343 ),
                    theta = 0.7445203284529343 * ( lon - -2.1088813351916 ),
                    x = ( rho * math.sin( theta ) ) + 499998.9841016325,
                    y = 5853958.963967552 - ( rho * math.cos( theta ) ); // mes add y0 ?
                    x = x*3.28084;
                    y = y*3.28084;
                    return [ y, x ];
            }

    class BaseTileLayer extends BasicLayer {
        constructor(src, zIndex) {
            super();
            this.__zoom = null;
            this.tileSrc = null;
            this.tileSize = 256;
            this.tilesCache = {};
            this.tileInfo = null;
            this.tileLoadOrder = [];
            this.delTilesTimer = null;
            this.lvlLoadTime = { start: 0, finish: 1 };
            this.viewPortTopLeftWorldPxls = { x: 0, y: 0 };
            this.makeTile = makeTile;

            this.setZindex(zIndex);

            this.setTileSrc(src);

            this.on("add event listeners", () => {
                this.on("appended to map", () => {
                    this.makeTileGrid();
                    this.zoomEnd();
                });

                this.on("update everything", () => {
                    this.makeTileGrid();
                    this.resetTiles();
                    this.swapContainer();
                    this.zoomEnd();
                    this.update();
                });

                this.on("zoom delay end", this.zoomEnd, this);
                this.on("pre zoom end", () => this.swapContainer(), this);
                this.on("post zoom end", () => {
                    this.resetTiles();
                    this.update();
                });

                this.map.event.on(
                    "pan",
                    e => {
                        if ((e.clientX + e.clientY) % 7 === 0) {
                            // TODO: Better throttling, this was just a thought experiment.
                            this.update();
                        }
                    },
                    this
                );
                this.map.event.on("pan initial", () => {
                    clearTimeout(this.zoomTimer);
                    clearTimeout(this.delTilesTimer);
                });
                this.map.event.on("pan end", () => {
                    this.update();
                    if (this.__zoom !== this.map.zoom) {
                        this.zoomEnd();
                    }
                    this.delTilesTimer = setTimeout(this.clearHiddenTiles.bind(this), 1100);
                });
            });
        }

        getTileInfo() {
            console.log("The method 'getTileInfo' in " + this.constructor.name + " wasn't implimented", this);
            return "Override this";
        }

        getTilePxls() {
            console.log("The method 'getTilePxls' in " + this.constructor.name + " wasn't implimented", this);
            return "Override this";
        }

        setTileSrc(src) {
            this.tileSrc = src;
            return this;
        }

        updateContainer() {
            this.swapContainer();
            this.resetTiles();
            this.update();
        }

        clearHiddenTiles() {
            // TODO: This is hack, think of something better.
            let keys = Object.keys(this.tilesCache);
            let mainRect = this.map.mapContainer.element.getBoundingClientRect();
            mainRect.X = mainRect.x + mainRect.width;
            mainRect.Y = mainRect.y + mainRect.height;

            keys.forEach(key => {
                let tile = this.tilesCache[key];
                let rect = tile.getBoundingClientRect();

                if (!tile.loaded) {
                    return;
                }

                // prettier-ignore
                if (!(rect.x < mainRect.X && rect.x + rect.width > mainRect.x &&
                    rect.y < mainRect.Y && rect.y + rect.height > mainRect.y)) {

                    tile.parentElement.removeChild(tile);
                    delete this.tilesCache[key];
                }
            });
        }

        resetTiles() {
            this.viewPortTopLeftWorldPxls = this.topLeftOfVisibleExtentToPxls();

            this.viewPortTopLeftWorldPxls.x = Math.floor(this.viewPortTopLeftWorldPxls.x);
            this.viewPortTopLeftWorldPxls.y = Math.floor(this.viewPortTopLeftWorldPxls.y);

            this.tilesCache = {};
        }

        makeTileGrid() {
            let numTiles = {
                x: Math.ceil(this.map.mapContainer.width / this.tileSize) + 1,
                y: Math.ceil(this.map.mapContainer.height / this.tileSize) + 1
            };

            let ary = [];
            let vry = [];

            for (let x = 0; x <= numTiles.x; x++) {
                for (let y = 0; y <= numTiles.y; y++) {
                    ary.push({ x: x, y: y });
                }
            }

            for (let x = 0; x <= numTiles.x; x++) {
                for (let y = 0; y <= numTiles.y; y++) {
                    if (y % 2 === 0) {
                        vry.push(ary.splice(0, 1)[0]);
                        continue;
                    }
                    vry.push(ary.splice(-1, 1)[0]);
                }
            }

            this.tileLoadOrder = vry;

            /*
            let gridCenter = {
                x: numTiles.x / 2,
                y: numTiles.y / 2
            };

            // prettier-ignore
            this.tileLoadOrder = ary.sort((a,b) => {
                // Copy leaflets idea and have the tiles start loading from the center..
                let distA = Math.sqrt((gridCenter.x - a.x)**2 + (gridCenter.y - a.y)**2);
                let distB = Math.sqrt((gridCenter.x - b.x)**2 + (gridCenter.y - b.y)**2);

                return distB - distA;
            });
            */
        }

        calcLvlLoadTime() {
            //console.log((this.lvlLoadTime.finish - this.tileStart))
            return this.lvlLoadTime.finish - this.lvlLoadTime.start || 0;
        }

        update() {
            let srcObj = { "{z}": this.__zoom, "{y}": null, "{x}": null };
            let srcXYString = undefined;
            let fragment = document.createDocumentFragment();
            let tileImg = null;
            let tileX = undefined;
            let tileY = undefined;

            this.tileStart = Date.now();

            // prettier-ignore
            let extent = (this.zoomIndex && this.zoomIndex[this.__zoom] &&
                          this.zoomIndex[this.__zoom].extent) || {};

            let panLeft = this.container.left + this.map.mainContainer.left;
            let panTop = this.container.top + this.map.mainContainer.top;

            let topLeftTile = {
                x: Math.floor((this.viewPortTopLeftWorldPxls.x - panLeft) / this.tileSize),
                y: Math.floor((this.viewPortTopLeftWorldPxls.y - panTop) / this.tileSize)
            };

            let topLeftTilePxls = {
                x: topLeftTile.x * this.tileSize - this.viewPortTopLeftWorldPxls.x,
                y: topLeftTile.y * this.tileSize - this.viewPortTopLeftWorldPxls.y
            };

            for (let m = 0; m < this.tileLoadOrder.length; m++) {
                srcObj["{x}"] = topLeftTile.x + this.tileLoadOrder[m].x;
                srcObj["{y}"] = topLeftTile.y + this.tileLoadOrder[m].y;

                srcXYString = srcObj["{x}"] + "," + srcObj["{y}"];

                // prettier-ignore
                if (this.tilesCache[srcXYString] ||
                    (srcObj["{x}"] < extent.x || srcObj["{x}"] > extent.X ||
                     srcObj["{y}"] > extent.Y || srcObj["{y}"] < extent.y)) {

                    continue;
                }

                tileX = topLeftTilePxls.x + this.tileLoadOrder[m].x * this.tileSize;
                tileY = topLeftTilePxls.y + this.tileLoadOrder[m].y * this.tileSize;

                tileImg = this.makeTile({
                    x: tileX,
                    y: tileY,
                    src: this.tileSrc.replace(/{.}/g, arg => srcObj[arg])
                });

                this.tilesCache[srcXYString] = tileImg;

                fragment.appendChild(tileImg);
            }

            this.container.element.appendChild(fragment);
        }
    }

    function makeTile(obj) {
        let tileImg = document.createElement("img");
        tileImg.className = "tileImg";
        //tileImg.style.cssText = "position: absolute; top: " + tileY + "px; left: " + tileX + "px; opacity: 0;";
        tileImg.style.cssText = "position: absolute; opacity: 0;";
        tileImg.style.transform = "translate3d(" + obj.x + "px," + obj.y + "px, 0px)";
        //tileImg.style.boxShadow = "0px 0px 0px 1px red";
        tileImg.onload = makeTileOnLoad;
        tileImg.onerror = makeTileOnError;
        tileImg.src = obj.src;

        return tileImg;
    }

    function makeTileOnLoad(e) {
        this.loaded = true;
        this.style.opacity = 1;
        // ___that.tileFinish = Date.now();
        // ___that.map.event.fire('tile loaded', this);// Todo: testing this idea.
    }

    function makeTileOnError(e) {
        console.error("Tile did not load", e);
    }

    class ArcGISTileLayer extends BaseTileLayer {
        constructor(src, zIndex) {
            super(src, zIndex);
        }

        getTileInfo() {
            // Override this for WSG84.
            let vis = this.map.extent.visible;
            let corner = this.getContainingArcTileCoords(this.map.zoom, { x: vis.x, y: vis.Y });

            return corner;

            /*
            return:
                {
                    row: undefined, // Tile number x coordinate.
                    col: undefined, // Tile number y coordinate.
                    spX: undefined, // Tile top left corner x coord in default coordinate system (state plane or WSG84 sherical mercator)
                    spY: undefined  // Tile top left corner y coord " " ".
                }
            */
        }

        getTilePxls(point) {
            // Override this for WSG84.
            return this.map.convertProjPointToPixelPoint(point);
        }

        getContainingArcTileCoords(z, b) {
            let d = { x: -1.171043e8, y: 1.379498e8 }; // This needs to be changed.
            let zoomI = this.zoomIndex[z];

            let colRow = {
                row: Math.floor((d.y - b.y) / (this.tileSize * zoomI.resolution)),
                col: Math.floor((b.x - d.x) / (this.tileSize * zoomI.resolution)),
                spX: undefined,
                spY: undefined
            };

            colRow.spX = colRow.col * (this.tileSize * zoomI.resolution) + d.x;
            colRow.spY = d.y - colRow.row * (this.tileSize * zoomI.resolution);
            //colRow.percentX = colRow.col - (b.x - d.x) / (this.tileSize * zoomI.Resolution);
            //colRow.percentY = colRow.row - (d.y - b.y) / (this.tileSize * zoomI.Resolution);

            return colRow;
        }
    }

    class SphericalMercatorTileLayer extends BaseTileLayer {
        // https://jsbin.com/jehatipagu/6/edit?html,css,js,output
        constructor(src, zIndex) {
            super(src, zIndex);
            this.bound = 20037508.342789244;// Math.PI * radius of earth
        }

        topLeftOfVisibleExtentToPxls(opt_zoom){
            // Returns top left of tile in screen pixel coords, so that it can be seen on the monitor.
            let vis = this.map.extent.visible;
            let visPoint = { x: vis.x, y: vis.Y };
            let containerCorner = this.getPxlsFromTopLeftOrigin(visPoint, opt_zoom);
            //console.log("sfd", containerCorner)
            return {
                x: containerCorner.x,
                y: containerCorner.y,
            };
        }

        getPxlsFromTopLeftOrigin(smPoint, opt_zoom) {
            // Returns pixels from 0,0 tile origin aka the top left of the world.
            let bound = 20037508.342789244;
            let pixels = this.tileSize * Math.pow(2, opt_zoom || this.map.zoom )/2;

            var pointXRatio = smPoint.x / (-bound);
            var pointYRatio = smPoint.y / (bound);

            return {
                x: (pixels)  * (1-pointXRatio),
                y: (pixels) * (1-pointYRatio),
            };
        }
    }



    function Transformation(a, b, c, d) {
        // Transformation constructor copied from Leaflet.js
       
        // if (Util.isArray(a)) {
        //     // use array properties
        //     this._a = a[0];
        //     this._b = a[1];
        //     this._c = a[2];
        //     this._d = a[3];
        //     return;
        // }
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
    }

    Transformation.prototype = {
        // @method transform(point: Point, scale?: Number): Point
        // Returns a transformed point, optionally multiplied by the given scale.
        // Only accepts actual `L.Point` instances, not arrays.
        transform: function (point, scale) { // (Point, Number) -> Point
            return this._transform(point.clone(), scale);
        },

        // destructive transform (faster)
        _transform: function (point, scale) {
            scale = scale || 1;
            point.x = scale * (this._a * point.x + this._b);
            point.y = scale * (this._c * point.y + this._d);
            return point;
        },

        // @method untransform(point: Point, scale?: Number): Point
        // Returns the reverse transformation of the given point, optionally divided
        // by the given scale. Only accepts actual `L.Point` instances, not arrays.
        untransform: function (point, scale) {
            scale = scale || 1;
            return {
                   x: (point.x / scale - this._b) / this._a,
                   y: (point.y / scale - this._d) / this._c
            };
        }
    };

    let transformation = (function () {
            var scale = 0.5 / (Math.PI * 6378137);
            //console.log(new Transformation(scale, 0.5, -scale, 0.5))
            return new Transformation(scale, 0.5, -scale, 0.5);
        }());

    function toPoint(x, y) {
        if (Array.isArray(x)) {
            return {
                x: x[0],
                y: x[1]
            };
        }
        if (x === Object(x)) {
            //https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
            return {
                x: x.x || x.X,
                y: x.y || x.Y
            };
        }
        return {
            x: x,
            y: y
        };
    }

    NewMap.prototype.toPoint = toPoint;

    NewMap.prototype.convertProjPointToPixelPoint = function(spPoint) {
        var xRatio = this.mapContainer.width / (this.extent.visible.X - this.extent.visible.x), // For paths.
            yRatio = this.mapContainer.height / (this.extent.visible.Y - this.extent.visible.y); // For paths.
        //var resolution = this.zoomIndex[this.zoom].resolution;

        //console.log(xRatio, resolution, (spPoint.x - this.extent.visible.x) * xRatio)

        return {
            x: (spPoint.x - this.extent.visible.x) * xRatio,
            y: (this.extent.visible.Y - spPoint.y) * yRatio
        };
    };

    NewMap.prototype.convertProjPointToOffsetPixelPoint = function(point) {
        var screenPoint = this.convertProjPointToPixelPoint(point);

        return {
            x: screenPoint.x - this.mainContainer.left,
            y: screenPoint.y - this.mainContainer.top
        };
    };

    NewMap.prototype.screenPointToProjection = function(point) {
        var spWidth = this.extent.visible.X - this.extent.visible.x;
        var spHeight = this.extent.visible.Y - this.extent.visible.y;

        var originLR = point.x / this.mapContainer.width;
        var originTB = point.y / this.mapContainer.height;

        return {
            x: this.extent.visible.x + spWidth * originLR,
            y: this.extent.visible.Y - spHeight * originTB
        };
    };

    // Convert state plane coordinates to wgs 84 coordinates...I'm guessing anyway, not sure.
    function convertSPToWGS84(spPoint) {
        var uX = spPoint.x,
            uY = spPoint.y;
        // Copied from scopi! How about that!
        var sqrt = window.Math.sqrt,
            pow = window.Math.pow,
            atan = window.Math.atan,
            sin = window.Math.sin,
            abs = window.Math.abs,
            part1 = undefined,
            rho = undefined,
            theta = undefined,
            txy = undefined,
            lon = undefined,
            lat0 = undefined,
            lat1 = undefined,
            Lat = undefined,
            Lon = undefined;

        uX = uX - 1640416.666666667;
        uY = uY - 0;
        rho = sqrt(pow(uX, 2) + pow(19205309.96888484 - uY, 2));
        theta = atan(uX / (19205309.96888484 - uY));
        txy = pow(rho / (20925646.0 * 1.8297521088829285), 1 / 0.7445203265542939);
        lon = theta / 0.7445203265542939 + -2.1089395128333326;
        uX = uX + 1640416.666666667;
        lat0 = 1.5707963267948966 - 2 * atan(txy);
        part1 = (1 - 0.08181905782 * sin(lat0)) / (1 + 0.08181905782 * sin(lat0));
        lat1 = 1.5707963267948966 - 2 * atan(txy * pow(part1, 0.08181905782 / 2));
        while (abs(lat1 - lat0) > 0.000000002) {
            lat0 = lat1;
            part1 = (1 - 0.08181905782 * sin(lat0)) / (1 + 0.08181905782 * sin(lat0));
            lat1 = 1.5707963267948966 - 2 * atan(txy * pow(part1, 0.08181905782 / 2));
        }
        Lat = lat1 / 0.01745329252;
        Lon = lon / 0.01745329252;
        return { lat: Lat, lng: Lon };
    }

    NewMap.prototype.convertSPToWGS84 = convertSPToWGS84;

    /*
    function convertSP(uX, uY) {
        // Copied from SCOPI for future use. Has not been modified from SCOPI.

        //=20925604.00;         // major radius of ellipsoid, map units (NAD 83) in feet?
        a = 20925646.0; // see http://dbwww.essc.psu.edu/lasdoc/overview/geomreg/appe.html
        //=20925604.48;         // more accurate ?
        //=20855486.59;         // minor radius
        ec = 0.08181905782; // eccentricity of ellipsoid (NAD 83)
        // = 0.0066943496;      // see http://dbwww.essc.psu.edu/lasdoc/overview/geomreg/appe.html
        angRad = 0.01745329252; // number of radians in a degree
        pi4 = Math.PI / 4;
        //Boulder County, CO
        //p0 = 39.333333 * angRad;  // latitude of origin
        //p1 = 39.716667 * angRad;  // latitude of first standard parallel (aka standard parallel-south?)
        //p2 = 40.783333 * angRad;  // latitude of second standard parallel  (aka standard parallel-north?)
        //m0 = -105.5 * angRad;     // central meridian (aka longitude of origin)
        //x0 = 3000000.000000;      // false easting of central meridian, map units
        //y0 = 1000000.000000;      // false northing
        //Snohomish County, WA
        p0 = 47.0 * angRad; // latitude of origin
        p1 = 47.5 * angRad; // latitude of first standard parallel (aka standard parallel-south?)
        p2 = 48.73333333333333 * angRad; // latitude of second standard parallel  (aka standard parallel-north?)
        m0 = -120.8333333333333 * angRad; // central meridian (aka longitude of origin)
        x0 = 1640416.666666667; // false easting of central meridian, map units
        y0 = 0.0; // false northing

        // Calculate the coordinate system constants.
        with (Math) {
            m1 = cos(p1) / sqrt(1 - pow(ec, 2) * pow(sin(p1), 2));
            m2 = cos(p2) / sqrt(1 - pow(ec, 2) * pow(sin(p2), 2));
            t0 = tan(pi4 - p0 / 2);
            t1 = tan(pi4 - p1 / 2);
            t2 = tan(pi4 - p2 / 2);
            t0 = t0 / pow((1 - ec * sin(p0)) / (1 + ec * sin(p0)), ec / 2);
            t1 = t1 / pow((1 - ec * sin(p1)) / (1 + ec * sin(p1)), ec / 2);
            t2 = t2 / pow((1 - ec * sin(p2)) / (1 + ec * sin(p2)), ec / 2);
            n = log(m1 / m2) / log(t1 / t2);
            f = m1 / (n * pow(t1, n));
            rho0 = a * f * pow(t0, n);

            // Convert the coordinate to Latitude/Longitude.

            // Calculate the Longitude.
            uX = uX - x0;
            uY = uY - y0; // mes added false northing applies in 0501 (?)
            pi2 = pi4 * 2;

            rho = sqrt(pow(uX, 2) + pow(rho0 - uY, 2));
            theta = atan(uX / (rho0 - uY));
            txy = pow(rho / (a * f), 1 / n);
            lon = theta / n + m0;
            uX = uX + x0;

            // Estimate the Latitude
            lat0 = pi2 - 2 * atan(txy);

            // Substitute the estimate into the iterative calculation that
            // converges on the correct Latitude value.
            part1 = (1 - ec * sin(lat0)) / (1 + ec * sin(lat0));
            lat1 = pi2 - 2 * atan(txy * pow(part1, ec / 2));

            while (abs(lat1 - lat0) > 0.000000002) {
                lat0 = lat1;
                part1 = (1 - ec * sin(lat0)) / (1 + ec * sin(lat0));
                lat1 = pi2 - 2 * atan(txy * pow(part1, ec / 2));
            }

            // Convert from radians to degrees.
            Lat = lat1 / angRad;
            Lon = lon / angRad;

            //turn "   Longitude: "+Lon+"   Latitude: "+Lat;
            return "Latitude: " + minutes(Lat) + " N   Longitude: -" + minutes(Lon) + " W (approximate coordinates)";
        }
    }

    */

    NewMap.prototype.convertWGS84ProjectionToWGS84LatLon = function(mercator) {
        // https://gis.stackexchange.com/questions/69208/trying-to-convert-coordinates-from-wgs84-web-mercator-auxiliary-sphere-to-wgs84
        // https://wiki.openstreetmap.org/wiki/Mercator#Java
        //         if (Math.abs(mercator[0]) < 180 && Math.Abs(mercator[1]) < 90)
        //             return;

        //         if ((Math.Abs(mercator[0]) > 20037508.3427892) || (Math.Abs(mercator[1]) > 20037508.3427892))
        //             return;

        var x = mercator[0];
        var y = mercator[1];
        var num3 = x / 6378137.0;
        var num4 = num3 * 57.295779513082323;
        var num5 = Math.floor((num4 + 180.0) / 360.0);
        var num6 = num4 - num5 * 360.0;
        var num7 = 1.5707963267948966 - 2.0 * Math.atan(Math.exp(-1.0 * y / 6378137.0));
        mercator[0] = num6;
        mercator[1] = num7 * 57.295779513082323;
    };

    NewMap.prototype.minutes = function(num) {
        // For converting convertSPToWGS84(x,y) points to minutes, also borrowed from Scopi!
        num = Math.abs(num);
        var floor = Math.floor(num);
        var decimal = num - floor;
        var minutes = 60 * decimal;
        var floor2 = Math.floor(minutes);
        decimal = minutes - floor2;
        var seconds = 60 * decimal;
        //r floor3 = Math.round(seconds);
        seconds *= 100;
        seconds = Math.round(seconds);
        seconds /= 100; // accurate to 2 decimal places
        return floor + "\u00B0 " + floor2 + "\u2032 " + seconds + "\u2033";
    };

    NewMap.prototype.updateStatePlaneCoordsByDistance = function(distanceX, distanceY, spCoords) {
        var spWidth = this.extent.visible.X - this.extent.visible.x;
        var spHeight = this.extent.visible.Y - this.extent.visible.y;

        var xRatio = spWidth / this.mapContainer.width;
        var yRatio = spHeight / this.mapContainer.height;

        var left = distanceX * xRatio;
        var top = 0 - distanceY * yRatio;

        if (spCoords) {
            this.extent.visible.x = spCoords.x -= left;
            this.extent.visible.X = spCoords.X -= left;
            this.extent.visible.y = spCoords.y -= top;
            this.extent.visible.Y = spCoords.Y -= top;
            return;
        }

        this.extent.visible.x -= left;
        this.extent.visible.X -= left;
        this.extent.visible.y -= top;
        this.extent.visible.Y -= top;
    };

    NewMap.prototype.updateStatePlaneCoordsByDistance1 = function(_x, _y, spCoords) {
        let resolution = this.getResolution(this.zoom);
        let __x = _x * resolution;
        let __y = _y * resolution;
    console.log(_x);
        this.extent.visible.x += __x;
        this.extent.visible.X += __x;
        this.extent.visible.y += __y;
        this.extent.visible.Y += __y;
    };

    NewMap.prototype.updateStatePlaneCoordsByOrigin = function(p_origin, p_scale) {
        var spWidth = this.extent.visible.X - this.extent.visible.x;
        var spHeight = this.extent.visible.Y - this.extent.visible.y;

        if (p_scale === 2) {
            spWidth = spWidth * -(1 / p_scale);
            spHeight = spHeight * -(1 / p_scale);
        }

        this.extent.visible.x -= spWidth * p_origin.x;
        this.extent.visible.X += spWidth * (1 - p_origin.x);
        this.extent.visible.y -= spHeight * p_origin.y;
        this.extent.visible.Y += spHeight * (1 - p_origin.y);
        console.log(this.extent.visible);
    };

    NewMap.prototype.updateVisExtentByOriginAndResolution = function(p_origin, p_scale, p_resolution) {
        let vis = this.extent.visible;
        //let resolution = this.getResolution(p_zoom);
        let spWidth = this.mapContainer.width * p_resolution;
        let spHeight = this.mapContainer.height * p_resolution;

        let ratioX = (vis.X - p_origin.x ) / (vis.X - vis.x);
        let ratioY = (vis.Y - p_origin.y) / (vis.Y - vis.y);

        if (p_scale >= 1) {
            p_scale = p_scale - 1;
        } else {
            p_scale = -(1 - p_scale);
        }

        vis.X -= spWidth * p_scale * ratioX;
        vis.x = vis.X - spWidth;
        vis.Y -= spHeight * p_scale * ratioY;
        vis.y = vis.Y - spHeight;
    };

    NewMap.prototype.getPixelPointInMapContainer = function(point) {
        return {
            x: point.x - this.mapContainer.left,
            y: point.y - this.mapContainer.top
        };
    };

    NewMap.prototype.getPanOffsetPoint = function(point) {
        var panOffsetX = this.mainContainer.left; //+ this.mapImg.left; // Should be zero if not panning.
        var panOffsetY = this.mainContainer.top; //+ this.mapImg.top;

        return {
            x: point.x - panOffsetX, // This will set the origin to)/2the center -> - this.mapContainer.width / 2;
            y: point.y - panOffsetY
        };
    };

    NewMap.prototype.distanceBetween = function(a, b) {
        // Good old pythagorean theorem.
        return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
    };

    NewMap.prototype.convertSPToWGS84Proj = function(spPoint) {
        let wsg85LatLon = this.convertSPToWGS84(spPoint);
        //console.log(wsg85LatLon, this.LeafletSphericalMercator.project(wsg85LatLon));
        return this.LeafletSphericalMercator.projectFromWSG84Geo(wsg85LatLon);
    };

    NewMap.prototype.getResolution = function(zoom) {
        if (this.zoomIndex) {
            return this.zoomIndex[zoom].resolution;
        }
        // WSG84 Spherical Mercator.
        // let EarthRadius = 6378137;
        // let RadiusxPi = Math.PI * EarthRadius;
        // let PixelsAtZoom = 256 * Math.pow(2, zoom);
        // let degPerMeter = RadiusxPi * 2 / EarthRadius;
        // let degPerPixel = EarthRadius / PixelsAtZoom * degPerMeter;
        var pixels = 256 * Math.pow(2, zoom) / 2;
        var extent = 20037508.342789244;
        var res = extent / pixels;

        return res;
    };

    NewMap.prototype.LeafletSphericalMercator = {
        // https://github.com/Leaflet/Leaflet/blob/master/src/geo/projection/Projection.SphericalMercator.js
        // https://gis.stackexchange.com/questions/92907/re-project-raster-image-from-mercator-to-equirectangular
        // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
        RADIUS: 6378137,
        MAX_LATITUDE: 85.0511287798,
        BOUND: 20037508.342789244, //20037508.342789244 TODO: "BOUND" is probably not the correct term.

        projectFromWSG84Geo: function(latlng) {
            var d = Math.PI / 180,
                max = this.MAX_LATITUDE,
                lat = Math.max(Math.min(max, latlng.lat), -max),
                sin = Math.sin(lat * d);

            return {
                x: this.RADIUS * latlng.lng * d,
                y: this.RADIUS * Math.log((1 + sin) / (1 - sin)) / 2
            };
        },

        projectToWSG84Geo: function(point) {
            var d = 180 / Math.PI,
                R = this.RADIUS;

            return {
                lat: (2 * Math.atan(Math.exp(point.y / R)) - Math.PI / 2) * d,
                lng: point.x * d / R
            };
        },
    };

    /*
    https://leafletjs.com/examples/quick-start/example.html

    var dvi = document.getElementById('mapid').cloneNode();
    document.getElementById('mapid').parentElement.removeChild(document.getElementById('mapid'));
    document.body.appendChild(dvi);

    var scriptt = document.createElement('script');
        scriptt.src = 'https://unpkg.com/leaflet@1.3.4/dist/leaflet-src.js';
        scriptt.crossOrigin = true;
    document.head.appendChild(scriptt);



    mymap = L.map('mapid').setView([0, 0], 13);
    mymap.on('click', onMapClick)

        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(mymap);

        L.marker([0, 0]).addTo(mymap)
            .bindPopup("<b>Hello world!</b><br />I am a popup.").openPopup();



    popup = L.popup();

        function onMapClick(e) {
            popup
                .setLatLng(e.latlng)
                .setContent("You clicked the map at " + e.latlng.toString())
                .openOn(mymap);
        }



    */

    //import { NewMap } from "./Main_class";
    //let mrkr = {};

    //var marker_module = function(thisMap) {
    //"use strict";
    var _markerCounter = 0;

    //thisMap.makeMarker = makeMarker;
    //thisMap.makePopup = makePopup;

    class MarkerBasics extends BasicInteractiveElement {
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

            this.element.style[CSS_TRANSFORM] = "translate(" + point.x + "px, " + point.y + "px)";

            this.fire("postUpdatePos", this);

            return this;
        }
    }

    class MakeMarker extends MarkerBasics {
        constructor(p_spPoint, options) {
            let _options = {
                offset: undefined,
                popupAnchor: undefined,
                markerElement: basicMarker()
            };

            Object.assign(_options, options);

            super(_options.markerElement);

            this.options = _options;

            p_spPoint = p_spPoint ? toPoint(p_spPoint) : null;

            if (p_spPoint) {
                this.setCoords(p_spPoint);
            }
        }

        popup(opt_html, opt_offsetPoint) {
            var marker = this;
            var offset = opt_offsetPoint || _options.popupAnchor || [0, -100];

            marker.popup = makePopup(opt_html, null, offset)
                .setCoords(marker.statePlanePoint)
                .addToMap(marker.map);

            marker.popup.on("delete", marker.delete.bind(marker));

            marker.showPopup = function() {
                if (marker.appendedToMap) {
                    if (marker.popup.element.parentNode){
                    marker.popup.updatePos();
                } else {
                    marker.popup.addToMap(marker.map);
                }
                } else {
                    marker.on("appendedToMap", function _fn_(e) {
                        marker.showPopup();
                        marker.off("appendedToMap", _fn_);
                    });
                }
            };

            marker.hidePopup = function() {
                marker.popup.hide();
            };

            marker.popup.show = marker.showPopup;

            marker.setPopupMessage = marker.popup.setMessage;

            marker.showPopup();

            return marker.popup;
        }
    }

    function makeMarker(p_spPoint, options) {
        return new MakeMarker(...arguments);
    }

    function makePopup(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
        //opt_anchorOffset = opt_anchorOffset || [0,0];

        var el = document.createElement("div");
        el.className = "popupParent";

        let popup = new MarkerBasics(el);

        if (opt_spPoint) {
            popup.setCoords(toPoint(opt_spPoint));
        }

        popup.offsetPos = toPoint(opt_anchorOffset);

        popup.message = opt_message;

        popup.on("appendedToMap", function(e) {
            popup.on(popup.map.MOUSE_WHEEL_EVT, function(e) {
                e.stopPropagation();
            });
        });

        popup.on("preUpdatePos", function(e) {
            popup.setOffSetLeftTop();
        });

        popup.setOffSetLeftTop = function() {
            let el = this.element;
            el.style.left = -(el.offsetWidth / 2) + "px";
            el.style.bottom = popup.arrow.offsetHeight + "px";

            return popup;
        };

        popup.setMessage = function(opt_message) {
            popup.messageContainer.innerHTML = "";

            if (typeof opt_message === "string") {
                popup.messageContainer.innerHTML = opt_message;
            } else {
                popup.messageContainer.appendChild(opt_message);
            }

            popup.message = opt_message;

            popup.updatePos();

            return popup;
        };

        var deleteButton = document.createElement("div");
        deleteButton.className = "markerDeleteButton";
        deleteButton.innerHTML = "&#215;";
        deleteButton.popup = popup;
        popup.deleteButton = deleteButton;
        deleteButton.addEventListener("click", popup.delete.bind(popup));
        el.appendChild(deleteButton);

        var messageContainer = document.createElement("div");
        messageContainer.innerHTML = opt_message || "";
        messageContainer.className = "messageContainer";
        messageContainer.style.color = "black";
        messageContainer.popup = popup;
        popup.messageContainer = messageContainer;
        el.appendChild(messageContainer);

        var arrow = document.createElement("div");
        arrow.className = "markerArrow";
        popup.arrow = arrow;
        el.appendChild(arrow);

        var innerArrow = document.createElement("div");
        innerArrow.className = "markerInnerArrow";
        popup.innerArrow = innerArrow;
        arrow.appendChild(innerArrow);

        return popup;
    }

    function basicMarker() {
        var marker = document.createElement("img");
        marker.src = "https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png";
        // img.style.width = '140%';

        //marker.appendChild(img);

        marker.id = "marker_" + _markerCounter++;
        // todo: Put this in a style sheet.
        marker.style.position = "absolute";
        marker.style.left = "-12px";
        marker.style.bottom = "0px";
        marker.style.transform = "";
        marker.style.color = "white";
        marker.style.fontSize = "15px";
        marker.style.willChange = "transform";
        // marker.style.backgroundColor = "#ea4335";
        // marker.style.overflow = 'hidden';
        //marker.style.backgroundImage =
        //       'url("http://www.snoco.org/docs/sas/photos/0059/00595800003400R011.jpg")';
        // marker.style.boxShadow = "0px 0px 0px 1px rgb(255,255,255)";
        marker.style.borderRadius = "50px";
        marker.style.cursor = "pointer";
        marker.style.textAlign = "center";
        marker.className = "markerParent3";
        //marker.style.height = "20px";
        //marker.style.width = "20px";
        marker.style.lineHeight = "20px";

        return marker;
    }

    Object.assign(
        NewMap.prototype,
        boxZoom_mouseDown,
        boxZoom_mouseUp,
        boxZoom_doZoom,
        boxZoom_mouseMove,
        boxZoomCenter_mouseMove,
    );

    function boxZoom_mouseDown(e) {
        if (this.boxZoom) {
            this.boxZoom = null;
            this.boxZoom.parentElement.removeChild(boxZoom);
            return;
        }

        this.panning_module.disablePanning();

        e.preventDefault();
        e.stopPropagation();

        // TODO: Make boxZoom it's own object with a element property, instead of 
        //       adding properties to the html element itself.
        this.boxZoom = document.createElement('div');
        this.boxZoom.id = 'boxZoom';
        this.boxZoom.className = 'boxZoom';

        this.boxZoomCenter = document.createElement('div');
        this.boxZoomCenter.id = 'boxZoomCenter';
        this.boxZoomCenter.className = 'boxZoomCenter';
        this.boxZoomCenter.style.cssText =
            'position:absolute; top:0px; left:0px; width: 5px; height: 5px; border: 1px solid red;';

        this.boxZoom.appendChild(this.boxZoomCenter);

        this.mainContainer.element.insertBefore(
            this.boxZoom,
            this.markerContainer.element,
        );

        this.boxZoom.offset = {
            x: this.mapContainer.left + this.mainContainer.left,
            y: this.mapContainer.top + this.mainContainer.top,
        };

        this.boxZoom.style.left = e.clientX - boxZoom.offset.x + 'px';
        this.boxZoom.style.top = e.clientY - boxZoom.offset.y + 'px';
        this.boxZoom.style.zIndex = 500;

        this.boxZoom.start = {
            x: e.clientX,
            y: e.clientY,
        };

        this.pageHasFocus = true;

        // TODO: Change name of mouse move and mouse up eventlisteners.
        this.boxZoom.mv = e => this.boxZoom_mouseMove(e);
        this.boxZoom.mup = e => this.boxZoom_mouseUp(e);

        document.addEventListener('mousemove', this.boxZoom.mv);
        document.addEventListener('mouseup', this.boxZoom.mup);
    }

    function boxZoom_mouseMove(e) {
        if (e.clientX > this.boxZoom.start.x) {
            this.boxZoom.style.left =
                this.boxZoom.start.x - this.boxZoom.offset.x + 'px';
            if (e.clientY > this.boxZoom.start.y) {
                this.boxZoom.style.top =
                    this.boxZoom.start.y - this.boxZoom.offset.y + 'px';
                this.boxZoom.style.width = e.clientX - this.boxZoom.start.x + 'px';
                this.boxZoom.style.height = e.clientY - this.boxZoom.start.y + 'px';
            } else {
                this.boxZoom.style.top = e.clientY - this.boxZoom.offset.y + 'px';
                this.boxZoom.style.width = e.clientX - this.boxZoom.start.x + 'px';
                this.boxZoom.style.height = this.boxZoom.start.y - e.clientY + 'px';
            }
        } else if (this.boxZoom.start.x > e.clientX) {
            this.boxZoom.style.left = e.clientX - this.boxZoom.offset.x + 'px';
            if (e.clientY > this.boxZoom.start.y) {
                this.boxZoom.style.top =
                    this.boxZoom.start.y - this.boxZoom.offset.y + 'px';
                this.boxZoom.style.width = this.boxZoom.start.x - e.clientX + 'px';
                this.boxZoom.style.height = e.clientY - this.boxZoom.start.y + 'px';
            } else {
                this.boxZoom.style.top = e.clientY - this.boxZoom.offset.y + 'px';
                this.boxZoom.style.width = this.boxZoom.start.x - e.clientX + 'px';
                this.boxZoom.style.height = this.boxZoom.start.y - e.clientY + 'px';
            }
        }
        this.boxZoomCenter_mouseMove(
            this.boxZoom.style.height,
            this.boxZoom.style.width,
        );
    }

    function boxZoom_mouseUp(e) {
        var width = Math.abs(e.clientX - this.boxZoom.start.x);
        var height = Math.abs(e.clientY - this.boxZoom.start.y);
        var x = e.clientX > this.boxZoom.start.x ? e.clientX : boxZoom.start.x;
        var y = e.clientY > this.boxZoom.start.y ? e.clientY : boxZoom.start.y;
        var center = this.getPixelPointInMapContainer(
            this.toPoint(x - width / 2, y - height / 2),
        );

        document.removeEventListener('mousemove', this.boxZoom.mv);
        document.removeEventListener('mouseup', this.boxZoom.mup);

        this.boxZoom.style[this.CSS_TRANSITION] = 'opacity 0.15s ease-in-out';
        this.boxZoom.style.opacity = 0;

        this.panning_module.enablePanning();

        this.boxZoom.parentElement.removeChild(boxZoom);

        if (
            e.clientX === this.boxZoom.start.clientX &&
            e.clientY === this.boxZoom.start.clientY
        ) {
            this.boxZoom = null;
            return;
        }

        this.boxZoom = null;

        this.boxZoom_doZoom({
            height,
            width,
            center,
        });
    }

    function boxZoom_doZoom(obj) {
        let projectedCenter = this.screenPointToProjection(obj.center);
        let height = null;
        let width = null;
        let multiplier = null;

        for (let h = 0; h < 50 /*prevent endless loop*/; h++) {
            multiplier = Math.pow(2, h);
            width = obj.width * multiplier;
            height = obj.height * multiplier;

            if (
                height > this.mapContainer.height ||
                width > this.mapContainer.width
            ) {
                h -= 1;
                this.zoomTo(projectedCenter, this.zoom + h);
                break;
            }
        }
    }

    function boxZoomCenter_mouseMove(height, width) {
        height = height.replace('px', '');
        width = width.replace('px', '');
        this.boxZoomCenter.style.transform =
            'translate(' + (width / 2 - 3) + 'px, ' + (height / 2 - 3) + 'px)';
    }

    exports.NewMap = NewMap;
    exports.BasicEventSystem = BasicEventSystem;
    exports.BasicInteractiveElement = BasicInteractiveElement;
    exports.BasicLayer = BasicLayer;
    exports.ArcRenderLayer = ArcRenderLayer;
    exports.ArcXMLLayer = ArcXMLLayer;
    exports.googleToState = googleToState;
    exports.BaseTileLayer = BaseTileLayer;
    exports.ArcGISTileLayer = ArcGISTileLayer;
    exports.SphericalMercatorTileLayer = SphericalMercatorTileLayer;
    exports.transformation = transformation;
    exports.toPoint = toPoint;
    exports.convertSPToWGS84 = convertSPToWGS84;
    exports.MarkerBasics = MarkerBasics;
    exports.MakeMarker = MakeMarker;
    exports.makeMarker = makeMarker;
    exports.makePopup = makePopup;
    exports.panning_module = panning_module;

    Object.defineProperty(exports, '__esModule', { value: true });

    /* Fancy new Rollup.js outro! */ window.NewMap = exports;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNFdmVudFN5c3RlbV9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS91dGlscy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9wYW5uaW5nX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9NYWluX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL1pvb21fY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9BcmNSZW5kZXJMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9BcmNYTUxMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9CYXNlVGlsZUxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0FyY0dJU1RpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9TcGhlcmljYWxNZXJjYXRvclRpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9jb29yZGluYXRlX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9tYXJrZXJfbW9kdWxlLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2JveFpvb21fbW9kdWxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgb24ocF90eXBlLCBwX2Z1bmMsIG9wdF90aGlzKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0gPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0ucHVzaCh7IGZuOiBwX2Z1bmMsIF90aGlzOiBvcHRfdGhpcyB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgb2ZmKHBfdHlwZSwgcF9mdW5jLCBvcHRfdGhpcykge1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzT2JqLmhhc093blByb3BlcnR5KHBfdHlwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgZXZ0QXJyYXkgPSB0aGlzLmV2ZW50c09ialtwX3R5cGVdO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IGV2dEFycmF5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGlmIChldnRBcnJheVtuXS5mbiA9PT0gcF9mdW5jICYmIGV2dEFycmF5W25dLl90aGlzID09PSBvcHRfdGhpcykge1xyXG4gICAgICAgICAgICAgICAgZXZ0QXJyYXlbbl0uZm4gPSB0aGlzLl96b21iaWVGbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbGVhbihwX3R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIF96b21iaWVGbigpIHtcclxuICAgICAgICByZXR1cm4gXCJab21iaWUgY2FsbGJhY2sgd29ya3MgcmVhbCBoYXJkLlwiO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFuKHBfdHlwZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl9kZWxab21iaWVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RlbFpvbWJpZXMocF90eXBlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuY2xlYW4uYmluZCh0aGlzLCBwX3R5cGUpLCAxMDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2RlbFpvbWJpZXMocF90eXBlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdGhpcy5ldmVudHNPYmpbcF90eXBlXS5sZW5ndGg7IG4rKykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ldmVudHNPYmpbcF90eXBlXVtuXS5mbiA9PT0gdGhpcy5fem9tYmllRm4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0uc3BsaWNlKG4sIDEpO1xyXG4gICAgICAgICAgICAgICAgLS1uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFsbE9mZihwX3RoaXMpIHtcclxuICAgICAgICB2YXIgZXZ0T2JqID0gdGhpcy5ldmVudHNPYmo7XHJcbiAgICAgICAgdmFyIHR5cGVzID0gT2JqZWN0LmtleXMoZXZ0T2JqKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0eXBlcy5sZW5ndGg7IG0rKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBuID0gZXZ0T2JqW3R5cGVzW21dXS5sZW5ndGggLSAxOyBuID49IDA7IG4tLSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2dE9ialt0eXBlc1ttXV1bbl0uX3RoaXMgPT09IHBfdGhpcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2dE9ialt0eXBlc1ttXV1bbl0uZm4gPSB0aGlzLl96b21iaWVGbjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFuKHR5cGVzW21dKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmaXJlKHBfdHlwZSwgb3B0X2V2dCkge1xyXG4gICAgICAgIGlmICghdGhpcy5ldmVudHNPYmouaGFzT3duUHJvcGVydHkocF90eXBlKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZXZ0QXJyYXkgPSB0aGlzLmV2ZW50c09ialtwX3R5cGVdO1xyXG4gICAgICAgIGxldCBwb2ludGVyVG9fZGVsWm9tYmllcyA9IHRoaXMuX2RlbFpvbWJpZXM7XHJcbiAgICAgICAgdGhpcy5fZGVsWm9tYmllcyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGV2dEFycmF5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGV2dEFycmF5W25dLmZuLmNhbGwoZXZ0QXJyYXlbbl0uX3RoaXMsIG9wdF9ldnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZGVsWm9tYmllcyA9IHBvaW50ZXJUb19kZWxab21iaWVzO1xyXG4gICAgfVxyXG59XHJcbiIsImV4cG9ydCBmdW5jdGlvbiBzaW1wbGVNZXNzYWdlQm94KGFyZ19pbm5lckhUTUwsIGFyZ19pZCwgYXJnX3dpZHRoKSB7XHJcbiAgICB2YXIgbWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG5cclxuICAgIG1lc3NhZ2UuY2xhc3NOYW1lID0gJ3NpbXBsZU1lc3NhZ2VCb3gnO1xyXG5cclxuICAgIG1lc3NhZ2Uuc3R5bGUud2lkdGggPSAoYXJnX3dpZHRoICYmIGFyZ193aWR0aCArICdweCcpIHx8ICczMDBweCc7XHJcbiAgICBtZXNzYWdlLnN0eWxlLmxlZnQgPVxyXG4gICAgICAgIHdpbmRvdy5pbm5lcldpZHRoIC8gMiAtICgoYXJnX3dpZHRoICYmIGFyZ193aWR0aCAvIDIpIHx8IDE1MCkgKyAncHgnO1xyXG5cclxuICAgIG1lc3NhZ2UuaWQgPSBhcmdfaWQgfHwgJ3NpbXBsZV9tZXNzYWdlX2JveCc7XHJcblxyXG4gICAgbWVzc2FnZS5pbm5lckhUTUwgPSBhcmdfaW5uZXJIVE1MO1xyXG5cclxuICAgIG1lc3NhZ2Uub25jbGljayA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgIH07XHJcblxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChtZXNzYWdlKTtcclxuXHJcbiAgICByZXR1cm4gbWVzc2FnZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRlc3RQcm9wKHByb3BzKSB7XHJcbiAgICAvLyBHb3QgdGhpcyBmcm9tIGxlYWZsZXRcclxuICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHByb3BzW2ldIGluIHN0eWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wc1tpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5leHBvcnQgbGV0IENTU19UUkFOU0ZPUk0gPSB0ZXN0UHJvcChbXHJcbiAgICAndHJhbnNmb3JtJyxcclxuICAgICdXZWJraXRUcmFuc2Zvcm0nLFxyXG4gICAgJ09UcmFuc2Zvcm0nLFxyXG4gICAgJ01velRyYW5zZm9ybScsXHJcbiAgICAnbXNUcmFuc2Zvcm0nLFxyXG5dKTtcclxuZXhwb3J0IGxldCBDU1NfVFJBTlNJVElPTiA9IHRlc3RQcm9wKFtcclxuICAgICd0cmFuc2l0aW9uJyxcclxuICAgICdXZWJraXRUcmFuc2l0aW9uJyxcclxuICAgICdPVHJhbnNpdGlvbicsXHJcbiAgICAnTW96VHJhbnNpdGlvbicsXHJcbiAgICAnbXNUcmFuc2l0aW9uJyxcclxuXSk7XHJcblxyXG4vL2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbCNCcm93c2VyX2NvbXBhdGliaWxpdHlcclxuZXhwb3J0IGxldCBNT1VTRV9XSEVFTF9FVlQgPVxyXG4gICAgJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICA/ICd3aGVlbCcgLy8gTW9kZXJuIGJyb3dzZXJzIHN1cHBvcnQgXCJ3aGVlbFwiXHJcbiAgICA6IGRvY3VtZW50Lm9ubW91c2V3aGVlbCAhPT0gdW5kZWZpbmVkXHJcbiAgICA/ICdtb3VzZXdoZWVsJyAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcclxuICAgIDogJ0RPTU1vdXNlU2Nyb2xsJzsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XHJcblxyXG5cclxuXHJcblxyXG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYW5uaW5nX21vZHVsZSh0aGlzTWFwKSB7XHJcbiAgICBsZXQgdHJhbnNpdGlvblJlc2V0VGltZW91dCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzTWFwLnBhbiA9IHtcclxuICAgICAgICBtYWluQ29udGFpbmVyWFk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWDogbnVsbCxcclxuICAgICAgICBtb3VzZURvd25YT2Zmc2V0OiBudWxsLFxyXG4gICAgICAgIG1vdXNlRG93blk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWU9mZnNldDogbnVsbCxcclxuICAgICAgICBwYW5uaW5nRnVuY3Rpb246IG1hcERyYWdBbmRBbmltYXRpb24sXHJcbiAgICAgICAgcG9pbnRzOiBudWxsLFxyXG4gICAgICAgIHNwQ29vcmRzOiBudWxsLFxyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBtb3VzZURvd24oZSkge1xyXG4gICAgICAgIC8vIERvIHNvbWV0aGluZyBoZXJlP1xyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlRG93bihlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX3Bhbm5pbmdNb3VzZURvd24oZSkge1xyXG4gICAgICAgIGxldCBldnQgPSBlLl9fZXZlbnRfXztcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHBhbi5tb3VzZURvd25YID0gZXZ0LmNsaWVudFg7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93blkgPSBldnQuY2xpZW50WTtcclxuICAgICAgICBwYW4ubW91c2VEb3duWE9mZnNldCA9IGV2dC5jbGllbnRYIC0gdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93bllPZmZzZXQgPSBldnQuY2xpZW50WSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3A7XHJcblxyXG4gICAgICAgIHBhbi5wb2ludHMgPSBbXTsgLy8gVE9ETzogdGVzdGluZ1xyXG5cclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uKCk7XHJcblxyXG4gICAgICAgIHBhbi5tYWluQ29udGFpbmVyWFkgPSB7XHJcbiAgICAgICAgICAgIHg6IHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHBhbi5zcENvb3JkcyA9IHtcclxuICAgICAgICAgICAgeDogdGhpc01hcC5leHRlbnQudmlzaWJsZS54LFxyXG4gICAgICAgICAgICBYOiB0aGlzTWFwLmV4dGVudC52aXNpYmxlLlgsXHJcbiAgICAgICAgICAgIHk6IHRoaXNNYXAuZXh0ZW50LnZpc2libGUueSxcclxuICAgICAgICAgICAgWTogdGhpc01hcC5leHRlbnQudmlzaWJsZS5ZLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW91dCcsXHJcbiAgICAgICAgICAgIHByaXZhdGVfcmVtb3ZlUGFubmluZ0V2ZW50TGlzdGVuZXJzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbWFwSW5pdGlhbERyYWdUYXNrcyk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpc01hcC5wYW4ucGFubmluZ0Z1bmN0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX21hcE1vdXNlVXAoZSkge1xyXG4gICAgICAgIC8vIG1vdXNlIHVwIGZvciB0aGUgaW1hZ2VcclxuICAgICAgICBpZiAoZS5yZWxhdGVkVGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSk7XHJcblxyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlVXAoZSk7XHJcbiAgICAgICAgLy90aGlzTWFwLmV2ZW50LmZpcmUoXCJtYXAgbW91c2UgdXBcIiwgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9wYW5uaW5nTW91c2VVcChlKSB7XHJcbiAgICAgICAgbGV0IGV2dCA9IGUuX19ldmVudF9fIHx8IGU7XHJcbiAgICAgICAgbGV0IHBhbiA9IHRoaXNNYXAucGFuO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGV2dC5jbGllbnRZIC0gcGFuLm1vdXNlRG93blkgIT09IDAgfHxcclxuICAgICAgICAgICAgZXZ0LmNsaWVudFggLSBwYW4ubW91c2VEb3duWCAhPT0gMFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzTWFwLnBhbm5pbmdfbW9kdWxlLnBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbihldnQpO1xyXG5cclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCAtIHBhbi5tYWluQ29udGFpbmVyWFkueCxcclxuICAgICAgICAgICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgLSBwYW4ubWFpbkNvbnRhaW5lclhZLnksXHJcbiAgICAgICAgICAgICAgICBwYW4uc3BDb29yZHNcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5zdGF0ZS5wYW5uaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSkge1xyXG4gICAgICAgIGlmIChlLnJlbGF0ZWRUYXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgcHJpdmF0ZV9tYXBNb3VzZVVwKTtcclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXNNYXAucGFuLnBhbm5pbmdGdW5jdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWFwSW5pdGlhbERyYWdUYXNrcyhlKSB7XHJcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBhbmQgaW1tZWRpYXRlbHkgcmVtb3ZlZCBqdXN0IHRvIG1ha2UgdGhlXHJcbiAgICAgICAgLy8gcGFubmluZyBmZWVsIHNtb290aGVyLlxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICAgZS5jbGllbnRZIC0gdGhpc01hcC5wYW4ubW91c2VEb3duWSA9PT0gMCAmJlxyXG4gICAgICAgICAgICBlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YID09PSAwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIEEgYnVnIGluIGNocm9tZSB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBpZiBhIG1vdXNlZG93biBldmVudCBoYXBwZW5zLlxyXG4gICAgICAgICAgICAvLyBCdWcgaGFzbid0IGJlZW4gZml4ZWQgaW4gYXRsZWFzdCBjaHJvbWUgdmVyc2lvbiA1MS4wLjI3MDQuMTAzXHJcbiAgICAgICAgICAgIC8vIGFuZCBlYXJsaWVyLlxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gJyc7XHJcblxyXG4gICAgICAgIC8vIEVuZCBhbnkgem9vbWluZyBhY3Rpdml0eVxyXG4gICAgICAgIC8vdGhpc01hcC5ab29tX2NsYXNzLnpvb21TdG9wKCk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuc3RhdGUucGFubmluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGluaXRpYWwnLCBlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXBEcmFnT25seShlKSB7XHJcbiAgICAgICAgbGV0IG1haW5Db250ID0gdGhpc01hcC5tYWluQ29udGFpbmVyO1xyXG4gICAgICAgIGxldCB4ID0gbWFpbkNvbnQubGVmdCArIChlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YKTtcclxuICAgICAgICBsZXQgeSA9IG1haW5Db250LnRvcCArIChlLmNsaWVudFkgLSB0aGlzTWFwLnBhbi5tb3VzZURvd25ZKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cmFuc2xhdGUoXCIrIHggK1wicHgsIFwiKyB5ICtcInB4KVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1hcERyYWdBbmRBbmltYXRpb24oZSkge1xyXG4gICAgICAgIGxldCBtYWluQ29udCA9IHRoaXNNYXAubWFpbkNvbnRhaW5lcjtcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGxldCBkaXN0YW5jZVggPSBwYW4ubWFpbkNvbnRhaW5lclhZLnggKyBlLmNsaWVudFggLSBwYW4ubW91c2VEb3duWCxcclxuICAgICAgICAgICAgZGlzdGFuY2VZID0gcGFuLm1haW5Db250YWluZXJYWS55ICsgZS5jbGllbnRZIC0gcGFuLm1vdXNlRG93blk7XHJcblxyXG4gICAgICAgIG1haW5Db250LnRvcCA9IGRpc3RhbmNlWTtcclxuICAgICAgICBtYWluQ29udC5sZWZ0ID0gZGlzdGFuY2VYO1xyXG5cclxuICAgICAgICB0aGlzTWFwLnBhbi5wb2ludHMucHVzaCh7XHJcbiAgICAgICAgICAgIHg6IGRpc3RhbmNlWCxcclxuICAgICAgICAgICAgeTogZGlzdGFuY2VZLFxyXG4gICAgICAgICAgICB0aW1lOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgXCJ0cmFuc2xhdGUzZChcIisgZGlzdGFuY2VYICtcInB4LCBcIisgZGlzdGFuY2VZICtcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuJywgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFuVG8oc3BQb2ludCwgcGFuVGltZSkge1xyXG4gICAgICAgIGxldCBweGxQb2ludCA9IHRoaXNNYXAuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyLmJpbmQodGhpc01hcCk7XHJcbiAgICAgICAgbGV0IGNvbnZlcnRTcFRvUHhsID0gdGhpc01hcC5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpc01hcCk7XHJcblxyXG4gICAgICAgIGxldCBjZW50ZXJQeGxzID0gcHhsUG9pbnQoe1xyXG4gICAgICAgICAgICB4OiB0aGlzTWFwLm1hcENvbnRhaW5lci5sZWZ0ICsgdGhpc01hcC5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1hcENvbnRhaW5lci50b3AgKyB0aGlzTWFwLm1hcENvbnRhaW5lci5oZWlnaHQgLyAyLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGxldCBwb2ludE9mSW50ZXJlc3RQeGwgPSBjb252ZXJ0U3BUb1B4bChzcFBvaW50KTtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSB7XHJcbiAgICAgICAgICAgIHg6IGNlbnRlclB4bHMueCAtIHBvaW50T2ZJbnRlcmVzdFB4bC54LFxyXG4gICAgICAgICAgICB5OiBjZW50ZXJQeGxzLnkgLSBwb2ludE9mSW50ZXJlc3RQeGwueSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwYW5CeVBpeGVscyhkaXN0YW5jZSwgcGFuVGltZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzTWFwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhbkJ5UGl4ZWxzKHNwUG9pbnQsIHBhblRpbWUpIHtcclxuICAgICAgICBsZXQgbWFpbkNvbnQgPSB0aGlzTWFwLm1haW5Db250YWluZXI7XHJcbiAgICAgICAgbGV0IHZlY3RvckxlbiA9IE1hdGguc3FydChcclxuICAgICAgICAgICAgc3BQb2ludC54ICogc3BQb2ludC54ICsgc3BQb2ludC55ICogc3BQb2ludC55LFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFBsYXllZCBhcm91bmQgd2l0aCB0aGlzIG9uIGEgZ3JhcGhpbmcgd2Vic2l0ZSwgbWlnaHQgd2FudCB0byByZXZpc2l0IGluIHRoZSBmdXR1cmUuXHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KFxyXG4gICAgICAgICAgICAyMDAsXHJcbiAgICAgICAgICAgIHZlY3RvckxlbiAqICg1MDAgKiAoMC40NSAvIHZlY3RvckxlbiAqKiAwLjkpICsgMC4wNiksXHJcbiAgICAgICAgKTtcclxuICAgICAgICBsZXQgdGltZSA9IHBhblRpbWUgfHwgTWF0aC5taW4oMTAwMCwgbWF4KTtcclxuXHJcbiAgICAgICAgbWFpbkNvbnQubGVmdCArPSBNYXRoLnJvdW5kKHNwUG9pbnQueCk7XHJcbiAgICAgICAgbWFpbkNvbnQudG9wICs9IE1hdGgucm91bmQoc3BQb2ludC55KTtcclxuXHJcbiAgICAgICAgdGhpc01hcC51cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZShzcFBvaW50LngsIHNwUG9pbnQueSk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQmxvY2sgZm9yIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9XHJcbiAgICAgICAgICAgICAgICBcImFsbCBcIiArIHRpbWUgKyBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjI1LCAxKVwiO1xyXG5cclxuICAgICAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICBcInRyYW5zbGF0ZTNkKFwiICsgbWFpbkNvbnQubGVmdCArIFwicHgsXCIgKyBtYWluQ29udC50b3AgKyBcInB4LDBweClcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9IG51bGw7XHJcbiAgICAgICAgfSwgdGltZSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcsIHtwYW5FbmRUaW1lOiB0aW1lfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICBsZXQgdHJhbnNpc3Rpb25EdXJhdGlvbk1TID0gMjIwMDtcclxuXHJcbiAgICAgICAgbGV0IHBvaW50cyA9IHRoaXNNYXAucGFuLnBvaW50cztcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBwb2ludHMubGVuZ3RoIDwgMyB8fFxyXG4gICAgICAgICAgICBEYXRlLm5vdygpIC0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXS50aW1lID4gMTUwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFydFBvaW50ID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgb2Zmc2V0UG9pbnQgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAtIDNdO1xyXG5cclxuICAgICAgICBsZXQgZGVsdGFBID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAyXSxcclxuICAgICAgICAgICAgZGVsdGFCID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAzXSxcclxuICAgICAgICAgICAgZGVsdGFYID0gZGVsdGFBLnggLSBkZWx0YUIueCxcclxuICAgICAgICAgICAgZGVsdGFZID0gZGVsdGFBLnkgLSBkZWx0YUIueSxcclxuICAgICAgICAgICAgYW5nbGUgPSBNYXRoLmF0YW4yKGRlbHRhWSwgZGVsdGFYKTtcclxuXHJcbiAgICAgICAgbGV0IHBMZW4gPSBwb2ludHMubGVuZ3RoO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCB0aW1lID0gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgIChwb2ludHNbcExlbi0xXS50aW1lIC0gcG9pbnRzW3BMZW4tMl0udGltZSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICsgKHBvaW50c1twTGVuLTJdLnRpbWUgLSBwb2ludHNbcExlbi0zXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgICAgKSAvIDI7XHJcblxyXG4gICAgICAgIGxldCBvZmZzZXRYID0gc3RhcnRQb2ludC54IC0gb2Zmc2V0UG9pbnQueCxcclxuICAgICAgICAgICAgb2Zmc2V0WSA9IHN0YXJ0UG9pbnQueSAtIG9mZnNldFBvaW50Lnk7XHJcblxyXG4gICAgICAgIGxldCBkaXN0ID0gTWF0aC5zcXJ0KG9mZnNldFggKiBvZmZzZXRYICsgb2Zmc2V0WSAqIG9mZnNldFkpO1xyXG4gICAgICAgIGxldCBzcGVlZCA9IGRpc3QgLyB0aW1lO1xyXG5cclxuICAgICAgICBpZiAoZGlzdCA8PSAyIHx8IHRpbWUgPT09IDApIHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgZGlzdGFuY2UgbmVlZGVkIHRvIHRyYXZlbC5cclxuICAgICAgICAvLyBncmFwaCAtPiBodHRwczovL3d3dy5kZXNtb3MuY29tL2NhbGN1bGF0b3Ivd29wcWRicnU0eVxyXG4gICAgICAgIGxldCBkYW1wZW4gPVxyXG4gICAgICAgICAgICBNYXRoLnNxcnQoTWF0aC5sb2cxMChNYXRoLmxvZzEwKHNwZWVkICoqIDMgKyAxKSAqKiAxNSArIDEpKSAqKlxyXG4gICAgICAgICAgICAgICAgMC4wNyAvXHJcbiAgICAgICAgICAgIDQ7XHJcblxyXG4gICAgICAgIGxldCB2ZWN0b3JMZW5ndGggPSBzcGVlZCAqKiAxLjA5ICogNDAwICogZGFtcGVuO1xyXG4gICAgICAgIC8vc3BlZWQqKjAuNiAqICg0MCAqIE1hdGguc3FydChzcGVlZCoqMS42KSk7XHJcbiAgICAgICAgLy9zcGVlZCAqICgyMCAqIE1hdGguc3FydChzcGVlZCkpO1xyXG4gICAgICAgIC8vc3BlZWQgKiAxNTAgLSA2MDsgLy8gRm91bmQgdGhpcyBtYWdpYyBudW1iZXIgdGhyb3VnaCB0cmlhbCBhbmQgZXJyb3IuXHJcblxyXG4gICAgICAgIHRyYW5zaXN0aW9uRHVyYXRpb25NUyAqPSBkYW1wZW47XHJcblxyXG4gICAgICAgIC8vIE5ldyB2ZWN0b3IuXHJcbiAgICAgICAgbGV0IHZlY3RvciA9IHtcclxuICAgICAgICAgICAgcmlzZTogdmVjdG9yTGVuZ3RoICogTWF0aC5zaW4oYW5nbGUpLFxyXG4gICAgICAgICAgICBydW46IHZlY3Rvckxlbmd0aCAqIE1hdGguY29zKGFuZ2xlKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGZpbmFsIHggYW5kIHkgcG9zaXRpb25zIGZvciB0aGUgYW5pbWF0aW9uLlxyXG4gICAgICAgIC8vIFJvdW5kaW5nIHRoZSBjb29yZGluYXRlcyBzbyB0aGF0IHRoZSB0ZXh0IG9uIHRoZSBtYXJrZXJzIGluIGNocm9tZSBpcyBub3QgYmx1cnJ5LlxyXG4gICAgICAgIGxldCBmaW5pc2hQb2ludCA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5yb3VuZCh2ZWN0b3IucnVuICsgc3RhcnRQb2ludC54KSxcclxuICAgICAgICAgICAgeTogTWF0aC5yb3VuZCh2ZWN0b3IucmlzZSArIHN0YXJ0UG9pbnQueSksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQgPSBmaW5pc2hQb2ludC54O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSBmaW5pc2hQb2ludC55O1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIuZWxlbWVudFxyXG4gICAgICAgICAgICAuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gXCJ0cmFuc2Zvcm0gXCIgKyB0cmFuc2lzdGlvbkR1cmF0aW9uTVMgK1xyXG4gICAgICAgICAgICBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjMsIDEpXCI7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50XHJcbiAgICAgICAgICAgIC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlM2QoXCIgKyBmaW5pc2hQb2ludC54ICsgXCJweCxcIiArXHJcbiAgICAgICAgICAgIGZpbmlzaFBvaW50LnkgKyBcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIC8vIFJlc2V0IHRyYW5zaXRpb24uXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG5cclxuICAgICAgICB0cmFuc2l0aW9uUmVzZXRUaW1lb3V0ID0gc2V0VGltZW91dChcclxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNJVElPTl0gPSAnJztcclxuICAgICAgICAgICAgfS5iaW5kKHRoaXNNYXApLFxyXG4gICAgICAgICAgICB0cmFuc2lzdGlvbkR1cmF0aW9uTVMsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wUGFuQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBsZXQgcG9zT25CZXppZXJDdXJ2ZSA9IGRvY3VtZW50LmRlZmF1bHRWaWV3XHJcbiAgICAgICAgICAgIC5nZXRDb21wdXRlZFN0eWxlKHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50KVxyXG4gICAgICAgICAgICAudHJhbnNmb3JtLm1hdGNoKC8oLT9cXGQqLj9cXGQqKSwgKC0/XFxkKi4/XFxkKilcXCkkLyk7XHJcblxyXG4gICAgICAgIGlmICghcG9zT25CZXppZXJDdXJ2ZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeCA9IE1hdGgucm91bmQocG9zT25CZXppZXJDdXJ2ZVsxXSksIC8vTWF0aC5yb3VuZChwYW4uYW5pbS5zdGFydFBvaW50LnggLSAoKHBhbi5hbmltLnN0YXJ0UG9pbnQueCAtIHBhbi5hbmltLmVuZFBvaW50LngpICogcG9zT25CZXppZXJDdXJ2ZSkpLFxyXG4gICAgICAgICAgICB5ID0gTWF0aC5yb3VuZChwb3NPbkJlemllckN1cnZlWzJdKTsgLy9NYXRoLnJvdW5kKHBhbi5hbmltLnN0YXJ0UG9pbnQueSAtICgocGFuLmFuaW0uc3RhcnRQb2ludC55IC0gcGFuLmFuaW0uZW5kUG9pbnQueSkgKiBwb3NPbkJlemllckN1cnZlKSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgIHggLSB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCxcclxuICAgICAgICAgICAgeSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KSc7XHJcblxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSB5O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0ID0geDtcclxuXHJcbiAgICAgICAgdGhpc01hcC5ldmVudC5maXJlKCdzdG9wUGFuQW5pbWF0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZW5hYmxlUGFubmluZygpIHtcclxuICAgICAgICB0aGlzTWFwLmV2ZW50Lm9uKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRpc2FibGVQYW5uaW5nKCkge1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQub2ZmKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcGFuVG86IHBhblRvLFxyXG4gICAgICAgIHBhbkJ5UGl4ZWxzOiBwYW5CeVBpeGVscyxcclxuICAgICAgICBlbmFibGVQYW5uaW5nOiBlbmFibGVQYW5uaW5nLFxyXG4gICAgICAgIGRpc2FibGVQYW5uaW5nOiBkaXNhYmxlUGFubmluZyxcclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uOiBzdG9wUGFuQW5pbWF0aW9uLFxyXG4gICAgICAgIG1hcERyYWdPbmx5OiBtYXBEcmFnT25seSxcclxuICAgICAgICBtYXBEcmFnQW5kQW5pbWF0aW9uOiBtYXBEcmFnQW5kQW5pbWF0aW9uLFxyXG4gICAgICAgIHBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbjogcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uLFxyXG4gICAgfTtcclxufVxyXG4iLCJpbXBvcnQge0Jhc2ljRXZlbnRTeXN0ZW19IGZyb20gJy4vQmFzaWNFdmVudFN5c3RlbV9jbGFzcyc7XHJcbmltcG9ydCB7cGFubmluZ19tb2R1bGV9IGZyb20gJy4vcGFubmluZ19tb2R1bGUnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOZXdNYXAgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKHNwUG9pbnQsIHBfem9vbSwgcGFyYW1ldGVycykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgICAgICB0aGlzLmluaXQoc3BQb2ludCwgcF96b29tKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KHNwUG9pbnQsIHBfem9vbSkge1xyXG4gICAgICAgIHRoaXMuem9vbSA9IDA7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbXMgPSB0aGlzLnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbUluZGV4ID0gcGFyYW1zLnpvb21JbmRleDtcclxuICAgICAgICB0aGlzLm1heFpvb20gPVxyXG4gICAgICAgICAgICBwYXJhbXMubWF4Wm9vbSB8fCAodGhpcy56b29tSW5kZXggJiYgdGhpcy56b29tSW5kZXgubGVuZ3RoKSB8fCAyNDtcclxuICAgICAgICB0aGlzLm1pblpvb20gPSBwYXJhbXMubWluWm9vbSB8fCAwO1xyXG4gICAgICAgIHRoaXMuem9vbURlbHRhID0gcGFyYW1zLnpvb21EZWx0YSB8fCAxO1xyXG5cclxuICAgICAgICB0aGlzLk1PVVNFX1dIRUVMX0VWVCA9IHV0aWxzLk1PVVNFX1dIRUVMX0VWVDtcclxuICAgICAgICB0aGlzLkNTU19UUkFOU0ZPUk0gPSB1dGlscy5DU1NfVFJBTlNGT1JNO1xyXG4gICAgICAgIHRoaXMuQ1NTX1RSQU5TSVRJT04gPSB1dGlscy5DU1NfVFJBTlNJVElPTjtcclxuXHJcbiAgICAgICAgdGhpcy5tYWtlQ29udGFpbmVycygpO1xyXG4gICAgICAgIHRoaXMubG9hZE1vZHVsZXMoKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZXh0ZW50ID0ge1xyXG4gICAgICAgICAgICB2aXNpYmxlOiB7fSxcclxuICAgICAgICAgICAgZnVsbDoge30sIC8vIFRPRE86IEN1cnJlbnRseSBub3QgdXNlZCBieSBhbnl0aGluZy5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRlID0ge3pvb21pbmc6IGZhbHNlfTsgLy8gVG9kbzogRGVsZXRlIGV2ZW50dWFsbHkuXHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlQ29udGFpbmVyU2l6ZSgpOyAvLyBUb2RvOiBJcyB0aGlzIHRoZSBiZXN0IHdheT9cclxuXHJcbiAgICAgICAgaWYgKHNwUG9pbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRWaWV3KHNwUG9pbnQsIHBfem9vbSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNldFZpZXcoc3BQb2ludCwgem9vbSkge1xyXG4gICAgICAgIHNwUG9pbnQgPSB0aGlzLnRvUG9pbnQoc3BQb2ludCk7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbSA9IHpvb207XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHRSYXRpbyA9IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgICAgIGxldCByZXNvbHV0aW9uID1cclxuICAgICAgICAgICAgdGhpcy5tYXBDb250YWluZXIud2lkdGggLyp3aW5kb3cuaW5uZXJXaWR0aCovICpcclxuICAgICAgICAgICAgdGhpcy5nZXRSZXNvbHV0aW9uKHpvb20pOyAvKjE3LjM2MTExMTExMTExMTExOyovXHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZSA9IHtcclxuICAgICAgICAgICAgeDogc3BQb2ludC54IC0gcmVzb2x1dGlvbiAvIDIsXHJcbiAgICAgICAgICAgIFg6IHNwUG9pbnQueCArIHJlc29sdXRpb24gLyAyLFxyXG4gICAgICAgICAgICB5OiBzcFBvaW50LnkgLSAocmVzb2x1dGlvbiAvIDIpICogaGVpZ2h0UmF0aW8sXHJcbiAgICAgICAgICAgIFk6IHNwUG9pbnQueSArIChyZXNvbHV0aW9uIC8gMikgKiBoZWlnaHRSYXRpbyxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuc3RhdGUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUubG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5ldmVudC5maXJlKCdsb2FkZWQnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3VwZGF0ZSBldmVyeXRoaW5nJyk7IC8vIFRvZG86IE1heWJlIHRoZSBldmVudCBzaG91bGQgYmUgXCJzZXR2aWV3XCI/XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lclNpemUocGFuVG9NaWQpIHtcclxuICAgICAgICBsZXQgY29udGFpbmVyUmVjdCA9IHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIud2lkdGggPSB0aGlzLnBhcmFtZXRlcnMuY29udGFpbmVyLmNsaWVudFdpZHRoO1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCA9IHRoaXMucGFyYW1ldGVycy5jb250YWluZXIuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmxlZnQgPSBjb250YWluZXJSZWN0LmxlZnQ7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIudG9wID0gY29udGFpbmVyUmVjdC50b3A7XHJcblxyXG4gICAgICAgIC8vdGhpcy5tYXBDb250YWluZXIuZWxlbWVudC5zdHlsZS50b3AgPSB0aGlzLm1hcENvbnRhaW5lci50b3AgKyBcInB4XCI7XHJcbiAgICAgICAgLy90aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LnN0eWxlLmxlZnQgPSB0aGlzLm1hcENvbnRhaW5lci5sZWZ0ICsgXCJweFwiO1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID1cclxuICAgICAgICAgICAgdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LnN0eWxlLndpZHRoID0gdGhpcy5tYXBDb250YWluZXIud2lkdGggKyAncHgnO1xyXG5cclxuICAgICAgICBsZXQgbWlkUG9pbnQgPSB7XHJcbiAgICAgICAgICAgIHg6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggK1xyXG4gICAgICAgICAgICAgICAgKHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCkgLyAyLFxyXG4gICAgICAgICAgICB5OlxyXG4gICAgICAgICAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZS55ICtcclxuICAgICAgICAgICAgICAgICh0aGlzLmV4dGVudC52aXNpYmxlLlkgLSB0aGlzLmV4dGVudC52aXNpYmxlLnkpIC8gMixcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgaGVpZ2h0UmF0aW8gPSB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgLyB0aGlzLm1hcENvbnRhaW5lci53aWR0aDtcclxuICAgICAgICBsZXQgcmVzb2x1dGlvbiA9XHJcbiAgICAgICAgICAgIHRoaXMubWFwQ29udGFpbmVyLndpZHRoIC8qd2luZG93LmlubmVyV2lkdGgqLyAqXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0UmVzb2x1dGlvbih0aGlzLnpvb20pOyAvKjE3LjM2MTExMTExMTExMTExOyovXHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZSA9IHtcclxuICAgICAgICAgICAgeDogdGhpcy5leHRlbnQudmlzaWJsZS54LFxyXG4gICAgICAgICAgICBYOiB0aGlzLmV4dGVudC52aXNpYmxlLnggKyByZXNvbHV0aW9uLFxyXG4gICAgICAgICAgICB5OiB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSByZXNvbHV0aW9uICogaGVpZ2h0UmF0aW8sXHJcbiAgICAgICAgICAgIFk6IHRoaXMuZXh0ZW50LnZpc2libGUuWSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3VwZGF0ZUNvbnRhaW5lclNpemUnLCB0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKHBhblRvTWlkKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGFubmluZ19tb2R1bGUucGFuVG8obWlkUG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBtYWtlQ29udGFpbmVycygpIHtcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lciA9IHRoaXMubWFrZUNvbnRhaW5lcihkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIuZWxlbWVudC5jbGFzc05hbWUgPSAnX3RoZU1hcENvbnRhaW5lcl8nO1xyXG5cclxuICAgICAgICB0aGlzLm1haW5Db250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xyXG4gICAgICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50LnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICAgICAncG9zaXRpb246IGFic29sdXRlOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZTNkKDBweCwgMHB4LCAwcHgpIHNjYWxlM2QoMSwxLDEpOyc7XHJcblxyXG4gICAgICAgIHRoaXMuc3ZnQ29udGFpbmVyID0gdGhpcy5tYWtlQ29udGFpbmVyKFxyXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3N2ZycpLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5zdmdDb250YWluZXIuZWxlbWVudC5zZXRBdHRyaWJ1dGUoXHJcbiAgICAgICAgICAgICd4bWxuczp4bGluaycsXHJcbiAgICAgICAgICAgICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyxcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMuc3ZnQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9XHJcbiAgICAgICAgICAgICdwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7IHdpZHRoOiAxMDAwMDAwMHB4OyBoZWlnaHQ6IDEwMDAwMHB4OyBvdmVyZmxvdzogaGlkZGVuOyc7XHJcblxyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyID0gdGhpcy5tYWtlQ29udGFpbmVyKFxyXG4gICAgICAgICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9XHJcbiAgICAgICAgICAgICdwb3NpdGlvbjogcmVsYXRpdmU7IHotaW5kZXg6IDEwMDA7JztcclxuICAgICAgICB0aGlzLm1hcmtlckNvbnRhaW5lci5lbGVtZW50LmNsYXNzTmFtZSA9ICdfbWFya2VyQ29udGFpbmVyXyc7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuc3ZnQ29udGFpbmVyLmVsZW1lbnQpO1xyXG4gICAgICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzLmNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50KTtcclxuICAgICAgICAvLyBNYWtlIGEgem9vbSBzbGlkZXIgaGVyZT9cclxuICAgIH1cclxuXHJcbiAgICBtYWtlQ29udGFpbmVyKGVsKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLy8gVG9kbyBmaW5pc2ggdGhpcyB0YXNrLlxyXG4gICAgICAgICAgICBlbGVtZW50OiBlbCxcclxuICAgICAgICAgICAgbGVmdDogbnVsbCxcclxuICAgICAgICAgICAgdG9wOiBudWxsLFxyXG4gICAgICAgICAgICB3aWR0aDogbnVsbCxcclxuICAgICAgICAgICAgaGVpZ2h0OiBudWxsLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZE1vZHVsZXMoKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudCA9IG5ldyBCYXNpY0V2ZW50U3lzdGVtKCk7IC8vIFRPRE86IENoYW5nZSB0aGlzIGluIGZ1dHVyZTtcclxuXHJcbiAgICAgICAgdGhpcy5wYW5uaW5nX21vZHVsZSA9IHBhbm5pbmdfbW9kdWxlKHRoaXMpO1xyXG4gICAgICAgIC8vIHRoaXMuYm94Wm9vbV9tb2R1bGUgPSBib3hab29tX21vZHVsZSh0aGlzKTtcclxuICAgICAgICAvLyB0aGlzLlpvb21fY2xhc3MgPSBuZXcgWm9vbV9jbGFzcyh0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICBsZXQgbWFwQ29udEVsID0gdGhpcy5tYXBDb250YWluZXIuZWxlbWVudDtcclxuXHJcbiAgICAgICAgdGhpcy5wYW5uaW5nX21vZHVsZS5lbmFibGVQYW5uaW5nKCk7XHJcblxyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICB0aGlzLk1PVVNFX1dIRUVMX0VWVCxcclxuICAgICAgICAgICAgZXZ0ID0+IHtcclxuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBfZXZ0XyA9IHVuZGVmaW5lZDsgLy8gVGhpcyBpcyBuZWVkZWQgZm9yIHRoZSBkZWx0YS5cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgICAgIGV2dC5fX19kZWx0YSA9IGV2dC53aGVlbERlbHRhXHJcbiAgICAgICAgICAgICAgICAgICAgPyBldnQud2hlZWxEZWx0YVxyXG4gICAgICAgICAgICAgICAgICAgIDogZXZ0LmRlbHRhWSAvLyBOZXdpc2ggZmlyZWZveD9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gZXZ0LmRlbHRhWSAqIC0xMjBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogKChfZXZ0XyA9IHdpbmRvdy5ldmVudCB8fCBldnQpLCBfZXZ0Xy5kZXRhaWwgKiAtMTIwKTtcclxuXHJcbiAgICAgICAgICAgICAgICBldnQuX19fZGVsdGEgPSBldnQuX19fZGVsdGEgPiAwID8gMTIwIDogLTEyMDsgLy8gTm9ybWFsaXplIGRlbHRhLlxyXG5cclxuICAgICAgICAgICAgICAgIGV2dC56b29tRGVsdGEgPSBldnQuem9vbURlbHRhIHx8IHRoaXMuem9vbURlbHRhO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKGV2dCwgdGhpcy5NT1VTRV9XSEVFTF9FVlQpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ21vdXNlZG93bicsXHJcbiAgICAgICAgICAgIGV2dCA9PiB7XHJcbiAgICAgICAgICAgICAgICAvL2xldCBldnQgPSBlLl9fZXZlbnRfXztcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LndoaWNoICE9PSAxIHx8IGV2dC53aGljaCA9PT0gMCAvKnRvdWNoKi8pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGV2dC5zaGlmdEtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYm94Wm9vbV9tb3VzZURvd24oZXZ0KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wYW4ubW91c2VEb3duWCA9IGV2dC5jbGllbnRYOyAvLyBDaGVja2VkIGluIHRoZSBtb3VzZSBjbGljayBsaXN0ZW5lciwgb2J2aW91cyBoYWNrIGlzIG9idmlvdXMuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhbi5tb3VzZURvd25ZID0gZXZ0LmNsaWVudFk7IC8vIENoZWNrZWQgaW4gdGhlIG1vdXNlIGNsaWNrIGxpc3RlbmVyLCBvYnZpb3VzIGhhY2sgaXMgb2J2aW91cy5cclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKGV2dCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbW91c2V1cCcsXHJcbiAgICAgICAgICAgIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW92ZXInLFxyXG4gICAgICAgICAgICBlID0+IHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyLFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbW91c2VvdXQnLFxyXG4gICAgICAgICAgICBlID0+IHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyLFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbW91c2Vtb3ZlJyxcclxuICAgICAgICAgICAgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihlKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdjbGljaycsXHJcbiAgICAgICAgICAgIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gdG9kbzogRmluZCBiZXR0ZXIgd2F5IHRvIGNoZWNrIGlmIGl0IGlzIFwic2FmZVwiIHRvIGNsaWNrLlxyXG4gICAgICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgICAgIGUuY2xpZW50WSA9PT0gdGhpcy5wYW4ubW91c2VEb3duWSAmJlxyXG4gICAgICAgICAgICAgICAgICAgIGUuY2xpZW50WCA9PT0gdGhpcy5wYW4ubW91c2VEb3duWFxyXG4gICAgICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnQub24oXHJcbiAgICAgICAgICAgIHV0aWxzLk1PVVNFX1dIRUVMX0VWVCxcclxuICAgICAgICAgICAgcF9ldnQgPT4gdGhpcy56b29tSW5PdXQocF9ldnQpLFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgZXZlbnREZWxnYXRpb25IYW5kbGVyKGUsIHR5cGUpIHtcclxuICAgICAgICB0eXBlID0gdHlwZSB8fCBlLnR5cGU7XHJcblxyXG4gICAgICAgIGxldCBwYXJlbnRFbGVtZW50ID0gZS50YXJnZXQ7XHJcbiAgICAgICAgbGV0IHN0b3BQcm9wYWdhdHRpbmcgPSBmYWxzZTtcclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBsZXQgcG9pbnRJbkNvbnRhaW5lciA9IGUuY29udGFpbmVyWCAmJiBlLmNvbnRhaW5lcllcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IHsgeDogZS5jb250YWluZXJYLCB5OiBlLmNvbnRhaW5lclkgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5nZXRQaXhlbFBvaW50SW5NYXBDb250YWluZXIoeyB4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WSB9KTtcclxuICAgICAgICBsZXQgbmV3X2V2dCA9IHtcclxuICAgICAgICAgICAgX19ldmVudF9fOiBlLFxyXG4gICAgICAgICAgICB4OiBwb2ludEluQ29udGFpbmVyLngsXHJcbiAgICAgICAgICAgIHk6IHBvaW50SW5Db250YWluZXIueSxcclxuICAgICAgICAgICAgY3NzOiBlLmNzcyxcclxuICAgICAgICAgICAgdHlwZTogdHlwZSxcclxuICAgICAgICAgICAgem9vbURlbHRhOiBlLnpvb21EZWx0YSB8fCB0aGlzLnpvb21EZWx0YSxcclxuICAgICAgICAgICAgLy9wcmV2ZW50RGVmYXVsdDogZS5wcmV2ZW50RGVmYXVsdC5iaW5kKGUpLFxyXG4gICAgICAgICAgICBzcFBvaW50OiBudWxsLFxyXG4gICAgICAgICAgICBzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgc3RvcFByb3BhZ2F0dGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgd2hpbGUgKHBhcmVudEVsZW1lbnQgJiYgcGFyZW50RWxlbWVudCAhPT0gdGhpcy5tYXBDb250YWluZXIuZWxlbWVudCkge1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAhKHBhcmVudEVsZW1lbnQuX21hcmtlcl9vYmogJiYgcGFyZW50RWxlbWVudC5fbWFya2VyX29iai5maXJlKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnQgPSBwYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnQuX21hcmtlcl9vYmouc3RhdGVQbGFuZVBvaW50KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0LnNwUG9pbnQgPSBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLnN0YXRlUGxhbmVQb2ludDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcGFyZW50RWxlbWVudC5fbWFya2VyX29iai5maXJlKHR5cGUsIG5ld19ldnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHN0b3BQcm9wYWdhdHRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcGFyZW50RWxlbWVudCA9IHBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlLl9fX2RlbHRhKSB7XHJcbiAgICAgICAgICAgIC8vIE1hcCBpcyB6b29taW5nLlxyXG4gICAgICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLnN0b3BQYW5BbmltYXRpb24obmV3X2V2dCk7XHJcblxyXG4gICAgICAgICAgICBuZXdfZXZ0LnNwUG9pbnQgPSB0aGlzLnNjcmVlblBvaW50VG9Qcm9qZWN0aW9uKHBvaW50SW5Db250YWluZXIpOyAvLyBIYWx0aW5nIHBhbm5pbmcgYW5pbWF0aW9uIGNoYW5nZXMgZXh0ZW50Li5cclxuXHJcbiAgICAgICAgICAgIGxldCBfem9vbURlbHRhID0gdGhpcy5jYWxjWm9vbURlbHRhKFxyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tLFxyXG4gICAgICAgICAgICAgICAgbmV3X2V2dC56b29tRGVsdGEsXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1pblpvb20sXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1heFpvb20sXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBsZXQgX3pvb21BZGRlciA9XHJcbiAgICAgICAgICAgICAgICBlLl9fX2RlbHRhID49IDEyMCA/IF96b29tRGVsdGEubWF4RGVsdGEgOiAtX3pvb21EZWx0YS5taW5EZWx0YTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuem9vbSArPSBfem9vbUFkZGVyO1xyXG5cclxuICAgICAgICAgICAgbGV0IF9yZXNvbHV0aW9uID0gdGhpcy5nZXRSZXNvbHV0aW9uKHRoaXMuem9vbSk7XHJcblxyXG4gICAgICAgICAgICBuZXdfZXZ0LnNjYWxlID1cclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0UmVzb2x1dGlvbih0aGlzLnpvb20gLSBfem9vbUFkZGVyKSAvIF9yZXNvbHV0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNFeHRlbnRCeU9yaWdpbkFuZFJlc29sdXRpb24oXHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0LnNwUG9pbnQsXHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0LnNjYWxlLFxyXG4gICAgICAgICAgICAgICAgX3Jlc29sdXRpb24sXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmV3X2V2dC5zcFBvaW50ID0gdGhpcy5zY3JlZW5Qb2ludFRvUHJvamVjdGlvbihwb2ludEluQ29udGFpbmVyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnQuZmlyZSh0eXBlLCBuZXdfZXZ0KTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRUbyhlbGVtZW50LCBwYXJlbnQsIGNhbGxCYWNrKSB7XHJcbiAgICAgICAgbGV0IGFyZ3MgPSBhcmd1bWVudHM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmxvYWRlZCkge1xyXG4gICAgICAgICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XHJcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ldmVudC5vbihcclxuICAgICAgICAgICAgICAgICdsb2FkZWQnLFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gX2ZuXyhlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRUby5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50Lm9mZignbG9hZGVkJywgX2ZuXyk7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IEJhc2ljRXZlbnRTeXN0ZW0gfSBmcm9tIFwiLi9CYXNpY0V2ZW50U3lzdGVtX2NsYXNzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnQgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKGVsZW0pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW07XHJcbiAgICAgICAgdGhpcy5kZWxldGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGVsZW0uX21hcmtlcl9vYmogPSB0aGlzO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMnO1xyXG5pbXBvcnQge05ld01hcH0gZnJvbSAnLi9NYWluX2NsYXNzJztcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY2FsY1pvb21EZWx0YSA9IGZ1bmN0aW9uKFxyXG4gICAgem9vbUx2bCxcclxuICAgIHpvb21EZWx0YSxcclxuICAgIG1pblpvb20sXHJcbiAgICBtYXhab29tLFxyXG4pIHtcclxuICAgIGxldCB6b29tSW5MdmwgPSB6b29tTHZsICsgem9vbURlbHRhO1xyXG4gICAgbGV0IHpvb21PdXRMdmwgPSB6b29tTHZsIC0gem9vbURlbHRhO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbWF4RGVsdGE6XHJcbiAgICAgICAgICAgIHpvb21Jbkx2bCA+IG1heFpvb20gPyB6b29tRGVsdGEgLSAoem9vbUluTHZsIC0gbWF4Wm9vbSkgOiB6b29tRGVsdGEsXHJcbiAgICAgICAgbWluRGVsdGE6XHJcbiAgICAgICAgICAgIHpvb21PdXRMdmwgPCBtaW5ab29tXHJcbiAgICAgICAgICAgICAgICA/IHpvb21EZWx0YSArICh6b29tT3V0THZsIC0gbWluWm9vbSlcclxuICAgICAgICAgICAgICAgIDogem9vbURlbHRhLFxyXG4gICAgfTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuem9vbVRvID0gZnVuY3Rpb24ocHJvalBvaW50LCB6b29tLCBwcm9qT3JpZ2luKSB7XHJcbiAgICBsZXQgY29udmVydFBvaW50ID0gdGhpcy5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpcyk7XHJcbiAgICBsZXQgX3BvaW50ID0gY29udmVydFBvaW50KHByb2pQb2ludCk7XHJcbiAgICBsZXQgem9vbVNpZ24gPSB6b29tID4gdGhpcy56b29tID8gMSA6IC0xO1xyXG4gICAgbGV0IHpvb21EaWZmID0gem9vbSAtIHRoaXMuem9vbTtcclxuICAgIGxldCBzY2FsZSA9IDEgKyAxIC8gKDIgKiogem9vbURpZmYgLSAxKTtcclxuICAgIGxldCBjZW50ZXIgPSB7XHJcbiAgICAgICAgeDogdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgIHk6IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIDIsXHJcbiAgICB9O1xyXG5cclxuICAgIGxldCBfb3JpZ2luID0gKHByb2pPcmlnaW4gJiYgY29udmVydFBvaW50KHByb2pPcmlnaW4pKSB8fCBjZW50ZXI7XHJcblxyXG4gICAgbGV0IGRpc3RhbmNlWCA9IF9wb2ludC54IC0gX29yaWdpbi54O1xyXG4gICAgbGV0IGRpc3RhbmNlWSA9IF9wb2ludC55IC0gX29yaWdpbi55O1xyXG4gICAgbGV0IHNpbU1vdXNlWCA9IF9vcmlnaW4ueCArIGRpc3RhbmNlWCAqIHNjYWxlO1xyXG4gICAgbGV0IHNpbU1vdXNlWSA9IF9vcmlnaW4ueSArIGRpc3RhbmNlWSAqIHNjYWxlO1xyXG5cclxuICAgIGlmICh6b29tID09PSB0aGlzLnpvb20pIHtcclxuICAgICAgICAvL3RoaXMubWFwLnBhbm5pbmdfbW9kdWxlLnBhblRvKG9yaWdpbiB8fCBwcm9qUG9pbnQsIDUwMCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpbXVsYXRlIGEgbW91c2Ugd2hlZWwgZXZlbnQuXHJcbiAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lclg6IHNpbU1vdXNlWCxcclxuICAgICAgICAgICAgY29udGFpbmVyWTogc2ltTW91c2VZLFxyXG4gICAgICAgICAgICBfX19kZWx0YTogem9vbVNpZ24gKiAxMjAsXHJcbiAgICAgICAgICAgIGNzczoge1xyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnZWFzZW91dCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHpvb21EZWx0YTogTWF0aC5hYnMoem9vbURpZmYpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXRpbHMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgKTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuem9vbUluT3V0ID0gZnVuY3Rpb24ocF9ldnQpIHtcclxuICAgIGlmIChwX2V2dC5zY2FsZSA9PT0gMSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5zdGF0ZS56b29taW5nID09PSB0cnVlKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudC5maXJlKCd6b29tIGVuZCcsIHBfZXZ0KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zdGF0ZS56b29taW5nID0gdHJ1ZTtcclxuXHJcbiAgICB0aGlzLmV2ZW50LmZpcmUoJ3ByZXpvb20nLCBwX2V2dCk7XHJcbiAgICB0aGlzLmV2ZW50LmZpcmUoJ3pvb20gZW5kJywgcF9ldnQpO1xyXG59O1xyXG4iLCJpbXBvcnQgeyBCYXNpY0V2ZW50U3lzdGVtIH0gZnJvbSBcIi4vQmFzaWNFdmVudFN5c3RlbV9jbGFzc1wiO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tIFwiLi91dGlsc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJhc2ljTGF5ZXIgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKGhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1hcCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuaGlkZUR1cmluZ1pvb20gPSBoaWRlRHVyaW5nWm9vbTtcclxuICAgICAgICB0aGlzLnpvb21PYmogPSB7IHhPZmZzZXQ6IDAsIHlPZmZzZXQ6IDAgfTtcclxuICAgICAgICB0aGlzLnpvb21MdmwgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuem9vbVRpbWVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLnpvb21JbmRleCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy56b29tRW5kbXMgPSAyMDA7XHJcbiAgICAgICAgdGhpcy5mcmFjdGlvbk9mZnNldCA9IHsgeDogMCwgeTogMCB9O1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzID0geyB4OiAwLCB5OiAwIH07XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Wm9vbUluZGV4KGluZGV4KSB7XHJcbiAgICAgICAgdGhpcy56b29tSW5kZXggPSBpbmRleDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRaaW5kZXgoekluZGV4KSB7XHJcbiAgICAgICAgdGhpcy56SW5kZXggPSB6SW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24odXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aGlzLl9oaWRlQ29udGFpbmVyRHVyaW5nTW91c2VXaGVlbEV2dCwgdGhpcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24odXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aGlzLl9tb3VzZVdoZWVsRXZ0LCB0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwidXBkYXRlQ29udGFpbmVyU2l6ZVwiLCB0aGlzLnVwZGF0ZUNvbnRhaW5lciwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJ1cGRhdGUgZXZlcnl0aGluZ1wiLCB0aGlzLmZpcmUuYmluZCh0aGlzLCBcInVwZGF0ZSBldmVyeXRoaW5nXCIpLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5vbihcInpvb20gZW5kXCIsIHRoaXMuX3pvb21FbmRFdnQsIHRoaXMpO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJhZGQgZXZlbnQgbGlzdGVuZXJzXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIF96b29tRW5kRXZ0KHBfZXZ0KSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZmlyZShcInpvb20gZGVsYXkgZW5kXCIsIHBfZXZ0KSwgdGhpcy56b29tRW5kbXMpO1xyXG4gICAgfVxyXG5cclxuICAgIF9oaWRlQ29udGFpbmVyRHVyaW5nTW91c2VXaGVlbEV2dCgpIHtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICB0aGlzLmZpcmUoXCJ6b29tIGVuZFwiKTtcclxuICAgIH1cclxuXHJcbiAgICBfbW91c2VXaGVlbEV2dChwX2V2dCkge1xyXG4gICAgICAgIC8vIGxldCBwb2ludCA9IHsgeDogcF9ldnQueCwgeTogcF9ldnQueSB9O1xyXG5cclxuICAgICAgICBpZiAocF9ldnQuc2NhbGUgPT09IDEpIHtcclxuICAgICAgICAgICAgcF9ldnQubm9ab29tID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5maXJlKFwiem9vbSBlbmRcIiwgcF9ldnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocF9ldnQuX19ldmVudF9fLl9fX2RlbHRhID49IDEyMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb21Jbk91dChwX2V2dCwgXCJ6b29tIGluXCIpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocF9ldnQuX19ldmVudF9fLl9fX2RlbHRhIDw9IC0xMjApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tSW5PdXQocF9ldnQsIFwiem9vbSBvdXRcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFRvKG1hcCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1hcCA9PT0gbWFwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJMYXllciBhbHJlYWR5IGFkZGVkIHRvIG1hcFwiLCB0aGlzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcCA9IG1hcDtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHRoaXMuY3JlYXRlQ29udGFpbmVyKCk7XHJcbiAgICAgICAgdGhpcy5zZXRab29tSW5kZXgodGhpcy56b29tSW5kZXggfHwgdGhpcy5tYXAuem9vbUluZGV4KTtcclxuXHJcbiAgICAgICAgbWFwLmFkZFRvKHRoaXMuY29udGFpbmVyLmVsZW1lbnQsIG1hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgICAgICB0aGlzLmZpcmUoXCJhcHBlbmRlZCB0byBtYXBcIik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZSgpIHtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5jb250YWluZXIuZWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQuYWxsT2ZmKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuZmlyZShcInJlbW92ZVwiLCB0aGlzKTtcclxuICAgICAgICB0aGlzLm1hcCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIC8vIFRvIGJlIGltcGxpbWVudGVkIGJ5IGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBjbGFzcy5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgLy8gVG8gYmUgaW1wbGltZW50ZWQgYnkgY2xhc3NlcyB0aGF0IGV4dGVuZCB0aGlzIGNsYXNzLlxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVGhlIG1ldGhvZCAndXBkYXRlQ29udGFpbmVyJyBpbiBcIiArIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLCB0aGlzKTtcclxuICAgICAgICB0aGlzLmZpcmUoXCJ1cGRhdGUgZXZlcnl0aGluZ1wiKTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgbGV0IGNvbnQgPSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksXHJcbiAgICAgICAgICAgIGxlZnQ6IDAgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgICAgIHRvcDogMCAtIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgICAgICAgICB1cGRhdGVUcmFuc2Zvcm06IHVuZGVmaW5lZFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnQudXBkYXRlVHJhbnNmb3JtID0gdGhpcy51cGRhdGVDb250YWluZXJUcmFuc2Zvcm0uYmluZCh7IGNvbnRhaW5lcjogY29udCB9KTtcclxuXHJcbiAgICAgICAgY29udC5lbGVtZW50LmNsYXNzTmFtZSA9IFwiX3RpbGVDb250YWluZXJfXCI7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUudG9wID0gXCIwcHhcIjtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gXCIxMDAlXCI7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnpJbmRleCA9IHRoaXMuekluZGV4O1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS5iYWNrZmFjZVZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS50cmFuc2Zvcm1PcmlnaW4gPSBcInRvcCBsZWZ0XCI7XHJcblxyXG4gICAgICAgIHJldHVybiBjb250O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lclRyYW5zZm9ybShsZWZ0LCB0b3AsIHNjYWxlKSB7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIubGVmdCA9IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIudG9wID0gdG9wO1xyXG5cclxuICAgICAgICBzY2FsZSA9IHNjYWxlIHx8IDE7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgdHJhbnNsYXRlM2QoJHtsZWZ0fXB4LCAke3RvcH1weCwgMHB4KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUzZCgke3NjYWxlfSwgJHtzY2FsZX0sIDEpYDtcclxuICAgIH1cclxuXHJcbiAgICBzd2FwQ29udGFpbmVyKGNoaWxkRWxlbWVudCwgZGVsYXkpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tVGltZXIpO1xyXG5cclxuICAgICAgICBsZXQgY29udE5ldyA9IHRoaXMuY3JlYXRlQ29udGFpbmVyKCk7XHJcbiAgICAgICAgbGV0IGNvbnRPbGQgPSB0aGlzLmNvbnRhaW5lcjtcclxuXHJcbiAgICAgICAgY29udE5ldy51cGRhdGVUcmFuc2Zvcm0oY29udE5ldy5sZWZ0LCBjb250TmV3LnRvcCwgMSk7XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udE5ldztcclxuXHJcbiAgICAgICAgaWYgKGNoaWxkRWxlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkRWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKGNvbnROZXcuZWxlbWVudCwgY29udE9sZC5lbGVtZW50KTtcclxuXHJcbiAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAvLyBUb2RvOiBKdXN0IGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxyXG4gICAgICAgIC8vIGlmIChjb250T2xkLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnKXtcclxuICAgICAgICAvLyBjb250T2xkLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG4gICAgICAgIC8vIH1lbHNle1xyXG4gICAgICAgIC8vIGNvbnRPbGQuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyB9LCA1MDApO1xyXG5cclxuICAgICAgICBsZXQgZG9Td2FwID0gZSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzd2FwVGltZXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRvU3dhcCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRpbGVMb2FkTGlzdGVuZXIsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vZmYoXCJ0aWxlIGxvYWRlZFwiLCBkb1N3YXAsIHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRPbGQuZWxlbWVudC5wYXJlbnRFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb250T2xkLmVsZW1lbnQucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChjb250T2xkLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHN3YXBUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBkb1N3YXAoKTtcclxuICAgICAgICB9LCBkZWxheSB8fCA0NTApO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAgICBJbW1pZGlhdGx5IHN3YXAgdGhlIGNvbnRhaW5lcnMgaWYgdGhlcmUgaXMgYSBtb3VzZXdoZWVsXHJcbiAgICAgICAgICAgIGV2ZW50IGJlZm9yZSB0aGUgc3dhcFRpbWVyIGZpcmVzIG9mZi5cclxuICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgZG9Td2FwLCB0aGlzKTtcclxuXHJcbiAgICAgICAgbGV0IF9fX3RoYXQgPSB0aGlzO1xyXG4gICAgICAgIGZ1bmN0aW9uIHRpbGVMb2FkTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiB0ZXN0aW5nXHJcbiAgICAgICAgICAgIF9fX3RoYXQubWFwLmV2ZW50Lm9mZih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRpbGVMb2FkTGlzdGVuZXIsIF9fX3RoYXQpO1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KF9fX3RoYXQubWFwLmV2ZW50Lm9uLmJpbmQoX19fdGhhdC5tYXAuZXZlbnQsIFwidGlsZSBsb2FkZWRcIiwgZG9Td2FwLCBfX190aGF0KSwgMTAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHpvb21FbmQoZXZ0KSB7XHJcbiAgICAgICAgaWYgKGV2dCAmJiBldnQubm9ab29tICYmIHRoaXMuX196b29tID09PSB0aGlzLm1hcC56b29tKSB7XHJcbiAgICAgICAgICAgIC8vIEhhY2sgdG8gc3RvcCBsYXllciBmcm9tIHpvb21pbmcgcGFzdCBpdCdzIGxpbWl0cy5cclxuICAgICAgICAgICAgLy90aGlzLmZpcmUoXCJ1cGRhdGUgZXZlcnl0aGluZ1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuem9vbU9iai5pc1pvb21pbmcpIHtcclxuICAgICAgICAgICAgLy8gRmlyc3QgdGltZSBjYWxsaW5nIHpvb21FbmQgc2luY2Ugc3RhcnRpbmcgem9vbWluZy5cclxuICAgICAgICAgICAgdGhpcy5maXJlKFwicHJlIHpvb20gZW5kXCIsIHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fX3pvb20gPSB0aGlzLm1hcC56b29tO1xyXG5cclxuICAgICAgICB0aGlzLnpvb21PYmogPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwicG9zdCB6b29tIGVuZFwiKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRab29tT2JqKCkge1xyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHtcclxuICAgICAgICAgICAgc2NhbGU6IDEsXHJcbiAgICAgICAgICAgIGlzWm9vbWluZzogZmFsc2UsXHJcbiAgICAgICAgICAgIHg6IHRoaXMuY29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgICAgIHk6IHRoaXMuY29udGFpbmVyLnRvcFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHpvb21Jbk91dChldnQsIHpvb21EaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAodGhpcy56b29tT2JqLmlzWm9vbWluZykge1xyXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fem9vbUluT3V0LmJpbmQodGhpcyxldnQsIHpvb21EaXJlY3Rpb24pKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LmNsYXNzTmFtZSA9IChldnQuY3NzICYmIGV2dC5jc3MuY2xhc3NOYW1lKSB8fCBcInNtb290aFRyYW5zaXRpb25cIjtcclxuXHJcbiAgICAgICAgdGhpcy5yZXNldFpvb21PYmooKTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tT2JqLmlzWm9vbWluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl96b29tSW5PdXQuYmluZCh0aGlzLGV2dCwgem9vbURpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBfem9vbUluT3V0KGV2dCwgem9vbURpcmVjdGlvbikge1xyXG4gICAgICAgIGxldCB6T2JqID0gdGhpcy56b29tT2JqO1xyXG4gICAgICAgIGxldCBzY2FsZSA9IHRoaXMuZ2V0U2NhbGUoem9vbURpcmVjdGlvbiwgZXZ0Lnpvb21EZWx0YSk7XHJcblxyXG4gICAgICAgIHpPYmouc2NhbGUgKj0gc2NhbGU7XHJcblxyXG4gICAgICAgIGxldCBfb2xkID0gdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHM7XHJcbiAgICAgICAgbGV0IF9uZXcgPSB0aGlzLnRvcExlZnRPZlZpc2libGVFeHRlbnRUb1B4bHMoKTtcclxuICAgICAgICBfbmV3LnggPSBNYXRoLmZsb29yKF9uZXcueCk7XHJcbiAgICAgICAgX25ldy55ID0gTWF0aC5mbG9vcihfbmV3LnkpO1xyXG5cclxuICAgICAgICBsZXQgeCA9IF9vbGQueCAqIHpPYmouc2NhbGUgLSBfbmV3LnggLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgbGV0IHkgPSBfb2xkLnkgKiB6T2JqLnNjYWxlIC0gX25ldy55IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci50b3A7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAgICAgICAgYHRyYW5zbGF0ZTNkKCR7IHggfXB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7IHkgfXB4LCAwcHgpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NhbGUzZCgkeyB6T2JqLnNjYWxlIH0sICR7IHpPYmouc2NhbGUgfSwgMSlgO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJ6b29tIGVuZFwiLCBldnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRTY2FsZSh6b29tRGlyZWN0aW9uLCB6b29tRGVsdGEpe1xyXG4gICAgICAgIGxldCBnZXRSZXMgPSB0aGlzLm1hcC5nZXRSZXNvbHV0aW9uLmJpbmQodGhpcy5tYXApO1xyXG4gICAgICAgIGxldCBzY2FsZSA9IDE7XHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbGV0IHpvb21MdmwgPSB0aGlzLm1hcC56b29tICsgKHpvb21EaXJlY3Rpb24gPT09IFwiem9vbSBpblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gLXpvb21EZWx0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHpvb21EZWx0YSk7XHJcblxyXG4gICAgICAgIHNjYWxlID0gZ2V0UmVzKHpvb21MdmwpIC8gZ2V0UmVzKHRoaXMubWFwLnpvb20pO1xyXG5cclxuICAgICAgICByZXR1cm4gc2NhbGU7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQmFzaWNMYXllciB9IGZyb20gXCIuL0Jhc2ljTGF5ZXJfY2xhc3NcIjtcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSBcIi4vdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBcmNSZW5kZXJMYXllciBleHRlbmRzIEJhc2ljTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3IoaW1nVXJsLCByZXFUZW1wbGF0ZSwgekluZGV4LCBoaWRlRHVyaW5nWm9vbSkge1xyXG4gICAgICAgIHN1cGVyKGhpZGVEdXJpbmdab29tKTtcclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNldEltZ1JlcVVybChpbWdVcmwpO1xyXG4gICAgICAgIHRoaXMuc2V0UmVxVGVtcGxhdGUocmVxVGVtcGxhdGUpO1xyXG4gICAgICAgIHRoaXMucmVxSWQgPSAwO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBudWxsO1xyXG5cclxuICAgICAgICB0aGlzLnNldFppbmRleCh6SW5kZXgpO1xyXG5cclxuICAgICAgICB0aGlzLm9uKFwiYWRkIGV2ZW50IGxpc3RlbmVyc1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24oXCJhcHBlbmRlZCB0byBtYXBcIiwgdGhpcy51cGRhdGUsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9uKFwiem9vbSBkZWxheSBlbmRcIiwgdGhpcy5zdGFydFVwZGF0ZVRpbWVyLmJpbmQodGhpcywgMTAwMCksIHRoaXMpO1xyXG4gICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgdGhpcy5vbiggXCJ1cGRhdGUgZXZlcnl0aGluZ1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRoaXMuY2FuY2VsUmVxdWVzdCwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwicGFuIGluaXRpYWxcIiwgdGhpcy5jYW5jZWxSZXF1ZXN0LCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJwYW4gZW5kXCIsIHRoaXMuc3RhcnRVcGRhdGVUaW1lci5iaW5kKHRoaXMsIDEwMDApLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJzdG9wUGFuQW5pbWF0aW9uXCIsIHRoaXMuY2FuY2VsUmVxdWVzdCwgdGhpcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY2FuY2VsUmVxdWVzdCgpIHtcclxuICAgICAgICBpZiAodGhpcy5hamF4UmVxdWVzdCkge1xyXG4gICAgICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0LmFib3J0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3QgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGlzQ3VycmVudFJlcShodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWpheFJlcXVlc3QgPT09IGh0dHBSZXFPYmogPyB0cnVlIDogZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhcnRVcGRhdGVUaW1lcihtaWxsaXNlY29uZHMpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy51cGRhdGVUaW1lcik7XHJcbiAgICAgICAgdGhpcy5jYW5jZWxSZXF1ZXN0KCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IHNldFRpbWVvdXQodGhpcy51cGRhdGUuYmluZCh0aGlzKSwgbWlsbGlzZWNvbmRzIHx8IDEwMDApO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEltZ1JlcVVybChpbWdVcmwpIHtcclxuICAgICAgICB0aGlzLmltZ1JlcVVybCA9IGltZ1VybDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRSZXFUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xyXG4gICAgICAgIHRoaXMucmVxVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kSHR0cFJlcShyZXEpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuY2FuY2VsUmVxdWVzdCgpO1xyXG5cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwICYmIHRoaXMucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaHR0cFJlcU9ubG9hZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Qub3BlbihcIlBPU1RcIiwgdGhpcy5pbWdSZXFVcmwsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtdHlwZVwiLCBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5zZW5kKHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgaHR0cFJlcU9ubG9hZChodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzQ3VycmVudFJlcShodHRwUmVxT2JqKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJhamF4IGxvYWRcIiwgaHR0cFJlcU9iaik7XHJcblxyXG4gICAgICAgIHZhciBwYXJzZWRSZXMgPSBKU09OLnBhcnNlKGh0dHBSZXFPYmoucmVzcG9uc2VUZXh0KTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVUaGVJbWFnZShwYXJzZWRSZXMuaHJlZiwgaHR0cFJlcU9iaik7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlVGhlSW1hZ2UoaW1nU3JjLCBodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgdmFyIG5ld01hcEltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgbmV3TWFwSW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHRoaXMubWFwTG9hZEhhbmRsZXIuYmluZCh0aGlzLCBuZXdNYXBJbWcsIGh0dHBSZXFPYmopKTtcclxuICAgICAgICBuZXdNYXBJbWcuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIHRoaXMubWFwRXJyb3JIYW5kbGVyLmJpbmQodGhpcywgbmV3TWFwSW1nLCBodHRwUmVxT2JqKSk7XHJcbiAgICAgICAgbmV3TWFwSW1nLnNyYyA9IGltZ1NyYztcclxuICAgICAgICBuZXdNYXBJbWcuc3R5bGUuekluZGV4ID0gXCIxXCI7XHJcbiAgICAgICAgbmV3TWFwSW1nLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xyXG4gICAgICAgIG5ld01hcEltZy5zdHlsZS5pbWFnZVJlbmRlcmluZyA9IFwicGl4ZWxhdGVkXCI7IC8vIFRPRE86IFRlc3Qgb2YgbmV3IGNzcyBmZWF0dXJlIGluIGNocm9tZS5cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIHZhciBvYmogPSB7XHJcbiAgICAgICAgICAgIC4uLnRoaXMubWFwLmV4dGVudC52aXNpYmxlLFxyXG4gICAgICAgICAgICB3aWR0aDogdGhpcy5tYXAubWFwQ29udGFpbmVyLndpZHRoLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMubWFwLm1hcENvbnRhaW5lci5oZWlnaHRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgcmVxID0gZW5jb2RlVVJJKFxyXG4gICAgICAgICAgICB0aGlzLnJlcVRlbXBsYXRlLnJlcGxhY2UoL1xcJHsoLis/KX0vZywgZnVuY3Rpb24oYSwgbWF0Y2gpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvYmpbbWF0Y2hdO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgLy9gYmJveD0ke3NwQ29vcmRzLnh9LCR7c3BDb29yZHMueX0sJHtzcENvb3Jkcy5YfSwke3NwQ29vcmRzLll9JmJib3hTUj0xMDI3NDgmbGF5ZXJzPXNob3c6NCZsYXllckRlZnM9JnNpemU9JHt6ZWVNYXAubWFwQ29udGFpbmVyLndpZHRofSwke3plZU1hcC5tYXBDb250YWluZXJcclxuICAgICAgICAvLyAgICAuaGVpZ2h0fSZpbWFnZVNSPTEwMjc0OCZmb3JtYXQ9cG5nOCZ0cmFuc3BhcmVudD10cnVlJmRwaT0mdGltZT0mbGF5ZXJUaW1lT3B0aW9ucz0mZHluYW1pY0xheWVycz0mZ2RiVmVyc2lvbj0mbWFwU2NhbGU9JmY9cGpzb25gXHJcbiAgICAgICAgdGhpcy5zZW5kSHR0cFJlcShyZXEpO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lcigpIHtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcExvYWRIYW5kbGVyKG1hcEltZywgaHR0cFJlcU9iaikge1xyXG4gICAgICAgIGlmICghdGhpcy5pc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fX3pvb20gPSB0aGlzLm1hcC56b29tO1xyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHt9O1xyXG5cclxuICAgICAgICB0aGlzLnN3YXBDb250YWluZXIobWFwSW1nLCAwIC8qbWlsbGlzZWNvbmRzKi8pO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJtYXAgaW1nIGxvYWRcIiwgaHR0cFJlcU9iaik7XHJcbiAgICB9XHJcblxyXG4gICAgbWFwRXJyb3JIYW5kbGVyKG1hcEltZywgaHR0cFJlcU9iaikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcywgbWFwSW1nLCBodHRwUmVxT2JqKTtcclxuICAgICAgICB0aGlzLmZpcmUoXCJtYXAgaW1nIGVycm9yXCIsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIF96b29tSW5PdXQoZXZ0LCB6b29tRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgbGV0IHpPYmogPSB0aGlzLnpvb21PYmo7XHJcbiAgICAgICAgbGV0IHNjYWxlID0gdGhpcy5nZXRTY2FsZSh6b29tRGlyZWN0aW9uLCBldnQuem9vbURlbHRhKTtcclxuICAgICAgICB6T2JqLnNjYWxlICo9IHNjYWxlO1xyXG5cclxuICAgICAgICBsZXQgbmV3UG9pbnQgPSB7XHJcbiAgICAgICAgICAgIHg6IGV2dC54IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0ICsgek9iai54LCAvLyBUaGlzIHdpbGwgc2V0IHRoZSBvcmlnaW4gdG8gMS8yIHRoZSBjZW50ZXI6IC0gdGhpcy5tYXAubWFwQ29udGFpbmVyLndpZHRoIC8gMjtcclxuICAgICAgICAgICAgeTogZXZ0LnkgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcCArIHpPYmoueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHpPYmoueCA9IHpPYmoueCArICh6T2JqLnggLSAobmV3UG9pbnQueCAtIHpPYmoueCkpICogKHNjYWxlIC0gMSk7XHJcbiAgICAgICAgek9iai55ID0gek9iai55ICsgKHpPYmoueSAtIChuZXdQb2ludC55IC0gek9iai55KSkgKiAoc2NhbGUgLSAxKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICAgICAgYHRyYW5zbGF0ZTNkKCR7IHpPYmoueCB9cHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7IHpPYmoueSB9cHgsIDBweClcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUzZCgkeyB6T2JqLnNjYWxlIH0sICR7IHpPYmouc2NhbGUgfSwgMSlcclxuICAgICAgICAgICAgICAgICAgICBgO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJ6b29tIGVuZFwiLCBldnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBBcmNSZW5kZXJMYXllciB9IGZyb20gXCIuL0FyY1JlbmRlckxheWVyX2NsYXNzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJjWE1MTGF5ZXIgZXh0ZW5kcyBBcmNSZW5kZXJMYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbWdVcmwsIHpJbmRleCwgQXJjWE1MX21vZHVsZSwgaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICBzdXBlcihpbWdVcmwsIG51bGwsIHpJbmRleCwgaGlkZUR1cmluZ1pvb20pO1xyXG5cclxuICAgICAgICB0aGlzLm9uKFwiYXBwZW5kZWQgdG8gbWFwXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tYWtlQXJjWE1MID0gQXJjWE1MX21vZHVsZSh0aGlzLm1hcCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBleHRlbnQgPSB0aGlzLm1hcC5leHRlbnQudmlzaWJsZTtcclxuICAgICAgICBsZXQgeG1sID0gdGhpcy5tYWtlQXJjWE1MLm1ha2VBcmNYTUxSZXF1ZXN0KGV4dGVudC54LCBleHRlbnQuWCwgZXh0ZW50LnksIGV4dGVudC5ZKTtcclxuICAgICAgICBsZXQgcmVxID0gd2luZG93LmVuY29kZVVSSUNvbXBvbmVudChcIkFyY1hNTFJlcXVlc3RcIikgKyBcIj1cIiArIHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQoeG1sKTtcclxuICAgICAgICB0aGlzLnNlbmRIdHRwUmVxKHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgaHR0cFJlcU9ubG9hZChodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzQ3VycmVudFJlcShodHRwUmVxT2JqKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeG1sID0gLzxcXD94bWwuKj4vLmV4ZWMoaHR0cFJlcU9iai5yZXNwb25zZVRleHQpWzBdO1xyXG4gICAgICAgIGxldCBwYXJzZWRSZXMgPSBuZXcgRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKHhtbCAsIFwiYXBwbGljYXRpb24veG1sXCIpO1xyXG4gICAgICAgIGxldCBvdXRwdXQgPSBwYXJzZWRSZXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJPVVRQVVRcIik7XHJcbiAgICAgICAgbGV0IGhyZWYgPSBvdXRwdXRbMF0uZ2V0QXR0cmlidXRlKFwidXJsXCIpO1xyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZVRoZUltYWdlKGhyZWYsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ29vZ2xlVG9TdGF0ZSAoIGxhdCwgbG9uICkgey8vIHRoaXMgY29udmVydHMgZ29vZ2xlJ3MgeCx5IGNvb3JkaW5hdGVzIHRvIHN0YXRlIHBsYW5lIGNvb3JkaW5hdGVzIHVzZWQgYnkgdGhlIGdvdmVybm1lbnQuXHJcbiAgICAgICAgICAvLyBGb3Igc25vaG9taXNoIGNvdW50eSBvbmx5LlxyXG4gICAgICAgICAgICAgICAgbGV0IG1hdGggPSBNYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHQgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmhvID0gdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIHRoZXRhID0gdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIHggPSB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgeSA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICAgICAgICBsYXQgPSBsYXQgKiAuMDE3NDUzMjkyNTIgO1xyXG4gICAgICAgICAgICAgICAgbG9uID0gbG9uICogLjAxNzQ1MzI5MjUyIDtcclxuICAgICAgICAgICAgICAgIHQgPSBtYXRoLnNpbiggMC43ODUzOTgxNjMzOTc0NDgzIC0gKCBsYXQgLyAyICkpIC8gbWF0aC5jb3MoIDAuNzg1Mzk4MTYzMzk3NDQ4MyAtICggbGF0IC8gMiApKSA7XHJcbiAgICAgICAgICAgICAgICB0ID0gdCAvICggbWF0aC5wb3coKCggMSAtICggMC4wODIyNzE4NTQgKiAoIG1hdGguc2luKCBsYXQgKSkpKSAvICggMSArICggMC4wODIyNzE4NTQgKiAoIG1hdGguc2luKCBsYXQgKSkpKSksKCAwLjA0MTEzNTkyNyApKSkgO1xyXG4gICAgICAgICAgICAgICAgcmhvID0gNjM3ODIwNi40ICogMS44Mjk3MTQzODUyMDYxNzU1ICogbWF0aC5wb3coIHQsIDAuNzQ0NTIwMzI4NDUyOTM0MyApLFxyXG4gICAgICAgICAgICAgICAgdGhldGEgPSAwLjc0NDUyMDMyODQ1MjkzNDMgKiAoIGxvbiAtIC0yLjEwODg4MTMzNTE5MTYgKSxcclxuICAgICAgICAgICAgICAgIHggPSAoIHJobyAqIG1hdGguc2luKCB0aGV0YSApICkgKyA0OTk5OTguOTg0MTAxNjMyNSxcclxuICAgICAgICAgICAgICAgIHkgPSA1ODUzOTU4Ljk2Mzk2NzU1MiAtICggcmhvICogbWF0aC5jb3MoIHRoZXRhICkgKTsgLy8gbWVzIGFkZCB5MCA/XHJcbiAgICAgICAgICAgICAgICB4ID0geCozLjI4MDg0O1xyXG4gICAgICAgICAgICAgICAgeSA9IHkqMy4yODA4NDtcclxuICAgICAgICAgICAgICAgIHJldHVybiBbIHksIHggXTtcclxuICAgICAgICB9IiwiaW1wb3J0IHsgQmFzaWNMYXllciB9IGZyb20gXCIuL0Jhc2ljTGF5ZXJfY2xhc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNlVGlsZUxheWVyIGV4dGVuZHMgQmFzaWNMYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihzcmMsIHpJbmRleCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5fX3pvb20gPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGlsZVNyYyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50aWxlU2l6ZSA9IDI1NjtcclxuICAgICAgICB0aGlzLnRpbGVzQ2FjaGUgPSB7fTtcclxuICAgICAgICB0aGlzLnRpbGVJbmZvID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbGVMb2FkT3JkZXIgPSBbXTtcclxuICAgICAgICB0aGlzLmRlbFRpbGVzVGltZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMubHZsTG9hZFRpbWUgPSB7IHN0YXJ0OiAwLCBmaW5pc2g6IDEgfTtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHsgeDogMCwgeTogMCB9O1xyXG4gICAgICAgIHRoaXMubWFrZVRpbGUgPSBtYWtlVGlsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRaaW5kZXgoekluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRUaWxlU3JjKHNyYyk7XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJhZGQgZXZlbnQgbGlzdGVuZXJzXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbihcImFwcGVuZGVkIHRvIG1hcFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VUaWxlR3JpZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vbihcInVwZGF0ZSBldmVyeXRoaW5nXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFrZVRpbGVHcmlkKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VGlsZXMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dhcENvbnRhaW5lcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tRW5kKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub24oXCJ6b29tIGRlbGF5IGVuZFwiLCB0aGlzLnpvb21FbmQsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9uKFwicHJlIHpvb20gZW5kXCIsICgpID0+IHRoaXMuc3dhcENvbnRhaW5lcigpLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbihcInBvc3Qgem9vbSBlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFRpbGVzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFxyXG4gICAgICAgICAgICAgICAgXCJwYW5cIixcclxuICAgICAgICAgICAgICAgIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoZS5jbGllbnRYICsgZS5jbGllbnRZKSAlIDcgPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogQmV0dGVyIHRocm90dGxpbmcsIHRoaXMgd2FzIGp1c3QgYSB0aG91Z2h0IGV4cGVyaW1lbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRoaXNcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJwYW4gaW5pdGlhbFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVsVGlsZXNUaW1lcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInBhbiBlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9fem9vbSAhPT0gdGhpcy5tYXAuem9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbUVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWxUaWxlc1RpbWVyID0gc2V0VGltZW91dCh0aGlzLmNsZWFySGlkZGVuVGlsZXMuYmluZCh0aGlzKSwgMTEwMCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVJbmZvKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVGhlIG1ldGhvZCAnZ2V0VGlsZUluZm8nIGluIFwiICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgXCIgd2Fzbid0IGltcGxpbWVudGVkXCIsIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiBcIk92ZXJyaWRlIHRoaXNcIjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlUHhscygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRoZSBtZXRob2QgJ2dldFRpbGVQeGxzJyBpbiBcIiArIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gXCJPdmVycmlkZSB0aGlzXCI7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VGlsZVNyYyhzcmMpIHtcclxuICAgICAgICB0aGlzLnRpbGVTcmMgPSBzcmM7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIHRoaXMuc3dhcENvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMucmVzZXRUaWxlcygpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXJIaWRkZW5UaWxlcygpIHtcclxuICAgICAgICAvLyBUT0RPOiBUaGlzIGlzIGhhY2ssIHRoaW5rIG9mIHNvbWV0aGluZyBiZXR0ZXIuXHJcbiAgICAgICAgbGV0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnRpbGVzQ2FjaGUpO1xyXG4gICAgICAgIGxldCBtYWluUmVjdCA9IHRoaXMubWFwLm1hcENvbnRhaW5lci5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIG1haW5SZWN0LlggPSBtYWluUmVjdC54ICsgbWFpblJlY3Qud2lkdGg7XHJcbiAgICAgICAgbWFpblJlY3QuWSA9IG1haW5SZWN0LnkgKyBtYWluUmVjdC5oZWlnaHQ7XHJcblxyXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdGlsZSA9IHRoaXMudGlsZXNDYWNoZVtrZXldO1xyXG4gICAgICAgICAgICBsZXQgcmVjdCA9IHRpbGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRpbGUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBpZiAoIShyZWN0LnggPCBtYWluUmVjdC5YICYmIHJlY3QueCArIHJlY3Qud2lkdGggPiBtYWluUmVjdC54ICYmXHJcbiAgICAgICAgICAgICAgICByZWN0LnkgPCBtYWluUmVjdC5ZICYmIHJlY3QueSArIHJlY3QuaGVpZ2h0ID4gbWFpblJlY3QueSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGlsZSk7XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50aWxlc0NhY2hlW2tleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXNldFRpbGVzKCkge1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzID0gdGhpcy50b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKCk7XHJcblxyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnggPSBNYXRoLmZsb29yKHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLngpO1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnkgPSBNYXRoLmZsb29yKHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnkpO1xyXG5cclxuICAgICAgICB0aGlzLnRpbGVzQ2FjaGUgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlVGlsZUdyaWQoKSB7XHJcbiAgICAgICAgbGV0IG51bVRpbGVzID0ge1xyXG4gICAgICAgICAgICB4OiBNYXRoLmNlaWwodGhpcy5tYXAubWFwQ29udGFpbmVyLndpZHRoIC8gdGhpcy50aWxlU2l6ZSkgKyAxLFxyXG4gICAgICAgICAgICB5OiBNYXRoLmNlaWwodGhpcy5tYXAubWFwQ29udGFpbmVyLmhlaWdodCAvIHRoaXMudGlsZVNpemUpICsgMVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBhcnkgPSBbXTtcclxuICAgICAgICBsZXQgdnJ5ID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IG51bVRpbGVzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8PSBudW1UaWxlcy55OyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGFyeS5wdXNoKHsgeDogeCwgeTogeSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gbnVtVGlsZXMueDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDw9IG51bVRpbGVzLnk7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHkgJSAyID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdnJ5LnB1c2goYXJ5LnNwbGljZSgwLCAxKVswXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2cnkucHVzaChhcnkuc3BsaWNlKC0xLCAxKVswXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGlsZUxvYWRPcmRlciA9IHZyeTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICBsZXQgZ3JpZENlbnRlciA9IHtcclxuICAgICAgICAgICAgeDogbnVtVGlsZXMueCAvIDIsXHJcbiAgICAgICAgICAgIHk6IG51bVRpbGVzLnkgLyAyXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgdGhpcy50aWxlTG9hZE9yZGVyID0gYXJ5LnNvcnQoKGEsYikgPT4ge1xyXG4gICAgICAgICAgICAvLyBDb3B5IGxlYWZsZXRzIGlkZWEgYW5kIGhhdmUgdGhlIHRpbGVzIHN0YXJ0IGxvYWRpbmcgZnJvbSB0aGUgY2VudGVyLi5cclxuICAgICAgICAgICAgbGV0IGRpc3RBID0gTWF0aC5zcXJ0KChncmlkQ2VudGVyLnggLSBhLngpKioyICsgKGdyaWRDZW50ZXIueSAtIGEueSkqKjIpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdEIgPSBNYXRoLnNxcnQoKGdyaWRDZW50ZXIueCAtIGIueCkqKjIgKyAoZ3JpZENlbnRlci55IC0gYi55KSoqMik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGlzdEIgLSBkaXN0QTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAqL1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGNMdmxMb2FkVGltZSgpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKCh0aGlzLmx2bExvYWRUaW1lLmZpbmlzaCAtIHRoaXMudGlsZVN0YXJ0KSlcclxuICAgICAgICByZXR1cm4gdGhpcy5sdmxMb2FkVGltZS5maW5pc2ggLSB0aGlzLmx2bExvYWRUaW1lLnN0YXJ0IHx8IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBzcmNPYmogPSB7IFwie3p9XCI6IHRoaXMuX196b29tLCBcInt5fVwiOiBudWxsLCBcInt4fVwiOiBudWxsIH07XHJcbiAgICAgICAgbGV0IHNyY1hZU3RyaW5nID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGxldCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcclxuICAgICAgICBsZXQgdGlsZUltZyA9IG51bGw7XHJcbiAgICAgICAgbGV0IHRpbGVYID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGxldCB0aWxlWSA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgdGhpcy50aWxlU3RhcnQgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBsZXQgZXh0ZW50ID0gKHRoaXMuem9vbUluZGV4ICYmIHRoaXMuem9vbUluZGV4W3RoaXMuX196b29tXSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy56b29tSW5kZXhbdGhpcy5fX3pvb21dLmV4dGVudCkgfHwge307XHJcblxyXG4gICAgICAgIGxldCBwYW5MZWZ0ID0gdGhpcy5jb250YWluZXIubGVmdCArIHRoaXMubWFwLm1haW5Db250YWluZXIubGVmdDtcclxuICAgICAgICBsZXQgcGFuVG9wID0gdGhpcy5jb250YWluZXIudG9wICsgdGhpcy5tYXAubWFpbkNvbnRhaW5lci50b3A7XHJcblxyXG4gICAgICAgIGxldCB0b3BMZWZ0VGlsZSA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5mbG9vcigodGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueCAtIHBhbkxlZnQpIC8gdGhpcy50aWxlU2l6ZSksXHJcbiAgICAgICAgICAgIHk6IE1hdGguZmxvb3IoKHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnkgLSBwYW5Ub3ApIC8gdGhpcy50aWxlU2l6ZSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgdG9wTGVmdFRpbGVQeGxzID0ge1xyXG4gICAgICAgICAgICB4OiB0b3BMZWZ0VGlsZS54ICogdGhpcy50aWxlU2l6ZSAtIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLngsXHJcbiAgICAgICAgICAgIHk6IHRvcExlZnRUaWxlLnkgKiB0aGlzLnRpbGVTaXplIC0gdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgdGhpcy50aWxlTG9hZE9yZGVyLmxlbmd0aDsgbSsrKSB7XHJcbiAgICAgICAgICAgIHNyY09ialtcInt4fVwiXSA9IHRvcExlZnRUaWxlLnggKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueDtcclxuICAgICAgICAgICAgc3JjT2JqW1wie3l9XCJdID0gdG9wTGVmdFRpbGUueSArIHRoaXMudGlsZUxvYWRPcmRlclttXS55O1xyXG5cclxuICAgICAgICAgICAgc3JjWFlTdHJpbmcgPSBzcmNPYmpbXCJ7eH1cIl0gKyBcIixcIiArIHNyY09ialtcInt5fVwiXTtcclxuXHJcbiAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBpZiAodGhpcy50aWxlc0NhY2hlW3NyY1hZU3RyaW5nXSB8fFxyXG4gICAgICAgICAgICAgICAgKHNyY09ialtcInt4fVwiXSA8IGV4dGVudC54IHx8IHNyY09ialtcInt4fVwiXSA+IGV4dGVudC5YIHx8XHJcbiAgICAgICAgICAgICAgICAgc3JjT2JqW1wie3l9XCJdID4gZXh0ZW50LlkgfHwgc3JjT2JqW1wie3l9XCJdIDwgZXh0ZW50LnkpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRpbGVYID0gdG9wTGVmdFRpbGVQeGxzLnggKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueCAqIHRoaXMudGlsZVNpemU7XHJcbiAgICAgICAgICAgIHRpbGVZID0gdG9wTGVmdFRpbGVQeGxzLnkgKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueSAqIHRoaXMudGlsZVNpemU7XHJcblxyXG4gICAgICAgICAgICB0aWxlSW1nID0gdGhpcy5tYWtlVGlsZSh7XHJcbiAgICAgICAgICAgICAgICB4OiB0aWxlWCxcclxuICAgICAgICAgICAgICAgIHk6IHRpbGVZLFxyXG4gICAgICAgICAgICAgICAgc3JjOiB0aGlzLnRpbGVTcmMucmVwbGFjZSgvey59L2csIGFyZyA9PiBzcmNPYmpbYXJnXSlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRpbGVzQ2FjaGVbc3JjWFlTdHJpbmddID0gdGlsZUltZztcclxuXHJcbiAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRpbGVJbWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ha2VUaWxlKG9iaikge1xyXG4gICAgbGV0IHRpbGVJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgdGlsZUltZy5jbGFzc05hbWUgPSBcInRpbGVJbWdcIjtcclxuICAgIC8vdGlsZUltZy5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogXCIgKyB0aWxlWSArIFwicHg7IGxlZnQ6IFwiICsgdGlsZVggKyBcInB4OyBvcGFjaXR5OiAwO1wiO1xyXG4gICAgdGlsZUltZy5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjogYWJzb2x1dGU7IG9wYWNpdHk6IDA7XCI7XHJcbiAgICB0aWxlSW1nLnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlM2QoXCIgKyBvYmoueCArIFwicHgsXCIgKyBvYmoueSArIFwicHgsIDBweClcIjtcclxuICAgIC8vdGlsZUltZy5zdHlsZS5ib3hTaGFkb3cgPSBcIjBweCAwcHggMHB4IDFweCByZWRcIjtcclxuICAgIHRpbGVJbWcub25sb2FkID0gbWFrZVRpbGVPbkxvYWQ7XHJcbiAgICB0aWxlSW1nLm9uZXJyb3IgPSBtYWtlVGlsZU9uRXJyb3I7XHJcbiAgICB0aWxlSW1nLnNyYyA9IG9iai5zcmM7XHJcblxyXG4gICAgcmV0dXJuIHRpbGVJbWc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ha2VUaWxlT25Mb2FkKGUpIHtcclxuICAgIHRoaXMubG9hZGVkID0gdHJ1ZTtcclxuICAgIHRoaXMuc3R5bGUub3BhY2l0eSA9IDE7XHJcbiAgICAvLyBfX190aGF0LnRpbGVGaW5pc2ggPSBEYXRlLm5vdygpO1xyXG4gICAgLy8gX19fdGhhdC5tYXAuZXZlbnQuZmlyZSgndGlsZSBsb2FkZWQnLCB0aGlzKTsvLyBUb2RvOiB0ZXN0aW5nIHRoaXMgaWRlYS5cclxufVxyXG5cclxuZnVuY3Rpb24gbWFrZVRpbGVPbkVycm9yKGUpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJUaWxlIGRpZCBub3QgbG9hZFwiLCBlKTtcclxufVxyXG4iLCJpbXBvcnQgeyBCYXNlVGlsZUxheWVyIH0gZnJvbSBcIi4vQmFzZVRpbGVMYXllcl9jbGFzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFyY0dJU1RpbGVMYXllciBleHRlbmRzIEJhc2VUaWxlTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc3JjLCB6SW5kZXgpIHtcclxuICAgICAgICBzdXBlcihzcmMsIHpJbmRleCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGlsZUluZm8oKSB7XHJcbiAgICAgICAgLy8gT3ZlcnJpZGUgdGhpcyBmb3IgV1NHODQuXHJcbiAgICAgICAgbGV0IHZpcyA9IHRoaXMubWFwLmV4dGVudC52aXNpYmxlO1xyXG4gICAgICAgIGxldCBjb3JuZXIgPSB0aGlzLmdldENvbnRhaW5pbmdBcmNUaWxlQ29vcmRzKHRoaXMubWFwLnpvb20sIHsgeDogdmlzLngsIHk6IHZpcy5ZIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gY29ybmVyO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgIHJldHVybjpcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcm93OiB1bmRlZmluZWQsIC8vIFRpbGUgbnVtYmVyIHggY29vcmRpbmF0ZS5cclxuICAgICAgICAgICAgICAgIGNvbDogdW5kZWZpbmVkLCAvLyBUaWxlIG51bWJlciB5IGNvb3JkaW5hdGUuXHJcbiAgICAgICAgICAgICAgICBzcFg6IHVuZGVmaW5lZCwgLy8gVGlsZSB0b3AgbGVmdCBjb3JuZXIgeCBjb29yZCBpbiBkZWZhdWx0IGNvb3JkaW5hdGUgc3lzdGVtIChzdGF0ZSBwbGFuZSBvciBXU0c4NCBzaGVyaWNhbCBtZXJjYXRvcilcclxuICAgICAgICAgICAgICAgIHNwWTogdW5kZWZpbmVkICAvLyBUaWxlIHRvcCBsZWZ0IGNvcm5lciB5IGNvb3JkIFwiIFwiIFwiLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKi9cclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlUHhscyhwb2ludCkge1xyXG4gICAgICAgIC8vIE92ZXJyaWRlIHRoaXMgZm9yIFdTRzg0LlxyXG4gICAgICAgIHJldHVybiB0aGlzLm1hcC5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50KHBvaW50KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRDb250YWluaW5nQXJjVGlsZUNvb3Jkcyh6LCBiKSB7XHJcbiAgICAgICAgbGV0IGQgPSB7IHg6IC0xLjE3MTA0M2U4LCB5OiAxLjM3OTQ5OGU4IH07IC8vIFRoaXMgbmVlZHMgdG8gYmUgY2hhbmdlZC5cclxuICAgICAgICBsZXQgem9vbUkgPSB0aGlzLnpvb21JbmRleFt6XTtcclxuXHJcbiAgICAgICAgbGV0IGNvbFJvdyA9IHtcclxuICAgICAgICAgICAgcm93OiBNYXRoLmZsb29yKChkLnkgLSBiLnkpIC8gKHRoaXMudGlsZVNpemUgKiB6b29tSS5yZXNvbHV0aW9uKSksXHJcbiAgICAgICAgICAgIGNvbDogTWF0aC5mbG9vcigoYi54IC0gZC54KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkucmVzb2x1dGlvbikpLFxyXG4gICAgICAgICAgICBzcFg6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgc3BZOiB1bmRlZmluZWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb2xSb3cuc3BYID0gY29sUm93LmNvbCAqICh0aGlzLnRpbGVTaXplICogem9vbUkucmVzb2x1dGlvbikgKyBkLng7XHJcbiAgICAgICAgY29sUm93LnNwWSA9IGQueSAtIGNvbFJvdy5yb3cgKiAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pO1xyXG4gICAgICAgIC8vY29sUm93LnBlcmNlbnRYID0gY29sUm93LmNvbCAtIChiLnggLSBkLngpIC8gKHRoaXMudGlsZVNpemUgKiB6b29tSS5SZXNvbHV0aW9uKTtcclxuICAgICAgICAvL2NvbFJvdy5wZXJjZW50WSA9IGNvbFJvdy5yb3cgLSAoZC55IC0gYi55KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkuUmVzb2x1dGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xSb3c7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQmFzZVRpbGVMYXllciB9IGZyb20gXCIuL0Jhc2VUaWxlTGF5ZXJfY2xhc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTcGhlcmljYWxNZXJjYXRvclRpbGVMYXllciBleHRlbmRzIEJhc2VUaWxlTGF5ZXIge1xyXG4gICAgLy8gaHR0cHM6Ly9qc2Jpbi5jb20vamVoYXRpcGFndS82L2VkaXQ/aHRtbCxjc3MsanMsb3V0cHV0XHJcbiAgICBjb25zdHJ1Y3RvcihzcmMsIHpJbmRleCkge1xyXG4gICAgICAgIHN1cGVyKHNyYywgekluZGV4KTtcclxuICAgICAgICB0aGlzLmJvdW5kID0gMjAwMzc1MDguMzQyNzg5MjQ0Oy8vIE1hdGguUEkgKiByYWRpdXMgb2YgZWFydGhcclxuICAgIH1cclxuXHJcbiAgICB0b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKG9wdF96b29tKXtcclxuICAgICAgICAvLyBSZXR1cm5zIHRvcCBsZWZ0IG9mIHRpbGUgaW4gc2NyZWVuIHBpeGVsIGNvb3Jkcywgc28gdGhhdCBpdCBjYW4gYmUgc2VlbiBvbiB0aGUgbW9uaXRvci5cclxuICAgICAgICBsZXQgdmlzID0gdGhpcy5tYXAuZXh0ZW50LnZpc2libGU7XHJcbiAgICAgICAgbGV0IHZpc1BvaW50ID0geyB4OiB2aXMueCwgeTogdmlzLlkgfTtcclxuICAgICAgICBsZXQgY29udGFpbmVyQ29ybmVyID0gdGhpcy5nZXRQeGxzRnJvbVRvcExlZnRPcmlnaW4odmlzUG9pbnQsIG9wdF96b29tKTtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwic2ZkXCIsIGNvbnRhaW5lckNvcm5lcilcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiBjb250YWluZXJDb3JuZXIueCxcclxuICAgICAgICAgICAgeTogY29udGFpbmVyQ29ybmVyLnksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQeGxzRnJvbVRvcExlZnRPcmlnaW4oc21Qb2ludCwgb3B0X3pvb20pIHtcclxuICAgICAgICAvLyBSZXR1cm5zIHBpeGVscyBmcm9tIDAsMCB0aWxlIG9yaWdpbiBha2EgdGhlIHRvcCBsZWZ0IG9mIHRoZSB3b3JsZC5cclxuICAgICAgICBsZXQgYm91bmQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7XHJcbiAgICAgICAgbGV0IHBpeGVscyA9IHRoaXMudGlsZVNpemUgKiBNYXRoLnBvdygyLCBvcHRfem9vbSB8fCB0aGlzLm1hcC56b29tICkvMjtcclxuXHJcbiAgICAgICAgdmFyIHBvaW50WFJhdGlvID0gc21Qb2ludC54IC8gKC1ib3VuZCk7XHJcbiAgICAgICAgdmFyIHBvaW50WVJhdGlvID0gc21Qb2ludC55IC8gKGJvdW5kKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHBpeGVscykgICogKDEtcG9pbnRYUmF0aW8pLFxyXG4gICAgICAgICAgICB5OiAocGl4ZWxzKSAqICgxLXBvaW50WVJhdGlvKSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIFRyYW5zZm9ybWF0aW9uKGEsIGIsIGMsIGQpIHtcclxuICAgIC8vIFRyYW5zZm9ybWF0aW9uIGNvbnN0cnVjdG9yIGNvcGllZCBmcm9tIExlYWZsZXQuanNcclxuICAgXHJcbiAgICAvLyBpZiAoVXRpbC5pc0FycmF5KGEpKSB7XHJcbiAgICAvLyAgICAgLy8gdXNlIGFycmF5IHByb3BlcnRpZXNcclxuICAgIC8vICAgICB0aGlzLl9hID0gYVswXTtcclxuICAgIC8vICAgICB0aGlzLl9iID0gYVsxXTtcclxuICAgIC8vICAgICB0aGlzLl9jID0gYVsyXTtcclxuICAgIC8vICAgICB0aGlzLl9kID0gYVszXTtcclxuICAgIC8vICAgICByZXR1cm47XHJcbiAgICAvLyB9XHJcbiAgICB0aGlzLl9hID0gYTtcclxuICAgIHRoaXMuX2IgPSBiO1xyXG4gICAgdGhpcy5fYyA9IGM7XHJcbiAgICB0aGlzLl9kID0gZDtcclxufVxyXG5cclxuVHJhbnNmb3JtYXRpb24ucHJvdG90eXBlID0ge1xyXG4gICAgLy8gQG1ldGhvZCB0cmFuc2Zvcm0ocG9pbnQ6IFBvaW50LCBzY2FsZT86IE51bWJlcik6IFBvaW50XHJcbiAgICAvLyBSZXR1cm5zIGEgdHJhbnNmb3JtZWQgcG9pbnQsIG9wdGlvbmFsbHkgbXVsdGlwbGllZCBieSB0aGUgZ2l2ZW4gc2NhbGUuXHJcbiAgICAvLyBPbmx5IGFjY2VwdHMgYWN0dWFsIGBMLlBvaW50YCBpbnN0YW5jZXMsIG5vdCBhcnJheXMuXHJcbiAgICB0cmFuc2Zvcm06IGZ1bmN0aW9uIChwb2ludCwgc2NhbGUpIHsgLy8gKFBvaW50LCBOdW1iZXIpIC0+IFBvaW50XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybShwb2ludC5jbG9uZSgpLCBzY2FsZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIGRlc3RydWN0aXZlIHRyYW5zZm9ybSAoZmFzdGVyKVxyXG4gICAgX3RyYW5zZm9ybTogZnVuY3Rpb24gKHBvaW50LCBzY2FsZSkge1xyXG4gICAgICAgIHNjYWxlID0gc2NhbGUgfHwgMTtcclxuICAgICAgICBwb2ludC54ID0gc2NhbGUgKiAodGhpcy5fYSAqIHBvaW50LnggKyB0aGlzLl9iKTtcclxuICAgICAgICBwb2ludC55ID0gc2NhbGUgKiAodGhpcy5fYyAqIHBvaW50LnkgKyB0aGlzLl9kKTtcclxuICAgICAgICByZXR1cm4gcG9pbnQ7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEBtZXRob2QgdW50cmFuc2Zvcm0ocG9pbnQ6IFBvaW50LCBzY2FsZT86IE51bWJlcik6IFBvaW50XHJcbiAgICAvLyBSZXR1cm5zIHRoZSByZXZlcnNlIHRyYW5zZm9ybWF0aW9uIG9mIHRoZSBnaXZlbiBwb2ludCwgb3B0aW9uYWxseSBkaXZpZGVkXHJcbiAgICAvLyBieSB0aGUgZ2l2ZW4gc2NhbGUuIE9ubHkgYWNjZXB0cyBhY3R1YWwgYEwuUG9pbnRgIGluc3RhbmNlcywgbm90IGFycmF5cy5cclxuICAgIHVudHJhbnNmb3JtOiBmdW5jdGlvbiAocG9pbnQsIHNjYWxlKSB7XHJcbiAgICAgICAgc2NhbGUgPSBzY2FsZSB8fCAxO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgIHg6IChwb2ludC54IC8gc2NhbGUgLSB0aGlzLl9iKSAvIHRoaXMuX2EsXHJcbiAgICAgICAgICAgICAgIHk6IChwb2ludC55IC8gc2NhbGUgLSB0aGlzLl9kKSAvIHRoaXMuX2NcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGxldCB0cmFuc2Zvcm1hdGlvbiA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNjYWxlID0gMC41IC8gKE1hdGguUEkgKiA2Mzc4MTM3KTtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKG5ldyBUcmFuc2Zvcm1hdGlvbihzY2FsZSwgMC41LCAtc2NhbGUsIDAuNSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBUcmFuc2Zvcm1hdGlvbihzY2FsZSwgMC41LCAtc2NhbGUsIDAuNSk7XHJcbiAgICB9KCkpO1xyXG4iLCJpbXBvcnQgeyBOZXdNYXAgfSBmcm9tIFwiLi9NYWluX2NsYXNzXCI7XHJcbmltcG9ydCB7IHRyYW5zZm9ybWF0aW9uIH0gZnJvbSBcIi4vU3BoZXJpY2FsTWVyY2F0b3JUaWxlTGF5ZXJfY2xhc3MuanNcIjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0b1BvaW50KHgsIHkpIHtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogeFswXSxcclxuICAgICAgICAgICAgeTogeFsxXVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBpZiAoeCA9PT0gT2JqZWN0KHgpKSB7XHJcbiAgICAgICAgLy9odHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy84NTExMjgxL2NoZWNrLWlmLWEtdmFsdWUtaXMtYW4tb2JqZWN0LWluLWphdmFzY3JpcHRcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiB4LnggfHwgeC5YLFxyXG4gICAgICAgICAgICB5OiB4LnkgfHwgeC5ZXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogeCxcclxuICAgICAgICB5OiB5XHJcbiAgICB9O1xyXG59XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLnRvUG9pbnQgPSB0b1BvaW50O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50ID0gZnVuY3Rpb24oc3BQb2ludCkge1xyXG4gICAgdmFyIHhSYXRpbyA9IHRoaXMubWFwQ29udGFpbmVyLndpZHRoIC8gKHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCksIC8vIEZvciBwYXRocy5cclxuICAgICAgICB5UmF0aW8gPSB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgLyAodGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55KTsgLy8gRm9yIHBhdGhzLlxyXG4gICAgLy92YXIgcmVzb2x1dGlvbiA9IHRoaXMuem9vbUluZGV4W3RoaXMuem9vbV0ucmVzb2x1dGlvbjtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKHhSYXRpbywgcmVzb2x1dGlvbiwgKHNwUG9pbnQueCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCkgKiB4UmF0aW8pXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiAoc3BQb2ludC54IC0gdGhpcy5leHRlbnQudmlzaWJsZS54KSAqIHhSYXRpbyxcclxuICAgICAgICB5OiAodGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gc3BQb2ludC55KSAqIHlSYXRpb1xyXG4gICAgfTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY29udmVydFByb2pQb2ludFRvT2Zmc2V0UGl4ZWxQb2ludCA9IGZ1bmN0aW9uKHBvaW50KSB7XHJcbiAgICB2YXIgc2NyZWVuUG9pbnQgPSB0aGlzLmNvbnZlcnRQcm9qUG9pbnRUb1BpeGVsUG9pbnQocG9pbnQpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogc2NyZWVuUG9pbnQueCAtIHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHNjcmVlblBvaW50LnkgLSB0aGlzLm1haW5Db250YWluZXIudG9wXHJcbiAgICB9O1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5zY3JlZW5Qb2ludFRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHBvaW50KSB7XHJcbiAgICB2YXIgc3BXaWR0aCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueDtcclxuICAgIHZhciBzcEhlaWdodCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueTtcclxuXHJcbiAgICB2YXIgb3JpZ2luTFIgPSBwb2ludC54IC8gdGhpcy5tYXBDb250YWluZXIud2lkdGg7XHJcbiAgICB2YXIgb3JpZ2luVEIgPSBwb2ludC55IC8gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogdGhpcy5leHRlbnQudmlzaWJsZS54ICsgc3BXaWR0aCAqIG9yaWdpbkxSLFxyXG4gICAgICAgIHk6IHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHNwSGVpZ2h0ICogb3JpZ2luVEJcclxuICAgIH07XHJcbn07XHJcblxyXG4vLyBDb252ZXJ0IHN0YXRlIHBsYW5lIGNvb3JkaW5hdGVzIHRvIHdncyA4NCBjb29yZGluYXRlcy4uLkknbSBndWVzc2luZyBhbnl3YXksIG5vdCBzdXJlLlxyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNQVG9XR1M4NChzcFBvaW50KSB7XHJcbiAgICB2YXIgdVggPSBzcFBvaW50LngsXHJcbiAgICAgICAgdVkgPSBzcFBvaW50Lnk7XHJcbiAgICAvLyBDb3BpZWQgZnJvbSBzY29waSEgSG93IGFib3V0IHRoYXQhXHJcbiAgICB2YXIgc3FydCA9IHdpbmRvdy5NYXRoLnNxcnQsXHJcbiAgICAgICAgcG93ID0gd2luZG93Lk1hdGgucG93LFxyXG4gICAgICAgIGF0YW4gPSB3aW5kb3cuTWF0aC5hdGFuLFxyXG4gICAgICAgIHNpbiA9IHdpbmRvdy5NYXRoLnNpbixcclxuICAgICAgICBhYnMgPSB3aW5kb3cuTWF0aC5hYnMsXHJcbiAgICAgICAgcGFydDEgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgcmhvID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHRoZXRhID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHR4eSA9IHVuZGVmaW5lZCxcclxuICAgICAgICBsb24gPSB1bmRlZmluZWQsXHJcbiAgICAgICAgbGF0MCA9IHVuZGVmaW5lZCxcclxuICAgICAgICBsYXQxID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIExhdCA9IHVuZGVmaW5lZCxcclxuICAgICAgICBMb24gPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgdVggPSB1WCAtIDE2NDA0MTYuNjY2NjY2NjY3O1xyXG4gICAgdVkgPSB1WSAtIDA7XHJcbiAgICByaG8gPSBzcXJ0KHBvdyh1WCwgMikgKyBwb3coMTkyMDUzMDkuOTY4ODg0ODQgLSB1WSwgMikpO1xyXG4gICAgdGhldGEgPSBhdGFuKHVYIC8gKDE5MjA1MzA5Ljk2ODg4NDg0IC0gdVkpKTtcclxuICAgIHR4eSA9IHBvdyhyaG8gLyAoMjA5MjU2NDYuMCAqIDEuODI5NzUyMTA4ODgyOTI4NSksIDEgLyAwLjc0NDUyMDMyNjU1NDI5MzkpO1xyXG4gICAgbG9uID0gdGhldGEgLyAwLjc0NDUyMDMyNjU1NDI5MzkgKyAtMi4xMDg5Mzk1MTI4MzMzMzI2O1xyXG4gICAgdVggPSB1WCArIDE2NDA0MTYuNjY2NjY2NjY3O1xyXG4gICAgbGF0MCA9IDEuNTcwNzk2MzI2Nzk0ODk2NiAtIDIgKiBhdGFuKHR4eSk7XHJcbiAgICBwYXJ0MSA9ICgxIC0gMC4wODE4MTkwNTc4MiAqIHNpbihsYXQwKSkgLyAoMSArIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpO1xyXG4gICAgbGF0MSA9IDEuNTcwNzk2MzI2Nzk0ODk2NiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgMC4wODE4MTkwNTc4MiAvIDIpKTtcclxuICAgIHdoaWxlIChhYnMobGF0MSAtIGxhdDApID4gMC4wMDAwMDAwMDIpIHtcclxuICAgICAgICBsYXQwID0gbGF0MTtcclxuICAgICAgICBwYXJ0MSA9ICgxIC0gMC4wODE4MTkwNTc4MiAqIHNpbihsYXQwKSkgLyAoMSArIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpO1xyXG4gICAgICAgIGxhdDEgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyICogYXRhbih0eHkgKiBwb3cocGFydDEsIDAuMDgxODE5MDU3ODIgLyAyKSk7XHJcbiAgICB9XHJcbiAgICBMYXQgPSBsYXQxIC8gMC4wMTc0NTMyOTI1MjtcclxuICAgIExvbiA9IGxvbiAvIDAuMDE3NDUzMjkyNTI7XHJcbiAgICByZXR1cm4geyBsYXQ6IExhdCwgbG5nOiBMb24gfTtcclxufVxyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5jb252ZXJ0U1BUb1dHUzg0ID0gY29udmVydFNQVG9XR1M4NDtcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGNvbnZlcnRTUCh1WCwgdVkpIHtcclxuICAgIC8vIENvcGllZCBmcm9tIFNDT1BJIGZvciBmdXR1cmUgdXNlLiBIYXMgbm90IGJlZW4gbW9kaWZpZWQgZnJvbSBTQ09QSS5cclxuXHJcbiAgICAvLz0yMDkyNTYwNC4wMDsgICAgICAgICAvLyBtYWpvciByYWRpdXMgb2YgZWxsaXBzb2lkLCBtYXAgdW5pdHMgKE5BRCA4MykgaW4gZmVldD9cclxuICAgIGEgPSAyMDkyNTY0Ni4wOyAvLyBzZWUgaHR0cDovL2Rid3d3LmVzc2MucHN1LmVkdS9sYXNkb2Mvb3ZlcnZpZXcvZ2VvbXJlZy9hcHBlLmh0bWxcclxuICAgIC8vPTIwOTI1NjA0LjQ4OyAgICAgICAgIC8vIG1vcmUgYWNjdXJhdGUgP1xyXG4gICAgLy89MjA4NTU0ODYuNTk7ICAgICAgICAgLy8gbWlub3IgcmFkaXVzXHJcbiAgICBlYyA9IDAuMDgxODE5MDU3ODI7IC8vIGVjY2VudHJpY2l0eSBvZiBlbGxpcHNvaWQgKE5BRCA4MylcclxuICAgIC8vID0gMC4wMDY2OTQzNDk2OyAgICAgIC8vIHNlZSBodHRwOi8vZGJ3d3cuZXNzYy5wc3UuZWR1L2xhc2RvYy9vdmVydmlldy9nZW9tcmVnL2FwcGUuaHRtbFxyXG4gICAgYW5nUmFkID0gMC4wMTc0NTMyOTI1MjsgLy8gbnVtYmVyIG9mIHJhZGlhbnMgaW4gYSBkZWdyZWVcclxuICAgIHBpNCA9IE1hdGguUEkgLyA0O1xyXG4gICAgLy9Cb3VsZGVyIENvdW50eSwgQ09cclxuICAgIC8vcDAgPSAzOS4zMzMzMzMgKiBhbmdSYWQ7ICAvLyBsYXRpdHVkZSBvZiBvcmlnaW5cclxuICAgIC8vcDEgPSAzOS43MTY2NjcgKiBhbmdSYWQ7ICAvLyBsYXRpdHVkZSBvZiBmaXJzdCBzdGFuZGFyZCBwYXJhbGxlbCAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLXNvdXRoPylcclxuICAgIC8vcDIgPSA0MC43ODMzMzMgKiBhbmdSYWQ7ICAvLyBsYXRpdHVkZSBvZiBzZWNvbmQgc3RhbmRhcmQgcGFyYWxsZWwgIChha2Egc3RhbmRhcmQgcGFyYWxsZWwtbm9ydGg/KVxyXG4gICAgLy9tMCA9IC0xMDUuNSAqIGFuZ1JhZDsgICAgIC8vIGNlbnRyYWwgbWVyaWRpYW4gKGFrYSBsb25naXR1ZGUgb2Ygb3JpZ2luKVxyXG4gICAgLy94MCA9IDMwMDAwMDAuMDAwMDAwOyAgICAgIC8vIGZhbHNlIGVhc3Rpbmcgb2YgY2VudHJhbCBtZXJpZGlhbiwgbWFwIHVuaXRzXHJcbiAgICAvL3kwID0gMTAwMDAwMC4wMDAwMDA7ICAgICAgLy8gZmFsc2Ugbm9ydGhpbmdcclxuICAgIC8vU25vaG9taXNoIENvdW50eSwgV0FcclxuICAgIHAwID0gNDcuMCAqIGFuZ1JhZDsgLy8gbGF0aXR1ZGUgb2Ygb3JpZ2luXHJcbiAgICBwMSA9IDQ3LjUgKiBhbmdSYWQ7IC8vIGxhdGl0dWRlIG9mIGZpcnN0IHN0YW5kYXJkIHBhcmFsbGVsIChha2Egc3RhbmRhcmQgcGFyYWxsZWwtc291dGg/KVxyXG4gICAgcDIgPSA0OC43MzMzMzMzMzMzMzMzMyAqIGFuZ1JhZDsgLy8gbGF0aXR1ZGUgb2Ygc2Vjb25kIHN0YW5kYXJkIHBhcmFsbGVsICAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLW5vcnRoPylcclxuICAgIG0wID0gLTEyMC44MzMzMzMzMzMzMzMzICogYW5nUmFkOyAvLyBjZW50cmFsIG1lcmlkaWFuIChha2EgbG9uZ2l0dWRlIG9mIG9yaWdpbilcclxuICAgIHgwID0gMTY0MDQxNi42NjY2NjY2Njc7IC8vIGZhbHNlIGVhc3Rpbmcgb2YgY2VudHJhbCBtZXJpZGlhbiwgbWFwIHVuaXRzXHJcbiAgICB5MCA9IDAuMDsgLy8gZmFsc2Ugbm9ydGhpbmdcclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgdGhlIGNvb3JkaW5hdGUgc3lzdGVtIGNvbnN0YW50cy5cclxuICAgIHdpdGggKE1hdGgpIHtcclxuICAgICAgICBtMSA9IGNvcyhwMSkgLyBzcXJ0KDEgLSBwb3coZWMsIDIpICogcG93KHNpbihwMSksIDIpKTtcclxuICAgICAgICBtMiA9IGNvcyhwMikgLyBzcXJ0KDEgLSBwb3coZWMsIDIpICogcG93KHNpbihwMiksIDIpKTtcclxuICAgICAgICB0MCA9IHRhbihwaTQgLSBwMCAvIDIpO1xyXG4gICAgICAgIHQxID0gdGFuKHBpNCAtIHAxIC8gMik7XHJcbiAgICAgICAgdDIgPSB0YW4ocGk0IC0gcDIgLyAyKTtcclxuICAgICAgICB0MCA9IHQwIC8gcG93KCgxIC0gZWMgKiBzaW4ocDApKSAvICgxICsgZWMgKiBzaW4ocDApKSwgZWMgLyAyKTtcclxuICAgICAgICB0MSA9IHQxIC8gcG93KCgxIC0gZWMgKiBzaW4ocDEpKSAvICgxICsgZWMgKiBzaW4ocDEpKSwgZWMgLyAyKTtcclxuICAgICAgICB0MiA9IHQyIC8gcG93KCgxIC0gZWMgKiBzaW4ocDIpKSAvICgxICsgZWMgKiBzaW4ocDIpKSwgZWMgLyAyKTtcclxuICAgICAgICBuID0gbG9nKG0xIC8gbTIpIC8gbG9nKHQxIC8gdDIpO1xyXG4gICAgICAgIGYgPSBtMSAvIChuICogcG93KHQxLCBuKSk7XHJcbiAgICAgICAgcmhvMCA9IGEgKiBmICogcG93KHQwLCBuKTtcclxuXHJcbiAgICAgICAgLy8gQ29udmVydCB0aGUgY29vcmRpbmF0ZSB0byBMYXRpdHVkZS9Mb25naXR1ZGUuXHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgTG9uZ2l0dWRlLlxyXG4gICAgICAgIHVYID0gdVggLSB4MDtcclxuICAgICAgICB1WSA9IHVZIC0geTA7IC8vIG1lcyBhZGRlZCBmYWxzZSBub3J0aGluZyBhcHBsaWVzIGluIDA1MDEgKD8pXHJcbiAgICAgICAgcGkyID0gcGk0ICogMjtcclxuXHJcbiAgICAgICAgcmhvID0gc3FydChwb3codVgsIDIpICsgcG93KHJobzAgLSB1WSwgMikpO1xyXG4gICAgICAgIHRoZXRhID0gYXRhbih1WCAvIChyaG8wIC0gdVkpKTtcclxuICAgICAgICB0eHkgPSBwb3cocmhvIC8gKGEgKiBmKSwgMSAvIG4pO1xyXG4gICAgICAgIGxvbiA9IHRoZXRhIC8gbiArIG0wO1xyXG4gICAgICAgIHVYID0gdVggKyB4MDtcclxuXHJcbiAgICAgICAgLy8gRXN0aW1hdGUgdGhlIExhdGl0dWRlXHJcbiAgICAgICAgbGF0MCA9IHBpMiAtIDIgKiBhdGFuKHR4eSk7XHJcblxyXG4gICAgICAgIC8vIFN1YnN0aXR1dGUgdGhlIGVzdGltYXRlIGludG8gdGhlIGl0ZXJhdGl2ZSBjYWxjdWxhdGlvbiB0aGF0XHJcbiAgICAgICAgLy8gY29udmVyZ2VzIG9uIHRoZSBjb3JyZWN0IExhdGl0dWRlIHZhbHVlLlxyXG4gICAgICAgIHBhcnQxID0gKDEgLSBlYyAqIHNpbihsYXQwKSkgLyAoMSArIGVjICogc2luKGxhdDApKTtcclxuICAgICAgICBsYXQxID0gcGkyIC0gMiAqIGF0YW4odHh5ICogcG93KHBhcnQxLCBlYyAvIDIpKTtcclxuXHJcbiAgICAgICAgd2hpbGUgKGFicyhsYXQxIC0gbGF0MCkgPiAwLjAwMDAwMDAwMikge1xyXG4gICAgICAgICAgICBsYXQwID0gbGF0MTtcclxuICAgICAgICAgICAgcGFydDEgPSAoMSAtIGVjICogc2luKGxhdDApKSAvICgxICsgZWMgKiBzaW4obGF0MCkpO1xyXG4gICAgICAgICAgICBsYXQxID0gcGkyIC0gMiAqIGF0YW4odHh5ICogcG93KHBhcnQxLCBlYyAvIDIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgZnJvbSByYWRpYW5zIHRvIGRlZ3JlZXMuXHJcbiAgICAgICAgTGF0ID0gbGF0MSAvIGFuZ1JhZDtcclxuICAgICAgICBMb24gPSBsb24gLyBhbmdSYWQ7XHJcblxyXG4gICAgICAgIC8vdHVybiBcIiAgIExvbmdpdHVkZTogXCIrTG9uK1wiICAgTGF0aXR1ZGU6IFwiK0xhdDtcclxuICAgICAgICByZXR1cm4gXCJMYXRpdHVkZTogXCIgKyBtaW51dGVzKExhdCkgKyBcIiBOICAgTG9uZ2l0dWRlOiAtXCIgKyBtaW51dGVzKExvbikgKyBcIiBXIChhcHByb3hpbWF0ZSBjb29yZGluYXRlcylcIjtcclxuICAgIH1cclxufVxyXG5cclxuKi9cclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY29udmVydFdHUzg0UHJvamVjdGlvblRvV0dTODRMYXRMb24gPSBmdW5jdGlvbihtZXJjYXRvcikge1xyXG4gICAgLy8gaHR0cHM6Ly9naXMuc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzY5MjA4L3RyeWluZy10by1jb252ZXJ0LWNvb3JkaW5hdGVzLWZyb20td2dzODQtd2ViLW1lcmNhdG9yLWF1eGlsaWFyeS1zcGhlcmUtdG8td2dzODRcclxuICAgIC8vIGh0dHBzOi8vd2lraS5vcGVuc3RyZWV0bWFwLm9yZy93aWtpL01lcmNhdG9yI0phdmFcclxuICAgIC8vICAgICAgICAgaWYgKE1hdGguYWJzKG1lcmNhdG9yWzBdKSA8IDE4MCAmJiBNYXRoLkFicyhtZXJjYXRvclsxXSkgPCA5MClcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAvLyAgICAgICAgIGlmICgoTWF0aC5BYnMobWVyY2F0b3JbMF0pID4gMjAwMzc1MDguMzQyNzg5MikgfHwgKE1hdGguQWJzKG1lcmNhdG9yWzFdKSA+IDIwMDM3NTA4LjM0Mjc4OTIpKVxyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgIHZhciB4ID0gbWVyY2F0b3JbMF07XHJcbiAgICB2YXIgeSA9IG1lcmNhdG9yWzFdO1xyXG4gICAgdmFyIG51bTMgPSB4IC8gNjM3ODEzNy4wO1xyXG4gICAgdmFyIG51bTQgPSBudW0zICogNTcuMjk1Nzc5NTEzMDgyMzIzO1xyXG4gICAgdmFyIG51bTUgPSBNYXRoLmZsb29yKChudW00ICsgMTgwLjApIC8gMzYwLjApO1xyXG4gICAgdmFyIG51bTYgPSBudW00IC0gbnVtNSAqIDM2MC4wO1xyXG4gICAgdmFyIG51bTcgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyLjAgKiBNYXRoLmF0YW4oTWF0aC5leHAoLTEuMCAqIHkgLyA2Mzc4MTM3LjApKTtcclxuICAgIG1lcmNhdG9yWzBdID0gbnVtNjtcclxuICAgIG1lcmNhdG9yWzFdID0gbnVtNyAqIDU3LjI5NTc3OTUxMzA4MjMyMztcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUubWludXRlcyA9IGZ1bmN0aW9uKG51bSkge1xyXG4gICAgLy8gRm9yIGNvbnZlcnRpbmcgY29udmVydFNQVG9XR1M4NCh4LHkpIHBvaW50cyB0byBtaW51dGVzLCBhbHNvIGJvcnJvd2VkIGZyb20gU2NvcGkhXHJcbiAgICBudW0gPSBNYXRoLmFicyhudW0pO1xyXG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcihudW0pO1xyXG4gICAgdmFyIGRlY2ltYWwgPSBudW0gLSBmbG9vcjtcclxuICAgIHZhciBtaW51dGVzID0gNjAgKiBkZWNpbWFsO1xyXG4gICAgdmFyIGZsb29yMiA9IE1hdGguZmxvb3IobWludXRlcyk7XHJcbiAgICBkZWNpbWFsID0gbWludXRlcyAtIGZsb29yMjtcclxuICAgIHZhciBzZWNvbmRzID0gNjAgKiBkZWNpbWFsO1xyXG4gICAgLy9yIGZsb29yMyA9IE1hdGgucm91bmQoc2Vjb25kcyk7XHJcbiAgICBzZWNvbmRzICo9IDEwMDtcclxuICAgIHNlY29uZHMgPSBNYXRoLnJvdW5kKHNlY29uZHMpO1xyXG4gICAgc2Vjb25kcyAvPSAxMDA7IC8vIGFjY3VyYXRlIHRvIDIgZGVjaW1hbCBwbGFjZXNcclxuICAgIHJldHVybiBmbG9vciArIFwiXFx1MDBCMCBcIiArIGZsb29yMiArIFwiXFx1MjAzMiBcIiArIHNlY29uZHMgKyBcIlxcdTIwMzNcIjtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UgPSBmdW5jdGlvbihkaXN0YW5jZVgsIGRpc3RhbmNlWSwgc3BDb29yZHMpIHtcclxuICAgIHZhciBzcFdpZHRoID0gdGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54O1xyXG4gICAgdmFyIHNwSGVpZ2h0ID0gdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55O1xyXG5cclxuICAgIHZhciB4UmF0aW8gPSBzcFdpZHRoIC8gdGhpcy5tYXBDb250YWluZXIud2lkdGg7XHJcbiAgICB2YXIgeVJhdGlvID0gc3BIZWlnaHQgLyB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQ7XHJcblxyXG4gICAgdmFyIGxlZnQgPSBkaXN0YW5jZVggKiB4UmF0aW87XHJcbiAgICB2YXIgdG9wID0gMCAtIGRpc3RhbmNlWSAqIHlSYXRpbztcclxuXHJcbiAgICBpZiAoc3BDb29yZHMpIHtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggPSBzcENvb3Jkcy54IC09IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZS5YID0gc3BDb29yZHMuWCAtPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUueSA9IHNwQ29vcmRzLnkgLT0gdG9wO1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSA9IHNwQ29vcmRzLlkgLT0gdG9wO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggLT0gbGVmdDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWCAtPSBsZWZ0O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS55IC09IHRvcDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSAtPSB0b3A7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLnVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeURpc3RhbmNlMSA9IGZ1bmN0aW9uKF94LCBfeSwgc3BDb29yZHMpIHtcclxuICAgIGxldCByZXNvbHV0aW9uID0gdGhpcy5nZXRSZXNvbHV0aW9uKHRoaXMuem9vbSk7XHJcbiAgICBsZXQgX194ID0gX3ggKiByZXNvbHV0aW9uO1xyXG4gICAgbGV0IF9feSA9IF95ICogcmVzb2x1dGlvbjtcclxuY29uc29sZS5sb2coX3gpXHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggKz0gX194O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5YICs9IF9feDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUueSArPSBfX3k7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlkgKz0gX195O1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS51cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlPcmlnaW4gPSBmdW5jdGlvbihwX29yaWdpbiwgcF9zY2FsZSkge1xyXG4gICAgdmFyIHNwV2lkdGggPSB0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLng7XHJcbiAgICB2YXIgc3BIZWlnaHQgPSB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSB0aGlzLmV4dGVudC52aXNpYmxlLnk7XHJcblxyXG4gICAgaWYgKHBfc2NhbGUgPT09IDIpIHtcclxuICAgICAgICBzcFdpZHRoID0gc3BXaWR0aCAqIC0oMSAvIHBfc2NhbGUpO1xyXG4gICAgICAgIHNwSGVpZ2h0ID0gc3BIZWlnaHQgKiAtKDEgLyBwX3NjYWxlKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggLT0gc3BXaWR0aCAqIHBfb3JpZ2luLng7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlggKz0gc3BXaWR0aCAqICgxIC0gcF9vcmlnaW4ueCk7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgLT0gc3BIZWlnaHQgKiBwX29yaWdpbi55O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5ZICs9IHNwSGVpZ2h0ICogKDEgLSBwX29yaWdpbi55KTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMuZXh0ZW50LnZpc2libGUpO1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS51cGRhdGVWaXNFeHRlbnRCeU9yaWdpbkFuZFJlc29sdXRpb24gPSBmdW5jdGlvbihwX29yaWdpbiwgcF9zY2FsZSwgcF9yZXNvbHV0aW9uKSB7XHJcbiAgICBsZXQgdmlzID0gdGhpcy5leHRlbnQudmlzaWJsZTtcclxuICAgIC8vbGV0IHJlc29sdXRpb24gPSB0aGlzLmdldFJlc29sdXRpb24ocF96b29tKTtcclxuICAgIGxldCBzcFdpZHRoID0gdGhpcy5tYXBDb250YWluZXIud2lkdGggKiBwX3Jlc29sdXRpb247XHJcbiAgICBsZXQgc3BIZWlnaHQgPSB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgKiBwX3Jlc29sdXRpb247XHJcblxyXG4gICAgbGV0IHJhdGlvWCA9ICh2aXMuWCAtIHBfb3JpZ2luLnggKSAvICh2aXMuWCAtIHZpcy54KTtcclxuICAgIGxldCByYXRpb1kgPSAodmlzLlkgLSBwX29yaWdpbi55KSAvICh2aXMuWSAtIHZpcy55KTtcclxuXHJcbiAgICBpZiAocF9zY2FsZSA+PSAxKSB7XHJcbiAgICAgICAgcF9zY2FsZSA9IHBfc2NhbGUgLSAxO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBwX3NjYWxlID0gLSgxIC0gcF9zY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmlzLlggLT0gc3BXaWR0aCAqIHBfc2NhbGUgKiByYXRpb1g7XHJcbiAgICB2aXMueCA9IHZpcy5YIC0gc3BXaWR0aDtcclxuICAgIHZpcy5ZIC09IHNwSGVpZ2h0ICogcF9zY2FsZSAqIHJhdGlvWTtcclxuICAgIHZpcy55ID0gdmlzLlkgLSBzcEhlaWdodDtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyID0gZnVuY3Rpb24ocG9pbnQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogcG9pbnQueCAtIHRoaXMubWFwQ29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgeTogcG9pbnQueSAtIHRoaXMubWFwQ29udGFpbmVyLnRvcFxyXG4gICAgfTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuZ2V0UGFuT2Zmc2V0UG9pbnQgPSBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgdmFyIHBhbk9mZnNldFggPSB0aGlzLm1haW5Db250YWluZXIubGVmdDsgLy8rIHRoaXMubWFwSW1nLmxlZnQ7IC8vIFNob3VsZCBiZSB6ZXJvIGlmIG5vdCBwYW5uaW5nLlxyXG4gICAgdmFyIHBhbk9mZnNldFkgPSB0aGlzLm1haW5Db250YWluZXIudG9wOyAvLysgdGhpcy5tYXBJbWcudG9wO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogcG9pbnQueCAtIHBhbk9mZnNldFgsIC8vIFRoaXMgd2lsbCBzZXQgdGhlIG9yaWdpbiB0bykvMnRoZSBjZW50ZXIgLT4gLSB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAvIDI7XHJcbiAgICAgICAgeTogcG9pbnQueSAtIHBhbk9mZnNldFlcclxuICAgIH07XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmRpc3RhbmNlQmV0d2VlbiA9IGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgIC8vIEdvb2Qgb2xkIHB5dGhhZ29yZWFuIHRoZW9yZW0uXHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KGJbMF0gLSBhWzBdLCAyKSArIE1hdGgucG93KGJbMV0gLSBhWzFdLCAyKSk7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmNvbnZlcnRTUFRvV0dTODRQcm9qID0gZnVuY3Rpb24oc3BQb2ludCkge1xyXG4gICAgbGV0IHdzZzg1TGF0TG9uID0gdGhpcy5jb252ZXJ0U1BUb1dHUzg0KHNwUG9pbnQpO1xyXG4gICAgLy9jb25zb2xlLmxvZyh3c2c4NUxhdExvbiwgdGhpcy5MZWFmbGV0U3BoZXJpY2FsTWVyY2F0b3IucHJvamVjdCh3c2c4NUxhdExvbikpO1xyXG4gICAgcmV0dXJuIHRoaXMuTGVhZmxldFNwaGVyaWNhbE1lcmNhdG9yLnByb2plY3RGcm9tV1NHODRHZW8od3NnODVMYXRMb24pO1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5nZXRSZXNvbHV0aW9uID0gZnVuY3Rpb24oem9vbSkge1xyXG4gICAgaWYgKHRoaXMuem9vbUluZGV4KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuem9vbUluZGV4W3pvb21dLnJlc29sdXRpb247XHJcbiAgICB9XHJcbiAgICAvLyBXU0c4NCBTcGhlcmljYWwgTWVyY2F0b3IuXHJcbiAgICAvLyBsZXQgRWFydGhSYWRpdXMgPSA2Mzc4MTM3O1xyXG4gICAgLy8gbGV0IFJhZGl1c3hQaSA9IE1hdGguUEkgKiBFYXJ0aFJhZGl1cztcclxuICAgIC8vIGxldCBQaXhlbHNBdFpvb20gPSAyNTYgKiBNYXRoLnBvdygyLCB6b29tKTtcclxuICAgIC8vIGxldCBkZWdQZXJNZXRlciA9IFJhZGl1c3hQaSAqIDIgLyBFYXJ0aFJhZGl1cztcclxuICAgIC8vIGxldCBkZWdQZXJQaXhlbCA9IEVhcnRoUmFkaXVzIC8gUGl4ZWxzQXRab29tICogZGVnUGVyTWV0ZXI7XHJcbiAgICB2YXIgcGl4ZWxzID0gMjU2ICogTWF0aC5wb3coMiwgem9vbSkgLyAyO1xyXG4gICAgdmFyIGV4dGVudCA9IDIwMDM3NTA4LjM0Mjc4OTI0NDtcclxuICAgIHZhciByZXMgPSBleHRlbnQgLyBwaXhlbHM7XHJcblxyXG4gICAgcmV0dXJuIHJlcztcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuTGVhZmxldFNwaGVyaWNhbE1lcmNhdG9yID0ge1xyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0xlYWZsZXQvTGVhZmxldC9ibG9iL21hc3Rlci9zcmMvZ2VvL3Byb2plY3Rpb24vUHJvamVjdGlvbi5TcGhlcmljYWxNZXJjYXRvci5qc1xyXG4gICAgLy8gaHR0cHM6Ly9naXMuc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzkyOTA3L3JlLXByb2plY3QtcmFzdGVyLWltYWdlLWZyb20tbWVyY2F0b3ItdG8tZXF1aXJlY3Rhbmd1bGFyXHJcbiAgICAvLyBodHRwczovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9TbGlwcHlfbWFwX3RpbGVuYW1lc1xyXG4gICAgUkFESVVTOiA2Mzc4MTM3LFxyXG4gICAgTUFYX0xBVElUVURFOiA4NS4wNTExMjg3Nzk4LFxyXG4gICAgQk9VTkQ6IDIwMDM3NTA4LjM0Mjc4OTI0NCwgLy8yMDAzNzUwOC4zNDI3ODkyNDQgVE9ETzogXCJCT1VORFwiIGlzIHByb2JhYmx5IG5vdCB0aGUgY29ycmVjdCB0ZXJtLlxyXG5cclxuICAgIHByb2plY3RGcm9tV1NHODRHZW86IGZ1bmN0aW9uKGxhdGxuZykge1xyXG4gICAgICAgIHZhciBkID0gTWF0aC5QSSAvIDE4MCxcclxuICAgICAgICAgICAgbWF4ID0gdGhpcy5NQVhfTEFUSVRVREUsXHJcbiAgICAgICAgICAgIGxhdCA9IE1hdGgubWF4KE1hdGgubWluKG1heCwgbGF0bG5nLmxhdCksIC1tYXgpLFxyXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihsYXQgKiBkKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5SQURJVVMgKiBsYXRsbmcubG5nICogZCxcclxuICAgICAgICAgICAgeTogdGhpcy5SQURJVVMgKiBNYXRoLmxvZygoMSArIHNpbikgLyAoMSAtIHNpbikpIC8gMlxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIHByb2plY3RUb1dTRzg0R2VvOiBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgICAgIHZhciBkID0gMTgwIC8gTWF0aC5QSSxcclxuICAgICAgICAgICAgUiA9IHRoaXMuUkFESVVTO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBsYXQ6ICgyICogTWF0aC5hdGFuKE1hdGguZXhwKHBvaW50LnkgLyBSKSkgLSBNYXRoLlBJIC8gMikgKiBkLFxyXG4gICAgICAgICAgICBsbmc6IHBvaW50LnggKiBkIC8gUlxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG59O1xyXG5cclxuLypcclxuaHR0cHM6Ly9sZWFmbGV0anMuY29tL2V4YW1wbGVzL3F1aWNrLXN0YXJ0L2V4YW1wbGUuaHRtbFxyXG5cclxudmFyIGR2aSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpLmNsb25lTm9kZSgpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwaWQnKS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpKTtcclxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkdmkpO1xyXG5cclxudmFyIHNjcmlwdHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgIHNjcmlwdHQuc3JjID0gJ2h0dHBzOi8vdW5wa2cuY29tL2xlYWZsZXRAMS4zLjQvZGlzdC9sZWFmbGV0LXNyYy5qcyc7XHJcbiAgICBzY3JpcHR0LmNyb3NzT3JpZ2luID0gdHJ1ZTtcclxuZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHR0KTtcclxuXHJcblxyXG5cclxubXltYXAgPSBMLm1hcCgnbWFwaWQnKS5zZXRWaWV3KFswLCAwXSwgMTMpO1xyXG5teW1hcC5vbignY2xpY2snLCBvbk1hcENsaWNrKVxyXG5cclxuICAgIEwudGlsZUxheWVyKCdodHRwczovL2FwaS50aWxlcy5tYXBib3guY29tL3Y0L3tpZH0ve3p9L3t4fS97eX0ucG5nP2FjY2Vzc190b2tlbj1way5leUoxSWpvaWJXRndZbTk0SWl3aVlTSTZJbU5wZWpZNE5YVnljVEEyZW1ZeWNYQm5kSFJxY21aM04zZ2lmUS5ySmNGSUcyMTRBcmlJU0xiQjZCNWF3Jywge1xyXG4gICAgICAgIG1heFpvb206IDE4LFxyXG4gICAgICAgIGF0dHJpYnV0aW9uOiAnTWFwIGRhdGEgJmNvcHk7IDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPiBjb250cmlidXRvcnMsICcgK1xyXG4gICAgICAgICAgICAnPGEgaHJlZj1cImh0dHBzOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8yLjAvXCI+Q0MtQlktU0E8L2E+LCAnICtcclxuICAgICAgICAgICAgJ0ltYWdlcnkgwqkgPGEgaHJlZj1cImh0dHBzOi8vd3d3Lm1hcGJveC5jb20vXCI+TWFwYm94PC9hPicsXHJcbiAgICAgICAgaWQ6ICdtYXBib3guc3RyZWV0cydcclxuICAgIH0pLmFkZFRvKG15bWFwKTtcclxuXHJcbiAgICBMLm1hcmtlcihbMCwgMF0pLmFkZFRvKG15bWFwKVxyXG4gICAgICAgIC5iaW5kUG9wdXAoXCI8Yj5IZWxsbyB3b3JsZCE8L2I+PGJyIC8+SSBhbSBhIHBvcHVwLlwiKS5vcGVuUG9wdXAoKTtcclxuXHJcblxyXG5cclxucG9wdXAgPSBMLnBvcHVwKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25NYXBDbGljayhlKSB7XHJcbiAgICAgICAgcG9wdXBcclxuICAgICAgICAgICAgLnNldExhdExuZyhlLmxhdGxuZylcclxuICAgICAgICAgICAgLnNldENvbnRlbnQoXCJZb3UgY2xpY2tlZCB0aGUgbWFwIGF0IFwiICsgZS5sYXRsbmcudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgLm9wZW5PbihteW1hcCk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiovXHJcbiIsImltcG9ydCB7IEJhc2ljSW50ZXJhY3RpdmVFbGVtZW50IH0gZnJvbSBcIi4vQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnRfY2xhc3NcIjtcclxuaW1wb3J0IHsgdG9Qb2ludCwgY29udmVydFNQVG9XR1M4NCB9IGZyb20gXCIuL2Nvb3JkaW5hdGVfbW9kdWxlXCI7XHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gXCIuL3V0aWxzLmpzXCI7XHJcblxyXG4vL2ltcG9ydCB7IE5ld01hcCB9IGZyb20gXCIuL01haW5fY2xhc3NcIjtcclxuLy9sZXQgbXJrciA9IHt9O1xyXG5cclxuLy92YXIgbWFya2VyX21vZHVsZSA9IGZ1bmN0aW9uKHRoaXNNYXApIHtcclxuLy9cInVzZSBzdHJpY3RcIjtcclxudmFyIF9tYXJrZXJDb3VudGVyID0gMDtcclxuXHJcbi8vdGhpc01hcC5tYWtlTWFya2VyID0gbWFrZU1hcmtlcjtcclxuLy90aGlzTWFwLm1ha2VQb3B1cCA9IG1ha2VQb3B1cDtcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXJrZXJCYXNpY3MgZXh0ZW5kcyBCYXNpY0ludGVyYWN0aXZlRWxlbWVudCB7XHJcbiAgICBjb25zdHJ1Y3RvcihlbGVtKSB7XHJcbiAgICAgICAgc3VwZXIoZWxlbSk7XHJcblxyXG4gICAgICAgIGVsZW0uc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbTtcclxuXHJcbiAgICAgICAgdGhpcy5vZmZzZXRQb3MgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbihcIm1vdXNlZG93blwiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJhcHBlbmRlZFRvTWFwXCIsIGUgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInpvb20gZW5kXCIsIHRoaXMuX3pvb21FbmRDYWxsYmFjaywgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwidXBkYXRlIGV2ZXJ5dGhpbmdcIiwgdGhpcy5fem9vbUVuZENhbGxiYWNrLCB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kZWRUb01hcCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNldENvb3JkcyhzcFBvaW50KSB7XHJcbiAgICAgICAgc3BQb2ludCA9IHRvUG9pbnQoc3BQb2ludCk7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGVQbGFuZVBvaW50ID0gc3BQb2ludDtcclxuXHJcbiAgICAgICAgdGhpcy56SW5kZXggPSAxZTYgLSB0aGlzLnN0YXRlUGxhbmVQb2ludC55LnRvRml4ZWQoMCk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLnpJbmRleCA9IHRoaXMuekluZGV4O1xyXG5cclxuICAgICAgICB0aGlzLndnczg0WFBvaW50ID0gY29udmVydFNQVG9XR1M4NChzcFBvaW50LngsIHNwUG9pbnQueSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmFwcGVuZGVkVG9NYXApIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHNldE9mZnNldFBvcyhwb2ludCkge1xyXG4gICAgICAgIHRoaXMub2Zmc2V0UG9zID0gdGhpcy5tYXAudG9Qb2ludChwb2ludCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFRvTWFwKGFyZ19tYXApIHtcclxuICAgICAgICBsZXQgdGhpc01hcmtlciA9IHRoaXM7XHJcbiAgICAgICAgbGV0IG1hcCA9IGFyZ19tYXA7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZVBsYW5lUG9pbnQueCkge1xyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlNldCBjb29yZGluYXRlcyBiZWZvcmUgYXBwZW5kaW5nIG1hcmtlci5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcCA9IGFyZ19tYXA7XHJcblxyXG4gICAgICAgIG1hcC5hZGRUbyh0aGlzLmVsZW1lbnQsIG1hcC5tYXJrZXJDb250YWluZXIuZWxlbWVudCwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICB0aGlzTWFya2VyLmZpcmUoXCJhcHBlbmRlZFRvTWFwXCIsIGUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzaG93KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuYWRkVG9NYXAodGhpcy5tYXApO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBoaWRlKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICB0aGlzLmFwcGVuZGVkVG9NYXAgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub2ZmKFwibWFwIGxvYWQgZW5kXCIsIHRoaXMudXBkYXRlUG9zLCB0aGlzKTtcclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vZmYoXCJ6b29tIGVuZFwiLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBfem9vbUVuZENhbGxiYWNrKGUpIHtcclxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gKGUuY3NzICYmIGUuY3NzLmNsYXNzTmFtZSkgfHwgXCJtYXJrZXJfem9vbV90cmFuc2l0aW9uXCI7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlUG9zKCk7XHJcblxyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnpvb21BbmltVGltZXIpO1xyXG4gICAgICAgIHRoaXMuem9vbUFuaW1UaW1lciA9IHNldFRpbWVvdXQodGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUuYmluZCh0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LCBjbGFzc05hbWUpLCAzNTApO1xyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZSgpIHtcclxuICAgICAgICB0aGlzLmhpZGUoKTtcclxuICAgICAgICB0aGlzLmRlbGV0ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJkZWxldGVcIiwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcGFuSW50b1ZpZXcoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFwcGVuZGVkVG9NYXApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLCBcIjwtIFRoYXQgaGFzIHRvIGJlIGFkZGVkIHRvIGEgbWFwIGJlZm9yZSBjYWxsaW5nIHBhbkludG9WaWV3KCkuXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG1hcENvbnQgPSB0aGlzLm1hcC5tYXBDb250YWluZXI7XHJcbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgdmFyIHBhZGRpbmcgPSA1O1xyXG4gICAgICAgIHZhciBwb2ludCA9IHsgeDogMCwgeTogMCB9O1xyXG5cclxuICAgICAgICBpZiAocmVjdC50b3AgPCBtYXBDb250LnRvcCArIDUpIHtcclxuICAgICAgICAgICAgcG9pbnQueSA9IG1hcENvbnQudG9wIC0gcmVjdC50b3AgKyA1O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHJlY3QubGVmdCA8IG1hcENvbnQubGVmdCArIHBhZGRpbmcpIHtcclxuICAgICAgICAgICAgcG9pbnQueCA9IG1hcENvbnQubGVmdCAtIHJlY3QubGVmdCArIHBhZGRpbmc7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZWN0LmxlZnQgKyByZWN0LndpZHRoID4gbWFwQ29udC5sZWZ0ICsgbWFwQ29udC53aWR0aCAtIHBhZGRpbmcpIHtcclxuICAgICAgICAgICAgcG9pbnQueCA9IG1hcENvbnQubGVmdCArIG1hcENvbnQud2lkdGggLSAocmVjdC5sZWZ0ICsgcmVjdC53aWR0aCkgLSBwYWRkaW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBvaW50LnggfHwgcG9pbnQueSkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5wYW5uaW5nX21vZHVsZS5wYW5CeVBpeGVscyhwb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVBvcygpIHtcclxuICAgICAgICBpZiAoIXRoaXMuYXBwZW5kZWRUb01hcCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZShcInByZVVwZGF0ZVBvc1wiLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdmFyIHBvaW50ID0gdGhpcy5tYXAuY29udmVydFByb2pQb2ludFRvT2Zmc2V0UGl4ZWxQb2ludCh0aGlzLnN0YXRlUGxhbmVQb2ludCk7XHJcblxyXG4gICAgICAgIHBvaW50LnggPSB+fihwb2ludC54ICsgdGhpcy5vZmZzZXRQb3MueCk7XHJcbiAgICAgICAgcG9pbnQueSA9IH5+KHBvaW50LnkgKyB0aGlzLm9mZnNldFBvcy55KTtcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID0gXCJ0cmFuc2xhdGUoXCIgKyBwb2ludC54ICsgXCJweCwgXCIgKyBwb2ludC55ICsgXCJweClcIjtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwicG9zdFVwZGF0ZVBvc1wiLCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNYWtlTWFya2VyIGV4dGVuZHMgTWFya2VyQmFzaWNzIHtcclxuICAgIGNvbnN0cnVjdG9yKHBfc3BQb2ludCwgb3B0aW9ucykge1xyXG4gICAgICAgIGxldCBfb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgb2Zmc2V0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIHBvcHVwQW5jaG9yOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG1hcmtlckVsZW1lbnQ6IGJhc2ljTWFya2VyKClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBPYmplY3QuYXNzaWduKF9vcHRpb25zLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgc3VwZXIoX29wdGlvbnMubWFya2VyRWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IF9vcHRpb25zO1xyXG5cclxuICAgICAgICBwX3NwUG9pbnQgPSBwX3NwUG9pbnQgPyB0b1BvaW50KHBfc3BQb2ludCkgOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAocF9zcFBvaW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29vcmRzKHBfc3BQb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBvcHVwKG9wdF9odG1sLCBvcHRfb2Zmc2V0UG9pbnQpIHtcclxuICAgICAgICB2YXIgbWFya2VyID0gdGhpcztcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gb3B0X29mZnNldFBvaW50IHx8IF9vcHRpb25zLnBvcHVwQW5jaG9yIHx8IFswLCAtMTAwXTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwID0gbWFrZVBvcHVwKG9wdF9odG1sLCBudWxsLCBvZmZzZXQpXHJcbiAgICAgICAgICAgIC5zZXRDb29yZHMobWFya2VyLnN0YXRlUGxhbmVQb2ludClcclxuICAgICAgICAgICAgLmFkZFRvTWFwKG1hcmtlci5tYXApO1xyXG5cclxuICAgICAgICBtYXJrZXIucG9wdXAub24oXCJkZWxldGVcIiwgbWFya2VyLmRlbGV0ZS5iaW5kKG1hcmtlcikpO1xyXG5cclxuICAgICAgICBtYXJrZXIuc2hvd1BvcHVwID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGlmIChtYXJrZXIuYXBwZW5kZWRUb01hcCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hcmtlci5wb3B1cC5lbGVtZW50LnBhcmVudE5vZGUpe1xyXG4gICAgICAgICAgICAgICAgbWFya2VyLnBvcHVwLnVwZGF0ZVBvcygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbWFya2VyLnBvcHVwLmFkZFRvTWFwKG1hcmtlci5tYXApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBtYXJrZXIub24oXCJhcHBlbmRlZFRvTWFwXCIsIGZ1bmN0aW9uIF9mbl8oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5zaG93UG9wdXAoKTtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrZXIub2ZmKFwiYXBwZW5kZWRUb01hcFwiLCBfZm5fKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbWFya2VyLmhpZGVQb3B1cCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBtYXJrZXIucG9wdXAuaGlkZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIG1hcmtlci5wb3B1cC5zaG93ID0gbWFya2VyLnNob3dQb3B1cDtcclxuXHJcbiAgICAgICAgbWFya2VyLnNldFBvcHVwTWVzc2FnZSA9IG1hcmtlci5wb3B1cC5zZXRNZXNzYWdlO1xyXG5cclxuICAgICAgICBtYXJrZXIuc2hvd1BvcHVwKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBtYXJrZXIucG9wdXA7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlTWFya2VyKHBfc3BQb2ludCwgb3B0aW9ucykge1xyXG4gICAgcmV0dXJuIG5ldyBNYWtlTWFya2VyKC4uLmFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlUG9wdXAob3B0X21lc3NhZ2UsIG9wdF9zcFBvaW50LCBvcHRfYW5jaG9yT2Zmc2V0ID0gWzAsIDBdKSB7XHJcbiAgICAvL29wdF9hbmNob3JPZmZzZXQgPSBvcHRfYW5jaG9yT2Zmc2V0IHx8IFswLDBdO1xyXG5cclxuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBlbC5jbGFzc05hbWUgPSBcInBvcHVwUGFyZW50XCI7XHJcblxyXG4gICAgbGV0IHBvcHVwID0gbmV3IE1hcmtlckJhc2ljcyhlbCk7XHJcblxyXG4gICAgaWYgKG9wdF9zcFBvaW50KSB7XHJcbiAgICAgICAgcG9wdXAuc2V0Q29vcmRzKHRvUG9pbnQob3B0X3NwUG9pbnQpKTtcclxuICAgIH1cclxuXHJcbiAgICBwb3B1cC5vZmZzZXRQb3MgPSB0b1BvaW50KG9wdF9hbmNob3JPZmZzZXQpO1xyXG5cclxuICAgIHBvcHVwLm1lc3NhZ2UgPSBvcHRfbWVzc2FnZTtcclxuXHJcbiAgICBwb3B1cC5vbihcImFwcGVuZGVkVG9NYXBcIiwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIHBvcHVwLm9uKHBvcHVwLm1hcC5NT1VTRV9XSEVFTF9FVlQsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIHBvcHVwLm9uKFwicHJlVXBkYXRlUG9zXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBwb3B1cC5zZXRPZmZTZXRMZWZ0VG9wKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBwb3B1cC5zZXRPZmZTZXRMZWZ0VG9wID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgbGV0IGVsID0gdGhpcy5lbGVtZW50O1xyXG4gICAgICAgIGVsLnN0eWxlLmxlZnQgPSAtKGVsLm9mZnNldFdpZHRoIC8gMikgKyBcInB4XCI7XHJcbiAgICAgICAgZWwuc3R5bGUuYm90dG9tID0gcG9wdXAuYXJyb3cub2Zmc2V0SGVpZ2h0ICsgXCJweFwiO1xyXG5cclxuICAgICAgICByZXR1cm4gcG9wdXA7XHJcbiAgICB9O1xyXG5cclxuICAgIHBvcHVwLnNldE1lc3NhZ2UgPSBmdW5jdGlvbihvcHRfbWVzc2FnZSkge1xyXG4gICAgICAgIHBvcHVwLm1lc3NhZ2VDb250YWluZXIuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRfbWVzc2FnZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICBwb3B1cC5tZXNzYWdlQ29udGFpbmVyLmlubmVySFRNTCA9IG9wdF9tZXNzYWdlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBvcHVwLm1lc3NhZ2VDb250YWluZXIuYXBwZW5kQ2hpbGQob3B0X21lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9wdXAubWVzc2FnZSA9IG9wdF9tZXNzYWdlO1xyXG5cclxuICAgICAgICBwb3B1cC51cGRhdGVQb3MoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHBvcHVwO1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZGVsZXRlQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGRlbGV0ZUJ1dHRvbi5jbGFzc05hbWUgPSBcIm1hcmtlckRlbGV0ZUJ1dHRvblwiO1xyXG4gICAgZGVsZXRlQnV0dG9uLmlubmVySFRNTCA9IFwiJiMyMTU7XCI7XHJcbiAgICBkZWxldGVCdXR0b24ucG9wdXAgPSBwb3B1cDtcclxuICAgIHBvcHVwLmRlbGV0ZUJ1dHRvbiA9IGRlbGV0ZUJ1dHRvbjtcclxuICAgIGRlbGV0ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcG9wdXAuZGVsZXRlLmJpbmQocG9wdXApKTtcclxuICAgIGVsLmFwcGVuZENoaWxkKGRlbGV0ZUJ1dHRvbik7XHJcblxyXG4gICAgdmFyIG1lc3NhZ2VDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgbWVzc2FnZUNvbnRhaW5lci5pbm5lckhUTUwgPSBvcHRfbWVzc2FnZSB8fCBcIlwiO1xyXG4gICAgbWVzc2FnZUNvbnRhaW5lci5jbGFzc05hbWUgPSBcIm1lc3NhZ2VDb250YWluZXJcIjtcclxuICAgIG1lc3NhZ2VDb250YWluZXIuc3R5bGUuY29sb3IgPSBcImJsYWNrXCI7XHJcbiAgICBtZXNzYWdlQ29udGFpbmVyLnBvcHVwID0gcG9wdXA7XHJcbiAgICBwb3B1cC5tZXNzYWdlQ29udGFpbmVyID0gbWVzc2FnZUNvbnRhaW5lcjtcclxuICAgIGVsLmFwcGVuZENoaWxkKG1lc3NhZ2VDb250YWluZXIpO1xyXG5cclxuICAgIHZhciBhcnJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBhcnJvdy5jbGFzc05hbWUgPSBcIm1hcmtlckFycm93XCI7XHJcbiAgICBwb3B1cC5hcnJvdyA9IGFycm93O1xyXG4gICAgZWwuYXBwZW5kQ2hpbGQoYXJyb3cpO1xyXG5cclxuICAgIHZhciBpbm5lckFycm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGlubmVyQXJyb3cuY2xhc3NOYW1lID0gXCJtYXJrZXJJbm5lckFycm93XCI7XHJcbiAgICBwb3B1cC5pbm5lckFycm93ID0gaW5uZXJBcnJvdztcclxuICAgIGFycm93LmFwcGVuZENoaWxkKGlubmVyQXJyb3cpO1xyXG5cclxuICAgIHJldHVybiBwb3B1cDtcclxufVxyXG5cclxuZnVuY3Rpb24gYmFzaWNNYXJrZXIoKSB7XHJcbiAgICB2YXIgbWFya2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgIG1hcmtlci5zcmMgPSBcImh0dHBzOi8vdW5wa2cuY29tL2xlYWZsZXRAMS4zLjEvZGlzdC9pbWFnZXMvbWFya2VyLWljb24ucG5nXCI7XHJcbiAgICAvLyBpbWcuc3R5bGUud2lkdGggPSAnMTQwJSc7XHJcblxyXG4gICAgLy9tYXJrZXIuYXBwZW5kQ2hpbGQoaW1nKTtcclxuXHJcbiAgICBtYXJrZXIuaWQgPSBcIm1hcmtlcl9cIiArIF9tYXJrZXJDb3VudGVyKys7XHJcbiAgICAvLyB0b2RvOiBQdXQgdGhpcyBpbiBhIHN0eWxlIHNoZWV0LlxyXG4gICAgbWFya2VyLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmxlZnQgPSBcIi0xMnB4XCI7XHJcbiAgICBtYXJrZXIuc3R5bGUuYm90dG9tID0gXCIwcHhcIjtcclxuICAgIG1hcmtlci5zdHlsZS50cmFuc2Zvcm0gPSBcIlwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmNvbG9yID0gXCJ3aGl0ZVwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmZvbnRTaXplID0gXCIxNXB4XCI7XHJcbiAgICBtYXJrZXIuc3R5bGUud2lsbENoYW5nZSA9IFwidHJhbnNmb3JtXCI7XHJcbiAgICAvLyBtYXJrZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjZWE0MzM1XCI7XHJcbiAgICAvLyBtYXJrZXIuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcclxuICAgIC8vbWFya2VyLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9XHJcbiAgICAvLyAgICAgICAndXJsKFwiaHR0cDovL3d3dy5zbm9jby5vcmcvZG9jcy9zYXMvcGhvdG9zLzAwNTkvMDA1OTU4MDAwMDM0MDBSMDExLmpwZ1wiKSc7XHJcbiAgICAvLyBtYXJrZXIuc3R5bGUuYm94U2hhZG93ID0gXCIwcHggMHB4IDBweCAxcHggcmdiKDI1NSwyNTUsMjU1KVwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmJvcmRlclJhZGl1cyA9IFwiNTBweFwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xyXG4gICAgbWFya2VyLnN0eWxlLnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICBtYXJrZXIuY2xhc3NOYW1lID0gXCJtYXJrZXJQYXJlbnQzXCI7XHJcbiAgICAvL21hcmtlci5zdHlsZS5oZWlnaHQgPSBcIjIwcHhcIjtcclxuICAgIC8vbWFya2VyLnN0eWxlLndpZHRoID0gXCIyMHB4XCI7XHJcbiAgICBtYXJrZXIuc3R5bGUubGluZUhlaWdodCA9IFwiMjBweFwiO1xyXG5cclxuICAgIHJldHVybiBtYXJrZXI7XHJcbn1cclxuIiwiaW1wb3J0IHtOZXdNYXB9IGZyb20gJy4vTWFpbl9jbGFzcyc7XHJcblxyXG5PYmplY3QuYXNzaWduKFxyXG4gICAgTmV3TWFwLnByb3RvdHlwZSxcclxuICAgIGJveFpvb21fbW91c2VEb3duLFxyXG4gICAgYm94Wm9vbV9tb3VzZVVwLFxyXG4gICAgYm94Wm9vbV9kb1pvb20sXHJcbiAgICBib3hab29tX21vdXNlTW92ZSxcclxuICAgIGJveFpvb21DZW50ZXJfbW91c2VNb3ZlLFxyXG4pO1xyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9tb3VzZURvd24oZSkge1xyXG4gICAgaWYgKHRoaXMuYm94Wm9vbSkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5ib3hab29tLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYm94Wm9vbSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucGFubmluZ19tb2R1bGUuZGlzYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgIC8vIFRPRE86IE1ha2UgYm94Wm9vbSBpdCdzIG93biBvYmplY3Qgd2l0aCBhIGVsZW1lbnQgcHJvcGVydHksIGluc3RlYWQgb2YgXHJcbiAgICAvLyAgICAgICBhZGRpbmcgcHJvcGVydGllcyB0byB0aGUgaHRtbCBlbGVtZW50IGl0c2VsZi5cclxuICAgIHRoaXMuYm94Wm9vbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgdGhpcy5ib3hab29tLmlkID0gJ2JveFpvb20nO1xyXG4gICAgdGhpcy5ib3hab29tLmNsYXNzTmFtZSA9ICdib3hab29tJztcclxuXHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlci5pZCA9ICdib3hab29tQ2VudGVyJztcclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlci5jbGFzc05hbWUgPSAnYm94Wm9vbUNlbnRlcic7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuc3R5bGUuY3NzVGV4dCA9XHJcbiAgICAgICAgJ3Bvc2l0aW9uOmFic29sdXRlOyB0b3A6MHB4OyBsZWZ0OjBweDsgd2lkdGg6IDVweDsgaGVpZ2h0OiA1cHg7IGJvcmRlcjogMXB4IHNvbGlkIHJlZDsnO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5hcHBlbmRDaGlsZCh0aGlzLmJveFpvb21DZW50ZXIpO1xyXG5cclxuICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50Lmluc2VydEJlZm9yZShcclxuICAgICAgICB0aGlzLmJveFpvb20sXHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudCxcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5ib3hab29tLm9mZnNldCA9IHtcclxuICAgICAgICB4OiB0aGlzLm1hcENvbnRhaW5lci5sZWZ0ICsgdGhpcy5tYWluQ29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgeTogdGhpcy5tYXBDb250YWluZXIudG9wICsgdGhpcy5tYWluQ29udGFpbmVyLnRvcCxcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5ib3hab29tLnN0eWxlLmxlZnQgPSBlLmNsaWVudFggLSBib3hab29tLm9mZnNldC54ICsgJ3B4JztcclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPSBlLmNsaWVudFkgLSBib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS56SW5kZXggPSA1MDA7XHJcblxyXG4gICAgdGhpcy5ib3hab29tLnN0YXJ0ID0ge1xyXG4gICAgICAgIHg6IGUuY2xpZW50WCxcclxuICAgICAgICB5OiBlLmNsaWVudFksXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMucGFnZUhhc0ZvY3VzID0gdHJ1ZTtcclxuXHJcbiAgICAvLyBUT0RPOiBDaGFuZ2UgbmFtZSBvZiBtb3VzZSBtb3ZlIGFuZCBtb3VzZSB1cCBldmVudGxpc3RlbmVycy5cclxuICAgIHRoaXMuYm94Wm9vbS5tdiA9IGUgPT4gdGhpcy5ib3hab29tX21vdXNlTW92ZShlKTtcclxuICAgIHRoaXMuYm94Wm9vbS5tdXAgPSBlID0+IHRoaXMuYm94Wm9vbV9tb3VzZVVwKGUpO1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuYm94Wm9vbS5tdik7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3hab29tLm11cCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJveFpvb21fbW91c2VNb3ZlKGUpIHtcclxuICAgIGlmIChlLmNsaWVudFggPiB0aGlzLmJveFpvb20uc3RhcnQueCkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5sZWZ0ID1cclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0YXJ0LnggLSB0aGlzLmJveFpvb20ub2Zmc2V0LnggKyAncHgnO1xyXG4gICAgICAgIGlmIChlLmNsaWVudFkgPiB0aGlzLmJveFpvb20uc3RhcnQueSkge1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID1cclxuICAgICAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdGFydC55IC0gdGhpcy5ib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoID0gZS5jbGllbnRYIC0gdGhpcy5ib3hab29tLnN0YXJ0LnggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0ID0gZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLnN0YXJ0LnkgKyAncHgnO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPSBlLmNsaWVudFkgLSB0aGlzLmJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGggPSBlLmNsaWVudFggLSB0aGlzLmJveFpvb20uc3RhcnQueCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQgPSB0aGlzLmJveFpvb20uc3RhcnQueSAtIGUuY2xpZW50WSArICdweCc7XHJcbiAgICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICh0aGlzLmJveFpvb20uc3RhcnQueCA+IGUuY2xpZW50WCkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5sZWZ0ID0gZS5jbGllbnRYIC0gdGhpcy5ib3hab29tLm9mZnNldC54ICsgJ3B4JztcclxuICAgICAgICBpZiAoZS5jbGllbnRZID4gdGhpcy5ib3hab29tLnN0YXJ0LnkpIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveFpvb20uc3RhcnQueSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IHRoaXMuYm94Wm9vbS5zdGFydC54IC0gZS5jbGllbnRYICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5zdGFydC55ICsgJ3B4JztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID0gZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoID0gdGhpcy5ib3hab29tLnN0YXJ0LnggLSBlLmNsaWVudFggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0ID0gdGhpcy5ib3hab29tLnN0YXJ0LnkgLSBlLmNsaWVudFkgKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlcl9tb3VzZU1vdmUoXHJcbiAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCxcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGgsXHJcbiAgICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tX21vdXNlVXAoZSkge1xyXG4gICAgdmFyIHdpZHRoID0gTWF0aC5hYnMoZS5jbGllbnRYIC0gdGhpcy5ib3hab29tLnN0YXJ0LngpO1xyXG4gICAgdmFyIGhlaWdodCA9IE1hdGguYWJzKGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5zdGFydC55KTtcclxuICAgIHZhciB4ID0gZS5jbGllbnRYID4gdGhpcy5ib3hab29tLnN0YXJ0LnggPyBlLmNsaWVudFggOiBib3hab29tLnN0YXJ0Lng7XHJcbiAgICB2YXIgeSA9IGUuY2xpZW50WSA+IHRoaXMuYm94Wm9vbS5zdGFydC55ID8gZS5jbGllbnRZIDogYm94Wm9vbS5zdGFydC55O1xyXG4gICAgdmFyIGNlbnRlciA9IHRoaXMuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyKFxyXG4gICAgICAgIHRoaXMudG9Qb2ludCh4IC0gd2lkdGggLyAyLCB5IC0gaGVpZ2h0IC8gMiksXHJcbiAgICApO1xyXG5cclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMuYm94Wm9vbS5tdik7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5ib3hab29tLm11cCk7XHJcblxyXG4gICAgdGhpcy5ib3hab29tLnN0eWxlW3RoaXMuQ1NTX1RSQU5TSVRJT05dID0gJ29wYWNpdHkgMC4xNXMgZWFzZS1pbi1vdXQnO1xyXG4gICAgdGhpcy5ib3hab29tLnN0eWxlLm9wYWNpdHkgPSAwO1xyXG5cclxuICAgIHRoaXMucGFubmluZ19tb2R1bGUuZW5hYmxlUGFubmluZygpO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGJveFpvb20pO1xyXG5cclxuICAgIGlmIChcclxuICAgICAgICBlLmNsaWVudFggPT09IHRoaXMuYm94Wm9vbS5zdGFydC5jbGllbnRYICYmXHJcbiAgICAgICAgZS5jbGllbnRZID09PSB0aGlzLmJveFpvb20uc3RhcnQuY2xpZW50WVxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy5ib3hab29tID0gbnVsbDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ib3hab29tID0gbnVsbDtcclxuXHJcbiAgICB0aGlzLmJveFpvb21fZG9ab29tKHtcclxuICAgICAgICBoZWlnaHQsXHJcbiAgICAgICAgd2lkdGgsXHJcbiAgICAgICAgY2VudGVyLFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJveFpvb21fZG9ab29tKG9iaikge1xyXG4gICAgbGV0IHByb2plY3RlZENlbnRlciA9IHRoaXMuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ob2JqLmNlbnRlcik7XHJcbiAgICBsZXQgaGVpZ2h0ID0gbnVsbDtcclxuICAgIGxldCB3aWR0aCA9IG51bGw7XHJcbiAgICBsZXQgbXVsdGlwbGllciA9IG51bGw7XHJcblxyXG4gICAgZm9yIChsZXQgaCA9IDA7IGggPCA1MCAvKnByZXZlbnQgZW5kbGVzcyBsb29wKi87IGgrKykge1xyXG4gICAgICAgIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBoKTtcclxuICAgICAgICB3aWR0aCA9IG9iai53aWR0aCAqIG11bHRpcGxpZXI7XHJcbiAgICAgICAgaGVpZ2h0ID0gb2JqLmhlaWdodCAqIG11bHRpcGxpZXI7XHJcblxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICAgaGVpZ2h0ID4gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0IHx8XHJcbiAgICAgICAgICAgIHdpZHRoID4gdGhpcy5tYXBDb250YWluZXIud2lkdGhcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgaCAtPSAxO1xyXG4gICAgICAgICAgICB0aGlzLnpvb21Ubyhwcm9qZWN0ZWRDZW50ZXIsIHRoaXMuem9vbSArIGgpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJveFpvb21DZW50ZXJfbW91c2VNb3ZlKGhlaWdodCwgd2lkdGgpIHtcclxuICAgIGhlaWdodCA9IGhlaWdodC5yZXBsYWNlKCdweCcsICcnKTtcclxuICAgIHdpZHRoID0gd2lkdGgucmVwbGFjZSgncHgnLCAnJyk7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuc3R5bGUudHJhbnNmb3JtID1cclxuICAgICAgICAndHJhbnNsYXRlKCcgKyAod2lkdGggLyAyIC0gMykgKyAncHgsICcgKyAoaGVpZ2h0IC8gMiAtIDMpICsgJ3B4KSc7XHJcbn1cclxuIl0sIm5hbWVzIjpbInV0aWxzLkNTU19UUkFOU0lUSU9OIiwidXRpbHMuQ1NTX1RSQU5TRk9STSIsInV0aWxzLk1PVVNFX1dIRUVMX0VWVCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7SUFBTyxNQUFNLGdCQUFnQixDQUFDO0lBQzlCLElBQUksV0FBVyxHQUFHO0lBQ2xCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDNUIsS0FBSzs7SUFFTCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtJQUNqQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRTtJQUNwRCxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3hDLFNBQVM7O0lBRVQsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxD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QyxDQUFDOztJQUU1RixRQUFRLE9BQU8sTUFBTSxDQUFDOztJQUV0QjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxLQUFLOztJQUVMLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRTtJQUN2QjtJQUNBLFFBQVEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVELEtBQUs7O0lBRUwsSUFBSSwwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ3JDLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ2xELFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7SUFFdEMsUUFBUSxJQUFJLE1BQU0sR0FBRztJQUNyQixZQUFZLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdFLFlBQVksR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0UsWUFBWSxHQUFHLEVBQUUsU0FBUztJQUMxQixZQUFZLEdBQUcsRUFBRSxTQUFTO0lBQzFCLFNBQVMsQ0FBQzs7SUFFVixRQUFRLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLFFBQVEsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMs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
