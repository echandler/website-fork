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
            //        this.zoom = 0;

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

            if (this.init.initArr) {

                let A = this.init.initArr;

                for (let n = 0; n < A.length; n++) {
                    // Call additional functions an extension
                    // might have added.
                    A[n].fn.call(A[n].ctx || this);
                }
            }
        }

        static onInitDone(fn, ctx) {
            // Testing an idea about how to extend the init function.
            let A = this.prototype.init.initarr;
            if (!A) {
                A = this.prototype.init.initArr = [];
            }
            A.push({fn, ctx});
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

    NewMap.onInitDone(function(){
        // Testing an idea about how to exend the init function.
        this.zoom = 0;
    });

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNFdmVudFN5c3RlbV9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS91dGlscy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9wYW5uaW5nX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9NYWluX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL1pvb21fY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9BcmNSZW5kZXJMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9BcmNYTUxMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9CYXNlVGlsZUxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0FyY0dJU1RpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9TcGhlcmljYWxNZXJjYXRvclRpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9jb29yZGluYXRlX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9tYXJrZXJfbW9kdWxlLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2JveFpvb21fbW9kdWxlLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgb24ocF90eXBlLCBwX2Z1bmMsIG9wdF90aGlzKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0gPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0ucHVzaCh7IGZuOiBwX2Z1bmMsIF90aGlzOiBvcHRfdGhpcyB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgb2ZmKHBfdHlwZSwgcF9mdW5jLCBvcHRfdGhpcykge1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzT2JqLmhhc093blByb3BlcnR5KHBfdHlwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgZXZ0QXJyYXkgPSB0aGlzLmV2ZW50c09ialtwX3R5cGVdO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IGV2dEFycmF5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGlmIChldnRBcnJheVtuXS5mbiA9PT0gcF9mdW5jICYmIGV2dEFycmF5W25dLl90aGlzID09PSBvcHRfdGhpcykge1xyXG4gICAgICAgICAgICAgICAgZXZ0QXJyYXlbbl0uZm4gPSB0aGlzLl96b21iaWVGbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbGVhbihwX3R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIF96b21iaWVGbigpIHtcclxuICAgICAgICByZXR1cm4gXCJab21iaWUgY2FsbGJhY2sgd29ya3MgcmVhbCBoYXJkLlwiO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFuKHBfdHlwZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl9kZWxab21iaWVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RlbFpvbWJpZXMocF90eXBlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRoaXMuY2xlYW4uYmluZCh0aGlzLCBwX3R5cGUpLCAxMDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2RlbFpvbWJpZXMocF90eXBlKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdGhpcy5ldmVudHNPYmpbcF90eXBlXS5sZW5ndGg7IG4rKykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ldmVudHNPYmpbcF90eXBlXVtuXS5mbiA9PT0gdGhpcy5fem9tYmllRm4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0uc3BsaWNlKG4sIDEpO1xyXG4gICAgICAgICAgICAgICAgLS1uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFsbE9mZihwX3RoaXMpIHtcclxuICAgICAgICB2YXIgZXZ0T2JqID0gdGhpcy5ldmVudHNPYmo7XHJcbiAgICAgICAgdmFyIHR5cGVzID0gT2JqZWN0LmtleXMoZXZ0T2JqKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgbSA9IDA7IG0gPCB0eXBlcy5sZW5ndGg7IG0rKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBuID0gZXZ0T2JqW3R5cGVzW21dXS5sZW5ndGggLSAxOyBuID49IDA7IG4tLSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2dE9ialt0eXBlc1ttXV1bbl0uX3RoaXMgPT09IHBfdGhpcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2dE9ialt0eXBlc1ttXV1bbl0uZm4gPSB0aGlzLl96b21iaWVGbjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFuKHR5cGVzW21dKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmaXJlKHBfdHlwZSwgb3B0X2V2dCkge1xyXG4gICAgICAgIGlmICghdGhpcy5ldmVudHNPYmouaGFzT3duUHJvcGVydHkocF90eXBlKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgZXZ0QXJyYXkgPSB0aGlzLmV2ZW50c09ialtwX3R5cGVdO1xyXG4gICAgICAgIGxldCBwb2ludGVyVG9fZGVsWm9tYmllcyA9IHRoaXMuX2RlbFpvbWJpZXM7XHJcbiAgICAgICAgdGhpcy5fZGVsWm9tYmllcyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGV2dEFycmF5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGV2dEFycmF5W25dLmZuLmNhbGwoZXZ0QXJyYXlbbl0uX3RoaXMsIG9wdF9ldnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZGVsWm9tYmllcyA9IHBvaW50ZXJUb19kZWxab21iaWVzO1xyXG4gICAgfVxyXG59XHJcbiIsImV4cG9ydCBmdW5jdGlvbiBzaW1wbGVNZXNzYWdlQm94KGFyZ19pbm5lckhUTUwsIGFyZ19pZCwgYXJnX3dpZHRoKSB7XHJcbiAgICB2YXIgbWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG5cclxuICAgIG1lc3NhZ2UuY2xhc3NOYW1lID0gJ3NpbXBsZU1lc3NhZ2VCb3gnO1xyXG5cclxuICAgIG1lc3NhZ2Uuc3R5bGUud2lkdGggPSAoYXJnX3dpZHRoICYmIGFyZ193aWR0aCArICdweCcpIHx8ICczMDBweCc7XHJcbiAgICBtZXNzYWdlLnN0eWxlLmxlZnQgPVxyXG4gICAgICAgIHdpbmRvdy5pbm5lcldpZHRoIC8gMiAtICgoYXJnX3dpZHRoICYmIGFyZ193aWR0aCAvIDIpIHx8IDE1MCkgKyAncHgnO1xyXG5cclxuICAgIG1lc3NhZ2UuaWQgPSBhcmdfaWQgfHwgJ3NpbXBsZV9tZXNzYWdlX2JveCc7XHJcblxyXG4gICAgbWVzc2FnZS5pbm5lckhUTUwgPSBhcmdfaW5uZXJIVE1MO1xyXG5cclxuICAgIG1lc3NhZ2Uub25jbGljayA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgIH07XHJcblxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChtZXNzYWdlKTtcclxuXHJcbiAgICByZXR1cm4gbWVzc2FnZTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRlc3RQcm9wKHByb3BzKSB7XHJcbiAgICAvLyBHb3QgdGhpcyBmcm9tIGxlYWZsZXRcclxuICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHByb3BzW2ldIGluIHN0eWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wc1tpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5leHBvcnQgbGV0IENTU19UUkFOU0ZPUk0gPSB0ZXN0UHJvcChbXHJcbiAgICAndHJhbnNmb3JtJyxcclxuICAgICdXZWJraXRUcmFuc2Zvcm0nLFxyXG4gICAgJ09UcmFuc2Zvcm0nLFxyXG4gICAgJ01velRyYW5zZm9ybScsXHJcbiAgICAnbXNUcmFuc2Zvcm0nLFxyXG5dKTtcclxuZXhwb3J0IGxldCBDU1NfVFJBTlNJVElPTiA9IHRlc3RQcm9wKFtcclxuICAgICd0cmFuc2l0aW9uJyxcclxuICAgICdXZWJraXRUcmFuc2l0aW9uJyxcclxuICAgICdPVHJhbnNpdGlvbicsXHJcbiAgICAnTW96VHJhbnNpdGlvbicsXHJcbiAgICAnbXNUcmFuc2l0aW9uJyxcclxuXSk7XHJcblxyXG4vL2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbCNCcm93c2VyX2NvbXBhdGliaWxpdHlcclxuZXhwb3J0IGxldCBNT1VTRV9XSEVFTF9FVlQgPVxyXG4gICAgJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICA/ICd3aGVlbCcgLy8gTW9kZXJuIGJyb3dzZXJzIHN1cHBvcnQgXCJ3aGVlbFwiXHJcbiAgICA6IGRvY3VtZW50Lm9ubW91c2V3aGVlbCAhPT0gdW5kZWZpbmVkXHJcbiAgICA/ICdtb3VzZXdoZWVsJyAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcclxuICAgIDogJ0RPTU1vdXNlU2Nyb2xsJzsgLy8gbGV0J3MgYXNzdW1lIHRoYXQgcmVtYWluaW5nIGJyb3dzZXJzIGFyZSBvbGRlciBGaXJlZm94XHJcblxyXG5cclxuXHJcblxyXG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYW5uaW5nX21vZHVsZSh0aGlzTWFwKSB7XHJcbiAgICBsZXQgdHJhbnNpdGlvblJlc2V0VGltZW91dCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzTWFwLnBhbiA9IHtcclxuICAgICAgICBtYWluQ29udGFpbmVyWFk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWDogbnVsbCxcclxuICAgICAgICBtb3VzZURvd25YT2Zmc2V0OiBudWxsLFxyXG4gICAgICAgIG1vdXNlRG93blk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWU9mZnNldDogbnVsbCxcclxuICAgICAgICBwYW5uaW5nRnVuY3Rpb246IG1hcERyYWdBbmRBbmltYXRpb24sXHJcbiAgICAgICAgcG9pbnRzOiBudWxsLFxyXG4gICAgICAgIHNwQ29vcmRzOiBudWxsLFxyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBtb3VzZURvd24oZSkge1xyXG4gICAgICAgIC8vIERvIHNvbWV0aGluZyBoZXJlP1xyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlRG93bihlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX3Bhbm5pbmdNb3VzZURvd24oZSkge1xyXG4gICAgICAgIGxldCBldnQgPSBlLl9fZXZlbnRfXztcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHBhbi5tb3VzZURvd25YID0gZXZ0LmNsaWVudFg7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93blkgPSBldnQuY2xpZW50WTtcclxuICAgICAgICBwYW4ubW91c2VEb3duWE9mZnNldCA9IGV2dC5jbGllbnRYIC0gdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93bllPZmZzZXQgPSBldnQuY2xpZW50WSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3A7XHJcblxyXG4gICAgICAgIHBhbi5wb2ludHMgPSBbXTsgLy8gVE9ETzogdGVzdGluZ1xyXG5cclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uKCk7XHJcblxyXG4gICAgICAgIHBhbi5tYWluQ29udGFpbmVyWFkgPSB7XHJcbiAgICAgICAgICAgIHg6IHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHBhbi5zcENvb3JkcyA9IHtcclxuICAgICAgICAgICAgeDogdGhpc01hcC5leHRlbnQudmlzaWJsZS54LFxyXG4gICAgICAgICAgICBYOiB0aGlzTWFwLmV4dGVudC52aXNpYmxlLlgsXHJcbiAgICAgICAgICAgIHk6IHRoaXNNYXAuZXh0ZW50LnZpc2libGUueSxcclxuICAgICAgICAgICAgWTogdGhpc01hcC5leHRlbnQudmlzaWJsZS5ZLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW91dCcsXHJcbiAgICAgICAgICAgIHByaXZhdGVfcmVtb3ZlUGFubmluZ0V2ZW50TGlzdGVuZXJzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbWFwSW5pdGlhbERyYWdUYXNrcyk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpc01hcC5wYW4ucGFubmluZ0Z1bmN0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX21hcE1vdXNlVXAoZSkge1xyXG4gICAgICAgIC8vIG1vdXNlIHVwIGZvciB0aGUgaW1hZ2VcclxuICAgICAgICBpZiAoZS5yZWxhdGVkVGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSk7XHJcblxyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlVXAoZSk7XHJcbiAgICAgICAgLy90aGlzTWFwLmV2ZW50LmZpcmUoXCJtYXAgbW91c2UgdXBcIiwgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9wYW5uaW5nTW91c2VVcChlKSB7XHJcbiAgICAgICAgbGV0IGV2dCA9IGUuX19ldmVudF9fIHx8IGU7XHJcbiAgICAgICAgbGV0IHBhbiA9IHRoaXNNYXAucGFuO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGV2dC5jbGllbnRZIC0gcGFuLm1vdXNlRG93blkgIT09IDAgfHxcclxuICAgICAgICAgICAgZXZ0LmNsaWVudFggLSBwYW4ubW91c2VEb3duWCAhPT0gMFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzTWFwLnBhbm5pbmdfbW9kdWxlLnBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbihldnQpO1xyXG5cclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCAtIHBhbi5tYWluQ29udGFpbmVyWFkueCxcclxuICAgICAgICAgICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgLSBwYW4ubWFpbkNvbnRhaW5lclhZLnksXHJcbiAgICAgICAgICAgICAgICBwYW4uc3BDb29yZHNcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5zdGF0ZS5wYW5uaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSkge1xyXG4gICAgICAgIGlmIChlLnJlbGF0ZWRUYXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgcHJpdmF0ZV9tYXBNb3VzZVVwKTtcclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXNNYXAucGFuLnBhbm5pbmdGdW5jdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWFwSW5pdGlhbERyYWdUYXNrcyhlKSB7XHJcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBhbmQgaW1tZWRpYXRlbHkgcmVtb3ZlZCBqdXN0IHRvIG1ha2UgdGhlXHJcbiAgICAgICAgLy8gcGFubmluZyBmZWVsIHNtb290aGVyLlxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICAgZS5jbGllbnRZIC0gdGhpc01hcC5wYW4ubW91c2VEb3duWSA9PT0gMCAmJlxyXG4gICAgICAgICAgICBlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YID09PSAwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIEEgYnVnIGluIGNocm9tZSB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBpZiBhIG1vdXNlZG93biBldmVudCBoYXBwZW5zLlxyXG4gICAgICAgICAgICAvLyBCdWcgaGFzbid0IGJlZW4gZml4ZWQgaW4gYXRsZWFzdCBjaHJvbWUgdmVyc2lvbiA1MS4wLjI3MDQuMTAzXHJcbiAgICAgICAgICAgIC8vIGFuZCBlYXJsaWVyLlxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gJyc7XHJcblxyXG4gICAgICAgIC8vIEVuZCBhbnkgem9vbWluZyBhY3Rpdml0eVxyXG4gICAgICAgIC8vdGhpc01hcC5ab29tX2NsYXNzLnpvb21TdG9wKCk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuc3RhdGUucGFubmluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGluaXRpYWwnLCBlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXBEcmFnT25seShlKSB7XHJcbiAgICAgICAgbGV0IG1haW5Db250ID0gdGhpc01hcC5tYWluQ29udGFpbmVyO1xyXG4gICAgICAgIGxldCB4ID0gbWFpbkNvbnQubGVmdCArIChlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YKTtcclxuICAgICAgICBsZXQgeSA9IG1haW5Db250LnRvcCArIChlLmNsaWVudFkgLSB0aGlzTWFwLnBhbi5tb3VzZURvd25ZKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cmFuc2xhdGUoXCIrIHggK1wicHgsIFwiKyB5ICtcInB4KVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1hcERyYWdBbmRBbmltYXRpb24oZSkge1xyXG4gICAgICAgIGxldCBtYWluQ29udCA9IHRoaXNNYXAubWFpbkNvbnRhaW5lcjtcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGxldCBkaXN0YW5jZVggPSBwYW4ubWFpbkNvbnRhaW5lclhZLnggKyBlLmNsaWVudFggLSBwYW4ubW91c2VEb3duWCxcclxuICAgICAgICAgICAgZGlzdGFuY2VZID0gcGFuLm1haW5Db250YWluZXJYWS55ICsgZS5jbGllbnRZIC0gcGFuLm1vdXNlRG93blk7XHJcblxyXG4gICAgICAgIG1haW5Db250LnRvcCA9IGRpc3RhbmNlWTtcclxuICAgICAgICBtYWluQ29udC5sZWZ0ID0gZGlzdGFuY2VYO1xyXG5cclxuICAgICAgICB0aGlzTWFwLnBhbi5wb2ludHMucHVzaCh7XHJcbiAgICAgICAgICAgIHg6IGRpc3RhbmNlWCxcclxuICAgICAgICAgICAgeTogZGlzdGFuY2VZLFxyXG4gICAgICAgICAgICB0aW1lOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgXCJ0cmFuc2xhdGUzZChcIisgZGlzdGFuY2VYICtcInB4LCBcIisgZGlzdGFuY2VZICtcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuJywgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFuVG8oc3BQb2ludCwgcGFuVGltZSkge1xyXG4gICAgICAgIGxldCBweGxQb2ludCA9IHRoaXNNYXAuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyLmJpbmQodGhpc01hcCk7XHJcbiAgICAgICAgbGV0IGNvbnZlcnRTcFRvUHhsID0gdGhpc01hcC5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpc01hcCk7XHJcblxyXG4gICAgICAgIGxldCBjZW50ZXJQeGxzID0gcHhsUG9pbnQoe1xyXG4gICAgICAgICAgICB4OiB0aGlzTWFwLm1hcENvbnRhaW5lci5sZWZ0ICsgdGhpc01hcC5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1hcENvbnRhaW5lci50b3AgKyB0aGlzTWFwLm1hcENvbnRhaW5lci5oZWlnaHQgLyAyLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGxldCBwb2ludE9mSW50ZXJlc3RQeGwgPSBjb252ZXJ0U3BUb1B4bChzcFBvaW50KTtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSB7XHJcbiAgICAgICAgICAgIHg6IGNlbnRlclB4bHMueCAtIHBvaW50T2ZJbnRlcmVzdFB4bC54LFxyXG4gICAgICAgICAgICB5OiBjZW50ZXJQeGxzLnkgLSBwb2ludE9mSW50ZXJlc3RQeGwueSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwYW5CeVBpeGVscyhkaXN0YW5jZSwgcGFuVGltZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzTWFwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhbkJ5UGl4ZWxzKHNwUG9pbnQsIHBhblRpbWUpIHtcclxuICAgICAgICBsZXQgbWFpbkNvbnQgPSB0aGlzTWFwLm1haW5Db250YWluZXI7XHJcbiAgICAgICAgbGV0IHZlY3RvckxlbiA9IE1hdGguc3FydChcclxuICAgICAgICAgICAgc3BQb2ludC54ICogc3BQb2ludC54ICsgc3BQb2ludC55ICogc3BQb2ludC55LFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFBsYXllZCBhcm91bmQgd2l0aCB0aGlzIG9uIGEgZ3JhcGhpbmcgd2Vic2l0ZSwgbWlnaHQgd2FudCB0byByZXZpc2l0IGluIHRoZSBmdXR1cmUuXHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KFxyXG4gICAgICAgICAgICAyMDAsXHJcbiAgICAgICAgICAgIHZlY3RvckxlbiAqICg1MDAgKiAoMC40NSAvIHZlY3RvckxlbiAqKiAwLjkpICsgMC4wNiksXHJcbiAgICAgICAgKTtcclxuICAgICAgICBsZXQgdGltZSA9IHBhblRpbWUgfHwgTWF0aC5taW4oMTAwMCwgbWF4KTtcclxuXHJcbiAgICAgICAgbWFpbkNvbnQubGVmdCArPSBNYXRoLnJvdW5kKHNwUG9pbnQueCk7XHJcbiAgICAgICAgbWFpbkNvbnQudG9wICs9IE1hdGgucm91bmQoc3BQb2ludC55KTtcclxuXHJcbiAgICAgICAgdGhpc01hcC51cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZShzcFBvaW50LngsIHNwUG9pbnQueSk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQmxvY2sgZm9yIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9XHJcbiAgICAgICAgICAgICAgICBcImFsbCBcIiArIHRpbWUgKyBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjI1LCAxKVwiO1xyXG5cclxuICAgICAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICBcInRyYW5zbGF0ZTNkKFwiICsgbWFpbkNvbnQubGVmdCArIFwicHgsXCIgKyBtYWluQ29udC50b3AgKyBcInB4LDBweClcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9IG51bGw7XHJcbiAgICAgICAgfSwgdGltZSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcsIHtwYW5FbmRUaW1lOiB0aW1lfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICBsZXQgdHJhbnNpc3Rpb25EdXJhdGlvbk1TID0gMjIwMDtcclxuXHJcbiAgICAgICAgbGV0IHBvaW50cyA9IHRoaXNNYXAucGFuLnBvaW50cztcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBwb2ludHMubGVuZ3RoIDwgMyB8fFxyXG4gICAgICAgICAgICBEYXRlLm5vdygpIC0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXS50aW1lID4gMTUwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFydFBvaW50ID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgb2Zmc2V0UG9pbnQgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAtIDNdO1xyXG5cclxuICAgICAgICBsZXQgZGVsdGFBID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAyXSxcclxuICAgICAgICAgICAgZGVsdGFCID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAzXSxcclxuICAgICAgICAgICAgZGVsdGFYID0gZGVsdGFBLnggLSBkZWx0YUIueCxcclxuICAgICAgICAgICAgZGVsdGFZID0gZGVsdGFBLnkgLSBkZWx0YUIueSxcclxuICAgICAgICAgICAgYW5nbGUgPSBNYXRoLmF0YW4yKGRlbHRhWSwgZGVsdGFYKTtcclxuXHJcbiAgICAgICAgbGV0IHBMZW4gPSBwb2ludHMubGVuZ3RoO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCB0aW1lID0gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgIChwb2ludHNbcExlbi0xXS50aW1lIC0gcG9pbnRzW3BMZW4tMl0udGltZSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICsgKHBvaW50c1twTGVuLTJdLnRpbWUgLSBwb2ludHNbcExlbi0zXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgICAgKSAvIDI7XHJcblxyXG4gICAgICAgIGxldCBvZmZzZXRYID0gc3RhcnRQb2ludC54IC0gb2Zmc2V0UG9pbnQueCxcclxuICAgICAgICAgICAgb2Zmc2V0WSA9IHN0YXJ0UG9pbnQueSAtIG9mZnNldFBvaW50Lnk7XHJcblxyXG4gICAgICAgIGxldCBkaXN0ID0gTWF0aC5zcXJ0KG9mZnNldFggKiBvZmZzZXRYICsgb2Zmc2V0WSAqIG9mZnNldFkpO1xyXG4gICAgICAgIGxldCBzcGVlZCA9IGRpc3QgLyB0aW1lO1xyXG5cclxuICAgICAgICBpZiAoZGlzdCA8PSAyIHx8IHRpbWUgPT09IDApIHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgZGlzdGFuY2UgbmVlZGVkIHRvIHRyYXZlbC5cclxuICAgICAgICAvLyBncmFwaCAtPiBodHRwczovL3d3dy5kZXNtb3MuY29tL2NhbGN1bGF0b3Ivd29wcWRicnU0eVxyXG4gICAgICAgIGxldCBkYW1wZW4gPVxyXG4gICAgICAgICAgICBNYXRoLnNxcnQoTWF0aC5sb2cxMChNYXRoLmxvZzEwKHNwZWVkICoqIDMgKyAxKSAqKiAxNSArIDEpKSAqKlxyXG4gICAgICAgICAgICAgICAgMC4wNyAvXHJcbiAgICAgICAgICAgIDQ7XHJcblxyXG4gICAgICAgIGxldCB2ZWN0b3JMZW5ndGggPSBzcGVlZCAqKiAxLjA5ICogNDAwICogZGFtcGVuO1xyXG4gICAgICAgIC8vc3BlZWQqKjAuNiAqICg0MCAqIE1hdGguc3FydChzcGVlZCoqMS42KSk7XHJcbiAgICAgICAgLy9zcGVlZCAqICgyMCAqIE1hdGguc3FydChzcGVlZCkpO1xyXG4gICAgICAgIC8vc3BlZWQgKiAxNTAgLSA2MDsgLy8gRm91bmQgdGhpcyBtYWdpYyBudW1iZXIgdGhyb3VnaCB0cmlhbCBhbmQgZXJyb3IuXHJcblxyXG4gICAgICAgIHRyYW5zaXN0aW9uRHVyYXRpb25NUyAqPSBkYW1wZW47XHJcblxyXG4gICAgICAgIC8vIE5ldyB2ZWN0b3IuXHJcbiAgICAgICAgbGV0IHZlY3RvciA9IHtcclxuICAgICAgICAgICAgcmlzZTogdmVjdG9yTGVuZ3RoICogTWF0aC5zaW4oYW5nbGUpLFxyXG4gICAgICAgICAgICBydW46IHZlY3Rvckxlbmd0aCAqIE1hdGguY29zKGFuZ2xlKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGZpbmFsIHggYW5kIHkgcG9zaXRpb25zIGZvciB0aGUgYW5pbWF0aW9uLlxyXG4gICAgICAgIC8vIFJvdW5kaW5nIHRoZSBjb29yZGluYXRlcyBzbyB0aGF0IHRoZSB0ZXh0IG9uIHRoZSBtYXJrZXJzIGluIGNocm9tZSBpcyBub3QgYmx1cnJ5LlxyXG4gICAgICAgIGxldCBmaW5pc2hQb2ludCA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5yb3VuZCh2ZWN0b3IucnVuICsgc3RhcnRQb2ludC54KSxcclxuICAgICAgICAgICAgeTogTWF0aC5yb3VuZCh2ZWN0b3IucmlzZSArIHN0YXJ0UG9pbnQueSksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQgPSBmaW5pc2hQb2ludC54O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSBmaW5pc2hQb2ludC55O1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIuZWxlbWVudFxyXG4gICAgICAgICAgICAuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gXCJ0cmFuc2Zvcm0gXCIgKyB0cmFuc2lzdGlvbkR1cmF0aW9uTVMgK1xyXG4gICAgICAgICAgICBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjMsIDEpXCI7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50XHJcbiAgICAgICAgICAgIC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlM2QoXCIgKyBmaW5pc2hQb2ludC54ICsgXCJweCxcIiArXHJcbiAgICAgICAgICAgIGZpbmlzaFBvaW50LnkgKyBcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIC8vIFJlc2V0IHRyYW5zaXRpb24uXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG5cclxuICAgICAgICB0cmFuc2l0aW9uUmVzZXRUaW1lb3V0ID0gc2V0VGltZW91dChcclxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNJVElPTl0gPSAnJztcclxuICAgICAgICAgICAgfS5iaW5kKHRoaXNNYXApLFxyXG4gICAgICAgICAgICB0cmFuc2lzdGlvbkR1cmF0aW9uTVMsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wUGFuQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBsZXQgcG9zT25CZXppZXJDdXJ2ZSA9IGRvY3VtZW50LmRlZmF1bHRWaWV3XHJcbiAgICAgICAgICAgIC5nZXRDb21wdXRlZFN0eWxlKHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50KVxyXG4gICAgICAgICAgICAudHJhbnNmb3JtLm1hdGNoKC8oLT9cXGQqLj9cXGQqKSwgKC0/XFxkKi4/XFxkKilcXCkkLyk7XHJcblxyXG4gICAgICAgIGlmICghcG9zT25CZXppZXJDdXJ2ZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeCA9IE1hdGgucm91bmQocG9zT25CZXppZXJDdXJ2ZVsxXSksIC8vTWF0aC5yb3VuZChwYW4uYW5pbS5zdGFydFBvaW50LnggLSAoKHBhbi5hbmltLnN0YXJ0UG9pbnQueCAtIHBhbi5hbmltLmVuZFBvaW50LngpICogcG9zT25CZXppZXJDdXJ2ZSkpLFxyXG4gICAgICAgICAgICB5ID0gTWF0aC5yb3VuZChwb3NPbkJlemllckN1cnZlWzJdKTsgLy9NYXRoLnJvdW5kKHBhbi5hbmltLnN0YXJ0UG9pbnQueSAtICgocGFuLmFuaW0uc3RhcnRQb2ludC55IC0gcGFuLmFuaW0uZW5kUG9pbnQueSkgKiBwb3NPbkJlemllckN1cnZlKSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgIHggLSB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCxcclxuICAgICAgICAgICAgeSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KSc7XHJcblxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSB5O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0ID0geDtcclxuXHJcbiAgICAgICAgdGhpc01hcC5ldmVudC5maXJlKCdzdG9wUGFuQW5pbWF0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZW5hYmxlUGFubmluZygpIHtcclxuICAgICAgICB0aGlzTWFwLmV2ZW50Lm9uKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRpc2FibGVQYW5uaW5nKCkge1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQub2ZmKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcGFuVG86IHBhblRvLFxyXG4gICAgICAgIHBhbkJ5UGl4ZWxzOiBwYW5CeVBpeGVscyxcclxuICAgICAgICBlbmFibGVQYW5uaW5nOiBlbmFibGVQYW5uaW5nLFxyXG4gICAgICAgIGRpc2FibGVQYW5uaW5nOiBkaXNhYmxlUGFubmluZyxcclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uOiBzdG9wUGFuQW5pbWF0aW9uLFxyXG4gICAgICAgIG1hcERyYWdPbmx5OiBtYXBEcmFnT25seSxcclxuICAgICAgICBtYXBEcmFnQW5kQW5pbWF0aW9uOiBtYXBEcmFnQW5kQW5pbWF0aW9uLFxyXG4gICAgICAgIHBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbjogcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uLFxyXG4gICAgfTtcclxufVxyXG4iLCJpbXBvcnQge0Jhc2ljRXZlbnRTeXN0ZW19IGZyb20gJy4vQmFzaWNFdmVudFN5c3RlbV9jbGFzcyc7XHJcbmltcG9ydCB7cGFubmluZ19tb2R1bGV9IGZyb20gJy4vcGFubmluZ19tb2R1bGUnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOZXdNYXAgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKHNwUG9pbnQsIHBfem9vbSwgcGFyYW1ldGVycykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgICAgICB0aGlzLmluaXQoc3BQb2ludCwgcF96b29tKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KHNwUG9pbnQsIHBfem9vbSkge1xyXG4gICAgICAgIC8vICAgICAgICB0aGlzLnpvb20gPSAwO1xyXG5cclxuICAgICAgICBsZXQgcGFyYW1zID0gdGhpcy5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICB0aGlzLnpvb21JbmRleCA9IHBhcmFtcy56b29tSW5kZXg7XHJcbiAgICAgICAgdGhpcy5tYXhab29tID1cclxuICAgICAgICAgICAgcGFyYW1zLm1heFpvb20gfHwgKHRoaXMuem9vbUluZGV4ICYmIHRoaXMuem9vbUluZGV4Lmxlbmd0aCkgfHwgMjQ7XHJcbiAgICAgICAgdGhpcy5taW5ab29tID0gcGFyYW1zLm1pblpvb20gfHwgMDtcclxuICAgICAgICB0aGlzLnpvb21EZWx0YSA9IHBhcmFtcy56b29tRGVsdGEgfHwgMTtcclxuXHJcbiAgICAgICAgdGhpcy5NT1VTRV9XSEVFTF9FVlQgPSB1dGlscy5NT1VTRV9XSEVFTF9FVlQ7XHJcbiAgICAgICAgdGhpcy5DU1NfVFJBTlNGT1JNID0gdXRpbHMuQ1NTX1RSQU5TRk9STTtcclxuICAgICAgICB0aGlzLkNTU19UUkFOU0lUSU9OID0gdXRpbHMuQ1NTX1RSQU5TSVRJT047XHJcblxyXG4gICAgICAgIHRoaXMubWFrZUNvbnRhaW5lcnMoKTtcclxuICAgICAgICB0aGlzLmxvYWRNb2R1bGVzKCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVFdmVudExpc3RlbmVycygpO1xyXG5cclxuICAgICAgICB0aGlzLmV4dGVudCA9IHtcclxuICAgICAgICAgICAgdmlzaWJsZToge30sXHJcbiAgICAgICAgICAgIGZ1bGw6IHt9LCAvLyBUT0RPOiBDdXJyZW50bHkgbm90IHVzZWQgYnkgYW55dGhpbmcuXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHt6b29taW5nOiBmYWxzZX07IC8vIFRvZG86IERlbGV0ZSBldmVudHVhbGx5LlxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZUNvbnRhaW5lclNpemUoKTsgLy8gVG9kbzogSXMgdGhpcyB0aGUgYmVzdCB3YXk/XHJcblxyXG4gICAgICAgIGlmIChzcFBvaW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0VmlldyhzcFBvaW50LCBwX3pvb20pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW5pdC5pbml0QXJyKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgQSA9IHRoaXMuaW5pdC5pbml0QXJyO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBBLmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGFkZGl0aW9uYWwgZnVuY3Rpb25zIGFuIGV4dGVuc2lvblxyXG4gICAgICAgICAgICAgICAgLy8gbWlnaHQgaGF2ZSBhZGRlZC5cclxuICAgICAgICAgICAgICAgIEFbbl0uZm4uY2FsbChBW25dLmN0eCB8fCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgb25Jbml0RG9uZShmbiwgY3R4KSB7XHJcbiAgICAgICAgLy8gVGVzdGluZyBhbiBpZGVhIGFib3V0IGhvdyB0byBleHRlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICAgICAgbGV0IEEgPSB0aGlzLnByb3RvdHlwZS5pbml0LmluaXRhcnI7XHJcbiAgICAgICAgaWYgKCFBKSB7XHJcbiAgICAgICAgICAgIEEgPSB0aGlzLnByb3RvdHlwZS5pbml0LmluaXRBcnIgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgQS5wdXNoKHtmbiwgY3R4fSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VmlldyhzcFBvaW50LCB6b29tKSB7XHJcbiAgICAgICAgc3BQb2ludCA9IHRoaXMudG9Qb2ludChzcFBvaW50KTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tID0gem9vbTtcclxuXHJcbiAgICAgICAgbGV0IGhlaWdodFJhdGlvID0gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0IC8gdGhpcy5tYXBDb250YWluZXIud2lkdGg7XHJcbiAgICAgICAgbGV0IHJlc29sdXRpb24gPVxyXG4gICAgICAgICAgICB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAvKndpbmRvdy5pbm5lcldpZHRoKi8gKlxyXG4gICAgICAgICAgICB0aGlzLmdldFJlc29sdXRpb24oem9vbSk7IC8qMTcuMzYxMTExMTExMTExMTE7Ki9cclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlID0ge1xyXG4gICAgICAgICAgICB4OiBzcFBvaW50LnggLSByZXNvbHV0aW9uIC8gMixcclxuICAgICAgICAgICAgWDogc3BQb2ludC54ICsgcmVzb2x1dGlvbiAvIDIsXHJcbiAgICAgICAgICAgIHk6IHNwUG9pbnQueSAtIChyZXNvbHV0aW9uIC8gMikgKiBoZWlnaHRSYXRpbyxcclxuICAgICAgICAgICAgWTogc3BQb2ludC55ICsgKHJlc29sdXRpb24gLyAyKSAqIGhlaWdodFJhdGlvLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5sb2FkZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ2xvYWRlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnQuZmlyZSgndXBkYXRlIGV2ZXJ5dGhpbmcnKTsgLy8gVG9kbzogTWF5YmUgdGhlIGV2ZW50IHNob3VsZCBiZSBcInNldHZpZXdcIj9cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ29udGFpbmVyU2l6ZShwYW5Ub01pZCkge1xyXG4gICAgICAgIGxldCBjb250YWluZXJSZWN0ID0gdGhpcy5tYXBDb250YWluZXIuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci53aWR0aCA9IHRoaXMucGFyYW1ldGVycy5jb250YWluZXIuY2xpZW50V2lkdGg7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0ID0gdGhpcy5wYXJhbWV0ZXJzLmNvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIubGVmdCA9IGNvbnRhaW5lclJlY3QubGVmdDtcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci50b3AgPSBjb250YWluZXJSZWN0LnRvcDtcclxuXHJcbiAgICAgICAgLy90aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LnN0eWxlLnRvcCA9IHRoaXMubWFwQ29udGFpbmVyLnRvcCArIFwicHhcIjtcclxuICAgICAgICAvL3RoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUubGVmdCA9IHRoaXMubWFwQ29udGFpbmVyLmxlZnQgKyBcInB4XCI7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIuZWxlbWVudC5zdHlsZS5oZWlnaHQgPVxyXG4gICAgICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgKyAncHgnO1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUud2lkdGggPSB0aGlzLm1hcENvbnRhaW5lci53aWR0aCArICdweCc7XHJcblxyXG4gICAgICAgIGxldCBtaWRQb2ludCA9IHtcclxuICAgICAgICAgICAgeDpcclxuICAgICAgICAgICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUueCArXHJcbiAgICAgICAgICAgICAgICAodGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54KSAvIDIsXHJcbiAgICAgICAgICAgIHk6XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgK1xyXG4gICAgICAgICAgICAgICAgKHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueSkgLyAyLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHRSYXRpbyA9IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgICAgIGxldCByZXNvbHV0aW9uID1cclxuICAgICAgICAgICAgdGhpcy5tYXBDb250YWluZXIud2lkdGggLyp3aW5kb3cuaW5uZXJXaWR0aCovICpcclxuICAgICAgICAgICAgdGhpcy5nZXRSZXNvbHV0aW9uKHRoaXMuem9vbSk7IC8qMTcuMzYxMTExMTExMTExMTE7Ki9cclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlID0ge1xyXG4gICAgICAgICAgICB4OiB0aGlzLmV4dGVudC52aXNpYmxlLngsXHJcbiAgICAgICAgICAgIFg6IHRoaXMuZXh0ZW50LnZpc2libGUueCArIHJlc29sdXRpb24sXHJcbiAgICAgICAgICAgIHk6IHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHJlc29sdXRpb24gKiBoZWlnaHRSYXRpbyxcclxuICAgICAgICAgICAgWTogdGhpcy5leHRlbnQudmlzaWJsZS5ZLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnQuZmlyZSgndXBkYXRlQ29udGFpbmVyU2l6ZScsIHRoaXMpO1xyXG5cclxuICAgICAgICBpZiAocGFuVG9NaWQpIHtcclxuICAgICAgICAgICAgdGhpcy5wYW5uaW5nX21vZHVsZS5wYW5UbyhtaWRQb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VDb250YWluZXJzKCkge1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyID0gdGhpcy5tYWtlQ29udGFpbmVyKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKTtcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LmNsYXNzTmFtZSA9ICdfdGhlTWFwQ29udGFpbmVyXyc7XHJcblxyXG4gICAgICAgIHRoaXMubWFpbkNvbnRhaW5lciA9IHRoaXMubWFrZUNvbnRhaW5lcihkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9XHJcbiAgICAgICAgICAgICdwb3NpdGlvbjogYWJzb2x1dGU7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7IHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMHB4LCAwcHgsIDBweCkgc2NhbGUzZCgxLDEsMSk7JztcclxuXHJcbiAgICAgICAgdGhpcy5zdmdDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyksXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLnN2Z0NvbnRhaW5lci5lbGVtZW50LnNldEF0dHJpYnV0ZShcclxuICAgICAgICAgICAgJ3htbG5zOnhsaW5rJyxcclxuICAgICAgICAgICAgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5zdmdDb250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAgICAgJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwcHg7IGxlZnQ6IDBweDsgd2lkdGg6IDEwMDAwMDAwcHg7IGhlaWdodDogMTAwMDAwcHg7IG92ZXJmbG93OiBoaWRkZW47JztcclxuXHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAgICAgJ3Bvc2l0aW9uOiByZWxhdGl2ZTsgei1pbmRleDogMTAwMDsnO1xyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID0gJ19tYXJrZXJDb250YWluZXJfJztcclxuXHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zdmdDb250YWluZXIuZWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmFtZXRlcnMuY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQpO1xyXG4gICAgICAgIC8vIE1ha2UgYSB6b29tIHNsaWRlciBoZXJlP1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VDb250YWluZXIoZWwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAvLyBUb2RvIGZpbmlzaCB0aGlzIHRhc2suXHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsLFxyXG4gICAgICAgICAgICBsZWZ0OiBudWxsLFxyXG4gICAgICAgICAgICB0b3A6IG51bGwsXHJcbiAgICAgICAgICAgIHdpZHRoOiBudWxsLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IG51bGwsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkTW9kdWxlcygpIHtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gbmV3IEJhc2ljRXZlbnRTeXN0ZW0oKTsgLy8gVE9ETzogQ2hhbmdlIHRoaXMgaW4gZnV0dXJlO1xyXG5cclxuICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlID0gcGFubmluZ19tb2R1bGUodGhpcyk7XHJcbiAgICAgICAgLy8gdGhpcy5ib3hab29tX21vZHVsZSA9IGJveFpvb21fbW9kdWxlKHRoaXMpO1xyXG4gICAgICAgIC8vIHRoaXMuWm9vbV9jbGFzcyA9IG5ldyBab29tX2NsYXNzKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIGxldCBtYXBDb250RWwgPSB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50O1xyXG5cclxuICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLmVuYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgIHRoaXMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgICAgICAgICBldnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IF9ldnRfID0gdW5kZWZpbmVkOyAvLyBUaGlzIGlzIG5lZWRlZCBmb3IgdGhlIGRlbHRhLlxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgZXZ0Ll9fX2RlbHRhID0gZXZ0LndoZWVsRGVsdGFcclxuICAgICAgICAgICAgICAgICAgICA/IGV2dC53aGVlbERlbHRhXHJcbiAgICAgICAgICAgICAgICAgICAgOiBldnQuZGVsdGFZIC8vIE5ld2lzaCBmaXJlZm94P1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBldnQuZGVsdGFZICogLTEyMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAoKF9ldnRfID0gd2luZG93LmV2ZW50IHx8IGV2dCksIF9ldnRfLmRldGFpbCAqIC0xMjApO1xyXG5cclxuICAgICAgICAgICAgICAgIGV2dC5fX19kZWx0YSA9IGV2dC5fX19kZWx0YSA+IDAgPyAxMjAgOiAtMTIwOyAvLyBOb3JtYWxpemUgZGVsdGEuXHJcblxyXG4gICAgICAgICAgICAgICAgZXZ0Lnpvb21EZWx0YSA9IGV2dC56b29tRGVsdGEgfHwgdGhpcy56b29tRGVsdGE7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZXZ0LCB0aGlzLk1PVVNFX1dIRUVMX0VWVCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbW91c2Vkb3duJyxcclxuICAgICAgICAgICAgZXZ0ID0+IHtcclxuICAgICAgICAgICAgICAgIC8vbGV0IGV2dCA9IGUuX19ldmVudF9fO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChldnQud2hpY2ggIT09IDEgfHwgZXZ0LndoaWNoID09PSAwIC8qdG91Y2gqLykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LnNoaWZ0S2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ib3hab29tX21vdXNlRG93bihldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhbi5tb3VzZURvd25YID0gZXZ0LmNsaWVudFg7IC8vIENoZWNrZWQgaW4gdGhlIG1vdXNlIGNsaWNrIGxpc3RlbmVyLCBvYnZpb3VzIGhhY2sgaXMgb2J2aW91cy5cclxuICAgICAgICAgICAgICAgIHRoaXMucGFuLm1vdXNlRG93blkgPSBldnQuY2xpZW50WTsgLy8gQ2hlY2tlZCBpbiB0aGUgbW91c2UgY2xpY2sgbGlzdGVuZXIsIG9idmlvdXMgaGFjayBpcyBvYnZpb3VzLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZXZ0KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZXVwJyxcclxuICAgICAgICAgICAgZSA9PiB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcixcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ21vdXNlb3ZlcicsXHJcbiAgICAgICAgICAgIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW91dCcsXHJcbiAgICAgICAgICAgIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW1vdmUnLFxyXG4gICAgICAgICAgICBlID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKGUpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ2NsaWNrJyxcclxuICAgICAgICAgICAgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyB0b2RvOiBGaW5kIGJldHRlciB3YXkgdG8gY2hlY2sgaWYgaXQgaXMgXCJzYWZlXCIgdG8gY2xpY2suXHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgZS5jbGllbnRZID09PSB0aGlzLnBhbi5tb3VzZURvd25ZICYmXHJcbiAgICAgICAgICAgICAgICAgICAgZS5jbGllbnRYID09PSB0aGlzLnBhbi5tb3VzZURvd25YXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5ldmVudC5vbihcclxuICAgICAgICAgICAgdXRpbHMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgICAgICAgICBwX2V2dCA9PiB0aGlzLnpvb21Jbk91dChwX2V2dCksXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBldmVudERlbGdhdGlvbkhhbmRsZXIoZSwgdHlwZSkge1xyXG4gICAgICAgIHR5cGUgPSB0eXBlIHx8IGUudHlwZTtcclxuXHJcbiAgICAgICAgbGV0IHBhcmVudEVsZW1lbnQgPSBlLnRhcmdldDtcclxuICAgICAgICBsZXQgc3RvcFByb3BhZ2F0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCBwb2ludEluQ29udGFpbmVyID0gZS5jb250YWluZXJYICYmIGUuY29udGFpbmVyWVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8geyB4OiBlLmNvbnRhaW5lclgsIHk6IGUuY29udGFpbmVyWSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcih7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pO1xyXG4gICAgICAgIGxldCBuZXdfZXZ0ID0ge1xyXG4gICAgICAgICAgICBfX2V2ZW50X186IGUsXHJcbiAgICAgICAgICAgIHg6IHBvaW50SW5Db250YWluZXIueCxcclxuICAgICAgICAgICAgeTogcG9pbnRJbkNvbnRhaW5lci55LFxyXG4gICAgICAgICAgICBjc3M6IGUuY3NzLFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICB6b29tRGVsdGE6IGUuem9vbURlbHRhIHx8IHRoaXMuem9vbURlbHRhLFxyXG4gICAgICAgICAgICAvL3ByZXZlbnREZWZhdWx0OiBlLnByZXZlbnREZWZhdWx0LmJpbmQoZSksXHJcbiAgICAgICAgICAgIHNwUG9pbnQ6IG51bGwsXHJcbiAgICAgICAgICAgIHN0b3BQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzdG9wUHJvcGFnYXR0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3aGlsZSAocGFyZW50RWxlbWVudCAmJiBwYXJlbnRFbGVtZW50ICE9PSB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICEocGFyZW50RWxlbWVudC5fbWFya2VyX29iaiAmJiBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLmZpcmUpXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudCA9IHBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocGFyZW50RWxlbWVudC5fbWFya2VyX29iai5zdGF0ZVBsYW5lUG9pbnQpIHtcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHBhcmVudEVsZW1lbnQuX21hcmtlcl9vYmouc3RhdGVQbGFuZVBvaW50O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLmZpcmUodHlwZSwgbmV3X2V2dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoc3RvcFByb3BhZ2F0dGluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJlbnRFbGVtZW50ID0gcGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuX19fZGVsdGEpIHtcclxuICAgICAgICAgICAgLy8gTWFwIGlzIHpvb21pbmcuXHJcbiAgICAgICAgICAgIHRoaXMucGFubmluZ19tb2R1bGUuc3RvcFBhbkFuaW1hdGlvbihuZXdfZXZ0KTtcclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHRoaXMuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ocG9pbnRJbkNvbnRhaW5lcik7IC8vIEhhbHRpbmcgcGFubmluZyBhbmltYXRpb24gY2hhbmdlcyBleHRlbnQuLlxyXG5cclxuICAgICAgICAgICAgbGV0IF96b29tRGVsdGEgPSB0aGlzLmNhbGNab29tRGVsdGEoXHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20sXHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0Lnpvb21EZWx0YSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWluWm9vbSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWF4Wm9vbSxcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBfem9vbUFkZGVyID1cclxuICAgICAgICAgICAgICAgIGUuX19fZGVsdGEgPj0gMTIwID8gX3pvb21EZWx0YS5tYXhEZWx0YSA6IC1fem9vbURlbHRhLm1pbkRlbHRhO1xyXG5cclxuICAgICAgICAgICAgdGhpcy56b29tICs9IF96b29tQWRkZXI7XHJcblxyXG4gICAgICAgICAgICBsZXQgX3Jlc29sdXRpb24gPSB0aGlzLmdldFJlc29sdXRpb24odGhpcy56b29tKTtcclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc2NhbGUgPVxyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRSZXNvbHV0aW9uKHRoaXMuem9vbSAtIF96b29tQWRkZXIpIC8gX3Jlc29sdXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc0V4dGVudEJ5T3JpZ2luQW5kUmVzb2x1dGlvbihcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCxcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc2NhbGUsXHJcbiAgICAgICAgICAgICAgICBfcmVzb2x1dGlvbixcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZXdfZXZ0LnNwUG9pbnQgPSB0aGlzLnNjcmVlblBvaW50VG9Qcm9qZWN0aW9uKHBvaW50SW5Db250YWluZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5ldmVudC5maXJlKHR5cGUsIG5ld19ldnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFRvKGVsZW1lbnQsIHBhcmVudCwgY2FsbEJhY2spIHtcclxuICAgICAgICBsZXQgYXJncyA9IGFyZ3VtZW50cztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcclxuICAgICAgICAgICAgY2FsbEJhY2soKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50Lm9uKFxyXG4gICAgICAgICAgICAgICAgJ2xvYWRlZCcsXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfZm5fKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFRvLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQub2ZmKCdsb2FkZWQnLCBfZm5fKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQmFzaWNFdmVudFN5c3RlbSB9IGZyb20gXCIuL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNpY0ludGVyYWN0aXZlRWxlbWVudCBleHRlbmRzIEJhc2ljRXZlbnRTeXN0ZW0ge1xyXG4gICAgY29uc3RydWN0b3IoZWxlbSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbTtcclxuICAgICAgICB0aGlzLmRlbGV0ZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgZWxlbS5fbWFya2VyX29iaiA9IHRoaXM7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCB7TmV3TWFwfSBmcm9tICcuL01haW5fY2xhc3MnO1xyXG5cclxuTmV3TWFwLm9uSW5pdERvbmUoZnVuY3Rpb24oKXtcclxuICAgIC8vIFRlc3RpbmcgYW4gaWRlYSBhYm91dCBob3cgdG8gZXhlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICB0aGlzLnpvb20gPSAwO1xyXG59KTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY2FsY1pvb21EZWx0YSA9IGZ1bmN0aW9uKFxyXG4gICAgem9vbUx2bCxcclxuICAgIHpvb21EZWx0YSwgXHJcbiAgICBtaW5ab29tLFxyXG4gICAgbWF4Wm9vbSxcclxuKSB7XHJcbiAgICBsZXQgem9vbUluTHZsID0gem9vbUx2bCArIHpvb21EZWx0YTtcclxuICAgIGxldCB6b29tT3V0THZsID0gem9vbUx2bCAtIHpvb21EZWx0YTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIG1heERlbHRhOlxyXG4gICAgICAgICAgICB6b29tSW5MdmwgPiBtYXhab29tID8gem9vbURlbHRhIC0gKHpvb21Jbkx2bCAtIG1heFpvb20pIDogem9vbURlbHRhLFxyXG4gICAgICAgIG1pbkRlbHRhOlxyXG4gICAgICAgICAgICB6b29tT3V0THZsIDwgbWluWm9vbVxyXG4gICAgICAgICAgICAgICAgPyB6b29tRGVsdGEgKyAoem9vbU91dEx2bCAtIG1pblpvb20pXHJcbiAgICAgICAgICAgICAgICA6IHpvb21EZWx0YSxcclxuICAgIH07XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLnpvb21UbyA9IGZ1bmN0aW9uKHByb2pQb2ludCwgem9vbSwgcHJvak9yaWdpbikge1xyXG4gICAgbGV0IGNvbnZlcnRQb2ludCA9IHRoaXMuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludC5iaW5kKHRoaXMpO1xyXG4gICAgbGV0IF9wb2ludCA9IGNvbnZlcnRQb2ludChwcm9qUG9pbnQpO1xyXG4gICAgbGV0IHpvb21TaWduID0gem9vbSA+IHRoaXMuem9vbSA/IDEgOiAtMTtcclxuICAgIGxldCB6b29tRGlmZiA9IHpvb20gLSB0aGlzLnpvb207XHJcbiAgICBsZXQgc2NhbGUgPSAxICsgMSAvICgyICoqIHpvb21EaWZmIC0gMSk7XHJcbiAgICBsZXQgY2VudGVyID0ge1xyXG4gICAgICAgIHg6IHRoaXMubWFwQ29udGFpbmVyLndpZHRoIC8gMixcclxuICAgICAgICB5OiB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgLyAyLFxyXG4gICAgfTtcclxuXHJcbiAgICBsZXQgX29yaWdpbiA9IChwcm9qT3JpZ2luICYmIGNvbnZlcnRQb2ludChwcm9qT3JpZ2luKSkgfHwgY2VudGVyO1xyXG5cclxuICAgIGxldCBkaXN0YW5jZVggPSBfcG9pbnQueCAtIF9vcmlnaW4ueDtcclxuICAgIGxldCBkaXN0YW5jZVkgPSBfcG9pbnQueSAtIF9vcmlnaW4ueTtcclxuICAgIGxldCBzaW1Nb3VzZVggPSBfb3JpZ2luLnggKyBkaXN0YW5jZVggKiBzY2FsZTtcclxuICAgIGxldCBzaW1Nb3VzZVkgPSBfb3JpZ2luLnkgKyBkaXN0YW5jZVkgKiBzY2FsZTtcclxuXHJcbiAgICBpZiAoem9vbSA9PT0gdGhpcy56b29tKSB7XHJcbiAgICAgICAgLy90aGlzLm1hcC5wYW5uaW5nX21vZHVsZS5wYW5UbyhvcmlnaW4gfHwgcHJvalBvaW50LCA1MDApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTaW11bGF0ZSBhIG1vdXNlIHdoZWVsIGV2ZW50LlxyXG4gICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb250YWluZXJYOiBzaW1Nb3VzZVgsXHJcbiAgICAgICAgICAgIGNvbnRhaW5lclk6IHNpbU1vdXNlWSxcclxuICAgICAgICAgICAgX19fZGVsdGE6IHpvb21TaWduICogMTIwLFxyXG4gICAgICAgICAgICBjc3M6IHtcclxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ2Vhc2VvdXQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB6b29tRGVsdGE6IE1hdGguYWJzKHpvb21EaWZmKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHV0aWxzLk1PVVNFX1dIRUVMX0VWVCxcclxuICAgICk7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLnpvb21Jbk91dCA9IGZ1bmN0aW9uKHBfZXZ0KSB7XHJcbiAgICBpZiAocF9ldnQuc2NhbGUgPT09IDEpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuc3RhdGUuem9vbWluZyA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIHRoaXMuZXZlbnQuZmlyZSgnem9vbSBlbmQnLCBwX2V2dCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RhdGUuem9vbWluZyA9IHRydWU7XHJcblxyXG4gICAgdGhpcy5ldmVudC5maXJlKCdwcmV6b29tJywgcF9ldnQpO1xyXG4gICAgdGhpcy5ldmVudC5maXJlKCd6b29tIGVuZCcsIHBfZXZ0KTtcclxufTtcclxuIiwiaW1wb3J0IHsgQmFzaWNFdmVudFN5c3RlbSB9IGZyb20gXCIuL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3NcIjtcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSBcIi4vdXRpbHNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNpY0xheWVyIGV4dGVuZHMgQmFzaWNFdmVudFN5c3RlbSB7XHJcbiAgICBjb25zdHJ1Y3RvcihoaWRlRHVyaW5nWm9vbSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmhpZGVEdXJpbmdab29tID0gaGlkZUR1cmluZ1pvb207XHJcbiAgICAgICAgdGhpcy56b29tT2JqID0geyB4T2Zmc2V0OiAwLCB5T2Zmc2V0OiAwIH07XHJcbiAgICAgICAgdGhpcy56b29tTHZsID0gbnVsbDtcclxuICAgICAgICB0aGlzLnpvb21UaW1lciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy56b29tSW5kZXggPSBudWxsO1xyXG4gICAgICAgIHRoaXMuem9vbUVuZG1zID0gMjAwO1xyXG4gICAgICAgIHRoaXMuZnJhY3Rpb25PZmZzZXQgPSB7IHg6IDAsIHk6IDAgfTtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHsgeDogMCwgeTogMCB9O1xyXG4gICAgfVxyXG5cclxuICAgIHNldFpvb21JbmRleChpbmRleCkge1xyXG4gICAgICAgIHRoaXMuem9vbUluZGV4ID0gaW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0WmluZGV4KHpJbmRleCkge1xyXG4gICAgICAgIHRoaXMuekluZGV4ID0gekluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGhpcy5faGlkZUNvbnRhaW5lckR1cmluZ01vdXNlV2hlZWxFdnQsIHRoaXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGhpcy5fbW91c2VXaGVlbEV2dCwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInVwZGF0ZUNvbnRhaW5lclNpemVcIiwgdGhpcy51cGRhdGVDb250YWluZXIsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwidXBkYXRlIGV2ZXJ5dGhpbmdcIiwgdGhpcy5maXJlLmJpbmQodGhpcywgXCJ1cGRhdGUgZXZlcnl0aGluZ1wiKSwgdGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJ6b29tIGVuZFwiLCB0aGlzLl96b29tRW5kRXZ0LCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiYWRkIGV2ZW50IGxpc3RlbmVyc1wiKTtcclxuICAgIH1cclxuXHJcbiAgICBfem9vbUVuZEV2dChwX2V2dCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnpvb21UaW1lcik7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLmZpcmUoXCJ6b29tIGRlbGF5IGVuZFwiLCBwX2V2dCksIHRoaXMuem9vbUVuZG1zKTtcclxuICAgIH1cclxuXHJcbiAgICBfaGlkZUNvbnRhaW5lckR1cmluZ01vdXNlV2hlZWxFdnQoKSB7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgdGhpcy5maXJlKFwiem9vbSBlbmRcIik7XHJcbiAgICB9XHJcblxyXG4gICAgX21vdXNlV2hlZWxFdnQocF9ldnQpIHtcclxuICAgICAgICAvLyBsZXQgcG9pbnQgPSB7IHg6IHBfZXZ0LngsIHk6IHBfZXZ0LnkgfTtcclxuXHJcbiAgICAgICAgaWYgKHBfZXZ0LnNjYWxlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHBfZXZ0Lm5vWm9vbSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZmlyZShcInpvb20gZW5kXCIsIHBfZXZ0KTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBfZXZ0Ll9fZXZlbnRfXy5fX19kZWx0YSA+PSAxMjApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tSW5PdXQocF9ldnQsIFwiem9vbSBpblwiKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHBfZXZ0Ll9fZXZlbnRfXy5fX19kZWx0YSA8PSAtMTIwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbUluT3V0KHBfZXZ0LCBcInpvb20gb3V0XCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhZGRUbyhtYXApIHtcclxuICAgICAgICBpZiAodGhpcy5tYXAgPT09IG1hcCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTGF5ZXIgYWxyZWFkeSBhZGRlZCB0byBtYXBcIiwgdGhpcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXA7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSB0aGlzLmNyZWF0ZUNvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMuc2V0Wm9vbUluZGV4KHRoaXMuem9vbUluZGV4IHx8IHRoaXMubWFwLnpvb21JbmRleCk7XHJcblxyXG4gICAgICAgIG1hcC5hZGRUbyh0aGlzLmNvbnRhaW5lci5lbGVtZW50LCBtYXAubWFpbkNvbnRhaW5lci5lbGVtZW50LCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAgICAgdGhpcy5maXJlKFwiYXBwZW5kZWQgdG8gbWFwXCIpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoKSB7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuY29udGFpbmVyLmVsZW1lbnQpO1xyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50LmFsbE9mZih0aGlzKTtcclxuICAgICAgICB0aGlzLmZpcmUoXCJyZW1vdmVcIiwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICAvLyBUbyBiZSBpbXBsaW1lbnRlZCBieSBjbGFzc2VzIHRoYXQgZXh0ZW5kIHRoaXMgY2xhc3MuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIC8vIFRvIGJlIGltcGxpbWVudGVkIGJ5IGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBjbGFzcy5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRoZSBtZXRob2QgJ3VwZGF0ZUNvbnRhaW5lcicgaW4gXCIgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiB3YXNuJ3QgaW1wbGltZW50ZWRcIiwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5maXJlKFwidXBkYXRlIGV2ZXJ5dGhpbmdcIik7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIGxldCBjb250ID0ge1xyXG4gICAgICAgICAgICBlbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxyXG4gICAgICAgICAgICBsZWZ0OiAwIC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB0b3A6IDAgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcCxcclxuICAgICAgICAgICAgdXBkYXRlVHJhbnNmb3JtOiB1bmRlZmluZWRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb250LnVwZGF0ZVRyYW5zZm9ybSA9IHRoaXMudXBkYXRlQ29udGFpbmVyVHJhbnNmb3JtLmJpbmQoeyBjb250YWluZXI6IGNvbnQgfSk7XHJcblxyXG4gICAgICAgIGNvbnQuZWxlbWVudC5jbGFzc05hbWUgPSBcIl90aWxlQ29udGFpbmVyX1wiO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUubGVmdCA9IFwiMHB4XCI7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnRvcCA9IFwiMHB4XCI7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLmhlaWdodCA9IFwiMTAwJVwiO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS56SW5kZXggPSB0aGlzLnpJbmRleDtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUuYmFja2ZhY2VWaXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUudHJhbnNmb3JtT3JpZ2luID0gXCJ0b3AgbGVmdFwiO1xyXG5cclxuICAgICAgICByZXR1cm4gY29udDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXJUcmFuc2Zvcm0obGVmdCwgdG9wLCBzY2FsZSkge1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmxlZnQgPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLnRvcCA9IHRvcDtcclxuXHJcbiAgICAgICAgc2NhbGUgPSBzY2FsZSB8fCAxO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYHRyYW5zbGF0ZTNkKCR7bGVmdH1weCwgJHt0b3B9cHgsIDBweClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHtzY2FsZX0sICR7c2NhbGV9LCAxKWA7XHJcbiAgICB9XHJcblxyXG4gICAgc3dhcENvbnRhaW5lcihjaGlsZEVsZW1lbnQsIGRlbGF5KSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbnROZXcgPSB0aGlzLmNyZWF0ZUNvbnRhaW5lcigpO1xyXG4gICAgICAgIGxldCBjb250T2xkID0gdGhpcy5jb250YWluZXI7XHJcblxyXG4gICAgICAgIGNvbnROZXcudXBkYXRlVHJhbnNmb3JtKGNvbnROZXcubGVmdCwgY29udE5ldy50b3AsIDEpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnROZXc7XHJcblxyXG4gICAgICAgIGlmIChjaGlsZEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZEVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAubWFpbkNvbnRhaW5lci5lbGVtZW50Lmluc2VydEJlZm9yZShjb250TmV3LmVsZW1lbnQsIGNvbnRPbGQuZWxlbWVudCk7XHJcblxyXG4gICAgICAgIC8vIHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgLy8gVG9kbzogSnVzdCBmb3IgdGVzdGluZyBwdXJwb3Nlcy5cclxuICAgICAgICAvLyBpZiAoY29udE9sZC5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPT09ICdub25lJyl7XHJcbiAgICAgICAgLy8gY29udE9sZC5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuICAgICAgICAvLyB9ZWxzZXtcclxuICAgICAgICAvLyBjb250T2xkLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgLy8gfSwgNTAwKTtcclxuXHJcbiAgICAgICAgbGV0IGRvU3dhcCA9IGUgPT4ge1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc3dhcFRpbWVyKTtcclxuICAgICAgICAgICAgdGhpcy5kb1N3YXAgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vZmYodXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aWxlTG9hZExpc3RlbmVyLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub2ZmKFwidGlsZSBsb2FkZWRcIiwgZG9Td2FwLCB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb250T2xkLmVsZW1lbnQucGFyZW50RWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgY29udE9sZC5lbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoY29udE9sZC5lbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBzd2FwVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgZG9Td2FwKCk7XHJcbiAgICAgICAgfSwgZGVsYXkgfHwgNDUwKTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgICAgSW1taWRpYXRseSBzd2FwIHRoZSBjb250YWluZXJzIGlmIHRoZXJlIGlzIGEgbW91c2V3aGVlbFxyXG4gICAgICAgICAgICBldmVudCBiZWZvcmUgdGhlIHN3YXBUaW1lciBmaXJlcyBvZmYuXHJcbiAgICAgICAgKi9cclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIGRvU3dhcCwgdGhpcyk7XHJcblxyXG4gICAgICAgIGxldCBfX190aGF0ID0gdGhpcztcclxuICAgICAgICBmdW5jdGlvbiB0aWxlTG9hZExpc3RlbmVyKGUpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogdGVzdGluZ1xyXG4gICAgICAgICAgICBfX190aGF0Lm1hcC5ldmVudC5vZmYodXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aWxlTG9hZExpc3RlbmVyLCBfX190aGF0KTtcclxuICAgICAgICAgICAgc2V0VGltZW91dChfX190aGF0Lm1hcC5ldmVudC5vbi5iaW5kKF9fX3RoYXQubWFwLmV2ZW50LCBcInRpbGUgbG9hZGVkXCIsIGRvU3dhcCwgX19fdGhhdCksIDEwMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB6b29tRW5kKGV2dCkge1xyXG4gICAgICAgIGlmIChldnQgJiYgZXZ0Lm5vWm9vbSAmJiB0aGlzLl9fem9vbSA9PT0gdGhpcy5tYXAuem9vbSkge1xyXG4gICAgICAgICAgICAvLyBIYWNrIHRvIHN0b3AgbGF5ZXIgZnJvbSB6b29taW5nIHBhc3QgaXQncyBsaW1pdHMuXHJcbiAgICAgICAgICAgIC8vdGhpcy5maXJlKFwidXBkYXRlIGV2ZXJ5dGhpbmdcIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnpvb21PYmouaXNab29taW5nKSB7XHJcbiAgICAgICAgICAgIC8vIEZpcnN0IHRpbWUgY2FsbGluZyB6b29tRW5kIHNpbmNlIHN0YXJ0aW5nIHpvb21pbmcuXHJcbiAgICAgICAgICAgIHRoaXMuZmlyZShcInByZSB6b29tIGVuZFwiLCB0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX196b29tID0gdGhpcy5tYXAuem9vbTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tT2JqID0ge307XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZShcInBvc3Qgem9vbSBlbmRcIik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0Wm9vbU9iaigpIHtcclxuICAgICAgICB0aGlzLnpvb21PYmogPSB7XHJcbiAgICAgICAgICAgIHNjYWxlOiAxLFxyXG4gICAgICAgICAgICBpc1pvb21pbmc6IGZhbHNlLFxyXG4gICAgICAgICAgICB4OiB0aGlzLmNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB5OiB0aGlzLmNvbnRhaW5lci50b3BcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB6b29tSW5PdXQoZXZ0LCB6b29tRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuem9vbU9iai5pc1pvb21pbmcpIHtcclxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX3pvb21Jbk91dC5iaW5kKHRoaXMsZXZ0LCB6b29tRGlyZWN0aW9uKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5jbGFzc05hbWUgPSAoZXZ0LmNzcyAmJiBldnQuY3NzLmNsYXNzTmFtZSkgfHwgXCJzbW9vdGhUcmFuc2l0aW9uXCI7XHJcblxyXG4gICAgICAgIHRoaXMucmVzZXRab29tT2JqKCk7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbU9iai5pc1pvb21pbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fem9vbUluT3V0LmJpbmQodGhpcyxldnQsIHpvb21EaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21Jbk91dChldnQsIHpvb21EaXJlY3Rpb24pIHtcclxuICAgICAgICBsZXQgek9iaiA9IHRoaXMuem9vbU9iajtcclxuICAgICAgICBsZXQgc2NhbGUgPSB0aGlzLmdldFNjYWxlKHpvb21EaXJlY3Rpb24sIGV2dC56b29tRGVsdGEpO1xyXG5cclxuICAgICAgICB6T2JqLnNjYWxlICo9IHNjYWxlO1xyXG5cclxuICAgICAgICBsZXQgX29sZCA9IHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzO1xyXG4gICAgICAgIGxldCBfbmV3ID0gdGhpcy50b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKCk7XHJcbiAgICAgICAgX25ldy54ID0gTWF0aC5mbG9vcihfbmV3LngpO1xyXG4gICAgICAgIF9uZXcueSA9IE1hdGguZmxvb3IoX25ldy55KTtcclxuXHJcbiAgICAgICAgbGV0IHggPSBfb2xkLnggKiB6T2JqLnNjYWxlIC0gX25ldy54IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0O1xyXG4gICAgICAgIGxldCB5ID0gX29sZC55ICogek9iai5zY2FsZSAtIF9uZXcueSAtIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgICAgICAgIGB0cmFuc2xhdGUzZCgkeyB4IH1weCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyB5IH1weCwgMHB4KVxyXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHsgek9iai5zY2FsZSB9LCAkeyB6T2JqLnNjYWxlIH0sIDEpYDtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiem9vbSBlbmRcIiwgZXZ0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0U2NhbGUoem9vbURpcmVjdGlvbiwgem9vbURlbHRhKXtcclxuICAgICAgICBsZXQgZ2V0UmVzID0gdGhpcy5tYXAuZ2V0UmVzb2x1dGlvbi5iaW5kKHRoaXMubWFwKTtcclxuICAgICAgICBsZXQgc2NhbGUgPSAxO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCB6b29tTHZsID0gdGhpcy5tYXAuem9vbSArICh6b29tRGlyZWN0aW9uID09PSBcInpvb20gaW5cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IC16b29tRGVsdGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB6b29tRGVsdGEpO1xyXG5cclxuICAgICAgICBzY2FsZSA9IGdldFJlcyh6b29tTHZsKSAvIGdldFJlcyh0aGlzLm1hcC56b29tKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNjYWxlO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IEJhc2ljTGF5ZXIgfSBmcm9tIFwiLi9CYXNpY0xheWVyX2NsYXNzXCI7XHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gXCIuL3V0aWxzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJjUmVuZGVyTGF5ZXIgZXh0ZW5kcyBCYXNpY0xheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKGltZ1VybCwgcmVxVGVtcGxhdGUsIHpJbmRleCwgaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICBzdXBlcihoaWRlRHVyaW5nWm9vbSk7XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZXRJbWdSZXFVcmwoaW1nVXJsKTtcclxuICAgICAgICB0aGlzLnNldFJlcVRlbXBsYXRlKHJlcVRlbXBsYXRlKTtcclxuICAgICAgICB0aGlzLnJlcUlkID0gMDtcclxuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRaaW5kZXgoekluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbihcImFkZCBldmVudCBsaXN0ZW5lcnNcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uKFwiYXBwZW5kZWQgdG8gbWFwXCIsIHRoaXMudXBkYXRlLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbihcInpvb20gZGVsYXkgZW5kXCIsIHRoaXMuc3RhcnRVcGRhdGVUaW1lci5iaW5kKHRoaXMsIDEwMDApLCB0aGlzKTtcclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXMub24oIFwidXBkYXRlIGV2ZXJ5dGhpbmdcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24odXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aGlzLmNhbmNlbFJlcXVlc3QsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInBhbiBpbml0aWFsXCIsIHRoaXMuY2FuY2VsUmVxdWVzdCwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwicGFuIGVuZFwiLCB0aGlzLnN0YXJ0VXBkYXRlVGltZXIuYmluZCh0aGlzLCAxMDAwKSwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwic3RvcFBhbkFuaW1hdGlvblwiLCB0aGlzLmNhbmNlbFJlcXVlc3QsIHRoaXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbmNlbFJlcXVlc3QoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYWpheFJlcXVlc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5hYm9ydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0ID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFqYXhSZXF1ZXN0ID09PSBodHRwUmVxT2JqID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0VXBkYXRlVGltZXIobWlsbGlzZWNvbmRzKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudXBkYXRlVGltZXIpO1xyXG4gICAgICAgIHRoaXMuY2FuY2VsUmVxdWVzdCgpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBzZXRUaW1lb3V0KHRoaXMudXBkYXRlLmJpbmQodGhpcyksIG1pbGxpc2Vjb25kcyB8fCAxMDAwKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRJbWdSZXFVcmwoaW1nVXJsKSB7XHJcbiAgICAgICAgdGhpcy5pbWdSZXFVcmwgPSBpbWdVcmw7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UmVxVGVtcGxhdGUodGVtcGxhdGUpIHtcclxuICAgICAgICB0aGlzLnJlcVRlbXBsYXRlID0gdGVtcGxhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZEh0dHBSZXEocmVxKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmNhbmNlbFJlcXVlc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCAmJiB0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmh0dHBSZXFPbmxvYWQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oXCJQT1NUXCIsIHRoaXMuaW1nUmVxVXJsLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LXR5cGVcIiwgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIik7XHJcblxyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Quc2VuZChyZXEpO1xyXG4gICAgfVxyXG5cclxuICAgIGh0dHBSZXFPbmxvYWQoaHR0cFJlcU9iaikge1xyXG4gICAgICAgIGlmICghdGhpcy5pc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiYWpheCBsb2FkXCIsIGh0dHBSZXFPYmopO1xyXG5cclxuICAgICAgICB2YXIgcGFyc2VkUmVzID0gSlNPTi5wYXJzZShodHRwUmVxT2JqLnJlc3BvbnNlVGV4dCk7XHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlVGhlSW1hZ2UocGFyc2VkUmVzLmhyZWYsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZVRoZUltYWdlKGltZ1NyYywgaHR0cFJlcU9iaikge1xyXG4gICAgICAgIHZhciBuZXdNYXBJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgIG5ld01hcEltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCB0aGlzLm1hcExvYWRIYW5kbGVyLmJpbmQodGhpcywgbmV3TWFwSW1nLCBodHRwUmVxT2JqKSk7XHJcbiAgICAgICAgbmV3TWFwSW1nLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCB0aGlzLm1hcEVycm9ySGFuZGxlci5iaW5kKHRoaXMsIG5ld01hcEltZywgaHR0cFJlcU9iaikpO1xyXG4gICAgICAgIG5ld01hcEltZy5zcmMgPSBpbWdTcmM7XHJcbiAgICAgICAgbmV3TWFwSW1nLnN0eWxlLnpJbmRleCA9IFwiMVwiO1xyXG4gICAgICAgIG5ld01hcEltZy5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcclxuICAgICAgICBuZXdNYXBJbWcuc3R5bGUuaW1hZ2VSZW5kZXJpbmcgPSBcInBpeGVsYXRlZFwiOyAvLyBUT0RPOiBUZXN0IG9mIG5ldyBjc3MgZmVhdHVyZSBpbiBjaHJvbWUuXHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICB2YXIgb2JqID0ge1xyXG4gICAgICAgICAgICAuLi50aGlzLm1hcC5leHRlbnQudmlzaWJsZSxcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMubWFwLm1hcENvbnRhaW5lci53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLm1hcC5tYXBDb250YWluZXIuaGVpZ2h0XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdmFyIHJlcSA9IGVuY29kZVVSSShcclxuICAgICAgICAgICAgdGhpcy5yZXFUZW1wbGF0ZS5yZXBsYWNlKC9cXCR7KC4rPyl9L2csIGZ1bmN0aW9uKGEsIG1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqW21hdGNoXTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgICAgIC8vYGJib3g9JHtzcENvb3Jkcy54fSwke3NwQ29vcmRzLnl9LCR7c3BDb29yZHMuWH0sJHtzcENvb3Jkcy5ZfSZiYm94U1I9MTAyNzQ4JmxheWVycz1zaG93OjQmbGF5ZXJEZWZzPSZzaXplPSR7emVlTWFwLm1hcENvbnRhaW5lci53aWR0aH0sJHt6ZWVNYXAubWFwQ29udGFpbmVyXHJcbiAgICAgICAgLy8gICAgLmhlaWdodH0maW1hZ2VTUj0xMDI3NDgmZm9ybWF0PXBuZzgmdHJhbnNwYXJlbnQ9dHJ1ZSZkcGk9JnRpbWU9JmxheWVyVGltZU9wdGlvbnM9JmR5bmFtaWNMYXllcnM9JmdkYlZlcnNpb249Jm1hcFNjYWxlPSZmPXBqc29uYFxyXG4gICAgICAgIHRoaXMuc2VuZEh0dHBSZXEocmVxKTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBtYXBMb2FkSGFuZGxlcihtYXBJbWcsIGh0dHBSZXFPYmopIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNDdXJyZW50UmVxKGh0dHBSZXFPYmopKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX196b29tID0gdGhpcy5tYXAuem9vbTtcclxuICAgICAgICB0aGlzLnpvb21PYmogPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5zd2FwQ29udGFpbmVyKG1hcEltZywgMCAvKm1pbGxpc2Vjb25kcyovKTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwibWFwIGltZyBsb2FkXCIsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcEVycm9ySGFuZGxlcihtYXBJbWcsIGh0dHBSZXFPYmopIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMsIG1hcEltZywgaHR0cFJlcU9iaik7XHJcbiAgICAgICAgdGhpcy5maXJlKFwibWFwIGltZyBlcnJvclwiLCBodHRwUmVxT2JqKTtcclxuICAgIH1cclxuXHJcbiAgICBfem9vbUluT3V0KGV2dCwgem9vbURpcmVjdGlvbikge1xyXG4gICAgICAgIGxldCB6T2JqID0gdGhpcy56b29tT2JqO1xyXG4gICAgICAgIGxldCBzY2FsZSA9IHRoaXMuZ2V0U2NhbGUoem9vbURpcmVjdGlvbiwgZXZ0Lnpvb21EZWx0YSk7XHJcbiAgICAgICAgek9iai5zY2FsZSAqPSBzY2FsZTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1BvaW50ID0ge1xyXG4gICAgICAgICAgICB4OiBldnQueCAtIHRoaXMubWFwLm1haW5Db250YWluZXIubGVmdCArIHpPYmoueCwgLy8gVGhpcyB3aWxsIHNldCB0aGUgb3JpZ2luIHRvIDEvMiB0aGUgY2VudGVyOiAtIHRoaXMubWFwLm1hcENvbnRhaW5lci53aWR0aCAvIDI7XHJcbiAgICAgICAgICAgIHk6IGV2dC55IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci50b3AgKyB6T2JqLnlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB6T2JqLnggPSB6T2JqLnggKyAoek9iai54IC0gKG5ld1BvaW50LnggLSB6T2JqLngpKSAqIChzY2FsZSAtIDEpO1xyXG4gICAgICAgIHpPYmoueSA9IHpPYmoueSArICh6T2JqLnkgLSAobmV3UG9pbnQueSAtIHpPYmoueSkpICogKHNjYWxlIC0gMSk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAgICAgICAgIGB0cmFuc2xhdGUzZCgkeyB6T2JqLnggfXB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyB6T2JqLnkgfXB4LCAwcHgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHsgek9iai5zY2FsZSB9LCAkeyB6T2JqLnNjYWxlIH0sIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgYDtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiem9vbSBlbmRcIiwgZXZ0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgQXJjUmVuZGVyTGF5ZXIgfSBmcm9tIFwiLi9BcmNSZW5kZXJMYXllcl9jbGFzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFyY1hNTExheWVyIGV4dGVuZHMgQXJjUmVuZGVyTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3IoaW1nVXJsLCB6SW5kZXgsIEFyY1hNTF9tb2R1bGUsIGhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgc3VwZXIoaW1nVXJsLCBudWxsLCB6SW5kZXgsIGhpZGVEdXJpbmdab29tKTtcclxuXHJcbiAgICAgICAgdGhpcy5vbihcImFwcGVuZGVkIHRvIG1hcFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubWFrZUFyY1hNTCA9IEFyY1hNTF9tb2R1bGUodGhpcy5tYXApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgZXh0ZW50ID0gdGhpcy5tYXAuZXh0ZW50LnZpc2libGU7XHJcbiAgICAgICAgbGV0IHhtbCA9IHRoaXMubWFrZUFyY1hNTC5tYWtlQXJjWE1MUmVxdWVzdChleHRlbnQueCwgZXh0ZW50LlgsIGV4dGVudC55LCBleHRlbnQuWSk7XHJcbiAgICAgICAgbGV0IHJlcSA9IHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQoXCJBcmNYTUxSZXF1ZXN0XCIpICsgXCI9XCIgKyB3aW5kb3cuZW5jb2RlVVJJQ29tcG9uZW50KHhtbCk7XHJcbiAgICAgICAgdGhpcy5zZW5kSHR0cFJlcShyZXEpO1xyXG4gICAgfVxyXG5cclxuICAgIGh0dHBSZXFPbmxvYWQoaHR0cFJlcU9iaikge1xyXG4gICAgICAgIGlmICghdGhpcy5pc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHhtbCA9IC88XFw/eG1sLio+Ly5leGVjKGh0dHBSZXFPYmoucmVzcG9uc2VUZXh0KVswXTtcclxuICAgICAgICBsZXQgcGFyc2VkUmVzID0gbmV3IERPTVBhcnNlcigpLnBhcnNlRnJvbVN0cmluZyh4bWwgLCBcImFwcGxpY2F0aW9uL3htbFwiKTtcclxuICAgICAgICBsZXQgb3V0cHV0ID0gcGFyc2VkUmVzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiT1VUUFVUXCIpO1xyXG4gICAgICAgIGxldCBocmVmID0gb3V0cHV0WzBdLmdldEF0dHJpYnV0ZShcInVybFwiKTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVUaGVJbWFnZShocmVmLCBodHRwUmVxT2JqKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdvb2dsZVRvU3RhdGUgKCBsYXQsIGxvbiApIHsvLyB0aGlzIGNvbnZlcnRzIGdvb2dsZSdzIHgseSBjb29yZGluYXRlcyB0byBzdGF0ZSBwbGFuZSBjb29yZGluYXRlcyB1c2VkIGJ5IHRoZSBnb3Zlcm5tZW50LlxyXG4gICAgICAgICAgLy8gRm9yIHNub2hvbWlzaCBjb3VudHkgb25seS5cclxuICAgICAgICAgICAgICAgIGxldCBtYXRoID0gTWF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIHJobyA9IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICB0aGV0YSA9IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICB4ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIHkgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgbGF0ID0gbGF0ICogLjAxNzQ1MzI5MjUyIDtcclxuICAgICAgICAgICAgICAgIGxvbiA9IGxvbiAqIC4wMTc0NTMyOTI1MiA7XHJcbiAgICAgICAgICAgICAgICB0ID0gbWF0aC5zaW4oIDAuNzg1Mzk4MTYzMzk3NDQ4MyAtICggbGF0IC8gMiApKSAvIG1hdGguY29zKCAwLjc4NTM5ODE2MzM5NzQ0ODMgLSAoIGxhdCAvIDIgKSkgO1xyXG4gICAgICAgICAgICAgICAgdCA9IHQgLyAoIG1hdGgucG93KCgoIDEgLSAoIDAuMDgyMjcxODU0ICogKCBtYXRoLnNpbiggbGF0ICkpKSkgLyAoIDEgKyAoIDAuMDgyMjcxODU0ICogKCBtYXRoLnNpbiggbGF0ICkpKSkpLCggMC4wNDExMzU5MjcgKSkpIDtcclxuICAgICAgICAgICAgICAgIHJobyA9IDYzNzgyMDYuNCAqIDEuODI5NzE0Mzg1MjA2MTc1NSAqIG1hdGgucG93KCB0LCAwLjc0NDUyMDMyODQ1MjkzNDMgKSxcclxuICAgICAgICAgICAgICAgIHRoZXRhID0gMC43NDQ1MjAzMjg0NTI5MzQzICogKCBsb24gLSAtMi4xMDg4ODEzMzUxOTE2ICksXHJcbiAgICAgICAgICAgICAgICB4ID0gKCByaG8gKiBtYXRoLnNpbiggdGhldGEgKSApICsgNDk5OTk4Ljk4NDEwMTYzMjUsXHJcbiAgICAgICAgICAgICAgICB5ID0gNTg1Mzk1OC45NjM5Njc1NTIgLSAoIHJobyAqIG1hdGguY29zKCB0aGV0YSApICk7IC8vIG1lcyBhZGQgeTAgP1xyXG4gICAgICAgICAgICAgICAgeCA9IHgqMy4yODA4NDtcclxuICAgICAgICAgICAgICAgIHkgPSB5KjMuMjgwODQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gWyB5LCB4IF07XHJcbiAgICAgICAgfSIsImltcG9ydCB7IEJhc2ljTGF5ZXIgfSBmcm9tIFwiLi9CYXNpY0xheWVyX2NsYXNzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzZVRpbGVMYXllciBleHRlbmRzIEJhc2ljTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc3JjLCB6SW5kZXgpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX196b29tID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbGVTcmMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGlsZVNpemUgPSAyNTY7XHJcbiAgICAgICAgdGhpcy50aWxlc0NhY2hlID0ge307XHJcbiAgICAgICAgdGhpcy50aWxlSW5mbyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50aWxlTG9hZE9yZGVyID0gW107XHJcbiAgICAgICAgdGhpcy5kZWxUaWxlc1RpbWVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmx2bExvYWRUaW1lID0geyBzdGFydDogMCwgZmluaXNoOiAxIH07XHJcbiAgICAgICAgdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMgPSB7IHg6IDAsIHk6IDAgfTtcclxuICAgICAgICB0aGlzLm1ha2VUaWxlID0gbWFrZVRpbGU7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0WmluZGV4KHpJbmRleCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0VGlsZVNyYyhzcmMpO1xyXG5cclxuICAgICAgICB0aGlzLm9uKFwiYWRkIGV2ZW50IGxpc3RlbmVyc1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24oXCJhcHBlbmRlZCB0byBtYXBcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWtlVGlsZUdyaWQoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbUVuZCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub24oXCJ1cGRhdGUgZXZlcnl0aGluZ1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VUaWxlR3JpZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFRpbGVzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXBDb250YWluZXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbUVuZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uKFwiem9vbSBkZWxheSBlbmRcIiwgdGhpcy56b29tRW5kLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbihcInByZSB6b29tIGVuZFwiLCAoKSA9PiB0aGlzLnN3YXBDb250YWluZXIoKSwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMub24oXCJwb3N0IHpvb20gZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRUaWxlcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcclxuICAgICAgICAgICAgICAgIFwicGFuXCIsXHJcbiAgICAgICAgICAgICAgICBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGUuY2xpZW50WCArIGUuY2xpZW50WSkgJSA3ID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IEJldHRlciB0aHJvdHRsaW5nLCB0aGlzIHdhcyBqdXN0IGEgdGhvdWdodCBleHBlcmltZW50LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0aGlzXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFwicGFuIGluaXRpYWxcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlbFRpbGVzVGltZXIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJwYW4gZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fX3pvb20gIT09IHRoaXMubWFwLnpvb20pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnpvb21FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsVGlsZXNUaW1lciA9IHNldFRpbWVvdXQodGhpcy5jbGVhckhpZGRlblRpbGVzLmJpbmQodGhpcyksIDExMDApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlSW5mbygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRoZSBtZXRob2QgJ2dldFRpbGVJbmZvJyBpbiBcIiArIHRoaXMuY29uc3RydWN0b3IubmFtZSArIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gXCJPdmVycmlkZSB0aGlzXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGlsZVB4bHMoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJUaGUgbWV0aG9kICdnZXRUaWxlUHhscycgaW4gXCIgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyBcIiB3YXNuJ3QgaW1wbGltZW50ZWRcIiwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIFwiT3ZlcnJpZGUgdGhpc1wiO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRpbGVTcmMoc3JjKSB7XHJcbiAgICAgICAgdGhpcy50aWxlU3JjID0gc3JjO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lcigpIHtcclxuICAgICAgICB0aGlzLnN3YXBDb250YWluZXIoKTtcclxuICAgICAgICB0aGlzLnJlc2V0VGlsZXMoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFySGlkZGVuVGlsZXMoKSB7XHJcbiAgICAgICAgLy8gVE9ETzogVGhpcyBpcyBoYWNrLCB0aGluayBvZiBzb21ldGhpbmcgYmV0dGVyLlxyXG4gICAgICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXModGhpcy50aWxlc0NhY2hlKTtcclxuICAgICAgICBsZXQgbWFpblJlY3QgPSB0aGlzLm1hcC5tYXBDb250YWluZXIuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBtYWluUmVjdC5YID0gbWFpblJlY3QueCArIG1haW5SZWN0LndpZHRoO1xyXG4gICAgICAgIG1haW5SZWN0LlkgPSBtYWluUmVjdC55ICsgbWFpblJlY3QuaGVpZ2h0O1xyXG5cclxuICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgbGV0IHRpbGUgPSB0aGlzLnRpbGVzQ2FjaGVba2V5XTtcclxuICAgICAgICAgICAgbGV0IHJlY3QgPSB0aWxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aWxlLmxvYWRlZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKCEocmVjdC54IDwgbWFpblJlY3QuWCAmJiByZWN0LnggKyByZWN0LndpZHRoID4gbWFpblJlY3QueCAmJlxyXG4gICAgICAgICAgICAgICAgcmVjdC55IDwgbWFpblJlY3QuWSAmJiByZWN0LnkgKyByZWN0LmhlaWdodCA+IG1haW5SZWN0LnkpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGlsZS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRpbGUpO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGlsZXNDYWNoZVtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRUaWxlcygpIHtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHRoaXMudG9wTGVmdE9mVmlzaWJsZUV4dGVudFRvUHhscygpO1xyXG5cclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54ID0gTWF0aC5mbG9vcih0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54KTtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55ID0gTWF0aC5mbG9vcih0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55KTtcclxuXHJcbiAgICAgICAgdGhpcy50aWxlc0NhY2hlID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZVRpbGVHcmlkKCkge1xyXG4gICAgICAgIGxldCBudW1UaWxlcyA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5jZWlsKHRoaXMubWFwLm1hcENvbnRhaW5lci53aWR0aCAvIHRoaXMudGlsZVNpemUpICsgMSxcclxuICAgICAgICAgICAgeTogTWF0aC5jZWlsKHRoaXMubWFwLm1hcENvbnRhaW5lci5oZWlnaHQgLyB0aGlzLnRpbGVTaXplKSArIDFcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsZXQgYXJ5ID0gW107XHJcbiAgICAgICAgbGV0IHZyeSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8PSBudW1UaWxlcy54OyB4KyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPD0gbnVtVGlsZXMueTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBhcnkucHVzaCh7IHg6IHgsIHk6IHkgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IG51bVRpbGVzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8PSBudW1UaWxlcy55OyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh5ICUgMiA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZyeS5wdXNoKGFyeS5zcGxpY2UoMCwgMSlbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdnJ5LnB1c2goYXJ5LnNwbGljZSgtMSwgMSlbMF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRpbGVMb2FkT3JkZXIgPSB2cnk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgbGV0IGdyaWRDZW50ZXIgPSB7XHJcbiAgICAgICAgICAgIHg6IG51bVRpbGVzLnggLyAyLFxyXG4gICAgICAgICAgICB5OiBudW1UaWxlcy55IC8gMlxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMudGlsZUxvYWRPcmRlciA9IGFyeS5zb3J0KChhLGIpID0+IHtcclxuICAgICAgICAgICAgLy8gQ29weSBsZWFmbGV0cyBpZGVhIGFuZCBoYXZlIHRoZSB0aWxlcyBzdGFydCBsb2FkaW5nIGZyb20gdGhlIGNlbnRlci4uXHJcbiAgICAgICAgICAgIGxldCBkaXN0QSA9IE1hdGguc3FydCgoZ3JpZENlbnRlci54IC0gYS54KSoqMiArIChncmlkQ2VudGVyLnkgLSBhLnkpKioyKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RCID0gTWF0aC5zcXJ0KChncmlkQ2VudGVyLnggLSBiLngpKioyICsgKGdyaWRDZW50ZXIueSAtIGIueSkqKjIpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGRpc3RCIC0gZGlzdEE7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgKi9cclxuICAgIH1cclxuXHJcbiAgICBjYWxjTHZsTG9hZFRpbWUoKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZygodGhpcy5sdmxMb2FkVGltZS5maW5pc2ggLSB0aGlzLnRpbGVTdGFydCkpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubHZsTG9hZFRpbWUuZmluaXNoIC0gdGhpcy5sdmxMb2FkVGltZS5zdGFydCB8fCAwO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgc3JjT2JqID0geyBcInt6fVwiOiB0aGlzLl9fem9vbSwgXCJ7eX1cIjogbnVsbCwgXCJ7eH1cIjogbnVsbCB9O1xyXG4gICAgICAgIGxldCBzcmNYWVN0cmluZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcbiAgICAgICAgbGV0IHRpbGVJbWcgPSBudWxsO1xyXG4gICAgICAgIGxldCB0aWxlWCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgdGlsZVkgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIHRoaXMudGlsZVN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbGV0IGV4dGVudCA9ICh0aGlzLnpvb21JbmRleCAmJiB0aGlzLnpvb21JbmRleFt0aGlzLl9fem9vbV0gJiZcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbUluZGV4W3RoaXMuX196b29tXS5leHRlbnQpIHx8IHt9O1xyXG5cclxuICAgICAgICBsZXQgcGFuTGVmdCA9IHRoaXMuY29udGFpbmVyLmxlZnQgKyB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgbGV0IHBhblRvcCA9IHRoaXMuY29udGFpbmVyLnRvcCArIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wO1xyXG5cclxuICAgICAgICBsZXQgdG9wTGVmdFRpbGUgPSB7XHJcbiAgICAgICAgICAgIHg6IE1hdGguZmxvb3IoKHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnggLSBwYW5MZWZ0KSAvIHRoaXMudGlsZVNpemUpLFxyXG4gICAgICAgICAgICB5OiBNYXRoLmZsb29yKCh0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55IC0gcGFuVG9wKSAvIHRoaXMudGlsZVNpemUpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHRvcExlZnRUaWxlUHhscyA9IHtcclxuICAgICAgICAgICAgeDogdG9wTGVmdFRpbGUueCAqIHRoaXMudGlsZVNpemUgLSB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54LFxyXG4gICAgICAgICAgICB5OiB0b3BMZWZ0VGlsZS55ICogdGhpcy50aWxlU2l6ZSAtIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBtID0gMDsgbSA8IHRoaXMudGlsZUxvYWRPcmRlci5sZW5ndGg7IG0rKykge1xyXG4gICAgICAgICAgICBzcmNPYmpbXCJ7eH1cIl0gPSB0b3BMZWZ0VGlsZS54ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLng7XHJcbiAgICAgICAgICAgIHNyY09ialtcInt5fVwiXSA9IHRvcExlZnRUaWxlLnkgKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueTtcclxuXHJcbiAgICAgICAgICAgIHNyY1hZU3RyaW5nID0gc3JjT2JqW1wie3h9XCJdICsgXCIsXCIgKyBzcmNPYmpbXCJ7eX1cIl07XHJcblxyXG4gICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKHRoaXMudGlsZXNDYWNoZVtzcmNYWVN0cmluZ10gfHxcclxuICAgICAgICAgICAgICAgIChzcmNPYmpbXCJ7eH1cIl0gPCBleHRlbnQueCB8fCBzcmNPYmpbXCJ7eH1cIl0gPiBleHRlbnQuWCB8fFxyXG4gICAgICAgICAgICAgICAgIHNyY09ialtcInt5fVwiXSA+IGV4dGVudC5ZIHx8IHNyY09ialtcInt5fVwiXSA8IGV4dGVudC55KSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aWxlWCA9IHRvcExlZnRUaWxlUHhscy54ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLnggKiB0aGlzLnRpbGVTaXplO1xyXG4gICAgICAgICAgICB0aWxlWSA9IHRvcExlZnRUaWxlUHhscy55ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLnkgKiB0aGlzLnRpbGVTaXplO1xyXG5cclxuICAgICAgICAgICAgdGlsZUltZyA9IHRoaXMubWFrZVRpbGUoe1xyXG4gICAgICAgICAgICAgICAgeDogdGlsZVgsXHJcbiAgICAgICAgICAgICAgICB5OiB0aWxlWSxcclxuICAgICAgICAgICAgICAgIHNyYzogdGhpcy50aWxlU3JjLnJlcGxhY2UoL3sufS9nLCBhcmcgPT4gc3JjT2JqW2FyZ10pXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50aWxlc0NhY2hlW3NyY1hZU3RyaW5nXSA9IHRpbGVJbWc7XHJcblxyXG4gICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0aWxlSW1nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlVGlsZShvYmopIHtcclxuICAgIGxldCB0aWxlSW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgIHRpbGVJbWcuY2xhc3NOYW1lID0gXCJ0aWxlSW1nXCI7XHJcbiAgICAvL3RpbGVJbWcuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246IGFic29sdXRlOyB0b3A6IFwiICsgdGlsZVkgKyBcInB4OyBsZWZ0OiBcIiArIHRpbGVYICsgXCJweDsgb3BhY2l0eTogMDtcIjtcclxuICAgIHRpbGVJbWcuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246IGFic29sdXRlOyBvcGFjaXR5OiAwO1wiO1xyXG4gICAgdGlsZUltZy5zdHlsZS50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZTNkKFwiICsgb2JqLnggKyBcInB4LFwiICsgb2JqLnkgKyBcInB4LCAwcHgpXCI7XHJcbiAgICAvL3RpbGVJbWcuc3R5bGUuYm94U2hhZG93ID0gXCIwcHggMHB4IDBweCAxcHggcmVkXCI7XHJcbiAgICB0aWxlSW1nLm9ubG9hZCA9IG1ha2VUaWxlT25Mb2FkO1xyXG4gICAgdGlsZUltZy5vbmVycm9yID0gbWFrZVRpbGVPbkVycm9yO1xyXG4gICAgdGlsZUltZy5zcmMgPSBvYmouc3JjO1xyXG5cclxuICAgIHJldHVybiB0aWxlSW1nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlVGlsZU9uTG9hZChlKSB7XHJcbiAgICB0aGlzLmxvYWRlZCA9IHRydWU7XHJcbiAgICB0aGlzLnN0eWxlLm9wYWNpdHkgPSAxO1xyXG4gICAgLy8gX19fdGhhdC50aWxlRmluaXNoID0gRGF0ZS5ub3coKTtcclxuICAgIC8vIF9fX3RoYXQubWFwLmV2ZW50LmZpcmUoJ3RpbGUgbG9hZGVkJywgdGhpcyk7Ly8gVG9kbzogdGVzdGluZyB0aGlzIGlkZWEuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ha2VUaWxlT25FcnJvcihlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiVGlsZSBkaWQgbm90IGxvYWRcIiwgZSk7XHJcbn1cclxuIiwiaW1wb3J0IHsgQmFzZVRpbGVMYXllciB9IGZyb20gXCIuL0Jhc2VUaWxlTGF5ZXJfY2xhc3NcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBcmNHSVNUaWxlTGF5ZXIgZXh0ZW5kcyBCYXNlVGlsZUxheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHNyYywgekluZGV4KSB7XHJcbiAgICAgICAgc3VwZXIoc3JjLCB6SW5kZXgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVJbmZvKCkge1xyXG4gICAgICAgIC8vIE92ZXJyaWRlIHRoaXMgZm9yIFdTRzg0LlxyXG4gICAgICAgIGxldCB2aXMgPSB0aGlzLm1hcC5leHRlbnQudmlzaWJsZTtcclxuICAgICAgICBsZXQgY29ybmVyID0gdGhpcy5nZXRDb250YWluaW5nQXJjVGlsZUNvb3Jkcyh0aGlzLm1hcC56b29tLCB7IHg6IHZpcy54LCB5OiB2aXMuWSB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNvcm5lcjtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICByZXR1cm46XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJvdzogdW5kZWZpbmVkLCAvLyBUaWxlIG51bWJlciB4IGNvb3JkaW5hdGUuXHJcbiAgICAgICAgICAgICAgICBjb2w6IHVuZGVmaW5lZCwgLy8gVGlsZSBudW1iZXIgeSBjb29yZGluYXRlLlxyXG4gICAgICAgICAgICAgICAgc3BYOiB1bmRlZmluZWQsIC8vIFRpbGUgdG9wIGxlZnQgY29ybmVyIHggY29vcmQgaW4gZGVmYXVsdCBjb29yZGluYXRlIHN5c3RlbSAoc3RhdGUgcGxhbmUgb3IgV1NHODQgc2hlcmljYWwgbWVyY2F0b3IpXHJcbiAgICAgICAgICAgICAgICBzcFk6IHVuZGVmaW5lZCAgLy8gVGlsZSB0b3AgbGVmdCBjb3JuZXIgeSBjb29yZCBcIiBcIiBcIi5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICovXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGlsZVB4bHMocG9pbnQpIHtcclxuICAgICAgICAvLyBPdmVycmlkZSB0aGlzIGZvciBXU0c4NC5cclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludChwb2ludCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29udGFpbmluZ0FyY1RpbGVDb29yZHMoeiwgYikge1xyXG4gICAgICAgIGxldCBkID0geyB4OiAtMS4xNzEwNDNlOCwgeTogMS4zNzk0OThlOCB9OyAvLyBUaGlzIG5lZWRzIHRvIGJlIGNoYW5nZWQuXHJcbiAgICAgICAgbGV0IHpvb21JID0gdGhpcy56b29tSW5kZXhbel07XHJcblxyXG4gICAgICAgIGxldCBjb2xSb3cgPSB7XHJcbiAgICAgICAgICAgIHJvdzogTWF0aC5mbG9vcigoZC55IC0gYi55KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkucmVzb2x1dGlvbikpLFxyXG4gICAgICAgICAgICBjb2w6IE1hdGguZmxvb3IoKGIueCAtIGQueCkgLyAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pKSxcclxuICAgICAgICAgICAgc3BYOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIHNwWTogdW5kZWZpbmVkXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29sUm93LnNwWCA9IGNvbFJvdy5jb2wgKiAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pICsgZC54O1xyXG4gICAgICAgIGNvbFJvdy5zcFkgPSBkLnkgLSBjb2xSb3cucm93ICogKHRoaXMudGlsZVNpemUgKiB6b29tSS5yZXNvbHV0aW9uKTtcclxuICAgICAgICAvL2NvbFJvdy5wZXJjZW50WCA9IGNvbFJvdy5jb2wgLSAoYi54IC0gZC54KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkuUmVzb2x1dGlvbik7XHJcbiAgICAgICAgLy9jb2xSb3cucGVyY2VudFkgPSBjb2xSb3cucm93IC0gKGQueSAtIGIueSkgLyAodGhpcy50aWxlU2l6ZSAqIHpvb21JLlJlc29sdXRpb24pO1xyXG5cclxuICAgICAgICByZXR1cm4gY29sUm93O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7IEJhc2VUaWxlTGF5ZXIgfSBmcm9tIFwiLi9CYXNlVGlsZUxheWVyX2NsYXNzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3BoZXJpY2FsTWVyY2F0b3JUaWxlTGF5ZXIgZXh0ZW5kcyBCYXNlVGlsZUxheWVyIHtcclxuICAgIC8vIGh0dHBzOi8vanNiaW4uY29tL2plaGF0aXBhZ3UvNi9lZGl0P2h0bWwsY3NzLGpzLG91dHB1dFxyXG4gICAgY29uc3RydWN0b3Ioc3JjLCB6SW5kZXgpIHtcclxuICAgICAgICBzdXBlcihzcmMsIHpJbmRleCk7XHJcbiAgICAgICAgdGhpcy5ib3VuZCA9IDIwMDM3NTA4LjM0Mjc4OTI0NDsvLyBNYXRoLlBJICogcmFkaXVzIG9mIGVhcnRoXHJcbiAgICB9XHJcblxyXG4gICAgdG9wTGVmdE9mVmlzaWJsZUV4dGVudFRvUHhscyhvcHRfem9vbSl7XHJcbiAgICAgICAgLy8gUmV0dXJucyB0b3AgbGVmdCBvZiB0aWxlIGluIHNjcmVlbiBwaXhlbCBjb29yZHMsIHNvIHRoYXQgaXQgY2FuIGJlIHNlZW4gb24gdGhlIG1vbml0b3IuXHJcbiAgICAgICAgbGV0IHZpcyA9IHRoaXMubWFwLmV4dGVudC52aXNpYmxlO1xyXG4gICAgICAgIGxldCB2aXNQb2ludCA9IHsgeDogdmlzLngsIHk6IHZpcy5ZIH07XHJcbiAgICAgICAgbGV0IGNvbnRhaW5lckNvcm5lciA9IHRoaXMuZ2V0UHhsc0Zyb21Ub3BMZWZ0T3JpZ2luKHZpc1BvaW50LCBvcHRfem9vbSk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcInNmZFwiLCBjb250YWluZXJDb3JuZXIpXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogY29udGFpbmVyQ29ybmVyLngsXHJcbiAgICAgICAgICAgIHk6IGNvbnRhaW5lckNvcm5lci55LFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0UHhsc0Zyb21Ub3BMZWZ0T3JpZ2luKHNtUG9pbnQsIG9wdF96b29tKSB7XHJcbiAgICAgICAgLy8gUmV0dXJucyBwaXhlbHMgZnJvbSAwLDAgdGlsZSBvcmlnaW4gYWthIHRoZSB0b3AgbGVmdCBvZiB0aGUgd29ybGQuXHJcbiAgICAgICAgbGV0IGJvdW5kID0gMjAwMzc1MDguMzQyNzg5MjQ0O1xyXG4gICAgICAgIGxldCBwaXhlbHMgPSB0aGlzLnRpbGVTaXplICogTWF0aC5wb3coMiwgb3B0X3pvb20gfHwgdGhpcy5tYXAuem9vbSApLzI7XHJcblxyXG4gICAgICAgIHZhciBwb2ludFhSYXRpbyA9IHNtUG9pbnQueCAvICgtYm91bmQpO1xyXG4gICAgICAgIHZhciBwb2ludFlSYXRpbyA9IHNtUG9pbnQueSAvIChib3VuZCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IChwaXhlbHMpICAqICgxLXBvaW50WFJhdGlvKSxcclxuICAgICAgICAgICAgeTogKHBpeGVscykgKiAoMS1wb2ludFlSYXRpbyksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBUcmFuc2Zvcm1hdGlvbihhLCBiLCBjLCBkKSB7XHJcbiAgICAvLyBUcmFuc2Zvcm1hdGlvbiBjb25zdHJ1Y3RvciBjb3BpZWQgZnJvbSBMZWFmbGV0LmpzXHJcbiAgIFxyXG4gICAgLy8gaWYgKFV0aWwuaXNBcnJheShhKSkge1xyXG4gICAgLy8gICAgIC8vIHVzZSBhcnJheSBwcm9wZXJ0aWVzXHJcbiAgICAvLyAgICAgdGhpcy5fYSA9IGFbMF07XHJcbiAgICAvLyAgICAgdGhpcy5fYiA9IGFbMV07XHJcbiAgICAvLyAgICAgdGhpcy5fYyA9IGFbMl07XHJcbiAgICAvLyAgICAgdGhpcy5fZCA9IGFbM107XHJcbiAgICAvLyAgICAgcmV0dXJuO1xyXG4gICAgLy8gfVxyXG4gICAgdGhpcy5fYSA9IGE7XHJcbiAgICB0aGlzLl9iID0gYjtcclxuICAgIHRoaXMuX2MgPSBjO1xyXG4gICAgdGhpcy5fZCA9IGQ7XHJcbn1cclxuXHJcblRyYW5zZm9ybWF0aW9uLnByb3RvdHlwZSA9IHtcclxuICAgIC8vIEBtZXRob2QgdHJhbnNmb3JtKHBvaW50OiBQb2ludCwgc2NhbGU/OiBOdW1iZXIpOiBQb2ludFxyXG4gICAgLy8gUmV0dXJucyBhIHRyYW5zZm9ybWVkIHBvaW50LCBvcHRpb25hbGx5IG11bHRpcGxpZWQgYnkgdGhlIGdpdmVuIHNjYWxlLlxyXG4gICAgLy8gT25seSBhY2NlcHRzIGFjdHVhbCBgTC5Qb2ludGAgaW5zdGFuY2VzLCBub3QgYXJyYXlzLlxyXG4gICAgdHJhbnNmb3JtOiBmdW5jdGlvbiAocG9pbnQsIHNjYWxlKSB7IC8vIChQb2ludCwgTnVtYmVyKSAtPiBQb2ludFxyXG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm0ocG9pbnQuY2xvbmUoKSwgc2NhbGUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBkZXN0cnVjdGl2ZSB0cmFuc2Zvcm0gKGZhc3RlcilcclxuICAgIF90cmFuc2Zvcm06IGZ1bmN0aW9uIChwb2ludCwgc2NhbGUpIHtcclxuICAgICAgICBzY2FsZSA9IHNjYWxlIHx8IDE7XHJcbiAgICAgICAgcG9pbnQueCA9IHNjYWxlICogKHRoaXMuX2EgKiBwb2ludC54ICsgdGhpcy5fYik7XHJcbiAgICAgICAgcG9pbnQueSA9IHNjYWxlICogKHRoaXMuX2MgKiBwb2ludC55ICsgdGhpcy5fZCk7XHJcbiAgICAgICAgcmV0dXJuIHBvaW50O1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBAbWV0aG9kIHVudHJhbnNmb3JtKHBvaW50OiBQb2ludCwgc2NhbGU/OiBOdW1iZXIpOiBQb2ludFxyXG4gICAgLy8gUmV0dXJucyB0aGUgcmV2ZXJzZSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgZ2l2ZW4gcG9pbnQsIG9wdGlvbmFsbHkgZGl2aWRlZFxyXG4gICAgLy8gYnkgdGhlIGdpdmVuIHNjYWxlLiBPbmx5IGFjY2VwdHMgYWN0dWFsIGBMLlBvaW50YCBpbnN0YW5jZXMsIG5vdCBhcnJheXMuXHJcbiAgICB1bnRyYW5zZm9ybTogZnVuY3Rpb24gKHBvaW50LCBzY2FsZSkge1xyXG4gICAgICAgIHNjYWxlID0gc2NhbGUgfHwgMTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICB4OiAocG9pbnQueCAvIHNjYWxlIC0gdGhpcy5fYikgLyB0aGlzLl9hLFxyXG4gICAgICAgICAgICAgICB5OiAocG9pbnQueSAvIHNjYWxlIC0gdGhpcy5fZCkgLyB0aGlzLl9jXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCBsZXQgdHJhbnNmb3JtYXRpb24gPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzY2FsZSA9IDAuNSAvIChNYXRoLlBJICogNjM3ODEzNyk7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhuZXcgVHJhbnNmb3JtYXRpb24oc2NhbGUsIDAuNSwgLXNjYWxlLCAwLjUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgVHJhbnNmb3JtYXRpb24oc2NhbGUsIDAuNSwgLXNjYWxlLCAwLjUpO1xyXG4gICAgfSgpKTtcclxuIiwiaW1wb3J0IHsgTmV3TWFwIH0gZnJvbSBcIi4vTWFpbl9jbGFzc1wiO1xyXG5pbXBvcnQgeyB0cmFuc2Zvcm1hdGlvbiB9IGZyb20gXCIuL1NwaGVyaWNhbE1lcmNhdG9yVGlsZUxheWVyX2NsYXNzLmpzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9Qb2ludCh4LCB5KSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh4KSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IHhbMF0sXHJcbiAgICAgICAgICAgIHk6IHhbMV1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgaWYgKHggPT09IE9iamVjdCh4KSkge1xyXG4gICAgICAgIC8vaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODUxMTI4MS9jaGVjay1pZi1hLXZhbHVlLWlzLWFuLW9iamVjdC1pbi1qYXZhc2NyaXB0XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogeC54IHx8IHguWCxcclxuICAgICAgICAgICAgeTogeC55IHx8IHguWVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHgsXHJcbiAgICAgICAgeTogeVxyXG4gICAgfTtcclxufVxyXG5cclxuTmV3TWFwLnByb3RvdHlwZS50b1BvaW50ID0gdG9Qb2ludDtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludCA9IGZ1bmN0aW9uKHNwUG9pbnQpIHtcclxuICAgIHZhciB4UmF0aW8gPSB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAvICh0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLngpLCAvLyBGb3IgcGF0aHMuXHJcbiAgICAgICAgeVJhdGlvID0gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0IC8gKHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueSk7IC8vIEZvciBwYXRocy5cclxuICAgIC8vdmFyIHJlc29sdXRpb24gPSB0aGlzLnpvb21JbmRleFt0aGlzLnpvb21dLnJlc29sdXRpb247XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyh4UmF0aW8sIHJlc29sdXRpb24sIChzcFBvaW50LnggLSB0aGlzLmV4dGVudC52aXNpYmxlLngpICogeFJhdGlvKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogKHNwUG9pbnQueCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCkgKiB4UmF0aW8sXHJcbiAgICAgICAgeTogKHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHNwUG9pbnQueSkgKiB5UmF0aW9cclxuICAgIH07XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmNvbnZlcnRQcm9qUG9pbnRUb09mZnNldFBpeGVsUG9pbnQgPSBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgdmFyIHNjcmVlblBvaW50ID0gdGhpcy5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50KHBvaW50KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHNjcmVlblBvaW50LnggLSB0aGlzLm1haW5Db250YWluZXIubGVmdCxcclxuICAgICAgICB5OiBzY3JlZW5Qb2ludC55IC0gdGhpcy5tYWluQ29udGFpbmVyLnRvcFxyXG4gICAgfTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24gPSBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgdmFyIHNwV2lkdGggPSB0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLng7XHJcbiAgICB2YXIgc3BIZWlnaHQgPSB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSB0aGlzLmV4dGVudC52aXNpYmxlLnk7XHJcblxyXG4gICAgdmFyIG9yaWdpbkxSID0gcG9pbnQueCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgdmFyIG9yaWdpblRCID0gcG9pbnQueSAvIHRoaXMubWFwQ29udGFpbmVyLmhlaWdodDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHRoaXMuZXh0ZW50LnZpc2libGUueCArIHNwV2lkdGggKiBvcmlnaW5MUixcclxuICAgICAgICB5OiB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSBzcEhlaWdodCAqIG9yaWdpblRCXHJcbiAgICB9O1xyXG59O1xyXG5cclxuLy8gQ29udmVydCBzdGF0ZSBwbGFuZSBjb29yZGluYXRlcyB0byB3Z3MgODQgY29vcmRpbmF0ZXMuLi5JJ20gZ3Vlc3NpbmcgYW55d2F5LCBub3Qgc3VyZS5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTUFRvV0dTODQoc3BQb2ludCkge1xyXG4gICAgdmFyIHVYID0gc3BQb2ludC54LFxyXG4gICAgICAgIHVZID0gc3BQb2ludC55O1xyXG4gICAgLy8gQ29waWVkIGZyb20gc2NvcGkhIEhvdyBhYm91dCB0aGF0IVxyXG4gICAgdmFyIHNxcnQgPSB3aW5kb3cuTWF0aC5zcXJ0LFxyXG4gICAgICAgIHBvdyA9IHdpbmRvdy5NYXRoLnBvdyxcclxuICAgICAgICBhdGFuID0gd2luZG93Lk1hdGguYXRhbixcclxuICAgICAgICBzaW4gPSB3aW5kb3cuTWF0aC5zaW4sXHJcbiAgICAgICAgYWJzID0gd2luZG93Lk1hdGguYWJzLFxyXG4gICAgICAgIHBhcnQxID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHJobyA9IHVuZGVmaW5lZCxcclxuICAgICAgICB0aGV0YSA9IHVuZGVmaW5lZCxcclxuICAgICAgICB0eHkgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgbG9uID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIGxhdDAgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgbGF0MSA9IHVuZGVmaW5lZCxcclxuICAgICAgICBMYXQgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgTG9uID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIHVYID0gdVggLSAxNjQwNDE2LjY2NjY2NjY2NztcclxuICAgIHVZID0gdVkgLSAwO1xyXG4gICAgcmhvID0gc3FydChwb3codVgsIDIpICsgcG93KDE5MjA1MzA5Ljk2ODg4NDg0IC0gdVksIDIpKTtcclxuICAgIHRoZXRhID0gYXRhbih1WCAvICgxOTIwNTMwOS45Njg4ODQ4NCAtIHVZKSk7XHJcbiAgICB0eHkgPSBwb3cocmhvIC8gKDIwOTI1NjQ2LjAgKiAxLjgyOTc1MjEwODg4MjkyODUpLCAxIC8gMC43NDQ1MjAzMjY1NTQyOTM5KTtcclxuICAgIGxvbiA9IHRoZXRhIC8gMC43NDQ1MjAzMjY1NTQyOTM5ICsgLTIuMTA4OTM5NTEyODMzMzMyNjtcclxuICAgIHVYID0gdVggKyAxNjQwNDE2LjY2NjY2NjY2NztcclxuICAgIGxhdDAgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyICogYXRhbih0eHkpO1xyXG4gICAgcGFydDEgPSAoMSAtIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpIC8gKDEgKyAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKTtcclxuICAgIGxhdDEgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyICogYXRhbih0eHkgKiBwb3cocGFydDEsIDAuMDgxODE5MDU3ODIgLyAyKSk7XHJcbiAgICB3aGlsZSAoYWJzKGxhdDEgLSBsYXQwKSA+IDAuMDAwMDAwMDAyKSB7XHJcbiAgICAgICAgbGF0MCA9IGxhdDE7XHJcbiAgICAgICAgcGFydDEgPSAoMSAtIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpIC8gKDEgKyAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKTtcclxuICAgICAgICBsYXQxID0gMS41NzA3OTYzMjY3OTQ4OTY2IC0gMiAqIGF0YW4odHh5ICogcG93KHBhcnQxLCAwLjA4MTgxOTA1NzgyIC8gMikpO1xyXG4gICAgfVxyXG4gICAgTGF0ID0gbGF0MSAvIDAuMDE3NDUzMjkyNTI7XHJcbiAgICBMb24gPSBsb24gLyAwLjAxNzQ1MzI5MjUyO1xyXG4gICAgcmV0dXJuIHsgbGF0OiBMYXQsIGxuZzogTG9uIH07XHJcbn1cclxuXHJcbk5ld01hcC5wcm90b3R5cGUuY29udmVydFNQVG9XR1M4NCA9IGNvbnZlcnRTUFRvV0dTODQ7XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBjb252ZXJ0U1AodVgsIHVZKSB7XHJcbiAgICAvLyBDb3BpZWQgZnJvbSBTQ09QSSBmb3IgZnV0dXJlIHVzZS4gSGFzIG5vdCBiZWVuIG1vZGlmaWVkIGZyb20gU0NPUEkuXHJcblxyXG4gICAgLy89MjA5MjU2MDQuMDA7ICAgICAgICAgLy8gbWFqb3IgcmFkaXVzIG9mIGVsbGlwc29pZCwgbWFwIHVuaXRzIChOQUQgODMpIGluIGZlZXQ/XHJcbiAgICBhID0gMjA5MjU2NDYuMDsgLy8gc2VlIGh0dHA6Ly9kYnd3dy5lc3NjLnBzdS5lZHUvbGFzZG9jL292ZXJ2aWV3L2dlb21yZWcvYXBwZS5odG1sXHJcbiAgICAvLz0yMDkyNTYwNC40ODsgICAgICAgICAvLyBtb3JlIGFjY3VyYXRlID9cclxuICAgIC8vPTIwODU1NDg2LjU5OyAgICAgICAgIC8vIG1pbm9yIHJhZGl1c1xyXG4gICAgZWMgPSAwLjA4MTgxOTA1NzgyOyAvLyBlY2NlbnRyaWNpdHkgb2YgZWxsaXBzb2lkIChOQUQgODMpXHJcbiAgICAvLyA9IDAuMDA2Njk0MzQ5NjsgICAgICAvLyBzZWUgaHR0cDovL2Rid3d3LmVzc2MucHN1LmVkdS9sYXNkb2Mvb3ZlcnZpZXcvZ2VvbXJlZy9hcHBlLmh0bWxcclxuICAgIGFuZ1JhZCA9IDAuMDE3NDUzMjkyNTI7IC8vIG51bWJlciBvZiByYWRpYW5zIGluIGEgZGVncmVlXHJcbiAgICBwaTQgPSBNYXRoLlBJIC8gNDtcclxuICAgIC8vQm91bGRlciBDb3VudHksIENPXHJcbiAgICAvL3AwID0gMzkuMzMzMzMzICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2Ygb3JpZ2luXHJcbiAgICAvL3AxID0gMzkuNzE2NjY3ICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2YgZmlyc3Qgc3RhbmRhcmQgcGFyYWxsZWwgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1zb3V0aD8pXHJcbiAgICAvL3AyID0gNDAuNzgzMzMzICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2Ygc2Vjb25kIHN0YW5kYXJkIHBhcmFsbGVsICAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLW5vcnRoPylcclxuICAgIC8vbTAgPSAtMTA1LjUgKiBhbmdSYWQ7ICAgICAvLyBjZW50cmFsIG1lcmlkaWFuIChha2EgbG9uZ2l0dWRlIG9mIG9yaWdpbilcclxuICAgIC8veDAgPSAzMDAwMDAwLjAwMDAwMDsgICAgICAvLyBmYWxzZSBlYXN0aW5nIG9mIGNlbnRyYWwgbWVyaWRpYW4sIG1hcCB1bml0c1xyXG4gICAgLy95MCA9IDEwMDAwMDAuMDAwMDAwOyAgICAgIC8vIGZhbHNlIG5vcnRoaW5nXHJcbiAgICAvL1Nub2hvbWlzaCBDb3VudHksIFdBXHJcbiAgICBwMCA9IDQ3LjAgKiBhbmdSYWQ7IC8vIGxhdGl0dWRlIG9mIG9yaWdpblxyXG4gICAgcDEgPSA0Ny41ICogYW5nUmFkOyAvLyBsYXRpdHVkZSBvZiBmaXJzdCBzdGFuZGFyZCBwYXJhbGxlbCAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLXNvdXRoPylcclxuICAgIHAyID0gNDguNzMzMzMzMzMzMzMzMzMgKiBhbmdSYWQ7IC8vIGxhdGl0dWRlIG9mIHNlY29uZCBzdGFuZGFyZCBwYXJhbGxlbCAgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1ub3J0aD8pXHJcbiAgICBtMCA9IC0xMjAuODMzMzMzMzMzMzMzMyAqIGFuZ1JhZDsgLy8gY2VudHJhbCBtZXJpZGlhbiAoYWthIGxvbmdpdHVkZSBvZiBvcmlnaW4pXHJcbiAgICB4MCA9IDE2NDA0MTYuNjY2NjY2NjY3OyAvLyBmYWxzZSBlYXN0aW5nIG9mIGNlbnRyYWwgbWVyaWRpYW4sIG1hcCB1bml0c1xyXG4gICAgeTAgPSAwLjA7IC8vIGZhbHNlIG5vcnRoaW5nXHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBjb29yZGluYXRlIHN5c3RlbSBjb25zdGFudHMuXHJcbiAgICB3aXRoIChNYXRoKSB7XHJcbiAgICAgICAgbTEgPSBjb3MocDEpIC8gc3FydCgxIC0gcG93KGVjLCAyKSAqIHBvdyhzaW4ocDEpLCAyKSk7XHJcbiAgICAgICAgbTIgPSBjb3MocDIpIC8gc3FydCgxIC0gcG93KGVjLCAyKSAqIHBvdyhzaW4ocDIpLCAyKSk7XHJcbiAgICAgICAgdDAgPSB0YW4ocGk0IC0gcDAgLyAyKTtcclxuICAgICAgICB0MSA9IHRhbihwaTQgLSBwMSAvIDIpO1xyXG4gICAgICAgIHQyID0gdGFuKHBpNCAtIHAyIC8gMik7XHJcbiAgICAgICAgdDAgPSB0MCAvIHBvdygoMSAtIGVjICogc2luKHAwKSkgLyAoMSArIGVjICogc2luKHAwKSksIGVjIC8gMik7XHJcbiAgICAgICAgdDEgPSB0MSAvIHBvdygoMSAtIGVjICogc2luKHAxKSkgLyAoMSArIGVjICogc2luKHAxKSksIGVjIC8gMik7XHJcbiAgICAgICAgdDIgPSB0MiAvIHBvdygoMSAtIGVjICogc2luKHAyKSkgLyAoMSArIGVjICogc2luKHAyKSksIGVjIC8gMik7XHJcbiAgICAgICAgbiA9IGxvZyhtMSAvIG0yKSAvIGxvZyh0MSAvIHQyKTtcclxuICAgICAgICBmID0gbTEgLyAobiAqIHBvdyh0MSwgbikpO1xyXG4gICAgICAgIHJobzAgPSBhICogZiAqIHBvdyh0MCwgbik7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGNvb3JkaW5hdGUgdG8gTGF0aXR1ZGUvTG9uZ2l0dWRlLlxyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIExvbmdpdHVkZS5cclxuICAgICAgICB1WCA9IHVYIC0geDA7XHJcbiAgICAgICAgdVkgPSB1WSAtIHkwOyAvLyBtZXMgYWRkZWQgZmFsc2Ugbm9ydGhpbmcgYXBwbGllcyBpbiAwNTAxICg/KVxyXG4gICAgICAgIHBpMiA9IHBpNCAqIDI7XHJcblxyXG4gICAgICAgIHJobyA9IHNxcnQocG93KHVYLCAyKSArIHBvdyhyaG8wIC0gdVksIDIpKTtcclxuICAgICAgICB0aGV0YSA9IGF0YW4odVggLyAocmhvMCAtIHVZKSk7XHJcbiAgICAgICAgdHh5ID0gcG93KHJobyAvIChhICogZiksIDEgLyBuKTtcclxuICAgICAgICBsb24gPSB0aGV0YSAvIG4gKyBtMDtcclxuICAgICAgICB1WCA9IHVYICsgeDA7XHJcblxyXG4gICAgICAgIC8vIEVzdGltYXRlIHRoZSBMYXRpdHVkZVxyXG4gICAgICAgIGxhdDAgPSBwaTIgLSAyICogYXRhbih0eHkpO1xyXG5cclxuICAgICAgICAvLyBTdWJzdGl0dXRlIHRoZSBlc3RpbWF0ZSBpbnRvIHRoZSBpdGVyYXRpdmUgY2FsY3VsYXRpb24gdGhhdFxyXG4gICAgICAgIC8vIGNvbnZlcmdlcyBvbiB0aGUgY29ycmVjdCBMYXRpdHVkZSB2YWx1ZS5cclxuICAgICAgICBwYXJ0MSA9ICgxIC0gZWMgKiBzaW4obGF0MCkpIC8gKDEgKyBlYyAqIHNpbihsYXQwKSk7XHJcbiAgICAgICAgbGF0MSA9IHBpMiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgZWMgLyAyKSk7XHJcblxyXG4gICAgICAgIHdoaWxlIChhYnMobGF0MSAtIGxhdDApID4gMC4wMDAwMDAwMDIpIHtcclxuICAgICAgICAgICAgbGF0MCA9IGxhdDE7XHJcbiAgICAgICAgICAgIHBhcnQxID0gKDEgLSBlYyAqIHNpbihsYXQwKSkgLyAoMSArIGVjICogc2luKGxhdDApKTtcclxuICAgICAgICAgICAgbGF0MSA9IHBpMiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgZWMgLyAyKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGZyb20gcmFkaWFucyB0byBkZWdyZWVzLlxyXG4gICAgICAgIExhdCA9IGxhdDEgLyBhbmdSYWQ7XHJcbiAgICAgICAgTG9uID0gbG9uIC8gYW5nUmFkO1xyXG5cclxuICAgICAgICAvL3R1cm4gXCIgICBMb25naXR1ZGU6IFwiK0xvbitcIiAgIExhdGl0dWRlOiBcIitMYXQ7XHJcbiAgICAgICAgcmV0dXJuIFwiTGF0aXR1ZGU6IFwiICsgbWludXRlcyhMYXQpICsgXCIgTiAgIExvbmdpdHVkZTogLVwiICsgbWludXRlcyhMb24pICsgXCIgVyAoYXBwcm94aW1hdGUgY29vcmRpbmF0ZXMpXCI7XHJcbiAgICB9XHJcbn1cclxuXHJcbiovXHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmNvbnZlcnRXR1M4NFByb2plY3Rpb25Ub1dHUzg0TGF0TG9uID0gZnVuY3Rpb24obWVyY2F0b3IpIHtcclxuICAgIC8vIGh0dHBzOi8vZ2lzLnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy82OTIwOC90cnlpbmctdG8tY29udmVydC1jb29yZGluYXRlcy1mcm9tLXdnczg0LXdlYi1tZXJjYXRvci1hdXhpbGlhcnktc3BoZXJlLXRvLXdnczg0XHJcbiAgICAvLyBodHRwczovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9NZXJjYXRvciNKYXZhXHJcbiAgICAvLyAgICAgICAgIGlmIChNYXRoLmFicyhtZXJjYXRvclswXSkgPCAxODAgJiYgTWF0aC5BYnMobWVyY2F0b3JbMV0pIDwgOTApXHJcbiAgICAvLyAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgLy8gICAgICAgICBpZiAoKE1hdGguQWJzKG1lcmNhdG9yWzBdKSA+IDIwMDM3NTA4LjM0Mjc4OTIpIHx8IChNYXRoLkFicyhtZXJjYXRvclsxXSkgPiAyMDAzNzUwOC4zNDI3ODkyKSlcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICB2YXIgeCA9IG1lcmNhdG9yWzBdO1xyXG4gICAgdmFyIHkgPSBtZXJjYXRvclsxXTtcclxuICAgIHZhciBudW0zID0geCAvIDYzNzgxMzcuMDtcclxuICAgIHZhciBudW00ID0gbnVtMyAqIDU3LjI5NTc3OTUxMzA4MjMyMztcclxuICAgIHZhciBudW01ID0gTWF0aC5mbG9vcigobnVtNCArIDE4MC4wKSAvIDM2MC4wKTtcclxuICAgIHZhciBudW02ID0gbnVtNCAtIG51bTUgKiAzNjAuMDtcclxuICAgIHZhciBudW03ID0gMS41NzA3OTYzMjY3OTQ4OTY2IC0gMi4wICogTWF0aC5hdGFuKE1hdGguZXhwKC0xLjAgKiB5IC8gNjM3ODEzNy4wKSk7XHJcbiAgICBtZXJjYXRvclswXSA9IG51bTY7XHJcbiAgICBtZXJjYXRvclsxXSA9IG51bTcgKiA1Ny4yOTU3Nzk1MTMwODIzMjM7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLm1pbnV0ZXMgPSBmdW5jdGlvbihudW0pIHtcclxuICAgIC8vIEZvciBjb252ZXJ0aW5nIGNvbnZlcnRTUFRvV0dTODQoeCx5KSBwb2ludHMgdG8gbWludXRlcywgYWxzbyBib3Jyb3dlZCBmcm9tIFNjb3BpIVxyXG4gICAgbnVtID0gTWF0aC5hYnMobnVtKTtcclxuICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3IobnVtKTtcclxuICAgIHZhciBkZWNpbWFsID0gbnVtIC0gZmxvb3I7XHJcbiAgICB2YXIgbWludXRlcyA9IDYwICogZGVjaW1hbDtcclxuICAgIHZhciBmbG9vcjIgPSBNYXRoLmZsb29yKG1pbnV0ZXMpO1xyXG4gICAgZGVjaW1hbCA9IG1pbnV0ZXMgLSBmbG9vcjI7XHJcbiAgICB2YXIgc2Vjb25kcyA9IDYwICogZGVjaW1hbDtcclxuICAgIC8vciBmbG9vcjMgPSBNYXRoLnJvdW5kKHNlY29uZHMpO1xyXG4gICAgc2Vjb25kcyAqPSAxMDA7XHJcbiAgICBzZWNvbmRzID0gTWF0aC5yb3VuZChzZWNvbmRzKTtcclxuICAgIHNlY29uZHMgLz0gMTAwOyAvLyBhY2N1cmF0ZSB0byAyIGRlY2ltYWwgcGxhY2VzXHJcbiAgICByZXR1cm4gZmxvb3IgKyBcIlxcdTAwQjAgXCIgKyBmbG9vcjIgKyBcIlxcdTIwMzIgXCIgKyBzZWNvbmRzICsgXCJcXHUyMDMzXCI7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLnVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeURpc3RhbmNlID0gZnVuY3Rpb24oZGlzdGFuY2VYLCBkaXN0YW5jZVksIHNwQ29vcmRzKSB7XHJcbiAgICB2YXIgc3BXaWR0aCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueDtcclxuICAgIHZhciBzcEhlaWdodCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueTtcclxuXHJcbiAgICB2YXIgeFJhdGlvID0gc3BXaWR0aCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgdmFyIHlSYXRpbyA9IHNwSGVpZ2h0IC8gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0O1xyXG5cclxuICAgIHZhciBsZWZ0ID0gZGlzdGFuY2VYICogeFJhdGlvO1xyXG4gICAgdmFyIHRvcCA9IDAgLSBkaXN0YW5jZVkgKiB5UmF0aW87XHJcblxyXG4gICAgaWYgKHNwQ29vcmRzKSB7XHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZS54ID0gc3BDb29yZHMueCAtPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWCA9IHNwQ29vcmRzLlggLT0gbGVmdDtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgPSBzcENvb3Jkcy55IC09IHRvcDtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLlkgPSBzcENvb3Jkcy5ZIC09IHRvcDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS54IC09IGxlZnQ7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlggLT0gbGVmdDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUueSAtPSB0b3A7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlkgLT0gdG9wO1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS51cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZTEgPSBmdW5jdGlvbihfeCwgX3ksIHNwQ29vcmRzKSB7XHJcbiAgICBsZXQgcmVzb2x1dGlvbiA9IHRoaXMuZ2V0UmVzb2x1dGlvbih0aGlzLnpvb20pO1xyXG4gICAgbGV0IF9feCA9IF94ICogcmVzb2x1dGlvbjtcclxuICAgIGxldCBfX3kgPSBfeSAqIHJlc29sdXRpb247XHJcbmNvbnNvbGUubG9nKF94KVxyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS54ICs9IF9feDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWCArPSBfX3g7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgKz0gX195O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5ZICs9IF9feTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5T3JpZ2luID0gZnVuY3Rpb24ocF9vcmlnaW4sIHBfc2NhbGUpIHtcclxuICAgIHZhciBzcFdpZHRoID0gdGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54O1xyXG4gICAgdmFyIHNwSGVpZ2h0ID0gdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55O1xyXG5cclxuICAgIGlmIChwX3NjYWxlID09PSAyKSB7XHJcbiAgICAgICAgc3BXaWR0aCA9IHNwV2lkdGggKiAtKDEgLyBwX3NjYWxlKTtcclxuICAgICAgICBzcEhlaWdodCA9IHNwSGVpZ2h0ICogLSgxIC8gcF9zY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS54IC09IHNwV2lkdGggKiBwX29yaWdpbi54O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5YICs9IHNwV2lkdGggKiAoMSAtIHBfb3JpZ2luLngpO1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS55IC09IHNwSGVpZ2h0ICogcF9vcmlnaW4ueTtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSArPSBzcEhlaWdodCAqICgxIC0gcF9vcmlnaW4ueSk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLmV4dGVudC52aXNpYmxlKTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUudXBkYXRlVmlzRXh0ZW50QnlPcmlnaW5BbmRSZXNvbHV0aW9uID0gZnVuY3Rpb24ocF9vcmlnaW4sIHBfc2NhbGUsIHBfcmVzb2x1dGlvbikge1xyXG4gICAgbGV0IHZpcyA9IHRoaXMuZXh0ZW50LnZpc2libGU7XHJcbiAgICAvL2xldCByZXNvbHV0aW9uID0gdGhpcy5nZXRSZXNvbHV0aW9uKHBfem9vbSk7XHJcbiAgICBsZXQgc3BXaWR0aCA9IHRoaXMubWFwQ29udGFpbmVyLndpZHRoICogcF9yZXNvbHV0aW9uO1xyXG4gICAgbGV0IHNwSGVpZ2h0ID0gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0ICogcF9yZXNvbHV0aW9uO1xyXG5cclxuICAgIGxldCByYXRpb1ggPSAodmlzLlggLSBwX29yaWdpbi54ICkgLyAodmlzLlggLSB2aXMueCk7XHJcbiAgICBsZXQgcmF0aW9ZID0gKHZpcy5ZIC0gcF9vcmlnaW4ueSkgLyAodmlzLlkgLSB2aXMueSk7XHJcblxyXG4gICAgaWYgKHBfc2NhbGUgPj0gMSkge1xyXG4gICAgICAgIHBfc2NhbGUgPSBwX3NjYWxlIC0gMTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcF9zY2FsZSA9IC0oMSAtIHBfc2NhbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHZpcy5YIC09IHNwV2lkdGggKiBwX3NjYWxlICogcmF0aW9YO1xyXG4gICAgdmlzLnggPSB2aXMuWCAtIHNwV2lkdGg7XHJcbiAgICB2aXMuWSAtPSBzcEhlaWdodCAqIHBfc2NhbGUgKiByYXRpb1k7XHJcbiAgICB2aXMueSA9IHZpcy5ZIC0gc3BIZWlnaHQ7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lciA9IGZ1bmN0aW9uKHBvaW50KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBvaW50LnggLSB0aGlzLm1hcENvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHBvaW50LnkgLSB0aGlzLm1hcENvbnRhaW5lci50b3BcclxuICAgIH07XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLmdldFBhbk9mZnNldFBvaW50ID0gZnVuY3Rpb24ocG9pbnQpIHtcclxuICAgIHZhciBwYW5PZmZzZXRYID0gdGhpcy5tYWluQ29udGFpbmVyLmxlZnQ7IC8vKyB0aGlzLm1hcEltZy5sZWZ0OyAvLyBTaG91bGQgYmUgemVybyBpZiBub3QgcGFubmluZy5cclxuICAgIHZhciBwYW5PZmZzZXRZID0gdGhpcy5tYWluQ29udGFpbmVyLnRvcDsgLy8rIHRoaXMubWFwSW1nLnRvcDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBvaW50LnggLSBwYW5PZmZzZXRYLCAvLyBUaGlzIHdpbGwgc2V0IHRoZSBvcmlnaW4gdG8pLzJ0aGUgY2VudGVyIC0+IC0gdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyO1xyXG4gICAgICAgIHk6IHBvaW50LnkgLSBwYW5PZmZzZXRZXHJcbiAgICB9O1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5kaXN0YW5jZUJldHdlZW4gPSBmdW5jdGlvbihhLCBiKSB7XHJcbiAgICAvLyBHb29kIG9sZCBweXRoYWdvcmVhbiB0aGVvcmVtLlxyXG4gICAgcmV0dXJuIE1hdGguc3FydChNYXRoLnBvdyhiWzBdIC0gYVswXSwgMikgKyBNYXRoLnBvdyhiWzFdIC0gYVsxXSwgMikpO1xyXG59O1xyXG5cclxuTmV3TWFwLnByb3RvdHlwZS5jb252ZXJ0U1BUb1dHUzg0UHJvaiA9IGZ1bmN0aW9uKHNwUG9pbnQpIHtcclxuICAgIGxldCB3c2c4NUxhdExvbiA9IHRoaXMuY29udmVydFNQVG9XR1M4NChzcFBvaW50KTtcclxuICAgIC8vY29uc29sZS5sb2cod3NnODVMYXRMb24sIHRoaXMuTGVhZmxldFNwaGVyaWNhbE1lcmNhdG9yLnByb2plY3Qod3NnODVMYXRMb24pKTtcclxuICAgIHJldHVybiB0aGlzLkxlYWZsZXRTcGhlcmljYWxNZXJjYXRvci5wcm9qZWN0RnJvbVdTRzg0R2VvKHdzZzg1TGF0TG9uKTtcclxufTtcclxuXHJcbk5ld01hcC5wcm90b3R5cGUuZ2V0UmVzb2x1dGlvbiA9IGZ1bmN0aW9uKHpvb20pIHtcclxuICAgIGlmICh0aGlzLnpvb21JbmRleCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnpvb21JbmRleFt6b29tXS5yZXNvbHV0aW9uO1xyXG4gICAgfVxyXG4gICAgLy8gV1NHODQgU3BoZXJpY2FsIE1lcmNhdG9yLlxyXG4gICAgLy8gbGV0IEVhcnRoUmFkaXVzID0gNjM3ODEzNztcclxuICAgIC8vIGxldCBSYWRpdXN4UGkgPSBNYXRoLlBJICogRWFydGhSYWRpdXM7XHJcbiAgICAvLyBsZXQgUGl4ZWxzQXRab29tID0gMjU2ICogTWF0aC5wb3coMiwgem9vbSk7XHJcbiAgICAvLyBsZXQgZGVnUGVyTWV0ZXIgPSBSYWRpdXN4UGkgKiAyIC8gRWFydGhSYWRpdXM7XHJcbiAgICAvLyBsZXQgZGVnUGVyUGl4ZWwgPSBFYXJ0aFJhZGl1cyAvIFBpeGVsc0F0Wm9vbSAqIGRlZ1Blck1ldGVyO1xyXG4gICAgdmFyIHBpeGVscyA9IDI1NiAqIE1hdGgucG93KDIsIHpvb20pIC8gMjtcclxuICAgIHZhciBleHRlbnQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7XHJcbiAgICB2YXIgcmVzID0gZXh0ZW50IC8gcGl4ZWxzO1xyXG5cclxuICAgIHJldHVybiByZXM7XHJcbn07XHJcblxyXG5OZXdNYXAucHJvdG90eXBlLkxlYWZsZXRTcGhlcmljYWxNZXJjYXRvciA9IHtcclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9MZWFmbGV0L0xlYWZsZXQvYmxvYi9tYXN0ZXIvc3JjL2dlby9wcm9qZWN0aW9uL1Byb2plY3Rpb24uU3BoZXJpY2FsTWVyY2F0b3IuanNcclxuICAgIC8vIGh0dHBzOi8vZ2lzLnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy85MjkwNy9yZS1wcm9qZWN0LXJhc3Rlci1pbWFnZS1mcm9tLW1lcmNhdG9yLXRvLWVxdWlyZWN0YW5ndWxhclxyXG4gICAgLy8gaHR0cHM6Ly93aWtpLm9wZW5zdHJlZXRtYXAub3JnL3dpa2kvU2xpcHB5X21hcF90aWxlbmFtZXNcclxuICAgIFJBRElVUzogNjM3ODEzNyxcclxuICAgIE1BWF9MQVRJVFVERTogODUuMDUxMTI4Nzc5OCxcclxuICAgIEJPVU5EOiAyMDAzNzUwOC4zNDI3ODkyNDQsIC8vMjAwMzc1MDguMzQyNzg5MjQ0IFRPRE86IFwiQk9VTkRcIiBpcyBwcm9iYWJseSBub3QgdGhlIGNvcnJlY3QgdGVybS5cclxuXHJcbiAgICBwcm9qZWN0RnJvbVdTRzg0R2VvOiBmdW5jdGlvbihsYXRsbmcpIHtcclxuICAgICAgICB2YXIgZCA9IE1hdGguUEkgLyAxODAsXHJcbiAgICAgICAgICAgIG1heCA9IHRoaXMuTUFYX0xBVElUVURFLFxyXG4gICAgICAgICAgICBsYXQgPSBNYXRoLm1heChNYXRoLm1pbihtYXgsIGxhdGxuZy5sYXQpLCAtbWF4KSxcclxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4obGF0ICogZCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IHRoaXMuUkFESVVTICogbGF0bG5nLmxuZyAqIGQsXHJcbiAgICAgICAgICAgIHk6IHRoaXMuUkFESVVTICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSAvIDJcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuXHJcbiAgICBwcm9qZWN0VG9XU0c4NEdlbzogZnVuY3Rpb24ocG9pbnQpIHtcclxuICAgICAgICB2YXIgZCA9IDE4MCAvIE1hdGguUEksXHJcbiAgICAgICAgICAgIFIgPSB0aGlzLlJBRElVUztcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbGF0OiAoMiAqIE1hdGguYXRhbihNYXRoLmV4cChwb2ludC55IC8gUikpIC0gTWF0aC5QSSAvIDIpICogZCxcclxuICAgICAgICAgICAgbG5nOiBwb2ludC54ICogZCAvIFJcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxufTtcclxuXHJcbi8qXHJcbmh0dHBzOi8vbGVhZmxldGpzLmNvbS9leGFtcGxlcy9xdWljay1zdGFydC9leGFtcGxlLmh0bWxcclxuXHJcbnZhciBkdmkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwaWQnKS5jbG9uZU5vZGUoKTtcclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcGlkJykucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwaWQnKSk7XHJcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZHZpKTtcclxuXHJcbnZhciBzY3JpcHR0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XHJcbiAgICBzY3JpcHR0LnNyYyA9ICdodHRwczovL3VucGtnLmNvbS9sZWFmbGV0QDEuMy40L2Rpc3QvbGVhZmxldC1zcmMuanMnO1xyXG4gICAgc2NyaXB0dC5jcm9zc09yaWdpbiA9IHRydWU7XHJcbmRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0dCk7XHJcblxyXG5cclxuXHJcbm15bWFwID0gTC5tYXAoJ21hcGlkJykuc2V0VmlldyhbMCwgMF0sIDEzKTtcclxubXltYXAub24oJ2NsaWNrJywgb25NYXBDbGljaylcclxuXHJcbiAgICBMLnRpbGVMYXllcignaHR0cHM6Ly9hcGkudGlsZXMubWFwYm94LmNvbS92NC97aWR9L3t6fS97eH0ve3l9LnBuZz9hY2Nlc3NfdG9rZW49cGsuZXlKMUlqb2liV0Z3WW05NElpd2lZU0k2SW1OcGVqWTROWFZ5Y1RBMmVtWXljWEJuZEhScWNtWjNOM2dpZlEuckpjRklHMjE0QXJpSVNMYkI2QjVhdycsIHtcclxuICAgICAgICBtYXhab29tOiAxOCxcclxuICAgICAgICBhdHRyaWJ1dGlvbjogJ01hcCBkYXRhICZjb3B5OyA8YSBocmVmPVwiaHR0cHM6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvXCI+T3BlblN0cmVldE1hcDwvYT4gY29udHJpYnV0b3JzLCAnICtcclxuICAgICAgICAgICAgJzxhIGhyZWY9XCJodHRwczovL2NyZWF0aXZlY29tbW9ucy5vcmcvbGljZW5zZXMvYnktc2EvMi4wL1wiPkNDLUJZLVNBPC9hPiwgJyArXHJcbiAgICAgICAgICAgICdJbWFnZXJ5IMKpIDxhIGhyZWY9XCJodHRwczovL3d3dy5tYXBib3guY29tL1wiPk1hcGJveDwvYT4nLFxyXG4gICAgICAgIGlkOiAnbWFwYm94LnN0cmVldHMnXHJcbiAgICB9KS5hZGRUbyhteW1hcCk7XHJcblxyXG4gICAgTC5tYXJrZXIoWzAsIDBdKS5hZGRUbyhteW1hcClcclxuICAgICAgICAuYmluZFBvcHVwKFwiPGI+SGVsbG8gd29ybGQhPC9iPjxiciAvPkkgYW0gYSBwb3B1cC5cIikub3BlblBvcHVwKCk7XHJcblxyXG5cclxuXHJcbnBvcHVwID0gTC5wb3B1cCgpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uTWFwQ2xpY2soZSkge1xyXG4gICAgICAgIHBvcHVwXHJcbiAgICAgICAgICAgIC5zZXRMYXRMbmcoZS5sYXRsbmcpXHJcbiAgICAgICAgICAgIC5zZXRDb250ZW50KFwiWW91IGNsaWNrZWQgdGhlIG1hcCBhdCBcIiArIGUubGF0bG5nLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgIC5vcGVuT24obXltYXApO1xyXG4gICAgfVxyXG5cclxuXHJcblxyXG4qL1xyXG4iLCJpbXBvcnQgeyBCYXNpY0ludGVyYWN0aXZlRWxlbWVudCB9IGZyb20gXCIuL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzXCI7XHJcbmltcG9ydCB7IHRvUG9pbnQsIGNvbnZlcnRTUFRvV0dTODQgfSBmcm9tIFwiLi9jb29yZGluYXRlX21vZHVsZVwiO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tIFwiLi91dGlscy5qc1wiO1xyXG5cclxuLy9pbXBvcnQgeyBOZXdNYXAgfSBmcm9tIFwiLi9NYWluX2NsYXNzXCI7XHJcbi8vbGV0IG1ya3IgPSB7fTtcclxuXHJcbi8vdmFyIG1hcmtlcl9tb2R1bGUgPSBmdW5jdGlvbih0aGlzTWFwKSB7XHJcbi8vXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfbWFya2VyQ291bnRlciA9IDA7XHJcblxyXG4vL3RoaXNNYXAubWFrZU1hcmtlciA9IG1ha2VNYXJrZXI7XHJcbi8vdGhpc01hcC5tYWtlUG9wdXAgPSBtYWtlUG9wdXA7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFya2VyQmFzaWNzIGV4dGVuZHMgQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnQge1xyXG4gICAgY29uc3RydWN0b3IoZWxlbSkge1xyXG4gICAgICAgIHN1cGVyKGVsZW0pO1xyXG5cclxuICAgICAgICBlbGVtLnN0eWxlLmJvdHRvbSA9IFwiMHB4XCI7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW07XHJcblxyXG4gICAgICAgIHRoaXMub2Zmc2V0UG9zID0geyB4OiAwLCB5OiAwIH07XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJjbGlja1wiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLm9uKFwiYXBwZW5kZWRUb01hcFwiLCBlID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJ6b29tIGVuZFwiLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInVwZGF0ZSBldmVyeXRoaW5nXCIsIHRoaXMuX3pvb21FbmRDYWxsYmFjaywgdGhpcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFwcGVuZGVkVG9NYXAgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRDb29yZHMoc3BQb2ludCkge1xyXG4gICAgICAgIHNwUG9pbnQgPSB0b1BvaW50KHNwUG9pbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRlUGxhbmVQb2ludCA9IHNwUG9pbnQ7XHJcblxyXG4gICAgICAgIHRoaXMuekluZGV4ID0gMWU2IC0gdGhpcy5zdGF0ZVBsYW5lUG9pbnQueS50b0ZpeGVkKDApO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS56SW5kZXggPSB0aGlzLnpJbmRleDtcclxuXHJcbiAgICAgICAgdGhpcy53Z3M4NFhQb2ludCA9IGNvbnZlcnRTUFRvV0dTODQoc3BQb2ludC54LCBzcFBvaW50LnkpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUG9zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzZXRPZmZzZXRQb3MocG9pbnQpIHtcclxuICAgICAgICB0aGlzLm9mZnNldFBvcyA9IHRoaXMubWFwLnRvUG9pbnQocG9pbnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRUb01hcChhcmdfbWFwKSB7XHJcbiAgICAgICAgbGV0IHRoaXNNYXJrZXIgPSB0aGlzO1xyXG4gICAgICAgIGxldCBtYXAgPSBhcmdfbWFwO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuc3RhdGVQbGFuZVBvaW50LngpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJTZXQgY29vcmRpbmF0ZXMgYmVmb3JlIGFwcGVuZGluZyBtYXJrZXIuXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAgPSBhcmdfbWFwO1xyXG5cclxuICAgICAgICBtYXAuYWRkVG8odGhpcy5lbGVtZW50LCBtYXAubWFya2VyQ29udGFpbmVyLmVsZW1lbnQsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgdGhpc01hcmtlci5maXJlKFwiYXBwZW5kZWRUb01hcFwiLCBlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZFRvTWFwKHRoaXMubWFwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcclxuICAgICAgICAgICAgdGhpcy5hcHBlbmRlZFRvTWFwID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZihcIm1hcCBsb2FkIGVuZFwiLCB0aGlzLnVwZGF0ZVBvcywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub2ZmKFwiem9vbSBlbmRcIiwgdGhpcy5fem9vbUVuZENhbGxiYWNrLCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21FbmRDYWxsYmFjayhlKSB7XHJcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IChlLmNzcyAmJiBlLmNzcy5jbGFzc05hbWUpIHx8IFwibWFya2VyX3pvb21fdHJhbnNpdGlvblwiO1xyXG5cclxuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG5cclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tQW5pbVRpbWVyKTtcclxuICAgICAgICB0aGlzLnpvb21BbmltVGltZXIgPSBzZXRUaW1lb3V0KHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlLmJpbmQodGhpcy5lbGVtZW50LmNsYXNzTGlzdCwgY2xhc3NOYW1lKSwgMzUwKTtcclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUoKSB7XHJcbiAgICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgdGhpcy5kZWxldGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiZGVsZXRlXCIsIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHBhbkludG9WaWV3KCkge1xyXG4gICAgICAgIGlmICghdGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcywgXCI8LSBUaGF0IGhhcyB0byBiZSBhZGRlZCB0byBhIG1hcCBiZWZvcmUgY2FsbGluZyBwYW5JbnRvVmlldygpLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtYXBDb250ID0gdGhpcy5tYXAubWFwQ29udGFpbmVyO1xyXG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIHZhciBwYWRkaW5nID0gNTtcclxuICAgICAgICB2YXIgcG9pbnQgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHJcbiAgICAgICAgaWYgKHJlY3QudG9wIDwgbWFwQ29udC50b3AgKyA1KSB7XHJcbiAgICAgICAgICAgIHBvaW50LnkgPSBtYXBDb250LnRvcCAtIHJlY3QudG9wICsgNTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZWN0LmxlZnQgPCBtYXBDb250LmxlZnQgKyBwYWRkaW5nKSB7XHJcbiAgICAgICAgICAgIHBvaW50LnggPSBtYXBDb250LmxlZnQgLSByZWN0LmxlZnQgKyBwYWRkaW5nO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVjdC5sZWZ0ICsgcmVjdC53aWR0aCA+IG1hcENvbnQubGVmdCArIG1hcENvbnQud2lkdGggLSBwYWRkaW5nKSB7XHJcbiAgICAgICAgICAgIHBvaW50LnggPSBtYXBDb250LmxlZnQgKyBtYXBDb250LndpZHRoIC0gKHJlY3QubGVmdCArIHJlY3Qud2lkdGgpIC0gcGFkZGluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwb2ludC54IHx8IHBvaW50LnkpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAucGFubmluZ19tb2R1bGUucGFuQnlQaXhlbHMocG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVQb3MoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFwcGVuZGVkVG9NYXApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJwcmVVcGRhdGVQb3NcIiwgdGhpcyk7XHJcblxyXG4gICAgICAgIHZhciBwb2ludCA9IHRoaXMubWFwLmNvbnZlcnRQcm9qUG9pbnRUb09mZnNldFBpeGVsUG9pbnQodGhpcy5zdGF0ZVBsYW5lUG9pbnQpO1xyXG5cclxuICAgICAgICBwb2ludC54ID0gfn4ocG9pbnQueCArIHRoaXMub2Zmc2V0UG9zLngpO1xyXG4gICAgICAgIHBvaW50LnkgPSB+fihwb2ludC55ICsgdGhpcy5vZmZzZXRQb3MueSk7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlKFwiICsgcG9pbnQueCArIFwicHgsIFwiICsgcG9pbnQueSArIFwicHgpXCI7XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZShcInBvc3RVcGRhdGVQb3NcIiwgdGhpcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWFrZU1hcmtlciBleHRlbmRzIE1hcmtlckJhc2ljcyB7XHJcbiAgICBjb25zdHJ1Y3RvcihwX3NwUG9pbnQsIG9wdGlvbnMpIHtcclxuICAgICAgICBsZXQgX29wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG9mZnNldDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBwb3B1cEFuY2hvcjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBtYXJrZXJFbGVtZW50OiBiYXNpY01hcmtlcigpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgT2JqZWN0LmFzc2lnbihfb3B0aW9ucywgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHN1cGVyKF9vcHRpb25zLm1hcmtlckVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBfb3B0aW9ucztcclxuXHJcbiAgICAgICAgcF9zcFBvaW50ID0gcF9zcFBvaW50ID8gdG9Qb2ludChwX3NwUG9pbnQpIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHBfc3BQb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldENvb3JkcyhwX3NwUG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwb3B1cChvcHRfaHRtbCwgb3B0X29mZnNldFBvaW50KSB7XHJcbiAgICAgICAgdmFyIG1hcmtlciA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IG9wdF9vZmZzZXRQb2ludCB8fCBfb3B0aW9ucy5wb3B1cEFuY2hvciB8fCBbMCwgLTEwMF07XHJcblxyXG4gICAgICAgIG1hcmtlci5wb3B1cCA9IG1ha2VQb3B1cChvcHRfaHRtbCwgbnVsbCwgb2Zmc2V0KVxyXG4gICAgICAgICAgICAuc2V0Q29vcmRzKG1hcmtlci5zdGF0ZVBsYW5lUG9pbnQpXHJcbiAgICAgICAgICAgIC5hZGRUb01hcChtYXJrZXIubWFwKTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwLm9uKFwiZGVsZXRlXCIsIG1hcmtlci5kZWxldGUuYmluZChtYXJrZXIpKTtcclxuXHJcbiAgICAgICAgbWFya2VyLnNob3dQb3B1cCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAobWFya2VyLmFwcGVuZGVkVG9NYXApIHtcclxuICAgICAgICAgICAgICAgIGlmIChtYXJrZXIucG9wdXAuZWxlbWVudC5wYXJlbnROb2RlKXtcclxuICAgICAgICAgICAgICAgIG1hcmtlci5wb3B1cC51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG1hcmtlci5wb3B1cC5hZGRUb01hcChtYXJrZXIubWFwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbWFya2VyLm9uKFwiYXBwZW5kZWRUb01hcFwiLCBmdW5jdGlvbiBfZm5fKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuc2hvd1BvcHVwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLm9mZihcImFwcGVuZGVkVG9NYXBcIiwgX2ZuXyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIG1hcmtlci5oaWRlUG9wdXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgbWFya2VyLnBvcHVwLmhpZGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBtYXJrZXIucG9wdXAuc2hvdyA9IG1hcmtlci5zaG93UG9wdXA7XHJcblxyXG4gICAgICAgIG1hcmtlci5zZXRQb3B1cE1lc3NhZ2UgPSBtYXJrZXIucG9wdXAuc2V0TWVzc2FnZTtcclxuXHJcbiAgICAgICAgbWFya2VyLnNob3dQb3B1cCgpO1xyXG5cclxuICAgICAgICByZXR1cm4gbWFya2VyLnBvcHVwO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1hcmtlcihwX3NwUG9pbnQsIG9wdGlvbnMpIHtcclxuICAgIHJldHVybiBuZXcgTWFrZU1hcmtlciguLi5hcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVBvcHVwKG9wdF9tZXNzYWdlLCBvcHRfc3BQb2ludCwgb3B0X2FuY2hvck9mZnNldCA9IFswLCAwXSkge1xyXG4gICAgLy9vcHRfYW5jaG9yT2Zmc2V0ID0gb3B0X2FuY2hvck9mZnNldCB8fCBbMCwwXTtcclxuXHJcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgZWwuY2xhc3NOYW1lID0gXCJwb3B1cFBhcmVudFwiO1xyXG5cclxuICAgIGxldCBwb3B1cCA9IG5ldyBNYXJrZXJCYXNpY3MoZWwpO1xyXG5cclxuICAgIGlmIChvcHRfc3BQb2ludCkge1xyXG4gICAgICAgIHBvcHVwLnNldENvb3Jkcyh0b1BvaW50KG9wdF9zcFBvaW50KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcG9wdXAub2Zmc2V0UG9zID0gdG9Qb2ludChvcHRfYW5jaG9yT2Zmc2V0KTtcclxuXHJcbiAgICBwb3B1cC5tZXNzYWdlID0gb3B0X21lc3NhZ2U7XHJcblxyXG4gICAgcG9wdXAub24oXCJhcHBlbmRlZFRvTWFwXCIsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBwb3B1cC5vbihwb3B1cC5tYXAuTU9VU0VfV0hFRUxfRVZULCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBwb3B1cC5vbihcInByZVVwZGF0ZVBvc1wiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgcG9wdXAuc2V0T2ZmU2V0TGVmdFRvcCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcG9wdXAuc2V0T2ZmU2V0TGVmdFRvcCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGxldCBlbCA9IHRoaXMuZWxlbWVudDtcclxuICAgICAgICBlbC5zdHlsZS5sZWZ0ID0gLShlbC5vZmZzZXRXaWR0aCAvIDIpICsgXCJweFwiO1xyXG4gICAgICAgIGVsLnN0eWxlLmJvdHRvbSA9IHBvcHVwLmFycm93Lm9mZnNldEhlaWdodCArIFwicHhcIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIHBvcHVwO1xyXG4gICAgfTtcclxuXHJcbiAgICBwb3B1cC5zZXRNZXNzYWdlID0gZnVuY3Rpb24ob3B0X21lc3NhZ2UpIHtcclxuICAgICAgICBwb3B1cC5tZXNzYWdlQ29udGFpbmVyLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0X21lc3NhZ2UgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgcG9wdXAubWVzc2FnZUNvbnRhaW5lci5pbm5lckhUTUwgPSBvcHRfbWVzc2FnZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwb3B1cC5tZXNzYWdlQ29udGFpbmVyLmFwcGVuZENoaWxkKG9wdF9tZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBvcHVwLm1lc3NhZ2UgPSBvcHRfbWVzc2FnZTtcclxuXHJcbiAgICAgICAgcG9wdXAudXBkYXRlUG9zKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBwb3B1cDtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGRlbGV0ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkZWxldGVCdXR0b24uY2xhc3NOYW1lID0gXCJtYXJrZXJEZWxldGVCdXR0b25cIjtcclxuICAgIGRlbGV0ZUJ1dHRvbi5pbm5lckhUTUwgPSBcIiYjMjE1O1wiO1xyXG4gICAgZGVsZXRlQnV0dG9uLnBvcHVwID0gcG9wdXA7XHJcbiAgICBwb3B1cC5kZWxldGVCdXR0b24gPSBkZWxldGVCdXR0b247XHJcbiAgICBkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBvcHVwLmRlbGV0ZS5iaW5kKHBvcHVwKSk7XHJcbiAgICBlbC5hcHBlbmRDaGlsZChkZWxldGVCdXR0b24pO1xyXG5cclxuICAgIHZhciBtZXNzYWdlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIG1lc3NhZ2VDb250YWluZXIuaW5uZXJIVE1MID0gb3B0X21lc3NhZ2UgfHwgXCJcIjtcclxuICAgIG1lc3NhZ2VDb250YWluZXIuY2xhc3NOYW1lID0gXCJtZXNzYWdlQ29udGFpbmVyXCI7XHJcbiAgICBtZXNzYWdlQ29udGFpbmVyLnN0eWxlLmNvbG9yID0gXCJibGFja1wiO1xyXG4gICAgbWVzc2FnZUNvbnRhaW5lci5wb3B1cCA9IHBvcHVwO1xyXG4gICAgcG9wdXAubWVzc2FnZUNvbnRhaW5lciA9IG1lc3NhZ2VDb250YWluZXI7XHJcbiAgICBlbC5hcHBlbmRDaGlsZChtZXNzYWdlQ29udGFpbmVyKTtcclxuXHJcbiAgICB2YXIgYXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgYXJyb3cuY2xhc3NOYW1lID0gXCJtYXJrZXJBcnJvd1wiO1xyXG4gICAgcG9wdXAuYXJyb3cgPSBhcnJvdztcclxuICAgIGVsLmFwcGVuZENoaWxkKGFycm93KTtcclxuXHJcbiAgICB2YXIgaW5uZXJBcnJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBpbm5lckFycm93LmNsYXNzTmFtZSA9IFwibWFya2VySW5uZXJBcnJvd1wiO1xyXG4gICAgcG9wdXAuaW5uZXJBcnJvdyA9IGlubmVyQXJyb3c7XHJcbiAgICBhcnJvdy5hcHBlbmRDaGlsZChpbm5lckFycm93KTtcclxuXHJcbiAgICByZXR1cm4gcG9wdXA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJhc2ljTWFya2VyKCkge1xyXG4gICAgdmFyIG1hcmtlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICBtYXJrZXIuc3JjID0gXCJodHRwczovL3VucGtnLmNvbS9sZWFmbGV0QDEuMy4xL2Rpc3QvaW1hZ2VzL21hcmtlci1pY29uLnBuZ1wiO1xyXG4gICAgLy8gaW1nLnN0eWxlLndpZHRoID0gJzE0MCUnO1xyXG5cclxuICAgIC8vbWFya2VyLmFwcGVuZENoaWxkKGltZyk7XHJcblxyXG4gICAgbWFya2VyLmlkID0gXCJtYXJrZXJfXCIgKyBfbWFya2VyQ291bnRlcisrO1xyXG4gICAgLy8gdG9kbzogUHV0IHRoaXMgaW4gYSBzdHlsZSBzaGVldC5cclxuICAgIG1hcmtlci5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcclxuICAgIG1hcmtlci5zdHlsZS5sZWZ0ID0gXCItMTJweFwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmJvdHRvbSA9IFwiMHB4XCI7XHJcbiAgICBtYXJrZXIuc3R5bGUudHJhbnNmb3JtID0gXCJcIjtcclxuICAgIG1hcmtlci5zdHlsZS5jb2xvciA9IFwid2hpdGVcIjtcclxuICAgIG1hcmtlci5zdHlsZS5mb250U2l6ZSA9IFwiMTVweFwiO1xyXG4gICAgbWFya2VyLnN0eWxlLndpbGxDaGFuZ2UgPSBcInRyYW5zZm9ybVwiO1xyXG4gICAgLy8gbWFya2VyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI2VhNDMzNVwiO1xyXG4gICAgLy8gbWFya2VyLnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcbiAgICAvL21hcmtlci5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPVxyXG4gICAgLy8gICAgICAgJ3VybChcImh0dHA6Ly93d3cuc25vY28ub3JnL2RvY3Mvc2FzL3Bob3Rvcy8wMDU5LzAwNTk1ODAwMDAzNDAwUjAxMS5qcGdcIiknO1xyXG4gICAgLy8gbWFya2VyLnN0eWxlLmJveFNoYWRvdyA9IFwiMHB4IDBweCAwcHggMXB4IHJnYigyNTUsMjU1LDI1NSlcIjtcclxuICAgIG1hcmtlci5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjUwcHhcIjtcclxuICAgIG1hcmtlci5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjtcclxuICAgIG1hcmtlci5zdHlsZS50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xyXG4gICAgbWFya2VyLmNsYXNzTmFtZSA9IFwibWFya2VyUGFyZW50M1wiO1xyXG4gICAgLy9tYXJrZXIuc3R5bGUuaGVpZ2h0ID0gXCIyMHB4XCI7XHJcbiAgICAvL21hcmtlci5zdHlsZS53aWR0aCA9IFwiMjBweFwiO1xyXG4gICAgbWFya2VyLnN0eWxlLmxpbmVIZWlnaHQgPSBcIjIwcHhcIjtcclxuXHJcbiAgICByZXR1cm4gbWFya2VyO1xyXG59XHJcbiIsImltcG9ydCB7TmV3TWFwfSBmcm9tICcuL01haW5fY2xhc3MnO1xyXG5cclxuT2JqZWN0LmFzc2lnbihcclxuICAgIE5ld01hcC5wcm90b3R5cGUsXHJcbiAgICBib3hab29tX21vdXNlRG93bixcclxuICAgIGJveFpvb21fbW91c2VVcCxcclxuICAgIGJveFpvb21fZG9ab29tLFxyXG4gICAgYm94Wm9vbV9tb3VzZU1vdmUsXHJcbiAgICBib3hab29tQ2VudGVyX21vdXNlTW92ZSxcclxuKTtcclxuXHJcbmZ1bmN0aW9uIGJveFpvb21fbW91c2VEb3duKGUpIHtcclxuICAgIGlmICh0aGlzLmJveFpvb20pIHtcclxuICAgICAgICB0aGlzLmJveFpvb20gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGJveFpvb20pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLmRpc2FibGVQYW5uaW5nKCk7XHJcblxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAvLyBUT0RPOiBNYWtlIGJveFpvb20gaXQncyBvd24gb2JqZWN0IHdpdGggYSBlbGVtZW50IHByb3BlcnR5LCBpbnN0ZWFkIG9mIFxyXG4gICAgLy8gICAgICAgYWRkaW5nIHByb3BlcnRpZXMgdG8gdGhlIGh0bWwgZWxlbWVudCBpdHNlbGYuXHJcbiAgICB0aGlzLmJveFpvb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIHRoaXMuYm94Wm9vbS5pZCA9ICdib3hab29tJztcclxuICAgIHRoaXMuYm94Wm9vbS5jbGFzc05hbWUgPSAnYm94Wm9vbSc7XHJcblxyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuaWQgPSAnYm94Wm9vbUNlbnRlcic7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuY2xhc3NOYW1lID0gJ2JveFpvb21DZW50ZXInO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICdwb3NpdGlvbjphYnNvbHV0ZTsgdG9wOjBweDsgbGVmdDowcHg7IHdpZHRoOiA1cHg7IGhlaWdodDogNXB4OyBib3JkZXI6IDFweCBzb2xpZCByZWQ7JztcclxuXHJcbiAgICB0aGlzLmJveFpvb20uYXBwZW5kQ2hpbGQodGhpcy5ib3hab29tQ2VudGVyKTtcclxuXHJcbiAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5pbnNlcnRCZWZvcmUoXHJcbiAgICAgICAgdGhpcy5ib3hab29tLFxyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQsXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5vZmZzZXQgPSB7XHJcbiAgICAgICAgeDogdGhpcy5tYXBDb250YWluZXIubGVmdCArIHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHRoaXMubWFwQ29udGFpbmVyLnRvcCArIHRoaXMubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5sZWZ0ID0gZS5jbGllbnRYIC0gYm94Wm9vbS5vZmZzZXQueCArICdweCc7XHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID0gZS5jbGllbnRZIC0gYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUuekluZGV4ID0gNTAwO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdGFydCA9IHtcclxuICAgICAgICB4OiBlLmNsaWVudFgsXHJcbiAgICAgICAgeTogZS5jbGllbnRZLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnBhZ2VIYXNGb2N1cyA9IHRydWU7XHJcblxyXG4gICAgLy8gVE9ETzogQ2hhbmdlIG5hbWUgb2YgbW91c2UgbW92ZSBhbmQgbW91c2UgdXAgZXZlbnRsaXN0ZW5lcnMuXHJcbiAgICB0aGlzLmJveFpvb20ubXYgPSBlID0+IHRoaXMuYm94Wm9vbV9tb3VzZU1vdmUoZSk7XHJcbiAgICB0aGlzLmJveFpvb20ubXVwID0gZSA9PiB0aGlzLmJveFpvb21fbW91c2VVcChlKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmJveFpvb20ubXYpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm94Wm9vbS5tdXApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tX21vdXNlTW92ZShlKSB7XHJcbiAgICBpZiAoZS5jbGllbnRYID4gdGhpcy5ib3hab29tLnN0YXJ0LngpIHtcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUubGVmdCA9XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdGFydC54IC0gdGhpcy5ib3hab29tLm9mZnNldC54ICsgJ3B4JztcclxuICAgICAgICBpZiAoZS5jbGllbnRZID4gdGhpcy5ib3hab29tLnN0YXJ0LnkpIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveFpvb20uc3RhcnQueSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5zdGFydC54ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5zdGFydC55ICsgJ3B4JztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID0gZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoID0gZS5jbGllbnRYIC0gdGhpcy5ib3hab29tLnN0YXJ0LnggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0ID0gdGhpcy5ib3hab29tLnN0YXJ0LnkgLSBlLmNsaWVudFkgKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAodGhpcy5ib3hab29tLnN0YXJ0LnggPiBlLmNsaWVudFgpIHtcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUubGVmdCA9IGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueCArICdweCc7XHJcbiAgICAgICAgaWYgKGUuY2xpZW50WSA+IHRoaXMuYm94Wm9vbS5zdGFydC55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0YXJ0LnkgLSB0aGlzLmJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGggPSB0aGlzLmJveFpvb20uc3RhcnQueCAtIGUuY2xpZW50WCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQgPSBlLmNsaWVudFkgLSB0aGlzLmJveFpvb20uc3RhcnQueSArICdweCc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IHRoaXMuYm94Wm9vbS5zdGFydC54IC0gZS5jbGllbnRYICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IHRoaXMuYm94Wm9vbS5zdGFydC55IC0gZS5jbGllbnRZICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXJfbW91c2VNb3ZlKFxyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQsXHJcbiAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoLFxyXG4gICAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9tb3VzZVVwKGUpIHtcclxuICAgIHZhciB3aWR0aCA9IE1hdGguYWJzKGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5zdGFydC54KTtcclxuICAgIHZhciBoZWlnaHQgPSBNYXRoLmFicyhlLmNsaWVudFkgLSB0aGlzLmJveFpvb20uc3RhcnQueSk7XHJcbiAgICB2YXIgeCA9IGUuY2xpZW50WCA+IHRoaXMuYm94Wm9vbS5zdGFydC54ID8gZS5jbGllbnRYIDogYm94Wm9vbS5zdGFydC54O1xyXG4gICAgdmFyIHkgPSBlLmNsaWVudFkgPiB0aGlzLmJveFpvb20uc3RhcnQueSA/IGUuY2xpZW50WSA6IGJveFpvb20uc3RhcnQueTtcclxuICAgIHZhciBjZW50ZXIgPSB0aGlzLmdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcihcclxuICAgICAgICB0aGlzLnRvUG9pbnQoeCAtIHdpZHRoIC8gMiwgeSAtIGhlaWdodCAvIDIpLFxyXG4gICAgKTtcclxuXHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmJveFpvb20ubXYpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm94Wm9vbS5tdXApO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZVt0aGlzLkNTU19UUkFOU0lUSU9OXSA9ICdvcGFjaXR5IDAuMTVzIGVhc2UtaW4tb3V0JztcclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5vcGFjaXR5ID0gMDtcclxuXHJcbiAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLmVuYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICB0aGlzLmJveFpvb20ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChib3hab29tKTtcclxuXHJcbiAgICBpZiAoXHJcbiAgICAgICAgZS5jbGllbnRYID09PSB0aGlzLmJveFpvb20uc3RhcnQuY2xpZW50WCAmJlxyXG4gICAgICAgIGUuY2xpZW50WSA9PT0gdGhpcy5ib3hab29tLnN0YXJ0LmNsaWVudFlcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5ib3hab29tX2RvWm9vbSh7XHJcbiAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgIHdpZHRoLFxyXG4gICAgICAgIGNlbnRlcixcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tX2RvWm9vbShvYmopIHtcclxuICAgIGxldCBwcm9qZWN0ZWRDZW50ZXIgPSB0aGlzLnNjcmVlblBvaW50VG9Qcm9qZWN0aW9uKG9iai5jZW50ZXIpO1xyXG4gICAgbGV0IGhlaWdodCA9IG51bGw7XHJcbiAgICBsZXQgd2lkdGggPSBudWxsO1xyXG4gICAgbGV0IG11bHRpcGxpZXIgPSBudWxsO1xyXG5cclxuICAgIGZvciAobGV0IGggPSAwOyBoIDwgNTAgLypwcmV2ZW50IGVuZGxlc3MgbG9vcCovOyBoKyspIHtcclxuICAgICAgICBtdWx0aXBsaWVyID0gTWF0aC5wb3coMiwgaCk7XHJcbiAgICAgICAgd2lkdGggPSBvYmoud2lkdGggKiBtdWx0aXBsaWVyO1xyXG4gICAgICAgIGhlaWdodCA9IG9iai5oZWlnaHQgKiBtdWx0aXBsaWVyO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGhlaWdodCA+IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCB8fFxyXG4gICAgICAgICAgICB3aWR0aCA+IHRoaXMubWFwQ29udGFpbmVyLndpZHRoXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGggLT0gMTtcclxuICAgICAgICAgICAgdGhpcy56b29tVG8ocHJvamVjdGVkQ2VudGVyLCB0aGlzLnpvb20gKyBoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tQ2VudGVyX21vdXNlTW92ZShoZWlnaHQsIHdpZHRoKSB7XHJcbiAgICBoZWlnaHQgPSBoZWlnaHQucmVwbGFjZSgncHgnLCAnJyk7XHJcbiAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoJ3B4JywgJycpO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLnN0eWxlLnRyYW5zZm9ybSA9XHJcbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgKHdpZHRoIC8gMiAtIDMpICsgJ3B4LCAnICsgKGhlaWdodCAvIDIgLSAzKSArICdweCknO1xyXG59XHJcbiJdLCJuYW1lcyI6WyJ1dGlscy5DU1NfVFJBTlNJVElPTiIsInV0aWxzLkNTU19UUkFOU0ZPUk0iLCJ1dGlscy5NT1VTRV9XSEVFTF9FVlQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0lBQU8sTUFBTSxnQkFBZ0IsQ0FBQztJQUM5QixJQUFJLFdBQVcsR0FBRztJQUNsQixRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO0lBQzVCLEtBQUs7O0lBRUwsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7SUFDakMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7SUFDcEQsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN4QyxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDOztJQUVyRSxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7O0lBRWxDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ3BELFlBQVksT0FBTyxLQUFLLENBQUM7SUFDekIsU0FBUztJQUNULFFBQVEsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7SUFFOUMsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUNsRCxZQUFZLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7SUFDN0UsZ0JBQWdCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUNoRCxhQUFhO0lBQ2IsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0IsS0FBSzs7SUFFTCxJQUFJLFNBQVMsR0FBRztJQUNoQixRQUFRLE9BQU8sa0NBQWtDLENBQUM7SUFDbEQsS0FBSzs7SUFFTCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUU7SUFDbEIsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7SUFDOUIsWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLFNBQVMsTUFBTTtJQUNmLFlBQVksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RCxTQUFTO0lBQ1QsS0FBSzs7SUFFTCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7SUFDeEIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7SUFDcEQsWUFBWSxPQUFPLEtBQUssQ0FBQztJQUN6QixTQUFTOztJQUVULFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ2hFLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFO0lBQ2pFLGdCQUFnQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BCLGFBQWE7SUFDYixTQUFTO0lBQ1QsS0FBSzs7SUFFTCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7SUFDbkIsUUFBUSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3BDLFFBQVEsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzs7SUFFeEMsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUMvQyxZQUFZLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUNuRSxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU0sRUFBRTtJQUMxRCxvQkFBb0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQzVELGlCQUFpQjs7SUFFakIsZ0JBQWdCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsYUFBYTtJQUNiLFNBQVM7SUFDVCxLQUFLOztJQUVMLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUU7SUFDMUIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUU7SUFDcEQsWUFBWSxPQUFPLEtBQUssQ0FBQztJQUN6QixTQUFTOztJQUVULFFBQVEsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxRQUFRLElBQUksb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUNwRCxRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDOztJQUVqQyxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ2xELFlBQVksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1RCxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQztJQUNoRCxLQUFLO0lBQ0wsQ0FBQzs7SUMvRE0sU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFO0lBQ2hDO0lBQ0EsSUFBSSxJQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQzs7SUFFL0MsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUMzQyxRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRTtJQUMvQixZQUFZLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVCLFNBQVM7SUFDVCxLQUFLOztJQUVMLElBQUksT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQzs7QUFFRCxJQUFPLElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQztJQUNwQyxJQUFJLFdBQVc7SUFDZixJQUFJLGlCQUFpQjtJQUNyQixJQUFJLFlBQVk7SUFDaEIsSUFBSSxjQUFjO0lBQ2xCLElBQUksYUFBYTtJQUNqQixDQUFDLENBQUMsQ0FBQztBQUNILElBQU8sSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDO0lBQ3JDLElBQUksWUFBWTtJQUNoQixJQUFJLGtCQUFrQjtJQUN0QixJQUFJLGFBQWE7SUFDakIsSUFBSSxlQUFlO0lBQ25CLElBQUksY0FBYztJQUNsQixDQUFDLENBQUMsQ0FBQzs7SUFFSDtBQUNBLElBQU8sSUFBSSxlQUFlO0lBQzFCLElBQUksU0FBUyxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO0lBQzlDLE1BQU0sT0FBTztJQUNiLE1BQU0sUUFBUSxDQUFDLFlBQVksS0FBSyxTQUFTO0lBQ3pDLE1BQU0sWUFBWTtJQUNsQixNQUFNLGdCQUFnQixDQUFDLDBEQUEwRDs7SUN2RDFFLFNBQVMsY0FBYyxDQUFDLE9BQU8sRUFBRTtJQUN4QyxJQUFJLElBQUksc0JBQXNCLEdBQUcsU0FBUyxDQUFDOztJQUUzQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEdBQUc7SUFDbEIsUUFBUSxlQUFlLEVBQUUsSUFBSTtJQUM3QixRQUFRLFVBQVUsRUFBRSxJQUFJO0lBQ3hCLFFBQVEsZ0JBQWdCLEVBQUUsSUFBSTtJQUM5QixRQUFRLFVBQVUsRUFBRSxJQUFJO0lBQ3hCLFFBQVEsZ0JBQWdCLEVBQUUsSUFBSTtJQUM5QixRQUFRLGVBQWUsRUFBRSxtQkFBbUI7SUFDNUMsUUFBUSxNQUFNLEVBQUUsSUFBSTtJQUNwQixRQUFRLFFBQVEsRUFBRSxJQUFJO0lBQ3RCLEtBQUssQ0FBQzs7SUFFTixJQUFJLFNBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTtJQUMxQjtJQUNBLFFBQVEsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsS0FBSzs7SUFFTCxJQUFJLFNBQVMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFO0lBQ3pDLFFBQVEsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUM5QixRQUFRLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7O0lBRTlCLFFBQVEsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzdCLFFBQVEsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ3JDLFFBQVEsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ3JDLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7SUFDeEUsUUFBUSxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQzs7SUFFdkUsUUFBUSxHQUFHLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQzs7SUFFeEIsUUFBUSxnQkFBZ0IsRUFBRSxDQUFDOztJQUUzQixRQUFRLEdBQUcsQ0FBQyxlQUFlLEdBQUc7SUFDOUIsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJO0lBQ3pDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRztJQUN4QyxTQUFTLENBQUM7O0lBRVYsUUFBUSxHQUFHLENBQUMsUUFBUSxHQUFHO0lBQ3ZCLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxZQUFZLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsU0FBUyxDQUFDOztJQUVWLFFBQVEsUUFBUSxDQUFDLGdCQUFnQjtJQUNqQyxZQUFZLFVBQVU7SUFDdEIsWUFBWSxtQ0FBbUM7SUFDL0MsU0FBUyxDQUFDO0lBQ1YsUUFBUSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDakUsUUFBUSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDcEUsUUFBUSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDNUUsS0FBSzs7SUFFTCxJQUFJLFNBQVMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFO0lBQ25DO0lBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUU7SUFDN0IsWUFBWSxPQUFPO0lBQ25CLFNBQVM7O0lBRVQsUUFBUSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7O0lBRTNCLFFBQVEsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBRS9DLFFBQVEsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEM7SUFDQSxLQUFLOztJQUVMLElBQUksU0FBUyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUU7SUFDdkMsUUFBUSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQztJQUNuQyxRQUFRLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7O0lBRTlCLFFBQVE7SUFDUixZQUFZLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFVBQVUsS0FBSyxDQUFDO0lBQzlDLFlBQVksR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxLQUFLLENBQUM7SUFDOUMsVUFBVTtJQUNWLFlBQVksT0FBTyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFFakU7SUFDQSxZQUFZLE9BQU8sQ0FBQyxnQ0FBZ0M7SUFDcEQsZ0JBQWdCLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsRSxnQkFBZ0IsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2pFLGdCQUFnQixHQUFHLENBQUMsUUFBUTtJQUM1QixhQUFhLENBQUM7O0lBRWQsWUFBWSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxQyxTQUFTOztJQUVULFFBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3RDLEtBQUs7O0lBRUwsSUFBSSxTQUFTLG1DQUFtQyxDQUFDLENBQUMsRUFBRTtJQUNwRCxRQUFRLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRTtJQUM3QixZQUFZLE9BQU87SUFDbkIsU0FBUzs7SUFFVCxRQUFRLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQzs7SUFFM0IsUUFBUSxRQUFRLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDcEUsUUFBUSxRQUFRLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUM7O0lBRXJFLFFBQVEsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3ZFLFFBQVEsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQy9FLEtBQUs7O0lBRUwsSUFBSSxTQUFTLG1CQUFtQixDQUFDLENBQUMsRUFBRTtJQUNwQztJQUNBO0lBQ0EsUUFBUTtJQUNSLFlBQVksQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxDQUFDO0lBQ3BELFlBQVksQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxDQUFDO0lBQ3BELFVBQVU7SUFDVjtJQUNBO0lBQ0E7O0lBRUEsWUFBWSxPQUFPO0lBQ25CLFNBQVM7O0lBRVQsUUFBUSxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUNBLGNBQW9CLENBQUMsR0FBRyxFQUFFLENBQUM7O0lBRXZFO0lBQ0E7O0lBRUEsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0lBRXJDLFFBQVEsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3ZFLFFBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdDLEtBQUs7O0lBRUwsSUFBSSxTQUFTLFdBQVcsQ0FBQyxDQUFDLEVBQUU7SUFDNUIsUUFBUSxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO0lBQzdDLFFBQVEsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDckUsUUFBUSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQzs7SUFFcEU7SUFDQSxRQUFRLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDQyxhQUFtQixDQUFDO0lBQ25ELCtCQUErQixZQUFZLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDO0lBQ2pFLEtBQUs7O0lBRUwsSUFBSSxTQUFTLG1CQUFtQixDQUFDLENBQUMsRUFBRTtJQUNwQyxRQUFRLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7SUFDN0MsUUFBUSxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDOztJQUU5QixRQUFRLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFVBQVU7SUFDMUUsWUFBWSxTQUFTLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDOztJQUUzRSxRQUFRLFFBQVEsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBQ2pDLFFBQVEsUUFBUSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7O0lBRWxDLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2hDLFlBQVksQ0FBQyxFQUFFLFNBQVM7SUFDeEIsWUFBWSxDQUFDLEVBQUUsU0FBUztJQUN4QixZQUFZLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQzVCLFNBQVMsQ0FBQyxDQUFDOztJQUVYO0lBQ0EsUUFBUSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQ0EsYUFBbUIsQ0FBQztJQUNuRCxZQUFZLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7O0lBRXJFLFFBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLEtBQUs7O0lBRUwsSUFBSSxTQUFTLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFO0lBQ3JDLFFBQVEsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6RSxRQUFRLElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7O0lBRWhGLFFBQVEsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDO0lBQ2xDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLENBQUM7SUFDekUsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQztJQUN6RSxTQUFTLENBQUMsQ0FBQztJQUNYLFFBQVEsSUFBSSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekQsUUFBUSxJQUFJLFFBQVEsR0FBRztJQUN2QixZQUFZLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUM7SUFDbEQsWUFBWSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2xELFNBQVMsQ0FBQzs7SUFFVixRQUFRLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7O0lBRXZDLFFBQVEsT0FBTyxPQUFPLENBQUM7SUFDdkIsS0FBSzs7SUFFTCxJQUFJLFNBQVMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7SUFDM0MsUUFBUSxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO0lBQzdDLFFBQVEsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUk7SUFDakMsWUFBWSxPQUFPLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUN6RCxTQUFTLENBQUM7O0lBRVY7SUFDQSxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHO0lBQzFCLFlBQVksR0FBRztJQUNmLFlBQVksU0FBUyxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsU0FBUyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNoRSxTQUFTLENBQUM7SUFDVixRQUFRLElBQUksSUFBSSxHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQzs7SUFFbEQsUUFBUSxRQUFRLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLFFBQVEsUUFBUSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7SUFFOUMsUUFBUSxPQUFPLENBQUMsZ0NBQWdDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBRXZFO0lBQ0EsUUFBUTtJQUNSO0lBQ0EsWUFBWSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQ0QsY0FBb0IsQ0FBQztJQUN4RCxnQkFBZ0IsTUFBTSxHQUFHLElBQUksR0FBRyxnQ0FBZ0MsQ0FBQzs7SUFFakUsWUFBWSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQ0MsYUFBbUIsQ0FBQztJQUN2RCxnQkFBZ0IsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDO0lBQ2xGLFNBQVM7O0lBRVQsUUFBUSxVQUFVLENBQUMsTUFBTTtJQUN6QixZQUFZLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDRCxjQUFvQixDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2hFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7SUFFakIsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxLQUFLOztJQUVMLElBQUksU0FBUyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUU7SUFDekMsUUFBUSxJQUFJLHFCQUFxQixHQUFHLElBQUksQ0FBQzs7SUFFekMsUUFBUSxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzs7SUFFeEMsUUFBUTtJQUNSLFlBQVksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDO0lBQzdCLFlBQVksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHO0lBQzdELFVBQVU7SUFDVixZQUFZLE9BQU87SUFDbkIsU0FBUzs7SUFFVCxRQUFRLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25ELFFBQVEsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0lBRXBELFFBQVEsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLFlBQVksTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUM5QyxZQUFZLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLFlBQVksTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDeEMsWUFBWSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7O0lBRS9DLFFBQVEsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNqQztJQUNBLFFBQVEsSUFBSSxJQUFJLEdBQUc7SUFDbkIsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0lBQ2pFLHdCQUF3QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNsRSx1QkFBdUIsQ0FBQyxDQUFDOztJQUV6QixRQUFRLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFDbEQsWUFBWSxPQUFPLEdBQUcsVUFBVSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDOztJQUVuRCxRQUFRLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sR0FBRyxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDcEUsUUFBUSxJQUFJLEtBQUssR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDOztJQUVoQyxRQUFRLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO0lBQ3JDLFlBQVksWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDakQsWUFBWSxPQUFPO0lBQ25CLFNBQVM7O0lBRVQ7SUFDQTtJQUNBLFFBQVEsSUFBSSxNQUFNO0lBQ2xCLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdkUsZ0JBQWdCLElBQUk7SUFDcEIsWUFBWSxDQUFDLENBQUM7O0lBRWQsUUFBUSxJQUFJLFlBQVksR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDeEQ7SUFDQTtJQUNBOztJQUVBLFFBQVEscUJBQXFCLElBQUksTUFBTSxDQUFDOztJQUV4QztJQUNBLFFBQVEsSUFBSSxNQUFNLEdBQUc7SUFDckIsWUFBWSxJQUFJLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ2hELFlBQVksR0FBRyxFQUFFLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUMvQyxTQUFTLENBQUM7O0lBRVY7SUFDQTtJQUNBLFFBQVEsSUFBSSxXQUFXLEdBQUc7SUFDMUIsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDcEQsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDckQsU0FBUyxDQUFDOztJQUVWLFFBQVEsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUNuRCxRQUFRLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7O0lBRWxEO0lBQ0EsUUFBUSxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU87SUFDckMsYUFBYSxLQUFLLENBQUNBLGNBQW9CLENBQUMsR0FBRyxZQUFZLEdBQUcscUJBQXFCO0lBQy9FLFlBQVksK0JBQStCLENBQUM7O0lBRTVDO0lBQ0EsUUFBUSxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU87SUFDckMsYUFBYSxLQUFLLENBQUNDLGFBQW1CLENBQUMsR0FBRyxjQUFjLEdBQUcsV0FBVyxDQUFDLENBQUMsR0FBRyxLQUFLO0lBQ2hGLFlBQVksV0FBVyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7O0lBRXZDO0lBQ0EsUUFBUSxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQzs7SUFFN0MsUUFBUSxzQkFBc0IsR0FBRyxVQUFVO0lBQzNDLFlBQVksV0FBVztJQUN2QixnQkFBZ0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDRCxjQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzVFLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQzNCLFlBQVkscUJBQXFCO0lBQ2pDLFNBQVMsQ0FBQztJQUNWLEtBQUs7O0lBRUwsSUFBSSxTQUFTLGdCQUFnQixDQUFDLENBQUMsRUFBRTtJQUNqQztJQUNBLFFBQVEsSUFBSSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsV0FBVztJQUNuRCxhQUFhLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO0lBQzVELGFBQWEsU0FBUyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDOztJQUU5RCxRQUFRLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtJQUMvQixZQUFZLE9BQU87SUFDbkIsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUVoRCxRQUFRLE9BQU8sQ0FBQyxnQ0FBZ0M7SUFDaEQsWUFBWSxDQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJO0lBQzFDLFlBQVksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRztJQUN6QyxTQUFTLENBQUM7O0lBRVYsUUFBUSxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUNDLGFBQW1CLENBQUM7SUFDaEUsWUFBWSxZQUFZLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDOztJQUVqRCxRQUFRLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN0QyxRQUFRLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQzs7SUFFdkMsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9DLEtBQUs7O0lBRUwsSUFBSSxTQUFTLGFBQWEsR0FBRztJQUM3QixRQUFRLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNqRCxLQUFLOztJQUVMLElBQUksU0FBUyxjQUFjLEdBQUc7SUFDOUIsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEQsS0FBSzs7SUFFTCxJQUFJLE9BQU87SUFDWCxRQUFRLEtBQUssRUFBRSxLQUFLO0lBQ3BCLFFBQVEsV0FBVyxFQUFFLFdBQVc7SUFDaEMsUUFBUSxhQUFhLEVBQUUsYUFBYTtJQUNwQyxRQUFRLGNBQWMsRUFBRSxjQUFjO0lBQ3RDLFFBQVEsZ0JBQWdCLEVBQUUsZ0JBQWdCO0lBQzFDLFFBQVEsV0FBVyxFQUFFLFdBQVc7SUFDaEMsUUFBUSxtQkFBbUIsRUFBRSxtQkFBbUI7SUFDaEQsUUFBUSx3QkFBd0IsRUFBRSx3QkFBd0I7SUFDMUQsS0FBSyxDQUFDO0lBQ04sQ0FBQzs7SUM5Vk0sTUFBTSxNQUFNLFNBQVMsZ0JBQWdCLENBQUM7SUFDN0MsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUU7SUFDN0MsUUFBUSxLQUFLLEVBQUUsQ0FBQztJQUNoQixRQUFRLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQ3JDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkMsS0FBSzs7SUFFTCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO0lBQzFCOztJQUVBLFFBQVEsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQzs7SUFFckMsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7SUFDMUMsUUFBUSxJQUFJLENBQUMsT0FBTztJQUNwQixZQUFZLE1BQU0sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM5RSxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUM7SUFDM0MsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDOztJQUUvQyxRQUFRLElBQUksQ0FBQyxlQUFlLEdBQUdDLGVBQXFCLENBQUM7SUFDckQsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHRCxhQUFtQixDQUFDO0lBQ2pELFFBQVEsSUFBSSxDQUFDLGNBQWMsR0FBR0QsY0FBb0IsQ0FBQzs7SUFFbkQsUUFBUSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsUUFBUSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDM0IsUUFBUSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQzs7SUFFcEMsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHO0lBQ3RCLFlBQVksT0FBTyxFQUFFLEVBQUU7SUFDdkIsWUFBWSxJQUFJLEVBQUUsRUFBRTtJQUNwQixTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDOztJQUV0QyxRQUFRLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDOztJQUVuQyxRQUFRLElBQUksT0FBTyxFQUFFO0lBQ3JCLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUMsU0FBUzs7SUFFVCxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7O0lBRS9CLFlBQVksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7O0lBRXRDLFlBQVksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDL0M7SUFDQTtJQUNBLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQy9DLGFBQWE7SUFDYixTQUFTO0lBQ1QsS0FBSzs7SUFFTCxJQUFJLE9BQU8sVUFBVSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUU7SUFDL0I7SUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUM1QyxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUU7SUFDaEIsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqRCxTQUFTO0lBQ1QsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDMUIsS0FBSzs7SUFFTCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFO0lBQzNCLFFBQVEsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0lBRXhDLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7O0lBRXpCLFFBQVEsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7SUFDN0UsUUFBUSxJQUFJLFVBQVU7SUFDdEIsWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUs7SUFDbkMsWUFBWSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDOUIsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsQ0FBQztJQUN6QyxZQUFZLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDO0lBQ3pDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxJQUFJLFdBQVc7SUFDekQsWUFBWSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksV0FBVztJQUN6RCxTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7SUFDaEMsWUFBWSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDckMsWUFBWSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0QyxTQUFTLE1BQU07SUFDZixZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDakQsU0FBUztJQUNULEtBQUs7O0lBRUwsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUU7SUFDbEMsUUFBUSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQzlFLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO0lBQ3hFLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDO0lBQzFFLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQztJQUNwRCxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUM7O0lBRWxEO0lBQ0E7SUFDQSxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNO0lBQzlDLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzVDLFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7O0lBRS9FLFFBQVEsSUFBSSxRQUFRLEdBQUc7SUFDdkIsWUFBWSxDQUFDO0lBQ2IsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ25FLFlBQVksQ0FBQztJQUNiLGdCQUFnQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNuRSxTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQUM3RSxRQUFRLElBQUksVUFBVTtJQUN0QixZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSztJQUNuQyxZQUFZLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFDLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDOUIsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsVUFBVTtJQUNqRCxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLFdBQVc7SUFDL0QsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQzs7SUFFckQsUUFBUSxJQUFJLFFBQVEsRUFBRTtJQUN0QixZQUFZLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hELFNBQVM7SUFDVCxLQUFLOztJQUVMLElBQUksY0FBYyxHQUFHO0lBQ3JCLFFBQVEsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM5RSxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQzs7SUFFbEUsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9FLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU87SUFDaEQsWUFBWSxzR0FBc0csQ0FBQzs7SUFFbkgsUUFBUSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhO0lBQzlDLFlBQVksUUFBUSxDQUFDLGVBQWUsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLENBQUM7SUFDekUsU0FBUyxDQUFDO0lBQ1YsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZO0lBQzlDLFlBQVksYUFBYTtJQUN6QixZQUFZLDhCQUE4QjtJQUMxQyxTQUFTLENBQUM7SUFDVixRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPO0lBQy9DLFlBQVksaUdBQWlHLENBQUM7O0lBRTlHLFFBQVEsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYTtJQUNqRCxZQUFZLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO0lBQ3pDLFNBQVMsQ0FBQztJQUNWLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU87SUFDbEQsWUFBWSxvQ0FBb0MsQ0FBQztJQUNqRCxRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQzs7SUFFckUsUUFBUSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxRSxRQUFRLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztJQUU3RSxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztJQUUxRSxRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pFO0lBQ0EsS0FBSzs7SUFFTCxJQUFJLGFBQWEsQ0FBQyxFQUFFLEVBQUU7SUFDdEIsUUFBUSxPQUFPO0lBQ2Y7SUFDQSxZQUFZLE9BQU8sRUFBRSxFQUFFO0lBQ3ZCLFlBQVksSUFBSSxFQUFFLElBQUk7SUFDdEIsWUFBWSxHQUFHLEVBQUUsSUFBSTtJQUNyQixZQUFZLEtBQUssRUFBRSxJQUFJO0lBQ3ZCLFlBQVksTUFBTSxFQUFFLElBQUk7SUFDeEIsU0FBUyxDQUFDO0lBQ1YsS0FBSzs7SUFFTCxJQUFJLFdBQVcsR0FBRztJQUNsQixRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDOztJQUU1QyxRQUFRLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25EO0lBQ0E7SUFDQSxLQUFLOztJQUVMLElBQUksb0JBQW9CLEdBQUc7SUFDM0IsUUFBUSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQzs7SUFFbEQsUUFBUSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDOztJQUU1QyxRQUFRLFNBQVMsQ0FBQyxnQkFBZ0I7SUFDbEMsWUFBWSxJQUFJLENBQUMsZUFBZTtJQUNoQyxZQUFZLEdBQUcsSUFBSTtJQUNuQixnQkFBZ0IsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3JDLGdCQUFnQixHQUFHLENBQUMsZUFBZSxFQUFFLENBQUM7O0lBRXRDLGdCQUFnQixJQUFJLEtBQUssR0FBRyxTQUFTLENBQUM7O0lBRXRDO0lBQ0EsZ0JBQWdCLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFVBQVU7SUFDN0Msc0JBQXNCLEdBQUcsQ0FBQyxVQUFVO0lBQ3BDLHNCQUFzQixHQUFHLENBQUMsTUFBTTtJQUNoQyw4QkFBOEIsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUc7SUFDL0MsK0JBQStCLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFFbkYsZ0JBQWdCLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDOztJQUU3RCxnQkFBZ0IsR0FBRyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUM7O0lBRWhFLGdCQUFnQixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN0RSxhQUFhO0lBQ2IsWUFBWSxLQUFLO0lBQ2pCLFNBQVMsQ0FBQzs7SUFFVixRQUFRLFNBQVMsQ0FBQyxnQkFBZ0I7SUFDbEMsWUFBWSxXQUFXO0lBQ3ZCLFlBQVksR0FBRyxJQUFJO0lBQ25COztJQUVBLGdCQUFnQixJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxZQUFZO0lBQ2xFLG9CQUFvQixPQUFPO0lBQzNCLGlCQUFpQjs7SUFFakIsZ0JBQWdCLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRTtJQUNsQyxvQkFBb0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hELG9CQUFvQixPQUFPLEtBQUssQ0FBQztJQUNqQyxpQkFBaUI7O0lBRWpCLGdCQUFnQixJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ2xELGdCQUFnQixJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO0lBQ2xELGdCQUFnQixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEQsYUFBYTtJQUNiLFlBQVksS0FBSztJQUNqQixTQUFTLENBQUM7O0lBRVYsUUFBUSxTQUFTLENBQUMsZ0JBQWdCO0lBQ2xDLFlBQVksU0FBUztJQUNyQixZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMscUJBQXFCO0lBQzNDLFlBQVksS0FBSztJQUNqQixTQUFTLENBQUM7SUFDVixRQUFRLFNBQVMsQ0FBQyxnQkFBZ0I7SUFDbEMsWUFBWSxXQUFXO0lBQ3ZCLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxxQkFBcUI7SUFDM0MsWUFBWSxLQUFLO0lBQ2pCLFNBQVMsQ0FBQztJQUNWLFFBQVEsU0FBUyxDQUFDLGdCQUFnQjtJQUNsQyxZQUFZLFVBQVU7SUFDdEIsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLHFCQUFxQjtJQUMzQyxZQUFZLEtBQUs7SUFDakIsU0FBUyxDQUFDO0lBQ1YsUUFBUSxTQUFTLENBQUMsZ0JBQWdCO0lBQ2xDLFlBQVksV0FBVztJQUN2QixZQUFZLENBQUMsSUFBSTtJQUNqQixnQkFBZ0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGFBQWE7SUFDYixZQUFZLEtBQUs7SUFDakIsU0FBUyxDQUFDOztJQUVWLFFBQVEsU0FBUyxDQUFDLGdCQUFnQjtJQUNsQyxZQUFZLE9BQU87SUFDbkIsWUFBWSxDQUFDLElBQUk7SUFDakI7SUFDQSxnQkFBZ0I7SUFDaEIsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVO0lBQ3JELG9CQUFvQixDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVTtJQUNyRCxrQkFBa0I7SUFDbEIsb0JBQW9CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRCxpQkFBaUI7SUFDakIsYUFBYTtJQUNiLFlBQVksS0FBSztJQUNqQixTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDckIsWUFBWUUsZUFBcUI7SUFDakMsWUFBWSxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7SUFDMUMsWUFBWSxJQUFJO0lBQ2hCLFNBQVMsQ0FBQztJQUNWLEtBQUs7O0lBRUwsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO0lBQ25DLFFBQVEsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDOztJQUU5QixRQUFRLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDckMsUUFBUSxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztJQUNyQztJQUNBLFFBQVEsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxVQUFVO0lBQzNELGtDQUFrQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFO0lBQ3RFLGtDQUFrQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDbkcsUUFBUSxJQUFJLE9BQU8sR0FBRztJQUN0QixZQUFZLFNBQVMsRUFBRSxDQUFDO0lBQ3hCLFlBQVksQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDakMsWUFBWSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNqQyxZQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRztJQUN0QixZQUFZLElBQUksRUFBRSxJQUFJO0lBQ3RCLFlBQVksU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVM7SUFDcEQ7SUFDQSxZQUFZLE9BQU8sRUFBRSxJQUFJO0lBQ3pCLFlBQVksZUFBZSxFQUFFLFdBQVc7SUFDeEMsZ0JBQWdCLGdCQUFnQixHQUFHLElBQUksQ0FBQztJQUN4QyxhQUFhO0lBQ2IsU0FBUyxDQUFDOztJQUVWLFFBQVEsT0FBTyxhQUFhLElBQUksYUFBYSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFO0lBQzdFLFlBQVk7SUFDWixnQkFBZ0IsRUFBRSxhQUFhLENBQUMsV0FBVyxJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBQzlFLGNBQWM7SUFDZCxnQkFBZ0IsYUFBYSxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUM7SUFDNUQsZ0JBQWdCLFNBQVM7SUFDekIsYUFBYTs7SUFFYixZQUFZLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUU7SUFDM0QsZ0JBQWdCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUM7SUFDNUUsYUFBYTs7SUFFYixZQUFZLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQzs7SUFFMUQsWUFBWSxJQUFJLGdCQUFnQixFQUFFO0lBQ2xDLGdCQUFnQixPQUFPO0lBQ3ZCLGFBQWE7O0lBRWIsWUFBWSxhQUFhLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQztJQUN4RCxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFO0lBQ3hCO0lBQ0EsWUFBWSxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDOztJQUUxRCxZQUFZLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUM7O0lBRTdFLFlBQVksSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWE7SUFDL0MsZ0JBQWdCLElBQUksQ0FBQyxJQUFJO0lBQ3pCLGdCQUFnQixPQUFPLENBQUMsU0FBUztJQUNqQyxnQkFBZ0IsSUFBSSxDQUFDLE9BQU87SUFDNUIsZ0JBQWdCLElBQUksQ0FBQyxPQUFPO0lBQzVCLGFBQWEsQ0FBQzs7SUFFZCxZQUFZLElBQUksVUFBVTtJQUMxQixnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsSUFBSSxHQUFHLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7O0lBRS9FLFlBQVksSUFBSSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUM7O0lBRXBDLFlBQVksSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O0lBRTVELFlBQVksT0FBTyxDQUFDLEtBQUs7SUFDekIsZ0JBQWdCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsR0FBRyxXQUFXLENBQUM7O0lBRXpFLFlBQVksSUFBSSxDQUFDLG9DQUFvQztJQUNyRCxnQkFBZ0IsT0FBTyxDQUFDLE9BQU87SUFDL0IsZ0JBQWdCLE9BQU8sQ0FBQyxLQUFLO0lBQzdCLGdCQUFnQixXQUFXO0lBQzNCLGFBQWEsQ0FBQztJQUNkLFNBQVMsTUFBTTtJQUNmLFlBQVksT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RSxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLEtBQUs7O0lBRUwsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7SUFDckMsUUFBUSxJQUFJLElBQUksR0FBRyxTQUFTLENBQUM7O0lBRTdCLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtJQUMvQixZQUFZLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEMsWUFBWSxRQUFRLEVBQUUsQ0FBQztJQUN2QixTQUFTLE1BQU07SUFDZixZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUN6QixnQkFBZ0IsUUFBUTtJQUN4QixnQkFBZ0IsU0FBUyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQ2pDLG9CQUFvQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakQsb0JBQW9CLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxpQkFBaUI7SUFDakIsZ0JBQWdCLElBQUk7SUFDcEIsYUFBYSxDQUFDO0lBQ2QsU0FBUzs7SUFFVCxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7SUFDTCxDQUFDOztJQ25YTSxNQUFNLHVCQUF1QixTQUFTLGdCQUFnQixDQUFDO0lBQzlELElBQUksV0FBVyxDQUFDLElBQUksRUFBRTtJQUN0QixRQUFRLEtBQUssRUFBRSxDQUFDO0lBQ2hCLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDNUIsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzs7SUFFN0IsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUNoQyxLQUFLO0lBQ0wsQ0FBQzs7SUNQRCxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVU7SUFDNUI7SUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDOztJQUVILE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHO0lBQ2pDLElBQUksT0FBTztJQUNYLElBQUksU0FBUztJQUNiLElBQUksT0FBTztJQUNYLElBQUksT0FBTztJQUNYLEVBQUU7SUFDRixJQUFJLElBQUksU0FBUyxHQUFHLE9BQU8sR0FBRyxTQUFTLENBQUM7SUFDeEMsSUFBSSxJQUFJLFVBQVUsR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDOztJQUV6QyxJQUFJLE9BQU87SUFDWCxRQUFRLFFBQVE7SUFDaEIsWUFBWSxTQUFTLEdBQUcsT0FBTyxHQUFHLFNBQVMsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsU0FBUztJQUMvRSxRQUFRLFFBQVE7SUFDaEIsWUFBWSxVQUFVLEdBQUcsT0FBTztJQUNoQyxrQkFBa0IsU0FBUyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUM7SUFDcEQsa0JBQWtCLFNBQVM7SUFDM0IsS0FBSyxDQUFDO0lBQ04sQ0FBQyxDQUFDOztJQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7SUFDaEUsSUFBSSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BFLElBQUksSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksSUFBSSxRQUFRLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzdDLElBQUksSUFBSSxRQUFRLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDcEMsSUFBSSxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUMsSUFBSSxJQUFJLE1BQU0sR0FBRztJQUNqQixRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxDQUFDO0lBQ3RDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUM7SUFDdkMsS0FBSyxDQUFDOztJQUVOLElBQUksSUFBSSxPQUFPLEdBQUcsQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLE1BQU0sQ0FBQzs7SUFFckUsSUFBSSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDekMsSUFBSSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDekMsSUFBSSxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDbEQsSUFBSSxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7O0lBRWxELElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRTtJQUM1QjtJQUNBLFFBQVEsT0FBTztJQUNmLEtBQUs7O0lBRUw7SUFDQSxJQUFJLElBQUksQ0FBQyxxQkFBcUI7SUFDOUIsUUFBUTtJQUNSLFlBQVksVUFBVSxFQUFFLFNBQVM7SUFDakMsWUFBWSxVQUFVLEVBQUUsU0FBUztJQUNqQyxZQUFZLFFBQVEsRUFBRSxRQUFRLEdBQUcsR0FBRztJQUNwQyxZQUFZLEdBQUcsRUFBRTtJQUNqQixnQkFBZ0IsU0FBUyxFQUFFLFNBQVM7SUFDcEMsYUFBYTtJQUNiLFlBQVksU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO0lBQ3pDLFNBQVM7SUFDVCxRQUFRQSxlQUFxQjtJQUM3QixLQUFLLENBQUM7SUFDTixDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxLQUFLLEVBQUU7SUFDN0MsSUFBSSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFO0lBQzNCLFFBQVEsT0FBTztJQUNmLEtBQUs7O0lBRUwsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRTtJQUNyQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQyxRQUFRLE9BQU87SUFDZixLQUFLOztJQUVMLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDOztJQUU5QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN0QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUM7O0lDNUVLLE1BQU0sVUFBVSxTQUFTLGdCQUFnQixDQUFDO0lBQ2pELElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRTtJQUNoQyxRQUFRLEtBQUssRUFBRSxDQUFDO0lBQ2hCLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDeEIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUM5QixRQUFRLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO0lBQzdDLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ2xELFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDNUIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUM5QixRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQzlCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUM7SUFDN0IsUUFBUSxJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDN0MsUUFBUSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUN2RCxLQUFLOztJQUVMLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtJQUN4QixRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQy9CLEtBQUs7O0lBRUwsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO0lBQ3RCLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDN0IsS0FBSzs7SUFFTCxJQUFJLGlCQUFpQixHQUFHO0lBQ3hCLFFBQVEsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO0lBQ2pDLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDQSxlQUFxQixFQUFFLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRyxTQUFTLE1BQU07SUFDZixZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQ0EsZUFBcUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hGLFNBQVM7O0lBRVQsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3RSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7SUFFaEcsUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDOztJQUVwRCxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN6QyxLQUFLOztJQUVMLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRTtJQUN2QixRQUFRLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7O0lBRXJDLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM5RixLQUFLOztJQUVMLElBQUksaUNBQWlDLEdBQUc7SUFDeEMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUN0RCxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUIsS0FBSzs7SUFFTCxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUU7SUFDMUI7O0lBRUEsUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFO0lBQy9CLFlBQVksS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDaEMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6QyxZQUFZLE9BQU87SUFDbkIsU0FBUzs7SUFFVCxRQUFRLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksR0FBRyxFQUFFO0lBQzdDLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0MsU0FBUyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDckQsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM5QyxTQUFTO0lBQ1QsS0FBSzs7SUFFTCxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUU7SUFDZixRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQUU7SUFDOUIsWUFBWSxPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlELFlBQVksT0FBTyxJQUFJLENBQUM7SUFDeEIsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ3ZCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDaEQsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQzs7SUFFaEUsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE1BQU07SUFDM0UsWUFBWSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUNyQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN6QyxTQUFTLENBQUMsQ0FBQzs7SUFFWCxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxNQUFNLEdBQUc7SUFDYixRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xDLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDeEIsS0FBSzs7SUFFTCxJQUFJLE1BQU0sR0FBRztJQUNiO0lBQ0EsS0FBSzs7SUFFTCxJQUFJLGVBQWUsR0FBRztJQUN0QjtJQUNBLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5RyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN2QyxLQUFLOztJQUVMLElBQUksZUFBZSxHQUFHO0lBQ3RCLFFBQVEsSUFBSSxJQUFJLEdBQUc7SUFDbkIsWUFBWSxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7SUFDbEQsWUFBWSxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUk7SUFDakQsWUFBWSxHQUFHLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUc7SUFDL0MsWUFBWSxlQUFlLEVBQUUsU0FBUztJQUN0QyxTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzs7SUFFdkYsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQztJQUNuRCxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDakQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3hDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQztJQUN2QyxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDM0MsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0lBQzFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDaEQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUM7SUFDekQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDOztJQUV4RCxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRTtJQUMvQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNuQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQzs7SUFFakMsUUFBUSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQzs7SUFFM0I7SUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQ0QsYUFBbUIsQ0FBQztJQUN6RCx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7aUNBQ3JCLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekQsS0FBSzs7SUFFTCxJQUFJLGFBQWEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFO0lBQ3ZDLFFBQVEsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzs7SUFFckMsUUFBUSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDN0MsUUFBUSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDOztJQUVyQyxRQUFRLE9BQU8sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztJQUU5RCxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDOztJQUVqQyxRQUFRLElBQUksWUFBWSxFQUFFO0lBQzFCLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzdELFNBQVM7O0lBRVQsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztJQUV0RjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBOztJQUVBLFFBQVEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxJQUFJO0lBQzFCLFlBQVksWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BDLFlBQVksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDL0IsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUNDLGVBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUUsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzs7SUFFNUQsWUFBWSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFO0lBQy9DLGdCQUFnQixPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNFLGFBQWE7SUFDYixTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLFNBQVMsR0FBRyxVQUFVLENBQUMsTUFBTTtJQUN6QyxZQUFZLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLFNBQVMsRUFBRSxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7O0lBRXpCO0lBQ0E7SUFDQTtJQUNBO0lBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUNBLGVBQXFCLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDOztJQUUvRCxRQUFRLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztJQUMzQixRQUFRLFNBQVMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFO0lBQ3JDO0lBQ0EsWUFBWSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUNBLGVBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEYsWUFBWSxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFHLFNBQVM7O0lBRVQsUUFBUSxPQUFPLElBQUksQ0FBQztJQUNwQixLQUFLOztJQUVMLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRTtJQUNqQixRQUFRLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtJQUNoRTtJQUNBO0lBQ0EsWUFBWSxPQUFPO0lBQ25CLFNBQVM7O0lBRVQsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO0lBQ3BDO0lBQ0EsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQzs7SUFFcEMsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzs7SUFFMUIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDOztJQUVuQyxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxZQUFZLEdBQUc7SUFDbkIsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHO0lBQ3ZCLFlBQVksS0FBSyxFQUFFLENBQUM7SUFDcEIsWUFBWSxTQUFTLEVBQUUsS0FBSztJQUM1QixZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUk7SUFDbEMsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHO0lBQ2pDLFNBQVMsQ0FBQzs7SUFFVixRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLGFBQWEsRUFBRTtJQUNsQyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7SUFDcEMsWUFBWSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDakYsWUFBWSxPQUFPLElBQUksQ0FBQztJQUN4QixTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxrQkFBa0IsQ0FBQzs7SUFFaEcsUUFBUSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7O0lBRTVCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDOztJQUV0QyxRQUFRLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQzs7SUFFN0UsUUFBUSxPQUFPLElBQUksQ0FBQztJQUNwQixLQUFLOztJQUVMLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUU7SUFDbkMsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ2hDLFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztJQUVoRSxRQUFRLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDOztJQUU1QixRQUFRLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztJQUNqRCxRQUFRLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO0lBQ3ZELFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQyxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBRXBDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO0lBQzNFLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDOztJQUUxRTtJQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDRCxhQUFtQixDQUFDO0lBQ3pELG1CQUFtQixDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUU7Z0NBQ04sR0FBRyxDQUFDLEVBQUU7NEJBQ1YsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDOztJQUVsRSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDOztJQUVuQyxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxRQUFRLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQztJQUN0QyxRQUFRLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0QsUUFBUSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDdEI7SUFDQSxRQUFRLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLGFBQWEsS0FBSyxTQUFTO0lBQ2xFLHlDQUF5QyxDQUFDLFNBQVM7SUFDbkQseUNBQXlDLFNBQVMsQ0FBQyxDQUFDOztJQUVwRCxRQUFRLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7O0lBRXhELFFBQVEsT0FBTyxLQUFLLENBQUM7SUFDckIsS0FBSztJQUNMLENBQUM7O0lDclJNLE1BQU0sY0FBYyxTQUFTLFVBQVUsQ0FBQztJQUMvQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUU7SUFDN0QsUUFBUSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDOUIsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUNoQyxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsUUFBUSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDdkIsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQzs7SUFFaEMsUUFBUSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztJQUUvQixRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsTUFBTTtJQUM3QyxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRCxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEY7SUFDQSxZQUFZLElBQUksQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTTtJQUNoRCxvQkFBb0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDbEUsb0JBQW9CLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNsQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QixZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQ0MsZUFBcUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9FLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZFLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2RixZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVFLFNBQVMsQ0FBQyxDQUFDO0lBQ1gsS0FBSzs7SUFFTCxJQUFJLGFBQWEsR0FBRztJQUNwQixRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtJQUM5QixZQUFZLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsU0FBUztJQUNULFFBQVEsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDaEMsS0FBSzs7SUFFTCxJQUFJLFlBQVksQ0FBQyxVQUFVLEVBQUU7SUFDN0IsUUFBUSxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssVUFBVSxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7SUFDOUQsS0FBSzs7SUFFTCxJQUFJLGdCQUFnQixDQUFDLFlBQVksRUFBRTtJQUNuQyxRQUFRLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkMsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDN0IsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLElBQUksSUFBSSxDQUFDLENBQUM7SUFDcEYsS0FBSzs7SUFFTCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7SUFDekIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztJQUNoQyxLQUFLOztJQUVMLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRTtJQUM3QixRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLEtBQUs7O0lBRUwsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFO0lBQ3JCLFFBQVEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDOztJQUV4QixRQUFRLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7SUFFN0IsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDaEQsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixHQUFHLFdBQVc7SUFDekQsWUFBWSxJQUFJO0lBQ2hCLGdCQUFnQixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFO0lBQ2xFLG9CQUFvQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdDLGlCQUFpQjtJQUNqQixhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUU7SUFDeEIsZ0JBQWdCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsYUFBYTtJQUNiLFNBQVMsQ0FBQzs7SUFFVixRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVELFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsbUNBQW1DLENBQUMsQ0FBQzs7SUFFL0YsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQyxLQUFLOztJQUVMLElBQUksYUFBYSxDQUFDLFVBQVUsRUFBRTtJQUM5QixRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0lBQzVDLFlBQVksT0FBTztJQUNuQixTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7O0lBRTNDLFFBQVEsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7O0lBRTVELFFBQVEsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3hELEtBQUs7O0lBRUwsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRTtJQUN2QyxRQUFRLElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEQsUUFBUSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNsRyxRQUFRLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLFFBQVEsU0FBUyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFDL0IsUUFBUSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFDckMsUUFBUSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDOUMsUUFBUSxTQUFTLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxXQUFXLENBQUM7O0lBRXJELFFBQVEsT0FBTyxJQUFJLENBQUM7SUFDcEIsS0FBSzs7SUFFTCxJQUFJLE1BQU0sR0FBRztJQUNiLFFBQVEsSUFBSSxHQUFHLEdBQUc7SUFDbEIsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU87SUFDdEMsWUFBWSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSztJQUM5QyxZQUFZLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNO0lBQ2hELFNBQVMsQ0FBQzs7SUFFVixRQUFRLElBQUksR0FBRyxHQUFHLFNBQVM7SUFDM0IsWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFO0lBQ3RFLGdCQUFnQixPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxhQUFhLENBQUM7SUFDZCxTQUFTLENBQUM7SUFDVjtJQUNBO0lBQ0EsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLEtBQUs7O0lBRUwsSUFBSSxlQUFlLEdBQUc7SUFDdEIsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDdEIsS0FBSzs7SUFFTCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFO0lBQ3ZDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUU7SUFDNUMsWUFBWSxPQUFPO0lBQ25CLFNBQVM7O0lBRVQsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBQ3BDLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7O0lBRTFCLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQzs7SUFFdkQsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM5QyxLQUFLOztJQUVMLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUU7SUFDeEMsUUFBUSxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEQsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMvQyxLQUFLOztJQUVMLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUU7SUFDbkMsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ2hDLFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hFLFFBQVEsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7O0lBRTVCLFFBQVEsSUFBSSxRQUFRLEdBQUc7SUFDdkIsWUFBWSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0QsWUFBWSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDMUQsU0FBUyxDQUFDOztJQUVWLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDekUsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQzs7SUFFekU7SUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQ0QsYUFBbUIsQ0FBQztJQUN6RCxvQkFBb0IsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRTtpQ0FDWCxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0NBQ1osR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFO29CQUM1QyxDQUFDLENBQUM7O0lBRXRCLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7O0lBRW5DLFFBQVEsT0FBTyxJQUFJLENBQUM7SUFDcEIsS0FBSztJQUNMLENBQUM7O0lDaktNLE1BQU0sV0FBVyxTQUFTLGNBQWMsQ0FBQztJQUNoRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUU7SUFDL0QsUUFBUSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7O0lBRXBELFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNO0lBQ3pDLFlBQVksSUFBSSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RELFNBQVMsQ0FBQyxDQUFDO0lBQ1gsS0FBSzs7SUFFTCxJQUFJLE1BQU0sR0FBRztJQUNiLFFBQVEsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQzdDLFFBQVEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUYsUUFBUSxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwRyxRQUFRLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUIsS0FBSzs7SUFFTCxJQUFJLGFBQWEsQ0FBQyxVQUFVLEVBQUU7SUFDOUIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFBRTtJQUM1QyxZQUFZLE9BQU87SUFDbkIsU0FBUzs7SUFFVCxRQUFRLElBQUksR0FBRyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9ELFFBQVEsSUFBSSxTQUFTLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHLGlCQUFpQixDQUFDLENBQUM7SUFDakYsUUFBUSxJQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUQsUUFBUSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUVqRCxRQUFRLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLEtBQUs7SUFDTCxDQUFDOztBQUVELElBQU8sU0FBUyxhQUFhLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRztJQUMzQztJQUNBLGdCQUFnQixJQUFJLElBQUksR0FBRyxJQUFJO0lBQy9CLG9CQUFvQixDQUFDLEdBQUcsU0FBUztJQUNqQyxvQkFBb0IsR0FBRyxHQUFHLFNBQVM7SUFDbkMsb0JBQW9CLEtBQUssR0FBRyxTQUFTO0lBQ3JDLG9CQUFvQixDQUFDLEdBQUcsU0FBUztJQUNqQyxvQkFBb0IsQ0FBQyxHQUFHLFNBQVMsQ0FBQzs7SUFFbEMsZ0JBQWdCLEdBQUcsR0FBRyxHQUFHLEdBQUcsWUFBWSxFQUFFO0lBQzFDLGdCQUFnQixHQUFHLEdBQUcsR0FBRyxHQUFHLFlBQVksRUFBRTtJQUMxQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLEtBQUssR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxrQkFBa0IsS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUMvRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxLQUFLLFdBQVcsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssV0FBVyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRTtJQUNoSixnQkFBZ0IsR0FBRyxHQUFHLFNBQVMsR0FBRyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxrQkFBa0IsRUFBRTtJQUN4RixnQkFBZ0IsS0FBSyxHQUFHLGtCQUFrQixLQUFLLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRTtJQUN2RSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssaUJBQWlCO0lBQ25FLGdCQUFnQixDQUFDLEdBQUcsaUJBQWlCLEtBQUssR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztJQUNwRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDOUIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzlCLGdCQUFnQixPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ2hDOzthQUFTLFRDbERGLE1BQU0sYUFBYSxTQUFTLFVBQVUsQ0FBQztJQUM5QyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFO0lBQzdCLFFBQVEsS0FBSyxFQUFFLENBQUM7SUFDaEIsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUMzQixRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzVCLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUM7SUFDNUIsUUFBUSxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUM3QixRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQzdCLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDaEMsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztJQUNsQyxRQUFRLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNuRCxRQUFRLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQ3ZELFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7O0lBRWpDLFFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7SUFFL0IsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztJQUU3QixRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsTUFBTTtJQUM3QyxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsTUFBTTtJQUM3QyxnQkFBZ0IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3BDLGdCQUFnQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0IsYUFBYSxDQUFDLENBQUM7O0lBRWYsWUFBWSxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLE1BQU07SUFDL0MsZ0JBQWdCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQyxnQkFBZ0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ2xDLGdCQUFnQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDckMsZ0JBQWdCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMvQixnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzlCLGFBQWEsQ0FBQyxDQUFDOztJQUVmLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFELFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEUsWUFBWSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxNQUFNO0lBQzNDLGdCQUFnQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbEMsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM5QixhQUFhLENBQUMsQ0FBQzs7SUFFZixZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDN0IsZ0JBQWdCLEtBQUs7SUFDckIsZ0JBQWdCLENBQUMsSUFBSTtJQUNyQixvQkFBb0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0lBQzNEO0lBQ0Esd0JBQXdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUN0QyxxQkFBcUI7SUFDckIsaUJBQWlCO0lBQ2pCLGdCQUFnQixJQUFJO0lBQ3BCLGFBQWEsQ0FBQztJQUNkLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxNQUFNO0lBQ25ELGdCQUFnQixZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdDLGdCQUFnQixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELGFBQWEsQ0FBQyxDQUFDO0lBQ2YsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU07SUFDL0MsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM5QixnQkFBZ0IsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO0lBQ25ELG9CQUFvQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkMsaUJBQWlCO0lBQ2pCLGdCQUFnQixJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hGLGFBQWEsQ0FBQyxDQUFDO0lBQ2YsU0FBUyxDQUFDLENBQUM7SUFDWCxLQUFLOztJQUVMLElBQUksV0FBVyxHQUFHO0lBQ2xCLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxRyxRQUFRLE9BQU8sZUFBZSxDQUFDO0lBQy9CLEtBQUs7O0lBRUwsSUFBSSxXQUFXLEdBQUc7SUFDbEIsUUFBUSxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFHLFFBQVEsT0FBTyxlQUFlLENBQUM7SUFDL0IsS0FBSzs7SUFFTCxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDcEIsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUMzQixRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxlQUFlLEdBQUc7SUFDdEIsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDN0IsUUFBUSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDMUIsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDdEIsS0FBSzs7SUFFTCxJQUFJLGdCQUFnQixHQUFHO0lBQ3ZCO0lBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRCxRQUFRLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQzdFLFFBQVEsUUFBUSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7SUFDakQsUUFBUSxRQUFRLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7SUFFbEQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSTtJQUM1QixZQUFZLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUMsWUFBWSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7SUFFcEQsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtJQUM5QixnQkFBZ0IsT0FBTztJQUN2QixhQUFhOztJQUViO0lBQ0EsWUFBWSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQztJQUN6RSxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7O0lBRTNFLGdCQUFnQixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxnQkFBZ0IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVDLGFBQWE7SUFDYixTQUFTLENBQUMsQ0FBQztJQUNYLEtBQUs7O0lBRUwsSUFBSSxVQUFVLEdBQUc7SUFDakIsUUFBUSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7O0lBRTVFLFFBQVEsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RixRQUFRLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBRXRGLFFBQVEsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDN0IsS0FBSzs7SUFFTCxJQUFJLFlBQVksR0FBRztJQUNuQixRQUFRLElBQUksUUFBUSxHQUFHO0lBQ3ZCLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO0lBQ3pFLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO0lBQzFFLFNBQVMsQ0FBQzs7SUFFVixRQUFRLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNyQixRQUFRLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQzs7SUFFckIsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUM5QyxZQUFZLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ2xELGdCQUFnQixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6QyxhQUFhO0lBQ2IsU0FBUzs7SUFFVCxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQzlDLFlBQVksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7SUFDbEQsZ0JBQWdCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDakMsb0JBQW9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRCxvQkFBb0IsU0FBUztJQUM3QixpQkFBaUI7SUFDakIsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLGFBQWE7SUFDYixTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUM7O0lBRWpDO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7O0lBRUE7SUFDQTtJQUNBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQSxLQUFLOztJQUVMLElBQUksZUFBZSxHQUFHO0lBQ3RCO0lBQ0EsUUFBUSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNyRSxLQUFLOztJQUVMLElBQUksTUFBTSxHQUFHO0lBQ2IsUUFBUSxJQUFJLE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO0lBQ3RFLFFBQVEsSUFBSSxXQUFXLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLFFBQVEsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDekQsUUFBUSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDM0IsUUFBUSxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUM7SUFDOUIsUUFBUSxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUM7O0lBRTlCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7O0lBRXBDO0lBQ0EsUUFBUSxJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ25FLHNCQUFzQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEtBQUssRUFBRSxDQUFDOztJQUVoRSxRQUFRLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztJQUN4RSxRQUFRLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQzs7SUFFckUsUUFBUSxJQUFJLFdBQVcsR0FBRztJQUMxQixZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0RixZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsR0FBRyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUNyRixTQUFTLENBQUM7O0lBRVYsUUFBUSxJQUFJLGVBQWUsR0FBRztJQUM5QixZQUFZLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDOUUsWUFBWSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQzlFLFNBQVMsQ0FBQzs7SUFFVixRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUM1RCxZQUFZLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLFlBQVksTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0lBRXBFLFlBQVksV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUU5RDtJQUNBLFlBQVksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztJQUM1QyxpQkFBaUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLGlCQUFpQixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFOztJQUV4RSxnQkFBZ0IsU0FBUztJQUN6QixhQUFhOztJQUViLFlBQVksS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUNoRixZQUFZLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7O0lBRWhGLFlBQVksT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDcEMsZ0JBQWdCLENBQUMsRUFBRSxLQUFLO0lBQ3hCLGdCQUFnQixDQUFDLEVBQUUsS0FBSztJQUN4QixnQkFBZ0IsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JFLGFBQWEsQ0FBQyxDQUFDOztJQUVmLFlBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLENBQUM7O0lBRW5ELFlBQVksUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELEtBQUs7SUFDTCxDQUFDOztJQUVELFNBQVMsUUFBUSxDQUFDLEdBQUcsRUFBRTtJQUN2QixJQUFJLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEQsSUFBSSxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUNsQztJQUNBLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsaUNBQWlDLENBQUM7SUFDOUQsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7SUFDbEY7SUFDQSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDO0lBQ3BDLElBQUksT0FBTyxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUM7SUFDdEMsSUFBSSxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7O0lBRTFCLElBQUksT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQzs7SUFFRCxTQUFTLGNBQWMsQ0FBQyxDQUFDLEVBQUU7SUFDM0IsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUN2QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztJQUMzQjtJQUNBO0lBQ0EsQ0FBQzs7SUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFDLEVBQUU7SUFDNUIsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7O0lDelBNLE1BQU0sZUFBZSxTQUFTLGFBQWEsQ0FBQztJQUNuRCxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFO0lBQzdCLFFBQVEsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzQixLQUFLOztJQUVMLElBQUksV0FBVyxHQUFHO0lBQ2xCO0lBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDMUMsUUFBUSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7O0lBRTVGLFFBQVEsT0FBTyxNQUFNLENBQUM7O0lBRXRCO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLEtBQUs7O0lBRUwsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO0lBQ3ZCO0lBQ0EsUUFBUSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUQsS0FBSzs7SUFFTCxJQUFJLDBCQUEwQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDckMsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFDbEQsUUFBUSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUV0QyxRQUFRLElBQUksTUFBTSxHQUFHO0lBQ3JCLFlBQVksR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0UsWUFBWSxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3RSxZQUFZLEdBQUcsRUFBRSxTQUFTO0lBQzFCLFlBQVksR0FBRyxFQUFFLFNBQVM7SUFDMUIsU0FBUyxDQUFDOztJQUVWLFFBQVEsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsUUFBUSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRTtJQUNBOztJQUVBLFFBQVEsT0FBTyxNQUFNLENBQUM7SUFDdEIsS0FBSztJQUNMLENBQUM7O0lDOUNNLE1BQU0sMEJBQTBCLFNBQVMsYUFBYSxDQUFDO0lBQzlEO0lBQ0EsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRTtJQUM3QixRQUFRLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDM0IsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDO0lBQ3hDLEtBQUs7O0lBRUwsSUFBSSw0QkFBNEIsQ0FBQyxRQUFRLENBQUM7SUFDMUM7SUFDQSxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUMxQyxRQUFRLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM5QyxRQUFRLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEY7SUFDQSxRQUFRLE9BQU87SUFDZixZQUFZLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNoQyxZQUFZLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNoQyxTQUFTLENBQUM7SUFDVixLQUFLOztJQUVMLElBQUksd0JBQXdCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRTtJQUNoRDtJQUNBLFFBQVEsSUFBSSxLQUFLLEdBQUcsa0JBQWtCLENBQUM7SUFDdkMsUUFBUSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQzs7SUFFL0UsUUFBUSxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0MsUUFBUSxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDOztJQUU5QyxRQUFRLE9BQU87SUFDZixZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDO0lBQzFDLFlBQVksQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUM7SUFDekMsU0FBUyxDQUFDO0lBQ1YsS0FBSztJQUNMLENBQUM7Ozs7SUFJRCxTQUFTLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7SUFDcEM7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDaEIsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoQixJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7O0lBRUQsY0FBYyxDQUFDLFNBQVMsR0FBRztJQUMzQjtJQUNBO0lBQ0E7SUFDQSxJQUFJLFNBQVMsRUFBRSxVQUFVLEtBQUssRUFBRSxLQUFLLEVBQUU7SUFDdkMsUUFBUSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JELEtBQUs7O0lBRUw7SUFDQSxJQUFJLFVBQVUsRUFBRSxVQUFVLEtBQUssRUFBRSxLQUFLLEVBQUU7SUFDeEMsUUFBUSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUMzQixRQUFRLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEQsUUFBUSxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELFFBQVEsT0FBTyxLQUFLLENBQUM7SUFDckIsS0FBSzs7SUFFTDtJQUNBO0lBQ0E7SUFDQSxJQUFJLFdBQVcsRUFBRSxVQUFVLEtBQUssRUFBRSxLQUFLLEVBQUU7SUFDekMsUUFBUSxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUMzQixRQUFRLE9BQU87SUFDZixlQUFlLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUU7SUFDdkQsZUFBZSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFO0lBQ3ZELFNBQVMsQ0FBQztJQUNWLEtBQUs7SUFDTCxDQUFDLENBQUM7O0FBRUYsQUFBVSxRQUFDLGNBQWMsSUFBSSxZQUFZO0lBQ3pDLFFBQVEsSUFBSSxLQUFLLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDOUM7SUFDQSxRQUFRLE9BQU8sSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzRCxLQUFLLEVBQUUsQ0FBQzs7SUNwRkQsU0FBUyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtJQUM5QixJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUMxQixRQUFRLE9BQU87SUFDZixZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkIsU0FBUyxDQUFDO0lBQ1YsS0FBSztJQUNMLElBQUksSUFBSSxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ3pCO0lBQ0EsUUFBUSxPQUFPO0lBQ2YsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN6QixZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsQ0FBQztJQUNWLEtBQUs7SUFDTCxJQUFJLE9BQU87SUFDWCxRQUFRLENBQUMsRUFBRSxDQUFDO0lBQ1osUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUNaLEtBQUssQ0FBQztJQUNOLENBQUM7O0lBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOztJQUVuQyxNQUFNLENBQUMsU0FBUyxDQUFDLDRCQUE0QixHQUFHLFNBQVMsT0FBTyxFQUFFO0lBQ2xFLElBQUksSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRixRQUFRLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUY7O0lBRUE7O0lBRUEsSUFBSSxPQUFPO0lBQ1gsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxNQUFNO0lBQ3ZELFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLElBQUksTUFBTTtJQUN2RCxLQUFLLENBQUM7SUFDTixDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsR0FBRyxTQUFTLEtBQUssRUFBRTtJQUN0RSxJQUFJLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7SUFFL0QsSUFBSSxPQUFPO0lBQ1gsUUFBUSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUk7SUFDbEQsUUFBUSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUc7SUFDakQsS0FBSyxDQUFDO0lBQ04sQ0FBQyxDQUFDOztJQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEdBQUcsU0FBUyxLQUFLLEVBQUU7SUFDM0QsSUFBSSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzs7SUFFakUsSUFBSSxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO0lBQ3JELElBQUksSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQzs7SUFFdEQsSUFBSSxPQUFPO0lBQ1gsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxRQUFRO0lBQ3JELFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxRQUFRLEdBQUcsUUFBUTtJQUN0RCxLQUFLLENBQUM7SUFDTixDQUFDLENBQUM7O0lBRUY7QUFDQSxJQUFPLFNBQVMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFO0lBQzFDLElBQUksSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDdEIsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN2QjtJQUNBLElBQUksSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJO0lBQy9CLFFBQVEsR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRztJQUM3QixRQUFRLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUk7SUFDL0IsUUFBUSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHO0lBQzdCLFFBQVEsR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRztJQUM3QixRQUFRLEtBQUssR0FBRyxTQUFTO0lBQ3pCLFFBQVEsR0FBRyxHQUFHLFNBQVM7SUFDdkIsUUFBUSxLQUFLLEdBQUcsU0FBUztJQUN6QixRQUFRLEdBQUcsR0FBRyxTQUFTO0lBQ3ZCLFFBQVEsR0FBRyxHQUFHLFNBQVM7SUFDdkIsUUFBUSxJQUFJLEdBQUcsU0FBUztJQUN4QixRQUFRLElBQUksR0FBRyxTQUFTO0lBQ3hCLFFBQVEsR0FBRyxHQUFHLFNBQVM7SUFDdkIsUUFBUSxHQUFHLEdBQUcsU0FBUyxDQUFDOztJQUV4QixJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDaEMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoQixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsSUFBSSxpQkFBaUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksVUFBVSxHQUFHLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUM7SUFDL0UsSUFBSSxHQUFHLEdBQUcsS0FBSyxHQUFHLGtCQUFrQixHQUFHLENBQUMsa0JBQWtCLENBQUM7SUFDM0QsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ2hDLElBQUksSUFBSSxHQUFHLGtCQUFrQixHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsYUFBYSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsYUFBYSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlFLElBQUksSUFBSSxHQUFHLGtCQUFrQixHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsV0FBVyxFQUFFO0lBQzNDLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNwQixRQUFRLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEYsUUFBUSxJQUFJLEdBQUcsa0JBQWtCLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsRixLQUFLO0lBQ0wsSUFBSSxHQUFHLEdBQUcsSUFBSSxHQUFHLGFBQWEsQ0FBQztJQUMvQixJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsYUFBYSxDQUFDO0lBQzlCLElBQUksT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ2xDLENBQUM7O0lBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQzs7SUFFckQ7SUFDQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBOztJQUVBOztJQUVBO0lBQ0E7SUFDQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7O0lBRUE7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQTs7SUFFQTs7SUFFQSxNQUFNLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxHQUFHLFNBQVMsUUFBUSxFQUFFO0lBQzFFO0lBQ0E7SUFDQTtJQUNBOztJQUVBO0lBQ0E7O0lBRUEsSUFBSSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEIsSUFBSSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEIsSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDO0lBQzdCLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLGtCQUFrQixDQUFDO0lBQ3pDLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUM7SUFDbEQsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUNuQyxJQUFJLElBQUksSUFBSSxHQUFHLGtCQUFrQixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxrQkFBa0IsQ0FBQztJQUM1QyxDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxHQUFHLEVBQUU7SUFDekM7SUFDQSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLElBQUksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQyxJQUFJLElBQUksT0FBTyxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7SUFDOUIsSUFBSSxJQUFJLE9BQU8sR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQy9CLElBQUksSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxJQUFJLE9BQU8sR0FBRyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQy9CLElBQUksSUFBSSxPQUFPLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUMvQjtJQUNBLElBQUksT0FBTyxJQUFJLEdBQUcsQ0FBQztJQUNuQixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xDLElBQUksT0FBTyxJQUFJLEdBQUcsQ0FBQztJQUNuQixJQUFJLE9BQU8sS0FBSyxHQUFHLFNBQVMsR0FBRyxNQUFNLEdBQUcsU0FBUyxHQUFHLE9BQU8sR0FBRyxRQUFRLENBQUM7SUFDdkUsQ0FBQyxDQUFDOztJQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLEdBQUcsU0FBUyxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRTtJQUM3RixJQUFJLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDaEUsSUFBSSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOztJQUVqRSxJQUFJLElBQUksTUFBTSxHQUFHLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQUNuRCxJQUFJLElBQUksTUFBTSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQzs7SUFFckQsSUFBSSxJQUFJLElBQUksR0FBRyxTQUFTLEdBQUcsTUFBTSxDQUFDO0lBQ2xDLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxNQUFNLENBQUM7O0lBRXJDLElBQUksSUFBSSxRQUFRLEVBQUU7SUFDbEIsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbkQsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbkQsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDbEQsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDbEQsUUFBUSxPQUFPO0lBQ2YsS0FBSzs7SUFFTCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ2xDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztJQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDakMsQ0FBQyxDQUFDOztJQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLEdBQUcsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtJQUNoRixJQUFJLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELElBQUksSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUM5QixJQUFJLElBQUksR0FBRyxHQUFHLEVBQUUsR0FBRyxVQUFVLENBQUM7SUFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUM7SUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDakMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO0lBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztJQUNqQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDakMsQ0FBQyxDQUFDOztJQUVGLE1BQU0sQ0FBQyxTQUFTLENBQUMsOEJBQThCLEdBQUcsU0FBUyxRQUFRLEVBQUUsT0FBTyxFQUFFO0lBQzlFLElBQUksSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNoRSxJQUFJLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7O0lBRWpFLElBQUksSUFBSSxPQUFPLEtBQUssQ0FBQyxFQUFFO0lBQ3ZCLFFBQVEsT0FBTyxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUMzQyxRQUFRLFFBQVEsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDN0MsS0FBSzs7SUFFTCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNsRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNuRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxRQUFRLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsR0FBRyxTQUFTLFFBQVEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFO0lBQ2xHLElBQUksSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDbEM7SUFDQSxJQUFJLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQztJQUN6RCxJQUFJLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQzs7SUFFM0QsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RCxJQUFJLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUV4RCxJQUFJLElBQUksT0FBTyxJQUFJLENBQUMsRUFBRTtJQUN0QixRQUFRLE9BQU8sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLEtBQUssTUFBTTtJQUNYLFFBQVEsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLEtBQUs7O0lBRUwsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLE9BQU8sR0FBRyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3hDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztJQUM1QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxHQUFHLE9BQU8sR0FBRyxNQUFNLENBQUM7SUFDekMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQzdCLENBQUMsQ0FBQzs7SUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLDJCQUEyQixHQUFHLFNBQVMsS0FBSyxFQUFFO0lBQy9ELElBQUksT0FBTztJQUNYLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJO0lBQzNDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHO0lBQzFDLEtBQUssQ0FBQztJQUNOLENBQUMsQ0FBQzs7SUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFpQixHQUFHLFNBQVMsS0FBSyxFQUFFO0lBQ3JELElBQUksSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7SUFDN0MsSUFBSSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQzs7SUFFNUMsSUFBSSxPQUFPO0lBQ1gsUUFBUSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxVQUFVO0lBQy9CLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsVUFBVTtJQUMvQixLQUFLLENBQUM7SUFDTixDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0lBQ2xEO0lBQ0EsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQzs7SUFFRixNQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixHQUFHLFNBQVMsT0FBTyxFQUFFO0lBQzFELElBQUksSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JEO0lBQ0EsSUFBSSxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEdBQUcsU0FBUyxJQUFJLEVBQUU7SUFDaEQsSUFBSSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7SUFDeEIsUUFBUSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQy9DLEtBQUs7SUFDTDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQSxJQUFJLElBQUksTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0MsSUFBSSxJQUFJLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQztJQUNwQyxJQUFJLElBQUksR0FBRyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7O0lBRTlCLElBQUksT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDLENBQUM7O0lBRUYsTUFBTSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsR0FBRztJQUM1QztJQUNBO0lBQ0E7SUFDQSxJQUFJLE1BQU0sRUFBRSxPQUFPO0lBQ25CLElBQUksWUFBWSxFQUFFLGFBQWE7SUFDL0IsSUFBSSxLQUFLLEVBQUUsa0JBQWtCOztJQUU3QixJQUFJLG1CQUFtQixFQUFFLFNBQVMsTUFBTSxFQUFFO0lBQzFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHO0lBQzdCLFlBQVksR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZO0lBQ25DLFlBQVksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQzNELFlBQVksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDOztJQUVwQyxRQUFRLE9BQU87SUFDZixZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUMzQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDaEUsU0FBUyxDQUFDO0lBQ1YsS0FBSzs7SUFFTCxJQUFJLGlCQUFpQixFQUFFLFNBQVMsS0FBSyxFQUFFO0lBQ3ZDLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFO0lBQzdCLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7O0lBRTVCLFFBQVEsT0FBTztJQUNmLFlBQVksR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQztJQUN6RSxZQUFZLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQ2hDLFNBQVMsQ0FBQztJQUNWLEtBQUs7SUFDTCxDQUFDLENBQUM7O0lBRUY7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7O0lBRUE7SUFDQTtJQUNBO0lBQ0E7Ozs7SUFJQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBOztJQUVBO0lBQ0E7Ozs7SUFJQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7Ozs7SUFJQSxFQUFFOztJQ2xaRjtJQUNBOztJQUVBO0lBQ0E7SUFDQSxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7O0lBRXZCO0lBQ0E7O0FBRUEsSUFBTyxNQUFNLFlBQVksU0FBUyx1QkFBdUIsQ0FBQztJQUMxRCxJQUFJLFdBQVcsQ0FBQyxJQUFJLEVBQUU7SUFDdEIsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7O0lBRXBCLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDOztJQUVsQyxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDOztJQUU1QixRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQzs7SUFFeEMsUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtJQUNyQyxZQUFZLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNoQyxTQUFTLENBQUMsQ0FBQzs7SUFFWCxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxFQUFFO0lBQ3pDLFlBQVksQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2hDLFNBQVMsQ0FBQyxDQUFDOztJQUVYLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxJQUFJO0lBQ3RDLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkUsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDOztJQUVoRixZQUFZLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDOztJQUV0QyxZQUFZLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM3QixTQUFTLENBQUMsQ0FBQztJQUNYLEtBQUs7O0lBRUwsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFO0lBQ3ZCLFFBQVEsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQzs7SUFFbkMsUUFBUSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQzs7SUFFdkMsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7SUFFaEQsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUVsRSxRQUFRLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtJQUNoQyxZQUFZLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM3QixTQUFTOztJQUVULFFBQVEsT0FBTyxJQUFJLENBQUM7SUFDcEIsS0FBSzs7SUFFTCxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUU7SUFDeEIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUVqRCxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO0lBQ3RCLFFBQVEsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQzlCLFFBQVEsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDOztJQUUxQixRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRTtJQUNyQyxZQUFZLE1BQU0sS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7SUFDcEUsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDOztJQUUzQixRQUFRLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRTtJQUN6RSxZQUFZLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2hELFNBQVMsQ0FBQyxDQUFDOztJQUVYLFFBQVEsT0FBTyxJQUFJLENBQUM7SUFDcEIsS0FBSzs7SUFFTCxJQUFJLElBQUksR0FBRztJQUNYLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRTtJQUNyQyxZQUFZLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM3QixZQUFZLE9BQU8sSUFBSSxDQUFDO0lBQ3hCLFNBQVM7O0lBRVQsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFFaEMsUUFBUSxPQUFPLElBQUksQ0FBQztJQUNwQixLQUFLOztJQUVMLElBQUksSUFBSSxHQUFHO0lBQ1gsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO0lBQ3JDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5RCxZQUFZLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQ3ZDLFNBQVM7SUFDVCxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqRSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDOztJQUVwRSxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUU7SUFDeEIsUUFBUSxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEtBQUssd0JBQXdCLENBQUM7O0lBRS9FLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztJQUU5QyxRQUFRLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzs7SUFFekIsUUFBUSxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pDLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNwSCxLQUFLOztJQUVMLElBQUksTUFBTSxHQUFHO0lBQ2IsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDcEIsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzs7SUFFNUIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsQyxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7O0lBRUwsSUFBSSxXQUFXLEdBQUc7SUFDbEIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtJQUNqQyxZQUFZLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdFQUFnRSxDQUFDLENBQUM7SUFDbEcsWUFBWSxPQUFPLElBQUksQ0FBQztJQUN4QixTQUFTO0lBQ1QsUUFBUSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztJQUM1QyxRQUFRLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUN4RCxRQUFRLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztJQUN4QixRQUFRLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7O0lBRW5DLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFO0lBQ3hDLFlBQVksS0FBSyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ2pELFNBQVM7O0lBRVQsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLEVBQUU7SUFDaEQsWUFBWSxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7SUFDekQsU0FBUyxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLEVBQUU7SUFDcEYsWUFBWSxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUM7SUFDeEYsU0FBUzs7SUFFVCxRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFO0lBQ2hDLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELFNBQVM7SUFDVCxLQUFLOztJQUVMLElBQUksU0FBUyxHQUFHO0lBQ2hCLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7SUFDakMsWUFBWSxPQUFPLElBQUksQ0FBQztJQUN4QixTQUFTOztJQUVULFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7O0lBRXhDLFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7O0lBRXRGLFFBQVEsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELFFBQVEsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUVqRCxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDQSxhQUFtQixDQUFDLEdBQUcsWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDOztJQUVwRyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDOztJQUV6QyxRQUFRLE9BQU8sSUFBSSxDQUFDO0lBQ3BCLEtBQUs7SUFDTCxDQUFDOztBQUVELElBQU8sTUFBTSxVQUFVLFNBQVMsWUFBWSxDQUFDO0lBQzdDLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUU7SUFDcEMsUUFBUSxJQUFJLFFBQVEsR0FBRztJQUN2QixZQUFZLE1BQU0sRUFBRSxTQUFTO0lBQzdCLFlBQVksV0FBVyxFQUFFLFNBQVM7SUFDbEMsWUFBWSxhQUFhLEVBQUUsV0FBVyxFQUFFO0lBQ3hDLFNBQVMsQ0FBQzs7SUFFVixRQUFRLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDOztJQUV6QyxRQUFRLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7O0lBRXRDLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7O0lBRWhDLFFBQVEsU0FBUyxHQUFHLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDOztJQUUxRCxRQUFRLElBQUksU0FBUyxFQUFFO0lBQ3ZCLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN0QyxTQUFTO0lBQ1QsS0FBSzs7SUFFTCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFO0lBQ3JDLFFBQVEsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzFCLFFBQVEsSUFBSSxNQUFNLEdBQUcsZUFBZSxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFFMUUsUUFBUSxNQUFNLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztJQUN4RCxhQUFhLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO0lBQzlDLGFBQWEsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFFbEMsUUFBUSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7SUFFOUQsUUFBUSxNQUFNLENBQUMsU0FBUyxHQUFHLFdBQVc7SUFDdEMsWUFBWSxJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUU7SUFDdEMsZ0JBQWdCLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQ3BELGdCQUFnQixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3pDLGFBQWEsTUFBTTtJQUNuQixnQkFBZ0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xELGFBQWE7SUFDYixhQUFhLE1BQU07SUFDbkIsZ0JBQWdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLFNBQVMsSUFBSSxDQUFDLENBQUMsRUFBRTtJQUM1RCxvQkFBb0IsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3ZDLG9CQUFvQixNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0RCxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25CLGFBQWE7SUFDYixTQUFTLENBQUM7O0lBRVYsUUFBUSxNQUFNLENBQUMsU0FBUyxHQUFHLFdBQVc7SUFDdEMsWUFBWSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2hDLFNBQVMsQ0FBQzs7SUFFVixRQUFRLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7O0lBRTdDLFFBQVEsTUFBTSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQzs7SUFFekQsUUFBUSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7O0lBRTNCLFFBQVEsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQzVCLEtBQUs7SUFDTCxDQUFDOztBQUVELElBQU8sU0FBUyxVQUFVLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRTtJQUMvQyxJQUFJLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztJQUN4QyxDQUFDOztBQUVELElBQU8sU0FBUyxTQUFTLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtJQUMvRTs7SUFFQSxJQUFJLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsSUFBSSxFQUFFLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQzs7SUFFakMsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQzs7SUFFckMsSUFBSSxJQUFJLFdBQVcsRUFBRTtJQUNyQixRQUFRLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsS0FBSzs7SUFFTCxJQUFJLEtBQUssQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7O0lBRWhELElBQUksS0FBSyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7O0lBRWhDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLEVBQUU7SUFDMUMsUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUFFO0lBQ3hELFlBQVksQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2hDLFNBQVMsQ0FBQyxDQUFDO0lBQ1gsS0FBSyxDQUFDLENBQUM7O0lBRVAsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsRUFBRTtJQUN6QyxRQUFRLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2pDLEtBQUssQ0FBQyxDQUFDOztJQUVQLElBQUksS0FBSyxDQUFDLGdCQUFnQixHQUFHLFdBQVc7SUFDeEMsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQzlCLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyRCxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzs7SUFFMUQsUUFBUSxPQUFPLEtBQUssQ0FBQztJQUNyQixLQUFLLENBQUM7O0lBRU4sSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsV0FBVyxFQUFFO0lBQzdDLFFBQVEsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7O0lBRTlDLFFBQVEsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUU7SUFDN0MsWUFBWSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQztJQUMzRCxTQUFTLE1BQU07SUFDZixZQUFZLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDNUQsU0FBUzs7SUFFVCxRQUFRLEtBQUssQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDOztJQUVwQyxRQUFRLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQzs7SUFFMUIsUUFBUSxPQUFPLEtBQUssQ0FBQztJQUNyQixLQUFLLENBQUM7O0lBRU4sSUFBSSxJQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JELElBQUksWUFBWSxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztJQUNsRCxJQUFJLFlBQVksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0lBQ3RDLElBQUksWUFBWSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDL0IsSUFBSSxLQUFLLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUN0QyxJQUFJLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNyRSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7O0lBRWpDLElBQUksSUFBSSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pELElBQUksZ0JBQWdCLENBQUMsU0FBUyxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUM7SUFDbkQsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUM7SUFDcEQsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztJQUMzQyxJQUFJLGdCQUFnQixDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbkMsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFDOUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUM7O0lBRXJDLElBQUksSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDeEIsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDOztJQUUxQixJQUFJLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkQsSUFBSSxVQUFVLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFDO0lBQzlDLElBQUksS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDbEMsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDOztJQUVsQyxJQUFJLE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7O0lBRUQsU0FBUyxXQUFXLEdBQUc7SUFDdkIsSUFBSSxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9DLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyw2REFBNkQsQ0FBQztJQUMvRTs7SUFFQTs7SUFFQSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEdBQUcsU0FBUyxHQUFHLGNBQWMsRUFBRSxDQUFDO0lBQzdDO0lBQ0EsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdkMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7SUFDaEMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7SUFDaEMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDaEMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7SUFDakMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7SUFDbkMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFDMUM7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsTUFBTSxDQUFDO0lBQ3ZDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0lBQ3BDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0lBQ3RDLElBQUksTUFBTSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7SUFDdkM7SUFDQTtJQUNBLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDOztJQUVyQyxJQUFJLE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7O0lDblZELE1BQU0sQ0FBQyxNQUFNO0lBQ2IsSUFBSSxNQUFNLENBQUMsU0FBUztJQUNwQixJQUFJLGlCQUFpQjtJQUNyQixJQUFJLGVBQWU7SUFDbkIsSUFBSSxjQUFjO0lBQ2xCLElBQUksaUJBQWlCO0lBQ3JCLElBQUksdUJBQXVCO0lBQzNCLENBQUMsQ0FBQzs7SUFFRixTQUFTLGlCQUFpQixDQUFDLENBQUMsRUFBRTtJQUM5QixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtJQUN0QixRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQzVCLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELFFBQVEsT0FBTztJQUNmLEtBQUs7O0lBRUwsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDOztJQUV6QyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixJQUFJLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQzs7SUFFeEI7SUFDQTtJQUNBLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDOztJQUV2QyxJQUFJLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2RCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxHQUFHLGVBQWUsQ0FBQztJQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztJQUNuRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU87SUFDcEMsUUFBUSx1RkFBdUYsQ0FBQzs7SUFFaEcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7O0lBRWpELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsWUFBWTtJQUMzQyxRQUFRLElBQUksQ0FBQyxPQUFPO0lBQ3BCLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPO0lBQ3BDLEtBQUssQ0FBQzs7SUFFTixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHO0lBQzFCLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSTtJQUMzRCxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUc7SUFDekQsS0FBSyxDQUFDOztJQUVOLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2xFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2pFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQzs7SUFFcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRztJQUN6QixRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTztJQUNwQixRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTztJQUNwQixLQUFLLENBQUM7O0lBRU4sSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzs7SUFFN0I7SUFDQSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7SUFFcEQsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUQsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0QsQ0FBQzs7SUFFRCxTQUFTLGlCQUFpQixDQUFDLENBQUMsRUFBRTtJQUM5QixJQUFJLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7SUFDMUMsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJO0lBQy9CLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDaEUsUUFBUSxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0lBQzlDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRztJQUNsQyxnQkFBZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDcEUsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9FLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNoRixTQUFTLE1BQU07SUFDZixZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDOUUsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9FLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNoRixTQUFTO0lBQ1QsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7SUFDakQsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzNFLFFBQVEsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtJQUM5QyxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUc7SUFDbEMsZ0JBQWdCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3BFLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUMvRSxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDaEYsU0FBUyxNQUFNO0lBQ2YsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzlFLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUMvRSxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDaEYsU0FBUztJQUNULEtBQUs7SUFDTCxJQUFJLElBQUksQ0FBQyx1QkFBdUI7SUFDaEMsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNO0lBQ2pDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSztJQUNoQyxLQUFLLENBQUM7SUFDTixDQUFDOztJQUVELFNBQVMsZUFBZSxDQUFDLENBQUMsRUFBRTtJQUM1QixJQUFJLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRCxJQUFJLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDM0UsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNFLElBQUksSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLDJCQUEyQjtJQUNqRCxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbkQsS0FBSyxDQUFDOztJQUVOLElBQUksUUFBUSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELElBQUksUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztJQUU5RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRywyQkFBMkIsQ0FBQztJQUMxRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7O0lBRW5DLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQzs7SUFFeEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7O0lBRXBELElBQUk7SUFDSixRQUFRLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTztJQUNoRCxRQUFRLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTztJQUNoRCxNQUFNO0lBQ04sUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUM1QixRQUFRLE9BQU87SUFDZixLQUFLOztJQUVMLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7O0lBRXhCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUN4QixRQUFRLE1BQU07SUFDZCxRQUFRLEtBQUs7SUFDYixRQUFRLE1BQU07SUFDZCxLQUFLLENBQUMsQ0FBQztJQUNQLENBQUM7O0lBRUQsU0FBUyxjQUFjLENBQUMsR0FBRyxFQUFFO0lBQzdCLElBQUksSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRSxJQUFJLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztJQUN0QixJQUFJLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQztJQUNyQixJQUFJLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQzs7SUFFMUIsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLEVBQUU7SUFDMUQsUUFBUSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEMsUUFBUSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUM7SUFDdkMsUUFBUSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7O0lBRXpDLFFBQVE7SUFDUixZQUFZLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU07SUFDN0MsWUFBWSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLO0lBQzNDLFVBQVU7SUFDVixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkIsWUFBWSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hELFlBQVksTUFBTTtJQUNsQixTQUFTO0lBQ1QsS0FBSztJQUNMLENBQUM7O0lBRUQsU0FBUyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFO0lBQ2hELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUztJQUN0QyxRQUFRLFlBQVksSUFBSSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUMzRSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7In0=
