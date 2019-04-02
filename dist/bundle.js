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
            this.maxZoom = params.maxZoom || (this.zoomIndex && this.zoomIndex.length) || 24;
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
            let ary = this.prototype.init.initArr;
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
            let prevMidPoint = {
                x: (visibleExtent.X + visibleExtent.x) / 2,
                y: (visibleExtent.Y + visibleExtent.y) / 2,
            };

            mapContainer.height = this.parameters.container.clientHeight;
            mapContainer.width = this.parameters.container.clientWidth;
            mapContainer.left = containerRect.left;
            mapContainer.top = containerRect.top;

            mapContainer.element.style.height = mapContainer.height + 'px';
            mapContainer.element.style.width = mapContainer.width + 'px';

            this.updateVisExtentByHeightAndWidth(mapContainer.height, mapContainer.width);

            this.event.fire('updateContainerSize', this);

            if (doPanToMidPoint) {
                this.event.fire('panTo', prevMidPoint);
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

            this.markerContainer = this.makeContainer(document.createElement('div'));
            this.markerContainer.element.style.cssText = 'position: relative; z-index: 1000;';
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
        }

        createEventListeners() {
            let mapContEl = this.mapContainer.element;

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

            mapContEl.addEventListener('mouseup', e => this.eventDelgationHandler, false);
            mapContEl.addEventListener('mouseover', e => this.eventDelgationHandler, false);
            mapContEl.addEventListener('mouseout', e => this.eventDelgationHandler, false);
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
                if (!(parentElement._marker_obj && parentElement._marker_obj.fire)) {
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

                new_evt.scale = this.getResolution(this.zoom - _zoomAdder) / _resolution;

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

        getCenterCoords() {
            return {
                x: (this.extent.visible.x + this.extent.visible.X) / 2,

                y: (this.extent.visible.y + this.extent.visible.Y) / 2,
            };
        }
        calcZoomDelta(zoomLvl, zoomDelta, minZoom, maxZoom) {
            let zoomInLvl = zoomLvl + zoomDelta;
            let zoomOutLvl = zoomLvl - zoomDelta;

            return {
                maxDelta: zoomInLvl > maxZoom ? zoomDelta - (zoomInLvl - maxZoom) : zoomDelta,
                minDelta:
                    zoomOutLvl < minZoom ? zoomDelta + (zoomOutLvl - minZoom) : zoomDelta,
            };
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
        zoomTo,
        zoomInOut,
        enableZooming,
        disableZooming,
    });

    NewMap.onInitDone(function() {
        // Testing an idea about how to exend the init function.
        this.enableZooming();
    });

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

    function enableZooming() {
        this.event.on(MOUSE_WHEEL_EVT, p_evt => this.zoomInOut(p_evt), this);
    }

    function disableZooming() {
        this.event.off(MOUSE_WHEEL_EVT, p_evt => this.zoomInOut(p_evt), this);
    }

    NewMap.onInitDone(function() {
        // Testing an idea about how to exend the init function.
        let o = this.parameters.SVGZoom;

        if (o === undefined || o === true) {
            new ZoomCntrl_SVG(this);
        } else if (o !== false) {
            new ZoomCntrl_SVG(this, o.x, o.y, o.height, o.width);
        }
    });

    class Zoom_btn_base {
        constructor(elem) {
            this.ns = 'http://www.w3.org/2000/svg';

            this.element = this.makeGroup();

            this.active_color = 'blue';
            this.inactive_color = 'black';

            this.element.setAttribute('fill', this.inactive_color);

            this.addEventListeners();
        }

        addEventListeners() {
            this.element.addEventListener('mouseover', this.mousedown.bind(this));
            this.element.addEventListener('mouseout', this.mouseup.bind(this));
            // document.body.addEventListener('mouseup', this.mouseup.bind(this));
            return this;
        }

        makeGroup() {
            let group = document.createElementNS(this.ns, 'g');

            group._instance = this;

            return group;
        }

        setPos(x, y) {
            this.element.setAttribute('transform', `translate(${x}, ${y})`);
            return this;
        }

        mousedown() {
            this.element.setAttribute('fill', this.active_color);
            return this;
        }

        mouseup() {
            this.element.setAttribute('fill', this.inactive_color);
            return this;
        }
    }

    class Zoom_in_btn extends Zoom_btn_base {
        constructor() {
            super();
            this.makeBtn();
        }

        makeBtn() {
            this.rect = document.createElementNS(this.ns, 'rect');
            this.element.appendChild(this.rect);

            this.makeGraphic();

            this.element.appendChild(this.ns_line);
            this.element.appendChild(this.ew_line);
            return this;
        }

        makeGraphic() {
            this.ns_line = document.createElementNS(this.ns, 'line');
            this.ew_line = document.createElementNS(this.ns, 'line');

            this.ns_line.setAttribute('stroke', 'white');
            this.ew_line.setAttribute('stroke', 'white');
            return this;
        }

        setSize(height, width) {
            let box = {
                top: height * 0.3,
                right: width * 0.3,
                left: width * 0.7,
                bottom: height * 0.7,
            };

            this.rect.setAttribute('height', height);
            this.rect.setAttribute('width', width);

            this.ns_line.setAttribute('x1', width / 2);
            this.ns_line.setAttribute('y1', box.top);
            this.ns_line.setAttribute('x2', width / 2);
            this.ns_line.setAttribute('y2', box.bottom);

            this.ew_line.setAttribute('x1', box.left);
            this.ew_line.setAttribute('y1', height / 2);
            this.ew_line.setAttribute('x2', box.right);
            this.ew_line.setAttribute('y2', height / 2);
            return this;
        }
    }

    class Zoom_out_btn extends Zoom_btn_base {
        constructor() {
            super();
            this.makeBtn();
        }

        makeBtn() {
            this.rect = document.createElementNS(this.ns, 'rect');
            this.element.appendChild(this.rect);

            this.makeGraphic();

            this.element.appendChild(this.ew_line);
            return this;
        }

        makeGraphic() {
            this.ew_line = document.createElementNS(this.ns, 'line');
            this.ew_line.setAttribute('stroke', 'white');
            return this;
        }

        setSize(height, width) {
            let box = {
                right: width * 0.3,
                left: width * 0.7,
            };

            this.rect.setAttribute('height', height);
            this.rect.setAttribute('width', width);

            this.ew_line.setAttribute('x1', box.left);
            this.ew_line.setAttribute('y1', height / 2);
            this.ew_line.setAttribute('x2', box.right);
            this.ew_line.setAttribute('y2', height / 2);
            return this;
        }
    }

    class ZoomCntrl_SVG {
        constructor(map, x = 10, y = 10, height = 61, width = 31) {
            this.container = this.makeSVGContainer(height, width);
            this.zoomInBtn = new this.Zoom_in_btn();
            this.zoomOutBtn = new this.Zoom_out_btn();

            this.zoomInBtn.element._zoom_dir = 'in';
            this.zoomOutBtn.element._zoom_dir = 'out';

            this.container.appendChild(this.zoomInBtn.element);
            this.container.appendChild(this.zoomOutBtn.element);

            this.container.addEventListener('mousedown', this);
            this.container.addEventListener('mouseup', this);

            this.x = x;
            this.y = y;
            this.height = height;
            this.width = width;

            if (height && width) this.setSize(height, width);

            console.log(
                '[Zoom SVG Cntrl] TODO: Fix this.setPos. Currently zoom cntrl position is fixed.',
            );
            // TODO: Make setPos work.
            //if (x && y) this.setPos(x, y);

            if (map) this.addToMap(map);
        }

        addToMap(map) {
            if (map.zoomCtrl && map.zoomCtrl instanceof this.__proto__.constructor) {
                console.error('[Zoom SVG Control] Zoom control exists on this map.');
                return this;
            }

            this.map = map;

            map.addTo(this.container, map.mapContainer.element, () => {
                this.map.zoomCtrl = this;
                this.map.event.on('updateContainerSize', () => {
                    this.update(this.map);
                });
                this.update(this.map);
            });

            return this;
        }

        update(map) {
            let cont = map.mapContainer;
            let x = cont.width - this.width - 10;
            let y = cont.height - this.height - 20;

            this.setPos(x, y);

            return this;
        }

        makeSVGContainer(height, width) {
            let ns = 'http://www.w3.org/2000/svg';
            let el = document.createElementNS(ns, 'svg');

            el.style.width = width + 'px';
            el.style.height = height + 'px';
            el.style.position = 'absolute';

            return el;
        }

        setSize(height, width) {
            this.height = height || this.height || 0;
            this.width = width || this.width || 0;

            this.container.style.width = this.width + 'px';
            this.container.style.height = this.height + 2 + 'px';

            this.zoomInBtn.setSize(this.height / 2, this.width);
            this.zoomOutBtn.setSize(this.height / 2, this.width);
            this.zoomOutBtn.setPos(0, this.height / 2 + 2);

            if (this.map) {
                this.update(this.map);
            }

            return this;
        }

        setPos(x, y) {
            this.x = x || this.x || 0;
            this.y = y || this.y || 0;

            this.container.style.left = this.x + 'px';
            this.container.style.top = this.y + 'px';
            return this;
        }

        handleEvent(evt) {
            let el = evt.target;

            evt.stopImmediatePropagation();
            evt.stopPropagation();
            evt.preventDefault();

            for (var i = 0; ; i++) {
                if (el._zoom_dir) break;
                if (el === this.container) break;

                el = el.parentElement;
            }

            if (el === this.container) return;

            if (evt.type === 'mouseup' && evt.button == 0) {
                let center = this.map.getCenterCoords();

                if (el._zoom_dir == 'in') {
                    this.map.zoomTo(center, this.map.zoom + (evt.shiftKey ? 2 : 1));
                    return;
                }

                this.map.zoomTo(center, this.map.zoom - (evt.shiftKey ? 2 : 1));
            }
        }
    }

    ZoomCntrl_SVG.prototype.Zoom_in_btn = Zoom_in_btn;
    ZoomCntrl_SVG.prototype.Zoom_out_btn = Zoom_out_btn;

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
        updateVisExtentByHeightAndWidth,
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

    function updateVisExtentByHeightAndWidth(height_pixels, width_pixels) {
        let visibleExtent = this.extent.visible;
        let heightRatio = height_pixels / width_pixels;
        let resolution = width_pixels * this.getResolution(this.zoom);

        this.extent.visible = {
            x: visibleExtent.x,
            X: visibleExtent.x + resolution,
            y: visibleExtent.Y - resolution * heightRatio,
            Y: visibleExtent.Y,
        };
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

        this.mainContainer.element.style[CSS_TRANSITION] = '';

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
        mainCont.element.style[CSS_TRANSFORM] = 
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
        mainCont.element.style[CSS_TRANSFORM] =
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
                mainCont.element.style[CSS_TRANSITION] =
                    "all " + time + "ms cubic-bezier(0, 0, 0.25, 1)";

                mainCont.element.style[CSS_TRANSFORM] =
                    "translate3d(" + mainCont.left + "px," + mainCont.top + "px,0px)";
            }

        setTimeout(() => {
            mainCont.element.style[CSS_TRANSITION] = null;
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
                .style[CSS_TRANSITION] = "transform " + transistionDurationMS +
                "ms cubic-bezier(0, 0, 0.3, 1)";

        // prettier-ignore
        this.mainContainer.element
                .style[CSS_TRANSFORM] = "translate3d(" + finishPoint.x + "px," +
                finishPoint.y + "px, 0px)";

        // Reset transition.
        clearTimeout(this.pan.transitionResetTimeout);

        this.pan.transitionResetTimeout = setTimeout(
            function() {
                this.mainContainer.element.style[CSS_TRANSITION] = '';
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

        this.mainContainer.element.style[CSS_TRANSFORM] =
            'translate(' + x + 'px,' + y + 'px)';

        this.mainContainer.top = y;
        this.mainContainer.left = x;

        this.event.fire('stopPanAnimation');
    }

    function enablePanning() {
        this.event.on(MOUSE_WHEEL_EVT, this.panStopAnimation, this);
        this.event.on('mousedown', this.panMouseDown, this);
        this.event.on('panTo', this.panTo, this);
    }

    function disablePanning() {
        this.event.off(MOUSE_WHEEL_EVT, this.panStopAnimation, this);
        this.event.off('mousedown', this.panMouseDown, this);
        this.event.off('panTo', this.panTo, this);
    }

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

        this.disablePanning();

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

        this.enablePanning();

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

            elem.style.bottom = '0px';

            this.element = elem;

            this.offsetPos = {x: 0, y: 0};

            this.on('click', function(e) {
                e.stopPropagation();
            });

            this.on('mousedown', function(e) {
                e.stopPropagation();
            });

            this.on('appendedToMap', e => {
                this.map.event.on('zoom end', this._zoomEndCallback, this);
                this.map.event.on('update everything', this._zoomEndCallback, this);

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
                throw Error('Set coordinates before appending marker.');
            }

            this.map = arg_map;

            map.addTo(this.element, map.markerContainer.element, function(e) {
                thisMarker.fire('appendedToMap', e);
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
            this.map.event.off('map load end', this.updatePos, this);
            this.map.event.off('zoom end', this._zoomEndCallback, this);

            return this;
        }

        _zoomEndCallback(e) {
            var className = (e.css && e.css.className) || 'marker_zoom_transition';

            this.element.classList.add(className);

            this.updatePos();

            clearTimeout(this.zoomAnimTimer);
            this.zoomAnimTimer = setTimeout(
                this.element.classList.remove.bind(this.element.classList, className),
                350,
            );
        }

        delete() {
            this.hide();
            this.deleted = true;

            this.fire('delete', this);
            return this;
        }

        panIntoView() {
            if (!this.appendedToMap) {
                console.error(
                    this,
                    '<- That has to be added to a map before calling panIntoView().',
                );
                return this;
            }
            var mapCont = this.map.mapContainer;
            var rect = this.element.getBoundingClientRect();
            var padding = 5;
            var point = {x: 0, y: 0};

            if (rect.top < mapCont.top + 5) {
                point.y = mapCont.top - rect.top + 5;
            }

            if (rect.left < mapCont.left + padding) {
                point.x = mapCont.left - rect.left + padding;
            } else if (rect.left + rect.width > mapCont.left + mapCont.width - padding) {
                point.x = mapCont.left + mapCont.width - (rect.left + rect.width) - padding;
            }

            if (point.x || point.y) {
                this.map.panByPixels(point);
            }
        }

        updatePos() {
            if (!this.appendedToMap) {
                return this;
            }

            this.fire('preUpdatePos', this);

            var point = this.map.convertProjPointToOffsetPixelPoint(this.statePlanePoint);

            point.x = ~~(point.x + this.offsetPos.x);
            point.y = ~~(point.y + this.offsetPos.y);

            this.element.style[CSS_TRANSFORM] =
                'translate(' + point.x + 'px, ' + point.y + 'px)';

            this.fire('postUpdatePos', this);

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
            marker.src = 'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png';

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
    exports.Zoom_btn_base = Zoom_btn_base;
    exports.ZoomCntrl_SVG = ZoomCntrl_SVG;
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
    exports.BaseMarkerClass = BaseMarkerClass;
    exports.MakePopup = MakePopup;
    exports.makePopup = makePopup;
    exports.MakeMarker = MakeMarker;
    exports.makeMarker = makeMarker;

    Object.defineProperty(exports, '__esModule', { value: true });

    /* Fancy new Rollup.js outro! */ window.NewMap = exports;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9qYXZhc2NyaXB0L2NvcmUvQmFzaWNFdmVudFN5c3RlbV9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS91dGlscy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9NYWluX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL1pvb21fY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvWm9vbUNudHJsX3N2Z19jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9sYXllcnMvQmFzaWNMYXllcl9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9sYXllcnMvQXJjUmVuZGVyTGF5ZXJfY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvbGF5ZXJzL0FyY1hNTExheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2xheWVycy9CYXNlVGlsZUxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2xheWVycy9BcmNHSVNUaWxlTGF5ZXJfY2xhc3MuanMiLCIuLi9qYXZhc2NyaXB0L2NvcmUvbGF5ZXJzL1NwaGVyaWNhbE1lcmNhdG9yVGlsZUxheWVyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2Nvb3JkaW5hdGVfbW9kdWxlLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL3Bhbm5pbmdfbW9kdWxlLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL2JveFpvb21fbW9kdWxlLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL21hcmtlci9CYXNlTWFya2VyX2NsYXNzLmpzIiwiLi4vamF2YXNjcmlwdC9jb3JlL21hcmtlci9NYXJrZXJQb3B1cF9jbGFzcy5qcyIsIi4uL2phdmFzY3JpcHQvY29yZS9tYXJrZXIvTWFya2VyX2NsYXNzLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgb24ocF90eXBlLCBwX2Z1bmMsIG9wdF90aGlzKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmV2ZW50c09iai5oYXNPd25Qcm9wZXJ0eShwX3R5cGUpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0gPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0ucHVzaCh7Zm46IHBfZnVuYywgX3RoaXM6IG9wdF90aGlzfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIG9mZihwX3R5cGUsIHBfZnVuYywgb3B0X3RoaXMpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzT2JqLmhhc093blByb3BlcnR5KHBfdHlwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgZXZ0QXJyYXkgPSB0aGlzLmV2ZW50c09ialtwX3R5cGVdO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IGV2dEFycmF5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgIGlmIChldnRBcnJheVtuXS5mbiA9PT0gcF9mdW5jICYmIGV2dEFycmF5W25dLl90aGlzID09PSBvcHRfdGhpcykge1xyXG4gICAgICAgICAgICAgICAgZXZ0QXJyYXlbbl0uZm4gPSB0aGlzLl96b21iaWVGbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbGVhbihwX3R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIF96b21iaWVGbigpIHtcclxuICAgICAgICByZXR1cm4gJ1pvbWJpZSBjYWxsYmFjayB3b3JrcyByZWFsIGhhcmQuJztcclxuICAgIH1cclxuXHJcbiAgICBjbGVhbihwX3R5cGUpIHtcclxuICAgICAgICBpZiAodGhpcy5fZGVsWm9tYmllcykge1xyXG4gICAgICAgICAgICB0aGlzLl9kZWxab21iaWVzKHBfdHlwZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh0aGlzLmNsZWFuLmJpbmQodGhpcywgcF90eXBlKSwgMTAwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9kZWxab21iaWVzKHBfdHlwZSkge1xyXG4gICAgICAgIGlmICghdGhpcy5ldmVudHNPYmouaGFzT3duUHJvcGVydHkocF90eXBlKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IHRoaXMuZXZlbnRzT2JqW3BfdHlwZV0ubGVuZ3RoOyBuKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXZlbnRzT2JqW3BfdHlwZV1bbl0uZm4gPT09IHRoaXMuX3pvbWJpZUZuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50c09ialtwX3R5cGVdLnNwbGljZShuLCAxKTtcclxuICAgICAgICAgICAgICAgIC0tbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhbGxPZmYocF90aGlzKSB7XHJcbiAgICAgICAgdmFyIGV2dE9iaiA9IHRoaXMuZXZlbnRzT2JqO1xyXG4gICAgICAgIHZhciB0eXBlcyA9IE9iamVjdC5rZXlzKGV2dE9iaik7XHJcblxyXG4gICAgICAgIGZvciAodmFyIG0gPSAwOyBtIDwgdHlwZXMubGVuZ3RoOyBtKyspIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgbiA9IGV2dE9ialt0eXBlc1ttXV0ubGVuZ3RoIC0gMTsgbiA+PSAwOyBuLS0pIHtcclxuICAgICAgICAgICAgICAgIGlmIChldnRPYmpbdHlwZXNbbV1dW25dLl90aGlzID09PSBwX3RoaXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBldnRPYmpbdHlwZXNbbV1dW25dLmZuID0gdGhpcy5fem9tYmllRm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhbih0eXBlc1ttXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZmlyZShwX3R5cGUsIG9wdF9ldnQpIHtcclxuICAgICAgICBpZiAoIXRoaXMuZXZlbnRzT2JqLmhhc093blByb3BlcnR5KHBfdHlwZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGV2dEFycmF5ID0gdGhpcy5ldmVudHNPYmpbcF90eXBlXTtcclxuICAgICAgICBsZXQgcG9pbnRlclRvX2RlbFpvbWJpZXMgPSB0aGlzLl9kZWxab21iaWVzO1xyXG4gICAgICAgIHRoaXMuX2RlbFpvbWJpZXMgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBldnRBcnJheS5sZW5ndGg7IG4rKykge1xyXG4gICAgICAgICAgICBldnRBcnJheVtuXS5mbi5jYWxsKGV2dEFycmF5W25dLl90aGlzLCBvcHRfZXZ0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2RlbFpvbWJpZXMgPSBwb2ludGVyVG9fZGVsWm9tYmllcztcclxuICAgIH1cclxufVxyXG4iLCJleHBvcnQgZnVuY3Rpb24gc2ltcGxlTWVzc2FnZUJveChhcmdfaW5uZXJIVE1MLCBhcmdfaWQsIGFyZ193aWR0aCkge1xyXG4gICAgdmFyIG1lc3NhZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHJcbiAgICBtZXNzYWdlLmNsYXNzTmFtZSA9ICdzaW1wbGVNZXNzYWdlQm94JztcclxuXHJcbiAgICBtZXNzYWdlLnN0eWxlLndpZHRoID0gKGFyZ193aWR0aCAmJiBhcmdfd2lkdGggKyAncHgnKSB8fCAnMzAwcHgnO1xyXG4gICAgbWVzc2FnZS5zdHlsZS5sZWZ0ID1cclxuICAgICAgICB3aW5kb3cuaW5uZXJXaWR0aCAvIDIgLSAoKGFyZ193aWR0aCAmJiBhcmdfd2lkdGggLyAyKSB8fCAxNTApICsgJ3B4JztcclxuXHJcbiAgICBtZXNzYWdlLmlkID0gYXJnX2lkIHx8ICdzaW1wbGVfbWVzc2FnZV9ib3gnO1xyXG5cclxuICAgIG1lc3NhZ2UuaW5uZXJIVE1MID0gYXJnX2lubmVySFRNTDtcclxuXHJcbiAgICBtZXNzYWdlLm9uY2xpY2sgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB0aGlzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobWVzc2FnZSk7XHJcblxyXG4gICAgcmV0dXJuIG1lc3NhZ2U7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0ZXN0UHJvcChwcm9wcykge1xyXG4gICAgLy8gR290IHRoaXMgZnJvbSBsZWFmbGV0XHJcbiAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChwcm9wc1tpXSBpbiBzdHlsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJvcHNbaV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZXhwb3J0IGxldCBDU1NfVFJBTlNGT1JNID0gdGVzdFByb3AoW1xyXG4gICAgJ3RyYW5zZm9ybScsXHJcbiAgICAnV2Via2l0VHJhbnNmb3JtJyxcclxuICAgICdPVHJhbnNmb3JtJyxcclxuICAgICdNb3pUcmFuc2Zvcm0nLFxyXG4gICAgJ21zVHJhbnNmb3JtJyxcclxuXSk7XHJcbmV4cG9ydCBsZXQgQ1NTX1RSQU5TSVRJT04gPSB0ZXN0UHJvcChbXHJcbiAgICAndHJhbnNpdGlvbicsXHJcbiAgICAnV2Via2l0VHJhbnNpdGlvbicsXHJcbiAgICAnT1RyYW5zaXRpb24nLFxyXG4gICAgJ01velRyYW5zaXRpb24nLFxyXG4gICAgJ21zVHJhbnNpdGlvbicsXHJcbl0pO1xyXG5cclxuLy9odHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMvd2hlZWwjQnJvd3Nlcl9jb21wYXRpYmlsaXR5XHJcbmV4cG9ydCBsZXQgTU9VU0VfV0hFRUxfRVZUID1cclxuICAgICdvbndoZWVsJyBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgID8gJ3doZWVsJyAvLyBNb2Rlcm4gYnJvd3NlcnMgc3VwcG9ydCBcIndoZWVsXCJcclxuICAgICAgICA6IGRvY3VtZW50Lm9ubW91c2V3aGVlbCAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgPyAnbW91c2V3aGVlbCcgLy8gV2Via2l0IGFuZCBJRSBzdXBwb3J0IGF0IGxlYXN0IFwibW91c2V3aGVlbFwiXHJcbiAgICAgICAgOiAnRE9NTW91c2VTY3JvbGwnOyAvLyBsZXQncyBhc3N1bWUgdGhhdCByZW1haW5pbmcgYnJvd3NlcnMgYXJlIG9sZGVyIEZpcmVmb3hcclxuIiwiaW1wb3J0IHtCYXNpY0V2ZW50U3lzdGVtfSBmcm9tICcuL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3MnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOZXdNYXAgZXh0ZW5kcyBCYXNpY0V2ZW50U3lzdGVtIHtcclxuICAgIGNvbnN0cnVjdG9yKHNwUG9pbnQsIHBfem9vbSwgcGFyYW1ldGVycykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcclxuICAgICAgICB0aGlzLmluaXQoc3BQb2ludCwgcF96b29tKTtcclxuICAgIH1cclxuXHJcbiAgICBpbml0KHNwUG9pbnQsIHBfem9vbSkge1xyXG4gICAgICAgIHRoaXMuem9vbSA9IDA7XHJcblxyXG4gICAgICAgIGxldCBwYXJhbXMgPSB0aGlzLnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbUluZGV4ID0gcGFyYW1zLnpvb21JbmRleDtcclxuICAgICAgICB0aGlzLm1heFpvb20gPSBwYXJhbXMubWF4Wm9vbSB8fCAodGhpcy56b29tSW5kZXggJiYgdGhpcy56b29tSW5kZXgubGVuZ3RoKSB8fCAyNDtcclxuICAgICAgICB0aGlzLm1pblpvb20gPSBwYXJhbXMubWluWm9vbSB8fCAwO1xyXG4gICAgICAgIHRoaXMuem9vbURlbHRhID0gcGFyYW1zLnpvb21EZWx0YSB8fCAxO1xyXG5cclxuICAgICAgICB0aGlzLk1PVVNFX1dIRUVMX0VWVCA9IHV0aWxzLk1PVVNFX1dIRUVMX0VWVDtcclxuICAgICAgICB0aGlzLkNTU19UUkFOU0ZPUk0gPSB1dGlscy5DU1NfVFJBTlNGT1JNO1xyXG4gICAgICAgIHRoaXMuQ1NTX1RSQU5TSVRJT04gPSB1dGlscy5DU1NfVFJBTlNJVElPTjtcclxuXHJcbiAgICAgICAgdGhpcy5tYWtlQ29udGFpbmVycygpO1xyXG4gICAgICAgIHRoaXMubG9hZE1vZHVsZXMoKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZXh0ZW50ID0ge1xyXG4gICAgICAgICAgICB2aXNpYmxlOiB7fSxcclxuICAgICAgICAgICAgZnVsbDoge30sIC8vIFRPRE86IEN1cnJlbnRseSBub3QgdXNlZCBieSBhbnl0aGluZy5cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRlID0ge3pvb21pbmc6IGZhbHNlfTsgLy8gVG9kbzogRGVsZXRlIGV2ZW50dWFsbHkuXHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlQ29udGFpbmVyU2l6ZSgpOyAvLyBUb2RvOiBJcyB0aGlzIHRoZSBiZXN0IHdheT9cclxuXHJcbiAgICAgICAgaWYgKHNwUG9pbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRWaWV3KHNwUG9pbnQsIHBfem9vbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5pbml0LmluaXRBcnIpIHtcclxuICAgICAgICAgICAgbGV0IGFyeSA9IHRoaXMuaW5pdC5pbml0QXJyO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBhcnkubGVuZ3RoOyBuKyspIHtcclxuICAgICAgICAgICAgICAgIC8vIENhbGwgYWRkaXRpb25hbCBmdW5jdGlvbnMgYW4gZXh0ZW5zaW9uXHJcbiAgICAgICAgICAgICAgICAvLyBtaWdodCBoYXZlIGFkZGVkLlxyXG4gICAgICAgICAgICAgICAgYXJ5W25dLmZuLmNhbGwoYXJ5W25dLmN0eCB8fCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgb25Jbml0RG9uZShmbiwgY3R4KSB7XHJcbiAgICAgICAgLy8gVGVzdGluZyBhbiBpZGVhIGFib3V0IGhvdyB0byBleHRlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICAgICAgbGV0IGFyeSA9IHRoaXMucHJvdG90eXBlLmluaXQuaW5pdEFycjtcclxuICAgICAgICBpZiAoIWFyeSkge1xyXG4gICAgICAgICAgICBhcnkgPSB0aGlzLnByb3RvdHlwZS5pbml0LmluaXRBcnIgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXJ5LnB1c2goe2ZuLCBjdHh9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRWaWV3KHNwUG9pbnQsIHpvb20pIHtcclxuICAgICAgICBzcFBvaW50ID0gdGhpcy50b1BvaW50KHNwUG9pbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnpvb20gPSB6b29tO1xyXG5cclxuICAgICAgICBsZXQgaGVpZ2h0UmF0aW8gPSB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgLyB0aGlzLm1hcENvbnRhaW5lci53aWR0aDtcclxuICAgICAgICBsZXQgcmVzb2x1dGlvbiA9IHRoaXMubWFwQ29udGFpbmVyLndpZHRoICogdGhpcy5nZXRSZXNvbHV0aW9uKHpvb20pO1xyXG5cclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlID0ge1xyXG4gICAgICAgICAgICB4OiBzcFBvaW50LnggLSByZXNvbHV0aW9uIC8gMixcclxuICAgICAgICAgICAgWDogc3BQb2ludC54ICsgcmVzb2x1dGlvbiAvIDIsXHJcbiAgICAgICAgICAgIHk6IHNwUG9pbnQueSAtIChyZXNvbHV0aW9uIC8gMikgKiBoZWlnaHRSYXRpbyxcclxuICAgICAgICAgICAgWTogc3BQb2ludC55ICsgKHJlc29sdXRpb24gLyAyKSAqIGhlaWdodFJhdGlvLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5sb2FkZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ2xvYWRlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnQuZmlyZSgndXBkYXRlIGV2ZXJ5dGhpbmcnKTsgLy8gVG9kbzogTWF5YmUgdGhlIGV2ZW50IHNob3VsZCBiZSBcInNldHZpZXdcIj9cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ29udGFpbmVyU2l6ZShkb1BhblRvTWlkUG9pbnQpIHtcclxuICAgICAgICBsZXQgdmlzaWJsZUV4dGVudCA9IHRoaXMuZXh0ZW50LnZpc2libGU7XHJcbiAgICAgICAgbGV0IG1hcENvbnRhaW5lciA9IHRoaXMubWFwQ29udGFpbmVyO1xyXG4gICAgICAgIGxldCBjb250YWluZXJSZWN0ID0gbWFwQ29udGFpbmVyLmVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICAgICAgbGV0IHByZXZNaWRQb2ludCA9IHtcclxuICAgICAgICAgICAgeDogKHZpc2libGVFeHRlbnQuWCArIHZpc2libGVFeHRlbnQueCkgLyAyLFxyXG4gICAgICAgICAgICB5OiAodmlzaWJsZUV4dGVudC5ZICsgdmlzaWJsZUV4dGVudC55KSAvIDIsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbWFwQ29udGFpbmVyLmhlaWdodCA9IHRoaXMucGFyYW1ldGVycy5jb250YWluZXIuY2xpZW50SGVpZ2h0O1xyXG4gICAgICAgIG1hcENvbnRhaW5lci53aWR0aCA9IHRoaXMucGFyYW1ldGVycy5jb250YWluZXIuY2xpZW50V2lkdGg7XHJcbiAgICAgICAgbWFwQ29udGFpbmVyLmxlZnQgPSBjb250YWluZXJSZWN0LmxlZnQ7XHJcbiAgICAgICAgbWFwQ29udGFpbmVyLnRvcCA9IGNvbnRhaW5lclJlY3QudG9wO1xyXG5cclxuICAgICAgICBtYXBDb250YWluZXIuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBtYXBDb250YWluZXIuaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICBtYXBDb250YWluZXIuZWxlbWVudC5zdHlsZS53aWR0aCA9IG1hcENvbnRhaW5lci53aWR0aCArICdweCc7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlVmlzRXh0ZW50QnlIZWlnaHRBbmRXaWR0aChtYXBDb250YWluZXIuaGVpZ2h0LCBtYXBDb250YWluZXIud2lkdGgpO1xyXG5cclxuICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3VwZGF0ZUNvbnRhaW5lclNpemUnLCB0aGlzKTtcclxuXHJcbiAgICAgICAgaWYgKGRvUGFuVG9NaWRQb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLmV2ZW50LmZpcmUoJ3BhblRvJywgcHJldk1pZFBvaW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZUNvbnRhaW5lcnMoKSB7XHJcbiAgICAgICAgdGhpcy5tYXBDb250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID0gJ190aGVNYXBDb250YWluZXJfJztcclxuICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50LnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICAgICAncG9zaXRpb246IHJlbGF0aXZlOyBvdmVyZmxvdzogaGlkZGVuOyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsnO1xyXG5cclxuICAgICAgICB0aGlzLm1haW5Db250YWluZXIgPSB0aGlzLm1ha2VDb250YWluZXIoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpO1xyXG5cclxuICAgICAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAgICAgJ3Bvc2l0aW9uOiBhYnNvbHV0ZTsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTsgdHJhbnNmb3JtOiB0cmFuc2xhdGUzZCgwcHgsIDBweCwgMHB4KSBzY2FsZTNkKDEsMSwxKTsnO1xyXG5cclxuICAgICAgICB0aGlzLnN2Z0NvbnRhaW5lciA9IHRoaXMubWFrZUNvbnRhaW5lcihcclxuICAgICAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdzdmcnKSxcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMuc3ZnQ29udGFpbmVyLmVsZW1lbnQuc2V0QXR0cmlidXRlKFxyXG4gICAgICAgICAgICAneG1sbnM6eGxpbmsnLFxyXG4gICAgICAgICAgICAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsXHJcbiAgICAgICAgKTtcclxuICAgICAgICB0aGlzLnN2Z0NvbnRhaW5lci5lbGVtZW50LnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICAgICAgICAncG9zaXRpb246IGFic29sdXRlOyB0b3A6IDBweDsgbGVmdDogMHB4OyB3aWR0aDogMTAwMDAwMDBweDsgaGVpZ2h0OiAxMDAwMDBweDsgb3ZlcmZsb3c6IGhpZGRlbjsnO1xyXG5cclxuICAgICAgICB0aGlzLm1hcmtlckNvbnRhaW5lciA9IHRoaXMubWFrZUNvbnRhaW5lcihkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSk7XHJcbiAgICAgICAgdGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOiByZWxhdGl2ZTsgei1pbmRleDogMTAwMDsnO1xyXG4gICAgICAgIHRoaXMubWFya2VyQ29udGFpbmVyLmVsZW1lbnQuY2xhc3NOYW1lID0gJ19tYXJrZXJDb250YWluZXJfJztcclxuXHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zdmdDb250YWluZXIuZWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYXJrZXJDb250YWluZXIuZWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmFtZXRlcnMuY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQpO1xyXG4gICAgICAgIC8vIE1ha2UgYSB6b29tIHNsaWRlciBoZXJlP1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VDb250YWluZXIoZWwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAvLyBUb2RvIGZpbmlzaCB0aGlzIHRhc2suXHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsLFxyXG4gICAgICAgICAgICBsZWZ0OiBudWxsLFxyXG4gICAgICAgICAgICB0b3A6IG51bGwsXHJcbiAgICAgICAgICAgIHdpZHRoOiBudWxsLFxyXG4gICAgICAgICAgICBoZWlnaHQ6IG51bGwsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkTW9kdWxlcygpIHtcclxuICAgICAgICB0aGlzLmV2ZW50ID0gbmV3IEJhc2ljRXZlbnRTeXN0ZW0oKTsgLy8gVE9ETzogQ2hhbmdlIHRoaXMgaW4gZnV0dXJlO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZUV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIGxldCBtYXBDb250RWwgPSB0aGlzLm1hcENvbnRhaW5lci5lbGVtZW50O1xyXG5cclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgdGhpcy5NT1VTRV9XSEVFTF9FVlQsXHJcbiAgICAgICAgICAgIGV2dCA9PiB7XHJcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgX2V2dF8gPSB1bmRlZmluZWQ7IC8vIFRoaXMgaXMgbmVlZGVkIGZvciB0aGUgZGVsdGEuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgICAgICBldnQuX19fZGVsdGEgPSBldnQud2hlZWxEZWx0YVxyXG4gICAgICAgICAgICAgICAgICAgID8gZXZ0LndoZWVsRGVsdGFcclxuICAgICAgICAgICAgICAgICAgICA6IGV2dC5kZWx0YVkgLy8gTmV3aXNoIGZpcmVmb3g/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGV2dC5kZWx0YVkgKiAtMTIwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICgoX2V2dF8gPSB3aW5kb3cuZXZlbnQgfHwgZXZ0KSwgX2V2dF8uZGV0YWlsICogLTEyMCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZXZ0Ll9fX2RlbHRhID0gZXZ0Ll9fX2RlbHRhID4gMCA/IDEyMCA6IC0xMjA7IC8vIE5vcm1hbGl6ZSBkZWx0YS5cclxuXHJcbiAgICAgICAgICAgICAgICBldnQuem9vbURlbHRhID0gZXZ0Lnpvb21EZWx0YSB8fCB0aGlzLnpvb21EZWx0YTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihldnQsIHRoaXMuTU9VU0VfV0hFRUxfRVZUKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmFsc2UsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgbWFwQ29udEVsLmFkZEV2ZW50TGlzdGVuZXIoXHJcbiAgICAgICAgICAgICdtb3VzZWRvd24nLFxyXG4gICAgICAgICAgICBldnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy9sZXQgZXZ0ID0gZS5fX2V2ZW50X187XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGV2dC53aGljaCAhPT0gMSB8fCBldnQud2hpY2ggPT09IDAgLyp0b3VjaCovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChldnQuc2hpZnRLZXkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJveFpvb21fbW91c2VEb3duKGV2dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucGFuLm1vdXNlRG93blggPSBldnQuY2xpZW50WDsgLy8gQ2hlY2tlZCBpbiB0aGUgbW91c2UgY2xpY2sgbGlzdGVuZXIsIG9idmlvdXMgaGFjayBpcyBvYnZpb3VzLlxyXG4gICAgICAgICAgICAgICAgdGhpcy5wYW4ubW91c2VEb3duWSA9IGV2dC5jbGllbnRZOyAvLyBDaGVja2VkIGluIHRoZSBtb3VzZSBjbGljayBsaXN0ZW5lciwgb2J2aW91cyBoYWNrIGlzIG9idmlvdXMuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlcihldnQpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsIGZhbHNlKTtcclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdmVyJywgZSA9PiB0aGlzLmV2ZW50RGVsZ2F0aW9uSGFuZGxlciwgZmFsc2UpO1xyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIGUgPT4gdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIsIGZhbHNlKTtcclxuICAgICAgICBtYXBDb250RWwuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ21vdXNlbW92ZScsXHJcbiAgICAgICAgICAgIGUgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudERlbGdhdGlvbkhhbmRsZXIoZSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhbHNlLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIG1hcENvbnRFbC5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnY2xpY2snLFxyXG4gICAgICAgICAgICBlID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIHRvZG86IEZpbmQgYmV0dGVyIHdheSB0byBjaGVjayBpZiBpdCBpcyBcInNhZmVcIiB0byBjbGljay5cclxuICAgICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICAgICBlLmNsaWVudFkgPT09IHRoaXMucGFuLm1vdXNlRG93blkgJiZcclxuICAgICAgICAgICAgICAgICAgICBlLmNsaWVudFggPT09IHRoaXMucGFuLm1vdXNlRG93blhcclxuICAgICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWxzZSxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGV2ZW50RGVsZ2F0aW9uSGFuZGxlcihlLCB0eXBlKSB7XHJcbiAgICAgICAgdHlwZSA9IHR5cGUgfHwgZS50eXBlO1xyXG5cclxuICAgICAgICBsZXQgcGFyZW50RWxlbWVudCA9IGUudGFyZ2V0O1xyXG4gICAgICAgIGxldCBzdG9wUHJvcGFnYXR0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgbGV0IHBvaW50SW5Db250YWluZXIgPSBlLmNvbnRhaW5lclggJiYgZS5jb250YWluZXJZXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB7IHg6IGUuY29udGFpbmVyWCwgeTogZS5jb250YWluZXJZIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyKHsgeDogZS5jbGllbnRYLCB5OiBlLmNsaWVudFkgfSk7XHJcbiAgICAgICAgbGV0IG5ld19ldnQgPSB7XHJcbiAgICAgICAgICAgIF9fZXZlbnRfXzogZSxcclxuICAgICAgICAgICAgeDogcG9pbnRJbkNvbnRhaW5lci54LFxyXG4gICAgICAgICAgICB5OiBwb2ludEluQ29udGFpbmVyLnksXHJcbiAgICAgICAgICAgIGNzczogZS5jc3MsXHJcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXHJcbiAgICAgICAgICAgIHpvb21EZWx0YTogZS56b29tRGVsdGEgfHwgdGhpcy56b29tRGVsdGEsXHJcbiAgICAgICAgICAgIC8vcHJldmVudERlZmF1bHQ6IGUucHJldmVudERlZmF1bHQuYmluZChlKSxcclxuICAgICAgICAgICAgc3BQb2ludDogbnVsbCxcclxuICAgICAgICAgICAgc3RvcFByb3BhZ2F0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHN0b3BQcm9wYWdhdHRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdoaWxlIChwYXJlbnRFbGVtZW50ICYmIHBhcmVudEVsZW1lbnQgIT09IHRoaXMubWFwQ29udGFpbmVyLmVsZW1lbnQpIHtcclxuICAgICAgICAgICAgaWYgKCEocGFyZW50RWxlbWVudC5fbWFya2VyX29iaiAmJiBwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLmZpcmUpKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50ID0gcGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChwYXJlbnRFbGVtZW50Ll9tYXJrZXJfb2JqLnN0YXRlUGxhbmVQb2ludCkge1xyXG4gICAgICAgICAgICAgICAgbmV3X2V2dC5zcFBvaW50ID0gcGFyZW50RWxlbWVudC5fbWFya2VyX29iai5zdGF0ZVBsYW5lUG9pbnQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHBhcmVudEVsZW1lbnQuX21hcmtlcl9vYmouZmlyZSh0eXBlLCBuZXdfZXZ0KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzdG9wUHJvcGFnYXR0aW5nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHBhcmVudEVsZW1lbnQgPSBwYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZS5fX19kZWx0YSkge1xyXG4gICAgICAgICAgICAvLyBNYXAgaXMgem9vbWluZy5cclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHRoaXMuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ocG9pbnRJbkNvbnRhaW5lcik7IC8vIEhhbHRpbmcgcGFubmluZyBhbmltYXRpb24gY2hhbmdlcyBleHRlbnQuLlxyXG5cclxuICAgICAgICAgICAgbGV0IF96b29tRGVsdGEgPSB0aGlzLmNhbGNab29tRGVsdGEoXHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20sXHJcbiAgICAgICAgICAgICAgICBuZXdfZXZ0Lnpvb21EZWx0YSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWluWm9vbSxcclxuICAgICAgICAgICAgICAgIHRoaXMubWF4Wm9vbSxcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBfem9vbUFkZGVyID1cclxuICAgICAgICAgICAgICAgIGUuX19fZGVsdGEgPj0gMTIwID8gX3pvb21EZWx0YS5tYXhEZWx0YSA6IC1fem9vbURlbHRhLm1pbkRlbHRhO1xyXG5cclxuICAgICAgICAgICAgdGhpcy56b29tICs9IF96b29tQWRkZXI7XHJcblxyXG4gICAgICAgICAgICBsZXQgX3Jlc29sdXRpb24gPSB0aGlzLmdldFJlc29sdXRpb24odGhpcy56b29tKTtcclxuXHJcbiAgICAgICAgICAgIG5ld19ldnQuc2NhbGUgPSB0aGlzLmdldFJlc29sdXRpb24odGhpcy56b29tIC0gX3pvb21BZGRlcikgLyBfcmVzb2x1dGlvbjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzRXh0ZW50QnlPcmlnaW5BbmRSZXNvbHV0aW9uKFxyXG4gICAgICAgICAgICAgICAgbmV3X2V2dC5zcFBvaW50LFxyXG4gICAgICAgICAgICAgICAgbmV3X2V2dC5zY2FsZSxcclxuICAgICAgICAgICAgICAgIF9yZXNvbHV0aW9uLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5ld19ldnQuc3BQb2ludCA9IHRoaXMuc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24ocG9pbnRJbkNvbnRhaW5lcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmV2ZW50LmZpcmUodHlwZSwgbmV3X2V2dCk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG8oZWxlbWVudCwgcGFyZW50LCBjYWxsQmFjaykge1xyXG4gICAgICAgIGxldCBhcmdzID0gYXJndW1lbnRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zdGF0ZS5sb2FkZWQpIHtcclxuICAgICAgICAgICAgcGFyZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICBjYWxsQmFjaygpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnQub24oXHJcbiAgICAgICAgICAgICAgICAnbG9hZGVkJyxcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIF9mbl8oZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkVG8uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudC5vZmYoJ2xvYWRlZCcsIF9mbl8pO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRDZW50ZXJDb29yZHMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogKHRoaXMuZXh0ZW50LnZpc2libGUueCArIHRoaXMuZXh0ZW50LnZpc2libGUuWCkgLyAyLFxyXG5cclxuICAgICAgICAgICAgeTogKHRoaXMuZXh0ZW50LnZpc2libGUueSArIHRoaXMuZXh0ZW50LnZpc2libGUuWSkgLyAyLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBjYWxjWm9vbURlbHRhKHpvb21MdmwsIHpvb21EZWx0YSwgbWluWm9vbSwgbWF4Wm9vbSkge1xyXG4gICAgICAgIGxldCB6b29tSW5MdmwgPSB6b29tTHZsICsgem9vbURlbHRhO1xyXG4gICAgICAgIGxldCB6b29tT3V0THZsID0gem9vbUx2bCAtIHpvb21EZWx0YTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbWF4RGVsdGE6IHpvb21Jbkx2bCA+IG1heFpvb20gPyB6b29tRGVsdGEgLSAoem9vbUluTHZsIC0gbWF4Wm9vbSkgOiB6b29tRGVsdGEsXHJcbiAgICAgICAgICAgIG1pbkRlbHRhOlxyXG4gICAgICAgICAgICAgICAgem9vbU91dEx2bCA8IG1pblpvb20gPyB6b29tRGVsdGEgKyAoem9vbU91dEx2bCAtIG1pblpvb20pIDogem9vbURlbHRhLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn1cclxuIiwiaW1wb3J0IHtCYXNpY0V2ZW50U3lzdGVtfSBmcm9tICcuL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3MnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJhc2ljSW50ZXJhY3RpdmVFbGVtZW50IGV4dGVuZHMgQmFzaWNFdmVudFN5c3RlbSB7XHJcbiAgICBjb25zdHJ1Y3RvcihlbGVtKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtO1xyXG4gICAgICAgIHRoaXMuZGVsZXRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBlbGVtLl9tYXJrZXJfb2JqID0gdGhpcztcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHtOZXdNYXB9IGZyb20gJy4vTWFpbl9jbGFzcyc7XHJcblxyXG5PYmplY3QuYXNzaWduKE5ld01hcC5wcm90b3R5cGUsIHtcclxuICAgIHpvb21UbyxcclxuICAgIHpvb21Jbk91dCxcclxuICAgIGVuYWJsZVpvb21pbmcsXHJcbiAgICBkaXNhYmxlWm9vbWluZyxcclxufSk7XHJcblxyXG5OZXdNYXAub25Jbml0RG9uZShmdW5jdGlvbigpIHtcclxuICAgIC8vIFRlc3RpbmcgYW4gaWRlYSBhYm91dCBob3cgdG8gZXhlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICB0aGlzLmVuYWJsZVpvb21pbmcoKTtcclxufSk7XHJcblxyXG5mdW5jdGlvbiB6b29tVG8ocHJvalBvaW50LCB6b29tLCBwcm9qT3JpZ2luKSB7XHJcbiAgICBsZXQgY29udmVydFBvaW50ID0gdGhpcy5jb252ZXJ0UHJvalBvaW50VG9QaXhlbFBvaW50LmJpbmQodGhpcyk7XHJcbiAgICBsZXQgX3BvaW50ID0gY29udmVydFBvaW50KHByb2pQb2ludCk7XHJcbiAgICBsZXQgem9vbVNpZ24gPSB6b29tID4gdGhpcy56b29tID8gMSA6IC0xO1xyXG4gICAgbGV0IHpvb21EaWZmID0gem9vbSAtIHRoaXMuem9vbTtcclxuICAgIGxldCBzY2FsZSA9IDEgKyAxIC8gKDIgKiogem9vbURpZmYgLSAxKTtcclxuICAgIGxldCBjZW50ZXIgPSB7XHJcbiAgICAgICAgeDogdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyLFxyXG4gICAgICAgIHk6IHRoaXMubWFwQ29udGFpbmVyLmhlaWdodCAvIDIsXHJcbiAgICB9O1xyXG5cclxuICAgIGxldCBfb3JpZ2luID0gKHByb2pPcmlnaW4gJiYgY29udmVydFBvaW50KHByb2pPcmlnaW4pKSB8fCBjZW50ZXI7XHJcblxyXG4gICAgbGV0IGRpc3RhbmNlWCA9IF9wb2ludC54IC0gX29yaWdpbi54O1xyXG4gICAgbGV0IGRpc3RhbmNlWSA9IF9wb2ludC55IC0gX29yaWdpbi55O1xyXG4gICAgbGV0IHNpbU1vdXNlWCA9IF9vcmlnaW4ueCArIGRpc3RhbmNlWCAqIHNjYWxlO1xyXG4gICAgbGV0IHNpbU1vdXNlWSA9IF9vcmlnaW4ueSArIGRpc3RhbmNlWSAqIHNjYWxlO1xyXG5cclxuICAgIGlmICh6b29tID09PSB0aGlzLnpvb20pIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2ltdWxhdGUgYSBtb3VzZSB3aGVlbCBldmVudC5cclxuICAgIHRoaXMuZXZlbnREZWxnYXRpb25IYW5kbGVyKFxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29udGFpbmVyWDogc2ltTW91c2VYLFxyXG4gICAgICAgICAgICBjb250YWluZXJZOiBzaW1Nb3VzZVksXHJcbiAgICAgICAgICAgIF9fX2RlbHRhOiB6b29tU2lnbiAqIDEyMCxcclxuICAgICAgICAgICAgY3NzOiB7XHJcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6ICdlYXNlb3V0JyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgem9vbURlbHRhOiBNYXRoLmFicyh6b29tRGlmZiksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB1dGlscy5NT1VTRV9XSEVFTF9FVlQsXHJcbiAgICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB6b29tSW5PdXQocF9ldnQpIHtcclxuICAgIGlmIChwX2V2dC5zY2FsZSA9PT0gMSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5zdGF0ZS56b29taW5nID09PSB0cnVlKSB7XHJcbiAgICAgICAgdGhpcy5ldmVudC5maXJlKCd6b29tIGVuZCcsIHBfZXZ0KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zdGF0ZS56b29taW5nID0gdHJ1ZTtcclxuXHJcbiAgICB0aGlzLmV2ZW50LmZpcmUoJ3ByZXpvb20nLCBwX2V2dCk7XHJcbiAgICB0aGlzLmV2ZW50LmZpcmUoJ3pvb20gZW5kJywgcF9ldnQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbmFibGVab29taW5nKCkge1xyXG4gICAgdGhpcy5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHBfZXZ0ID0+IHRoaXMuem9vbUluT3V0KHBfZXZ0KSwgdGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc2FibGVab29taW5nKCkge1xyXG4gICAgdGhpcy5ldmVudC5vZmYodXRpbHMuTU9VU0VfV0hFRUxfRVZULCBwX2V2dCA9PiB0aGlzLnpvb21Jbk91dChwX2V2dCksIHRoaXMpO1xyXG59XHJcbiIsImltcG9ydCB7TmV3TWFwfSBmcm9tICcuL01haW5fY2xhc3MnO1xyXG5cclxuTmV3TWFwLm9uSW5pdERvbmUoZnVuY3Rpb24oKSB7XHJcbiAgICAvLyBUZXN0aW5nIGFuIGlkZWEgYWJvdXQgaG93IHRvIGV4ZW5kIHRoZSBpbml0IGZ1bmN0aW9uLlxyXG4gICAgbGV0IG8gPSB0aGlzLnBhcmFtZXRlcnMuU1ZHWm9vbTtcclxuXHJcbiAgICBpZiAobyA9PT0gdW5kZWZpbmVkIHx8IG8gPT09IHRydWUpIHtcclxuICAgICAgICBuZXcgWm9vbUNudHJsX1NWRyh0aGlzKTtcclxuICAgIH0gZWxzZSBpZiAobyAhPT0gZmFsc2UpIHtcclxuICAgICAgICBuZXcgWm9vbUNudHJsX1NWRyh0aGlzLCBvLngsIG8ueSwgby5oZWlnaHQsIG8ud2lkdGgpO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmV4cG9ydCBjbGFzcyBab29tX2J0bl9iYXNlIHtcclxuICAgIGNvbnN0cnVjdG9yKGVsZW0pIHtcclxuICAgICAgICB0aGlzLm5zID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJztcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50ID0gdGhpcy5tYWtlR3JvdXAoKTtcclxuXHJcbiAgICAgICAgdGhpcy5hY3RpdmVfY29sb3IgPSAnYmx1ZSc7XHJcbiAgICAgICAgdGhpcy5pbmFjdGl2ZV9jb2xvciA9ICdibGFjayc7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCB0aGlzLmluYWN0aXZlX2NvbG9yKTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZEV2ZW50TGlzdGVuZXJzKCkge1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW92ZXInLCB0aGlzLm1vdXNlZG93bi5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCB0aGlzLm1vdXNldXAuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgLy8gZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5tb3VzZXVwLmJpbmQodGhpcykpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VHcm91cCgpIHtcclxuICAgICAgICBsZXQgZ3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlModGhpcy5ucywgJ2cnKTtcclxuXHJcbiAgICAgICAgZ3JvdXAuX2luc3RhbmNlID0gdGhpcztcclxuXHJcbiAgICAgICAgcmV0dXJuIGdyb3VwO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFBvcyh4LCB5KSB7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSgndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSgke3h9LCAke3l9KWApO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93bigpIHtcclxuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCdmaWxsJywgdGhpcy5hY3RpdmVfY29sb3IpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1vdXNldXAoKSB7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSgnZmlsbCcsIHRoaXMuaW5hY3RpdmVfY29sb3IpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBab29tX2luX2J0biBleHRlbmRzIFpvb21fYnRuX2Jhc2Uge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1ha2VCdG4oKTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQnRuKCkge1xyXG4gICAgICAgIHRoaXMucmVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5zLCAncmVjdCcpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnJlY3QpO1xyXG5cclxuICAgICAgICB0aGlzLm1ha2VHcmFwaGljKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLm5zX2xpbmUpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmV3X2xpbmUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VHcmFwaGljKCkge1xyXG4gICAgICAgIHRoaXMubnNfbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5zLCAnbGluZScpO1xyXG4gICAgICAgIHRoaXMuZXdfbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5zLCAnbGluZScpO1xyXG5cclxuICAgICAgICB0aGlzLm5zX2xpbmUuc2V0QXR0cmlidXRlKCdzdHJva2UnLCAnd2hpdGUnKTtcclxuICAgICAgICB0aGlzLmV3X2xpbmUuc2V0QXR0cmlidXRlKCdzdHJva2UnLCAnd2hpdGUnKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzZXRTaXplKGhlaWdodCwgd2lkdGgpIHtcclxuICAgICAgICBsZXQgYm94ID0ge1xyXG4gICAgICAgICAgICB0b3A6IGhlaWdodCAqIDAuMyxcclxuICAgICAgICAgICAgcmlnaHQ6IHdpZHRoICogMC4zLFxyXG4gICAgICAgICAgICBsZWZ0OiB3aWR0aCAqIDAuNyxcclxuICAgICAgICAgICAgYm90dG9tOiBoZWlnaHQgKiAwLjcsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5yZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcclxuICAgICAgICB0aGlzLnJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcclxuXHJcbiAgICAgICAgdGhpcy5uc19saW5lLnNldEF0dHJpYnV0ZSgneDEnLCB3aWR0aCAvIDIpO1xyXG4gICAgICAgIHRoaXMubnNfbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgYm94LnRvcCk7XHJcbiAgICAgICAgdGhpcy5uc19saW5lLnNldEF0dHJpYnV0ZSgneDInLCB3aWR0aCAvIDIpO1xyXG4gICAgICAgIHRoaXMubnNfbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgYm94LmJvdHRvbSk7XHJcblxyXG4gICAgICAgIHRoaXMuZXdfbGluZS5zZXRBdHRyaWJ1dGUoJ3gxJywgYm94LmxlZnQpO1xyXG4gICAgICAgIHRoaXMuZXdfbGluZS5zZXRBdHRyaWJ1dGUoJ3kxJywgaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgdGhpcy5ld19saW5lLnNldEF0dHJpYnV0ZSgneDInLCBib3gucmlnaHQpO1xyXG4gICAgICAgIHRoaXMuZXdfbGluZS5zZXRBdHRyaWJ1dGUoJ3kyJywgaGVpZ2h0IC8gMik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFpvb21fb3V0X2J0biBleHRlbmRzIFpvb21fYnRuX2Jhc2Uge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm1ha2VCdG4oKTtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQnRuKCkge1xyXG4gICAgICAgIHRoaXMucmVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5zLCAncmVjdCcpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnJlY3QpO1xyXG5cclxuICAgICAgICB0aGlzLm1ha2VHcmFwaGljKCk7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmV3X2xpbmUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VHcmFwaGljKCkge1xyXG4gICAgICAgIHRoaXMuZXdfbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5zLCAnbGluZScpO1xyXG4gICAgICAgIHRoaXMuZXdfbGluZS5zZXRBdHRyaWJ1dGUoJ3N0cm9rZScsICd3aGl0ZScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFNpemUoaGVpZ2h0LCB3aWR0aCkge1xyXG4gICAgICAgIGxldCBib3ggPSB7XHJcbiAgICAgICAgICAgIHJpZ2h0OiB3aWR0aCAqIDAuMyxcclxuICAgICAgICAgICAgbGVmdDogd2lkdGggKiAwLjcsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5yZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KTtcclxuICAgICAgICB0aGlzLnJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKTtcclxuXHJcbiAgICAgICAgdGhpcy5ld19saW5lLnNldEF0dHJpYnV0ZSgneDEnLCBib3gubGVmdCk7XHJcbiAgICAgICAgdGhpcy5ld19saW5lLnNldEF0dHJpYnV0ZSgneTEnLCBoZWlnaHQgLyAyKTtcclxuICAgICAgICB0aGlzLmV3X2xpbmUuc2V0QXR0cmlidXRlKCd4MicsIGJveC5yaWdodCk7XHJcbiAgICAgICAgdGhpcy5ld19saW5lLnNldEF0dHJpYnV0ZSgneTInLCBoZWlnaHQgLyAyKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFpvb21DbnRybF9TVkcge1xyXG4gICAgY29uc3RydWN0b3IobWFwLCB4ID0gMTAsIHkgPSAxMCwgaGVpZ2h0ID0gNjEsIHdpZHRoID0gMzEpIHtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHRoaXMubWFrZVNWR0NvbnRhaW5lcihoZWlnaHQsIHdpZHRoKTtcclxuICAgICAgICB0aGlzLnpvb21JbkJ0biA9IG5ldyB0aGlzLlpvb21faW5fYnRuKCk7XHJcbiAgICAgICAgdGhpcy56b29tT3V0QnRuID0gbmV3IHRoaXMuWm9vbV9vdXRfYnRuKCk7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbUluQnRuLmVsZW1lbnQuX3pvb21fZGlyID0gJ2luJztcclxuICAgICAgICB0aGlzLnpvb21PdXRCdG4uZWxlbWVudC5fem9vbV9kaXIgPSAnb3V0JztcclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy56b29tSW5CdG4uZWxlbWVudCk7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy56b29tT3V0QnRuLmVsZW1lbnQpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzKTtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XHJcblxyXG4gICAgICAgIGlmIChoZWlnaHQgJiYgd2lkdGgpIHRoaXMuc2V0U2l6ZShoZWlnaHQsIHdpZHRoKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICdbWm9vbSBTVkcgQ250cmxdIFRPRE86IEZpeCB0aGlzLnNldFBvcy4gQ3VycmVudGx5IHpvb20gY250cmwgcG9zaXRpb24gaXMgZml4ZWQuJyxcclxuICAgICAgICApO1xyXG4gICAgICAgIC8vIFRPRE86IE1ha2Ugc2V0UG9zIHdvcmsuXHJcbiAgICAgICAgLy9pZiAoeCAmJiB5KSB0aGlzLnNldFBvcyh4LCB5KTtcclxuXHJcbiAgICAgICAgaWYgKG1hcCkgdGhpcy5hZGRUb01hcChtYXApO1xyXG4gICAgfVxyXG5cclxuICAgIGFkZFRvTWFwKG1hcCkge1xyXG4gICAgICAgIGlmIChtYXAuem9vbUN0cmwgJiYgbWFwLnpvb21DdHJsIGluc3RhbmNlb2YgdGhpcy5fX3Byb3RvX18uY29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1pvb20gU1ZHIENvbnRyb2xdIFpvb20gY29udHJvbCBleGlzdHMgb24gdGhpcyBtYXAuJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAgPSBtYXA7XHJcblxyXG4gICAgICAgIG1hcC5hZGRUbyh0aGlzLmNvbnRhaW5lciwgbWFwLm1hcENvbnRhaW5lci5lbGVtZW50LCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLnpvb21DdHJsID0gdGhpcztcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3VwZGF0ZUNvbnRhaW5lclNpemUnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLm1hcCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLm1hcCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZShtYXApIHtcclxuICAgICAgICBsZXQgY29udCA9IG1hcC5tYXBDb250YWluZXI7XHJcbiAgICAgICAgbGV0IHggPSBjb250LndpZHRoIC0gdGhpcy53aWR0aCAtIDEwO1xyXG4gICAgICAgIGxldCB5ID0gY29udC5oZWlnaHQgLSB0aGlzLmhlaWdodCAtIDIwO1xyXG5cclxuICAgICAgICB0aGlzLnNldFBvcyh4LCB5KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZVNWR0NvbnRhaW5lcihoZWlnaHQsIHdpZHRoKSB7XHJcbiAgICAgICAgbGV0IG5zID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJztcclxuICAgICAgICBsZXQgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdzdmcnKTtcclxuXHJcbiAgICAgICAgZWwuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XHJcbiAgICAgICAgZWwuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICBlbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcblxyXG4gICAgICAgIHJldHVybiBlbDtcclxuICAgIH1cclxuXHJcbiAgICBzZXRTaXplKGhlaWdodCwgd2lkdGgpIHtcclxuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmhlaWdodCB8fCAwO1xyXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aCB8fCB0aGlzLndpZHRoIHx8IDA7XHJcblxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLnN0eWxlLndpZHRoID0gdGhpcy53aWR0aCArICdweCc7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKyAyICsgJ3B4JztcclxuXHJcbiAgICAgICAgdGhpcy56b29tSW5CdG4uc2V0U2l6ZSh0aGlzLmhlaWdodCAvIDIsIHRoaXMud2lkdGgpO1xyXG4gICAgICAgIHRoaXMuem9vbU91dEJ0bi5zZXRTaXplKHRoaXMuaGVpZ2h0IC8gMiwgdGhpcy53aWR0aCk7XHJcbiAgICAgICAgdGhpcy56b29tT3V0QnRuLnNldFBvcygwLCB0aGlzLmhlaWdodCAvIDIgKyAyKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMubWFwKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKHRoaXMubWFwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFBvcyh4LCB5KSB7XHJcbiAgICAgICAgdGhpcy54ID0geCB8fCB0aGlzLnggfHwgMDtcclxuICAgICAgICB0aGlzLnkgPSB5IHx8IHRoaXMueSB8fCAwO1xyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5zdHlsZS5sZWZ0ID0gdGhpcy54ICsgJ3B4JztcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5zdHlsZS50b3AgPSB0aGlzLnkgKyAncHgnO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGhhbmRsZUV2ZW50KGV2dCkge1xyXG4gICAgICAgIGxldCBlbCA9IGV2dC50YXJnZXQ7XHJcblxyXG4gICAgICAgIGV2dC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyA7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoZWwuX3pvb21fZGlyKSBicmVhaztcclxuICAgICAgICAgICAgaWYgKGVsID09PSB0aGlzLmNvbnRhaW5lcikgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZWwgPT09IHRoaXMuY29udGFpbmVyKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmIChldnQudHlwZSA9PT0gJ21vdXNldXAnICYmIGV2dC5idXR0b24gPT0gMCkge1xyXG4gICAgICAgICAgICBsZXQgY2VudGVyID0gdGhpcy5tYXAuZ2V0Q2VudGVyQ29vcmRzKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoZWwuX3pvb21fZGlyID09ICdpbicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWFwLnpvb21UbyhjZW50ZXIsIHRoaXMubWFwLnpvb20gKyAoZXZ0LnNoaWZ0S2V5ID8gMiA6IDEpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5tYXAuem9vbVRvKGNlbnRlciwgdGhpcy5tYXAuem9vbSAtIChldnQuc2hpZnRLZXkgPyAyIDogMSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuWm9vbUNudHJsX1NWRy5wcm90b3R5cGUuWm9vbV9pbl9idG4gPSBab29tX2luX2J0bjtcclxuWm9vbUNudHJsX1NWRy5wcm90b3R5cGUuWm9vbV9vdXRfYnRuID0gWm9vbV9vdXRfYnRuO1xyXG4iLCJpbXBvcnQge0Jhc2ljRXZlbnRTeXN0ZW19IGZyb20gJy4uL0Jhc2ljRXZlbnRTeXN0ZW1fY2xhc3MnO1xyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzaWNMYXllciBleHRlbmRzIEJhc2ljRXZlbnRTeXN0ZW0ge1xyXG4gICAgY29uc3RydWN0b3IoaGlkZUR1cmluZ1pvb20pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMubWFwID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5oaWRlRHVyaW5nWm9vbSA9IGhpZGVEdXJpbmdab29tO1xyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHt4T2Zmc2V0OiAwLCB5T2Zmc2V0OiAwfTtcclxuICAgICAgICB0aGlzLnpvb21MdmwgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuem9vbVRpbWVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLnpvb21JbmRleCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy56b29tRW5kbXMgPSAyMDA7XHJcbiAgICAgICAgLy8gdGhpcy5mcmFjdGlvbk9mZnNldCA9IHsgeDogMCwgeTogMCB9OyBUT0RPOiBSZW1vdmUgdGhpcyB3aGVuZXZlci5cclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHt4OiAwLCB5OiAwfTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRab29tSW5kZXgoaW5kZXgpIHtcclxuICAgICAgICB0aGlzLnpvb21JbmRleCA9IGluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIHNldFppbmRleCh6SW5kZXgpIHtcclxuICAgICAgICB0aGlzLnpJbmRleCA9IHpJbmRleDtcclxuICAgIH1cclxuXHJcbiAgICBhZGRFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICBpZiAodGhpcy5oaWRlRHVyaW5nWm9vbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcclxuICAgICAgICAgICAgICAgIHV0aWxzLk1PVVNFX1dIRUVMX0VWVCxcclxuICAgICAgICAgICAgICAgIHRoaXMuX2hpZGVDb250YWluZXJEdXJpbmdNb3VzZVdoZWVsRXZ0LFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRoaXMuX21vdXNlV2hlZWxFdnQsIHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3VwZGF0ZUNvbnRhaW5lclNpemUnLCB0aGlzLnVwZGF0ZUNvbnRhaW5lciwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXHJcbiAgICAgICAgICAgICd1cGRhdGUgZXZlcnl0aGluZycsXHJcbiAgICAgICAgICAgIHRoaXMuZmlyZS5iaW5kKHRoaXMsICd1cGRhdGUgZXZlcnl0aGluZycpLFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMub24oJ3pvb20gZW5kJywgdGhpcy5fem9vbUVuZEV2dCwgdGhpcyk7XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZSgnYWRkIGV2ZW50IGxpc3RlbmVycycpO1xyXG4gICAgfVxyXG5cclxuICAgIF96b29tRW5kRXZ0KHBfZXZ0KSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuXHJcbiAgICAgICAgdGhpcy56b29tVGltZXIgPSBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICAoKSA9PiB0aGlzLmZpcmUoJ3pvb20gZGVsYXkgZW5kJywgcF9ldnQpLFxyXG4gICAgICAgICAgICB0aGlzLnpvb21FbmRtcyxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIF9oaWRlQ29udGFpbmVyRHVyaW5nTW91c2VXaGVlbEV2dCgpIHtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgdGhpcy5maXJlKCd6b29tIGVuZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIF9tb3VzZVdoZWVsRXZ0KHBfZXZ0KSB7XHJcbiAgICAgICAgLy8gbGV0IHBvaW50ID0geyB4OiBwX2V2dC54LCB5OiBwX2V2dC55IH07XHJcblxyXG4gICAgICAgIGlmIChwX2V2dC5zY2FsZSA9PT0gMSkge1xyXG4gICAgICAgICAgICBwX2V2dC5ub1pvb20gPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmZpcmUoJ3pvb20gZW5kJywgcF9ldnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocF9ldnQuX19ldmVudF9fLl9fX2RlbHRhID49IDEyMCkge1xyXG4gICAgICAgICAgICB0aGlzLnpvb21Jbk91dChwX2V2dCwgJ3pvb20gaW4nKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHBfZXZ0Ll9fZXZlbnRfXy5fX19kZWx0YSA8PSAtMTIwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbUluT3V0KHBfZXZ0LCAnem9vbSBvdXQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG8obWFwKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWFwID09PSBtYXApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTGF5ZXIgYWxyZWFkeSBhZGRlZCB0byBtYXAnLCB0aGlzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcCA9IG1hcDtcclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IHRoaXMuY3JlYXRlQ29udGFpbmVyKCk7XHJcbiAgICAgICAgdGhpcy5zZXRab29tSW5kZXgodGhpcy56b29tSW5kZXggfHwgdGhpcy5tYXAuem9vbUluZGV4KTtcclxuXHJcbiAgICAgICAgbWFwLmFkZFRvKHRoaXMuY29udGFpbmVyLmVsZW1lbnQsIG1hcC5tYWluQ29udGFpbmVyLmVsZW1lbnQsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgICAgICB0aGlzLmZpcmUoJ2FwcGVuZGVkIHRvIG1hcCcpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoKSB7XHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKFxyXG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdGhpcy5tYXAuZXZlbnQuYWxsT2ZmKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuZmlyZSgncmVtb3ZlJywgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICAvLyBUbyBiZSBpbXBsaW1lbnRlZCBieSBjbGFzc2VzIHRoYXQgZXh0ZW5kIHRoaXMgY2xhc3MuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIC8vIFRvIGJlIGltcGxpbWVudGVkIGJ5IGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBjbGFzcy5cclxuICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgXCJUaGUgbWV0aG9kICd1cGRhdGVDb250YWluZXInIGluIFwiICtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29uc3RydWN0b3IubmFtZSArXHJcbiAgICAgICAgICAgICAgICBcIiB3YXNuJ3QgaW1wbGltZW50ZWRcIixcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMuZmlyZSgndXBkYXRlIGV2ZXJ5dGhpbmcnKTtcclxuICAgIH1cclxuXHJcbiAgICBjcmVhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgbGV0IGNvbnQgPSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgICAgICBsZWZ0OiAwIC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgICAgICB0b3A6IDAgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcCxcclxuICAgICAgICAgICAgdXBkYXRlVHJhbnNmb3JtOiB1bmRlZmluZWQsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29udC51cGRhdGVUcmFuc2Zvcm0gPSB0aGlzLnVwZGF0ZUNvbnRhaW5lclRyYW5zZm9ybS5iaW5kKHtcclxuICAgICAgICAgICAgY29udGFpbmVyOiBjb250LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb250LmVsZW1lbnQuY2xhc3NOYW1lID0gJ190aWxlQ29udGFpbmVyXyc7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUubGVmdCA9ICcwcHgnO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS50b3AgPSAnMHB4JztcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gJzEwMCUnO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuICAgICAgICBjb250LmVsZW1lbnQuc3R5bGUuekluZGV4ID0gdGhpcy56SW5kZXg7XHJcbiAgICAgICAgY29udC5lbGVtZW50LnN0eWxlLmJhY2tmYWNlVmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xyXG4gICAgICAgIGNvbnQuZWxlbWVudC5zdHlsZS50cmFuc2Zvcm1PcmlnaW4gPSAndG9wIGxlZnQnO1xyXG5cclxuICAgICAgICByZXR1cm4gY29udDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXJUcmFuc2Zvcm0obGVmdCwgdG9wLCBzY2FsZSkge1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmxlZnQgPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLnRvcCA9IHRvcDtcclxuXHJcbiAgICAgICAgc2NhbGUgPSBzY2FsZSB8fCAxO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYHRyYW5zbGF0ZTNkKCR7bGVmdH1weCwgJHt0b3B9cHgsIDBweClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHtzY2FsZX0sICR7c2NhbGV9LCAxKWA7XHJcbiAgICB9XHJcblxyXG4gICAgc3dhcENvbnRhaW5lcihjaGlsZEVsZW1lbnQsIGRlbGF5KSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuXHJcbiAgICAgICAgbGV0IGNvbnROZXcgPSB0aGlzLmNyZWF0ZUNvbnRhaW5lcigpO1xyXG4gICAgICAgIGxldCBjb250T2xkID0gdGhpcy5jb250YWluZXI7XHJcblxyXG4gICAgICAgIGNvbnROZXcudXBkYXRlVHJhbnNmb3JtKGNvbnROZXcubGVmdCwgY29udE5ldy50b3AsIDEpO1xyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnROZXc7XHJcblxyXG4gICAgICAgIGlmIChjaGlsZEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZEVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5tYXAubWFpbkNvbnRhaW5lci5lbGVtZW50Lmluc2VydEJlZm9yZShcclxuICAgICAgICAgICAgY29udE5ldy5lbGVtZW50LFxyXG4gICAgICAgICAgICBjb250T2xkLmVsZW1lbnQsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAvLyBUb2RvOiBKdXN0IGZvciB0ZXN0aW5nIHB1cnBvc2VzLlxyXG4gICAgICAgIC8vIGlmIChjb250T2xkLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnKXtcclxuICAgICAgICAvLyBjb250T2xkLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xyXG4gICAgICAgIC8vIH1lbHNle1xyXG4gICAgICAgIC8vIGNvbnRPbGQuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICAvLyB9LCA1MDApO1xyXG5cclxuICAgICAgICBsZXQgZG9Td2FwID0gZSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzd2FwVGltZXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRvU3dhcCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRpbGVMb2FkTGlzdGVuZXIsIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vZmYoJ3RpbGUgbG9hZGVkJywgZG9Td2FwLCB0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb250T2xkLmVsZW1lbnQucGFyZW50RWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgY29udE9sZC5lbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoY29udE9sZC5lbGVtZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBzd2FwVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgZG9Td2FwKCk7XHJcbiAgICAgICAgfSwgZGVsYXkgfHwgNDUwKTtcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgICAgSW1taWRpYXRseSBzd2FwIHRoZSBjb250YWluZXJzIGlmIHRoZXJlIGlzIGEgbW91c2V3aGVlbFxyXG4gICAgICAgICAgICBldmVudCBiZWZvcmUgdGhlIHN3YXBUaW1lciBmaXJlcyBvZmYuXHJcbiAgICAgICAgKi9cclxuICAgICAgICB0aGlzLm1hcC5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIGRvU3dhcCwgdGhpcyk7XHJcblxyXG4gICAgICAgIGxldCBfX190aGF0ID0gdGhpcztcclxuICAgICAgICBmdW5jdGlvbiB0aWxlTG9hZExpc3RlbmVyKGUpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogdGVzdGluZ1xyXG4gICAgICAgICAgICBfX190aGF0Lm1hcC5ldmVudC5vZmYoXHJcbiAgICAgICAgICAgICAgICB1dGlscy5NT1VTRV9XSEVFTF9FVlQsXHJcbiAgICAgICAgICAgICAgICB0aWxlTG9hZExpc3RlbmVyLFxyXG4gICAgICAgICAgICAgICAgX19fdGhhdCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgc2V0VGltZW91dChcclxuICAgICAgICAgICAgICAgIF9fX3RoYXQubWFwLmV2ZW50Lm9uLmJpbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgX19fdGhhdC5tYXAuZXZlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgJ3RpbGUgbG9hZGVkJyxcclxuICAgICAgICAgICAgICAgICAgICBkb1N3YXAsXHJcbiAgICAgICAgICAgICAgICAgICAgX19fdGhhdCxcclxuICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICAxMDAsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB6b29tRW5kKGV2dCkge1xyXG4gICAgICAgIGlmIChldnQgJiYgZXZ0Lm5vWm9vbSAmJiB0aGlzLl9fem9vbSA9PT0gdGhpcy5tYXAuem9vbSkge1xyXG4gICAgICAgICAgICAvLyBIYWNrIHRvIHN0b3AgbGF5ZXIgZnJvbSB6b29taW5nIHBhc3QgaXQncyBsaW1pdHMuXHJcbiAgICAgICAgICAgIC8vdGhpcy5maXJlKFwidXBkYXRlIGV2ZXJ5dGhpbmdcIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLnpvb21PYmouaXNab29taW5nKSB7XHJcbiAgICAgICAgICAgIC8vIEZpcnN0IHRpbWUgY2FsbGluZyB6b29tRW5kIHNpbmNlIHN0YXJ0aW5nIHpvb21pbmcuXHJcbiAgICAgICAgICAgIHRoaXMuZmlyZSgncHJlIHpvb20gZW5kJywgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9fem9vbSA9IHRoaXMubWFwLnpvb207XHJcblxyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHt9O1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoJ3Bvc3Qgem9vbSBlbmQnKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRab29tT2JqKCkge1xyXG4gICAgICAgIHRoaXMuem9vbU9iaiA9IHtcclxuICAgICAgICAgICAgc2NhbGU6IDEsXHJcbiAgICAgICAgICAgIGlzWm9vbWluZzogZmFsc2UsXHJcbiAgICAgICAgICAgIHg6IHRoaXMuY29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgICAgIHk6IHRoaXMuY29udGFpbmVyLnRvcCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB6b29tSW5PdXQoZXZ0LCB6b29tRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuem9vbU9iai5pc1pvb21pbmcpIHtcclxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKFxyXG4gICAgICAgICAgICAgICAgdGhpcy5fem9vbUluT3V0LmJpbmQodGhpcywgZXZ0LCB6b29tRGlyZWN0aW9uKSxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LmNsYXNzTmFtZSA9XHJcbiAgICAgICAgICAgIChldnQuY3NzICYmIGV2dC5jc3MuY2xhc3NOYW1lKSB8fCAnc21vb3RoVHJhbnNpdGlvbic7XHJcblxyXG4gICAgICAgIHRoaXMucmVzZXRab29tT2JqKCk7XHJcblxyXG4gICAgICAgIHRoaXMuem9vbU9iai5pc1pvb21pbmcgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fem9vbUluT3V0LmJpbmQodGhpcywgZXZ0LCB6b29tRGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIF96b29tSW5PdXQoZXZ0LCB6b29tRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgbGV0IHpPYmogPSB0aGlzLnpvb21PYmo7XHJcbiAgICAgICAgbGV0IHNjYWxlID0gdGhpcy5nZXRTY2FsZSh6b29tRGlyZWN0aW9uLCBldnQuem9vbURlbHRhKTtcclxuXHJcbiAgICAgICAgek9iai5zY2FsZSAqPSBzY2FsZTtcclxuXHJcbiAgICAgICAgbGV0IF9vbGQgPSB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscztcclxuICAgICAgICBsZXQgX25ldyA9IHRoaXMudG9wTGVmdE9mVmlzaWJsZUV4dGVudFRvUHhscygpO1xyXG4gICAgICAgIF9uZXcueCA9IE1hdGguZmxvb3IoX25ldy54KTtcclxuICAgICAgICBfbmV3LnkgPSBNYXRoLmZsb29yKF9uZXcueSk7XHJcblxyXG4gICAgICAgIGxldCB4ID0gX29sZC54ICogek9iai5zY2FsZSAtIF9uZXcueCAtIHRoaXMubWFwLm1haW5Db250YWluZXIubGVmdDtcclxuICAgICAgICBsZXQgeSA9IF9vbGQueSAqIHpPYmouc2NhbGUgLSBfbmV3LnkgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcDtcclxuXHJcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICAgICBgdHJhbnNsYXRlM2QoJHsgeCB9cHgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHsgeSB9cHgsIDBweClcclxuICAgICAgICAgICAgICAgICAgICBzY2FsZTNkKCR7IHpPYmouc2NhbGUgfSwgJHsgek9iai5zY2FsZSB9LCAxKWA7XHJcblxyXG4gICAgICAgIHRoaXMuZmlyZSgnem9vbSBlbmQnLCBldnQpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBnZXRTY2FsZSh6b29tRGlyZWN0aW9uLCB6b29tRGVsdGEpIHtcclxuICAgICAgICBsZXQgZ2V0UmVzID0gdGhpcy5tYXAuZ2V0UmVzb2x1dGlvbi5iaW5kKHRoaXMubWFwKTtcclxuICAgICAgICBsZXQgc2NhbGUgPSAxO1xyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCB6b29tTHZsID0gdGhpcy5tYXAuem9vbSArICh6b29tRGlyZWN0aW9uID09PSBcInpvb20gaW5cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IC16b29tRGVsdGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB6b29tRGVsdGEpO1xyXG5cclxuICAgICAgICBzY2FsZSA9IGdldFJlcyh6b29tTHZsKSAvIGdldFJlcyh0aGlzLm1hcC56b29tKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNjYWxlO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7QmFzaWNMYXllcn0gZnJvbSAnLi9CYXNpY0xheWVyX2NsYXNzJztcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi4vdXRpbHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFyY1JlbmRlckxheWVyIGV4dGVuZHMgQmFzaWNMYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbWdVcmwsIHJlcVRlbXBsYXRlLCB6SW5kZXgsIGhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgc3VwZXIoaGlkZUR1cmluZ1pvb20pO1xyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3QgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0SW1nUmVxVXJsKGltZ1VybCk7XHJcbiAgICAgICAgdGhpcy5zZXRSZXFUZW1wbGF0ZShyZXFUZW1wbGF0ZSk7XHJcbiAgICAgICAgdGhpcy5yZXFJZCA9IDA7XHJcbiAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0WmluZGV4KHpJbmRleCk7XHJcblxyXG4gICAgICAgIHRoaXMub24oJ2FkZCBldmVudCBsaXN0ZW5lcnMnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24oJ2FwcGVuZGVkIHRvIG1hcCcsIHRoaXMudXBkYXRlLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbihcclxuICAgICAgICAgICAgICAgICd6b29tIGRlbGF5IGVuZCcsXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0VXBkYXRlVGltZXIuYmluZCh0aGlzLCAxMDAwKSxcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICB0aGlzLm9uKCBcInVwZGF0ZSBldmVyeXRoaW5nXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lci5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGhpcy5jYW5jZWxSZXF1ZXN0LCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3BhbiBpbml0aWFsJywgdGhpcy5jYW5jZWxSZXF1ZXN0LCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oXHJcbiAgICAgICAgICAgICAgICAncGFuIGVuZCcsXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0VXBkYXRlVGltZXIuYmluZCh0aGlzLCAxMDAwKSxcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLmV2ZW50Lm9uKCdzdG9wUGFuQW5pbWF0aW9uJywgdGhpcy5jYW5jZWxSZXF1ZXN0LCB0aGlzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjYW5jZWxSZXF1ZXN0KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmFqYXhSZXF1ZXN0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWpheFJlcXVlc3QuYWJvcnQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgaXNDdXJyZW50UmVxKGh0dHBSZXFPYmopIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hamF4UmVxdWVzdCA9PT0gaHR0cFJlcU9iaiA/IHRydWUgOiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBzdGFydFVwZGF0ZVRpbWVyKG1pbGxpc2Vjb25kcykge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnVwZGF0ZVRpbWVyKTtcclxuICAgICAgICB0aGlzLmNhbmNlbFJlcXVlc3QoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gc2V0VGltZW91dChcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgbWlsbGlzZWNvbmRzIHx8IDEwMDAsXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRJbWdSZXFVcmwoaW1nVXJsKSB7XHJcbiAgICAgICAgdGhpcy5pbWdSZXFVcmwgPSBpbWdVcmw7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0UmVxVGVtcGxhdGUodGVtcGxhdGUpIHtcclxuICAgICAgICB0aGlzLnJlcVRlbXBsYXRlID0gdGVtcGxhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZEh0dHBSZXEocmVxKSB7XHJcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmNhbmNlbFJlcXVlc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgICAgIHRoaXMuYWpheFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCAmJiB0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lmh0dHBSZXFPbmxvYWQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLmFqYXhSZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB0aGlzLmltZ1JlcVVybCwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKFxyXG4gICAgICAgICAgICAnQ29udGVudC10eXBlJyxcclxuICAgICAgICAgICAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5hamF4UmVxdWVzdC5zZW5kKHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgaHR0cFJlcU9ubG9hZChodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzQ3VycmVudFJlcShodHRwUmVxT2JqKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmZpcmUoJ2FqYXggbG9hZCcsIGh0dHBSZXFPYmopO1xyXG5cclxuICAgICAgICB2YXIgcGFyc2VkUmVzID0gSlNPTi5wYXJzZShodHRwUmVxT2JqLnJlc3BvbnNlVGV4dCk7XHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlVGhlSW1hZ2UocGFyc2VkUmVzLmhyZWYsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIGNyZWF0ZVRoZUltYWdlKGltZ1NyYywgaHR0cFJlcU9iaikge1xyXG4gICAgICAgIHZhciBuZXdNYXBJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICAgICAgICBuZXdNYXBJbWcuYWRkRXZlbnRMaXN0ZW5lcihcclxuICAgICAgICAgICAgJ2xvYWQnLFxyXG4gICAgICAgICAgICB0aGlzLm1hcExvYWRIYW5kbGVyLmJpbmQodGhpcywgbmV3TWFwSW1nLCBodHRwUmVxT2JqKSxcclxuICAgICAgICApO1xyXG4gICAgICAgIG5ld01hcEltZy5hZGRFdmVudExpc3RlbmVyKFxyXG4gICAgICAgICAgICAnZXJyb3InLFxyXG4gICAgICAgICAgICB0aGlzLm1hcEVycm9ySGFuZGxlci5iaW5kKHRoaXMsIG5ld01hcEltZywgaHR0cFJlcU9iaiksXHJcbiAgICAgICAgKTtcclxuICAgICAgICBuZXdNYXBJbWcuc3JjID0gaW1nU3JjO1xyXG4gICAgICAgIG5ld01hcEltZy5zdHlsZS56SW5kZXggPSAnMSc7XHJcbiAgICAgICAgbmV3TWFwSW1nLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICBuZXdNYXBJbWcuc3R5bGUuaW1hZ2VSZW5kZXJpbmcgPSAncGl4ZWxhdGVkJzsgLy8gVE9ETzogVGVzdCBvZiBuZXcgY3NzIGZlYXR1cmUgaW4gY2hyb21lLlxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoKSB7XHJcbiAgICAgICAgdmFyIG9iaiA9IHtcclxuICAgICAgICAgICAgLi4udGhpcy5tYXAuZXh0ZW50LnZpc2libGUsXHJcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLm1hcC5tYXBDb250YWluZXIud2lkdGgsXHJcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5tYXAubWFwQ29udGFpbmVyLmhlaWdodCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB2YXIgcmVxID0gZW5jb2RlVVJJKFxyXG4gICAgICAgICAgICB0aGlzLnJlcVRlbXBsYXRlLnJlcGxhY2UoL1xcJHsoLis/KX0vZywgZnVuY3Rpb24oYSwgbWF0Y2gpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvYmpbbWF0Y2hdO1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICApO1xyXG4gICAgICAgIC8vYGJib3g9JHtzcENvb3Jkcy54fSwke3NwQ29vcmRzLnl9LCR7c3BDb29yZHMuWH0sJHtzcENvb3Jkcy5ZfSZiYm94U1I9MTAyNzQ4JmxheWVycz1zaG93OjQmbGF5ZXJEZWZzPSZzaXplPSR7emVlTWFwLm1hcENvbnRhaW5lci53aWR0aH0sJHt6ZWVNYXAubWFwQ29udGFpbmVyXHJcbiAgICAgICAgLy8gICAgLmhlaWdodH0maW1hZ2VTUj0xMDI3NDgmZm9ybWF0PXBuZzgmdHJhbnNwYXJlbnQ9dHJ1ZSZkcGk9JnRpbWU9JmxheWVyVGltZU9wdGlvbnM9JmR5bmFtaWNMYXllcnM9JmdkYlZlcnNpb249Jm1hcFNjYWxlPSZmPXBqc29uYFxyXG4gICAgICAgIHRoaXMuc2VuZEh0dHBSZXEocmVxKTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgIH1cclxuXHJcbiAgICBtYXBMb2FkSGFuZGxlcihtYXBJbWcsIGh0dHBSZXFPYmopIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNDdXJyZW50UmVxKGh0dHBSZXFPYmopKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX196b29tID0gdGhpcy5tYXAuem9vbTtcclxuICAgICAgICB0aGlzLnpvb21PYmogPSB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5zd2FwQ29udGFpbmVyKG1hcEltZywgMCAvKm1pbGxpc2Vjb25kcyovKTtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCdtYXAgaW1nIGxvYWQnLCBodHRwUmVxT2JqKTtcclxuICAgIH1cclxuXHJcbiAgICBtYXBFcnJvckhhbmRsZXIobWFwSW1nLCBodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLCBtYXBJbWcsIGh0dHBSZXFPYmopO1xyXG4gICAgICAgIHRoaXMuZmlyZSgnbWFwIGltZyBlcnJvcicsIGh0dHBSZXFPYmopO1xyXG4gICAgfVxyXG5cclxuICAgIF96b29tSW5PdXQoZXZ0LCB6b29tRGlyZWN0aW9uKSB7XHJcbiAgICAgICAgbGV0IHpPYmogPSB0aGlzLnpvb21PYmo7XHJcbiAgICAgICAgbGV0IHNjYWxlID0gdGhpcy5nZXRTY2FsZSh6b29tRGlyZWN0aW9uLCBldnQuem9vbURlbHRhKTtcclxuICAgICAgICB6T2JqLnNjYWxlICo9IHNjYWxlO1xyXG5cclxuICAgICAgICBsZXQgbmV3UG9pbnQgPSB7XHJcbiAgICAgICAgICAgIHg6IGV2dC54IC0gdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0ICsgek9iai54LCAvLyBUaGlzIHdpbGwgc2V0IHRoZSBvcmlnaW4gdG8gMS8yIHRoZSBjZW50ZXI6IC0gdGhpcy5tYXAubWFwQ29udGFpbmVyLndpZHRoIC8gMjtcclxuICAgICAgICAgICAgeTogZXZ0LnkgLSB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcCArIHpPYmoueSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB6T2JqLnggPSB6T2JqLnggKyAoek9iai54IC0gKG5ld1BvaW50LnggLSB6T2JqLngpKSAqIChzY2FsZSAtIDEpO1xyXG4gICAgICAgIHpPYmoueSA9IHpPYmoueSArICh6T2JqLnkgLSAobmV3UG9pbnQueSAtIHpPYmoueSkpICogKHNjYWxlIC0gMSk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TRk9STV0gPVxyXG4gICAgICAgICAgICAgICAgICAgIGB0cmFuc2xhdGUzZCgkeyB6T2JqLnggfXB4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyB6T2JqLnkgfXB4LCAwcHgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlM2QoJHsgek9iai5zY2FsZSB9LCAkeyB6T2JqLnNjYWxlIH0sIDEpXHJcbiAgICAgICAgICAgICAgICAgICAgYDtcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCd6b29tIGVuZCcsIGV2dCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7QXJjUmVuZGVyTGF5ZXJ9IGZyb20gJy4vQXJjUmVuZGVyTGF5ZXJfY2xhc3MnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFyY1hNTExheWVyIGV4dGVuZHMgQXJjUmVuZGVyTGF5ZXIge1xyXG4gICAgY29uc3RydWN0b3IoaW1nVXJsLCB6SW5kZXgsIEFyY1hNTF9tb2R1bGUsIGhpZGVEdXJpbmdab29tKSB7XHJcbiAgICAgICAgc3VwZXIoaW1nVXJsLCBudWxsLCB6SW5kZXgsIGhpZGVEdXJpbmdab29tKTtcclxuXHJcbiAgICAgICAgdGhpcy5vbignYXBwZW5kZWQgdG8gbWFwJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1ha2VBcmNYTUwgPSBBcmNYTUxfbW9kdWxlKHRoaXMubWFwKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoKSB7XHJcbiAgICAgICAgbGV0IGV4dGVudCA9IHRoaXMubWFwLmV4dGVudC52aXNpYmxlO1xyXG4gICAgICAgIGxldCB4bWwgPSB0aGlzLm1ha2VBcmNYTUwubWFrZUFyY1hNTFJlcXVlc3QoXHJcbiAgICAgICAgICAgIGV4dGVudC54LFxyXG4gICAgICAgICAgICBleHRlbnQuWCxcclxuICAgICAgICAgICAgZXh0ZW50LnksXHJcbiAgICAgICAgICAgIGV4dGVudC5ZLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgbGV0IHJlcSA9XHJcbiAgICAgICAgICAgIHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQoJ0FyY1hNTFJlcXVlc3QnKSArXHJcbiAgICAgICAgICAgICc9JyArXHJcbiAgICAgICAgICAgIHdpbmRvdy5lbmNvZGVVUklDb21wb25lbnQoeG1sKTtcclxuICAgICAgICB0aGlzLnNlbmRIdHRwUmVxKHJlcSk7XHJcbiAgICB9XHJcblxyXG4gICAgaHR0cFJlcU9ubG9hZChodHRwUmVxT2JqKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzQ3VycmVudFJlcShodHRwUmVxT2JqKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgeG1sID0gLzxcXD94bWwuKj4vLmV4ZWMoaHR0cFJlcU9iai5yZXNwb25zZVRleHQpWzBdO1xyXG4gICAgICAgIGxldCBwYXJzZWRSZXMgPSBuZXcgRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKHhtbCwgJ2FwcGxpY2F0aW9uL3htbCcpO1xyXG4gICAgICAgIGxldCBvdXRwdXQgPSBwYXJzZWRSZXMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ09VVFBVVCcpO1xyXG4gICAgICAgIGxldCBocmVmID0gb3V0cHV0WzBdLmdldEF0dHJpYnV0ZSgndXJsJyk7XHJcblxyXG4gICAgICAgIHRoaXMuY3JlYXRlVGhlSW1hZ2UoaHJlZiwgaHR0cFJlcU9iaik7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnb29nbGVUb1N0YXRlKGxhdCwgbG9uKSB7XHJcbiAgICAvLyB0aGlzIGNvbnZlcnRzIGdvb2dsZSdzIHgseSBjb29yZGluYXRlcyB0byBzdGF0ZSBwbGFuZSBjb29yZGluYXRlcyB1c2VkIGJ5IHRoZSBnb3Zlcm5tZW50LlxyXG4gICAgLy8gRm9yIHNub2hvbWlzaCBjb3VudHkgb25seS5cclxuICAgIGxldCBtYXRoID0gTWF0aCxcclxuICAgICAgICB0ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHJobyA9IHVuZGVmaW5lZCxcclxuICAgICAgICB0aGV0YSA9IHVuZGVmaW5lZCxcclxuICAgICAgICB4ID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHkgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgbGF0ID0gbGF0ICogMC4wMTc0NTMyOTI1MjtcclxuICAgIGxvbiA9IGxvbiAqIDAuMDE3NDUzMjkyNTI7XHJcbiAgICB0ID1cclxuICAgICAgICBtYXRoLnNpbigwLjc4NTM5ODE2MzM5NzQ0ODMgLSBsYXQgLyAyKSAvXHJcbiAgICAgICAgbWF0aC5jb3MoMC43ODUzOTgxNjMzOTc0NDgzIC0gbGF0IC8gMik7XHJcbiAgICB0ID1cclxuICAgICAgICB0IC9cclxuICAgICAgICBtYXRoLnBvdyhcclxuICAgICAgICAgICAgKDEgLSAwLjA4MjI3MTg1NCAqIG1hdGguc2luKGxhdCkpIC9cclxuICAgICAgICAgICAgICAgICgxICsgMC4wODIyNzE4NTQgKiBtYXRoLnNpbihsYXQpKSxcclxuICAgICAgICAgICAgMC4wNDExMzU5MjcsXHJcbiAgICAgICAgKTtcclxuICAgIChyaG8gPSA2Mzc4MjA2LjQgKiAxLjgyOTcxNDM4NTIwNjE3NTUgKiBtYXRoLnBvdyh0LCAwLjc0NDUyMDMyODQ1MjkzNDMpKSxcclxuICAgICAgICAodGhldGEgPSAwLjc0NDUyMDMyODQ1MjkzNDMgKiAobG9uIC0gLTIuMTA4ODgxMzM1MTkxNikpLFxyXG4gICAgICAgICh4ID0gcmhvICogbWF0aC5zaW4odGhldGEpICsgNDk5OTk4Ljk4NDEwMTYzMjUpLFxyXG4gICAgICAgICh5ID0gNTg1Mzk1OC45NjM5Njc1NTIgLSByaG8gKiBtYXRoLmNvcyh0aGV0YSkpOyAvLyBtZXMgYWRkIHkwID9cclxuICAgIHggPSB4ICogMy4yODA4NDtcclxuICAgIHkgPSB5ICogMy4yODA4NDtcclxuICAgIHJldHVybiBbeSwgeF07XHJcbn1cclxuIiwiaW1wb3J0IHtCYXNpY0xheWVyfSBmcm9tICcuL0Jhc2ljTGF5ZXJfY2xhc3MnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJhc2VUaWxlTGF5ZXIgZXh0ZW5kcyBCYXNpY0xheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHNyYywgekluZGV4KSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9fem9vbSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy50aWxlU3JjID0gbnVsbDtcclxuICAgICAgICB0aGlzLnRpbGVTaXplID0gMjU2O1xyXG4gICAgICAgIHRoaXMudGlsZXNDYWNoZSA9IHt9O1xyXG4gICAgICAgIHRoaXMudGlsZUluZm8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMudGlsZUxvYWRPcmRlciA9IFtdO1xyXG4gICAgICAgIHRoaXMuZGVsVGlsZXNUaW1lciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5sdmxMb2FkVGltZSA9IHtzdGFydDogMCwgZmluaXNoOiAxfTtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHt4OiAwLCB5OiAwfTtcclxuICAgICAgICB0aGlzLm1ha2VUaWxlID0gbWFrZVRpbGU7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0WmluZGV4KHpJbmRleCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0VGlsZVNyYyhzcmMpO1xyXG5cclxuICAgICAgICB0aGlzLm9uKCdhZGQgZXZlbnQgbGlzdGVuZXJzJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm9uKCdhcHBlbmRlZCB0byBtYXAnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VUaWxlR3JpZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vbigndXBkYXRlIGV2ZXJ5dGhpbmcnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ha2VUaWxlR3JpZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFRpbGVzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3YXBDb250YWluZXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbUVuZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9uKCd6b29tIGRlbGF5IGVuZCcsIHRoaXMuem9vbUVuZCwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMub24oJ3ByZSB6b29tIGVuZCcsICgpID0+IHRoaXMuc3dhcENvbnRhaW5lcigpLCB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5vbigncG9zdCB6b29tIGVuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRUaWxlcygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbihcclxuICAgICAgICAgICAgICAgICdwYW4nLFxyXG4gICAgICAgICAgICAgICAgZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKChlLmNsaWVudFggKyBlLmNsaWVudFkpICUgNyA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBCZXR0ZXIgdGhyb3R0bGluZywgdGhpcyB3YXMganVzdCBhIHRob3VnaHQgZXhwZXJpbWVudC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3BhbiBpbml0aWFsJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuem9vbVRpbWVyKTtcclxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlbFRpbGVzVGltZXIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5tYXAuZXZlbnQub24oJ3BhbiBlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX196b29tICE9PSB0aGlzLm1hcC56b29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy56b29tRW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlbFRpbGVzVGltZXIgPSBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJIaWRkZW5UaWxlcy5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgICAgIDExMDAsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlSW5mbygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgXCJUaGUgbWV0aG9kICdnZXRUaWxlSW5mbycgaW4gXCIgK1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcclxuICAgICAgICAgICAgICAgIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuICdPdmVycmlkZSB0aGlzJztcclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlUHhscygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgXCJUaGUgbWV0aG9kICdnZXRUaWxlUHhscycgaW4gXCIgK1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICtcclxuICAgICAgICAgICAgICAgIFwiIHdhc24ndCBpbXBsaW1lbnRlZFwiLFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgcmV0dXJuICdPdmVycmlkZSB0aGlzJztcclxuICAgIH1cclxuXHJcbiAgICBzZXRUaWxlU3JjKHNyYykge1xyXG4gICAgICAgIHRoaXMudGlsZVNyYyA9IHNyYztcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVDb250YWluZXIoKSB7XHJcbiAgICAgICAgdGhpcy5tYWtlVGlsZUdyaWQoKTtcclxuICAgICAgICB0aGlzLnN3YXBDb250YWluZXIoKTtcclxuICAgICAgICB0aGlzLnJlc2V0VGlsZXMoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsZWFySGlkZGVuVGlsZXMoKSB7XHJcbiAgICAgICAgLy8gVE9ETzogVGhpcyBpcyBoYWNrLCB0aGluayBvZiBzb21ldGhpbmcgYmV0dGVyLlxyXG4gICAgICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXModGhpcy50aWxlc0NhY2hlKTtcclxuICAgICAgICBsZXQgbWFpblJlY3QgPSB0aGlzLm1hcC5tYXBDb250YWluZXIuZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBtYWluUmVjdC5YID0gbWFpblJlY3QueCArIG1haW5SZWN0LndpZHRoO1xyXG4gICAgICAgIG1haW5SZWN0LlkgPSBtYWluUmVjdC55ICsgbWFpblJlY3QuaGVpZ2h0O1xyXG5cclxuICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgbGV0IHRpbGUgPSB0aGlzLnRpbGVzQ2FjaGVba2V5XTtcclxuICAgICAgICAgICAgbGV0IHJlY3QgPSB0aWxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aWxlLmxvYWRlZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKCEocmVjdC54IDwgbWFpblJlY3QuWCAmJiByZWN0LnggKyByZWN0LndpZHRoID4gbWFpblJlY3QueCAmJlxyXG4gICAgICAgICAgICAgICAgcmVjdC55IDwgbWFpblJlY3QuWSAmJiByZWN0LnkgKyByZWN0LmhlaWdodCA+IG1haW5SZWN0LnkpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdGlsZS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRpbGUpO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGlsZXNDYWNoZVtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRUaWxlcygpIHtcclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscyA9IHRoaXMudG9wTGVmdE9mVmlzaWJsZUV4dGVudFRvUHhscygpO1xyXG5cclxuICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy54ID0gTWF0aC5mbG9vcihcclxuICAgICAgICAgICAgdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueCxcclxuICAgICAgICApO1xyXG4gICAgICAgIHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnkgPSBNYXRoLmZsb29yKFxyXG4gICAgICAgICAgICB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55LFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMudGlsZXNDYWNoZSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VUaWxlR3JpZCgpIHtcclxuICAgICAgICBsZXQgbnVtVGlsZXMgPSB7XHJcbiAgICAgICAgICAgIHg6IE1hdGguY2VpbCh0aGlzLm1hcC5tYXBDb250YWluZXIud2lkdGggLyB0aGlzLnRpbGVTaXplKSArIDEsXHJcbiAgICAgICAgICAgIHk6IE1hdGguY2VpbCh0aGlzLm1hcC5tYXBDb250YWluZXIuaGVpZ2h0IC8gdGhpcy50aWxlU2l6ZSkgKyAxLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBhcnkgPSBbXTtcclxuICAgICAgICBsZXQgdnJ5ID0gW107XHJcblxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IG51bVRpbGVzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8PSBudW1UaWxlcy55OyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGFyeS5wdXNoKHt4OiB4LCB5OiB5fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDw9IG51bVRpbGVzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8PSBudW1UaWxlcy55OyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh5ICUgMiA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZyeS5wdXNoKGFyeS5zcGxpY2UoMCwgMSlbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdnJ5LnB1c2goYXJ5LnNwbGljZSgtMSwgMSlbMF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRpbGVMb2FkT3JkZXIgPSB2cnk7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgbGV0IGdyaWRDZW50ZXIgPSB7XHJcbiAgICAgICAgICAgIHg6IG51bVRpbGVzLnggLyAyLFxyXG4gICAgICAgICAgICB5OiBudW1UaWxlcy55IC8gMlxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIHRoaXMudGlsZUxvYWRPcmRlciA9IGFyeS5zb3J0KChhLGIpID0+IHtcclxuICAgICAgICAgICAgLy8gQ29weSBsZWFmbGV0cyBpZGVhIGFuZCBoYXZlIHRoZSB0aWxlcyBzdGFydCBsb2FkaW5nIGZyb20gdGhlIGNlbnRlci4uXHJcbiAgICAgICAgICAgIGxldCBkaXN0QSA9IE1hdGguc3FydCgoZ3JpZENlbnRlci54IC0gYS54KSoqMiArIChncmlkQ2VudGVyLnkgLSBhLnkpKioyKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RCID0gTWF0aC5zcXJ0KChncmlkQ2VudGVyLnggLSBiLngpKioyICsgKGdyaWRDZW50ZXIueSAtIGIueSkqKjIpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGRpc3RCIC0gZGlzdEE7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgKi9cclxuICAgIH1cclxuXHJcbiAgICBjYWxjTHZsTG9hZFRpbWUoKSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZygodGhpcy5sdmxMb2FkVGltZS5maW5pc2ggLSB0aGlzLnRpbGVTdGFydCkpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubHZsTG9hZFRpbWUuZmluaXNoIC0gdGhpcy5sdmxMb2FkVGltZS5zdGFydCB8fCAwO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgc3JjT2JqID0geyd7en0nOiB0aGlzLl9fem9vbSwgJ3t5fSc6IG51bGwsICd7eH0nOiBudWxsfTtcclxuICAgICAgICBsZXQgc3JjWFlTdHJpbmcgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgbGV0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG4gICAgICAgIGxldCB0aWxlSW1nID0gbnVsbDtcclxuICAgICAgICBsZXQgdGlsZVggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgbGV0IHRpbGVZID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICB0aGlzLnRpbGVTdGFydCA9IERhdGUubm93KCk7XHJcblxyXG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgIGxldCBleHRlbnQgPSAodGhpcy56b29tSW5kZXggJiYgdGhpcy56b29tSW5kZXhbdGhpcy5fX3pvb21dICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnpvb21JbmRleFt0aGlzLl9fem9vbV0uZXh0ZW50KSB8fCB7fTtcclxuXHJcbiAgICAgICAgbGV0IHBhbkxlZnQgPSB0aGlzLmNvbnRhaW5lci5sZWZ0ICsgdGhpcy5tYXAubWFpbkNvbnRhaW5lci5sZWZ0O1xyXG4gICAgICAgIGxldCBwYW5Ub3AgPSB0aGlzLmNvbnRhaW5lci50b3AgKyB0aGlzLm1hcC5tYWluQ29udGFpbmVyLnRvcDtcclxuXHJcbiAgICAgICAgbGV0IHRvcExlZnRUaWxlID0ge1xyXG4gICAgICAgICAgICB4OiBNYXRoLmZsb29yKFxyXG4gICAgICAgICAgICAgICAgKHRoaXMudmlld1BvcnRUb3BMZWZ0V29ybGRQeGxzLnggLSBwYW5MZWZ0KSAvIHRoaXMudGlsZVNpemUsXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgIHk6IE1hdGguZmxvb3IoXHJcbiAgICAgICAgICAgICAgICAodGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueSAtIHBhblRvcCkgLyB0aGlzLnRpbGVTaXplLFxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCB0b3BMZWZ0VGlsZVB4bHMgPSB7XHJcbiAgICAgICAgICAgIHg6IHRvcExlZnRUaWxlLnggKiB0aGlzLnRpbGVTaXplIC0gdGhpcy52aWV3UG9ydFRvcExlZnRXb3JsZFB4bHMueCxcclxuICAgICAgICAgICAgeTogdG9wTGVmdFRpbGUueSAqIHRoaXMudGlsZVNpemUgLSB0aGlzLnZpZXdQb3J0VG9wTGVmdFdvcmxkUHhscy55LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAobGV0IG0gPSAwOyBtIDwgdGhpcy50aWxlTG9hZE9yZGVyLmxlbmd0aDsgbSsrKSB7XHJcbiAgICAgICAgICAgIHNyY09ialsne3h9J10gPSB0b3BMZWZ0VGlsZS54ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLng7XHJcbiAgICAgICAgICAgIHNyY09ialsne3l9J10gPSB0b3BMZWZ0VGlsZS55ICsgdGhpcy50aWxlTG9hZE9yZGVyW21dLnk7XHJcblxyXG4gICAgICAgICAgICBzcmNYWVN0cmluZyA9IHNyY09ialsne3h9J10gKyAnLCcgKyBzcmNPYmpbJ3t5fSddO1xyXG5cclxuICAgICAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbGVzQ2FjaGVbc3JjWFlTdHJpbmddIHx8XHJcbiAgICAgICAgICAgICAgICAoc3JjT2JqW1wie3h9XCJdIDwgZXh0ZW50LnggfHwgc3JjT2JqW1wie3h9XCJdID4gZXh0ZW50LlggfHxcclxuICAgICAgICAgICAgICAgICBzcmNPYmpbXCJ7eX1cIl0gPiBleHRlbnQuWSB8fCBzcmNPYmpbXCJ7eX1cIl0gPCBleHRlbnQueSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGlsZVggPSB0b3BMZWZ0VGlsZVB4bHMueCArIHRoaXMudGlsZUxvYWRPcmRlclttXS54ICogdGhpcy50aWxlU2l6ZTtcclxuICAgICAgICAgICAgdGlsZVkgPSB0b3BMZWZ0VGlsZVB4bHMueSArIHRoaXMudGlsZUxvYWRPcmRlclttXS55ICogdGhpcy50aWxlU2l6ZTtcclxuXHJcbiAgICAgICAgICAgIHRpbGVJbWcgPSB0aGlzLm1ha2VUaWxlKHtcclxuICAgICAgICAgICAgICAgIHg6IHRpbGVYLFxyXG4gICAgICAgICAgICAgICAgeTogdGlsZVksXHJcbiAgICAgICAgICAgICAgICBzcmM6IHRoaXMudGlsZVNyYy5yZXBsYWNlKC97Ln0vZywgYXJnID0+IHNyY09ialthcmddKSxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRpbGVzQ2FjaGVbc3JjWFlTdHJpbmddID0gdGlsZUltZztcclxuXHJcbiAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRpbGVJbWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb250YWluZXIuZWxlbWVudC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ha2VUaWxlKG9iaikge1xyXG4gICAgbGV0IHRpbGVJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICAgIHRpbGVJbWcuY2xhc3NOYW1lID0gJ3RpbGVJbWcnO1xyXG4gICAgLy90aWxlSW1nLnN0eWxlLmNzc1RleHQgPSBcInBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiBcIiArIHRpbGVZICsgXCJweDsgbGVmdDogXCIgKyB0aWxlWCArIFwicHg7IG9wYWNpdHk6IDA7XCI7XHJcbiAgICB0aWxlSW1nLnN0eWxlLmNzc1RleHQgPSAncG9zaXRpb246IGFic29sdXRlOyBvcGFjaXR5OiAwOyc7XHJcbiAgICB0aWxlSW1nLnN0eWxlLnRyYW5zZm9ybSA9XHJcbiAgICAgICAgJ3RyYW5zbGF0ZTNkKCcgKyBvYmoueCArICdweCwnICsgb2JqLnkgKyAncHgsIDBweCknO1xyXG4gICAgLy90aWxlSW1nLnN0eWxlLmJveFNoYWRvdyA9IFwiMHB4IDBweCAwcHggMXB4IHJlZFwiO1xyXG4gICAgdGlsZUltZy5vbmxvYWQgPSBtYWtlVGlsZU9uTG9hZDtcclxuICAgIHRpbGVJbWcub25lcnJvciA9IG1ha2VUaWxlT25FcnJvcjtcclxuICAgIHRpbGVJbWcuc3JjID0gb2JqLnNyYztcclxuXHJcbiAgICByZXR1cm4gdGlsZUltZztcclxufVxyXG5cclxuZnVuY3Rpb24gbWFrZVRpbGVPbkxvYWQoZSkge1xyXG4gICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xyXG4gICAgdGhpcy5zdHlsZS5vcGFjaXR5ID0gMTtcclxuICAgIC8vIF9fX3RoYXQudGlsZUZpbmlzaCA9IERhdGUubm93KCk7XHJcbiAgICAvLyBfX190aGF0Lm1hcC5ldmVudC5maXJlKCd0aWxlIGxvYWRlZCcsIHRoaXMpOy8vIFRvZG86IHRlc3RpbmcgdGhpcyBpZGVhLlxyXG59XHJcblxyXG5mdW5jdGlvbiBtYWtlVGlsZU9uRXJyb3IoZSkge1xyXG4gICAgY29uc29sZS5lcnJvcignVGlsZSBkaWQgbm90IGxvYWQnLCBlKTtcclxufVxyXG4iLCJpbXBvcnQge0Jhc2VUaWxlTGF5ZXJ9IGZyb20gJy4vQmFzZVRpbGVMYXllcl9jbGFzcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXJjR0lTVGlsZUxheWVyIGV4dGVuZHMgQmFzZVRpbGVMYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihzcmMsIHpJbmRleCkge1xyXG4gICAgICAgIHN1cGVyKHNyYywgekluZGV4KTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUaWxlSW5mbygpIHtcclxuICAgICAgICAvLyBPdmVycmlkZSB0aGlzIGZvciBXU0c4NC5cclxuICAgICAgICBsZXQgdmlzID0gdGhpcy5tYXAuZXh0ZW50LnZpc2libGU7XHJcbiAgICAgICAgbGV0IGNvcm5lciA9IHRoaXMuZ2V0Q29udGFpbmluZ0FyY1RpbGVDb29yZHModGhpcy5tYXAuem9vbSwge1xyXG4gICAgICAgICAgICB4OiB2aXMueCxcclxuICAgICAgICAgICAgeTogdmlzLlksXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBjb3JuZXI7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgcmV0dXJuOlxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICByb3c6IHVuZGVmaW5lZCwgLy8gVGlsZSBudW1iZXIgeCBjb29yZGluYXRlLlxyXG4gICAgICAgICAgICAgICAgY29sOiB1bmRlZmluZWQsIC8vIFRpbGUgbnVtYmVyIHkgY29vcmRpbmF0ZS5cclxuICAgICAgICAgICAgICAgIHNwWDogdW5kZWZpbmVkLCAvLyBUaWxlIHRvcCBsZWZ0IGNvcm5lciB4IGNvb3JkIGluIGRlZmF1bHQgY29vcmRpbmF0ZSBzeXN0ZW0gKHN0YXRlIHBsYW5lIG9yIFdTRzg0IHNoZXJpY2FsIG1lcmNhdG9yKVxyXG4gICAgICAgICAgICAgICAgc3BZOiB1bmRlZmluZWQgIC8vIFRpbGUgdG9wIGxlZnQgY29ybmVyIHkgY29vcmQgXCIgXCIgXCIuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAqL1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRpbGVQeGxzKHBvaW50KSB7XHJcbiAgICAgICAgLy8gT3ZlcnJpZGUgdGhpcyBmb3IgV1NHODQuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwLmNvbnZlcnRQcm9qUG9pbnRUb1BpeGVsUG9pbnQocG9pbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIGdldENvbnRhaW5pbmdBcmNUaWxlQ29vcmRzKHosIGIpIHtcclxuICAgICAgICBsZXQgZCA9IHt4OiAtMS4xNzEwNDNlOCwgeTogMS4zNzk0OThlOH07IC8vIFRoaXMgbmVlZHMgdG8gYmUgY2hhbmdlZC5cclxuICAgICAgICBsZXQgem9vbUkgPSB0aGlzLnpvb21JbmRleFt6XTtcclxuXHJcbiAgICAgICAgbGV0IGNvbFJvdyA9IHtcclxuICAgICAgICAgICAgcm93OiBNYXRoLmZsb29yKChkLnkgLSBiLnkpIC8gKHRoaXMudGlsZVNpemUgKiB6b29tSS5yZXNvbHV0aW9uKSksXHJcbiAgICAgICAgICAgIGNvbDogTWF0aC5mbG9vcigoYi54IC0gZC54KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkucmVzb2x1dGlvbikpLFxyXG4gICAgICAgICAgICBzcFg6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgc3BZOiB1bmRlZmluZWQsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29sUm93LnNwWCA9IGNvbFJvdy5jb2wgKiAodGhpcy50aWxlU2l6ZSAqIHpvb21JLnJlc29sdXRpb24pICsgZC54O1xyXG4gICAgICAgIGNvbFJvdy5zcFkgPSBkLnkgLSBjb2xSb3cucm93ICogKHRoaXMudGlsZVNpemUgKiB6b29tSS5yZXNvbHV0aW9uKTtcclxuICAgICAgICAvL2NvbFJvdy5wZXJjZW50WCA9IGNvbFJvdy5jb2wgLSAoYi54IC0gZC54KSAvICh0aGlzLnRpbGVTaXplICogem9vbUkuUmVzb2x1dGlvbik7XHJcbiAgICAgICAgLy9jb2xSb3cucGVyY2VudFkgPSBjb2xSb3cucm93IC0gKGQueSAtIGIueSkgLyAodGhpcy50aWxlU2l6ZSAqIHpvb21JLlJlc29sdXRpb24pO1xyXG5cclxuICAgICAgICByZXR1cm4gY29sUm93O1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7QmFzZVRpbGVMYXllcn0gZnJvbSAnLi9CYXNlVGlsZUxheWVyX2NsYXNzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTcGhlcmljYWxNZXJjYXRvclRpbGVMYXllciBleHRlbmRzIEJhc2VUaWxlTGF5ZXIge1xyXG4gICAgLy8gaHR0cHM6Ly9qc2Jpbi5jb20vamVoYXRpcGFndS82L2VkaXQ/aHRtbCxjc3MsanMsb3V0cHV0XHJcbiAgICBjb25zdHJ1Y3RvcihzcmMsIHpJbmRleCkge1xyXG4gICAgICAgIHN1cGVyKHNyYywgekluZGV4KTtcclxuICAgICAgICB0aGlzLmJvdW5kID0gMjAwMzc1MDguMzQyNzg5MjQ0OyAvLyBNYXRoLlBJICogcmFkaXVzIG9mIGVhcnRoXHJcbiAgICB9XHJcblxyXG4gICAgdG9wTGVmdE9mVmlzaWJsZUV4dGVudFRvUHhscyhvcHRfem9vbSkge1xyXG4gICAgICAgIC8vIFJldHVybnMgdG9wIGxlZnQgb2YgdGlsZSBpbiBzY3JlZW4gcGl4ZWwgY29vcmRzLCBzbyB0aGF0IGl0IGNhbiBiZSBzZWVuIG9uIHRoZSBtb25pdG9yLlxyXG4gICAgICAgIGxldCB2aXMgPSB0aGlzLm1hcC5leHRlbnQudmlzaWJsZTtcclxuICAgICAgICBsZXQgdmlzUG9pbnQgPSB7eDogdmlzLngsIHk6IHZpcy5ZfTtcclxuICAgICAgICBsZXQgY29udGFpbmVyQ29ybmVyID0gdGhpcy5nZXRQeGxzRnJvbVRvcExlZnRPcmlnaW4odmlzUG9pbnQsIG9wdF96b29tKTtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwic2ZkXCIsIGNvbnRhaW5lckNvcm5lcilcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiBjb250YWluZXJDb3JuZXIueCxcclxuICAgICAgICAgICAgeTogY29udGFpbmVyQ29ybmVyLnksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBnZXRQeGxzRnJvbVRvcExlZnRPcmlnaW4oc21Qb2ludCwgb3B0X3pvb20pIHtcclxuICAgICAgICAvLyBSZXR1cm5zIHBpeGVscyBmcm9tIDAsMCB0aWxlIG9yaWdpbiBha2EgdGhlIHRvcCBsZWZ0IG9mIHRoZSB3b3JsZC5cclxuICAgICAgICBsZXQgYm91bmQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7XHJcbiAgICAgICAgbGV0IHBpeGVscyA9XHJcbiAgICAgICAgICAgICh0aGlzLnRpbGVTaXplICogTWF0aC5wb3coMiwgb3B0X3pvb20gfHwgdGhpcy5tYXAuem9vbSkpIC8gMjtcclxuXHJcbiAgICAgICAgdmFyIHBvaW50WFJhdGlvID0gc21Qb2ludC54IC8gLWJvdW5kO1xyXG4gICAgICAgIHZhciBwb2ludFlSYXRpbyA9IHNtUG9pbnQueSAvIGJvdW5kO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiBwaXhlbHMgKiAoMSAtIHBvaW50WFJhdGlvKSxcclxuICAgICAgICAgICAgeTogcGl4ZWxzICogKDEgLSBwb2ludFlSYXRpbyksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gVHJhbnNmb3JtYXRpb24oYSwgYiwgYywgZCkge1xyXG4gICAgLy8gVHJhbnNmb3JtYXRpb24gY29uc3RydWN0b3IgY29waWVkIGZyb20gTGVhZmxldC5qc1xyXG5cclxuICAgIC8vIGlmIChVdGlsLmlzQXJyYXkoYSkpIHtcclxuICAgIC8vICAgICAvLyB1c2UgYXJyYXkgcHJvcGVydGllc1xyXG4gICAgLy8gICAgIHRoaXMuX2EgPSBhWzBdO1xyXG4gICAgLy8gICAgIHRoaXMuX2IgPSBhWzFdO1xyXG4gICAgLy8gICAgIHRoaXMuX2MgPSBhWzJdO1xyXG4gICAgLy8gICAgIHRoaXMuX2QgPSBhWzNdO1xyXG4gICAgLy8gICAgIHJldHVybjtcclxuICAgIC8vIH1cclxuICAgIHRoaXMuX2EgPSBhO1xyXG4gICAgdGhpcy5fYiA9IGI7XHJcbiAgICB0aGlzLl9jID0gYztcclxuICAgIHRoaXMuX2QgPSBkO1xyXG59XHJcblxyXG5UcmFuc2Zvcm1hdGlvbi5wcm90b3R5cGUgPSB7XHJcbiAgICAvLyBAbWV0aG9kIHRyYW5zZm9ybShwb2ludDogUG9pbnQsIHNjYWxlPzogTnVtYmVyKTogUG9pbnRcclxuICAgIC8vIFJldHVybnMgYSB0cmFuc2Zvcm1lZCBwb2ludCwgb3B0aW9uYWxseSBtdWx0aXBsaWVkIGJ5IHRoZSBnaXZlbiBzY2FsZS5cclxuICAgIC8vIE9ubHkgYWNjZXB0cyBhY3R1YWwgYEwuUG9pbnRgIGluc3RhbmNlcywgbm90IGFycmF5cy5cclxuICAgIHRyYW5zZm9ybTogZnVuY3Rpb24ocG9pbnQsIHNjYWxlKSB7XHJcbiAgICAgICAgLy8gKFBvaW50LCBOdW1iZXIpIC0+IFBvaW50XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybShwb2ludC5jbG9uZSgpLCBzY2FsZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIGRlc3RydWN0aXZlIHRyYW5zZm9ybSAoZmFzdGVyKVxyXG4gICAgX3RyYW5zZm9ybTogZnVuY3Rpb24ocG9pbnQsIHNjYWxlKSB7XHJcbiAgICAgICAgc2NhbGUgPSBzY2FsZSB8fCAxO1xyXG4gICAgICAgIHBvaW50LnggPSBzY2FsZSAqICh0aGlzLl9hICogcG9pbnQueCArIHRoaXMuX2IpO1xyXG4gICAgICAgIHBvaW50LnkgPSBzY2FsZSAqICh0aGlzLl9jICogcG9pbnQueSArIHRoaXMuX2QpO1xyXG4gICAgICAgIHJldHVybiBwb2ludDtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQG1ldGhvZCB1bnRyYW5zZm9ybShwb2ludDogUG9pbnQsIHNjYWxlPzogTnVtYmVyKTogUG9pbnRcclxuICAgIC8vIFJldHVybnMgdGhlIHJldmVyc2UgdHJhbnNmb3JtYXRpb24gb2YgdGhlIGdpdmVuIHBvaW50LCBvcHRpb25hbGx5IGRpdmlkZWRcclxuICAgIC8vIGJ5IHRoZSBnaXZlbiBzY2FsZS4gT25seSBhY2NlcHRzIGFjdHVhbCBgTC5Qb2ludGAgaW5zdGFuY2VzLCBub3QgYXJyYXlzLlxyXG4gICAgdW50cmFuc2Zvcm06IGZ1bmN0aW9uKHBvaW50LCBzY2FsZSkge1xyXG4gICAgICAgIHNjYWxlID0gc2NhbGUgfHwgMTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiAocG9pbnQueCAvIHNjYWxlIC0gdGhpcy5fYikgLyB0aGlzLl9hLFxyXG4gICAgICAgICAgICB5OiAocG9pbnQueSAvIHNjYWxlIC0gdGhpcy5fZCkgLyB0aGlzLl9jLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG59O1xyXG5cclxuZXhwb3J0IGxldCB0cmFuc2Zvcm1hdGlvbiA9IChmdW5jdGlvbigpIHtcclxuICAgIHZhciBzY2FsZSA9IDAuNSAvIChNYXRoLlBJICogNjM3ODEzNyk7XHJcbiAgICAvL2NvbnNvbGUubG9nKG5ldyBUcmFuc2Zvcm1hdGlvbihzY2FsZSwgMC41LCAtc2NhbGUsIDAuNSkpXHJcbiAgICByZXR1cm4gbmV3IFRyYW5zZm9ybWF0aW9uKHNjYWxlLCAwLjUsIC1zY2FsZSwgMC41KTtcclxufSkoKTtcclxuIiwiaW1wb3J0IHtOZXdNYXB9IGZyb20gJy4vTWFpbl9jbGFzcyc7XHJcbmltcG9ydCB7dHJhbnNmb3JtYXRpb259IGZyb20gJy4vbGF5ZXJzL1NwaGVyaWNhbE1lcmNhdG9yVGlsZUxheWVyX2NsYXNzLmpzJztcclxuXHJcbk9iamVjdC5hc3NpZ24oTmV3TWFwLnByb3RvdHlwZSwge1xyXG4gICAgdG9Qb2ludCxcclxuICAgIGNvbnZlcnRQcm9qUG9pbnRUb1BpeGVsUG9pbnQsXHJcbiAgICBjb252ZXJ0UHJvalBvaW50VG9PZmZzZXRQaXhlbFBvaW50LFxyXG4gICAgc2NyZWVuUG9pbnRUb1Byb2plY3Rpb24sXHJcbiAgICBjb252ZXJ0U1BUb1dHUzg0LFxyXG4gICAgY29udmVydFdHUzg0UHJvamVjdGlvblRvV0dTODRMYXRMb24sXHJcbiAgICBtaW51dGVzLFxyXG4gICAgdXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UsXHJcbiAgICB1cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlPcmlnaW4sXHJcbiAgICB1cGRhdGVWaXNFeHRlbnRCeU9yaWdpbkFuZFJlc29sdXRpb24sXHJcbiAgICB1cGRhdGVWaXNFeHRlbnRCeUhlaWdodEFuZFdpZHRoLFxyXG4gICAgZ2V0UGl4ZWxQb2ludEluTWFwQ29udGFpbmVyLFxyXG4gICAgZ2V0UGFuT2Zmc2V0UG9pbnQsXHJcbiAgICBkaXN0YW5jZUJldHdlZW4sXHJcbiAgICBjb252ZXJ0U1BUb1dHUzg0UHJvaixcclxuICAgIGdldFJlc29sdXRpb24sXHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRvUG9pbnQoeCwgeSkge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoeCkpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiB4WzBdLFxyXG4gICAgICAgICAgICB5OiB4WzFdLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBpZiAoeCA9PT0gT2JqZWN0KHgpKSB7XHJcbiAgICAgICAgLy9odHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy84NTExMjgxL2NoZWNrLWlmLWEtdmFsdWUtaXMtYW4tb2JqZWN0LWluLWphdmFzY3JpcHRcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiB4LnggfHwgeC5YLFxyXG4gICAgICAgICAgICB5OiB4LnkgfHwgeC5ZLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHgsXHJcbiAgICAgICAgeTogeSxcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbnZlcnRQcm9qUG9pbnRUb1BpeGVsUG9pbnQoc3BQb2ludCkge1xyXG4gICAgdmFyIHhSYXRpbyA9XHJcbiAgICAgICAgICAgIHRoaXMubWFwQ29udGFpbmVyLndpZHRoIC9cclxuICAgICAgICAgICAgKHRoaXMuZXh0ZW50LnZpc2libGUuWCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCksIC8vIEZvciBwYXRocy5cclxuICAgICAgICB5UmF0aW8gPVxyXG4gICAgICAgICAgICB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgL1xyXG4gICAgICAgICAgICAodGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55KTsgLy8gRm9yIHBhdGhzLlxyXG4gICAgLy92YXIgcmVzb2x1dGlvbiA9IHRoaXMuem9vbUluZGV4W3RoaXMuem9vbV0ucmVzb2x1dGlvbjtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKHhSYXRpbywgcmVzb2x1dGlvbiwgKHNwUG9pbnQueCAtIHRoaXMuZXh0ZW50LnZpc2libGUueCkgKiB4UmF0aW8pXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiAoc3BQb2ludC54IC0gdGhpcy5leHRlbnQudmlzaWJsZS54KSAqIHhSYXRpbyxcclxuICAgICAgICB5OiAodGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gc3BQb2ludC55KSAqIHlSYXRpbyxcclxuICAgIH07XHJcbn1cclxuICAgXHJcbmZ1bmN0aW9uIGNvbnZlcnRQcm9qUG9pbnRUb09mZnNldFBpeGVsUG9pbnQocG9pbnQpIHtcclxuICAgIHZhciBzY3JlZW5Qb2ludCA9IHRoaXMuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludChwb2ludCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBzY3JlZW5Qb2ludC54IC0gdGhpcy5tYWluQ29udGFpbmVyLmxlZnQsXHJcbiAgICAgICAgeTogc2NyZWVuUG9pbnQueSAtIHRoaXMubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzY3JlZW5Qb2ludFRvUHJvamVjdGlvbihwb2ludCkge1xyXG4gICAgdmFyIHNwV2lkdGggPSB0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLng7XHJcbiAgICB2YXIgc3BIZWlnaHQgPSB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSB0aGlzLmV4dGVudC52aXNpYmxlLnk7XHJcblxyXG4gICAgdmFyIG9yaWdpbkxSID0gcG9pbnQueCAvIHRoaXMubWFwQ29udGFpbmVyLndpZHRoO1xyXG4gICAgdmFyIG9yaWdpblRCID0gcG9pbnQueSAvIHRoaXMubWFwQ29udGFpbmVyLmhlaWdodDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHRoaXMuZXh0ZW50LnZpc2libGUueCArIHNwV2lkdGggKiBvcmlnaW5MUixcclxuICAgICAgICB5OiB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSBzcEhlaWdodCAqIG9yaWdpblRCLFxyXG4gICAgfTtcclxufVxyXG5cclxuLy8gQ29udmVydCBzdGF0ZSBwbGFuZSBjb29yZGluYXRlcyB0byB3Z3MgODQgY29vcmRpbmF0ZXMuLi5JJ20gZ3Vlc3NpbmcgYW55d2F5LCBub3Qgc3VyZS5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTUFRvV0dTODQoc3BQb2ludCkge1xyXG4gICAgdmFyIHVYID0gc3BQb2ludC54LFxyXG4gICAgICAgIHVZID0gc3BQb2ludC55O1xyXG4gICAgLy8gQ29waWVkIGZyb20gc2NvcGkhIEhvdyBhYm91dCB0aGF0IVxyXG4gICAgdmFyIHNxcnQgPSB3aW5kb3cuTWF0aC5zcXJ0LFxyXG4gICAgICAgIHBvdyA9IHdpbmRvdy5NYXRoLnBvdyxcclxuICAgICAgICBhdGFuID0gd2luZG93Lk1hdGguYXRhbixcclxuICAgICAgICBzaW4gPSB3aW5kb3cuTWF0aC5zaW4sXHJcbiAgICAgICAgYWJzID0gd2luZG93Lk1hdGguYWJzLFxyXG4gICAgICAgIHBhcnQxID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIHJobyA9IHVuZGVmaW5lZCxcclxuICAgICAgICB0aGV0YSA9IHVuZGVmaW5lZCxcclxuICAgICAgICB0eHkgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgbG9uID0gdW5kZWZpbmVkLFxyXG4gICAgICAgIGxhdDAgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgbGF0MSA9IHVuZGVmaW5lZCxcclxuICAgICAgICBMYXQgPSB1bmRlZmluZWQsXHJcbiAgICAgICAgTG9uID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIHVYID0gdVggLSAxNjQwNDE2LjY2NjY2NjY2NztcclxuICAgIHVZID0gdVkgLSAwO1xyXG4gICAgcmhvID0gc3FydChwb3codVgsIDIpICsgcG93KDE5MjA1MzA5Ljk2ODg4NDg0IC0gdVksIDIpKTtcclxuICAgIHRoZXRhID0gYXRhbih1WCAvICgxOTIwNTMwOS45Njg4ODQ4NCAtIHVZKSk7XHJcbiAgICB0eHkgPSBwb3cocmhvIC8gKDIwOTI1NjQ2LjAgKiAxLjgyOTc1MjEwODg4MjkyODUpLCAxIC8gMC43NDQ1MjAzMjY1NTQyOTM5KTtcclxuICAgIGxvbiA9IHRoZXRhIC8gMC43NDQ1MjAzMjY1NTQyOTM5ICsgLTIuMTA4OTM5NTEyODMzMzMyNjtcclxuICAgIHVYID0gdVggKyAxNjQwNDE2LjY2NjY2NjY2NztcclxuICAgIGxhdDAgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyICogYXRhbih0eHkpO1xyXG4gICAgcGFydDEgPSAoMSAtIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpIC8gKDEgKyAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKTtcclxuICAgIGxhdDEgPSAxLjU3MDc5NjMyNjc5NDg5NjYgLSAyICogYXRhbih0eHkgKiBwb3cocGFydDEsIDAuMDgxODE5MDU3ODIgLyAyKSk7XHJcbiAgICB3aGlsZSAoYWJzKGxhdDEgLSBsYXQwKSA+IDAuMDAwMDAwMDAyKSB7XHJcbiAgICAgICAgbGF0MCA9IGxhdDE7XHJcbiAgICAgICAgcGFydDEgPVxyXG4gICAgICAgICAgICAoMSAtIDAuMDgxODE5MDU3ODIgKiBzaW4obGF0MCkpIC8gKDEgKyAwLjA4MTgxOTA1NzgyICogc2luKGxhdDApKTtcclxuICAgICAgICBsYXQxID1cclxuICAgICAgICAgICAgMS41NzA3OTYzMjY3OTQ4OTY2IC0gMiAqIGF0YW4odHh5ICogcG93KHBhcnQxLCAwLjA4MTgxOTA1NzgyIC8gMikpO1xyXG4gICAgfVxyXG4gICAgTGF0ID0gbGF0MSAvIDAuMDE3NDUzMjkyNTI7XHJcbiAgICBMb24gPSBsb24gLyAwLjAxNzQ1MzI5MjUyO1xyXG4gICAgcmV0dXJuIHtsYXQ6IExhdCwgbG5nOiBMb259O1xyXG59XHJcblxyXG4vKlxyXG5mdW5jdGlvbiBjb252ZXJ0U1AodVgsIHVZKSB7XHJcbiAgICAvLyBDb3BpZWQgZnJvbSBTQ09QSSBmb3IgZnV0dXJlIHVzZS4gSGFzIG5vdCBiZWVuIG1vZGlmaWVkIGZyb20gU0NPUEkuXHJcblxyXG4gICAgLy89MjA5MjU2MDQuMDA7ICAgICAgICAgLy8gbWFqb3IgcmFkaXVzIG9mIGVsbGlwc29pZCwgbWFwIHVuaXRzIChOQUQgODMpIGluIGZlZXQ/XHJcbiAgICBhID0gMjA5MjU2NDYuMDsgLy8gc2VlIGh0dHA6Ly9kYnd3dy5lc3NjLnBzdS5lZHUvbGFzZG9jL292ZXJ2aWV3L2dlb21yZWcvYXBwZS5odG1sXHJcbiAgICAvLz0yMDkyNTYwNC40ODsgICAgICAgICAvLyBtb3JlIGFjY3VyYXRlID9cclxuICAgIC8vPTIwODU1NDg2LjU5OyAgICAgICAgIC8vIG1pbm9yIHJhZGl1c1xyXG4gICAgZWMgPSAwLjA4MTgxOTA1NzgyOyAvLyBlY2NlbnRyaWNpdHkgb2YgZWxsaXBzb2lkIChOQUQgODMpXHJcbiAgICAvLyA9IDAuMDA2Njk0MzQ5NjsgICAgICAvLyBzZWUgaHR0cDovL2Rid3d3LmVzc2MucHN1LmVkdS9sYXNkb2Mvb3ZlcnZpZXcvZ2VvbXJlZy9hcHBlLmh0bWxcclxuICAgIGFuZ1JhZCA9IDAuMDE3NDUzMjkyNTI7IC8vIG51bWJlciBvZiByYWRpYW5zIGluIGEgZGVncmVlXHJcbiAgICBwaTQgPSBNYXRoLlBJIC8gNDtcclxuICAgIC8vQm91bGRlciBDb3VudHksIENPXHJcbiAgICAvL3AwID0gMzkuMzMzMzMzICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2Ygb3JpZ2luXHJcbiAgICAvL3AxID0gMzkuNzE2NjY3ICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2YgZmlyc3Qgc3RhbmRhcmQgcGFyYWxsZWwgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1zb3V0aD8pXHJcbiAgICAvL3AyID0gNDAuNzgzMzMzICogYW5nUmFkOyAgLy8gbGF0aXR1ZGUgb2Ygc2Vjb25kIHN0YW5kYXJkIHBhcmFsbGVsICAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLW5vcnRoPylcclxuICAgIC8vbTAgPSAtMTA1LjUgKiBhbmdSYWQ7ICAgICAvLyBjZW50cmFsIG1lcmlkaWFuIChha2EgbG9uZ2l0dWRlIG9mIG9yaWdpbilcclxuICAgIC8veDAgPSAzMDAwMDAwLjAwMDAwMDsgICAgICAvLyBmYWxzZSBlYXN0aW5nIG9mIGNlbnRyYWwgbWVyaWRpYW4sIG1hcCB1bml0c1xyXG4gICAgLy95MCA9IDEwMDAwMDAuMDAwMDAwOyAgICAgIC8vIGZhbHNlIG5vcnRoaW5nXHJcbiAgICAvL1Nub2hvbWlzaCBDb3VudHksIFdBXHJcbiAgICBwMCA9IDQ3LjAgKiBhbmdSYWQ7IC8vIGxhdGl0dWRlIG9mIG9yaWdpblxyXG4gICAgcDEgPSA0Ny41ICogYW5nUmFkOyAvLyBsYXRpdHVkZSBvZiBmaXJzdCBzdGFuZGFyZCBwYXJhbGxlbCAoYWthIHN0YW5kYXJkIHBhcmFsbGVsLXNvdXRoPylcclxuICAgIHAyID0gNDguNzMzMzMzMzMzMzMzMzMgKiBhbmdSYWQ7IC8vIGxhdGl0dWRlIG9mIHNlY29uZCBzdGFuZGFyZCBwYXJhbGxlbCAgKGFrYSBzdGFuZGFyZCBwYXJhbGxlbC1ub3J0aD8pXHJcbiAgICBtMCA9IC0xMjAuODMzMzMzMzMzMzMzMyAqIGFuZ1JhZDsgLy8gY2VudHJhbCBtZXJpZGlhbiAoYWthIGxvbmdpdHVkZSBvZiBvcmlnaW4pXHJcbiAgICB4MCA9IDE2NDA0MTYuNjY2NjY2NjY3OyAvLyBmYWxzZSBlYXN0aW5nIG9mIGNlbnRyYWwgbWVyaWRpYW4sIG1hcCB1bml0c1xyXG4gICAgeTAgPSAwLjA7IC8vIGZhbHNlIG5vcnRoaW5nXHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBjb29yZGluYXRlIHN5c3RlbSBjb25zdGFudHMuXHJcbiAgICB3aXRoIChNYXRoKSB7XHJcbiAgICAgICAgbTEgPSBjb3MocDEpIC8gc3FydCgxIC0gcG93KGVjLCAyKSAqIHBvdyhzaW4ocDEpLCAyKSk7XHJcbiAgICAgICAgbTIgPSBjb3MocDIpIC8gc3FydCgxIC0gcG93KGVjLCAyKSAqIHBvdyhzaW4ocDIpLCAyKSk7XHJcbiAgICAgICAgdDAgPSB0YW4ocGk0IC0gcDAgLyAyKTtcclxuICAgICAgICB0MSA9IHRhbihwaTQgLSBwMSAvIDIpO1xyXG4gICAgICAgIHQyID0gdGFuKHBpNCAtIHAyIC8gMik7XHJcbiAgICAgICAgdDAgPSB0MCAvIHBvdygoMSAtIGVjICogc2luKHAwKSkgLyAoMSArIGVjICogc2luKHAwKSksIGVjIC8gMik7XHJcbiAgICAgICAgdDEgPSB0MSAvIHBvdygoMSAtIGVjICogc2luKHAxKSkgLyAoMSArIGVjICogc2luKHAxKSksIGVjIC8gMik7XHJcbiAgICAgICAgdDIgPSB0MiAvIHBvdygoMSAtIGVjICogc2luKHAyKSkgLyAoMSArIGVjICogc2luKHAyKSksIGVjIC8gMik7XHJcbiAgICAgICAgbiA9IGxvZyhtMSAvIG0yKSAvIGxvZyh0MSAvIHQyKTtcclxuICAgICAgICBmID0gbTEgLyAobiAqIHBvdyh0MSwgbikpO1xyXG4gICAgICAgIHJobzAgPSBhICogZiAqIHBvdyh0MCwgbik7XHJcblxyXG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGNvb3JkaW5hdGUgdG8gTGF0aXR1ZGUvTG9uZ2l0dWRlLlxyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIExvbmdpdHVkZS5cclxuICAgICAgICB1WCA9IHVYIC0geDA7XHJcbiAgICAgICAgdVkgPSB1WSAtIHkwOyAvLyBtZXMgYWRkZWQgZmFsc2Ugbm9ydGhpbmcgYXBwbGllcyBpbiAwNTAxICg/KVxyXG4gICAgICAgIHBpMiA9IHBpNCAqIDI7XHJcblxyXG4gICAgICAgIHJobyA9IHNxcnQocG93KHVYLCAyKSArIHBvdyhyaG8wIC0gdVksIDIpKTtcclxuICAgICAgICB0aGV0YSA9IGF0YW4odVggLyAocmhvMCAtIHVZKSk7XHJcbiAgICAgICAgdHh5ID0gcG93KHJobyAvIChhICogZiksIDEgLyBuKTtcclxuICAgICAgICBsb24gPSB0aGV0YSAvIG4gKyBtMDtcclxuICAgICAgICB1WCA9IHVYICsgeDA7XHJcblxyXG4gICAgICAgIC8vIEVzdGltYXRlIHRoZSBMYXRpdHVkZVxyXG4gICAgICAgIGxhdDAgPSBwaTIgLSAyICogYXRhbih0eHkpO1xyXG5cclxuICAgICAgICAvLyBTdWJzdGl0dXRlIHRoZSBlc3RpbWF0ZSBpbnRvIHRoZSBpdGVyYXRpdmUgY2FsY3VsYXRpb24gdGhhdFxyXG4gICAgICAgIC8vIGNvbnZlcmdlcyBvbiB0aGUgY29ycmVjdCBMYXRpdHVkZSB2YWx1ZS5cclxuICAgICAgICBwYXJ0MSA9ICgxIC0gZWMgKiBzaW4obGF0MCkpIC8gKDEgKyBlYyAqIHNpbihsYXQwKSk7XHJcbiAgICAgICAgbGF0MSA9IHBpMiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgZWMgLyAyKSk7XHJcblxyXG4gICAgICAgIHdoaWxlIChhYnMobGF0MSAtIGxhdDApID4gMC4wMDAwMDAwMDIpIHtcclxuICAgICAgICAgICAgbGF0MCA9IGxhdDE7XHJcbiAgICAgICAgICAgIHBhcnQxID0gKDEgLSBlYyAqIHNpbihsYXQwKSkgLyAoMSArIGVjICogc2luKGxhdDApKTtcclxuICAgICAgICAgICAgbGF0MSA9IHBpMiAtIDIgKiBhdGFuKHR4eSAqIHBvdyhwYXJ0MSwgZWMgLyAyKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDb252ZXJ0IGZyb20gcmFkaWFucyB0byBkZWdyZWVzLlxyXG4gICAgICAgIExhdCA9IGxhdDEgLyBhbmdSYWQ7XHJcbiAgICAgICAgTG9uID0gbG9uIC8gYW5nUmFkO1xyXG5cclxuICAgICAgICAvL3R1cm4gXCIgICBMb25naXR1ZGU6IFwiK0xvbitcIiAgIExhdGl0dWRlOiBcIitMYXQ7XHJcbiAgICAgICAgcmV0dXJuIFwiTGF0aXR1ZGU6IFwiICsgbWludXRlcyhMYXQpICsgXCIgTiAgIExvbmdpdHVkZTogLVwiICsgbWludXRlcyhMb24pICsgXCIgVyAoYXBwcm94aW1hdGUgY29vcmRpbmF0ZXMpXCI7XHJcbiAgICB9XHJcbn1cclxuXHJcbiovXHJcblxyXG5mdW5jdGlvbiBjb252ZXJ0V0dTODRQcm9qZWN0aW9uVG9XR1M4NExhdExvbihtZXJjYXRvcikge1xyXG4gICAgLy8gaHR0cHM6Ly9naXMuc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzY5MjA4L3RyeWluZy10by1jb252ZXJ0LWNvb3JkaW5hdGVzLWZyb20td2dzODQtd2ViLW1lcmNhdG9yLWF1eGlsaWFyeS1zcGhlcmUtdG8td2dzODRcclxuICAgIC8vIGh0dHBzOi8vd2lraS5vcGVuc3RyZWV0bWFwLm9yZy93aWtpL01lcmNhdG9yI0phdmFcclxuICAgIC8vICAgICAgICAgaWYgKE1hdGguYWJzKG1lcmNhdG9yWzBdKSA8IDE4MCAmJiBNYXRoLkFicyhtZXJjYXRvclsxXSkgPCA5MClcclxuICAgIC8vICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAvLyAgICAgICAgIGlmICgoTWF0aC5BYnMobWVyY2F0b3JbMF0pID4gMjAwMzc1MDguMzQyNzg5MikgfHwgKE1hdGguQWJzKG1lcmNhdG9yWzFdKSA+IDIwMDM3NTA4LjM0Mjc4OTIpKVxyXG4gICAgLy8gICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgIHZhciB4ID0gbWVyY2F0b3JbMF07XHJcbiAgICB2YXIgeSA9IG1lcmNhdG9yWzFdO1xyXG4gICAgdmFyIG51bTMgPSB4IC8gNjM3ODEzNy4wO1xyXG4gICAgdmFyIG51bTQgPSBudW0zICogNTcuMjk1Nzc5NTEzMDgyMzIzO1xyXG4gICAgdmFyIG51bTUgPSBNYXRoLmZsb29yKChudW00ICsgMTgwLjApIC8gMzYwLjApO1xyXG4gICAgdmFyIG51bTYgPSBudW00IC0gbnVtNSAqIDM2MC4wO1xyXG4gICAgdmFyIG51bTcgPVxyXG4gICAgICAgIDEuNTcwNzk2MzI2Nzk0ODk2NiAtIDIuMCAqIE1hdGguYXRhbihNYXRoLmV4cCgoLTEuMCAqIHkpIC8gNjM3ODEzNy4wKSk7XHJcbiAgICBtZXJjYXRvclswXSA9IG51bTY7XHJcbiAgICBtZXJjYXRvclsxXSA9IG51bTcgKiA1Ny4yOTU3Nzk1MTMwODIzMjM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1pbnV0ZXMobnVtKSB7XHJcbiAgICAvLyBGb3IgY29udmVydGluZyBjb252ZXJ0U1BUb1dHUzg0KHgseSkgcG9pbnRzIHRvIG1pbnV0ZXMsIGFsc28gYm9ycm93ZWQgZnJvbSBTY29waSFcclxuICAgIG51bSA9IE1hdGguYWJzKG51bSk7XHJcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yKG51bSk7XHJcbiAgICB2YXIgZGVjaW1hbCA9IG51bSAtIGZsb29yO1xyXG4gICAgdmFyIG1pbnV0ZXMgPSA2MCAqIGRlY2ltYWw7XHJcbiAgICB2YXIgZmxvb3IyID0gTWF0aC5mbG9vcihtaW51dGVzKTtcclxuICAgIGRlY2ltYWwgPSBtaW51dGVzIC0gZmxvb3IyO1xyXG4gICAgdmFyIHNlY29uZHMgPSA2MCAqIGRlY2ltYWw7XHJcbiAgICAvL3IgZmxvb3IzID0gTWF0aC5yb3VuZChzZWNvbmRzKTtcclxuICAgIHNlY29uZHMgKj0gMTAwO1xyXG4gICAgc2Vjb25kcyA9IE1hdGgucm91bmQoc2Vjb25kcyk7XHJcbiAgICBzZWNvbmRzIC89IDEwMDsgLy8gYWNjdXJhdGUgdG8gMiBkZWNpbWFsIHBsYWNlc1xyXG4gICAgcmV0dXJuIGZsb29yICsgJ1xcdTAwQjAgJyArIGZsb29yMiArICdcXHUyMDMyICcgKyBzZWNvbmRzICsgJ1xcdTIwMzMnO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZVBsYW5lQ29vcmRzQnlEaXN0YW5jZShkaXN0YW5jZVgsIGRpc3RhbmNlWSwgc3BDb29yZHMpIHtcclxuICAgIHZhciBzcFdpZHRoID0gdGhpcy5leHRlbnQudmlzaWJsZS5YIC0gdGhpcy5leHRlbnQudmlzaWJsZS54O1xyXG4gICAgdmFyIHNwSGVpZ2h0ID0gdGhpcy5leHRlbnQudmlzaWJsZS5ZIC0gdGhpcy5leHRlbnQudmlzaWJsZS55O1xyXG5cclxuICAgIHZhciB4UmF0aW8gPSBzcFdpZHRoIC8gdGhpcy5tYXBDb250YWluZXIud2lkdGg7XHJcbiAgICB2YXIgeVJhdGlvID0gc3BIZWlnaHQgLyB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQ7XHJcblxyXG4gICAgdmFyIGxlZnQgPSBkaXN0YW5jZVggKiB4UmF0aW87XHJcbiAgICB2YXIgdG9wID0gMCAtIGRpc3RhbmNlWSAqIHlSYXRpbztcclxuXHJcbiAgICBpZiAoc3BDb29yZHMpIHtcclxuICAgICAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggPSBzcENvb3Jkcy54IC09IGxlZnQ7XHJcbiAgICAgICAgdGhpcy5leHRlbnQudmlzaWJsZS5YID0gc3BDb29yZHMuWCAtPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUueSA9IHNwQ29vcmRzLnkgLT0gdG9wO1xyXG4gICAgICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSA9IHNwQ29vcmRzLlkgLT0gdG9wO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggLT0gbGVmdDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWCAtPSBsZWZ0O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS55IC09IHRvcDtcclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUuWSAtPSB0b3A7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeU9yaWdpbihwX29yaWdpbiwgcF9zY2FsZSkge1xyXG4gICAgdmFyIHNwV2lkdGggPSB0aGlzLmV4dGVudC52aXNpYmxlLlggLSB0aGlzLmV4dGVudC52aXNpYmxlLng7XHJcbiAgICB2YXIgc3BIZWlnaHQgPSB0aGlzLmV4dGVudC52aXNpYmxlLlkgLSB0aGlzLmV4dGVudC52aXNpYmxlLnk7XHJcblxyXG4gICAgaWYgKHBfc2NhbGUgPT09IDIpIHtcclxuICAgICAgICBzcFdpZHRoID0gc3BXaWR0aCAqIC0oMSAvIHBfc2NhbGUpO1xyXG4gICAgICAgIHNwSGVpZ2h0ID0gc3BIZWlnaHQgKiAtKDEgLyBwX3NjYWxlKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnggLT0gc3BXaWR0aCAqIHBfb3JpZ2luLng7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLlggKz0gc3BXaWR0aCAqICgxIC0gcF9vcmlnaW4ueCk7XHJcbiAgICB0aGlzLmV4dGVudC52aXNpYmxlLnkgLT0gc3BIZWlnaHQgKiBwX29yaWdpbi55O1xyXG4gICAgdGhpcy5leHRlbnQudmlzaWJsZS5ZICs9IHNwSGVpZ2h0ICogKDEgLSBwX29yaWdpbi55KTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMuZXh0ZW50LnZpc2libGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVWaXNFeHRlbnRCeU9yaWdpbkFuZFJlc29sdXRpb24ocF9vcmlnaW4sIHBfc2NhbGUsIHBfcmVzb2x1dGlvbikge1xyXG4gICAgbGV0IHZpcyA9IHRoaXMuZXh0ZW50LnZpc2libGU7XHJcbiAgICBsZXQgc3BXaWR0aCA9IHRoaXMubWFwQ29udGFpbmVyLndpZHRoICogcF9yZXNvbHV0aW9uO1xyXG4gICAgbGV0IHNwSGVpZ2h0ID0gdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0ICogcF9yZXNvbHV0aW9uO1xyXG5cclxuICAgIGxldCByYXRpb1ggPSAodmlzLlggLSBwX29yaWdpbi54KSAvICh2aXMuWCAtIHZpcy54KTtcclxuICAgIGxldCByYXRpb1kgPSAodmlzLlkgLSBwX29yaWdpbi55KSAvICh2aXMuWSAtIHZpcy55KTtcclxuXHJcbiAgICBpZiAocF9zY2FsZSA+PSAxKSB7XHJcbiAgICAgICAgcF9zY2FsZSA9IHBfc2NhbGUgLSAxO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBwX3NjYWxlID0gLSgxIC0gcF9zY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmlzLlggLT0gc3BXaWR0aCAqIHBfc2NhbGUgKiByYXRpb1g7XHJcbiAgICB2aXMueCA9IHZpcy5YIC0gc3BXaWR0aDtcclxuICAgIHZpcy5ZIC09IHNwSGVpZ2h0ICogcF9zY2FsZSAqIHJhdGlvWTtcclxuICAgIHZpcy55ID0gdmlzLlkgLSBzcEhlaWdodDtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVmlzRXh0ZW50QnlIZWlnaHRBbmRXaWR0aChoZWlnaHRfcGl4ZWxzLCB3aWR0aF9waXhlbHMpIHtcclxuICAgIGxldCB2aXNpYmxlRXh0ZW50ID0gdGhpcy5leHRlbnQudmlzaWJsZTtcclxuICAgIGxldCBoZWlnaHRSYXRpbyA9IGhlaWdodF9waXhlbHMgLyB3aWR0aF9waXhlbHM7XHJcbiAgICBsZXQgcmVzb2x1dGlvbiA9IHdpZHRoX3BpeGVscyAqIHRoaXMuZ2V0UmVzb2x1dGlvbih0aGlzLnpvb20pO1xyXG5cclxuICAgIHRoaXMuZXh0ZW50LnZpc2libGUgPSB7XHJcbiAgICAgICAgeDogdmlzaWJsZUV4dGVudC54LFxyXG4gICAgICAgIFg6IHZpc2libGVFeHRlbnQueCArIHJlc29sdXRpb24sXHJcbiAgICAgICAgeTogdmlzaWJsZUV4dGVudC5ZIC0gcmVzb2x1dGlvbiAqIGhlaWdodFJhdGlvLFxyXG4gICAgICAgIFk6IHZpc2libGVFeHRlbnQuWSxcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBpeGVsUG9pbnRJbk1hcENvbnRhaW5lcihwb2ludCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBwb2ludC54IC0gdGhpcy5tYXBDb250YWluZXIubGVmdCxcclxuICAgICAgICB5OiBwb2ludC55IC0gdGhpcy5tYXBDb250YWluZXIudG9wLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UGFuT2Zmc2V0UG9pbnQocG9pbnQpIHtcclxuICAgIHZhciBwYW5PZmZzZXRYID0gdGhpcy5tYWluQ29udGFpbmVyLmxlZnQ7IC8vKyB0aGlzLm1hcEltZy5sZWZ0OyAvLyBTaG91bGQgYmUgemVybyBpZiBub3QgcGFubmluZy5cclxuICAgIHZhciBwYW5PZmZzZXRZID0gdGhpcy5tYWluQ29udGFpbmVyLnRvcDsgLy8rIHRoaXMubWFwSW1nLnRvcDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHg6IHBvaW50LnggLSBwYW5PZmZzZXRYLCAvLyBUaGlzIHdpbGwgc2V0IHRoZSBvcmlnaW4gdG8pLzJ0aGUgY2VudGVyIC0+IC0gdGhpcy5tYXBDb250YWluZXIud2lkdGggLyAyO1xyXG4gICAgICAgIHk6IHBvaW50LnkgLSBwYW5PZmZzZXRZLFxyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzdGFuY2VCZXR3ZWVuKGEsIGIpIHtcclxuICAgIC8vIEdvb2Qgb2xkIHB5dGhhZ29yZWFuIHRoZW9yZW0uXHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KGJbMF0gLSBhWzBdLCAyKSArIE1hdGgucG93KGJbMV0gLSBhWzFdLCAyKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbnZlcnRTUFRvV0dTODRQcm9qKHNwUG9pbnQpIHtcclxuICAgIGxldCB3c2c4NUxhdExvbiA9IHRoaXMuY29udmVydFNQVG9XR1M4NChzcFBvaW50KTtcclxuICAgIHJldHVybiB0aGlzLkxlYWZsZXRTcGhlcmljYWxNZXJjYXRvci5wcm9qZWN0RnJvbVdTRzg0R2VvKHdzZzg1TGF0TG9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmVzb2x1dGlvbih6b29tKSB7XHJcbiAgICBpZiAodGhpcy56b29tSW5kZXgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy56b29tSW5kZXhbem9vbV0ucmVzb2x1dGlvbjtcclxuICAgIH1cclxuICAgIC8vIFdTRzg0IFNwaGVyaWNhbCBNZXJjYXRvci5cclxuICAgIC8vIGxldCBFYXJ0aFJhZGl1cyA9IDYzNzgxMzc7XHJcbiAgICAvLyBsZXQgUmFkaXVzeFBpID0gTWF0aC5QSSAqIEVhcnRoUmFkaXVzO1xyXG4gICAgLy8gbGV0IFBpeGVsc0F0Wm9vbSA9IDI1NiAqIE1hdGgucG93KDIsIHpvb20pO1xyXG4gICAgLy8gbGV0IGRlZ1Blck1ldGVyID0gUmFkaXVzeFBpICogMiAvIEVhcnRoUmFkaXVzO1xyXG4gICAgLy8gbGV0IGRlZ1BlclBpeGVsID0gRWFydGhSYWRpdXMgLyBQaXhlbHNBdFpvb20gKiBkZWdQZXJNZXRlcjtcclxuICAgIHZhciBwaXhlbHMgPSAoMjU2ICogTWF0aC5wb3coMiwgem9vbSkpIC8gMjtcclxuICAgIHZhciBleHRlbnQgPSAyMDAzNzUwOC4zNDI3ODkyNDQ7XHJcbiAgICB2YXIgcmVzID0gZXh0ZW50IC8gcGl4ZWxzO1xyXG5cclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuXHJcbk5ld01hcC5wcm90b3R5cGUuTGVhZmxldFNwaGVyaWNhbE1lcmNhdG9yID0ge1xyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL0xlYWZsZXQvTGVhZmxldC9ibG9iL21hc3Rlci9zcmMvZ2VvL3Byb2plY3Rpb24vUHJvamVjdGlvbi5TcGhlcmljYWxNZXJjYXRvci5qc1xyXG4gICAgLy8gaHR0cHM6Ly9naXMuc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzkyOTA3L3JlLXByb2plY3QtcmFzdGVyLWltYWdlLWZyb20tbWVyY2F0b3ItdG8tZXF1aXJlY3Rhbmd1bGFyXHJcbiAgICAvLyBodHRwczovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9TbGlwcHlfbWFwX3RpbGVuYW1lc1xyXG4gICAgUkFESVVTOiA2Mzc4MTM3LFxyXG4gICAgTUFYX0xBVElUVURFOiA4NS4wNTExMjg3Nzk4LFxyXG4gICAgQk9VTkQ6IDIwMDM3NTA4LjM0Mjc4OTI0NCwgLy8yMDAzNzUwOC4zNDI3ODkyNDQgVE9ETzogXCJCT1VORFwiIGlzIHByb2JhYmx5IG5vdCB0aGUgY29ycmVjdCB0ZXJtLlxyXG5cclxuICAgIHByb2plY3RGcm9tV1NHODRHZW86IGZ1bmN0aW9uKGxhdGxuZykge1xyXG4gICAgICAgIHZhciBkID0gTWF0aC5QSSAvIDE4MCxcclxuICAgICAgICAgICAgbWF4ID0gdGhpcy5NQVhfTEFUSVRVREUsXHJcbiAgICAgICAgICAgIGxhdCA9IE1hdGgubWF4KE1hdGgubWluKG1heCwgbGF0bG5nLmxhdCksIC1tYXgpLFxyXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihsYXQgKiBkKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5SQURJVVMgKiBsYXRsbmcubG5nICogZCxcclxuICAgICAgICAgICAgeTogKHRoaXMuUkFESVVTICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSkgLyAyLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIHByb2plY3RUb1dTRzg0R2VvOiBmdW5jdGlvbihwb2ludCkge1xyXG4gICAgICAgIHZhciBkID0gMTgwIC8gTWF0aC5QSSxcclxuICAgICAgICAgICAgUiA9IHRoaXMuUkFESVVTO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBsYXQ6ICgyICogTWF0aC5hdGFuKE1hdGguZXhwKHBvaW50LnkgLyBSKSkgLSBNYXRoLlBJIC8gMikgKiBkLFxyXG4gICAgICAgICAgICBsbmc6IChwb2ludC54ICogZCkgLyBSLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG59O1xyXG5cclxuLypcclxuaHR0cHM6Ly9sZWFmbGV0anMuY29tL2V4YW1wbGVzL3F1aWNrLXN0YXJ0L2V4YW1wbGUuaHRtbFxyXG5cclxudmFyIGR2aSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpLmNsb25lTm9kZSgpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwaWQnKS5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXBpZCcpKTtcclxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkdmkpO1xyXG5cclxudmFyIHNjcmlwdHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcclxuICAgIHNjcmlwdHQuc3JjID0gJ2h0dHBzOi8vdW5wa2cuY29tL2xlYWZsZXRAMS4zLjQvZGlzdC9sZWFmbGV0LXNyYy5qcyc7XHJcbiAgICBzY3JpcHR0LmNyb3NzT3JpZ2luID0gdHJ1ZTtcclxuZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHR0KTtcclxuXHJcblxyXG5cclxubXltYXAgPSBMLm1hcCgnbWFwaWQnKS5zZXRWaWV3KFswLCAwXSwgMTMpO1xyXG5teW1hcC5vbignY2xpY2snLCBvbk1hcENsaWNrKVxyXG5cclxuICAgIEwudGlsZUxheWVyKCdodHRwczovL2FwaS50aWxlcy5tYXBib3guY29tL3Y0L3tpZH0ve3p9L3t4fS97eX0ucG5nP2FjY2Vzc190b2tlbj1way5leUoxSWpvaWJXRndZbTk0SWl3aVlTSTZJbU5wZWpZNE5YVnljVEEyZW1ZeWNYQm5kSFJxY21aM04zZ2lmUS5ySmNGSUcyMTRBcmlJU0xiQjZCNWF3Jywge1xyXG4gICAgICAgIG1heFpvb206IDE4LFxyXG4gICAgICAgIGF0dHJpYnV0aW9uOiAnTWFwIGRhdGEgJmNvcHk7IDxhIGhyZWY9XCJodHRwczovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9cIj5PcGVuU3RyZWV0TWFwPC9hPiBjb250cmlidXRvcnMsICcgK1xyXG4gICAgICAgICAgICAnPGEgaHJlZj1cImh0dHBzOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8yLjAvXCI+Q0MtQlktU0E8L2E+LCAnICtcclxuICAgICAgICAgICAgJ0ltYWdlcnkgwqkgPGEgaHJlZj1cImh0dHBzOi8vd3d3Lm1hcGJveC5jb20vXCI+TWFwYm94PC9hPicsXHJcbiAgICAgICAgaWQ6ICdtYXBib3guc3RyZWV0cydcclxuICAgIH0pLmFkZFRvKG15bWFwKTtcclxuXHJcbiAgICBMLm1hcmtlcihbMCwgMF0pLmFkZFRvKG15bWFwKVxyXG4gICAgICAgIC5iaW5kUG9wdXAoXCI8Yj5IZWxsbyB3b3JsZCE8L2I+PGJyIC8+SSBhbSBhIHBvcHVwLlwiKS5vcGVuUG9wdXAoKTtcclxuXHJcblxyXG5cclxucG9wdXAgPSBMLnBvcHVwKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25NYXBDbGljayhlKSB7XHJcbiAgICAgICAgcG9wdXBcclxuICAgICAgICAgICAgLnNldExhdExuZyhlLmxhdGxuZylcclxuICAgICAgICAgICAgLnNldENvbnRlbnQoXCJZb3UgY2xpY2tlZCB0aGUgbWFwIGF0IFwiICsgZS5sYXRsbmcudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgLm9wZW5PbihteW1hcCk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiovXHJcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMnO1xyXG5pbXBvcnQge05ld01hcH0gZnJvbSAnLi9NYWluX2NsYXNzJztcclxuXHJcbk9iamVjdC5hc3NpZ24oTmV3TWFwLnByb3RvdHlwZSwge1xyXG4gICAgcGFuTW91c2VEb3duLFxyXG4gICAgX3Bhbk1vdXNlRG93bixcclxuICAgIHBhbk1vdXNlVXAsXHJcbiAgICBfcGFuTW91c2VVcCxcclxuICAgIHBhblJlbW92ZUV2ZW50TGlzdGVuZXJzLFxyXG4gICAgcGFuSW5pdGlhbFRhc2tzLFxyXG4gICAgcGFuRHJhZ09ubHksXHJcbiAgICBwYW5EcmFnQW5kQW5pbWF0aW9uLFxyXG4gICAgcGFuVG8sXHJcbiAgICBwYW5CeVBpeGVscyxcclxuICAgIHBhblN0YXJ0QW5pbWF0aW9uLFxyXG4gICAgcGFuU3RvcEFuaW1hdGlvbixcclxuICAgIGVuYWJsZVBhbm5pbmcsXHJcbiAgICBkaXNhYmxlUGFubmluZyxcclxufSk7XHJcblxyXG5OZXdNYXAub25Jbml0RG9uZShmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuZW5hYmxlUGFubmluZygpO1xyXG5cclxuICAgIHRoaXMucGFuID0ge1xyXG4gICAgICAgIG1haW5Db250YWluZXJYWTogbnVsbCxcclxuICAgICAgICBtb3VzZURvd25YOiBudWxsLFxyXG4gICAgICAgIG1vdXNlRG93blhPZmZzZXQ6IG51bGwsXHJcbiAgICAgICAgbW91c2VEb3duWTogbnVsbCxcclxuICAgICAgICBtb3VzZURvd25ZT2Zmc2V0OiBudWxsLFxyXG4gICAgICAgIHBvaW50czogbnVsbCxcclxuICAgICAgICBzcENvb3JkczogbnVsbCxcclxuICAgICAgICB0cmFuc2l0aW9uUmVzZXRUaW1lb3V0OiBudWxsLFxyXG4gICAgICAgIHBhbm5pbmdGdW5jdGlvbjogdGhpcy5wYW5EcmFnQW5kQW5pbWF0aW9uLmJpbmQodGhpcyksXHJcbiAgICAgICAgYm91bmRFdmVudExpc3RlbmVyczoge1xyXG4gICAgICAgICAgICBwYW5Nb3VzZVVwOiB0aGlzLnBhbk1vdXNlVXAuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgcGFuSW5pdGlhbFRhc2tzOiB0aGlzLnBhbkluaXRpYWxUYXNrcy5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICBwYW5SZW1vdmVFdmVudExpc3RlbmVyczogdGhpcy5wYW5SZW1vdmVFdmVudExpc3RlbmVycy5iaW5kKHRoaXMpLFxyXG4gICAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMucGFuLmJvdW5kRXZlbnRMaXN0ZW5lcnMucGFubmluZ0Z1bmN0aW9uID0gdGhpcy5wYW4ucGFubmluZ0Z1bmN0aW9uLmJpbmQodGhpcyk7XHJcbn0sIG51bGwpO1xyXG5cclxuZnVuY3Rpb24gcGFuTW91c2VEb3duKGUpIHtcclxuICAgIC8vIERvIHNvbWV0aGluZyBoZXJlP1xyXG4gICAgdGhpcy5fcGFuTW91c2VEb3duKGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBfcGFuTW91c2VEb3duKGUpIHtcclxuICAgIGxldCBldnQgPSBlLl9fZXZlbnRfXztcclxuICAgIGxldCBwYW4gPSB0aGlzLnBhbjtcclxuICAgIGxldCBsaXN0ZW5lcnMgPSB0aGlzLnBhbi5ib3VuZEV2ZW50TGlzdGVuZXJzO1xyXG5cclxuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgcGFuLm1vdXNlRG93blggPSBldnQuY2xpZW50WDtcclxuICAgIHBhbi5tb3VzZURvd25ZID0gZXZ0LmNsaWVudFk7XHJcbiAgICBwYW4ubW91c2VEb3duWE9mZnNldCA9IGV2dC5jbGllbnRYIC0gdGhpcy5tYWluQ29udGFpbmVyLmxlZnQ7XHJcbiAgICBwYW4ubW91c2VEb3duWU9mZnNldCA9IGV2dC5jbGllbnRZIC0gdGhpcy5tYWluQ29udGFpbmVyLnRvcDtcclxuXHJcbiAgICBwYW4ucG9pbnRzID0gW107IC8vIFRPRE86IHRlc3RpbmdcclxuXHJcbiAgICB0aGlzLnBhblN0b3BBbmltYXRpb24oKTtcclxuXHJcbiAgICBwYW4ubWFpbkNvbnRhaW5lclhZID0ge1xyXG4gICAgICAgIHg6IHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHk6IHRoaXMubWFpbkNvbnRhaW5lci50b3AsXHJcbiAgICB9O1xyXG5cclxuICAgIHBhbi5zcENvb3JkcyA9IHtcclxuICAgICAgICB4OiB0aGlzLmV4dGVudC52aXNpYmxlLngsXHJcbiAgICAgICAgWDogdGhpcy5leHRlbnQudmlzaWJsZS5YLFxyXG4gICAgICAgIHk6IHRoaXMuZXh0ZW50LnZpc2libGUueSxcclxuICAgICAgICBZOiB0aGlzLmV4dGVudC52aXNpYmxlLlksXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFRPRE86IGNyZWF0ZSBhZGQgZXZlbnRsaXN0ZW5lciBmdW5jdGlvbi5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBsaXN0ZW5lcnMucGFuTW91c2VVcCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIGxpc3RlbmVycy5wYW5SZW1vdmVFdmVudExpc3RlbmVycyk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBsaXN0ZW5lcnMucGFuSW5pdGlhbFRhc2tzKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGxpc3RlbmVycy5wYW5uaW5nRnVuY3Rpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYW5Nb3VzZVVwKGUpIHtcclxuICAgIC8vIG1vdXNlIHVwIGZvciB0aGUgaW1hZ2VcclxuICAgIGlmIChlLnJlbGF0ZWRUYXJnZXQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgIHRoaXMucGFuUmVtb3ZlRXZlbnRMaXN0ZW5lcnMoZSk7XHJcblxyXG4gICAgdGhpcy5fcGFuTW91c2VVcChlKTtcclxuICAgIC8vdGhpcy5ldmVudC5maXJlKFwibWFwIG1vdXNlIHVwXCIsIGUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBfcGFuTW91c2VVcChlKSB7XHJcbiAgICBsZXQgZXZ0ID0gZS5fX2V2ZW50X18gfHwgZTtcclxuICAgIGxldCBwYW4gPSB0aGlzLnBhbjtcclxuXHJcbiAgICBpZiAoZXZ0LmNsaWVudFkgLSBwYW4ubW91c2VEb3duWSAhPT0gMCB8fCBldnQuY2xpZW50WCAtIHBhbi5tb3VzZURvd25YICE9PSAwKSB7XHJcbiAgICAgICAgdGhpcy5wYW5TdGFydEFuaW1hdGlvbihldnQpO1xyXG5cclxuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeURpc3RhbmNlKFxyXG4gICAgICAgICAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmxlZnQgLSBwYW4ubWFpbkNvbnRhaW5lclhZLngsXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1haW5Db250YWluZXIudG9wIC0gcGFuLm1haW5Db250YWluZXJYWS55LFxyXG4gICAgICAgICAgICAgICAgcGFuLnNwQ29vcmRzXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgIHRoaXMuZXZlbnQuZmlyZSgncGFuIGVuZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RhdGUucGFubmluZyA9IGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYW5SZW1vdmVFdmVudExpc3RlbmVycyhlKSB7XHJcbiAgICBsZXQgbGlzdGVuZXJzID0gdGhpcy5wYW4uYm91bmRFdmVudExpc3RlbmVycztcclxuXHJcbiAgICBpZiAoZS5yZWxhdGVkVGFyZ2V0KSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgbGlzdGVuZXJzLnBhbk1vdXNlVXApO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBsaXN0ZW5lcnMucGFuUmVtb3ZlRXZlbnRMaXN0ZW5lcnMpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbGlzdGVuZXJzLnBhbkluaXRpYWxUYXNrcyk7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBsaXN0ZW5lcnMucGFubmluZ0Z1bmN0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFuSW5pdGlhbFRhc2tzKGUpIHtcclxuICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uY2UgYW5kIGltbWVkaWF0ZWx5IHJlbW92ZWQganVzdCB0byBtYWtlIHRoZVxyXG4gICAgLy8gcGFubmluZyBmZWVsIHNtb290aGVyLlxyXG4gICAgaWYgKGUuY2xpZW50WSAtIHRoaXMucGFuLm1vdXNlRG93blkgPT09IDAgJiYgZS5jbGllbnRYIC0gdGhpcy5wYW4ubW91c2VEb3duWCA9PT0gMCkge1xyXG4gICAgICAgIC8vIEEgYnVnIGluIGNocm9tZSB3aWxsIGNhbGwgdGhpcyBmdW5jdGlvbiBpZiBhIG1vdXNlZG93biBldmVudCBoYXBwZW5zLlxyXG4gICAgICAgIC8vIEJ1ZyBoYXNuJ3QgYmVlbiBmaXhlZCBpbiBhdGxlYXN0IGNocm9tZSB2ZXJzaW9uIDUxLjAuMjcwNC4xMDNcclxuICAgICAgICAvLyBhbmQgZWFybGllci5cclxuXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9ICcnO1xyXG5cclxuICAgIC8vIEVuZCBhbnkgem9vbWluZyBhY3Rpdml0eVxyXG4gICAgLy90aGlzLlpvb21fY2xhc3Muem9vbVN0b3AoKTtcclxuXHJcbiAgICB0aGlzLnN0YXRlLnBhbm5pbmcgPSB0cnVlO1xyXG5cclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHBhbkluaXRpYWxUYXNrcyk7XHJcbiAgICB0aGlzLmV2ZW50LmZpcmUoJ3BhbiBpbml0aWFsJywgZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhbkRyYWdPbmx5KGUpIHtcclxuICAgIGxldCBtYWluQ29udCA9IHRoaXMubWFpbkNvbnRhaW5lcjtcclxuICAgIGxldCB4ID0gbWFpbkNvbnQubGVmdCArIChlLmNsaWVudFggLSB0aGlzLnBhbi5tb3VzZURvd25YKTtcclxuICAgIGxldCB5ID0gbWFpbkNvbnQudG9wICsgKGUuY2xpZW50WSAtIHRoaXMucGFuLm1vdXNlRG93blkpO1xyXG5cclxuICAgIC8vIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cmFuc2xhdGUoXCIrIHggK1wicHgsIFwiKyB5ICtcInB4KVwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYW5EcmFnQW5kQW5pbWF0aW9uKGUpIHtcclxuICAgIGxldCBtYWluQ29udCA9IHRoaXMubWFpbkNvbnRhaW5lcjtcclxuICAgIGxldCBwYW4gPSB0aGlzLnBhbjtcclxuXHJcbiAgICBsZXQgZGlzdGFuY2VYID0gcGFuLm1haW5Db250YWluZXJYWS54ICsgZS5jbGllbnRYIC0gcGFuLm1vdXNlRG93blgsXHJcbiAgICAgICAgZGlzdGFuY2VZID0gcGFuLm1haW5Db250YWluZXJYWS55ICsgZS5jbGllbnRZIC0gcGFuLm1vdXNlRG93blk7XHJcblxyXG4gICAgbWFpbkNvbnQudG9wID0gZGlzdGFuY2VZO1xyXG4gICAgbWFpbkNvbnQubGVmdCA9IGRpc3RhbmNlWDtcclxuXHJcbiAgICB0aGlzLnBhbi5wb2ludHMucHVzaCh7XHJcbiAgICAgICAgeDogZGlzdGFuY2VYLFxyXG4gICAgICAgIHk6IGRpc3RhbmNlWSxcclxuICAgICAgICB0aW1lOiBEYXRlLm5vdygpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgXCJ0cmFuc2xhdGUzZChcIisgZGlzdGFuY2VYICtcInB4LCBcIisgZGlzdGFuY2VZICtcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgdGhpcy5ldmVudC5maXJlKCdwYW4nLCBlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFuVG8oc3BQb2ludCwgcGFuVGltZSkge1xyXG4gICAgbGV0IHB4bFBvaW50ID0gdGhpcy5nZXRQaXhlbFBvaW50SW5NYXBDb250YWluZXIuYmluZCh0aGlzKTtcclxuICAgIGxldCBjb252ZXJ0U3BUb1B4bCA9IHRoaXMuY29udmVydFByb2pQb2ludFRvUGl4ZWxQb2ludC5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGxldCBjZW50ZXJQeGxzID0gcHhsUG9pbnQoe1xyXG4gICAgICAgIHg6IHRoaXMubWFwQ29udGFpbmVyLmxlZnQgKyB0aGlzLm1hcENvbnRhaW5lci53aWR0aCAvIDIsXHJcbiAgICAgICAgeTogdGhpcy5tYXBDb250YWluZXIudG9wICsgdGhpcy5tYXBDb250YWluZXIuaGVpZ2h0IC8gMixcclxuICAgIH0pO1xyXG4gICAgbGV0IHBvaW50T2ZJbnRlcmVzdFB4bCA9IGNvbnZlcnRTcFRvUHhsKHNwUG9pbnQpO1xyXG4gICAgbGV0IGRpc3RhbmNlID0ge1xyXG4gICAgICAgIHg6IGNlbnRlclB4bHMueCAtIHBvaW50T2ZJbnRlcmVzdFB4bC54LFxyXG4gICAgICAgIHk6IGNlbnRlclB4bHMueSAtIHBvaW50T2ZJbnRlcmVzdFB4bC55LFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnBhbkJ5UGl4ZWxzKGRpc3RhbmNlLCBwYW5UaW1lKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxufVxyXG5cclxuZnVuY3Rpb24gcGFuQnlQaXhlbHMoc3BQb2ludCwgcGFuVGltZSkge1xyXG4gICAgbGV0IG1haW5Db250ID0gdGhpcy5tYWluQ29udGFpbmVyO1xyXG4gICAgbGV0IHZlY3RvckxlbiA9IE1hdGguc3FydChzcFBvaW50LnggKiBzcFBvaW50LnggKyBzcFBvaW50LnkgKiBzcFBvaW50LnkpO1xyXG5cclxuICAgIC8vIFBsYXllZCBhcm91bmQgd2l0aCB0aGlzIG9uIGEgZ3JhcGhpbmcgd2Vic2l0ZSwgbWlnaHQgd2FudCB0byByZXZpc2l0IGluIHRoZSBmdXR1cmUuXHJcbiAgICBsZXQgbWF4ID0gTWF0aC5tYXgoMjAwLCB2ZWN0b3JMZW4gKiAoNTAwICogKDAuNDUgLyB2ZWN0b3JMZW4gKiogMC45KSArIDAuMDYpKTtcclxuICAgIGxldCB0aW1lID0gcGFuVGltZSB8fCBNYXRoLm1pbigxMDAwLCBtYXgpO1xyXG5cclxuICAgIG1haW5Db250LmxlZnQgKz0gTWF0aC5yb3VuZChzcFBvaW50LngpO1xyXG4gICAgbWFpbkNvbnQudG9wICs9IE1hdGgucm91bmQoc3BQb2ludC55KTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZVN0YXRlUGxhbmVDb29yZHNCeURpc3RhbmNlKHNwUG9pbnQueCwgc3BQb2ludC55KTtcclxuXHJcbiAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgIHtcclxuICAgICAgICAgICAgLy8gQmxvY2sgZm9yIHByZXR0aWVyLWlnbm9yZVxyXG4gICAgICAgICAgICBtYWluQ29udC5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0lUSU9OXSA9XHJcbiAgICAgICAgICAgICAgICBcImFsbCBcIiArIHRpbWUgKyBcIm1zIGN1YmljLWJlemllcigwLCAwLCAwLjI1LCAxKVwiO1xyXG5cclxuICAgICAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgICAgICAgICBcInRyYW5zbGF0ZTNkKFwiICsgbWFpbkNvbnQubGVmdCArIFwicHgsXCIgKyBtYWluQ29udC50b3AgKyBcInB4LDBweClcIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgbWFpbkNvbnQuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNJVElPTl0gPSBudWxsO1xyXG4gICAgfSwgdGltZSk7XHJcblxyXG4gICAgdGhpcy5ldmVudC5maXJlKCdwYW4gZW5kJywge3BhbkVuZFRpbWU6IHRpbWV9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gcGFuU3RhcnRBbmltYXRpb24oZSkge1xyXG4gICAgbGV0IHRyYW5zaXN0aW9uRHVyYXRpb25NUyA9IDIyMDA7XHJcblxyXG4gICAgbGV0IHBvaW50cyA9IHRoaXMucGFuLnBvaW50cztcclxuXHJcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDMgfHwgRGF0ZS5ub3coKSAtIHBvaW50c1twb2ludHMubGVuZ3RoIC0gMV0udGltZSA+IDE1MCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc3RhcnRQb2ludCA9IHBvaW50c1twb2ludHMubGVuZ3RoIC0gMV07XHJcbiAgICBsZXQgb2Zmc2V0UG9pbnQgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAtIDNdO1xyXG5cclxuICAgIGxldCBkZWx0YUEgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAtIDJdLFxyXG4gICAgICAgIGRlbHRhQiA9IHBvaW50c1twb2ludHMubGVuZ3RoIC0gM10sXHJcbiAgICAgICAgZGVsdGFYID0gZGVsdGFBLnggLSBkZWx0YUIueCxcclxuICAgICAgICBkZWx0YVkgPSBkZWx0YUEueSAtIGRlbHRhQi55LFxyXG4gICAgICAgIGFuZ2xlID0gTWF0aC5hdGFuMihkZWx0YVksIGRlbHRhWCk7XHJcblxyXG4gICAgbGV0IHBMZW4gPSBwb2ludHMubGVuZ3RoO1xyXG4gICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICBsZXQgdGltZSA9IChcclxuICAgICAgICAgICAgICAgICAgICAgICAocG9pbnRzW3BMZW4tMV0udGltZSAtIHBvaW50c1twTGVuLTJdLnRpbWUpIFxyXG4gICAgICAgICAgICAgICAgICAgICArIChwb2ludHNbcExlbi0yXS50aW1lIC0gcG9pbnRzW3BMZW4tM10udGltZSlcclxuICAgICAgICAgICAgICAgICAgICkgLyAyO1xyXG5cclxuICAgIGxldCBvZmZzZXRYID0gc3RhcnRQb2ludC54IC0gb2Zmc2V0UG9pbnQueCxcclxuICAgICAgICBvZmZzZXRZID0gc3RhcnRQb2ludC55IC0gb2Zmc2V0UG9pbnQueTtcclxuXHJcbiAgICBsZXQgZGlzdCA9IE1hdGguc3FydChvZmZzZXRYICogb2Zmc2V0WCArIG9mZnNldFkgKiBvZmZzZXRZKTtcclxuICAgIGxldCBzcGVlZCA9IGRpc3QgLyB0aW1lO1xyXG5cclxuICAgIGlmIChkaXN0IDw9IDIgfHwgdGltZSA9PT0gMCkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnBhbi50cmFuc2l0aW9uUmVzZXRUaW1lb3V0KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGRpc3RhbmNlIG5lZWRlZCB0byB0cmF2ZWwuXHJcbiAgICAvLyBncmFwaCAtPiBodHRwczovL3d3dy5kZXNtb3MuY29tL2NhbGN1bGF0b3Ivd29wcWRicnU0eVxyXG4gICAgbGV0IGRhbXBlbiA9IE1hdGguc3FydChNYXRoLmxvZzEwKE1hdGgubG9nMTAoc3BlZWQgKiogMyArIDEpICoqIDE1ICsgMSkpICoqIDAuMDcgLyA0O1xyXG5cclxuICAgIGxldCB2ZWN0b3JMZW5ndGggPSBzcGVlZCAqKiAxLjA5ICogNDAwICogZGFtcGVuO1xyXG4gICAgLy9zcGVlZCoqMC42ICogKDQwICogTWF0aC5zcXJ0KHNwZWVkKioxLjYpKTtcclxuICAgIC8vc3BlZWQgKiAoMjAgKiBNYXRoLnNxcnQoc3BlZWQpKTtcclxuICAgIC8vc3BlZWQgKiAxNTAgLSA2MDsgLy8gRm91bmQgdGhpcyBtYWdpYyBudW1iZXIgdGhyb3VnaCB0cmlhbCBhbmQgZXJyb3IuXHJcblxyXG4gICAgdHJhbnNpc3Rpb25EdXJhdGlvbk1TICo9IGRhbXBlbjtcclxuXHJcbiAgICAvLyBOZXcgdmVjdG9yLlxyXG4gICAgbGV0IHZlY3RvciA9IHtcclxuICAgICAgICByaXNlOiB2ZWN0b3JMZW5ndGggKiBNYXRoLnNpbihhbmdsZSksXHJcbiAgICAgICAgcnVuOiB2ZWN0b3JMZW5ndGggKiBNYXRoLmNvcyhhbmdsZSksXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSB0aGUgZmluYWwgeCBhbmQgeSBwb3NpdGlvbnMgZm9yIHRoZSBhbmltYXRpb24uXHJcbiAgICAvLyBSb3VuZGluZyB0aGUgY29vcmRpbmF0ZXMgc28gdGhhdCB0aGUgdGV4dCBvbiB0aGUgbWFya2VycyBpbiBjaHJvbWUgaXMgbm90IGJsdXJyeS5cclxuICAgIGxldCBmaW5pc2hQb2ludCA9IHtcclxuICAgICAgICB4OiBNYXRoLnJvdW5kKHZlY3Rvci5ydW4gKyBzdGFydFBvaW50LngpLFxyXG4gICAgICAgIHk6IE1hdGgucm91bmQodmVjdG9yLnJpc2UgKyBzdGFydFBvaW50LnkpLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLm1haW5Db250YWluZXIubGVmdCA9IGZpbmlzaFBvaW50Lng7XHJcbiAgICB0aGlzLm1haW5Db250YWluZXIudG9wID0gZmluaXNoUG9pbnQueTtcclxuXHJcbiAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50XHJcbiAgICAgICAgICAgIC5zdHlsZVt1dGlscy5DU1NfVFJBTlNJVElPTl0gPSBcInRyYW5zZm9ybSBcIiArIHRyYW5zaXN0aW9uRHVyYXRpb25NUyArXHJcbiAgICAgICAgICAgIFwibXMgY3ViaWMtYmV6aWVyKDAsIDAsIDAuMywgMSlcIjtcclxuXHJcbiAgICAvLyBwcmV0dGllci1pZ25vcmVcclxuICAgIHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50XHJcbiAgICAgICAgICAgIC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9IFwidHJhbnNsYXRlM2QoXCIgKyBmaW5pc2hQb2ludC54ICsgXCJweCxcIiArXHJcbiAgICAgICAgICAgIGZpbmlzaFBvaW50LnkgKyBcInB4LCAwcHgpXCI7XHJcblxyXG4gICAgLy8gUmVzZXQgdHJhbnNpdGlvbi5cclxuICAgIGNsZWFyVGltZW91dCh0aGlzLnBhbi50cmFuc2l0aW9uUmVzZXRUaW1lb3V0KTtcclxuXHJcbiAgICB0aGlzLnBhbi50cmFuc2l0aW9uUmVzZXRUaW1lb3V0ID0gc2V0VGltZW91dChcclxuICAgICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuc3R5bGVbdXRpbHMuQ1NTX1RSQU5TSVRJT05dID0gJyc7XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpLFxyXG4gICAgICAgIHRyYW5zaXN0aW9uRHVyYXRpb25NUyxcclxuICAgICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhblN0b3BBbmltYXRpb24oZSkge1xyXG4gICAgLy8gcHJldHRpZXItaWdub3JlXHJcbiAgICBsZXQgcG9zT25CZXppZXJDdXJ2ZSA9IGRvY3VtZW50LmRlZmF1bHRWaWV3XHJcbiAgICAgICAgICAgIC5nZXRDb21wdXRlZFN0eWxlKHRoaXMubWFpbkNvbnRhaW5lci5lbGVtZW50KVxyXG4gICAgICAgICAgICAudHJhbnNmb3JtLm1hdGNoKC8oLT9cXGQqLj9cXGQqKSwgKC0/XFxkKi4/XFxkKilcXCkkLyk7XHJcblxyXG4gICAgaWYgKCFwb3NPbkJlemllckN1cnZlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB4ID0gTWF0aC5yb3VuZChwb3NPbkJlemllckN1cnZlWzFdKSwgLy9NYXRoLnJvdW5kKHBhbi5hbmltLnN0YXJ0UG9pbnQueCAtICgocGFuLmFuaW0uc3RhcnRQb2ludC54IC0gcGFuLmFuaW0uZW5kUG9pbnQueCkgKiBwb3NPbkJlemllckN1cnZlKSksXHJcbiAgICAgICAgeSA9IE1hdGgucm91bmQocG9zT25CZXppZXJDdXJ2ZVsyXSk7IC8vTWF0aC5yb3VuZChwYW4uYW5pbS5zdGFydFBvaW50LnkgLSAoKHBhbi5hbmltLnN0YXJ0UG9pbnQueSAtIHBhbi5hbmltLmVuZFBvaW50LnkpICogcG9zT25CZXppZXJDdXJ2ZSkpO1xyXG5cclxuICAgIHRoaXMudXBkYXRlU3RhdGVQbGFuZUNvb3Jkc0J5RGlzdGFuY2UoXHJcbiAgICAgICAgeCAtIHRoaXMubWFpbkNvbnRhaW5lci5sZWZ0LFxyXG4gICAgICAgIHkgLSB0aGlzLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLm1haW5Db250YWluZXIuZWxlbWVudC5zdHlsZVt1dGlscy5DU1NfVFJBTlNGT1JNXSA9XHJcbiAgICAgICAgJ3RyYW5zbGF0ZSgnICsgeCArICdweCwnICsgeSArICdweCknO1xyXG5cclxuICAgIHRoaXMubWFpbkNvbnRhaW5lci50b3AgPSB5O1xyXG4gICAgdGhpcy5tYWluQ29udGFpbmVyLmxlZnQgPSB4O1xyXG5cclxuICAgIHRoaXMuZXZlbnQuZmlyZSgnc3RvcFBhbkFuaW1hdGlvbicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBlbmFibGVQYW5uaW5nKCkge1xyXG4gICAgdGhpcy5ldmVudC5vbih1dGlscy5NT1VTRV9XSEVFTF9FVlQsIHRoaXMucGFuU3RvcEFuaW1hdGlvbiwgdGhpcyk7XHJcbiAgICB0aGlzLmV2ZW50Lm9uKCdtb3VzZWRvd24nLCB0aGlzLnBhbk1vdXNlRG93biwgdGhpcyk7XHJcbiAgICB0aGlzLmV2ZW50Lm9uKCdwYW5UbycsIHRoaXMucGFuVG8sIHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNhYmxlUGFubmluZygpIHtcclxuICAgIHRoaXMuZXZlbnQub2ZmKHV0aWxzLk1PVVNFX1dIRUVMX0VWVCwgdGhpcy5wYW5TdG9wQW5pbWF0aW9uLCB0aGlzKTtcclxuICAgIHRoaXMuZXZlbnQub2ZmKCdtb3VzZWRvd24nLCB0aGlzLnBhbk1vdXNlRG93biwgdGhpcyk7XHJcbiAgICB0aGlzLmV2ZW50Lm9mZigncGFuVG8nLCB0aGlzLnBhblRvLCB0aGlzKTtcclxufVxyXG4iLCJpbXBvcnQge05ld01hcH0gZnJvbSAnLi9NYWluX2NsYXNzJztcclxuXHJcbk9iamVjdC5hc3NpZ24oTmV3TWFwLnByb3RvdHlwZSwge1xyXG4gICAgYm94Wm9vbV9tb3VzZURvd24sXHJcbiAgICBib3hab29tX21vdXNlVXAsXHJcbiAgICBib3hab29tX2RvWm9vbSxcclxuICAgIGJveFpvb21fbW91c2VNb3ZlLFxyXG4gICAgYm94Wm9vbUNlbnRlcl9tb3VzZU1vdmUsXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9tb3VzZURvd24oZSkge1xyXG4gICAgaWYgKHRoaXMuYm94Wm9vbSkge1xyXG4gICAgICAgIHRoaXMuYm94Wm9vbSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5ib3hab29tLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYm94Wm9vbSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZGlzYWJsZVBhbm5pbmcoKTtcclxuXHJcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgIC8vIFRPRE86IE1ha2UgYm94Wm9vbSBpdCdzIG93biBvYmplY3Qgd2l0aCBhIGVsZW1lbnQgcHJvcGVydHksIGluc3RlYWQgb2ZcclxuICAgIC8vICAgICAgIGFkZGluZyBwcm9wZXJ0aWVzIHRvIHRoZSBodG1sIGVsZW1lbnQgaXRzZWxmLlxyXG4gICAgdGhpcy5ib3hab29tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICB0aGlzLmJveFpvb20uaWQgPSAnYm94Wm9vbSc7XHJcbiAgICB0aGlzLmJveFpvb20uY2xhc3NOYW1lID0gJ2JveFpvb20nO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLmlkID0gJ2JveFpvb21DZW50ZXInO1xyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyLmNsYXNzTmFtZSA9ICdib3hab29tQ2VudGVyJztcclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlci5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgICAncG9zaXRpb246YWJzb2x1dGU7IHRvcDowcHg7IGxlZnQ6MHB4OyB3aWR0aDogNXB4OyBoZWlnaHQ6IDVweDsgYm9yZGVyOiAxcHggc29saWQgcmVkOyc7XHJcblxyXG4gICAgdGhpcy5ib3hab29tLmFwcGVuZENoaWxkKHRoaXMuYm94Wm9vbUNlbnRlcik7XHJcblxyXG4gICAgdGhpcy5tYWluQ29udGFpbmVyLmVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxyXG4gICAgICAgIHRoaXMuYm94Wm9vbSxcclxuICAgICAgICB0aGlzLm1hcmtlckNvbnRhaW5lci5lbGVtZW50LFxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmJveFpvb20ub2Zmc2V0ID0ge1xyXG4gICAgICAgIHg6IHRoaXMubWFwQ29udGFpbmVyLmxlZnQgKyB0aGlzLm1haW5Db250YWluZXIubGVmdCxcclxuICAgICAgICB5OiB0aGlzLm1hcENvbnRhaW5lci50b3AgKyB0aGlzLm1haW5Db250YWluZXIudG9wLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUubGVmdCA9IGUuY2xpZW50WCAtIGJveFpvb20ub2Zmc2V0LnggKyAncHgnO1xyXG4gICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9IGUuY2xpZW50WSAtIGJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgdGhpcy5ib3hab29tLnN0eWxlLnpJbmRleCA9IDUwMDtcclxuXHJcbiAgICB0aGlzLmJveFpvb20uc3RhcnQgPSB7XHJcbiAgICAgICAgeDogZS5jbGllbnRYLFxyXG4gICAgICAgIHk6IGUuY2xpZW50WSxcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5wYWdlSGFzRm9jdXMgPSB0cnVlO1xyXG5cclxuICAgIC8vIFRPRE86IENoYW5nZSBuYW1lIG9mIG1vdXNlIG1vdmUgYW5kIG1vdXNlIHVwIGV2ZW50bGlzdGVuZXJzLlxyXG4gICAgdGhpcy5ib3hab29tLm12ID0gZSA9PiB0aGlzLmJveFpvb21fbW91c2VNb3ZlKGUpO1xyXG4gICAgdGhpcy5ib3hab29tLm11cCA9IGUgPT4gdGhpcy5ib3hab29tX21vdXNlVXAoZSk7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5ib3hab29tLm12KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJveFpvb20ubXVwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9tb3VzZU1vdmUoZSkge1xyXG4gICAgaWYgKGUuY2xpZW50WCA+IHRoaXMuYm94Wm9vbS5zdGFydC54KSB7XHJcbiAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmxlZnQgPVxyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3RhcnQueCAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueCArICdweCc7XHJcbiAgICAgICAgaWYgKGUuY2xpZW50WSA+IHRoaXMuYm94Wm9vbS5zdGFydC55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0YXJ0LnkgLSB0aGlzLmJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGggPSBlLmNsaWVudFggLSB0aGlzLmJveFpvb20uc3RhcnQueCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQgPSBlLmNsaWVudFkgLSB0aGlzLmJveFpvb20uc3RhcnQueSArICdweCc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLnRvcCA9IGUuY2xpZW50WSAtIHRoaXMuYm94Wm9vbS5vZmZzZXQueSArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCA9IGUuY2xpZW50WCAtIHRoaXMuYm94Wm9vbS5zdGFydC54ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmhlaWdodCA9IHRoaXMuYm94Wm9vbS5zdGFydC55IC0gZS5jbGllbnRZICsgJ3B4JztcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMuYm94Wm9vbS5zdGFydC54ID4gZS5jbGllbnRYKSB7XHJcbiAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLmxlZnQgPSBlLmNsaWVudFggLSB0aGlzLmJveFpvb20ub2Zmc2V0LnggKyAncHgnO1xyXG4gICAgICAgIGlmIChlLmNsaWVudFkgPiB0aGlzLmJveFpvb20uc3RhcnQueSkge1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUudG9wID1cclxuICAgICAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdGFydC55IC0gdGhpcy5ib3hab29tLm9mZnNldC55ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5ib3hab29tLnN0eWxlLndpZHRoID0gdGhpcy5ib3hab29tLnN0YXJ0LnggLSBlLmNsaWVudFggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0ID0gZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLnN0YXJ0LnkgKyAncHgnO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS50b3AgPSBlLmNsaWVudFkgLSB0aGlzLmJveFpvb20ub2Zmc2V0LnkgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUud2lkdGggPSB0aGlzLmJveFpvb20uc3RhcnQueCAtIGUuY2xpZW50WCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS5oZWlnaHQgPSB0aGlzLmJveFpvb20uc3RhcnQueSAtIGUuY2xpZW50WSArICdweCc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5ib3hab29tQ2VudGVyX21vdXNlTW92ZShcclxuICAgICAgICB0aGlzLmJveFpvb20uc3R5bGUuaGVpZ2h0LFxyXG4gICAgICAgIHRoaXMuYm94Wm9vbS5zdHlsZS53aWR0aCxcclxuICAgICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJveFpvb21fbW91c2VVcChlKSB7XHJcbiAgICB2YXIgd2lkdGggPSBNYXRoLmFicyhlLmNsaWVudFggLSB0aGlzLmJveFpvb20uc3RhcnQueCk7XHJcbiAgICB2YXIgaGVpZ2h0ID0gTWF0aC5hYnMoZS5jbGllbnRZIC0gdGhpcy5ib3hab29tLnN0YXJ0LnkpO1xyXG4gICAgdmFyIHggPSBlLmNsaWVudFggPiB0aGlzLmJveFpvb20uc3RhcnQueCA/IGUuY2xpZW50WCA6IGJveFpvb20uc3RhcnQueDtcclxuICAgIHZhciB5ID0gZS5jbGllbnRZID4gdGhpcy5ib3hab29tLnN0YXJ0LnkgPyBlLmNsaWVudFkgOiBib3hab29tLnN0YXJ0Lnk7XHJcbiAgICB2YXIgY2VudGVyID0gdGhpcy5nZXRQaXhlbFBvaW50SW5NYXBDb250YWluZXIoXHJcbiAgICAgICAgdGhpcy50b1BvaW50KHggLSB3aWR0aCAvIDIsIHkgLSBoZWlnaHQgLyAyKSxcclxuICAgICk7XHJcblxyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5ib3hab29tLm12KTtcclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLmJveFpvb20ubXVwKTtcclxuXHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGVbdGhpcy5DU1NfVFJBTlNJVElPTl0gPSAnb3BhY2l0eSAwLjE1cyBlYXNlLWluLW91dCc7XHJcbiAgICB0aGlzLmJveFpvb20uc3R5bGUub3BhY2l0eSA9IDA7XHJcblxyXG4gICAgdGhpcy5lbmFibGVQYW5uaW5nKCk7XHJcblxyXG4gICAgdGhpcy5ib3hab29tLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQoYm94Wm9vbSk7XHJcblxyXG4gICAgaWYgKFxyXG4gICAgICAgIGUuY2xpZW50WCA9PT0gdGhpcy5ib3hab29tLnN0YXJ0LmNsaWVudFggJiZcclxuICAgICAgICBlLmNsaWVudFkgPT09IHRoaXMuYm94Wm9vbS5zdGFydC5jbGllbnRZXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLmJveFpvb20gPSBudWxsO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmJveFpvb20gPSBudWxsO1xyXG5cclxuICAgIHRoaXMuYm94Wm9vbV9kb1pvb20oe1xyXG4gICAgICAgIGhlaWdodCxcclxuICAgICAgICB3aWR0aCxcclxuICAgICAgICBjZW50ZXIsXHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYm94Wm9vbV9kb1pvb20ob2JqKSB7XHJcbiAgICBsZXQgcHJvamVjdGVkQ2VudGVyID0gdGhpcy5zY3JlZW5Qb2ludFRvUHJvamVjdGlvbihvYmouY2VudGVyKTtcclxuICAgIGxldCBoZWlnaHQgPSBudWxsO1xyXG4gICAgbGV0IHdpZHRoID0gbnVsbDtcclxuICAgIGxldCBtdWx0aXBsaWVyID0gbnVsbDtcclxuXHJcbiAgICBmb3IgKGxldCBoID0gMDsgaCA8IDUwIC8qcHJldmVudCBlbmRsZXNzIGxvb3AqLzsgaCsrKSB7XHJcbiAgICAgICAgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIGgpO1xyXG4gICAgICAgIHdpZHRoID0gb2JqLndpZHRoICogbXVsdGlwbGllcjtcclxuICAgICAgICBoZWlnaHQgPSBvYmouaGVpZ2h0ICogbXVsdGlwbGllcjtcclxuXHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBoZWlnaHQgPiB0aGlzLm1hcENvbnRhaW5lci5oZWlnaHQgfHxcclxuICAgICAgICAgICAgd2lkdGggPiB0aGlzLm1hcENvbnRhaW5lci53aWR0aFxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICBoIC09IDE7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbVRvKHByb2plY3RlZENlbnRlciwgdGhpcy56b29tICsgaCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYm94Wm9vbUNlbnRlcl9tb3VzZU1vdmUoaGVpZ2h0LCB3aWR0aCkge1xyXG4gICAgaGVpZ2h0ID0gaGVpZ2h0LnJlcGxhY2UoJ3B4JywgJycpO1xyXG4gICAgd2lkdGggPSB3aWR0aC5yZXBsYWNlKCdweCcsICcnKTtcclxuICAgIHRoaXMuYm94Wm9vbUNlbnRlci5zdHlsZS50cmFuc2Zvcm0gPVxyXG4gICAgICAgICd0cmFuc2xhdGUoJyArICh3aWR0aCAvIDIgLSAzKSArICdweCwgJyArIChoZWlnaHQgLyAyIC0gMykgKyAncHgpJztcclxufVxyXG4iLCJpbXBvcnQge0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50fSBmcm9tICcuLy4uL0Jhc2ljSW50ZXJhY3RpdmVFbGVtZW50X2NsYXNzJztcclxuaW1wb3J0IHt0b1BvaW50LCBjb252ZXJ0U1BUb1dHUzg0fSBmcm9tICcuLy4uL2Nvb3JkaW5hdGVfbW9kdWxlJztcclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi8uLi91dGlscy5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQmFzZU1hcmtlckNsYXNzIGV4dGVuZHMgQmFzaWNJbnRlcmFjdGl2ZUVsZW1lbnQge1xyXG4gICAgY29uc3RydWN0b3IoZWxlbSkge1xyXG4gICAgICAgIHN1cGVyKGVsZW0pO1xyXG5cclxuICAgICAgICBlbGVtLnN0eWxlLmJvdHRvbSA9ICcwcHgnO1xyXG5cclxuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtO1xyXG5cclxuICAgICAgICB0aGlzLm9mZnNldFBvcyA9IHt4OiAwLCB5OiAwfTtcclxuXHJcbiAgICAgICAgdGhpcy5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbignYXBwZW5kZWRUb01hcCcsIGUgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbignem9vbSBlbmQnLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hcC5ldmVudC5vbigndXBkYXRlIGV2ZXJ5dGhpbmcnLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hcHBlbmRlZFRvTWFwID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUG9zKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q29vcmRzKHNwUG9pbnQpIHtcclxuICAgICAgICBzcFBvaW50ID0gdG9Qb2ludChzcFBvaW50KTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZVBsYW5lUG9pbnQgPSBzcFBvaW50O1xyXG5cclxuICAgICAgICB0aGlzLnpJbmRleCA9IDFlNiAtIHRoaXMuc3RhdGVQbGFuZVBvaW50LnkudG9GaXhlZCgwKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuekluZGV4ID0gdGhpcy56SW5kZXg7XHJcblxyXG4gICAgICAgIHRoaXMud2dzODRYUG9pbnQgPSBjb252ZXJ0U1BUb1dHUzg0KHNwUG9pbnQueCwgc3BQb2ludC55KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYXBwZW5kZWRUb01hcCkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0T2Zmc2V0UG9zKHBvaW50KSB7XHJcbiAgICAgICAgdGhpcy5vZmZzZXRQb3MgPSB0aGlzLm1hcC50b1BvaW50KHBvaW50KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkVG9NYXAoYXJnX21hcCkge1xyXG4gICAgICAgIGxldCB0aGlzTWFya2VyID0gdGhpcztcclxuICAgICAgICBsZXQgbWFwID0gYXJnX21hcDtcclxuXHJcbiAgICAgICAgaWYgKCF0aGlzLnN0YXRlUGxhbmVQb2ludC54KSB7XHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdTZXQgY29vcmRpbmF0ZXMgYmVmb3JlIGFwcGVuZGluZyBtYXJrZXIuJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLm1hcCA9IGFyZ19tYXA7XHJcblxyXG4gICAgICAgIG1hcC5hZGRUbyh0aGlzLmVsZW1lbnQsIG1hcC5tYXJrZXJDb250YWluZXIuZWxlbWVudCwgZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICB0aGlzTWFya2VyLmZpcmUoJ2FwcGVuZGVkVG9NYXAnLCBlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2hvdygpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmFkZFRvTWFwKHRoaXMubWFwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgaGlkZSgpIHtcclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50LnBhcmVudE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcclxuICAgICAgICAgICAgdGhpcy5hcHBlbmRlZFRvTWFwID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZignbWFwIGxvYWQgZW5kJywgdGhpcy51cGRhdGVQb3MsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMubWFwLmV2ZW50Lm9mZignem9vbSBlbmQnLCB0aGlzLl96b29tRW5kQ2FsbGJhY2ssIHRoaXMpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBfem9vbUVuZENhbGxiYWNrKGUpIHtcclxuICAgICAgICB2YXIgY2xhc3NOYW1lID0gKGUuY3NzICYmIGUuY3NzLmNsYXNzTmFtZSkgfHwgJ21hcmtlcl96b29tX3RyYW5zaXRpb24nO1xyXG5cclxuICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG5cclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy56b29tQW5pbVRpbWVyKTtcclxuICAgICAgICB0aGlzLnpvb21BbmltVGltZXIgPSBzZXRUaW1lb3V0KFxyXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZS5iaW5kKHRoaXMuZWxlbWVudC5jbGFzc0xpc3QsIGNsYXNzTmFtZSksXHJcbiAgICAgICAgICAgIDM1MCxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGRlbGV0ZSgpIHtcclxuICAgICAgICB0aGlzLmhpZGUoKTtcclxuICAgICAgICB0aGlzLmRlbGV0ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLmZpcmUoJ2RlbGV0ZScsIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHBhbkludG9WaWV3KCkge1xyXG4gICAgICAgIGlmICghdGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgJzwtIFRoYXQgaGFzIHRvIGJlIGFkZGVkIHRvIGEgbWFwIGJlZm9yZSBjYWxsaW5nIHBhbkludG9WaWV3KCkuJyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtYXBDb250ID0gdGhpcy5tYXAubWFwQ29udGFpbmVyO1xyXG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5lbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIHZhciBwYWRkaW5nID0gNTtcclxuICAgICAgICB2YXIgcG9pbnQgPSB7eDogMCwgeTogMH07XHJcblxyXG4gICAgICAgIGlmIChyZWN0LnRvcCA8IG1hcENvbnQudG9wICsgNSkge1xyXG4gICAgICAgICAgICBwb2ludC55ID0gbWFwQ29udC50b3AgLSByZWN0LnRvcCArIDU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocmVjdC5sZWZ0IDwgbWFwQ29udC5sZWZ0ICsgcGFkZGluZykge1xyXG4gICAgICAgICAgICBwb2ludC54ID0gbWFwQ29udC5sZWZ0IC0gcmVjdC5sZWZ0ICsgcGFkZGluZztcclxuICAgICAgICB9IGVsc2UgaWYgKHJlY3QubGVmdCArIHJlY3Qud2lkdGggPiBtYXBDb250LmxlZnQgKyBtYXBDb250LndpZHRoIC0gcGFkZGluZykge1xyXG4gICAgICAgICAgICBwb2ludC54ID0gbWFwQ29udC5sZWZ0ICsgbWFwQ29udC53aWR0aCAtIChyZWN0LmxlZnQgKyByZWN0LndpZHRoKSAtIHBhZGRpbmc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocG9pbnQueCB8fCBwb2ludC55KSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwLnBhbkJ5UGl4ZWxzKHBvaW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlUG9zKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCdwcmVVcGRhdGVQb3MnLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdmFyIHBvaW50ID0gdGhpcy5tYXAuY29udmVydFByb2pQb2ludFRvT2Zmc2V0UGl4ZWxQb2ludCh0aGlzLnN0YXRlUGxhbmVQb2ludCk7XHJcblxyXG4gICAgICAgIHBvaW50LnggPSB+fihwb2ludC54ICsgdGhpcy5vZmZzZXRQb3MueCk7XHJcbiAgICAgICAgcG9pbnQueSA9IH5+KHBvaW50LnkgKyB0aGlzLm9mZnNldFBvcy55KTtcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlW3V0aWxzLkNTU19UUkFOU0ZPUk1dID1cclxuICAgICAgICAgICAgJ3RyYW5zbGF0ZSgnICsgcG9pbnQueCArICdweCwgJyArIHBvaW50LnkgKyAncHgpJztcclxuXHJcbiAgICAgICAgdGhpcy5maXJlKCdwb3N0VXBkYXRlUG9zJywgdGhpcyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59XHJcbiIsImltcG9ydCB7QmFzZU1hcmtlckNsYXNzfSBmcm9tIFwiLi9CYXNlTWFya2VyX2NsYXNzXCI7XHJcbmltcG9ydCB7dG9Qb2ludH0gZnJvbSAnLi8uLi9jb29yZGluYXRlX21vZHVsZSc7XHJcblxyXG5leHBvcnQgY2xhc3MgTWFrZVBvcHVwIGV4dGVuZHMgQmFzZU1hcmtlckNsYXNzIHtcclxuICAgIGNvbnN0cnVjdG9yKG9wdF9tZXNzYWdlLCBvcHRfc3BQb2ludCwgb3B0X2FuY2hvck9mZnNldCA9IFswLCAwXSkge1xyXG4gICAgICAgIGxldCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIHN1cGVyKGVsKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KG9wdF9tZXNzYWdlLCBvcHRfc3BQb2ludCwgb3B0X2FuY2hvck9mZnNldCk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChvcHRfbWVzc2FnZSwgb3B0X3NwUG9pbnQsIG9wdF9hbmNob3JPZmZzZXQpIHtcclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IG9wdF9tZXNzYWdlLFxyXG4gICAgICAgICAgICBwb2ludDogb3B0X3NwUG9pbnQsXHJcbiAgICAgICAgICAgIGFuY2hvck9mZnNldDogb3B0X2FuY2hvck9mZnNldCxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSB0aGlzLm9wdGlvbnMubWVzc2FnZTtcclxuXHJcbiAgICAgICAgdGhpcy5vZmZzZXRQb3MgPSB0b1BvaW50KHRoaXMub3B0aW9ucy5hbmNob3JPZmZzZXQpO1xyXG5cclxuICAgICAgICB0aGlzLm1ha2VQb3B1cCgpO1xyXG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLnNldE1lc3NhZ2UodGhpcy5tZXNzYWdlKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5wb2ludCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldENvb3Jkcyh0b1BvaW50KHRoaXMub3B0aW9ucy5wb2ludCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaW5pdC5pbml0QXJyKSB7XHJcbiAgICAgICAgICAgIGxldCBhcnkgPSB0aGlzLmluaXQuaW5pdEFycjtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgYXJ5Lmxlbmd0aDsgbisrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGFkZGl0aW9uYWwgaW5pdCBmdW5jdGlvbnMgYW4gZXh0ZW5zaW9uXHJcbiAgICAgICAgICAgICAgICAvLyBtaWdodCBoYXZlIGFkZGVkLlxyXG4gICAgICAgICAgICAgICAgYXJ5W25dLmZuLmNhbGwoYXJ5W25dLmN0eCB8fCB0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgb25Jbml0RG9uZShmbiwgY3R4KSB7XHJcbiAgICAgICAgLy8gVGVzdGluZyBhbiBpZGVhIGFib3V0IGhvdyB0byBleHRlbmQgdGhlIGluaXQgZnVuY3Rpb24uXHJcbiAgICAgICAgbGV0IGFyeSA9IHRoaXMucHJvdG90eXBlLmluaXQuaW5pdGFycjtcclxuICAgICAgICBpZiAoIWFyeSkge1xyXG4gICAgICAgICAgICBhcnkgPSB0aGlzLnByb3RvdHlwZS5pbml0LmluaXRBcnIgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXJ5LnB1c2goe2ZuLCBjdHh9KTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICB0aGlzLm9uKCdhcHBlbmRlZFRvTWFwJywgZSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5tYXAuTU9VU0VfV0hFRUxfRVZULCBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5vbigncHJlVXBkYXRlUG9zJywgZSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0T2ZmU2V0TGVmdFRvcCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNldE9mZlNldExlZnRUb3AoKSB7XHJcbiAgICAgICAgbGV0IGVsID0gdGhpcy5lbGVtZW50O1xyXG4gICAgICAgIGVsLnN0eWxlLmxlZnQgPSAtKGVsLm9mZnNldFdpZHRoIC8gMikgKyAncHgnO1xyXG4gICAgICAgIGVsLnN0eWxlLmJvdHRvbSA9IHRoaXMuYXJyb3cub2Zmc2V0SGVpZ2h0ICsgJ3B4JztcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TWVzc2FnZShvcHRfbWVzc2FnZSA9ICcnKSB7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdF9tZXNzYWdlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VDb250YWluZXIuaW5uZXJIVE1MID0gb3B0X21lc3NhZ2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyLmFwcGVuZENoaWxkKG9wdF9tZXNzYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG9wdF9tZXNzYWdlO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVBvcygpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBtYWtlUG9wdXAoKSB7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTmFtZSA9ICdwb3B1cFBhcmVudCc7XHJcblxyXG4gICAgICAgIHRoaXMuZGVsZXRlQnRuID0gdGhpcy5tYWtlRGVsZXRlQnRuKCk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZGVsZXRlQnRuKTtcclxuXHJcbiAgICAgICAgdGhpcy5tZXNzYWdlQ29udGFpbmVyID0gdGhpcy5tYWtlTWVzc2FnZUNvbnRhaW5lcigpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLm1lc3NhZ2VDb250YWluZXIpO1xyXG5cclxuICAgICAgICB0aGlzLmFycm93ID0gdGhpcy5tYWtlQXJyb3coKTtcclxuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5hcnJvdyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VEZWxldGVCdG4oKSB7XHJcbiAgICAgICAgbGV0IGRlbGV0ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGRlbGV0ZUJ1dHRvbi5jbGFzc05hbWUgPSAnbWFya2VyRGVsZXRlQnV0dG9uJztcclxuICAgICAgICBkZWxldGVCdXR0b24uaW5uZXJIVE1MID0gJyYjMjE1Oyc7XHJcbiAgICAgICAgZGVsZXRlQnV0dG9uLnBvcHVwID0gdGhpcztcclxuICAgICAgICBkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmRlbGV0ZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICByZXR1cm4gZGVsZXRlQnV0dG9uO1xyXG4gICAgfVxyXG5cclxuICAgIG1ha2VNZXNzYWdlQ29udGFpbmVyKCkge1xyXG4gICAgICAgIGxldCBtZXNzYWdlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgbWVzc2FnZUNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdtZXNzYWdlQ29udGFpbmVyJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLnN0eWxlLmNvbG9yID0gJ2JsYWNrJztcclxuICAgICAgICBtZXNzYWdlQ29udGFpbmVyLnBvcHVwID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbWVzc2FnZUNvbnRhaW5lcjtcclxuICAgIH1cclxuXHJcbiAgICBtYWtlQXJyb3coKSB7XHJcbiAgICAgICAgbGV0IGFycm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgYXJyb3cuY2xhc3NOYW1lID0gJ21hcmtlckFycm93JztcclxuXHJcbiAgICAgICAgbGV0IGlubmVyQXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBpbm5lckFycm93LmNsYXNzTmFtZSA9ICdtYXJrZXJJbm5lckFycm93JztcclxuICAgICAgICBhcnJvdy5hcHBlbmRDaGlsZChpbm5lckFycm93KTtcclxuICAgICAgICByZXR1cm4gYXJyb3c7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYWtlUG9wdXAob3B0X21lc3NhZ2UsIG9wdF9zcFBvaW50LCBvcHRfYW5jaG9yT2Zmc2V0ID0gWzAsIDBdKSB7XHJcbiAgICByZXR1cm4gbmV3IE1ha2VQb3B1cChvcHRfbWVzc2FnZSwgb3B0X3NwUG9pbnQsIG9wdF9hbmNob3JPZmZzZXQpO1xyXG59XHJcbiIsImltcG9ydCB7QmFzZU1hcmtlckNsYXNzfSBmcm9tICcuL0Jhc2VNYXJrZXJfY2xhc3MnO1xyXG5pbXBvcnQge3RvUG9pbnR9IGZyb20gJy4vLi4vY29vcmRpbmF0ZV9tb2R1bGUnO1xyXG5pbXBvcnQge01ha2VQb3B1cH0gZnJvbSAnLi9NYXJrZXJQb3B1cF9jbGFzcyc7XHJcblxyXG5sZXQgX21hcmtlckNvdW50ZXIgPSAwO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1ha2VNYXJrZXIgZXh0ZW5kcyBCYXNlTWFya2VyQ2xhc3Mge1xyXG4gICAgY29uc3RydWN0b3IocF9zcFBvaW50LCBvcHRpb25zKSB7XHJcbiAgICAgICAgbGV0IF9vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBvZmZzZXQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgcG9wdXBBbmNob3I6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbWFya2VyRWxlbWVudDogTWFrZU1hcmtlci5wcm90b3R5cGUubWFrZU1hcmtlckVsZW1lbnQoKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBPYmplY3QuYXNzaWduKF9vcHRpb25zLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgc3VwZXIoX29wdGlvbnMubWFya2VyRWxlbWVudCk7XHJcblxyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IF9vcHRpb25zO1xyXG5cclxuICAgICAgICBwX3NwUG9pbnQgPSBwX3NwUG9pbnQgPyB0b1BvaW50KHBfc3BQb2ludCkgOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAocF9zcFBvaW50KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29vcmRzKHBfc3BQb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHBvcHVwKG9wdF9odG1sLCBvcHRfb2Zmc2V0UG9pbnQpIHtcclxuICAgICAgICBsZXQgbWFya2VyID0gdGhpcztcclxuICAgICAgICBsZXQgb2Zmc2V0ID0gb3B0X29mZnNldFBvaW50IHx8IF9vcHRpb25zLnBvcHVwQW5jaG9yIHx8IFswLCAtMTAwXTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwID0gbmV3IE1ha2VQb3B1cChvcHRfaHRtbCwgbnVsbCwgb2Zmc2V0KVxyXG4gICAgICAgICAgICAuc2V0Q29vcmRzKG1hcmtlci5zdGF0ZVBsYW5lUG9pbnQpXHJcbiAgICAgICAgICAgIC5hZGRUb01hcChtYXJrZXIubWFwKTtcclxuXHJcbiAgICAgICAgbWFya2VyLnBvcHVwLm9uKCdkZWxldGUnLCBtYXJrZXIuZGVsZXRlLmJpbmQobWFya2VyKSk7XHJcblxyXG4gICAgICAgIG1hcmtlci5zaG93UG9wdXAgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKG1hcmtlci5hcHBlbmRlZFRvTWFwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWFya2VyLnBvcHVwLmVsZW1lbnQucGFyZW50Tm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5wb3B1cC51cGRhdGVQb3MoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLnBvcHVwLmFkZFRvTWFwKG1hcmtlci5tYXApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbWFya2VyLm9uKCdhcHBlbmRlZFRvTWFwJywgZnVuY3Rpb24gX2ZuXyhlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLnNob3dQb3B1cCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5vZmYoJ2FwcGVuZGVkVG9NYXAnLCBfZm5fKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbWFya2VyLmhpZGVQb3B1cCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBtYXJrZXIucG9wdXAuaGlkZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIG1hcmtlci5wb3B1cC5zaG93ID0gbWFya2VyLnNob3dQb3B1cDtcclxuXHJcbiAgICAgICAgbWFya2VyLnNldFBvcHVwTWVzc2FnZSA9IG1hcmtlci5wb3B1cC5zZXRNZXNzYWdlO1xyXG5cclxuICAgICAgICBtYXJrZXIuc2hvd1BvcHVwKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBtYXJrZXIucG9wdXA7XHJcbiAgICB9XHJcblxyXG4gICAgbWFrZU1hcmtlckVsZW1lbnQoKSB7XHJcbiAgICAgICAgbGV0IG1hcmtlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgICAgIG1hcmtlci5jbGFzc05hbWUgPSAnbWFya2VyUGFyZW50Myc7XHJcbiAgICAgICAgbWFya2VyLnNyYyA9ICdodHRwczovL3VucGtnLmNvbS9sZWFmbGV0QDEuMy4xL2Rpc3QvaW1hZ2VzL21hcmtlci1pY29uLnBuZyc7XHJcblxyXG4gICAgICAgIG1hcmtlci5pZCA9ICdtYXJrZXJfJyArIF9tYXJrZXJDb3VudGVyKys7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IFB1dCB0aGlzIGluIGEgc3R5bGUgc2hlZXQuXHJcbiAgICAgICAgbWFya2VyLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICBtYXJrZXIuc3R5bGUubGVmdCA9ICctMTJweCc7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLmJvdHRvbSA9ICcwcHgnO1xyXG4gICAgICAgIG1hcmtlci5zdHlsZS5jb2xvciA9ICd3aGl0ZSc7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLmZvbnRTaXplID0gJzE1cHgnO1xyXG4gICAgICAgIG1hcmtlci5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICAgICAgbWFya2VyLnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5ib3JkZXJSYWRpdXMgPSAnNTBweCc7XHJcbiAgICAgICAgLy8gbWFya2VyLnN0eWxlLmxpbmVIZWlnaHQgPSAnMjBweCc7XHJcbiAgICAgICAgLy8gbWFya2VyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI2VhNDMzNVwiO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPVxyXG4gICAgICAgIC8vICAgICAgICd1cmwoXCJodHRwOi8vd3d3LnNub2NvLm9yZy9kb2NzL3Nhcy9waG90b3MvMDA1OS8wMDU5NTgwMDAwMzQwMFIwMTEuanBnXCIpJztcclxuICAgICAgICAvLyBtYXJrZXIuc3R5bGUuYm94U2hhZG93ID0gXCIwcHggMHB4IDBweCAxcHggcmdiKDI1NSwyNTUsMjU1KVwiO1xyXG4gICAgICAgIC8vIG1hcmtlci5zdHlsZS5oZWlnaHQgPSBcIjIwcHhcIjtcclxuICAgICAgICAvLyBtYXJrZXIuc3R5bGUud2lkdGggPSBcIjIwcHhcIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIG1hcmtlcjtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNYXJrZXIocF9zcFBvaW50LCBvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gbmV3IE1ha2VNYXJrZXIoLi4uYXJndW1lbnRzKTtcclxufVxyXG4iXSwibmFtZXMiOlsidXRpbHMuTU9VU0VfV0hFRUxfRVZUIiwidXRpbHMuQ1NTX1RSQU5TRk9STSIsInV0aWxzLkNTU19UUkFOU0lUSU9OIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztJQUFPLE1BQU0sZ0JBQWdCLENBQUM7SUFDOUIsSUFBSSxXQUFXLEdBQUc7SUFDbEIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUM1QixLQUFLOztJQUVMLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0lBQ2pDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQ3BELFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEMsU0FBUzs7SUFFVCxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxL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RSxDQUFDLEVBQUU7SUFDckMsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEQsUUFBUSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUV0QyxRQUFRLElBQUksTUFBTSxHQUFHO0lBQ3JCLFlBQVksR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0UsWUFBWSxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3RSxZQUFZLEdBQUcsRUFBRSxTQUFTO0lBQzFCLFlBQVksR0FBRyxFQUFFLFNBQVM7SUFDMUIsU0FBUyxDQUFDOztJQUVWLFFBQVEsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0UsUUFBUSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRTtJQUNBOztJQUVBLFFBQVEsT0FBTyxNQUFNLENBQUM7SUFDdEIsS0FBSztJQUNMLENBQUM7O0lDakRNLE1BQU0sMEJBQTBCLFNBQVMsYUFBYSxDQUFDO0lBQzlEO0lBQ0EsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRTtJQUM3QixRQUFRLEtBQUssQ0FB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SUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0lBQzlDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRztJQUNsQyxnQkFBZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDcEUsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9FLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNoRixTQUFTLE1BQU07SUFDZixZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDOUUsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQy9FLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNoRixTQUFTO0lBQ1QsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUU7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
