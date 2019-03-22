import {ArcRenderLayer} from './ArcRenderLayer_class';

export class ArcXMLLayer extends ArcRenderLayer {
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

export function googleToState(lat, lon) {
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
