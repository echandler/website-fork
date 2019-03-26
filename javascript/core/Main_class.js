import {BasicEventSystem} from './BasicEventSystem_class';
import {panning_module} from './panning_module';
import * as utils from './utils';

export class NewMap extends BasicEventSystem {
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

        this.MOUSE_WHEEL_EVT = utils.MOUSE_WHEEL_EVT;
        this.CSS_TRANSFORM = utils.CSS_TRANSFORM;
        this.CSS_TRANSITION = utils.CSS_TRANSITION;

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
        t;
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
            utils.MOUSE_WHEEL_EVT,
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
