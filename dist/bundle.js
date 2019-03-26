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

            this.eventsObj[p_type].push({fn: p_func, _this: opt_this});

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
            return 'Zombie callback works real hard.';
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
            //this.zoom = 0;

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
                let ary = this.init.initArr;

                for (let n = 0; n < ary.length; n++) {
                    // Call additional functions an extension
                    // might have added.
                    ary[n].fn.call(ary[n].ctx || this);
                }
            }
        }

        static onInitDone(fn, ctx) {
            // Testing an idea about how to extend the init function.
            let ary = this.prototype.init.initarr;
            if (!ary) {
                ary = this.prototype.init.initArr = [];
            }
            ary.push({fn, ctx});
        }

        setView(spPoint, zoom) {
            spPoint = this.toPoint(spPoint);

            this.zoom = zoom;

            let heightRatio = this.mapContainer.height / this.mapContainer.width;
            let resolution = this.mapContainer.width * this.getResolution(zoom);

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

        updateContainerSize(doPanToMidPoint) {
            let visibleExtent = this.extent.visible;
            let mapContainer = this.mapContainer;
            let containerRect = mapContainer.element.getBoundingClientRect();

            mapContainer.width = this.parameters.container.clientWidth;
            mapContainer.height = this.parameters.container.clientHeight;

            mapContainer.left = containerRect.left;
            mapContainer.top = containerRect.top;

            mapContainer.element.style.height = mapContainer.height + 'px';
            mapContainer.element.style.width = mapContainer.width + 'px';

            let midPoint = {
                x: visibleExtent.x + (visibleExtent.x - visibleExtent.x) / 2,
                y: visibleExtent.y + (visibleExtent.Y - visibleExtent.y) / 2,
            };

            let heightRatio = mapContainer.height / mapContainer.width;
            let resolution = mapContainer.width * this.getResolution(this.zoom);

            this.extent.visible = {
                x: visibleExtent.x,
                X: visibleExtent.x + resolution,
                y: visibleExtent.Y - resolution * heightRatio,
                Y: visibleExtent.Y,
            };

            this.event.fire('updateContainerSize', this);

            if (doPanToMidPoint) {
                this.panning_module.panTo(midPoint);
            }
        }

        makeContainers() {
            this.mapContainer = this.makeContainer(document.createElement('div'));
            this.mapContainer.element.className = '_theMapContainer_';
            this.mapContainer.element.style.cssText =
                'position: relative; overflow: hidden; background-color: white;';

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

    Object.assign(NewMap.prototype, {
        calcZoomDelta,
        zoomTo,
        zoomInOut,
    });

    NewMap.onInitDone(function() {
        // Testing an idea about how to exend the init function.
        this.zoom = 0;
    });

    function calcZoomDelta(zoomLvl, zoomDelta, minZoom, maxZoom) {
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
    }

    function zoomTo(projPoint, zoom, projOrigin) {
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
    }
    function zoomInOut(p_evt) {
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
    }

    class BasicLayer extends BasicEventSystem {
        constructor(hideDuringZoom) {
            super();
            this.map = null;
            this.container = null;
            this.hideDuringZoom = hideDuringZoom;
            this.zoomObj = {xOffset: 0, yOffset: 0};
            this.zoomLvl = null;
            this.zoomTimer = null;
            this.zoomIndex = null;
            this.zoomEndms = 200;
            // this.fractionOffset = { x: 0, y: 0 }; TODO: Remove this whenever.
            this.viewPortTopLeftWorldPxls = {x: 0, y: 0};
        }

        setZoomIndex(index) {
            this.zoomIndex = index;
        }

        setZindex(zIndex) {
            this.zIndex = zIndex;
        }

        addEventListeners() {
            if (this.hideDuringZoom) {
                this.map.event.on(
                    MOUSE_WHEEL_EVT,
                    this._hideContainerDuringMouseWheelEvt,
                    this,
                );
            } else {
                this.map.event.on(MOUSE_WHEEL_EVT, this._mouseWheelEvt, this);
            }

            this.map.event.on('updateContainerSize', this.updateContainer, this);
            this.map.event.on(
                'update everything',
                this.fire.bind(this, 'update everything'),
                this,
            );

            this.on('zoom end', this._zoomEndEvt, this);

            this.fire('add event listeners');
        }

        _zoomEndEvt(p_evt) {
            clearTimeout(this.zoomTimer);

            this.zoomTimer = setTimeout(
                () => this.fire('zoom delay end', p_evt),
                this.zoomEndms,
            );
        }

        _hideContainerDuringMouseWheelEvt() {
            this.container.element.style.display = 'none';
            this.fire('zoom end');
        }

        _mouseWheelEvt(p_evt) {
            // let point = { x: p_evt.x, y: p_evt.y };

            if (p_evt.scale === 1) {
                p_evt.noZoom = true;
                this.fire('zoom end', p_evt);
                return;
            }

            if (p_evt.__event__.___delta >= 120) {
                this.zoomInOut(p_evt, 'zoom in');
            } else if (p_evt.__event__.___delta <= -120) {
                this.zoomInOut(p_evt, 'zoom out');
            }
        }

        addTo(map) {
            if (this.map === map) {
                console.error('Layer already added to map', this);
                return this;
            }

            this.map = map;
            this.container = this.createContainer();
            this.setZoomIndex(this.zoomIndex || this.map.zoomIndex);

            map.addTo(this.container.element, map.mainContainer.element, () => {
                this.addEventListeners();
                this.fire('appended to map');
            });

            return this;
        }

        remove() {
            this.container.element.parentElement.removeChild(
                this.container.element,
            );
            this.map.event.allOff(this);
            this.fire('remove', this);
            this.map = null;
        }

        update() {
            // To be implimented by classes that extend this class.
        }

        updateContainer() {
            // To be implimented by classes that extend this class.
            console.log(
                "The method 'updateContainer' in " +
                    this.constructor.name +
                    " wasn't implimented",
                this,
            );
            this.fire('update everything');
        }

        createContainer() {
            let cont = {
                element: document.createElement('div'),
                left: 0 - this.map.mainContainer.left,
                top: 0 - this.map.mainContainer.top,
                updateTransform: undefined,
            };

            cont.updateTransform = this.updateContainerTransform.bind({
                container: cont,
            });

            cont.element.className = '_tileContainer_';
            cont.element.style.position = 'absolute';
            cont.element.style.left = '0px';
            cont.element.style.top = '0px';
            cont.element.style.height = '100%';
            cont.element.style.width = '100%';
            cont.element.style.zIndex = this.zIndex;
            cont.element.style.backfaceVisibility = 'hidden';
            cont.element.style.transformOrigin = 'top left';

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

            this.map.mainContainer.element.insertBefore(
                contNew.element,
                contOld.element,
            );

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
                this.map.event.off('tile loaded', doSwap, this);

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
                ___that.map.event.off(
                    MOUSE_WHEEL_EVT,
                    tileLoadListener,
                    ___that,
                );
                setTimeout(
                    ___that.map.event.on.bind(
                        ___that.map.event,
                        'tile loaded',
                        doSwap,
                        ___that,
                    ),
                    100,
                );
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
                this.fire('pre zoom end', this);
            }

            this.__zoom = this.map.zoom;

            this.zoomObj = {};

            this.fire('post zoom end');

            return this;
        }

        resetZoomObj() {
            this.zoomObj = {
                scale: 1,
                isZooming: false,
                x: this.container.left,
                y: this.container.top,
            };

            return this;
        }

        zoomInOut(evt, zoomDirection) {
            if (this.zoomObj.isZooming) {
                requestAnimationFrame(
                    this._zoomInOut.bind(this, evt, zoomDirection),
                );
                return this;
            }

            this.container.element.className =
                (evt.css && evt.css.className) || 'smoothTransition';

            this.resetZoomObj();

            this.zoomObj.isZooming = true;

            requestAnimationFrame(this._zoomInOut.bind(this, evt, zoomDirection));

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

            this.fire('zoom end', evt);

            return this;
        }

        getScale(zoomDirection, zoomDelta) {
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

            this.on('add event listeners', () => {
                this.on('appended to map', this.update, this);
                this.on(
                    'zoom delay end',
                    this.startUpdateTimer.bind(this, 1000),
                    this,
                );
                // prettier-ignore
                this.on( "update everything", () => {
                        this.container.element.style.display = "none";
                        this.update();
                    }, this);
                this.map.event.on(MOUSE_WHEEL_EVT, this.cancelRequest, this);
                this.map.event.on('pan initial', this.cancelRequest, this);
                this.map.event.on(
                    'pan end',
                    this.startUpdateTimer.bind(this, 1000),
                    this,
                );
                this.map.event.on('stopPanAnimation', this.cancelRequest, this);
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
            this.updateTimer = setTimeout(
                this.update.bind(this),
                milliseconds || 1000,
            );
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

            this.ajaxRequest.open('POST', this.imgReqUrl, true);
            this.ajaxRequest.setRequestHeader(
                'Content-type',
                'application/x-www-form-urlencoded',
            );

            this.ajaxRequest.send(req);
        }

        httpReqOnload(httpReqObj) {
            if (!this.isCurrentReq(httpReqObj)) {
                return;
            }

            this.fire('ajax load', httpReqObj);

            var parsedRes = JSON.parse(httpReqObj.responseText);

            this.createTheImage(parsedRes.href, httpReqObj);
        }

        createTheImage(imgSrc, httpReqObj) {
            var newMapImg = document.createElement('img');
            newMapImg.addEventListener(
                'load',
                this.mapLoadHandler.bind(this, newMapImg, httpReqObj),
            );
            newMapImg.addEventListener(
                'error',
                this.mapErrorHandler.bind(this, newMapImg, httpReqObj),
            );
            newMapImg.src = imgSrc;
            newMapImg.style.zIndex = '1';
            newMapImg.style.position = 'absolute';
            newMapImg.style.imageRendering = 'pixelated'; // TODO: Test of new css feature in chrome.

            return this;
        }

        update() {
            var obj = {
                ...this.map.extent.visible,
                width: this.map.mapContainer.width,
                height: this.map.mapContainer.height,
            };

            var req = encodeURI(
                this.reqTemplate.replace(/\${(.+?)}/g, function(a, match) {
                    return obj[match];
                }),
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

            this.fire('map img load', httpReqObj);
        }

        mapErrorHandler(mapImg, httpReqObj) {
            console.error(this, mapImg, httpReqObj);
            this.fire('map img error', httpReqObj);
        }

        _zoomInOut(evt, zoomDirection) {
            let zObj = this.zoomObj;
            let scale = this.getScale(zoomDirection, evt.zoomDelta);
            zObj.scale *= scale;

            let newPoint = {
                x: evt.x - this.map.mainContainer.left + zObj.x, // This will set the origin to 1/2 the center: - this.map.mapContainer.width / 2;
                y: evt.y - this.map.mainContainer.top + zObj.y,
            };

            zObj.x = zObj.x + (zObj.x - (newPoint.x - zObj.x)) * (scale - 1);
            zObj.y = zObj.y + (zObj.y - (newPoint.y - zObj.y)) * (scale - 1);

            // prettier-ignore
            this.container.element.style[CSS_TRANSFORM] =
                        `translate3d(${ zObj.x }px,
                                 ${ zObj.y }px, 0px)
                        scale3d(${ zObj.scale }, ${ zObj.scale }, 1)
                    `;

            this.fire('zoom end', evt);

            return this;
        }
    }

    class ArcXMLLayer extends ArcRenderLayer {
        constructor(imgUrl, zIndex, ArcXML_module, hideDuringZoom) {
            super(imgUrl, null, zIndex, hideDuringZoom);

            this.on('appended to map', () => {
                this.makeArcXML = ArcXML_module(this.map);
            });
        }

        update() {
            let extent = this.map.extent.visible;
            let xml = this.makeArcXML.makeArcXMLRequest(
                extent.x,
                extent.X,
                extent.y,
                extent.Y,
            );
            let req =
                window.encodeURIComponent('ArcXMLRequest') +
                '=' +
                window.encodeURIComponent(xml);
            this.sendHttpReq(req);
        }

        httpReqOnload(httpReqObj) {
            if (!this.isCurrentReq(httpReqObj)) {
                return;
            }

            let xml = /<\?xml.*>/.exec(httpReqObj.responseText)[0];
            let parsedRes = new DOMParser().parseFromString(xml, 'application/xml');
            let output = parsedRes.getElementsByTagName('OUTPUT');
            let href = output[0].getAttribute('url');

            this.createTheImage(href, httpReqObj);
        }
    }

    function googleToState(lat, lon) {
        // this converts google's x,y coordinates to state plane coordinates used by the government.
        // For snohomish county only.
        let math = Math,
            t = undefined,
            rho = undefined,
            theta = undefined,
            x = undefined,
            y = undefined;

        lat = lat * 0.01745329252;
        lon = lon * 0.01745329252;
        t =
            math.sin(0.7853981633974483 - lat / 2) /
            math.cos(0.7853981633974483 - lat / 2);
        t =
            t /
            math.pow(
                (1 - 0.082271854 * math.sin(lat)) /
                    (1 + 0.082271854 * math.sin(lat)),
                0.041135927,
            );
        (rho = 6378206.4 * 1.8297143852061755 * math.pow(t, 0.7445203284529343)),
            (theta = 0.7445203284529343 * (lon - -2.1088813351916)),
            (x = rho * math.sin(theta) + 499998.9841016325),
            (y = 5853958.963967552 - rho * math.cos(theta)); // mes add y0 ?
        x = x * 3.28084;
        y = y * 3.28084;
        return [y, x];
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
            this.lvlLoadTime = {start: 0, finish: 1};
            this.viewPortTopLeftWorldPxls = {x: 0, y: 0};
            this.makeTile = makeTile;

            this.setZindex(zIndex);

            this.setTileSrc(src);

            this.on('add event listeners', () => {
                this.on('appended to map', () => {
                    this.makeTileGrid();
                    this.zoomEnd();
                });

                this.on('update everything', () => {
                    this.makeTileGrid();
                    this.resetTiles();
                    this.swapContainer();
                    this.zoomEnd();
                    this.update();
                });

                this.on('zoom delay end', this.zoomEnd, this);
                this.on('pre zoom end', () => this.swapContainer(), this);
                this.on('post zoom end', () => {
                    this.resetTiles();
                    this.update();
                });

                this.map.event.on(
                    'pan',
                    e => {
                        if ((e.clientX + e.clientY) % 7 === 0) {
                            // TODO: Better throttling, this was just a thought experiment.
                            this.update();
                        }
                    },
                    this,
                );
                this.map.event.on('pan initial', () => {
                    clearTimeout(this.zoomTimer);
                    clearTimeout(this.delTilesTimer);
                });
                this.map.event.on('pan end', () => {
                    this.update();
                    if (this.__zoom !== this.map.zoom) {
                        this.zoomEnd();
                    }
                    this.delTilesTimer = setTimeout(
                        this.clearHiddenTiles.bind(this),
                        1100,
                    );
                });
            });
        }

        getTileInfo() {
            console.log(
                "The method 'getTileInfo' in " +
                    this.constructor.name +
                    " wasn't implimented",
                this,
            );
            return 'Override this';
        }

        getTilePxls() {
            console.log(
                "The method 'getTilePxls' in " +
                    this.constructor.name +
                    " wasn't implimented",
                this,
            );
            return 'Override this';
        }

        setTileSrc(src) {
            this.tileSrc = src;
            return this;
        }

        updateContainer() {
            this.makeTileGrid();
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

            this.viewPortTopLeftWorldPxls.x = Math.floor(
                this.viewPortTopLeftWorldPxls.x,
            );
            this.viewPortTopLeftWorldPxls.y = Math.floor(
                this.viewPortTopLeftWorldPxls.y,
            );

            this.tilesCache = {};
        }

        makeTileGrid() {
            let numTiles = {
                x: Math.ceil(this.map.mapContainer.width / this.tileSize) + 1,
                y: Math.ceil(this.map.mapContainer.height / this.tileSize) + 1,
            };

            let ary = [];
            let vry = [];

            for (let x = 0; x <= numTiles.x; x++) {
                for (let y = 0; y <= numTiles.y; y++) {
                    ary.push({x: x, y: y});
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
            let srcObj = {'{z}': this.__zoom, '{y}': null, '{x}': null};
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
                x: Math.floor(
                    (this.viewPortTopLeftWorldPxls.x - panLeft) / this.tileSize,
                ),
                y: Math.floor(
                    (this.viewPortTopLeftWorldPxls.y - panTop) / this.tileSize,
                ),
            };

            let topLeftTilePxls = {
                x: topLeftTile.x * this.tileSize - this.viewPortTopLeftWorldPxls.x,
                y: topLeftTile.y * this.tileSize - this.viewPortTopLeftWorldPxls.y,
            };

            for (let m = 0; m < this.tileLoadOrder.length; m++) {
                srcObj['{x}'] = topLeftTile.x + this.tileLoadOrder[m].x;
                srcObj['{y}'] = topLeftTile.y + this.tileLoadOrder[m].y;

                srcXYString = srcObj['{x}'] + ',' + srcObj['{y}'];

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
                    src: this.tileSrc.replace(/{.}/g, arg => srcObj[arg]),
                });

                this.tilesCache[srcXYString] = tileImg;

                fragment.appendChild(tileImg);
            }

            this.container.element.appendChild(fragment);
        }
    }

    function makeTile(obj) {
        let tileImg = document.createElement('img');
        tileImg.className = 'tileImg';
        //tileImg.style.cssText = "position: absolute; top: " + tileY + "px; left: " + tileX + "px; opacity: 0;";
        tileImg.style.cssText = 'position: absolute; opacity: 0;';
        tileImg.style.transform =
            'translate3d(' + obj.x + 'px,' + obj.y + 'px, 0px)';
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
        console.error('Tile did not load', e);
    }

    class ArcGISTileLayer extends BaseTileLayer {
        constructor(src, zIndex) {
            super(src, zIndex);
        }

        getTileInfo() {
            // Override this for WSG84.
            let vis = this.map.extent.visible;
            let corner = this.getContainingArcTileCoords(this.map.zoom, {
                x: vis.x,
                y: vis.Y,
            });

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
            let d = {x: -1.171043e8, y: 1.379498e8}; // This needs to be changed.
            let zoomI = this.zoomIndex[z];

            let colRow = {
                row: Math.floor((d.y - b.y) / (this.tileSize * zoomI.resolution)),
                col: Math.floor((b.x - d.x) / (this.tileSize * zoomI.resolution)),
                spX: undefined,
                spY: undefined,
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
            this.bound = 20037508.342789244; // Math.PI * radius of earth
        }

        topLeftOfVisibleExtentToPxls(opt_zoom) {
            // Returns top left of tile in screen pixel coords, so that it can be seen on the monitor.
            let vis = this.map.extent.visible;
            let visPoint = {x: vis.x, y: vis.Y};
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
            let pixels =
                (this.tileSize * Math.pow(2, opt_zoom || this.map.zoom)) / 2;

            var pointXRatio = smPoint.x / -bound;
            var pointYRatio = smPoint.y / bound;

            return {
                x: pixels * (1 - pointXRatio),
                y: pixels * (1 - pointYRatio),
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
        transform: function(point, scale) {
            // (Point, Number) -> Point
            return this._transform(point.clone(), scale);
        },

        // destructive transform (faster)
        _transform: function(point, scale) {
            scale = scale || 1;
            point.x = scale * (this._a * point.x + this._b);
            point.y = scale * (this._c * point.y + this._d);
            return point;
        },

        // @method untransform(point: Point, scale?: Number): Point
        // Returns the reverse transformation of the given point, optionally divided
        // by the given scale. Only accepts actual `L.Point` instances, not arrays.
        untransform: function(point, scale) {
            scale = scale || 1;
            return {
                x: (point.x / scale - this._b) / this._a,
                y: (point.y / scale - this._d) / this._c,
            };
        },
    };

    let transformation = (function() {
        var scale = 0.5 / (Math.PI * 6378137);
        //console.log(new Transformation(scale, 0.5, -scale, 0.5))
        return new Transformation(scale, 0.5, -scale, 0.5);
    })();

    Object.assign(NewMap.prototype, {
        toPoint,
        convertProjPointToPixelPoint,
        convertProjPointToOffsetPixelPoint,
        screenPointToProjection,
        convertSPToWGS84,
        convertWGS84ProjectionToWGS84LatLon,
        minutes,
        updateStatePlaneCoordsByDistance,
        updateStatePlaneCoordsByOrigin,
        updateVisExtentByOriginAndResolution,
        getPixelPointInMapContainer,
        getPanOffsetPoint,
        distanceBetween,
        convertSPToWGS84Proj,
        getResolution,
    });

    function toPoint(x, y) {
        if (Array.isArray(x)) {
            return {
                x: x[0],
                y: x[1],
            };
        }
        if (x === Object(x)) {
            //https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
            return {
                x: x.x || x.X,
                y: x.y || x.Y,
            };
        }
        return {
            x: x,
            y: y,
        };
    }

    function convertProjPointToPixelPoint(spPoint) {
        var xRatio =
                this.mapContainer.width /
                (this.extent.visible.X - this.extent.visible.x), // For paths.
            yRatio =
                this.mapContainer.height /
                (this.extent.visible.Y - this.extent.visible.y); // For paths.
        //var resolution = this.zoomIndex[this.zoom].resolution;

        //console.log(xRatio, resolution, (spPoint.x - this.extent.visible.x) * xRatio)

        return {
            x: (spPoint.x - this.extent.visible.x) * xRatio,
            y: (this.extent.visible.Y - spPoint.y) * yRatio,
        };
    }

    function convertProjPointToOffsetPixelPoint(point) {
        var screenPoint = this.convertProjPointToPixelPoint(point);

        return {
            x: screenPoint.x - this.mainContainer.left,
            y: screenPoint.y - this.mainContainer.top,
        };
    }

    function screenPointToProjection(point) {
        var spWidth = this.extent.visible.X - this.extent.visible.x;
        var spHeight = this.extent.visible.Y - this.extent.visible.y;

        var originLR = point.x / this.mapContainer.width;
        var originTB = point.y / this.mapContainer.height;

        return {
            x: this.extent.visible.x + spWidth * originLR,
            y: this.extent.visible.Y - spHeight * originTB,
        };
    }

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
            part1 =
                (1 - 0.08181905782 * sin(lat0)) / (1 + 0.08181905782 * sin(lat0));
            lat1 =
                1.5707963267948966 - 2 * atan(txy * pow(part1, 0.08181905782 / 2));
        }
        Lat = lat1 / 0.01745329252;
        Lon = lon / 0.01745329252;
        return {lat: Lat, lng: Lon};
    }

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

    function convertWGS84ProjectionToWGS84LatLon(mercator) {
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
        var num7 =
            1.5707963267948966 - 2.0 * Math.atan(Math.exp((-1.0 * y) / 6378137.0));
        mercator[0] = num6;
        mercator[1] = num7 * 57.295779513082323;
    }

    function minutes(num) {
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
        return floor + '\u00B0 ' + floor2 + '\u2032 ' + seconds + '\u2033';
    }

    function updateStatePlaneCoordsByDistance(distanceX, distanceY, spCoords) {
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
    }

    function updateStatePlaneCoordsByOrigin(p_origin, p_scale) {
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
    }

    function updateVisExtentByOriginAndResolution(p_origin, p_scale, p_resolution) {
        let vis = this.extent.visible;
        let spWidth = this.mapContainer.width * p_resolution;
        let spHeight = this.mapContainer.height * p_resolution;

        let ratioX = (vis.X - p_origin.x) / (vis.X - vis.x);
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
    }

    function getPixelPointInMapContainer(point) {
        return {
            x: point.x - this.mapContainer.left,
            y: point.y - this.mapContainer.top,
        };
    }

    function getPanOffsetPoint(point) {
        var panOffsetX = this.mainContainer.left; //+ this.mapImg.left; // Should be zero if not panning.
        var panOffsetY = this.mainContainer.top; //+ this.mapImg.top;

        return {
            x: point.x - panOffsetX, // This will set the origin to)/2the center -> - this.mapContainer.width / 2;
            y: point.y - panOffsetY,
        };
    }

    function distanceBetween(a, b) {
        // Good old pythagorean theorem.
        return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
    }

    function convertSPToWGS84Proj(spPoint) {
        let wsg85LatLon = this.convertSPToWGS84(spPoint);
        return this.LeafletSphericalMercator.projectFromWSG84Geo(wsg85LatLon);
    }

    function getResolution(zoom) {
        if (this.zoomIndex) {
            return this.zoomIndex[zoom].resolution;
        }
        // WSG84 Spherical Mercator.
        // let EarthRadius = 6378137;
        // let RadiusxPi = Math.PI * EarthRadius;
        // let PixelsAtZoom = 256 * Math.pow(2, zoom);
        // let degPerMeter = RadiusxPi * 2 / EarthRadius;
        // let degPerPixel = EarthRadius / PixelsAtZoom * degPerMeter;
        var pixels = (256 * Math.pow(2, zoom)) / 2;
        var extent = 20037508.342789244;
        var res = extent / pixels;

        return res;
    }

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
                y: (this.RADIUS * Math.log((1 + sin) / (1 - sin))) / 2,
            };
        },

        projectToWSG84Geo: function(point) {
            var d = 180 / Math.PI,
                R = this.RADIUS;

            return {
                lat: (2 * Math.atan(Math.exp(point.y / R)) - Math.PI / 2) * d,
                lng: (point.x * d) / R,
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

    Object.assign(NewMap.prototype, {
        boxZoom_mouseDown,
        boxZoom_mouseUp,
        boxZoom_doZoom,
        boxZoom_mouseMove,
        boxZoomCenter_mouseMove,
    });

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

    class BaseMarkerClass extends BasicInteractiveElement {
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

    class MakePopup extends BaseMarkerClass {
        constructor(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
            let el = document.createElement('div');
            super(el);

            this.init(opt_message, opt_spPoint, opt_anchorOffset);
        }

        init(opt_message, opt_spPoint, opt_anchorOffset) {
            this.options = {
                message: opt_message,
                point: opt_spPoint,
                anchorOffset: opt_anchorOffset,
            };

            this.message = this.options.message;

            this.offsetPos = toPoint(this.options.anchorOffset);

            this.makePopup();
            this.addEventListeners();
            this.setMessage(this.message);

            if (this.options.point) {
                this.setCoords(toPoint(this.options.point));
            }

            if (this.init.initArr) {
                let ary = this.init.initArr;

                for (let n = 0; n < ary.length; n++) {
                    // Call additional init functions an extension
                    // might have added.
                    ary[n].fn.call(ary[n].ctx || this);
                }
            }
        }

        static onInitDone(fn, ctx) {
            // Testing an idea about how to extend the init function.
            let ary = this.prototype.init.initarr;
            if (!ary) {
                ary = this.prototype.init.initArr = [];
            }
            ary.push({fn, ctx});
        }

        addEventListeners() {
            this.on('appendedToMap', e => {
                this.on(this.map.MOUSE_WHEEL_EVT, function(e) {
                    e.stopPropagation();
                });
            });

            this.on('preUpdatePos', e => {
                this.setOffSetLeftTop();
            });
        }

        setOffSetLeftTop() {
            let el = this.element;
            el.style.left = -(el.offsetWidth / 2) + 'px';
            el.style.bottom = this.arrow.offsetHeight + 'px';

            return this;
        }

        setMessage(opt_message = '') {
            this.messageContainer.innerHTML = '';

            if (typeof opt_message === 'string') {
                this.messageContainer.innerHTML = opt_message;
            } else {
                this.messageContainer.appendChild(opt_message);
            }

            this.message = opt_message;

            this.updatePos();

            return this;
        }

        makePopup() {
            this.element.className = 'popupParent';

            this.deleteBtn = this.makeDeleteBtn();
            this.element.appendChild(this.deleteBtn);

            this.messageContainer = this.makeMessageContainer();
            this.element.appendChild(this.messageContainer);

            this.arrow = this.makeArrow();
            this.element.appendChild(this.arrow);

            return this;
        }

        makeDeleteBtn() {
            let deleteButton = document.createElement('div');
            deleteButton.className = 'markerDeleteButton';
            deleteButton.innerHTML = '&#215;';
            deleteButton.popup = this;
            deleteButton.addEventListener('click', this.delete.bind(this));
            return deleteButton;
        }

        makeMessageContainer() {
            let messageContainer = document.createElement('div');
            messageContainer.innerHTML = '';
            messageContainer.className = 'messageContainer';
            messageContainer.style.color = 'black';
            messageContainer.popup = this;
            return messageContainer;
        }

        makeArrow() {
            let arrow = document.createElement('div');
            arrow.className = 'markerArrow';

            let innerArrow = document.createElement('div');
            innerArrow.className = 'markerInnerArrow';
            arrow.appendChild(innerArrow);
            return arrow;
        }
    }

    function makePopup(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
        return new MakePopup(opt_message, opt_spPoint, opt_anchorOffset);
    }

    let _markerCounter = 0;

    class MakeMarker extends BaseMarkerClass {
        constructor(p_spPoint, options) {
            let _options = {
                offset: undefined,
                popupAnchor: undefined,
                markerElement: MakeMarker.prototype.makeMarkerElement(),
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
            let marker = this;
            let offset = opt_offsetPoint || _options.popupAnchor || [0, -100];

            marker.popup = new MakePopup(opt_html, null, offset)
                .setCoords(marker.statePlanePoint)
                .addToMap(marker.map);

            marker.popup.on('delete', marker.delete.bind(marker));

            marker.showPopup = function() {
                if (marker.appendedToMap) {
                    if (marker.popup.element.parentNode) {
                        marker.popup.updatePos();
                    } else {
                        marker.popup.addToMap(marker.map);
                    }
                } else {
                    marker.on('appendedToMap', function _fn_(e) {
                        marker.showPopup();
                        marker.off('appendedToMap', _fn_);
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

        makeMarkerElement() {
            let marker = document.createElement('img');
            marker.className = 'markerParent3';
            marker.src =
                'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png';

            marker.id = 'marker_' + _markerCounter++;

            // TODO: Put this in a style sheet.
            marker.style.position = 'absolute';
            marker.style.left = '-12px';
            marker.style.bottom = '0px';
            marker.style.color = 'white';
            marker.style.fontSize = '15px';
            marker.style.cursor = 'pointer';
            marker.style.textAlign = 'center';
            // marker.style.borderRadius = '50px';
            // marker.style.lineHeight = '20px';
            // marker.style.backgroundColor = "#ea4335";
            // marker.style.overflow = 'hidden';
            // marker.style.backgroundImage =
            //       'url("http://www.snoco.org/docs/sas/photos/0059/00595800003400R011.jpg")';
            // marker.style.boxShadow = "0px 0px 0px 1px rgb(255,255,255)";
            // marker.style.height = "20px";
            // marker.style.width = "20px";

            return marker;
        }
    }

    function makeMarker(p_spPoint, options) {
        return new MakeMarker(...arguments);
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
    exports.panning_module = panning_module;
    exports.BaseMarkerClass = BaseMarkerClass;
    exports.MakePopup = MakePopup;
    exports.makePopup = makePopup;
    exports.MakeMarker = MakeMarker;
    exports.makeMarker = makeMarker;

    Object.defineProperty(exports, '__esModule', { value: true });

    /* Fancy new Rollup.js outro! */ window.NewMap = exports;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNFdmVudFN5c3RlbV9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS91dGlscy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9wYW5uaW5nX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9NYWluX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL1pvb21fY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvbGF5ZXJzL0Jhc2ljTGF5ZXJfY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvbGF5ZXJzL0FyY1JlbmRlckxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2xheWVycy9BcmNYTUxMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9sYXllcnMvQmFzZVRpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9sYXllcnMvQXJjR0lTVGlsZUxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2xheWVycy9TcGhlcmljYWxNZXJjYXRvclRpbGVMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9jb29yZGluYXRlX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9ib3hab29tX21vZHVsZS5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9tYXJrZXIvQmFzZU1hcmtlcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9tYXJrZXIvTWFya2VyUG9wdXBfY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvbWFya2VyL01hcmtlcl9jbGFzcy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgQmFzaWNFdmVudFN5c3RlbSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmV2ZW50c09iaiA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIG9uKHBfdHlwZSwgcF9mdW5jLCBvcHRfdGhpcykge1xyXG4gICAgICAgIGlmICghdGhpcy5ldmVudHNPYmouaGFzT3duUHJvcGVydHkocF90eXBlKSkge1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50c09ialtwX3R5cGVdID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmV2ZW50c09ialtwX3R5cGVdLnB1c2goe2ZuOiBwX2Z1bmMsIF90aGlzOiBvcHRfdGhpc30pO1xyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBvZmYocF90eXBlLCBwX2Z1bmMsIG9wdF90aGlzKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGV2dEFycmF5ID0gdGhpcy5ldmVudHNPYmpbcF90eXBlXTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCBldnRBcnJheS5sZW5ndGg7IG4rKykge1xyXG4gICAgICAgICAgICBpZiAoZXZ0QXJyYXlbbl0uZm4gPT09IHBfZnVuYyAmJiBldnRBcnJheVtuXS5fdGhpcyA9PT0gb3B0X3RoaXMpIHtcclxuICAgICAgICAgICAgICAgIGV2dEFycmF5W25dLmZuID0gdGhpcy5fem9tYmllRm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY2xlYW4ocF90eXBlKTtcclxuICAgIH1cclxuXHJcbiAgICBfem9tYmllRm4oKSB7XHJcbiAgICAgICAgcmV0dXJuICdab21iaWUgY2FsbGJhY2sgd29ya3MgcmVhbCBoYXJkLic7XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYW4ocF90eXBlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2RlbFpvbWJpZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5fZGVsWm9tYmllcyhwX3R5cGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQodGhpcy5jbGVhbi5iaW5kKHRoaXMsIHBfdHlwZSksIDEwMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBfZGVsWm9tYmllcyhwX3R5cGUpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzT2JqLmhhc093blByb3BlcnR5KHBfdHlwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCB0aGlzLmV2ZW50c09ialtwX3R5cGVdLmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV2ZW50c09ialtwX3R5cGVdW25dLmZuID09PSB0aGlzLl96b21iaWVGbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHNPYmpbcF90eXBlXS5zcGxpY2UobiwgMSk7XHJcbiAgICAgICAgICAgICAgICAtLW47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYWxsT2ZmKHBfdGhpcykge1xyXG4gICAgICAgIHZhciBldnRPYmogPSB0aGlzLmV2ZW50c09iajtcclxuICAgICAgICB2YXIgdHlwZXMgPSBPYmplY3Qua2V5cyhldnRPYmopO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBtID0gMDsgbSA8IHR5cGVzLmxlbmd0aDsgbSsrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIG4gPSBldnRPYmpbdHlwZXNbbV1dLmxlbmd0aCAtIDE7IG4gPj0gMDsgbi0tKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0T2JqW3R5cGVzW21dXVtuXS5fdGhpcyA9PT0gcF90aGlzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZ0T2JqW3R5cGVzW21dXVtuXS5mbiA9IHRoaXMuX3pvbWJpZUZuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2xlYW4odHlwZXNbbV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZpcmUocF90eXBlLCBvcHRfZXZ0KSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBldnRBcnJheSA9IHRoaXMuZXZlbnRzT2JqW3BfdHlwZV07XHJcbiAgICAgICAgbGV0IHBvaW50ZXJUb19kZWxab21iaWVzID0gdGhpcy5fZGVsWm9tYmllcztcclxuICAgICAgICB0aGlzLl9kZWxab21iaWVzID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgZXZ0QXJyYXkubGVuZ3RoOyBuKyspIHtcclxuICAgICAgICAgICAgZXZ0QXJyYXlbbl0uZm4uY2FsbChldnRBcnJheVtuXS5fdGhpcywgb3B0X2V2dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9kZWxab21iaWVzID0gcG9pbnRlclRvX2RlbFpvbWJpZXM7XHJcbiAgICB9XHJcbn1cclxuIiwiZXhwb3J0IGZ1bmN0aW9uIHNpbXBsZU1lc3NhZ2VCb3goYXJnX2lubmVySFRNTCwgYXJnX2lkLCBhcmdfd2lkdGgpIHtcclxuICAgIHZhciBtZXNzYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcblxyXG4gICAgbWVzc2FnZS5jbGFzc05hbWUgPSAnc2ltcGxlTWVzc2FnZUJveCc7XHJcblxyXG4gICAgbWVzc2FnZS5zdHlsZS53aWR0aCA9IChhcmdfd2lkdGggJiYgYXJnX3dpZHRoICsgJ3B4JykgfHwgJzMwMHB4JztcclxuICAgIG1lc3NhZ2Uuc3R5bGUubGVmdCA9XHJcbiAgICAgICAgd2luZG93LmlubmVyV2lkdGggLyAyIC0gKChhcmdfd2lkdGggJiYgYXJnX3dpZHRoIC8gMikgfHwgMTUwKSArICdweCc7XHJcblxyXG4gICAgbWVzc2FnZS5pZCA9IGFyZ19pZCB8fCAnc2ltcGxlX21lc3NhZ2VfYm94JztcclxuXHJcbiAgICBtZXNzYWdlLmlubmVySFRNTCA9IGFyZ19pbm5lckhUTUw7XHJcblxyXG4gICAgbWVzc2FnZS5vbmNsaWNrID0gZnVuY3Rpb24oZSkge1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG1lc3NhZ2UpO1xyXG5cclxuICAgIHJldHVybiBtZXNzYWdlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGVzdFByb3AocHJvcHMpIHtcclxuICAgIC8vIEdvdCB0aGlzIGZyb20gbGVhZmxldFxyXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAocHJvcHNbaV0gaW4gc3R5bGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByb3BzW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmV4cG9ydCBsZXQgQ1NTX1RSQU5TRk9STSA9IHRlc3RQcm9wKFtcclxuICAgICd0cmFuc2Zvcm0nLFxyXG4gICAgJ1dlYmtpdFRyYW5zZm9ybScsXHJcbiAgICAnT1RyYW5zZm9ybScsXHJcbiAgICAnTW96VHJhbnNmb3JtJyxcclxuICAgICdtc1RyYW5zZm9ybScsXHJcbl0pO1xyXG5leHBvcnQgbGV0IENTU19UUkFOU0lUSU9OID0gdGVzdFByb3AoW1xyXG4gICAgJ3RyYW5zaXRpb24nLFxyXG4gICAgJ1dlYmtpdFRyYW5zaXRpb24nLFxyXG4gICAgJ09UcmFuc2l0aW9uJyxcclxuICAgICdNb3pUcmFuc2l0aW9uJyxcclxuICAgICdtc1RyYW5zaXRpb24nLFxyXG5dKTtcclxuXHJcbiAvL2h0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0V2ZW50cy93aGVlbCNCcm93c2VyX2NvbXBhdGliaWxpdHlcclxuZXhwb3J0IGxldCBNT1VTRV9XSEVFTF9FVlQgPVxyXG4gICAgJ29ud2hlZWwnIGluIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgICAgPyAnd2hlZWwnIC8vIE1vZGVybiBicm93c2VycyBzdXBwb3J0IFwid2hlZWxcIlxyXG4gICAgICAgIDogZG9jdW1lbnQub25tb3VzZXdoZWVsICE9PSB1bmRlZmluZWRcclxuICAgICAgICA/ICdtb3VzZXdoZWVsJyAvLyBXZWJraXQgYW5kIElFIHN1cHBvcnQgYXQgbGVhc3QgXCJtb3VzZXdoZWVsXCJcclxuICAgICAgICA6ICdET01Nb3VzZVNjcm9sbCc7IC8vIGxldCdzIGFzc3VtZSB0aGF0IHJlbWFpbmluZyBicm93c2VycyBhcmUgb2xkZXIgRmlyZWZveFxyXG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwYW5uaW5nX21vZHVsZSh0aGlzTWFwKSB7XHJcbiAgICBsZXQgdHJhbnNpdGlvblJlc2V0VGltZW91dCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzTWFwLnBhbiA9IHtcclxuICAgICAgICBtYWluQ29udGFpbmVyWFk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWDogbnVsbCxcclxuICAgICAgICBtb3VzZURvd25YT2Zmc2V0OiBudWxsLFxyXG4gICAgICAgIG1vdXNlRG93blk6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWU9mZnNldDogbnVsbCxcclxuICAgICAgICBwYW5uaW5nRnVuY3Rpb246IG1hcERyYWdBbmRBbmltYXRpb24sXHJcbiAgICAgICAgcG9pbnRzOiBudWxsLFxyXG4gICAgICAgIHNwQ29vcmRzOiBudWxsLFxyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBtb3VzZURvd24oZSkge1xyXG4gICAgICAgIC8vIERvIHNvbWV0aGluZyBoZXJlP1xyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlRG93bihlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX3Bhbm5pbmdNb3VzZURvd24oZSkge1xyXG4gICAgICAgIGxldCBldnQgPSBlLl9fZXZlbnRfXztcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHBhbi5tb3VzZURvd25YID0gZXZ0LmNsaWVudFg7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93blkgPSBldnQuY2xpZW50WTtcclxuICAgICAgICBwYW4ubW91c2VEb3duWE9mZnNldCA9IGV2dC5jbGllbnRYIC0gdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgcGFuLm1vdXNlRG93bllPZmZzZXQgPSBldnQuY2xpZW50WSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3A7XHJcblxyXG4gICAgICAgIHBhbi5wb2ludHMgPSBbXTsgLy8gVE9ETzogdGVzdGluZ1xyXG5cclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uKCk7XHJcblxyXG4gICAgICAgIHBhbi5tYWluQ29udGFpbmVyWFkgPSB7XHJcbiAgICAgICAgICAgIHg6IHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHBhbi5zcENvb3JkcyA9IHtcclxuICAgICAgICAgICAgeDogdGhpc01hcC5leHRlbnQudmlzaWJsZS54LFxyXG4gICAgICAgICAgICBYOiB0aGlzTWFwLmV4dGVudC52aXNpYmxlLlgsXHJcbiAgICAgICAgICAgIHk6IHRoaXNNYXAuZXh0ZW50LnZpc2libGUueSxcclxuICAgICAgICAgICAgWTogdGhpc01hcC5leHRlbnQudmlzaWJsZS5ZLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW91dCcsXHJcbiAgICAgICAgICAgIHByaXZhdGVfcmVtb3ZlUGFubmluZ0V2ZW50TGlzdGVuZXJzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbWFwSW5pdGlhbERyYWdUYXNrcyk7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpc01hcC5wYW4ucGFubmluZ0Z1bmN0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwcml2YXRlX21hcE1vdXNlVXAoZSkge1xyXG4gICAgICAgIC8vIG1vdXNlIHVwIGZvciB0aGUgaW1hZ2VcclxuICAgICAgICBpZiAoZS5yZWxhdGVkVGFyZ2V0KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSk7XHJcblxyXG4gICAgICAgIHByaXZhdGVfcGFubmluZ01vdXNlVXAoZSk7XHJcbiAgICAgICAgLy90aGlzTWFwLmV2ZW50LmZpcmUoXCJtYXAgbW91c2UgdXBcIiwgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9wYW5uaW5nTW91c2VVcChlKSB7XHJcbiAgICAgICAgbGV0IGV2dCA9IGUuX19ldmVudF9fIHx8IGU7XHJcbiAgICAgICAgbGV0IHBhbiA9IHRoaXNNYXAucGFuO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGV2dC5jbGllbnRZIC0gcGFuLm1vdXNlRG93blkgIT09IDAgfHxcclxuICAgICAgICAgICAgZXZ0LmNsaWVudFggLSBwYW4ubW91c2VEb3duWCAhPT0gMFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICB0aGlzTWFwLnBhbm5pbmdfbW9kdWxlLnBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbihldnQpO1xyXG5cclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCAtIHBhbi5tYWluQ29udGFpbmVyWFkueCxcclxuICAgICAgICAgICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgLSBwYW4ubWFpbkNvbnRhaW5lclhZLnksXHJcbiAgICAgICAgICAgICAgICBwYW4uc3BDb29yZHNcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5zdGF0ZS5wYW5uaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcHJpdmF0ZV9yZW1vdmVQYW5uaW5nRXZlbnRMaXN0ZW5lcnMoZSkge1xyXG4gICAgICAgIGlmIChlLnJlbGF0ZWRUYXJnZXQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgcHJpdmF0ZV9tYXBNb3VzZVVwKTtcclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIHByaXZhdGVfbWFwTW91c2VVcCk7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXNNYXAucGFuLnBhbm5pbmdGdW5jdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbWFwSW5pdGlhbERyYWdUYXNrcyhlKSB7XHJcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25jZSBhbmQgaW1tZWRpYXRlbHkgcmVtb3ZlZCBqdXN0IHRvIG1ha2UgdGhlXHJcbiAgICAgICAgLy8gcGFubmluZyBmZWVsIHNtb290aGVyLlxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICAgZS5jbGllbnRZIC0gdGhpc01hcC5wYW4ubW91c2VEb3duWSA9PT0gMCAmJlxyXG4gICAgICAgICAgICBlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YID09PSAwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIEEgYnVnIGluIGNocm9tZSB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBpZiBhIG1vdXNlZG93biBldmVudCBoYXBwZW5zLlxyXG4gICAgICAgICAgICAvLyBCdWcgaGFzbid0IGJlZW4gZml4ZWQgaW4gYXRsZWFzdCBjaHJvbWUgdmVyc2lvbiA1MS4wLjI3MDQuMTAzXHJcbiAgICAgICAgICAgIC8vIGFuZCBlYXJsaWVyLlxyXG5cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gJyc7XHJcblxyXG4gICAgICAgIC8vIEVuZCBhbnkgem9vbWluZyBhY3Rpdml0eVxyXG4gICAgICAgIC8vdGhpc01hcC5ab29tX2NsYXNzLnpvb21TdG9wKCk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuc3RhdGUucGFubmluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1hcEluaXRpYWxEcmFnVGFza3MpO1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGluaXRpYWwnLCBlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtYXBEcmFnT25seShlKSB7XHJcbiAgICAgICAgbGV0IG1haW5Db250ID0gdGhpc01hcC5tYWluQ29udGFpbmVyO1xyXG4gICAgICAgIGxldCB4ID0gbWFpbkNvbnQubGVmdCArIChlLmNsaWVudFggLSB0aGlzTWFwLnBhbi5tb3VzZURvd25YKTtcclxuICAgICAgICBsZXQgeSA9IG1haW5Db250LnRvcCArIChlLmNsaWVudFkgLSB0aGlzTWFwLnBhbi5tb3VzZURvd25ZKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cmFuc2xhdGUoXCIrIHggK1wicHgsIFwiKyB5ICtcInB4KVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1hcERyYWdBbmRBbmltYXRpb24oZSkge1xyXG4gICAgICAgIGxldCBtYWluQ29udCA9IHRoaXNNYXAubWFpbkNvbnRhaW5lcjtcclxuICAgICAgICBsZXQgcGFuID0gdGhpc01hcC5wYW47XHJcblxyXG4gICAgICAgIGxldCBkaXN0YW5jZVggPSBwYW4ubWFpbkNvbnRhaW5lclhZLnggKyBlLmNsaWVudFggLSBwYW4ubW91c2VEb3duWCxcclxuICAgICAgICAgICAgZGlzdGFuY2VZID0gcGFuLm1haW5Db250YWluZXJYWS55ICsgZS5jbGllbnRZIC0gcGFuLm1vdXNlRG93blk7XHJcblxyXG4gICAgICAgIG1haW5Db250LnRvcCA9IGRpc3RhbmNlWTtcclxuICAgICAgICBtYWluQ29udC5sZWZ0ID0gZGlzdGFuY2VYO1xyXG5cclxuICAgICAgICB0aGlzTWFwLnBhbi5wb2ludHMucHVzaCh7XHJcbiAgICAgICAgICAgIHg6IGRpc3RhbmNlWCxcclxuICAgICAgICAgICAgeTogZGlzdGFuY2VZLFxyXG4gICAgICAgICAgICB0aW1lOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgXCJ0cmFuc2xhdGUzZChcIisgZGlzdGFuY2VYICtcInB4LCBcIisgZGlzdGFuY2VZICtcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuJywgZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFuVG8oc3BQb2ludCwgcGFuVGltZSkge1xyXG4gICAgICAgIGxldCBweGxQb2ludCA9IHRoaXNNYXAuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyLmJpbmQodGhpc01hcCk7XHJcbiAgICAgICAgbGV0IGNvbnZlcnRTcFRvUHhsID0gdGhpc01hcC5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpc01hcCk7XHJcblxyXG4gICAgICAgIGxldCBjZW50ZXJQeGxzID0gcHhsUG9pbnQoe1xyXG4gICAgICAgICAgICB4OiB0aGlzTWFwLm1hcENvbnRhaW5lci5sZWZ0ICsgdGhpc01hcC5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgICAgICB5OiB0aGlzTWFwLm1hcENvbnRhaW5lci50b3AgKyB0aGlzTWFwLm1hcENvbnRhaW5lci5oZWlnaHQgLyAyLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGxldCBwb2ludE9mSW50ZXJlc3RQeGwgPSBjb252ZXJ0U3BUb1B4bChzcFBvaW50KTtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSB7XHJcbiAgICAgICAgICAgIHg6IGNlbnRlclB4bHMueCAtIHBvaW50T2ZJbnRlcmVzdFB4bC54LFxyXG4gICAgICAgICAgICB5OiBjZW50ZXJQeGxzLnkgLSBwb2ludE9mSW50ZXJlc3RQeGwueSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwYW5CeVBpeGVscyhkaXN0YW5jZSwgcGFuVGltZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzTWFwO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhbkJ5UGl4ZWxzKHNwUG9pbnQsIHBhblRpbWUpIHtcclxuICAgICAgICBsZXQgbWFpbkNvbnQgPSB0aGlzTWFwLm1haW5Db250YWluZXI7XHJcbiAgICAgICAgbGV0IHZlY3RvckxlbiA9IE1hdGguc3FydChcclxuICAgICAgICAgICAgc3BQb2ludC54ICogc3BQb2ludC54ICsgc3BQb2ludC55ICogc3BQb2ludC55LFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFBsYXllZCBhcm91bmQgd2l0aCB0aGlzIG9uIGEgZ3JhcGhpbmcgd2Vic2l0ZSwgbWlnaHQgd2FudCB0byByZXZpc2l0IGluIHRoZSBmdXR1cmUuXHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KFxyXG4gICAgICAgICAgICAyMDAsXHJcbiAgICAgICAgICAgIHZlY3RvckxlbiAqICg1MDAgKiAoMC40NSAvIHZlY3RvckxlbiAqKiAwLjkpICsgMC4wNiksXHJcbiAgICAgICAgKTtcclxuICAgICAgICBsZXQgdGltZSA9IHBhblRpbWUgfHwgTWF0aC5taW4oMTAwMCwgbWF4KTtcclxuXHJcbiAgICAgICAgbWFpbkNvbnQubGVmdCArPSBNYXRoLnJvdW5kKHNwUG9pbnQueCk7XHJcbiAgICAgICAgbWFpbkNvbnQudG9wICs9IE1hdGgucm91bmQoc3BQb2ludC55KTtcclxuXHJcbiAgICAgICAgdGhpc01hcC51cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZShzcFBvaW50LngsIHNwUG9pbnQueSk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgLy8gQmxvY2sgZm9yIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9XHJcbiAgICAgICAgICAgICAgICBcImFsbCBcIiArIHRpbWUgKyBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjI1LCAxKVwiO1xyXG5cclxuICAgICAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICBcInRyYW5zbGF0ZTNkKFwiICsgbWFpbkNvbnQubGVmdCArIFwicHgsXCIgKyBtYWluQ29udC50b3AgKyBcInB4LDBweClcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9IG51bGw7XHJcbiAgICAgICAgfSwgdGltZSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQuZmlyZSgncGFuIGVuZCcsIHtwYW5FbmRUaW1lOiB0aW1lfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICBsZXQgdHJhbnNpc3Rpb25EdXJhdGlvbk1TID0gMjIwMDtcclxuXHJcbiAgICAgICAgbGV0IHBvaW50cyA9IHRoaXNNYXAucGFuLnBvaW50cztcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBwb2ludHMubGVuZ3RoIDwgMyB8fFxyXG4gICAgICAgICAgICBEYXRlLm5vdygpIC0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXS50aW1lID4gMTUwXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGFydFBvaW50ID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICBsZXQgb2Zmc2V0UG9pbnQgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAtIDNdO1xyXG5cclxuICAgICAgICBsZXQgZGVsdGFBID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAyXSxcclxuICAgICAgICAgICAgZGVsdGFCID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLSAzXSxcclxuICAgICAgICAgICAgZGVsdGFYID0gZGVsdGFBLnggLSBkZWx0YUIueCxcclxuICAgICAgICAgICAgZGVsdGFZID0gZGVsdGFBLnkgLSBkZWx0YUIueSxcclxuICAgICAgICAgICAgYW5nbGUgPSBNYXRoLmF0YW4yKGRlbHRhWSwgZGVsdGFYKTtcclxuXHJcbiAgICAgICAgbGV0IHBMZW4gPSBwb2ludHMubGVuZ3RoO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCB0aW1lID0gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgIChwb2ludHNbcExlbi0xXS50aW1lIC0gcG9pbnRzW3BMZW4tMl0udGltZSkgXHJcbiAgICAgICAgICAgICAgICAgICAgICsgKHBvaW50c1twTGVuLTJdLnRpbWUgLSBwb2ludHNbcExlbi0zXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgICAgKSAvIDI7XHJcblxyXG4gICAgICAgIGxldCBvZmZzZXRYID0gc3RhcnRQb2ludC54IC0gb2Zmc2V0UG9pbnQueCxcclxuICAgICAgICAgICAgb2Zmc2V0WSA9IHN0YXJ0UG9pbnQueSAtIG9mZnNldFBvaW50Lnk7XHJcblxyXG4gICAgICAgIGxldCBkaXN0ID0gTWF0aC5zcXJ0KG9mZnNldFggKiBvZmZzZXRYICsgb2Zmc2V0WSAqIG9mZnNldFkpO1xyXG4gICAgICAgIGxldCBzcGVlZCA9IGRpc3QgLyB0aW1lO1xyXG5cclxuICAgICAgICBpZiAoZGlzdCA8PSAyIHx8IHRpbWUgPT09IDApIHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgZGlzdGFuY2UgbmVlZGVkIHRvIHRyYXZlbC5cclxuICAgICAgICAvLyBncmFwaCAtPiBodHRwczovL3d3dy5kZXNtb3MuY29tL2NhbGN1bGF0b3Ivd29wcWRicnU0eVxyXG4gICAgICAgIGxldCBkYW1wZW4gPVxyXG4gICAgICAgICAgICBNYXRoLnNxcnQoTWF0aC5sb2cxMChNYXRoLmxvZzEwKHNwZWVkICoqIDMgKyAxKSAqKiAxNSArIDEpKSAqKlxyXG4gICAgICAgICAgICAgICAgMC4wNyAvXHJcbiAgICAgICAgICAgIDQ7XHJcblxyXG4gICAgICAgIGxldCB2ZWN0b3JMZW5ndGggPSBzcGVlZCAqKiAxLjA5ICogNDAwICogZGFtcGVuO1xyXG4gICAgICAgIC8vc3BlZWQqKjAuNiAqICg0MCAqIE1hdGguc3FydChzcGVlZCoqMS42KSk7XHJcbiAgICAgICAgLy9zcGVlZCAqICgyMCAqIE1hdGguc3FydChzcGVlZCkpO1xyXG4gICAgICAgIC8vc3BlZWQgKiAxNTAgLSA2MDsgLy8gRm91bmQgdGhpcyBtYWdpYyBudW1iZXIgdGhyb3VnaCB0cmlhbCBhbmQgZXJyb3IuXHJcblxyXG4gICAgICAgIHRyYW5zaXN0aW9uRHVyYXRpb25NUyAqPSBkYW1wZW47XHJcblxyXG4gICAgICAgIC8vIE5ldyB2ZWN0b3IuXHJcbiAgICAgICAgbGV0IHZlY3RvciA9IHtcclxuICAgICAgICAgICAgcmlzZTogdmVjdG9yTGVuZ3RoICogTWF0aC5zaW4oYW5nbGUpLFxyXG4gICAgICAgICAgICBydW46IHZlY3Rvckxlbmd0aCAqIE1hdGguY29zKGFuZ2xlKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGZpbmFsIHggYW5kIHkgcG9zaXRpb25zIGZvciB0aGUgYW5pbWF0aW9uLlxyXG4gICAgICAgIC8vIFJvdW5kaW5nIHRoZSBjb29yZGluYXRlcyBzbyB0aGF0IHRoZSB0ZXh0IG9uIHRoZSBtYXJrZXJzIGluIGNocm9tZSBpcyBub3QgYmx1cnJ5LlxyXG4gICAgICAgIGxldCBmaW5pc2hQb2ludCA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5yb3VuZCh2ZWN0b3IucnVuICsgc3RhcnRQb2ludC54KSxcclxuICAgICAgICAgICAgeTogTWF0aC5yb3VuZCh2ZWN0b3IucmlzZSArIHN0YXJ0UG9pbnQueSksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmxlZnQgPSBmaW5pc2hQb2ludC54O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSBmaW5pc2hQb2ludC55O1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzTWFwLm1haW5Db250YWluZXIuZWxlbWVudFxyXG4gICAgICAgICAgICAuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gXCJ0cmFuc2Zvcm0gXCIgKyB0cmFuc2lzdGlvbkR1cmF0aW9uTVMgK1xyXG4gICAgICAgICAgICBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjMsIDEpXCI7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50XHJcbiAgICAgICAgICAgIC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlM2QoXCIgKyBmaW5pc2hQb2ludC54ICsgXCJweCxcIiArXHJcbiAgICAgICAgICAgIGZpbmlzaFBvaW50LnkgKyBcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgICAgIC8vIFJlc2V0IHRyYW5zaXRpb24uXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRyYW5zaXRpb25SZXNldFRpbWVvdXQpO1xyXG5cclxuICAgICAgICB0cmFuc2l0aW9uUmVzZXRUaW1lb3V0ID0gc2V0VGltZW91dChcclxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNJVElPTl0gPSAnJztcclxuICAgICAgICAgICAgfS5iaW5kKHRoaXNNYXApLFxyXG4gICAgICAgICAgICB0cmFuc2lzdGlvbkR1cmF0aW9uTVMsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wUGFuQW5pbWF0aW9uKGUpIHtcclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICBsZXQgcG9zT25CZXppZXJDdXJ2ZSA9IGRvY3VtZW50LmRlZmF1bHRWaWV3XHJcbiAgICAgICAgICAgIC5nZXRDb21wdXRlZFN0eWxlKHRoaXNNYXAubWFpbkNvbnRhaW5lci5lbGVtZW50KVxyXG4gICAgICAgICAgICAudHJhbnNmb3JtLm1hdGNoKC8oLT9cXGQqLj9cXGQqKSwgKC0/XFxkKi4/XFxkKilcXCkkLyk7XHJcblxyXG4gICAgICAgIGlmICghcG9zT25CZXppZXJDdXJ2ZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeCA9IE1hdGgucm91bmQocG9zT25CZXppZXJDdXJ2ZVsxXSksIC8vTWF0aC5yb3VuZChwYW4uYW5pbS5zdGFydFBvaW50LnggLSAoKHBhbi5hbmltLnN0YXJ0UG9pbnQueCAtIHBhbi5hbmltLmVuZFBvaW50LngpICogcG9zT25CZXppZXJDdXJ2ZSkpLFxyXG4gICAgICAgICAgICB5ID0gTWF0aC5yb3VuZChwb3NPbkJlemllckN1cnZlWzJdKTsgLy9NYXRoLnJvdW5kKHBhbi5hbmltLnN0YXJ0UG9pbnQueSAtICgocGFuLmFuaW0uc3RhcnRQb2ludC55IC0gcGFuLmFuaW0uZW5kUG9pbnQueSkgKiBwb3NPbkJlemllckN1cnZlKSk7XHJcblxyXG4gICAgICAgIHRoaXNNYXAudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgICAgIHggLSB0aGlzTWFwLm1haW5Db250YWluZXIubGVmdCxcclxuICAgICAgICAgICAgeSAtIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpc01hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAndHJhbnNsYXRlKCcgKyB4ICsgJ3B4LCcgKyB5ICsgJ3B4KSc7XHJcblxyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci50b3AgPSB5O1xyXG4gICAgICAgIHRoaXNNYXAubWFpbkNvbnRhaW5lci5sZWZ0ID0geDtcclxuXHJcbiAgICAgICAgdGhpc01hcC5ldmVudC5maXJlKCdzdG9wUGFuQW5pbWF0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZW5hYmxlUGFubmluZygpIHtcclxuICAgICAgICB0aGlzTWFwLmV2ZW50Lm9uKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRpc2FibGVQYW5uaW5nKCkge1xyXG4gICAgICAgIHRoaXNNYXAuZXZlbnQub2ZmKCdtb3VzZWRvd24nLCBtb3VzZURvd24pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcGFuVG86IHBhblRvLFxyXG4gICAgICAgIHBhbkJ5UGl4ZWxzOiBwYW5CeVBpeGVscyxcclxuICAgICAgICBlbmFibGVQYW5uaW5nOiBlbmFibGVQYW5uaW5nLFxyXG4gICAgICAgIGRpc2FibGVQYW5uaW5nOiBkaXNhYmxlUGFubmluZyxcclxuICAgICAgICBzdG9wUGFuQW5pbWF0aW9uOiBzdG9wUGFuQW5pbWF0aW9uLFxyXG4gICAgICAgIG1hcERyYWdPbmx5OiBtYXBEcmFnT25seSxcclxuICAgICAgICBtYXBEcmFnQW5kQW5pbWF0aW9uOiBtYXBEcmFnQW5kQW5pbWF0aW9uLFxyXG4gICAgICAgIHBhbm5pbmdGaW5pc2hlZEFuaW1hdGlvbjogcGFubmluZ0ZpbmlzaGVkQW5pbWF0aW9uLFxyXG4gICAgfTtcclxufVxyXG4iLCJpbXBvcnQge0Jhc2ljRXZlbnRTeXN0ZW19IGZyb20gJy4vQmFzaWNFdmVudFN5c3RlbV9jbGFzcyc7XHJcbmltcG9ydCB7cGFubmluZ19tb2R1bGV9IGZyb20gJy4vcGFubmluZ19tb2R1bGUnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOZXdNYXAgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKHNwUG9pbnQsIHBfem9vbSwgcGFyYW1ldGVycykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgICAgICB0aGlzLmluaXQoc3BQb2ludCwgcF96b29tKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KHNwUG9pbnQsIHBfem9vbSkge1xyXG4gICAgICAgIC8vdGhpcy56b29tID0gMDtcclxuXHJcbiAgICAgICAgbGV0IHBhcmFtcyA9IHRoaXMucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgdGhpcy56b29tSW5kZXggPSBwYXJhbXMuem9vbUluZGV4O1xyXG4gICAgICAgIHRoaXMubWF4Wm9vbSA9XHJcbiAgICAgICAgICAgIHBhcmFtcy5tYXhab29tIHx8ICh0aGlzLnpvb21JbmRleCAmJiB0aGlzLnpvb21JbmRleC5sZW5ndGgpIHx8IDI0O1xyXG4gICAgICAgIHRoaXMubWluWm9vbSA9IHBhcmFtcy5taW5ab29tIHx8IDA7XHJcbiAgICAgICAgdGhpcy56b29tRGVsdGEgPSBwYXJhbXMuem9vbURlbHRhIHx8IDE7XHJcblxyXG4gICAgICAgIHRoaXMuTU9VU0VfV0hFRUxfRVZUID0gdXRpbHMuTU9VU0VfV0hFRUxfRVZUO1xyXG4gICAgICAgIHRoaXMuQ1NTX1RSQU5TRk9STSA9IHV0aWxzLkNTU19UUkFOU0ZPUk07XHJcbiAgICAgICAgdGhpcy5DU1NfVFJBTlNJVElPTiA9IHV0aWxzLkNTU19UUkFOU0lUSU9OO1xyXG5cclxuICAgICAgICB0aGlzLm1ha2VDb250YWluZXJzKCk7XHJcbiAgICAgICAgdGhpcy5sb2FkTW9kdWxlcygpO1xyXG4gICAgICAgIHRoaXMuY3JlYXRlRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5leHRlbnQgPSB7XHJcbiAgICAgICAgICAgIHZpc2libGU6IHt9LFxyXG4gICAgICAgICAgICBmdWxsOiB7fSwgLy8gVE9ETzogQ3VycmVudGx5IG5vdCB1c2VkIGJ5IGFueXRoaW5nLlxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSB7em9vbWluZzogZmFsc2V9OyAvLyBUb2RvOiBEZWxldGUgZXZlbnR1YWxseS5cclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVDb250YWluZXJTaXplKCk7IC8vIFRvZG86IElzIHRoaXMgdGhlIGJlc3Qgd2F5P1xyXG5cclxuICAgICAgICBpZiAoc3BQb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldFZpZXcoc3BQb2ludCwgcF96b29tKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmluaXQuaW5pdEFycikge1xyXG4gICAgICAgICAgICBsZXQgYXJ5ID0gdGhpcy5pbml0LmluaXRBcnI7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGFyeS5sZW5ndGg7IG4rKykge1xyXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBhZGRpdGlvbmFsIGZ1bmN0aW9ucyBhbiBleHRlbnNpb25cclxuICAgICAgICAgICAgICAgIC8vIG1pZ2h0IGhhdmUgYWRkZWQuXHJcbiAgICAgICAgICAgICAgICBhcnlbbl0uZm4uY2FsbChhcnlbbl0uY3R4IHx8IHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBvbkluaXREb25lKGZuLCBjdHgpIHtcclxuICAgICAgICAvLyBUZXN0aW5nIGFuIGlkZWEgYWJvdXQgaG93IHRvIGV4dGVuZCB0aGUgaW5pdCBmdW5jdGlvbi5cclxuICAgICAgICBsZXQgYXJ5ID0gdGhpcy5wcm90b3R5cGUuaW5pdC5pbml0YXJyO1xyXG4gICAgICAgIGlmICghYXJ5KSB7XHJcbiAgICAgICAgICAgIGFyeSA9IHRoaXMucHJvdG90eXBlLmluaXQuaW5pdEFyciA9IFtdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhcnkucHVzaCh7Zm4sIGN0eH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFZpZXcoc3BQb2ludCwgem9vbSkge1xyXG4gICAgICAgIHNwUG9pbnQgPSB0aGlzLnRvUG9pbnQoc3BQb2ludCk7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbSA9IHpvb207XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHRSYXRpbyA9IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgICAgIGxldCByZXNvbHV0aW9uID0gdGhpcy5tYXBDb250YWluZXIud2lkdGggKiB0aGlzLmdldFJlc29sdXRpb24oem9vbSk7XHJcblxyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUgPSB7XHJcbiAgICAgICAgICAgIHg6IHNwUG9pbnQueCAtIHJlc29sdXRpb24gLyAyLFxyXG4gICAgICAgICAgICBYOiBzcFBvaW50LnggKyByZXNvbHV0aW9uIC8gMixcclxuICAgICAgICAgICAgeTogc3BQb2ludC55IC0gKHJlc29sdXRpb24gLyAyKSAqIGhlaWdodFJhdGlvLFxyXG4gICAgICAgICAgICBZOiBzcFBvaW50LnkgKyAocmVzb2x1dGlvbiAvIDIpICogaGVpZ2h0UmF0aW8sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnN0YXRlLmxvYWRlZCkge1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlLmxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnQuZmlyZSgnbG9hZGVkJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ldmVudC5maXJlKCd1cGRhdGUgZXZlcnl0aGluZycpOyAvLyBUb2RvOiBNYXliZSB0aGUgZXZlbnQgc2hvdWxkIGJlIFwic2V0dmlld1wiP1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXJTaXplKGRvUGFuVG9NaWRQb2ludCkge1xyXG4gICAgICAgIGxldCB2aXNpYmxlRXh0ZW50ID0gdGhpcy5leHRlbnQudmlzaWJsZTtcclxuICAgICAgICBsZXQgbWFwQ29udGFpbmVyID0gdGhpcy5tYXBDb250YWluZXI7XHJcbiAgICAgICAgbGV0IGNvbnRhaW5lclJlY3QgPSBtYXBDb250YWluZXIuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAgICAgbWFwQ29udGFpbmVyLndpZHRoID0gdGhpcy5wYXJhbWV0ZXJzLmNvbnRhaW5lci5jbGllbnRXaWR0aDtcclxuICAgICAgICBtYXBDb250YWluZXIuaGVpZ2h0ID0gdGhpcy5wYXJhbWV0ZXJzLmNvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcblxyXG4gICAgICAgIG1hcENvbnRhaW5lci5sZWZ0ID0gY29udGFpbmVyUmVjdC5sZWZ0O1xyXG4gICAgICAgIG1hcENvbnRhaW5lci50b3AgPSBjb250YWluZXJSZWN0LnRvcDtcclxuXHJcbiAgICAgICAgbWFwQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gbWFwQ29udGFpbmVyLmhlaWdodCArICdweCc7XHJcbiAgICAgICAgbWFwQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUud2lkdGggPSBtYXBDb250YWluZXIud2lkdGggKyAncHgnO1xyXG5cclxuICAgICAgICBsZXQgbWlkUG9pbnQgPSB7XHJcbiAgICAgICAgICAgIHg6IHZpc2libGVFeHRlbnQueCArICh2aXNpYmxlRXh0ZW50LnggLSB2aXNpYmxlRXh0ZW50LngpIC8gMixcclxuICAgICAgICAgICAgeTogdmlzaWJsZUV4dGVudC55ICsgKHZpc2libGVFeHRlbnQuWSAtIHZpc2libGVFeHRlbnQueSkgLyAyLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHRSYXRpbyA9IG1hcENvbnRhaW5lci5oZWlnaHQgLyBtYXBDb250YWluZXIud2lkdGg7XHJcbiAgICAgICAgbGV0IHJlc29sdXRpb24gPSBtYXBDb250YWluZXIud2lkdGggKiB0aGlzLmdldFJlc29sdXRpb24odGhpcy56b29tKTtcclxuXHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZSA9IHtcclxuICAgICAgICAgICAgeDogdmlzaWJsZUV4dGVudC54LFxyXG4gICAgICAgICAgICBYOiB2aXNpYmxlRXh0ZW50LnggKyByZXNvbHV0aW9uLFxyXG4gICAgICAgICAgICB5OiB2aXNpYmxlRXh0ZW50LlkgLSByZXNvbHV0aW9uICogaGVpZ2h0UmF0aW8sXHJcbiAgICAgICAgICAgIFk6IHZpc2libGVFeHRlbnQuWSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3VwZGF0ZUNvbnRhaW5lclNpemUnLCB0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGRvUGFuVG9NaWRQb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLnBhblRvKG1pZFBvaW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZUNvbnRhaW5lcnMoKSB7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID0gJ190aGVNYXBDb250YWluZXJfJztcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICAgICAncG9zaXRpb246IHJlbGF0aXZlOyBvdmVyZmxvdzogaGlkZGVuOyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsnO1xyXG5cclxuICAgICAgICB0aGlzLm1haW5Db250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xyXG4gICAgICAgIHQ7XHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9XHJcbiAgICAgICAgICAgICdwb3NpdGlvbjogYWJzb2x1dGU7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7IHRyYW5zZm9ybTogdHJhbnNsYXRlM2QoMHB4LCAwcHgsIDBweCkgc2NhbGUzZCgxLDEsMSk7JztcclxuXHJcbiAgICAgICAgdGhpcy5zdmdDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyksXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLnN2Z0NvbnRhaW5lci5lbGVtZW50LnNldEF0dHJpYnV0ZShcclxuICAgICAgICAgICAgJ3htbG5zOnhsaW5rJyxcclxuICAgICAgICAgICAgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5zdmdDb250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAgICAgJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAwcHg7IGxlZnQ6IDBweDsgd2lkdGg6IDEwMDAwMDAwcHg7IGhlaWdodDogMTAwMDAwcHg7IG92ZXJmbG93OiBoaWRkZW47JztcclxuXHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAgICAgJ3Bvc2l0aW9uOiByZWxhdGl2ZTsgei1pbmRleDogMTAwMDsnO1xyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID0gJ19tYXJrZXJDb250YWluZXJfJztcclxuXHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zdmdDb250YWluZXIuZWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmFtZXRlcnMuY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQpO1xyXG4gICAgICAgIC8vIE1ha2UgYSB6b29tIHNsaWRlciBoZXJlP1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VDb250YWluZXIoZWwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAvLyBUb2RvIGZpbmlzaCB0aGlzIHRhc2suXHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsLFxyXG4gICAgICAgICAgICBsZWZ0OiBudWxsLFxyXG4gICAgICAgICAgICB0b3A6IG51bGwsXHJcbiAgICAgICAgICAgIHdpZHRoOiBudWxsLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IG51bGwsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkTW9kdWxlcygpIHtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gbmV3IEJhc2ljRXZlbnRTeXN0ZW0oKTsgLy8gVE9ETzogQ2hhbmdlIHRoaXMgaW4gZnV0dXJlO1xyXG5cclxuICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlID0gcGFubmluZ19tb2R1bGUodGhpcyk7XHJcbiAgICAgICAgLy8gdGhpcy5ib3hab29tX21vZHVsZSA9IGJveFpvb21fbW9kdWxlKHRoaXMpO1xyXG4gICAgICAgIC8vIHRoaXMuWm9vbV9jbGFzcyA9IG5ldyBab29tX2NsYXNzKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIGxldCBtYXBDb250RWwgPSB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50O1xyXG5cclxuICAgICAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLmVuYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgIHRoaXMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgICAgICAgICBldnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IF9ldnRfID0gdW5kZWZpbmVkOyAvLyBUaGlzIGlzIG5lZWRlZCBmb3IgdGhlIGRlbHRhLlxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgZXZ0Ll9fX2RlbHRhID0gZXZ0LndoZWVsRGVsdGFcclxuICAgICAgICAgICAgICAgICAgICA/IGV2dC53aGVlbERlbHRhXHJcbiAgICAgICAgICAgICAgICAgICAgOiBldnQuZGVsdGFZIC8vIE5ld2lzaCBmaXJlZm94P1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBldnQuZGVsdGFZICogLTEyMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAoKF9ldnRfID0gd2luZG93LmV2ZW50IHx8IGV2dCksIF9ldnRfLmRldGFpbCAqIC0xMjApO1xyXG5cclxuICAgICAgICAgICAgICAgIGV2dC5fX19kZWx0YSA9IGV2dC5fX19kZWx0YSA+IDAgPyAxMjAgOiAtMTIwOyAvLyBOb3JtYWxpemUgZGVsdGEuXHJcblxyXG4gICAgICAgICAgICAgICAgZXZ0Lnpvb21EZWx0YSA9IGV2dC56b29tRGVsdGEgfHwgdGhpcy56b29tRGVsdGE7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZXZ0LCB0aGlzLk1PVVNFX1dIRUVMX0VWVCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbW91c2Vkb3duJyxcclxuICAgICAgICAgICAgZXZ0ID0+IHtcclxuICAgICAgICAgICAgICAgIC8vbGV0IGV2dCA9IGUuX19ldmVudF9fO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChldnQud2hpY2ggIT09IDEgfHwgZXZ0LndoaWNoID09PSAwIC8qdG91Y2gqLykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZXZ0LnNoaWZ0S2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ib3hab29tX21vdXNlRG93bihldnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhbi5tb3VzZURvd25YID0gZXZ0LmNsaWVudFg7IC8vIENoZWNrZWQgaW4gdGhlIG1vdXNlIGNsaWNrIGxpc3RlbmVyLCBvYnZpb3VzIGhhY2sgaXMgb2J2aW91cy5cclxuICAgICAgICAgICAgICAgIHRoaXMucGFuLm1vdXNlRG93blkgPSBldnQuY2xpZW50WTsgLy8gQ2hlY2tlZCBpbiB0aGUgbW91c2UgY2xpY2sgbGlzdGVuZXIsIG9idmlvdXMgaGFjayBpcyBvYnZpb3VzLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZXZ0KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZXVwJyxcclxuICAgICAgICAgICAgZSA9PiB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcixcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ21vdXNlb3ZlcicsXHJcbiAgICAgICAgICAgIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW91dCcsXHJcbiAgICAgICAgICAgIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZW1vdmUnLFxyXG4gICAgICAgICAgICBlID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKGUpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ2NsaWNrJyxcclxuICAgICAgICAgICAgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyB0b2RvOiBGaW5kIGJldHRlciB3YXkgdG8gY2hlY2sgaWYgaXQgaXMgXCJzYWZlXCIgdG8gY2xpY2suXHJcbiAgICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICAgICAgZS5jbGllbnRZID09PSB0aGlzLnBhbi5tb3VzZURvd25ZICYmXHJcbiAgICAgICAgICAgICAgICAgICAgZS5jbGllbnRYID09PSB0aGlzLnBhbi5tb3VzZURvd25YXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5ldmVudC5vbihcclxuICAgICAgICAgICAgdXRpbHMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgICAgICAgICBwX2V2dCA9PiB0aGlzLnpvb21Jbk91dChwX2V2dCksXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBldmVudERlbGdhdGlvbkhhbmRsZXIoZSwgdHlwZSkge1xyXG4gICAgICAgIHR5cGUgPSB0eXBlIHx8IGUudHlwZTtcclxuXHJcbiAgICAgICAgbGV0IHBhcmVudEVsZW1lbnQgPSBlLnRhcmdldDtcclxuICAgICAgICBsZXQgc3RvcFByb3BhZ2F0dGluZyA9IGZhbHNlO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCBwb2ludEluQ29udGFpbmVyID0gZS5jb250YWluZXJYICYmIGUuY29udGFpbmVyWVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8geyB4OiBlLmNvbnRhaW5lclgsIHk6IGUuY29udGFpbmVyWSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcih7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pO1xyXG4gICAgICAgIGxldCBuZXdfZXZ0ID0ge1xyXG4gICAgICAgICAgICBfX2V2ZW50X186IGUsXHJcbiAgICAgICAgICAgIHg6IHBvaW50SW5Db250YWluZXIueCxcclxuICAgICAgICAgICAgeTogcG9pbnRJbkNvbnRhaW5lci55LFxyXG4gICAgICAgICAgICBjc3M6IGUuY3NzLFxyXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxyXG4gICAgICAgICAgICB6b29tRGVsdGE6IGUuem9vbURlbHRhIHx8IHRoaXMuem9vbURlbHRhLFxyXG4gICAgICAgICAgICAvL3ByZXZlbnREZWZhdWx0OiBlLnByZXZlbnREZWZhdWx0LmJpbmQoZSksXHJcbiAgICAgICAgICAgIHNwUG9pbnQ6IG51bGwsXHJcbiAgICAgICAgICAgIHN0b3BQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzdG9wUHJvcGFnYXR0aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3aGlsZSAocGFyZW50RWxlbWVudCAmJiBwYXJlbnRFbGVtZW50ICE9PSB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICEocGFyZW50RWxlbWVudC5fbWFya2VyX29iaiAmJiBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLmZpcmUpXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudCA9IHBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocGFyZW50RWxlbWVudC5fbWFya2VyX29iai5zdGF0ZVBsYW5lUG9pbnQpIHtcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHBhcmVudEVsZW1lbnQuX21hcmtlcl9vYmouc3RhdGVQbGFuZVBvaW50O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLmZpcmUodHlwZSwgbmV3X2V2dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoc3RvcFByb3BhZ2F0dGluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBwYXJlbnRFbGVtZW50ID0gcGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGUuX19fZGVsdGEpIHtcclxuICAgICAgICAgICAgLy8gTWFwIGlzIHpvb21pbmcuXHJcbiAgICAgICAgICAgIHRoaXMucGFubmluZ19tb2R1bGUuc3RvcFBhbkFuaW1hdGlvbihuZXdfZXZ0KTtcclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHRoaXMuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ocG9pbnRJbkNvbnRhaW5lcik7IC8vIEhhbHRpbmcgcGFubmluZyBhbmltYXRpb24gY2hhbmdlcyBleHRlbnQuLlxyXG5cclxuICAgICAgICAgICAgbGV0IF96b29tRGVsdGEgPSB0aGlzLmNhbGNab29tRGVsdGEoXHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20sXHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0Lnpvb21EZWx0YSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWluWm9vbSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWF4Wm9vbSxcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBfem9vbUFkZGVyID1cclxuICAgICAgICAgICAgICAgIGUuX19fZGVsdGEgPj0gMTIwID8gX3pvb21EZWx0YS5tYXhEZWx0YSA6IC1fem9vbURlbHRhLm1pbkRlbHRhO1xyXG5cclxuICAgICAgICAgICAgdGhpcy56b29tICs9IF96b29tQWRkZXI7XHJcblxyXG4gICAgICAgICAgICBsZXQgX3Jlc29sdXRpb24gPSB0aGlzLmdldFJlc29sdXRpb24odGhpcy56b29tKTtcclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc2NhbGUgPVxyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRSZXNvbHV0aW9uKHRoaXMuem9vbSAtIF96b29tQWRkZXIpIC8gX3Jlc29sdXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc0V4dGVudEJ5T3JpZ2luQW5kUmVzb2x1dGlvbihcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCxcclxuICAgICAgICAgICAgICAgIG5ld19ldnQuc2NhbGUsXHJcbiAgICAgICAgICAgICAgICBfcmVzb2x1dGlvbixcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZXdfZXZ0LnNwUG9pbnQgPSB0aGlzLnNjcmVlblBvaW50VG9Qcm9qZWN0aW9uKHBvaW50SW5Db250YWluZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5ldmVudC5maXJlKHR5cGUsIG5ld19ldnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFRvKGVsZW1lbnQsIHBhcmVudCwgY2FsbEJhY2spIHtcclxuICAgICAgICBsZXQgYXJncyA9IGFyZ3VtZW50cztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcclxuICAgICAgICAgICAgY2FsbEJhY2soKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50Lm9uKFxyXG4gICAgICAgICAgICAgICAgJ2xvYWRlZCcsXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBfZm5fKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZFRvLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnQub2ZmKCdsb2FkZWQnLCBfZm5fKTtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtCYXNpY0V2ZW50U3lzdGVtfSBmcm9tICcuL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3MnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJhc2ljSW50ZXJhY3RpdmVFbGVtZW50IGV4dGVuZHMgQmFzaWNFdmVudFN5c3RlbSB7XHJcbiAgICBjb25zdHJ1Y3RvcihlbGVtKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtO1xyXG4gICAgICAgIHRoaXMuZGVsZXRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBlbGVtLl9tYXJrZXJfb2JqID0gdGhpcztcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOZXdNYXB9IGZyb20gJy4vTWFpbl9jbGFzcyc7XHJcblxyXG5PYmplY3QuYXNzaWduKE5ld01hcC5wcm90b3R5cGUsIHtcclxuICAgIGNhbGNab29tRGVsdGEsXHJcbiAgICB6b29tVG8sXHJcbiAgICB6b29tSW5PdXQsXHJcbn0pO1xyXG5cclxuTmV3TWFwLm9uSW5pdERvbmUoZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBUZXN0aW5nIGFuIGlkZWEgYWJvdXQgaG93IHRvIGV4ZW5kIHRoZSBpbml0IGZ1bmN0aW9uLlxyXG4gICAgdGhpcy56b29tID0gMDtcclxufSk7XHJcblxyXG5mdW5jdGlvbiBjYWxjWm9vbURlbHRhKHpvb21MdmwsIHpvb21EZWx0YSwgbWluWm9vbSwgbWF4Wm9vbSkge1xyXG4gICAgbGV0IHpvb21Jbkx2bCA9IHpvb21MdmwgKyB6b29tRGVsdGE7XHJcbiAgICBsZXQgem9vbU91dEx2bCA9IHpvb21MdmwgLSB6b29tRGVsdGE7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBtYXhEZWx0YTpcclxuICAgICAgICAgICAgem9vbUluTHZsID4gbWF4Wm9vbSA/IHpvb21EZWx0YSAtICh6b29tSW5MdmwgLSBtYXhab29tKSA6IHpvb21EZWx0YSxcclxuICAgICAgICBtaW5EZWx0YTpcclxuICAgICAgICAgICAgem9vbU91dEx2bCA8IG1pblpvb21cclxuICAgICAgICAgICAgICAgID8gem9vbURlbHRhICsgKHpvb21PdXRMdmwgLSBtaW5ab29tKVxyXG4gICAgICAgICAgICAgICAgOiB6b29tRGVsdGEsXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB6b29tVG8ocHJvalBvaW50LCB6b29tLCBwcm9qT3JpZ2luKSB7XHJcbiAgICBsZXQgY29udmVydFBvaW50ID0gdGhpcy5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpcyk7XHJcbiAgICBsZXQgX3BvaW50ID0gY29udmVydFBvaW50KHByb2pQb2ludCk7XHJcbiAgICBsZXQgem9vbVNpZ24gPSB6b29tID4gdGhpcy56b29tID8gMSA6IC0xO1xyXG4gICAgbGV0IHpvb21EaWZmID0gem9vbSAtIHRoaXMuem9vbTtcclxuICAgIGxldCBzY2FsZSA9IDEgKyAxIC8gKDIgKiogem9vbURpZmYgLSAxKTtcclxuICAgIGxldCBjZW50ZXIgPSB7XHJcbiAgICAgICAgeDogdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgIHk6IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIDIsXHJcbiAgICB9O1xyXG5cclxuICAgIGxldCBfb3JpZ2luID0gKHByb2pPcmlnaW4gJiYgY29udmVydFBvaW50KHByb2pPcmlnaW4pKSB8fCBjZW50ZXI7XHJcblxyXG4gICAgbGV0IGRpc3RhbmNlWCA9IF9wb2ludC54IC0gX29yaWdpbi54O1xyXG4gICAgbGV0IGRpc3RhbmNlWSA9IF9wb2ludC55IC0gX29yaWdpbi55O1xyXG4gICAgbGV0IHNpbU1vdXNlWCA9IF9vcmlnaW4ueCArIGRpc3RhbmNlWCAqIHNjYWxlO1xyXG4gICAgbGV0IHNpbU1vdXNlWSA9IF9vcmlnaW4ueSArIGRpc3RhbmNlWSAqIHNjYWxlO1xyXG5cclxuICAgIGlmICh6b29tID09PSB0aGlzLnpvb20pIHtcclxuICAgICAgICAvL3RoaXMubWFwLnBhbm5pbmdfbW9kdWxlLnBhblRvKG9yaWdpbiB8fCBwcm9qUG9pbnQsIDUwMCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpbXVsYXRlIGEgbW91c2Ugd2hlZWwgZXZlbnQuXHJcbiAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lclg6IHNpbU1vdXNlWCxcclxuICAgICAgICAgICAgY29udGFpbmVyWTogc2ltTW91c2VZLFxyXG4gICAgICAgICAgICBfX19kZWx0YTogem9vbVNpZ24gKiAxMjAsXHJcbiAgICAgICAgICAgIGNzczoge1xyXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnZWFzZW91dCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHpvb21EZWx0YTogTWF0aC5hYnMoem9vbURpZmYpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXRpbHMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHpvb21Jbk91dChwX2V2dCkge1xyXG4gICAgaWYgKHBfZXZ0LnNjYWxlID09PSAxKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnN0YXRlLnpvb21pbmcgPT09IHRydWUpIHtcclxuICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3pvb20gZW5kJywgcF9ldnQpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnN0YXRlLnpvb21pbmcgPSB0cnVlO1xyXG5cclxuICAgIHRoaXMuZXZlbnQuZmlyZSgncHJlem9vbScsIHBfZXZ0KTtcclxuICAgIHRoaXMuZXZlbnQuZmlyZSgnem9vbSBlbmQnLCBwX2V2dCk7XHJcbn07XHJcbiIsImltcG9ydCB7QmFzaWNFdmVudFN5c3RlbX0gZnJvbSAnLi4vQmFzaWNFdmVudFN5c3RlbV9jbGFzcyc7XHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNpY0xheWVyIGV4dGVuZHMgQmFzaWNFdmVudFN5c3RlbSB7XHJcbiAgICBjb25zdHJ1Y3RvcihoaWRlRHVyaW5nWm9vbSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmhpZGVEdXJpbmdab29tID0gaGlkZUR1cmluZ1pvb207XHJcbiAgICAgICAgdGhpcy56b29tT2JqID0ge3hPZmZzZXQ6IDAsIHlPZmZzZXQ6IDB9O1xyXG4gICAgICAgIHRoaXMuem9vbUx2bCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy56b29tVGltZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuem9vbUluZGV4ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnpvb21FbmRtcyA9IDIwMDtcclxuICAgICAgICAvLyB0aGlzLmZyYWN0aW9uT2Zmc2V0ID0geyB4OiAwLCB5OiAwIH07IFRPRE86IFJlbW92ZSB0aGlzIHdoZW5ldmVyLlxyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzID0ge3g6IDAsIHk6IDB9O1xyXG4gICAgfVxyXG5cclxuICAgIHNldFpvb21JbmRleChpbmRleCkge1xyXG4gICAgICAgIHRoaXMuem9vbUluZGV4ID0gaW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0WmluZGV4KHpJbmRleCkge1xyXG4gICAgICAgIHRoaXMuekluZGV4ID0gekluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIGlmICh0aGlzLmhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFxyXG4gICAgICAgICAgICAgICAgdXRpbHMuTU9VU0VfV0hFRUxfRVZULFxyXG4gICAgICAgICAgICAgICAgdGhpcy5faGlkZUNvbnRhaW5lckR1cmluZ01vdXNlV2hlZWxFdnQsXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGhpcy5fbW91c2VXaGVlbEV2dCwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vbigndXBkYXRlQ29udGFpbmVyU2l6ZScsIHRoaXMudXBkYXRlQ29udGFpbmVyLCB0aGlzKTtcclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcclxuICAgICAgICAgICAgJ3VwZGF0ZSBldmVyeXRoaW5nJyxcclxuICAgICAgICAgICAgdGhpcy5maXJlLmJpbmQodGhpcywgJ3VwZGF0ZSBldmVyeXRoaW5nJyksXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5vbignem9vbSBlbmQnLCB0aGlzLl96b29tRW5kRXZ0LCB0aGlzKTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCdhZGQgZXZlbnQgbGlzdGVuZXJzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21FbmRFdnQocF9ldnQpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tVGltZXIpO1xyXG5cclxuICAgICAgICB0aGlzLnpvb21UaW1lciA9IHNldFRpbWVvdXQoXHJcbiAgICAgICAgICAgICgpID0+IHRoaXMuZmlyZSgnem9vbSBkZWxheSBlbmQnLCBwX2V2dCksXHJcbiAgICAgICAgICAgIHRoaXMuem9vbUVuZG1zLFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgX2hpZGVDb250YWluZXJEdXJpbmdNb3VzZVdoZWVsRXZ0KCkge1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLmZpcmUoJ3pvb20gZW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgX21vdXNlV2hlZWxFdnQocF9ldnQpIHtcclxuICAgICAgICAvLyBsZXQgcG9pbnQgPSB7IHg6IHBfZXZ0LngsIHk6IHBfZXZ0LnkgfTtcclxuXHJcbiAgICAgICAgaWYgKHBfZXZ0LnNjYWxlID09PSAxKSB7XHJcbiAgICAgICAgICAgIHBfZXZ0Lm5vWm9vbSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuZmlyZSgnem9vbSBlbmQnLCBwX2V2dCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwX2V2dC5fX2V2ZW50X18uX19fZGVsdGEgPj0gMTIwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbUluT3V0KHBfZXZ0LCAnem9vbSBpbicpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocF9ldnQuX19ldmVudF9fLl9fX2RlbHRhIDw9IC0xMjApIHtcclxuICAgICAgICAgICAgdGhpcy56b29tSW5PdXQocF9ldnQsICd6b29tIG91dCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhZGRUbyhtYXApIHtcclxuICAgICAgICBpZiAodGhpcy5tYXAgPT09IG1hcCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdMYXllciBhbHJlYWR5IGFkZGVkIHRvIG1hcCcsIHRoaXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWFwID0gbWFwO1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy5jcmVhdGVDb250YWluZXIoKTtcclxuICAgICAgICB0aGlzLnNldFpvb21JbmRleCh0aGlzLnpvb21JbmRleCB8fCB0aGlzLm1hcC56b29tSW5kZXgpO1xyXG5cclxuICAgICAgICBtYXAuYWRkVG8odGhpcy5jb250YWluZXIuZWxlbWVudCwgbWFwLm1haW5Db250YWluZXIuZWxlbWVudCwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmlyZSgnYXBwZW5kZWQgdG8gbWFwJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZSgpIHtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoXHJcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQsXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5hbGxPZmYodGhpcyk7XHJcbiAgICAgICAgdGhpcy5maXJlKCdyZW1vdmUnLCB0aGlzKTtcclxuICAgICAgICB0aGlzLm1hcCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIC8vIFRvIGJlIGltcGxpbWVudGVkIGJ5IGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBjbGFzcy5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgLy8gVG8gYmUgaW1wbGltZW50ZWQgYnkgY2xhc3NlcyB0aGF0IGV4dGVuZCB0aGlzIGNsYXNzLlxyXG4gICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBcIlRoZSBtZXRob2QgJ3VwZGF0ZUNvbnRhaW5lcicgaW4gXCIgK1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcclxuICAgICAgICAgICAgICAgIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5maXJlKCd1cGRhdGUgZXZlcnl0aGluZycpO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUNvbnRhaW5lcigpIHtcclxuICAgICAgICBsZXQgY29udCA9IHtcclxuICAgICAgICAgICAgZWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXHJcbiAgICAgICAgICAgIGxlZnQ6IDAgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgICAgIHRvcDogMCAtIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgICAgICAgICB1cGRhdGVUcmFuc2Zvcm06IHVuZGVmaW5lZCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb250LnVwZGF0ZVRyYW5zZm9ybSA9IHRoaXMudXBkYXRlQ29udGFpbmVyVHJhbnNmb3JtLmJpbmQoe1xyXG4gICAgICAgICAgICBjb250YWluZXI6IGNvbnQsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnQuZWxlbWVudC5jbGFzc05hbWUgPSAnX3RpbGVDb250YWluZXJfJztcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS5sZWZ0ID0gJzBweCc7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnRvcCA9ICcwcHgnO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS56SW5kZXggPSB0aGlzLnpJbmRleDtcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUuYmFja2ZhY2VWaXNpYmlsaXR5ID0gJ2hpZGRlbic7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnRyYW5zZm9ybU9yaWdpbiA9ICd0b3AgbGVmdCc7XHJcblxyXG4gICAgICAgIHJldHVybiBjb250O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lclRyYW5zZm9ybShsZWZ0LCB0b3AsIHNjYWxlKSB7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIubGVmdCA9IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIudG9wID0gdG9wO1xyXG5cclxuICAgICAgICBzY2FsZSA9IHNjYWxlIHx8IDE7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgdHJhbnNsYXRlM2QoJHtsZWZ0fXB4LCAke3RvcH1weCwgMHB4KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUzZCgke3NjYWxlfSwgJHtzY2FsZX0sIDEpYDtcclxuICAgIH1cclxuXHJcbiAgICBzd2FwQ29udGFpbmVyKGNoaWxkRWxlbWVudCwgZGVsYXkpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tVGltZXIpO1xyXG5cclxuICAgICAgICBsZXQgY29udE5ldyA9IHRoaXMuY3JlYXRlQ29udGFpbmVyKCk7XHJcbiAgICAgICAgbGV0IGNvbnRPbGQgPSB0aGlzLmNvbnRhaW5lcjtcclxuXHJcbiAgICAgICAgY29udE5ldy51cGRhdGVUcmFuc2Zvcm0oY29udE5ldy5sZWZ0LCBjb250TmV3LnRvcCwgMSk7XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gY29udE5ldztcclxuXHJcbiAgICAgICAgaWYgKGNoaWxkRWxlbWVudCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkRWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxyXG4gICAgICAgICAgICBjb250TmV3LmVsZW1lbnQsXHJcbiAgICAgICAgICAgIGNvbnRPbGQuZWxlbWVudCxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICAvLyBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICAgIC8vIFRvZG86IEp1c3QgZm9yIHRlc3RpbmcgcHVycG9zZXMuXHJcbiAgICAgICAgLy8gaWYgKGNvbnRPbGQuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID09PSAnbm9uZScpe1xyXG4gICAgICAgIC8vIGNvbnRPbGQuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcbiAgICAgICAgLy8gfWVsc2V7XHJcbiAgICAgICAgLy8gY29udE9sZC5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIC8vIH0sIDUwMCk7XHJcblxyXG4gICAgICAgIGxldCBkb1N3YXAgPSBlID0+IHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHN3YXBUaW1lcik7XHJcbiAgICAgICAgICAgIHRoaXMuZG9Td2FwID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub2ZmKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGlsZUxvYWRMaXN0ZW5lciwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZigndGlsZSBsb2FkZWQnLCBkb1N3YXAsIHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRPbGQuZWxlbWVudC5wYXJlbnRFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb250T2xkLmVsZW1lbnQucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChjb250T2xkLmVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHN3YXBUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBkb1N3YXAoKTtcclxuICAgICAgICB9LCBkZWxheSB8fCA0NTApO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAgICBJbW1pZGlhdGx5IHN3YXAgdGhlIGNvbnRhaW5lcnMgaWYgdGhlcmUgaXMgYSBtb3VzZXdoZWVsXHJcbiAgICAgICAgICAgIGV2ZW50IGJlZm9yZSB0aGUgc3dhcFRpbWVyIGZpcmVzIG9mZi5cclxuICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgZG9Td2FwLCB0aGlzKTtcclxuXHJcbiAgICAgICAgbGV0IF9fX3RoYXQgPSB0aGlzO1xyXG4gICAgICAgIGZ1bmN0aW9uIHRpbGVMb2FkTGlzdGVuZXIoZSkge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiB0ZXN0aW5nXHJcbiAgICAgICAgICAgIF9fX3RoYXQubWFwLmV2ZW50Lm9mZihcclxuICAgICAgICAgICAgICAgIHV0aWxzLk1PVVNFX1dIRUVMX0VWVCxcclxuICAgICAgICAgICAgICAgIHRpbGVMb2FkTGlzdGVuZXIsXHJcbiAgICAgICAgICAgICAgICBfX190aGF0LFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICAgICAgX19fdGhhdC5tYXAuZXZlbnQub24uYmluZChcclxuICAgICAgICAgICAgICAgICAgICBfX190aGF0Lm1hcC5ldmVudCxcclxuICAgICAgICAgICAgICAgICAgICAndGlsZSBsb2FkZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRvU3dhcCxcclxuICAgICAgICAgICAgICAgICAgICBfX190aGF0LFxyXG4gICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgIDEwMCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHpvb21FbmQoZXZ0KSB7XHJcbiAgICAgICAgaWYgKGV2dCAmJiBldnQubm9ab29tICYmIHRoaXMuX196b29tID09PSB0aGlzLm1hcC56b29tKSB7XHJcbiAgICAgICAgICAgIC8vIEhhY2sgdG8gc3RvcCBsYXllciBmcm9tIHpvb21pbmcgcGFzdCBpdCdzIGxpbWl0cy5cclxuICAgICAgICAgICAgLy90aGlzLmZpcmUoXCJ1cGRhdGUgZXZlcnl0aGluZ1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuem9vbU9iai5pc1pvb21pbmcpIHtcclxuICAgICAgICAgICAgLy8gRmlyc3QgdGltZSBjYWxsaW5nIHpvb21FbmQgc2luY2Ugc3RhcnRpbmcgem9vbWluZy5cclxuICAgICAgICAgICAgdGhpcy5maXJlKCdwcmUgem9vbSBlbmQnLCB0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX196b29tID0gdGhpcy5tYXAuem9vbTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tT2JqID0ge307XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZSgncG9zdCB6b29tIGVuZCcpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICByZXNldFpvb21PYmooKSB7XHJcbiAgICAgICAgdGhpcy56b29tT2JqID0ge1xyXG4gICAgICAgICAgICBzY2FsZTogMSxcclxuICAgICAgICAgICAgaXNab29taW5nOiBmYWxzZSxcclxuICAgICAgICAgICAgeDogdGhpcy5jb250YWluZXIubGVmdCxcclxuICAgICAgICAgICAgeTogdGhpcy5jb250YWluZXIudG9wLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHpvb21Jbk91dChldnQsIHpvb21EaXJlY3Rpb24pIHtcclxuICAgICAgICBpZiAodGhpcy56b29tT2JqLmlzWm9vbWluZykge1xyXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoXHJcbiAgICAgICAgICAgICAgICB0aGlzLl96b29tSW5PdXQuYmluZCh0aGlzLCBldnQsIHpvb21EaXJlY3Rpb24pLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID1cclxuICAgICAgICAgICAgKGV2dC5jc3MgJiYgZXZ0LmNzcy5jbGFzc05hbWUpIHx8ICdzbW9vdGhUcmFuc2l0aW9uJztcclxuXHJcbiAgICAgICAgdGhpcy5yZXNldFpvb21PYmooKTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tT2JqLmlzWm9vbWluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl96b29tSW5PdXQuYmluZCh0aGlzLCBldnQsIHpvb21EaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21Jbk91dChldnQsIHpvb21EaXJlY3Rpb24pIHtcclxuICAgICAgICBsZXQgek9iaiA9IHRoaXMuem9vbU9iajtcclxuICAgICAgICBsZXQgc2NhbGUgPSB0aGlzLmdldFNjYWxlKHpvb21EaXJlY3Rpb24sIGV2dC56b29tRGVsdGEpO1xyXG5cclxuICAgICAgICB6T2JqLnNjYWxlICo9IHNjYWxlO1xyXG5cclxuICAgICAgICBsZXQgX29sZCA9IHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzO1xyXG4gICAgICAgIGxldCBfbmV3ID0gdGhpcy50b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKCk7XHJcbiAgICAgICAgX25ldy54ID0gTWF0aC5mbG9vcihfbmV3LngpO1xyXG4gICAgICAgIF9uZXcueSA9IE1hdGguZmxvb3IoX25ldy55KTtcclxuXHJcbiAgICAgICAgbGV0IHggPSBfb2xkLnggKiB6T2JqLnNjYWxlIC0gX25ldy54IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0O1xyXG4gICAgICAgIGxldCB5ID0gX29sZC55ICogek9iai5zY2FsZSAtIF9uZXcueSAtIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgICAgICAgIGB0cmFuc2xhdGUzZCgkeyB4IH1weCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyB5IH1weCwgMHB4KVxyXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHsgek9iai5zY2FsZSB9LCAkeyB6T2JqLnNjYWxlIH0sIDEpYDtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCd6b29tIGVuZCcsIGV2dCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFNjYWxlKHpvb21EaXJlY3Rpb24sIHpvb21EZWx0YSkge1xyXG4gICAgICAgIGxldCBnZXRSZXMgPSB0aGlzLm1hcC5nZXRSZXNvbHV0aW9uLmJpbmQodGhpcy5tYXApO1xyXG4gICAgICAgIGxldCBzY2FsZSA9IDE7XHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbGV0IHpvb21MdmwgPSB0aGlzLm1hcC56b29tICsgKHpvb21EaXJlY3Rpb24gPT09IFwiem9vbSBpblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gLXpvb21EZWx0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHpvb21EZWx0YSk7XHJcblxyXG4gICAgICAgIHNjYWxlID0gZ2V0UmVzKHpvb21MdmwpIC8gZ2V0UmVzKHRoaXMubWFwLnpvb20pO1xyXG5cclxuICAgICAgICByZXR1cm4gc2NhbGU7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtCYXNpY0xheWVyfSBmcm9tICcuL0Jhc2ljTGF5ZXJfY2xhc3MnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJjUmVuZGVyTGF5ZXIgZXh0ZW5kcyBCYXNpY0xheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKGltZ1VybCwgcmVxVGVtcGxhdGUsIHpJbmRleCwgaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICBzdXBlcihoaWRlRHVyaW5nWm9vbSk7XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZXRJbWdSZXFVcmwoaW1nVXJsKTtcclxuICAgICAgICB0aGlzLnNldFJlcVRlbXBsYXRlKHJlcVRlbXBsYXRlKTtcclxuICAgICAgICB0aGlzLnJlcUlkID0gMDtcclxuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRaaW5kZXgoekluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbignYWRkIGV2ZW50IGxpc3RlbmVycycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5vbignYXBwZW5kZWQgdG8gbWFwJywgdGhpcy51cGRhdGUsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9uKFxyXG4gICAgICAgICAgICAgICAgJ3pvb20gZGVsYXkgZW5kJyxcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRVcGRhdGVUaW1lci5iaW5kKHRoaXMsIDEwMDApLFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIHRoaXMub24oIFwidXBkYXRlIGV2ZXJ5dGhpbmdcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24odXRpbHMuTU9VU0VfV0hFRUxfRVZULCB0aGlzLmNhbmNlbFJlcXVlc3QsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbigncGFuIGluaXRpYWwnLCB0aGlzLmNhbmNlbFJlcXVlc3QsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcclxuICAgICAgICAgICAgICAgICdwYW4gZW5kJyxcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRVcGRhdGVUaW1lci5iaW5kKHRoaXMsIDEwMDApLFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3N0b3BQYW5BbmltYXRpb24nLCB0aGlzLmNhbmNlbFJlcXVlc3QsIHRoaXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNhbmNlbFJlcXVlc3QoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuYWpheFJlcXVlc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5hYm9ydCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0ID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFqYXhSZXF1ZXN0ID09PSBodHRwUmVxT2JqID8gdHJ1ZSA6IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXJ0VXBkYXRlVGltZXIobWlsbGlzZWNvbmRzKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudXBkYXRlVGltZXIpO1xyXG4gICAgICAgIHRoaXMuY2FuY2VsUmVxdWVzdCgpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICBtaWxsaXNlY29uZHMgfHwgMTAwMCxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHNldEltZ1JlcVVybChpbWdVcmwpIHtcclxuICAgICAgICB0aGlzLmltZ1JlcVVybCA9IGltZ1VybDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRSZXFUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xyXG4gICAgICAgIHRoaXMucmVxVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kSHR0cFJlcShyZXEpIHtcclxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuY2FuY2VsUmVxdWVzdCgpO1xyXG5cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwICYmIHRoaXMucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuaHR0cFJlcU9ubG9hZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Qub3BlbignUE9TVCcsIHRoaXMuaW1nUmVxVXJsLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoXHJcbiAgICAgICAgICAgICdDb250ZW50LXR5cGUnLFxyXG4gICAgICAgICAgICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0LnNlbmQocmVxKTtcclxuICAgIH1cclxuXHJcbiAgICBodHRwUmVxT25sb2FkKGh0dHBSZXFPYmopIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNDdXJyZW50UmVxKGh0dHBSZXFPYmopKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZSgnYWpheCBsb2FkJywgaHR0cFJlcU9iaik7XHJcblxyXG4gICAgICAgIHZhciBwYXJzZWRSZXMgPSBKU09OLnBhcnNlKGh0dHBSZXFPYmoucmVzcG9uc2VUZXh0KTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVUaGVJbWFnZShwYXJzZWRSZXMuaHJlZiwgaHR0cFJlcU9iaik7XHJcbiAgICB9XHJcblxyXG4gICAgY3JlYXRlVGhlSW1hZ2UoaW1nU3JjLCBodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgdmFyIG5ld01hcEltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgICAgIG5ld01hcEltZy5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnbG9hZCcsXHJcbiAgICAgICAgICAgIHRoaXMubWFwTG9hZEhhbmRsZXIuYmluZCh0aGlzLCBuZXdNYXBJbWcsIGh0dHBSZXFPYmopLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbmV3TWFwSW1nLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdlcnJvcicsXHJcbiAgICAgICAgICAgIHRoaXMubWFwRXJyb3JIYW5kbGVyLmJpbmQodGhpcywgbmV3TWFwSW1nLCBodHRwUmVxT2JqKSxcclxuICAgICAgICApO1xyXG4gICAgICAgIG5ld01hcEltZy5zcmMgPSBpbWdTcmM7XHJcbiAgICAgICAgbmV3TWFwSW1nLnN0eWxlLnpJbmRleCA9ICcxJztcclxuICAgICAgICBuZXdNYXBJbWcuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xyXG4gICAgICAgIG5ld01hcEltZy5zdHlsZS5pbWFnZVJlbmRlcmluZyA9ICdwaXhlbGF0ZWQnOyAvLyBUT0RPOiBUZXN0IG9mIG5ldyBjc3MgZmVhdHVyZSBpbiBjaHJvbWUuXHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICB2YXIgb2JqID0ge1xyXG4gICAgICAgICAgICAuLi50aGlzLm1hcC5leHRlbnQudmlzaWJsZSxcclxuICAgICAgICAgICAgd2lkdGg6IHRoaXMubWFwLm1hcENvbnRhaW5lci53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLm1hcC5tYXBDb250YWluZXIuaGVpZ2h0LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciByZXEgPSBlbmNvZGVVUkkoXHJcbiAgICAgICAgICAgIHRoaXMucmVxVGVtcGxhdGUucmVwbGFjZSgvXFwkeyguKz8pfS9nLCBmdW5jdGlvbihhLCBtYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9ialttYXRjaF07XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgLy9gYmJveD0ke3NwQ29vcmRzLnh9LCR7c3BDb29yZHMueX0sJHtzcENvb3Jkcy5YfSwke3NwQ29vcmRzLll9JmJib3hTUj0xMDI3NDgmbGF5ZXJzPXNob3c6NCZsYXllckRlZnM9JnNpemU9JHt6ZWVNYXAubWFwQ29udGFpbmVyLndpZHRofSwke3plZU1hcC5tYXBDb250YWluZXJcclxuICAgICAgICAvLyAgICAuaGVpZ2h0fSZpbWFnZVNSPTEwMjc0OCZmb3JtYXQ9cG5nOCZ0cmFuc3BhcmVudD10cnVlJmRwaT0mdGltZT0mbGF5ZXJUaW1lT3B0aW9ucz0mZHluYW1pY0xheWVycz0mZ2RiVmVyc2lvbj0mbWFwU2NhbGU9JmY9cGpzb25gXHJcbiAgICAgICAgdGhpcy5zZW5kSHR0cFJlcShyZXEpO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lcigpIHtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcExvYWRIYW5kbGVyKG1hcEltZywgaHR0cFJlcU9iaikge1xyXG4gICAgICAgIGlmICghdGhpcy5pc0N1cnJlbnRSZXEoaHR0cFJlcU9iaikpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fX3pvb20gPSB0aGlzLm1hcC56b29tO1xyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHt9O1xyXG5cclxuICAgICAgICB0aGlzLnN3YXBDb250YWluZXIobWFwSW1nLCAwIC8qbWlsbGlzZWNvbmRzKi8pO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoJ21hcCBpbWcgbG9hZCcsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIG1hcEVycm9ySGFuZGxlcihtYXBJbWcsIGh0dHBSZXFPYmopIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMsIG1hcEltZywgaHR0cFJlcU9iaik7XHJcbiAgICAgICAgdGhpcy5maXJlKCdtYXAgaW1nIGVycm9yJywgaHR0cFJlcU9iaik7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21Jbk91dChldnQsIHpvb21EaXJlY3Rpb24pIHtcclxuICAgICAgICBsZXQgek9iaiA9IHRoaXMuem9vbU9iajtcclxuICAgICAgICBsZXQgc2NhbGUgPSB0aGlzLmdldFNjYWxlKHpvb21EaXJlY3Rpb24sIGV2dC56b29tRGVsdGEpO1xyXG4gICAgICAgIHpPYmouc2NhbGUgKj0gc2NhbGU7XHJcblxyXG4gICAgICAgIGxldCBuZXdQb2ludCA9IHtcclxuICAgICAgICAgICAgeDogZXZ0LnggLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQgKyB6T2JqLngsIC8vIFRoaXMgd2lsbCBzZXQgdGhlIG9yaWdpbiB0byAxLzIgdGhlIGNlbnRlcjogLSB0aGlzLm1hcC5tYXBDb250YWluZXIud2lkdGggLyAyO1xyXG4gICAgICAgICAgICB5OiBldnQueSAtIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wICsgek9iai55LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHpPYmoueCA9IHpPYmoueCArICh6T2JqLnggLSAobmV3UG9pbnQueCAtIHpPYmoueCkpICogKHNjYWxlIC0gMSk7XHJcbiAgICAgICAgek9iai55ID0gek9iai55ICsgKHpPYmoueSAtIChuZXdQb2ludC55IC0gek9iai55KSkgKiAoc2NhbGUgLSAxKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICAgICAgYHRyYW5zbGF0ZTNkKCR7IHpPYmoueCB9cHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7IHpPYmoueSB9cHgsIDBweClcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUzZCgkeyB6T2JqLnNjYWxlIH0sICR7IHpPYmouc2NhbGUgfSwgMSlcclxuICAgICAgICAgICAgICAgICAgICBgO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoJ3pvb20gZW5kJywgZXZ0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtBcmNSZW5kZXJMYXllcn0gZnJvbSAnLi9BcmNSZW5kZXJMYXllcl9jbGFzcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJjWE1MTGF5ZXIgZXh0ZW5kcyBBcmNSZW5kZXJMYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbWdVcmwsIHpJbmRleCwgQXJjWE1MX21vZHVsZSwgaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICBzdXBlcihpbWdVcmwsIG51bGwsIHpJbmRleCwgaGlkZUR1cmluZ1pvb20pO1xyXG5cclxuICAgICAgICB0aGlzLm9uKCdhcHBlbmRlZCB0byBtYXAnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubWFrZUFyY1hNTCA9IEFyY1hNTF9tb2R1bGUodGhpcy5tYXApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgZXh0ZW50ID0gdGhpcy5tYXAuZXh0ZW50LnZpc2libGU7XHJcbiAgICAgICAgbGV0IHhtbCA9IHRoaXMubWFrZUFyY1hNTC5tYWtlQXJjWE1MUmVxdWVzdChcclxuICAgICAgICAgICAgZXh0ZW50LngsXHJcbiAgICAgICAgICAgIGV4dGVudC5YLFxyXG4gICAgICAgICAgICBleHRlbnQueSxcclxuICAgICAgICAgICAgZXh0ZW50LlksXHJcbiAgICAgICAgKTtcclxuICAgICAgICBsZXQgcmVxID1cclxuICAgICAgICAgICAgd2luZG93LmVuY29kZVVSSUNvbXBvbmVudCgnQXJjWE1MUmVxdWVzdCcpICtcclxuICAgICAgICAgICAgJz0nICtcclxuICAgICAgICAgICAgd2luZG93LmVuY29kZVVSSUNvbXBvbmVudCh4bWwpO1xyXG4gICAgICAgIHRoaXMuc2VuZEh0dHBSZXEocmVxKTtcclxuICAgIH1cclxuXHJcbiAgICBodHRwUmVxT25sb2FkKGh0dHBSZXFPYmopIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNDdXJyZW50UmVxKGh0dHBSZXFPYmopKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB4bWwgPSAvPFxcP3htbC4qPi8uZXhlYyhodHRwUmVxT2JqLnJlc3BvbnNlVGV4dClbMF07XHJcbiAgICAgICAgbGV0IHBhcnNlZFJlcyA9IG5ldyBET01QYXJzZXIoKS5wYXJzZUZyb21TdHJpbmcoeG1sLCAnYXBwbGljYXRpb24veG1sJyk7XHJcbiAgICAgICAgbGV0IG91dHB1dCA9IHBhcnNlZFJlcy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnT1VUUFVUJyk7XHJcbiAgICAgICAgbGV0IGhyZWYgPSBvdXRwdXRbMF0uZ2V0QXR0cmlidXRlKCd1cmwnKTtcclxuXHJcbiAgICAgICAgdGhpcy5jcmVhdGVUaGVJbWFnZShocmVmLCBodHRwUmVxT2JqKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdvb2dsZVRvU3RhdGUobGF0LCBsb24pIHtcclxuICAgIC8vIHRoaXMgY29udmVydHMgZ29vZ2xlJ3MgeCx5IGNvb3JkaW5hdGVzIHRvIHN0YXRlIHBsYW5lIGNvb3JkaW5hdGVzIHVzZWQgYnkgdGhlIGdvdmVybm1lbnQuXHJcbiAgICAvLyBGb3Igc25vaG9taXNoIGNvdW50eSBvbmx5LlxyXG4gICAgbGV0IG1hdGggPSBNYXRoLFxyXG4gICAgICAgIHQgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgcmhvID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHRoZXRhID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHggPSB1bmRlZmluZWQsXHJcbiAgICAgICAgeSA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICBsYXQgPSBsYXQgKiAwLjAxNzQ1MzI5MjUyO1xyXG4gICAgbG9uID0gbG9uICogMC4wMTc0NTMyOTI1MjtcclxuICAgIHQgPVxyXG4gICAgICAgIG1hdGguc2luKDAuNzg1Mzk4MTYzMzk3NDQ4MyAtIGxhdCAvIDIpIC9cclxuICAgICAgICBtYXRoLmNvcygwLjc4NTM5ODE2MzM5NzQ0ODMgLSBsYXQgLyAyKTtcclxuICAgIHQgPVxyXG4gICAgICAgIHQgL1xyXG4gICAgICAgIG1hdGgucG93KFxyXG4gICAgICAgICAgICAoMSAtIDAuMDgyMjcxODU0ICogbWF0aC5zaW4obGF0KSkgL1xyXG4gICAgICAgICAgICAgICAgKDEgKyAwLjA4MjI3MTg1NCAqIG1hdGguc2luKGxhdCkpLFxyXG4gICAgICAgICAgICAwLjA0MTEzNTkyNyxcclxuICAgICAgICApO1xyXG4gICAgKHJobyA9IDYzNzgyMDYuNCAqIDEuODI5NzE0Mzg1MjA2MTc1NSAqIG1hdGgucG93KHQsIDAuNzQ0NTIwMzI4NDUyOTM0MykpLFxyXG4gICAgICAgICh0aGV0YSA9IDAuNzQ0NTIwMzI4NDUyOTM0MyAqIChsb24gLSAtMi4xMDg4ODEzMzUxOTE2KSksXHJcbiAgICAgICAgKHggPSByaG8gKiBtYXRoLnNpbih0aGV0YSkgKyA0OTk5OTguOTg0MTAxNjMyNSksXHJcbiAgICAgICAgKHkgPSA1ODUzOTU4Ljk2Mzk2NzU1MiAtIHJobyAqIG1hdGguY29zKHRoZXRhKSk7IC8vIG1lcyBhZGQgeTAgP1xyXG4gICAgeCA9IHggKiAzLjI4MDg0O1xyXG4gICAgeSA9IHkgKiAzLjI4MDg0O1xyXG4gICAgcmV0dXJuIFt5LCB4XTtcclxufVxyXG4iLCJpbXBvcnQge0Jhc2ljTGF5ZXJ9IGZyb20gJy4vQmFzaWNMYXllcl9jbGFzcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzZVRpbGVMYXllciBleHRlbmRzIEJhc2ljTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc3JjLCB6SW5kZXgpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX196b29tID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbGVTcmMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGlsZVNpemUgPSAyNTY7XHJcbiAgICAgICAgdGhpcy50aWxlc0NhY2hlID0ge307XHJcbiAgICAgICAgdGhpcy50aWxlSW5mbyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50aWxlTG9hZE9yZGVyID0gW107XHJcbiAgICAgICAgdGhpcy5kZWxUaWxlc1RpbWVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmx2bExvYWRUaW1lID0ge3N0YXJ0OiAwLCBmaW5pc2g6IDF9O1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzID0ge3g6IDAsIHk6IDB9O1xyXG4gICAgICAgIHRoaXMubWFrZVRpbGUgPSBtYWtlVGlsZTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRaaW5kZXgoekluZGV4KTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRUaWxlU3JjKHNyYyk7XHJcblxyXG4gICAgICAgIHRoaXMub24oJ2FkZCBldmVudCBsaXN0ZW5lcnMnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24oJ2FwcGVuZGVkIHRvIG1hcCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFrZVRpbGVHcmlkKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb21FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uKCd1cGRhdGUgZXZlcnl0aGluZycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFrZVRpbGVHcmlkKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VGlsZXMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dhcENvbnRhaW5lcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tRW5kKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMub24oJ3pvb20gZGVsYXkgZW5kJywgdGhpcy56b29tRW5kLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbigncHJlIHpvb20gZW5kJywgKCkgPT4gdGhpcy5zd2FwQ29udGFpbmVyKCksIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm9uKCdwb3N0IHpvb20gZW5kJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFRpbGVzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKFxyXG4gICAgICAgICAgICAgICAgJ3BhbicsXHJcbiAgICAgICAgICAgICAgICBlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGUuY2xpZW50WCArIGUuY2xpZW50WSkgJSA3ID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IEJldHRlciB0aHJvdHRsaW5nLCB0aGlzIHdhcyBqdXN0IGEgdGhvdWdodCBleHBlcmltZW50LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbigncGFuIGluaXRpYWwnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tVGltZXIpO1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVsVGlsZXNUaW1lcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbigncGFuIGVuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fX3pvb20gIT09IHRoaXMubWFwLnpvb20pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnpvb21FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuZGVsVGlsZXNUaW1lciA9IHNldFRpbWVvdXQoXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhckhpZGRlblRpbGVzLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICAgICAgMTEwMCxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVJbmZvKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBcIlRoZSBtZXRob2QgJ2dldFRpbGVJbmZvJyBpbiBcIiArXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgK1xyXG4gICAgICAgICAgICAgICAgXCIgd2Fzbid0IGltcGxpbWVudGVkXCIsXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgKTtcclxuICAgICAgICByZXR1cm4gJ092ZXJyaWRlIHRoaXMnO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVQeGxzKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBcIlRoZSBtZXRob2QgJ2dldFRpbGVQeGxzJyBpbiBcIiArXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgK1xyXG4gICAgICAgICAgICAgICAgXCIgd2Fzbid0IGltcGxpbWVudGVkXCIsXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgKTtcclxuICAgICAgICByZXR1cm4gJ092ZXJyaWRlIHRoaXMnO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFRpbGVTcmMoc3JjKSB7XHJcbiAgICAgICAgdGhpcy50aWxlU3JjID0gc3JjO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUNvbnRhaW5lcigpIHtcclxuICAgICAgICB0aGlzLm1ha2VUaWxlR3JpZCgpO1xyXG4gICAgICAgIHRoaXMuc3dhcENvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMucmVzZXRUaWxlcygpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXJIaWRkZW5UaWxlcygpIHtcclxuICAgICAgICAvLyBUT0RPOiBUaGlzIGlzIGhhY2ssIHRoaW5rIG9mIHNvbWV0aGluZyBiZXR0ZXIuXHJcbiAgICAgICAgbGV0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnRpbGVzQ2FjaGUpO1xyXG4gICAgICAgIGxldCBtYWluUmVjdCA9IHRoaXMubWFwLm1hcENvbnRhaW5lci5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIG1haW5SZWN0LlggPSBtYWluUmVjdC54ICsgbWFpblJlY3Qud2lkdGg7XHJcbiAgICAgICAgbWFpblJlY3QuWSA9IG1haW5SZWN0LnkgKyBtYWluUmVjdC5oZWlnaHQ7XHJcblxyXG4gICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdGlsZSA9IHRoaXMudGlsZXNDYWNoZVtrZXldO1xyXG4gICAgICAgICAgICBsZXQgcmVjdCA9IHRpbGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRpbGUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBpZiAoIShyZWN0LnggPCBtYWluUmVjdC5YICYmIHJlY3QueCArIHJlY3Qud2lkdGggPiBtYWluUmVjdC54ICYmXHJcbiAgICAgICAgICAgICAgICByZWN0LnkgPCBtYWluUmVjdC5ZICYmIHJlY3QueSArIHJlY3QuaGVpZ2h0ID4gbWFpblJlY3QueSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB0aWxlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGlsZSk7XHJcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50aWxlc0NhY2hlW2tleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXNldFRpbGVzKCkge1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzID0gdGhpcy50b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKCk7XHJcblxyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnggPSBNYXRoLmZsb29yKFxyXG4gICAgICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54LFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueSA9IE1hdGguZmxvb3IoXHJcbiAgICAgICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnksXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy50aWxlc0NhY2hlID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZVRpbGVHcmlkKCkge1xyXG4gICAgICAgIGxldCBudW1UaWxlcyA9IHtcclxuICAgICAgICAgICAgeDogTWF0aC5jZWlsKHRoaXMubWFwLm1hcENvbnRhaW5lci53aWR0aCAvIHRoaXMudGlsZVNpemUpICsgMSxcclxuICAgICAgICAgICAgeTogTWF0aC5jZWlsKHRoaXMubWFwLm1hcENvbnRhaW5lci5oZWlnaHQgLyB0aGlzLnRpbGVTaXplKSArIDEsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IGFyeSA9IFtdO1xyXG4gICAgICAgIGxldCB2cnkgPSBbXTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gbnVtVGlsZXMueDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDw9IG51bVRpbGVzLnk7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgYXJ5LnB1c2goe3g6IHgsIHk6IHl9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPD0gbnVtVGlsZXMueDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSAwOyB5IDw9IG51bVRpbGVzLnk7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHkgJSAyID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdnJ5LnB1c2goYXJ5LnNwbGljZSgwLCAxKVswXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2cnkucHVzaChhcnkuc3BsaWNlKC0xLCAxKVswXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudGlsZUxvYWRPcmRlciA9IHZyeTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICBsZXQgZ3JpZENlbnRlciA9IHtcclxuICAgICAgICAgICAgeDogbnVtVGlsZXMueCAvIDIsXHJcbiAgICAgICAgICAgIHk6IG51bVRpbGVzLnkgLyAyXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgdGhpcy50aWxlTG9hZE9yZGVyID0gYXJ5LnNvcnQoKGEsYikgPT4ge1xyXG4gICAgICAgICAgICAvLyBDb3B5IGxlYWZsZXRzIGlkZWEgYW5kIGhhdmUgdGhlIHRpbGVzIHN0YXJ0IGxvYWRpbmcgZnJvbSB0aGUgY2VudGVyLi5cclxuICAgICAgICAgICAgbGV0IGRpc3RBID0gTWF0aC5zcXJ0KChncmlkQ2VudGVyLnggLSBhLngpKioyICsgKGdyaWRDZW50ZXIueSAtIGEueSkqKjIpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdEIgPSBNYXRoLnNxcnQoKGdyaWRDZW50ZXIueCAtIGIueCkqKjIgKyAoZ3JpZENlbnRlci55IC0gYi55KSoqMik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZGlzdEIgLSBkaXN0QTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAqL1xyXG4gICAgfVxyXG5cclxuICAgIGNhbGNMdmxMb2FkVGltZSgpIHtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKCh0aGlzLmx2bExvYWRUaW1lLmZpbmlzaCAtIHRoaXMudGlsZVN0YXJ0KSlcclxuICAgICAgICByZXR1cm4gdGhpcy5sdmxMb2FkVGltZS5maW5pc2ggLSB0aGlzLmx2bExvYWRUaW1lLnN0YXJ0IHx8IDA7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBzcmNPYmogPSB7J3t6fSc6IHRoaXMuX196b29tLCAne3l9JzogbnVsbCwgJ3t4fSc6IG51bGx9O1xyXG4gICAgICAgIGxldCBzcmNYWVN0cmluZyA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcbiAgICAgICAgbGV0IHRpbGVJbWcgPSBudWxsO1xyXG4gICAgICAgIGxldCB0aWxlWCA9IHVuZGVmaW5lZDtcclxuICAgICAgICBsZXQgdGlsZVkgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIHRoaXMudGlsZVN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbGV0IGV4dGVudCA9ICh0aGlzLnpvb21JbmRleCAmJiB0aGlzLnpvb21JbmRleFt0aGlzLl9fem9vbV0gJiZcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbUluZGV4W3RoaXMuX196b29tXS5leHRlbnQpIHx8IHt9O1xyXG5cclxuICAgICAgICBsZXQgcGFuTGVmdCA9IHRoaXMuY29udGFpbmVyLmxlZnQgKyB0aGlzLm1hcC5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICAgICAgbGV0IHBhblRvcCA9IHRoaXMuY29udGFpbmVyLnRvcCArIHRoaXMubWFwLm1haW5Db250YWluZXIudG9wO1xyXG5cclxuICAgICAgICBsZXQgdG9wTGVmdFRpbGUgPSB7XHJcbiAgICAgICAgICAgIHg6IE1hdGguZmxvb3IoXHJcbiAgICAgICAgICAgICAgICAodGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueCAtIHBhbkxlZnQpIC8gdGhpcy50aWxlU2l6ZSxcclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcihcclxuICAgICAgICAgICAgICAgICh0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55IC0gcGFuVG9wKSAvIHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IHRvcExlZnRUaWxlUHhscyA9IHtcclxuICAgICAgICAgICAgeDogdG9wTGVmdFRpbGUueCAqIHRoaXMudGlsZVNpemUgLSB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54LFxyXG4gICAgICAgICAgICB5OiB0b3BMZWZ0VGlsZS55ICogdGhpcy50aWxlU2l6ZSAtIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbSA9IDA7IG0gPCB0aGlzLnRpbGVMb2FkT3JkZXIubGVuZ3RoOyBtKyspIHtcclxuICAgICAgICAgICAgc3JjT2JqWyd7eH0nXSA9IHRvcExlZnRUaWxlLnggKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueDtcclxuICAgICAgICAgICAgc3JjT2JqWyd7eX0nXSA9IHRvcExlZnRUaWxlLnkgKyB0aGlzLnRpbGVMb2FkT3JkZXJbbV0ueTtcclxuXHJcbiAgICAgICAgICAgIHNyY1hZU3RyaW5nID0gc3JjT2JqWyd7eH0nXSArICcsJyArIHNyY09ialsne3l9J107XHJcblxyXG4gICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKHRoaXMudGlsZXNDYWNoZVtzcmNYWVN0cmluZ10gfHxcclxuICAgICAgICAgICAgICAgIChzcmNPYmpbXCJ7eH1cIl0gPCBleHRlbnQueCB8fCBzcmNPYmpbXCJ7eH1cIl0gPiBleHRlbnQuWCB8fFxyXG4gICAgICAgICAgICAgICAgIHNyY09ialtcInt5fVwiXSA+IGV4dGVudC5ZIHx8IHNyY09ialtcInt5fVwiXSA8IGV4dGVudC55KSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aWxlWCA9IHRvcExlZnRUaWxlUHhscy54ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLnggKiB0aGlzLnRpbGVTaXplO1xyXG4gICAgICAgICAgICB0aWxlWSA9IHRvcExlZnRUaWxlUHhscy55ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLnkgKiB0aGlzLnRpbGVTaXplO1xyXG5cclxuICAgICAgICAgICAgdGlsZUltZyA9IHRoaXMubWFrZVRpbGUoe1xyXG4gICAgICAgICAgICAgICAgeDogdGlsZVgsXHJcbiAgICAgICAgICAgICAgICB5OiB0aWxlWSxcclxuICAgICAgICAgICAgICAgIHNyYzogdGhpcy50aWxlU3JjLnJlcGxhY2UoL3sufS9nLCBhcmcgPT4gc3JjT2JqW2FyZ10pLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudGlsZXNDYWNoZVtzcmNYWVN0cmluZ10gPSB0aWxlSW1nO1xyXG5cclxuICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGlsZUltZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gbWFrZVRpbGUob2JqKSB7XHJcbiAgICBsZXQgdGlsZUltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgdGlsZUltZy5jbGFzc05hbWUgPSAndGlsZUltZyc7XHJcbiAgICAvL3RpbGVJbWcuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246IGFic29sdXRlOyB0b3A6IFwiICsgdGlsZVkgKyBcInB4OyBsZWZ0OiBcIiArIHRpbGVYICsgXCJweDsgb3BhY2l0eTogMDtcIjtcclxuICAgIHRpbGVJbWcuc3R5bGUuY3NzVGV4dCA9ICdwb3NpdGlvbjogYWJzb2x1dGU7IG9wYWNpdHk6IDA7JztcclxuICAgIHRpbGVJbWcuc3R5bGUudHJhbnNmb3JtID1cclxuICAgICAgICAndHJhbnNsYXRlM2QoJyArIG9iai54ICsgJ3B4LCcgKyBvYmoueSArICdweCwgMHB4KSc7XHJcbiAgICAvL3RpbGVJbWcuc3R5bGUuYm94U2hhZG93ID0gXCIwcHggMHB4IDBweCAxcHggcmVkXCI7XHJcbiAgICB0aWxlSW1nLm9ubG9hZCA9IG1ha2VUaWxlT25Mb2FkO1xyXG4gICAgdGlsZUltZy5vbmVycm9yID0gbWFrZVRpbGVPbkVycm9yO1xyXG4gICAgdGlsZUltZy5zcmMgPSBvYmouc3JjO1xyXG5cclxuICAgIHJldHVybiB0aWxlSW1nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlVGlsZU9uTG9hZChlKSB7XHJcbiAgICB0aGlzLmxvYWRlZCA9IHRydWU7XHJcbiAgICB0aGlzLnN0eWxlLm9wYWNpdHkgPSAxO1xyXG4gICAgLy8gX19fdGhhdC50aWxlRmluaXNoID0gRGF0ZS5ub3coKTtcclxuICAgIC8vIF9fX3RoYXQubWFwLmV2ZW50LmZpcmUoJ3RpbGUgbG9hZGVkJywgdGhpcyk7Ly8gVG9kbzogdGVzdGluZyB0aGlzIGlkZWEuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ha2VUaWxlT25FcnJvcihlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdUaWxlIGRpZCBub3QgbG9hZCcsIGUpO1xyXG59XHJcbiIsImltcG9ydCB7QmFzZVRpbGVMYXllcn0gZnJvbSAnLi9CYXNlVGlsZUxheWVyX2NsYXNzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBcmNHSVNUaWxlTGF5ZXIgZXh0ZW5kcyBCYXNlVGlsZUxheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHNyYywgekluZGV4KSB7XHJcbiAgICAgICAgc3VwZXIoc3JjLCB6SW5kZXgpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVJbmZvKCkge1xyXG4gICAgICAgIC8vIE92ZXJyaWRlIHRoaXMgZm9yIFdTRzg0LlxyXG4gICAgICAgIGxldCB2aXMgPSB0aGlzLm1hcC5leHRlbnQudmlzaWJsZTtcclxuICAgICAgICBsZXQgY29ybmVyID0gdGhpcy5nZXRDb250YWluaW5nQXJjVGlsZUNvb3Jkcyh0aGlzLm1hcC56b29tLCB7XHJcbiAgICAgICAgICAgIHg6IHZpcy54LFxyXG4gICAgICAgICAgICB5OiB2aXMuWSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNvcm5lcjtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICByZXR1cm46XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJvdzogdW5kZWZpbmVkLCAvLyBUaWxlIG51bWJlciB4IGNvb3JkaW5hdGUuXHJcbiAgICAgICAgICAgICAgICBjb2w6IHVuZGVmaW5lZCwgLy8gVGlsZSBudW1iZXIgeSBjb29yZGluYXRlLlxyXG4gICAgICAgICAgICAgICAgc3BYOiB1bmRlZmluZWQsIC8vIFRpbGUgdG9wIGxlZnQgY29ybmVyIHggY29vcmQgaW4gZGVmYXVsdCBjb29yZGluYXRlIHN5c3RlbSAoc3RhdGUgcGxhbmUgb3IgV1NHODQgc2hlcmljYWwgbWVyY2F0b3IpXHJcbiAgICAgICAgICAgICAgICBzcFk6IHVuZGVmaW5lZCAgLy8gVGlsZSB0b3AgbGVmdCBjb3JuZXIgeSBjb29yZCBcIiBcIiBcIi5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICovXHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VGlsZVB4bHMocG9pbnQpIHtcclxuICAgICAgICAvLyBPdmVycmlkZSB0aGlzIGZvciBXU0c4NC5cclxuICAgICAgICByZXR1cm4gdGhpcy5tYXAuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludChwb2ludCk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0Q29udGFpbmluZ0FyY1RpbGVDb29yZHMoeiwgYikge1xyXG4gICAgICAgIGxldCBkID0ge3g6IC0xLjE3MTA0M2U4LCB5OiAxLjM3OTQ5OGU4fTsgLy8gVGhpcyBuZWVkcyB0byBiZSBjaGFuZ2VkLlxyXG4gICAgICAgIGxldCB6b29tSSA9IHRoaXMuem9vbUluZGV4W3pdO1xyXG5cclxuICAgICAgICBsZXQgY29sUm93ID0ge1xyXG4gICAgICAgICAgICByb3c6IE1hdGguZmxvb3IoKGQueSAtIGIueSkgLyAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pKSxcclxuICAgICAgICAgICAgY29sOiBNYXRoLmZsb29yKChiLnggLSBkLngpIC8gKHRoaXMudGlsZVNpemUgKiB6b29tSS5yZXNvbHV0aW9uKSksXHJcbiAgICAgICAgICAgIHNwWDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBzcFk6IHVuZGVmaW5lZCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb2xSb3cuc3BYID0gY29sUm93LmNvbCAqICh0aGlzLnRpbGVTaXplICogem9vbUkucmVzb2x1dGlvbikgKyBkLng7XHJcbiAgICAgICAgY29sUm93LnNwWSA9IGQueSAtIGNvbFJvdy5yb3cgKiAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pO1xyXG4gICAgICAgIC8vY29sUm93LnBlcmNlbnRYID0gY29sUm93LmNvbCAtIChiLnggLSBkLngpIC8gKHRoaXMudGlsZVNpemUgKiB6b29tSS5SZXNvbHV0aW9uKTtcclxuICAgICAgICAvL2NvbFJvdy5wZXJjZW50WSA9IGNvbFJvdy5yb3cgLSAoZC55IC0gYi55KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkuUmVzb2x1dGlvbik7XHJcblxyXG4gICAgICAgIHJldHVybiBjb2xSb3c7XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtCYXNlVGlsZUxheWVyfSBmcm9tICcuL0Jhc2VUaWxlTGF5ZXJfY2xhc3MnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNwaGVyaWNhbE1lcmNhdG9yVGlsZUxheWVyIGV4dGVuZHMgQmFzZVRpbGVMYXllciB7XHJcbiAgICAvLyBodHRwczovL2pzYmluLmNvbS9qZWhhdGlwYWd1LzYvZWRpdD9odG1sLGNzcyxqcyxvdXRwdXRcclxuICAgIGNvbnN0cnVjdG9yKHNyYywgekluZGV4KSB7XHJcbiAgICAgICAgc3VwZXIoc3JjLCB6SW5kZXgpO1xyXG4gICAgICAgIHRoaXMuYm91bmQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7IC8vIE1hdGguUEkgKiByYWRpdXMgb2YgZWFydGhcclxuICAgIH1cclxuXHJcbiAgICB0b3BMZWZ0T2ZWaXNpYmxlRXh0ZW50VG9QeGxzKG9wdF96b29tKSB7XHJcbiAgICAgICAgLy8gUmV0dXJucyB0b3AgbGVmdCBvZiB0aWxlIGluIHNjcmVlbiBwaXhlbCBjb29yZHMsIHNvIHRoYXQgaXQgY2FuIGJlIHNlZW4gb24gdGhlIG1vbml0b3IuXHJcbiAgICAgICAgbGV0IHZpcyA9IHRoaXMubWFwLmV4dGVudC52aXNpYmxlO1xyXG4gICAgICAgIGxldCB2aXNQb2ludCA9IHt4OiB2aXMueCwgeTogdmlzLll9O1xyXG4gICAgICAgIGxldCBjb250YWluZXJDb3JuZXIgPSB0aGlzLmdldFB4bHNGcm9tVG9wTGVmdE9yaWdpbih2aXNQb2ludCwgb3B0X3pvb20pO1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJzZmRcIiwgY29udGFpbmVyQ29ybmVyKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IGNvbnRhaW5lckNvcm5lci54LFxyXG4gICAgICAgICAgICB5OiBjb250YWluZXJDb3JuZXIueSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGdldFB4bHNGcm9tVG9wTGVmdE9yaWdpbihzbVBvaW50LCBvcHRfem9vbSkge1xyXG4gICAgICAgIC8vIFJldHVybnMgcGl4ZWxzIGZyb20gMCwwIHRpbGUgb3JpZ2luIGFrYSB0aGUgdG9wIGxlZnQgb2YgdGhlIHdvcmxkLlxyXG4gICAgICAgIGxldCBib3VuZCA9IDIwMDM3NTA4LjM0Mjc4OTI0NDtcclxuICAgICAgICBsZXQgcGl4ZWxzID1cclxuICAgICAgICAgICAgKHRoaXMudGlsZVNpemUgKiBNYXRoLnBvdygyLCBvcHRfem9vbSB8fCB0aGlzLm1hcC56b29tKSkgLyAyO1xyXG5cclxuICAgICAgICB2YXIgcG9pbnRYUmF0aW8gPSBzbVBvaW50LnggLyAtYm91bmQ7XHJcbiAgICAgICAgdmFyIHBvaW50WVJhdGlvID0gc21Qb2ludC55IC8gYm91bmQ7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IHBpeGVscyAqICgxIC0gcG9pbnRYUmF0aW8pLFxyXG4gICAgICAgICAgICB5OiBwaXhlbHMgKiAoMSAtIHBvaW50WVJhdGlvKSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBUcmFuc2Zvcm1hdGlvbihhLCBiLCBjLCBkKSB7XHJcbiAgICAvLyBUcmFuc2Zvcm1hdGlvbiBjb25zdHJ1Y3RvciBjb3BpZWQgZnJvbSBMZWFmbGV0LmpzXHJcblxyXG4gICAgLy8gaWYgKFV0aWwuaXNBcnJheShhKSkge1xyXG4gICAgLy8gICAgIC8vIHVzZSBhcnJheSBwcm9wZXJ0aWVzXHJcbiAgICAvLyAgICAgdGhpcy5fYSA9IGFbMF07XHJcbiAgICAvLyAgICAgdGhpcy5fYiA9IGFbMV07XHJcbiAgICAvLyAgICAgdGhpcy5fYyA9IGFbMl07XHJcbiAgICAvLyAgICAgdGhpcy5fZCA9IGFbM107XHJcbiAgICAvLyAgICAgcmV0dXJuO1xyXG4gICAgLy8gfVxyXG4gICAgdGhpcy5fYSA9IGE7XHJcbiAgICB0aGlzLl9iID0gYjtcclxuICAgIHRoaXMuX2MgPSBjO1xyXG4gICAgdGhpcy5fZCA9IGQ7XHJcbn1cclxuXHJcblRyYW5zZm9ybWF0aW9uLnByb3RvdHlwZSA9IHtcclxuICAgIC8vIEBtZXRob2QgdHJhbnNmb3JtKHBvaW50OiBQb2ludCwgc2NhbGU/OiBOdW1iZXIpOiBQb2ludFxyXG4gICAgLy8gUmV0dXJucyBhIHRyYW5zZm9ybWVkIHBvaW50LCBvcHRpb25hbGx5IG11bHRpcGxpZWQgYnkgdGhlIGdpdmVuIHNjYWxlLlxyXG4gICAgLy8gT25seSBhY2NlcHRzIGFjdHVhbCBgTC5Qb2ludGAgaW5zdGFuY2VzLCBub3QgYXJyYXlzLlxyXG4gICAgdHJhbnNmb3JtOiBmdW5jdGlvbihwb2ludCwgc2NhbGUpIHtcclxuICAgICAgICAvLyAoUG9pbnQsIE51bWJlcikgLT4gUG9pbnRcclxuICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtKHBvaW50LmNsb25lKCksIHNjYWxlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gZGVzdHJ1Y3RpdmUgdHJhbnNmb3JtIChmYXN0ZXIpXHJcbiAgICBfdHJhbnNmb3JtOiBmdW5jdGlvbihwb2ludCwgc2NhbGUpIHtcclxuICAgICAgICBzY2FsZSA9IHNjYWxlIHx8IDE7XHJcbiAgICAgICAgcG9pbnQueCA9IHNjYWxlICogKHRoaXMuX2EgKiBwb2ludC54ICsgdGhpcy5fYik7XHJcbiAgICAgICAgcG9pbnQueSA9IHNjYWxlICogKHRoaXMuX2MgKiBwb2ludC55ICsgdGhpcy5fZCk7XHJcbiAgICAgICAgcmV0dXJuIHBvaW50O1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBAbWV0aG9kIHVudHJhbnNmb3JtKHBvaW50OiBQb2ludCwgc2NhbGU/OiBOdW1iZXIpOiBQb2ludFxyXG4gICAgLy8gUmV0dXJucyB0aGUgcmV2ZXJzZSB0cmFuc2Zvcm1hdGlvbiBvZiB0aGUgZ2l2ZW4gcG9pbnQsIG9wdGlvbmFsbHkgZGl2aWRlZFxyXG4gICAgLy8gYnkgdGhlIGdpdmVuIHNjYWxlLiBPbmx5IGFjY2VwdHMgYWN0dWFsIGBMLlBvaW50YCBpbnN0YW5jZXMsIG5vdCBhcnJheXMuXHJcbiAgICB1bnRyYW5zZm9ybTogZnVuY3Rpb24ocG9pbnQsIHNjYWxlKSB7XHJcbiAgICAgICAgc2NhbGUgPSBzY2FsZSB8fCAxO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IChwb2ludC54IC8gc2NhbGUgLSB0aGlzLl9iKSAvIHRoaXMuX2EsXHJcbiAgICAgICAgICAgIHk6IChwb2ludC55IC8gc2NhbGUgLSB0aGlzLl9kKSAvIHRoaXMuX2MsXHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcbn07XHJcblxyXG5leHBvcnQgbGV0IHRyYW5zZm9ybWF0aW9uID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHNjYWxlID0gMC41IC8gKE1hdGguUEkgKiA2Mzc4MTM3KTtcclxuICAgIC8vY29uc29sZS5sb2cobmV3IFRyYW5zZm9ybWF0aW9uKHNjYWxlLCAwLjUsIC1zY2FsZSwgMC41KSlcclxuICAgIHJldHVybiBuZXcgVHJhbnNmb3JtYXRpb24oc2NhbGUsIDAuNSwgLXNjYWxlLCAwLjUpO1xyXG59KSgpO1xyXG4iLCJpbXBvcnQge05ld01hcH0gZnJvbSAnLi9NYWluX2NsYXNzJztcclxuaW1wb3J0IHt0cmFuc2Zvcm1hdGlvbn0gZnJvbSAnLi9sYXllcnMvU3BoZXJpY2FsTWVyY2F0b3JUaWxlTGF5ZXJfY2xhc3MuanMnO1xyXG5cclxuT2JqZWN0LmFzc2lnbihOZXdNYXAucHJvdG90eXBlLCB7XHJcbiAgICB0b1BvaW50LFxyXG4gICAgY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludCxcclxuICAgIGNvbnZlcnRQcm9qUG9pbnRUb09mZnNldFBpeGVsUG9pbnQsXHJcbiAgICBzY3JlZW5Qb2ludFRvUHJvamVjdGlvbixcclxuICAgIGNvbnZlcnRTUFRvV0dTODQsXHJcbiAgICBjb252ZXJ0V0dTODRQcm9qZWN0aW9uVG9XR1M4NExhdExvbixcclxuICAgIG1pbnV0ZXMsXHJcbiAgICB1cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZSxcclxuICAgIHVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeU9yaWdpbixcclxuICAgIHVwZGF0ZVZpc0V4dGVudEJ5T3JpZ2luQW5kUmVzb2x1dGlvbixcclxuICAgIGdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcixcclxuICAgIGdldFBhbk9mZnNldFBvaW50LFxyXG4gICAgZGlzdGFuY2VCZXR3ZWVuLFxyXG4gICAgY29udmVydFNQVG9XR1M4NFByb2osXHJcbiAgICBnZXRSZXNvbHV0aW9uLFxyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0b1BvaW50KHgsIHkpIHtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KHgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogeFswXSxcclxuICAgICAgICAgICAgeTogeFsxXSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgaWYgKHggPT09IE9iamVjdCh4KSkge1xyXG4gICAgICAgIC8vaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODUxMTI4MS9jaGVjay1pZi1hLXZhbHVlLWlzLWFuLW9iamVjdC1pbi1qYXZhc2NyaXB0XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogeC54IHx8IHguWCxcclxuICAgICAgICAgICAgeTogeC55IHx8IHguWSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiB4LFxyXG4gICAgICAgIHk6IHksXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50KHNwUG9pbnQpIHtcclxuICAgIHZhciB4UmF0aW8gPVxyXG4gICAgICAgICAgICB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAvXHJcbiAgICAgICAgICAgICh0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLngpLCAvLyBGb3IgcGF0aHMuXHJcbiAgICAgICAgeVJhdGlvID1cclxuICAgICAgICAgICAgdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0IC9cclxuICAgICAgICAgICAgKHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueSk7IC8vIEZvciBwYXRocy5cclxuICAgIC8vdmFyIHJlc29sdXRpb24gPSB0aGlzLnpvb21JbmRleFt0aGlzLnpvb21dLnJlc29sdXRpb247XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyh4UmF0aW8sIHJlc29sdXRpb24sIChzcFBvaW50LnggLSB0aGlzLmV4dGVudC52aXNpYmxlLngpICogeFJhdGlvKVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogKHNwUG9pbnQueCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCkgKiB4UmF0aW8sXHJcbiAgICAgICAgeTogKHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHNwUG9pbnQueSkgKiB5UmF0aW8sXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb252ZXJ0UHJvalBvaW50VG9PZmZzZXRQaXhlbFBvaW50KHBvaW50KSB7XHJcbiAgICB2YXIgc2NyZWVuUG9pbnQgPSB0aGlzLmNvbnZlcnRQcm9qUG9pbnRUb1BpeGVsUG9pbnQocG9pbnQpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgeDogc2NyZWVuUG9pbnQueCAtIHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHNjcmVlblBvaW50LnkgLSB0aGlzLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ocG9pbnQpIHtcclxuICAgIHZhciBzcFdpZHRoID0gdGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54O1xyXG4gICAgdmFyIHNwSGVpZ2h0ID0gdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55O1xyXG5cclxuICAgIHZhciBvcmlnaW5MUiA9IHBvaW50LnggLyB0aGlzLm1hcENvbnRhaW5lci53aWR0aDtcclxuICAgIHZhciBvcmlnaW5UQiA9IHBvaW50LnkgLyB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQ7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiB0aGlzLmV4dGVudC52aXNpYmxlLnggKyBzcFdpZHRoICogb3JpZ2luTFIsXHJcbiAgICAgICAgeTogdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gc3BIZWlnaHQgKiBvcmlnaW5UQixcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIENvbnZlcnQgc3RhdGUgcGxhbmUgY29vcmRpbmF0ZXMgdG8gd2dzIDg0IGNvb3JkaW5hdGVzLi4uSSdtIGd1ZXNzaW5nIGFueXdheSwgbm90IHN1cmUuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U1BUb1dHUzg0KHNwUG9pbnQpIHtcclxuICAgIHZhciB1WCA9IHNwUG9pbnQueCxcclxuICAgICAgICB1WSA9IHNwUG9pbnQueTtcclxuICAgIC8vIENvcGllZCBmcm9tIHNjb3BpISBIb3cgYWJvdXQgdGhhdCFcclxuICAgIHZhciBzcXJ0ID0gd2luZG93Lk1hdGguc3FydCxcclxuICAgICAgICBwb3cgPSB3aW5kb3cuTWF0aC5wb3csXHJcbiAgICAgICAgYXRhbiA9IHdpbmRvdy5NYXRoLmF0YW4sXHJcbiAgICAgICAgc2luID0gd2luZG93Lk1hdGguc2luLFxyXG4gICAgICAgIGFicyA9IHdpbmRvdy5NYXRoLmFicyxcclxuICAgICAgICBwYXJ0MSA9IHVuZGVmaW5lZCxcclxuICAgICAgICByaG8gPSB1bmRlZmluZWQsXHJcbiAgICAgICAgdGhldGEgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgdHh5ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIGxvbiA9IHVuZGVmaW5lZCxcclxuICAgICAgICBsYXQwID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIGxhdDEgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgTGF0ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIExvbiA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB1WCA9IHVYIC0gMTY0MDQxNi42NjY2NjY2Njc7XHJcbiAgICB1WSA9IHVZIC0gMDtcclxuICAgIHJobyA9IHNxcnQocG93KHVYLCAyKSArIHBvdygxOTIwNTMwOS45Njg4ODQ4NCAtIHVZLCAyKSk7XHJcbiAgICB0aGV0YSA9IGF0YW4odVggLyAoMTkyMDUzMDkuOTY4ODg0ODQgLSB1WSkpO1xyXG4gICAgdHh5ID0gcG93KHJobyAvICgyMDkyNTY0Ni4wICogMS44Mjk3NTIxMDg4ODI5Mjg1KSwgMSAvIDAuNzQ0NTIwMzI2NTU0MjkzOSk7XHJcbiAgICBsb24gPSB0aGV0YSAvIDAuNzQ0NTIwMzI2NTU0MjkzOSArIC0yLjEwODkzOTUxMjgzMzMzMjY7XHJcbiAgICB1WCA9IHVYICsgMTY0MDQxNi42NjY2NjY2Njc7XHJcbiAgICBsYXQwID0gMS41NzA3OTYzMjY3OTQ4OTY2IC0gMiAqIGF0YW4odHh5KTtcclxuICAgIHBhcnQxID0gKDEgLSAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKSAvICgxICsgMC4wODE4MTkwNTc4MiAqIHNpbihsYXQwKSk7XHJcbiAgICBsYXQxID0gMS41NzA3OTYzMjY3OTQ4OTY2IC0gMiAqIGF0YW4odHh5ICogcG93KHBhcnQxLCAwLjA4MTgxOTA1NzgyIC8gMikpO1xyXG4gICAgd2hpbGUgKGFicyhsYXQxIC0gbGF0MCkgPiAwLjAwMDAwMDAwMikge1xyXG4gICAgICAgIGxhdDAgPSBsYXQxO1xyXG4gICAgICAgIHBhcnQxID1cclxuICAgICAgICAgICAgKDEgLSAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKSAvICgxICsgMC4wODE4MTkwNTc4MiAqIHNpbihsYXQwKSk7XHJcbiAgICAgICAgbGF0MSA9XHJcbiAgICAgICAgICAgIDEuNTcwNzk2MzI2Nzk0ODk2NiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgMC4wODE4MTkwNTc4MiAvIDIpKTtcclxuICAgIH1cclxuICAgIExhdCA9IGxhdDEgLyAwLjAxNzQ1MzI5MjUyO1xyXG4gICAgTG9uID0gbG9uIC8gMC4wMTc0NTMyOTI1MjtcclxuICAgIHJldHVybiB7bGF0OiBMYXQsIGxuZzogTG9ufTtcclxufVxyXG5cclxuLypcclxuZnVuY3Rpb24gY29udmVydFNQKHVYLCB1WSkge1xyXG4gICAgLy8gQ29waWVkIGZyb20gU0NPUEkgZm9yIGZ1dHVyZSB1c2UuIEhhcyBub3QgYmVlbiBtb2RpZmllZCBmcm9tIFNDT1BJLlxyXG5cclxuICAgIC8vPTIwOTI1NjA0LjAwOyAgICAgICAgIC8vIG1ham9yIHJhZGl1cyBvZiBlbGxpcHNvaWQsIG1hcCB1bml0cyAoTkFEIDgzKSBpbiBmZWV0P1xyXG4gICAgYSA9IDIwOTI1NjQ2LjA7IC8vIHNlZSBodHRwOi8vZGJ3d3cuZXNzYy5wc3UuZWR1L2xhc2RvYy9vdmVydmlldy9nZW9tcmVnL2FwcGUuaHRtbFxyXG4gICAgLy89MjA5MjU2MDQuNDg7ICAgICAgICAgLy8gbW9yZSBhY2N1cmF0ZSA/XHJcbiAgICAvLz0yMDg1NTQ4Ni41OTsgICAgICAgICAvLyBtaW5vciByYWRpdXNcclxuICAgIGVjID0gMC4wODE4MTkwNTc4MjsgLy8gZWNjZW50cmljaXR5IG9mIGVsbGlwc29pZCAoTkFEIDgzKVxyXG4gICAgLy8gPSAwLjAwNjY5NDM0OTY7ICAgICAgLy8gc2VlIGh0dHA6Ly9kYnd3dy5lc3NjLnBzdS5lZHUvbGFzZG9jL292ZXJ2aWV3L2dlb21yZWcvYXBwZS5odG1sXHJcbiAgICBhbmdSYWQgPSAwLjAxNzQ1MzI5MjUyOyAvLyBudW1iZXIgb2YgcmFkaWFucyBpbiBhIGRlZ3JlZVxyXG4gICAgcGk0ID0gTWF0aC5QSSAvIDQ7XHJcbiAgICAvL0JvdWxkZXIgQ291bnR5LCBDT1xyXG4gICAgLy9wMCA9IDM5LjMzMzMzMyAqIGFuZ1JhZDsgIC8vIGxhdGl0dWRlIG9mIG9yaWdpblxyXG4gICAgLy9wMSA9IDM5LjcxNjY2NyAqIGFuZ1JhZDsgIC8vIGxhdGl0dWRlIG9mIGZpcnN0IHN0YW5kYXJkIHBhcmFsbGVsIChha2Egc3RhbmRhcmQgcGFyYWxsZWwtc291dGg/KVxyXG4gICAgLy9wMiA9IDQwLjc4MzMzMyAqIGFuZ1JhZDsgIC8vIGxhdGl0dWRlIG9mIHNlY29uZCBzdGFuZGFyZCBwYXJhbGxlbCAgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1ub3J0aD8pXHJcbiAgICAvL20wID0gLTEwNS41ICogYW5nUmFkOyAgICAgLy8gY2VudHJhbCBtZXJpZGlhbiAoYWthIGxvbmdpdHVkZSBvZiBvcmlnaW4pXHJcbiAgICAvL3gwID0gMzAwMDAwMC4wMDAwMDA7ICAgICAgLy8gZmFsc2UgZWFzdGluZyBvZiBjZW50cmFsIG1lcmlkaWFuLCBtYXAgdW5pdHNcclxuICAgIC8veTAgPSAxMDAwMDAwLjAwMDAwMDsgICAgICAvLyBmYWxzZSBub3J0aGluZ1xyXG4gICAgLy9Tbm9ob21pc2ggQ291bnR5LCBXQVxyXG4gICAgcDAgPSA0Ny4wICogYW5nUmFkOyAvLyBsYXRpdHVkZSBvZiBvcmlnaW5cclxuICAgIHAxID0gNDcuNSAqIGFuZ1JhZDsgLy8gbGF0aXR1ZGUgb2YgZmlyc3Qgc3RhbmRhcmQgcGFyYWxsZWwgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1zb3V0aD8pXHJcbiAgICBwMiA9IDQ4LjczMzMzMzMzMzMzMzMzICogYW5nUmFkOyAvLyBsYXRpdHVkZSBvZiBzZWNvbmQgc3RhbmRhcmQgcGFyYWxsZWwgIChha2Egc3RhbmRhcmQgcGFyYWxsZWwtbm9ydGg/KVxyXG4gICAgbTAgPSAtMTIwLjgzMzMzMzMzMzMzMzMgKiBhbmdSYWQ7IC8vIGNlbnRyYWwgbWVyaWRpYW4gKGFrYSBsb25naXR1ZGUgb2Ygb3JpZ2luKVxyXG4gICAgeDAgPSAxNjQwNDE2LjY2NjY2NjY2NzsgLy8gZmFsc2UgZWFzdGluZyBvZiBjZW50cmFsIG1lcmlkaWFuLCBtYXAgdW5pdHNcclxuICAgIHkwID0gMC4wOyAvLyBmYWxzZSBub3J0aGluZ1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSB0aGUgY29vcmRpbmF0ZSBzeXN0ZW0gY29uc3RhbnRzLlxyXG4gICAgd2l0aCAoTWF0aCkge1xyXG4gICAgICAgIG0xID0gY29zKHAxKSAvIHNxcnQoMSAtIHBvdyhlYywgMikgKiBwb3coc2luKHAxKSwgMikpO1xyXG4gICAgICAgIG0yID0gY29zKHAyKSAvIHNxcnQoMSAtIHBvdyhlYywgMikgKiBwb3coc2luKHAyKSwgMikpO1xyXG4gICAgICAgIHQwID0gdGFuKHBpNCAtIHAwIC8gMik7XHJcbiAgICAgICAgdDEgPSB0YW4ocGk0IC0gcDEgLyAyKTtcclxuICAgICAgICB0MiA9IHRhbihwaTQgLSBwMiAvIDIpO1xyXG4gICAgICAgIHQwID0gdDAgLyBwb3coKDEgLSBlYyAqIHNpbihwMCkpIC8gKDEgKyBlYyAqIHNpbihwMCkpLCBlYyAvIDIpO1xyXG4gICAgICAgIHQxID0gdDEgLyBwb3coKDEgLSBlYyAqIHNpbihwMSkpIC8gKDEgKyBlYyAqIHNpbihwMSkpLCBlYyAvIDIpO1xyXG4gICAgICAgIHQyID0gdDIgLyBwb3coKDEgLSBlYyAqIHNpbihwMikpIC8gKDEgKyBlYyAqIHNpbihwMikpLCBlYyAvIDIpO1xyXG4gICAgICAgIG4gPSBsb2cobTEgLyBtMikgLyBsb2codDEgLyB0Mik7XHJcbiAgICAgICAgZiA9IG0xIC8gKG4gKiBwb3codDEsIG4pKTtcclxuICAgICAgICByaG8wID0gYSAqIGYgKiBwb3codDAsIG4pO1xyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IHRoZSBjb29yZGluYXRlIHRvIExhdGl0dWRlL0xvbmdpdHVkZS5cclxuXHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBMb25naXR1ZGUuXHJcbiAgICAgICAgdVggPSB1WCAtIHgwO1xyXG4gICAgICAgIHVZID0gdVkgLSB5MDsgLy8gbWVzIGFkZGVkIGZhbHNlIG5vcnRoaW5nIGFwcGxpZXMgaW4gMDUwMSAoPylcclxuICAgICAgICBwaTIgPSBwaTQgKiAyO1xyXG5cclxuICAgICAgICByaG8gPSBzcXJ0KHBvdyh1WCwgMikgKyBwb3cocmhvMCAtIHVZLCAyKSk7XHJcbiAgICAgICAgdGhldGEgPSBhdGFuKHVYIC8gKHJobzAgLSB1WSkpO1xyXG4gICAgICAgIHR4eSA9IHBvdyhyaG8gLyAoYSAqIGYpLCAxIC8gbik7XHJcbiAgICAgICAgbG9uID0gdGhldGEgLyBuICsgbTA7XHJcbiAgICAgICAgdVggPSB1WCArIHgwO1xyXG5cclxuICAgICAgICAvLyBFc3RpbWF0ZSB0aGUgTGF0aXR1ZGVcclxuICAgICAgICBsYXQwID0gcGkyIC0gMiAqIGF0YW4odHh5KTtcclxuXHJcbiAgICAgICAgLy8gU3Vic3RpdHV0ZSB0aGUgZXN0aW1hdGUgaW50byB0aGUgaXRlcmF0aXZlIGNhbGN1bGF0aW9uIHRoYXRcclxuICAgICAgICAvLyBjb252ZXJnZXMgb24gdGhlIGNvcnJlY3QgTGF0aXR1ZGUgdmFsdWUuXHJcbiAgICAgICAgcGFydDEgPSAoMSAtIGVjICogc2luKGxhdDApKSAvICgxICsgZWMgKiBzaW4obGF0MCkpO1xyXG4gICAgICAgIGxhdDEgPSBwaTIgLSAyICogYXRhbih0eHkgKiBwb3cocGFydDEsIGVjIC8gMikpO1xyXG5cclxuICAgICAgICB3aGlsZSAoYWJzKGxhdDEgLSBsYXQwKSA+IDAuMDAwMDAwMDAyKSB7XHJcbiAgICAgICAgICAgIGxhdDAgPSBsYXQxO1xyXG4gICAgICAgICAgICBwYXJ0MSA9ICgxIC0gZWMgKiBzaW4obGF0MCkpIC8gKDEgKyBlYyAqIHNpbihsYXQwKSk7XHJcbiAgICAgICAgICAgIGxhdDEgPSBwaTIgLSAyICogYXRhbih0eHkgKiBwb3cocGFydDEsIGVjIC8gMikpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ29udmVydCBmcm9tIHJhZGlhbnMgdG8gZGVncmVlcy5cclxuICAgICAgICBMYXQgPSBsYXQxIC8gYW5nUmFkO1xyXG4gICAgICAgIExvbiA9IGxvbiAvIGFuZ1JhZDtcclxuXHJcbiAgICAgICAgLy90dXJuIFwiICAgTG9uZ2l0dWRlOiBcIitMb24rXCIgICBMYXRpdHVkZTogXCIrTGF0O1xyXG4gICAgICAgIHJldHVybiBcIkxhdGl0dWRlOiBcIiArIG1pbnV0ZXMoTGF0KSArIFwiIE4gICBMb25naXR1ZGU6IC1cIiArIG1pbnV0ZXMoTG9uKSArIFwiIFcgKGFwcHJveGltYXRlIGNvb3JkaW5hdGVzKVwiO1xyXG4gICAgfVxyXG59XHJcblxyXG4qL1xyXG5cclxuZnVuY3Rpb24gY29udmVydFdHUzg0UHJvamVjdGlvblRvV0dTODRMYXRMb24obWVyY2F0b3IpIHtcclxuICAgIC8vIGh0dHBzOi8vZ2lzLnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy82OTIwOC90cnlpbmctdG8tY29udmVydC1jb29yZGluYXRlcy1mcm9tLXdnczg0LXdlYi1tZXJjYXRvci1hdXhpbGlhcnktc3BoZXJlLXRvLXdnczg0XHJcbiAgICAvLyBodHRwczovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9NZXJjYXRvciNKYXZhXHJcbiAgICAvLyAgICAgICAgIGlmIChNYXRoLmFicyhtZXJjYXRvclswXSkgPCAxODAgJiYgTWF0aC5BYnMobWVyY2F0b3JbMV0pIDwgOTApXHJcbiAgICAvLyAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgLy8gICAgICAgICBpZiAoKE1hdGguQWJzKG1lcmNhdG9yWzBdKSA+IDIwMDM3NTA4LjM0Mjc4OTIpIHx8IChNYXRoLkFicyhtZXJjYXRvclsxXSkgPiAyMDAzNzUwOC4zNDI3ODkyKSlcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICB2YXIgeCA9IG1lcmNhdG9yWzBdO1xyXG4gICAgdmFyIHkgPSBtZXJjYXRvclsxXTtcclxuICAgIHZhciBudW0zID0geCAvIDYzNzgxMzcuMDtcclxuICAgIHZhciBudW00ID0gbnVtMyAqIDU3LjI5NTc3OTUxMzA4MjMyMztcclxuICAgIHZhciBudW01ID0gTWF0aC5mbG9vcigobnVtNCArIDE4MC4wKSAvIDM2MC4wKTtcclxuICAgIHZhciBudW02ID0gbnVtNCAtIG51bTUgKiAzNjAuMDtcclxuICAgIHZhciBudW03ID1cclxuICAgICAgICAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyLjAgKiBNYXRoLmF0YW4oTWF0aC5leHAoKC0xLjAgKiB5KSAvIDYzNzgxMzcuMCkpO1xyXG4gICAgbWVyY2F0b3JbMF0gPSBudW02O1xyXG4gICAgbWVyY2F0b3JbMV0gPSBudW03ICogNTcuMjk1Nzc5NTEzMDgyMzIzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtaW51dGVzKG51bSkge1xyXG4gICAgLy8gRm9yIGNvbnZlcnRpbmcgY29udmVydFNQVG9XR1M4NCh4LHkpIHBvaW50cyB0byBtaW51dGVzLCBhbHNvIGJvcnJvd2VkIGZyb20gU2NvcGkhXHJcbiAgICBudW0gPSBNYXRoLmFicyhudW0pO1xyXG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcihudW0pO1xyXG4gICAgdmFyIGRlY2ltYWwgPSBudW0gLSBmbG9vcjtcclxuICAgIHZhciBtaW51dGVzID0gNjAgKiBkZWNpbWFsO1xyXG4gICAgdmFyIGZsb29yMiA9IE1hdGguZmxvb3IobWludXRlcyk7XHJcbiAgICBkZWNpbWFsID0gbWludXRlcyAtIGZsb29yMjtcclxuICAgIHZhciBzZWNvbmRzID0gNjAgKiBkZWNpbWFsO1xyXG4gICAgLy9yIGZsb29yMyA9IE1hdGgucm91bmQoc2Vjb25kcyk7XHJcbiAgICBzZWNvbmRzICo9IDEwMDtcclxuICAgIHNlY29uZHMgPSBNYXRoLnJvdW5kKHNlY29uZHMpO1xyXG4gICAgc2Vjb25kcyAvPSAxMDA7IC8vIGFjY3VyYXRlIHRvIDIgZGVjaW1hbCBwbGFjZXNcclxuICAgIHJldHVybiBmbG9vciArICdcXHUwMEIwICcgKyBmbG9vcjIgKyAnXFx1MjAzMiAnICsgc2Vjb25kcyArICdcXHUyMDMzJztcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoZGlzdGFuY2VYLCBkaXN0YW5jZVksIHNwQ29vcmRzKSB7XHJcbiAgICB2YXIgc3BXaWR0aCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueDtcclxuICAgIHZhciBzcEhlaWdodCA9IHRoaXMuZXh0ZW50LnZpc2libGUuWSAtIHRoaXMuZXh0ZW50LnZpc2libGUueTtcclxuXHJcbiAgICB2YXIgeFJhdGlvID0gc3BXaWR0aCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgdmFyIHlSYXRpbyA9IHNwSGVpZ2h0IC8gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0O1xyXG5cclxuICAgIHZhciBsZWZ0ID0gZGlzdGFuY2VYICogeFJhdGlvO1xyXG4gICAgdmFyIHRvcCA9IDAgLSBkaXN0YW5jZVkgKiB5UmF0aW87XHJcblxyXG4gICAgaWYgKHNwQ29vcmRzKSB7XHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZS54ID0gc3BDb29yZHMueCAtPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWCA9IHNwQ29vcmRzLlggLT0gbGVmdDtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgPSBzcENvb3Jkcy55IC09IHRvcDtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLlkgPSBzcENvb3Jkcy5ZIC09IHRvcDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS54IC09IGxlZnQ7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlggLT0gbGVmdDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUueSAtPSB0b3A7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlkgLT0gdG9wO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlPcmlnaW4ocF9vcmlnaW4sIHBfc2NhbGUpIHtcclxuICAgIHZhciBzcFdpZHRoID0gdGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54O1xyXG4gICAgdmFyIHNwSGVpZ2h0ID0gdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55O1xyXG5cclxuICAgIGlmIChwX3NjYWxlID09PSAyKSB7XHJcbiAgICAgICAgc3BXaWR0aCA9IHNwV2lkdGggKiAtKDEgLyBwX3NjYWxlKTtcclxuICAgICAgICBzcEhlaWdodCA9IHNwSGVpZ2h0ICogLSgxIC8gcF9zY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS54IC09IHNwV2lkdGggKiBwX29yaWdpbi54O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5YICs9IHNwV2lkdGggKiAoMSAtIHBfb3JpZ2luLngpO1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS55IC09IHNwSGVpZ2h0ICogcF9vcmlnaW4ueTtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSArPSBzcEhlaWdodCAqICgxIC0gcF9vcmlnaW4ueSk7XHJcbiAgICBjb25zb2xlLmxvZyh0aGlzLmV4dGVudC52aXNpYmxlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVmlzRXh0ZW50QnlPcmlnaW5BbmRSZXNvbHV0aW9uKHBfb3JpZ2luLCBwX3NjYWxlLCBwX3Jlc29sdXRpb24pIHtcclxuICAgIGxldCB2aXMgPSB0aGlzLmV4dGVudC52aXNpYmxlO1xyXG4gICAgbGV0IHNwV2lkdGggPSB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAqIHBfcmVzb2x1dGlvbjtcclxuICAgIGxldCBzcEhlaWdodCA9IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAqIHBfcmVzb2x1dGlvbjtcclxuXHJcbiAgICBsZXQgcmF0aW9YID0gKHZpcy5YIC0gcF9vcmlnaW4ueCkgLyAodmlzLlggLSB2aXMueCk7XHJcbiAgICBsZXQgcmF0aW9ZID0gKHZpcy5ZIC0gcF9vcmlnaW4ueSkgLyAodmlzLlkgLSB2aXMueSk7XHJcblxyXG4gICAgaWYgKHBfc2NhbGUgPj0gMSkge1xyXG4gICAgICAgIHBfc2NhbGUgPSBwX3NjYWxlIC0gMTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcF9zY2FsZSA9IC0oMSAtIHBfc2NhbGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHZpcy5YIC09IHNwV2lkdGggKiBwX3NjYWxlICogcmF0aW9YO1xyXG4gICAgdmlzLnggPSB2aXMuWCAtIHNwV2lkdGg7XHJcbiAgICB2aXMuWSAtPSBzcEhlaWdodCAqIHBfc2NhbGUgKiByYXRpb1k7XHJcbiAgICB2aXMueSA9IHZpcy5ZIC0gc3BIZWlnaHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcihwb2ludCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBwb2ludC54IC0gdGhpcy5tYXBDb250YWluZXIubGVmdCxcclxuICAgICAgICB5OiBwb2ludC55IC0gdGhpcy5tYXBDb250YWluZXIudG9wLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UGFuT2Zmc2V0UG9pbnQocG9pbnQpIHtcclxuICAgIHZhciBwYW5PZmZzZXRYID0gdGhpcy5tYWluQ29udGFpbmVyLmxlZnQ7IC8vKyB0aGlzLm1hcEltZy5sZWZ0OyAvLyBTaG91bGQgYmUgemVybyBpZiBub3QgcGFubmluZy5cclxuICAgIHZhciBwYW5PZmZzZXRZID0gdGhpcy5tYWluQ29udGFpbmVyLnRvcDsgLy8rIHRoaXMubWFwSW1nLnRvcDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBvaW50LnggLSBwYW5PZmZzZXRYLCAvLyBUaGlzIHdpbGwgc2V0IHRoZSBvcmlnaW4gdG8pLzJ0aGUgY2VudGVyIC0+IC0gdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyO1xyXG4gICAgICAgIHk6IHBvaW50LnkgLSBwYW5PZmZzZXRZLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzdGFuY2VCZXR3ZWVuKGEsIGIpIHtcclxuICAgIC8vIEdvb2Qgb2xkIHB5dGhhZ29yZWFuIHRoZW9yZW0uXHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KGJbMF0gLSBhWzBdLCAyKSArIE1hdGgucG93KGJbMV0gLSBhWzFdLCAyKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbnZlcnRTUFRvV0dTODRQcm9qKHNwUG9pbnQpIHtcclxuICAgIGxldCB3c2c4NUxhdExvbiA9IHRoaXMuY29udmVydFNQVG9XR1M4NChzcFBvaW50KTtcclxuICAgIHJldHVybiB0aGlzLkxlYWZsZXRTcGhlcmljYWxNZXJjYXRvci5wcm9qZWN0RnJvbVdTRzg0R2VvKHdzZzg1TGF0TG9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmVzb2x1dGlvbih6b29tKSB7XHJcbiAgICBpZiAodGhpcy56b29tSW5kZXgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy56b29tSW5kZXhbem9vbV0ucmVzb2x1dGlvbjtcclxuICAgIH1cclxuICAgIC8vIFdTRzg0IFNwaGVyaWNhbCBNZXJjYXRvci5cclxuICAgIC8vIGxldCBFYXJ0aFJhZGl1cyA9IDYzNzgxMzc7XHJcbiAgICAvLyBsZXQgUmFkaXVzeFBpID0gTWF0aC5QSSAqIEVhcnRoUmFkaXVzO1xyXG4gICAgLy8gbGV0IFBpeGVsc0F0Wm9vbSA9IDI1NiAqIE1hdGgucG93KDIsIHpvb20pO1xyXG4gICAgLy8gbGV0IGRlZ1Blck1ldGVyID0gUmFkaXVzeFBpICogMiAvIEVhcnRoUmFkaXVzO1xyXG4gICAgLy8gbGV0IGRlZ1BlclBpeGVsID0gRWFydGhSYWRpdXMgLyBQaXhlbHNBdFpvb20gKiBkZWdQZXJNZXRlcjtcclxuICAgIHZhciBwaXhlbHMgPSAoMjU2ICogTWF0aC5wb3coMiwgem9vbSkpIC8gMjtcclxuICAgIHZhciBleHRlbnQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7XHJcbiAgICB2YXIgcmVzID0gZXh0ZW50IC8gcGl4ZWxzO1xyXG5cclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbk5ld01hcC5wcm90b3R5cGUuTGVhZmxldFNwaGVyaWNhbE1lcmNhdG9yID0ge1xyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0xlYWZsZXQvTGVhZmxldC9ibG9iL21hc3Rlci9zcmMvZ2VvL3Byb2plY3Rpb24vUHJvamVjdGlvbi5TcGhlcmljYWxNZXJjYXRvci5qc1xyXG4gICAgLy8gaHR0cHM6Ly9naXMuc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzkyOTA3L3JlLXByb2plY3QtcmFzdGVyLWltYWdlLWZyb20tbWVyY2F0b3ItdG8tZXF1aXJlY3Rhbmd1bGFyXHJcbiAgICAvLyBodHRwczovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9TbGlwcHlfbWFwX3RpbGVuYW1lc1xyXG4gICAgUkFESVVTOiA2Mzc4MTM3LFxyXG4gICAgTUFYX0xBVElUVURFOiA4NS4wNTExMjg3Nzk4LFxyXG4gICAgQk9VTkQ6IDIwMDM3NTA4LjM0Mjc4OTI0NCwgLy8yMDAzNzUwOC4zNDI3ODkyNDQgVE9ETzogXCJCT1VORFwiIGlzIHByb2JhYmx5IG5vdCB0aGUgY29ycmVjdCB0ZXJtLlxyXG5cclxuICAgIHByb2plY3RGcm9tV1NHODRHZW86IGZ1bmN0aW9uKGxhdGxuZykge1xyXG4gICAgICAgIHZhciBkID0gTWF0aC5QSSAvIDE4MCxcclxuICAgICAgICAgICAgbWF4ID0gdGhpcy5NQVhfTEFUSVRVREUsXHJcbiAgICAgICAgICAgIGxhdCA9IE1hdGgubWF4KE1hdGgubWluKG1heCwgbGF0bG5nLmxhdCksIC1tYXgpLFxyXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihsYXQgKiBkKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5SQURJVVMgKiBsYXRsbmcubG5nICogZCxcclxuICAgICAgICAgICAgeTogKHRoaXMuUkFESVVTICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSkgLyAyLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIHByb2plY3RUb1dTRzg0R2VvOiBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgICAgIHZhciBkID0gMTgwIC8gTWF0aC5QSSxcclxuICAgICAgICAgICAgUiA9IHRoaXMuUkFESVVTO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBsYXQ6ICgyICogTWF0aC5hdGFuKE1hdGguZXhwKHBvaW50LnkgLyBSKSkgLSBNYXRoLlBJIC8gMikgKiBkLFxyXG4gICAgICAgICAgICBsbmc6IChwb2ludC54ICogZCkgLyBSLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG59O1xyXG5cclxuLypcclxuaHR0cHM6Ly9sZWFmbGV0anMuY29tL2V4YW1wbGVzL3F1aWNrLXN0YXJ0L2V4YW1wbGUuaHRtbFxyXG5cclxudmFyIGR2aSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpLmNsb25lTm9kZSgpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwaWQnKS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpKTtcclxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkdmkpO1xyXG5cclxudmFyIHNjcmlwdHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgIHNjcmlwdHQuc3JjID0gJ2h0dHBzOi8vdW5wa2cuY29tL2xlYWZsZXRAMS4zLjQvZGlzdC9sZWFmbGV0LXNyYy5qcyc7XHJcbiAgICBzY3JpcHR0LmNyb3NzT3JpZ2luID0gdHJ1ZTtcclxuZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHR0KTtcclxuXHJcblxyXG5cclxubXltYXAgPSBMLm1hcCgnbWFwaWQnKS5zZXRWaWV3KFswLCAwXSwgMTMpO1xyXG5teW1hcC5vbignY2xpY2snLCBvbk1hcENsaWNrKVxyXG5cclxuICAgIEwudGlsZUxheWVyKCdodHRwczovL2FwaS50aWxlcy5tYXBib3guY29tL3Y0L3tpZH0ve3p9L3t4fS97eX0ucG5nP2FjY2Vzc190b2tlbj1way5leUoxSWpvaWJXRndZbTk0SWl3aVlTSTZJbU5wZWpZNE5YVnljVEEyZW1ZeWNYQm5kSFJxY21aM04zZ2lmUS5ySmNGSUcyMTRBcmlJU0xiQjZCNWF3Jywge1xyXG4gICAgICAgIG1heFpvb206IDE4LFxyXG4gICAgICAgIGF0dHJpYnV0aW9uOiAnTWFwIGRhdGEgJmNvcHk7IDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPiBjb250cmlidXRvcnMsICcgK1xyXG4gICAgICAgICAgICAnPGEgaHJlZj1cImh0dHBzOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8yLjAvXCI+Q0MtQlktU0E8L2E+LCAnICtcclxuICAgICAgICAgICAgJ0ltYWdlcnkgwqkgPGEgaHJlZj1cImh0dHBzOi8vd3d3Lm1hcGJveC5jb20vXCI+TWFwYm94PC9hPicsXHJcbiAgICAgICAgaWQ6ICdtYXBib3guc3RyZWV0cydcclxuICAgIH0pLmFkZFRvKG15bWFwKTtcclxuXHJcbiAgICBMLm1hcmtlcihbMCwgMF0pLmFkZFRvKG15bWFwKVxyXG4gICAgICAgIC5iaW5kUG9wdXAoXCI8Yj5IZWxsbyB3b3JsZCE8L2I+PGJyIC8+SSBhbSBhIHBvcHVwLlwiKS5vcGVuUG9wdXAoKTtcclxuXHJcblxyXG5cclxucG9wdXAgPSBMLnBvcHVwKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25NYXBDbGljayhlKSB7XHJcbiAgICAgICAgcG9wdXBcclxuICAgICAgICAgICAgLnNldExhdExuZyhlLmxhdGxuZylcclxuICAgICAgICAgICAgLnNldENvbnRlbnQoXCJZb3UgY2xpY2tlZCB0aGUgbWFwIGF0IFwiICsgZS5sYXRsbmcudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgLm9wZW5PbihteW1hcCk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiovXHJcbiIsImltcG9ydCB7TmV3TWFwfSBmcm9tICcuL01haW5fY2xhc3MnO1xyXG5cclxuT2JqZWN0LmFzc2lnbihOZXdNYXAucHJvdG90eXBlLCB7XHJcbiAgICBib3hab29tX21vdXNlRG93bixcclxuICAgIGJveFpvb21fbW91c2VVcCxcclxuICAgIGJveFpvb21fZG9ab29tLFxyXG4gICAgYm94Wm9vbV9tb3VzZU1vdmUsXHJcbiAgICBib3hab29tQ2VudGVyX21vdXNlTW92ZSxcclxufSk7XHJcblxyXG5mdW5jdGlvbiBib3hab29tX21vdXNlRG93bihlKSB7XHJcbiAgICBpZiAodGhpcy5ib3hab29tKSB7XHJcbiAgICAgICAgdGhpcy5ib3hab29tID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJveFpvb20ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChib3hab29tKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wYW5uaW5nX21vZHVsZS5kaXNhYmxlUGFubmluZygpO1xyXG5cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgLy8gVE9ETzogTWFrZSBib3hab29tIGl0J3Mgb3duIG9iamVjdCB3aXRoIGEgZWxlbWVudCBwcm9wZXJ0eSwgaW5zdGVhZCBvZlxyXG4gICAgLy8gICAgICAgYWRkaW5nIHByb3BlcnRpZXMgdG8gdGhlIGh0bWwgZWxlbWVudCBpdHNlbGYuXHJcbiAgICB0aGlzLmJveFpvb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIHRoaXMuYm94Wm9vbS5pZCA9ICdib3hab29tJztcclxuICAgIHRoaXMuYm94Wm9vbS5jbGFzc05hbWUgPSAnYm94Wm9vbSc7XHJcblxyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuaWQgPSAnYm94Wm9vbUNlbnRlcic7XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXIuY2xhc3NOYW1lID0gJ2JveFpvb21DZW50ZXInO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICdwb3NpdGlvbjphYnNvbHV0ZTsgdG9wOjBweDsgbGVmdDowcHg7IHdpZHRoOiA1cHg7IGhlaWdodDogNXB4OyBib3JkZXI6IDFweCBzb2xpZCByZWQ7JztcclxuXHJcbiAgICB0aGlzLmJveFpvb20uYXBwZW5kQ2hpbGQodGhpcy5ib3hab29tQ2VudGVyKTtcclxuXHJcbiAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5pbnNlcnRCZWZvcmUoXHJcbiAgICAgICAgdGhpcy5ib3hab29tLFxyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQsXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5vZmZzZXQgPSB7XHJcbiAgICAgICAgeDogdGhpcy5tYXBDb250YWluZXIubGVmdCArIHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHRoaXMubWFwQ29udGFpbmVyLnRvcCArIHRoaXMubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5sZWZ0ID0gZS5jbGllbnRYIC0gYm94Wm9vbS5vZmZzZXQueCArICdweCc7XHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID0gZS5jbGllbnRZIC0gYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUuekluZGV4ID0gNTAwO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdGFydCA9IHtcclxuICAgICAgICB4OiBlLmNsaWVudFgsXHJcbiAgICAgICAgeTogZS5jbGllbnRZLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnBhZ2VIYXNGb2N1cyA9IHRydWU7XHJcblxyXG4gICAgLy8gVE9ETzogQ2hhbmdlIG5hbWUgb2YgbW91c2UgbW92ZSBhbmQgbW91c2UgdXAgZXZlbnRsaXN0ZW5lcnMuXHJcbiAgICB0aGlzLmJveFpvb20ubXYgPSBlID0+IHRoaXMuYm94Wm9vbV9tb3VzZU1vdmUoZSk7XHJcbiAgICB0aGlzLmJveFpvb20ubXVwID0gZSA9PiB0aGlzLmJveFpvb21fbW91c2VVcChlKTtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmJveFpvb20ubXYpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm94Wm9vbS5tdXApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tX21vdXNlTW92ZShlKSB7XHJcbiAgICBpZiAoZS5jbGllbnRYID4gdGhpcy5ib3hab29tLnN0YXJ0LngpIHtcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUubGVmdCA9XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdGFydC54IC0gdGhpcy5ib3hab29tLm9mZnNldC54ICsgJ3B4JztcclxuICAgICAgICBpZiAoZS5jbGllbnRZID4gdGhpcy5ib3hab29tLnN0YXJ0LnkpIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJveFpvb20uc3RhcnQueSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5zdGFydC54ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5zdGFydC55ICsgJ3B4JztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID0gZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoID0gZS5jbGllbnRYIC0gdGhpcy5ib3hab29tLnN0YXJ0LnggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0ID0gdGhpcy5ib3hab29tLnN0YXJ0LnkgLSBlLmNsaWVudFkgKyAncHgnO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAodGhpcy5ib3hab29tLnN0YXJ0LnggPiBlLmNsaWVudFgpIHtcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUubGVmdCA9IGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueCArICdweCc7XHJcbiAgICAgICAgaWYgKGUuY2xpZW50WSA+IHRoaXMuYm94Wm9vbS5zdGFydC55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0YXJ0LnkgLSB0aGlzLmJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGggPSB0aGlzLmJveFpvb20uc3RhcnQueCAtIGUuY2xpZW50WCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQgPSBlLmNsaWVudFkgLSB0aGlzLmJveFpvb20uc3RhcnQueSArICdweCc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IHRoaXMuYm94Wm9vbS5zdGFydC54IC0gZS5jbGllbnRYICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IHRoaXMuYm94Wm9vbS5zdGFydC55IC0gZS5jbGllbnRZICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmJveFpvb21DZW50ZXJfbW91c2VNb3ZlKFxyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQsXHJcbiAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoLFxyXG4gICAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9tb3VzZVVwKGUpIHtcclxuICAgIHZhciB3aWR0aCA9IE1hdGguYWJzKGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5zdGFydC54KTtcclxuICAgIHZhciBoZWlnaHQgPSBNYXRoLmFicyhlLmNsaWVudFkgLSB0aGlzLmJveFpvb20uc3RhcnQueSk7XHJcbiAgICB2YXIgeCA9IGUuY2xpZW50WCA+IHRoaXMuYm94Wm9vbS5zdGFydC54ID8gZS5jbGllbnRYIDogYm94Wm9vbS5zdGFydC54O1xyXG4gICAgdmFyIHkgPSBlLmNsaWVudFkgPiB0aGlzLmJveFpvb20uc3RhcnQueSA/IGUuY2xpZW50WSA6IGJveFpvb20uc3RhcnQueTtcclxuICAgIHZhciBjZW50ZXIgPSB0aGlzLmdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcihcclxuICAgICAgICB0aGlzLnRvUG9pbnQoeCAtIHdpZHRoIC8gMiwgeSAtIGhlaWdodCAvIDIpLFxyXG4gICAgKTtcclxuXHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLmJveFpvb20ubXYpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuYm94Wm9vbS5tdXApO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZVt0aGlzLkNTU19UUkFOU0lUSU9OXSA9ICdvcGFjaXR5IDAuMTVzIGVhc2UtaW4tb3V0JztcclxuICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5vcGFjaXR5ID0gMDtcclxuXHJcbiAgICB0aGlzLnBhbm5pbmdfbW9kdWxlLmVuYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICB0aGlzLmJveFpvb20ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChib3hab29tKTtcclxuXHJcbiAgICBpZiAoXHJcbiAgICAgICAgZS5jbGllbnRYID09PSB0aGlzLmJveFpvb20uc3RhcnQuY2xpZW50WCAmJlxyXG4gICAgICAgIGUuY2xpZW50WSA9PT0gdGhpcy5ib3hab29tLnN0YXJ0LmNsaWVudFlcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcblxyXG4gICAgdGhpcy5ib3hab29tX2RvWm9vbSh7XHJcbiAgICAgICAgaGVpZ2h0LFxyXG4gICAgICAgIHdpZHRoLFxyXG4gICAgICAgIGNlbnRlcixcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tX2RvWm9vbShvYmopIHtcclxuICAgIGxldCBwcm9qZWN0ZWRDZW50ZXIgPSB0aGlzLnNjcmVlblBvaW50VG9Qcm9qZWN0aW9uKG9iai5jZW50ZXIpO1xyXG4gICAgbGV0IGhlaWdodCA9IG51bGw7XHJcbiAgICBsZXQgd2lkdGggPSBudWxsO1xyXG4gICAgbGV0IG11bHRpcGxpZXIgPSBudWxsO1xyXG5cclxuICAgIGZvciAobGV0IGggPSAwOyBoIDwgNTAgLypwcmV2ZW50IGVuZGxlc3MgbG9vcCovOyBoKyspIHtcclxuICAgICAgICBtdWx0aXBsaWVyID0gTWF0aC5wb3coMiwgaCk7XHJcbiAgICAgICAgd2lkdGggPSBvYmoud2lkdGggKiBtdWx0aXBsaWVyO1xyXG4gICAgICAgIGhlaWdodCA9IG9iai5oZWlnaHQgKiBtdWx0aXBsaWVyO1xyXG5cclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgIGhlaWdodCA+IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCB8fFxyXG4gICAgICAgICAgICB3aWR0aCA+IHRoaXMubWFwQ29udGFpbmVyLndpZHRoXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIGggLT0gMTtcclxuICAgICAgICAgICAgdGhpcy56b29tVG8ocHJvamVjdGVkQ2VudGVyLCB0aGlzLnpvb20gKyBoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBib3hab29tQ2VudGVyX21vdXNlTW92ZShoZWlnaHQsIHdpZHRoKSB7XHJcbiAgICBoZWlnaHQgPSBoZWlnaHQucmVwbGFjZSgncHgnLCAnJyk7XHJcbiAgICB3aWR0aCA9IHdpZHRoLnJlcGxhY2UoJ3B4JywgJycpO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLnN0eWxlLnRyYW5zZm9ybSA9XHJcbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgKHdpZHRoIC8gMiAtIDMpICsgJ3B4LCAnICsgKGhlaWdodCAvIDIgLSAzKSArICdweCknO1xyXG59XHJcbiIsImltcG9ydCB7IEJhc2ljSW50ZXJhY3RpdmVFbGVtZW50IH0gZnJvbSBcIi4vLi4vQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnRfY2xhc3NcIjtcclxuaW1wb3J0IHsgdG9Qb2ludCwgY29udmVydFNQVG9XR1M4NCB9IGZyb20gXCIuLy4uL2Nvb3JkaW5hdGVfbW9kdWxlXCI7XHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gXCIuLy4uL3V0aWxzLmpzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzZU1hcmtlckNsYXNzIGV4dGVuZHMgQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnQge1xyXG4gICAgY29uc3RydWN0b3IoZWxlbSkge1xyXG4gICAgICAgIHN1cGVyKGVsZW0pO1xyXG5cclxuICAgICAgICBlbGVtLnN0eWxlLmJvdHRvbSA9IFwiMHB4XCI7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudCA9IGVsZW07XHJcblxyXG4gICAgICAgIHRoaXMub2Zmc2V0UG9zID0geyB4OiAwLCB5OiAwIH07XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJjbGlja1wiLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub24oXCJtb3VzZWRvd25cIiwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLm9uKFwiYXBwZW5kZWRUb01hcFwiLCBlID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXCJ6b29tIGVuZFwiLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcInVwZGF0ZSBldmVyeXRoaW5nXCIsIHRoaXMuX3pvb21FbmRDYWxsYmFjaywgdGhpcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFwcGVuZGVkVG9NYXAgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRDb29yZHMoc3BQb2ludCkge1xyXG4gICAgICAgIHNwUG9pbnQgPSB0b1BvaW50KHNwUG9pbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRlUGxhbmVQb2ludCA9IHNwUG9pbnQ7XHJcblxyXG4gICAgICAgIHRoaXMuekluZGV4ID0gMWU2IC0gdGhpcy5zdGF0ZVBsYW5lUG9pbnQueS50b0ZpeGVkKDApO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS56SW5kZXggPSB0aGlzLnpJbmRleDtcclxuXHJcbiAgICAgICAgdGhpcy53Z3M4NFhQb2ludCA9IGNvbnZlcnRTUFRvV0dTODQoc3BQb2ludC54LCBzcFBvaW50LnkpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUG9zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzZXRPZmZzZXRQb3MocG9pbnQpIHtcclxuICAgICAgICB0aGlzLm9mZnNldFBvcyA9IHRoaXMubWFwLnRvUG9pbnQocG9pbnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBhZGRUb01hcChhcmdfbWFwKSB7XHJcbiAgICAgICAgbGV0IHRoaXNNYXJrZXIgPSB0aGlzO1xyXG4gICAgICAgIGxldCBtYXAgPSBhcmdfbWFwO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuc3RhdGVQbGFuZVBvaW50LngpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJTZXQgY29vcmRpbmF0ZXMgYmVmb3JlIGFwcGVuZGluZyBtYXJrZXIuXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAgPSBhcmdfbWFwO1xyXG5cclxuICAgICAgICBtYXAuYWRkVG8odGhpcy5lbGVtZW50LCBtYXAubWFya2VyQ29udGFpbmVyLmVsZW1lbnQsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgdGhpc01hcmtlci5maXJlKFwiYXBwZW5kZWRUb01hcFwiLCBlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZFRvTWFwKHRoaXMubWFwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcclxuICAgICAgICAgICAgdGhpcy5hcHBlbmRlZFRvTWFwID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZihcIm1hcCBsb2FkIGVuZFwiLCB0aGlzLnVwZGF0ZVBvcywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub2ZmKFwiem9vbSBlbmRcIiwgdGhpcy5fem9vbUVuZENhbGxiYWNrLCB0aGlzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgX3pvb21FbmRDYWxsYmFjayhlKSB7XHJcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IChlLmNzcyAmJiBlLmNzcy5jbGFzc05hbWUpIHx8IFwibWFya2VyX3pvb21fdHJhbnNpdGlvblwiO1xyXG5cclxuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG5cclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tQW5pbVRpbWVyKTtcclxuICAgICAgICB0aGlzLnpvb21BbmltVGltZXIgPSBzZXRUaW1lb3V0KHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlLmJpbmQodGhpcy5lbGVtZW50LmNsYXNzTGlzdCwgY2xhc3NOYW1lKSwgMzUwKTtcclxuICAgIH1cclxuXHJcbiAgICBkZWxldGUoKSB7XHJcbiAgICAgICAgdGhpcy5oaWRlKCk7XHJcbiAgICAgICAgdGhpcy5kZWxldGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKFwiZGVsZXRlXCIsIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHBhbkludG9WaWV3KCkge1xyXG4gICAgICAgIGlmICghdGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcywgXCI8LSBUaGF0IGhhcyB0byBiZSBhZGRlZCB0byBhIG1hcCBiZWZvcmUgY2FsbGluZyBwYW5JbnRvVmlldygpLlwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtYXBDb250ID0gdGhpcy5tYXAubWFwQ29udGFpbmVyO1xyXG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIHZhciBwYWRkaW5nID0gNTtcclxuICAgICAgICB2YXIgcG9pbnQgPSB7IHg6IDAsIHk6IDAgfTtcclxuXHJcbiAgICAgICAgaWYgKHJlY3QudG9wIDwgbWFwQ29udC50b3AgKyA1KSB7XHJcbiAgICAgICAgICAgIHBvaW50LnkgPSBtYXBDb250LnRvcCAtIHJlY3QudG9wICsgNTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChyZWN0LmxlZnQgPCBtYXBDb250LmxlZnQgKyBwYWRkaW5nKSB7XHJcbiAgICAgICAgICAgIHBvaW50LnggPSBtYXBDb250LmxlZnQgLSByZWN0LmxlZnQgKyBwYWRkaW5nO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVjdC5sZWZ0ICsgcmVjdC53aWR0aCA+IG1hcENvbnQubGVmdCArIG1hcENvbnQud2lkdGggLSBwYWRkaW5nKSB7XHJcbiAgICAgICAgICAgIHBvaW50LnggPSBtYXBDb250LmxlZnQgKyBtYXBDb250LndpZHRoIC0gKHJlY3QubGVmdCArIHJlY3Qud2lkdGgpIC0gcGFkZGluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwb2ludC54IHx8IHBvaW50LnkpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAucGFubmluZ19tb2R1bGUucGFuQnlQaXhlbHMocG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVQb3MoKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmFwcGVuZGVkVG9NYXApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpcmUoXCJwcmVVcGRhdGVQb3NcIiwgdGhpcyk7XHJcblxyXG4gICAgICAgIHZhciBwb2ludCA9IHRoaXMubWFwLmNvbnZlcnRQcm9qUG9pbnRUb09mZnNldFBpeGVsUG9pbnQodGhpcy5zdGF0ZVBsYW5lUG9pbnQpO1xyXG5cclxuICAgICAgICBwb2ludC54ID0gfn4ocG9pbnQueCArIHRoaXMub2Zmc2V0UG9zLngpO1xyXG4gICAgICAgIHBvaW50LnkgPSB+fihwb2ludC55ICsgdGhpcy5vZmZzZXRQb3MueSk7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlKFwiICsgcG9pbnQueCArIFwicHgsIFwiICsgcG9pbnQueSArIFwicHgpXCI7XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZShcInBvc3RVcGRhdGVQb3NcIiwgdGhpcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7QmFzZU1hcmtlckNsYXNzfSBmcm9tIFwiLi9CYXNlTWFya2VyX2NsYXNzXCI7XHJcbmltcG9ydCB7dG9Qb2ludH0gZnJvbSAnLi8uLi9jb29yZGluYXRlX21vZHVsZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFrZVBvcHVwIGV4dGVuZHMgQmFzZU1hcmtlckNsYXNzIHtcclxuICAgIGNvbnN0cnVjdG9yKG9wdF9tZXNzYWdlLCBvcHRfc3BQb2ludCwgb3B0X2FuY2hvck9mZnNldCA9IFswLCAwXSkge1xyXG4gICAgICAgIGxldCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIHN1cGVyKGVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KG9wdF9tZXNzYWdlLCBvcHRfc3BQb2ludCwgb3B0X2FuY2hvck9mZnNldCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChvcHRfbWVzc2FnZSwgb3B0X3NwUG9pbnQsIG9wdF9hbmNob3JPZmZzZXQpIHtcclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IG9wdF9tZXNzYWdlLFxyXG4gICAgICAgICAgICBwb2ludDogb3B0X3NwUG9pbnQsXHJcbiAgICAgICAgICAgIGFuY2hvck9mZnNldDogb3B0X2FuY2hvck9mZnNldCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSB0aGlzLm9wdGlvbnMubWVzc2FnZTtcclxuXHJcbiAgICAgICAgdGhpcy5vZmZzZXRQb3MgPSB0b1BvaW50KHRoaXMub3B0aW9ucy5hbmNob3JPZmZzZXQpO1xyXG5cclxuICAgICAgICB0aGlzLm1ha2VQb3B1cCgpO1xyXG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLnNldE1lc3NhZ2UodGhpcy5tZXNzYWdlKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5wb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldENvb3Jkcyh0b1BvaW50KHRoaXMub3B0aW9ucy5wb2ludCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW5pdC5pbml0QXJyKSB7XHJcbiAgICAgICAgICAgIGxldCBhcnkgPSB0aGlzLmluaXQuaW5pdEFycjtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgYXJ5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGFkZGl0aW9uYWwgaW5pdCBmdW5jdGlvbnMgYW4gZXh0ZW5zaW9uXHJcbiAgICAgICAgICAgICAgICAvLyBtaWdodCBoYXZlIGFkZGVkLlxyXG4gICAgICAgICAgICAgICAgYXJ5W25dLmZuLmNhbGwoYXJ5W25dLmN0eCB8fCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgb25Jbml0RG9uZShmbiwgY3R4KSB7XHJcbiAgICAgICAgLy8gVGVzdGluZyBhbiBpZGVhIGFib3V0IGhvdyB0byBleHRlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICAgICAgbGV0IGFyeSA9IHRoaXMucHJvdG90eXBlLmluaXQuaW5pdGFycjtcclxuICAgICAgICBpZiAoIWFyeSkge1xyXG4gICAgICAgICAgICBhcnkgPSB0aGlzLnByb3RvdHlwZS5pbml0LmluaXRBcnIgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXJ5LnB1c2goe2ZuLCBjdHh9KTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICB0aGlzLm9uKCdhcHBlbmRlZFRvTWFwJywgZSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5tYXAuTU9VU0VfV0hFRUxfRVZULCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbigncHJlVXBkYXRlUG9zJywgZSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0T2ZmU2V0TGVmdFRvcCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNldE9mZlNldExlZnRUb3AoKSB7XHJcbiAgICAgICAgbGV0IGVsID0gdGhpcy5lbGVtZW50O1xyXG4gICAgICAgIGVsLnN0eWxlLmxlZnQgPSAtKGVsLm9mZnNldFdpZHRoIC8gMikgKyAncHgnO1xyXG4gICAgICAgIGVsLnN0eWxlLmJvdHRvbSA9IHRoaXMuYXJyb3cub2Zmc2V0SGVpZ2h0ICsgJ3B4JztcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TWVzc2FnZShvcHRfbWVzc2FnZSA9ICcnKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdF9tZXNzYWdlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VDb250YWluZXIuaW5uZXJIVE1MID0gb3B0X21lc3NhZ2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyLmFwcGVuZENoaWxkKG9wdF9tZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG9wdF9tZXNzYWdlO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBtYWtlUG9wdXAoKSB7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTmFtZSA9ICdwb3B1cFBhcmVudCc7XHJcblxyXG4gICAgICAgIHRoaXMuZGVsZXRlQnRuID0gdGhpcy5tYWtlRGVsZXRlQnRuKCk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZGVsZXRlQnRuKTtcclxuXHJcbiAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyID0gdGhpcy5tYWtlTWVzc2FnZUNvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLm1lc3NhZ2VDb250YWluZXIpO1xyXG5cclxuICAgICAgICB0aGlzLmFycm93ID0gdGhpcy5tYWtlQXJyb3coKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5hcnJvdyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VEZWxldGVCdG4oKSB7XHJcbiAgICAgICAgbGV0IGRlbGV0ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGRlbGV0ZUJ1dHRvbi5jbGFzc05hbWUgPSAnbWFya2VyRGVsZXRlQnV0dG9uJztcclxuICAgICAgICBkZWxldGVCdXR0b24uaW5uZXJIVE1MID0gJyYjMjE1Oyc7XHJcbiAgICAgICAgZGVsZXRlQnV0dG9uLnBvcHVwID0gdGhpcztcclxuICAgICAgICBkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRlbGV0ZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICByZXR1cm4gZGVsZXRlQnV0dG9uO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VNZXNzYWdlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIGxldCBtZXNzYWdlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgbWVzc2FnZUNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdtZXNzYWdlQ29udGFpbmVyJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLnN0eWxlLmNvbG9yID0gJ2JsYWNrJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLnBvcHVwID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbWVzc2FnZUNvbnRhaW5lcjtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQXJyb3coKSB7XHJcbiAgICAgICAgbGV0IGFycm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgYXJyb3cuY2xhc3NOYW1lID0gJ21hcmtlckFycm93JztcclxuXHJcbiAgICAgICAgbGV0IGlubmVyQXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBpbm5lckFycm93LmNsYXNzTmFtZSA9ICdtYXJrZXJJbm5lckFycm93JztcclxuICAgICAgICBhcnJvdy5hcHBlbmRDaGlsZChpbm5lckFycm93KTtcclxuICAgICAgICByZXR1cm4gYXJyb3c7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlUG9wdXAob3B0X21lc3NhZ2UsIG9wdF9zcFBvaW50LCBvcHRfYW5jaG9yT2Zmc2V0ID0gWzAsIDBdKSB7XHJcbiAgICByZXR1cm4gbmV3IE1ha2VQb3B1cChvcHRfbWVzc2FnZSwgb3B0X3NwUG9pbnQsIG9wdF9hbmNob3JPZmZzZXQpO1xyXG59XHJcbiIsImltcG9ydCB7QmFzZU1hcmtlckNsYXNzfSBmcm9tICcuL0Jhc2VNYXJrZXJfY2xhc3MnO1xyXG5pbXBvcnQge3RvUG9pbnR9IGZyb20gJy4vLi4vY29vcmRpbmF0ZV9tb2R1bGUnO1xyXG5pbXBvcnQge01ha2VQb3B1cH0gZnJvbSAnLi9NYXJrZXJQb3B1cF9jbGFzcyc7XHJcblxyXG5sZXQgX21hcmtlckNvdW50ZXIgPSAwO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1ha2VNYXJrZXIgZXh0ZW5kcyBCYXNlTWFya2VyQ2xhc3Mge1xyXG4gICAgY29uc3RydWN0b3IocF9zcFBvaW50LCBvcHRpb25zKSB7XHJcbiAgICAgICAgbGV0IF9vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBvZmZzZXQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgcG9wdXBBbmNob3I6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbWFya2VyRWxlbWVudDogTWFrZU1hcmtlci5wcm90b3R5cGUubWFrZU1hcmtlckVsZW1lbnQoKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBPYmplY3QuYXNzaWduKF9vcHRpb25zLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgc3VwZXIoX29wdGlvbnMubWFya2VyRWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IF9vcHRpb25zO1xyXG5cclxuICAgICAgICBwX3NwUG9pbnQgPSBwX3NwUG9pbnQgPyB0b1BvaW50KHBfc3BQb2ludCkgOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAocF9zcFBvaW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29vcmRzKHBfc3BQb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBvcHVwKG9wdF9odG1sLCBvcHRfb2Zmc2V0UG9pbnQpIHtcclxuICAgICAgICBsZXQgbWFya2VyID0gdGhpcztcclxuICAgICAgICBsZXQgb2Zmc2V0ID0gb3B0X29mZnNldFBvaW50IHx8IF9vcHRpb25zLnBvcHVwQW5jaG9yIHx8IFswLCAtMTAwXTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwID0gbmV3IE1ha2VQb3B1cChvcHRfaHRtbCwgbnVsbCwgb2Zmc2V0KVxyXG4gICAgICAgICAgICAuc2V0Q29vcmRzKG1hcmtlci5zdGF0ZVBsYW5lUG9pbnQpXHJcbiAgICAgICAgICAgIC5hZGRUb01hcChtYXJrZXIubWFwKTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwLm9uKCdkZWxldGUnLCBtYXJrZXIuZGVsZXRlLmJpbmQobWFya2VyKSk7XHJcblxyXG4gICAgICAgIG1hcmtlci5zaG93UG9wdXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKG1hcmtlci5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWFya2VyLnBvcHVwLmVsZW1lbnQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5wb3B1cC51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLnBvcHVwLmFkZFRvTWFwKG1hcmtlci5tYXApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbWFya2VyLm9uKCdhcHBlbmRlZFRvTWFwJywgZnVuY3Rpb24gX2ZuXyhlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLnNob3dQb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5vZmYoJ2FwcGVuZGVkVG9NYXAnLCBfZm5fKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbWFya2VyLmhpZGVQb3B1cCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBtYXJrZXIucG9wdXAuaGlkZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIG1hcmtlci5wb3B1cC5zaG93ID0gbWFya2VyLnNob3dQb3B1cDtcclxuXHJcbiAgICAgICAgbWFya2VyLnNldFBvcHVwTWVzc2FnZSA9IG1hcmtlci5wb3B1cC5zZXRNZXNzYWdlO1xyXG5cclxuICAgICAgICBtYXJrZXIuc2hvd1BvcHVwKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBtYXJrZXIucG9wdXA7XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZU1hcmtlckVsZW1lbnQoKSB7XHJcbiAgICAgICAgbGV0IG1hcmtlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgICAgIG1hcmtlci5jbGFzc05hbWUgPSAnbWFya2VyUGFyZW50Myc7XHJcbiAgICAgICAgbWFya2VyLnNyYyA9XHJcbiAgICAgICAgICAgICdodHRwczovL3VucGtnLmNvbS9sZWFmbGV0QDEuMy4xL2Rpc3QvaW1hZ2VzL21hcmtlci1pY29uLnBuZyc7XHJcblxyXG4gICAgICAgIG1hcmtlci5pZCA9ICdtYXJrZXJfJyArIF9tYXJrZXJDb3VudGVyKys7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IFB1dCB0aGlzIGluIGEgc3R5bGUgc2hlZXQuXHJcbiAgICAgICAgbWFya2VyLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICBtYXJrZXIuc3R5bGUubGVmdCA9ICctMTJweCc7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLmJvdHRvbSA9ICcwcHgnO1xyXG4gICAgICAgIG1hcmtlci5zdHlsZS5jb2xvciA9ICd3aGl0ZSc7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLmZvbnRTaXplID0gJzE1cHgnO1xyXG4gICAgICAgIG1hcmtlci5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNTBweCc7XHJcbiAgICAgICAgLy8gbWFya2VyLnN0eWxlLmxpbmVIZWlnaHQgPSAnMjBweCc7XHJcbiAgICAgICAgLy8gbWFya2VyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI2VhNDMzNVwiO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPVxyXG4gICAgICAgIC8vICAgICAgICd1cmwoXCJodHRwOi8vd3d3LnNub2NvLm9yZy9kb2NzL3Nhcy9waG90b3MvMDA1OS8wMDU5NTgwMDAwMzQwMFIwMTEuanBnXCIpJztcclxuICAgICAgICAvLyBtYXJrZXIuc3R5bGUuYm94U2hhZG93ID0gXCIwcHggMHB4IDBweCAxcHggcmdiKDI1NSwyNTUsMjU1KVwiO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5oZWlnaHQgPSBcIjIwcHhcIjtcclxuICAgICAgICAvLyBtYXJrZXIuc3R5bGUud2lkdGggPSBcIjIwcHhcIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIG1hcmtlcjtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNYXJrZXIocF9zcFBvaW50LCBvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gbmV3IE1ha2VNYXJrZXIoLi4uYXJndW1lbnRzKTtcclxufVxyXG4iXSwibmFtZXMiOlsidXRpbHMuQ1NTX1RSQU5TSVRJT04iLCJ1dGlscy5DU1NfVFJBTlNGT1JNIiwidXRpbHMuTU9VU0VfV0hFRUxfRVZUIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztJQUFPLE1BQU0sZ0JBQWdCLENBQUM7SUFDOUIsSUFBSSxXQUFXLEdBQUc7SUFDbEIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUM1QixLQUFLOztJQUVMLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0lBQ2pDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ3BELFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEMsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzs7SUFFbkUsUUFBUSxPQUFPLElBQUksQ0FBQztJQUNwQixLQUFLOztJQUVMLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0lBQ2xDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ3BELFlBQVksT0FBTyxLQUFLLENBQUM7SUFDekIsU0FBUztJQUNULFFBQVEsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7SUFFOUMsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtJQUNsRCxZQUFZLElBQUksUUFB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
