import {BaseMarkerClass} from './BaseMarker_class';
import {toPoint} from './../coordinate_module';
import {MakePopup} from './MarkerPopup_class';

let _markerCounter = 0;

export class MakeMarker extends BaseMarkerClass {
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

export function makeMarker(p_spPoint, options) {
    return new MakeMarker(...arguments);
}
