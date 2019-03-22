import { BasicEventSystem } from "../BasicEventSystem_class";
import * as utils from "../utils";

export class BasicLayer extends BasicEventSystem {
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
       // this.fractionOffset = { x: 0, y: 0 }; TODO: Remove this whenever.
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
            this.map.event.on(utils.MOUSE_WHEEL_EVT, this._hideContainerDuringMouseWheelEvt, this);
        } else {
            this.map.event.on(utils.MOUSE_WHEEL_EVT, this._mouseWheelEvt, this);
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
        this.container.element.style[utils.CSS_TRANSFORM] =
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
            this.map.event.off(utils.MOUSE_WHEEL_EVT, tileLoadListener, this);
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
        this.map.event.on(utils.MOUSE_WHEEL_EVT, doSwap, this);

        let ___that = this;
        function tileLoadListener(e) {
            // TODO: testing
            ___that.map.event.off(utils.MOUSE_WHEEL_EVT, tileLoadListener, ___that);
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
        this.container.element.style[utils.CSS_TRANSFORM] =
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
