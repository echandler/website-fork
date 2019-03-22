import {BasicLayer} from './BasicLayer_class';
import * as utils from '../utils';

export class ArcRenderLayer extends BasicLayer {
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
            this.map.event.on(utils.MOUSE_WHEEL_EVT, this.cancelRequest, this);
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
        this.container.element.style[utils.CSS_TRANSFORM] =
                    `translate3d(${ zObj.x }px,
                                 ${ zObj.y }px, 0px)
                        scale3d(${ zObj.scale }, ${ zObj.scale }, 1)
                    `;

        this.fire('zoom end', evt);

        return this;
    }
}
