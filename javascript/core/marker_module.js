import { BasicInteractiveElement } from "./BasicInteractiveElement_class";
import { toPoint, convertSPToWGS84 } from "./coordinate_module";
import * as utils from "./utils.js";

//import { NewMap } from "./Main_class";
//let mrkr = {};

//var marker_module = function(thisMap) {
//"use strict";
var _markerCounter = 0;

//thisMap.makeMarker = makeMarker;
//thisMap.makePopup = makePopup;

export class MarkerBasics extends BasicInteractiveElement {
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

        this.element.style[utils.CSS_TRANSFORM] = "translate(" + point.x + "px, " + point.y + "px)";

        this.fire("postUpdatePos", this);

        return this;
    }
}

export class MakeMarker extends MarkerBasics {
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

export function makeMarker(p_spPoint, options) {
    return new MakeMarker(...arguments);
}

export function makePopup(opt_message, opt_spPoint, opt_anchorOffset = [0, 0]) {
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
